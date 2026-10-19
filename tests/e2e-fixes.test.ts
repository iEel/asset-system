import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import test from "node:test"

// The fix round of the E2E workflow suite (spec docs/superpowers/specs/2026-10-19-e2e-workflow-suite-design.md §9):
// one test per app finding the suite found, appended by its fix task. Each pins the fix in the source (or runs the
// pure module) and that the finding's E2E test is no longer marked expected to fail. The working tree may be CRLF:
// every read strips \r.
const read = (file: string) => readFileSync(file, "utf8").replace(/\r/g, "")
const messages = (locale: "th" | "en") => JSON.parse(read(`messages/${locale}.json`)) as Record<string, Record<string, unknown>>

function filesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = path.join(directory, entry)
    return statSync(full).isDirectory() ? filesUnder(full) : [full.replaceAll("\\", "/")]
  })
}

test("a page reached by a client-side navigation records no load time of its own (e2e suite fix task SF1: SN2)", () => {
  const measure = read("e2e/support/measure.ts")
  assert.match(measure, /if \(!navigation \|\| navigation\.loadEventEnd === 0 \|\| new URL\(navigation\.name\)\.pathname !== location\.pathname\) return null/)
})
