// Display helpers for counts and money. Thai locale always, so the output never depends on the machine that renders it.
// th-TH uses Arabic digits and the same grouping as en-US, so English pages read the same.
// signDisplay negative: an amount that rounds to zero prints 0, never -0.
const countFormat = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0, signDisplay: "negative" })
const moneyFormat = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "negative" })
// A share from 0 to 1 as a percent: whole ("79%"), or with one decimal where small parts must not read 0% ("0.6%").
const percentFormat = new Intl.NumberFormat("th-TH", { style: "percent", maximumFractionDigits: 0, signDisplay: "negative" })
const percentFormatOneDecimal = new Intl.NumberFormat("th-TH", { style: "percent", maximumFractionDigits: 1, signDisplay: "negative" })

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

// A share (0.788) as a percent: "79%", or "78.8%" with one decimal. null and undefined come back as null for Nil.
export function formatPercent(value: number, fractionDigits?: 0 | 1): string
export function formatPercent(value: number | null | undefined, fractionDigits?: 0 | 1): string | null
export function formatPercent(value: number | null | undefined, fractionDigits: 0 | 1 = 0): string | null {
  if (value == null) return null
  return (fractionDigits === 1 ? percentFormatOneDecimal : percentFormat).format(value)
}
