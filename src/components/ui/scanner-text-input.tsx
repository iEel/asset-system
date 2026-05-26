"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Camera, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import type {
  CameraDevice,
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
} from "html5-qrcode"

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
  scanning: string
  scanned: string
}

type ScannerTextInputProps = {
  value: string
  onChange: (value: string) => void
  labels: ScannerTextInputLabels
  disabled?: boolean
  maxLength?: number
  placeholder?: string
  inputClassName?: string
  onPaste?: React.ClipboardEventHandler<HTMLInputElement>
}

export function ScannerTextInput({
  value,
  onChange,
  labels,
  disabled,
  maxLength,
  placeholder,
  inputClassName,
  onPaste,
}: ScannerTextInputProps) {
  const reactId = useId()
  const readerId = `scanner-reader-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [scannerRunning, setScannerRunning] = useState(false)
  const [scannerLoading, setScannerLoading] = useState(false)
  const [cameraErrorText, setCameraErrorText] = useState("")
  const [cameras, setCameras] = useState<CameraDevice[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState("")

  useEffect(() => {
    return () => {
      void stopScanner()
    }
  }, [])

  async function startScanner() {
    if (!isCameraAccessSupported()) {
      setCameraErrorText(labels.cameraUnsupported)
      toast.error(labels.cameraUnsupported)
      return
    }

    setScannerLoading(true)
    setCameraErrorText("")
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode")
      const availableCameras = await Html5Qrcode.getCameras()
      setCameras(availableCameras)

      if (availableCameras.length === 0) {
        setCameraErrorText(labels.cameraNotFound)
        toast.error(labels.cameraNotFound)
        return
      }

      const preferredCamera =
        availableCameras.find((camera) => camera.id === selectedCameraId) ??
        availableCameras.find((camera) => /back|rear|environment/i.test(camera.label)) ??
        availableCameras[0]

      setSelectedCameraId(preferredCamera.id)
      const scanner = new Html5Qrcode(readerId, {
        formatsToSupport: getSerialCodeFormats(Html5QrcodeSupportedFormats),
        useBarCodeDetectorIfSupported: true,
        verbose: false,
      })
      scannerRef.current = scanner

      await scanner.start(
        preferredCamera.id,
        { fps: 10, qrbox: getResponsiveQrBox, aspectRatio: 1.333 },
        (decodedText) => {
          const normalizedText = decodedText.trim()
          if (!normalizedText) return
          onChange(normalizedText)
          toast.success(labels.scanned)
          void stopScanner()
        },
        () => {}
      )
      setScannerRunning(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : labels.cameraError
      setCameraErrorText(message)
      toast.error(message)
      scannerRef.current = null
    } finally {
      setScannerLoading(false)
    }
  }

  async function stopScanner() {
    const scanner = scannerRef.current
    if (!scanner) {
      setScannerRunning(false)
      return
    }

    try {
      await scanner.stop()
      scanner.clear()
    } catch {
      scanner.clear()
    } finally {
      scannerRef.current = null
      setScannerRunning(false)
    }
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
      void startScanner()
    }, 0)
  }

  const showScannerPanel = scannerRunning || scannerLoading || Boolean(cameraErrorText)

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onPaste={onPaste}
          maxLength={maxLength}
          placeholder={placeholder}
          className={
            inputClassName ??
            "h-10 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          }
        />
        <button
          type="button"
          disabled={disabled}
          onClick={handleToggleScanner}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          title={scannerRunning || scannerLoading ? labels.stop : labels.start}
        >
          {scannerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          <span className="hidden sm:inline">{scannerRunning || scannerLoading ? labels.stop : labels.start}</span>
        </button>
      </div>

      {showScannerPanel && (
        <div className="rounded-md border border-border bg-surface p-3">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">{labels.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{labels.help}</p>
            </div>
            <button
              type="button"
              onClick={() => void stopScanner()}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              title={labels.stop}
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
                className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {cameras.map((camera, index) => (
                  <option key={camera.id} value={camera.id}>
                    {camera.label || `${labels.cameraDeviceFallback} ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div id={readerId} className="min-h-56 overflow-hidden rounded-md border border-border bg-background" />
          {scannerRunning && <p className="mt-2 text-xs text-muted-foreground">{labels.scanning}</p>}
          {cameraErrorText && <p className="mt-2 text-xs font-medium text-danger">{cameraErrorText}</p>}
        </div>
      )}
    </div>
  )
}

function getSerialCodeFormats(formats: typeof Html5QrcodeSupportedFormats): Html5QrcodeSupportedFormats[] {
  return [
    formats.QR_CODE,
    formats.CODE_128,
    formats.CODE_39,
    formats.CODE_93,
    formats.EAN_13,
    formats.EAN_8,
    formats.UPC_A,
    formats.UPC_E,
    formats.ITF,
    formats.CODABAR,
    formats.DATA_MATRIX,
    formats.PDF_417,
  ]
}

function getResponsiveQrBox(viewfinderWidth: number, viewfinderHeight: number) {
  const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
  const size = Math.max(180, Math.min(320, Math.floor(minEdge * 0.75)))
  return { width: size, height: size }
}

function isCameraAccessSupported() {
  return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia)
}
