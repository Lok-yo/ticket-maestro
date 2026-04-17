'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/Components/layout/Navbar';
import { Loader2, Music, MapPin, Calendar, Users, DollarSign, ArrowLeft, Image as ImageIcon, ChevronLeft, ChevronRight, Clock, Ticket } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { toast } from 'sonner';
import { VENUE_SEAT_STOCKS } from '@/lib/seatCategories';

const UBICACIONES = [
  { value: 'San Luis Potosi', label: 'San Luis Potosi' },
  { value: 'Ciudad de Mexico', label: 'Ciudad de Mexico' },
  { value: 'Guadalajara', label: 'Guadalajara' },
  { value: 'Monterrey', label: 'Monterrey' },
];

export default function NuevoEventoPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [categorias, setCategorias] = useState<{id: string, nombre: string}[]>([]);

  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    ubicacion: UBICACIONES[0].value,
    categoria_id: '',
    imagen: '',
  });

  const [tiposBoleto, setTiposBoleto] = useState([
    { nombre: 'General', precio: 800, stock_total: 200, descripcion: 'Acceso a zona general del evento.', max_por_compra: 10, enabled: true },
    { nombre: 'Preferente', precio: 1200, stock_total: 50, descripcion: 'Mejor vista y acceso preferencial.', max_por_compra: 5, enabled: true },
    { nombre: 'VIP', precio: 2000, stock_total: 10, descripcion: 'Acceso exclusivo y amenidades VIP.', max_por_compra: 2, enabled: true },
  ]);

  const [usarMapaSeats, setUsarMapaSeats] = useState(false);

  const capacidadTotal = tiposBoleto.filter(t => t.enabled).reduce((acc, t) => acc + t.stock_total, 0);

  const applyVenueStocksToState = () => {
    setTiposBoleto(prev =>
      prev.map(t => {
        const fixed = VENUE_SEAT_STOCKS[t.nombre];
        return fixed !== undefined ? { ...t, stock_total: fixed, enabled: true } : t;
      })
    );
  };

  const toggleMapaSeats = (checked: boolean) => {
    setUsarMapaSeats(checked);
    if (checked) applyVenueStocksToState();
  };

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [hora, setHora] = useState('08');
  const [minuto, setMinuto] = useState('00');
  const [amPm, setAmPm] = useState('PM');
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const timeRef = useRef<HTMLDivElement>(null);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const dateRef = useRef<HTMLDivElement>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchCats = async () => {
      const { data } = await supabase.from('categoria').select('*');
      if (data) {
        setCategorias(data);
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, categoria_id: data[0].id }));
        }
      }
    };
    fetchCats();

    function handleClickOutside(event: MouseEvent) {
      if (dateRef.current && !dateRef.current.contains(event.target as Node)) setIsDateOpen(false);
      if (timeRef.current && !timeRef.current.contains(event.target as Node)) setIsTimeOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [supabase]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) { 
      const msg = "Debes seleccionar una fecha en el calendario.";
      setErrorMsg(msg);
      toast.error(msg);
      return; 
    }

    if (formData.imagen && formData.imagen.startsWith('http')) {
       if (!/\.(jpeg|jpg|gif|png|webp|avif)$/i.test(formData.imagen) && !formData.imagen.includes('imgur') && !formData.imagen.includes('picsum')) {
           const msg = "La URL de la imagen debe provenir de imgur o terminar en una extension de imagen valida (.png, .jpg, etc).";
           setErrorMsg(msg); 
           toast.error(msg);
           return;
       }
    }
    
    setLoading(true);
    setErrorMsg('');

    try {
      let horasFinal = parseInt(hora);
      if (amPm === 'PM' && horasFinal !== 12) horasFinal += 12;
      if (amPm === 'AM' && horasFinal === 12) horasFinal = 0;
      const finalDateTime = new Date(selectedDate);
      finalDateTime.setHours(horasFinal, parseInt(minuto), 0, 0);

      const tiposActivos = tiposBoleto.filter(t => t.enabled);
      if (tiposActivos.length === 0) { 
        const msg = 'Debes habilitar al menos un tipo de boleto.';
        setErrorMsg(msg); 
        toast.error(msg);
        setLoading(false); 
        return; 
      }

      // Validaciones adicionales
      for (const t of tiposActivos) {
        if (t.precio < 50) {
          const msg = `El precio para "${t.nombre}" debe ser de al menos $50 MXN.`;
          setErrorMsg(msg);
          toast.error(msg);
          setLoading(false);
          return;
        }
        if (t.max_por_compra > t.stock_total) {
          const msg = `El límite máximo por compra (${t.max_por_compra}) para "${t.nombre}" no puede ser mayor que el stock total (${t.stock_total}).`;
          setErrorMsg(msg);
          toast.error(msg);
          setLoading(false);
          return;
        }
      }

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...formData,
            capacidad: capacidadTotal,
            precio_base: Math.min(...tiposActivos.map(t => t.precio)),
            fecha: finalDateTime.toISOString(),
            usar_mapa_seats: usarMapaSeats,
            tipos_boleto: tiposActivos.map(t => ({
              nombre: t.nombre, precio: t.precio, stock_total: t.stock_total,
              descripcion: t.descripcion, max_por_compra: t.max_por_compra,
            })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error desconocido al crear evento');
      toast.success('¡Evento publicado con éxito!');
      router.push('/organizador');
      router.refresh(); 
    } catch (err: any) { 
      setErrorMsg(err.message); 
      toast.error(err.message);
    } finally { setLoading(false); }
  };

  const advanceMonth = (offset: number) => {
      let newMonth = currentMonth + offset;
      let newYear = currentYear;
      if (newMonth < 0) { newMonth = 11; newYear--; }
      else if (newMonth > 11) { newMonth = 0; newYear++; }
      setCurrentMonth(newMonth);
      setCurrentYear(newYear);
  };

  const renderMonthGrid = () => {
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
      const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
      const grid: (number|null)[] = [];
      for (let i = 0; i < firstDayOfMonth; i++) grid.push(null);
      for (let i = 1; i <= daysInMonth; i++) grid.push(i);

      return (
         <div className="w-full">
            <div className="flex justify-between items-center mb-6">
               <button type="button" onClick={(e) => { e.stopPropagation(); advanceMonth(-1); }} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-300 transition"><ChevronLeft className="w-5 h-5"/></button>
               <span className="font-bold text-white capitalize text-lg">{monthNames[currentMonth]} {currentYear}</span>
               <button type="button" onClick={(e) => { e.stopPropagation(); advanceMonth(1); }} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-300 transition"><ChevronRight className="w-5 h-5"/></button>
            </div>
            <div className="grid grid-cols-7 gap-y-4 text-center text-sm font-bold text-gray-400 mb-2">
               {['Do','Lu','Ma','Mi','Ju','Vi','Sa'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
               {grid.map((day, ix) => {
                  if (!day) return <div key={`empty-${ix}`}></div>;
                  const dateInfo = new Date(currentYear, currentMonth, day); dateInfo.setHours(0,0,0,0);
                  const today = new Date(); today.setHours(0,0,0,0);
                  const isPast = dateInfo < today;
                  const isSelected = selectedDate && dateInfo.getTime() === selectedDate.getTime();
                  let btnStyle = isSelected ? 'bg-pink-500 text-white font-bold shadow-lg shadow-pink-500/40'
                    : isPast ? 'text-gray-600 opacity-50 cursor-not-allowed' : 'text-gray-200 hover:bg-white/10';
                  return (
                     <div key={`day-${day}`} className="w-full h-10 flex items-center justify-center">
                       <button type="button" disabled={isPast} onClick={(e) => { e.stopPropagation(); setSelectedDate(dateInfo); setIsDateOpen(false); }}
                         className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all focus:outline-none ${btnStyle}`}>{day}</button>
                     </div>
                  );
               })}
            </div>
         </div>
      );
  };

  return (
    <div className="min-h-screen bg-[#110e1b] text-white">
      <Navbar user={null} /> 
      <main className="max-w-4xl mx-auto px-6 py-12">
        <Link href="/organizador" className="inline-flex items-center text-pink-500 hover:text-pink-400 font-bold mb-8 transition-colors">
           <ArrowLeft className="w-5 h-5 mr-2"/> Volver al Panel
        </Link>

        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-pink-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <h1 className="text-3xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">Orquestar un Nuevo Evento</h1>
            <p className="text-gray-400 mb-10 w-3/4">Rellena los detalles de tu evento. Estos datos seran visibles para los usuarios.</p>

            {errorMsg && (<div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl mb-8 font-medium">{errorMsg}</div>)}

            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* TITULO */}
                   <div className="space-y-2 md:col-span-2">
                       <label className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2"><Music className="w-4 h-4 text-purple-400"/> Titulo del Evento</label>
                       <input type="text" name="titulo" required value={formData.titulo} onChange={handleChange} placeholder="Ej. The Eras Tour Latin America"
                         className="w-full bg-[#1a1625] border border-white/10 rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all font-medium text-lg placeholder-gray-600" />
                   </div>

                   {/* IMAGEN */}
                   <div className="space-y-2 md:col-span-2">
                       <label className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2"><ImageIcon className="w-4 h-4 text-purple-400"/> Imagen Promocional</label>
                       <div className="flex gap-4 items-center">
                           <div className="flex-1 flex flex-col sm:flex-row gap-3">
                               <input type="url" name="imagen" value={formData.imagen.startsWith('data:') ? '' : formData.imagen} onChange={handleChange} placeholder="Pegar URL web externa..."
                                 className="flex-1 bg-[#1a1625] border border-white/10 rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all font-medium text-blue-400 placeholder-gray-600" />
                               <div className="flex-shrink-0 flex items-center bg-[#1a1625] border border-white/10 rounded-xl px-4 py-3 hover:border-pink-500 transition cursor-pointer">
                                  <input type="file" accept="image/*" onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                          if (file.size > 2 * 1024 * 1024) { toast.error("La imagen debe ser menor a 2MB"); return; }
                                          setLoading(true);
                                          const fileExt = file.name.split('.').pop();
                                          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                                          const { error: uploadError } = await supabase.storage.from('eventos').upload(fileName, file);
                                          if (uploadError) { toast.error("Error al subir la imagen: " + uploadError.message); setLoading(false); return; }
                                          const { data } = supabase.storage.from('eventos').getPublicUrl(fileName);
                                          setFormData(prev => ({ ...prev, imagen: data.publicUrl }));
                                          setLoading(false);
                                      }
                                    }} className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-pink-500/10 file:text-pink-400 hover:file:bg-pink-500/20 transition cursor-pointer w-full" />
                               </div>
                           </div>
                           {formData.imagen && (
                               <div className="w-14 h-14 rounded-lg overflow-hidden border border-white/20 bg-black shrink-0 relative group">
                                   <button type="button" onClick={() => setFormData(prev => ({...prev, imagen: ''}))} className="absolute inset-0 bg-red-500/80 text-white font-bold opacity-0 group-hover:opacity-100 flex items-center justify-center transition">X</button>
                                   <img src={formData.imagen} alt="Preview" className="w-full h-full object-cover" />
                               </div>
                           )}
                       </div>
                       <p className="text-xs text-gray-400 mt-1">Puedes pegar un Link HD o cargar un archivo ligero directo de tu computadora.</p>
                   </div>

                   {/* FECHA */}
                   <div className="space-y-2">
                       <label className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2"><Calendar className="w-4 h-4 text-purple-400"/> Fecha de la Gira</label>
                       <div className="relative" ref={dateRef}>
                          <div onClick={() => setIsDateOpen(!isDateOpen)} className="w-full bg-[#1a1625] border border-white/10 rounded-xl px-5 py-4 cursor-pointer hover:border-pink-500 transition-all font-medium text-gray-300 flex items-center justify-between">
                             <span>{selectedDate ? selectedDate.toLocaleDateString('es-MX', { day:'numeric', month:'long', year:'numeric'}) : 'Selecciona un dia en el calendario'}</span>
                             <Calendar className={`w-5 h-5 ${selectedDate ? 'text-pink-500' : 'text-gray-500'}`}/>
                          </div>
                          {isDateOpen && (<div className="absolute top-[105%] left-0 w-[340px] bg-[#221e30] border border-white/20 rounded-2xl shadow-2xl p-5 z-50">{renderMonthGrid()}</div>)}
                       </div>
                   </div>

                   {/* HORA */}
                   <div className="space-y-2 relative" ref={timeRef}>
                       <label className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2"><Clock className="w-4 h-4 text-purple-400"/> Hora</label>
                       <div onClick={() => setIsTimeOpen(!isTimeOpen)} className="w-full bg-[#1a1625] border border-white/10 rounded-xl px-5 py-4 cursor-pointer hover:border-pink-500 transition-all font-medium text-gray-300 flex items-center justify-between">
                           <span>{hora}:{minuto} {amPm}</span>
                           <Clock className="w-5 h-5 text-gray-500"/>
                       </div>
                       {isTimeOpen && (
                           <div className="absolute top-[105%] left-0 bg-[#221e30] border border-white/20 rounded-2xl shadow-2xl p-5 z-50">
                               <div className="flex gap-6">
                                   <div>
                                       <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 text-center">Hora</p>
                                       <div className="grid grid-cols-3 gap-1.5">
                                           {Array.from({length: 12}).map((_, i) => {
                                              let h = (i + 1).toString().padStart(2, '0');
                                              return (<button key={h} type="button" onClick={(e) => { e.stopPropagation(); setHora(h); }}
                                                  className={`w-10 h-10 rounded-lg text-sm font-bold transition-all flex items-center justify-center ${hora === h ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}>{h}</button>)
                                           })}
                                       </div>
                                   </div>
                                   <div>
                                       <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 text-center">Min</p>
                                       <div className="grid grid-cols-2 gap-1.5">
                                           {['00', '15', '30', '45'].map((m) => (
                                               <button key={m} type="button" onClick={(e) => { e.stopPropagation(); setMinuto(m); }}
                                                  className={`w-10 h-10 rounded-lg text-sm font-bold transition-all flex items-center justify-center ${minuto === m ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}>{m}</button>
                                           ))}
                                       </div>
                                   </div>
                                   <div>
                                       <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 text-center">&nbsp;</p>
                                       <div className="flex flex-col gap-1.5">
                                           {['AM', 'PM'].map(a => (
                                               <button key={a} type="button" onClick={(e) => { e.stopPropagation(); setAmPm(a); setIsTimeOpen(false); }}
                                                  className={`px-4 h-[calc(50%-3px)] min-h-[44px] rounded-lg text-sm font-bold transition-all flex items-center justify-center ${amPm === a ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'bg-[#1a1625] text-gray-400 hover:bg-white/10 hover:text-white'}`}>{a}</button>
                                           ))}
                                       </div>
                                   </div>
                               </div>
                           </div>
                       )}
                   </div>

                   {/* UBICACION */}
                   <div className="space-y-2">
                       <label className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2"><MapPin className="w-4 h-4 text-purple-400"/> Ubicacion o Recinto</label>
                       <input type="text" name="ubicacion" required list="lista-ubicaciones" placeholder="Ej: Auditorio Nacional, CDMX" value={formData.ubicacion} onChange={handleChange}
                         className="w-full bg-[#1a1625] border border-white/10 rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all text-white font-medium" />
                       <datalist id="lista-ubicaciones">{UBICACIONES.map(loc => (<option key={loc.value} value={loc.value} />))}</datalist>
                   </div>

                   {/* CATEGORIA */}
                   <div className="space-y-2">
                       <label className="text-sm font-bold text-gray-300 uppercase tracking-widest">Categoria Musical</label>
                       <select name="categoria_id" required value={formData.categoria_id} onChange={handleChange}
                         className="w-full bg-[#1a1625] border border-white/10 rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all text-white appearance-none cursor-pointer">
                         {categorias.map(c => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
                       </select>
                   </div>

                   <div className="space-y-3 md:col-span-2 bg-[#1a1625] border border-white/10 rounded-2xl p-5">
                       <label className="flex items-start gap-3 cursor-pointer">
                         <input
                           type="checkbox"
                           checked={usarMapaSeats}
                           onChange={(e) => toggleMapaSeats(e.target.checked)}
                           className="mt-1 w-5 h-5 rounded border-white/20 text-pink-600 focus:ring-pink-500"
                         />
                         <span>
                           <span className="font-bold text-white block">Usar mapa de asientos (seats.io)</span>
                           <span className="text-xs text-gray-400">
                             Se crea un evento único en seats.io por este evento. Stocks fijos del recinto: General {VENUE_SEAT_STOCKS.General}, Preferente {VENUE_SEAT_STOCKS.Preferente}, VIP {VENUE_SEAT_STOCKS.VIP}. Solo ajusta precios; requiere variables de entorno en el servidor.
                           </span>
                         </span>
                       </label>
                   </div>

                   {/* CONFIGURACION DE TIPOS DE BOLETO */}
                   <div className="space-y-4 md:col-span-2">
                       <label className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                          <Ticket className="w-4 h-4 text-purple-400"/> Configuracion de Boletos
                       </label>
                       <p className="text-xs text-gray-500 -mt-2">
                         {usarMapaSeats
                           ? 'Con mapa activo, los stocks de General / Preferente / VIP coinciden con el chart del recinto (solo editas precios).'
                           : 'Define precio y stock para cada zona. Desactiva las que no necesites.'}
                       </p>
                       
                       <div className="space-y-3">
                         {tiposBoleto.map((tipo, index) => (
                           <div key={tipo.nombre} className={`bg-[#1a1625] border rounded-2xl p-5 transition-all ${tipo.enabled ? 'border-white/15' : 'border-white/5 opacity-50'}`}>
                             <div className="flex items-center justify-between mb-4">
                               <div className="flex items-center gap-3">
                                 <button type="button" onClick={() => { const u = [...tiposBoleto]; u[index].enabled = !u[index].enabled; setTiposBoleto(u); }}
                                   className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${tipo.enabled ? 'bg-pink-500 border-pink-500' : 'border-gray-600 bg-transparent'}`}>
                                   {tipo.enabled && <span className="text-white text-xs font-bold">&#10003;</span>}
                                 </button>
                                 <span className="font-bold text-lg">{tipo.nombre}</span>
                               </div>
                             </div>
                             {tipo.enabled && (
                               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                 <div>
                                   <label className="block text-xs text-gray-500 mb-1 font-medium">Precio (MXN)</label>
                                   <input type="number" min="0" step="0.01" value={tipo.precio} onChange={(e) => { const u = [...tiposBoleto]; u[index].precio = Number(e.target.value); setTiposBoleto(u); }}
                                     className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-500 text-pink-400 font-bold" />
                                 </div>
                                 <div>
                                   <label className="block text-xs text-gray-500 mb-1 font-medium">Stock (cantidad)</label>
                                   <input type="number" min="0" value={tipo.stock_total} disabled={usarMapaSeats && VENUE_SEAT_STOCKS[tipo.nombre] !== undefined}
                                     onChange={(e) => { const u = [...tiposBoleto]; u[index].stock_total = Number(e.target.value); setTiposBoleto(u); }}
                                     className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-500 font-medium disabled:opacity-60 disabled:cursor-not-allowed" />
                                 </div>
                                 <div>
                                   <label className="block text-xs text-gray-500 mb-1 font-medium">Max por compra</label>
                                   <input type="number" min="1" max="20" value={tipo.max_por_compra} onChange={(e) => { const u = [...tiposBoleto]; u[index].max_por_compra = Number(e.target.value); setTiposBoleto(u); }}
                                     className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-500 font-medium" />
                                 </div>
                               </div>
                             )}
                           </div>
                         ))}
                       </div>
                       <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 flex items-center justify-between">
                         <span className="text-sm text-gray-300 flex items-center gap-2"><Users className="w-4 h-4 text-purple-400" /> Capacidad total calculada</span>
                         <span className="font-black text-xl text-purple-400">{capacidadTotal.toLocaleString()}</span>
                       </div>
                   </div>

                   {/* DESCRIPCION */}
                   <div className="space-y-2 md:col-span-2">
                       <label className="text-sm font-bold text-gray-300 uppercase tracking-widest">Descripcion (Opcional pero recomendada)</label>
                       <textarea name="descripcion" maxLength={1000} value={formData.descripcion} onChange={handleChange} rows={4} placeholder="Escribe la sinopsis, reglas de edad, o informacion VIP..."
                         className="w-full bg-[#1a1625] border border-white/10 rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all resize-none placeholder-gray-600 text-white" />
                   </div>
               </div>

               <hr className="border-white/10 my-8"/>
               <button type="submit" disabled={loading}
                 className="w-full md:w-auto mt-4 px-10 py-5 rounded-full font-black text-lg text-white bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 shadow-[0_0_20px_rgba(219,39,119,0.3)] hover:shadow-[0_0_30px_rgba(219,39,119,0.5)] transform hover:-translate-y-1 transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                 {loading ? <><Loader2 className="w-6 h-6 animate-spin"/> Procesando Lanzamiento</> : 'Publicar Evento Live'}
               </button>
            </form>
        </div>
      </main>
    </div>
  );
}
