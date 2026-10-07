"use client"

import { useEffect, useRef, useState } from "react"
import { Flashlight, FlashlightOff, Loader2, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { AuditQrScannerOverlay } from "@/components/audit/audit-scan-panels"
import type { CameraDevice } from "@/components/audit/audit-scan-types"
import { startNativeAssetQrScanner, type NativeAssetQrScannerRuntime } from "@/lib/asset-qr-scanner"
import {
  getFallbackCameraAfterEnvironmentFailure,
  resolvePreferredCameraSelection,
  type PreferredCameraSelection,
} from "@/lib/camera-selection"
import { cn } from "@/lib/utils"

function isCameraAccessSupported() {
  return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia)
}

export function AuditScanCamera({ onDecoded, onClose }: { onDecoded: (text: string) => void; onClose: () => void }) {
  const t = useTranslations("auditScan")
  const panelRef = useRef<HTMLDivElement | null>(null)
  const scannerRef = useRef<NativeAssetQrScannerRuntime | null>(null)
  const onDecodedRef = useRef(onDecoded)
  // Messages read through a ref so a new translator object never restarts the camera.
  const textRef = useRef({ unsupported: "", notFound: "", denied: "", failed: "" })
  const [running, setRunning] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState("")
  const [torch, setTorch] = useState({ available: false, enabled: false, updating: false })
  const [zoom, setZoom] = useState({ levels: [] as number[], level: 0, updating: false })

  useEffect(() => {
    onDecodedRef.current = onDecoded
    textRef.current = {
      unsupported: t("cameraUnsupported"),
      notFound: t("cameraNotFound"),
      denied: t("cameraPermissionDenied"),
      failed: t("cameraError"),
    }
  })

  useEffect(() => {
    let cancelled = false

    async function start() {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
      if (!isCameraAccessSupported()) {
        setLoading(false)
        setErrorText(textRef.current.unsupported)
        return
      }
      try {
        const { Html5Qrcode } = await import("html5-qrcode")
        const cameras = (await Html5Qrcode.getCameras()) as CameraDevice[]
        if (cancelled) return
        if (cameras.length === 0) {
          setErrorText(textRef.current.notFound)
          return
        }
        const startWith = async (selection: PreferredCameraSelection) => {
          const scanner = await startNativeAssetQrScanner({
            readerId: "audit-qr-reader",
            cameraSelection: selection,
            stopAfterSuccess: true,
            onScanSuccess: (decodedText) => onDecodedRef.current(decodedText.trim()),
          })
          if (cancelled) {
            scanner.stop()
            return
          }
          scannerRef.current = scanner
          setTorch({ available: Boolean(scanner.torch?.isAvailable()), enabled: Boolean(scanner.torch?.isEnabled()), updating: false })
          const levels = scanner.zoom?.isAvailable() ? scanner.zoom.getSupportedLevels() : []
          setZoom({ levels, level: levels.length > 0 && scanner.zoom ? scanner.zoom.getZoom() : 0, updating: false })
          setRunning(true)
        }
        const selection = resolvePreferredCameraSelection(cameras, undefined)
        try {
          await startWith(selection)
        } catch (startError) {
          const fallback = getFallbackCameraAfterEnvironmentFailure(selection, cameras)
          if (!fallback) throw startError
          await startWith(resolvePreferredCameraSelection([fallback], fallback.id))
        }
      } catch (error) {
        if (cancelled) return
        const denied = error instanceof Error && (error.name === "NotAllowedError" || error.name === "SecurityError")
        setErrorText(denied ? textRef.current.denied : error instanceof Error ? error.message : textRef.current.failed)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    const timer = window.setTimeout(() => {
      void start()
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      const scanner = scannerRef.current
      scannerRef.current = null
      if (scanner) {
        try {
          scanner.stop()
        } catch {
          // The browser may already have stopped the track.
        }
      }
    }
  }, [])

  async function toggleTorch() {
    const control = scannerRef.current?.torch
    if (!control?.isAvailable()) {
      toast.warning(t("torchUnsupported"))
      return
    }
    setTorch((current) => ({ ...current, updating: true }))
    const next = !torch.enabled
    const applied = await control.setEnabled(next)
    setTorch({ available: applied, enabled: applied ? next : false, updating: false })
    if (!applied) toast.warning(t("torchUnsupported"))
  }

  async function changeZoom(level: number) {
    const control = scannerRef.current?.zoom
    if (!control?.isAvailable()) {
      toast.warning(t("zoomUnsupported"))
      return
    }
    setZoom((current) => ({ ...current, updating: true }))
    const applied = await control.setZoom(level)
    setZoom({ levels: applied ? control.getSupportedLevels() : [], level: applied ? control.getZoom() : 0, updating: false })
    if (!applied) toast.warning(t("zoomUnsupported"))
  }

  return (
    <div ref={panelRef} data-audit-scan-camera className="relative isolate mb-2 scroll-mt-20 overflow-hidden rounded-md border border-border bg-surface">
      <div className="relative aspect-square w-full sm:aspect-[4/3]">
        <div id="audit-qr-reader" className="w-full [&_video]:!h-auto [&_video]:!w-full" />
        {running ? <AuditQrScannerOverlay /> : null}
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <Loader2 className="size-6 animate-spin" aria-hidden="true" />
          </div>
        ) : null}
        {running && zoom.levels.length > 0 ? (
          <div className="absolute left-2 top-2 z-20 inline-flex items-center gap-1 rounded-md border border-white/50 bg-slate-950/70 p-1">
            {zoom.levels.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => void changeZoom(level)}
                disabled={zoom.updating}
                aria-pressed={Math.abs(zoom.level - level) < 0.05}
                aria-label={t("zoomCamera", { level })}
                className={cn(
                  "inline-flex min-h-11 min-w-11 items-center justify-center rounded px-2 text-sm font-semibold",
                  Math.abs(zoom.level - level) < 0.05 ? "bg-white text-slate-950" : "text-white hover:bg-white/15",
                )}
              >
                {level}x
              </button>
            ))}
          </div>
        ) : null}
        <div className="absolute right-2 top-2 z-20 flex gap-1">
          {running && torch.available ? (
            <button
              type="button"
              onClick={() => void toggleTorch()}
              disabled={torch.updating}
              aria-pressed={torch.enabled}
              aria-label={t(torch.enabled ? "torchOff" : "torchOn")}
              className="inline-flex size-11 items-center justify-center rounded-md border border-white/50 bg-slate-950/70 text-white"
            >
              {torch.enabled ? <FlashlightOff className="size-4" aria-hidden="true" /> : <Flashlight className="size-4" aria-hidden="true" />}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label={t("stopCamera")}
            className="inline-flex size-11 items-center justify-center rounded-md border border-white/50 bg-slate-950/70 text-white"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      {errorText ? (
        <p role="alert" className="border-t border-border bg-warning-soft p-3 text-sm text-warning">
          {errorText}
        </p>
      ) : null}
    </div>
  )
}
