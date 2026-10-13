import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("cancel dialog previews blockers and preserves the required reason", () => {
  const source = readFileSync("src/components/asset-operations/transaction-cancel-dialog.tsx", "utf8")
  assert.match(source, /AccessibleDialog/)
  assert.match(source, /cancel-preview/)
  assert.match(source, /expectedUpdatedAt/)
  assert.match(source, /reason/)
  assert.match(source, /reason\.trim\(\)\.length < 5/)
  assert.match(source, /aria-live="polite"/)
  assert.match(source, /<Button[\s\S]*?variant="danger"/)
  assert.match(source, /<AccessibleDialogFooter>[\s\S]*?variant="destructive"[\s\S]*?busy=\{saving\}/)
})

test("void documents retain evidence and render cancellation metadata", () => {
  const printSource = readFileSync("src/components/asset-operations/operation-document-print.tsx", "utf8")
  const bannerSource = readFileSync("src/components/asset-operations/void-document-banner.tsx", "utf8")
  assert.match(printSource, /VoidDocumentBanner/)
  assert.match(printSource, /data-void-watermark/)
  assert.match(bannerSource, /voidReason/)
  assert.match(bannerSource, /voidedBy/)
  assert.match(bannerSource, /voidedAt/)
})

test("checkout, checkin, transfer, and asset detail surfaces expose cancellation", () => {
  const paths = [
    "src/app/[locale]/(print)/asset-management/checkouts/[id]/page.tsx",
    "src/app/[locale]/(print)/asset-management/checkins/[id]/page.tsx",
    "src/app/[locale]/(print)/asset-management/transfers/[id]/page.tsx",
    "src/app/[locale]/(dashboard)/assets/[id]/page.tsx",
  ]
  for (const path of paths) {
    const source = readFileSync(path, "utf8")
    assert.match(source, path.includes("(dashboard)/assets/[id]") ? /cancelTransaction=\{/ : /TransactionCancelDialog/, path)
    assert.match(source, /transactionStatus === "active"/, path)
  }
  assert.match(
    readFileSync("src/components/assets/asset-detail-action-menu.tsx", "utf8"),
    /<TransactionCancelDialog ref=\{cancelDialogRef\}/,
  )
})

test("transaction cancellation copy is complete in Thai and English", () => {
  for (const locale of ["th", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))
    const copy = messages.transactionCancellation
    for (const key of [
      "action",
      "title",
      "description",
      "reasonLabel",
      "confirm",
      "voidLabel",
      "blockedTitle",
      "success",
    ]) {
      assert.equal(typeof copy?.[key], "string", `${locale}.${key}`)
    }
  }
})

// Phase 2C batch 4 (spec 2C §5.5 row 4, §6.3 #39-#40, §6.4.1, §6.5.3, §4.3 F1-F4, §4.13): layout B on the body and
// footer parts, the reason a shared field that keeps maxLength, the confirm busy in place (focus stays on it while the
// cancellation saves) and the trigger the danger Button. Cancel is disabled by the dialog while saving, as before.
test("the transaction cancel dialog uses the dialog parts, a shared reason field and a busy destructive confirm (2C batch 4)", () => {
  const source = readFileSync("src/components/asset-operations/transaction-cancel-dialog.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /\{hideTrigger \? null : \(\n\s+<Button variant="danger" onClick=\{\(\) => void openPreview\(\)\}>\n\s+<Undo2 aria-hidden="true" \/>/)
  assert.match(source, /<AccessibleDialogBody>\n\s+\{loading \? \(/)
  assert.match(source, /<Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" \/>\{labels\.loading\}/)
  assert.match(source, /<Field label=\{labels\.reasonLabel\} className="mt-4">\n\s+<Textarea ref=\{reasonRef\}[^\n]*maxLength=\{2000\}[^\n]*className="min-h-28" \/>\n\s+<\/Field>/)
  assert.match(source, /<AccessibleDialogFooter>\n\s+<AccessibleDialogCancel>\{labels\.cancel\}<\/AccessibleDialogCancel>\n\s+<Button variant="destructive" busy=\{saving\} disabled=\{loading \|\| blockers\.length > 0\} onClick=\{\(\) => void submitCancellation\(\)\}>\n\s+\{labels\.confirm\}\n\s+<\/Button>\n\s+<\/AccessibleDialogFooter>/)
  assert.doesNotMatch(source, /<button\b|<textarea|<label\b|max-h-\[calc|disabled:opacity|sm:grid-cols-2/)
})
