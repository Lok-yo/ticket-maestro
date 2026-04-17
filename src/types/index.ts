export type UserRole = 'admin' | 'cliente' | 'organizador'
export type EventStatus = 'activo' | 'cancelado' | 'finalizado'
export type TicketStatus = 'disponible' | 'vendido' | 'reservado' | 'usado'
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

export interface TipoBoleto {
  id: string
  evento_id: string
  nombre: string        // 'General', 'Preferente', 'VIP'
  precio: number
  stock_total: number
  stock_disponible: number
  descripcion?: string
  max_por_compra: number
  created_at?: string
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
  tipo_boleto?: TipoBoleto[]  // Relación con tipos de boleto
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

export interface Validacion {
  id: string
  boleto_id: string
  escaneado_por: string
  resultado: string
  motivo?: string
  fecha_hora: string
  boleto?: {
    tipo: string
  }
}

export interface EventoStaff {
  id: string
  evento_id: string
  usuario_id: string
  nombre_staff: string | null
  puede_validar: boolean
  puede_ver_reportes: boolean
  fecha_asignacion: string
}

export interface EventoStats {
  boletos: {
    total_vendidos: number
    total_usados: number
    total_restantes: number
    asistencia_porcentaje: number
  }
  resumen_validaciones: {
    total_intentos: number
    validos: number
    invalidos: number
    ya_usados: number
  }
  ultimos_ingresos: Validacion[]
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}