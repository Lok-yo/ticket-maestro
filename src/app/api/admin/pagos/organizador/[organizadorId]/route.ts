import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import {
  ADMIN_ESCROW_RETAINED,
  ADMIN_ESCROW_RELEASED,
  ADMIN_VALID_ORDER_STATUS,
  ADMIN_VALID_PAYMENT_STATUS,
  toNumberSafe,
} from '@/lib/adminPayments'

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
    return {
      error: NextResponse.json({ error: 'No tienes privilegios de Administrador.' }, { status: 403 }),
    }
  }

  return { error: null }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ organizadorId: string }> }
) {
  try {
    const adminCheck = await requireAdmin()
    if (adminCheck.error) return adminCheck.error

    const { organizadorId } = await params
    if (!organizadorId) {
      return NextResponse.json({ error: 'organizadorId requerido.' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: eventos, error: eventosError } = await supabaseAdmin
      .from('evento')
      .select('id, titulo, estado, fecha')
      .eq('organizador_id', organizadorId)
      .order('fecha', { ascending: false })

    if (eventosError) throw eventosError

    const { data: balanceData } = await supabaseAdmin
      .from('balance_organizador')
      .select('clabe, saldo_disponible, total_ganado')
      .eq('organizador_id', organizadorId)
      .maybeSingle()

    const rows = await Promise.all(
      (eventos || []).map(async (evento) => {
        const { data: boletosEvento } = await supabaseAdmin
          .from('boleto')
          .select('orden_id')
          .eq('evento_id', evento.id)
          .not('orden_id', 'is', null)

        const ordenIds = Array.from(new Set((boletosEvento || []).map((b) => b.orden_id).filter(Boolean)))
        if (ordenIds.length === 0) {
          return {
            id: evento.id,
            titulo: evento.titulo,
            estado: evento.estado,
            fecha: evento.fecha,
            ventaReal: 0,
            netoPendiente: 0,
            retenidoPendiente: 0,
            yaLiquidado: true,
            retenidoLiberado: true,
          }
        }

        const { data: ordenesPagadas } = await supabaseAdmin
          .from('orden')
          .select('id')
          .in('id', ordenIds)
          .eq('estado', ADMIN_VALID_ORDER_STATUS)

        const paidOrderIds = (ordenesPagadas || []).map((o) => o.id)
        if (paidOrderIds.length === 0) {
          return {
            id: evento.id,
            titulo: evento.titulo,
            estado: evento.estado,
            fecha: evento.fecha,
            ventaReal: 0,
            netoPendiente: 0,
            retenidoPendiente: 0,
            yaLiquidado: true,
            retenidoLiberado: true,
          }
        }

        const { data: pagosEvento } = await supabaseAdmin
          .from('pago')
          .select('monto, monto_neto, monto_retenido, fecha_dispersion, estado, estado_escrow, orden_id')
          .in('orden_id', paidOrderIds)
          .eq('estado', ADMIN_VALID_PAYMENT_STATUS)

        const ventaReal = (pagosEvento || []).reduce((acc, p) => acc + toNumberSafe(p.monto_neto) + toNumberSafe(p.monto_retenido), 0)
        const netoPendiente = (pagosEvento || [])
          .filter((p) => !p.fecha_dispersion)
          .reduce((acc, p) => acc + toNumberSafe(p.monto_neto), 0)
        const retenidoPendiente = (pagosEvento || [])
          .filter((p) => p.estado_escrow === ADMIN_ESCROW_RETAINED)
          .reduce((acc, p) => acc + toNumberSafe(p.monto_retenido), 0)
        const retainedReleasedCount = (pagosEvento || []).filter(
          (p) => p.estado_escrow === ADMIN_ESCROW_RELEASED
        ).length

        return {
          id: evento.id,
          titulo: evento.titulo,
          estado: evento.estado,
          fecha: evento.fecha,
          ventaReal,
          netoPendiente,
          retenidoPendiente,
          yaLiquidado: netoPendiente <= 0,
          retenidoLiberado: retainedReleasedCount > 0 && retenidoPendiente <= 0,
        }
      })
    )

    const totalVentas = rows.reduce((acc, r) => acc + r.ventaReal, 0)
    const totalNetoPendiente = rows.reduce((acc, r) => acc + r.netoPendiente, 0)
    const totalRetenidoPendiente = rows.reduce((acc, r) => acc + r.retenidoPendiente, 0)

    return NextResponse.json(
      {
        data: {
          organizadorId,
          eventos: rows,
          stats: {
            totalVentas,
            totalNetoPendiente,
            totalRetenidoPendiente,
            clabe: balanceData?.clabe || '',
            saldoDisponible: toNumberSafe(balanceData?.saldo_disponible),
            totalGanado: toNumberSafe(balanceData?.total_ganado),
          },
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('ADMIN PAGOS ORGANIZADOR GET ERROR', error)
    return NextResponse.json({ error: error?.message || 'Error al obtener pagos de organizador' }, { status: 500 })
  }
}
