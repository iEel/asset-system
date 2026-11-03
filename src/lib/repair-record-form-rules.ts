// The rules of the บันทึกซ่อม form (MT-New, group 5 spec §7.3, §7.5; plan 2 G5P2-R3, R5, R6): the client checks, the
// fields on screen, the save's payload, the summary rows "ตอนนี้ → หลังบันทึก", the "ถ้าตอบว่าซ่อมเสร็จแล้ว" block, the
// checklist and the footer's answer. The done question has no default answer (done: null) and the result none either.
// Pure and client-safe: relative imports only, no React, no db.
//
// The summary's message keys, all under repairRecord (Task 3 adds exactly these):
//   createForm.dependsOnAnswer  "ขึ้นกับคำตอบ ซ่อมเสร็จหรือยัง"
//   createForm.dependsOnOutcome "ขึ้นกับผลการซ่อม"
//   createForm.noChange         "ไม่เปลี่ยน"
//   createForm.noHolder         "ไม่มีผู้ถือครอง"
//   createForm.noOpenRecord     "ไม่มีที่ค้าง"
//   createForm.recordOpen       "ยังซ่อมไม่เสร็จ"
//   createForm.recordClosed     "ซ่อมเสร็จแล้ว"
//   createForm.planNext         "ครั้งถัดไป {date}"  ({date} is an ISO day the component formats)
//   createForm.planNotMoved     "ไม่เลื่อน จนกว่าจะกดซ่อมเสร็จ"
import { calculateNextMaintenanceDueDate, type MaintenancePlanFrequency } from "./preventive-maintenance.ts"
import { getRepairCreateOutlook, type RepairAssetFacts, type RepairCreateOutlook } from "./repair-record-outlook.ts"
import type { RepairOutcome } from "./repair-record-policy.ts"
import { decimals, maxLength, range, required } from "./validation-rules.ts"

export type RepairFormValues = {
  assetId: string
  reportedDate: string
  problem: string
  done: boolean | null
  outcome: RepairOutcome | null
  conditionId: string
  reportedById: string
  vendorId: string
  repairCost: string
  invoiceNo: string
  remark: string
}

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1). The two
// questions and the condition after repair are radio groups: their id is the FieldGroup's.
export const repairFieldIds = {
  assetId: "repair-record-asset",
  reportedDate: "repair-record-date",
  problem: "repair-record-problem",
  reportedById: "repair-record-reporter",
  done: "repair-record-done",
  outcome: "repair-record-outcome",
  conditionId: "repair-create-condition",
  vendorId: "repair-record-vendor",
  repairCost: "repair-record-cost",
  invoiceNo: "repair-record-invoice-no",
  remark: "repair-record-remark",
} as const
export type RepairField = keyof typeof repairFieldIds
const fieldOrder = Object.keys(repairFieldIds) as RepairField[]

function isUsableDone(values: RepairFormValues) {
  return values.done === true && values.outcome === "usable"
}

/** The fields on screen: the result only when done, the condition after repair only when done and usable, the reporter
 * only for an account without an employee. */
export function repairFieldOrder(values: RepairFormValues, needsReporter: boolean): RepairField[] {
  return fieldOrder.filter((key) =>
    (key !== "outcome" || values.done === true)
    && (key !== "conditionId" || isUsableDone(values))
    && (key !== "reportedById" || needsReporter))
}

/** noValidate turns the browser's check off, so this restates the controls' required, maxLength, min, step and max (the
 * record date is not after today, a Bangkok day key), and the reporter the server needs from an account without a linked
 * employee (MAINTENANCE_REPORTER_REQUIRED) (v-track M-R2). */
