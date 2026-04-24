import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyStripeWebhook } from '@/lib/stripe'

const REGION = 'na'; // Región que estás usando

// Helper para confirmar asientos como vendidos en seats.io
async function bookSeatsInSeatsIo(seatIds: string[], holdToken: string, seatsEventKey: string) {
  if (!seatIds?.length || !holdToken || !seatsEventKey) return;

  const secretKey = process.env.SEATS_IO_SECRET_KEY;
  if (!secretKey) {
    console.warn('SEATS_IO_SECRET_KEY no configurada en webhook');
    return;
  }

  const auth = 'Basic ' + Buffer.from(secretKey + ':').toString('base64');

  try {
    const bookRes = await fetch(`https://api-${REGION}.seatsio.net/events/${seatsEventKey}/actions/book`, {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        objects: seatIds, 
        holdToken 
      }),
    });

    if (bookRes.ok) {
      console.log(`✓ Asientos confirmados en seats.io: ${seatIds.join(', ')}`);
    } else {
      const err = await bookRes.text();
      console.error('Error al confirmar asientos en seats.io:', err);
    }
  } catch (err) {
    console.error('Error en llamada a seats.io (book):', err);
  }
}

// Helper para liberar asientos en caso de fallo
async function releaseSeatsInSeatsIo(seatIds: string[], holdToken: string, seatsEventKey: string) {
  if (!seatIds?.length || !holdToken || !seatsEventKey) return;

  const secretKey = process.env.SEATS_IO_SECRET_KEY;
  if (!secretKey) return;

  const auth = 'Basic ' + Buffer.from(secretKey + ':').toString('base64');

  try {
    await fetch(`https://api-${REGION}.seatsio.net/events/${seatsEventKey}/actions/release`, {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        objects: seatIds, 
        holdToken 
      }),
    });
    console.log(`↩ Asientos liberados en seats.io: ${seatIds.join(', ')}`);
  } catch (err) {
    console.error('Error liberando asientos en seats.io:', err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'Firma de Stripe requerida' }, { status: 400 });
    }

    let event: any
    try {
      event = verifyStripeWebhook(body, signature)
    } catch (err) {
      console.error('Firma de Stripe inválida:', err)
      return NextResponse.json({ error: 'Webhook inválido' }, { status: 400 });
    }

    const supabase = await createClient()

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object
        const ordenId = paymentIntent.metadata?.order_id

        if (!ordenId) {
          console.error('No se encontró order_id en metadata')
          break
        }

        const seatIdsRaw = paymentIntent.metadata?.seat_ids;
        const holdToken = paymentIntent.metadata?.hold_token;
        const seatsEventKey = paymentIntent.metadata?.seats_event_key;
        let seatIds: string[] = [];

        if (seatIdsRaw) {
          try {
            seatIds = JSON.parse(seatIdsRaw);
          } catch (e) {
            console.error('Error parseando seat_ids:', e);
          }
        }

        // 1. Actualizar Pago
        await supabase
          .from('payments')
          .update({
            status: 'successful',
            provider_payment_id: paymentIntent.id,
          })
          .eq('order_id', ordenId)

        // 2. Actualizar Orden
        await supabase
          .from('orders')
          .update({ status: 'pagada' })
          .eq('id', ordenId)

        // 3. Confirmar Asientos en Seats.io
        if (seatIds.length > 0 && holdToken && seatsEventKey) {
          await bookSeatsInSeatsIo(seatIds, holdToken, seatsEventKey);
        }

        // 4. Actualizar Balance del Organizador
        const { data: pagoRegistrado } = await supabase
          .from('payments')
          .select('retained_amount, available_to_organizer')
          .eq('order_id', ordenId)
          .single();

        const { data: orden } = await supabase
          .from('orders')
          .select('events(organizador_id)')
          .eq('id', ordenId)
          .single();

        const organizadorId = Array.isArray(orden?.events) ? orden?.events[0]?.organizador_id : orden?.events?.organizador_id;

        if (pagoRegistrado && organizadorId) {
          const available = Number(pagoRegistrado.available_to_organizer) || 0;
          const retained = Number(pagoRegistrado.retained_amount) || 0;
          const totalEarned = available + retained;

          const { data: balanceActual } = await supabase
            .from('organizer_balances')
            .select('*')
            .eq('organizer_id', organizadorId)
            .single();

          if (balanceActual) {
            await supabase.from('organizer_balances').update({
              available_balance: Number(balanceActual.available_balance) + available,
              retained_balance: Number(balanceActual.retained_balance) + retained,
              total_earned: Number(balanceActual.total_earned) + totalEarned,
              updated_at: new Date().toISOString()
            }).eq('organizer_id', organizadorId);
          } else {
            await supabase.from('organizer_balances').insert({
              organizer_id: organizadorId,
              available_balance: available,
              retained_balance: retained,
              total_earned: totalEarned
            });
          }
        }

        console.log(`✓ Pago completado para orden ${ordenId}`)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object
        const ordenId = paymentIntent.metadata?.order_id
        const tipoBoletoId = paymentIntent.metadata?.tipo_boleto_id

        const seatIdsRaw = paymentIntent.metadata?.seat_ids;
        const holdToken = paymentIntent.metadata?.hold_token;
        const seatsEventKey = paymentIntent.metadata?.seats_event_key;

        let seatIds: string[] = [];
        if (seatIdsRaw) {
          try {
            seatIds = JSON.parse(seatIdsRaw);
          } catch (e) {
            console.error('Error parseando seat_ids:', e);
          }
        }

        if (seatIds.length > 0 && holdToken && seatsEventKey) {
          await releaseSeatsInSeatsIo(seatIds, holdToken, seatsEventKey);
        }

        if (!ordenId) break

        await supabase.from('payments').update({ status: 'failed' }).eq('order_id', ordenId)
        await supabase.from('orders').update({ status: 'cancelada' }).eq('id', ordenId)
        
        // Cancelar tickets temporalmente creados
        const { data: ticketsCanceled } = await supabase
          .from('tickets')
          .update({ status: 'cancelado' })
          .eq('order_id', ordenId)
          .select('id')

        // Restaurar stock del tipo de boleto
        if (tipoBoletoId && ticketsCanceled && ticketsCanceled.length > 0) {
          const cantidad = ticketsCanceled.length;
          const { data: tipoBoleto } = await supabase
            .from('ticket_types')
            .select('available_stock')
            .eq('id', tipoBoletoId)
            .single();

          if (tipoBoleto) {
            await supabase
              .from('ticket_types')
              .update({ available_stock: tipoBoleto.available_stock + cantidad })
              .eq('id', tipoBoletoId);
          }
        }

        console.log(`✗ Pago fallido para orden ${ordenId}`)
        break
      }

      default:
        console.log(`Evento no manejado: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error en webhook:', error)
    return NextResponse.json({ error: 'Error interno en webhook' }, { status: 500 })
  }
}