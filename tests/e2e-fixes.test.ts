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
  // The E2E request sends every preprocessed key the form sends (N16), so the route reaches the tag check (dry run).
  assert.match(read("e2e/cross-cutting/field-errors.spec.ts"), /conditionId: choices\.goodConditionId,\n\s*purchaseDate: null,\n\s*purchasePrice: null,\n\s*licenseTotalSeats: null,/)
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

test("an operation refused for the asset's status says to reload the page (user decision 2026-10-21, FX9)", () => {
  const th = messages("th").apiErrors as Record<string, string>
  const en = messages("en").apiErrors as Record<string, string>
  const thHint = " โหลดหน้าใหม่เพื่อดูสถานะล่าสุด"
  const enHint = " Reload the page to see its current status."
  for (const key of ["statusBlocksCheckout", "statusBlocksTransfer", "statusBlocksCheckin", "statusBlocksMaintenance"]) {
    assert.ok(th[key].endsWith(thHint) && th[key].length > thHint.length, `th ${key}`)
    assert.ok(en[key].endsWith(enHint) && en[key].length > enHint.length, `en ${key}`)
  }
  assert.equal(th.statusBlocksCheckout, "สถานะทรัพย์สินนี้ส่งมอบหรือยืมไม่ได้ โหลดหน้าใหม่เพื่อดูสถานะล่าสุด")
  assert.equal(en.statusBlocksCheckout, "Asset status does not allow checkout. Reload the page to see its current status.")
  for (const key of ["statusBlocksCreate", "statusBlocksEdit"]) {
    assert.ok(!th[key].includes(thHint.trim()), `th ${key} unchanged`)
    assert.ok(!en[key].includes(enHint.trim()), `en ${key} unchanged`)
  }
})

