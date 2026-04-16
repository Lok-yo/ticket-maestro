import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

// Se instancia Stripe con llave dummy para evitar petar si no ha sido configurado en el .env.local
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
    const { eventId, type, qty, name, email, phone, price, tipoBoletoId } = body;

    if (!eventId || !qty || qty <= 0 || !price) {
      return NextResponse.json({ error: 'Faltan datos requeridos (evento, cantidad, precio).' }, { status: 400 });
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
      // Nuevo flujo: validar contra tipo_boleto
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

      // Validar que el precio coincida con el configurado (seguridad anti-manipulación)
      const precioReal = parseFloat(tipoBoleto.precio);
      const precioEnviado = parseFloat(price);
      if (Math.abs(precioReal - precioEnviado) > 0.01) {
        return NextResponse.json({ 
          error: 'El precio no coincide con la configuración actual. Recarga la página e intenta de nuevo.' 
        }, { status: 400 });
      }

      // Decrementar stock del tipo de boleto
      const { error: stockError } = await supabase
        .from('tipo_boleto')
        .update({ stock_disponible: tipoBoleto.stock_disponible - qty })
        .eq('id', tipoBoletoId)
        .eq('stock_disponible', tipoBoleto.stock_disponible); // Optimistic locking

      if (stockError) {
        return NextResponse.json({ error: 'Error al reservar boletos. Intenta de nuevo.' }, { status: 500 });
      }
    } else {
      // Flujo legacy: validar contra capacidad global (para eventos sin tipo_boleto)
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

    // Usamos el precio real del boleto (determinado dinámicamente)
    const basePrice = parseFloat(price); 
    const subtotal = basePrice * qty;
    const cargoServicio = subtotal * 0.10; // 10%
    const total = subtotal + cargoServicio;

    // Calcular desglose real (Para el paso 6 del diagrama: Cálculo comisión plataforma vs neto)
    const comisionPlataforma = cargoServicio; 
    const netoOrganizador = subtotal; 

    const ordenId = `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // 2. Crear la Orden (Paso 4: Orden Pending)
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
      // Si falla la orden, restaurar stock
      if (tipoBoletoId) {
        // Restaurar stock directamente
        const { data: tipoData } = await supabase.from('tipo_boleto').select('stock_disponible').eq('id', tipoBoletoId).single();
        if (tipoData) {
          await supabase.from('tipo_boleto').update({ stock_disponible: tipoData.stock_disponible + qty }).eq('id', tipoBoletoId);
        }
      }
      return NextResponse.json({ error: 'No se pudo generar la orden temporal.' }, { status: 500 });
    }

    const pagoId = `PAG-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    // 3. Crear el Pago en estado en_espera
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
      console.warn('Advertencia DB: No se pudo registrar el pago inicial (puede faltar la tabla pago o columnas).', pagoError);
    }

    // 4. Crear los boletos temporales para reservar cupo (Paso 3 y 5 parciales)
    const boletosToInsert = Array.from({ length: qty }).map(() => {
       const bolId = `BOL-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
       return {
           id: bolId,
           evento_id: eventId,
           orden_id: orden.id, // Según webhook (boleto->orden)
           precio: basePrice * 1.10,
           tipo: type,
           estado: 'reservado', 
           codigo_qr: `PENDIENTE-${bolId}`, // String único temporal para esquivar el UNIQUE constraint
       };
    });

    const { error: boletosError } = await supabase
      .from('boleto')
      .insert(boletosToInsert);

    if (boletosError) {
       console.warn('Advertencia DB: No se insertaron boletos (puede faltar tabla boleto o col orden_id).', boletosError);
    }

    // 5. Crear PaymentIntent en Stripe (Paso 7 del Diagrama)
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_dummy') {
        // Enviar respuesta clara al frontend para informar que faltan keys.
        return NextResponse.json({ 
            error: 'Falta configurar STRIPE_SECRET_KEY en el backend para cobrar con Stripe real. Agrega tu secret key en .env.local para continuar.',
            orden_id: orden.id,
        }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100), // Envia centavos a Stripe
      currency: 'mxn',
      metadata: {
        orden_id: orden.id,
        evento_id: eventId,
        user_id: user.id,
        tipo_boleto_id: tipoBoletoId || '',
        tipo_boleto_nombre: type,
        cantidad: qty.toString(),
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
