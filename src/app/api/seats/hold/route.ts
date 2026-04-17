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
    if (!eventKey || !seatIds?.length) {
      return NextResponse.json({ error: 'Faltan eventKey o seatIds' }, { status: 400 });
    }

    const secretKey = process.env.SEATS_IO_SECRET_KEY;
    if (!secretKey) return NextResponse.json({ error: 'Secret key no configurada' }, { status: 500 });

    const auth = 'Basic ' + Buffer.from(secretKey + ':').toString('base64');

    // 1. Crear hold token
    const tokenRes = await fetch(`https://api-${REGION}.seatsio.net/hold-tokens`, {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresInMinutes: 15 }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('Error creando hold token:', err);
      return NextResponse.json({ error: 'Error en seats.io (hold token)' }, { status: 500 });
    }

    const { token: holdToken } = await tokenRes.json();

    // 2. Hacer hold de los asientos
    const holdRes = await fetch(`https://api-${REGION}.seatsio.net/events/${eventKey}/actions/hold`, {
      method: 'POST',
      headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ objects: seatIds, holdToken }),
    });

    if (!holdRes.ok) {
      const err = await holdRes.text();
      console.error('Error holding seats:', err);
      return NextResponse.json({ error: 'No se pudieron reservar los asientos' }, { status: 409 });
    }

    return NextResponse.json({ holdToken });
  } catch (error: any) {
    console.error('Error en /api/seats/hold:', error);
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