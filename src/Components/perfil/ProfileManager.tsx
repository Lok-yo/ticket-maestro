'use client';

import { useState } from 'react';
import { Mail, Calendar, Key, Edit2, Loader2 } from 'lucide-react';
import type { Usuario } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function ProfileManager({ user }: { user: Usuario }) {
  const supabase = createClient();
  const router = useRouter();
  
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [newName, setNewName] = useState(user?.nombre || '');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState('');

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const handleNameUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setNameLoading(true);
    setNameError('');

    try {
      // 1. Update in public.usuario
      const { error: dbError } = await supabase
        .from('usuario')
        .update({ nombre: newName })
        .eq('id', user.id);

      if (dbError) throw dbError;

      // 2. Update Auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { nombre: newName }
      });

      if (authError) throw authError;

      setIsNameModalOpen(false);
      toast.success('Nombre actualizado correctamente');
      router.refresh();
    } catch (err: any) {
      const msg = err.message || 'Error al actualizar el nombre';
      setNameError(msg);
      toast.error(msg);
    } finally {
      setNameLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    if (newPassword.length < 6) {
        setPasswordError('La nueva contraseña debe tener al menos 6 caracteres.');
        return;
    }
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess('');

    try {
      // Verify current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error('La contraseña actual es incorrecta.');
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      toast.success('Contraseña actualizada exitosamente');
      setPasswordSuccess('Contraseña actualizada exitosamente.');
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setPasswordSuccess('');
      }, 2000);
      
    } catch (err: any) {
      const msg = err.message || 'Error al actualizar la contraseña';
      setPasswordError(msg);
      toast.error(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col md:flex-row gap-8 items-start md:items-center mb-8 border-b border-white/10 pb-8 relative group">
          <div className="w-24 h-24 rounded-full bg-pink-500 flex items-center justify-center text-4xl font-bold text-white border-4 border-[#1a1625] shadow-[0_0_0_4px_rgba(233,30,99,0.3)]">
             {user?.nombre?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1">
             <div className="flex items-center gap-3">
                 <h2 className="text-2xl font-bold mb-1">{user?.nombre || 'Usuario'}</h2>
                 <button onClick={() => setIsNameModalOpen(true)} className="p-1.5 bg-white/5 hover:bg-white/20 rounded-full transition text-gray-300">
                     <Edit2 className="w-4 h-4"/>
                 </button>
             </div>
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
          <button onClick={() => setIsPasswordModalOpen(true)} className="bg-white/10 hover:bg-white/20 transition px-6 py-3 rounded-full font-semibold flex items-center gap-2 text-white">
              <Key className="w-4 h-4"/> Cambiar Contraseña
          </button>
      </div>

      {/* Name Update Modal */}
      {isNameModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1625] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-white">Actualizar Nombre</h3>
            {nameError && <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm mb-4">{nameError}</div>}
            <form onSubmit={handleNameUpdate}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">Nuevo Nombre</label>
                <input 
                  type="text" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)} 
                  required
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-500 text-white"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsNameModalOpen(false)} className="px-4 py-2 rounded-xl text-gray-400 hover:bg-white/5 transition font-medium">
                  Cancelar
                </button>
                <button type="submit" disabled={nameLoading} className="px-6 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold transition flex items-center gap-2">
                  {nameLoading && <Loader2 className="w-4 h-4 animate-spin"/>} Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Update Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1625] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2"><Key className="w-5 h-5 text-pink-500"/> Cambiar Contraseña</h3>
            
            {passwordError && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm mb-4">{passwordError}</div>}
            {passwordSuccess && <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-lg text-sm mb-4">{passwordSuccess}</div>}
            
            <form onSubmit={handlePasswordUpdate}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">Contraseña Actual</label>
                <input 
                  type="password" 
                  value={currentPassword} 
                  onChange={(e) => setCurrentPassword(e.target.value)} 
                  required
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-500 text-white"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">Nueva Contraseña</label>
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  required
                  minLength={6}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-500 text-white"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="px-4 py-2 rounded-xl text-gray-400 hover:bg-white/5 transition font-medium">
                  Cancelar
                </button>
                <button type="submit" disabled={passwordLoading} className="px-6 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold transition flex items-center gap-2">
                  {passwordLoading && <Loader2 className="w-4 h-4 animate-spin"/>} Actualizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
