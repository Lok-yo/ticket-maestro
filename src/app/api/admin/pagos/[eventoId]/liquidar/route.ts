import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { ADMIN_VALID_ORDER_STATUS, ADMIN_VALID_PAYMENT_STATUS, toNumberSafe } from '@/lib/adminPayments'

async function requireAdmin() {
  const supabaseUser = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabaseUser.auth.getUser()
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  }

  const { data: usuarioDb } = await supabaseUser.from('usuario').select('rol').eq('id', user.id).single()
  if (usuarioDb?.rol !== 'admin') {
    return { error: NextResponse.json({ error: 'No tienes privilegios de Administrador.' }, { status: 403 }) }
  }
  return { error: null }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventoId: string }> }
) {
  try {
    const adminCheck = await requireAdmin()
    if (adminCheck.error) return adminCheck.error

    const { eventoId } = await params
    const body = await request.json().catch(() => ({}))
    const organizadorId = body?.organizadorId as string | undefined

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: evento, error: eventoError } = await supabaseAdmin
      .from('evento')
      .select('id, organizador_id, titulo')
      .eq('id', eventoId)
      .single()
    if (eventoError || !evento) {
      return NextResponse.json({ error: 'Evento no encontrado.' }, { status: 404 })
    }
    if (organizadorId && evento.organizador_id !== organizadorId) {
      return NextResponse.json({ error: 'El evento no pertenece al organizador seleccionado.' }, { status: 400 })
    }

    const { data: boletosEvento } = await supabaseAdmin
      .from('boleto')
      .select('orden_id')
      .eq('evento_id', eventoId)
      .not('orden_id', 'is', null)
    const orderIds = Array.from(new Set((boletosEvento || []).map((b) => b.orden_id).filter(Boolean)))
    if (orderIds.length === 0) {
      return NextResponse.json({ message: 'No hay órdenes para liquidar.', liquidado: 0 }, { status: 200 })
    }

    const { data: ordenesPagadas } = await supabaseAdmin
      .from('orden')
      .select('id')
      .in('id', orderIds)
      .eq('estado', ADMIN_VALID_ORDER_STATUS)
    const paidOrderIds = (ordenesPagadas || []).map((o) => o.id)
    if (paidOrderIds.length === 0) {
      return NextResponse.json({ message: 'No hay órdenes pagadas para liquidar.', liquidado: 0 }, { status: 200 })
    }

    const { data: pagos, error: pagosError } = await supabaseAdmin
      .from('pago')
      .select('id, monto_neto, fecha_dispersion, estado, orden_id')
      .in('orden_id', paidOrderIds)
      .eq('estado', ADMIN_VALID_PAYMENT_STATUS)
    if (pagosError) throw pagosError

    const pagosPendientes = (pagos || []).filter((p) => !p.fecha_dispersion)
    const montoLiquidar = pagosPendientes.reduce((acc, p) => acc + toNumberSafe(p.monto_neto), 0)

    if (pagosPendientes.length === 0 || montoLiquidar <= 0) {
      return NextResponse.json({ message: 'No hay monto neto pendiente por liquidar.', liquidado: 0 }, { status: 200 })
    }

    const ahora = new Date().toISOString()
    const idsToUpdate = pagosPendientes.map((p) => p.id)
    const { error: updateError } = await supabaseAdmin
      .from('pago')
      .update({ fecha_dispersion: ahora })
      .in('id', idsToUpdate)
      .is('fecha_dispersion', null)
    if (updateError) throw updateError

    if (evento.organizador_id) {
      const { data: balance } = await supabaseAdmin
        .from('balance_organizador')
        .select('organizador_id, saldo_disponible')
        .eq('organizador_id', evento.organizador_id)
        .maybeSingle()
      if (!balance) {
        await supabaseAdmin.from('balance_organizador').insert({
          organizador_id: evento.organizador_id,
          saldo_disponible: 0,
          total_ganado: 0,
          ultima_actualizacion: ahora,
        })
      } else {
        const saldoActual = Math.max(0, toNumberSafe(balance.saldo_disponible) - montoLiquidar)
        await supabaseAdmin
          .from('balance_organizador')
          .update({ 
            saldo_disponible: saldoActual,
            ultima_actualizacion: ahora 
          })
          .eq('organizador_id', evento.organizador_id)
      }

      await supabaseAdmin.from('retiro_organizador').insert({
        organizador_id: evento.organizador_id,
        monto: montoLiquidar,
        estado: 'completado',
        fecha_solicitud: ahora,
        fecha_pago: ahora,
      })
    }

    return NextResponse.json(
      {
        message: 'Liquidación aplicada correctamente.',
        eventoId,
        pagosLiquidadoCount: pagosPendientes.length,
        liquidado: montoLiquidar,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('ADMIN LIQUIDAR EVENTO ERROR', error)
    return NextResponse.json({ error: error?.message || 'Error al liquidar evento' }, { status: 500 })
  }
}
