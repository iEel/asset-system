import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

// ของใช้สิ้นเปลือง plan 2 task 3: the dialogs (issue, receive, adjust, add/edit kind, deactivate). Source pins, CRLF-safe.
const dir = "src/components/consumables/"
const issuePath = `${dir}consumable-issue-dialog.tsx`
const receivePath = `${dir}consumable-receive-dialog.tsx`
const adjustPath = `${dir}consumable-adjust-dialog.tsx`
const kindPath = `${dir}consumable-kind-dialog.tsx`
const workspacePath = `${dir}consumables-workspace.tsx`
const read = (path: string) => (existsSync(path) ? readFileSync(path, "utf8").replace(/\r\n/g, "\n") : "")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as Record<string, Record<string, string>>

// The key names of the first JSON.stringify({ … }) after `anchor`: the request body the dialog sends.
function bodyKeys(source: string, anchor: string): string[] {
  const at = source.indexOf(anchor)
  assert.ok(at >= 0, `${anchor} is in the source`)
  const match = source.slice(at).match(/body: JSON\.stringify\(\{([^}]*)\}\)/)
  assert.ok(match, `a JSON body follows ${anchor}`)
  return match[1].split(",").map((part) => part.trim().split(":")[0].trim()).filter(Boolean)
}

// ---------------------------------------------------------------- requests

