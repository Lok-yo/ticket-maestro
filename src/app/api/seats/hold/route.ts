import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const REGION = 'na';

// POST /api/seats/hold → Crear hold temporal
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { eventKey, seatIds } = await req.json();
    console.log(`[HOLD] Iniciando para evento: ${eventKey}, asientos: ${seatIds}`);

    const secretKey = process.env.SEATS_IO_SECRET_KEY;
    if (!secretKey) {
      console.error('[HOLD] ERROR: SEATS_IO_SECRET_KEY no encontrada en .env.local');
      return NextResponse.json({ error: 'Secret key no configurada' }, { status: 500 });
    }

    const auth = 'Basic ' + Buffer.from(secretKey + ':').toString('base64');
    const baseUrl = `https://api-${REGION}.seatsio.net`;

    // 1. Crear hold token
    console.log(`[HOLD] Solicitando token a ${baseUrl}/hold-tokens...`);
    const tokenRes = await fetch(`${baseUrl}/hold-tokens`, {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresInMinutes: 15 }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('[HOLD] Error creando token:', tokenData);
      return NextResponse.json({ error: 'Error en seats.io (hold token)', details: tokenData }, { status: tokenRes.status });
    }

    console.log('[HOLD] Respuesta completa del token:', JSON.stringify(tokenData));
    const holdToken = tokenData.token || tokenData.holdToken; // Por si acaso usan otro nombre
    console.log(`[HOLD] Token extraído: ${holdToken}`);

    // 2. Hacer hold de los asientos
    console.log(`[HOLD] Reservando asientos con el token...`);
    const holdRes = await fetch(`${baseUrl}/events/${eventKey}/actions/hold`, {
      method: 'POST',
      headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ objects: seatIds, holdToken }),
    });

    if (!holdRes.ok) {
      const holdError = await holdRes.json();
      console.error('[HOLD] Error al reservar asientos:', holdError);
      return NextResponse.json({ error: 'No se pudieron reservar los asientos', details: holdError }, { status: 409 });
    }

    console.log(`[HOLD] Asientos reservados con éxito.`);
    return NextResponse.json({ holdToken });
  } catch (error: any) {
    console.error('[HOLD] Error crítico:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/seats/hold → Liberar asientos (por si el usuario cancela)
export async function DELETE(req: NextRequest) {
  try {
    const { eventKey, seatIds, holdToken } = await req.json();
    const secretKey = process.env.SEATS_IO_SECRET_KEY;
    if (!secretKey || !eventKey || !holdToken) return NextResponse.json({ ok: true });

    const auth = 'Basic ' + Buffer.from(secretKey + ':').toString('base64');

    await fetch(`https://api-${REGION}.seatsio.net/events/${eventKey}/actions/release`, {
      method: 'POST',
      headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ objects: seatIds, holdToken }),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
