'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Calendar, MapPin, Users, Info, ChevronLeft } from 'lucide-react';
import Navbar from '@/Components/layout/Navbar';

// Tipos de boletos simulados (Precios MXN)
const TICKET_TYPES = [
  { id: 'general', name: 'General', price: 800, maxQty: 10, description: 'Acceso a zona general de pie.' },
  { id: 'preferente', name: 'Preferente', price: 1500, maxQty: 5, description: 'Asientos no numerados cerca del escenario.' },
  { id: 'vip', name: 'VIP', price: 2500, maxQty: 2, description: 'Acceso exclusivo, bebidas de cortesía y asientos VIP.' },
];

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  
  // Variables simuladas (en producción esto vendría de Supabase usando el eventId)
  const [eventData, setEventData] = useState<any>(null);
  
  const [selectedType, setSelectedType] = useState(TICKET_TYPES[0]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulamos carga
    setTimeout(() => {
      setEventData({
        id: eventId,
        titulo: 'Festival Gira 2026',
        fecha: '2026-10-15',
        ubicacion: 'CDMX - Estadio Nacional',
        capacidad: 50000,
        descripcion: 'El evento musical del año. Vive la experiencia definitiva con los mejores artistas internacionales en el Estadio Nacional. Un espectáculo audiovisual que no querrás perderte.',
        imageUrl: `https://picsum.photos/seed/${eventId}/1200/600`
      });
      setLoading(false);
    }, 800);
  }, [eventId]);

  const handleBuy = () => {
    const searchParams = new URLSearchParams({
      type: selectedType.name,
      price: selectedType.price.toString(),
      qty: quantity.toString(),
      eventTitle: eventData?.titulo
    });
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

  return (
    <div className="min-h-screen bg-[#1a1625] text-white">
      <Navbar user={null} />

      {/* Hero Section */}
      <section className="relative h-[50vh] md:h-[60vh] flex items-end pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1625] via-black/50 to-transparent z-10" />
        
        <Image
          src={eventData.imageUrl}
          alt={eventData.titulo}
          fill
          className="object-cover"
          priority
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
                 <Users className="w-5 h-5 text-pink-500"/> Capacidad Recinto
             </h3>
             <p className="text-gray-400">Cupo total estimado: {eventData.capacidad.toLocaleString()} personas.</p>
          </div>

        </div>

        {/* Right Column - Tickets Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 sticky top-24">
            <h3 className="text-2xl font-bold mb-6">Selecciona tus boletos</h3>
            
            {/* Ticket Types */}
            <div className="space-y-4 mb-8">
              {TICKET_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setSelectedType(type);
                    setQuantity(1); // Reset qty when changing type
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedType.id === type.id 
                      ? 'border-pink-500 bg-pink-500/10' 
                      : 'border-white/10 hover:border-white/30 bg-white/5'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-lg">{type.name}</span>
                    <span className="font-bold text-pink-400">${type.price} MXN</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-tight">{type.description}</p>
                </button>
              ))}
            </div>

            {/* Quantity */}
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
                  onClick={() => setQuantity(Math.min(selectedType.maxQty, quantity + 1))}
                  className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 transition"
                  disabled={quantity >= selectedType.maxQty}
                >+</button>
              </div>
              <p className="text-xs text-gray-400 mt-2">Máximo {selectedType.maxQty} boletos por compra.</p>
            </div>

            {/* Total */}
            <div className="border-t border-white/10 pt-6 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300">Subtotal</span>
                <span className="text-xl font-bold">${(selectedType.price * quantity).toLocaleString()} MXN</span>
              </div>
            </div>

            {/* CTA */}
            <button 
              onClick={handleBuy}
              className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 transition-all shadow-[0_0_20px_rgba(219,39,119,0.4)]"
            >
              Comprar Boletos
            </button>
          </div>
        </div>

      </section>
    </div>
  );
}
