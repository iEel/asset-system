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

test("a region that scrolls takes the keyboard: the dialog body and the batch receipt's table (e2e fix task FX3: TX-A8, D3, M9)", () => {
  const dialog = read("src/components/ui/accessible-dialog.tsx")
  const body = dialog.slice(dialog.indexOf("export function AccessibleDialogBody("), dialog.indexOf("export function AccessibleDialogFooter("))
  assert.match(body, /new ResizeObserver\(measure\)/)
  assert.match(body, /new MutationObserver\(measure\)/)
  assert.match(body, /element\.scrollHeight > element\.clientHeight \+ 1/)
  assert.match(body, /element\.closest\("\[aria-labelledby\]"\)\?\.getAttribute\("aria-labelledby"\)/)
  assert.match(body, /role=\{overflowing \? "region" : undefined\} aria-labelledby=\{overflowing \? labelledBy : undefined\} tabIndex=\{overflowing \? 0 : undefined\} data-slot="accessible-dialog-body" className=\{cn\("min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5", className\)\}/)
  assert.match(read("src/components/assets/asset-batch-form.tsx"), /<DataTable framed=\{false\} minWidth=\{640\} caption=\{t\("batchReceiptAssets"\)\} scrollHint=\{tCommon\("tableScrollHint"\)\} className="mt-2">/)
  assert.ok(!read("e2e/transactions/findings.spec.ts").includes(`test.fail(true, "TX-A8: `))
  assert.ok(!read("e2e/disposal/batch-bulk-approval.spec.ts").includes(`test.fail(true, "finding D3:`))
  assert.ok(!read("e2e/cross-cutting/field-errors.spec.ts").includes(`"M9: `))
})

test("the audit exports show only to a role with audit:export (e2e fix task FX4: AU1, M1)", () => {
  const findings = read("src/app/[locale]/(dashboard)/audit/findings/page.tsx")
  assert.match(findings, /const canExport = hasPermission\(user, "audit", "export"\)/)
  assert.match(findings, /\{canExport \? \(\n\s*<div className="flex min-w-0 flex-col gap-2 md:flex-row md:flex-wrap">\n\s*<a href=\{`\/api\/audit-findings\/export\?/)
  const round = read("src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx")
  assert.match(round, /const canExportRound = round\.status !== "cancelled" && hasPermission\(user, "audit", "export"\)/)
  assert.ok(!read("e2e/audit/field-audit.spec.ts").includes(`test.fail(true, "AU1: `))
  assert.ok(!read("e2e/cross-cutting/reports.spec.ts").includes(`test.fail(true, "M1: `))
})

test("the import template and the import wizard show only to a role with asset:create (e2e fix task FX5: M2)", () => {
  const page = read("src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx")
  assert.match(page, /const canImport = hasPermission\(user, "asset", "create"\)/)
  assert.match(page, /\{canImport \? \(\n\s*<ActionLink\n\s*download\n\s*href="\/api\/assets\/import-template"/)
  const register = read("src/app/[locale]/(dashboard)/assets/page.tsx")
  assert.match(register, /\{canCreateAssets \? \(\n\s*<AssetImportPreviewPanel/)
  assert.ok(!read("e2e/cross-cutting/reports.spec.ts").includes(`test.fail(true, "M2: `))
})
