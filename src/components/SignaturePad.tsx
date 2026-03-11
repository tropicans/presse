'use client'

import { useRef, useEffect, useCallback } from 'react'
import SignaturePadLib from 'signature_pad'

interface SignaturePadProps {
  onSignatureChange: (dataUrl: string | null) => void
}

export default function SignaturePad({ onSignatureChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const signaturePadRef = useRef<SignaturePadLib | null>(null)

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    const container = canvas.parentElement
    if (!container) return

    canvas.width = container.offsetWidth * ratio
    canvas.height = 160 * ratio
    canvas.style.width = `${container.offsetWidth}px`
    canvas.style.height = '160px'

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(ratio, ratio)
    }

    if (signaturePadRef.current) {
      signaturePadRef.current.clear()
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    signaturePadRef.current = new SignaturePadLib(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: 'rgb(0, 0, 0)',
      minWidth: 1,
      maxWidth: 2.5,
    })

    signaturePadRef.current.addEventListener('endStroke', () => {
      if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
        onSignatureChange(signaturePadRef.current.toDataURL('image/png'))
      }
    })

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (signaturePadRef.current) {
        signaturePadRef.current.off()
      }
    }
  }, [resizeCanvas, onSignatureChange])

  const handleClear = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear()
      onSignatureChange(null)
    }
  }

  return (
    <div className="signature-container">
      <canvas
        ref={canvasRef}
        className="signature-canvas"
      />
      <div className="signature-actions">
        <button type="button" onClick={handleClear} className="signature-clear-btn">
          Hapus Tanda Tangan
        </button>
      </div>
      <p className="signature-hint">Tanda tangan di area di atas</p>
    </div>
  )
}
