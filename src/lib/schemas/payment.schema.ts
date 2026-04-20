import { z } from 'zod'

export const createPaymentSchema = z.object({
  orden_id: z
    .string()
    .min(1, 'ID de orden requerido'),
  monto: z
    .number()
    .min(1, 'El monto debe ser mayor a 0'),
  metodo: z.enum(['tarjeta', 'transferencia', 'efectivo']),
})

export const stripeWebhookSchema = z.object({
  type: z.string(),
  data: z.object({
    object: z.record(z.string(), z.unknown()),
  }),
})

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>
export type StripeWebhookInput = z.infer<typeof stripeWebhookSchema>
