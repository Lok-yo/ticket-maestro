'use client';

import { useState } from 'react';
import { Landmark, Loader2, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function ClabeForm({ initialClabe }: { initialClabe?: string | null }) {
  const [clabe, setClabe] = useState(initialClabe || '');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    if (clabe.length !== 18) {
        toast.error('La CLABE deber tener 18 dígitos.');
        return;
    }
    setLoading(true);
    try {
        const res = await fetch('/api/organizador/clabe', {
            method: 'POST',
            body: JSON.stringify({ clabe })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error);
        
        setSaved(true);
        toast.success('CLABE guardada exitosamente');
        setTimeout(() => setSaved(false), 3000);
        router.refresh();
    } catch (err: any) {
        toast.error(err.message || 'Error al guardar la CLABE.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
         <Landmark className="w-5 h-5 text-pink-500"/> Datos Bancarios
      </h3>
      <p className="text-sm text-gray-400 mb-4">Ingresa tu CLABE interbancaria a la cual depositaremos los fondos de tus boletos vendidos.</p>
      
      <div className="flex flex-col sm:flex-row gap-3">
         <input 
            type="text" 
            placeholder="000000000000000000"
            maxLength={18}
            value={clabe}
            onChange={e => setClabe(e.target.value.replace(/\D/g, ''))}
            className="flex-1 bg-[#1a1625] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-pink-500 font-mono tracking-widest text-white transition-all"
         />
         <button 
            onClick={handleSave}
            disabled={loading || clabe === initialClabe || clabe.length !== 18}
            className="bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold transition flex items-center justify-center min-w-[120px]"
         >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4 text-green-400" /> : 'Guardar'}
         </button>
      </div>
    </div>
  );
}

