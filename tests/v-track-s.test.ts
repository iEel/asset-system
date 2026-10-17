import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import test from "node:test"
import { pathToFileURL } from "node:url"
import { z } from "zod"
import { FORM_ERROR_KEY, FieldRefusalError, fieldErrorKey, issueToFieldErrorCode, issuesToFieldErrors } from "../src/lib/field-errors.ts"
import { findMatches, readSourceFiles } from "./helpers/source-files.ts"

// V track plan 1, area S (spec docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md §6): the server names the
// fields that failed. One test per commit. Sources are read with LF line endings, so the regexes may contain \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const issuesOf = (schema: z.ZodType, input: unknown) => {
  const parsed = schema.safeParse(input)
  assert.equal(parsed.success, false)
  return parsed.error!.issues
}

// Route modules import next/server and "@/…", which node --test cannot load, so a resolve hook serves stand-ins (as in
// tests/admin-user-routes.test.ts). The prisma stand-in calls globalThis.__vTrackS.prisma[model][method]; a call with no
// handler throws, so a test names every query its route makes.
const stubs = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    export async function requireAuth() { return { id: "actor-1", roles: ["system_admin"], permissions: [], employeeId: null } }
    export function hasRole() { return true }
    export function hasPermission() { return true }
    export function requirePermission() {}
  `],
  ["@/lib/audit-log", `export async function logAudit() {}`],
  ["@/lib/db", `
    const call = (model, method) => (...args) => {
      const handler = globalThis.__vTrackS?.prisma?.[model]?.[method]
      if (!handler) throw new Error("no stand-in for prisma." + model + "." + method)
      return handler(...args)
    }
    export const prisma = new Proxy({}, {
      get: (_, model) => model === "$transaction"
        ? async (work) => (typeof work === "function" ? work(prisma) : Promise.all(work))
        : new Proxy({}, { get: (_, method) => call(model, method) }),
    })
  `],
])
;(nodeModule as unknown as { registerHooks(hooks: { resolve(specifier: string, context: unknown, next: (specifier: string, context: unknown) => unknown): unknown }): void }).registerHooks({
  resolve(specifier, context, next) {
    const stub = stubs.get(specifier)
    if (stub !== undefined) return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(stub)}`, shortCircuit: true }
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return next(specifier, context)
  },
})
const load = <T>(path: string) => import(pathToFileURL(path).href) as Promise<T>

