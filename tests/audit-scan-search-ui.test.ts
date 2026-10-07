import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).auditScan

test("the search field sticks to the top on phones, avoids iOS zoom and holds the camera button", () => {
  const source = read("src/components/audit/audit-scan-search.tsx")
  assert.match(source, /<form[\s\S]*?role="search"/)
  assert.match(source, /sticky top-0[^"]*md:static/)
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

test("search and lookup copy exists in Thai and English", () => {
  const keys = ["searchItemsLabel", "searchItemsPlaceholder", "searchClear", "openCamera", "searchResultCount", "searchNoResult", "searchRegister", "searchRegisterLoading", "lookupOutOfScope", "lookupCandidates", "lookupInRound", "lookupNotInRound", "lookupUnknown", "lookupOffline", "matchedSerial", "matchedFixedAsset", "matchedCustodian", "inLocation", "badgePending", "cameraPermissionDenied"]
  for (const locale of ["th", "en"] as const) {
    assert.deepEqual(keys.filter((key) => typeof messages(locale)[key] !== "string"), [], locale)
  }
})
