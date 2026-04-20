import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { OrderService } from '@/lib/services/OrderService';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia' as any,
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { eventId, items } = body; // items: { ticketTypeId, quantity }[]

    if (!eventId || !items || !items.length) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const orderService = new OrderService(supabase);
    const order = await orderService.createOrder({
      customerId: user.id,
      eventId,
      items
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: `Compra de boletos - Orden ${order.id}`,
            },
            unit_amount: Math.round(Number(order.total) * 100), // in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/compra-exitosa/${order.id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/evento/${eventId}`,
      metadata: {
        orderId: order.id,
        customerId: user.id
      }
    });

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error('Checkout Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

