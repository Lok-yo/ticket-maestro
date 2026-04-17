import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Navbar from '@/Components/layout/Navbar';
import { User } from 'lucide-react';
import type { Usuario } from '@/types';
import ProfileManager from '@/Components/perfil/ProfileManager';

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
           <ProfileManager user={user} />
        </div>
      </main>
    </div>
  );
}
