export type UserRole = 'admin' | 'cliente' | 'organizador'
export type EventStatus = 'activo' | 'cancelado' | 'finalizado'
export type TicketStatus = 'disponible' | 'vendido' | 'reservado'
export type PaymentMethod = 'tarjeta' | 'transferencia' | 'efectivo'
export type PaymentStatus = 'exitoso' | 'fallido' | 'en_espera'
export type OrderStatus = 'pendiente' | 'pagada' | 'cancelada'
export type EscrowStatus = 'retenido' | 'liberado'

export interface Usuario {
  id: string
  nombre: string
  email: string
  password?: string
  rol: UserRole
  fecha_registro: string
}

export interface Categoria {
  id: string
  nombre: string
  descripcion: string
}

export interface Evento {
  id: string
  titulo: string
  fecha: string
  ubicacion: string
  capacidad: number
  estado: EventStatus
  descripcion: string
  categoria_id: string
  categoria?: Categoria
  organizador_id?: string
  precio_base?: number
  imagen?: string
}

export interface Boleto {
  id: string
  codigo_qr: string
  precio: number
  tipo: string
  estado: TicketStatus
  fecha_emision: string
  evento_id: string
  evento?: Evento
}

export interface Orden {
  id: string
  total: number
  fecha: string
  estado: OrderStatus
  subtotal: number
  descuento: number
  usuario_id: string
  usuario?: Usuario
}

export interface Pago {
  id: string
  metodo: PaymentMethod
  estado: PaymentStatus
  referencia: string
  monto: number
  cargo_servicio: number
  comision_organizadora: number
  monto_neto: number
  monto_retenido: number
  fecha_dispersion: string
  estado_escrow: EscrowStatus
  orden_id: string
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}