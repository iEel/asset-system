import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { FieldRefusalError } from "../src/lib/field-errors.ts"
import { MaintenanceApiError, getMaintenanceErrorPayload } from "../src/lib/maintenance-api-errors.ts"
import { mutateMaintenancePlan } from "../src/lib/maintenance-plan-service.ts"
import { completeRepairRecord, createRepairRecord, updateRepairRecordDetails } from "../src/lib/repair-record-service.ts"

// V track plan 2, area M: the maintenance forms show their errors under the field (spec
// docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md §4, §5 #29–#33, §6.2, §7). One test per task,
// appended in order. The working tree is CRLF on Windows: every read strips \r before the multi-line regexes.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

// A transaction stand-in for the maintenance services: each `model.method` call answers from `answers`, else from the
// defaults (an active asset nobody holds, no open record, an open ticket, an active employee, supplier and PM plan).
function fakeMaintenanceDb(answers: Record<string, () => unknown> = {}) {
  const asset = { id: "asset-1", statusId: "status-ready", ownershipType: "shared", custodianId: null, status: { name: "Ready" } }
  const defaults: Record<string, () => unknown> = {
    "asset.findFirst": () => asset,
    "asset.updateMany": () => ({ count: 1 }),
    "assetCheckout.count": () => 0,
    "maintenanceTicket.count": () => 0,
    "maintenanceTicket.findFirst": () => ({ id: "ticket-1", repairStatus: "in_progress", updatedAt: new Date("2026-10-18T00:00:00Z"), assetId: "asset-1", asset }),
    "employee.findFirst": () => ({ id: "emp-1" }),
    "supplier.findFirst": () => ({ id: "vendor-1" }),
    "maintenancePlan.findFirst": () => ({ id: "plan-1", assetId: "asset-1", planState: "active", isActive: true, vendorId: null }),
  }
  const tx = new Proxy({}, {
    get: (_target, model: string) => new Proxy({}, {
      get: (_inner, method: string) => async () => {
        const answer = answers[`${model}.${method}`] ?? defaults[`${model}.${method}`]
        if (!answer) throw new Error(`Unexpected call ${model}.${method}`)
        return answer()
      },
    }),
  })
  return { $transaction: async (callback: (client: unknown) => Promise<unknown>) => callback(tx) }
}

