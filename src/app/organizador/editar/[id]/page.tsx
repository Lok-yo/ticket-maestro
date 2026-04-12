'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/Components/layout/Navbar';
import { Loader2, Music, MapPin, Calendar, Users, DollarSign, ArrowLeft, Image as ImageIcon, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

const UBICACIONES = [
  { value: 'San Luis Potosí', label: 'San Luis Potosí' },
  { value: 'Ciudad de México', label: 'Ciudad de México' },
  { value: 'Guadalajara', label: 'Guadalajara' },
  { value: 'Monterrey', label: 'Monterrey' },
];

export default function EditarEventoPage() {
  const router = useRouter();
  const { id } = useParams(); // ID del evento en la URL
  const supabase = createClient();
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [categorias, setCategorias] = useState<{id: string, nombre: string}[]>([]);

  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    ubicacion: UBICACIONES[0].value,
    capacidad: 1000,
    precio_base: 800,
    categoria_id: '',
    imagen: '',
  });

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [timeStr, setTimeStr] = useState('20:00');
  
  const [isDateOpen, setIsDateOpen] = useState(false);
  const dateRef = useRef<HTMLDivElement>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    // Manejar clics fuera del pop de calendario
    function handleClickOutside(event: MouseEvent) {
      if (dateRef.current && !dateRef.current.contains(event.target as Node)) {
         setIsDateOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // 1. Cargar Metadatos y el Evento Original
    const fetchData = async () => {
      try {
          const { data: cats } = await supabase.from('categoria').select('*');
          if (cats) {
             setCategorias(cats);
          }

          if (typeof id === 'string') {
             const { data: eventoInfo, error: evtError } = await supabase.from('evento').select('*').eq('id', id).single();
             if (evtError || !eventoInfo) {
                 setErrorMsg("No se encontró el evento o no tienes permisos.");
             } else {
                 // Rellenar Forularios
                 setFormData({
                    titulo: eventoInfo.titulo || '',
                    descripcion: eventoInfo.descripcion || '',
                    ubicacion: eventoInfo.ubicacion || UBICACIONES[0].value,
                    capacidad: eventoInfo.capacidad || 1000,
                    precio_base: eventoInfo.precio_base || 800,
                    categoria_id: eventoInfo.categoria_id || (cats ? cats[0].id : ''),
                    imagen: eventoInfo.imagen || '',
                 });

                 // Extraer la fecha y hora
                 if (eventoInfo.fecha) {
                    const parsedDate = new Date(eventoInfo.fecha);
                    setSelectedDate(parsedDate);
                    setCurrentMonth(parsedDate.getMonth());
                    setCurrentYear(parsedDate.getFullYear());
                    
                    const hr = parsedDate.getHours().toString().padStart(2, '0');
                    const min = parsedDate.getMinutes().toString().padStart(2, '0');
                    setTimeStr(`${hr}:${min}`);
                 }
             }
          }
      } catch (err: any) {
          setErrorMsg(err.message || 'Error de conexión');
      } finally {
          setInitialLoading(false);
      }
    };
    fetchData();
  }, [supabase, id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) {
       setErrorMsg("Debes seleccionar una fecha en el calendario.");
       return;
    }
    
    setLoading(true);
    setErrorMsg('');

    try {
      const [hours, minutes] = timeStr.split(':');
      const finalDateTime = new Date(selectedDate);
      finalDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // MANDAR EL UPDATE POR PUT A NUESTRA API
      const res = await fetch(`/api/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...formData,
            fecha: finalDateTime.toISOString()
        }),
      });

      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || 'Error desconocido al actualizar');
      }

      router.push('/organizador');
      router.refresh(); 

    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGICA DE CALENDARIO CUSTOM ---
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

      const grid = [];
      for (let i = 0; i < firstDayOfMonth; i++) grid.push(null);
      for (let i = 1; i <= daysInMonth; i++) grid.push(i);

      return (
         <div className="w-full">
            <div className="flex justify-between items-center mb-6">
               <button type="button" onClick={(e) => { e.stopPropagation(); advanceMonth(-1); }} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-300 transition">
                 <ChevronLeft className="w-5 h-5"/>
               </button>
               <span className="font-bold text-white capitalize text-lg">{monthNames[currentMonth]} {currentYear}</span>
               <button type="button" onClick={(e) => { e.stopPropagation(); advanceMonth(1); }} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-300 transition">
                 <ChevronRight className="w-5 h-5"/>
               </button>
            </div>
            <div className="grid grid-cols-7 gap-y-4 text-center text-sm font-bold text-gray-400 mb-2">
               {['Do','Lu','Ma','Mi','Ju','Vi','Sá'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
               {grid.map((day, ix) => {
                  if (!day) return <div key={`empty-${ix}`}></div>;
                  
                  const dateInfo = new Date(currentYear, currentMonth, day);
                  dateInfo.setHours(0,0,0,0);
                  
                  const today = new Date(); 
                  today.setHours(0,0,0,0);
                  const isPast = dateInfo < today;
                  
                  const isSelected = selectedDate && dateInfo.getTime() === selectedDate.getTime();

                  let btnStyle = isSelected 
                    ? 'bg-pink-500 text-white font-bold shadow-lg shadow-pink-500/40'
                    : isPast ? 'text-gray-600 opacity-50 cursor-not-allowed' : 'text-gray-200 hover:bg-white/10';

                  return (
                     <div key={`day-${day}`} className="w-full h-10 flex items-center justify-center">
                       <button
                         type="button"
                         disabled={isPast}
                         onClick={(e) => {
                             e.stopPropagation();
                             setSelectedDate(dateInfo);
                             setIsDateOpen(false);
                         }}
                         className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all focus:outline-none ${btnStyle}`}
                       >
                         {day}
                       </button>
                     </div>
                  );
               })}
            </div>
         </div>
      );
  };

  if (initialLoading) {
     return <div className="min-h-screen bg-[#110e1b] flex flex-col items-center justify-center"><Loader2 className="w-12 h-12 text-pink-500 animate-spin"/></div>
  }

  return (
    <div className="min-h-screen bg-[#110e1b] text-white">
      <Navbar user={null} /> 
      
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex justify-between items-center mb-8">
            <Link href="/organizador" className="inline-flex items-center text-pink-500 hover:text-pink-400 font-bold transition-colors">
            <ArrowLeft className="w-5 h-5 mr-2"/> Cancelar Edición
            </Link>
            <span className="text-gray-500 font-mono text-sm bg-black/50 px-3 py-1 rounded-full border border-white/10">{id}</span>
        </div>

        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-pink-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

            <h1 className="text-3xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
               Modificar Evento
            </h1>
            <p className="text-gray-400 mb-10 w-3/4">Corrige los datos. Cualquier cambio se verá reflejado inmediatamente en tienda.</p>

            {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl mb-8 font-medium">
                    🚨 {errorMsg}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2 md:col-span-2">
                       <label className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                          <Music className="w-4 h-4 text-purple-400"/> Título del Espectáculo
                       </label>
                       <input 
                         type="text" name="titulo" required
                         value={formData.titulo} onChange={handleChange}
                         className="w-full bg-[#1a1625] border border-white/10 rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all font-medium text-lg placeholder-gray-600"
                       />
                   </div>

                   <div className="space-y-2 md:col-span-2">
                       <label className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-purple-400"/> Imagen Promocional
                       </label>
                       <div className="flex gap-4 items-center">
                           <div className="flex-1 flex flex-col sm:flex-row gap-3">
                               <input 
                                 type="url" name="imagen"
                                 value={formData.imagen.startsWith('data:') ? '' : formData.imagen} 
                                 onChange={handleChange}
                                 placeholder="Pegar URL web externa..."
                                 className="flex-1 bg-[#1a1625] border border-white/10 rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all font-medium text-blue-400 placeholder-gray-600"
                               />
                               <div className="flex-shrink-0 flex items-center bg-[#1a1625] border border-white/10 rounded-xl px-4 py-3 hover:border-pink-500 transition cursor-pointer">
                                  <input 
                                    type="file" accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                          if (file.size > 2 * 1024 * 1024) {
                                             alert("Para la prueba beta la imagen debe ser menor a 2MB");
                                             return;
                                          }
                                          const reader = new FileReader();
                                          reader.onloadend = () => {
                                              setFormData(prev => ({ ...prev, imagen: reader.result as string }));
                                          };
                                          reader.readAsDataURL(file);
                                      }
                                    }}
                                    className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-pink-500/10 file:text-pink-400 hover:file:bg-pink-500/20 transition cursor-pointer w-full"
                                  />
                               </div>
                           </div>
                           {formData.imagen && (
                               <div className="w-14 h-14 rounded-lg overflow-hidden border border-white/20 bg-black shrink-0 relative group">
                                   <button 
                                      type="button" 
                                      onClick={() => setFormData(prev => ({...prev, imagen: ''}))}
                                      className="absolute inset-0 bg-red-500/80 text-white font-bold opacity-0 group-hover:opacity-100 flex items-center justify-center transition"
                                   >
                                      X
                                   </button>
                                   <img src={formData.imagen} alt="Preview" className="w-full h-full object-cover" />
                               </div>
                           )}
                       </div>
                   </div>

                   <div className="space-y-2">
                       <label className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-purple-400"/> Fecha de la Gira
                       </label>
                       <div className="relative" ref={dateRef}>
                          <div 
                             onClick={() => setIsDateOpen(!isDateOpen)}
                             className="w-full bg-[#1a1625] border border-white/10 rounded-xl px-5 py-4 cursor-pointer hover:border-pink-500 transition-all font-medium text-gray-300 flex items-center justify-between"
                          >
                             <span>
                               {selectedDate 
                                  ? selectedDate.toLocaleDateString('es-MX', { day:'numeric', month:'long', year:'numeric'}) 
                                  : 'Selecciona un día en el calendario'}
                             </span>
                             <Calendar className={`w-5 h-5 ${selectedDate ? 'text-pink-500' : 'text-gray-500'}`}/>
                          </div>

                          {isDateOpen && (
                              <div className="absolute top-[105%] left-0 w-[340px] bg-[#221e30] border border-white/20 rounded-2xl shadow-2xl p-5 z-50 animate-in fade-in slide-in-from-top-2">
                                  {renderMonthGrid()}
                              </div>
                          )}
                       </div>
                   </div>

                   <div className="space-y-2">
                       <label className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                          <Clock className="w-4 h-4 text-purple-400"/> Hora
                       </label>
                       <input 
                         type="time" required
                         value={timeStr} onChange={(e) => setTimeStr(e.target.value)}
                         className="w-full bg-[#1a1625] border border-white/10 rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all font-medium text-gray-300 [color-scheme:dark]"
                       />
                   </div>

                   <div className="space-y-2">
                       <label className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-purple-400"/> Ubicación o Recinto
                       </label>
                       <select 
                         name="ubicacion" required
                         value={formData.ubicacion} onChange={handleChange}
                         className="w-full bg-[#1a1625] border border-white/10 rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all text-white appearance-none cursor-pointer"
                       >
                         {UBICACIONES.map(loc => (
                            <option key={loc.value} value={loc.value}>{loc.label}</option>
                         ))}
                       </select>
                   </div>

                   <div className="space-y-2">
                       <label className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                          <Users className="w-4 h-4 text-purple-400"/> Capacidad Máxima
                       </label>
                       <input 
                         type="number" name="capacidad" required min="1"
                         value={formData.capacidad} onChange={handleChange}
                         className="w-full bg-[#1a1625] border border-white/10 rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all font-medium"
                       />
                   </div>

                   <div className="space-y-2">
                       <label className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-purple-400"/> Precio Base Inicial (MXN)
                       </label>
                       <input 
                         type="number" name="precio_base" required min="1" step="0.01"
                         value={formData.precio_base} onChange={handleChange}
                         className="w-full bg-[#1a1625] border border-white/10 rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all font-medium text-pink-400"
                       />
                   </div>

                   <div className="space-y-2">
                       <label className="text-sm font-bold text-gray-300 uppercase tracking-widest">
                          Categoría Musical
                       </label>
                       <select 
                         name="categoria_id" required
                         value={formData.categoria_id} onChange={handleChange}
                         className="w-full bg-[#1a1625] border border-white/10 rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all text-white appearance-none cursor-pointer"
                       >
                         {categorias.map(c => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                         ))}
                       </select>
                   </div>

                   <div className="space-y-2 md:col-span-2">
                       <label className="text-sm font-bold text-gray-300 uppercase tracking-widest">
                          Descripción (Opcional pero recomendada)
                       </label>
                       <textarea 
                         name="descripcion" minLength={10} maxLength={1000}
                         value={formData.descripcion} onChange={handleChange} rows={4}
                         className="w-full bg-[#1a1625] border border-white/10 rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all resize-none placeholder-gray-600"
                       />
                   </div>

               </div>

               <hr className="border-white/10 my-8"/>

               <button 
                 type="submit" disabled={loading}
                 className="w-full md:w-auto mt-4 px-10 py-5 rounded-full font-black text-lg text-white bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 shadow-[0_0_20px_rgba(219,39,119,0.3)] hover:shadow-[0_0_30px_rgba(219,39,119,0.5)] transform hover:-translate-y-1 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
               >
                 {loading ? <><Loader2 className="w-6 h-6 animate-spin"/> Actualizando</> : 'Guardar Re-configuración'}
               </button>
            </form>
        </div>
      </main>
    </div>
  );
}
