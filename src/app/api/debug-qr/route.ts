import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { qrText } = await request.json();

    if (!qrText) {
      return NextResponse.json({ error: 'Falta texto del QR' }, { status: 400 });
    }

    let ticketId = null;
    let method = 'unknown';

    // 1. Try to parse as JSON (base64)
    try {
      const decoded = atob(qrText.trim());
      const parsed = JSON.parse(decoded);
      if (parsed.ticketId) {
        ticketId = parsed.ticketId;
        method = 'json-base64';
      }
    } catch {}

    // 2. Try URL match
    if (!ticketId) {
      const urlMatch = qrText.match(/verify\/([A-Z0-9-]+)/i);
      if (urlMatch) {
        ticketId = urlMatch[1].toUpperCase();
        method = 'url-match';
      }
    }

    // 3. Try BOL- match
    if (!ticketId) {
      const bolMatch = qrText.match(/\b(BOL-[A-Z0-9]+)\b/i);
      if (bolMatch) {
        ticketId = bolMatch[1].toUpperCase();
        method = 'bol-match';
      }
    }

    // 4. Try 3 letters match
    if (!ticketId) {
      const ticketMatch = qrText.match(/\b([A-Z]{3}-[A-Z0-9]+)\b/i);
      if (ticketMatch) {
        ticketId = ticketMatch[1].toUpperCase();
        method = 'format-match';
      }
    }
    
    // 5. Try plain ID
    if (!ticketId) {
       ticketId = qrText.trim().toUpperCase();
       method = 'plain-id';
    }

    if (!ticketId) {
       return NextResponse.json({ 
         error: 'No se pudo extraer un ID válido del QR', 
         raw: qrText,
         method 
       });
    }

    // Verify if ticket exists
    const { data: ticket, error } = await supabaseAdmin
      .from('boleto')
      .select('*, evento(titulo)')
      .eq('id', ticketId)
      .single();

    if (error || !ticket) {
      return NextResponse.json({ 
        error: 'ID extraído no existe en la base de datos',
        extractedId: ticketId,
        raw: qrText,
        method
      });
    }

    return NextResponse.json({
      success: true,
      extractedId: ticketId,
      method,
      ticket: {
        id: ticket.id,
        estado: ticket.estado,
        evento: ticket.evento?.titulo
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
