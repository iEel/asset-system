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
