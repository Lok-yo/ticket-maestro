'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/Components/layout/Navbar';
import Link from 'next/link';
import { 
  Loader2, Users, Search, Mail, 
  Calendar, ArrowRight, UserCheck, Music 
} from 'lucide-react';

type OrganizadorInfo = {
  id: string;
  nombre: string;
  email: string;
  fecha_registro: string;
  rol: string;
};

export default function ListaOrganizadoresPage() {
  const [organizadores, setOrganizadores] = useState<OrganizadorInfo[]>([]);
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrganizadores = async () => {
      try {
        const res = await fetch('/api/admin/users');
        const json = await res.json();
        
        if (res.ok) {
          // Filtramos solo los que son organizadores
          const soloOrgs = json.data.filter((u: OrganizadorInfo) => u.rol === 'organizador');
          setOrganizadores(soloOrgs);
        }
      } catch (err) {
        console.error("Error cargando organizadores");
      } finally {
        setLoading(false);
      }
    };
    fetchOrganizadores();
  }, []);

  const orgsFiltrados = organizadores.filter(o => 
    o.nombre.toLowerCase().includes(filtro.toLowerCase()) || 
    o.email.toLowerCase().includes(filtro.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0a17] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-pink-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0a17] text-white">
      <Navbar user={null} />

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Cabecera y Buscador */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
              Organizadores
            </h1>
            <p className="text-gray-400 mt-2">Supervisa a los productores de eventos activos en la plataforma.</p>
          </div>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors w-5 h-5" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o correo..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 w-full md:w-80 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all placeholder:text-gray-600"
            />
          </div>
        </div>

        {/* Grid de Organizadores */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {orgsFiltrados.map((org) => (
            <div 
              key={org.id} 
              className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:border-pink-500/50 transition-all group relative overflow-hidden"
            >
              {/* Decoración de fondo */}
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl group-hover:bg-pink-500/20 transition-all"></div>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-2xl font-black shadow-lg shadow-indigo-500/20">
                  {org.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold group-hover:text-pink-400 transition-colors">{org.nombre}</h3>
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                    <UserCheck className="w-3 h-3" /> Productor Verificado
                  </span>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <Mail className="w-4 h-4 text-pink-500" />
                  <span>{org.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <Calendar className="w-4 h-4 text-pink-500" />
                  <span>Miembro desde: {new Date(org.fecha_registro).toLocaleDateString()}</span>
                </div>
              </div>

             <Link 
  href={`/admin/dashboard/pagos/${org.id}`}
  className="w-full bg-white/5 border border-white/10 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-pink-600 hover:border-pink-500 hover:text-white transition-all group/btn"
>
  Ver Historial de Pagos
  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
</Link>
            </div>
          ))}
        </div>

        {/* Estado Vacío */}
        {orgsFiltrados.length === 0 && (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-700" />
            <p className="text-xl text-gray-500 font-bold">No se encontraron organizadores con ese nombre.</p>
          </div>
        )}
      </main>
    </div>
  );
}
