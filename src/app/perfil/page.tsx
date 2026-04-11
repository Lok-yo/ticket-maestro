import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Navbar from '@/Components/layout/Navbar';
import { User, Mail, Calendar, Key } from 'lucide-react';
import type { Usuario } from '@/types';

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/'); // Redirigir al inicio si no está logueado
  }

  // Obtener perfil (Usuario)
  const { data } = await supabase
    .from('usuario')
    .select('*')
    .eq('id', authUser.id)
    .single();
  
  const user = data as Usuario;

  return (
    <div className="min-h-screen bg-[#1a1625] text-white">
      <Navbar user={user} />

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-12">
           <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
              <User className="w-8 h-8 text-pink-500"/> Mi Perfil
           </h1>
           <p className="text-gray-400">Gestiona tu información personal y ajustes de cuenta.</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">
           <div className="flex flex-col md:flex-row gap-8 items-start md:items-center mb-8 border-b border-white/10 pb-8">
               <div className="w-24 h-24 rounded-full bg-pink-500 flex items-center justify-center text-4xl font-bold text-white border-4 border-[#1a1625] shadow-[0_0_0_4px_rgba(233,30,99,0.3)]">
                  {user?.nombre?.charAt(0).toUpperCase() || 'U'}
               </div>
               <div>
                  <h2 className="text-2xl font-bold mb-1">{user?.nombre || 'Usuario'}</h2>
                  <p className="text-pink-400 font-medium capitalize">{user?.rol || 'Cliente'}</p>
               </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="bg-black/20 rounded-2xl p-6 border border-white/5">
                   <div className="flex items-center gap-3 text-gray-400 mb-2">
                       <Mail className="w-5 h-5"/>
                       <span className="text-sm font-semibold uppercase tracking-wider">Correo Electrónico</span>
                   </div>
                   <p className="text-lg font-medium">{user?.email}</p>
               </div>

               <div className="bg-black/20 rounded-2xl p-6 border border-white/5">
                   <div className="flex items-center gap-3 text-gray-400 mb-2">
                       <Calendar className="w-5 h-5"/>
                       <span className="text-sm font-semibold uppercase tracking-wider">Miembro Desde</span>
                   </div>
                   <p className="text-lg font-medium">
                       {user?.fecha_registro ? new Date(user.fecha_registro).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Reciente'}
                   </p>
               </div>
           </div>



           <div className="mt-8 flex justify-end">
               <button className="bg-white/10 hover:bg-white/20 transition px-6 py-3 rounded-full font-semibold flex items-center gap-2">
                   <Key className="w-4 h-4"/> Cambiar Contraseña
               </button>
           </div>
        </div>
      </main>
    </div>
  );
}
