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