test("zod issues become one camelCase code per dotted field key, the first issue winning (V spec §6.1)", () => {
  assert.equal(FORM_ERROR_KEY, "_form")
  assert.equal(fieldErrorKey([]), "_form")
  assert.equal(fieldErrorKey(["name"]), "name")
  assert.equal(fieldErrorKey(["rows", 3, "serialNumber"]), "rows.3.serialNumber")
  assert.equal(fieldErrorKey(["customFieldDefs", 0, "fieldName"]), "customFieldDefs.0.fieldName")

  const optionalDate = z.preprocess((value) => (typeof value === "string" && value.trim().length === 0 ? null : value), z.coerce.date().nullable().optional())
  const schema = z.object({
    name: z.string().trim().min(1).max(5),
    code: z.string().trim().min(3),
    note: z.string().max(4),
    email: z.string().email(),
    slug: z.string().regex(/^[a-z]+$/),
    site: z.url(),
    day: z.coerce.date(),
    maybeDay: optionalDate,
    qty: z.coerce.number().int().min(1).max(10),
    price: z.coerce.number().multipleOf(0.01),
    kind: z.enum(["a", "b"]),
    tags: z.array(z.string()).min(1),
    active: z.boolean(),
  })
  assert.deepEqual(issuesToFieldErrors(issuesOf(schema, {
    name: "   ", code: "ab", note: "too long", email: "x", slug: "A1", site: "nope", day: "", qty: "abc", price: 1.005, kind: "z", tags: [], active: true,
  })), {
    name: "required", code: "tooShort", note: "tooLong", email: "invalidEmail", slug: "invalidFormat", site: "invalidFormat", day: "invalidDate",
    maybeDay: "required", qty: "invalidNumber", price: "invalidNumber", kind: "invalidChoice", tags: "required",
  })
  assert.deepEqual(issuesToFieldErrors(issuesOf(schema, { name: "abcdefgh", qty: 0 })), {
    name: "tooLong", code: "required", note: "required", email: "required", slug: "required", site: "required", day: "invalidDate",
    maybeDay: "required", qty: "outOfRange", price: "invalidNumber", kind: "invalidChoice", tags: "required", active: "required",
  })
  assert.deepEqual(issuesToFieldErrors(issuesOf(z.object({ qty: z.number().max(5) }), { qty: 9 })), { qty: "outOfRange" })

  // A message the api-error catalog knows becomes its key (custom issues, and custom messages on built-in checks); another
  // custom issue is "invalid"; an issue with no path (a whole-object refine, .strict()) goes under _form.
  const refined = z.object({ start: z.string(), end: z.string(), mode: z.enum(["x"], { error: "HANDOVER_MODE_REQUIRED" }) }).strict().superRefine((input, context) => {
    if (input.end < input.start) context.addIssue({ code: "custom", path: ["end"], message: "End date must be after start date" })
    context.addIssue({ code: "custom", path: ["start"], message: "Something no catalog knows" })
    context.addIssue({ code: "custom", path: [], message: "A status or condition target is required" })
  })
  assert.deepEqual(issuesToFieldErrors(issuesOf(refined, { start: "b", end: "a", mode: "x" })), { end: "endBeforeStart", start: "invalid", _form: "stateTargetRequired" })
  assert.deepEqual(issuesToFieldErrors(issuesOf(refined, { start: "a", end: "b", mode: "y", extra: 1 })), { mode: "handoverModeRequired", _form: "invalid" })
  assert.equal(issueToFieldErrorCode({ code: "too_small", origin: "array", minimum: 2, path: ["rows"], message: "Batch create requires at least 2 rows" }), "batchCreateMinRows")
  assert.equal(issueToFieldErrorCode({ code: "invalid_union", path: ["mode"], message: "Invalid discriminator value. Expected 'x' | 'y'" }), "invalidChoice")
  assert.equal(issueToFieldErrorCode({ code: "unrecognized_keys", path: [], message: "Unrecognized key: \"b\"" }), "invalid")

  // The first issue of a field wins; a keyFor callback can rename a key, and null keeps the dotted path.
  const twice = z.object({ name: z.string().min(3).regex(/^\d+$/) })
  assert.deepEqual(issuesToFieldErrors(issuesOf(twice, { name: "a" })), { name: "tooShort" })
  const rows = z.object({ rows: z.array(z.object({ serial: z.string().min(1) })) })
  assert.deepEqual(issuesToFieldErrors(issuesOf(rows, { rows: [{ serial: "x" }, { serial: "" }] })), { "rows.1.serial": "required" })
  assert.deepEqual(issuesToFieldErrors(issuesOf(rows, { rows: [{ serial: "" }] }), (path) => (path[0] === "rows" ? `line.${String(path[1])}` : null)), { "line.0": "required" })
  assert.deepEqual(issuesToFieldErrors(issuesOf(rows, { rows: [{ serial: "" }] }), () => null), { "rows.0.serial": "required" })

  // Plain module: tests and client code import it, so no "@/" import and no zod at run time.
  const source = read("src/lib/field-errors.ts")
  assert.doesNotMatch(source, /from "@\/|"use client"|^import \{[^}]*\} from "zod"|^import \* as \w+ from "zod"/m)
})

test("the 400 for invalid input names its fields, and field refusals and duplicates answer with the same body; Integration v1 keeps its own (V spec §6.1, §6.2)", async (t) => {
  type ApiResponse = typeof import("../src/lib/api-response.ts")
  type Cancellation = typeof import("../src/lib/asset-transaction-cancellation-route.ts")
  type FieldErrorResponse = typeof import("../src/lib/field-error-response.ts")
  type Exposure = typeof import("../src/lib/api-error-exposure.ts")
  const { errorResponse } = await load<ApiResponse>("src/lib/api-response.ts")
  const { assetTransactionCancellationErrorResponse } = await load<Cancellation>("src/lib/asset-transaction-cancellation-route.ts")
  const { fieldErrorResponse, isPrismaUniqueConstraintError, uniqueConflictResponse } = await load<FieldErrorResponse>("src/lib/field-error-response.ts")
  const { validationFailedBody } = await load<Exposure>("src/lib/api-error-exposure.ts")

  const parsed = z.object({ name: z.string().trim().min(1), rows: z.array(z.object({ serialNumber: z.string().max(3) })) }).safeParse({ name: "", rows: [{ serialNumber: "ok" }, { serialNumber: "toolong" }] })
  assert.equal(parsed.success, false)
  const body = { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { name: "required", "rows.1.serialNumber": "tooLong" } }
  assert.deepEqual(validationFailedBody(parsed.error), body)
  assert.deepEqual(validationFailedBody(parsed.error, (path) => (path[0] === "rows" ? `rows.${String(path[1])}` : null)), { ...body, fieldErrors: { name: "required", "rows.1": "tooLong" } })
  for (const response of [errorResponse(parsed.error, 500), assetTransactionCancellationErrorResponse(parsed.error)]) {
    assert.equal(response.status, 400)
    assert.deepEqual(await response.json(), body)
  }

  // A field refusal the code throws keeps its status and message and names its field.
  const refusal = errorResponse(new FieldRefusalError("Username already exists", { username: "duplicate" }), 400)
  assert.equal(refusal.status, 400)
  assert.deepEqual(await refusal.json(), { error: "Username already exists", fieldErrors: { username: "duplicate" } })
  const conflict = errorResponse(new FieldRefusalError("Role name already exists", { name: "duplicate" }, 409))
  assert.equal(conflict.status, 409)
  assert.equal(new FieldRefusalError("x", {}).name, "FieldRefusalError")

  const explicit = fieldErrorResponse({ status: 400, error: "Invalid assignee", fieldErrors: { assignedToUserId: "invalidAssignee" } })
  assert.equal(explicit.status, 400)
  assert.deepEqual(await explicit.json(), { error: "Invalid assignee", fieldErrors: { assignedToUserId: "invalidAssignee" } })
  const coded = fieldErrorResponse({ status: 400, error: "X", code: "SOME_CODE", fieldErrors: { a: "required" } })
  assert.deepEqual(await coded.json(), { error: "X", code: "SOME_CODE", fieldErrors: { a: "required" } })
  const duplicate = uniqueConflictResponse("code", "Supplier code already exists")
  assert.equal(duplicate.status, 409)
  assert.deepEqual(await duplicate.json(), { error: "Supplier code already exists", code: "DUPLICATE", fieldErrors: { code: "duplicate" } })
  assert.equal(isPrismaUniqueConstraintError({ code: "P2002" }), true)
  assert.equal(isPrismaUniqueConstraintError(new Error("P2002")), false)

  // Unexpected errors stay hidden behind a reference.
  t.mock.method(console, "error", () => {})
  const hidden = errorResponse(Object.assign(new Error("Unique constraint failed"), { name: "PrismaClientKnownRequestError", code: "P2002" }), 400)
  assert.equal(hidden.status, 500)
  assert.match((await hidden.json() as { error: string }).error, /^Unexpected error · ref [0-9a-f]{8}$/)

  // Integration v1 does not change (spec §3): its routes answer through integrationErrorResponse only.
  const v1 = readSourceFiles("src/app/api/integrations/v1")
  assert.ok(v1.length >= 9)
  assert.deepEqual(findMatches(v1, /\berrorResponse\(|fieldErrors|field-error|api-response|validationFailedBody/g), [])
  assert.doesNotMatch(read("src/lib/integration-auth.ts"), /fieldErrors|field-error|validationFailedBody/)
})

test("the disposal recipient rule has its catalog key, and the catalog test reads message: literals too (V spec §6.3)", async () => {
  const { getApiErrorKey } = await load<typeof import("../src/lib/api-error-catalog.ts")>("src/lib/api-error-catalog.ts")
  const { disposalExecutionSchema } = await load<typeof import("../src/lib/validations/disposal.ts")>("src/lib/validations/disposal.ts")
  assert.equal(getApiErrorKey("Recipient, buyer, or destination is required"), "recipientRequired")
  const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).apiErrors.recipientRequired
  assert.equal(messages("th"), "กรุณาระบุผู้รับ ผู้ซื้อ หรือปลายทาง")
  assert.equal(messages("en"), "Recipient, buyer, or destination is required")
  // Every field rule of a disposal execution reaches its field as a catalog key (the form sends every key, empty or not).
  const issues = issuesOf(disposalExecutionSchema, {
    disposalType: "sell", executionDate: "2026-10-17", executedById: "e1", nextStatusId: "s1", recipientName: "", documentNo: "",
    evidenceExceptionReason: "", actualSaleValue: "", actualSalvageValue: "", executionRemark: "",
  })
  assert.deepEqual(issuesToFieldErrors(issues), { recipientName: "recipientRequired", documentNo: "referenceDocumentRequired", actualSaleValue: "saleValueRequired" })
  assert.ok(read("tests/api-error-catalog.test.ts").includes(String.raw`/(?:\berror:\s*|\bmessage:\s*|new\s+\w*Error\(`), "the catalog test reads message: literals")
})

const jsonRequest = (method: string, body: unknown) =>
  new Request("http://localhost/api/test", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
const stubDb = (prisma: Record<string, Record<string, (...args: never[]) => unknown>>) => Object.assign(globalThis, { __vTrackS: { prisma } })

test("the settings route keys each setting's error by the setting, not by its place in the list (V spec §6.1)", async () => {
  type SettingsRoute = { PUT(request: Request): Promise<Response> }
  const { PUT } = await load<SettingsRoute>("src/app/api/admin/settings/route.ts")
  stubDb({})
  const response = await PUT(jsonRequest("PUT", { settings: [
    { key: "asset_label_12_width_mm", value: "500" },
    { key: "company_name", value: "Glink" },
    { key: "ldap_sync_mode", value: "sometimes" },
    { key: "", value: "x" },
  ] }))
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    error: "Invalid request data",
    code: "VALIDATION_FAILED",
    fieldErrors: { "settings.3.key": "required", "settings.asset_label_12_width_mm": "labelWidthRange", "settings.ldap_sync_mode": "schedulerModeInvalid" },
  })
  const empty = await PUT(jsonRequest("PUT", { settings: [] }))
  assert.deepEqual((await empty.json() as { fieldErrors: unknown }).fieldErrors, { settings: "required" })
})

