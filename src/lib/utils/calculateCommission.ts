export interface CommissionResult {
  subtotal: number
  cargo_servicio: number
  comision_organizadora: number
  monto_neto: number
  monto_retenido: number
  total: number
}

/**
 * Calcula la comisión automáticamente:
 * - Boletos hasta $500: 15% cargo de servicio
 * - Boletos mayores a $500: 10% cargo de servicio
 * 
 * Del cargo de servicio:
 * - 70% es para el equipo de desarrollo (monto_retenido)
 * - 30% va a la organizadora como comisión extra (comision_organizadora)
 */
export function calculateCommission(
  precioBoleto: number,
  cantidad: number = 1
): CommissionResult {
  const subtotal = precioBoleto * cantidad

  // Regla de negocio: precio base define el porcentaje
  const tasaCargo = precioBoleto <= 500 ? 0.15 : 0.10

  // Cargo de servicio total (lo que gana el equipo de desarrollo)
  const cargo_servicio = Math.round(subtotal * tasaCargo * 100) / 100

  // Comisión para el organizador (lo que recibe extra)
  const comision_organizadora = Math.round(cargo_servicio * 0.30 * 100) / 100

  // Lo que retiene el equipo de desarrollo
  const monto_retenido = Math.round(cargo_servicio * 0.70 * 100) / 100

  // Lo que recibe el organizador en total
  const monto_neto = Math.round((subtotal - cargo_servicio + comision_organizadora) * 100) / 100

  return {
    subtotal,
    cargo_servicio,
    comision_organizadora,
    monto_neto,
    monto_retenido,
    total: subtotal,
  }
}

/**
 * Formatea a moneda MXN
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount)
}
