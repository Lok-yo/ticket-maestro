'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, Download, Home, Loader2 } from 'lucide-react';
import { TicketCard } from '@/Components/ui/TicketCard';
import Navbar from '@/Components/layout/Navbar';
import { createClient } from '@/lib/supabase/client';

function SuccessPageContent() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.ordenId as string;
  
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      const supabase = createClient();
      let attempts = 0;
      let fetchedTickets: any[] = [];
      let userName = 'Invitado';

      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
         const { data: userRow } = await supabase.from('usuario').select('nombre').eq('id', authData.user.id).single();
         if (userRow) userName = userRow.nombre;
      }

      // Hacemos polling (hasta 5 intentos) para darle tiempo al webhook de Stripe de procesar el pago y asignar el QR real
      while (attempts < 5) {
        const { data: orden } = await supabase
          .from('orden')
          .select(`
            id,
            boleto (
              id,
              codigo_qr,
              precio,
              tipo,
              estado,
              evento (titulo, fecha, ubicacion)
            )
          `)
          .eq('id', orderId)
          .single();

        fetchedTickets = orden?.boleto ? (Array.isArray(orden.boleto) ? orden.boleto : [orden.boleto]) : [];
        if (fetchedTickets.length > 0 && fetchedTickets[0].estado === 'vendido') {
          break; // ¡El webhook ya terminó su trabajo!
        }
        
        attempts++;
        if(attempts < 5) await new Promise(r => setTimeout(r, 1500)); // Esperamos 1.5s y volvemos a checkear
      }

      const formatter = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

      const formattedTickets = fetchedTickets.map((b: any) => ({
        id: b.id,
        qrCodeString: b.codigo_qr?.startsWith('PENDIENTE') ? '' : b.codigo_qr,
        eventName: b.evento?.titulo || 'Evento',
        date: b.evento?.fecha ? formatter.format(new Date(b.evento.fecha)) : 'Por definir',
        location: b.evento?.ubicacion || 'Por definir',
        type: b.tipo,
        price: b.precio,
        userName: userName,
      }));

      setTickets(formattedTickets);
      setLoading(false);
    };

    fetchTickets();
  }, [orderId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#1a1625] text-white print:bg-white print:text-black">
      <div className="print:hidden">
         <Navbar user={null} />
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 flex flex-col items-center">
        
        {/* Success Animation & Header - Hidden on Print */}
        <div className="text-center mb-12 print:hidden">
           <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-500/20 text-green-500 mb-6 animate-bounce">
               <CheckCircle2 className="w-12 h-12" />
           </div>
           <h1 className="text-4xl md:text-5xl font-black mb-4">¡Compra Exitosa!</h1>
           <p className="text-gray-400 text-lg">Tu orden <span className="text-white font-mono">{orderId}</span> ha sido procesada correctamente.</p>
           <p className="text-gray-400">Hemos enviado un recibo a tu correo con los detalles.</p>
           
           <div className="flex gap-4 justify-center mt-8">
               <button 
                  onClick={handlePrint}
                  className="bg-white text-black px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-gray-200 transition"
               >
                   <Download className="w-5 h-5"/> Descargar Boletos
               </button>
               <button 
                  onClick={() => router.push('/')}
                  className="bg-white/10 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-white/20 transition"
               >
                   <Home className="w-5 h-5"/> Volver al Inicio
               </button>
           </div>
        </div>

        {/* Tickets Grid - Visible on Print */}
        <div className="w-full">
            <h2 className="text-2xl font-bold mb-8 text-center print:text-black print:mb-12">Tus Boletos ({tickets.length})</h2>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-pink-500" />
                <p>Preparando boletos...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 gap-y-16 print:grid-cols-1 print:gap-24">
                  {tickets.map(ticket => (
                      <div key={ticket.id} className="print:break-inside-avoid">
                          <TicketCard ticketData={ticket} />
                      </div>
                  ))}
              </div>
            )}
        </div>

      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#1a1625] flex items-center justify-center text-white">Generando boletos...</div>}>
       <SuccessPageContent />
    </Suspense>
  );
}
