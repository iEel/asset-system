import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { waitForDialogToClose } from "../src/lib/field-focus.ts"

// V track plan 2, area O: the asset operation forms show their errors under the field (spec
// docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md §4, §5 #9–#13, §7). One test per task, appended in
// order. The working tree is CRLF on Windows: every read strips \r before the multi-line regexes.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("a review dialog closes before the form's field takes focus: waitForDialogToClose waits for the dialog that holds focus to leave and hand focus back (v-track O1)", async () => {
  const globals = globalThis as unknown as Record<string, unknown>
  const had = { document: Object.hasOwn(globals, "document"), frame: Object.hasOwn(globals, "requestAnimationFrame") }
  const saved = { document: globals.document, frame: globals.requestAnimationFrame }
  // Frames run when the test says so.
  const frames: Array<() => void> = []
  const nextFrame = () => frames.shift()?.()
  const tick = () => new Promise((resolve) => setTimeout(resolve, 5))
  globals.requestAnimationFrame = (callback: () => void) => frames.push(callback)
  try {
    // Focus in no dialog (a client-side error: the review never opened): resolves at once.
    globals.document = { activeElement: { closest: () => null } }
    await waitForDialogToClose()
    assert.equal(frames.length, 0, "no frame was asked for")

    // Focus in the review dialog: it resolves only after the dialog has left the page, and after the task in which the
    // dialog hands focus back to its opener (Radix runs it after the unmount), so the field takes focus last.
    // The fake document keeps no focusin listeners: here the hand-back is a task, and the 10 frames after the close end the wait.
    const listen = { addEventListener: () => {}, removeEventListener: () => {} }
    const dialog = { isConnected: true, getClientRects: () => [{}] }
    globals.document = { ...listen, activeElement: { closest: (selector: string) => (selector === '[role="dialog"]' ? dialog : null) } }
    const order: string[] = []
    const closing = waitForDialogToClose().then(() => order.push("field"))
    nextFrame()
    nextFrame()
    await tick()
    assert.equal(order.length, 0, "still open")
    dialog.isConnected = false
    setTimeout(() => order.push("dialog hands focus back"), 0)
    for (let frame = 0; frame <= 10; frame += 1) nextFrame()
    await closing
    assert.deepEqual(order, ["dialog hands focus back", "field"])

    // A dialog that never leaves: it gives up after the frames it was given, like waitForElement.
    const stuck = { isConnected: true, getClientRects: () => [{}] }
    globals.document = { ...listen, activeElement: { closest: () => stuck } }
    let gaveUp = false
    const waiting = waitForDialogToClose(2).then(() => {
      gaveUp = true
    })
    nextFrame()
    nextFrame()
    nextFrame()
    await waiting
    assert.equal(gaveUp, true)
  } finally {
    if (had.document) globals.document = saved.document
    else delete globals.document
    if (had.frame) globals.requestAnimationFrame = saved.frame
    else delete globals.requestAnimationFrame
  }
  const focus = read("src/lib/field-focus.ts")
  assert.match(focus, /export function waitForDialogToClose\(frames = 60\): Promise<void>/)
  assert.match(focus, /const dialog = document\.activeElement\?\.closest\('\[role="dialog"\]'\)/)
  assert.doesNotMatch(focus, /from "@\/|"use client"|from "react"/)
})

