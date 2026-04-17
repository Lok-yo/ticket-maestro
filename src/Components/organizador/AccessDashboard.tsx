'use client'

import { useState, useEffect, useCallback } from 'react'
import { Ticket, Users, TrendingUp, Clock, Keyboard, Loader2, Camera } from 'lucide-react'
import type { EventoStats } from '@/types'
import RecentEntries from './RecentEntries'
import QRScanner from './QRScanner'

interface AccessDashboardProps {
  eventoId: string
  evento: {
    titulo: string
    fecha: string
    ubicacion: string
  }
}

const REFRESH_INTERVAL = 10000

export default function AccessDashboard({ eventoId, evento }: AccessDashboardProps) {
  const [stats, setStats] = useState<EventoStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [showManualInput, setShowManualInput] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [manualId, setManualId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/organizador/eventos/${eventoId}/stats`)
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Error al cargar estadísticas')
      }
      
      setStats(data.data)
      setLastUpdate(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      setError('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [eventoId])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, REFRESH_INTERVAL)
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStats()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchStats])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualId.trim()) return

    const ticketId = manualId.trim().toUpperCase()
    window.location.href = `/verify/${ticketId}?event=${eventoId}`
    setManualId('')
    setShowManualInput(false)
  }

  const handleQRScan = (ticketId: string) => {
    window.location.href = `/verify/${ticketId}?event=${eventoId}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getAsistenciaColor = (porcentaje: number) => {
    if (porcentaje >= 80) return 'text-green-400'
    if (porcentaje >= 50) return 'text-amber-400'
    return 'text-pink-400'
  }

  return (
    <div className="space-y-6">
      <QRScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleQRScan}
      />

      <div className="text-center mb-8">
        <h1 className="text-3xl font-black mb-2">{evento.titulo}</h1>
        <div className="flex items-center justify-center gap-4 text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {formatDate(evento.fecha)}
          </span>
        </div>
      </div>

      {loading && !stats ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
        </div>
      ) : error && !stats ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
          <p className="text-red-400">{error}</p>
          <button
            onClick={fetchStats}
            className="mt-4 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition"
          >
            Reintentar
          </button>
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<Ticket className="w-6 h-6" />}
              label="Vendidos"
              value={stats.boletos.total_vendidos}
              color="text-pink-400"
            />
            <StatCard
              icon={<Users className="w-6 h-6" />}
              label="Usados"
              value={stats.boletos.total_usados}
              color="text-green-400"
            />
            <StatCard
              icon={<TrendingUp className="w-6 h-6" />}
              label="Restantes"
              value={stats.boletos.total_restantes}
              color="text-amber-400"
            />
            <StatCard
              icon={<TrendingUp className="w-6 h-6" />}
              label="Asistencia"
              value={`${stats.boletos.asistencia_porcentaje}%`}
              color={getAsistenciaColor(stats.boletos.asistencia_porcentaje)}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-[#1a1625] to-[#110e1b] border border-pink-500/30 rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4 text-center">Escanear Boleto</h3>
                
                <div className="space-y-3">
                  <button
                    onClick={() => setShowScanner(true)}
                    className="w-full py-4 rounded-xl bg-pink-500 text-white font-bold text-lg hover:bg-pink-400 transition flex items-center justify-center gap-2"
                  >
                    <Camera className="w-6 h-6" />
                    Escanear QR con Cámara
                  </button>

                  <button
                    onClick={() => setShowManualInput(!showManualInput)}
                    className="w-full py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition flex items-center justify-center gap-2"
                  >
                    <Keyboard className="w-5 h-5" />
                    Escribir ID del Boleto
                  </button>

                  {showManualInput && (
                    <form onSubmit={handleManualSubmit} className="space-y-3 pt-2">
                      <input
                        type="text"
                        value={manualId}
                        onChange={(e) => setManualId(e.target.value)}
                        placeholder="BOL-XXXXXXXX"
                        className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white text-center font-mono text-lg placeholder-gray-500 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition"
                      />
                      <button
                        type="submit"
                        disabled={submitting || !manualId.trim()}
                        className="w-full py-3 rounded-xl bg-green-500 text-white font-bold hover:bg-green-400 transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {submitting ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          'Validar Boleto'
                        )}
                      </button>
                    </form>
                  )}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <h4 className="font-bold mb-3 text-gray-300">Resumen de Hoy</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {stats.resumen_validaciones.total_intentos}
                    </p>
                    <p className="text-xs text-gray-400">Intentos</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-400">
                      {stats.resumen_validaciones.validos}
                    </p>
                    <p className="text-xs text-gray-400">Válidos</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-400">
                      {(stats.resumen_validaciones.invalidos || 0) + (stats.resumen_validaciones.ya_usados || 0)}
                    </p>
                    <p className="text-xs text-gray-400">Rechazados</p>
                  </div>
                </div>
              </div>
            </div>

            <RecentEntries
              entries={stats.ultimos_ingresos.map(v => ({
                boleto_id: v.boleto_id,
                comprador: 'Boleto #' + v.boleto_id.split('-')[1],
                tipo: v.boleto?.tipo || 'General',
                hora: new Date(v.fecha_hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
                resultado: v.resultado as 'valido' | 'ya_usado' | 'invalido'
              }))}
              loading={loading}
              onRefresh={fetchStats}
              lastUpdate={lastUpdate}
            />
          </div>
        </>
      ) : null}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  color
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  color: string
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <div className={`mb-2 ${color}`}>
        {icon}
      </div>
      <p className="text-3xl font-black text-white mb-1">{value}</p>
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  )
}
