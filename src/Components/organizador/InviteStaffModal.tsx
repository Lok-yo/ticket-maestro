'use client'

import { useState } from 'react'
import { X, UserPlus, Loader2, Check, FileText } from 'lucide-react'

interface InviteStaffModalProps {
  isOpen: boolean
  onClose: () => void
  eventoId: string
  onStaffAdded: () => void
  currentCount: number
  maxStaff: number
}

export default function InviteStaffModal({
  isOpen,
  onClose,
  eventoId,
  onStaffAdded,
  currentCount,
  maxStaff
}: InviteStaffModalProps) {
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [puedeValidar, setPuedeValidar] = useState(true)
  const [puedeVerReportes, setPuedeVerReportes] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!isOpen) return null

  const canAddMore = currentCount < maxStaff

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email.trim()) {
      setError('El email es requerido')
      return
    }

    if (!canAddMore) {
      setError(`Máximo ${maxStaff} staff por evento`)
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`/api/organizador/eventos/${eventoId}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          nombre_staff: nombre.trim() || undefined,
          puede_validar: puedeValidar,
          puede_ver_reportes: puedeVerReportes
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al asignar staff')
        return
      }

      setSuccess('Staff asignado correctamente')
      setEmail('')
      setNombre('')
      setPuedeValidar(true)
      setPuedeVerReportes(false)
      
      setTimeout(() => {
        onStaffAdded()
        onClose()
      }, 1500)
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative bg-[#1a1625] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Invitar Staff</h2>
              <p className="text-sm text-gray-400">{currentCount}/{maxStaff} asignados</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email del staff *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@email.com"
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nombre (opcional)
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del staff"
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition disabled:opacity-50"
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={puedeValidar}
                onChange={(e) => setPuedeValidar(e.target.checked)}
                disabled={loading}
                className="w-5 h-5 rounded border-white/20 bg-black/30 text-pink-500 focus:ring-pink-500"
              />
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-pink-400" />
                <span className="text-gray-300">Puede validar boletos</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={puedeVerReportes}
                onChange={(e) => setPuedeVerReportes(e.target.checked)}
                disabled={loading}
                className="w-5 h-5 rounded border-white/20 bg-black/30 text-pink-500 focus:ring-pink-500"
              />
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span className="text-gray-300">Puede ver reportes</span>
              </div>
            </label>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 text-sm flex items-center gap-2">
              <Check className="w-4 h-4" />
              {success}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 rounded-xl border border-white/10 text-gray-300 font-medium hover:bg-white/5 transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !canAddMore}
              className="flex-1 py-3 rounded-xl bg-pink-500 text-white font-medium hover:bg-pink-400 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Asignando...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Invitar
                </>
              )}
            </button>
          </div>

          {!canAddMore && (
            <p className="text-center text-amber-400 text-sm">
              Has alcanzado el límite de {maxStaff} staff por evento
            </p>
          )}
        </form>
      </div>
    </div>
  )
}

