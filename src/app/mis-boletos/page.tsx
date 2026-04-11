import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Navbar from '@/Components/layout/Navbar';
import { TicketCard } from '@/Components/ui/TicketCard';
import { Ticket } from 'lucide-react';
import type { Usuario } from '@/types';

export default async function MisBoletosPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/'); // Redirigir al inicio o login si no está logueado
  }

  // Obtener perfil (Usuario)
  let user: Usuario | null = null;
  const { data } = await supabase
    .from('usuario')
    .select('*')
    .eq('id', authUser.id)
    .single();
  
  user = data as Usuario;

  // En un entorno de producción, aquí haríamos:
  // supabase.from('boleto').select('*, evento(*)').eq('usuario_id', authUser.id)
  
  // Como estamos implementando el front de acuerdo a la fase 4, 
  // simularemos una respuesta de la API con los boletos del usuario.
  const mockTickets = [
    {
      id: 'BKT-582910-1',
      qrCodeString: 'https://ticket-maestro.com/verify/BKT-582910-1',
      eventName: 'Festival Gira 2026',
      date: '15 Octubre 2026',
      location: 'Estadio Nacional',
      type: 'General',
      price: 800,
      userName: user?.nombre || 'Usuario',
    },
    {
      id: 'BKT-991203-1',
      qrCodeString: 'https://ticket-maestro.com/verify/BKT-991203-1',
      eventName: 'Teatro en Vivo: Los Miserables',
      date: '22 Noviembre 2026',
      location: 'Teatro de la Ciudad',
      type: 'VIP',
      price: 2500,
      userName: user?.nombre || 'Usuario',
    }
  ];

  return (
    <div className="min-h-screen bg-[#1a1625] text-white">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-12">
           <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
              <Ticket className="w-8 h-8 text-pink-500"/> Mis Boletos
           </h1>
           <p className="text-gray-400">Administra tus entradas y próximos eventos.</p>
        </div>

        {mockTickets.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
            <Ticket className="w-16 h-16 text-gray-500 mx-auto mb-4 opacity-50"/>
            <h2 className="text-xl font-bold mb-2">Aún no tienes boletos</h2>
            <p className="text-gray-400 mb-6">Explora el catálogo y asegúrate de no perderte tus eventos favoritos.</p>
            <a href="/" className="inline-block bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 px-8 rounded-full transition">Explorar Eventos</a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mockTickets.map((ticket) => (
              <TicketCard key={ticket.id} ticketData={ticket} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
