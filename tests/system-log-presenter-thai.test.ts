import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  buildSystemLogPresentation,
  KNOWN_LOG_FIELDS,
  type SystemLogPresenterInput,
  type SystemLogRecordLabels,
} from "../src/lib/system-log-presenter.ts"
import { formatDate, formatDateTime } from "../src/lib/utils.ts"

// Group 12 plan 2 task 2 (spec §4 "Summary fixes"): the shared presenter reads in Thai with the real messages, the way
// /admin/logs and /admin/approvals/history build their translate (systemLogPage, dots read as underscores).
type Messages = Record<string, string>
const messagesOf = (locale: "th" | "en"): Messages => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).systemLogPage
const th = messagesOf("th")
const en = messagesOf("en")
const translateOf = (messages: Messages) => (key: string) => messages[key.replaceAll(".", "_")] ?? key
const tTh = translateOf(th)

const recordId = "7f0c2b1e-4d5a-4c3b-9a8e-1f2d3c4b5a69"
const thai = /[฀-๿]/

function logOf(input: { action: string; module: string; old?: unknown; next?: unknown }): SystemLogPresenterInput {
  return {
    id: "log-thai",
    action: input.action,
    module: input.module,
    recordId,
    oldValue: input.old === undefined ? null : JSON.stringify(input.old),
    newValue: input.next === undefined ? null : JSON.stringify(input.next),
    remark: null,
    createdAt: new Date("2026-11-08T03:00:00.000Z"),
    user: { username: "admin", displayName: "System Administrator" },
  }
}

const noLabels: SystemLogRecordLabels = {}

// The text a viewer reads: the sentence, the before/after table, and the module and action names.
function shownText(result: ReturnType<typeof buildSystemLogPresentation>) {
  return [result.summary, result.moduleLabel, result.actionLabel, ...result.changes.flatMap((c) => [c.field, c.before, c.after])].join(" | ")
}

test("audit finding review reads in Thai", () => {
  const result = buildSystemLogPresentation(
    logOf({ action: "approve_finding", module: "audit", old: { reviewStatus: "pending" }, next: { reviewStatus: "approved" } }),
    noLabels,
    "th",
    tTh
  )
  assert.equal(result.changes.length, 1)
  const [change] = result.changes
  assert.match(change.field, thai)
  assert.match(change.before, thai)
  assert.match(change.after, thai)
  assert.doesNotMatch(shownText(result), /reviewStatus|pending|approved/)
})

test("an asset state review reads its review status in Thai, resolved and dismissed included", () => {
  for (const [action, after] of [["asset_state_review_resolve", "resolved"], ["asset_state_review_dismiss", "dismissed"]] as const) {
    const result = buildSystemLogPresentation(
      logOf({ action, module: "asset", old: { reviewStatus: "pending" }, next: { reviewStatus: after } }),
      noLabels,
      "th",
      tTh
    )
    assert.match(result.changes[0].after, thai, action)
    assert.match(result.changes[0].before, thai, action)
    assert.doesNotMatch(shownText(result), /reviewStatus|pending|resolved|dismissed/, action)
  }
})

test("ISO dates are formatted", () => {
  const result = buildSystemLogPresentation(
    logOf({ action: "update", module: "maintenance", old: {}, next: { returnDate: "2026-11-08T03:00:00.000Z", reportedDate: "2026-11-08" } }),
    noLabels,
    "th",
    tTh
  )
  const afters = result.changes.map((change) => change.after)
  assert.ok(afters.includes(formatDateTime("2026-11-08T03:00:00.000Z")), afters.join(", "))
  assert.ok(afters.includes(formatDate("2026-11-08")), afters.join(", "))
  assert.doesNotMatch(result.summary, /2026-11-08/)
})

test("every known field has a Thai label", () => {
  assert.ok(KNOWN_LOG_FIELDS.length > 300, `only ${KNOWN_LOG_FIELDS.length} fields listed`)
  const missingTh = KNOWN_LOG_FIELDS.filter((key) => typeof th[`field_${key}`] !== "string")
  const missingEn = KNOWN_LOG_FIELDS.filter((key) => typeof en[`field_${key}`] !== "string")
  assert.deepEqual(missingTh, [], "th field labels missing")
  assert.deepEqual(missingEn, [], "en field labels missing")
  // The secrets and the plumbing ids never reach the table, so they are not listed.
  for (const hidden of ["password", "ldap_bind_password", "receiverSignature", "id", "createdAt", "referenceId"]) {
    assert.equal(KNOWN_LOG_FIELDS.includes(hidden), false, hidden)
  }
})

test("each known field reads its Thai label, never its raw name", () => {
  for (const key of KNOWN_LOG_FIELDS) {
    const result = buildSystemLogPresentation(logOf({ action: "update", module: "asset", old: { [key]: "a" }, next: { [key]: "b" } }), noLabels, "th", tTh)
    assert.equal(result.changes.length, 1, key)
    assert.notEqual(result.changes[0].field, key, key)
  }
})

