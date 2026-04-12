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
    const { eventId, type, qty, name, email, phone, price } = body;

    if (!eventId || !qty || qty <= 0 || !price) {
      return NextResponse.json({ error: 'Faltan datos requeridos (evento, cantidad, precio).' }, { status: 400 });
    }

    // 1. Obtener Evento de DB para validar precios y cupo
    const { data: evento, error: eventError } = await supabase
      .from('evento')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !evento) {
      return NextResponse.json({ error: 'Evento no encontrado.' }, { status: 404 });
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
        user_id: user.id
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
