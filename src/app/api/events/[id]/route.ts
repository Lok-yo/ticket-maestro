import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateEventSchema } from '@/lib/schemas/event.schema'
import type { ApiResponse, Evento } from '@/types'
import { VENUE_SEAT_STOCKS } from '@/lib/seatCategories'
import { createSeatsIoEventForTicketEvent, getSeatsIoVenueChartKey } from '@/lib/seatsioServer'

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
       .select('organizador_id, seats_evento_key, titulo, fecha')
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

    const { tipos_boleto, usar_mapa_seats: usarMapaSeats, ...updatePayload } = validation.data

    const alreadyHasSeatsMap = !!eventoOriginal.seats_evento_key
    const enforceVenueStocks = alreadyHasSeatsMap || !!usarMapaSeats

    if (usarMapaSeats && !alreadyHasSeatsMap) {
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
        const effectiveStock =
          enforceVenueStocks && VENUE_SEAT_STOCKS[t.nombre] !== undefined
            ? VENUE_SEAT_STOCKS[t.nombre]!
            : t.stock_total
        if (t.max_por_compra && t.max_por_compra > effectiveStock) {
          return NextResponse.json<ApiResponse<null>>(
            { error: `El límite máximo por compra para "${t.nombre}" no puede ser mayor que el stock total.` },
            { status: 400 }
          )
        }
      }
    }

    // Calcular precio_base a partir del tipo más barato si hay tipos de boleto
    if (tipos_boleto && tipos_boleto.length > 0) {
      (updatePayload as any).precio_base = Math.min(...tipos_boleto.map(t => t.precio));
    }

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

    // Actualizar tipos de boleto si se proporcionaron
    if (tipos_boleto && tipos_boleto.length > 0) {
      // Obtener los tipos actuales para preservar el stock_disponible
      const { data: tiposActuales } = await supabase
        .from('tipo_boleto')
        .select('*')
        .eq('evento_id', eventoId);

      // Borrar los tipos existentes y reinsertar con la nueva configuración
      await supabase
        .from('tipo_boleto')
        .delete()
        .eq('evento_id', eventoId);

      const tiposToInsert = tipos_boleto.map(tipo => {
        const tipoExistente = tiposActuales?.find(t => t.nombre === tipo.nombre)
        const vendidos = tipoExistente
          ? tipoExistente.stock_total - tipoExistente.stock_disponible
          : 0

        const venueTotal =
          enforceVenueStocks && VENUE_SEAT_STOCKS[tipo.nombre] !== undefined
            ? VENUE_SEAT_STOCKS[tipo.nombre]!
            : tipo.stock_total

        return {
          evento_id: eventoId,
          nombre: tipo.nombre,
          precio: tipo.precio,
          stock_total: venueTotal,
          stock_disponible: Math.max(0, venueTotal - vendidos),
          descripcion: tipo.descripcion || null,
          max_por_compra: tipo.max_por_compra || 10,
        }
      })

      const { error: tiposError } = await supabase
        .from('tipo_boleto')
        .insert(tiposToInsert);

      if (tiposError) {
        console.error('Error actualizando tipos de boleto:', tiposError);
      }
    }

    if (usarMapaSeats && !alreadyHasSeatsMap) {
      const secret = process.env.SEATS_IO_SECRET_KEY!
      const chartKey = getSeatsIoVenueChartKey()!
      const tituloEvt = (updatePayload as { titulo?: string }).titulo ?? data.titulo
      const fechaRaw = (updatePayload as { fecha?: string }).fecha ?? data.fecha
      const fechaStr =
        fechaRaw && !Number.isNaN(Date.parse(String(fechaRaw)))
          ? new Date(String(fechaRaw)).toISOString().slice(0, 10)
          : null
      try {
        await createSeatsIoEventForTicketEvent({
          secretKey: secret,
          chartKey,
          eventKey: eventoId,
          name: tituloEvt || eventoId,
          date: fechaStr,
        })
        const { error: seatUpdErr } = await supabase
          .from('evento')
          .update({ seats_chart_key: chartKey, seats_evento_key: eventoId })
          .eq('id', eventoId)
        if (seatUpdErr) throw seatUpdErr
      } catch (e: any) {
        console.error('Error creando evento en seats.io (PUT):', e)
        return NextResponse.json<ApiResponse<null>>(
          { error: e?.message || 'No se pudo activar el mapa de asientos en seats.io.' },
          { status: 502 }
        )
      }
    }

    const { data: dataOut } = await supabase.from('evento').select('*').eq('id', eventoId).single()

    return NextResponse.json<ApiResponse<Evento>>(
      { data: (dataOut || data) as Evento, message: 'Evento actualizado exitosamente' },
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

// DELETE /api/events/[id] — Eliminar un evento (Solo si no hay boletos activos)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventoId } = await params;
    const supabase = await createClient()

    // 1. Verificar sesión básica
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // 2. Verificar rol
    const { data: usuarioDb } = await supabase.from('usuario').select('rol').eq('id', user.id).single();
    const role = usuarioDb?.rol;

    if (role !== 'organizador' && role !== 'admin') {
      return NextResponse.json({ error: 'Solo organizadores o administradores pueden eliminar eventos' }, { status: 403 })
    }

    // 3. Verificar propiedad
    const { data: eventoOriginal, error: fetchError } = await supabase
       .from('evento')
       .select('organizador_id')
       .eq('id', eventoId)
       .single();

    if (fetchError || !eventoOriginal) {
        return NextResponse.json({ error: 'El evento no existe.' }, { status: 404 })
    }

    if (role !== 'admin' && eventoOriginal.organizador_id !== user.id) {
        return NextResponse.json({ error: 'No tienes permiso para eliminar este evento.' }, { status: 403 })
    }

    // 4. Verificación financiera: ¿Hay boletos vendidos o reservados?
    const { count, error: countError } = await supabase
       .from('boleto')
       .select('*', { count: 'exact', head: true })
       .eq('evento_id', eventoId)
       .in('estado', ['vendido', 'reservado']);

    if (countError) {
        return NextResponse.json({ error: 'Error al verificar boletos del evento.' }, { status: 500 })
    }

    if (count && count > 0) {
        return NextResponse.json({ 
           error: `No puedes eliminar este evento porque ya tiene ${count} boleto(s) vendidos o en proceso de pago. Si necesitas cancelarlo, repórtalo a soporte para gestionar los reembolsos.`
        }, { status: 400 })
    }

    // 5. Hard Delete si está limpio (tipo_boleto se borra en cascada gracias al ON DELETE CASCADE)
    const { error: deleteError } = await supabase
       .from('evento')
       .delete()
       .eq('id', eventoId);

    if (deleteError) {
       console.error("Delete Error:", deleteError);
       return NextResponse.json({ error: 'Error de base de datos al eliminar.' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Evento eliminado exitosamente' }, { status: 200 })

  } catch (error: any) {
    console.error('ERROR DELETING EVENT:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno al eliminar el evento' },
      { status: 500 }
    )
  }
}
