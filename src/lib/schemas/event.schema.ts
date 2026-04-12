import { z } from 'zod'

export const createEventSchema = z.object({
  titulo: z
    .string()
    .min(3, 'El título debe tener al menos 3 caracteres')
    .max(100, 'El título no puede exceder 100 caracteres'),
  descripcion: z
    .string()
    .min(10, 'La descripción debe tener al menos 10 caracteres')
    .max(1000, 'La descripción no puede exceder 1000 caracteres'),
  ubicacion: z
    .string()
    .min(3, 'La ubicación debe tener al menos 3 caracteres'),
  fecha: z
    .string()
    .refine(date => new Date(date) > new Date(), {
      message: 'La fecha del evento debe ser en el futuro',
    }),
  capacidad: z
    .number()
    .int('La capacidad debe ser un número entero')
    .min(1, 'Debe haber al menos 1 lugar')
    .max(100000, 'No puede exceder 100,000 lugares'),
  categoria_id: z
    .string()
    .min(1, 'La categoría es requerida'),
  precio_base: z
    .number()
    .min(0, 'El precio no puede ser negativo')
    .max(1000000, 'El precio es demasiado alto'),
  imagen: z
    .string()
    .url('Debe ser una URL válida')
    .optional()
    .or(z.literal('')),
})

export const updateEventSchema = createEventSchema.partial().extend({
  estado: z.enum(['activo', 'cancelado', 'finalizado']).optional(),
})

export type CreateEventInput = z.infer<typeof createEventSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>