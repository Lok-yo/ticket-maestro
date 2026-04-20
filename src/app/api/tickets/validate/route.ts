import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateTicketSchema } from '@/lib/schemas/ticket.schema'
import { validateAndUseTicket } from '@/lib/utils/validateTicket'
import type { ApiResponse } from '@/types'

// POST /api/tickets/validate — escanea y valida QR en puerta
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

    // Solo admin puede validar boletos
    const rol = user.user_metadata?.rol
    if (rol !== 'admin') {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'No tienes permisos para validar boletos' },
        { status: 403 }
      )
    }

    // Validar body
    const body = await request.json()
    const validation = validateTicketSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json<ApiResponse<null>>(
        { error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { codigo_qr, evento_id } = validation.data

    // Verificar que el evento existe
    const { data: evento, error: eventoError } = await supabase
      .from('events')
      .select('id')
      .eq('id', evento_id)
      .single()

    if (eventoError || !evento) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Evento no encontrado' },
        { status: 404 }
      )
    }

    // Validar y marcar el boleto como usado
    const result = await validateAndUseTicket(codigo_qr, evento_id)

    if (!result.valid) {
      return NextResponse.json<ApiResponse<null>>(
        { error: result.message },
        { status: 400 }
      )
    }

    // Registrar en audit log, este segmento lo meti de mejora, seria crear otra tabla en la BD y esto nos ayudaria en un futuro para
    // registrar todo lo que pasa en el sistema quién validó qué boleto, cuándo se procesó un pago, si hubo intentos de fraude. 
    // Si en el futuro hay una disputa con un cliente puedes decir exactamente qué pasó y cuándo, o almenos asi me aconsejo una IA
    /*await supabase
      .from('audit_logs')
      .insert({
        usuario_id: user.id,
        accion: 'ticket_validated',
        detalle: {
          evento_id,
          boleto_id: result.ticket?.id,
          validado_por: user.email,
          fecha: new Date().toISOString(),
        },
      })
      .select()*/

    return NextResponse.json<ApiResponse<typeof result.ticket>>(
      {
        data: result.ticket,
        message: result.message,
      }
    )
  } catch (error) {
    console.error('Error en validación:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Error interno al validar el boleto' },
      { status: 500 }
    )
  }
}