test("a transfer's TR- document is reached from the asset's history (e2e fix task FX10: TX-A4)", () => {
  const detail = read("src/app/[locale]/(dashboard)/assets/[id]/page.tsx")
  assert.match(detail, /await prisma\.assetTransfer\.findMany\(\{ where: \{ id: \{ in: transferIds \} \}, select: \{ id: true, documentNo: true \} \}\)/)
  assert.match(detail, /if \(movement\.referenceType === "transfer" && movement\.referenceId\) \{\n\s*const transfer = transfersById\.get\(movement\.referenceId\)/)
  assert.match(detail, /\{ label: t\("documentNo"\), value: transfer\.documentNo, href: `\/\$\{locale\}\/asset-management\/transfers\/\$\{movement\.referenceId\}` \}/)
  assert.ok(!read("e2e/transactions/transfer.spec.ts").includes(`test.fail(true, "TX-A4: `))
})

test("saving a transfer opens its TR- document, as a handover and a return open theirs (user decision 2026-10-21, FX10)", () => {
  const form = read("src/components/asset-operations/transfer-form.tsx")
  assert.ok(form.includes('import { appendReturnTo } from "@/lib/asset-return-navigation"'))
  assert.ok(form.includes("const documentHref = `/${locale}/asset-management/transfers/${payload.id}`"))
  assert.ok(form.includes("router.push(returnTo ? appendReturnTo(documentHref, returnTo) : documentHref)"))
  assert.ok(!form.includes("router.push(returnTo ?? `/${locale}/assets/${values.assetId}`)"), "no longer back to the asset page")
  // The transfer API answers the created transfer, so the form has its id (and the spec its documentNo).
  const route = read("src/app/api/assets/[id]/transfer/route.ts")
  assert.match(route, /const transfer = await tx\.assetTransfer\.create\(/)
  assert.match(route, /return NextResponse\.json\(transfer, \{ status: 201 \}\)/)
  // The E2E specs expect the TR- document after the save, not the asset page.
  const spec = read("e2e/transactions/transfer.spec.ts")
  assert.ok(spec.includes("await page.waitForURL(new RegExp(`/th/asset-management/transfers/${transfer.id}(?:[?#]|$)`))"))
  assert.ok(!spec.includes("await page.waitForURL(`**/th/assets/${asset.id}`)"))
  const fieldErrors = read("e2e/cross-cutting/field-errors.spec.ts")
  assert.ok(fieldErrors.includes("await expect(page).toHaveURL(new RegExp(`/th/asset-management/transfers/[^/?#]+(?:[?#]|$)`))"))
  assert.ok(!fieldErrors.includes("await expect(page).toHaveURL(new RegExp(`/th/assets/${asset.id}(?:[?#]|$)`))"))
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

test("the TR- document names the custodian before and after (e2e fix task FX13: TX-A6)", () => {
  const print = read("src/app/[locale]/(print)/asset-management/transfers/[id]/page.tsx")
  assert.match(print, /label: t\("fromCustodian"\)/)
  assert.match(print, /label: t\("toCustodian"\)/)
  assert.ok(!read("e2e/transactions/transfer.spec.ts").includes(`test.fail(true, "TX-A6: `))
})

test("two rounds opened at once both get a number: the round's create retries a taken number (e2e fix task FX14: D4)", () => {
  const route = read("src/app/api/audit-rounds/route.ts")
  assert.match(route, /const round = await withPrismaUniqueRetry\(async \(\) => \{\n\s*const auditNo = await generateAuditNo\(input\.auditYear\)/)
  assert.match(route, /import \{ withPrismaUniqueRetry \} from "@\/lib\/prisma-unique-retry"/)
})

test("a form proposes today's date in Bangkok, not the UTC date (e2e fix task FX15: TX-N1, AU3)", () => {
  const offenders = filesUnder("src/components").filter((file) => /\.tsx?$/.test(file) && read(file).includes("new Date().toISOString().slice(0, 10)"))
  assert.deepEqual(offenders, [])
  for (const file of ["src/components/asset-operations/checkout-form.tsx", "src/components/audit/audit-round-form.tsx", "src/components/disposal/disposal-execution-button.tsx"]) {
    assert.match(read(file), /toLocalDateInputValue\(\)/, file)
  }
})

test("an audit page is measured once every finite animation has ended, so a button turning from waiting to ready is read in its final colours (e2e fix loop 1: the dry run's colour-contrast race in the audit walk)", () => {
  const settle = read("e2e/audit/settle.ts")
  assert.match(settle, /document\.getAnimations\(\)\.every\(\(animation\) => animation\.playState !== "running" \|\| animation\.effect\?\.getComputedTiming\(\)\.iterations === Infinity\)/)
  assert.doesNotMatch(settle, /data-sonner-toaster/)
  assert.match(read("e2e/audit/field-audit.spec.ts"), /await recordSettled\(page, measure, "check of the mismatch with its photo"\)/)
})

test("the PM plan's edit page is left only once its asset select has loaded its label, so nothing is cancelled on the phone (e2e fix loop 2: the dry run's aborted maintenance-options request)", () => {
  assert.match(read("e2e/repair/pm-plan.spec.ts"), /toHaveValue\("2026-02-28"\)\n(?:\s*\/\/[^\n]*\n)*\s*await page\.waitForLoadState\("networkidle"\)\n(?:\s*\/\/[^\n]*\n)*\s*let row = await visitPlanRow\(page, measure, title, "PM plans after done"\)/)
})

test("the findings page offers the review controls only to a role with audit:approve (e2e decision DX3 (ก): M4)", () => {
  const findings = read("src/app/[locale]/(dashboard)/audit/findings/page.tsx")
  // Both the card and the table row render AuditFindingReviewActions for canApprove alone, as the review route checks.
  const reviewActions = findings.match(/\{canApprove \? \(\n\s*<AuditFindingReviewActions\b/g) ?? []
  assert.equal(reviewActions.length, 2)
  assert.equal((findings.match(/<AuditFindingReviewActions\b/g) ?? []).length, 2)
  assert.doesNotMatch(findings, /canEdit \|\| canApprove/)
  assert.ok(!read("e2e/cross-cutting/roles.spec.ts").includes(`test.fail(true, "M4: `))
})

test("a tap on the audit check's waiting save opens the note-and-photo section, as the keyboard does (e2e decision DX5 (ก): AU2)", async () => {
  const { cn } = await import("../src/lib/utils.ts")
  const { buttonVariants } = await import("../src/components/ui/button-variants.ts")
  const form = read("src/components/audit/audit-scan-check-form.tsx")
  // save() already opens the section while the photo is missing; the save button alone lets the pointer reach it.
  assert.match(form, /async function save\(\) \{\n\s*if \(missingPhoto\) \{\n\s*setExtrasOpen\(true\)\n\s*return\n\s*\}/)
  const saveButton = form.slice(form.lastIndexOf("<Button", form.indexOf("aria-disabled={missingPhoto || undefined}")), form.indexOf("{saveLabel}"))
  assert.match(saveButton, /className="[^"]*\baria-disabled:pointer-events-auto\b[^"]*"/)
  assert.match(saveButton, /onClick=\{\(\) => void save\(\)\}/)
  assert.equal((form.match(/aria-disabled:pointer-events-auto/g) ?? []).length, 1, "only the save button")
  // The shared Button still blocks the pointer for every other aria-disabled caller; the class merge keeps the override.
  const shared = buttonVariants({ variant: "warning" })
  assert.match(shared, /\baria-disabled:pointer-events-none\b/)
  const merged = cn(shared, "aria-disabled:pointer-events-auto")
  assert.match(merged, /\baria-disabled:pointer-events-auto\b/)
  assert.doesNotMatch(merged, /\baria-disabled:pointer-events-none\b/)
  // The walk taps the waiting save instead of finding the section itself.
  const walk = read("e2e/audit/field-audit.spec.ts")
  // Task 51 loop 11 waits for the condition's list to close before the tap (the two lines it adds are allowed here).
  assert.match(walk, /toHaveAttribute\("aria-disabled", "true"\)\n(?:[^\n]*\n)?(?:\s*\/\/[^\n]*\n)*(?:\s*await expect\(page\.getByRole\("listbox"\)\)\.toHaveCount\(0\)\n\s*await settleToasts\(page\)\n)?\s*await scan\.saveButton\(page\)\.click\(\{ force: true \}\)\n\s*await expect\(scan\.checkForm\(page\)\.getByRole\("button", \{ name: "หมายเหตุ \/ รูป" \}\)\)\.toHaveAttribute\("aria-expanded", "true"\)\n\s*await scan\.addPhoto\(/)
})

test("the bulk execution's dialog takes one shared reference document number for the rows that have none (e2e decision DX2 (ก): D2)", async () => {
  const { disposalBulkExecutionSchema } = await import("../src/lib/validations/disposal.ts")
  const ui = await import("../src/lib/disposal-bulk-execution-ui.ts")
  const base = { mode: "preview", requestIds: ["request-1"], executionDate: "2026-10-20", executedById: "employee-1", nextStatusId: "status-1" }
  // The body: trimmed, blank is none, at most 100 characters (the request's column, and the single execution's field).
  assert.equal(disposalBulkExecutionSchema.parse({ ...base, sharedDocumentNo: "  DOC-1  " }).sharedDocumentNo, "DOC-1")
  assert.equal(disposalBulkExecutionSchema.parse({ ...base, sharedDocumentNo: "   " }).sharedDocumentNo, null)
  assert.equal(disposalBulkExecutionSchema.parse(base).sharedDocumentNo, undefined)
  assert.equal(disposalBulkExecutionSchema.safeParse({ ...base, sharedDocumentNo: "x".repeat(101) }).success, false)
  // The commit sends the number the preview sent; the review shows which number a row uses, as it does the recipient.
  const values = { executionDate: "2026-10-20", executedById: "employee-1", nextStatusId: "status-1", sharedRecipientName: null, sharedDocumentNo: "DOC-SHARED", useHistoricalEvidenceException: false, evidenceExceptionReason: null, evidenceExceptionAcknowledged: false }
  const preview = ui.buildBulkExecutionPayload("preview", ["request-1"], values)
  assert.equal(ui.buildBulkExecutionCommitPayload(preview, ["request-1"]).sharedDocumentNo, "DOC-SHARED")
  assert.deepEqual(ui.resolveBulkExecutionDocumentReview(null, "DOC-SHARED"), { documentNo: "DOC-SHARED", documentSource: "shared" })
  assert.deepEqual(ui.resolveBulkExecutionDocumentReview("DOC-OWN", "DOC-SHARED"), { documentNo: "DOC-OWN", documentSource: "request" })
  assert.deepEqual(ui.resolveBulkExecutionDocumentReview(" ", null), { documentNo: null, documentSource: null })
  assert.deepEqual(ui.resolveBulkExecutionDocumentReview("DOC-OWN", undefined), { documentNo: "DOC-OWN", documentSource: null })

  // The dialog's field: its id, its check (maxLength 100 under the field, V track), shown on the review step.
  const dialog = read("src/components/disposal/disposal-bulk-execution.tsx")
  assert.match(dialog, /sharedDocumentNo: "disposal-bulk-execution-document-no",/)
  assert.match(dialog, /check\("sharedDocumentNo", maxLength\(values\.sharedDocumentNo, 100\)\)/)
  assert.match(dialog, /error=\{fieldErrors\.message\("sharedDocumentNo"\)\}/)
  assert.match(dialog, /fieldErrors\.clear\("sharedDocumentNo"\)/)
  assert.match(dialog, /sharedDocumentNo: sharedDocumentNo\.trim\(\) \|\| null,/)
  // The copy, in Thai and English, from the app's messages.
  for (const locale of ["th", "en"] as const) {
    const page = messages(locale).disposalPage as Record<string, string>
    for (const key of ["bulkExecutionSharedDocumentNo", "bulkExecutionSharedDocumentNoHelp"]) {
      assert.ok(page[key], `${locale} ${key}`)
    }
  }
  assert.equal((messages("th").disposalPage as Record<string, string>).bulkExecutionSharedDocumentNo, "เลขที่เอกสารอ้างอิงร่วม")
  // With neither, the row's refusal reads as today.
  assert.equal(((messages("th").disposalPage as Record<string, Record<string, string>>).errors).DISPOSAL_DOCUMENT_REQUIRED, "กรุณาระบุเลขที่เอกสารอ้างอิงในคำขอตัดจำหน่ายนี้ก่อนดำเนินการ")

  // D2 runs as a plain test: IT staff fill the shared number and the bulk execution executes.
  const spec = read("e2e/disposal/batch-bulk-approval.spec.ts")
  assert.ok(!spec.includes(`test.fail(true, "finding D2:`))
  assert.match(read("e2e/disposal/disposal-support.ts"), /if \(documentNo\) await dialog\.locator\("#disposal-bulk-execution-document-no"\)\.fill\(documentNo\)/)
})

test("a second user with no employee link can be saved, and a clash on the employee answers under its field (e2e decision DX1 (ก): A1)", () => {
  // The migration turns the plain unique constraint (SQL Server keeps one NULL) into a unique index of the same name
  // that ignores NULL, as 2026-10-07-add-active-checkout-unique-index.sql does.
  const migration = read("prisma/manual-migrations/2026-10-20-users-employee-filtered-unique.sql")
  assert.match(migration, /ALTER TABLE \[dbo\]\.\[users\] DROP CONSTRAINT \[users_employeeId_key\];/)
  assert.match(migration, /CREATE UNIQUE NONCLUSTERED INDEX \[users_employeeId_key\]\s+ON \[dbo\]\.\[users\]\(\[employeeId\]\)\s+WHERE \[employeeId\] IS NOT NULL;/)
  assert.match(migration, /SET XACT_ABORT ON;\nBEGIN TRANSACTION;[\s\S]*COMMIT TRANSACTION;\n$/)
  assert.ok(read("docs/03_DATABASE.md").includes("2026-10-20-users-employee-filtered-unique.sql"))

  // A save racing past the route's checks gets the field error, not a 500.
  const route = read("src/app/api/admin/users/route.ts")
  assert.match(route, /if \(isPrismaUniqueConstraintError\(error\)\) return errorResponse\(toUniqueUserRefusal\(error\), 400\)/)
  assert.match(route, /new FieldRefusalError\("Employee already has a user account", \{ employeeId: "employeeHasUser" \}\)/)

  // The suite's viewer is unlinked again (spec §7), and the setup's A1 test runs as a plain test.
  assert.match(read("e2e/support/run-plan.ts"), /viewer: \{ slug: "viewer", linked: false,/)
  assert.ok(!read("e2e/setup/run-data.setup.ts").includes(`setup.fail(true, "A1: `))
})

test("the check field's search is found by its exact name, not the global search beside it (e2e Task 51 loop 3: DX4 left the global search reachable)", () => {
  assert.match(read("e2e/audit/scan-steps.ts"), /const searchInput = page\.getByRole\("combobox", \{ name: "ค้นหา", exact: true \}\)/)
})

test("the bulk execution's preview is read on the row, not the summary term of the same words (e2e Task 51 loop 4: D2 runs now)", () => {
  // The summary's term shows on every preview, eligible or blocked (D3 shares the helper): it says the preview arrived.
  assert.match(read("e2e/disposal/disposal-support.ts"), /await expect\(dialog\.getByRole\("term"\)\.filter\(\{ hasText: \/\^ดำเนินการได้\$\/ \}\)\)\.toBeVisible\(\)/)
})

test("the PM plan form's save is checked on the plan it created, not found on a long list (e2e Task 51 loop 5: the dev data grows run by run)", () => {
  const spec = read("e2e/cross-cutting/field-errors.spec.ts")
  assert.match(spec, /page\.waitForResponse\(\(response\) => response\.request\(\)\.method\(\) === "POST" && new URL\(response\.url\(\)\)\.pathname === "\/api\/maintenance-plans"\)/)
  assert.match(spec, /await measure\.visit\(`\/th\/maintenance\/pm\/\$\{planId\}\/edit`, "the saved PM plan"\)/)
  assert.match(spec, /await expect\(page\.locator\("#maintenance-plan-title"\)\)\.toHaveValue\(title\)/)
})

test("IT staff see neither the review controls nor the segregation note on the findings page (e2e Task 51 loop 6: decision DX3)", () => {
  const spec = read("e2e/audit/field-audit.spec.ts")
  assert.match(spec, /await expect\(page\.getByText\("ไม่สามารถพิจารณารายการไม่ตรงที่คุณเป็นผู้รายงานเองได้"\)\.filter\(\{ visible: true \}\)\)\.toHaveCount\(0\)/)
  assert.doesNotMatch(spec, /getByText\("ไม่สามารถพิจารณารายการไม่ตรงที่คุณเป็นผู้รายงานเองได้"\)\.filter\(\{ visible: true \}\)\.first\(\)\)\.toBeVisible\(\)/)
})

test("a page's font cancelled as the workflow leaves the page is allowed, reviewed (e2e Task 51 loop 7)", async () => {
  const { ALLOW_LIST } = await import("../e2e/support/allow-list.ts")
  const entry = ALLOW_LIST.find((item) => item.id === "static-file-cancelled-on-leave")
  assert.ok(entry && entry.kind === "requestfailed")
  assert.ok(entry.url instanceof RegExp && entry.url.test("http://localhost:3100/_next/static/media/99e609270109b47d-s.40sczeszzbjw1.woff2"))
  assert.ok(entry.url.test("http://localhost:3100/_next/static/chunks/3zxrz4psxl9wv.js"))
  assert.ok(!entry.url.test("http://localhost:3100/api/assets"))
})

test("the bulk execution's result is read on the row; the forced tap on the waiting save waits for the condition list to close (e2e Task 51 loops 10-11)", () => {
  assert.match(read("e2e/disposal/batch-bulk-approval.spec.ts"), /await expect\(result\.getByRole\("listitem"\)\.getByText\("ดำเนินการแล้ว", \{ exact: true \}\)\)\.toBeVisible\(\)/)
  const walk = read("e2e/audit/field-audit.spec.ts")
  assert.match(walk, /await expect\(page\.getByRole\("listbox"\)\)\.toHaveCount\(0\)\n\s+await settleToasts\(page\)\n\s+await scan\.saveButton\(page\)\.click\(\{ force: true \}\)/)
})

test("the open asset search is measured once its opening animation has ended (e2e Task 51 loop 12: axe read the empty line mid-fade on the phone in the dark)", () => {
  const spec = read("e2e/repair/repair-record.spec.ts")
  assert.match(spec, /import \{ recordSettled \} from "\.\.\/audit\/settle\.ts"/)
  assert.match(spec, /await recordSettled\(page, measure, "repair form with the asset search open"\)/)
})
