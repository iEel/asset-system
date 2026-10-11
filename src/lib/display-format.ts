// Display helpers for counts and money. Thai locale always, so the output never depends on the machine that renders it.
// th-TH uses Arabic digits and the same grouping as en-US, so English pages read the same.
// signDisplay negative: an amount that rounds to zero prints 0, never -0.
const countFormat = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0, signDisplay: "negative" })
const moneyFormat = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "negative" })

// Blank means nothing to show: null, undefined, or a string with only spaces. 0 and false are values.
export function isBlankValue(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "")
}

export function formatCount(value: number): string
export function formatCount(value: number | null | undefined): string | null
export function formatCount(value: number | null | undefined): string | null {
  return value == null ? null : countFormat.format(value)
}

export type FormatMoneyOptions = { unit?: string }

// Two decimals always. The unit (common.baht) follows the number after a no-break space; table cells leave it out.
export function formatMoney(value: number, options?: FormatMoneyOptions): string
export function formatMoney(value: number | null | undefined, options?: FormatMoneyOptions): string | null
export function formatMoney(value: number | null | undefined, options?: FormatMoneyOptions): string | null {
  if (value == null) return null
  const text = moneyFormat.format(value)
  return options?.unit ? `${text} ${options.unit}` : text
}
