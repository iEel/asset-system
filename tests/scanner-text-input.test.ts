import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("asset QR scanner uses an undistorted camera preview and QR-only native reader", () => {
  const source = readFileSync("src/components/ui/scanner-text-input.tsx", "utf8")
  const helper = readFileSync("src/lib/asset-qr-scanner.ts", "utf8")

  assert.match(source, /scanMode === "asset-qr"[\s\S]+aspect-\[4\/3\]/)
  assert.match(source, /scanMode === "asset-qr"[\s\S]+startNativeAssetQrScanner/)
  assert.match(helper, /new BrowserQRCodeReader/)
})

test("asset QR scanner decodes the full viewfinder without CSS distortion", () => {
  const source = readFileSync("src/components/ui/scanner-text-input.tsx", "utf8")
  const helper = readFileSync("src/lib/asset-qr-scanner.ts", "utf8")

  assert.doesNotMatch(source, /qrbox: getResponsiveSquareQrBox/)
  assert.match(source, /scanMode === "asset-qr"\s+\?\s+"w-full \[&_video\]:!h-auto \[&_video\]:!w-full"/)
  assert.doesNotMatch(source, /\[&_video\]:!object-(?:fill|cover)/)
  assert.match(helper, /ASSET_QR_CAMERA_WIDTH = 4096/)
  assert.match(helper, /ASSET_QR_CAMERA_HEIGHT = 3072/)
  assert.match(helper, /width: \{ ideal: ASSET_QR_CAMERA_WIDTH \}/)
  assert.match(helper, /height: \{ ideal: ASSET_QR_CAMERA_HEIGHT \}/)
  assert.match(helper, /aspectRatio: \{ ideal: 1\.333 \}/)
})

test("asset QR scanner requests high-resolution focus-friendly camera constraints and tuning", () => {
  const helper = readFileSync("src/lib/asset-qr-scanner.ts", "utf8")

  assert.match(helper, /function buildAssetQrVideoConstraints/)
  assert.match(helper, /width: \{ ideal: ASSET_QR_CAMERA_WIDTH \}/)
  assert.match(helper, /height: \{ ideal: ASSET_QR_CAMERA_HEIGHT \}/)
  assert.match(helper, /focusMode: "continuous"/)
  assert.match(helper, /exposureMode: "continuous"/)
  assert.match(helper, /await tuneAssetQrMediaStream\(stream\)/)
  assert.match(helper, /zoom: Math\.min/)
})

