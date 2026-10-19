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

test("a view-only role is offered no create, edit or scan link (e2e fix task FX6: M5)", () => {
  const register = read("src/app/[locale]/(dashboard)/assets/page.tsx")
  assert.match(register, /actions=\{canCreateAssets \? \(\n\s*<Link href=\{`\/\$\{locale\}\/assets\/new`\}/)
  const detail = read("src/app/[locale]/(dashboard)/assets/[id]/page.tsx")
  assert.match(detail, /const healthFixHref = \(section: string\) => \(canEditAsset \? editHref : section\)/)
  assert.doesNotMatch(detail, /createHealthItem\([^\n]*, editHref\)/)
  const rounds = read("src/app/[locale]/(dashboard)/audit/rounds/page.tsx")
  assert.match(rounds, /const canCreateRound = hasPermission\(user, "audit", "create"\)/)
  assert.match(rounds, /const canScan = hasPermission\(user, "audit", "edit"\)/)
  assert.match(rounds, /href: canScan && pendingRounds\[0\] \? appendOperationalReturnTo\(/)
  assert.match(rounds, /actions=\{canCreateRound \? \(\n\s*<Link href=\{`\/\$\{locale\}\/audit\/rounds\/new`\}/)
  assert.ok(!read("e2e/cross-cutting/roles.spec.ts").includes(`test.fail(true, "M5: `))
})

test("a typed asset tag that exists is the tag's field error, not a 500 (e2e fix task FX7: M3)", async () => {
  const { apiErrorKeyByMessage } = await import("../src/lib/api-error-catalog.ts")
  assert.equal(apiErrorKeyByMessage["Asset tag already exists"], "assetTagExists")
  assert.equal((messages("th").apiErrors as Record<string, string>).assetTagExists, "รหัสทรัพย์สินนี้ถูกใช้งานแล้ว")
  for (const route of ["src/app/api/assets/route.ts", "src/app/api/assets/[id]/route.ts"]) {
    const source = read(route)
    assert.match(source, /async function assertUniqueAssetTag\(assetTag\?: string \| null, excludeId\?: string\)/, route)
    assert.match(source, /throw new FieldRefusalError\("Asset tag already exists", \{ assetTag: "duplicate" \}\)/, route)
  }
  assert.match(read("src/app/api/assets/route.ts"), /await assertUniqueSerial\(input\.serialNumber\)\n\s*await assertUniqueAssetTag\(input\.assetTag\)/)
  assert.ok(!read("e2e/cross-cutting/field-errors.spec.ts").includes(`test.fail(true, "M3: `))
})

test("a thumbnail whose file is outside this server's upload folder is not found, not a 500 (e2e fix task FX8: M7)", async () => {
  const uploads = await import("../src/lib/uploads.ts")
  assert.equal(typeof uploads.isOutsideUploadRootError, "function")
  const outside = (() => { try { uploads.assertSafeUploadPath(path.resolve("/var/www/asset-system/uploads/x.png")); return null } catch (error) { return error } })()
  assert.ok(outside && uploads.isOutsideUploadRootError(outside), "a path outside the root is its own error")
  assert.ok(!uploads.isOutsideUploadRootError(new Error("ENOENT")))
  const route = read("src/app/api/attachments/[id]/thumbnail/route.ts")
  assert.match(route, /if \(isMissingFileError\(error\) \|\| isOutsideUploadRootError\(error\)\) \{\n\s*return NextResponse\.json\(\{ error: "Attachment file not found" \}, \{ status: 404 \}\)/)
  const allow = read("e2e/support/allow-list.ts")
  assert.match(allow, /id: "foreign-attachment-thumbnail",\n\s*kind: "response",\n\s*url: \/\\\/api\\\/attachments\\\/\[0-9a-f-\]\{36\}\\\/thumbnail\$\/,\n\s*status: \[404\],/)
})

test("every asset lifecycle refusal has its Thai sentence, and the handover form shows it (e2e fix task FX9: TX-A1)", async () => {
  const { apiErrorKeyByMessage } = await import("../src/lib/api-error-catalog.ts")
  const policy = read("src/lib/asset-lifecycle-policy.ts")
  const union = policy.slice(policy.indexOf("export type AssetLifecycleErrorCode ="), policy.indexOf("export type AssetCustodyContext"))
  const codes = [...union.matchAll(/"(ASSET_STATUS_[A-Z_]+)"/g)].map((match) => match[1])
  assert.equal(codes.length, 7)
  const th = messages("th").apiErrors as Record<string, string>
  for (const code of codes) {
    const key = apiErrorKeyByMessage[code]
    assert.ok(key, `${code} has a catalog key`)
    assert.ok(th[key] && !/ASSET_STATUS/.test(th[key]), `${code} → apiErrors.${key}`)
  }
  assert.equal(apiErrorKeyByMessage.ASSET_STATUS_CHECKOUT_NOT_ALLOWED, "statusBlocksCheckout")
  assert.equal(apiErrorKeyByMessage.ASSET_STATUS_TRANSFER_NOT_ALLOWED, "statusBlocksTransfer")
  // The handover and transfer forms pass the code on to the toast, which reads it through the catalog (describeApiError).
  assert.match(read("src/components/asset-operations/checkout-form.tsx"), /throw new Error\(getCheckoutErrorMessage\(payload\?\.code \?\? payload\?\.error\)\)/)
  assert.ok(!read("e2e/transactions/handover.spec.ts").includes(`test.fail(true, "TX-A1: `))
})

test("a transfer's TR- document is reached from the asset's history (e2e fix task FX10: TX-A4)", () => {
  const detail = read("src/app/[locale]/(dashboard)/assets/[id]/page.tsx")
  assert.match(detail, /await prisma\.assetTransfer\.findMany\(\{ where: \{ id: \{ in: transferIds \} \}, select: \{ id: true, documentNo: true \} \}\)/)
  assert.match(detail, /if \(movement\.referenceType === "transfer" && movement\.referenceId\) \{\n\s*const transfer = transfersById\.get\(movement\.referenceId\)/)
  assert.match(detail, /\{ label: t\("documentNo"\), value: transfer\.documentNo, href: `\/\$\{locale\}\/asset-management\/transfers\/\$\{movement\.referenceId\}` \}/)
  // The transfer form still goes back to where it came from (whether it should open the TR- document, as the handover
  // and the return open theirs, is the user's call).
  assert.ok(read("src/components/asset-operations/transfer-form.tsx").includes("router.push(returnTo ?? `/${locale}/assets/${values.assetId}`)"))
  assert.ok(!read("e2e/transactions/transfer.spec.ts").includes(`test.fail(true, "TX-A4: `))
})

test("a cancel in the asset's history reads in Thai (e2e fix task FX11: TX-A5)", () => {
  const detail = read("src/app/[locale]/(dashboard)/assets/[id]/page.tsx")
  const known = detail.slice(detail.indexOf("const knownMovementTypeKeys = new Set(["))
  const th = messages("th").asset.movementTypes as Record<string, string>
  const en = messages("en").asset.movementTypes as Record<string, string>
  for (const type of ["checkout_cancel", "checkin_cancel", "transfer_cancel"]) {
    assert.ok(known.slice(0, known.indexOf("])")).includes(`"${type}",`), type)
    assert.ok(th[type] && en[type], type)
  }
  assert.equal(th.checkout_cancel, "ยกเลิกการส่งมอบ")
  assert.equal(th.checkin_cancel, "ยกเลิกการรับคืน")
  assert.equal(th.transfer_cancel, "ยกเลิกการโอนย้าย")
  assert.ok(!read("e2e/transactions/cancel.spec.ts").includes(`test.fail(true, "TX-A5: `))
})

test("the cancel dialog names the person who made the transaction (e2e fix task FX12: TX-A7)", () => {
  const helper = read("src/lib/transaction-operator-label.ts")
  assert.match(helper, /export async function getTransactionOperatorLabel\(userId: string\): Promise<string> \{/)
  assert.match(helper, /if \(user\.employee\) return `\$\{user\.employee\.code\} - \$\{user\.employee\.fullNameTh\}`/)
  const detail = read("src/app/[locale]/(dashboard)/assets/[id]/page.tsx")
  assert.match(detail, /originalOperator: latestTransactionOperator,/)
  assert.match(detail, /latestAssetTransaction && latestAssetTransaction\.type !== "checkin"\n\s*\? await getTransactionOperatorLabel\(latestAssetTransaction\.operator\)/)
  assert.match(read("src/app/[locale]/(print)/asset-management/checkouts/[id]/page.tsx"), /originalOperator=\{await getTransactionOperatorLabel\(checkout\.checkedOutBy\)\}/)
  assert.match(read("src/app/[locale]/(print)/asset-management/transfers/[id]/page.tsx"), /originalOperator=\{await getTransactionOperatorLabel\(transfer\.createdBy\)\}/)
  assert.ok(!read("e2e/transactions/cancel.spec.ts").includes(`test.fail(true, "TX-A7: `))
})
