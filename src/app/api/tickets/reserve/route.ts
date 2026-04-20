import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buyTicketSchema } from '@/lib/schemas/ticket.schema'
import { calculateCommission } from '@/lib/utils/calculateCommission'
import { generateQRPayload } from '@/lib/utils/generateSecureQR'
import type { ApiResponse, Boleto, Orden, Pago } from '@/types'

// POST /api/tickets/reserve — crea orden + boletos + pago
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar sesión
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Debes iniciar sesión para comprar boletos' },
        { status: 401 }
      )
    }

    // Validar body
    const body = await request.json()
    const validation = buyTicketSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json<ApiResponse<null>>(
        { error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { evento_id, tipo, cantidad } = validation.data

    // Verificar que el evento existe y está publicado
    const { data: evento, error: eventoError } = await supabase
      .from('evento')
      .select('*')
      .eq('id', evento_id)
      .eq('estado', 'activo')
      .single()

    if (eventoError || !evento) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Evento no encontrado o no disponible' },
        { status: 404 }
      )
    }

    // Verificar capacidad disponible
    const { count: boletosVendidos } = await supabase
      .from('boleto')
      .select('*', { count: 'exact', head: true })
      .eq('evento_id', evento_id)
      .in('estado', ['vendido', 'reservado'])

    const capacidadDisponible = evento.capacidad - (boletosVendidos || 0)

    if (capacidadDisponible < cantidad) {
      return NextResponse.json<ApiResponse<null>>(
        { error: `Solo quedan ${capacidadDisponible} boletos disponibles` },
        { status: 400 }
      )
    }

    // Obtener precio del boleto según tipo
    // Por ahora usamos un precio base — el frontend debe enviarlo
    const precioBoleto = body.precio || 0
    if (!precioBoleto || precioBoleto <= 0) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Precio de boleto inválido' },
        { status: 400 }
      )
    }

    // Calcular comisiones
    const comision = calculateCommission(precioBoleto, cantidad)

    // Crear la orden
    const { data: orden, error: ordenError } = await supabase
      .from('orden')
      .insert({
        usuario_id: user.id,
        total: comision.total,
        subtotal: comision.subtotal,
        descuento: 0,
        estado: 'reservado',
        fecha: new Date().toISOString(),
      })
      .select()
      .single()

    if (ordenError || !orden) {
      throw new Error('Error al crear la orden')
    }

    // Crear los boletos
    const boletosData = Array.from({ length: cantidad }, () => ({
      evento_id,
      tipo,
      precio: precioBoleto,
      estado: 'reservado',
      fecha_emision: new Date().toISOString(),
      codigo_qr: '', // se genera después de confirmar pago
    }))

    const { data: boletos, error: boletosError } = await supabase
      .from('boleto')
      .insert(boletosData)
      .select()

    if (boletosError || !boletos) {
      // Revertir orden si fallan los boletos
      await supabase.from('orden').delete().eq('id', orden.id)
      throw new Error('Error al crear los boletos')
    }

    // Crear registro de pago
    const { data: pago, error: pagoError } = await supabase
      .from('pago')
      .insert({
        orden_id: orden.id,
        metodo: 'tarjeta',
        estado: 'en_espera',
        monto: comision.total,
        cargo_servicio: comision.cargo_servicio,
        comision_organizadora: comision.comision_organizadora,
        monto_neto: comision.monto_neto,
        monto_retenido: comision.monto_retenido,
        referencia: '',
        estado_escrow: 'retenido',
      })
      .select()
      .single()

    if (pagoError || !pago) {
      // Revertir todo si falla el pago
      await supabase.from('boleto').delete().in('id', boletos.map(b => b.id))
      await supabase.from('orden').delete().eq('id', orden.id)
      throw new Error('Error al crear el registro de pago')
    }

    return NextResponse.json<ApiResponse<{
      orden: Orden
      boletos: Boleto[]
      pago: Pago
      comision: typeof comision
    }>>(
      {
        data: { orden, boletos, pago, comision },
        message: 'Orden creada exitosamente — procede al pago',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error en reserva:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Error interno al procesar la reserva' },
      { status: 500 }
    )
  }
}