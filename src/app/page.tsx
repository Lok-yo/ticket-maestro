// src/app/page.tsx
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '../Components/layout/Navbar';
import { SearchForm } from '../Components/ui/SearchForm';
import { createClient } from '@/lib/supabase/server';
import type { Evento, ApiResponse, Usuario } from '@/types';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; ubicacion?: string; fecha?: string; fechaFin?: string }>;
}) {
  const params = await searchParams;
  const searchTerm = params.search?.trim() || '';
  const ubicacion = params.ubicacion || '';
  const fecha = params.fecha || '';
  const fechaFin = params.fechaFin || '';

  // ✅ Obtener usuario directamente desde Supabase (lee las cookies correctamente)
  let user: Usuario | null = null;
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (authUser) {
      const { data } = await supabase
        .from('usuario')
        .select('id, nombre, email, rol, fecha_registro')
        .eq('id', authUser.id)
        .single();
      user = data as Usuario;
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
    if (fechaFin) {
      query = query.lte('fecha', fechaFin + 'T23:59:59');
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
      <section className="relative h-[620px] flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden">
           <div className="absolute inset-0 bg-black/60 z-10" />
           <Image
             src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7"
             alt="Grupo musical"
             fill
             className="object-cover"
             priority
           />
        </div>

        <div className="relative z-20 text-center px-6 max-w-5xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-8 leading-tight">
            ANTICIPA TUS BOLETOS
          </h1>

          <SearchForm 
             initialUbicacion={ubicacion} 
             initialFecha={fecha} 
             initialSearch={searchTerm} 
          />
        </div>
      </section>

      {/* Eventos */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold mb-10">
          {(searchTerm || ubicacion || fecha) ? 'Resultados' : 'Anticipa tus boletos'}
        </h2>

        {errorMsg && (
          <p className="text-red-400 text-center py-8 text-lg">{errorMsg}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {eventos.length === 0 && !errorMsg ? (
            <p className="col-span-4 text-center text-gray-400 py-12 text-lg">
              {(searchTerm || ubicacion || fecha) ? 'No se encontraron eventos con estos filtros.' : 'No hay eventos disponibles en este momento.'}
            </p>
          ) : (
            eventos.map((evento) => (
              <Link
                href={`/evento/${evento.id}`}
                key={evento.id}
                className="bg-zinc-900 rounded-2xl overflow-hidden group hover:shadow-2xl transition-all duration-300 block"
              >
                <div className="relative h-56 bg-zinc-800">
                  <Image
                    src={evento.imagen || `https://picsum.photos/seed/${evento.id}/600/400`}
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
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}