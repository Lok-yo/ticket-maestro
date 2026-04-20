import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Navbar from '@/Components/layout/Navbar';
import Link from 'next/link';
import Image from 'next/image';
import { CalendarDays, Users, BarChart3, Plus, TrendingUp, Presentation } from 'lucide-react';
import type { Usuario, Evento } from '@/types';
import DeleteEventButton from '@/Components/ui/DeleteEventButton';
import ClabeForm from '@/Components/ui/ClabeForm';

// Desactivar cache para ver los eventos creados al vuelo
export const dynamic = 'force-dynamic';

export default async function OrganizadorPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/'); 
  }

  // Obtener perfil para verificar rol (doble tranca de seguridad)
  const { data: usuarioData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single();
  
  const user = usuarioData as Usuario;

  // Verificar si es staff en algun evento
  const { data: staffEventos } = await supabase
    .from('event_staff')
    .select('evento_id, puede_validar, puede_ver_reportes')
    .eq('usuario_id', user.id);

  const isStaffInAny = staffEventos && staffEventos.length > 0;

  if (user.rol !== 'organizador' && user.rol !== 'admin' && !isStaffInAny) {
    redirect('/'); // Expulsar clientes
  }

  const isMainOrganizer = user.rol === 'organizador' || user.rol === 'admin';
  const staffEventIds = isStaffInAny ? staffEventos.map(s => s.evento_id) : [];

  // Obtener eventos del creador actual o donde es staff
  let eventsData: any[] = [];

  if (isMainOrganizer) {
    const { data: eventosPropios } = await supabase
      .from('events')
      .select('*, categoria(nombre), tipo_boleto(*)')
      .eq('organizador_id', user.id)
      .order('fecha', { ascending: false });
    
    eventsData = eventosPropios || [];
  }

  // Sumar eventos donde es staff
  if (staffEventIds.length > 0) {
    const { data: eventosAsignados } = await supabase
      .from('events')
      .select('*, categoria(nombre), tipo_boleto(*)')
      .in('id', staffEventIds)
      .order('fecha', { ascending: false });

    if (eventosAsignados) {
      // Evitar duplicados si es organizador y staff a la vez
      const existingIds = new Set(eventsData.map(e => e.id));
      const addStaffEvents = eventosAsignados.filter(e => !existingIds.has(e.id));
      eventsData = [...eventsData, ...addStaffEvents];
    }
  }
  
  // Analiticas Reales y Balance
  let saldoDisponible = 0;
  let miClabe = '';

  if (isMainOrganizer) {
    const { data: balanceData } = await supabase
      .from('profiles')
      .select('*')
      .eq('organizador_id', user.id)
      .single();

    saldoDisponible = balanceData?.saldo_disponible || 0;
    miClabe = balanceData?.clabe || '';
  }

  return (
    <div className="min-h-screen bg-[#110e1b] text-white">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
           <div>
             <h1 className="text-3xl md:text-4xl font-extrabold mb-2 flex items-center gap-3">
               <Presentation className="w-8 h-8 text-pink-500"/> {isMainOrganizer ? 'Panel del Organizador' : 'Panel de Staff'}
             </h1>
             <p className="text-gray-400">
               {isMainOrganizer 
                 ? 'Gestiona tus eventos, revisa tus ventas y llega a tu audiencia.' 
                 : 'Gestiona el acceso y validación de los eventos a los que estás asignado.'}
             </p>
           </div>
           {isMainOrganizer && (
             <div>
               <Link 
                 href="/organizador/nuevo" 
                 className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-full transition-all shadow-[0_0_20px_rgba(219,39,119,0.3)] hover:shadow-[0_0_30px_rgba(219,39,119,0.5)] transform hover:-translate-y-1"
               >
                 <Plus className="w-5 h-5"/> Crear Nuevo Evento
               </Link>
             </div>
           )}
        </div>

        {/* Cajas de Metricas Premium */}
        {isMainOrganizer && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl relative overflow-hidden group flex flex-col justify-between">
                  <div className="absolute top-0 right-0 p-4 opacity-10 transform group-hover:scale-110 group-hover:rotate-12 transition-transform">
                      <TrendingUp className="w-24 h-24 text-green-500" />
                  </div>
                  <div>
                     <p className="text-gray-400 font-medium mb-1">Saldo Disponible</p>
                     <h3 className="text-4xl font-black text-green-400">${Number(saldoDisponible).toLocaleString('es-MX')} <span className="text-xl">MXN</span></h3>
                  </div>
              </div>
              
              <div className="md:col-span-2">
                  <ClabeForm initialClabe={miClabe} />
              </div>
          </div>
        )}

        {/* Lista de Eventos Creados */}
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" /> {isMainOrganizer ? 'Historial de Giras' : 'Eventos Asignados'}
        </h2>

        {eventsData.length === 0 ? (
          <div className="bg-white/5 border border-dashed border-white/20 rounded-3xl p-16 text-center">
            <CalendarDays className="w-16 h-16 text-gray-500 mx-auto mb-4 opacity-20"/>
            <h2 className="text-xl font-bold mb-2 text-white/80">Lienzo en blanco</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              {isMainOrganizer 
                ? 'Tu catalogo esta vacio. La magia empieza cuando publicas tu primera gira.'
                : 'No tienes ningún evento asignado como staff todavía.'}
            </p>
            {isMainOrganizer && (
              <Link href="/organizador/nuevo" className="inline-block bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-6 rounded-full transition">Comenzar a Crear</Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventsData.map((evento) => {
              const isOwner = evento.organizador_id === user.id;
              
              // Calcular precio "desde" usando tipos de boleto
              const tienetipos = evento.tipo_boleto && evento.tipo_boleto.length > 0;
              const precioDesde = tienetipos
                ? Math.min(...evento.tipo_boleto.map((t: any) => Number(t.precio)))
                : evento.precio_base;

              return (
              <div key={evento.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition-colors relative flex flex-col">
                 <div className="h-48 bg-zinc-800 relative">
                    {isOwner && <DeleteEventButton eventId={evento.id} eventTitle={evento.titulo} />}
                    <div className="relative w-full h-full">
                       <Image 
                          src={evento.imagen || `https://picsum.photos/seed/${evento.id}/400/250`} 
                          alt={evento.titulo} 
                          fill
                          className="object-cover opacity-80" 
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                       />
                    </div>
                    <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-xs font-bold py-1 px-3 rounded-full text-white/90 z-10">
                       {evento.estado.toUpperCase()}
                    </div>
                 </div>
                 
                 <div className="p-6 flex-1 flex flex-col">
                    <p className="text-xs text-pink-400 font-bold mb-1 uppercase tracking-wider">
                        {evento.categoria?.nombre || 'Categoria Premium'}
                    </p>
                    <h3 className="text-xl font-extrabold mb-3 truncate text-white">{evento.titulo}</h3>
                    <div className="space-y-1 text-sm text-gray-400 mb-4 flex-1">
                        <p>{evento.ubicacion}</p>
                        <p>{new Date(evento.fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    
                    <div className="flex items-center justify-between border-t border-white/10 pt-4 mt-2 mb-4">
                        <span className="text-xs text-gray-500 font-mono">{evento.id}</span>
                        <span className="font-bold text-white">
                          {tienetipos ? `Desde $${precioDesde?.toLocaleString()}` : `$${evento.precio_base}`} MXN
                        </span>
                    </div>

                    <div className="flex items-center gap-2 mt-auto">
                        {isOwner && (
                          <Link 
                             href={`/organizador/editar/${evento.id}`}
                             className="flex-1 text-center bg-white/10 text-white font-bold py-2.5 px-4 rounded-xl hover:bg-white/20 transition-colors text-sm"
                          >
                             Modificar
                          </Link>
                        )}
                        <Link 
                           href={`/organizador/evento/${evento.id}/acceso`}
                           className="flex-1 text-center bg-pink-600 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg hover:bg-pink-500 transition-colors text-sm"
                        >
                           Acceso
                        </Link>
                    </div>
                 </div>
              </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

