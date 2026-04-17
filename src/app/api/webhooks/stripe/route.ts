import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateQRPayload } from '@/lib/utils/generateSecureQR'
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
      console.log(`✓ Asientos confirmados como vendidos en seats.io: ${seatIds.join(', ')}`);
    } else {
      const err = await bookRes.text();
      console.error('Error al book seats en seats.io:', err);
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
      // Pago completado exitosamente
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object
        const ordenId = paymentIntent.metadata?.orden_id

        if (!ordenId) {
          console.error('No se encontró orden_id en metadata')
          break
        }

        // === NUEVO: EXTRAER DATOS DE SEATS.IO DEL METADATA ===
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

        // Actualizar estado del pago
        const { error: pagoError } = await supabase
          .from('pago')
          .update({
            estado: 'exitoso',
            referencia: paymentIntent.id,
          })
          .eq('orden_id', ordenId)

        if (pagoError) {
          console.error('Error actualizando pago:', pagoError)
        }

        // Actualizar estado de la orden
        await supabase
          .from('orden')
          .update({ estado: 'pagada' })
          .eq('id', ordenId)

        // Obtener boletos de la orden
        const { data: orden, error: ordenErr } = await supabase
          .from('orden')
          .select('*, boleto(*, evento(*))')
          .eq('id', ordenId)
          .single()

        if (ordenErr) console.error('Error al obtener orden:', ordenErr)
        if (!orden?.boleto || orden.boleto.length === 0) {
          console.error('Orden no tiene boletos.')
          break
        }

        const primerBoleto = orden.boleto[0];
        const eventoDelBoleto = Array.isArray(primerBoleto.evento) 
          ? primerBoleto.evento[0] 
          : primerBoleto.evento;
        const organizadorId = eventoDelBoleto?.organizador_id;

        // === NUEVO: CONFIRMAR ASIENTOS EN SEATS.IO ===
        if (seatIds.length > 0 && holdToken && seatsEventKey) {
          await bookSeatsInSeatsIo(seatIds, holdToken, seatsEventKey);

          // Actualizar tabla asiento en Supabase
          const eventoIdMeta = primerBoleto?.evento_id as string | undefined;
          if (eventoIdMeta) {
            await supabase
              .from('asiento')
              .update({
                estado: 'vendido',
                hold_token: null,
              })
              .eq('evento_id', eventoIdMeta)
              .in('seats_object_id', seatIds);
          } else {
            await supabase
              .from('asiento')
              .update({
                estado: 'vendido',
                hold_token: null,
              })
              .in('seats_object_id', seatIds);
          }
        }

        // Calcular monto retenido y actualizar balance del organizador (tu lógica original)
        const { data: pagoRegistrado } = await supabase
          .from('pago')
          .select('monto_retenido')
          .eq('orden_id', ordenId)
          .single();
          
        const montoRetenido = pagoRegistrado?.monto_retenido || 0;

        if (organizadorId && montoRetenido > 0) {
          const { data: balanceActual } = await supabase
            .from('balance_organizador')
            .select('*')
            .eq('organizador_id', organizadorId)
            .single();

          if (balanceActual) {
            await supabase.from('balance_organizador').update({
              saldo_disponible: Number(balanceActual.saldo_disponible) + Number(montoRetenido),
              total_ganado: Number(balanceActual.total_ganado) + Number(montoRetenido),
              ultima_actualizacion: new Date().toISOString()
            }).eq('organizador_id', organizadorId);
          } else {
            await supabase.from('balance_organizador').insert({
              organizador_id: organizadorId,
              saldo_disponible: Number(montoRetenido),
              total_ganado: Number(montoRetenido)
            });
          }
        }

        // Generar QR y marcar boletos como vendidos (tu lógica original)
        for (const boleto of orden.boleto) {
          const qrPayload = generateQRPayload(
            boleto.id,
            boleto.evento_id,
            orden.usuario_id,
            boleto.evento.fecha,
          )

          await supabase
            .from('boleto')
            .update({
              estado: 'vendido',
              codigo_qr: qrPayload,
              fecha_emision: new Date().toISOString(),
            })
            .eq('id', boleto.id)
        }

        console.log(`✓ Pago completado para orden ${ordenId}`)
        break
      }

      // Pago fallido
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object
        const ordenId = paymentIntent.metadata?.orden_id
        const tipoBoletoId = paymentIntent.metadata?.tipo_boleto_id
        const cantidad = parseInt(paymentIntent.metadata?.cantidad || '0', 10)

        // === NUEVO: LIBERAR ASIENTOS EN SEATS.IO ===
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

        // Marcar pago como fallido
        await supabase
          .from('pago')
          .update({ estado: 'fallido' })
          .eq('orden_id', ordenId)

        // Marcar orden como cancelada
        await supabase
          .from('orden')
          .update({ estado: 'cancelada' })
          .eq('id', ordenId)

        // Liberar boletos
        await supabase
          .from('boleto')
          .update({ estado: 'disponible' })
          .eq('orden_id', ordenId)
          .eq('estado', 'reservado')

        // Restaurar stock del tipo de boleto
        if (tipoBoletoId && cantidad > 0) {
          const { data: tipoBoleto } = await supabase
            .from('tipo_boleto')
            .select('stock_disponible')
            .eq('id', tipoBoletoId)
            .single();

          if (tipoBoleto) {
            await supabase
              .from('tipo_boleto')
              .update({ stock_disponible: tipoBoleto.stock_disponible + cantidad })
              .eq('id', tipoBoletoId);
          }
        }

        console.log(`✗ Pago fallido para orden ${ordenId}`)
        break
      }

      // Reembolso procesado (mantenemos tu lógica)
      case 'charge.refunded': {
        const charge = event.data.object
        const ordenId = charge.metadata?.orden_id
        const tipoBoletoId = charge.metadata?.tipo_boleto_id
        const cantidad = parseInt(charge.metadata?.cantidad || '0', 10)

        if (!ordenId) break

        await supabase
          .from('pago')
          .update({ estado: 'fallido' })
          .eq('orden_id', ordenId)

        const { data: boletosOrden } = await supabase
          .from('boleto')
          .select('id')
          .eq('orden_id', ordenId)
          .eq('estado', 'vendido');

        if (boletosOrden && boletosOrden.length > 0) {
          await supabase
            .from('boleto')
            .update({ estado: 'disponible' })
            .in('id', boletosOrden.map(b => b.id));
        }

        if (tipoBoletoId && cantidad > 0) {
          const { data: tipoBoleto } = await supabase
            .from('tipo_boleto')
            .select('stock_disponible')
            .eq('id', tipoBoletoId)
            .single();

          if (tipoBoleto) {
            await supabase
              .from('tipo_boleto')
              .update({ stock_disponible: tipoBoleto.stock_disponible + cantidad })
              .eq('id', tipoBoletoId);
          }
        }

        console.log(`↩ Reembolso procesado para orden ${ordenId}`)
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