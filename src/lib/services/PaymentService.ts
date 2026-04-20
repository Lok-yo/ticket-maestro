import { SupabaseClient } from '@supabase/supabase-js';
import { Payment, Order, Profile } from '@/types';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia' as any,
});

export class PaymentService {
  constructor(private supabase: SupabaseClient) {}

  async processPaymentSucceeded(orderId: string, stripeId: string) {
    // 1. Get Order and Event
    const { data: order, error: orderError } = await this.supabase
      .from('orders')
      .select('*, event:events(*)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) throw new Error('Orden no encontrada');

    const subtotal = Number(order.subtotal);
    const event = order.event;

    // 2. Calculate distribution based on user requirements
    // - 10% for us (service fee already in order.service_fee)
    // - 30% retention (guarantee)
    // - 60% net for organizer now
    
    const feeAmount = Number(order.service_fee); // Already 10% of subtotal
    const retentionRate = Number(event.retention_rate); // 0.30
    const retainedAmount = subtotal * retentionRate;
    const netAmount = subtotal - retainedAmount;

    // 3. Create Payment record
    const { data: payment, error: payError } = await this.supabase
      .from('payments')
      .insert({
        order_id: orderId,
        stripe_id: stripeId,
        status: 'succeeded',
        amount: order.total,
        fee_amount: feeAmount,
        retained_amount: retainedAmount,
        net_amount: netAmount,
        escrow_status: 'retained'
      })
      .select()
      .single();

    if (payError) throw payError;

    // 4. Update Order status
    await this.supabase.from('orders').update({ status: 'paid' }).eq('id', orderId);

    // 5. Update Organizer balance
    const { data: profile, error: profError } = await this.supabase
      .from('profiles')
      .select('available_balance, total_earned')
      .eq('id', event.organizer_id)
      .single();

    if (!profError && profile) {
      await this.supabase.from('profiles')
        .update({
          available_balance: Number(profile.available_balance) + netAmount,
          total_earned: Number(profile.total_earned) + subtotal
        })
        .eq('id', event.organizer_id);
    }

    // 6. Generate Tickets
    // (This would typically call TicketService.generateTicketsForOrder)
    
    // 7. Book seats in Seats.io if metadata exists
    if (order.metadata?.seatDetails && event.seats_event_key) {
      await this.bookSeatsInSeatsIo(order.metadata.seatDetails.map((s: any) => s.objectId), event.seats_event_key);
    }
    
    return payment as Payment;
  }

  private async bookSeatsInSeatsIo(seatIds: string[], eventKey: string) {
    const secretKey = process.env.SEATS_IO_SECRET_KEY;
    if (!secretKey) return;

    const auth = 'Basic ' + Buffer.from(secretKey + ':').toString('base64');
    try {
      await fetch(`https://api-na.seatsio.net/events/${eventKey}/actions/book`, {
        method: 'POST',
        headers: {
          'Authorization': auth,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ objects: seatIds }),
      });
    } catch (err) {
      console.error('Error booking seats in Seats.io:', err);
    }
  }

  async releaseRetention(eventId: string) {
    // 1. Get all retained payments for this event
    const { data: payments, error: payError } = await this.supabase
      .from('payments')
      .select('*, order:orders!inner(*)')
      .eq('orders.event_id', eventId)
      .eq('escrow_status', 'retained');

    if (payError) throw payError;

    let totalReleased = 0;
    for (const payment of payments) {
      totalReleased += Number(payment.retained_amount);
      
      await this.supabase.from('payments')
        .update({ escrow_status: 'released' })
        .eq('id', payment.id);
    }

    // 2. Update Organizer balance
    const { data: event } = await this.supabase.from('events').select('organizer_id').eq('id', eventId).single();
    if (event) {
      const { data: profile } = await this.supabase.from('profiles').select('available_balance').eq('id', event.organizer_id).single();
      if (profile) {
        await this.supabase.from('profiles')
          .update({
            available_balance: Number(profile.available_balance) + totalReleased
          })
          .eq('id', event.organizer_id);
      }
    }

    return totalReleased;
  }
}

