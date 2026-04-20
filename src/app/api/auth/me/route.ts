import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ApiResponse, Profile } from '@/types'

// GET /api/auth/me — devuelve el usuario actual
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar sesión
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'No hay sesión activa' },
        { status: 401 }
      )
    }

    // Obtener datos completos del usuario
    const { data: usuario, error: usuarioError } = await supabase
      .from('profiles')
      .select('id, full_name, role, created_at')
      .eq('id', user.id)
      .single()

    if (usuarioError || !usuario) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse<Partial<Profile>>>(
      {
        data: usuario,
        message: 'Usuario obtenido correctamente',
      }
    )
  } catch (error) {
    console.error('Error en me:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Error interno al obtener usuario' },
      { status: 500 }
    )
  }
}
