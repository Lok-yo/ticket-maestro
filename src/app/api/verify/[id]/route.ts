import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: ticketId } = await params;
    const { searchParams } = new URL(request.url);
    const eventIdParam = searchParams.get('event');
    
    const supabaseUsuario = await createClient();

    // 1. Verificar Sesión de quien escanea
    const { data: { user } } = await supabaseUsuario.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Debes iniciar sesión para escanear boletos' }, { status: 401 });

    const { data: usuarioDb } = await supabaseUsuario.from('usuario').select('rol').eq('id', user.id).single();
    if (!usuarioDb) return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });

    // 2. Buscar Boleto (usando Admin key)
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
         evento_id,
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
        // Log failed attempt if we have the event context
        if (eventIdParam) {
          await supabaseAdmin.from('validacion').insert({
            boleto_id: null, // No podemos poner un ID que no existe si hay FK
            codigo_escaneado: ticketId,
            escaneado_por: user.id,
            resultado: 'invalido',
            motivo: 'Código no existe o es de otro evento',
            evento_id: eventIdParam
          });
        }
        return NextResponse.json({ error: 'Boleto Inexistente o Falso.' }, { status: 404 });
    }

    // 3. Validar permisos (Es admin, es el organizador creador, o es staff con permiso)
    const isAdmin = usuarioDb.rol === 'admin';
    const isOwner = boleto.evento?.organizador_id === user.id;

    if (!isAdmin && !isOwner) {
       // Checar si es staff
       const { data: staffData } = await supabaseAdmin
         .from('evento_staff')
         .select('puede_validar')
         .eq('evento_id', boleto.evento_id)
         .eq('usuario_id', user.id)
         .single();
         
       if (!staffData || !staffData.puede_validar) {
          return NextResponse.json({ error: 'Acceso Denegado. Solo personal autorizado.' }, { status: 403 });
       }
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
    const { searchParams } = new URL(request.url);
    const eventIdParam = searchParams.get('event');

    const supabaseUsuario = await createClient();

    const { data: { user } } = await supabaseUsuario.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: usuarioDb } = await supabaseUsuario.from('usuario').select('rol').eq('id', user.id).single();
    if (!usuarioDb) return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verificamos el boleto y permisos antes de quemar
    const { data: checkBoletoRaw } = await supabaseAdmin.from('boleto').select('estado, evento_id, evento(organizador_id)').eq('id', ticketId).single();
    const checkBoleto = checkBoletoRaw as any;
    
    if (!checkBoleto) {
      if (eventIdParam) {
        await supabaseAdmin.from('validacion').insert({
          boleto_id: null,
          codigo_escaneado: ticketId,
          escaneado_por: user.id,
          resultado: 'invalido',
          evento_id: eventIdParam
        });
      }
      return NextResponse.json({ error: 'Boleto Inexistente' }, { status: 404 });
    }

    // Permisos
    const isAdmin = usuarioDb.rol === 'admin';
    const isOwner = checkBoleto.evento?.organizador_id === user.id;

    if (!isAdmin && !isOwner) {
       const { data: staffData } = await supabaseAdmin
         .from('evento_staff')
         .select('puede_validar')
         .eq('evento_id', checkBoleto.evento_id)
         .eq('usuario_id', user.id)
         .single();
         
       if (!staffData || !staffData.puede_validar) {
          return NextResponse.json({ error: 'Acceso Denegado.' }, { status: 403 });
       }
    }

    if (checkBoleto.estado === 'usado') {
       // Log failed attempt
       await supabaseAdmin.from('validacion').insert({
         boleto_id: ticketId,
         codigo_escaneado: ticketId,
         escaneado_por: user.id,
         resultado: 'ya_usado',
         motivo: 'El boleto ya había sido escaneado',
         evento_id: eventIdParam || checkBoleto.evento_id
       });
       return NextResponse.json({ error: 'Boleto YA FUE USADO.' }, { status: 400 });
    }

    const { data: updatedBoleto, error } = await supabaseAdmin
      .from('boleto')
      .update({ estado: 'usado' })
      .eq('id', ticketId)
      .select('estado')
      .single();

    if (error) throw error;

    // Registrar en 'validacion' para el reporte
    await supabaseAdmin.from('validacion').insert({
      boleto_id: ticketId,
      codigo_escaneado: ticketId,
      escaneado_por: user.id,
      resultado: 'valido',
      evento_id: eventIdParam || checkBoleto.evento_id
    });

    return NextResponse.json({ success: true, estado: updatedBoleto.estado });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error del servidor' }, { status: 500 });
  }
}
