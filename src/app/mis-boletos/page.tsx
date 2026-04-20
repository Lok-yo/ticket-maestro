import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Navbar from '@/Components/layout/Navbar';
import { TicketCard } from '@/Components/ui/TicketCard';
import { Ticket, Eye } from 'lucide-react';
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
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single();
  
  user = data as Usuario;

  // Consulta real a Supabase
  // Extraemos las órdenes del usuario, sus boletos, y el evento de cada boleto
  const { data: ordenes, error: dbError } = await supabase
    .from('orders')
    .select(`
      id,
      total,
      fecha,
      boleto (
        id,
        codigo_qr,
        precio,
        tipo,
        estado,
        evento (
          titulo,
          fecha,
          ubicacion
        )
      )
    `)
    .eq('usuario_id', authUser.id)
    .order('fecha', { ascending: false });

  // Aplanar la estructura: De un arreglo de Órdenes a un arreglo plano de Boletos
  let ticketsReales: any[] = [];
  
  if (ordenes) {
    ordenes.forEach(orden => {
      // Ignorar órdenes sin boletos por seguridad
      if (!orden.boleto) return;
      
      // La respuesta de Supabase puede dar un arreglo de boletos (si compró varios en la misma orden)
      const boletosArray = Array.isArray(orden.boleto) ? orden.boleto : [orden.boleto];
      
      boletosArray.forEach((boleto: any) => {
        // Formatear la fecha (Si evento existe)
        const fechaEventoRaw = boleto.evento ? new Date(boleto.evento.fecha) : new Date();
        const formatter = new Intl.DateTimeFormat('es-MX', { 
            day: 'numeric', month: 'long', year: 'numeric' 
        });

        ticketsReales.push({
          id: boleto.id,
          qrCodeString: boleto.codigo_qr || `https://ticket-maestro.com/verify/${boleto.id}`, // Fallback al id temporal
          qrRaw: JSON.stringify({ ticketId: boleto.id }),
          eventName: boleto.evento ? boleto.evento.titulo : 'Evento Desconocido',
          date: formatter.format(fechaEventoRaw),
          location: boleto.evento ? boleto.evento.ubicacion : 'Por definir',
          type: boleto.tipo,
          price: boleto.precio,
          userName: user?.nombre || 'Pasajero',
        });
      });
    });
  }

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

        {ticketsReales.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
            <Ticket className="w-16 h-16 text-gray-500 mx-auto mb-4 opacity-50"/>
            <h2 className="text-xl font-bold mb-2">Aún no tienes boletos</h2>
            <p className="text-gray-400 mb-6">Explora el catálogo y asegúrate de no perderte tus eventos favoritos.</p>
            <a href="/" className="inline-block bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 px-8 rounded-full transition">Explorar Eventos</a>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {ticketsReales.map((ticket, index) => (
                <TicketCard key={ticket.id + index.toString()} ticketData={ticket} />
              ))}
            </div>
            <div className="mt-12 bg-white/5 border border-white/10 rounded-2xl p-6 flex items-start gap-4 text-gray-400">
               <Eye className="w-6 h-6 text-pink-500 shrink-0 mt-1" />
               <div>
                  <h4 className="text-white font-bold mb-1">Mantén tus códigos seguros</h4>
                  <p className="text-sm">Tus códigos QR son únicos y personales. No los compartas en redes sociales para evitar falsificaciones o duplicados el día del evento.</p>
               </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

