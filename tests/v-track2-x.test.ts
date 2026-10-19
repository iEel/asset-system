import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import test from "node:test"
import { pathToFileURL } from "node:url"
import { resolveValidationMessage, type MessageLookup } from "../src/lib/field-error-client.ts"

// V track plan 2, the addendum (the user's answers of 2026-10-18 to the plan's open issues, Tasks 31a–31e). One test per
// task. Sources are read with LF line endings, so the regexes may contain \n.
const C = "src/components/"
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))
const lookup = (table: Record<string, string>): MessageLookup => ({
  has: (key) => typeof table[key] === "string",
  get: (key, params) => table[key].replace(/\{(\w+)\}/g, (_, name: string) => String(params?.[name])),
})
// The form's message for a code, as useValidationMessage resolves it (common.validation, then the api-error catalog).
const say = (locale: "th" | "en", code: string) => {
  const table = messages(locale)
  return resolveValidationMessage(code, undefined, { validation: lookup(table.common.validation), apiErrors: lookup(table.apiErrors) })
}

// Route modules import next/server and "@/…", which node --test cannot load, so a resolve hook serves stand-ins (as in
// tests/v-track-s.test.ts). The prisma stand-in calls globalThis.__vTrack2X.prisma[model][method]; a call with no handler
// throws, so a test names every query its route makes.
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
      const handler = globalThis.__vTrack2X?.prisma?.[model]?.[method]
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
const stubDb = (prisma: Record<string, Record<string, (...args: never[]) => unknown>>) => Object.assign(globalThis, { __vTrack2X: { prisma } })

test("checkin's refusals of the return condition and the return status name their field, which the form already shows (v-track plan 2 task 31a, O7)", async () => {
  type Handler = (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>
  const { POST } = await load<{ POST: Handler }>("src/app/api/assets/[id]/checkin/route.ts")
  const params = { params: Promise.resolve({ id: "asset-1" }) }
  const checkin = () => new Request("http://localhost/api/assets/asset-1/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      checkoutId: "checkout-1", returnDate: "2026-10-18", returnBy: "Somchai", receiveBy: "Somsri", conditionAfter: "condition-1",
      nextStatusId: "status-1", nextLocationId: "location-1",
    }),
  })
  const refusal = async (response: Response) => [response.status, await response.json()]
  const prisma = (condition: unknown, returnStatus: unknown) => ({
    asset: { findFirst: () => ({ id: "asset-1" }) },
    assetCheckout: { findFirst: () => ({ id: "checkout-1" }) },
    assetCondition: { findUnique: () => condition },
    assetStatus: { findFirst: () => returnStatus },
  })

  // A condition that is gone, inactive or not offered for a return: the condition select, plan 1 S10's shape (S-R7).
  stubDb(prisma(null, null))
  assert.deepEqual(await refusal(await POST(checkin(), params)), [400, {
    code: "ASSET_STATE_MASTER_NOT_FOUND", error: "Invalid return condition for check-in", fieldErrors: { conditionAfter: "invalidReturnCondition" },
  }])
  stubDb(prisma({ name: "Excellent", isActive: true }, null))
  assert.deepEqual(await refusal(await POST(checkin(), params)), [400, {
    code: "ASSET_CONDITION_NOT_SELECTABLE", error: "Invalid return condition for check-in", fieldErrors: { conditionAfter: "invalidReturnCondition" },
  }])
  // A status that is not a return status: the status select. Status codes and messages are unchanged.
  stubDb(prisma({ name: "Good", isActive: true }, null))
  assert.deepEqual(await refusal(await POST(checkin(), params)), [400, {
    error: "Invalid return status for check-in", fieldErrors: { nextStatusId: "invalidReturnStatus" },
  }])

  // Both codes are api-error catalog keys, so the field reads the sentence the toast showed, not the generic one.
  for (const locale of ["th", "en"] as const) {
    const table = messages(locale)
    assert.equal(say(locale, "invalidReturnCondition"), table.apiErrors.invalidReturnCondition, locale)
    assert.equal(say(locale, "invalidReturnStatus"), table.apiErrors.invalidReturnStatus, locale)
    assert.notEqual(say(locale, "invalidReturnStatus"), table.common.validation.invalid, locale)
  }
  assert.equal(say("th", "invalidReturnCondition"), "สภาพตอนรับคืนไม่ถูกต้อง")

  // The checkin form (Task 10, O3) already holds both keys, shows each under its select and hands a refusal back from
  // its review dialog (O-R1): no form change.
  const form = read(`${C}asset-operations/checkin-form.tsx`)
  assert.match(form, /\n  conditionAfter: "checkin-condition-after",\n  nextStatusId: "checkin-next-status",\n/)
  assert.ok(form.includes('error={fieldErrors.message("conditionAfter")}'))
  assert.ok(form.includes('error={fieldErrors.message("nextStatusId")}'))
  assert.ok(form.includes("const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key], reveal: leaveReview })"))
  assert.ok(form.includes("if (fieldErrors.applyServer(payload) && focusFirstError()) return"))
})

