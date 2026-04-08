// src/app/page.tsx
import Image from 'next/image';
import Navbar from '../Components/layout/Navbar';
import { createClient } from '@/lib/supabase/server';
import type { Evento, ApiResponse, Usuario } from '@/types';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; ubicacion?: string; fecha?: string }>;
}) {
  const params = await searchParams;
  const searchTerm = params.search?.trim() || '';
  const ubicacion = params.ubicacion || '';
  const fecha = params.fecha || '';

  // ✅ Obtener usuario directamente desde Supabase (lee las cookies correctamente)
  let user: Usuario | null = null;
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (authUser) {
      const { data } = await supabase
        .from('usuario')
        .select('id, nombre, email, rol')
        .eq('id', authUser.id)
        .single();
      user = data;
    }
  } catch {
    // Usuario no logueado, user queda null
  }

  // Obtener eventos directamente de Supabase
  let eventos: Evento[] = [];
  let errorMsg = '';

  try {
    const supabase = await createClient();
    
    let query = supabase
      .from('evento')
      .select('*, categoria(*)')
      .eq('estado', 'activo');

    if (searchTerm) {
      query = query.ilike('titulo', `%${searchTerm}%`);
    }
    if (ubicacion) {
      query = query.eq('ubicacion', ubicacion);
    }
    if (fecha) {
      query = query.gte('fecha', fecha);
    }

    const { data: dbEventos, error: dbError } = await query.order('fecha', { ascending: true });

    if (dbError) {
      errorMsg = 'Error al cargar los eventos desde Supabase';
    } else {
      eventos = dbEventos || [];
    }
  } catch {
    errorMsg = 'No se pudo conectar con la base de datos.';
  }

  return (
    <div className="min-h-screen bg-[#1a1625] text-white">
      <Navbar user={user} />

      {/* Hero con filtro */}
      <section className="relative h-[620px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-black/60 z-10" />
        
        <Image
          src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7"
          alt="Grupo musical"
          fill
          className="object-cover"
          priority
        />

        <div className="relative z-20 text-center px-6 max-w-5xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-8 leading-tight">
            ANTICIPA TUS BOLETOS
          </h1>

          <form className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-2 max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row gap-2 bg-white/5 rounded-3xl p-2">

              {/* Ubicación */}
              <div className="flex-1 flex items-center gap-3 bg-white/10 rounded-2xl px-6 py-4">
                <span className="text-2xl">📍</span>
                <div className="flex-1">
                  <p className="text-xs text-white/70">Ubicación</p>
                  <select
                    name="ubicacion"
                    defaultValue={ubicacion}
                    className="bg-transparent outline-none w-full text-white font-medium"
                  >
                    <option value="">Todas las ubicaciones</option>
                    <option value="SLP">San Luis Potosí</option>
                    <option value="CDMX">Ciudad de México</option>
                    <option value="GDL">Guadalajara</option>
                    <option value="MTY">Monterrey</option>
                  </select>
                </div>
              </div>

              {/* Fecha */}
              <div className="flex-1 flex items-center gap-3 bg-white/10 rounded-2xl px-6 py-4">
                <span className="text-2xl">📅</span>
                <div className="flex-1">
                  <p className="text-xs text-white/70">Fecha</p>
                  <input
                    type="date"
                    name="fecha"
                    defaultValue={fecha}
                    className="bg-transparent outline-none w-full text-white"
                  />
                </div>
              </div>

              {/* Artista / Evento */}
              <div className="flex-1 flex items-center gap-3 bg-white/10 rounded-2xl px-6 py-4">
                <span className="text-2xl">🎤</span>
                <div className="flex-1">
                  <p className="text-xs text-white/70">Artista o evento</p>
                  <input
                    name="search"
                    defaultValue={searchTerm}
                    placeholder="Buscar artista o evento"
                    className="bg-transparent outline-none w-full placeholder:text-white/60"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="bg-[#e91e63] hover:bg-[#c2185b] transition px-12 py-4 rounded-2xl font-semibold flex items-center gap-3 text-lg"
              >
                Buscar
                <span className="text-2xl">🔍</span>
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Eventos */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold mb-10">
          {searchTerm ? 'Resultados' : 'Anticipa tus boletos'}
        </h2>

        {errorMsg && (
          <p className="text-red-400 text-center py-8 text-lg">{errorMsg}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {eventos.length === 0 && !errorMsg ? (
            <p className="col-span-4 text-center text-gray-400 py-12 text-lg">
              {searchTerm ? 'No se encontraron eventos' : 'Cargando eventos...'}
            </p>
          ) : (
            eventos.map((evento) => (
              <div
                key={evento.id}
                className="bg-zinc-900 rounded-2xl overflow-hidden group hover:shadow-2xl transition-all duration-300"
              >
                <div className="relative h-56 bg-zinc-800">
                  <Image
                    src={`https://picsum.photos/seed/${evento.id}/600/400`}
                    alt={evento.titulo}
                    fill
                    className="object-cover group-hover:scale-105 transition duration-300"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-xl mb-2 line-clamp-2">{evento.titulo}</h3>
                  <p className="text-pink-400 text-sm mb-1">{evento.ubicacion}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(evento.fecha).toLocaleDateString('es-MX', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}