export function validateRepairForm(
  values: RepairFormValues,
  options: { needsReporter: boolean; todayKey: string },
): Partial<Record<RepairField, string>> {
  const errors: Partial<Record<RepairField, string>> = {}
  const check = (key: RepairField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("assetId", required(values.assetId))
  check("reportedDate", required(values.reportedDate) ?? (values.reportedDate > options.todayKey ? "repairDateInFuture" : null))
  check("problem", required(values.problem) ?? maxLength(values.problem, 4000))
  check("done", values.done === null ? "repairDoneRequired" : null)
  check("outcome", values.done === true && values.outcome === null ? "repairOutcomeRequired" : null)
  // A repair already done and usable names the condition after it (group 3 spec §19.4).
  check("conditionId", isUsableDone(values) && !values.conditionId ? "conditionAfterRepairRequired" : null)
  check("reportedById", options.needsReporter ? required(values.reportedById) : null)
  check("repairCost", range(values.repairCost, 0) ?? decimals(values.repairCost, 2))
  check("invoiceNo", maxLength(values.invoiceNo, 100))
  check("remark", maxLength(values.remark, 4000))
  return errors
}

export type RepairCreatePayload = {
  assetId: string
  maintenancePlanId: string | null
  problem: string
  reportedDate: string
  done: boolean | null
  outcome: RepairOutcome | null
  conditionId: string | null
  reportedById: string | null
  vendorId: string | null
  repairCost: string | null
  invoiceNo: string | null
  remark: string | null
}

/** The POST body (G5P2-R5): the result and the condition go only with a done record (the condition only when usable); the
 * page keeps them in its state, so switching back restores them. */
export function buildRepairCreatePayload(
  values: RepairFormValues,
  options: { planId: string | null; needsReporter: boolean },
): RepairCreatePayload {
  return {
    assetId: values.assetId,
    maintenancePlanId: options.planId,
    problem: values.problem,
    reportedDate: values.reportedDate,
    done: values.done,
    outcome: values.done === true ? values.outcome : null,
    conditionId: isUsableDone(values) ? values.conditionId || null : null,
    reportedById: options.needsReporter ? values.reportedById || null : null,
    vendorId: values.vendorId || null,
    repairCost: values.repairCost || null,
    invoiceNo: values.invoiceNo || null,
    remark: values.remark || null,
  }
}

export type RepairSummaryValue =
  | { kind: "status"; name: string }
  | { kind: "text"; messageKey: string; values?: Record<string, string> }
  | { kind: "plain"; text: string }

export type RepairSummaryRow = {
  key: "status" | "holder" | "record" | "condition" | "plan"
  now: RepairSummaryValue
  next: RepairSummaryValue
  changed: boolean
}

export type RepairSummaryPlan = { nextDueDate: string; frequency: MaintenancePlanFrequency; intervalDays: number | null }

export type RepairChecklistItem = { key: "asset" | "dateProblem" | "done" | "outcome" | "condition"; done: boolean }

const text = (messageKey: string, values?: Record<string, string>): RepairSummaryValue =>
  values ? { kind: "text", messageKey, values } : { kind: "text", messageKey }
const isoDay = /^\d{4}-\d{2}-\d{2}$/

function statusRow(facts: RepairAssetFacts, outlook: RepairCreateOutlook): RepairSummaryRow {
  const now: RepairSummaryValue = { kind: "status", name: facts.statusName }
  if (outlook.kind === "unanswered") return { key: "status", now, next: text("createForm.dependsOnAnswer"), changed: false }
  if (outlook.kind === "dependsOnOutcome") return { key: "status", now, next: text("createForm.dependsOnOutcome"), changed: false }
  // A refusal saves nothing: the status stays (the status line shows the refusal itself).
  if (outlook.kind === "refused") return { key: "status", now, next: now, changed: false }
  return { key: "status", now, next: { kind: "status", name: outlook.nextStatusName }, changed: outlook.changes }
}

function recordNext(done: boolean | null): RepairSummaryValue {
  if (done === null) return text("createForm.dependsOnAnswer")
  return text(done ? "createForm.recordClosed" : "createForm.recordOpen")
}

function conditionRow(
  facts: RepairAssetFacts,
  values: RepairFormValues,
  conditionLabels: Record<string, string>,
  salvageLabel: string,
): RepairSummaryRow {
  const now: RepairSummaryValue = { kind: "plain", text: facts.conditionLabel }
  if (values.outcome === "beyond_repair") return { key: "condition", now, next: { kind: "plain", text: salvageLabel }, changed: true }
  if (values.outcome === "usable" && values.conditionId) {
    const label = conditionLabels[values.conditionId] ?? values.conditionId
    return { key: "condition", now, next: { kind: "plain", text: label }, changed: values.conditionId !== facts.conditionId }
  }
  // No result yet, or usable with no condition chosen: the condition is not known yet.
  return { key: "condition", now, next: text("createForm.dependsOnOutcome"), changed: false }
}

function planRow(plan: RepairSummaryPlan, values: RepairFormValues): RepairSummaryRow {
  const now = text("createForm.planNext", { date: plan.nextDueDate })
  if (values.done === null) return { key: "plan", now, next: text("createForm.dependsOnAnswer"), changed: false }
  if (!values.done) return { key: "plan", now, next: text("createForm.planNotMoved"), changed: false }
  // Done moves the plan from the record date (decision 3); with no valid date yet the plan's own date stays.
  if (!isoDay.test(values.reportedDate) || Number.isNaN(new Date(values.reportedDate).getTime())) {
    return { key: "plan", now, next: { kind: "plain", text: plan.nextDueDate }, changed: false }
  }
  const next = calculateNextMaintenanceDueDate(values.reportedDate, plan.frequency, plan.intervalDays).toISOString().slice(0, 10)
  return { key: "plan", now, next: { kind: "plain", text: next }, changed: next !== plan.nextDueDate }
}

/** The summary "สรุปก่อนบันทึก" (§7.5): only what the save writes. With no asset picked yet there are no rows. */
export function buildRepairCreateSummary(input: {
  facts: RepairAssetFacts | null
  values: RepairFormValues
  conditionLabels: Record<string, string>
  salvageLabel: string
  plan: RepairSummaryPlan | null
}): {
  rows: RepairSummaryRow[]
  ifDone: { usable: RepairCreateOutlook; beyondRepair: RepairCreateOutlook } | null
  checklist: RepairChecklistItem[]
} {
  const { facts, values } = input
  const rows: RepairSummaryRow[] = []
  let ifDone: { usable: RepairCreateOutlook; beyondRepair: RepairCreateOutlook } | null = null
  if (facts) {
    const outlook = getRepairCreateOutlook(facts, { done: values.done, outcome: values.outcome })
    rows.push(statusRow(facts, outlook))
    rows.push({
      key: "holder",
      now: facts.holderName ? { kind: "plain", text: facts.holderName } : text("createForm.noHolder"),
      next: text("createForm.noChange"),
      changed: false,
    })
    rows.push({ key: "record", now: text("createForm.noOpenRecord"), next: recordNext(values.done), changed: values.done !== null })
    if (values.done === true) rows.push(conditionRow(facts, values, input.conditionLabels, input.salvageLabel))
    if (input.plan) rows.push(planRow(input.plan, values))
    // G5P2-R3: while unanswered, not done, or done without a result, both results show.
    if (values.done !== true || values.outcome === null) {
      ifDone = {
        usable: getRepairCreateOutlook(facts, { done: true, outcome: "usable" }),
        beyondRepair: getRepairCreateOutlook(facts, { done: true, outcome: "beyond_repair" }),
      }
    }
  }
  const checklist: RepairChecklistItem[] = [
    { key: "asset", done: values.assetId !== "" },
    { key: "dateProblem", done: values.reportedDate !== "" && values.problem.trim() !== "" },
    { key: "done", done: values.done !== null },
  ]
  if (values.done === true) checklist.push({ key: "outcome", done: values.outcome !== null })
  if (isUsableDone(values)) checklist.push({ key: "condition", done: values.conditionId !== "" })
  return { rows, ifDone, checklist }
}

/** The footer's answer (§7.1): ยังซ่อมไม่เสร็จ / ซ่อมเสร็จแล้ว · <result> / ยังไม่ได้เลือกว่าซ่อมเสร็จหรือยัง. */
export function repairFooterAnswerKey(values: RepairFormValues): "doneNo" | "doneUsable" | "doneBeyond" | "doneNoOutcome" | "unanswered" {
  if (values.done === null) return "unanswered"
  if (!values.done) return "doneNo"
  if (values.outcome === "usable") return "doneUsable"
  if (values.outcome === "beyond_repair") return "doneBeyond"
  return "doneNoOutcome"
}
