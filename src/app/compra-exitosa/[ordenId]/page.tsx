'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, Download, Home } from 'lucide-react';
import { TicketCard } from '@/Components/ui/TicketCard';
import Navbar from '@/Components/layout/Navbar';

function SuccessPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const orderId = params.ordenId as string;
  const eventTitle = searchParams.get('title') || 'Festival Gira 2026';
  const type = searchParams.get('type') || 'General';
  const qty = parseInt(searchParams.get('qty') || '1', 10);
  const name = searchParams.get('name') || 'Invitado';
  const total = parseFloat(searchParams.get('total') || '0');

  // En un caso real, el evento traería ciudad, etc de la BD. Aquí mockeamos.
  const pricePerTicket = total / qty;

  const tickets = Array.from({ length: qty }).map((_, i) => ({
    id: `${orderId}-TKT-${i + 1}`,
    qrCodeString: `https://ticket-maestro.com/verify/${orderId}-TKT-${i + 1}`,
    eventName: eventTitle,
    date: '15 Octubre 2026 - 20:00', // Mock data
    location: 'Estadio Nacional',
    type: type,
    price: pricePerTicket,
    userName: name,
  }));

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
                   <Download className="w-5 h-5"/> Descargar Boletos (PDF)
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
            <h2 className="text-2xl font-bold mb-8 text-center print:text-black print:mb-12">Tus Boletos ({qty})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 gap-y-16 print:grid-cols-1 print:gap-24">
                {tickets.map(ticket => (
                    <div key={ticket.id} className="print:break-inside-avoid">
                        <TicketCard ticketData={ticket} />
                    </div>
                ))}
            </div>
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
