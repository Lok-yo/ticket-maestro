'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronLeft, ChevronRight, MapPin, Calendar, Search as SearchIcon } from 'lucide-react';

const UBICACIONES = [
  { value: '', label: 'Todas las ubicaciones' },
  { value: 'San Luis Potosí', label: 'San Luis Potosí' },
  { value: 'Ciudad de México', label: 'Ciudad de México' },
  { value: 'Guadalajara', label: 'Guadalajara' },
  { value: 'Monterrey', label: 'Monterrey' },
];

export function SearchForm({ 
  initialUbicacion, 
  initialFecha, 
  initialSearch 
}: { 
  initialUbicacion: string; 
  initialFecha: string; 
  initialSearch: string;
}) {
  const router = useRouter();
  const [ubicacion, setUbicacion] = useState(initialUbicacion);
  const [search, setSearch] = useState(initialSearch);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);
  
  // Date State
  const [startDate, setStartDate] = useState<Date | null>(initialFecha ? new Date(initialFecha + 'T12:00:00') : null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
         setIsLocationOpen(false);
      }
      if (dateRef.current && !dateRef.current.contains(event.target as Node)) {
         setIsDateOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef, dateRef]);

  const advanceMonth = (offset: number) => {
      let newMonth = currentMonth + offset;
      let newYear = currentYear;
      if (newMonth < 0) { newMonth = 11; newYear--; }
      else if (newMonth > 11) { newMonth = 0; newYear++; }
      setCurrentMonth(newMonth);
      setCurrentYear(newYear);
  };

  const renderMonth = (monthOffset: number) => {
      let m = currentMonth + monthOffset;
      let y = currentYear;
      if (m > 11) { m -= 12; y++; }
      
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const firstDayOfMonth = new Date(y, m, 1).getDay();
      const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

      const grid = [];
      for (let i = 0; i < firstDayOfMonth; i++) grid.push(null);
      for (let i = 1; i <= daysInMonth; i++) grid.push(i);

      return (
         <div className="w-1/2 px-4 border-r last:border-r-0 border-white/10">
            <div className="flex justify-between items-center mb-6">
               {monthOffset === 0 ? (
                 <button type="button" onClick={(e) => { e.stopPropagation(); advanceMonth(-1); }} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-300 transition">
                   <ChevronLeft className="w-5 h-5"/>
                 </button>
               ) : <div className="w-8"></div>}
               
               <span className="font-bold text-white capitalize text-lg">{monthNames[m]} {y}</span>
               
               {monthOffset === 1 ? (
                 <button type="button" onClick={(e) => { e.stopPropagation(); advanceMonth(1); }} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-300 transition">
                   <ChevronRight className="w-5 h-5"/>
                 </button>
               ) : <div className="w-8"></div>}
            </div>

            <div className="grid grid-cols-7 gap-y-4 text-center text-sm font-bold text-gray-400 mb-2">
               {['Do','Lu','Ma','Mi','Ju','Vi','Sá'].map(d => <div key={d}>{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-y-1">
               {grid.map((day, ix) => {
                  if (!day) return <div key={`empty-${monthOffset}-${ix}`}></div>;
                  
                  const dateInfo = new Date(y, m, day);
                  dateInfo.setHours(0,0,0,0);
                  
                  const today = new Date(); 
                  today.setHours(0,0,0,0);
                  const isPast = dateInfo < today;
                  
                  const isSelectedStart = startDate && dateInfo.getTime() === startDate.getTime();
                  const isSelectedEnd = endDate && dateInfo.getTime() === endDate.getTime();
                  const isSelectedSingle = isSelectedStart && !endDate;
                  
                  const isInRange = startDate && endDate && dateInfo > startDate && dateInfo < endDate;

                  // Styling constraints
                  let cellBg = '';
                  let btnStyle = '';

                  if (isInRange) {
                      cellBg = 'bg-pink-500/20';
                      btnStyle = 'text-pink-100 font-semibold';
                  } else if (startDate && endDate && isSelectedStart) {
                      cellBg = 'bg-gradient-to-r from-transparent 50% to-pink-500/20';
                      btnStyle = 'bg-pink-500 text-white font-bold shadow-lg shadow-pink-500/40';
                  } else if (startDate && endDate && isSelectedEnd) {
                      cellBg = 'bg-gradient-to-l from-transparent 50% to-pink-500/20';
                      btnStyle = 'bg-pink-500 text-white font-bold shadow-lg shadow-pink-500/40';
                  } else if (isSelectedSingle) {
                      btnStyle = 'bg-pink-500 text-white font-bold shadow-lg shadow-pink-500/40';
                  } else {
                      btnStyle = isPast ? 'text-gray-600 opacity-50' : 'text-gray-200 hover:bg-white/10';
                  }

                  return (
                     <div key={`day-${monthOffset}-${day}`} className={`w-full h-10 flex items-center justify-center ${cellBg}`}>
                       <button
                         type="button"
                         disabled={isPast}
                         onClick={(e) => {
                             e.stopPropagation();
                             if (!startDate || (startDate && endDate)) {
                                setStartDate(dateInfo);
                                setEndDate(null);
                             } else {
                                if (dateInfo <= startDate) {
                                  setStartDate(dateInfo);
                                } else {
                                  setEndDate(dateInfo);
                                }
                             }
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (ubicacion) params.set('ubicacion', ubicacion);
    if (startDate) params.set('fecha', startDate.toISOString().split('T')[0]);
    if (endDate) params.set('fechaFin', endDate.toISOString().split('T')[0]);
    if (search) params.set('search', search);
    router.push(`/?${params.toString()}`);
  };

  const selectedLocation = UBICACIONES.find(u => u.value === ubicacion) || UBICACIONES[0];

  const formatDisplayDate = () => {
     if (startDate && endDate) {
         const s = startDate.toLocaleDateString('es-MX', {day:'numeric', month:'short'});
         const e = endDate.toLocaleDateString('es-MX', {day:'numeric', month:'short'});
         return `${s} - ${e}`;
     }
     if (startDate) {
         return startDate.toLocaleDateString('es-MX', {day:'numeric', month:'short', year:'numeric'});
     }
     return 'Cualquier fecha';
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-2 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row gap-2 bg-white/5 rounded-3xl p-2 relative">

        {/* Ubicación (Custom Dropdown) */}
        <div className="flex-1 flex items-center gap-3 bg-white/10 rounded-2xl px-6 py-4 relative cursor-pointer hover:bg-white/20 transition"
             onClick={() => setIsLocationOpen(!isLocationOpen)}
             ref={dropdownRef}
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-pink-500/20 text-pink-500 shrink-0">
             <MapPin className="w-5 h-5" />
          </div>
          <div className="flex-1 select-none flex items-center justify-between">
             <div className="text-left">
                <p className="text-xs text-white/70">Ubicación</p>
                <div className="text-white font-bold truncate">{selectedLocation.label}</div>
             </div>
             <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isLocationOpen ? 'rotate-180' : ''}`} />
          </div>

          {/* Menú Desplegable */}
          {isLocationOpen && (
             <div className="absolute top-[105%] left-0 w-full bg-[#1a1625] backdrop-blur-3xl border border-white/20 rounded-2xl shadow-2xl py-3 z-50 overflow-hidden flex flex-col gap-2 px-3 animate-in fade-in slide-in-from-top-2">
                {UBICACIONES.map((loc) => (
                   <button
                     key={loc.value}
                     type="button"
                     onClick={(e) => {
                        e.stopPropagation();
                        setUbicacion(loc.value);
                        setIsLocationOpen(false);
                     }}
                     className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                        ubicacion === loc.value 
                          ? 'border-pink-500 bg-pink-500/10 font-bold text-white shadow-[0_0_15px_rgba(219,39,119,0.3)]' 
                          : 'border-white/5 hover:border-white/30 bg-white/5 text-gray-300 hover:text-white'
                     }`}
                   >
                     {loc.label}
                   </button>
                ))}
             </div>
          )}
        </div>

        {/* Fecha (Dual Calendar Picker) */}
        <div className="flex-1 flex items-center gap-3 bg-white/10 rounded-2xl px-6 py-4 relative cursor-pointer hover:bg-white/20 transition text-left"
             onClick={() => setIsDateOpen(!isDateOpen)}
             ref={dateRef}
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-pink-500/20 text-pink-500 shrink-0">
             <Calendar className="w-5 h-5" />
          </div>
          <div className="flex-1 select-none flex items-center justify-between">
             <div className="overflow-hidden text-left">
                <p className="text-xs text-white/70">Fechas</p>
                <div className="text-white font-bold truncate">
                   {formatDisplayDate()}
                </div>
             </div>
             <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isDateOpen ? 'rotate-180' : ''}`} />
          </div>

          {/* Menú Calendario Doble */}
          {isDateOpen && (
             <div className="absolute top-[105%] left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 w-[640px] max-w-[95vw] bg-[#1a1625] border border-white/20 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-6 z-50 animate-in fade-in slide-in-from-top-2" onClick={e => e.stopPropagation()}>
                
                {/* Inputs de rango simulado */}
                <div className="flex gap-4 mb-6 pb-6 border-b border-white/10">
                   <div className="flex-1">
                      <label className="text-xs font-semibold text-gray-400 mb-1 block">Start date</label>
                      <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white">
                         {startDate ? startDate.toLocaleDateString('es-MX', {day:'2-digit', month:'2-digit', year:'numeric'}) : 'DD/MM/AAAA'}
                      </div>
                   </div>
                   <div className="flex-1">
                      <label className="text-xs font-semibold text-gray-400 mb-1 block">End date</label>
                      <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white">
                         {endDate ? endDate.toLocaleDateString('es-MX', {day:'2-digit', month:'2-digit', year:'numeric'}) : 'DD/MM/AAAA'}
                      </div>
                   </div>
                </div>

                {/* Contenedor Calendarios */}
                <div className="flex">
                   {renderMonth(0)}
                   {renderMonth(1)}
                </div>
                
                {/* Botones de acción */}
                <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
                   <button 
                      type="button"
                      onClick={(e) => {
                          e.stopPropagation();
                          setStartDate(null);
                          setEndDate(null);
                          setCurrentMonth(new Date().getMonth());
                          setCurrentYear(new Date().getFullYear());
                      }}
                      className="px-6 py-2.5 rounded-xl text-sm font-bold text-pink-400 hover:bg-pink-500/10 transition"
                   >
                      Reset
                   </button>
                   <div className="flex gap-2">
                       <button 
                          type="button"
                          onClick={(e) => {
                              e.stopPropagation();
                              setIsDateOpen(false);
                          }}
                          className="px-6 py-2.5 border border-white/20 hover:bg-white/10 rounded-xl text-sm font-bold text-white transition"
                       >
                          Cancel
                       </button>
                       <button 
                          type="button"
                          onClick={(e) => {
                              e.stopPropagation();
                              setIsDateOpen(false);
                          }}
                          className="px-6 py-2.5 bg-pink-500 hover:bg-pink-600 rounded-xl text-sm font-bold text-white transition shadow-lg shadow-pink-500/30"
                       >
                          Apply
                       </button>
                   </div>
                </div>
             </div>
          )}
        </div>

        {/* Artista / Evento */}
        <div className="flex-[1.5] flex items-center gap-3 bg-white/10 rounded-2xl px-6 py-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-pink-500/20 text-pink-500 shrink-0">
             <SearchIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 cursor-text text-left" onClick={() => document.getElementById('searchInput')?.focus()}>
            <p className="text-xs text-white/70">Buscar</p>
            <input
              id="searchInput"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Artista, evento..."
              className="bg-transparent outline-none w-full font-bold placeholder:font-normal placeholder:text-white/50"
            />
          </div>
        </div>

        <button
          type="submit"
          className="bg-[#e91e63] hover:bg-[#c2185b] transition px-12 py-4 rounded-2xl font-semibold flex items-center justify-center gap-3 text-lg shadow-lg shadow-[#e91e63]/30"
        >
          Buscar
          <SearchIcon className="w-6 h-6" />
        </button>
      </div>
    </form>
  );
}
