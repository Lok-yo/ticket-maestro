'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/Components/layout/Navbar';
import Link from 'next/link'; // Importante para la navegación
import { Loader2, Users, ShieldAlert, CheckCircle2, MoreVertical, Crown, LayoutDashboard } from 'lucide-react';

type UsuarioInfo = {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  fecha_registro: string;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UsuarioInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/admin/users');
        const json = await res.json();
        if (!res.ok) {
           setErrorMsg(json.error || 'Error al cargar usuarios');
           if (res.status === 401 || res.status === 403) router.push('/');
        } else {
           setUsers(json.data);
        }
      } catch (err: any) {
        setErrorMsg('Falla de red conectando al servidor');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [router]);

  const changeRole = async (userId: string, newRole: string) => {
    setActionLoadingId(userId);
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, rol: newRole })
      });
      const json = await res.json();
      
      if (!res.ok) {
         setErrorMsg(json.error || 'Error al actualizar usuario');
      } else {
         setUsers(prev => prev.map(u => u.id === userId ? { ...u, rol: newRole } : u));
      }
    } catch (err) {
      setErrorMsg('Error de red');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e0a17] text-white">
      <Navbar user={null} />

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6 border-b border-white/10 pb-8">
           <div>
             <h1 className="text-3xl md:text-4xl font-extrabold mb-2 flex items-center gap-3 text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-pink-500">
               <ShieldAlert className="w-8 h-8 text-red-500"/> Ojo del Administrador
             </h1>
             <p className="text-gray-400 font-medium">Gestiona permisos, examina identidades y asciende organizadores bajo tu mando.</p>
           </div>
           
           <div className="flex gap-4">
              <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl text-center">
                 <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Total</p>
                 <p className="text-2xl font-black">{users.length}</p>
              </div>
              <div className="bg-pink-500/10 border border-pink-500/30 px-6 py-3 rounded-2xl text-center text-pink-400">
                 <p className="text-pink-500/60 text-xs font-bold uppercase tracking-wider mb-1">Productores</p>
                 <p className="text-2xl font-black">{users.filter(u => u.rol === 'organizador').length}</p>
              </div>

              <Link 
              href="/admin/dashboard/ver_detalles"
  className="bg-pink-600 border border-pink-400 px-6 py-3 rounded-2xl flex flex-col items-center justify-center hover:bg-pink-500 hover:scale-[1.02] transition-all shadow-[0_0_20px_rgba(219,39,119,0.3)] group"
>
  <p className="text-pink-200 text-xs font-bold uppercase tracking-wider mb-1 group-hover:text-white">
    Reporte
  </p>
  <p className="text-xl font-black text-white flex items-center gap-2">
    Organizadores 
  </p>
              </Link>
           </div>
        </div>

        {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl mb-8 font-medium animate-in fade-in">
                🚨 {errorMsg}
            </div>
        )}

        {loading ? (
            <div className="flex justify-center py-20">
                <Loader2 className="w-16 h-16 text-red-500 animate-spin opacity-50"/>
            </div>
        ) : (
            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 bg-black/40 text-gray-400 text-xs uppercase tracking-widest font-bold">
                                <th className="p-6">Usuario</th>
                                <th className="p-6">Correo</th>
                                <th className="p-6">Estatus</th>
                                <th className="p-6">Asignación</th>
                                <th className="p-6 text-right">Controles</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {users.map((u) => (
                                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="p-6 flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                            u.rol === 'admin' ? 'bg-gradient-to-br from-red-600 to-pink-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]' :
                                            u.rol === 'organizador' ? 'bg-gradient-to-br from-indigo-600 to-purple-600' :
                                            'bg-white/10'
                                        }`}>
                                            {u.rol === 'admin' ? <Crown className="w-4 h-4"/> : u.nombre.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-bold text-[15px]">{u.nombre}</span>
                                    </td>
                                    <td className="p-6 text-gray-400 font-medium">{u.email}</td>
                                    <td className="p-6 text-xs font-mono text-gray-500">
                                        {new Date(u.fecha_registro).toLocaleDateString('es-MX')}
                                    </td>
                                    <td className="p-6">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                            u.rol === 'admin' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                            u.rol === 'organizador' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                                            'bg-green-500/10 text-green-400 border border-green-500/20'
                                        }`}>
                                            <CheckCircle2 className="w-3 h-3"/>
                                            {u.rol}
                                        </span>
                                    </td>
                                    <td className="p-6 text-right relative group">
                                        {actionLoadingId === u.id ? (
                                            <Loader2 className="w-5 h-5 text-gray-400 animate-spin ml-auto"/>
                                        ) : (
                                            <div className="flex items-center justify-end gap-2">
                                                {u.rol !== 'admin' && (
                                                    <select 
                                                        value={u.rol}
                                                        onChange={(e) => changeRole(u.id, e.target.value)}
                                                        className="bg-black/50 border border-white/20 text-xs text-white px-3 py-2 rounded-lg cursor-pointer focus:outline-none focus:border-red-500"
                                                    >
                                                        <option value="cliente">Cliente (Normal)</option>
                                                        <option value="organizador">Productor (BETA)</option>
                                                    </select>
                                                )}
                                                {u.rol === 'admin' && <span className="text-xs text-red-500/50 font-bold uppercase">Jerarquía Máxima</span>}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {users.length === 0 && !loading && (
                    <div className="p-12 text-center text-gray-500">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-50"/>
                        <p>No hay usuarios en la base de datos.</p>
                    </div>
                )}
            </div>
        )}
      </main>
    </div>
  );
}
