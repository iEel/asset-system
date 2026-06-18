"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Camera, Flashlight, FlashlightOff, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import {
  environmentCameraId,
  getFallbackCameraAfterEnvironmentFailure,
  resolvePreferredCameraSelection,
  type PreferredCameraSelection,
} from "@/lib/camera-selection"
import {
  startNativeAssetQrScanner,
  startNativeSerialCodeScanner,
  type NativeAssetQrScannerRuntime,
  type NativeSerialCodeScannerRuntime,
} from "@/lib/asset-qr-scanner"
import type { CameraDevice } from "html5-qrcode"

type ScannerTextInputLabels = {
  start: string
  stop: string
  title: string
  help: string
  cameraUnsupported: string
  cameraNotFound: string
  cameraError: string
  cameraDevice: string
  cameraDeviceFallback: string
  cameraRear: string
  scanning: string
  scanned: string
  cameraOpening?: string
  torchOn?: string
  torchOff?: string
  torchUnsupported?: string
  zoomCamera?: string
  zoomUnsupported?: string
}

type ScannerTextInputProps = {
  value: string
  onChange: (value: string) => void
  labels: ScannerTextInputLabels
  scanMode?: "asset-qr" | "serial-code"
  disabled?: boolean
  maxLength?: number
  placeholder?: string
  inputClassName?: string
  onPaste?: React.ClipboardEventHandler<HTMLInputElement>
  onScanSuccess?: (value: string) => void
}