test("zod's .int() refusing a fraction reads as a number error, not as a missing value (v-track plan 2 task 31b)", async () => {
  const { z } = await import("zod")
  const { issueToFieldErrorCode, issuesToFieldErrors } = await import("../src/lib/field-errors.ts")
  // What zod 4.4.1 reports for a fraction in .int(): invalid_type with expected "int" and no received. A missing value
  // reports expected "number", and text that is not a number received "NaN".
  const schema = z.object({
    auditYear: z.coerce.number().int().min(2000).max(2100),
    licenseTotalSeats: z.number().int().min(0).optional(),
    intervalDays: z.coerce.number().int().min(1),
    sampleRate: z.number().int(),
  })
  const issues = schema.safeParse({ auditYear: "2025.5", licenseTotalSeats: 1.5, intervalDays: "abc" }).error!.issues
  assert.deepEqual(issues.find((issue) => issue.path[0] === "auditYear"), {
    expected: "int", format: "safeint", code: "invalid_type", path: ["auditYear"], message: "Invalid input: expected int, received number",
  })
  assert.deepEqual(issuesToFieldErrors(issues), { auditYear: "invalidNumber", licenseTotalSeats: "invalidNumber", intervalDays: "invalidNumber", sampleRate: "required" })
  assert.equal(issueToFieldErrorCode({ code: "invalid_type", expected: "int", path: ["sampleRate"], message: "Invalid input: expected int, received number" }), "invalidNumber")
  // The field reads the shared number sentence, no longer "กรุณาระบุข้อมูลนี้".
  assert.equal(say("th", "invalidNumber"), "กรุณากรอกเป็นตัวเลข")
})

test("one money rule: every money field of plan 2's forms refuses more than 2 decimal places with its own sentence (v-track plan 2 task 31c)", async () => {
  const { decimals } = await import("../src/lib/validation-rules.ts")
  const { readSourceFiles } = await import("./helpers/source-files.ts")
  // The typed digits after the point count, trailing zeros left out; exponent notation is counted from the number.
  for (const value of ["12.34", "0.29", "12.5", "12.50", "12.500", "1255", " 7.1 ", "-0.01", "1e2"]) assert.equal(decimals(value, 2), null, value)
  for (const value of ["12.345", "0.001", "1e-3", 12.345]) assert.equal(decimals(value, 2), "tooManyDecimals", String(value))
  assert.equal(decimals("12345678901234.567", 2), "tooManyDecimals", "a large amount keeps its fraction")
  assert.equal(decimals("abc", 2), "invalidNumber")
  for (const empty of ["", "  ", null, undefined]) assert.equal(decimals(empty, 2), null, "an empty value is left to required")
  assert.match(read("src/lib/validation-rules.ts"), /^export function decimals\(value: number \| string \| null \| undefined, places: number\): RuleCode \| null \{$/m)
  assert.match(read("src/lib/validation-rules.ts"), /^export type RuleCode = FieldErrorCode \| "endBeforeStart" \| "tooManyDecimals" \| "notWholeNumber"$/m)
  // Its own sentence, clearer than invalidNumber's "กรุณากรอกเป็นตัวเลข" (open issue 14).
  assert.equal(messages("th").common.validation.tooManyDecimals, "กรอกทศนิยมได้ไม่เกิน 2 ตำแหน่ง")
  assert.equal(messages("en").common.validation.tooManyDecimals, "Use no more than 2 decimal places")
  for (const locale of ["th", "en"] as const) assert.equal(say(locale, "tooManyDecimals"), messages(locale).common.validation.tooManyDecimals, locale)

  // Each money control keeps step="0.01" and its validate() restates it after min: range(v, 0) ?? decimals(v, 2).
  const money: Record<string, readonly string[]> = {
    [`${C}assets/asset-form.tsx`]: ["values.purchasePrice", "purchaseDocument.totalAmount"],
    [`${C}assets/asset-batch-form.tsx`]: ["common.purchasePrice"],
    [`${C}disposal/disposal-request-form.tsx`]: ["values.saleValue", "values.salvageValue"],
    [`${C}disposal/disposal-batch-form.tsx`]: ["values.saleValue", "values.salvageValue"],
    [`${C}disposal/disposal-decision-button.tsx`]: ["values.saleValue", "values.salvageValue"],
    [`${C}disposal/disposal-execution-button.tsx`]: ["values.actualSaleValue", "values.actualSalvageValue"],
    [`${C}maintenance/repair-record-form.tsx`]: ["values.repairCost"],
    [`${C}maintenance/repair-record-actions.tsx`]: ["values.repairCost"],
  }
  const withMoney = readSourceFiles("src/components").filter((file) => file.source.includes('step="0.01"')).map((file) => file.path)
  assert.deepEqual(withMoney.sort(), Object.keys(money).sort(), "every money control of the forms is in the list")
  for (const [path, values] of Object.entries(money)) {
    const source = read(path)
    for (const value of values) assert.ok(source.includes(`range(${value}, 0) ?? decimals(${value}, 2))`), `${path}: ${value}`)
    assert.doesNotMatch(source, /step\([^)]*, 0\.01\)/, `${path}: no money step() left`)
    assert.match(source, /^import \{[^}]*\bdecimals\b[^}]*\} from "@\/lib\/validation-rules"$/m, path)
  }
  // Whole numbers have their own rule and sentence, wholeNumber and notWholeNumber: the PM days (v-track final task 1).
  assert.ok(read(`${C}maintenance/maintenance-plan-form.tsx`).includes("range(values.intervalDays, 1, 3650) ?? wholeNumber(values.intervalDays)"))
})

