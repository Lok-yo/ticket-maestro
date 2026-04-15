import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Navbar from '@/Components/layout/Navbar';
import Link from 'next/link';
import { CalendarDays, Users, BarChart3, Plus, TrendingUp, Presentation } from 'lucide-react';
import type { Usuario, Evento } from '@/types';
import DeleteEventButton from '@/Components/ui/DeleteEventButton';

// Desactivar caché para ver los eventos creados al vuelo
export const dynamic = 'force-dynamic';

export default async function OrganizadorPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/'); 
  }

  // Obtener perfil para verificar rol (doble tranca de seguridad)
  const { data: usuarioData } = await supabase
    .from('usuario')
    .select('*')
    .eq('id', authUser.id)
    .single();
  
  const user = usuarioData as Usuario;

  if (user.rol !== 'organizador' && user.rol !== 'admin') {
    redirect('/'); // Expulsar clientes
  }

  // Obtener eventos del creador actual
  const { data: eventos, error } = await supabase
    .from('evento')
    .select('*, categoria(nombre)')
    .eq('organizador_id', user.id)
    .order('fecha', { ascending: false });

  const eventsData = eventos || [];
  
  // Analíticas Mock (Podrían extraerse de ordenes después)
  const totalEventos = eventsData.length;
  const preventaTickets = eventsData.length * 43; // Demo

  return (
    <div className="min-h-screen bg-[#110e1b] text-white">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
           <div>
             <h1 className="text-3xl md:text-4xl font-extrabold mb-2 flex items-center gap-3">
               <Presentation className="w-8 h-8 text-pink-500"/> Panel del Organizador
             </h1>
             <p className="text-gray-400">Gestiona tus eventos, revisa tus ventas y llega a tu audiencia.</p>
           </div>
           <div>
             <Link 
               href="/organizador/nuevo" 
               className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-full transition-all shadow-[0_0_20px_rgba(219,39,119,0.3)] hover:shadow-[0_0_30px_rgba(219,39,119,0.5)] transform hover:-translate-y-1"
             >
               <Plus className="w-5 h-5"/> Crear Nuevo Evento
             </Link>
           </div>
        </div>

        {/* Cajas de Métricas Premium */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 transform group-hover:scale-110 group-hover:rotate-12 transition-transform">
                    <CalendarDays className="w-24 h-24" />
                </div>
                <p className="text-gray-400 font-medium mb-1">Eventos Publicados</p>
                <h3 className="text-4xl font-black text-white">{totalEventos}</h3>
            </div>
            
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 transform group-hover:scale-110 group-hover:rotate-12 transition-transform">
                    <Users className="w-24 h-24" />
                </div>
                <p className="text-gray-400 font-medium mb-1">Boletos Previstos</p>
                <h3 className="text-4xl font-black text-blue-400">{preventaTickets}</h3>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 transform group-hover:scale-110 group-hover:rotate-12 transition-transform">
                    <TrendingUp className="w-24 h-24 text-pink-500" />
                </div>
                <p className="text-gray-400 font-medium mb-1">Estado de la Gira</p>
                <h3 className="text-xl font-bold text-green-400 mt-2 flex items-center gap-2">
                   <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div> Activo
                </h3>
            </div>
        </div>

        {/* Lista de Eventos Creados */}
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" /> Historial de Giras
        </h2>

        {eventsData.length === 0 ? (
          <div className="bg-white/5 border border-dashed border-white/20 rounded-3xl p-16 text-center">
            <CalendarDays className="w-16 h-16 text-gray-500 mx-auto mb-4 opacity-20"/>
            <h2 className="text-xl font-bold mb-2 text-white/80">Lienzo en blanco</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">Tu catálogo está vacío. La magia empieza cuando publicas tu primera gira o espectáculo interactivo.</p>
            <Link href="/organizador/nuevo" className="inline-block bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-6 rounded-full transition">Comenzar a Crear</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventsData.map((evento) => (
              <Link key={evento.id} href={`/organizador/editar/${evento.id}`} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition-colors cursor-pointer group relative block">
                 <div className="absolute inset-0 bg-gradient-to-b from-transparent to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none"></div>
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 text-white font-bold py-2 px-6 rounded-full opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100 z-30 shadow-2xl backdrop-blur-sm border border-white/20">
                    Modificar
                 </div>
                 <div className="h-40 bg-zinc-800 relative">
                    <DeleteEventButton eventId={evento.id} eventTitle={evento.titulo} />
                    <img 
                       src={evento.imagen || `https://picsum.photos/seed/${evento.id}/400/250`} 
                       alt={evento.titulo} 
                       className="w-full h-full object-cover group-hover:scale-105 group-hover:opacity-50 transition duration-300" 
                    />
                    <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-xs font-bold py-1 px-3 rounded-full text-white/90 z-10">
                       {evento.estado.toUpperCase()}
                    </div>
                 </div>
                 <div className="p-6 relative z-10">
                    <p className="text-xs text-pink-400 font-bold mb-1 uppercase tracking-wider">
                        {evento.categoria?.nombre || 'Categoría Premium'}
                    </p>
                    <h3 className="text-xl font-extrabold mb-3 truncate group-hover:text-pink-300 transition-colors">{evento.titulo}</h3>
                    <div className="space-y-1 text-sm text-gray-400 mb-4">
                        <p>📍 {evento.ubicacion}</p>
                        <p>📅 {new Date(evento.fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    
                    <div className="flex items-center justify-between border-t border-white/10 pt-4 mt-2">
                        <span className="text-xs text-gray-500 font-mono">{evento.id}</span>
                        <span className="font-bold text-white">${evento.precio_base} MXN</span>
                    </div>
                 </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
