'use client'

import { Download } from 'lucide-react'

interface ExportCSVButtonProps {
  eventoId: string
  validaciones: any[]
}

export default function ExportCSVButton({ eventoId, validaciones }: ExportCSVButtonProps) {
  const exportToCSV = () => {
    const headers = ['Fecha/Hora', 'Boleto ID', 'Tipo', 'Resultado', 'Comprador', 'Nombre del Staff']
    const rows = validaciones.map(v => [
      new Date(v.fecha_hora).toLocaleString('es-MX'),
      v.boleto_id,
      v.boleto?.tipo || 'General',
      v.resultado,
      v.boleto?.orden?.usuario?.nombre || 'N/A',
      v.staff?.nombre || 'Sistema'
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell || ''}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `reporte-evento-${eventoId}-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <button
      onClick={exportToCSV}
      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-green-500 text-white font-bold hover:bg-green-400 transition"
    >
      <Download className="w-5 h-5" />
      Exportar CSV
    </button>
  )
}

