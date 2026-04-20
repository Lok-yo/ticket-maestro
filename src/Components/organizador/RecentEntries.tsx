'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react'

interface RecentEntry {
  boleto_id: string
  comprador: string
  tipo: string
  hora: string
  resultado?: 'valido' | 'ya_usado' | 'invalido'
}

interface RecentEntriesProps {
  entries: RecentEntry[]
  loading?: boolean
  onRefresh?: () => void
  lastUpdate?: string
}

export default function RecentEntries({
  entries,
  loading = false,
  onRefresh,
  lastUpdate
}: RecentEntriesProps) {
  const getTipoColor = (tipo: string) => {
    switch (tipo?.toLowerCase()) {
      case 'vip':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'preferente':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      case 'general':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-pink-400" />
          <h3 className="font-bold text-white">Últimos Ingresos</h3>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-xs text-gray-400">
              Actualizado: {lastUpdate}
            </span>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-white/10 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {entries.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No hay ingresos registrados aún</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {entries.map((entry, index) => (
              <div
                key={entry.boleto_id + index}
                className="p-4 flex items-center justify-between hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-gray-400 text-sm font-mono">{entry.hora}</p>
                  </div>
                  <div>
                    <p className="font-medium text-white">{entry.comprador || 'Anónimo'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${getTipoColor(entry.tipo)}`}>
                        {entry.tipo || 'General'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {entry.resultado === 'valido' && (
                    <div className="flex items-center gap-1 text-green-400">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm font-medium">✓</span>
                    </div>
                  )}
                  {(entry.resultado === 'ya_usado' || entry.resultado === 'invalido') && (
                    <div className="flex items-center gap-1 text-red-400">
                      <XCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">
                        {entry.resultado === 'ya_usado' ? 'ya usado' : 'inválido'}
                      </span>
                    </div>
                  )}
                  {!entry.resultado && (
                    <div className="flex items-center gap-1 text-green-400">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm font-medium">✓</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