const C = "src/components/"
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// The body of the module-level `function validate(`, up to the first line that is only "}".
function validateBody(source: string) {
  const start = source.search(/^function validate\(/m)
  assert.notEqual(start, -1, "a module-level function validate(")
  const end = source.indexOf("\n}\n", start)
  return source.slice(start, end)
}

// The shape every operation form shares (plan 1's M-R1 to M-R4, O-R1): the FIELD_IDS table in visual order (several
// server keys may share the one control that shows them, O-R3), each id once in the markup, validate() through the hook,
// the server's refusal on the same fields, focus on the first wrong field, and no toast for a validation error. A
// dialog without a <form> (O-R6) passes noValidate: false. A shared id is one control of two rendered by a condition
// (ส่งมอบ's destination: the shared picker for ทรัพย์สินอื่น, the select for the other types), so it is written twice.
function assertOperationForm(source: string, form: { ids: Record<string, string>; noValidate?: false; shared?: readonly string[] }) {
  if (form.noValidate !== false) assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate[ >\n]/, "noValidate directly after onSubmit")
  assert.match(source, /import \{ useFieldErrors(?:, useValidationMessage)? \} from "@\/components\/ui\/use-field-errors"/)
  const block = source.match(/const FIELD_IDS = \{\n([\s\S]*?)\n\} as const/)
  assert.ok(block, "const FIELD_IDS = { … } as const")
  assert.deepEqual(block[1].split("\n"), Object.entries(form.ids).map(([key, id]) => `  ${key}: "${id}",`), "FIELD_IDS: the fields in visual order with their ids")
  for (const id of new Set(Object.values(form.ids))) {
    assert.equal(source.match(new RegExp(`\\bid="${escape(id)}"`, "g"))?.length, form.shared?.includes(id) ? 2 : 1, `id "${id}" once on the page`)
  }
  assert.match(source, /fieldErrors\.setErrors\(validate\(/, "the client's errors come from validate()")
  assert.match(source, /if \(fieldErrors\.applyServer\(payload\) && focusFirstError\(\)\) return/, "the server's fieldErrors land on the same fields")
  assert.match(source, /fieldErrors\.focusFirst\(FIELD_ORDER, /, "focus goes to the first wrong field")
  assert.doesNotMatch(source, /\btoast\.(?:error|warning)\(/, "no validation toast (the catch keeps apiError.toast)")
}

const messagesOf = (locale: string) => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as Record<string, Record<string, unknown>>

test("checkout: errors under the field, the handover rules with the server's codes, and a refusal from the review back on its field (v-track O2)", () => {
  const source = read(`${C}asset-operations/checkout-form.tsx`)
  assertOperationForm(source, {
    ids: {
      assetId: "checkout-asset",
      checkoutType: "checkout-type",
      custodianId: "checkout-destination",
      departmentId: "checkout-destination",
      locationId: "checkout-destination",
      parentAssetId: "checkout-destination",
      handoverMode: "checkout-handover-mode",
      conditionBefore: "checkout-condition",
      checkoutDate: "checkout-date",
      expectedReturnDate: "checkout-expected-return",
    },
    shared: ["checkout-destination"],
  })
  const rules = validateBody(source)
  for (const rule of [
    'check("assetId", required(values.asset) ?? (values.asset?.eligible === false ? "invalid" : null))',
    'check("checkoutType", required(values.checkoutType))',
    "check(destinationKey(values.checkoutType), required(destinationValue(values)))",
    'if (values.checkoutType === "user") check("handoverMode", required(values.handoverMode) && "handoverModeRequired")',
    'check("conditionBefore", required(values.conditionBefore))',
    'check("checkoutDate", required(values.checkoutDate))',
    '(required(values.expectedReturnDate) && "handoverTemporaryDueDateRequired") ??',
    '(notBefore(values.expectedReturnDate, values.checkoutDate) && "handoverReturnBeforeCheckout"),',
  ]) assert.ok(rules.includes(rule), rule)
  // Every message under its control; the one destination select shows the key of the checkout type (O-R3).
  for (const key of ["assetId", "checkoutType", "handoverMode", "conditionBefore", "checkoutDate", "expectedReturnDate"]) {
    assert.ok(source.includes(`error={errorText("${key}")}`), key)
  }
  assert.ok(source.includes("error={errorText(destinationKey(values.checkoutType))}"))
  // The handover codes, from the form or the server, read the checkout form's own sentences (spec §7.1, O-R2).
  assert.ok(source.includes("return code && Object.hasOwn(HANDOVER_MESSAGE_KEYS, code) ? t(HANDOVER_MESSAGE_KEYS[code]) : fieldErrors.message(key)"))
  for (const [code, key] of [
    ["handoverModeRequired", "handoverModeRequired"],
    ["handoverPermanentUserOnly", "permanentUserOnly"],
    ["handoverPermanentCustodianRequired", "permanentCustodianRequired"],
    ["handoverPermanentNoDueDate", "permanentDueDateNotAllowed"],
    ["handoverTemporaryDueDateRequired", "temporaryDueDateRequired"],
    ["handoverReturnBeforeCheckout", "returnBeforeCheckout"],
  ]) {
    assert.ok(source.includes(`  ${code}: "${key}",\n`), code)
    for (const locale of ["th", "en"]) assert.equal(typeof messagesOf(locale).checkout[key], "string", `${locale}.checkout.${key}`)
  }
  // The two required selects have an id for focus and show their error (V4); the handover mode is one group (F-R8).
  assert.match(source, /<AssetOperationPicker\n\s+id="checkout-asset"\n/)
  assert.match(source, /<SearchableSelect\n\s+id="checkout-destination"\n/)
  assert.match(source, /<AssetOperationPicker\n\s+id="checkout-destination"\n/)
  assert.match(source, /<FieldGroup legend=\{t\("handoverMode"\)\} id="checkout-handover-mode" required error=\{errorText\("handoverMode"\)\}>/)
  // A refusal from the review: the review closes, and the field takes focus once the dialog has gone (O-R1).
  assert.match(source, /const closed = waitForDialogToClose\(\)\n\s+setReviewOpen\(false\)\n\s+await closed\n/)
  assert.ok(source.includes("fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key], reveal: leaveReview })"))
  // Clearing (spec §4.3): the dates are one rule; a new checkout type or handover mode clears what it resets.
  assert.ok(source.includes('if (field === "checkoutDate" || field === "expectedReturnDate") fieldErrors.clear("checkoutDate", "expectedReturnDate")'))
  assert.ok(source.includes('fieldErrors.clear("checkoutType", ...DESTINATION_KEYS, "handoverMode", "expectedReturnDate")'))
  assert.ok(source.includes('fieldErrors.clear("handoverMode", "expectedReturnDate")'))
  // A refusal that names no field of the form keeps today's message through the catch.
  assert.match(source, /throw new Error\(getCheckoutErrorMessage\(payload\?\.code \?\? payload\?\.error\)\)/)
  assert.doesNotMatch(source, /reviewIncomplete/)
  for (const locale of ["th", "en"]) {
    assert.equal(messagesOf(locale).checkout.reviewIncomplete, undefined, `${locale}.checkout.reviewIncomplete has no reader and is removed`)
  }
})

test("checkin: the return date is checked at last, errors under the field instead of four toasts, and a refusal from the review back on its field (v-track O3)", () => {
  const source = read(`${C}asset-operations/checkin-form.tsx`)
  const ids = {
    checkoutId: "checkin-checkout",
    returnDate: "checkin-return-date",
    returnBy: "checkin-return-by",
    receiveBy: "checkin-receive-by",
    conditionAfter: "checkin-condition-after",
    nextStatusId: "checkin-next-status",
    nextLocationId: "checkin-next-location",
  }
  assertOperationForm(source, { ids })
  const rules = validateBody(source)
  for (const rule of [
    'check("checkoutId", required(values.checkoutId))',
    'check("returnDate", required(values.returnDate))',
    'check("returnBy", required(values.returnBy) ?? maxLength(values.returnBy, 100))',
    'check("receiveBy", required(values.receiveBy) ?? maxLength(values.receiveBy, 100))',
    'check("conditionAfter", required(values.conditionAfter))',
    'check("nextStatusId", required(values.nextStatusId))',
    'check("nextLocationId", required(values.nextLocationId))',
  ]) assert.ok(rules.includes(rule), rule)
  for (const key of Object.keys(ids)) if (key !== "checkoutId") assert.ok(source.includes(`error={fieldErrors.message("${key}")}`), key)
  // The asset field shows a chosen row's reason first, then its own error (server search Task 6, spec 6.4).
  assert.ok(source.includes('error={blockedReason ?? fieldErrors.message("checkoutId")}'))
  // The return date had the star and no check (spec §5): native required joins the star and validate() checks it.
  assert.match(source, /<Field label=\{t\("returnDate"\)\} id="checkin-return-date" required error=\{fieldErrors\.message\("returnDate"\)\}>\n\s+<Input type="date" value=\{values\.returnDate\} onChange=\{\(event\) => setField\("returnDate", event\.target\.value\)\} required \/>/)
  // The three required pickers have an id for focus and show their error (V4); the asset is the shared asset picker.
  assert.match(source, /<AssetOperationPicker\n\s+id="checkin-checkout"\n/)
  for (const id of ["checkin-return-by", "checkin-receive-by"]) {
    assert.match(source, new RegExp(`<SearchableSelect\\n\\s+id="${id}"\\n`), id)
  }
  // A refusal from the review closes it, and the field takes focus once the dialog has gone (O-R1).
  assert.match(source, /const closed = waitForDialogToClose\(\)\n\s+setReviewOpen\(false\)\n\s+await closed\n/)
  assert.ok(source.includes("fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key], reveal: leaveReview })"))
  // A refusal that names no field keeps today's handover messages through the catch.
  assert.match(source, /payload\?\.code === "ASSET_HANDOVER_MODE_MISSING"/)
  // Clearing (spec §4.3): a set clears its key; the legacy backfill and the repair status it picks clear theirs.
  assert.match(source, /setValues\(\(current\) => \(\{ \.\.\.current, \[field\]: value \}\)\)\n\s+if \(field in FIELD_IDS\) fieldErrors\.clear\(field as CheckinField\)/)
  assert.ok(source.includes('fieldErrors.clear("checkoutId", "returnBy", "conditionAfter", "nextLocationId")'))
  assert.ok(source.includes('if (value.trim() && !values.nextStatusId && repairStatus) fieldErrors.clear("nextStatusId")'))
  for (const locale of ["th", "en"]) {
    const checkin = messagesOf(locale).checkin
    for (const key of ["selectCheckoutRequired", "selectReturnAndReceiver", "completeRequiredFields"]) {
      assert.equal(checkin[key], undefined, `${locale}.checkin.${key} has no reader and is removed`)
    }
  }
})

test("transfer: errors under the field, the at-least-one destination under the location with the server's code, and a refusal from the review back on its field (v-track O4)", () => {
  const source = read(`${C}asset-operations/transfer-form.tsx`)
  const ids = { assetId: "transfer-asset", toLocationId: "transfer-to-location", reason: "transfer-reason" }
  assertOperationForm(source, { ids })
  const rules = validateBody(source)
  for (const rule of [
    'check("assetId", required(values.asset) ?? (values.asset?.eligible === false ? "invalid" : null))',
    'check("toLocationId", atLeastOne([values.toLocationId, values.toCustodianId, values.toDepartmentId]) && "transferDestinationRequired")',
    'check("reason", required(values.reason) ?? maxLength(values.reason, 500))',
  ]) assert.ok(rules.includes(rule), rule)
  for (const key of ["toLocationId", "reason"]) assert.ok(source.includes(`error={fieldErrors.message("${key}")}`), key)
  // The asset's error is its reason, the cleared-for-custodian line or the field's code, in that order (server search Task 5).
  assert.ok(source.includes("error={assetError}"))
  // The required asset picker has an id for focus and shows its error (V4); the destination rule shows under the
  // location select, the key the server names (O-R4).
  assert.match(source, /<AssetOperationPicker\n\s+id="transfer-asset"\n\s+label=\{t\("asset"\)\}\n[\s\S]*?error=\{assetError\}/)
  assert.match(source, /<SearchableSelect id="transfer-to-location" label=\{t\("toLocation"\)\} [^\n]*error=\{fieldErrors\.message\("toLocationId"\)\}/)
  assert.match(source, /<Field label=\{t\("reason"\)\} id="transfer-reason" required error=\{fieldErrors\.message\("reason"\)\}>/)
  // The three destinations are one rule: a change of any clears it (spec §4.3).
  assert.ok(source.includes('if (field === "toLocationId" || field === "toCustodianId" || field === "toDepartmentId") fieldErrors.clear("toLocationId")'))
  // A refusal from the review closes it, and the field takes focus once the dialog has gone (O-R1).
  assert.match(source, /const closed = waitForDialogToClose\(\)\n\s+setReviewOpen\(false\)\n\s+await closed\n/)
  assert.ok(source.includes("fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key], reveal: leaveReview })"))
  assert.doesNotMatch(source, /destinationRequired"\)/)
  for (const locale of ["th", "en"]) {
    assert.equal(messagesOf(locale).transfer.destinationRequired, undefined, `${locale}.transfer.destinationRequired has no reader and is removed`)
  }
})

test("bulk move: the destination is checked at last, and the errors show under the field and under the asset list (v-track O5)", () => {
  const source = read(`${C}asset-operations/bulk-move-form.tsx`)
  assertOperationForm(source, { ids: { assetIds: "bulk-move-assets", toLocationId: "bulk-move-to-location", reason: "bulk-move-reason" } })
  const rules = validateBody(source)
  for (const rule of [
    'check("assetIds", required(values.assetIds))',
    'check("toLocationId", required(values.toLocationId))',
    'check("reason", required(values.reason) ?? maxLength(values.reason, 500))',
  ]) assert.ok(rules.includes(rule), rule)
  assert.match(source, /fieldErrors\.setErrors\(validate\(\{ \.\.\.values, assetIds \}\)\)/)
  // The destination had the star and nothing checked it (spec §5): an id for focus and its error (V4).
  assert.match(source, /<SearchableSelect id="bulk-move-to-location" label=\{t\("toLocation"\)\} [^\n]*error=\{fieldErrors\.message\("toLocationId"\)\}/)
  assert.match(source, /<Field label=\{t\("reason"\)\} id="bulk-move-reason" required error=\{fieldErrors\.message\("reason"\)\}>/)
  // The asset list is one group with one error under it, in the list's own words; focus goes to its first checkbox (O-R5).
  assert.match(source, /<div\n\s+role="group"\n\s+id="bulk-move-assets"\n\s+aria-labelledby=\{assetsLabelId\}\n\s+aria-describedby=\{fieldErrors\.errors\.assetIds \? "bulk-move-assets-error" : undefined\}\n/)
  assert.ok(source.includes('<FieldError id="bulk-move-assets-error" className="mt-1.5">'))
  assert.ok(source.includes('{fieldErrors.errors.assetIds === "required" ? t("selectAssets") : fieldErrors.message("assetIds")}'))
  assert.match(source, /current\.includes\(assetId\) \? current\.filter\(\(id\) => id !== assetId\) : \[\.\.\.current, assetId\]\n\s+\)\n\s+fieldErrors\.clear\("assetIds"\)/)
})

test("transaction cancel dialog: the reason's error under the field instead of the dialog Notice, and a blocked confirm says why and stays focusable (v-track O6)", () => {
  const source = read(`${C}asset-operations/transaction-cancel-dialog.tsx`)
  assertOperationForm(source, { ids: { reason: "transaction-cancel-reason" }, noValidate: false })
  assert.ok(validateBody(source).includes('check("reason", required(values.reason) ?? minLength(values.reason, 5) ?? maxLength(values.reason, 2000))'))
  assert.doesNotMatch(source, /<form\b/, "a textarea and a button: no <form> to submit (O-R6)")
  assert.doesNotMatch(source, /setError\(labels\.reasonTooShort\)|reason\.trim\(\)\.length < 5/)
  // Empty and too short read the dialog's own sentence; any other code from the server reads the shared one.
  assert.ok(source.includes('error={fieldErrors.errors.reason === "required" || fieldErrors.errors.reason === "tooShort" ? labels.reasonTooShort : fieldErrors.message("reason")}'))
  assert.match(source, /function changeReason\(value: string\) \{\n\s+setReason\(value\)\n\s+fieldErrors\.clear\("reason"\)\n/)
  // A blocked cancellation keeps its gate (a prerequisite, spec §4.4): aria-disabled, tied to the blockers it lists.
  assert.match(source, /if \(blocked\) return\n/)
  assert.ok(source.includes('<Button variant="destructive" busy={saving} disabled={loading} aria-disabled={blocked || undefined} aria-describedby={blocked ? "transaction-cancel-blockers" : undefined} onClick={() => void submitCancellation()}>'))
  assert.match(source, /<Notice tone="warning" role="status" title=\{labels\.blockedTitle\} id="transaction-cancel-blockers" className="mt-4">/)
  // Each opening starts without the last opening's errors.
  assert.match(source, /setBlockers\(\[\]\)\n\s+fieldErrors\.setErrors\(\{\}\)/)
})
