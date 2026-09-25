'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import SignaturePadLib from 'signature_pad'

interface SignaturePadProps {
  inputId: string
  onSignatureChange: (dataUrl: string | null) => void
  ariaDescribedBy?: string
}

export default function SignaturePad({ inputId, onSignatureChange, ariaDescribedBy }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const signaturePadRef = useRef<SignaturePadLib | null>(null)
  const onSignatureChangeRef = useRef(onSignatureChange)
  const [typedSignature, setTypedSignature] = useState('')
  const [textError, setTextError] = useState<string | null>(null)

  useEffect(() => {
    onSignatureChangeRef.current = onSignatureChange
  }, [onSignatureChange])

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const existingStrokes = signaturePadRef.current && !signaturePadRef.current.isEmpty()
      ? signaturePadRef.current.toData()
      : null

    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    const container = canvas.parentElement
    if (!container) return

    const containerStyles = window.getComputedStyle(container)
    const horizontalPadding = Number.parseFloat(containerStyles.paddingLeft || '0')
      + Number.parseFloat(containerStyles.paddingRight || '0')
    const nextWidth = Math.max(container.clientWidth - horizontalPadding, 0)

    canvas.width = nextWidth * ratio
    canvas.height = 140 * ratio
    canvas.style.width = '100%'
    canvas.style.height = '140px'

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(ratio, ratio)
    }

    if (signaturePadRef.current) {
      signaturePadRef.current.clear()
      if (existingStrokes && existingStrokes.length > 0) {
        signaturePadRef.current.fromData(existingStrokes)
      }
    }
  }, [])

  const applyTypedSignature = useCallback(() => {
    const canvas = canvasRef.current
    const signaturePad = signaturePadRef.current
    const value = typedSignature.trim()

    if (!canvas || !signaturePad) {
      return
    }

    if (!value) {
      setTextError('Ketik nama terlebih dahulu untuk membuat tanda tangan teks.')
      return
    }

    const context = canvas.getContext('2d')

    if (!context) {
      return
    }

    signaturePad.clear()
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#111827'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.font = 'italic 28px Georgia, serif'
    context.fillText(value, canvas.width / 2, canvas.height / 2)
    setTextError(null)
    onSignatureChangeRef.current(canvas.toDataURL('image/png'))
  }, [typedSignature])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    signaturePadRef.current = new SignaturePadLib(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: 'rgb(0, 0, 0)',
      minWidth: 1,
      maxWidth: 2.5,
    })

    const handleEndStroke = () => {
      if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
        onSignatureChangeRef.current(signaturePadRef.current.toDataURL('image/png'))
      }
    }

    signaturePadRef.current.addEventListener('endStroke', handleEndStroke)

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (signaturePadRef.current) {
        signaturePadRef.current.removeEventListener('endStroke', handleEndStroke)
        signaturePadRef.current.off()
      }
    }
  }, [resizeCanvas])

  const handleClear = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear()
      onSignatureChangeRef.current(null)
    }
    setTypedSignature('')
    setTextError(null)
  }

  return (
    <div className="signature-container">
      <div className="signature-pad-surface">
        <canvas
          ref={canvasRef}
          className="signature-canvas"
          aria-label="Area tanda tangan"
          aria-describedby={ariaDescribedBy}
        />
      </div>
      <div className="signature-actions">
        <button type="button" onClick={handleClear} className="signature-clear-btn">
          Hapus Tanda Tangan
        </button>
      </div>
      <div className="signature-fallback">
        <label className="signature-fallback-label" htmlFor={inputId}>
          Atau gunakan tanda tangan teks
        </label>
        <div className="signature-fallback-controls">
          <input
            id={inputId}
            type="text"
            value={typedSignature}
            onChange={(event) => {
              setTypedSignature(event.target.value)
              if (textError) {
                setTextError(null)
              }
            }}
            className="signature-fallback-input"
            placeholder="Ketik nama lengkap"
            aria-describedby={ariaDescribedBy}
          />
          <button type="button" onClick={applyTypedSignature} className="signature-apply-btn">
            Gunakan
          </button>
        </div>
        {textError && <p className="field-error">{textError}</p>}
      </div>
    </div>
  )
}
