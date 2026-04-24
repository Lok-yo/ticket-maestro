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
    
    const {
      eventId,
      type, // Zona
      qty,
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

    if (!eventId || !qty || qty <= 0 || !tipoBoletoId) {
      return NextResponse.json({ error: 'Faltan datos requeridos (evento, cantidad, tipo de boleto).' }, { status: 400 });
    }

    const seatsSecretKey = process.env.SEATS_IO_SECRET_KEY;

    // 1. Obtener Evento
    const { data: evento, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !evento) {
      return NextResponse.json({ error: 'Evento no encontrado.' }, { status: 404 });
    }

    const hasSeatMapConfigured = !!evento.seats_evento_key;
    let usingSeatsIo = false;

    if (hasSeatMapConfigured) {
      if (
        !seatsSecretKey ||
        !holdToken ||
        seatIds.length !== qty ||
        seatIds.length === 0 ||
        seatsEventKey !== evento.seats_evento_key
      ) {
        return NextResponse.json(
          { error: 'Este evento requiere una selección de asientos válida en el mapa.' },
          { status: 400 }
        );
      }
      usingSeatsIo = true;
    }

    // 2. Validar stock del tipo de boleto
    const { data: tipoBoleto, error: tipoError } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('id', tipoBoletoId)
      .eq('event_id', eventId)
      .single();

    if (tipoError || !tipoBoleto) {
      return NextResponse.json({ error: 'Tipo de boleto no encontrado para este evento.' }, { status: 404 });
    }

    if (tipoBoleto.available_stock < qty) {
      return NextResponse.json({ 
        error: `Stock insuficiente para ${tipoBoleto.nombre}. Solo quedan ${tipoBoleto.available_stock} disponibles.` 
      }, { status: 400 });
    }

    const basePrice = parseFloat(String(tipoBoleto.precio));
    const tipoNombreBoleto = String(tipoBoleto.nombre);

    if (usingSeatsIo) {
      for (const objectId of seatIds) {
        const det = seatDetails.find((d) => d.objectId === objectId);
        const cat = det?.category || type;
        if (!seatCategoryMatchesTicketType(String(cat), tipoNombreBoleto)) {
          return NextResponse.json(
            { error: `Los asientos deben ser de la zona "${tipoNombreBoleto}".` },
            { status: 400 }
          );
        }
      }
    } else {
      if (type && !seatCategoryMatchesTicketType(String(type), tipoNombreBoleto)) {
        return NextResponse.json(
          { error: 'El tipo de boleto no coincide con la zona seleccionada.' },
          { status: 400 }
        );
      }
    }

    // Decrementar stock
    const { error: stockError } = await supabase
      .from('ticket_types')
      .update({ available_stock: tipoBoleto.available_stock - qty })
      .eq('id', tipoBoletoId)
      .eq('available_stock', tipoBoleto.available_stock);

    if (stockError) {
      return NextResponse.json({ error: 'Error al reservar boletos por conflicto de stock.' }, { status: 500 });
    }

    // 3. Cálculos Financieros (10% Platform, 30% Retained, 70% Available)
    const subtotal = basePrice * qty;
    const platformFee = subtotal * 0.10;
    const total = subtotal + platformFee;
    
    const porcentajeRetencion = 0.30;
    const montoRetenido = subtotal * porcentajeRetencion;
    const montoDisponible = subtotal - montoRetenido; // 70%

    // 4. Crear Orden
    const ordenId = randomUUID();
    const { error: ordenError } = await supabase
      .from('orders')
      .insert({
        id: ordenId,
        user_id: user.id,
        event_id: eventId,
        total_amount: total,
        subtotal: subtotal,
        status: 'pendiente'
      });

    if (ordenError) {
      console.error('Error insertando orden:', ordenError);
      // Revertir stock
      await supabase.from('ticket_types')
        .update({ available_stock: tipoBoleto.available_stock })
        .eq('id', tipoBoletoId);
      return NextResponse.json({ error: 'No se pudo generar la orden.' }, { status: 500 });
    }

    // 5. Crear Payment
    const pagoId = randomUUID();
    await supabase.from('payments').insert({
      id: pagoId,
      order_id: ordenId,
      provider: 'stripe',
      amount: total,
      platform_fee: platformFee,
      retained_amount: montoRetenido,
      available_to_organizer: montoDisponible,
      status: 'pending'
    });

    // 6. Crear Tickets
    const boletosToInsert = Array.from({ length: qty }).map((_, index) => {
      const bolId = randomUUID();
      const oid = usingSeatsIo ? seatIds[index] : null;
      const meta = oid ? seatDetails.find((m) => m.objectId === oid) : null;
      return {
        id: bolId,
        order_id: ordenId,
        user_id: user.id,
        event_id: eventId,
        ticket_type_id: tipoBoletoId,
        seat_label: meta?.label || oid || null,
        qr_code: bolId, // simple uuid as qr code string
        status: 'valido'
      };
    });

    const { error: boletosError } = await supabase.from('tickets').insert(boletosToInsert);
    if (boletosError) {
      console.warn('Advertencia DB: No se insertaron tickets temporales.', boletosError);
    }

    // 7. Crear PaymentIntent en Stripe
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_dummy') {
      return NextResponse.json({ 
        error: 'Falta configurar STRIPE_SECRET_KEY en el backend.',
        orden_id: ordenId,
      }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      currency: 'mxn',
      metadata: {
        order_id: ordenId,
        event_id: eventId,
        user_id: user.id,
        tipo_boleto_id: tipoBoletoId,
        seat_ids: usingSeatsIo ? JSON.stringify(seatIds) : '',
        hold_token: holdToken || '',
        seats_event_key: usingSeatsIo ? String(evento.seats_evento_key || '') : '',
      },
    });

    // Save payment intent to order
    await supabase.from('orders').update({ stripe_payment_intent: paymentIntent.id }).eq('id', ordenId);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      ordenId: ordenId
    });

  } catch (error: any) {
    console.error('Error total en checkout API:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}