// ส่งมอบ on the phone (group 3 spec §7.4, plan 1 Task 7, ruling P1-R4): one form DOM, three steps below lg. Each part of
// the form takes a class from its step; from lg the step is ignored and the desktop page shows every section. Pure and
// client-safe; the step type is checkout-form-rules.ts's alone.
import type { CheckoutPhoneStep } from "./checkout-form-rules.ts"

export const checkoutPhoneParts = ["asset", "receiver", "evidence", "photo", "dateField", "signature", "stepsBar", "stepsFooter", "dateLine", "readBack", "statement"] as const
export type CheckoutPhonePart = (typeof checkoutPhoneParts)[number]

// The steps each part shows on. The form's own parts show at every width from lg; the phone-only parts never do.
const FORM_PART_STEPS: Partial<Record<CheckoutPhonePart, readonly CheckoutPhoneStep[]>> = {
  asset: [1],
  receiver: [1],
  photo: [1],
  dateField: [1],
  signature: [3],
  // Section 3 holds the photo (step 1) and the pad (step 3).
  evidence: [1, 3],
}
const PHONE_PART_STEPS: Partial<Record<CheckoutPhonePart, readonly CheckoutPhoneStep[]>> = {
  stepsBar: [1, 2, 3],
  stepsFooter: [1, 2, 3],
  dateLine: [1],
  readBack: [2],
  statement: [3],
}

export function checkoutPhonePartClass(part: CheckoutPhonePart, step: CheckoutPhoneStep): "" | "max-lg:hidden" | "lg:hidden" | "hidden" {
  const formSteps = FORM_PART_STEPS[part]
  if (formSteps) return formSteps.includes(step) ? "" : "max-lg:hidden"
  return PHONE_PART_STEPS[part]?.includes(step) ? "lg:hidden" : "hidden"
}

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/

// A YYYY-MM-DD day as a Bangkok day: "30 ต.ค. 2569" in Thai (the Buddhist year), "30 Oct 2026" in English; "" unless
// the text is a real day.
export function formatCheckoutDay(day: string, locale: string): string {
  const match = DAY.exec(day)
  if (!match) return ""
  const [year, month, date] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const check = new Date(Date.UTC(year, month - 1, date))
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== date) return ""
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH-u-ca-buddhist" : "en-GB", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${day}T00:00:00+07:00`))
}

// Step 3's statement (spec §7.4): with the components that go, or without; a department or a room is received on its
// behalf, so the form adds that line.
export function getCheckoutSignStatement(input: { checkoutType: "user" | "department" | "location"; travellingCount: number }): {
  key: "signStatement" | "signStatementNoComponents"
  onBehalf: boolean
} {
  return {
    key: input.travellingCount > 0 ? "signStatement" : "signStatementNoComponents",
    onBehalf: input.checkoutType !== "user",
  }
}
