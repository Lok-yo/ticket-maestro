export type UserRole = 'admin' | 'cliente' | 'organizador'
export type EventStatus = 'draft' | 'activo' | 'cancelado' | 'finalizado'
export type OrderStatus = 'pendiente' | 'pagada' | 'cancelada'
export type TicketStatus = 'valido' | 'usado' | 'cancelado'
export type PaymentStatus = 'pending' | 'successful' | 'failed'
export type PayoutStatus = 'pending' | 'processed' | 'failed'
export type PayoutType = 'daily_available' | 'event_final_retention'

export interface User {
  id: string
  nombre: string
  email: string
  rol: UserRole
  clabe?: string | null
  fecha_registro: string
}

export interface Category {
  id: string
  nombre: string
  descripcion?: string | null
}

export interface Evento {
  id: string
  titulo: string
  descripcion?: string | null
  fecha: string
  ubicacion: string
  capacidad: number
  estado: EventStatus
  categoria_id?: string | null
  organizador_id?: string | null
  imagen?: string | null
  precio_base?: number
  seats_chart_key?: string | null
  seats_evento_key?: string | null
  created_at: string
  updated_at: string
}

export interface EventStaff {
  id: string
  event_id: string
  user_id: string
  role: string
  created_at: string
}

export interface TicketType {
  id: string
  event_id: string
  nombre: string
  precio: number
  total_stock: number
  available_stock: number
  max_por_compra: number
  created_at: string
}

export interface Order {
  id: string
  user_id?: string | null
  event_id?: string | null
  total_amount: number
  subtotal: number
  status: OrderStatus
  stripe_payment_intent?: string | null
  created_at: string
}

export interface Ticket {
  id: string
  order_id?: string | null
  user_id?: string | null
  event_id?: string | null
  ticket_type_id?: string | null
  seat_label?: string | null
  qr_code: string
  status: TicketStatus
  created_at: string
}

export interface Payment {
  id: string
  order_id?: string | null
  provider: string
  provider_payment_id?: string | null
  amount: number
  platform_fee: number
  retained_amount: number
  available_to_organizer: number
  status: PaymentStatus
  created_at: string
}

export interface OrganizerBalance {
  organizer_id: string
  available_balance: number
  retained_balance: number
  total_earned: number
  updated_at: string
}

export interface Payout {
  id: string
  organizer_id?: string | null
  amount: number
  type: PayoutType
  status: PayoutStatus
  clabe_account: string
  created_at: string
}

export interface Checkin {
  id: string
  ticket_id?: string | null
  scanned_by?: string | null
  status: string
  motivo?: string | null
  scanned_at: string
}

export interface EventoStats {
  tickets: {
    total_sold: number
    total_used: number
    total_remaining: number
    attendance_percentage: number
  }
  checkins_summary: {
    total_attempts: number
    valid: number
    invalid: number
    already_used: number
  }
  recent_checkins: Checkin[]
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}