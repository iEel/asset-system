import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { z } from "zod"
import { FORM_ERROR_KEY, fieldErrorKey, issueToFieldErrorCode, issuesToFieldErrors } from "../src/lib/field-errors.ts"

// V track plan 1, area S (spec docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md §6): the server names the
// fields that failed. One test per commit. Sources are read with LF line endings, so the regexes may contain \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const issuesOf = (schema: z.ZodType, input: unknown) => {
  const parsed = schema.safeParse(input)
  assert.equal(parsed.success, false)
  return parsed.error!.issues
}

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
