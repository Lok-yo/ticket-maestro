import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2025-02-24.acacia' as any,
});

// Helper para hacer hold en seats.io (solo por seguridad, aunque ya lo hacemos en /api/seats/hold)
async function holdSeatsInSeatsIo(
  eventKey: string,
  seatIds: string[],
  holdToken: string,
  secretKey: string
) {
  const REGION = 'na';
  const auth = 'Basic ' + Buffer.from(secretKey + ':').toString('base64');

  const res = await fetch(`https://api-${REGION}.seatsio.net/events/${eventKey}/actions/hold`, {
    method: 'POST',
    headers: {
      'Authorization': auth,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ objects: seatIds, holdToken }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`seats.io hold error: ${err}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Validar usuario autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Debes iniciar sesión para comprar boletos.' }, { status: 401 });
    }

    const body = await req.json();
    
    // === DESTRUCTURING ACTUALIZADO CON CAMPOS DE SEATS.IO ===
    const { 
      eventId, 
      type, 
      qty, 
      name, 
      email, 
      phone, 
      price, 
      tipoBoletoId,
      // NUEVOS CAMPOS PARA SEATS.IO
      seatIds = [],           // Ej: ["A-101", "A-102"]
      holdToken = '',         // Token de reserva temporal
      seatsEventKey = ''      // Key del evento en seats.io
    } = body;

    if (!eventId || !qty || qty <= 0 || !price) {
      return NextResponse.json({ error: 'Faltan datos requeridos (evento, cantidad, precio).' }, { status: 400 });
    }

    // === NUEVA VALIDACIÓN PARA SEATS.IO ===
    const seatsSecretKey = process.env.SEATS_IO_SECRET_KEY;
    const usingSeatsIo = seatIds?.length > 0 && holdToken && seatsEventKey && seatsSecretKey;

    if (usingSeatsIo) {
      if (seatIds.length !== qty) {
        return NextResponse.json({ 
          error: `Seleccionaste ${seatIds.length} asiento(s) pero indicaste ${qty} boleto(s).` 
        }, { status: 400 });
      }
    }

    // 1. Obtener Evento de DB para validar
    const { data: evento, error: eventError } = await supabase
      .from('evento')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !evento) {
      return NextResponse.json({ error: 'Evento no encontrado.' }, { status: 404 });
    }

    // 2. Validar stock del tipo de boleto seleccionado
    if (tipoBoletoId) {
      const { data: tipoBoleto, error: tipoError } = await supabase
        .from('tipo_boleto')
        .select('*')
        .eq('id', tipoBoletoId)
        .eq('evento_id', eventId)
        .single();

      if (tipoError || !tipoBoleto) {
        return NextResponse.json({ error: 'Tipo de boleto no encontrado para este evento.' }, { status: 404 });
      }

      if (tipoBoleto.stock_disponible < qty) {
        return NextResponse.json({ 
          error: `Stock insuficiente para ${tipoBoleto.nombre}. Solo quedan ${tipoBoleto.stock_disponible} boletos disponibles.` 
        }, { status: 400 });
      }

      const precioReal = parseFloat(tipoBoleto.precio);
      const precioEnviado = parseFloat(price);
      if (Math.abs(precioReal - precioEnviado) > 0.01) {
        return NextResponse.json({ 
          error: 'El precio no coincide con la configuración actual. Recarga la página e intenta de nuevo.' 
        }, { status: 400 });
      }

      // Decrementar stock
      const { error: stockError } = await supabase
        .from('tipo_boleto')
        .update({ stock_disponible: tipoBoleto.stock_disponible - qty })
        .eq('id', tipoBoletoId)
        .eq('stock_disponible', tipoBoleto.stock_disponible);

      if (stockError) {
        return NextResponse.json({ error: 'Error al reservar boletos. Intenta de nuevo.' }, { status: 500 });
      }
    } else {
      // Flujo legacy...
      const { count: boletosVendidos, error: countError } = await supabase
        .from('boleto')
        .select('*', { count: 'exact', head: true })
        .eq('evento_id', eventId)
        .in('estado', ['reservado', 'vendido']);

      if (countError) {
        return NextResponse.json({ error: 'Error al verificar la disponibilidad de boletos.' }, { status: 500 });
      }

      const ocupados = boletosVendidos || 0;
      if (ocupados + qty > evento.capacidad) {
        const disponibles = evento.capacidad - ocupados;
        return NextResponse.json({ 
          error: `Capacidad agotada. Solo quedan ${disponibles > 0 ? disponibles : 0} boletos disponibles.` 
        }, { status: 400 });
      }
    }

    const basePrice = parseFloat(price); 
    const subtotal = basePrice * qty;
    const cargoServicio = subtotal * 0.10;
    const total = subtotal + cargoServicio;

    const comisionPlataforma = cargoServicio; 
    const netoOrganizador = subtotal; 

    const ordenId = `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Crear la Orden
    const { data: orden, error: ordenError } = await supabase
      .from('orden')
      .insert({
        id: ordenId,
        total,
        subtotal,
        descuento: 0,
        estado: 'pendiente',
        usuario_id: user.id
      })
      .select('id')
      .single();

    if (ordenError || !orden) {
      console.error('Error insertando orden:', ordenError);
      if (tipoBoletoId) {
        const { data: tipoData } = await supabase.from('tipo_boleto').select('stock_disponible').eq('id', tipoBoletoId).single();
        if (tipoData) {
          await supabase.from('tipo_boleto').update({ stock_disponible: tipoData.stock_disponible + qty }).eq('id', tipoBoletoId);
        }
      }
      return NextResponse.json({ error: 'No se pudo generar la orden temporal.' }, { status: 500 });
    }

    // Crear pago en espera
    const pagoId = `PAG-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const { error: pagoError } = await supabase
      .from('pago')
      .insert({
        id: pagoId,
        orden_id: orden.id,
        metodo: 'tarjeta',
        estado: 'en_espera',
        referencia: '',
        monto: total,
        cargo_servicio: cargoServicio,
        comision_organizadora: 0,
        monto_neto: total,
        monto_retenido: netoOrganizador,
        estado_escrow: 'retenido'
      });
      
    if (pagoError) {
      console.warn('Advertencia DB: No se pudo registrar el pago inicial.', pagoError);
    }

    // === BOLETOS CON SOPORTE PARA ASIENTOS ===
    const boletosToInsert = Array.from({ length: qty }).map((_, index) => {
      const bolId = `BOL-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      return {
        id: bolId,
        evento_id: eventId,
        orden_id: orden.id,
        precio: basePrice * 1.10,
        tipo: type,
        estado: 'reservado', 
        codigo_qr: `PENDIENTE-${bolId}`,
        // NUEVO: Guardar asiento si viene de seats.io
        asiento_id: usingSeatsIo && seatIds[index] ? seatIds[index] : null,
      };
    });

    const { error: boletosError } = await supabase
      .from('boleto')
      .insert(boletosToInsert);

    if (boletosError) {
      console.warn('Advertencia DB: No se insertaron boletos.', boletosError);
    }

    // 5. Crear PaymentIntent en Stripe
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_dummy') {
      return NextResponse.json({ 
        error: 'Falta configurar STRIPE_SECRET_KEY en el backend.',
        orden_id: orden.id,
      }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      currency: 'mxn',
      metadata: {
        orden_id: orden.id,
        evento_id: eventId,
        user_id: user.id,
        tipo_boleto_id: tipoBoletoId || '',
        tipo_boleto_nombre: type,
        cantidad: qty.toString(),
        // === NUEVOS METADATA PARA SEATS.IO ===
        seat_ids: usingSeatsIo ? JSON.stringify(seatIds) : '',
        hold_token: holdToken || '',
        seats_event_key: seatsEventKey || '',
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      ordenId: orden.id
    });

  } catch (error: any) {
    console.error('Error total en checkout API:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}