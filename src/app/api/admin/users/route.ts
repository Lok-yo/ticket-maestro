import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// GET: Obtener todos los usuarios de la plataforma
export async function GET(request: NextRequest) {
  try {
    const supabaseUsuario = await createClient();

    // Verificar Sesión
    const { data: { user }, error: authError } = await supabaseUsuario.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar Rol
    const { data: usuarioDb } = await supabaseUsuario.from('usuario').select('rol').eq('id', user.id).single();
    if (usuarioDb?.rol !== 'admin') {
      return NextResponse.json({ error: 'No tienes privilegios de Administrador.' }, { status: 403 });
    }

    // Usar Service Role para bypassar RLS si estuviera activo
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: usuarios, error } = await supabaseAdmin
      .from('usuario')
      .select('id, nombre, email, rol, fecha_registro')
      .order('fecha_registro', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data: usuarios }, { status: 200 });
  } catch (error: any) {
    console.error("ADMIN ROUTE GET ERROR", error);
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });
  }
}

// PUT: Actualizar rol de un usuario
export async function PUT(request: NextRequest) {
  try {
    const supabaseUsuario = await createClient();

    // 1. Verificar Sesión
    const { data: { user }, error: authError } = await supabaseUsuario.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Verificar Rol
    const { data: usuarioDb } = await supabaseUsuario.from('usuario').select('rol').eq('id', user.id).single();
    if (usuarioDb?.rol !== 'admin') {
      return NextResponse.json({ error: 'Acción bloqueada. Se requiere rol "admin".' }, { status: 403 });
    }

    // 3. Leer la petición
    const body = await request.json();
    const targetUserId = body.userId;
    const newRole = body.rol;

    if (!targetUserId || !['cliente', 'organizador'].includes(newRole)) {
      return NextResponse.json({ error: 'Datos inválidos o rol bloqueado por seguridad' }, { status: 400 });
    }

    // 4. Usar llave maestra para bypass de RLS
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabaseAdmin
      .from('usuario')
      .update({ rol: newRole })
      .eq('id', targetUserId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data, message: 'Usuario actualizado con éxito' }, { status: 200 });
  } catch (error: any) {
    console.error("ADMIN ROUTE PUT ERROR", error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
