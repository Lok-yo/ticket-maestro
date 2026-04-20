'use client';

import { Trash2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function DeleteEventButton({ eventId, eventTitle }: { eventId: string, eventTitle: string }) {
   const [loading, setLoading] = useState(false);
   const router = useRouter();

   const handleDelete = async (e: React.MouseEvent) => {
       e.preventDefault();
       e.stopPropagation();
       
       if (!window.confirm(`¿Estás seguro de que quieres eliminar el evento "${eventTitle}"?\n\nEsta acción no se puede deshacer y fallará si ya se ha vendido algún boleto.`)) {
           return;
       }

       setLoading(true);
       try {
           const res = await fetch(`/api/events/${eventId}`, {
               method: 'DELETE'
           });
           const data = await res.json();
           
           if (!res.ok) {
               toast.error(`No se pudo eliminar: ${data.error || 'Error desconocido'}`);
           } else {
               toast.success('Evento eliminado exitosamente.');
               router.refresh();
           }
       } catch (err) {
           toast.error('Error de conexión al intentar eliminar.');
       } finally {
           setLoading(false);
       }
   }

   return (
       <button 
           onClick={handleDelete}
           disabled={loading}
           className="absolute top-4 left-4 bg-black/50 hover:bg-red-500 backdrop-blur-md text-white p-2 rounded-full z-40 transition shadow-lg disabled:opacity-50"
           title="Eliminar Gira"
       >
           {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
       </button>
   );
}