test("the batch's row limits and its duplicate check stay focusable and say why beside the row count (v-track plan 2 task 31d, A8)", () => {
  const source = read(`${C}assets/asset-batch-form.tsx`)
  // One visible reason line: the row count gains the 2–100 limits (spec §4.4: a gate that showed nothing gets a reason).
  assert.ok(source.includes('<div id="asset-batch-row-count" className="text-sm font-medium text-foreground">{t("batchCurrentCount", { count: rows.length })} · {t("batchRowLimits")}</div>'))
  assert.equal(messages("th").asset.batchRowLimits, "ชุดหนึ่งมีได้ 2–100 รายการ")
  assert.equal(messages("en").asset.batchRowLimits, "A batch holds 2–100 items")
  assert.match(source, /\n  const atRowLimit = rows\.length >= 100\n  const atRowMinimum = rows\.length <= 2\n/)
  // Add at 100 rows, remove at 2 (the cards and the table), check duplicates while the rows hold one: each stays
  // focusable, aria-disabled and tied to the line (A-R6's gate), never disabled.
  const count = (text: string) => source.split(text).length - 1
  for (const [condition, buttons] of [["atRowLimit", 1], ["atRowMinimum", 2], ["hasClientDuplicates", 1]] as const) {
    assert.equal(count(`aria-disabled={${condition} || undefined}`), buttons, condition)
    assert.equal(count(`aria-describedby={${condition} ? "asset-batch-row-count" : undefined}`), buttons, condition)
  }
  assert.match(source, /onClick=\{handleAddRow\}\n\s+aria-disabled=\{atRowLimit /)
  assert.match(source, /busy=\{checkingDuplicates\}\n\s+aria-disabled=\{hasClientDuplicates /)
  assert.equal(source.match(/onClick=\{\(\) => handleRemoveRow\(row\.clientId\)\}\n\s+aria-disabled=\{atRowMinimum /g)?.length, 2)
  assert.doesNotMatch(source, /disabled=\{rows\.length (?:>= 100|<= 2)\}|disabled=\{hasClientDuplicates\}/)
  // A press does nothing: each handler returns first.
  assert.match(source, /function handleAddRow\(\) \{\n\s+if \(atRowLimit\) return\n/)
  assert.match(source, /function handleRemoveRow\(clientId: string\) \{\n\s+if \(atRowMinimum\) return\n/)
  assert.match(source, /async function handleCheckDuplicates\(\) \{\n\s+if \(hasClientDuplicates\) return\n/)
})

test("the scan check's waiting save opens the note-and-photo section, so the missing photo's picker is in view (v-track plan 2 task 31e, U7)", () => {
  const source = read(`${C}audit/audit-scan-check-form.tsx`)
  // Save still returns first while a required photo is missing (U-R11), and now opens the section that holds the picker.
  assert.match(source, /async function save\(\) \{\n\s+if \(missingPhoto\) \{\n\s+setExtrasOpen\(true\)\n\s+return\n\s+\}\n\s+fieldErrors\.setErrors\(validate\(values\)\)\n/)
  const section = source.slice(source.indexOf("{extrasOpen ? ("), source.indexOf("<div data-audit-check-actions"))
  assert.ok(section.includes('title={t("dropAuditPhotoTitle")}'), "the photo picker sits in that section")
  // The toggle still opens and closes it, and the gate is as Task 19 left it: focusable, tied to its Notice.
  assert.ok(source.includes("onClick={() => setExtrasOpen((current) => !current)}"))
  assert.match(source, /aria-disabled=\{missingPhoto \|\| undefined\}\n\s+aria-describedby=\{missingPhoto \? "audit-check-photo-reason" : undefined\}\n/)
})
