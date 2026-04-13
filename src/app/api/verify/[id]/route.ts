import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: ticketId } = await params;
    const supabaseUsuario = await createClient();

    // 1. Verificar Sesión de quien escanea
    const { data: { user } } = await supabaseUsuario.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Debes iniciar sesión para escanear boletos' }, { status: 401 });

    const { data: usuarioDb } = await supabaseUsuario.from('usuario').select('rol').eq('id', user.id).single();
    if (!usuarioDb || (usuarioDb.rol !== 'organizador' && usuarioDb.rol !== 'admin')) {
        return NextResponse.json({ error: 'Acceso Denegado. Solo personal autorizado.' }, { status: 403 });
    }

    // 2. Buscar Boleto (usando Admin key para saltar RLS y ver cualquier boleto, aunque idealmente el organizador sólo debería ver los de sus eventos)
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: boletoRaw, error } = await supabaseAdmin
      .from('boleto')
      .select(`
         id,
         estado,
         tipo,
         codigo_qr,
         evento (
             titulo,
             fecha,
             organizador_id
         ),
         orden (
             usuario (
                 nombre,
                 email
             )
         )
      `)
      .eq('id', ticketId)
      .single();

    const boleto = boletoRaw as any;

    if (error || !boleto) {
        return NextResponse.json({ error: 'Boleto Inexistente o Falso.' }, { status: 404 });
    }

    // Opcional: Validar que el organizador que escanea sea el creador del evento
    if (usuarioDb.rol === 'organizador' && boleto.evento?.organizador_id !== user.id) {
        return NextResponse.json({ error: 'Este boleto no pertenece a uno de tus eventos organizados.' }, { status: 403 });
    }

    return NextResponse.json({ data: boleto });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error del servidor' }, { status: 500 });
  }
}

// PUT: Quemar boleto (marcar usado)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: ticketId } = await params;
    const supabaseUsuario = await createClient();

    const { data: { user } } = await supabaseUsuario.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: usuarioDb } = await supabaseUsuario.from('usuario').select('rol').eq('id', user.id).single();
    if (!usuarioDb || (usuarioDb.rol !== 'organizador' && usuarioDb.rol !== 'admin')) {
        return NextResponse.json({ error: 'Acceso Denegado.' }, { status: 403 });
    }

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verificamos antes de quemar
    const { data: checkBoletoRaw } = await supabaseAdmin.from('boleto').select('estado, evento(organizador_id)').eq('id', ticketId).single();
    const checkBoleto = checkBoletoRaw as any;
    
    if (!checkBoleto) return NextResponse.json({ error: 'Boleto Inexistente' }, { status: 404 });
    if (checkBoleto.estado === 'usado') return NextResponse.json({ error: 'Boleto YA FUE USADO.' }, { status: 400 });

    const { data: updatedBoleto, error } = await supabaseAdmin
      .from('boleto')
      .update({ estado: 'usado' })
      .eq('id', ticketId)
      .select('estado')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, estado: updatedBoleto.estado });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error del servidor' }, { status: 500 });
  }
}
