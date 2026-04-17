'use client';

import { useState, Suspense, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Timer } from '@/Components/checkout/Timer';
import { ChevronRight, ShieldCheck, TicketIcon, CreditCard, User } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import Navbar from '@/Components/layout/Navbar';
import { createClient } from '@/lib/supabase/client';

// Clave pública de tu cuenta de Stripe (Debe coincidir con el Secret Key del backend)
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_TYooMQauvdEDq54NiTphI7jx');

function CheckoutFormContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = params.eventoId as string;
  
  const type = searchParams.get('type') || 'General';
  const price = parseFloat(searchParams.get('price') || '800');
  const qty = parseInt(searchParams.get('qty') || '1', 10);
  const eventTitle = searchParams.get('eventTitle') || 'Festival Gira 2026';
  const tipoBoletoId = searchParams.get('tipoBoletoId') || '';
  
  const subtotal = price * qty;
  const cargoServicio = subtotal * 0.10; // 10% de simulacion de cargo
  const total = subtotal + cargoServicio;

  const [step, setStep] = useState(1); // 1: Datos Contacto, 2: Pago
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [errors, setErrors] = useState({ name: '', email: '', phone: '' });
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    async function checkAuthAndLoadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // No está logueado → redirigir al login con URL de retorno
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        router.push(`/auth/login?returnUrl=${returnUrl}`);
        return;
      }
      
      const { data: profile } = await supabase.from('usuario').select('*').eq('id', user.id).single();
      if (profile) {
        setFormData(prev => ({
          ...prev,
          name: profile.nombre || '',
          email: profile.email || ''
        }));
      }
      setAuthChecked(true);
    }
    checkAuthAndLoadUser();
  }, [router]);

  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const handleValidation = () => {
    let valid = true;
    let newErrors = { name: '', email: '', phone: '' };

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es obligatorio.';
      valid = false;
    }
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Ingresa un correo electrónico válido.';
      valid = false;
    }
    if (!formData.phone.trim() || formData.phone.length < 10) {
      newErrors.phone = 'Ingresa un teléfono válido de al menos 10 dígitos.';
      valid = false;
    }

    setErrors(newErrors);
    if (valid) setStep(2);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setPaymentError('');

    try {
        // 1. Llamada a backend para registrar Orden y generar PaymentIntent
        const checkRes = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                eventId,
                type,
                qty,
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                price, // <- Añadido
                tipoBoletoId, // <- ID del tipo de boleto para validar stock
            })
        });

        const checkData = await checkRes.json();

        if (!checkRes.ok) {
            throw new Error(checkData.error || 'Error al iniciar la transacción.');
        }

        const { clientSecret, ordenId } = checkData;

        const cardElement = elements.getElement(CardElement);
        if (!cardElement) throw new Error("Elemento de tarjeta no encontrado.");
        
        // 2. Autorizar pago directo con Stripe securely
        const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: cardElement,
                billing_details: {
                    name: formData.name,
                    email: formData.email,
                },
            }
        });

        if (stripeError) {
            throw new Error(stripeError.message || 'Su tarjeta fue rechazada.');
        }

        // Si el pago es exitoso, el Webhook en /api/webhooks/stripe es el que confirmará
        // la entrada en BD. Nosotros navegamos confiando en el intent successful.
        setIsProcessing(false);
        
        // Limpiar el timer de la sesión para que el usuario pueda volver a comprar
        sessionStorage.removeItem(`ticket-timer-${eventId}`);
        
        const successUrl = new URLSearchParams({
            title: eventTitle,
            type,
            qty: qty.toString(),
            total: total.toString(),
            name: formData.name
        });
        router.push(`/compra-exitosa/${ordenId}?${successUrl.toString()}`);
    } catch (error: any) {
        setPaymentError(error.message);
        setIsProcessing(false);
    }
  };

  const handleExpire = () => {
    alert("¡Se acabó el tiempo de reserva! Serás redirigido al inicio.");
    router.push('/');
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#1a1625] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1625] text-white">
      <Navbar user={null} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.back()} 
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <h1 className="text-2xl sm:text-3xl font-bold">Checkout</h1>
            </div>
            <Timer initialMinutes={10} onExpire={handleExpire} eventKey={eventId} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Left Column - Forms */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Step 1: Datos de Contacto */}
            <div className={`bg-white/5 border ${step === 1 ? 'border-pink-500 shadow-[0_0_15px_rgba(219,39,119,0.3)]' : 'border-white/10 opacity-70'} rounded-3xl p-6 md:p-8 transition-all`}>
              <div className="flex items-center gap-4 mb-6">
                 <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center font-bold">1</div>
                 <h2 className="text-2xl font-bold">Datos de Contacto</h2>
              </div>
              
              {step === 1 ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Nombre Completo</label>
                    <input 
                      type="text" 
                      className={`w-full bg-black/30 border ${errors.name ? 'border-red-500' : 'border-white/10'} rounded-xl p-3 outline-none focus:border-pink-500`}
                      placeholder="Ej. Juan Pérez"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                    {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Correo Electrónico</label>
                      <input 
                        type="email" 
                        className={`w-full bg-black/30 border ${errors.email ? 'border-red-500' : 'border-white/10'} rounded-xl p-3 outline-none focus:border-pink-500`}
                        placeholder="tu@email.com"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                      {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Teléfono</label>
                      <input 
                        type="tel" 
                        className={`w-full bg-black/30 border ${errors.phone ? 'border-red-500' : 'border-white/10'} rounded-xl p-3 outline-none focus:border-pink-500`}
                        placeholder="10 dígitos"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g,'')})}
                        maxLength={10}
                      />
                      {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
                    </div>
                  </div>
                  <button 
                    onClick={handleValidation}
                    className="mt-6 w-full py-4 rounded-xl font-bold bg-white text-black hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                  >
                    Continuar al Pago <ChevronRight className="w-5 h-5"/>
                  </button>
                </div>
              ) : (
                <div className="flex justify-between items-center text-gray-300">
                    <div className="flex items-center gap-3">
                       <User className="w-5 h-5 text-gray-500"/>
                       <span>{formData.name} ({formData.email})</span>
                    </div>
                    <button onClick={() => setStep(1)} className="text-pink-400 text-sm hover:underline">Editar</button>
                </div>
              )}
            </div>

            {/* Step 2: Pago */}
            <div className={`bg-white/5 border ${step === 2 ? 'border-pink-500 shadow-[0_0_15px_rgba(219,39,119,0.3)]' : 'border-white/10 opacity-50 pointer-events-none'} rounded-3xl p-6 md:p-8 transition-all`}>
              <div className="flex items-center gap-4 mb-6">
                 <div className={`w-10 h-10 rounded-full ${step === 2 ? 'bg-pink-500' : 'bg-gray-700'} flex items-center justify-center font-bold`}>2</div>
                 <h2 className="text-2xl font-bold">Método de Pago</h2>
              </div>
              
              {step === 2 && (
                <form onSubmit={handlePayment} className="space-y-6">
                  <div className="bg-black/30 border border-white/10 rounded-xl p-4">
                     <div className="flex items-center gap-3 mb-4">
                         <CreditCard className="w-5 h-5 text-gray-400"/>
                         <span className="font-medium text-gray-200">Tarjeta de Crédito / Débito</span>
                     </div>
                     <div className="p-3 bg-white text-black rounded-lg">
                         <CardElement 
                            options={{
                                style: {
                                    base: {
                                        fontSize: '16px',
                                        color: '#32325d',
                                        '::placeholder': {
                                            color: '#aab7c4',
                                        },
                                    },
                                    invalid: {
                                        color: '#fa755a',
                                    },
                                },
                            }}
                         />
                     </div>
                  </div>

                  {paymentError && (
                      <p className="text-red-400 bg-red-500/10 p-3 rounded-lg text-sm border border-red-500/50">
                          {paymentError}
                      </p>
                  )}

                  <div className="flex items-start gap-3 text-xs text-gray-400 mt-4">
                      <ShieldCheck className="w-6 h-6 text-green-500 shrink-0"/>
                      <p>Sus datos están protegidos. El pago es procesado de forma segura a través de Stripe usando encriptación AES-256 de extremo a extremo.</p>
                  </div>

                  <button 
                    type="submit"
                    disabled={!stripe || isProcessing}
                    className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 transition-all shadow-[0_0_20px_rgba(219,39,119,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                        <>
                           <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                           Procesando...
                        </>
                    ) : (
                        `Pagar $${total.toLocaleString()} MXN`
                    )}
                  </button>
                </form>
              )}
            </div>

          </div>

          {/* Right Column - Summary */}
          <div className="lg:col-span-1">
             <div className="bg-[#1e1a2f] border border-white/10 rounded-3xl p-6 sticky top-24">
                <h3 className="text-xl font-bold mb-6 border-b border-white/10 pb-4">Resumen de Compra</h3>
                
                <div className="flex gap-4 mb-6">
                    <div className="w-16 h-16 bg-pink-500/20 rounded-xl flex items-center justify-center text-pink-500 shrink-0">
                        <TicketIcon className="w-8 h-8"/>
                    </div>
                    <div>
                        <h4 className="font-bold leading-tight line-clamp-2">{eventTitle}</h4>
                        <p className="text-gray-400 text-sm mt-1">{type} x {qty}</p>
                    </div>
                </div>

                <div className="space-y-3 text-sm text-gray-300">
                    <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>${subtotal.toLocaleString()} MXN</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Cargo por servicio</span>
                        <span>${cargoServicio.toLocaleString()} MXN</span>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-4 mt-6">
                   <div className="flex justify-between items-end">
                       <span className="text-lg font-medium text-gray-200">Total a pagar</span>
                       <span className="text-2xl font-black text-pink-500">${total.toLocaleString()} MXN</span>
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
    <Suspense fallback={<div className="min-h-screen bg-[#1a1625] flex items-center justify-center text-white">Cargando...</div>}>
      <Elements stripe={stripePromise}>
        <CheckoutFormContent />
      </Elements>
    </Suspense>
  );
}
