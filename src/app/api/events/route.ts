import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createEventSchema } from '@/lib/schemas/event.schema'
import type { ApiResponse, Evento } from '@/types'
import { VENUE_SEAT_STOCKS } from '@/lib/seatCategories'
import { createSeatsIoEventForTicketEvent, getSeatsIoVenueChartKey } from '@/lib/seatsioServer'

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
      .select('*, categoria(*), tipo_boleto(*)', { count: 'exact' })
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

    const {
      titulo,
      descripcion,
      ubicacion,
      fecha,
      capacidad,
      categoria_id,
      precio_base,
      imagen,
      tipos_boleto,
      usar_mapa_seats: usarMapaSeats,
    } = validation.data

    if (usarMapaSeats && (!tipos_boleto || tipos_boleto.length === 0)) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Con mapa de asientos debes definir al menos un tipo de boleto (precios).' },
        { status: 400 }
      )
    }

    if (usarMapaSeats) {
      const secret = process.env.SEATS_IO_SECRET_KEY
      const chartKey = getSeatsIoVenueChartKey()
      if (!secret || !chartKey) {
        return NextResponse.json<ApiResponse<null>>(
          { error: 'Mapa de asientos no disponible: configura SEATS_IO_SECRET_KEY y SEATS_IO_VENUE_CHART_KEY en el servidor.' },
          { status: 400 }
        )
      }
    }

    if (tipos_boleto && tipos_boleto.length > 0) {
      for (const t of tipos_boleto) {
        if (t.precio < 50) {
          return NextResponse.json<ApiResponse<null>>(
            { error: `El precio para "${t.nombre}" debe ser de al menos $50 MXN.` },
            { status: 400 }
          )
        }
        if (t.max_por_compra && t.max_por_compra > t.stock_total) {
          return NextResponse.json<ApiResponse<null>>(
            { error: `El límite máximo por compra para "${t.nombre}" no puede ser mayor que el stock total.` },
            { status: 400 }
          )
        }
      }
    }

    const evtId = `EVT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Calcular precio_base a partir del tipo más barato (para compatibilidad con el home/cards)
    const precioBaseCalculado = tipos_boleto && tipos_boleto.length > 0
      ? Math.min(...tipos_boleto.map(t => t.precio))
      : (precio_base || 800);

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
        precio_base: precioBaseCalculado,
        imagen: imagen ? imagen : null,
        organizador_id: user.id, // Amarrado fuertemente al autor
        estado: 'activo', // Publicado directo para la demo, pero antes era 'draft'
      })
      .select()
      .single()

    if (error) throw error

    // Insertar tipos de boleto si se proporcionaron
    if (tipos_boleto && tipos_boleto.length > 0) {
      const tiposToInsert = tipos_boleto.map(tipo => {
        const venueTotal =
          usarMapaSeats && VENUE_SEAT_STOCKS[tipo.nombre] !== undefined
            ? VENUE_SEAT_STOCKS[tipo.nombre]!
            : tipo.stock_total
        return {
          evento_id: evtId,
          nombre: tipo.nombre,
          precio: tipo.precio,
          stock_total: venueTotal,
          stock_disponible: venueTotal,
          descripcion: tipo.descripcion || null,
          max_por_compra: tipo.max_por_compra || 10,
        }
      })

      const { error: tiposError } = await supabase.from('tipo_boleto').insert(tiposToInsert)

      if (tiposError) {
        console.error('Error insertando tipos de boleto:', tiposError)
        await supabase.from('evento').delete().eq('id', evtId)
        return NextResponse.json<ApiResponse<null>>(
          { error: 'No se pudieron crear los tipos de boleto.' },
          { status: 500 }
        )
      }
    }

    if (usarMapaSeats) {
      const secret = process.env.SEATS_IO_SECRET_KEY!
      const chartKey = getSeatsIoVenueChartKey()!
      const fechaStr =
        fecha && !Number.isNaN(Date.parse(fecha))
          ? new Date(fecha).toISOString().slice(0, 10)
          : null
      try {
        await createSeatsIoEventForTicketEvent({
          secretKey: secret,
          chartKey,
          eventKey: evtId,
          name: titulo,
          date: fechaStr,
        })
        const { error: updErr } = await supabase
          .from('evento')
          .update({ seats_chart_key: chartKey, seats_evento_key: evtId })
          .eq('id', evtId)
        if (updErr) throw updErr
      } catch (e: any) {
        console.error('Error creando evento en seats.io:', e)
        await supabase.from('tipo_boleto').delete().eq('evento_id', evtId)
        await supabase.from('evento').delete().eq('id', evtId)
        return NextResponse.json<ApiResponse<null>>(
          { error: e?.message || 'No se pudo activar el mapa de asientos en seats.io.' },
          { status: 502 }
        )
      }
    }

    const { data: eventoFinal } = await supabase.from('evento').select('*').eq('id', evtId).single()

    return NextResponse.json<ApiResponse<Evento>>(
      { data: (eventoFinal || data) as Evento, message: 'Evento creado exitosamente' },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Error al crear el evento' },
      { status: 500 }
    )
  }
}