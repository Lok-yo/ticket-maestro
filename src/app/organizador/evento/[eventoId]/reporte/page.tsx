import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import Link from 'next/link'
import { ArrowLeft, Download, Calendar, Users, CheckCircle, XCircle, FileText } from 'lucide-react'
import type { EventoStats, Validacion } from '@/types'
import ExportCSVButton from '@/Components/organizador/ExportCSVButton'

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ eventoId: string }>
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDateLong(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default async function ReportePage({ params }: PageProps) {
  const { eventoId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login?redirect=' + encodeURIComponent(`/organizador/evento/${eventoId}/reporte`))
  }

  const { data: usuario } = await supabase
    .from('usuario')
    .select('id, rol')
    .eq('id', user.id)
    .single()

  const isMainOrganizer = usuario && (usuario.rol === 'organizador' || usuario.rol === 'admin')

  // Verificar si es staff y si puede ver reportes
  const { data: staffData } = await supabase
    .from('evento_staff')
    .select('puede_ver_reportes')
    .eq('evento_id', eventoId)
    .eq('usuario_id', user.id)
    .single()

  const isStaff = !!staffData
  const canSeeReports = isMainOrganizer || staffData?.puede_ver_reportes

  if (!isMainOrganizer && !isStaff) {
    redirect('/organizador')
  }

  // Si es organizador, verificar que sea dueño del evento o sea staff asignado
  if (usuario?.rol === 'organizador') {
    const { data: evento } = await supabase
      .from('evento')
      .select('id')
      .eq('id', eventoId)
      .eq('organizador_id', user.id)
      .single()

    if (!evento && !isStaff) {
      redirect('/organizador')
    }
  }

  if (!canSeeReports) {
    redirect('/organizador')
  }

  const supabaseAdmin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: evento } = await supabaseAdmin
    .from('evento')
    .select('id, titulo, fecha, ubicacion, capacidad')
    .eq('id', eventoId)
    .single()

  if (!evento) {
    redirect('/organizador')
  }

  const { data: stats } = await fetchStats(eventoId)
  const { data: validaciones } = await fetchValidaciones(eventoId)

  return (
    <div className="min-h-screen bg-[#0e0a17] text-white">
      <header className="border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href={`/organizador/evento/${eventoId}/acceso`}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Volver al panel de acceso</span>
            </Link>
            
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-sm font-medium">
              Reporte de Asistencia
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-2">{evento.titulo}</h1>
          <div className="flex items-center gap-4 text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDateLong(evento.fecha)}
            </span>
            {evento.ubicacion && (
              <span>{evento.ubicacion}</span>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Users className="w-6 h-6" />}
            label="Boletos Vendidos"
            value={stats?.boletos.total_vendidos || 0}
            color="text-pink-400"
          />
          <StatCard
            icon={<CheckCircle className="w-6 h-6" />}
            label="Asistentes"
            value={stats?.boletos.total_usados || 0}
            subtext={`${stats?.boletos.asistencia_porcentaje || 0}%`}
            color="text-green-400"
          />
          <StatCard
            icon={<FileText className="w-6 h-6" />}
            label="Total Intentos"
            value={stats?.resumen_validaciones.total_intentos || 0}
            color="text-blue-400"
          />
          <StatCard
            icon={<XCircle className="w-6 h-6" />}
            label="Rechazados"
            value={(stats?.resumen_validaciones.invalidos || 0) + (stats?.resumen_validaciones.ya_usados || 0)}
            color="text-red-400"
          />
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="font-bold text-lg">Historial de Validaciones</h2>
            <span className="text-sm text-gray-400">
              {validaciones?.length || 0} registros
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-black/30">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Fecha/Hora</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Boleto</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Tipo</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Resultado</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Comprador</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Escaneado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {validaciones && validaciones.length > 0 ? (
                  validaciones.map((v: any) => (
                    <tr key={v.id} className="hover:bg-white/5">
                      <td className="px-4 py-3 text-sm font-mono">
                        {formatDate(v.fecha_hora)}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-pink-400">
                        {v.boleto_id}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          v.boleto?.tipo === 'VIP' ? 'bg-purple-500/20 text-purple-400' :
                          v.boleto?.tipo === 'Preferente' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {v.boleto?.tipo || 'General'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`flex items-center gap-1 ${
                          v.resultado === 'valido' ? 'text-green-400' :
                          v.resultado === 'ya_usado' ? 'text-amber-400' :
                          'text-red-400'
                        }`}>
                          {v.resultado === 'valido' ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          {v.resultado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {v.boleto?.orden?.usuario?.nombre || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {v.staff?.nombre || 'Sistema'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      No hay validaciones registradas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <ExportCSVButton eventoId={eventoId} validaciones={validaciones || []} />
        </div>
      </main>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  subtext,
  color
}: {
  icon: React.ReactNode
  label: string
  value: number
  subtext?: string
  color: string
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <div className={`mb-2 ${color}`}>
        {icon}
      </div>
      <p className="text-3xl font-black text-white mb-1">{value}</p>
      <p className="text-sm text-gray-400">{label}</p>
      {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
    </div>
  )
}

async function fetchStats(eventoId: string) {
  try {
    const supabaseAdmin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: evento } = await supabaseAdmin
      .from('evento')
      .select('id, titulo, fecha, ubicacion, capacidad')
      .eq('id', eventoId)
      .single()

    const { data: boletos } = await supabaseAdmin
      .from('boleto')
      .select('estado')
      .eq('evento_id', eventoId)

    const totalVendidos = boletos?.filter(b => b.estado === 'vendido' || b.estado === 'usado').length || 0
    const totalUsados = boletos?.filter(b => b.estado === 'usado').length || 0
    const asistenciaPorcentaje = totalVendidos > 0
      ? Math.round((totalUsados / totalVendidos) * 100 * 10) / 10
      : 0

    const { data: validaciones } = await supabaseAdmin
      .from('validacion')
      .select('resultado')
      .in('boleto_id',
        (await supabaseAdmin.from('boleto').select('id').eq('evento_id', eventoId)).data?.map(b => b.id) || []
      )

    return {
      data: {
        evento,
        boletos: {
          total_vendidos: totalVendidos,
          total_usados: totalUsados,
          total_restantes: totalVendidos - totalUsados,
          asistencia_porcentaje: asistenciaPorcentaje
        },
        resumen_validaciones: {
          total_intentos: validaciones?.length || 0,
          validos: validaciones?.filter(v => v.resultado === 'valido').length || 0,
          invalidos: validaciones?.filter(v => v.resultado === 'invalido').length || 0,
          ya_usados: validaciones?.filter(v => v.resultado === 'ya_usado').length || 0
        }
      }
    }
  } catch (error) {
    console.error('Error fetching stats:', error)
    return { data: null }
  }
}

async function fetchValidaciones(eventoId: string) {
  try {
    const supabaseAdmin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Obtener IDs de boletos del evento
    const { data: boletosEvento } = await supabaseAdmin
      .from('boleto')
      .select('id, orden_id, tipo')
      .eq('evento_id', eventoId);
    
    const boletoIds = boletosEvento?.map(b => b.id) || [];
    if (boletoIds.length === 0) return { data: [] };

    // 2. Obtener validaciones básicas por evento_id
    const { data: rawValidaciones } = await supabaseAdmin
      .from('validacion')
      .select('id, boleto_id, resultado, motivo, ip_dispositivo, fecha_hora, escaneado_por')
      .eq('evento_id', eventoId)
      .order('fecha_hora', { ascending: false })
      .limit(100);

    if (!rawValidaciones) return { data: [] };

    // 3. Obtener nombres de staff
    const staffIds = Array.from(new Set(rawValidaciones.map(v => v.escaneado_por).filter(id => !!id)));
    const { data: staffData } = await supabaseAdmin
      .from('usuario')
      .select('id, nombre')
      .in('id', staffIds);

    // 4. Obtener información de las órdenes (compradores)
    const ordenIds = Array.from(new Set((boletosEvento || []).map(b => b.orden_id).filter(id => !!id)));
    const { data: ordenesData } = await supabaseAdmin
      .from('orden')
      .select('id, usuario_id')
      .in('id', ordenIds);
    
    const usuarioIds = Array.from(new Set(ordenesData?.map(o => o.usuario_id).filter(id => !!id) || []));
    const { data: usuariosData } = await supabaseAdmin
      .from('usuario')
      .select('id, nombre')
      .in('id', usuarioIds);

    // 5. Mapear todo manualmente
    const validaciones = rawValidaciones.map(v => {
      const staff = staffData?.find(s => s.id === v.escaneado_por);
      const boletoInfo = (boletosEvento || []).find(b => b.id === v.boleto_id);
      const orden = ordenesData?.find(o => o.id === boletoInfo?.orden_id);
      const comprador = usuariosData?.find(u => u.id === orden?.usuario_id);
      
      return {
        ...v,
        staff: staff ? { nombre: staff.nombre } : null,
        boleto: {
          tipo: boletoInfo?.tipo || 'General',
          orden: comprador ? { usuario: { nombre: comprador.nombre } } : null
        }
      };
    });

    return { data: validaciones };
  } catch (error) {
    console.error('Error fetching validaciones:', error);
    return { data: [] };
  }
}


