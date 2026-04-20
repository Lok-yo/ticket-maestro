'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Calendar, MapPin, Users, Info, ChevronLeft, AlertTriangle } from 'lucide-react';
import Navbar from '@/Components/layout/Navbar';
import { createClient } from '@/lib/supabase/client';
import type { TipoBoleto } from '@/types';

// Fallback: Función para generar tipos de boletos cuando no hay tipo_boleto en BD
const getTicketTypesFallback = (basePrice: number, capacidad: number) => [
  { id: 'general-fallback', nombre: 'General', precio: basePrice, stock_disponible: capacidad, max_por_compra: 10, descripcion: 'Acceso a zona general.' },
  { id: 'preferente-fallback', nombre: 'Preferente', precio: Math.round(basePrice * 1.5), stock_disponible: Math.floor(capacidad * 0.3), max_por_compra: 5, descripcion: 'Mejor vista y acceso preferencial.' },
  { id: 'vip-fallback', nombre: 'VIP', precio: Math.round(basePrice * 2.5), stock_disponible: Math.floor(capacidad * 0.1), max_por_compra: 2, descripcion: 'Acceso exclusivo y amenidades VIP.' },
];

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  
  const [eventData, setEventData] = useState<any>(null);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<any>(null);
  
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvent = async () => {
      const supabase = createClient();
      try {
          const { data, error } = await supabase
            .from('evento')
            .select('*, tipo_boleto(*)')
            .eq('id', eventId)
            .single();
          
          if (data && !error) {
              setEventData(data);
              
              if (data.tipo_boleto && data.tipo_boleto.length > 0) {
                const ORDEN_TIPOS: Record<string, number> = { 'General': 1, 'Preferente': 2, 'VIP': 3 };
                const tipos = data.tipo_boleto
                  .map((t: TipoBoleto) => ({
                    id: t.id,
                    nombre: t.nombre,
                    precio: Number(t.precio),
                    stock_disponible: t.stock_disponible,
                    stock_total: t.stock_total,
                    max_por_compra: t.max_por_compra || 10,
                    descripcion: t.descripcion || '',
                    isFallback: false,
                  }))
                  .sort((a: any, b: any) => {
                    const pa = ORDEN_TIPOS[a.nombre] ?? 4;
                    const pb = ORDEN_TIPOS[b.nombre] ?? 4;
                    return pa - pb;
                  });
                setTicketTypes(tipos);
                setSelectedType(tipos[0]);
              } else {
                const fallback = getTicketTypesFallback(data.precio_base || 800, data.capacidad || 1000);
                setTicketTypes(fallback);
                setSelectedType(fallback[0]);
              }
          } else {
             router.push('/');
          }
      } catch (e) {
          router.push('/');
      } finally {
          setLoading(false);
      }
    };
    fetchEvent();
  }, [eventId, router]);

  // === FUNCIÓN ACTUALIZADA CON SEATS.IO ===
  const handleBuy = () => {
    if (!selectedType || selectedType.stock_disponible <= 0) return;

    const searchParams = new URLSearchParams({
      type: selectedType.nombre,
      price: selectedType.precio.toString(),
      qty: quantity.toString(),
      eventTitle: eventData?.titulo || '',
      tipoBoletoId: selectedType.isFallback === false ? selectedType.id : '',
    });
    if (eventData?.seats_evento_key) {
      searchParams.set('seatsEventKey', eventData.seats_evento_key);
    }

    router.push(`/checkout/${eventId}?${searchParams.toString()}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1625] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (!eventData) return null;

  const totalDisponible = ticketTypes.reduce((acc, t) => acc + (t.stock_disponible || 0), 0);
  const allSoldOut = totalDisponible <= 0;
  const selectedSoldOut = selectedType ? selectedType.stock_disponible <= 0 : true;

  return (
    <div className="min-h-screen bg-[#1a1625] text-white">
      <Navbar user={null} />

      {/* Hero Section */}
      <section className="relative h-[50vh] md:h-[60vh] flex items-end pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1625] via-black/50 to-transparent z-10" />
        
        <img
          src={eventData.imagen || `https://picsum.photos/seed/${eventId}/1200/600`}
          alt={eventData.titulo}
          className="absolute inset-0 w-full h-full object-cover"
        />

        <div className="relative z-20 px-6 max-w-7xl mx-auto w-full">
            <button 
                onClick={() => router.back()}
                className="mb-6 flex items-center gap-2 text-white/70 hover:text-white transition"
            >
                <ChevronLeft className="w-5 h-5"/> Volver
            </button>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span className="inline-block px-3 py-1 bg-pink-500/20 text-pink-400 border border-pink-500/50 rounded-full text-xs font-bold tracking-wider mb-4 uppercase">
                Conciertos
              </span>
              <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">
                {eventData.titulo}
              </h1>
              
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 text-white/80">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-pink-500" />
                  <span>
                    {new Date(eventData.fecha).toLocaleDateString('es-MX', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-pink-500" />
                  <span>{eventData.ubicacion}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-12">
          
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Info className="w-6 h-6 text-pink-500"/> Acerca del Evento
            </h2>
            <p className="text-gray-300 leading-relaxed text-lg">
              {eventData.descripcion}
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
             <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                 <Users className="w-5 h-5 text-pink-500"/> Disponibilidad por Zona
             </h3>
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
               {ticketTypes.map((type) => {
                 const porcentaje = type.stock_total 
                   ? Math.round(((type.stock_total - type.stock_disponible) / type.stock_total) * 100)
                   : 0;
                 const agotado = type.stock_disponible <= 0;
                 
                 return (
                   <div key={type.id} className={`bg-white/5 rounded-2xl p-4 border ${agotado ? 'border-red-500/30' : 'border-white/10'}`}>
                     <div className="flex justify-between items-center mb-2">
                       <span className="font-bold text-sm">{type.nombre}</span>
                       {agotado ? (
                         <span className="text-xs text-red-400 font-bold">AGOTADO</span>
                       ) : (
                         <span className="text-xs text-green-400 font-bold">{type.stock_disponible} disponibles</span>
                       )}
                     </div>
                     <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                       <div 
                         className={`h-full rounded-full transition-all ${
                           porcentaje >= 90 ? 'bg-red-500' : porcentaje >= 60 ? 'bg-yellow-500' : 'bg-green-500'
                         }`}
                         style={{ width: `${porcentaje}%` }}
                       />
                     </div>
                     <p className="text-xs text-gray-500 mt-1">{porcentaje}% vendido</p>
                   </div>
                 );
               })}
             </div>
          </div>

        </div>

        {/* Right Column - Tickets Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 sticky top-24">
            <h3 className="text-2xl font-bold mb-6">Selecciona tus boletos</h3>
            
            {/* Ticket Types */}
            <div className="space-y-4 mb-8">
              {ticketTypes.map((type) => {
                const agotado = type.stock_disponible <= 0;
                return (
                  <button
                    key={type.id}
                    onClick={() => {
                      if (!agotado) {
                        setSelectedType(type);
                        setQuantity(1);
                      }
                    }}
                    disabled={agotado}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      agotado 
                        ? 'border-white/5 bg-white/[0.02] opacity-50 cursor-not-allowed'
                        : selectedType?.id === type.id 
                          ? 'border-pink-500 bg-pink-500/10' 
                          : 'border-white/10 hover:border-white/30 bg-white/5'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{type.nombre}</span>
                        {agotado && (
                          <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">AGOTADO</span>
                        )}
                      </div>
                      <span className="font-bold text-pink-400">${Number(type.precio).toLocaleString()} MXN</span>
                    </div>
                    <p className="text-xs text-gray-400 leading-tight">{type.descripcion}</p>
                    {!agotado && (
                      <p className="text-xs text-gray-500 mt-1">
                        {type.stock_disponible} disponibles
                      </p>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quantity */}
            {selectedType && !selectedSoldOut && (
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-300 mb-2">Cantidad</label>
                <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-2 w-max">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 transition"
                    disabled={quantity <= 1}
                  >-</button>
                  <span className="w-8 text-center font-bold text-lg">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(Math.min(
                      Math.min(selectedType.max_por_compra, selectedType.stock_disponible), 
                      quantity + 1
                    ))}
                    className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 transition"
                    disabled={quantity >= Math.min(selectedType.max_por_compra, selectedType.stock_disponible)}
                  >+</button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Máximo {Math.min(selectedType.max_por_compra, selectedType.stock_disponible)} boletos por compra.
                </p>
              </div>
            )}

            {/* Total */}
            {selectedType && !selectedSoldOut && (
              <div className="border-t border-white/10 pt-6 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300">Subtotal</span>
                  <span className="text-xl font-bold">${(selectedType.precio * quantity).toLocaleString()} MXN</span>
                </div>
              </div>
            )}

            {/* Sold Out Banner */}
            {allSoldOut && (
              <div className="bg-red-500/10 border border-red-500/40 rounded-2xl p-4 mb-6 text-center">
                <p className="text-red-400 font-bold text-lg flex items-center justify-center gap-2">
                  <AlertTriangle className="w-5 h-5" /> Evento Agotado
                </p>
                <p className="text-red-400/70 text-sm mt-1">Todos los boletos han sido vendidos.</p>
              </div>
            )}

            {/* Low stock warning */}
            {selectedType && !selectedSoldOut && selectedType.stock_disponible <= 10 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-4 text-center">
                <p className="text-yellow-400 text-sm font-medium flex items-center justify-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Últimos {selectedType.stock_disponible} boletos de {selectedType.nombre}
                </p>
              </div>
            )}

            {/* CTA */}
            <button 
              onClick={handleBuy}
              disabled={allSoldOut || selectedSoldOut}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                allSoldOut || selectedSoldOut
                  ? 'bg-gray-600 cursor-not-allowed opacity-50' 
                  : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 shadow-[0_0_20px_rgba(219,39,119,0.4)]'
              }`}
            >
              {allSoldOut || selectedSoldOut ? 'Agotado' : 'Comprar Boletos'}
            </button>
          </div>
        </div>

      </section>
    </div>
  );
}