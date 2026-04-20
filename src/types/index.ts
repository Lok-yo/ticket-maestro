export type UserRole = 'admin' | 'organizer' | 'customer';
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';
export type OrderStatus = 'pending' | 'paid' | 'expired' | 'cancelled';
export type TicketStatus = 'valid' | 'used' | 'refunded' | 'invalid';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';
export type EscrowStatus = 'retained' | 'released';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  clabe?: string;
  total_earned: number;
  available_balance: number;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  organizer_id: string;
  category_id?: string;
  title: string;
  description?: string;
  location?: string;
  date: string;
  image_url?: string;
  status: EventStatus;
  seats_chart_key?: string;
  seats_event_key?: string;
  capacity?: number;
  commission_rate: number;
  retention_rate: number;
  created_at: string;
  updated_at: string;
  // Joins
  category?: Category;
  organizer?: Profile;
  ticket_types?: TicketType[];
}

export interface TicketType {
  id: string;
  event_id: string;
  name: string;
  price: number;
  total_stock: number;
  available_stock: number;
  description?: string;
  max_per_order: number;
  created_at: string;
}

export interface EventStaff {
  id: string;
  event_id: string;
  user_id: string;
  can_validate: boolean;
  can_view_reports: boolean;
  created_at: string;
  // Joins
  user?: Profile;
}

export interface Order {
  id: string;
  customer_id: string;
  event_id: string;
  status: OrderStatus;
  subtotal: number;
  service_fee: number;
  total: number;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  // Joins
  customer?: Profile;
  event?: Event;
  tickets?: Ticket[];
  payment?: Payment;
}

export interface Ticket {
  id: string;
  order_id: string;
  ticket_type_id: string;
  qr_code: string;
  status: TicketStatus;
  seat_info?: any;
  validated_at?: string;
  validated_by?: string;
  created_at: string;
  // Joins
  ticket_type?: TicketType;
  order?: Order;
}

export interface Payment {
  id: string;
  order_id: string;
  stripe_id?: string;
  status: PaymentStatus;
  amount: number;
  fee_amount: number;
  retained_amount: number;
  net_amount: number;
  escrow_status: EscrowStatus;
  created_at: string;
}

export interface Payout {
  id: string;
  organizer_id: string;
  amount: number;
  status: string;
  processed_at?: string;
  created_at: string;
}

