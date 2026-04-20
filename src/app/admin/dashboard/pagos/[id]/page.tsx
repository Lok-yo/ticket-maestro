'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/Components/layout/Navbar';
import { 
  Loader2, Receipt, Users, Clock, 
  DollarSign, ShieldCheck, CreditCard
} from 'lucide-react';

type EventoPagoRow = {
  id: string;
  titulo: string;
  estado: string;
  fecha: string;
  ventaReal: number;
  netoPendiente: number;
  retenidoPendiente: number;
  yaLiquidado: boolean;
  retenidoLiberado: boolean;
};

export default function AdminPagosOrganizadorPage() {
  const { id } = useParams(); 
  const [eventos, setEventos] = useState<EventoPagoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [actionByEvent, setActionByEvent] = useState<Record<string, 'liquidar' | 'liberar' | null>>({});

  const [stats, setStats] = useState({
    totalVentas: 0,
    totalRetenidoPendiente: 0,
    totalNetoPendiente: 0,
    clabe: ''
  });

  const fetchPagosPorOrganizador = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch(`/api/admin/pagos/organizador/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudieron cargar los pagos');

      const data = json.data;
      if (data) {
        setEventos(data.eventos || []);
        setStats({
          totalVentas: Number(data.stats?.totalVentas || 0),
          totalRetenidoPendiente: Number(data.stats?.totalRetenidoPendiente || 0),
          totalNetoPendiente: Number(data.stats?.totalNetoPendiente || 0),
          clabe: data.stats?.clabe || ''
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al obtener datos');
      console.error("Error al obtener datos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchPagosPorOrganizador();
  }, [id]);

  const handleLiquidarEvento = async (eventoId: string) => {
    const ok = window.confirm('¿Confirmas liquidar el MONTO NETO pendiente de este evento?');
    if (!ok) return;
    try {
      setOkMsg('');
      setErrorMsg('');
      setActionByEvent((prev) => ({ ...prev, [eventoId]: 'liquidar' }));
      const res = await fetch(`/api/admin/pagos/${eventoId}/liquidar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizadorId: id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al liquidar venta');
      setOkMsg(json.message || 'Liquidación aplicada');
      await fetchPagosPorOrganizador();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al liquidar venta');
      console.error('Error crítico:', err);
    } finally {
      setActionByEvent((prev) => ({ ...prev, [eventoId]: null }));
    }
  };

  const handleLiberarRetenido = async (eventoId: string) => {
    const ok = window.confirm('¿Confirmas liberar la RETENCIÓN de este evento? Esta acción requiere evento finalizado.');
    if (!ok) return;
    try {
      setOkMsg('');
      setErrorMsg('');
      setActionByEvent((prev) => ({ ...prev, [eventoId]: 'liberar' }));
      const res = await fetch(`/api/admin/pagos/${eventoId}/liberar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizadorId: id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al liberar retención');
      setOkMsg(json.message || 'Retención liberada');
      await fetchPagosPorOrganizador();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al liberar retención');
      console.error('Error crítico:', err);
    } finally {
      setActionByEvent((prev) => ({ ...prev, [eventoId]: null }));
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0e0a17] flex items-center justify-center">
      <Loader2 className="w-12 h-12 text-pink-500 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0e0a17] text-white">
      <Navbar user={null} />

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-black mb-2 flex items-center gap-3 italic uppercase text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-red-500">
            <Receipt className="text-pink-500 w-10 h-10" /> Estado de Cuenta
          </h1>
          <p className="text-gray-400">Balance financiero del productor seleccionado.</p>
          
          <p className="text-emerald-500 font-mono text-sm mt-2 font-bold uppercase flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Clave Interbancaria: {stats.clabe || 'No registrada'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
            {errorMsg}
          </div>
        )}

        {okMsg && (
          <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-300">
            {okMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl">
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2">Venta Real</p>
            <h2 className="text-4xl font-black text-white">${stats.totalVentas.toLocaleString()}</h2>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 p-8 rounded-3xl">
            <p className="text-yellow-500 text-[10px] font-black uppercase tracking-widest mb-2">Retención Pendiente</p>
            <h2 className="text-4xl font-black text-yellow-500">${stats.totalRetenidoPendiente.toLocaleString()}</h2>
            <p className="text-[9px] text-yellow-500/60 mt-3 italic font-medium">
              * El monto retenido solo se puede liberar una vez que el evento haya finalizado.
            </p>
          </div>

          <div className="bg-pink-600 p-8 rounded-3xl shadow-lg shadow-pink-500/20 border border-pink-400">
            <p className="text-pink-100 text-[10px] font-black uppercase tracking-widest mb-2">Neto por Liquidar</p>
            <h2 className="text-4xl font-black text-white">${stats.totalNetoPendiente.toLocaleString()}</h2>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-white/10 bg-black/20 flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2"><Clock className="w-4 h-4 text-pink-500"/> Historial de Giras</h3>
            <span className="text-[10px] bg-white/10 px-2 py-1 rounded text-gray-400 uppercase font-black">Org ID: {id?.toString().slice(0,8)}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-8 py-4">Evento</th>
                  <th className="px-8 py-4">Venta Real</th>
                  <th className="px-8 py-4">Retención Pend.</th>
                  <th className="px-8 py-4">Estado</th>
                  <th className="px-8 py-4 text-right">Acciones de Pago</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {eventos.map((evt) => (
                  <tr key={evt.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-8 py-6">
                       <p className="font-bold text-white">{evt.titulo}</p>
                       <p className="text-[10px] text-gray-600 font-mono">{evt.id}</p>
                    </td>
                    <td className="px-8 py-6 font-mono font-bold text-white">${evt.ventaReal.toLocaleString()}</td>
                    <td className="px-8 py-6 text-yellow-500/80 font-bold">${evt.retenidoPendiente.toLocaleString()}</td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
                        evt.estado === 'finalizado'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-pink-500/10 text-pink-500 border-pink-500/20'
                      }`}>
                        {evt.estado === 'finalizado' ? 'finalizado' : evt.estado}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex flex-col sm:flex-row justify-end gap-2">
                        <button 
                          onClick={() => handleLiquidarEvento(evt.id)}
                          disabled={!!actionByEvent[evt.id] || evt.yaLiquidado}
                          className="flex items-center justify-center gap-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white px-3 py-2 rounded-xl transition-all font-bold text-[9px] uppercase border border-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {actionByEvent[evt.id] === 'liquidar' ? <Loader2 className="w-3 h-3 animate-spin" /> : <DollarSign className="w-3 h-3" />}
                          {evt.yaLiquidado ? 'Liquidado' : `Liquidar Neto $${evt.netoPendiente.toLocaleString()}`}
                        </button>
                        
                        <button 
                          onClick={() => handleLiberarRetenido(evt.id)}
                          disabled={!!actionByEvent[evt.id] || evt.estado !== 'finalizado' || evt.retenidoPendiente <= 0}
                          className="flex items-center justify-center gap-1 bg-orange-500/10 hover:bg-orange-500 text-orange-500 hover:text-white px-3 py-2 rounded-xl transition-all font-bold text-[9px] uppercase border border-orange-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {actionByEvent[evt.id] === 'liberar' ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                          Liberar Ret. ${evt.retenidoPendiente.toLocaleString()}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {eventos.length === 0 && (
              <div className="p-20 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-700" />
                <p className="text-gray-500 font-bold">No se encontraron eventos creados por este usuario.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}