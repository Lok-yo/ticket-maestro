'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Search, Info, LogIn, UserPlus } from 'lucide-react';

type Usuario = {
  id: string;
  nombre: string;
  email: string;
  rol: string;
};

type NavbarProps = {
  user: Usuario | null;
};

export default function Navbar({ user: initialUser }: NavbarProps) {
  const router = useRouter();
  const [user, setUser] = useState<Usuario | null>(initialUser);
  const [loading, setLoading] = useState(!initialUser); // Iniciamos en loading si no hay initialUser
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialUser) return;
    
    let isMounted = true;
    const fetchUser = async () => {
      try {
          const supabase = createClient();
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser && isMounted) {
             const { data, error } = await supabase.from('usuario').select('*').eq('id', authUser.id).single();
             if (!error && data) {
                 setUser(data as Usuario);
             }
          }
      } finally {
          if (isMounted) setLoading(false);
      }
    };
    fetchUser();
    
    return () => { isMounted = false; };
  }, [initialUser]);

  // Cerrar el menú si se hace click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAbierto(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignorar error de red
    }
    setUser(null);
    setMenuAbierto(false);
    router.push('/');
    router.refresh(); // refresca el servidor para limpiar el estado del usuario
  }

  return (
    <nav className="bg-[#e91e63] sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

        {/* LOGO (Left side) */}
        <div className="flex-1">
          <Link href="/" className="inline-flex items-center hover:scale-105 transition">
            <Image
              src="/11.png"
              alt="TicketMaestro"
              width={380}
              height={110}
              className="object-contain h-20"
              priority
            />
          </Link>
        </div>

        {/* Menú de navegación (Absolute Center) */}
        <div className="hidden md:flex items-center justify-center gap-4 text-sm font-bold shrink-0">
          <button 
            onClick={() => {
              if(window.location.pathname !== '/') {
                 router.push('/#searchInput');
                 setTimeout(() => {
                   document.getElementById('searchInput')?.scrollIntoView({behavior: 'smooth', block: 'center'});
                   document.getElementById('searchInput')?.focus();
                 }, 800);
              } else {
                 document.getElementById('searchInput')?.scrollIntoView({behavior: 'smooth', block: 'center'});
                 document.getElementById('searchInput')?.focus();
              }
            }} 
            className="flex items-center gap-2 hover:bg-white/20 border border-white/20 px-5 py-2.5 rounded-full transition cursor-pointer text-white"
          >
            <Search className="w-4 h-4" />
            Buscar
          </button>
          <Link href="/about" className="flex items-center gap-2 hover:bg-white/20 border border-white/20 px-5 py-2.5 rounded-full transition text-white">
            <Info className="w-4 h-4" />
            Acerca de
          </Link>
        </div>

        {/* Área derecha (Right side) */}
        <div className="flex-1 flex items-center justify-end gap-3">
          {loading ? (
             <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
          ) : user ? (
            /* Usuario LOGUEADO → menú desplegable */
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuAbierto(!menuAbierto)}
                className="flex items-center gap-3 px-4 py-2 hover:bg-white/10 rounded-2xl transition"
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm border-2 border-white/40">
                  {user.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-sm font-semibold text-white leading-tight">{user.nombre}</p>
                  <p className="text-xs text-pink-100 leading-tight">{user.rol}</p>
                </div>
                {/* Chevron */}
                <svg
                  className={`w-4 h-4 text-white transition-transform duration-200 ${menuAbierto ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown */}
              {menuAbierto && (
                <div className="absolute right-0 mt-2 w-56 bg-[#1a1030] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                  
                  {/* Info del usuario */}
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="text-white text-sm font-semibold truncate">{user.nombre}</p>
                    <p className="text-gray-400 text-xs truncate">{user.email}</p>
                  </div>

                  {/* Opciones */}
                  <div className="py-1">
                    <Link
                      href="/perfil"
                      onClick={() => setMenuAbierto(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-gray-200 hover:bg-white/10 hover:text-white transition"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Mi perfil
                    </Link>

                    <Link
                      href="/mis-boletos"
                      onClick={() => setMenuAbierto(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-gray-200 hover:bg-white/10 hover:text-white transition"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                      </svg>
                      Mis boletos
                    </Link>

                    {/* Solo para admin */}
                    {user.rol === 'admin' && (
                      <Link
                        href="/admin/dashboard"
                        onClick={() => setMenuAbierto(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-pink-300 hover:bg-white/10 hover:text-pink-200 transition"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Panel de admin
                      </Link>
                    )}
                  </div>

                  {/* Logout */}
                  <div className="border-t border-white/10 py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Usuario NO logueado → botones normales */
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Link
                href="/auth/login"
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold border border-white/20 hover:bg-white/10 hover:border-white/50 text-white rounded-full transition cursor-pointer"
              >
                <LogIn className="w-4 h-4"/>
                Inicio de sesión
              </Link>
              <Link
                href="/auth/register"
                className="flex items-center gap-2 px-6 py-2.5 bg-white text-[#e91e63] shadow-[0_0_15px_rgba(255,255,255,0.4)] text-sm font-bold rounded-full hover:bg-pink-50 hover:scale-105 transition active:scale-95 cursor-pointer"
              >
                <UserPlus className="w-4 h-4"/>
                Regístrate
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}