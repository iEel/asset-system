// รับคืน on the phone (group 3 spec §8.8, plan 2 Task 10): one form DOM, no steps. Below lg, ผู้คืน and ผู้รับคืน fold
// into one line with แก้ไข, and the footer counts the components. Pure and client-safe.

export const checkinPhoneParts = ["people", "peopleLine"] as const
export type CheckinPhonePart = (typeof checkinPhoneParts)[number]

/**
 * The wrapper of the two fields is `display: contents` wherever it shows, so the fields stay cells of section 2's grid.
 * The line is phone-only.
 */
export function checkinPhonePartClass(part: CheckinPhonePart, peopleOpen: boolean): "contents" | "max-lg:hidden lg:contents" | "lg:hidden" | "hidden" {
  if (part === "people") return peopleOpen ? "contents" : "max-lg:hidden lg:contents"
  return peopleOpen ? "hidden" : "lg:hidden"
}

/**
 * Both fields show in four cases:
 * - the user opened them (แก้ไข, or a pick in either);
 * - either is empty;
 * - either has an error, because a focus target must show (v-track M-R1);
 * - from lg, always (that part is CSS).
 */
export function checkinPeopleOpen(input: { opened: boolean; returnBy: string; receiveBy: string; returnByError: boolean; receiveByError: boolean }): boolean {
  return input.opened || !input.returnBy || !input.receiveBy || input.returnByError || input.receiveByError
}

/**
 * The counts behind "ส่วนควบได้คืน X · ขาด Y" while the asset has travelling components. It returns null otherwise, and
 * for a late return, and the footer then keeps its desktop line.
 */
export function checkinPhoneFooterCounts(input: { lateReturn: boolean; returned: number; missing: number }): { returned: number; missing: number } | null {
  if (input.lateReturn || input.returned + input.missing === 0) return null
  return { returned: input.returned, missing: input.missing }
}