test("a field no list knows still shows a Thai label, not its raw name", () => {
  const result = buildSystemLogPresentation(logOf({ action: "update", module: "asset", old: { someNewField: "a" }, next: { someNewField: "b" } }), noLabels, "th", tTh)
  assert.match(result.changes[0].field, thai)
  assert.doesNotMatch(shownText(result), /someNewField|some New Field/)
})

test("storage module has a Thai label", () => {
  const result = buildSystemLogPresentation(
    logOf({ action: "storage_archive_orphan_file", module: "storage", old: { relativePath: "asset/2026/11/a.pdf" }, next: { archiveRelativePath: "_archive/asset/2026/11/a.pdf" } }),
    noLabels,
    "th",
    tTh
  )
  assert.equal(result.moduleLabel, "พื้นที่จัดเก็บไฟล์")
  assert.match(result.actionLabel, thai)
  assert.doesNotMatch(shownText(result), /relativePath|archiveRelativePath|storage_archive/)
})

test("every module and action the code logs has a label in th and en", () => {
  const modules = ["storage", "report", "asset_label", "asset_purchase", "disposal_round"]
  const actions = [
    "update_permissions", "storage_archive_orphan_file", "legacy_return_backfill", "bulk_move", "bulk_update", "print_label",
    "component_late_return", "component_install", "component_remove", "correct_status", "update_action_plan", "close_action_plan",
    "mark_not_found", "cancel", "scan_out_of_scope", "scan_result_corrected", "component_confirmed_with_parent", "create_batch",
    "create_plan", "complete", "update_plan", "pause_plan", "resume_plan", "end_plan", "scan", "checkout_cancel", "checkin_cancel",
    "transfer_cancel", "reactivate", "export", "import", "import_batch",
  ]
  for (const messages of [th, en]) {
    for (const module of modules) assert.equal(typeof messages[`module_${module}`], "string", `module_${module}`)
    for (const action of actions) assert.equal(typeof messages[`action_${action}`], "string", `action_${action}`)
  }
})

test("enum values read in Thai: handover, holder type, sign-in, employment, plan, document, outcome, issue, severity", () => {
  const cases: Array<[string, string, string]> = [
    ["checkoutType", "user", "department"],
    ["handoverMode", "permanent_assignment", "temporary_loan"],
    ["authMode", "local", "ad"],
    ["employmentStatus", "active", "resigned"],
    ["frequency", "monthly", "quarterly"],
    ["planState", "active", "paused"],
    ["documentType", "purchase_order", "invoice"],
    ["attachmentType", "before_repair", "after_repair"],
    ["expectedOutcome", "reattached", "standalone"],
    ["issueType", "personal_ready_with_custodian", "incompatible_status_condition"],
    ["severity", "warning", "critical"],
    ["locationType", "Building", "Room"],
    ["riskPreset", "all", "high_value"],
    ["employmentStatus", "suspended", "active"],
  ]
  for (const [field, before, after] of cases) {
    const result = buildSystemLogPresentation(logOf({ action: "update", module: "asset", old: { [field]: before }, next: { [field]: after } }), noLabels, "th", tTh)
    const [change] = result.changes
    assert.notEqual(change.before, before, `${field} ${before}`)
    assert.notEqual(change.after, after, `${field} ${after}`)
    assert.match(change.after, thai, `${field} ${after}`)
  }
})

test("a summary reads as a Thai sentence: action, record, then Thai fields and values joined by spaces", () => {
  const labels: SystemLogRecordLabels = { asset: new Map([[recordId, "IT-0001 - Notebook"]]) }
  const result = buildSystemLogPresentation(
    logOf({ action: "update", module: "asset", old: { handoverMode: "temporary_loan", warrantyEndDate: "2026-01-31" }, next: { handoverMode: "permanent_assignment", warrantyEndDate: "2027-01-31" } }),
    labels,
    "th",
    tTh
  )
  assert.ok(result.summary.startsWith(`${th.action_update} IT-0001 - Notebook: `), result.summary)
  assert.doesNotMatch(result.summary, /handoverMode|warrantyEndDate|temporary_loan|permanent_assignment|2027-01-31|\s{2}/)
  assert.ok(result.summary.includes(formatDate("2027-01-31")), result.summary)
})

test("values already redacted stay redacted, and secret fields never show", () => {
  const settings = buildSystemLogPresentation(
    { ...logOf({ action: "update", module: "setting", old: { ldap_bind_dn: "[REDACTED]", ldap_bind_password: "[REDACTED]" }, next: { ldap_bind_dn: "cn=new", ldap_bind_password: "[REDACTED]" } }), recordId: "system_settings" },
    noLabels,
    "th",
    tTh
  )
  assert.deepEqual(settings.changes.map((c) => c.before), ["[REDACTED]"])
  assert.doesNotMatch(shownText(settings), /ldap_bind_password|รหัสผ่าน/)

  const user = buildSystemLogPresentation(logOf({ action: "update", module: "user", old: { username: "a" }, next: { username: "b", password: "[changed]" } }), noLabels, "th", tTh)
  assert.deepEqual(user.changes.map((c) => c.after), ["b"])
  assert.doesNotMatch(shownText(user), /\[changed\]/)
})