test("maintenance refusals about a field name it: the reporter and the vendor of a repair and of a PM plan (v-track2 M1)", async () => {
  // The typed refusal keeps its code and adds the field (spec §6.2; S-R7: a missing value is "required").
  const reporter = new MaintenanceApiError("MAINTENANCE_REPORTER_REQUIRED", "Select who is recording this repair", 400, { reportedById: "required" })
  assert.deepEqual(getMaintenanceErrorPayload(reporter), {
    status: 400,
    body: { code: "MAINTENANCE_REPORTER_REQUIRED", error: "Select who is recording this repair", fieldErrors: { reportedById: "required" } },
  })
  assert.deepEqual(getMaintenanceErrorPayload(new MaintenanceApiError("MAINTENANCE_CONFLICT", "Ticket changed", 409)), {
    status: 409,
    body: { code: "MAINTENANCE_CONFLICT", error: "Ticket changed" },
  }, "a refusal about no field keeps today's body")

  const user = { id: "user-1", employeeId: "emp-1" }
  const input = {
    assetId: "asset-1",
    maintenancePlanId: null,
    problem: "จอไม่ติด",
    reportedDate: new Date("2026-10-18T00:00:00Z"),
    done: true,
    outcome: "usable" as const,
    reportedById: null,
    vendorId: null,
    repairCost: null,
    invoiceNo: null,
    remark: null,
  }
  const refusal = (fieldErrors: Record<string, string>, message: string) => (error: unknown) => {
    assert.ok(error instanceof FieldRefusalError || error instanceof MaintenanceApiError, String(error))
    assert.equal(error.message, message)
    assert.deepEqual(error.fieldErrors, fieldErrors)
    return true
  }

  await assert.rejects(createRepairRecord(fakeMaintenanceDb() as never, input, { id: "admin" }), refusal({ reportedById: "required" }, "Select who is recording this repair"))
  await assert.rejects(
    createRepairRecord(fakeMaintenanceDb({ "employee.findFirst": () => null }) as never, { ...input, reportedById: "emp-9" }, user),
    refusal({ reportedById: "reporterNotFound" }, "Reporter not found or inactive"),
  )
  const noVendor = { "supplier.findFirst": () => null }
  await assert.rejects(createRepairRecord(fakeMaintenanceDb(noVendor) as never, { ...input, vendorId: "vendor-9" }, user), refusal({ vendorId: "vendorNotFound" }, "Vendor not found or inactive"))
  const complete = { action: "complete" as const, expectedUpdatedAt: new Date("2026-10-18T00:00:00Z"), returnDate: new Date("2026-10-18T00:00:00Z"), outcome: "usable" as const, vendorId: "vendor-9", repairCost: null, invoiceNo: null, remark: null }
  await assert.rejects(completeRepairRecord(fakeMaintenanceDb(noVendor) as never, "ticket-1", complete, user), refusal({ vendorId: "vendorNotFound" }, "Vendor not found or inactive"))
  const update = { action: "update" as const, expectedUpdatedAt: new Date("2026-10-18T00:00:00Z"), reportedDate: new Date("2026-10-18T00:00:00Z"), problem: "จอไม่ติด", vendorId: "vendor-9", repairCost: null, invoiceNo: null, remark: null }
  await assert.rejects(updateRepairRecordDetails(fakeMaintenanceDb(noVendor) as never, "ticket-1", update, user), refusal({ vendorId: "vendorNotFound" }, "Vendor not found or inactive"))
  // The PM plan's edit refuses an inactive vendor as its create does (plan 1 S10 answered the create only).
  const plan = { action: "update" as const, title: "PM", frequency: "monthly" as const, intervalDays: undefined, nextDueDate: new Date("2026-11-01T00:00:00Z"), vendorId: "vendor-9", notes: undefined }
  await assert.rejects(mutateMaintenancePlan(fakeMaintenanceDb(noVendor) as never, "plan-1", plan, "user-1"), refusal({ vendorId: "pmVendorNotFound" }, "PM vendor not found or inactive"))

  // The routes answer a FieldRefusalError through errorResponse (S-R6) and a MaintenanceApiError through its payload.
  for (const route of ["src/app/api/maintenance-tickets/route.ts", "src/app/api/maintenance-tickets/[id]/route.ts", "src/app/api/maintenance-plans/[id]/route.ts"]) {
    assert.match(read(route), /const payload = getMaintenanceErrorPayload\(error\)\n\s+if \(payload\) return NextResponse\.json\(payload\.body, \{ status: payload\.status \}\)\n\s+return errorResponse\(error, 400\)/, route)
  }
})

test("the step rule: a number field's step (money to 0.01, whole days) is restated like the other constraints (v-track2 M2)", async () => {
  const { step } = await import("../src/lib/validation-rules.ts")
  assert.equal(step("12.34", 0.01), null)
  assert.equal(step("0.29", 0.01), null, "a binary fraction is not off the step")
  assert.equal(step("1.255", 0.01), "invalidNumber", "the code the server gives zod's not_multiple_of")
  assert.equal(step("30", 1), null)
  assert.equal(step(30, 1), null)
  assert.equal(step("1.5", 1), "invalidNumber")
  assert.equal(step("abc", 0.01), "invalidNumber")
  for (const empty of ["", "  ", null, undefined]) assert.equal(step(empty, 0.01), null, "an empty value is left to required")
  assert.match(read("src/lib/validation-rules.ts"), /^export function step\(value: number \| string \| null \| undefined, size: number\): RuleCode \| null \{$/m)
})
