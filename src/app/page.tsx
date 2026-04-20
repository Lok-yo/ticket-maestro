// src/app/page.tsx
import Image from 'next/image';
import Navbar from '../Components/layout/Navbar';
import { SearchForm } from '../Components/ui/SearchForm';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/types';
import EventGrid from '@/Components/ui/EventGrid';

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

  // Solo resolvemos el usuario en el servidor (rápido, usa cookies en caché)
  let user: Profile | null = null;
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (authUser) {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role, created_at')
        .eq('id', authUser.id)
        .single();
      user = data as Profile;
    }
  } catch {
    // Usuario no logueado
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
             quality={70}
             sizes="100vw"
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

      {/* Eventos — carga en cliente sin bloquear la navegación */}
      <EventGrid
        searchTerm={searchTerm}
        ubicacion={ubicacion}
        fecha={fecha}
        fechaFin={fechaFin}
      />
    </div>
  );
}
