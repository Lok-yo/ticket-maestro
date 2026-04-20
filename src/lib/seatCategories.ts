/** Normaliza etiquetas de categoría del chart seats.io y de `tipo_boleto.nombre`. */
export function normalizeSeatCategory(name: string): string {
  return name.trim().toLowerCase()
}

export function seatCategoryMatchesTicketType(
  chartCategoryLabel: string,
  tipoBoletoNombre: string
): boolean {
  return normalizeSeatCategory(chartCategoryLabel) === normalizeSeatCategory(tipoBoletoNombre)
}

/** Stocks fijos del venue estándar (debe coincidir con el chart en seats.io). */
export const VENUE_SEAT_STOCKS: Record<string, number> = {
  General: 402,
  Preferente: 217,
  VIP: 241,
}

/** Claves de categoría típicas en el chart; `selectableObjects` usa `category:<key>`. */
export function categoryKeysForSeatsIoFilter(displayName: string): string[] {
  const n = displayName.trim()
  return [`category:${n}`, `category:${normalizeSeatCategory(n)}`]
}

