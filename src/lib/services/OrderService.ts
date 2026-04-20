import { SupabaseClient } from '@supabase/supabase-js';
import { Order, Ticket, TicketType, Event } from '@/types';
import { randomUUID } from 'crypto';

export class OrderService {
  constructor(private supabase: SupabaseClient) {}

  async createOrder(params: {
    customerId: string;
    eventId: string;
    items: { ticketTypeId: string; quantity: number; seatInfo?: any[] }[];
  }) {
    const { customerId, eventId, items } = params;

    // 1. Get Event and Ticket Types
    const { data: event, error: eventError } = await this.supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) throw new Error('Evento no encontrado');

    const ticketTypeIds = items.map(i => i.ticketTypeId);
    const { data: ticketTypes, error: ttError } = await this.supabase
      .from('ticket_types')
      .select('*')
      .in('id', ticketTypeIds);

    if (ttError || !ticketTypes) throw new Error('Error al obtener tipos de boletos');

    // 2. Calculate Totals and Validate Stock
    let subtotal = 0;
    for (const item of items) {
      const tt = ticketTypes.find(t => t.id === item.ticketTypeId);
      if (!tt) throw new Error(`Tipo de boleto ${item.ticketTypeId} no encontrado`);
      if (tt.available_stock < item.quantity) {
        throw new Error(`Stock insuficiente para ${tt.name}`);
      }
      subtotal += Number(tt.price) * item.quantity;
    }

    const serviceFee = subtotal * Number(event.commission_rate);
    const total = subtotal + serviceFee;

    // 3. Create Order
    const { data: order, error: orderError } = await this.supabase
      .from('orders')
      .insert({
        customer_id: customerId,
        event_id: eventId,
        subtotal,
        service_fee: serviceFee,
        total,
        status: 'pending',
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 mins to pay
        // Store seat info if provided
        metadata: params.items.some(i => i.seatInfo) ? { seatDetails: items.flatMap(i => i.seatInfo || []) } : null
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 4. Update Stock (Atomic-ish)
    for (const item of items) {
      const tt = ticketTypes.find(t => t.id === item.ticketTypeId)!;
      const { error: stockError } = await this.supabase
        .from('ticket_types')
        .update({ available_stock: tt.available_stock - item.quantity })
        .eq('id', item.ticketTypeId)
        .gte('available_stock', item.quantity);

      if (stockError) {
        // Simple rollback: cancel order
        await this.supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id);
        throw new Error('Error al actualizar stock, intente de nuevo');
      }
    }

    return order as Order;
  }

  async getOrderById(id: string) {
    const { data, error } = await this.supabase
      .from('orders')
      .select('*, event:events(*), tickets:tickets(*, ticket_type:ticket_types(*))')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Order;
  }
}

