'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ShieldCheck, ShieldAlert, Ticket as TicketIcon, User, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import Navbar from '@/Components/layout/Navbar';

export default function VerifyTicketPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [ticketData, setTicketData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [burning, setBurning] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const eventIdParam = searchParams.get('event');
        const url = `/api/verify/${ticketId}${eventIdParam ? `?event=${eventIdParam}` : ''}`;
        
        const res = await fetch(url);
        const data = await res.json();
        
        if (!res.ok) {
           setErrorMsg(data.error || 'Error al validar boleto');
        } else {
           setTicketData(data.data);
        }
      } catch (err) {
        setErrorMsg('Falla de red contactando al servidor de escaneo.');
      } finally {
        setLoading(false);
      }
    };
    fetchTicket();
  }, [ticketId]);

  const burnTicket = async () => {
      setBurning(true);
      setErrorMsg('');
      setSuccessMsg('');
      
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const eventIdParam = searchParams.get('event');
        const url = `/api/verify/${ticketId}${eventIdParam ? `?event=${eventIdParam}` : ''}`;

        const res = await fetch(url, { method: 'PUT' });
        const data = await res.json();
        
        if (!res.ok) {
           setErrorMsg(data.error || 'Error al quemar boleto');
        } else {
           setSuccessMsg('¡Boleto Marcado como Usado Exitosamente!');
           setTicketData((prev: any) => ({ ...prev, estado: 'usado' }));
        }
      } catch (err) {
        setErrorMsg('Error de red al intentar quemar el boleto.');
      } finally {
        setBurning(false);
      }
  };

  return (
    <div className="min-h-screen bg-[#0e0a17] text-white flex flex-col">
      <Navbar user={null} />

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
            
            <div className="text-center mb-8">
               <h1 className="text-3xl font-black mb-2 tracking-tight">Escáner de Acceso</h1>
               <p className="text-gray-400">Verificador Terminal</p>
            </div>

            {loading ? (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-12 flex flex-col items-center justify-center shadow-2xl backdrop-blur-md">
                    <div className="w-20 h-20 rounded-full border-4 border-pink-500/30 border-t-pink-500 animate-spin mb-6"></div>
                    <p className="text-lg font-bold text-gray-300 animate-pulse">Analizando criptografía...</p>
                </div>
            ) : errorMsg && !ticketData ? (
                <div className="bg-red-500/10 border border-red-500/50 rounded-3xl p-12 text-center shadow-2xl backdrop-blur-md">
                    <ShieldAlert className="w-24 h-24 text-red-500 mx-auto mb-6"/>
                    <h2 className="text-2xl font-black text-red-400 mb-2">Acceso Denegado</h2>
                    <p className="text-gray-300 font-medium">{errorMsg}</p>
                    <button 
                      onClick={() => {
                        const searchParams = new URLSearchParams(window.location.search);
                        const eventId = searchParams.get('event');
                        if (eventId) {
                          router.push(`/organizador/evento/${eventId}/acceso`);
                        } else {
                          router.push('/organizador');
                        }
                      }} 
                      className="mt-8 px-6 py-2 bg-red-500/20 text-red-400 rounded-full font-bold hover:bg-red-500/30 transition"
                    >
                      Volver
                    </button>
                </div>
            ) : ticketData ? (
                <div className="relative">
                    {/* Alertas sobre la tarjeta */}
                    {ticketData.estado === 'usado' && !successMsg && (
                       <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-600 text-white font-black px-6 py-2 rounded-full uppercase tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.6)] z-20 whitespace-nowrap border-2 border-red-400 animate-bounce">
                           ⚠️ BOLETO YA FUE USADO ⚠️
                       </div>
                    )}

                    {successMsg && (
                       <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-[90%] sm:w-auto text-center bg-green-500 text-white font-black px-4 sm:px-6 py-2 rounded-full uppercase tracking-wider text-xs sm:text-sm shadow-[0_0_20px_rgba(34,197,94,0.6)] z-20 border-2 border-green-300">
                           {successMsg}
                       </div>
                    )}

                    <div className={`bg-gradient-to-b from-[#1a1625] to-[#110e1b] border-2 rounded-3xl overflow-hidden shadow-2xl transition-colors duration-500 ${
                        ticketData.estado === 'usado' ? 'border-red-500/50 grayscale' : 'border-pink-500/50'
                    }`}>
                        
                        <div className="p-8 text-center border-b border-white/5">
                            {ticketData.estado !== 'usado' ? (
                                <ShieldCheck className="w-16 h-16 text-green-400 mx-auto mb-4"/>
                            ) : (
                                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4"/>
                            )}
                            <h2 className="text-2xl font-black mb-1">{ticketData.evento?.titulo}</h2>
                            <p className="text-pink-400 font-bold tracking-widest uppercase text-sm">Validación Oficial</p>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="bg-black/40 rounded-xl p-4 flex items-center gap-4">
                                <TicketIcon className="w-8 h-8 text-gray-500"/>
                                <div>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Tipo de Pase</p>
                                    <p className="text-xl font-bold">{ticketData.tipo}</p>
                                </div>
                            </div>

                            <div className="bg-black/40 rounded-xl p-4 flex items-center gap-4">
                                <User className="w-8 h-8 text-gray-500"/>
                                <div>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Titular Comprador</p>
                                    <p className="font-bold">{ticketData.orden?.usuario?.nombre || 'Anónimo'}</p>
                                    <p className="text-xs text-gray-500">{ticketData.orden?.usuario?.email}</p>
                                </div>
                            </div>

                            <div className="bg-black/40 rounded-xl p-4 flex items-center gap-4">
                                <Calendar className="w-8 h-8 text-gray-500"/>
                                <div>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Fecha Autorizada</p>
                                    <p className="font-bold">{new Date(ticketData.evento?.fecha).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-black/50 border-t border-white/5 space-y-4">
                            {ticketData.estado !== 'usado' && !successMsg ? (
                                <button 
                                    onClick={burnTicket}
                                    disabled={burning}
                                    className="w-full py-4 rounded-xl font-black text-lg bg-green-500 text-white hover:bg-green-400 transition-colors shadow-[0_0_20px_rgba(34,197,94,0.3)] disabled:opacity-50 disabled:animate-pulse flex items-center justify-center gap-2"
                                >
                                    {burning ? 'Procesando...' : <><CheckCircle2 className="w-6 h-6"/> QUEMAR BOLETO (DAR ACCESO)</>}
                                </button>
                            ) : successMsg ? (
                                <div className="w-full py-4 rounded-xl font-black text-lg bg-green-900/50 text-green-400 border border-green-500/50 text-center uppercase tracking-widest">
                                    ¡Acceso Permitido!
                                </div>
                            ) : (
                                <div className="w-full py-4 rounded-xl font-black text-lg bg-red-950/50 text-red-500 border border-red-900/50 text-center uppercase tracking-widest cursor-not-allowed">
                                    Pase No Válido
                                </div>
                            )}

                            <button 
                                onClick={() => {
                                    if (ticketData?.evento_id) {
                                        router.push(`/organizador/evento/${ticketData.evento_id}/acceso`);
                                    } else {
                                        router.push('/organizador');
                                    }
                                }}
                                className="w-full py-4 rounded-xl font-bold text-lg bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                            >
                                Escanear Siguiente
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

        </div>
      </main>
    </div>
  );
}
