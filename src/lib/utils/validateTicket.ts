import { createClient } from '@/lib/supabase/server'
import { validateQRPayload } from './generateSecureQR'
import type { Boleto } from '@/types'

export interface ValidationResult {
  valid: boolean
  message: string
  ticket?: Boleto
}

/**
 * Valida un boleto completo:
 * 1. Verifica la firma HMAC del QR
 * 2. Busca el boleto en Supabase
 * 3. Verifica que no haya sido usado
 * 4. Marca el boleto como usado
 */
export async function validateAndUseTicket(
  qrContent: string,
  eventoId: string
): Promise<ValidationResult> {
  // Paso 1 — verificar firma del QR
  const payload = validateQRPayload(qrContent)

  if (!payload) {
    return {
      valid: false,
      message: 'QR inválido o expirado',
    }
  }

  // Paso 2 — verificar que el QR es del evento correcto
  if (payload.eventId !== eventoId) {
    return {
      valid: false,
      message: 'Este QR no corresponde a este evento',
    }
  }

  const supabase = await createClient()

  // Paso 3 — buscar boleto en la base de datos
  const { data: boleto, error } = await supabase
    .from('tickets')
    .select('*, evento:evento(*)')
    .eq('id', payload.ticketId)
    .eq('evento_id', eventoId)
    .single()

  if (error || !boleto) {
    return {
      valid: false,
      message: 'Boleto no encontrado',
    }
  }

  // Paso 4 — verificar que no ha sido usado
  if (boleto.estado === 'vendido') {
    return {
      valid: false,
      message: 'Este boleto ya fue usado',
    }
  }

  // Paso 5 — verificar que está confirmado (pagado)
  if (boleto.estado !== 'vendido') {
    return {
      valid: false,
      message: 'Boleto no válido — pago pendiente',
    }
  }

  // Paso 6 — marcar como usado
  const { error: updateError } = await supabase
    .from('tickets')
    .update({ estado: 'vendido' })
    .eq('id', payload.ticketId)

  if (updateError) {
    return {
      valid: false,
      message: 'Error al procesar el boleto',
    }
  }

  return {
    valid: true,
    message: '✓ Boleto válido — acceso permitido',
    ticket: boleto,
  }
}
