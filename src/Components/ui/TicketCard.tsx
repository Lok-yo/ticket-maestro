'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Calendar, MapPin, Tag } from 'lucide-react';

interface TicketCardProps {
  ticketData: {
    id: string;
    qrCodeString: string;
    eventName: string;
    date: string;
    location: string;
    type: string;
    price: number;
    userName: string;
  };
}

export function TicketCard({ ticketData }: TicketCardProps) {
  const [qrSrc, setQrSrc] = useState('');

  useEffect(() => {
    if (ticketData.qrCodeString) {
      QRCode.toDataURL(ticketData.qrCodeString, {
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        width: 150,
      })
        .then(url => setQrSrc(url))
        .catch(err => console.error(err));
    }
  }, [ticketData.qrCodeString]);

  // Utilizamos print:hidden / print:block para adaptar los estilos cuando el usuario imprima a PDF
  return (
    <div className="relative group w-full max-w-sm mx-auto perspective">
      <div className="bg-white text-zinc-900 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 transform group-hover:-translate-y-2 relative">
        {/* Top Section - Event Details */}
        <div className="p-6 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white relative">
          {/* Decorative cutouts */}
          <div className="absolute -left-4 bottom-0 w-8 h-8 bg-[#1a1625] rounded-full translate-y-1/2 print:hidden" />
          <div className="absolute -right-4 bottom-0 w-8 h-8 bg-[#1a1625] rounded-full translate-y-1/2 print:hidden" />
          
          <h3 className="text-2xl font-black mb-1 uppercase tracking-wider">{ticketData.eventName}</h3>
          
          <div className="space-y-2 mt-4 text-sm font-medium">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 opacity-80" />
              <p>{ticketData.date}</p>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 opacity-80" />
              <p>{ticketData.location}</p>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 opacity-80" />
              <p>Clase: {ticketData.type}</p>
            </div>
          </div>
        </div>

        {/* Dashed Line separator */}
        <div className="relative h-px mx-6 bg-black/10 print:bg-black/80 my-0">
            <div className="absolute w-full h-full border-t-2 border-dashed border-gray-300 print:border-gray-500 top-0 left-0" />
        </div>

        {/* Bottom Section - QR & User Details */}
        <div className="p-6 bg-[#f8f9fa] flex flex-col items-center relative">
          <div className="w-full flex justify-between items-end mb-4">
             <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Pasajero / Asistente</p>
                <p className="font-bold text-gray-800 text-lg leading-tight">{ticketData.userName}</p>
             </div>
             <div className="text-right">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Monto</p>
                <p className="font-bold text-pink-600 text-lg">${ticketData.price.toFixed(2)} MXN</p>
             </div>
          </div>
          
          <div className="p-2 bg-white rounded-xl shadow-inner border border-gray-100">
            {qrSrc ? (
              <img src={qrSrc} alt="Ticket QR Code" className="w-32 h-32 object-contain" />
            ) : (
              <div className="w-32 h-32 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center text-xs text-gray-400">QR Pendiente</div>
            )}
          </div>
          
          <p className="mt-4 text-xs font-mono text-gray-400 text-center tracking-widest uppercase">ID: {ticketData.id.split('-')[0]}</p>
        </div>
      </div>
    </div>
  );
}
