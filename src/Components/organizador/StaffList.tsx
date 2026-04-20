'use client'

import { useState } from 'react'
import { Users, Trash2, Check, X, Loader2, Shield, FileText } from 'lucide-react'

interface StaffMember {
  id: string
  usuario_id: string
  nombre_staff: string | null
  puede_validar: boolean
  puede_ver_reportes: boolean
  fecha_asignacion: string
  usuario?: {
    id: string
    nombre: string
    email: string
  }
}

interface StaffListProps {
  staff: StaffMember[]
  loading?: boolean
  onDelete: (staffId: string) => void
  onRefresh: () => void
  maxStaff: number
}

export default function StaffList({
  staff,
  loading = false,
  onDelete,
  onRefresh,
  maxStaff
}: StaffListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const handleDelete = async (staffId: string) => {
    setDeletingId(staffId)
    try {
      await onDelete(staffId)
    } finally {
      setDeletingId(null)
      setConfirmDelete(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-pink-400" />
          <h3 className="font-bold text-white">Staff del Evento</h3>
        </div>
        <span className="text-sm text-gray-400">
          {staff.length}/{maxStaff}
        </span>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {staff.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No hay staff asignado a este evento</p>
            <p className="text-sm mt-1">Invita a alguien para que te ayude a validar</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {staff.map((member) => (
              <div
                key={member.id}
                className="p-4 hover:bg-white/5 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white truncate">
                        {member.nombre_staff || member.usuario?.nombre || 'Sin nombre'}
                      </p>
                    </div>
                    <p className="text-sm text-gray-400 truncate">
                      {member.usuario?.email || 'Sin email'}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1 text-xs">
                        {member.puede_validar ? (
                          <div className="flex items-center gap-1 text-green-400">
                            <Shield className="w-3 h-3" />
                            <span>Validar</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-gray-500">
                            <X className="w-3 h-3" />
                            <span>Validar</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        {member.puede_ver_reportes ? (
                          <div className="flex items-center gap-1 text-amber-400">
                            <FileText className="w-3 h-3" />
                            <span>Reportes</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-gray-500">
                            <X className="w-3 h-3" />
                            <span>Reportes</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Asignado: {formatDate(member.fecha_asignacion)}
                    </p>
                  </div>

                  <div>
                    {confirmDelete === member.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(member.id)}
                          disabled={deletingId === member.id}
                          className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition disabled:opacity-50"
                        >
                          {deletingId === member.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="p-2 rounded-lg bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(member.id)}
                        className="p-2 rounded-lg hover:bg-red-500/20 transition group"
                        title="Eliminar staff"
                      >
                        <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

