'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Timer } from '@/Components/checkout/Timer'; // Ajusta la ruta si tu Timer está en otro lugar
import { ChevronLeft, ChevronRight, ShieldCheck, TicketIcon, CreditCard, User, MapPin } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import Navbar from '@/Components/layout/Navbar';
import { createClient } from '@/lib/supabase/client';
// @ts-ignore
import { SeatsioSeatingChart } from '@seatsio/seatsio-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface SelectedSeat {
  id: string;
  label: string;
  category: string;
  price: number;
}

// Componente de selección de asientos
function SeatSelectionStep({
  eventData,
  seatsEventKey,
  onSeatsConfirmed,
}: {
  eventData: any;
  seatsEventKey: string;
  onSeatsConfirmed: (seats: SelectedSeat[], holdToken: string) => void;
}) {
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([]);
  const [isHolding, setIsHolding] = useState(false);
  const [error, setError] = useState('');
  const [chartLoaded, setChartLoaded] = useState(false);

  // Mapeo de categorías de seats.io a precios (ajústalo según tus categorías reales)
  const categoryPriceMap: Record<string, number> = {
    'General': eventData?.tipo_boleto?.find((t: any) => t.nombre === 'General')?.precio || 800,
    'Preferente': eventData?.tipo_boleto?.find((t: any) => t.nombre === 'Preferente')?.precio || 1200,
    'VIP': eventData?.tipo_boleto?.find((t: any) => t.nombre === 'VIP')?.precio || 2000,
  };

  const handleObjectSelected = (obj: any) => {
    const category = obj.category?.label || obj.section?.label || 'General';
    const price = categoryPriceMap[category] || eventData?.precio_base || 800;

    setSelectedSeats(prev => [...prev, {
      id: obj.id,
      label: obj.label || obj.id,
      category,
      price,
    }]);
  };

  const handleObjectDeselected = (obj: any) => {
    setSelectedSeats(prev => prev.filter(s => s.id !== obj.id));
  };

  const handleConfirmSeats = async () => {
    if (selectedSeats.length === 0) {
      setError('Selecciona al menos un asiento para continuar.');
      return;
    }

    setIsHolding(true);
    setError('');

    try {
      const res = await fetch('/api/seats/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventKey: seatsEventKey,
          seatIds: selectedSeats.map(s => s.id),
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error al reservar los asientos temporalmente.');

      onSeatsConfirmed(selectedSeats, data.holdToken);
    } catch (err: any) {
      setError(err.message || 'Error al reservar asientos. Intenta de nuevo.');
    } finally {
      setIsHolding(false);
    }
  };

  const totalPrice = selectedSeats.reduce((sum, s) => sum + s.price, 0);

  return (
    <div className="min-h-screen bg-[#1a1625] text-white">
      <Navbar user={null} />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Selecciona tus Asientos</h1>
        <p className="text-gray-400 mb-8">{eventData?.titulo}</p>

        {/* Mapa de asientos */}
        <div className="rounded-3xl overflow-hidden border border-white/10 mb-8" style={{ height: '620px' }}>
          <SeatsioSeatingChart
            workspaceKey={process.env.NEXT_PUBLIC_SEATS_IO_PUBLIC_KEY!}
            event={seatsEventKey}
            region="na"
            language="es"
            colorScheme="dark"
            onObjectSelected={handleObjectSelected}
            onObjectDeselected={handleObjectDeselected}
            onRenderStarted={() => setChartLoaded(true)}
            pricing={Object.entries(categoryPriceMap).map(([category, price]) => ({
              category,
              price,
            }))}
            showSectionContents="onlyAfterZoom"
            tooltipInfo={(obj: any) => `$${categoryPriceMap[obj.category?.label] || 0} MXN`}
          />
        </div>

        {/* Resumen de asientos seleccionados */}
        {selectedSeats.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
            <h3 className="font-bold mb-4 text-lg">Asientos seleccionados ({selectedSeats.length})</h3>
            <div className="space-y-3 mb-6">
              {selectedSeats.map((seat) => (
                <div key={seat.id} className="flex justify-between items-center text-sm border-b border-white/10 pb-3 last:border-0">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-pink-400" />
                    <div>
                      <span className="font-medium">{seat.label}</span>
                      <span className="ml-2 text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-gray-400">
                        {seat.category}
                      </span>
                    </div>
                  </div>
                  <span className="font-bold text-pink-400">${seat.price.toLocaleString()} MXN</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-white/10">
              <span className="text-lg font-medium">Total</span>
              <span className="text-2xl font-black text-pink-400">${totalPrice.toLocaleString()} MXN</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6">
            {error}
          </div>
        )}

        <button
          onClick={handleConfirmSeats}
          disabled={selectedSeats.length === 0 || isHolding}
          className="w-full py-4 rounded-2xl font-bold text-lg bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
        >
          {isHolding ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Reservando asientos...
            </>
          ) : (
            `Continuar con ${selectedSeats.length} asiento${selectedSeats.length > 1 ? 's' : ''} →`
          )}
        </button>
      </div>
    </div>
  );
}

// Componente principal del checkout
function CheckoutPageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = params.eventoId as string;

  const seatsEventKey = searchParams.get('seatsEventKey') || process.env.NEXT_PUBLIC_SEATS_IO_CHART_KEY || '';

  // Estados del flujo
  const [flowStep, setFlowStep] = useState<'seats' | 'checkout'>('seats');
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([]);
  const [holdToken, setHoldToken] = useState('');
  const [eventData, setEventData] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Estados del formulario de pago
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [errors, setErrors] = useState({ name: '', email: '', phone: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const stripe = useStripe();
  const elements = useElements();

  const subtotal = selectedSeats.reduce((sum, s) => sum + s.price, 0);
  const cargoServicio = subtotal * 0.10;
  const total = subtotal + cargoServicio;
  const qty = selectedSeats.length;

  // Cargar datos del usuario y evento
  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        const returnUrl = encodeURIComponent(`/checkout/${eventId}`);
        router.push(`/auth/login?returnUrl=${returnUrl}`);
        return;
      }

      // Cargar perfil del usuario
      const { data: profile } = await supabase
        .from('usuario')
        .select('nombre, email')
        .eq('id', user.id)
        .single();

      if (profile) {
        setFormData({ 
          name: profile.nombre || '', 
          email: profile.email || '', 
          phone: '' 
        });
      }

      // Cargar datos del evento
      const { data: evento } = await supabase
        .from('evento')
        .select('*, tipo_boleto(*)')
        .eq('id', eventId)
        .single();

      if (evento) setEventData(evento);

      setAuthChecked(true);
    }

    loadData();
  }, [eventId, router]);

  // Liberar asientos si el usuario cierra la página
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (holdToken && selectedSeats.length > 0 && seatsEventKey) {
        navigator.sendBeacon('/api/seats/hold', JSON.stringify({
          _method: 'DELETE',
          eventKey: seatsEventKey,
          seatIds: selectedSeats.map(s => s.id),
          holdToken,
        }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [holdToken, selectedSeats, seatsEventKey]);

  const handleSeatsConfirmed = (seats: SelectedSeat[], token: string) => {
    setSelectedSeats(seats);
    setHoldToken(token);
    setFlowStep('checkout');
  };

  const validateStep1 = () => {
    let valid = true;
    const newErrors = { name: '', email: '', phone: '' };

    if (!formData.name.trim()) { newErrors.name = 'El nombre es obligatorio'; valid = false; }
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) { 
      newErrors.email = 'Correo electrónico inválido'; valid = false; 
    }
    if (!formData.phone.trim() || formData.phone.length < 10) { 
      newErrors.phone = 'Teléfono de 10 dígitos requerido'; valid = false; 
    }

    setErrors(newErrors);
    if (valid) setStep(2);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !holdToken) return;

    setIsProcessing(true);
    setPaymentError('');

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          type: selectedSeats[0]?.category || 'General',
          qty,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          price: selectedSeats[0]?.price || 0,
          tipoBoletoId: searchParams.get('tipoBoletoId') || '',
          seatIds: selectedSeats.map(s => s.id),
          holdToken,
          seatsEventKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al procesar el pago');

      const { clientSecret, ordenId } = data;

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('No se encontró el elemento de tarjeta');

      const { error: stripeError } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: { name: formData.name, email: formData.email },
        },
      });

      if (stripeError) throw new Error(stripeError.message);

      // Éxito
      router.push(`/compra-exitosa/${ordenId}`);
    } catch (err: any) {
      setPaymentError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTimerExpire = async () => {
    if (holdToken && selectedSeats.length > 0 && seatsEventKey) {
      await fetch('/api/seats/hold', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventKey: seatsEventKey,
          seatIds: selectedSeats.map(s => s.id),
          holdToken,
        }),
      });
    }
    router.push('/');
  };

  if (!authChecked) {
    return <div className="min-h-screen bg-[#1a1625] flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full" /></div>;
  }

  // Paso 1: Selección de asientos
  if (flowStep === 'seats') {
    return (
      <SeatSelectionStep
        eventData={eventData}
        seatsEventKey={seatsEventKey}
        onSeatsConfirmed={handleSeatsConfirmed}
      />
    );
  }

  // Paso 2: Datos + Pago
  return (
    <div className="min-h-screen bg-[#1a1625] text-white">
      <Navbar user={null} />
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-10">
          <button 
            onClick={() => setFlowStep('seats')}
            className="p-3 rounded-full hover:bg-white/10 transition"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-3xl font-bold">Finalizar Compra</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Formulario */}
          <div className="lg:col-span-2 space-y-8">
            {/* Paso 1: Datos personales */}
            <div className={`bg-white/5 border ${step === 1 ? 'border-pink-500' : 'border-white/10'} rounded-3xl p-8`}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-pink-600 flex items-center justify-center font-bold">1</div>
                <h2 className="text-2xl font-bold">Datos de Contacto</h2>
              </div>

              {step === 1 ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Nombre completo</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 focus:border-pink-500 outline-none"
                      placeholder="Juan Pérez"
                    />
                    {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Correo electrónico</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 focus:border-pink-500 outline-none"
                        placeholder="tu@email.com"
                      />
                      {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Teléfono (10 dígitos)</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0,10) })}
                        className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 focus:border-pink-500 outline-none"
                        placeholder="5512345678"
                        maxLength={10}
                      />
                      {errors.phone && <p className="text-red-400 text-sm mt-1">{errors.phone}</p>}
                    </div>
                  </div>

                  <button
                    onClick={validateStep1}
                    className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 transition"
                  >
                    Continuar al pago
                  </button>
                </div>
              ) : (
                <div className="flex justify-between text-gray-300">
                  <div>{formData.name} • {formData.email}</div>
                  <button onClick={() => setStep(1)} className="text-pink-400 hover:underline">Editar</button>
                </div>
              )}
            </div>

            {/* Paso 2: Pago con tarjeta */}
            {step === 2 && (
              <div className="bg-white/5 border border-pink-500 rounded-3xl p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded-full bg-pink-600 flex items-center justify-center font-bold">2</div>
                  <h2 className="text-2xl font-bold">Método de Pago</h2>
                </div>

                <form onSubmit={handlePayment} className="space-y-8">
                  <div className="bg-black/40 border border-white/10 rounded-2xl p-6">
                    <CardElement 
                      options={{
                        style: {
                          base: { fontSize: '16px', color: '#fff', '::placeholder': { color: '#888' } }
                        }
                      }} 
                    />
                  </div>

                  {paymentError && (
                    <div className="bg-red-500/10 border border-red-500 text-red-400 p-4 rounded-2xl">
                      {paymentError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!stripe || isProcessing}
                    className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 font-bold text-lg rounded-2xl disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {isProcessing ? 'Procesando pago...' : `Pagar $${total.toLocaleString()} MXN`}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Resumen lateral */}
          <div className="lg:col-span-1">
            <div className="bg-[#1e1a2f] border border-white/10 rounded-3xl p-8 sticky top-8">
              <h3 className="font-bold text-xl mb-6">Resumen de tu compra</h3>
              
              <div className="space-y-4 text-sm">
                {selectedSeats.map(seat => (
                  <div key={seat.id} className="flex justify-between">
                    <span>{seat.label} <span className="text-gray-500">({seat.category})</span></span>
                    <span>${seat.price}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 mt-8 pt-6 space-y-3">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cargo por servicio (10%)</span>
                  <span>${cargoServicio.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-white/10 pt-4">
                  <span>Total</span>
                  <span className="text-pink-400">${total.toLocaleString()} MXN</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#1a1625] flex items-center justify-center text-white">Cargando checkout...</div>}>
      <Elements stripe={stripePromise}>
        <CheckoutPageContent />
      </Elements>
    </Suspense>
  );
}