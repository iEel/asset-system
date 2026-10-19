// Rule helpers for every form's validate() (V track, spec docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md
// §4.5, §7.2). A form with noValidate no longer lets the browser check required, maxLength, minLength, pattern or
// type="email", so its validate() restates those rules through these helpers. Each returns a code (a FieldErrorCode, or the
// catalog key "endBeforeStart") or null; the form shows the code's message under the field. Chain them with ??:
// required(value) ?? maxLength(value, 100). Every helper but required leaves an empty value alone, so an empty optional
// field is valid. Pure, with relative imports only, so tests and client code import this file.
import type { FieldErrorCode } from "./field-errors.ts"

// "tooManyDecimals" is the money rule's own code (common.validation.tooManyDecimals, v-track plan 2 task 31c), and
// "notWholeNumber" the whole-number rule's (common.validation.notWholeNumber, v-track final task 1). The server sends
// neither: its .int() refusal reads invalidNumber (v-track plan 2 X-R2).
export type RuleCode = FieldErrorCode | "endBeforeStart" | "tooManyDecimals" | "notWholeNumber"

// The WHATWG pattern the browser uses for type="email".
const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "")
}

// Missing: undefined, null, blank text, an empty list and false (an unticked acknowledgement). 0 is a value.
export function required(value: unknown): RuleCode | null {
  if (isEmpty(value) || value === false) return "required"
  if (Array.isArray(value) && value.length === 0) return "required"
  return null
}

// Counts the trimmed text, as the old disabled submit gates did.
export function minLength(value: string | null | undefined, min: number): RuleCode | null {
  if (isEmpty(value)) return null
  return (value as string).trim().length < min ? "tooShort" : null
}

// Counts the text as typed, as the maxLength attribute does.
export function maxLength(value: string | null | undefined, max: number): RuleCode | null {
  if (isEmpty(value)) return null
  return (value as string).length > max ? "tooLong" : null
}

// A number, or the text of a number field. Either bound may be left out.
export function range(value: number | string | null | undefined, min?: number | null, max?: number | null): RuleCode | null {
  if (isEmpty(value)) return null
  const number = typeof value === "number" ? value : Number((value as string).trim())
  if (!Number.isFinite(number)) return "invalidNumber"
  if (min !== undefined && min !== null && number < min) return "outOfRange"
  if (max !== undefined && max !== null && number > max) return "outOfRange"
  return null
}

// A number field's step other than 1 (step="0.5" of a label's margin and gap): a whole multiple of size. Off the step is
// "invalidNumber", the code the server gives zod's not_multiple_of; text that is not a number too. A whole-number field
// uses wholeNumber and a money field decimals, each with its own sentence.
export function step(value: number | string | null | undefined, size: number): RuleCode | null {
  if (isEmpty(value)) return null
  const number = typeof value === "number" ? value : Number((value as string).trim())
  if (!Number.isFinite(number)) return "invalidNumber"
  const steps = number / size
  return Math.abs(steps - Math.round(steps)) < 1e-6 ? null : "invalidNumber"
}

// A whole-number field (a number input with the default step of 1: license seats, an audit round's year and sample rate,
// the PM days, the settings' running digits, deactivation limit and label sizes): a fraction has its own sentence,
// "notWholeNumber" (v-track final task 1; it replaced the seats' pattern, the audit round's own helper and the step of
// 1). Text that is not a number is "invalidNumber"; an empty value is left to required. Write it after range:
// range(v, 0) ?? wholeNumber(v).
export function wholeNumber(value: number | string | null | undefined): RuleCode | null {
  if (isEmpty(value)) return null
  const number = typeof value === "number" ? value : Number((value as string).trim())
  if (!Number.isFinite(number)) return "invalidNumber"
  return Number.isInteger(number) ? null : "notWholeNumber"
}

// A money field's step (step="0.01"): at most `places` digits after the point, with its own sentence. The typed digits
// count, trailing zeros left out (12.50 passes), so a large amount keeps its fraction; 1e-3 is counted as a number.
export function decimals(value: number | string | null | undefined, places: number): RuleCode | null {
  if (isEmpty(value)) return null
  const text = typeof value === "number" ? String(value) : (value as string).trim()
  const number = Number(text)
  if (!Number.isFinite(number)) return "invalidNumber"
  const typed = /^[+-]?\d*(?:\.(\d*))?$/.exec(text)
  if (typed) return (typed[1] ?? "").replace(/0+$/, "").length > places ? "tooManyDecimals" : null
  const scaled = number * 10 ** places
  return Math.abs(scaled - Math.round(scaled)) < 1e-6 ? null : "tooManyDecimals"
}

export function email(value: string | null | undefined): RuleCode | null {
  if (isEmpty(value)) return null
  return EMAIL_PATTERN.test((value as string).trim()) ? null : "invalidEmail"
}

// The whole value must match, as the pattern attribute requires.
export function pattern(value: string | null | undefined, expression: RegExp): RuleCode | null {
  if (isEmpty(value)) return null
  const anchored = new RegExp(`^(?:${expression.source})$`, expression.flags.replace(/[gy]/g, ""))
  return anchored.test(value as string) ? null : "invalidFormat"
}

// The end may be the same day as the start, not before it. An empty side is left to required.
export function notBefore(end: string | null | undefined, start: string | null | undefined): RuleCode | null {
  if (isEmpty(end) || isEmpty(start)) return null
  return Date.parse(end as string) < Date.parse(start as string) ? "endBeforeStart" : null
}

// A group (scopes, destinations) needs one value that required accepts.
export function atLeastOne(values: readonly unknown[]): RuleCode | null {
  return values.some((value) => required(value) === null) ? null : "required"
}