test("issue: posts { itemId, quantity, assetId, note } to /api/consumables/issue", () => {
  const source = read(issuePath)
  assert.ok(source, "the issue dialog exists")
  assert.match(source, /fetch\("\/api\/consumables\/issue", \{\s*method: "POST"/)
  assert.deepEqual(bodyKeys(source, '"/api/consumables/issue"'), ["itemId", "quantity", "assetId", "note"])
})

test("receive: posts { itemId, quantity, receivedDate, note } to /api/consumables/receive", () => {
  const source = read(receivePath)
  assert.ok(source, "the receive dialog exists")
  assert.match(source, /fetch\("\/api\/consumables\/receive", \{\s*method: "POST"/)
  assert.deepEqual(bodyKeys(source, '"/api/consumables/receive"'), ["itemId", "quantity", "receivedDate", "note"])
})

test("adjust: posts { itemId, counted, reason } to /api/consumables/adjust", () => {
  const source = read(adjustPath)
  assert.ok(source, "the adjust dialog exists")
  assert.match(source, /fetch\("\/api\/consumables\/adjust", \{\s*method: "POST"/)
  assert.deepEqual(bodyKeys(source, '"/api/consumables/adjust"'), ["itemId", "counted", "reason"])
})

test("kind: POST /api/consumables to add, PATCH /api/consumables/[id] to edit, with all three fields", () => {
  const source = read(kindPath)
  assert.ok(source, "the kind dialog exists")
  assert.match(source, /const url = item \? `\/api\/consumables\/\$\{item\.id\}` : "\/api\/consumables"/)
  assert.match(source, /method: item \? "PATCH" : "POST"/)
  assert.deepEqual(bodyKeys(source, "fetch(url"), ["name", "unit", "minQuantity"])
  // A taken name reads consumableNameExists under ชื่อ: the server's fieldErrors.name, shown by the field.
  assert.match(source, /fieldErrors\.applyServer\(payload\)/)
  assert.match(source, /error=\{fieldErrors\.message\("name"\)\}/)
})

test("deactivate: ConfirmDialog, then PATCH { isActive: false } only", () => {
  const ws = read(workspacePath)
  assert.match(ws, /useConfirm\(\)/)
  assert.match(ws, /fetch\(`\/api\/consumables\/\$\{item\.id\}`, \{\s*method: "PATCH"/)
  assert.deepEqual(bodyKeys(ws, "`/api/consumables/${item.id}`"), ["isActive"])
  assert.match(ws, /body: JSON\.stringify\(\{ isActive: false \}\)/)
  assert.match(ws, /title: t\("deactivateTitle", \{ name: item\.name \}\)/)
  assert.match(ws, /item\.onHand > 0 \? t\("deactivateBody", \{ onHand: item\.onHand, unit: item\.unit \}\) : t\("deactivateBodyEmpty"\)/)
  assert.match(ws, /tone: "destructive"/)
})

// ---------------------------------------------------------------- the issue picker

test("issue: the picker runs mode=\"consumable\"; lockedAsset replaces it with a read-only line", () => {
  const source = read(issuePath)
  assert.match(source, /export function ConsumableIssueDialog\(/)
  assert.match(source, /initialItemId\?: string/)
  assert.match(source, /lockedAsset\?: \{ id: string; label: string \}/)
  assert.match(source, /<AssetOperationPicker[^>]*mode="consumable"/)
  assert.match(source, /\{lockedAsset \? \([\s\S]*?data-consumable-locked-asset[\s\S]*?\) : \(\s*<AssetOperationPicker/)
  assert.match(source, /const assetId = lockedAsset\?\.id \?\? asset\?\.id \?\? ""/)
})

test("issue: kinds read \"name (คงเหลือ n)\" and an out-of-stock kind is disabled with the reason", () => {
  const source = read(issuePath)
  assert.match(source, /<SearchableSelect/)
  assert.match(source, /label: t\("itemOption", \{ name: item\.name, onHand: item\.onHand \}\)/)
  assert.match(source, /disabled: item\.onHand === 0/)
  assert.match(source, /description: item\.onHand === 0 \? t\("outReason"\) : null/)
  assert.match(source, /t\("afterIssue", \{ left: /)
})

test("issue: no client-side short block; เหลือหลังเบิก only for 1 ≤ quantity ≤ on hand, shortWithCount above it as a hint (plan 2 final review)", () => {
  const source = read(issuePath)
  // The snapshot never refuses: no setShort from the kind, and a valid form always reaches fetch.
  assert.doesNotMatch(source, /setShort\(\{ onHand: selected\.onHand/)
  assert.doesNotMatch(source, /quantityNumber > selected\.onHand/)
  assert.doesNotMatch(source, /Math\.max\(selected\.onHand - quantityNumber, 0\)/)
  assert.match(source, /const errors = validate\(\{ itemId, quantity, assetId, note \}\)\n\s*fieldErrors\.setErrors\(errors\)\n\s*if \(focusFirstError\(\)\) return/)
  assert.match(
    source,
    /const quantityHint = !showPreview \|\| short\n\s*\? undefined\n\s*: quantityNumber <= selected\.onHand\n\s*\? t\("afterIssue", \{ left: selected\.onHand - quantityNumber \}\)\n\s*: t\("shortWithCount", \{ onHand: selected\.onHand, unit: selected\.unit \}\)/,
  )
  assert.match(source, /hint=\{quantityHint\}/)
})

// ---------------------------------------------------------------- responses

test("issue: with the machine locked, a server refusal of assetId is the dialog's alert line and refreshes (plan 3 final review)", () => {
  const source = read(issuePath)
  assert.match(source, /import \{ readFieldErrors \} from "@\/lib\/field-error-client"/)
  assert.match(source, /const validationMessage = useValidationMessage\(\)/)
  // Read before applyServer, so the refusal never waits for a field the locked line does not have.
  const check = source.indexOf("const assetRefused = lockedAsset ? readFieldErrors(payload)?.assetId : undefined")
  assert.ok(check > 0, "the locked dialog reads the assetId refusal (status 400 or 404 both name it)")
  assert.ok(check < source.indexOf("fieldErrors.applyServer(payload)"), "before the field errors")
  assert.match(source.slice(check), /if \(assetRefused\) \{\n\s*setAssetRefusal\(assetRefused\)\n\s*router\.refresh\(\)\n\s*return\n\s*\}/)
  assert.match(source, /setError\(null\)\n\s*setAssetRefusal\(null\)/, "a new submit clears it")
  assert.match(source, /\{assetRefusal \|\| error \? \(\s*<p role="alert" className="mt-3 text-sm text-danger">\s*\{assetRefusal \? validationMessage\(assetRefusal\) : <ApiErrorText error=\{error\} \/>\}\s*<\/p>\s*\) : null\}/)
})

test("issue: a 409 CONSUMABLE_SHORT reads onHand and unit into shortWithCount, then refreshes", () => {
  const source = read(issuePath)
  assert.match(source, /response\.status === 409 && payload\?\.code === "CONSUMABLE_SHORT"/)
  assert.match(source, /setShort\(\{ onHand: Number\(payload\.onHand\), unit: String\(payload\.unit\) \}\)/)
  assert.match(source, /t\("shortWithCount", \{ onHand: short\.onHand, unit: short\.unit \}\)/)
  assert.match(source, /setShort\([^\n]*\)\n[^\n]*fieldErrors\.setErrors\(\{ quantity: "consumableShort" \}\)\n[^\n]*focusFirstError\(\)\n[^\n]*router\.refresh\(\)/)
})

test("each dialog: on 200 close, a toast, then router.refresh()", () => {
  for (const path of [issuePath, receivePath, adjustPath, kindPath]) {
    const source = read(path)
    assert.match(source, /onClose\(\)\n\s*toast\.success\([^\n]*\)\n\s*router\.refresh\(\)/, path)
  }
})

// ---------------------------------------------------------------- guards

test("each dialog passes busy, locks a second submit and returns focus to the opener", () => {
  for (const path of [issuePath, receivePath, adjustPath, kindPath]) {
    const source = read(path)
    assert.match(source, /<AccessibleDialog[\s\S]*?busy=\{isSubmitting\}/, path)
    assert.match(source, /returnFocusRef=\{returnFocusRef\}/, path)
    assert.match(source, /if \(submittingRef\.current\) return/, path)
    assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate/, path)
    assert.match(source, /const FIELD_IDS = \{/, path)
    assert.match(source, /function validate\(/, path)
    assert.match(source, /role="alert"/, path)
  }
})

test("adjust: submit is disabled while counted === onHand, with the noChange hint", () => {
  const source = read(adjustPath)
  assert.match(source, /const unchanged = countedNumber === item\.onHand/)
  assert.match(source, /<Button type="submit" busy=\{isSubmitting\} disabled=\{unchanged\}/)
  assert.match(source, /unchanged \? t\("noChange"\)/)
  assert.match(source, /t\("adjustLine", \{ from: item\.onHand, to: countedNumber, diff: /)
  assert.match(source, /useState\(\(\) => String\(item\.onHand\)\)/)
})

test("receive: the date defaults to today in Bangkok and has max today", () => {
  const source = read(receivePath)
  assert.match(source, /import \{ getBangkokDateKey \} from "@\/lib\/preventive-maintenance"/)
  assert.match(source, /const today = getBangkokDateKey\(new Date\(\)\)/)
  assert.match(source, /useState\(today\)/)
  assert.match(source, /type="date"[\s\S]{0,200}max=\{today\}/)
  assert.match(source, /hint=\{t\("receivedDateHint"\)\}/)
})

test("workspace: mounts the four dialogs on the chosen action and gives focus back to the opener", () => {
  const ws = read(workspacePath)
  for (const name of ["ConsumableIssueDialog", "ConsumableReceiveDialog", "ConsumableAdjustDialog", "ConsumableKindDialog"]) {
    assert.match(ws, new RegExp(`<${name}[\\s\\S]*?returnFocusRef=\\{openerRef\\}`), name)
  }
  assert.match(ws, /active\?\.kind === "issue"/)
  assert.match(ws, /initialItemId=\{active\?\.item\?\.id\}/)
})

// ---------------------------------------------------------------- words

test("messages: the dialog words in both languages", () => {
  const th = messages("th").consumablesPage
  const en = messages("en").consumablesPage
  const keys = [
    "field_item", "field_quantity", "field_asset", "field_note", "field_receivedDate", "field_counted", "field_reason",
    "field_name", "field_unit", "field_min", "itemOption", "itemPlaceholder", "itemSearch", "itemEmpty", "afterIssue",
    "issueTitle", "issueSubmit", "issueToast", "receiveTitle", "receiveSubmit", "receiveToast", "receivedDateHint",
    "adjustTitle", "adjustSubmit", "adjustToast", "adjustLine", "noChange", "createTitle", "editTitle", "createSubmit",
    "editSubmit", "createToast", "editToast", "deactivateTitle", "deactivateBody", "deactivateBodyEmpty",
    "deactivateConfirm", "deactivateToast", "shortWithCount", "errorFallback",
  ]
  for (const key of keys) {
    assert.ok(th[key], `th ${key}`)
    assert.ok(en[key], `en ${key}`)
  }
  assert.equal(th.shortWithCount, "ของในตู้ไม่พอ เหลือ {onHand, number} {unit}")
  assert.equal(th.afterIssue, "เหลือหลังเบิก: {left, number}")
  assert.equal(th.adjustLine, "เดิม {from, number} → ใหม่ {to, number} (ต่าง {diff})")
  assert.equal(th.deactivateTitle, "ปิดใช้งาน {name}?")
  assert.equal(th.deactivateBody, "ยังเหลือ {onHand, number} {unit} ในตู้ · ประวัติยังอยู่ครบ")
  assert.equal(th.deactivateBodyEmpty, "ประวัติยังอยู่ครบ")
  assert.equal(th.receivedDateHint, "วันที่รับของเข้าตู้ ต้องไม่หลังวันนี้")
  assert.equal(th.itemOption, "{name} (คงเหลือ {onHand, number})")
})
