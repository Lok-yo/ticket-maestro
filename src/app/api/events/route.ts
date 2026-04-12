import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createEventSchema } from '@/lib/schemas/event.schema'
import type { ApiResponse, Evento } from '@/types'

// GET /api/events — lista todos los eventos publicados
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const categoria = searchParams.get('categoria') || ''
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
      .from('evento')
      .select('*, categoria(*)', { count: 'exact' })
      .eq('estado', 'activo')
      .order('fecha', { ascending: true })
      .range(from, to)

    if (search) {
      query = query.ilike('titulo', `%${search}%`)
    }

    if (categoria) {
      query = query.eq('categoria_id', categoria)
    }

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json<ApiResponse<Evento[]>>({
      data: data || [],
      message: `${count} eventos encontrados`,
    })
  } catch (error) {
    console.error('ERROR DETALLADO:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Error al obtener eventos' },
      { status: 500 }
    )
  }
}

// POST /api/events — crear nuevo evento (solo organizer/admin)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar sesión
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verificar rol directamente en la tabla pública para máxima seguridad
    const { data: usuarioDb } = await supabase.from('usuario').select('rol').eq('id', user.id).single();
    const role = usuarioDb?.rol;

    if (role !== 'organizador' && role !== 'admin') {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Solo organizadores pueden crear eventos' },
        { status: 403 }
      )
    }

    // Validar body
    const body = await request.json()
    const validation = createEventSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json<ApiResponse<null>>(
        { error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { titulo, descripcion, ubicacion, fecha, capacidad, categoria_id, precio_base, imagen } = validation.data

    const evtId = `EVT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const { data, error } = await supabase
      .from('evento')
      .insert({
        id: evtId,
        titulo,
        descripcion,
        ubicacion,
        fecha,
        capacidad,
        categoria_id,
        precio_base,
        imagen: imagen ? imagen : null,
        organizador_id: user.id, // Amarrado fuertemente al autor
        estado: 'activo', // Publicado directo para la demo, pero antes era 'draft'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json<ApiResponse<Evento>>(
      { data, message: 'Evento creado exitosamente' },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Error al crear el evento' },
      { status: 500 }
    )
  }
}