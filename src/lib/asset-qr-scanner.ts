import type { PreferredCameraSelection } from "./camera-selection.ts"

type NativeCodeScanMode = "asset-qr" | "serial-code"

type NativeCodeCameraTuningConstraintSet = MediaTrackConstraintSet & {
  focusMode?: string
  exposureMode?: string
  whiteBalanceMode?: string
  zoom?: number
}

const SERIAL_CODE_CANVAS_WIDTH = 1600
const SERIAL_CODE_CANVAS_HEIGHT = 480
const SERIAL_CODE_SCAN_REGIONS = [
  { x: 0.08, y: 0.28, width: 0.84, height: 0.44 },
  { x: 0.1, y: 0.36, width: 0.8, height: 0.28 },
  { x: 0.16, y: 0.42, width: 0.68, height: 0.16 },
]
const NATIVE_BARCODE_DETECTOR_FORMATS = [
  "qr_code",
  "code_128",
  "code_39",
  "code_93",
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "itf",
  "codabar",
  "data_matrix",
  "pdf417",
]

export type NativeAssetQrScannerRuntime = {
  stop: () => void
}

export type NativeSerialCodeScannerRuntime = NativeAssetQrScannerRuntime

type ZxingDecodedResult = {
  getText?: () => string
  text?: string
}

type ZxingDecodeSource = HTMLVideoElement | HTMLCanvasElement

type ZxingReader = {
  decode: (source: ZxingDecodeSource) => ZxingDecodedResult
}

type ZxingBrowserModule = {
  BrowserQRCodeReader: new (timeBetweenScansMillis?: number) => ZxingReader
  BrowserMultiFormatReader: new (hints?: Map<unknown, unknown>, timeBetweenScansMillis?: number) => ZxingReader
  BarcodeFormat: Record<string, unknown>
  DecodeHintType: Record<string, unknown>
}

type NativeBarcodeDetection = {
  rawValue?: string
}

type NativeBarcodeDetector = {
  detect: (source: ZxingDecodeSource) => Promise<NativeBarcodeDetection[]>
}

type NativeBarcodeDetectorConstructor = new (options?: { formats?: string[] }) => NativeBarcodeDetector

type NativeBarcodeDetectorWindow = Window & {
  BarcodeDetector?: NativeBarcodeDetectorConstructor
}

type SerialCodeDecoderState = {
  barcodeDetector?: NativeBarcodeDetector
  cropCanvas: HTMLCanvasElement
  cropContext: CanvasRenderingContext2D
  cropReader: ZxingReader
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
    const serialDecoderState = scanMode === "serial-code" ? createSerialCodeDecoderState(zxingModule) : undefined
    let succeeded = false

    const scheduleNextScan = () => {
      timeoutId = window.setTimeout(() => void scanNativeFrame(), 100)
    }

    const scanNativeFrame = async () => {
      if (stopped || succeeded) return
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth <= 0 || video.videoHeight <= 0) {
        scheduleNextScan()
        return
      }

      try {
        const decodedText = await decodeNativeCodeFrame(reader, video, scanMode, serialDecoderState)
        if (decodedText) {
          if (stopped) return
          onScanSuccess(decodedText)
          if (stopAfterSuccess) {
            succeeded = true
            return
          }
        }
      } catch {
        // No QR in this frame; keep scanning.
      }
      scheduleNextScan()
    }

    timeoutId = window.setTimeout(() => void scanNativeFrame(), 100)
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

function createSerialCodeDecoderState(zxingModule: ZxingBrowserModule): SerialCodeDecoderState | undefined {
  const cropCanvas = document.createElement("canvas")
  cropCanvas.width = SERIAL_CODE_CANVAS_WIDTH
  cropCanvas.height = SERIAL_CODE_CANVAS_HEIGHT
  const cropContext = cropCanvas.getContext("2d", { willReadFrequently: true })
  if (!cropContext) return undefined

  return {
    barcodeDetector: createNativeBarcodeDetector(),
    cropCanvas,
    cropContext,
    cropReader: createZxingReader(zxingModule, "serial-code"),
  }
}

async function decodeNativeCodeFrame(
  reader: ZxingReader,
  video: HTMLVideoElement,
  scanMode: NativeCodeScanMode,
  serialDecoderState?: SerialCodeDecoderState
) {
  if (scanMode === "serial-code") return decodeSerialCodeFrame(reader, video, serialDecoderState)

  return tryDecodeZxingSource(reader, video)
}

