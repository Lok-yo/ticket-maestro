export const ADMIN_VALID_PAYMENT_STATUS = 'exitoso' as const
export const ADMIN_VALID_ORDER_STATUS = 'pagada' as const
export const ADMIN_ESCROW_RETAINED = 'retenido' as const
export const ADMIN_ESCROW_RELEASED = 'liberado' as const

export function toNumberSafe(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

