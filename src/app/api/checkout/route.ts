import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import { randomUUID } from 'crypto';
import { seatCategoryMatchesTicketType } from '@/lib/seatCategories';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2025-02-24.acacia' as any,
});

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
      seatIds: seatIdsRaw = [],
      holdToken = '',
      seatsEventKey = '',
      seatDetails: seatDetailsRaw = [],
    } = body;

    const seatIds: string[] = Array.isArray(seatIdsRaw) ? seatIdsRaw : [];
    const seatDetails: { objectId?: string; label?: string; category?: string }[] = Array.isArray(
      seatDetailsRaw
    )
      ? seatDetailsRaw
      : [];

    if (!eventId || !qty || qty <= 0) {
      return NextResponse.json({ error: 'Faltan datos requeridos (evento, cantidad).' }, { status: 400 });
    }

    if (!tipoBoletoId && (price === undefined || price === null || parseFloat(String(price)) <= 0)) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos (precio o tipo de boleto).' },
        { status: 400 }
      );
    }

    const seatsSecretKey = process.env.SEATS_IO_SECRET_KEY;

    // 1. Obtener Evento de DB para validar
    const { data: evento, error: eventError } = await supabase
      .from('evento')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !evento) {
      return NextResponse.json({ error: 'Evento no encontrado.' }, { status: 404 });
    }

    const hasSeatMapConfigured = !!evento.seats_evento_key;
    let usingSeatsIo = false;

    if (hasSeatMapConfigured) {
      if (!tipoBoletoId) {
        return NextResponse.json(
          { error: 'Este evento requiere un tipo de boleto válido para comprar con mapa de asientos.' },
          { status: 400 }
        );
      }
      if (
        !seatsSecretKey ||
        !holdToken ||
        seatIds.length !== qty ||
        seatIds.length === 0 ||
        seatsEventKey !== evento.seats_evento_key
      ) {
        return NextResponse.json(
          {
            error:
              'Este evento requiere una selección de asientos válida en el mapa (misma sesión y evento).',
          },
          { status: 400 }
        );
      }
      usingSeatsIo = true;
    }

    // 2. Validar stock del tipo de boleto seleccionado
    let basePrice = 0;
    let tipoNombreBoleto = String(type || 'General');

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

      basePrice = parseFloat(String(tipoBoleto.precio));
      tipoNombreBoleto = String(tipoBoleto.nombre);

      if (usingSeatsIo) {
        for (const objectId of seatIds) {
          const det = seatDetails.find((d) => d.objectId === objectId);
          const cat = det?.category || type;
          if (!seatCategoryMatchesTicketType(String(cat), String(tipoBoleto.nombre))) {
            return NextResponse.json(
              {
                error: `Los asientos deben ser de la zona "${tipoBoleto.nombre}" para el tipo de boleto elegido.`,
              },
              { status: 400 }
            );
          }
        }
      }

      if (type && !seatCategoryMatchesTicketType(String(type), String(tipoBoleto.nombre))) {
        return NextResponse.json(
          { error: 'El tipo de boleto no coincide con la zona seleccionada.' },
          { status: 400 }
        );
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
      basePrice = parseFloat(String(price));
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

    const asientoRowMeta: { id: string; objectId: string; etiqueta: string }[] = [];

    if (usingSeatsIo) {
      const asientosToInsert = seatIds.map((objectId: string) => {
        const det = seatDetails.find((d) => d.objectId === objectId);
        const rowId = randomUUID();
        const etiqueta = det?.label || objectId;
        const categoria = det?.category || tipoNombreBoleto;
        asientoRowMeta.push({ id: rowId, objectId, etiqueta });
        return {
          id: rowId,
          evento_id: eventId,
          etiqueta,
          categoria,
          precio: basePrice,
          estado: 'reservado' as const,
          seats_object_id: objectId,
        };
      });

      const { error: asientoErr } = await supabase.from('asiento').insert(asientosToInsert);
      if (asientoErr) {
        console.warn('Advertencia DB: No se pudieron sincronizar los asientos.', asientoErr);
      }
    }

    const objectIdToAsientoId = new Map(asientoRowMeta.map((m) => [m.objectId, m.id]));

    // === BOLETOS CON SOPORTE PARA ASIENTOS ===
    const boletosToInsert = Array.from({ length: qty }).map((_, index) => {
      const bolId = `BOL-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const oid = usingSeatsIo ? seatIds[index] : null;
      const asientoDbId = oid ? objectIdToAsientoId.get(oid) : null;
      const meta = asientoRowMeta.find((m) => m.objectId === oid);
      return {
        id: bolId,
        evento_id: eventId,
        orden_id: orden.id,
        precio: basePrice * 1.10,
        tipo: tipoNombreBoleto,
        estado: 'reservado' as const,
        codigo_qr: bolId,
        asiento_id: asientoDbId || null,
        etiqueta_asiento: meta?.etiqueta || (oid ?? null),
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
        tipo_boleto_nombre: tipoNombreBoleto,
        cantidad: qty.toString(),
        // === NUEVOS METADATA PARA SEATS.IO ===
        seat_ids: usingSeatsIo ? JSON.stringify(seatIds) : '',
        hold_token: holdToken || '',
        seats_event_key: usingSeatsIo ? String(evento.seats_evento_key || '') : '',
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