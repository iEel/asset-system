import type { PreferredCameraSelection } from "./camera-selection.ts"

type AssetQrCameraTuningConstraintSet = MediaTrackConstraintSet & {
  focusMode?: string
  exposureMode?: string
  whiteBalanceMode?: string
  zoom?: number
}

export type NativeAssetQrScannerRuntime = {
  stop: () => void
}

type ZxingQrResult = {
  getText?: () => string
  text?: string
}

type ZxingQrReader = {
  decode: (video: HTMLVideoElement) => ZxingQrResult
}

type ZxingBrowserModule = {
  BrowserQRCodeReader: new (timeBetweenScansMillis?: number) => ZxingQrReader
}

export function buildAssetQrVideoConstraints(cameraSelection?: PreferredCameraSelection): MediaTrackConstraints {
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

export async function startNativeAssetQrScanner({
  readerId,
  cameraSelection,
  onScanSuccess,
  stopAfterSuccess = true,
}: {
  readerId: string
  cameraSelection: PreferredCameraSelection
  onScanSuccess: (decodedText: string) => void
  stopAfterSuccess?: boolean
}): Promise<NativeAssetQrScannerRuntime> {
  const readerElement = document.getElementById(readerId)
  if (!readerElement) throw new Error("Scanner reader is not mounted")

  const stream = await navigator.mediaDevices.getUserMedia({
    video: buildAssetQrVideoConstraints(cameraSelection),
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
    await waitForAssetQrVideo(video)
    await playPromise
    await tuneAssetQrMediaStream(stream)

    const { BrowserQRCodeReader } = (await import(
      "html5-qrcode/third_party/zxing-js.umd.js"
    )) as unknown as ZxingBrowserModule
    const reader = new BrowserQRCodeReader(100)
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

async function waitForAssetQrVideo(video: HTMLVideoElement) {
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

function getZxingDecodedText(result: ZxingQrResult) {
  return typeof result.getText === "function" ? result.getText() : result.text ?? ""
}

async function tuneAssetQrMediaStream(stream: MediaStream) {
  try {
    const track = stream.getVideoTracks()[0]
    if (!track) return

    const capabilities =
      typeof track.getCapabilities === "function"
        ? (track.getCapabilities() as MediaTrackCapabilities & Record<string, unknown>)
        : undefined
    if (!capabilities) return

    const advanced: AssetQrCameraTuningConstraintSet[] = []

    if (supportsStringCapability(capabilities.focusMode, "continuous")) advanced.push({ focusMode: "continuous" })
    if (supportsStringCapability(capabilities.exposureMode, "continuous")) advanced.push({ exposureMode: "continuous" })
    if (supportsStringCapability(capabilities.whiteBalanceMode, "continuous")) advanced.push({ whiteBalanceMode: "continuous" })
    const zoom = capabilities.zoom
    if (typeof zoom === "object" && zoom !== null && "min" in zoom && "max" in zoom) {
      const min = typeof zoom.min === "number" ? zoom.min : 1
      const max = typeof zoom.max === "number" ? zoom.max : min
      advanced.push({ zoom: Math.min(max, Math.max(min, 2)) })
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
