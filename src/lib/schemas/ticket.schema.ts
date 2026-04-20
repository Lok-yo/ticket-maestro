import { z } from 'zod'

export const buyTicketSchema = z.object({
  evento_id: z
    .string()
    .min(1, 'ID de evento requerido'),
  tipo: z
    .string()
    .min(1, 'El tipo de boleto es requerido'),
  cantidad: z
    .number()
    .int('La cantidad debe ser un número entero')
    .min(1, 'Debes comprar al menos 1 boleto')
    .max(10, 'No puedes comprar más de 10 boletos a la vez'),
})

export const validateTicketSchema = z.object({
  codigo_qr: z
    .string()
    .min(1, 'Código QR requerido'),
  evento_id: z
    .string()
    .min(1, 'ID de evento requerido'),
})

export type BuyTicketInput = z.infer<typeof buyTicketSchema>
export type ValidateTicketInput = z.infer<typeof validateTicketSchema>
