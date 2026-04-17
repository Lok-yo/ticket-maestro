export const SEATS_IO_REGION = 'na' as const

export function getSeatsIoVenueChartKey(): string | undefined {
  const k = process.env.SEATS_IO_VENUE_CHART_KEY?.trim()
  return k || undefined
}

/**
 * Crea un evento en seats.io ligado al chart del venue.
 * @see https://docs.seats.io/docs/api/create-an-event/
 */
export async function createSeatsIoEventForTicketEvent(params: {
  secretKey: string
  chartKey: string
  eventKey: string
  name: string
  /** yyyy-MM-dd opcional */
  date?: string | null
}): Promise<void> {
  const auth = 'Basic ' + Buffer.from(params.secretKey + ':').toString('base64')
  const body: Record<string, unknown> = {
    chartKey: params.chartKey,
    eventKey: params.eventKey,
    name: params.name,
  }
  if (params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)) {
    body.date = params.date
  }

  const res = await fetch(`https://api-${SEATS_IO_REGION}.seatsio.net/events`, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`seats.io create event failed (${res.status}): ${text}`)
  }
}
