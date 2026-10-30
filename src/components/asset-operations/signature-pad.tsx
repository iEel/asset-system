"use client"

import { useEffect, useId, useRef, useState } from "react"
import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { shouldDropSignature, signaturePadHeight } from "@/lib/signature-pad-size"

export function SignaturePad({
  label,
  helper,
  clearLabel,
  disabled,
  tall = false,
  onChange,
}: {
  label: string
  helper: string
  clearLabel: string
  disabled?: boolean
  /** The phone's sign step: a taller pad below lg (group 3 spec §7.4). */
  tall?: boolean
  onChange: (dataUrl: string | null) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  // The latest onChange, for the resize below; and whether the canvas holds a stroke.
  const onChangeRef = useRef(onChange)
  const drawnRef = useRef(false)
  // The drawing last reported, redrawn after a visible resize; and the canvas's last CSS width.
  const dataUrlRef = useRef<string | null>(null)
  const widthRef = useRef(0)
  const [hasSignature, setHasSignature] = useState(false)
  const labelId = useId()
  const helperId = useId()

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function resizeCanvas() {
      if (!canvas) return
      const context = canvas.getContext("2d")
      if (!context) return

      const ratio = window.devicePixelRatio || 1
      const { width } = canvas.getBoundingClientRect()
      const height = signaturePadHeight(tall, window.innerWidth, window.innerHeight)
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
      const previousWidth = widthRef.current
      widthRef.current = width
      if (!drawnRef.current) return
      // A pad that becomes hidden (going back from the phone's step 3) drops its drawing: what is saved is what the pad
      // shows. Any other width change (a scrollbar, zoom, a window resize) redraws the drawing scaled to the new size
      // and keeps the value it reported (final review M1).
      if (shouldDropSignature(previousWidth, width)) {
        drawnRef.current = false
        dataUrlRef.current = null
        setHasSignature(false)
        onChangeRef.current(null)
        return
      }
      const dataUrl = dataUrlRef.current
      if (!dataUrl || width === 0) return
      const image = new Image()
      image.onload = () => {
        // A later resize or a clear since: only the drawing still reported is painted.
        if (dataUrlRef.current === dataUrl) context.drawImage(image, 0, 0, width, height)
      }
      image.src = dataUrl
    }

    resizeCanvas()
    const observer = new ResizeObserver(resizeCanvas)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [tall])

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
    drawnRef.current = true
    if (!hasSignature) setHasSignature(true)
  }

  function stopDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    drawingRef.current = false
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.releasePointerCapture(event.pointerId)
    const dataUrl = canvas.toDataURL("image/png")
    dataUrlRef.current = dataUrl
    onChange(dataUrl)
  }

  function clearSignature() {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    if (!canvas || !context) return

    const rect = canvas.getBoundingClientRect()
    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, rect.width, rect.height)
    drawnRef.current = false
    dataUrlRef.current = null
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
