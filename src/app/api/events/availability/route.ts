import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'

export interface AvailabilityResult {
  evento_id: string
  capacidad_total: number
  boletos_vendidos: number
  boletos_disponibles: number
  disponible: boolean
  porcentaje_vendido: number
}

// GET /api/events/availability?evento_id=xxx
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const evento_id = searchParams.get('evento_id')

    if (!evento_id) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'evento_id es requerido' },
        { status: 400 }
      )
    }

    // Obtener capacidad del evento
    const { data: evento, error: eventoError } = await supabase
      .from('events')
      .select('id, capacidad, estado, titulo')
      .eq('id', evento_id)
      .single()

    if (eventoError || !evento) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Evento no encontrado' },
        { status: 404 }
      )
    }

    if (evento.estado !== 'published') {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Evento no disponible' },
        { status: 400 }
      )
    }

    // Contar boletos vendidos o pendientes
    const { count: boletosVendidos } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('evento_id', evento_id)
      .in('estado', ['confirmed', 'pending'])

    const vendidos = boletosVendidos || 0
    const disponibles = evento.capacidad - vendidos
    const porcentaje = Math.round((vendidos / evento.capacidad) * 100)

    const result: AvailabilityResult = {
      evento_id,
      capacidad_total: evento.capacidad,
      boletos_vendidos: vendidos,
      boletos_disponibles: disponibles,
      disponible: disponibles > 0,
      porcentaje_vendido: porcentaje,
    }

    return NextResponse.json<ApiResponse<AvailabilityResult>>({
      data: result,
      message: disponibles > 0
        ? `${disponibles} boletos disponibles`
        : 'Evento agotado',
    })
  } catch (error) {
    console.error('Error en availability:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Error al consultar disponibilidad' },
      { status: 500 }
    )
  }
}
