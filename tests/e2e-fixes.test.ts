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

test("the A4 documents' fields are a description list (e2e fix task FX1: TX-A3, AR1, D1, M8)", () => {
  const print = read("src/components/asset-operations/operation-document-print.tsx")
  assert.match(print, /<dl className="grid grid-cols-1 border border-slate-300 sm:grid-cols-2">\n\s*\{section\.fields\.map\(\(field, index\) => \(\n[\s\S]*?<\/dt>\n[\s\S]*?<\/dd>\n\s*<\/div>\n\s*\)\)\}\n\s*<\/dl>/)
  assert.doesNotMatch(print, /<div className="grid grid-cols-1 border border-slate-300 sm:grid-cols-2">/)
  assert.ok(!read("e2e/transactions/findings.spec.ts").includes(`test.fail(true, "TX-A3: `))
  assert.ok(!read("e2e/repair/repair-record.spec.ts").includes(`test.fail(true, "AR1: `))
  assert.ok(!read("e2e/disposal/single-request.spec.ts").includes(`test.fail(true, "finding D1:`))
  assert.ok(!read("e2e/cross-cutting/field-errors.spec.ts").includes(`test.fail(true, "M8: `))
})

test("the asset page's QR code has a name a screen reader reads (e2e fix task FX2: TX-A2, AR2, M6)", () => {
  const qr = read("src/components/assets/asset-qr-code.tsx")
  assert.match(qr, /const t = useTranslations\("asset"\)/)
  assert.match(qr, /<QRCodeSVG value=\{value\} size=\{160\} level="M" includeMargin title=\{t\("qrCodeTitle", \{ label \}\)\} \/>/)
  assert.equal(messages("th").asset.qrCodeTitle, "QR Code ของ {label}")
  assert.equal(messages("en").asset.qrCodeTitle, "QR code of {label}")
  assert.ok(!read("e2e/transactions/findings.spec.ts").includes(`test.fail(true, "TX-A2: `))
  assert.ok(!read("e2e/repair/repair-record.spec.ts").includes(`test.fail(true, "AR2: `))
  assert.ok(!read("e2e/cross-cutting/roles.spec.ts").includes(`test.fail(true, "M6: `))
})
