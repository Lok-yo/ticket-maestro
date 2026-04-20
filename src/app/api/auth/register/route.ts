import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { ApiResponse, Profile } from '@/types'

const registerSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  rol: z.enum(['admin', 'customer']).default('customer'),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const body = await request.json()
    const validation = registerSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json<ApiResponse<null>>(
        { error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { nombre, email, password, rol } = validation.data

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Crear usuario auto-confirmado saltándose la restricción de Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: nombre, role: rol },
    })

    if (authError) {
      return NextResponse.json<ApiResponse<null>>(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Error al crear el usuario' },
        { status: 500 }
      )
    }

    const { error: usuarioError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name: nombre,
        role: rol,
      })

    if (usuarioError) {
      console.error('Error creando perfil en BD:', usuarioError)
    }

    // Auto-login después del registro
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError || !loginData.session) {
      return NextResponse.json<ApiResponse<Partial<Profile>>>(
        {
          data: { id: authData.user.id, full_name: nombre, role: rol },
          message: 'Usuario creado correctamente, pero hubo un error al auto-iniciar sesión.',
        },
        { status: 201 }
      )
    }

    return NextResponse.json<ApiResponse<Partial<Profile>>>(
      {
        data: { id: authData.user.id, full_name: nombre, role: rol },
        message: 'Usuario creado e sesión iniciada correctamente',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error en registro:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: error instanceof Error ? error.message : JSON.stringify(error) },
      { status: 500 }
    )
  }
}