export function ScannerTextInput({
  value,
  onChange,
  labels,
  scanMode = "serial-code",
  disabled,
  maxLength,
  placeholder,
  inputClassName,
  onPaste,
  onScanSuccess,
}: ScannerTextInputProps) {
  const reactId = useId()
  const readerId = `scanner-reader-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`
  const nativeScannerRuntimeRef = useRef<NativeAssetQrScannerRuntime | NativeSerialCodeScannerRuntime | null>(null)
  const [scannerRunning, setScannerRunning] = useState(false)
  const [scannerLoading, setScannerLoading] = useState(false)
  const [cameraErrorText, setCameraErrorText] = useState("")
  const [cameras, setCameras] = useState<CameraDevice[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState("")
  const [torchAvailable, setTorchAvailable] = useState(false)
  const [torchEnabled, setTorchEnabled] = useState(false)
  const [torchUpdating, setTorchUpdating] = useState(false)
  const [zoomAvailable, setZoomAvailable] = useState(false)
  const [zoomLevels, setZoomLevels] = useState<number[]>([])
  const [zoomLevel, setZoomLevel] = useState(0)
  const [zoomUpdating, setZoomUpdating] = useState(false)

  useEffect(() => {
    return () => {
      nativeScannerRuntimeRef.current?.stop()
      nativeScannerRuntimeRef.current = null
    }
  }, [])

  async function startScanner(requestedCameraId = selectedCameraId) {
    if (!isCameraAccessSupported()) {
      setCameraErrorText(labels.cameraUnsupported)
      toast.error(labels.cameraUnsupported)
      return
    }

    setScannerLoading(true)
    setCameraErrorText("")
    try {
      const { Html5Qrcode } = await import("html5-qrcode")
      const availableCameras = await Html5Qrcode.getCameras()
      setCameras(availableCameras)

      if (availableCameras.length === 0) {
        setCameraErrorText(labels.cameraNotFound)
        toast.error(labels.cameraNotFound)
        return
      }

      const cameraSelection = resolvePreferredCameraSelection(availableCameras, requestedCameraId)
      setSelectedCameraId(cameraSelection.selectedCameraId)
      const handleScanSuccess = (decodedText: string) => {
        const normalizedText = decodedText.trim()
        if (!normalizedText) return
        onChange(normalizedText)
        toast.success(labels.scanned)
        void stopScanner().finally(() => {
          onScanSuccess?.(normalizedText)
        })
      }

      const startWithSelection = async (selection: PreferredCameraSelection) => {
        if (scanMode === "asset-qr") {
          nativeScannerRuntimeRef.current = await startNativeAssetQrScanner({
            readerId,
            cameraSelection: selection,
            onScanSuccess: handleScanSuccess,
          })
          return
        }
        nativeScannerRuntimeRef.current = await startNativeSerialCodeScanner({
          readerId,
          cameraSelection: selection,
          onScanSuccess: handleScanSuccess,
        })
      }

      try {
        await startWithSelection(cameraSelection)
      } catch (startError) {
        const fallbackCamera = getFallbackCameraAfterEnvironmentFailure(cameraSelection, availableCameras)
        if (!fallbackCamera) throw startError
        setSelectedCameraId(fallbackCamera.id)
        await startWithSelection(resolvePreferredCameraSelection([fallbackCamera], fallbackCamera.id))
      }
      syncCameraUtilityState(nativeScannerRuntimeRef.current)
      setScannerRunning(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : labels.cameraError
      setCameraErrorText(message)
      toast.error(message)
      nativeScannerRuntimeRef.current = null
      resetCameraUtilityState()
    } finally {
      setScannerLoading(false)
    }
  }

  async function stopScanner() {
    const nativeScannerRuntime = nativeScannerRuntimeRef.current
    if (nativeScannerRuntime) {
      nativeScannerRuntime.stop()
      nativeScannerRuntimeRef.current = null
      setScannerRunning(false)
      resetCameraUtilityState()
      return
    }

    setScannerRunning(false)
    resetCameraUtilityState()
  }

  async function handleToggleScanner() {
    if (scannerRunning || scannerLoading) {
      await stopScanner()
      return
    }
    await startScanner()
  }

  async function handleCameraChange(cameraId: string) {
    setSelectedCameraId(cameraId)
    if (!scannerRunning) return

    await stopScanner()
    window.setTimeout(() => {
      void startScanner(cameraId)
    }, 0)
  }

  function resetCameraUtilityState() {
    setTorchAvailable(false)
    setTorchEnabled(false)
    setTorchUpdating(false)
    setZoomAvailable(false)
    setZoomLevels([])
    setZoomLevel(0)
    setZoomUpdating(false)
  }

  function syncCameraUtilityState(runtime: NativeAssetQrScannerRuntime | NativeSerialCodeScannerRuntime | null) {
    if (scanMode !== "asset-qr") {
      resetCameraUtilityState()
      return
    }

    const torch = runtime?.torch
    const nextTorchAvailable = Boolean(torch?.isAvailable())
    setTorchAvailable(nextTorchAvailable)
    setTorchEnabled(nextTorchAvailable ? Boolean(torch?.isEnabled()) : false)
    setTorchUpdating(false)

    const zoom = runtime?.zoom
    const nextZoomLevels = zoom?.getSupportedLevels() ?? []
    const nextZoomAvailable = Boolean(zoom?.isAvailable() && nextZoomLevels.length > 0)
    setZoomAvailable(nextZoomAvailable)
    setZoomLevels(nextZoomAvailable ? nextZoomLevels : [])
    setZoomLevel(nextZoomAvailable && zoom ? zoom.getZoom() : 0)
    setZoomUpdating(false)
  }

  async function toggleTorch() {
    const torch = nativeScannerRuntimeRef.current?.torch
    if (scanMode !== "asset-qr" || !torch?.isAvailable()) {
      setTorchAvailable(false)
      setTorchEnabled(false)
      setTorchUpdating(false)
      if (labels.torchUnsupported) toast.warning(labels.torchUnsupported)
      return
    }

    const nextValue = !torchEnabled
    setTorchUpdating(true)
    try {
      const applied = await torch.setEnabled(nextValue)
      if (!applied) {
        setTorchAvailable(false)
        setTorchEnabled(false)
        if (labels.torchUnsupported) toast.warning(labels.torchUnsupported)
        return
      }
      setTorchAvailable(true)
      setTorchEnabled(nextValue)
    } finally {
      setTorchUpdating(false)
    }
  }

  async function setScannerZoom(level: number) {
    const zoom = nativeScannerRuntimeRef.current?.zoom
    if (scanMode !== "asset-qr" || !zoom?.isAvailable()) {
      setZoomAvailable(false)
      setZoomLevels([])
      if (labels.zoomUnsupported) toast.warning(labels.zoomUnsupported)
      return
    }

    setZoomUpdating(true)
    try {
      const applied = await zoom.setZoom(level)
      if (!applied) {
        setZoomAvailable(false)
        setZoomLevels([])
        if (labels.zoomUnsupported) toast.warning(labels.zoomUnsupported)
        return
      }
      setZoomAvailable(true)
      setZoomLevels(zoom.getSupportedLevels())
      setZoomLevel(zoom.getZoom())
    } finally {
      setZoomUpdating(false)
    }
  }

  const showScannerPanel = scannerRunning || scannerLoading || Boolean(cameraErrorText)
  const readerShellClassName =
    scanMode === "serial-code"
      ? "relative isolate aspect-[16/9] min-h-0 w-full max-w-full overflow-hidden rounded-md border border-border bg-background"
      : "relative isolate aspect-[4/3] min-h-0 w-full max-w-full overflow-hidden rounded-md border border-border bg-background"
  const readerClassName =
    scanMode === "asset-qr"
      ? "w-full [&_video]:!h-auto [&_video]:!w-full"
      : "w-full [&_video]:!h-auto [&_video]:!w-full"

  return (
    <div className="min-w-0 max-w-full space-y-2">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onPaste={onPaste}
          maxLength={maxLength}
          placeholder={placeholder}
          className={
            inputClassName ??
            "min-h-11 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:h-10 sm:min-h-0"
          }
        />
        <button
          type="button"
          disabled={disabled}
          onClick={handleToggleScanner}
          className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:min-h-0 sm:w-auto"
          title={scannerRunning || scannerLoading ? labels.stop : labels.start}
        >
          {scannerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          <span className="hidden sm:inline">{scannerRunning || scannerLoading ? labels.stop : labels.start}</span>
        </button>
      </div>

      {showScannerPanel && (
        <div className="min-w-0 max-w-full rounded-md border border-border bg-surface p-3">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{labels.title}</p>
              <p className="mt-1 break-words text-xs text-muted-foreground">{labels.help}</p>
            </div>
            <button
              type="button"
              onClick={() => void stopScanner()}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:h-10 sm:w-10"
              title={labels.stop}
              aria-label={labels.stop}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {cameras.length > 1 && (
            <label className="mb-3 block text-xs font-medium text-muted-foreground">
              {labels.cameraDevice}
              <select
                value={selectedCameraId}
                onChange={(event) => void handleCameraChange(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:h-9 sm:min-h-0"
              >
                <option value={environmentCameraId}>{labels.cameraRear}</option>
                {cameras.map((camera, index) => (
                  <option key={camera.id} value={camera.id}>
                    {camera.label || `${labels.cameraDeviceFallback} ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className={readerShellClassName}>
            <div id={readerId} className={readerClassName} />
            {scanMode === "asset-qr" ? <QrScannerOverlay /> : null}
            {scanMode === "serial-code" ? <SerialScannerOverlay /> : null}
            {scannerLoading ? (
              <div className="absolute inset-0 z-20 flex items-center justify-center gap-2 bg-background/85 text-sm font-medium text-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {labels.cameraOpening ?? labels.scanning}
              </div>
            ) : null}
            {scanMode === "asset-qr" && scannerRunning && zoomAvailable ? (
              <div className="absolute left-3 top-3 z-20 inline-flex min-h-11 items-center gap-1 rounded-md border border-white/50 bg-slate-950/70 p-1 shadow-sm">
                {zoomLevels.map((level) => {
                  const label = formatScannerZoomLabel(labels.zoomCamera, level)
                  const active = Math.abs(zoomLevel - level) < 0.05
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => void setScannerZoom(level)}
                      disabled={zoomUpdating}
                      aria-pressed={active}
                      aria-label={label}
                      title={label}
                      className={`inline-flex min-h-9 min-w-11 items-center justify-center rounded px-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60 ${
                        active ? "bg-white text-slate-950" : "text-white hover:bg-white/15"
                      }`}
                    >
                      {formatScannerZoomLevel(level)}x
                    </button>
                  )
                })}
              </div>
            ) : null}
            {scanMode === "asset-qr" && scannerRunning && torchAvailable ? (
              <button
                type="button"
                onClick={() => void toggleTorch()}
                disabled={torchUpdating}
                aria-pressed={torchEnabled}
                aria-label={getScannerTorchLabel(labels, torchEnabled)}
                title={getScannerTorchLabel(labels, torchEnabled)}
                className={`absolute right-3 top-3 z-20 inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60 ${
                  torchEnabled
                    ? "border-warning/50 bg-warning text-white hover:bg-warning/90"
                    : "border-white/50 bg-slate-950/70 text-white hover:bg-slate-950/85"
                }`}
              >
                {torchUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : torchEnabled ? (
                  <FlashlightOff className="h-4 w-4" />
                ) : (
                  <Flashlight className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{getScannerTorchLabel(labels, torchEnabled)}</span>
              </button>
            ) : null}
          </div>
          {scannerLoading ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {labels.cameraOpening ?? labels.scanning}
            </p>
          ) : scannerRunning ? (
            <p className="mt-2 text-xs text-muted-foreground">{labels.scanning}</p>
          ) : null}
          {cameraErrorText && <p className="mt-2 text-xs font-medium text-danger">{cameraErrorText}</p>}
        </div>
      )}
    </div>
  )
}

function QrScannerOverlay() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
      <div
        className="absolute left-1/2 top-1/2 aspect-square h-[66%] max-h-56 -translate-x-1/2 -translate-y-1/2"
        style={{ boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.42)" }}
      >
        <span className="absolute left-0 top-0 h-10 w-10 border-l-4 border-t-4 border-white" />
        <span className="absolute right-0 top-0 h-10 w-10 border-r-4 border-t-4 border-white" />
        <span className="absolute bottom-0 left-0 h-10 w-10 border-b-4 border-l-4 border-white" />
        <span className="absolute bottom-0 right-0 h-10 w-10 border-b-4 border-r-4 border-white" />
      </div>
    </div>
  )
}

function SerialScannerOverlay() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
      <div
        className="absolute left-1/2 top-1/2 h-[34%] w-[78%] max-w-[30rem] -translate-x-1/2 -translate-y-1/2"
        style={{ boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.36)" }}
      >
        <span className="absolute left-0 top-0 h-8 w-8 border-l-4 border-t-4 border-white" />
        <span className="absolute right-0 top-0 h-8 w-8 border-r-4 border-t-4 border-white" />
        <span className="absolute left-8 right-8 top-1/2 h-0.5 -translate-y-1/2 bg-white/85 shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
        <span className="absolute bottom-0 left-0 h-8 w-8 border-b-4 border-l-4 border-white" />
        <span className="absolute bottom-0 right-0 h-8 w-8 border-b-4 border-r-4 border-white" />
      </div>
    </div>
  )
}

function isCameraAccessSupported() {
  return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia)
}

function getScannerTorchLabel(labels: ScannerTextInputLabels, enabled: boolean) {
  return (enabled ? labels.torchOff : labels.torchOn) ?? (enabled ? "Turn flashlight off" : "Turn flashlight on")
}

function formatScannerZoomLabel(template: string | undefined, level: number) {
  const levelLabel = formatScannerZoomLevel(level)
  return template ? template.replace("{level}", levelLabel) : `${levelLabel}x`
}

function formatScannerZoomLevel(level: number) {
  if (Number.isInteger(level)) return String(level)
  return level.toFixed(1).replace(/\.0$/, "")
}
