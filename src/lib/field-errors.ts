// Field errors: the server names the fields that failed (V track, spec docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md §6.1).
// A refusal body carries `fieldErrors`: one code per field, keyed by the dotted path of the field in the request ("name",
// "rows.3.serialNumber", "customFieldDefs.0.fieldName") or "_form" for a refusal of the whole request.
//
// Tests and client code import this module, so it has no "@/" import and reaches zod only through the structural
// IssueLike type (a zod 4 issue passes as one without a cast). The api-error catalog imports nothing, so it is reached
// with a relative import.
import { getApiErrorKey } from "./api-error-catalog.ts"

export const FORM_ERROR_KEY = "_form"

export type FieldErrorCode =
  | "required"
  | "tooShort"
  | "tooLong"
  | "outOfRange"
  | "invalidDate"
  | "invalidNumber"
  | "invalidEmail"
  | "invalidFormat"
  | "invalidChoice"
  | "duplicate"
  | "invalid"

// Key: the dotted field path, or "_form". Value: a FieldErrorCode or an api-error catalog key (e.g. "endBeforeStart").
export type FieldErrors = Record<string, string>

// The members of a zod 4 issue this module reads. `received` is set by zod only for NaN and Invalid Date, which is how a
// bad number is told from a missing one (issues carry no `input` unless reportInput is on).
export type IssueLike = {
  code: string
  path: readonly PropertyKey[]
  message: string
  minimum?: unknown
  maximum?: unknown
  origin?: string
  format?: string
  expected?: string
  received?: unknown
  input?: unknown
}

export function fieldErrorKey(path: readonly PropertyKey[]): string {
  return path.length === 0 ? FORM_ERROR_KEY : path.map((segment) => String(segment)).join(".")
}

// A message the api-error catalog knows wins over the issue code (custom issues, and custom messages on built-in checks);
// otherwise the issue code maps to one shared code. Never the issue's own message: that is developer text.
export function issueToFieldErrorCode(issue: IssueLike): string {
  const catalogKey = getApiErrorKey(issue.message)
  if (catalogKey) return catalogKey

  switch (issue.code) {
    case "invalid_type":
      if (issue.expected === "date") return "invalidDate"
      if (issue.expected === "number" && issue.received !== undefined) return "invalidNumber"
      return "required"
    case "too_small":
      if (issue.origin === "string") return Number(issue.minimum) > 1 ? "tooShort" : "required"
      if (issue.origin === "array" || issue.origin === "set") return "required"
      return "outOfRange"
    case "too_big":
      return issue.origin === "string" ? "tooLong" : "outOfRange"
    case "invalid_format":
      return issue.format === "email" ? "invalidEmail" : "invalidFormat"
    case "not_multiple_of":
      return "invalidNumber"
    case "invalid_value":
    case "invalid_union":
      return "invalidChoice"
    default:
      // custom (a message the catalog does not know), unrecognized_keys, invalid_key, invalid_element.
      return "invalid"
  }
}

// One code per key, the first issue of a key winning. keyFor may rename a key; null keeps the dotted path, so no issue is
// ever dropped.
export function issuesToFieldErrors(
  issues: readonly IssueLike[],
  keyFor?: (path: readonly PropertyKey[]) => string | null,
): FieldErrors {
  const fieldErrors: FieldErrors = {}
  for (const issue of issues) {
    const key = keyFor?.(issue.path) ?? fieldErrorKey(issue.path)
    if (!(key in fieldErrors)) fieldErrors[key] = issueToFieldErrorCode(issue)
  }
  return fieldErrors
}

// A refusal about fields that the code throws on purpose (a username or serial number that exists). errorResponse answers
// it with its status, its message and its fieldErrors. Fields are declared in the class body, not as parameter
// properties: node's strip-only mode refuses those, and tests import this module.
export class FieldRefusalError extends Error {
  readonly fieldErrors: FieldErrors
  readonly status: number

  constructor(message: string, fieldErrors: FieldErrors, status = 400) {
    super(message)
    this.name = "FieldRefusalError"
    this.fieldErrors = fieldErrors
    this.status = status
  }
}

// The settings form sends every setting in one list, so an issue at settings.<index>.… is keyed by the submitted
// setting's own key (settings.asset_label_12_width_mm), the field the form shows it under. With no usable key (the key
// itself failed) the callback returns null and the dotted path stays (settings.3.key).
export function settingFieldKeyFor(submitted: unknown): (path: readonly PropertyKey[]) => string | null {
  const list = submitted && typeof submitted === "object" ? (submitted as { settings?: unknown }).settings : undefined
  const settings: unknown[] = Array.isArray(list) ? list : []
  return (path) => {
    if (path[0] !== "settings" || typeof path[1] !== "number") return null
    const setting = settings[path[1]]
    const key = setting && typeof setting === "object" ? (setting as { key?: unknown }).key : undefined
    return typeof key === "string" && key.trim().length > 0 ? `settings.${key.trim()}` : null
  }
}
