import test from "node:test"
import assert from "node:assert/strict"
import {
  parseWorkShow,
  rankWorkRows,
  WORK_ROW_SOON_DAYS,
  WORK_SHOW_MAX,
  WORK_SHOW_STEP,
  workRowNextStep,
  workRowQueue,
  workRowUrgency,
  type WorkRowKind,
  type WorkRowLite,
} from "../src/lib/work-center-rows.ts"

// 2026-11-07 10:00 Bangkok
const today = new Date("2026-11-07T03:00:00.000Z")
const bangkok = (day: string, time = "09:00") => new Date(`${day}T${time}:00.000+07:00`)

const row = (overrides: Partial<WorkRowLite>): WorkRowLite => ({
  kind: "openRepair",
  id: "r",
  since: bangkok("2026-11-01"),
  deadline: null,
  number: "MT-0001",
  ...overrides,
})

test("urgency at the seven-day edge", () => {
  assert.equal(WORK_ROW_SOON_DAYS, 7)
  assert.equal(workRowUrgency(row({ deadline: bangkok("2026-11-06", "23:59") }), today), "overdue")
  assert.equal(workRowUrgency(row({ deadline: bangkok("2026-11-07", "00:00") }), today), "todo")
  assert.equal(workRowUrgency(row({ deadline: bangkok("2026-11-14", "23:59") }), today), "todo")
  assert.equal(workRowUrgency(row({ deadline: bangkok("2026-11-15", "00:00") }), today), "ready")
  assert.equal(workRowUrgency(row({ deadline: null }), today), "todo")
})

test("rankWorkRows puts overdue first by days overdue, then oldest since, then number", () => {
  const rows: WorkRowLite[] = [
    row({ id: "ready-old", since: bangkok("2026-10-01"), deadline: bangkok("2026-12-31"), number: "A" }),
    row({ id: "todo-new", since: bangkok("2026-11-06"), deadline: null, number: "B" }),
    row({ id: "overdue-1", since: bangkok("2026-11-05"), deadline: bangkok("2026-11-06"), number: "C" }),
    row({ id: "overdue-5-b", since: bangkok("2026-11-05"), deadline: bangkok("2026-11-02"), number: "E" }),
    row({ id: "overdue-5-a", since: bangkok("2026-11-06"), deadline: bangkok("2026-11-02", "18:00"), number: "D" }),
    row({ id: "todo-tie-b", since: bangkok("2026-10-20"), deadline: null, number: "G" }),
    row({ id: "todo-tie-a", since: bangkok("2026-10-20"), deadline: bangkok("2026-11-10"), number: "F" }),
  ]
  const input = [...rows]
  const ranked = rankWorkRows(rows, today).map((r) => r.id)
  assert.deepEqual(ranked, ["overdue-5-a", "overdue-5-b", "overdue-1", "ready-old", "todo-tie-a", "todo-tie-b", "todo-new"])
  assert.deepEqual(rows, input, "the input is not reordered")
})

test("workRowQueue maps every kind to its queue", () => {
  const expected: Record<WorkRowKind, string> = {
    disposalApproval: "approvals",
    findingApproval: "approvals",
    roundClose: "approvals",
    approvedDisposal: "disposal",
    pendingDisposal: "disposal",
    duePm: "maintenance",
    openRepair: "maintenance",
    stuckRepair: "maintenance",
    auditAction: "audit",
    pendingFinding: "audit",
  }
  for (const [kind, queue] of Object.entries(expected)) assert.equal(workRowQueue(kind as WorkRowKind), queue)
})

test("next step per kind", () => {
  const ids = { id: "rec-1", assetId: "asset-9", planId: "plan-3" }
  const cases: [WorkRowKind, string, string][] = [
    ["disposalApproval", "workCenter.nextStep.reviewRequest", "/th/admin/approvals?item=disposal:rec-1"],
    ["findingApproval", "workCenter.nextStep.reviewFinding", "/th/admin/approvals?item=finding:rec-1"],
    ["roundClose", "workCenter.nextStep.approveClose", "/th/admin/approvals?item=round:rec-1"],
    ["approvedDisposal", "workCenter.nextStep.recordDisposal", "/th/disposal/rounds/new"],
    ["duePm", "workCenter.nextStep.recordPmDone", "/th/maintenance/new?planId=plan-3"],
    ["openRepair", "workCenter.nextStep.recordRepairDone", "/th/maintenance/rec-1"],
    ["stuckRepair", "workCenter.nextStep.openRepair", "/th/maintenance/new?assetId=asset-9"],
    ["auditAction", "workCenter.nextStep.updateAction", "/th/audit/findings?finding=rec-1"],
    ["pendingFinding", "workCenter.nextStep.openFinding", "/th/audit/findings?finding=rec-1"],
    ["pendingDisposal", "workCenter.nextStep.openRequest", "/th/disposal/rec-1"],
  ]
  for (const [kind, labelKey, href] of cases) {
    assert.deepEqual(workRowNextStep(kind, ids, "th"), { labelKey, href }, kind)
  }

  const returnTo = "/th/work-center?panel=overview&show=16"
  const encoded = encodeURIComponent(returnTo)
  assert.equal(workRowNextStep("openRepair", ids, "th", returnTo).href, `/th/maintenance/rec-1?returnTo=${encoded}`)
  assert.equal(
    workRowNextStep("duePm", ids, "en", returnTo).href,
    `/en/maintenance/new?planId=plan-3&returnTo=${encoded}`,
  )
  assert.equal(
    workRowNextStep("disposalApproval", ids, "th", returnTo).href,
    `/th/admin/approvals?item=disposal:rec-1&returnTo=${encoded}`,
  )
})

test("parseWorkShow clamps", () => {
  assert.equal(WORK_SHOW_STEP, 8)
  assert.equal(WORK_SHOW_MAX, 200)
  assert.equal(parseWorkShow(undefined), 8)
  assert.equal(parseWorkShow("abc"), 8)
  assert.equal(parseWorkShow("0"), 8)
  assert.equal(parseWorkShow("-3"), 8)
  assert.equal(parseWorkShow("7"), 8)
  assert.equal(parseWorkShow("9"), 16)
  assert.equal(parseWorkShow("16"), 16)
  assert.equal(parseWorkShow("999"), 200)
  assert.equal(parseWorkShow(["24", "8"]), 24)
})
