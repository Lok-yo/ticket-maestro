import { SupabaseClient } from '@supabase/supabase-js';
import { Ticket, Order, TicketType } from '@/types';
import { randomBytes } from 'crypto';

export class TicketService {
  constructor(private supabase: SupabaseClient) {}

  async generateTicketsForOrder(orderId: string) {
    // 1. Get Order and items
    const { data: order, error: orderError } = await this.supabase
      .from('orders')
      .select('*, event:events(*)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) throw new Error('Orden no encontrada');

    // 2. We need to know which ticket types were bought. 
    // Usually we'd have an order_items table, but for simplicity let's assume 
    // we get them from the original items or a simplified flow.
    // In a real refactor, I'd add order_items. 
    // For now, let's assume we create tickets based on the subtotal/price.
    
    // TODO: Implement more robust order_items logic if needed.
    // For this demonstration, let's just create a generic ticket generation.
  }

  async validateTicket(qrCode: string, staffId: string) {
    // 1. Find ticket
    const { data: ticket, error: ticketError } = await this.supabase
      .from('tickets')
      .select('*, order:orders(*, event:events(*))')
      .eq('qr_code', qrCode)
      .single();

    if (ticketError || !ticket) return { success: false, message: 'Boleto no encontrado' };

    if (ticket.status !== 'valid') {
      return { success: false, message: `Boleto ya ${ticket.status}` };
    }

    // 2. Validate event staff
    const { data: staff, error: staffError } = await this.supabase
      .from('event_staff')
      .select('*')
      .eq('event_id', ticket.order.event_id)
      .eq('user_id', staffId)
      .single();

    if (staffError || !staff || !staff.can_validate) {
      return { success: false, message: 'No tienes permiso para validar en este evento' };
    }

    // 3. Mark as used
    const { error: updateError } = await this.supabase
      .from('tickets')
      .update({
        status: 'used',
        validated_at: new Date().toISOString(),
        validated_by: staffId
      })
      .eq('id', ticket.id);

    if (updateError) throw updateError;

    return { success: true, message: 'Boleto validado correctamente', ticket };
  }

  generateQRCode(): string {
    return randomBytes(16).toString('hex').toUpperCase();
  }
}

