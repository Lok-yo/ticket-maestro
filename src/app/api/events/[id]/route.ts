import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateEventSchema } from '@/lib/schemas/event.schema'
import type { ApiResponse, Evento } from '@/types'

// PUT /api/events/[id] — Actualizar un evento existente
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventoId } = await params;
    const supabase = await createClient()

    // 1. Verificar sesión básica
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // 2. Verificar perfil real
    const { data: usuarioDb } = await supabase.from('usuario').select('rol').eq('id', user.id).single();
    const role = usuarioDb?.rol;

    if (role !== 'organizador' && role !== 'admin') {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Solo organizadores o administradores pueden editar eventos' },
        { status: 403 }
      )
    }

    // 3. Verificar que el evento exista y sea PROPIEDAD de este usuario (A menos que sea admin)
    const { data: eventoOriginal, error: fetchError } = await supabase
       .from('evento')
       .select('organizador_id')
       .eq('id', eventoId)
       .single();

    if (fetchError || !eventoOriginal) {
        return NextResponse.json<ApiResponse<null>>(
            { error: 'El evento no existe.' },
            { status: 404 }
        )
    }

    if (role !== 'admin' && eventoOriginal.organizador_id !== user.id) {
        return NextResponse.json<ApiResponse<null>>(
            { error: 'No tienes permiso para editar un evento que no creaste.' },
            { status: 403 }
        )
    }

    // 4. Leer Payload y Validar
    const body = await request.json()
    const validation = updateEventSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json<ApiResponse<null>>(
        { error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    // Solo tomamos los datos validados para hacer update (Parcial)
    // El frontend mandará todos los campos de todos modos.
    const updatePayload = validation.data;

    const { data, error } = await supabase
      .from('evento')
      .update({
          ...updatePayload,
          // Convertir campos vacíos de imagen a null limpio si llega como string vacío literal
          imagen: updatePayload.imagen || null
      })
      .eq('id', eventoId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json<ApiResponse<Evento>>(
      { data, message: 'Evento actualizado exitosamente' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('ERROR UPDATING EVENT:', error);
    return NextResponse.json<ApiResponse<null>>(
      { error: error.message || 'Error interno al actualizar el evento' },
      { status: 500 }
    )
  }
}
