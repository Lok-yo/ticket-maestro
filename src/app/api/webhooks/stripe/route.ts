import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateQRPayload } from '@/lib/utils/generateSecureQR'
import { verifyStripeWebhook } from '@/lib/stripe'

// POST /api/webhooks/stripe — confirma pagos y genera QR
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    // Verificar que viene de Stripe
    if (!signature) {
      return NextResponse.json(
        { error: 'Firma de Stripe requerida' },
        { status: 400 }
      )
    }

    // Cuando tengamos las keys de Stripe verificamos la firma
    // Por ahora parseamos el body directo para desarrollo
    let event: any
    try {
      event = verifyStripeWebhook(body, signature)
    } catch (err) {
      console.error('Firma de Stripe inválida:', err)
      return NextResponse.json(
        { error: 'Webhook inválido' },
        { status: 400 }
      )
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
          break
        }

        // Actualizar estado de la orden
        await supabase
          .from('orden')
          .update({ estado: 'pagada' })
          .eq('id', ordenId)

        // Obtener boletos de la orden para generar QR y saber el organizador
        const { data: orden, error: ordenErr } = await supabase
          .from('orden')
          .select('*, boleto(*, evento(*))')
          .eq('id', ordenId)
          .single()

        if (ordenErr) console.error('Error al obtener orden anidada:', ordenErr)
        if (!orden?.boleto || orden.boleto.length === 0) {
            console.error('Orden no tiene boletos. Saliendo de webhook balance.')
            break
        }

        // Acceder a las relaciones de Supabase considerando que pueden venir como objetos o arrays
        const primerBoleto = orden.boleto[0];
        const eventoDelBoleto = Array.isArray(primerBoleto.evento) ? primerBoleto.evento[0] : primerBoleto.evento;
        const organizadorId = eventoDelBoleto?.organizador_id;
        
        console.log("-> Organizador ID extraído:", organizadorId);

        // Calcular monto retenido total en base a los boletos 
        const { data: pagoRegistrado } = await supabase
          .from('pago')
          .select('monto_retenido')
          .eq('orden_id', ordenId)
          .single();
          
        const montoRetenido = pagoRegistrado?.monto_retenido || 0;
        console.log("-> Monto Retenido: ", montoRetenido);

        // Sumar al Organizador
        if (organizadorId && montoRetenido > 0) {
            const { data: balanceActual } = await supabase
               .from('balance_organizador')
               .select('*')
               .eq('organizador_id', organizadorId)
               .single();

            if (balanceActual) {
               const { error: updErr } = await supabase.from('balance_organizador').update({
                  saldo_disponible: Number(balanceActual.saldo_disponible) + Number(montoRetenido),
                  total_ganado: Number(balanceActual.total_ganado) + Number(montoRetenido),
                  ultima_actualizacion: new Date().toISOString()
               }).eq('organizador_id', organizadorId);
               if (updErr) console.error("Error al actualizar balance:", updErr);
               else console.log("Balance ACTUALIZADO exitosamente.")
            } else {
               const { error: insErr } = await supabase.from('balance_organizador').insert({
                  organizador_id: organizadorId,
                  saldo_disponible: Number(montoRetenido),
                  total_ganado: Number(montoRetenido)
               });
               if (insErr) console.error("Error al insertar balance:", insErr);
               else console.log("Balance INSERTADO exitosamente.")
            }
        }

        // Generar QR seguro para cada boleto y confirmarlos
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

        // Registrar en audit log, este segmento lo meti de mejora, seria crear otra tabla en la BD y esto nos ayudaria en un futuro para
        // registrar todo lo que pasa en el sistema quién validó qué boleto, cuándo se procesó un pago, si hubo intentos de fraude. 
        // Si en el futuro hay una disputa con un cliente puedes decir exactamente qué pasó y cuándo, o almenos asi me aconsejo una IA
        /*await supabase
          .from('audit_logs')
          .insert({
            usuario_id: orden.usuario_id,
            accion: 'payment_completed',
            detalle: {
              orden_id: ordenId,
              referencia: paymentIntent.id,
              monto: paymentIntent.amount / 100,
              fecha: new Date().toISOString(),
            },
          })*/

        console.log(`✓ Pago completado para orden ${ordenId}`)
        break
      }

      // Pago fallido
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object
        const ordenId = paymentIntent.metadata?.orden_id

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

        // Liberar boletos para que otros puedan comprarlos
        await supabase
          .from('boleto')
          .update({ estado: 'disponible' })
          .eq('evento_id', paymentIntent.metadata?.evento_id)
          .eq('estado', 'reservado')

        console.log(`✗ Pago fallido para orden ${ordenId}`)
        break
      }

      // Reembolso procesado
      case 'charge.refunded': {
        const charge = event.data.object
        const ordenId = charge.metadata?.orden_id

        if (!ordenId) break

        await supabase
          .from('pago')
          .update({ estado: 'fallido' })
          .eq('orden_id', ordenId)

        await supabase
          .from('boleto')
          .update({ estado: 'disponible' })
          .in('id',
            (await supabase
              .from('boleto')
              .select('id')
              .eq('estado', 'vendido')
            ).data?.map(b => b.id) || []
          )

        console.log(`↩ Reembolso procesado para orden ${ordenId}`)
        break
      }

      default:
        console.log(`Evento no manejado: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error en webhook:', error)
    return NextResponse.json(
      { error: 'Error interno en webhook' },
      { status: 500 }
    )
  }
}