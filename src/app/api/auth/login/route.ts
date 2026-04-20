// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import type { ApiResponse, Profile } from '@/types';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json<ApiResponse<null>>(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Iniciar sesión en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      const isEmailOContraseña = authError?.message === 'Invalid login credentials';
      return NextResponse.json<ApiResponse<null>>(
        { error: isEmailOContraseña ? 'Email o contraseña incorrectos' : authError?.message || 'Error de autenticación' },
        { status: 401 }
      );
    }

    // Buscar usuario en la tabla "profiles"
    let { data: usuario } = await supabase
      .from('profiles')
      .select('id, full_name, role, created_at')
      .eq('id', authData.user.id)
      .single();

    // ✅ Si no existe en la tabla (por confirmación de email pendiente),
    // lo creamos automáticamente con los datos de Supabase Auth
    if (!usuario) {
      const nombre = authData.user.user_metadata?.full_name || authData.user.user_metadata?.nombre || email.split('@')[0];
      const rol = authData.user.user_metadata?.role || authData.user.user_metadata?.rol || 'customer';

      const { data: nuevoUsuario } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          full_name: nombre,
          role: rol,
        })
        .select('id, full_name, role, created_at')
        .single();

      usuario = nuevoUsuario;
    }

    if (!usuario) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Error al obtener los datos del usuario' },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<Profile>>(
      {
        data: usuario,
        message: 'Sesión iniciada correctamente',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error en login:', error);
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Error interno al iniciar sesión' },
      { status: 500 }
    );
  }
}
