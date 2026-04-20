import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PaymentService } from '@/lib/services/PaymentService';
import { verifyStripeWebhook } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Firma de Stripe requerida' }, { status: 400 });
    }

    let event: any;
    try {
      event = verifyStripeWebhook(body, signature);
    } catch (err) {
      console.error('Firma de Stripe inválida:', err);
      return NextResponse.json({ error: 'Webhook inválido' }, { status: 400 });
    }

    const supabase = await createClient();
    const paymentService = new PaymentService(supabase);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const orderId = session.metadata?.orderId;

        if (orderId) {
          await paymentService.processPaymentSucceeded(orderId, session.payment_intent as string);
        }
        break;
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata?.orderId;
        
        if (orderId) {
          await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

