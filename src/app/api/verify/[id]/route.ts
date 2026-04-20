import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    let { id: ticketId } = await params;
    const { searchParams } = new URL(request.url);
    const eventIdParam = searchParams.get('event');
    
    console.log(`[VERIFY] Buscando ticket: ${ticketId}`);

    if (ticketId.length > 50) {
      try {
        const decoded = JSON.parse(Buffer.from(ticketId, 'base64').toString());
        if (decoded.ticketId) {
          console.log(`[VERIFY] ID decodificado de QR: ${decoded.ticketId}`);
          ticketId = decoded.ticketId;
        }
      } catch (e) {
        console.log('[VERIFY] No era un QR codificado, usando ID original');
      }
    }
    
    const supabaseUsuario = await createClient();

    // 1. Verificar Sesión de quien escanea
    const { data: { user } } = await supabaseUsuario.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Debes iniciar sesión para escanear tickets' }, { status: 401 });

    const { data: usuarioDb } = await supabaseUsuario.from('users').select('rol').eq('id', user.id).single();
    if (!usuarioDb) return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });

    // 2. Buscar Ticket (usando Admin key)
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: ticketRaw, error } = await supabaseAdmin
      .from('tickets')
      .select(`
         id,
         status,
         qr_code,
         event_id,
         seat_label,
         events (
             titulo,
             fecha,
             organizador_id
         ),
         ticket_types (
             nombre
         ),
         orders (
             users (
                 nombre,
                 email
             )
         )
      `)
      .eq('id', ticketId)
      .single();

    if (error) {
      console.error(`[VERIFY] Error en DB para ${ticketId}:`, error);
    }

    const ticket = ticketRaw as any;

    if (error || !ticket) {
        if (eventIdParam) {
          // Si sabemos de qué evento viene el escaneo, registramos el intento fallido
          await supabaseAdmin.from('checkins').insert({
            scanned_by: user.id,
            status: 'invalid',
            motivo: 'Código no existe o es falso',
          });
        }
        return NextResponse.json({ error: 'Ticket Inexistente o Falso.' }, { status: 404 });
    }

    // 3. Validar permisos
    const isAdmin = usuarioDb.rol === 'admin';
    const eventoAsociado = Array.isArray(ticket.events) ? ticket.events[0] : ticket.events;
    const isOwner = eventoAsociado?.organizador_id === user.id;

    if (!isAdmin && !isOwner) {
       const { data: staffData } = await supabaseAdmin
         .from('event_staff')
         .select('role')
         .eq('event_id', ticket.event_id)
         .eq('user_id', user.id)
         .single();
         
       if (!staffData || (staffData.role !== 'validator' && staffData.role !== 'co_organizer')) {
          return NextResponse.json({ error: 'Acceso Denegado. Solo personal autorizado.' }, { status: 403 });
       }
    }

    // 4. Registrar intento de validación
    const resultadoIntento = ticket.status === 'usado' ? 'already_used' : (ticket.status === 'valido' ? 'valid' : 'invalid');
    
    await supabaseAdmin.from('checkins').insert({
      ticket_id: ticketId,
      scanned_by: user.id,
      status: resultadoIntento,
      motivo: ticket.status === 'usado' ? 'Escaneo de ticket ya usado' : null,
    });

    return NextResponse.json({ data: ticket });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error del servidor' }, { status: 500 });
  }
}

// PUT: Quemar boleto (marcar usado)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    let { id: ticketId } = await params;
    const { searchParams } = new URL(request.url);

    if (ticketId.length > 50) {
      try {
        const decoded = JSON.parse(Buffer.from(ticketId, 'base64').toString());
        if (decoded.ticketId) ticketId = decoded.ticketId;
      } catch (e) {}
    }

    const supabaseUsuario = await createClient();

    const { data: { user } } = await supabaseUsuario.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: usuarioDb } = await supabaseUsuario.from('users').select('rol').eq('id', user.id).single();
    if (!usuarioDb) return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: checkTicketRaw } = await supabaseAdmin
      .from('tickets')
      .select('status, event_id, events(organizador_id)')
      .eq('id', ticketId)
      .single();

    const checkTicket = checkTicketRaw as any;
    
    if (!checkTicket) {
      return NextResponse.json({ error: 'Ticket Inexistente' }, { status: 404 });
    }

    // Permisos
    const isAdmin = usuarioDb.rol === 'admin';
    const eventoAsociado = Array.isArray(checkTicket.events) ? checkTicket.events[0] : checkTicket.events;
    const isOwner = eventoAsociado?.organizador_id === user.id;

    if (!isAdmin && !isOwner) {
       const { data: staffData } = await supabaseAdmin
         .from('event_staff')
         .select('role')
         .eq('event_id', checkTicket.event_id)
         .eq('user_id', user.id)
         .single();
         
       if (!staffData || (staffData.role !== 'validator' && staffData.role !== 'co_organizer')) {
          return NextResponse.json({ error: 'Acceso Denegado.' }, { status: 403 });
       }
    }

    if (checkTicket.status === 'usado') {
       await supabaseAdmin.from('checkins').insert({
         ticket_id: ticketId,
         scanned_by: user.id,
         status: 'already_used',
         motivo: 'El ticket ya había sido escaneado'
       });
       return NextResponse.json({ error: 'Ticket YA FUE USADO.' }, { status: 400 });
    }

    const { data: updatedTicket, error } = await supabaseAdmin
      .from('tickets')
      .update({ status: 'usado' })
      .eq('id', ticketId)
      .select('status')
      .single();

    if (error) throw error;

    await supabaseAdmin.from('checkins').insert({
      ticket_id: ticketId,
      scanned_by: user.id,
      status: 'valid'
    });

    return NextResponse.json({ success: true, estado: updatedTicket.status });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error del servidor' }, { status: 500 });
  }
}
