'use client'

import { useState, useEffect, useCallback } from 'react'
import { UserPlus, Loader2 } from 'lucide-react'
import InviteStaffModal from './InviteStaffModal'
import StaffList from './StaffList'
import type { EventoStaff } from '@/types'

interface StaffManagementProps {
  eventoId: string
}

const MAX_STAFF = 10

export default function StaffManagement({ eventoId }: StaffManagementProps) {
  const [staff, setStaff] = useState<EventoStaff[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch(`/api/organizador/eventos/${eventoId}/staff`)
      const data = await res.json()
      
      if (res.ok) {
        setStaff(data.data || [])
      }
    } catch (error) {
      console.error('Error al cargar staff:', error)
    } finally {
      setLoading(false)
    }
  }, [eventoId])

  useEffect(() => {
    fetchStaff()
  }, [fetchStaff])

  const handleDeleteStaff = async (staffId: string) => {
    const res = await fetch(`/api/organizador/eventos/${eventoId}/staff/${staffId}`, {
      method: 'DELETE'
    })

    if (res.ok) {
      setStaff(prev => prev.filter(s => s.id !== staffId))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Gestión de Staff</h2>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-500 text-white font-medium hover:bg-pink-400 transition"
        >
          <UserPlus className="w-4 h-4" />
          Invitar Staff
        </button>
      </div>

      <StaffList
        staff={staff}
        onDelete={handleDeleteStaff}
        onRefresh={fetchStaff}
        maxStaff={MAX_STAFF}
      />

      <InviteStaffModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        eventoId={eventoId}
        onStaffAdded={fetchStaff}
        currentCount={staff.length}
        maxStaff={MAX_STAFF}
      />
    </div>
  )
}