test("the asset batch names the row or the common field that failed, duplicates included (V spec §6.1, §6.2)", async () => {
  type BatchRoute = { POST(request: Request): Promise<Response> }
  type BatchCreate = typeof import("../src/lib/asset-batch-create.ts")
  const { POST } = await load<BatchRoute>("src/app/api/assets/batch/route.ts")
  const { assetBatchItemIssuePath, buildAssetBatchDuplicateFieldErrors } = await load<BatchCreate>("src/lib/asset-batch-create.ts")
  assert.deepEqual(assetBatchItemIssuePath(2, ["serialNumber"]), ["rows", 2, "serialNumber"])
  assert.deepEqual(assetBatchItemIssuePath(2, ["licenseUsedSeats"]), ["common", "licenseUsedSeats"])
  assert.deepEqual(buildAssetBatchDuplicateFieldErrors(
    [{ serialNumber: "SN-1", assetTag: null }, { serialNumber: " sn-1 ", assetTag: "T-9" }, { serialNumber: "SN-2", assetTag: "t-9" }],
    { serialNumbers: ["sn-1"], assetTags: ["T-9"] },
  ), { "rows.0.serialNumber": "duplicate", "rows.1.serialNumber": "duplicate", "rows.1.assetTag": "duplicate", "rows.2.assetTag": "duplicate" })

  const common = {
    name: "Laptop", categoryId: "category-1", companyId: "company-1", branchId: "branch-1", currentLocationId: "location-1",
    statusId: "status-ready", conditionId: "condition-new", ownershipType: "stock", licenseTotalSeats: "", licenseUsedSeats: "",
    purchaseDate: "", purchasePrice: "", warrantyStartDate: "", warrantyEndDate: "",
  }
  const rows = [{ clientId: "r1", assetTag: "T-1", serialNumber: "SN-1" }, { clientId: "r2", assetTag: "T-2", serialNumber: "SN-OLD" }, { clientId: "r3", assetTag: "T-3", serialNumber: "SN-1" }]
  stubDb({
    assetStatus: { findFirst: () => ({ id: "status-ready", name: "Ready", isActive: true }) },
    assetCondition: { findFirst: () => ({ id: "condition-new", name: "New", isActive: true }) },
    asset: { findMany: (args: { where: { serialNumber?: unknown } }) => (args.where.serialNumber ? [{ serialNumber: "SN-OLD" }] : []) },
  })

  // Nested zod paths stay dotted.
  const invalid = await POST(jsonRequest("POST", { common: { ...common, name: "" }, rows: [{ clientId: "r1", serialNumber: "x".repeat(101) }, { clientId: "r2" }] }))
  assert.equal(invalid.status, 400)
  const invalidBody = await invalid.json() as { fieldErrors: Record<string, string> }
  assert.equal(invalidBody.fieldErrors["common.name"], "required")
  // Serials repeated in the batch or already registered: each row says so under its serial number.
  const duplicates = await POST(jsonRequest("POST", { common, rows }))
  assert.equal(duplicates.status, 400)
  const duplicateBody = await duplicates.json() as { error: string; fieldErrors: Record<string, string> }
  assert.match(duplicateBody.error, /^พบข้อมูลซ้ำ: /)
  assert.deepEqual(duplicateBody.fieldErrors, { "rows.0.serialNumber": "duplicate", "rows.1.serialNumber": "duplicate", "rows.2.serialNumber": "duplicate" })
  // The per-row parse runs the license rule the common part skips; its issue goes to the common field, not to a bare key.
  const license = await POST(jsonRequest("POST", {
    common: { ...common, ownershipType: "software_license", licenseTotalSeats: "2", licenseUsedSeats: "5" },
    rows: [{ clientId: "r1", assetTag: "T-1" }, { clientId: "r2", assetTag: "T-2" }],
  }))
  assert.equal(license.status, 400)
  assert.deepEqual(await license.json(), { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { "common.licenseUsedSeats": "licenseSeatsExceeded" } })
})