async function decodeSerialCodeFrame(
  reader: ZxingReader,
  video: HTMLVideoElement,
  state?: SerialCodeDecoderState
) {
  const detectedFromVideo = await detectNativeBarcode(state?.barcodeDetector, video)
  if (detectedFromVideo) return detectedFromVideo

  if (state) {
    for (const region of SERIAL_CODE_SCAN_REGIONS) {
      drawSerialCodeRegion(video, state, region)
      const detectedFromCrop = await detectNativeBarcode(state.barcodeDetector, state.cropCanvas)
      if (detectedFromCrop) return detectedFromCrop

      const decodedFromCrop = tryDecodeZxingSource(state.cropReader, state.cropCanvas)
      if (decodedFromCrop) return decodedFromCrop
    }
  }

  return tryDecodeZxingSource(reader, video)
}

function drawSerialCodeRegion(
  video: HTMLVideoElement,
  state: SerialCodeDecoderState,
  region: (typeof SERIAL_CODE_SCAN_REGIONS)[number]
) {
  const sourceWidth = video.videoWidth
  const sourceHeight = video.videoHeight
  const sx = Math.max(0, Math.round(sourceWidth * region.x))
  const sy = Math.max(0, Math.round(sourceHeight * region.y))
  const sWidth = Math.min(sourceWidth - sx, Math.round(sourceWidth * region.width))
  const sHeight = Math.min(sourceHeight - sy, Math.round(sourceHeight * region.height))

  state.cropContext.clearRect(0, 0, SERIAL_CODE_CANVAS_WIDTH, SERIAL_CODE_CANVAS_HEIGHT)
  state.cropContext.imageSmoothingEnabled = false
  state.cropContext.drawImage(
    video,
    sx,
    sy,
    sWidth,
    sHeight,
    0,
    0,
    SERIAL_CODE_CANVAS_WIDTH,
    SERIAL_CODE_CANVAS_HEIGHT
  )
}

async function detectNativeBarcode(detector: NativeBarcodeDetector | undefined, source: ZxingDecodeSource) {
  if (!detector) return ""

  try {
    const detections = await detector.detect(source)
    for (const detection of detections) {
      const rawValue = normalizeDecodedCodeText(detection.rawValue ?? "")
      if (rawValue) return rawValue
    }
  } catch {
    // Browser barcode detection is optional; fall back to ZXing.
  }

  return ""
}

function createNativeBarcodeDetector() {
  const BarcodeDetector = typeof window !== "undefined" ? (window as NativeBarcodeDetectorWindow).BarcodeDetector : undefined
  if (!BarcodeDetector) return undefined

  try {
    return new BarcodeDetector({ formats: NATIVE_BARCODE_DETECTOR_FORMATS })
  } catch {
    try {
      return new BarcodeDetector()
    } catch {
      return undefined
    }
  }
}

function tryDecodeZxingSource(reader: ZxingReader, source: ZxingDecodeSource) {
  try {
    return normalizeDecodedCodeText(getZxingDecodedText(reader.decode(source)))
  } catch {
    return ""
  }
}

function getZxingDecodedText(result: ZxingDecodedResult) {
  return typeof result.getText === "function" ? result.getText() : result.text ?? ""
}

function normalizeDecodedCodeText(value: string) {
  return value.trim()
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
    if (scanMode === "serial-code") return applyNativeCodeTrackConstraints(track, advanced)

    const zoom = capabilities.zoom
    if (typeof zoom === "object" && zoom !== null && "min" in zoom && "max" in zoom) {
      const min = typeof zoom.min === "number" ? zoom.min : 1
      const max = typeof zoom.max === "number" ? zoom.max : min
      advanced.push({ zoom: Math.min(max, Math.max(min, 2)) })
    }
    await applyNativeCodeTrackConstraints(track, advanced)
  } catch {
    // Some mobile browsers expose camera capability keys but reject tuning; scanning should continue.
  }
}

async function applyNativeCodeTrackConstraints(track: MediaStreamTrack, advanced: NativeCodeCameraTuningConstraintSet[]) {
  if (advanced.length > 0) {
    await track.applyConstraints({ advanced } as MediaTrackConstraints)
  }
}

function supportsStringCapability(value: unknown, expected: string) {
  return Array.isArray(value) && value.includes(expected)
}
