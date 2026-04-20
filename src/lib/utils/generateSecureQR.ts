import crypto from 'crypto'

const SECRET = process.env.NEXTAUTH_SECRET!

/**
 * Genera un payload firmado con HMAC para el QR
 * El QR contiene: ticketId + eventId + userId + expiración + firma
 */
export function generateQRPayload(
  ticketId: string,
  eventId: string,
  userId: string,
  eventDate: string
): string {
  const expiresAt = new Date(eventDate)
  expiresAt.setDate(expiresAt.getDate() + 1) // expira 1 día después del evento

  const payload = {
    ticketId,
    eventId,
    userId,
    expiresAt: expiresAt.toISOString(),
  }

  const data = JSON.stringify(payload)
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(data)
    .digest('hex')

  // El QR guarda el payload + firma en base64
  const qrContent = Buffer.from(
    JSON.stringify({ ...payload, signature })
  ).toString('base64')

  return qrContent
}

/**
 * Valida un QR escaneado en la puerta
 * Retorna el payload si es válido, null si es falso o expirado
 */
export function validateQRPayload(qrContent: string): {
  ticketId: string
  eventId: string
  userId: string
  expiresAt: string
} | null {
  try {
    const decoded = JSON.parse(Buffer.from(qrContent, 'base64').toString('utf8'))
    const { signature, ...payload } = decoded

    // Verificar firma
    const data = JSON.stringify(payload)
    const expectedSignature = crypto
      .createHmac('sha256', SECRET)
      .update(data)
      .digest('hex')

    if (signature !== expectedSignature) {
      console.error('QR inválido: firma incorrecta')
      return null
    }

    // Verificar expiración
    if (new Date() > new Date(payload.expiresAt)) {
      console.error('QR expirado')
      return null
    }

    return payload
  } catch {
    console.error('QR malformado')
    return null
  }
}
