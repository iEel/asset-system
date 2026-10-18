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

// The maintenance forms, read as text (tests cannot import .tsx).
const C = "src/components/"
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// The body of the module-level `function validate(`, up to the first line that is only "}".
function validateBody(source: string) {
  const start = source.search(/^function validate\(/m)
  assert.notEqual(start, -1, "a module-level function validate(")
  return source.slice(start, source.indexOf("\n}\n", start))
}

// The shape every migrated form shares (plan 1 M-R1 to M-R4): noValidate straight after onSubmit, the field table in
// visual order, validate(), the hook, focus on the first wrong field, each listed key's message under its field, and no
// toast for a validation error. `resultToast` is the one toast a file may keep outside a catch (MT-R5).
function assertMigratedForm(
  source: string,
  form: { ids: Record<string, string>; handler?: string; messages?: readonly string[]; table?: string; hook?: string; server?: false; resultToast?: string },
) {
  const handler = form.handler ?? "handleSubmit"
  const table = form.table ?? "FIELD_IDS"
  const hook = form.hook ?? "fieldErrors"
  assert.match(source, new RegExp(`<form onSubmit=\\{${handler}\\} noValidate[ >\\n]`), "noValidate directly after onSubmit")
  assert.match(source, /import \{ useFieldErrors(?:, useValidationMessage)? \} from "@\/components\/ui\/use-field-errors"/)
  const block = source.match(new RegExp(`const ${table} = \\{\\n([\\s\\S]*?)\\n\\} as const`))
  assert.ok(block, `const ${table} = { … } as const`)
  assert.deepEqual(block[1].split("\n"), Object.entries(form.ids).map(([key, id]) => `  ${key}: "${id}",`), `${table}: the fields in visual order with their ids`)
  for (const id of Object.values(form.ids)) {
    assert.equal(source.match(new RegExp(`\\bid="${escape(id)}"`, "g"))?.length, 1, `id "${id}" once`)
  }
  for (const key of form.messages ?? Object.keys(form.ids)) {
    assert.match(source, new RegExp(`error=\\{${hook}\\.message\\("${escape(key)}"\\)\\}`), `${key}: its error under the field`)
  }
  assert.match(source, new RegExp(`${hook}\\.setErrors\\(validate\\(`), "the client's errors come from validate()")
  if (form.server !== false) {
    assert.match(source, new RegExp(`if \\(${hook}\\.applyServer\\(payload\\) && `), "the server's fieldErrors land on the same fields")
  }
  assert.match(source, new RegExp(`${hook}\\.focusFirst\\(`), "focus goes to the first wrong field")
  const rest = form.resultToast ? source.split(form.resultToast).join("") : source
  assert.doesNotMatch(rest, /\btoast\.(?:error|warning)\(/, "no validation toast (the catch keeps apiError.toast)")
}

test("PM plan: errors under the field, the asset select checked, whole days from 1 to 3650, and the server's refusals on the same fields (v-track2 M3)", () => {
  const source = read(`${C}maintenance/maintenance-plan-form.tsx`)
  assertMigratedForm(source, {
    ids: {
      assetId: "maintenance-plan-asset",
      title: "maintenance-plan-title",
      frequency: "maintenance-plan-frequency",
      intervalDays: "maintenance-plan-interval-days",
      nextDueDate: "maintenance-plan-next-due-date",
      vendorId: "maintenance-plan-vendor",
      notes: "maintenance-plan-notes",
    },
    messages: ["assetId", "title", "frequency", "nextDueDate", "vendorId", "notes"],
  })
  assert.match(source, /^function validate\(values: PlanValues, isEdit: boolean\) \{$/m)
  const rules = validateBody(source)
  for (const rule of [
    'check("assetId", isEdit ? null : required(values.assetId))',
    'check("title", required(values.title) ?? maxLength(values.title, 200))',
    'check("frequency", required(values.frequency))',
    'check("intervalDays", values.frequency === "custom" ? required(values.intervalDays) ?? range(values.intervalDays, 1, 3650) ?? step(values.intervalDays, 1) : null)',
    'check("nextDueDate", required(values.nextDueDate))',
    'check("notes", maxLength(values.notes, 4000))',
  ]) assert.ok(rules.includes(rule), rule)
  assert.match(source, /fieldErrors\.setErrors\(validate\(values, Boolean\(planId\)\)\)/)
  // The days say their range (plan 1 M-R4: a field with limits says its numbers).
  assert.ok(source.includes("error={fieldErrors.errors.intervalDays ? validationMessage(fieldErrors.errors.intervalDays, { min: 1, max: 3650 }) : undefined}"))
  // The asset select was an asterisk nothing checked (spec §5): it has an id for focus and shows its error.
  assert.match(source, /<MaintenanceOptionSelect\n\s+id="maintenance-plan-asset"\n\s+type="asset"\n[\s\S]*?\n\s+required\n[\s\S]*?\n\s+error=\{fieldErrors\.message\("assetId"\)\}\n/)
  // A field's error clears when it changes; a frequency change also clears the days, which only a custom frequency shows.
  assert.match(source, /setValues\(\(current\) => \(\{ \.\.\.current, \[field\]: value \}\)\)\n[^\n]*\n\s+if \(field === "frequency"\) fieldErrors\.clear\("frequency", "intervalDays"\)\n\s+else fieldErrors\.clear\(field\)/)
  // A refusal with a field (the vendor, a zod 400) lands under it; any other keeps the domain message.
  assert.match(source, /if \(fieldErrors\.applyServer\(payload\) && focusFirstError\(\)\) return\n\s+throw new Error\(getMaintenanceErrorMessage\(payload\?\.code, t, tCommon\("error"\)\)\)/)
})
