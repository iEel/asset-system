import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")

function functionBlock(name: string) {
  const start = source.indexOf(`function ${name}`)
  const nextFunction = source.indexOf("\n  function ", start + 1)
  assert.ok(start >= 0, `${name} should exist`)
  return source.slice(start, nextFunction >= 0 ? nextFunction : undefined)
}

test("switching to an in-round target clears feedback from the prior scan result", () => {
  const block = functionBlock("selectInRoundAuditItem")

  assert.match(block, /setScanFeedback\(null\)/)
})

test("audit result and offline queue changes are announced without relying on visual color", () => {
  const scanResultStart = source.indexOf("function ScanResultPanel")
  const recentPanelStart = source.indexOf("function RecentScansPanel", scanResultStart)
  const scanResult = source.slice(scanResultStart, recentPanelStart)

  assert.match(scanResult, /role="status"/)
  assert.match(scanResult, /aria-live="polite"/)
  assert.match(source, /offlineQueue\.length > 0[\s\S]*role="status"/)
})