test("checkout's HANDOVER_* refusal and disposal execution's evidence refusal keep their code and add fieldErrors (V spec §6.1)", async () => {
  type CheckoutRoute = { POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> }
  const { POST } = await load<CheckoutRoute>("src/app/api/assets/[id]/checkout/route.ts")
  stubDb({})
  const response = await POST(jsonRequest("POST", {
    handoverMode: "temporary_loan", checkoutType: "user", custodianId: "employee-1", departmentId: "", locationId: "", parentAssetId: "",
    checkoutDate: "2026-10-17", expectedReturnDate: "", conditionBefore: "condition-good", remark: "", receiverSignature: "",
  }), { params: Promise.resolve({ id: "asset-1" }) })
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    code: "HANDOVER_TEMPORARY_DUE_DATE_REQUIRED",
    error: "HANDOVER_TEMPORARY_DUE_DATE_REQUIRED",
    fieldErrors: { expectedReturnDate: "handoverTemporaryDueDateRequired" },
  })

  // The disposal route loads services node --test cannot strip, so its branch is read as source; the helper is run.
  const { disposalApiError } = await load<typeof import("../src/lib/disposal-api-errors.ts")>("src/lib/disposal-api-errors.ts")
  assert.deepEqual(await disposalApiError("DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED", "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED").json(), {
    code: "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED", error: "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED",
  })
  const withFields = disposalApiError("DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED", "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED", 400, { evidenceExceptionReason: "tooLong" })
  assert.equal(withFields.status, 400)
  assert.deepEqual(await withFields.json(), {
    code: "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED", error: "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED", fieldErrors: { evidenceExceptionReason: "tooLong" },
  })
  const route = read("src/app/api/disposal-requests/[id]/route.ts")
  assert.match(route, /if \(error\.issues\.some\(\(issue\) => issue\.path\[0\] === "evidenceExceptionReason"\)\) \{\n        return disposalApiError\(\n          "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED",\n          "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED",\n          400,\n          issuesToFieldErrors\(error\.issues\),\n        \)/)
  assert.match(route, /^import \{ issuesToFieldErrors \} from "@\/lib\/field-errors"$/m)
})

