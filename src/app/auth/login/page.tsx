'use client';

import { useState, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ApiResponse } from '@/types';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const json: ApiResponse<{ id: string; nombre: string; email: string; rol: string }> =
        await res.json();

      if (!res.ok || json.error) {
        setError(json.error || 'Email o contraseña incorrectos');
        return;
      }

      // Primero refresh para que el servidor lea las cookies nuevas de Supabase
      router.refresh();

      // Si hay returnUrl (ej: volver al checkout), redirigir allá
      if (returnUrl) {
        router.push(decodeURIComponent(returnUrl));
      } else if (json.data?.rol === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/');
      }

    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">

      <Image
        src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7"
        alt="Concierto"
        fill
        className="object-cover"
        priority
      />

      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-purple-950/60 to-black/80" />

      <Link href="/" className="relative z-10 mb-8 hover:opacity-80 transition">
        <Image
          src="/11.png"
          alt="TicketMaestro"
          width={500}
          height={90}
          className="object-contain"
          priority
        />
      </Link>

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-black/50 backdrop-blur-md rounded-3xl px-10 py-10 shadow-2xl border border-white/10">

          <h1 className="text-white text-4xl font-bold text-center mb-1">
            Inicio de Sesion
          </h1>
          <p className="text-white text-base font-semibold text-center">
            Bienvenido a TicketMaestro
          </p>
          <p className="text-gray-300 text-sm text-center mb-8">
            por favor ingresa tu correo.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            <div className="flex items-center gap-3 bg-zinc-800/80 border border-zinc-600 rounded-xl px-4 py-3">
              <svg className="w-5 h-5 text-pink-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <input
                type="email"
                required
                placeholder="Correo Electronico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent outline-none text-white placeholder-gray-400 w-full text-sm"
              />
            </div>

            <div className="flex items-center gap-3 bg-zinc-800/80 border border-zinc-600 rounded-xl px-4 py-3">
              <svg className="w-5 h-5 text-pink-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <input
                type="password"
                required
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-transparent outline-none text-white placeholder-gray-400 w-full text-sm"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center -mb-1">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 bg-[#e91e63] hover:bg-[#c2185b] disabled:opacity-60 transition text-white font-semibold py-3 rounded-xl text-base shadow-lg"
            >
              {loading ? 'Iniciando...' : 'Iniciar Sesion'}
            </button>
          </form>

          <p className="text-gray-300 text-sm text-center mt-6">
            Aun no tienes una cuenta?{' '}
            <Link
              href="/auth/register"
              className="text-pink-400 hover:text-pink-300 underline transition"
            >
              ingresa aqui
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Cargando...</div>}>
      <LoginFormContent />
    </Suspense>
  );
}