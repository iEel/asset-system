"use client"

import { useEffect, useId, useRef, useState } from "react"
import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

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
  const labelId = useId()
  const helperId = useId()

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
    <div role="group" aria-labelledby={labelId} aria-describedby={helperId} className="rounded-md border border-border bg-background p-3">
      <div className="mb-3 min-w-0">
        <div id={labelId} className="text-sm font-medium text-foreground">{label}</div>
        <p id={helperId} className="mt-1 text-meta text-faint-foreground">{helper}</p>
      </div>
      {/* The canvas is the forced-light scope, white paper on a dark page; the group around it follows the theme (dark mode P-R4). */}
      <canvas
        ref={canvasRef}
        data-theme="light"
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerCancel={stopDrawing}
        className="block w-full touch-none rounded-md border border-dashed border-input bg-white"
      />
      <div className="mt-2 flex justify-end">
        <Button variant="ghost" size="sm" onClick={clearSignature} disabled={disabled || !hasSignature}>
          <RotateCcw aria-hidden="true" />
          {clearLabel}
        </Button>
      </div>
    </div>
  )
}
