const buddhistEraOffset = 543
// Same bounds as the API's auditYear validation (src/lib/validations/audit.ts: 2000–2100).
const gregorianRange = { min: 2000, max: 2100 }

export function toDisplayYear(gregorianYear: number, locale: string) {
  return locale === "th" ? gregorianYear + buddhistEraOffset : gregorianYear
}

export function fromDisplayYear(displayYear: number, locale: string) {
  return locale === "th" ? displayYear - buddhistEraOffset : displayYear
}

export function displayYearRange(locale: string) {
  return { min: toDisplayYear(gregorianRange.min, locale), max: toDisplayYear(gregorianRange.max, locale) }
}
