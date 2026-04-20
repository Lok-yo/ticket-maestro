'use client';

import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Calendar, MapPin, Tag, Download } from 'lucide-react';

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
    seatLabel?: string | null;
  };
}

export function TicketCard({ ticketData }: TicketCardProps) {
  const [qrSrc, setQrSrc] = useState('');
  const ticketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const qrData = ticketData.qrCodeString || ticketData.id;
    if (qrData) {
      QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'M',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        width: 400,
      })
        .then(url => setQrSrc(url))
        .catch(err => console.error(err));
    }
  }, [ticketData.id, ticketData.qrCodeString]);

  const handleDownload = async () => {
    // Genera un canvas con los datos del boleto y lo descarga como PNG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 500;
    const h = 700;
    canvas.width = w;
    canvas.height = h;

    // Fondo
    const grad = ctx.createLinearGradient(0, 0, w, h / 2);
    grad.addColorStop(0, '#6366f1');
    grad.addColorStop(0.5, '#a855f7');
    grad.addColorStop(1, '#ec4899');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 24);
    ctx.fill();

    // Zona blanca inferior
    ctx.fillStyle = '#f8f9fa';
    ctx.beginPath();
    ctx.roundRect(0, 320, w, h - 320, [0, 0, 24, 24]);
    ctx.fill();

    // Línea divisoria
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, 320);
    ctx.lineTo(w - 30, 320);
    ctx.stroke();
    ctx.setLineDash([]);

    // Texto superior (evento)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Inter, system-ui, sans-serif';
    ctx.fillText(ticketData.eventName.toUpperCase(), 30, 60);

    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#cbd5e1'; // gris clarito
    ctx.fillText('FECHA', 30, 100);
    ctx.fillText('LUGAR', 30, 135);
    ctx.fillText('TIPO / CLASE', 30, 170);

    ctx.font = 'bold 15px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(ticketData.date, 30, 115);
    ctx.fillText(ticketData.location, 30, 150);
    ctx.fillText(ticketData.type, 30, 185);

    // Precio
    ctx.font = 'bold 22px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`$${ticketData.price.toFixed(2)} MXN`, 30, 260);

    // Zona inferior
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.fillText('PASAJERO / ASISTENTE', 30, 360);
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 20px Inter, system-ui, sans-serif';
    ctx.fillText(ticketData.userName, 30, 390);

    ctx.fillStyle = '#6b7280';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.fillText('ID DE BOLETO', 30, 430);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '13px monospace';
    ctx.fillText(ticketData.id, 30, 455);

    // QR
    if (qrSrc) {
      const qrImage = new window.Image();
      qrImage.crossOrigin = 'anonymous';
      qrImage.onload = () => {
        const qrSize = 180;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect((w - qrSize - 20) / 2, 490, qrSize + 20, qrSize + 20, 12);
        ctx.fill();
        ctx.drawImage(qrImage, (w - qrSize) / 2, 500, qrSize, qrSize);

        // Descargar
        const link = document.createElement('a');
        link.download = `boleto-${ticketData.id}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      };
      qrImage.src = qrSrc;
    }
  };

  return (
    <div className="relative group w-full max-w-sm mx-auto perspective">
      <div ref={ticketRef} className="bg-white text-zinc-900 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 transform group-hover:-translate-y-2 relative">
        {/* Top Section - Event Details */}
        <div className="p-6 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white relative">
          {/* Decorative cutouts */}
          <div className="absolute -left-4 bottom-0 w-8 h-8 bg-[#1a1625] rounded-full translate-y-1/2 print:hidden" />
          <div className="absolute -right-4 bottom-0 w-8 h-8 bg-[#1a1625] rounded-full translate-y-1/2 print:hidden" />
          
          <h3 className="text-xl sm:text-2xl font-black mb-1 uppercase tracking-wider leading-tight">{ticketData.eventName}</h3>
          
          <div className="space-y-2 mt-4 text-sm font-medium">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 opacity-80 shrink-0" />
              <p>{ticketData.date}</p>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 opacity-80 shrink-0" />
              <p>{ticketData.location}</p>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 opacity-80 shrink-0" />
              <p>Clase: {ticketData.type}</p>
            </div>
            {ticketData.seatLabel && (
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 opacity-80 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <p>Asiento: {ticketData.seatLabel}</p>
              </div>
            )}
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
          <div className="p-2 bg-white rounded-xl shadow-inner border border-gray-100 flex justify-center w-full">
            {qrSrc ? (
              <img src={qrSrc} alt="Ticket QR Code" className="w-48 h-48 object-contain" />
            ) : (
              <div className="w-48 h-48 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center text-xs text-gray-400">QR Pendiente</div>
            )}
          </div>
          
          <p className="mt-4 text-[10px] font-mono text-gray-400 text-center tracking-wider uppercase break-all">ID: {ticketData.id}</p>

          {/* Botón de descarga */}
          <button
            onClick={handleDownload}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-bold text-sm rounded-xl hover:from-indigo-600 hover:to-pink-600 transition-all shadow-lg print:hidden"
          >
            <Download className="w-4 h-4" />
            Descargar Boleto
          </button>
        </div>
      </div>
    </div>
  );
}
