import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventoId: string }> }
) {
  try {
    const { eventoId } = await params;

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Intentamos consultar la tabla evento_staff
    const { data: staff, error } = await supabaseAdmin
      .from('evento_staff')
      .select('*, usuario(*)')
      .eq('evento_id', eventoId);

    if (error) {
       // Si la tabla no existe aún, regresamos un arreglo vacío
       // para no romper la UI con un HTML 404 o 500
       return NextResponse.json({ data: [] });
    }

    return NextResponse.json({ data: staff || [] });

  } catch (error: any) {
    return NextResponse.json({ data: [] });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventoId: string }> }
) {
  try {
    const { eventoId } = await params;
    const { email, nombre_staff, puede_validar, puede_ver_reportes } = await request.json();
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Buscar al usuario por email
    const { data: usuario, error: userError } = await supabaseAdmin
      .from('usuario')
      .select('id')
      .eq('email', email)
      .single();

    if (userError || !usuario) {
      return NextResponse.json(
        { error: 'No se encontró un usuario con ese email en la plataforma.' },
        { status: 404 }
      );
    }

    // 2. Verificar si ya es staff
    const { data: existente } = await supabaseAdmin
      .from('evento_staff')
      .select('id')
      .eq('evento_id', eventoId)
      .eq('usuario_id', usuario.id)
      .single();

    if (existente) {
      return NextResponse.json(
        { error: 'Este usuario ya es parte del staff de este evento.' },
        { status: 400 }
      );
    }

    // 3. Asignar staff
    const { error: insertError } = await supabaseAdmin
      .from('evento_staff')
      .insert({
        evento_id: eventoId,
        usuario_id: usuario.id,
        nombre_staff: nombre_staff || null,
        puede_validar: puede_validar ?? true,
        puede_ver_reportes: puede_ver_reportes ?? false
      });

    if (insertError) {
      return NextResponse.json({ error: 'Error al asignar staff a la base de datos' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


