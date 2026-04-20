import Image from 'next/image';
import Navbar from '@/Components/layout/Navbar';
import { createClient } from '@/lib/supabase/server';
import { ShieldCheck, TicketIcon, Users, Star } from 'lucide-react';
import type { Usuario } from '@/types';

export default async function AboutPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  let user: Usuario | null = null;
  if (authUser) {
    const { data } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
    if (data) user = data as Usuario;
  }

  return (
    <div className="min-h-screen bg-[#1a1625] text-white overflow-hidden">
      <Navbar user={user} />

      {/* Header Section */}
      <section className="relative px-6 py-24 text-center max-w-5xl mx-auto">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-500/20 blur-[120px] rounded-full pointer-events-none -z-10" />
         
         <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            Nuestra Misión en <span className="text-pink-500">TicketMaestro</span>
         </h1>
         <p className="text-lg md:text-2xl text-gray-400 font-medium leading-relaxed max-w-3xl mx-auto">
            Revolucionar cómo descubres, reservas y experimentas tus eventos favoritos con tecnología premium de última generación.
         </p>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-6 py-12 mb-20">
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Tarjeta 1 */}
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition duration-300">
               <div className="w-14 h-14 bg-pink-500/20 text-pink-500 rounded-2xl flex items-center justify-center mb-6">
                  <TicketIcon className="w-8 h-8" />
               </div>
               <h3 className="text-2xl font-bold mb-3">Acceso Inmediato</h3>
               <p className="text-gray-400">Tus entradas digitales disponibles instantáneamente en formato QR desde tu área de miembro. Sin demoras.</p>
            </div>

            {/* Tarjeta 2 */}
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition duration-300">
               <div className="w-14 h-14 bg-blue-500/20 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
                  <ShieldCheck className="w-8 h-8" />
               </div>
               <h3 className="text-2xl font-bold mb-3">Seguridad Total</h3>
               <p className="text-gray-400">Trabajamos bajo protocolos criptográficos y la pasarela Stripe para que tus datos nunca estén en riesgo.</p>
            </div>

            {/* Tarjeta 3 */}
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition duration-300">
               <div className="w-14 h-14 bg-purple-500/20 text-purple-500 rounded-2xl flex items-center justify-center mb-6">
                  <Star className="w-8 h-8" />
               </div>
               <h3 className="text-2xl font-bold mb-3">Experiencia Premium</h3>
               <p className="text-gray-400">Una interfaz pensada hasta el último detalle, porque mereces sentir la exclusividad desde antes de que empiece el concierto.</p>
            </div>

            {/* Tarjeta 4 */}
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition duration-300">
               <div className="w-14 h-14 bg-green-500/20 text-emerald-500 rounded-2xl flex items-center justify-center mb-6">
                  <Users className="w-8 h-8" />
               </div>
               <h3 className="text-2xl font-bold mb-3">Comunidad </h3>
               <p className="text-gray-400">Te conectamos con los espectáculos que te apasionan, creando vínculos y recuerdos para toda la vida.</p>
            </div>
         </div>
      </section>

      {/* Info extra */}
      <section className="bg-zinc-900 border-y border-white/5 py-24 px-6 relative overflow-hidden">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 w-full relative h-[400px] rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)]">
               <Image 
                  src="https://picsum.photos/seed/maestro/1000/600"
                  alt="Concierto" 
                  fill
                  className="object-cover"
               />
               <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent" />
            </div>
            
            <div className="flex-1">
               <h2 className="text-4xl md:text-5xl font-bold mb-6">Todo comenzó con un solo boleto.</h2>
               <p className="text-gray-400 text-lg mb-6 leading-relaxed">
                  Lanzada con el sueño de unificar grandes festivales de música, teatro y espectáculos en México, Ticket Maestro se posiciona como una boletera libre de fricciones.
               </p>
               <p className="text-gray-400 text-lg leading-relaxed mb-8">
                  Ya seas organizador local o promotor de estadios masivos, nuestra tecnología soporta picos de miles de usuarios en lista de espera sin detener el reloj. Aquí los eventos ocurren, y ocurren bien.
               </p>

               {/* Promotores CTA */}
               <div className="bg-pink-500/10 border border-pink-500/20 p-6 rounded-2xl">
                  <h3 className="text-xl font-bold text-pink-400 mb-2 flex items-center gap-2">
                     <Star className="w-5 h-5"/>
                     ¿Eres promotor o creador de eventos?
                  </h3>
                  <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                     Únete a la gran red de entretenimiento. Mándanos tu nombre, empresa y tipo de eventos que haces para obtener una cuenta verificada de <span className="font-bold text-white tracking-widest uppercase">Organizador</span>.
                     <br/><br/>
                     <span className="text-xs opacity-70">⚡ Aprobaciones en menos de 24 horas. Cero comisiones de apertura.</span>
                  </p>
                  <a href="mailto:organizador@ticketmaestro.com" className="inline-block bg-pink-500 hover:bg-pink-600 transition px-6 py-2.5 rounded-full text-white font-bold text-sm shadow-lg shadow-pink-500/30">
                     Enviar solicitud por correo
                  </a>
               </div>
            </div>
         </div>
      </section>

      {/* Footer minimalista */}
      <footer className="py-12 bg-black text-center text-gray-500">
         <p className="font-medium">© {new Date().getFullYear()} Ticket Maestro. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}

