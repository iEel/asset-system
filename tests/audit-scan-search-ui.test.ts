import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).auditScan

test("the search field sticks to the top on phones, avoids iOS zoom and holds the camera button", () => {
  const source = read("src/components/audit/audit-scan-search.tsx")
  assert.match(source, /<form[\s\S]*?role="search"/)
  // Negative top cancels <main>'s py-4 sm:py-6 so the box sticks flush to the top edge.
  assert.match(source, /sticky -top-4 sm:-top-6/)
  assert.doesNotMatch(source, /sticky top-0/)
  assert.doesNotMatch(source, /md:static/)
  assert.match(source, /text-base/)
  assert.match(source, /inputMode="search"/)
  assert.match(source, /enterKeyHint="search"/)
  assert.match(source, /aria-label=\{cameraOpen \? t\("stopCamera"\) : t\("openCamera"\)\}/)
  assert.match(source, /size-11/)
})

test("typing never searches mid-composition and Enter submits", () => {
  const source = read("src/components/audit/audit-scan-search.tsx")
  assert.match(source, /onCompositionEnd=\{\(event\) => \{[\s\S]*?onTermChange\(event\.currentTarget\.value\)/)
  assert.match(source, /composingRef\.current \|\| \(event\.nativeEvent as InputEvent\)\.isComposing/)
  assert.match(source, /onSubmit=\{\(event\) => \{\s*event\.preventDefault\(\)\s*onSubmit\(\)/)
})

test("results highlight the match, warn about another room, and fall back to the register card", () => {
  const source = read("src/components/audit/audit-scan-search.tsx")
  assert.match(source, /splitSearchHighlight\(/)
  assert.match(source, /<mark/)
  assert.match(source, /room\.locationId && match\.item\.expectedLocationId !== room\.locationId/)
  assert.match(source, /matches\.length === 0 \? lookup/)
})

test("results announce only the count through one quiet live region", () => {
  const source = read("src/components/audit/audit-scan-search.tsx")
  assert.doesNotMatch(source, /<section[^>]*aria-live/)
  assert.match(source, /<p role="status" className="sr-only">\{matches\.length > 0 \? t\("searchResultCount", \{ count: matches\.length \}\) : t\("searchNoResult"\)\}<\/p>/)
})

test("the lookup card never says not-found for offline or server errors", () => {
  const source = read("src/components/audit/audit-scan-lookup-card.tsx")
  for (const status of ["idle", "loading", "out_of_scope", "candidates", "unknown", "offline", "error"]) {
    assert.match(source, new RegExp(`state\\.status === "${status}"`), status)
  }
  assert.match(source, /t\("lookupOffline"\)/)
  assert.match(source, /state\.message/)
})

test("the camera starts after mount, stops on unmount, reads one code and explains a blocked permission", () => {
  const source = read("src/components/audit/audit-scan-camera.tsx")
  assert.match(source, /window\.setTimeout\(\(\) => \{[\s\S]*?void start\(\)/)
  assert.match(source, /return \(\) => \{[\s\S]*?scanner\.stop\(\)/)
  assert.match(source, /stopAfterSuccess: true/)
  assert.match(source, /id="audit-qr-reader"/)
  assert.match(source, /NotAllowedError/)
  assert.match(source, /t\("cameraPermissionDenied"\)/)
  assert.match(source, /error\.name === "NotAllowedError"/)
  assert.match(source, /scrollIntoView/)
  assert.match(source, /\}, \[\]\)/)
})

test("the camera panel scrolls into view below the sticky search bar", () => {
  const source = read("src/components/audit/audit-scan-camera.tsx")
  assert.match(source, /<div ref=\{panelRef\} data-audit-scan-camera className="[^"]*\bscroll-mt-20\b[^"]*"/)
  assert.match(source, /panelRef\.current\?\.scrollIntoView\(/)
})

test("search and lookup copy exists in Thai and English", () => {
  const keys = ["searchItemsLabel", "searchItemsPlaceholder", "searchClear", "openCamera", "searchResultCount", "searchNoResult", "searchRegister", "searchRegisterLoading", "lookupOutOfScope", "lookupCandidates", "lookupInRound", "lookupNotInRound", "lookupUnknown", "lookupOffline", "matchedSerial", "matchedFixedAsset", "matchedCustodian", "inLocation", "badgePending", "cameraPermissionDenied"]
  for (const locale of ["th", "en"] as const) {
    assert.deepEqual(keys.filter((key) => typeof messages(locale)[key] !== "string"), [], locale)
  }
})

// Carried over from the deleted tests/audit-scan-field-mode-ux.test.ts (old scan form).
test("there is exactly one camera reader element across the audit components", async () => {
  const { readdirSync } = await import("node:fs")
  const files = readdirSync("src/components/audit").filter((name) => /\.tsx?$/.test(name))
  const count = files.reduce((total, name) => total + (read(`src/components/audit/${name}`).match(/id="audit-qr-reader"/g) ?? []).length, 0)
  assert.equal(count, 1)
})

test("the camera locks after one read, prefers the rear camera and never exposes a camera picker", () => {
  const source = read("src/components/audit/audit-scan-camera.tsx")
  assert.match(source, /startNativeAssetQrScanner\(\{/)
  assert.match(source, /stopAfterSuccess: true/)
  assert.doesNotMatch(source, /stopAfterSuccess: false/)
  assert.match(source, /resolvePreferredCameraSelection\(cameras, undefined\)/)
  assert.match(source, /getFallbackCameraAfterEnvironmentFailure\(selection, cameras\)/)
  assert.doesNotMatch(source, /selectedCameraId|handleCameraChange|role="switch"/)
  assert.doesNotMatch(source, /t\("cameraDevice"\)|t\("cameraRear"\)|t\("continuousScan"\)|t\("fastMode"\)/)
  assert.doesNotMatch(source, /t\("cameraStatus"\)|t\("cameraReady"\)|t\("cameraRunning"\)/)
  assert.match(read("src/components/audit/audit-scan-workspace.tsx"), /function handleDecoded\(text: string\) \{\s*setCameraOpen\(false\)/)
})

test("the camera uses the large square target with the shared overlay", () => {
  const source = read("src/components/audit/audit-scan-camera.tsx")
  const panels = read("src/components/audit/audit-scan-panels.tsx")
  assert.match(source, /aspect-square w-full sm:aspect-\[4\/3\]/)
  assert.doesNotMatch(source, /aspect-\[4\/3\] min-h-0/)
  assert.match(source, /<AuditQrScannerOverlay \/>/)
  assert.match(panels, /export function AuditQrScannerOverlay/)
  assert.match(panels, /aspect-square h-\[78%\] max-h-72 sm:max-h-80/)
  assert.doesNotMatch(panels, /aspect-square h-\[66%\] max-h-56/)
})

test("flashlight and zoom stay progressive camera enhancements", () => {
  const source = read("src/components/audit/audit-scan-camera.tsx")
  const scanner = read("src/lib/asset-qr-scanner.ts")
  assert.match(scanner, /type NativeCodeTorchController/)
  assert.match(scanner, /torch\?: NativeCodeTorchController/)
  assert.match(scanner, /function createNativeCodeTorchController/)
  assert.match(scanner, /capabilities\.torch/)
  assert.match(scanner, /applyConstraints\(\{ advanced: \[\{ torch: enabled \}/)
  assert.match(scanner, /torchController\?\.setEnabled\(false\)/)

  assert.match(source, /Flashlight/)
  assert.match(source, /FlashlightOff/)
  assert.match(source, /async function toggleTorch/)
  assert.match(source, /aria-pressed=\{torch\.enabled\}/)
  assert.match(source, /t\(torch\.enabled \? "torchOff" : "torchOn"\)/)
  assert.match(source, /t\("torchUnsupported"\)/)

  assert.match(source, /scanner\.zoom\?\.isAvailable\(\) \? scanner\.zoom\.getSupportedLevels\(\) : \[\]/)
  assert.match(source, /async function changeZoom\(level: number\)/)
  assert.match(source, /zoom\.levels\.map\(\(level\) =>/)
  assert.doesNotMatch(source, /\[2, 3\]\.map\(\(level\) =>/)
  assert.match(source, /aria-label=\{t\("zoomCamera", \{ level \}\)\}/)
  assert.match(source, /t\("zoomUnsupported"\)/)
})

test("camera copy (torch, zoom, errors) exists in Thai and English", () => {
  const keys = ["torchOn", "torchOff", "torchUnsupported", "zoomCamera", "zoomUnsupported", "cameraUnsupported", "cameraNotFound", "cameraPermissionDenied", "cameraError", "stopCamera"]
  for (const locale of ["th", "en"] as const) {
    assert.deepEqual(keys.filter((key) => typeof messages(locale)[key] !== "string"), [], locale)
  }
})

test("check-sheet evidence takes several photos with previews that are released", () => {
  const form = read("src/components/audit/audit-scan-check-form.tsx")
  const dropzone = read("src/components/ui/file-dropzone.tsx")
  const types = read("src/components/audit/audit-scan-types.ts")
  assert.match(form, /onFilesChange=\{addPhotos\}/)
  assert.match(form, /\n\s+multiple\n/)
  assert.match(form, /t\("generalAuditPhotoLabel"\)/)
  assert.match(form, /URL\.createObjectURL\(file\)/)
  assert.match(form, /URL\.revokeObjectURL\(photo\.previewUrl\)/)
  assert.match(form, /alt=\{t\("queuedPhotoPreviewAlt", \{ name: photo\.file\.name \}\)\}/)
  assert.match(types, /export type QueuedAuditPhoto = \{[\s\S]*previewUrl: string \| null/)
  assert.match(dropzone, /multiple\?: boolean/)
  assert.match(dropzone, /onFilesChange\?: \(files: File\[\]\) => void/)
  assert.match(dropzone, /Array\.from\(event\.target\.files/)

  for (const locale of ["th", "en"] as const) {
    const copy = messages(locale)
    for (const key of ["generalAuditPhotoLabel", "queuedPhotoPreviewAlt", "dropAuditPhotoHint", "auditPhotoRequiredForMismatch"]) {
      assert.equal(typeof copy[key], "string", `${locale}.${key}`)
    }
    assert.match(copy.auditPhotoRequiredForMismatch, /หลายรูป|multiple/)
    assert.match(copy.dropAuditPhotoHint, /หลายรูป|multiple/)
  }
})

test("a saved result can be edited: the deep link opens it and the save is sent as a correction", () => {
  const workspace = read("src/components/audit/audit-scan-workspace.tsx")
  const route = read("src/app/api/audit-rounds/[id]/scan/route.ts")
  const validation = read("src/lib/validations/audit.ts")
  const offlineQueue = read("src/lib/audit-offline-queue.ts")
  assert.match(workspace, /initialAssetId \? initialItems\.find\(\(row\) => row\.assetId === initialAssetId\)/)
  assert.match(workspace, /openedMode: getCheckMode\(item\)/)
  assert.match(workspace, /resultCorrection,/)
  assert.match(validation, /resultCorrection: z\.boolean\(\)\.default\(false\)/)
  assert.match(route, /input\.resultCorrection \? "scan_result_corrected" : "scan"/)
  assert.match(route, /resultCorrection: input\.resultCorrection/)
  assert.match(offlineQueue, /resultCorrection: boolean/)
})

test("the scan screen offers no not-found action; mobile safe-area padding stays on the shared bars", () => {
  const actionBar = read("src/components/ui/mobile-action-bar.tsx")
  const designSystem = read("src/lib/design-system.ts")
  for (const path of ["src/components/audit/audit-scan-workspace.tsx", "src/components/audit/audit-scan-check-form.tsx"]) {
    assert.doesNotMatch(read(path), /markNotFound|AuditMarkNotFoundButton/, path)
  }
  assert.match(actionBar, /pb-\[max\(0\.75rem,env\(safe-area-inset-bottom\)\)\]/)
  assert.match(designSystem, /pb-\[calc\(6rem\+max\(0\.75rem,env\(safe-area-inset-bottom\)\)\)\] sm:pb-0/)
})