test("asset QR scanner exposes base, 2x and 3x zoom controls when the camera supports zoom", () => {
  const helper = readFileSync("src/lib/asset-qr-scanner.ts", "utf8")

  assert.match(helper, /type NativeCodeZoomController/)
  assert.match(helper, /zoom\?: NativeCodeZoomController/)
  assert.match(helper, /function createNativeCodeZoomController/)
  assert.match(helper, /function buildNativeCodeZoomLevels/)
  assert.match(helper, /const supportedLevels = buildNativeCodeZoomLevels\(range\)/)
  assert.match(helper, /getSupportedLevels: \(\) => \[\.\.\.supportedLevels\]/)
  assert.match(helper, /async setZoom\(zoom: number\)/)
  assert.match(helper, /track\.applyConstraints\(\{ advanced: \[\{ zoom: nextZoom \}/)
})

test("asset QR scanner input exposes progressive flashlight and zoom controls", () => {
  const source = readFileSync("src/components/ui/scanner-text-input.tsx", "utf8")

  assert.match(source, /Flashlight/)
  assert.match(source, /FlashlightOff/)
  assert.match(source, /torchAvailable/)
  assert.match(source, /torchEnabled/)
  assert.match(source, /zoomAvailable/)
  assert.match(source, /zoomLevels/)
  assert.match(source, /function resetCameraUtilityState/)
  assert.match(source, /function syncCameraUtilityState\(runtime: NativeAssetQrScannerRuntime \| NativeSerialCodeScannerRuntime \| null\)/)
  assert.match(source, /async function toggleTorch/)
  assert.match(source, /async function setScannerZoom\(level: number\)/)
  assert.match(source, /scanMode === "asset-qr" && scannerRunning && zoomAvailable/)
  assert.match(source, /scanMode === "asset-qr" && scannerRunning && torchAvailable/)
  assert.match(source, /zoomLevels\.map\(\(level\) =>/)
  assert.match(source, /formatScannerZoomLabel\(labels\.zoomCamera, level\)/)
  assert.match(source, /labels\.torchUnsupported/)
  assert.match(source, /labels\.zoomUnsupported/)
  assert.match(source, /labels\.cameraOpening/)
})

test("asset QR scanner avoids mobile native detector and mirror flip retries", () => {
  const source = readFileSync("src/components/ui/scanner-text-input.tsx", "utf8")

  assert.match(source, /if \(scanMode === "asset-qr"\) \{[\s\S]*startNativeAssetQrScanner/)
  assert.doesNotMatch(source, /useBarCodeDetectorIfSupported/)
  assert.doesNotMatch(source, /disableFlip/)
})

test("asset QR scanner decodes from the native-resolution video frame", () => {
  const source = readFileSync("src/components/ui/scanner-text-input.tsx", "utf8")
  const helper = readFileSync("src/lib/asset-qr-scanner.ts", "utf8")

  assert.match(source, /startNativeAssetQrScanner/)
  assert.match(helper, /navigator\.mediaDevices\.getUserMedia/)
  assert.match(helper, /html5-qrcode\/third_party\/zxing-js\.umd\.js/)
  assert.match(helper, /new BrowserQRCodeReader/)
  assert.match(helper, /tryDecodeZxingSource\(reader, video\)/)
  assert.match(helper, /video\.videoWidth/)
  assert.match(helper, /video\.videoHeight/)
  assert.match(helper, /stopAfterSuccess = true/)
})

test("asset QR scanner renders its own square overlay instead of the library rectangle", () => {
  const source = readFileSync("src/components/ui/scanner-text-input.tsx", "utf8")

  assert.match(source, /scanMode === "asset-qr" \? <QrScannerOverlay \/> : null/)
  assert.match(source, /function QrScannerOverlay\(\)/)
  assert.doesNotMatch(source, /\[&_#qr-shaded-region\]:!hidden/)
  assert.match(source, /aspect-square h-\[66%\] max-h-56/)
  assert.match(source, /boxShadow: "0 0 0 9999px rgba\(15, 23, 42, 0\.42\)"/)
})

test("asset QR help tells users to frame the QR code instead of the whole label", () => {
  const thMessages = readFileSync("messages/th.json", "utf8")
  const enMessages = readFileSync("messages/en.json", "utf8")

  assert.match(thMessages, /เล็งเฉพาะ QR Code/)
  assert.match(thMessages, /ไม่ต้องใส่ทั้ง Label/)
  assert.match(enMessages, /Center only the QR code/)
  assert.match(enMessages, /not the whole label/)
})

test("serial scanner uses native-resolution ZXing multi-format decoding", () => {
  const source = readFileSync("src/components/ui/scanner-text-input.tsx", "utf8")
  const helper = readFileSync("src/lib/asset-qr-scanner.ts", "utf8")

  assert.match(source, /startNativeSerialCodeScanner/)
  assert.doesNotMatch(source, /new Html5Qrcode\(readerId/)
  assert.match(helper, /BrowserMultiFormatReader/)
  assert.match(helper, /POSSIBLE_FORMATS/)
  assert.match(helper, /TRY_HARDER/)
  assert.match(helper, /BarcodeFormat\.CODE_128/)
  assert.match(helper, /BarcodeFormat\.QR_CODE/)
  assert.match(helper, /tryDecodeZxingSource\(reader, video\)/)
})

test("serial scanner decodes focused scan bands before the full video frame", () => {
  const helper = readFileSync("src/lib/asset-qr-scanner.ts", "utf8")

  assert.match(helper, /SERIAL_CODE_SCAN_REGIONS/)
  assert.match(helper, /SERIAL_CODE_CANVAS_WIDTH/)
  assert.match(helper, /function decodeSerialCodeFrame/)
  assert.match(helper, /drawImage\(\s*video/)
  assert.match(helper, /getImageData\(0, 0, SERIAL_CODE_CANVAS_WIDTH, SERIAL_CODE_CANVAS_HEIGHT\)/)
  assert.match(helper, /tryDecodeZxingImageData\(state\.cropReader, cropImageData\)/)
  assert.match(helper, /RGBLuminanceSource/)
  assert.match(helper, /HybridBinarizer/)
  assert.match(helper, /GlobalHistogramBinarizer/)
  assert.match(helper, /BinaryBitmap/)
  assert.match(helper, /MultiFormatReader/)
  assert.doesNotMatch(helper, /tryDecodeZxingSource\(state\.cropReader, state\.cropCanvas\)/)
  assert.match(helper, /tryDecodeZxingSource\(reader, video\)/)
})

test("serial scanner avoids forced digital zoom and uses native barcode detection when available", () => {
  const helper = readFileSync("src/lib/asset-qr-scanner.ts", "utf8")

  assert.match(helper, /BarcodeDetector/)
  assert.match(helper, /createNativeBarcodeDetector/)
  assert.match(helper, /detectNativeBarcode/)
  assert.match(helper, /if \(scanMode === "serial-code"\) return/)
  assert.doesNotMatch(helper, /const targetZoom = scanMode === "serial-code" \? 2\.5 : 2/)
})

test("serial scanner uses a wide barcode guide without cropping the video", () => {
  const source = readFileSync("src/components/ui/scanner-text-input.tsx", "utf8")
  const helper = readFileSync("src/lib/asset-qr-scanner.ts", "utf8")

  assert.match(source, /scanMode === "serial-code"[\s\S]+aspect-\[16\/9\]/)
  assert.match(source, /scanMode === "serial-code" \? <SerialScannerOverlay \/> : null/)
  assert.match(source, /function SerialScannerOverlay\(\)/)
  assert.doesNotMatch(source, /\[&_video\]:!object-cover/)
  assert.match(helper, /width: \{ ideal: 1920 \}/)
  assert.match(helper, /height: \{ ideal: 1080 \}/)
  assert.match(helper, /aspectRatio: \{ ideal: 1\.777 \}/)
})

test("serial scanner help tells users to center the code in the wide frame", () => {
  const thMessages = readFileSync("messages/th.json", "utf8")
  const enMessages = readFileSync("messages/en.json", "utf8")

  assert.match(thMessages, /กลางกรอบแนวนอน/)
  assert.match(thMessages, /เส้นคมชัด/)
  assert.match(enMessages, /wide frame/)
  assert.match(enMessages, /lines are sharp/)
})

test("scanner can trigger a scan success callback after stopping the camera", () => {
  const source = readFileSync("src/components/ui/scanner-text-input.tsx", "utf8")

  assert.match(source, /onScanSuccess\?: \(value: string\) => void/)
  assert.match(source, /stopScanner\(\)\.finally\(\(\) => \{[\s\S]+onScanSuccess\?\.\(normalizedText\)/)
})
