import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'

// POST /api/auth/logout
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar que hay sesión activa
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'No hay sesión activa' },
        { status: 401 }
      )
    }

    // Cerrar sesión
    const { error } = await supabase.auth.signOut()

    if (error) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Error al cerrar sesión' },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<null>>(
      { message: 'Sesión cerrada correctamente' }
    )
  } catch (error) {
    console.error('Error en logout:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Error interno al cerrar sesión' },
      { status: 500 }
    )
  }
}
