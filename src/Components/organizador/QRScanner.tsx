'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { X, Camera, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface QRScannerProps {
  isOpen: boolean
  onClose: () => void
  onScan: (ticketId: string) => void
}

export default function QRScanner({ isOpen, onClose, onScan }: QRScannerProps) {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [lastScanned, setLastScanned] = useState<{raw: string, parsed: string | null} | null>(null)
  const [showDebug, setShowDebug] = useState(false)
  const [scanDetected, setScanDetected] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isProcessingRef = useRef(false)

  useEffect(() => {
    if (!isOpen) return

    const startScanner = async () => {
      try {
        setError('')
        setScanning(true)
        setLastScanned(null)
        setScanDetected(false)
        isProcessingRef.current = false

        const scanner = new Html5Qrcode('qr-reader')
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 5,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (decodedText) => {
            if (!isProcessingRef.current) {
              handleScan(decodedText)
            }
          },
          () => {}
        )
      } catch (err: any) {
        console.error('Error al iniciar scanner:', err)
        setScanning(false)
        if (err.message?.includes('permission')) {
          setError('Permiso de cámara denegado. Por favor permite el acceso a la cámara.')
        } else if (err.message?.includes('NotFoundError')) {
          setError('No se encontró cámara. Asegúrate de tener una cámara disponible.')
        } else {
          setError('Error al iniciar la cámara: ' + (err.message || 'Error desconocido'))
        }
      }
    }

    startScanner()

    return () => {
      stopScanner()
    }
  }, [isOpen])

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch (e) {
        console.error('Error al detener scanner:', e)
      }
    }
    setScanning(false)
  }

  const parseTicketId = (rawText: string): string | null => {
    const cleanText = rawText.trim()

    try {
      const decoded = atob(cleanText)
      const parsed = JSON.parse(decoded)
      if (parsed.ticketId) {
        return parsed.ticketId
      }
    } catch {}

    const urlMatch = cleanText.match(/verify\/([A-Z0-9-]+)/i)
    if (urlMatch) {
      return urlMatch[1].toUpperCase()
    }

    const bolMatch = cleanText.match(/\b(BOL-[A-Z0-9]+)\b/i)
    if (bolMatch) {
      return bolMatch[1].toUpperCase()
    }

    const ticketMatch = cleanText.match(/\b([A-Z]{3}-[A-Z0-9]+)\b/i)
    if (ticketMatch) {
      return ticketMatch[1].toUpperCase()
    }

    if (/^[A-Z0-9]{8,15}$/i.test(cleanText)) {
      return cleanText.toUpperCase()
    }

    if (/^\d{6,20}$/.test(cleanText)) {
      return cleanText
    }

    return null
  }

  const handleScan = async (decodedText: string) => {
    if (isProcessingRef.current) return
    
    isProcessingRef.current = true
    setScanDetected(true)

    const parsed = parseTicketId(decodedText)
    setLastScanned({ raw: decodedText, parsed })
    setShowDebug(true)

    await stopScanner()

    if (parsed) {
      onScan(parsed)
      setTimeout(() => {
        onClose()
      }, 1000)
    }
  }

  const handleClose = async () => {
    await stopScanner()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose} />
      
      <div className="relative bg-[#1a1625] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
              <Camera className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Escanear QR</h2>
              <p className="text-xs text-gray-400">Apunta la cámara al código QR</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-4">
          <div 
            id="qr-reader" 
            ref={containerRef}
            className="w-full rounded-xl overflow-hidden bg-black"
            style={{ minHeight: '300px' }}
          />

          {scanning && !lastScanned && (
            <div className="mt-4 flex items-center justify-center gap-2 text-pink-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Buscando código QR...</span>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
              <div className="flex items-start gap-2">
                <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Error</p>
                  <p className="text-red-400/80">{error}</p>
                </div>
              </div>
            </div>
          )}

          {lastScanned && (
            <div className="mt-4 space-y-3">
              {lastScanned.parsed ? (
                <div className="p-4 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 shrink-0" />
                    <p className="font-bold">¡Boleto detectado!</p>
                  </div>
                  <p className="text-2xl font-mono font-bold text-center mt-2">{lastScanned.parsed}</p>
                  <p className="text-xs text-center mt-2 text-green-400/60">Abriendo validación...</p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="font-bold">Código detectado pero no reconocido</p>
                  </div>
                  <p className="text-xs mt-2 opacity-60">Este código no parece ser un boleto válido</p>
                </div>
              )}

              {showDebug && (
                <details className="bg-black/30 rounded-lg p-3">
                  <summary className="text-xs text-gray-400 cursor-pointer">Ver datos crudos</summary>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-gray-500">Raw ({lastScanned.raw.length} chars):</p>
                    <code className="block text-xs text-pink-400 break-all bg-black/50 p-2 rounded">
                      {lastScanned.raw.substring(0, 200)}{lastScanned.raw.length > 200 ? '...' : ''}
                    </code>
                    <p className="text-xs text-gray-500 mt-2">Parsed:</p>
                    <code className="block text-xs text-green-400 bg-black/50 p-2 rounded">
                      {lastScanned.parsed || 'No se pudo parsear'}
                    </code>
                  </div>
                </details>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/10 bg-black/20">
          <p className="text-center text-xs text-gray-400">
            Mantén el código QR firme y bien iluminado
          </p>
        </div>
      </div>
    </div>
  )
}
