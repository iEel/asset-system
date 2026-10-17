// The pure half of the field-error hook (V track, spec docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md
// §6.1, §7.1). It turns a field-error code into the key of its message and reads the message through lookups the caller
// hands in, so it needs no React, no next-intl and no alias import, and tests import it.
export type ValidationParams = Readonly<Record<string, string | number>>

export type MessageLookup = {
  has: (key: string) => boolean
  get: (key: string, params?: ValidationParams) => string
}

function hasParam(params: ValidationParams | undefined, name: string): boolean {
  const value = params?.[name]
  return value !== undefined && value !== ""
}

// A code with limits reads them when the form passes them; a server code carries none, so it gets the plain sentence.
export function validationMessageKey(code: string, params?: ValidationParams): string {
  if (code === "tooShort") return hasParam(params, "min") ? "tooShort" : "tooShortPlain"
  if (code === "tooLong") return hasParam(params, "max") ? "tooLong" : "tooLongPlain"
  if (code === "outOfRange") {
    const min = hasParam(params, "min")
    const max = hasParam(params, "max")
    if (min && max) return "outOfRange"
    if (min) return "outOfRangeMin"
    if (max) return "outOfRangeMax"
    return "outOfRangePlain"
  }
  return code
}

// common.validation first, then the api-error catalog (a custom server code is its catalog key), then the generic sentence.
export function resolveValidationMessage(
  code: string,
  params: ValidationParams | undefined,
  lookups: { validation: MessageLookup; apiErrors: MessageLookup },
): string {
  const key = validationMessageKey(code, params)
  if (lookups.validation.has(key)) return lookups.validation.get(key, params)
  if (lookups.apiErrors.has(code)) return lookups.apiErrors.get(code)
  return lookups.validation.get("invalid")
}

// The string codes of a refusal body's fieldErrors (FIXED 2), or null when it names none.
export function readFieldErrors(payload: unknown): Record<string, string> | null {
  if (typeof payload !== "object" || payload === null) return null
  const fieldErrors = (payload as { fieldErrors?: unknown }).fieldErrors
  if (typeof fieldErrors !== "object" || fieldErrors === null || Array.isArray(fieldErrors)) return null
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(fieldErrors)) {
    if (typeof value === "string" && value !== "") result[key] = value
  }
  return Object.keys(result).length > 0 ? result : null
}

// The first key of the form's visual order that has an error.
export function firstErrorKey<K extends string>(errors: Partial<Record<string, string>>, order: readonly K[]): K | null {
  return order.find((key) => Boolean(errors[key])) ?? null
}

// The map without those keys; the same object when none of them is set.
export function withoutKeys<T extends Partial<Record<string, string>>>(errors: T, keys: readonly string[]): T {
  if (!keys.some((key) => errors[key] !== undefined)) return errors
  const next = { ...errors }
  for (const key of keys) delete next[key]
  return next
}
