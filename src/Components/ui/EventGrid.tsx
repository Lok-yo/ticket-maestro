'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import type { Event } from '@/types';

// Skeleton de un evento
function EventSkeleton() {
  return (
    <div className="bg-zinc-900 rounded-2xl overflow-hidden animate-pulse">
      <div className="h-56 bg-zinc-800" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-zinc-700 rounded w-3/4" />
        <div className="h-3 bg-zinc-700 rounded w-1/2" />
        <div className="h-3 bg-zinc-700 rounded w-2/3" />
      </div>
    </div>
  );
}

interface Props {
  searchTerm?: string;
  ubicacion?: string;
  fecha?: string;
  fechaFin?: string;
}

export default function EventGrid({ searchTerm = '', ubicacion = '', fecha = '', fechaFin = '' }: Props) {
  const [eventos, setEventos] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        
        let query = supabase
          .from('events')
          .select('*, category:categories(*)')
          .eq('status', 'published')
          .order('date', { ascending: true })
          .range(0, 20); // Limitamos a 20 por ahora

        if (searchTerm) {
          query = query.ilike('title', `%${searchTerm}%`);
        }
        if (ubicacion) {
          query = query.ilike('location', `%${ubicacion}%`);
        }
        if (fecha) {
          query = query.gte('date', fecha);
        }
        if (fechaFin) {
          query = query.lte('date', fechaFin);
        }

        const { data, error } = await query;
        
        if (error) {
           console.error('Error Supabase:', error);
           setErrorMsg('No se pudo conectar con la base de datos.');
        } else {
           setEventos(data || []);
           setErrorMsg('');
        }
      } catch (err) {
        console.error('Error fetching events:', err);
        setErrorMsg('Error interno al obtener eventos.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [searchTerm, ubicacion, fecha, fechaFin]);

  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <h2 className="text-4xl font-bold mb-10">
        {(searchTerm || ubicacion || fecha) ? 'Resultados' : 'Anticipa tus boletos'}
      </h2>

      {errorMsg && (
        <p className="text-red-400 text-center py-8 text-lg">{errorMsg}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          // Skeleton mientras cargan
          Array.from({ length: 8 }).map((_, i) => <EventSkeleton key={i} />)
        ) : eventos.length === 0 && !errorMsg ? (
          <p className="col-span-4 text-center text-gray-400 py-12 text-lg">
            {(searchTerm || ubicacion || fecha)
              ? 'No se encontraron eventos con estos filtros.'
              : 'No hay eventos disponibles en este momento.'}
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
                  src={evento.image_url || `https://picsum.photos/seed/${evento.id}/600/400`}
                  alt={evento.title}
                  fill
                  quality={60}
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  loading="lazy"
                  className="object-cover group-hover:scale-105 transition duration-300"
                />
              </div>
              <div className="p-5">
                <h3 className="font-bold text-xl mb-2 line-clamp-2">{evento.title}</h3>
                <p className="text-pink-400 text-sm mb-1">{evento.location}</p>
                <p className="text-xs text-gray-400">
                  {new Date(evento.date).toLocaleDateString('es-MX', {
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
  );
}

