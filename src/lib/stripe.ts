import Stripe from 'stripe'

// Cliente de Stripe — se inicializa con la secret key o un valor dummy durante el build de Next.js
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key_for_build_only', {
  apiVersion: '2025-03-31.basil',
  typescript: true,
})

/**
 * Crea un PaymentIntent de Stripe
 * Se llama cuando el usuario confirma su compra
 */
export async function createPaymentIntent(
  monto: number,
  ordenId: string,
  eventoId: string,
  usuarioEmail: string
) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(monto * 100), // Stripe maneja centavos
    currency: 'mxn',
    metadata: {
      orden_id: ordenId,
      evento_id: eventoId,
      usuario_email: usuarioEmail,
    },
    receipt_email: usuarioEmail,
  })

  return paymentIntent
}

/**
 * Verifica la firma del webhook de Stripe
 * Garantiza que el webhook viene realmente de Stripe
 */
export function verifyStripeWebhook(
  payload: string,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )
}

/**
 * Procesa un reembolso
 */
export async function createRefund(
  paymentIntentId: string,
  monto?: number
) {
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    ...(monto && { amount: Math.round(monto * 100) }),
  })

  return refund
}
