import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const workspace = read("src/components/audit/audit-scan-workspace.tsx")

function functionBlock(name: string) {
  const start = workspace.indexOf(`function ${name}(`)
  const nextFunction = workspace.indexOf("\n  function ", start + 1)
  assert.ok(start >= 0, `${name} should exist`)
  return workspace.slice(start, nextFunction >= 0 ? nextFunction : undefined)
}

test("opening a new target clears the saved notice from the previous result", () => {
  assert.match(functionBlock("openItem"), /setSaved\(null\)/)
  assert.match(functionBlock("openOutOfScope"), /setSaved\(null\)/)
})

test("the saved result and the offline queue are announced without relying on colour", () => {
  const banner = read("src/components/audit/audit-scan-saved-banner.tsx")
  const offlineBar = read("src/components/audit/audit-scan-offline-bar.tsx")

  assert.match(banner, /role="status"/)
  assert.match(offlineBar, /role="status"/)
  assert.match(offlineBar, /if \(online && queue\.length === 0\) return null/)
})
