"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Camera, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import {
  environmentCameraId,
  getFallbackCameraAfterEnvironmentFailure,
  resolvePreferredCameraSelection,
  type PreferredCameraSelection,
} from "@/lib/camera-selection"
import type {
  CameraDevice,
  Html5Qrcode,
  Html5QrcodeCameraScanConfig,
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
  cameraRear: string
  scanning: string
  scanned: string
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

type AssetQrCameraTuningConstraintSet = MediaTrackConstraintSet & {
  focusMode?: string
  exposureMode?: string
  whiteBalanceMode?: string
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

  async function startScanner(requestedCameraId = selectedCameraId) {
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

      const cameraSelection = resolvePreferredCameraSelection(availableCameras, requestedCameraId)
      setSelectedCameraId(cameraSelection.selectedCameraId)
      const scanner = new Html5Qrcode(readerId, {
        formatsToSupport: getScannerCodeFormats(Html5QrcodeSupportedFormats, scanMode),
        useBarCodeDetectorIfSupported: true,
        verbose: false,
      })
      scannerRef.current = scanner
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
        const scanConfig = getScannerConfig(scanMode, selection)
        await scanner.start(selection.cameraConfig, scanConfig, handleScanSuccess, () => {})
        await tuneAssetQrCamera(scanner, scanMode)
      }

      try {
        await startWithSelection(cameraSelection)
      } catch (startError) {
        const fallbackCamera = getFallbackCameraAfterEnvironmentFailure(cameraSelection, availableCameras)
        if (!fallbackCamera) throw startError
        setSelectedCameraId(fallbackCamera.id)
        await startWithSelection(resolvePreferredCameraSelection([fallbackCamera], fallbackCamera.id))
      }
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
      void startScanner(cameraId)
    }, 0)
  }

  const showScannerPanel = scannerRunning || scannerLoading || Boolean(cameraErrorText)
  const readerShellClassName =
    scanMode === "asset-qr"
      ? "relative isolate aspect-[4/3] min-h-0 w-full max-w-full overflow-hidden rounded-md border border-border bg-background"
      : "aspect-[4/3] min-h-0 w-full max-w-full overflow-hidden rounded-md border border-border bg-background sm:min-h-56"
  const readerClassName =
    scanMode === "asset-qr"
      ? "w-full [&_video]:!h-auto [&_video]:!w-full"
      : "h-full w-full [&_video]:!h-full [&_video]:!w-full [&_video]:!object-cover"

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
          </div>
          {scannerRunning && <p className="mt-2 text-xs text-muted-foreground">{labels.scanning}</p>}
          {cameraErrorText && <p className="mt-2 text-xs font-medium text-danger">{cameraErrorText}</p>}
        </div>
      )}
    </div>
  )
}

function getScannerConfig(
  scanMode: NonNullable<ScannerTextInputProps["scanMode"]>,
  cameraSelection?: PreferredCameraSelection
): Html5QrcodeCameraScanConfig {
  if (scanMode === "asset-qr") {
    return { fps: 15, aspectRatio: 1.333, videoConstraints: buildAssetQrVideoConstraints(cameraSelection) }
  }

  return { fps: 10, qrbox: getResponsiveQrBox, aspectRatio: 1.333 }
}

function buildAssetQrVideoConstraints(cameraSelection?: PreferredCameraSelection): MediaTrackConstraints {
  const baseConstraints: MediaTrackConstraints & Record<string, unknown> = cameraSelection?.usesEnvironmentConstraint
    ? { facingMode: { exact: "environment" } }
    : cameraSelection?.selectedCameraId
      ? { deviceId: { exact: cameraSelection.selectedCameraId } }
      : { facingMode: { exact: "environment" } }
  const advanced: AssetQrCameraTuningConstraintSet[] = [
    { focusMode: "continuous" },
    { exposureMode: "continuous" },
    { whiteBalanceMode: "continuous" },
  ]

  return {
    ...baseConstraints,
    width: { ideal: 1280 },
    height: { ideal: 960 },
    frameRate: { ideal: 30 },
    aspectRatio: { ideal: 1.333 },
    advanced,
  }
}

async function tuneAssetQrCamera(scanner: Html5Qrcode, scanMode: NonNullable<ScannerTextInputProps["scanMode"]>) {
  if (scanMode !== "asset-qr") return

  try {
    const capabilities = scanner.getRunningTrackCapabilities() as MediaTrackCapabilities & Record<string, unknown>
    const advanced: AssetQrCameraTuningConstraintSet[] = []

    if (supportsStringCapability(capabilities.focusMode, "continuous")) advanced.push({ focusMode: "continuous" })
    if (supportsStringCapability(capabilities.exposureMode, "continuous")) advanced.push({ exposureMode: "continuous" })
    if (supportsStringCapability(capabilities.whiteBalanceMode, "continuous")) advanced.push({ whiteBalanceMode: "continuous" })
    if (advanced.length > 0) {
      await scanner.applyVideoConstraints({ advanced } as MediaTrackConstraints)
    }
  } catch {
    // Some mobile browsers expose camera capability keys but reject tuning; scanning should continue.
  }

  try {
    const zoom = scanner.getRunningTrackCameraCapabilities().zoomFeature()
    if (!zoom.isSupported()) return

    const currentValue = zoom.value()
    const targetValue = Math.min(zoom.max(), Math.max(zoom.min(), 2))
    if (typeof currentValue === "number" && currentValue >= targetValue) return

    await zoom.apply(targetValue)
  } catch {
    // Zoom is an optional improvement for small asset-label QR codes.
  }
}

function supportsStringCapability(value: unknown, expected: string) {
  return Array.isArray(value) && value.includes(expected)
}

function getScannerCodeFormats(
  formats: typeof Html5QrcodeSupportedFormats,
  scanMode: NonNullable<ScannerTextInputProps["scanMode"]>
): Html5QrcodeSupportedFormats[] {
  if (scanMode === "asset-qr") return [formats.QR_CODE]

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
  const size = Math.max(140, Math.min(320, minEdge - 24, Math.floor(minEdge * 0.82)))
  return { width: size, height: size }
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

function isCameraAccessSupported() {
  return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia)
}
