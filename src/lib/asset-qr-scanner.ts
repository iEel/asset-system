import type { PreferredCameraSelection } from "./camera-selection.ts"

type NativeCodeScanMode = "asset-qr" | "serial-code"

type NativeCodeCameraTuningConstraintSet = MediaTrackConstraintSet & {
  focusMode?: string
  exposureMode?: string
  whiteBalanceMode?: string
  zoom?: number
}

export type NativeAssetQrScannerRuntime = {
  stop: () => void
}

export type NativeSerialCodeScannerRuntime = NativeAssetQrScannerRuntime

type ZxingDecodedResult = {
  getText?: () => string
  text?: string
}

type ZxingReader = {
  decode: (video: HTMLVideoElement) => ZxingDecodedResult
}

type ZxingBrowserModule = {
  BrowserQRCodeReader: new (timeBetweenScansMillis?: number) => ZxingReader
  BrowserMultiFormatReader: new (hints?: Map<unknown, unknown>, timeBetweenScansMillis?: number) => ZxingReader
  BarcodeFormat: Record<string, unknown>
  DecodeHintType: Record<string, unknown>
}

type NativeCodeScannerOptions = {
  readerId: string
  cameraSelection: PreferredCameraSelection
  onScanSuccess: (decodedText: string) => void
  stopAfterSuccess?: boolean
}

export function buildAssetQrVideoConstraints(cameraSelection?: PreferredCameraSelection): MediaTrackConstraints {
  return buildNativeCodeVideoConstraints("asset-qr", cameraSelection)
}

export function buildSerialCodeVideoConstraints(cameraSelection?: PreferredCameraSelection): MediaTrackConstraints {
  return buildNativeCodeVideoConstraints("serial-code", cameraSelection)
}

export async function startNativeAssetQrScanner(options: NativeCodeScannerOptions): Promise<NativeAssetQrScannerRuntime> {
  return startNativeCodeScanner({ ...options, scanMode: "asset-qr" })
}

export async function startNativeSerialCodeScanner(options: NativeCodeScannerOptions): Promise<NativeSerialCodeScannerRuntime> {
  return startNativeCodeScanner({ ...options, scanMode: "serial-code" })
}

function buildNativeCodeVideoConstraints(
  scanMode: NativeCodeScanMode,
  cameraSelection?: PreferredCameraSelection
): MediaTrackConstraints {
  const baseConstraints: MediaTrackConstraints & Record<string, unknown> = cameraSelection?.usesEnvironmentConstraint
    ? { facingMode: { exact: "environment" } }
    : cameraSelection?.selectedCameraId
      ? { deviceId: { exact: cameraSelection.selectedCameraId } }
      : { facingMode: { exact: "environment" } }
  const advanced: NativeCodeCameraTuningConstraintSet[] = [
    { focusMode: "continuous" },
    { exposureMode: "continuous" },
    { whiteBalanceMode: "continuous" },
  ]

  if (scanMode === "serial-code") {
    return {
      ...baseConstraints,
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30 },
      aspectRatio: { ideal: 1.777 },
      advanced,
    }
  }

  return {
    ...baseConstraints,
    width: { ideal: 1280 },
    height: { ideal: 960 },
    frameRate: { ideal: 30 },
    aspectRatio: { ideal: 1.333 },
    advanced,
  }
}

async function startNativeCodeScanner({
  readerId,
  cameraSelection,
  onScanSuccess,
  stopAfterSuccess = true,
  scanMode,
}: NativeCodeScannerOptions & { scanMode: NativeCodeScanMode }): Promise<NativeAssetQrScannerRuntime> {
  const readerElement = document.getElementById(readerId)
  if (!readerElement) throw new Error("Scanner reader is not mounted")

  const stream = await navigator.mediaDevices.getUserMedia({
    video: buildNativeCodeVideoConstraints(scanMode, cameraSelection),
    audio: false,
  })
  const video = document.createElement("video")
  let timeoutId: number | undefined
  let stopped = false

  const stop = () => {
    stopped = true
    if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    stream.getTracks().forEach((track) => track.stop())
    video.srcObject = null
    video.remove()
  }

  try {
    video.autoplay = true
    video.muted = true
    video.playsInline = true
    video.setAttribute("autoplay", "true")
    video.setAttribute("muted", "true")
    video.setAttribute("playsinline", "true")
    video.style.display = "block"
    video.style.width = "100%"
    video.style.height = "auto"
    video.srcObject = stream
    readerElement.replaceChildren(video)

    const playPromise = video.play()
    await waitForNativeCodeVideo(video)
    await playPromise
    if (scanMode === "asset-qr") {
      await tuneAssetQrMediaStream(stream)
    } else {
      await tuneSerialCodeMediaStream(stream)
    }

    const zxingModule = (await import("html5-qrcode/third_party/zxing-js.umd.js")) as unknown as ZxingBrowserModule
    const reader = createZxingReader(zxingModule, scanMode)
    let succeeded = false

    const scanNativeFrame = () => {
      if (stopped || succeeded) return
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth <= 0 || video.videoHeight <= 0) {
        timeoutId = window.setTimeout(scanNativeFrame, 100)
        return
      }

      try {
        const decodedText = getZxingDecodedText(reader.decode(video))
        if (decodedText) {
          onScanSuccess(decodedText)
          if (stopAfterSuccess) {
            succeeded = true
            return
          }
        }
      } catch {
        // No QR in this frame; keep scanning.
      }
      timeoutId = window.setTimeout(scanNativeFrame, 100)
    }

    timeoutId = window.setTimeout(scanNativeFrame, 100)
    return { stop }
  } catch (error) {
    stop()
    throw error
  }
}

