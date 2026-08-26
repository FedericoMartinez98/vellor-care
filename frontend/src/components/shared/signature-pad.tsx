'use client'

import * as React from 'react'
import { Eraser } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface SignaturePadProps {
  value?: string
  onChange: (dataUrl: string) => void
  disabled?: boolean
  height?: number
}

function SignaturePad({ value, onChange, disabled = false, height = 160 }: SignaturePadProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const isDrawingRef = React.useRef(false)
  /** Tamanho em pixels CSS (o buffer real é multiplicado pelo devicePixelRatio). */
  const sizeRef = React.useRef({ width: 0, height })
  /** Última imagem desenhada — usada para repintar depois de um resize. */
  const snapshotRef = React.useRef(value ?? '')

  const [hasSignature, setHasSignature] = React.useState(Boolean(value))

  const drawSnapshot = React.useCallback((dataUrl: string) => {
    const canvas = canvasRef.current
    if (!canvas || dataUrl.length === 0) return

    const image = new window.Image()
    image.onload = () => {
      const context = canvas.getContext('2d')
      if (!context) return
      const { width, height: cssHeight } = sizeRef.current
      context.clearRect(0, 0, width, cssHeight)
      context.drawImage(image, 0, 0, width, cssHeight)
    }
    image.src = dataUrl
  }, [])

  const setupCanvas = React.useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const width = container.clientWidth
    if (width === 0) return

    // Sem multiplicar pelo devicePixelRatio o traço sai borrado em telas retina.
    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const context = canvas.getContext('2d')
    if (!context) return

    context.setTransform(1, 0, 0, 1, 0, 0)
    context.scale(ratio, ratio)
    context.lineWidth = 2
    context.lineCap = 'round'
    context.lineJoin = 'round'

    sizeRef.current = { width, height }

    // Redimensionar zera o buffer: repinta a assinatura já existente.
    drawSnapshot(snapshotRef.current)
  }, [drawSnapshot, height])

  React.useEffect(() => {
    setupCanvas()

    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(() => setupCanvas())
    observer.observe(container)
    return () => observer.disconnect()
  }, [setupCanvas])

  React.useEffect(() => {
    const next = value ?? ''
    if (next === snapshotRef.current) return

    snapshotRef.current = next
    setHasSignature(next.length > 0)

    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!context) return

    context.clearRect(0, 0, sizeRef.current.width, sizeRef.current.height)
    if (next.length > 0) drawSnapshot(next)
  }, [drawSnapshot, value])

  function pointOf(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return

    const canvas = event.currentTarget
    const context = canvas.getContext('2d')
    if (!context) return

    // Lê a cor a cada traço para acompanhar a troca de tema claro/escuro.
    context.strokeStyle = window.getComputedStyle(canvas).color
    canvas.setPointerCapture(event.pointerId)
    isDrawingRef.current = true

    const point = pointOf(event)
    context.beginPath()
    context.moveTo(point.x, point.y)
    // Um toque curto (sem arrastar) precisa deixar marca.
    context.lineTo(point.x + 0.01, point.y)
    context.stroke()
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return

    const context = event.currentTarget.getContext('2d')
    if (!context) return

    const point = pointOf(event)
    context.lineTo(point.x, point.y)
    context.stroke()
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false

    const canvas = event.currentTarget
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)

    const dataUrl = canvas.toDataURL('image/png')
    snapshotRef.current = dataUrl
    setHasSignature(true)
    onChange(dataUrl)
  }

  function handleClear() {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (context) {
      context.clearRect(0, 0, sizeRef.current.width, sizeRef.current.height)
    }

    isDrawingRef.current = false
    snapshotRef.current = ''
    setHasSignature(false)
    onChange('')
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Assine no quadro abaixo usando o mouse, a caneta ou o dedo.
        </p>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={disabled || !hasSignature}
        >
          <Eraser aria-hidden="true" className="size-4" />
          Limpar
        </Button>
      </div>

      <div
        ref={containerRef}
        className={cn(
          'relative overflow-hidden rounded-xl border border-dashed border-border bg-muted/30',
          disabled && 'opacity-60',
        )}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 bottom-8 h-px bg-border"
        />

        <canvas
          ref={canvasRef}
          aria-label="Área de assinatura do técnico"
          className={cn(
            'relative block w-full touch-none text-foreground',
            disabled ? 'cursor-not-allowed' : 'cursor-crosshair',
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerLeave={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        />
      </div>
    </div>
  )
}

export { SignaturePad }
