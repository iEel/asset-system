"use client"

import { useEffect, useRef, useState } from "react"
import { RotateCcw } from "lucide-react"

export function SignaturePad({
  label,
  helper,
  clearLabel,
  disabled,
  onChange,
}: {
  label: string
  helper: string
  clearLabel: string
  disabled?: boolean
  onChange: (dataUrl: string | null) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const [hasSignature, setHasSignature] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function resizeCanvas() {
      if (!canvas) return
      const context = canvas.getContext("2d")
      if (!context) return

      const ratio = window.devicePixelRatio || 1
      const { width } = canvas.getBoundingClientRect()
      const height = 180
      canvas.width = Math.max(1, Math.floor(width * ratio))
      canvas.height = Math.floor(height * ratio)
      canvas.style.height = `${height}px`
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.lineWidth = 2
      context.lineCap = "round"
      context.lineJoin = "round"
      context.strokeStyle = "#0f172a"
      context.fillStyle = "#ffffff"
      context.fillRect(0, 0, width, height)
    }

    resizeCanvas()
    const observer = new ResizeObserver(resizeCanvas)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  function getPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    if (!canvas || !context) return

    drawingRef.current = true
    canvas.setPointerCapture(event.pointerId)
    const point = getPoint(event)
    context.beginPath()
    context.moveTo(point.x, point.y)
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || disabled) return
    const context = canvasRef.current?.getContext("2d")
    if (!context) return

    const point = getPoint(event)
    context.lineTo(point.x, point.y)
    context.stroke()
    if (!hasSignature) setHasSignature(true)
  }

  function stopDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    drawingRef.current = false
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.releasePointerCapture(event.pointerId)
    onChange(canvas.toDataURL("image/png"))
  }

  function clearSignature() {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    if (!canvas || !context) return

    const rect = canvas.getBoundingClientRect()
    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, rect.width, rect.height)
    setHasSignature(false)
    onChange(null)
  }

  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-foreground">{label}</div>
          <div className="mt-1 text-xs text-muted-foreground">{helper}</div>
        </div>
        <button
          type="button"
          onClick={clearSignature}
          disabled={disabled || !hasSignature}
          className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-surface px-2 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {clearLabel}
        </button>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerCancel={stopDrawing}
        className="block w-full touch-none rounded-md border border-dashed border-border bg-white"
      />
    </div>
  )
}