async function waitForNativeCodeVideo(video: HTMLVideoElement) {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0) return

  await new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(resolve, 1800)
    const cleanup = () => {
      window.clearTimeout(timeoutId)
      video.removeEventListener("loadedmetadata", handleReady)
      video.removeEventListener("playing", handleReady)
      video.removeEventListener("error", handleError)
    }
    const handleReady = () => {
      if (video.videoWidth <= 0 || video.videoHeight <= 0) return
      cleanup()
      resolve()
    }
    const handleError = () => {
      cleanup()
      reject(new Error("Unable to start camera preview"))
    }
    video.addEventListener("loadedmetadata", handleReady)
    video.addEventListener("playing", handleReady)
    video.addEventListener("error", handleError)
  })
}

function createZxingReader(
  { BrowserQRCodeReader, BrowserMultiFormatReader, BarcodeFormat, DecodeHintType }: ZxingBrowserModule,
  scanMode: NativeCodeScanMode
) {
  if (scanMode === "asset-qr") return new BrowserQRCodeReader(100)

  const possibleFormats = [
    BarcodeFormat.QR_CODE,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.CODE_93,
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.ITF,
    BarcodeFormat.CODABAR,
    BarcodeFormat.DATA_MATRIX,
    BarcodeFormat.PDF_417,
  ].filter(Boolean)
  const hints = new Map<unknown, unknown>([
    [DecodeHintType.POSSIBLE_FORMATS, possibleFormats],
    [DecodeHintType.TRY_HARDER, true],
  ])

  return new BrowserMultiFormatReader(hints, 100)
}

function getZxingDecodedText(result: ZxingDecodedResult) {
  return typeof result.getText === "function" ? result.getText() : result.text ?? ""
}

async function tuneAssetQrMediaStream(stream: MediaStream) {
  await tuneNativeCodeMediaStream(stream, "asset-qr")
}

async function tuneSerialCodeMediaStream(stream: MediaStream) {
  await tuneNativeCodeMediaStream(stream, "serial-code")
}

async function tuneNativeCodeMediaStream(stream: MediaStream, scanMode: NativeCodeScanMode) {
  try {
    const track = stream.getVideoTracks()[0]
    if (!track) return

    const capabilities =
      typeof track.getCapabilities === "function"
        ? (track.getCapabilities() as MediaTrackCapabilities & Record<string, unknown>)
        : undefined
    if (!capabilities) return

    const advanced: NativeCodeCameraTuningConstraintSet[] = []

    if (supportsStringCapability(capabilities.focusMode, "continuous")) advanced.push({ focusMode: "continuous" })
    if (supportsStringCapability(capabilities.exposureMode, "continuous")) advanced.push({ exposureMode: "continuous" })
    if (supportsStringCapability(capabilities.whiteBalanceMode, "continuous")) advanced.push({ whiteBalanceMode: "continuous" })
    const zoom = capabilities.zoom
    if (typeof zoom === "object" && zoom !== null && "min" in zoom && "max" in zoom) {
      const min = typeof zoom.min === "number" ? zoom.min : 1
      const max = typeof zoom.max === "number" ? zoom.max : min
      const targetZoom = scanMode === "serial-code" ? 2.5 : 2
      advanced.push({ zoom: Math.min(max, Math.max(min, targetZoom)) })
    }
    if (advanced.length > 0) {
      await track.applyConstraints({ advanced } as MediaTrackConstraints)
    }
  } catch {
    // Some mobile browsers expose camera capability keys but reject tuning; scanning should continue.
  }
}

function supportsStringCapability(value: unknown, expected: string) {
  return Array.isArray(value) && value.includes(expected)
}
