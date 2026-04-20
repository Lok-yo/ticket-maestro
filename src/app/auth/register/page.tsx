'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ApiResponse } from '@/types';

export default function RegisterPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, password, rol: 'cliente' }),
      });

      const json: ApiResponse<any> = await res.json();

      if (!res.ok || json.error) {
        if (json.error?.includes('rate limit') || json.error?.includes('rate_limit')) {
          setError('Has intentado registrar este correo demasiadas veces. Espera unos minutos e inténtalo de nuevo.');
        } else {
          setError(json.error || 'Error al crear la cuenta');
        }
        return;
      }

      // ✅ Registro exitoso → refresh + redirigir al inicio con sesión activa
      router.refresh();
      router.push('/');

    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* Panel izquierdo */}
      <div className="hidden md:block relative w-1/2">
        <Image
          src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7"
          alt="Concierto"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-black/10" />
        <div className="absolute top-6 left-6 z-10">
          <Link href="/">
            <Image src="/11.png" alt="TicketMaestro" width={300} height={55} className="object-contain" />
          </Link>
        </div>
      </div>

      {/* Panel derecho */}
      <div className="w-full md:w-1/2 bg-gradient-to-br from-[#1a1030] via-[#1e1040] to-[#2a0a3a] flex flex-col items-center justify-between px-10 py-10 relative overflow-hidden">

        <div className="absolute top-0 right-0 w-72 h-72 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="md:hidden mb-6">
          <Link href="/">
            <Image src="/11.png" alt="TicketMaestro" width={180} height={50} className="object-contain" />
          </Link>
        </div>

        <div className="w-full max-w-sm relative z-10">
          <h2 className="text-3xl font-bold text-white mb-1">Crea tu cuenta</h2>
          <p className="text-gray-400 text-sm mb-8">
            ¡Regístrate para recibir las últimas novedades sobre conciertos y ofertas exclusivas!
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">

            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus-within:border-pink-500 transition">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <input
                type="text"
                required
                placeholder="Nombre completo"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="bg-transparent outline-none text-white placeholder-gray-500 w-full text-sm"
              />
            </div>

            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus-within:border-pink-500 transition">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <input
                type="email"
                required
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent outline-none text-white placeholder-gray-500 w-full text-sm"
              />
            </div>

            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus-within:border-pink-500 transition">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <input
                type="password"
                required
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-transparent outline-none text-white placeholder-gray-500 w-full text-sm"
              />
            </div>

            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus-within:border-pink-500 transition">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <input
                type="password"
                required
                placeholder="Confirmar contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-transparent outline-none text-white placeholder-gray-500 w-full text-sm"
              />
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 bg-gradient-to-r from-[#e91e63] to-[#c2185b] hover:from-[#c2185b] hover:to-[#ad1457] disabled:opacity-60 transition text-white font-bold py-3 rounded-full text-base shadow-lg shadow-pink-900/40"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>

          <p className="text-gray-400 text-sm text-center mt-5">
            ¿Ya tienes una cuenta?{' '}
            <Link href="/auth/login" className="text-[#e91e63] font-semibold hover:underline transition">
              Inicia sesión
            </Link>
          </p>
        </div>

        <div className="relative z-10 mt-10 text-center">
          <p className="text-gray-600 text-xs">
            © 2026 <span className="font-bold text-gray-500">TicketMaestro</span>. All Rights Reserved
          </p>
        </div>
      </div>
    </div>
  );
}