const uniqueViolation = () => Object.assign(new Error("Unique constraint failed"), { name: "PrismaClientKnownRequestError", code: "P2002" })

test("supplier answers with the shared body and codes: 400 VALIDATION_FAILED with fieldErrors, 409 DUPLICATE on code (V spec §6.1)", async () => {
  type Create = { POST(request: Request): Promise<Response> }
  type Update = { PUT(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> }
  const { POST } = await load<Create>("src/app/api/suppliers/route.ts")
  const { PUT } = await load<Update>("src/app/api/suppliers/[id]/route.ts")
  const supplier = { code: "SUP-1", name: "Vendor", contactPerson: "", phone: "", email: "", address: "", isActive: true }

  stubDb({})
  const invalid = await POST(jsonRequest("POST", { ...supplier, code: "", email: "not-an-email", phone: "x".repeat(51) }))
  assert.equal(invalid.status, 400)
  assert.deepEqual(await invalid.json(), { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { code: "required", phone: "tooLong", email: "invalidEmail" } })

  stubDb({ supplier: { create: () => { throw uniqueViolation() } } })
  const created = await POST(jsonRequest("POST", supplier))
  assert.equal(created.status, 409)
  assert.deepEqual(await created.json(), { error: "Supplier code already exists", code: "DUPLICATE", fieldErrors: { code: "duplicate" } })

  stubDb({ supplier: { findFirst: () => ({ id: "s1", isActive: true, _count: { assets: 0, maintenanceTickets: 0, maintenancePlans: 0, purchaseDocuments: 0 } }), update: () => { throw uniqueViolation() } } })
  const updated = await PUT(jsonRequest("PUT", supplier), { params: Promise.resolve({ id: "s1" }) })
  assert.equal(updated.status, 409)
  assert.deepEqual(await updated.json(), { error: "Supplier code already exists", code: "DUPLICATE", fieldErrors: { code: "duplicate" } })

  // The supplier-only body and its snake codes are gone; the supplier form reads the shared codes until it moves to the hook.
  assert.equal(existsSync("src/lib/supplier-api-error.ts"), false)
  const { parseSupplierFormError } = await load<typeof import("../src/lib/supplier-form-errors.ts")>("src/lib/supplier-form-errors.ts")
  assert.deepEqual(parseSupplierFormError({ error: "Invalid request data", fieldErrors: { code: "duplicate", email: "invalidEmail", phone: "tooLong", name: "required" } }).fieldErrors, { code: "duplicate", name: "required", phone: "tooLong", email: "invalidEmail" })
  const form = read("src/components/master-data/supplier-form.tsx")
  assert.match(form, /if \(code === "duplicate"\) return t\("duplicateCode"\)\n    if \(code === "invalidEmail"\) return t\("invalidEmail"\)\n    if \(code === "tooLong"\) return t\("fieldTooLong"\)/)
})

test("a duplicate code or name in master data answers 409 under its field, on create and on update (V spec §6.2)", async (t) => {
  t.mock.method(console, "error", () => {})
  type Create = { POST(request: Request): Promise<Response> }
  type Update = { PUT(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> }
  const cases = [
    { dir: "companies", model: "company", field: "code", error: "Company code already exists", key: "companyCodeExists", th: "รหัสบริษัทนี้มีอยู่แล้ว", body: { code: "C1", assetTagCode: "", nameTh: "บริษัท", nameEn: "", taxId: "", address: "", isActive: true } },
    { dir: "departments", model: "department", field: "code", error: "Department code already exists", key: "departmentCodeExists", th: "รหัสแผนกนี้มีอยู่แล้ว", body: { code: "D1", name: "IT", companyId: "", isActive: true } },
    { dir: "employees", model: "employee", field: "code", error: "Employee code already exists", key: "employeeCodeExists", th: "รหัสพนักงานนี้มีอยู่แล้ว", body: { code: "E1", fullNameTh: "สมชาย", fullNameEn: "", email: "", companyId: "c1", branchId: "b1", departmentId: "d1", position: "", employmentStatus: "active", managerId: "", isActive: true } },
    { dir: "locations", model: "location", field: "code", error: "Location code already exists", key: "locationCodeExists", th: "รหัสที่ตั้งนี้มีอยู่แล้ว", body: { code: "L1", name: "Store", branchId: "b1", parentId: "", locationType: "Room", description: "", isActive: true } },
    { dir: "brands", model: "assetBrand", field: "name", error: "Brand name already exists", key: "brandNameExists", th: "ชื่อยี่ห้อนี้มีอยู่แล้ว", body: { name: "Dell", isActive: true } },
    { dir: "models", model: "assetModel", field: "name", error: "Model name already exists for this brand", key: "modelNameExists", th: "ชื่อรุ่นนี้มีอยู่แล้วในยี่ห้อนี้", body: { name: "Latitude", categoryId: "cat-1", brandId: "brand-1", specs: "", isActive: true } },
  ]
  const { getApiErrorKey } = await load<typeof import("../src/lib/api-error-catalog.ts")>("src/lib/api-error-catalog.ts")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).apiErrors
  const en = JSON.parse(readFileSync("messages/en.json", "utf8")).apiErrors
  const expectConflict = async (response: Response, item: (typeof cases)[number]) => {
    assert.equal(response.status, 409, item.dir)
    assert.deepEqual(await response.json(), { error: item.error, code: "DUPLICATE", fieldErrors: { [item.field]: "duplicate" } }, item.dir)
  }
  for (const item of cases) {
    const { POST } = await load<Create>(`src/app/api/${item.dir}/route.ts`)
    const { PUT } = await load<Update>(`src/app/api/${item.dir}/[id]/route.ts`)
    stubDb({ [item.model]: { create: () => { throw uniqueViolation() }, findFirst: () => ({ id: "row-1", isActive: true }), update: () => { throw uniqueViolation() } } })
    await expectConflict(await POST(jsonRequest("POST", item.body)), item)
    await expectConflict(await PUT(jsonRequest("PUT", item.body), { params: Promise.resolve({ id: "row-1" }) }), item)
    assert.equal(getApiErrorKey(item.error), item.key)
    assert.equal(th[item.key], item.th)
    assert.equal(en[item.key], item.error)
  }

  // Category: create answers 409 for an active duplicate (an inactive one is still brought back), update for any other row
  // with the code. Checked before writing, because the nested custom-field rows have a unique index of their own.
  const category = { code: "IT", name: "IT", description: "", isActive: true, customFieldDefs: [], photoChecklist: [] }
  const categoryCase = { dir: "categories", field: "code", error: "Category code already exists", key: "categoryCodeExists", th: "รหัสหมวดหมู่นี้มีอยู่แล้ว" } as (typeof cases)[number]
  const { POST } = await load<Create>("src/app/api/categories/route.ts")
  const { PUT } = await load<Update>("src/app/api/categories/[id]/route.ts")
  const lookups: unknown[] = []
  stubDb({ assetCategory: { findFirst: (args: { where: Record<string, unknown> }) => { lookups.push(args.where); return args.where.id ? { id: "cat-1", isActive: true, _count: { assets: 0, models: 0 } } : { id: "cat-2" } } } })
  await expectConflict(await POST(jsonRequest("POST", category)), categoryCase)
  await expectConflict(await PUT(jsonRequest("PUT", category), { params: Promise.resolve({ id: "cat-1" }) }), categoryCase)
  assert.deepEqual(lookups, [{ code: "IT", isActive: true }, { id: "cat-1", isActive: true }, { code: "IT", id: { not: "cat-1" } }])
  assert.equal(getApiErrorKey(categoryCase.error), categoryCase.key)
  assert.equal(th[categoryCase.key], categoryCase.th)
  assert.equal(en[categoryCase.key], categoryCase.error)
})
