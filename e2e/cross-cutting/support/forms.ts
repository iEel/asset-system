// The workflow forms as IT staff fill them (spec §6.7): their save button, a date a few days from today, and the return
// form filled correctly once its asset is chosen, after a handover to the run's first receiver.
import type { Page } from "@playwright/test"
import { expect } from "../../support/fixtures.ts"
import type { E2eDevice } from "../../support/matrix.ts"
import { runRecords } from "../../support/run-plan.ts"
import { readRunData, readRunState } from "../../support/state.ts"
import { TX_WORDS } from "../../transactions/tx-words.ts"
import type { AssetChoices } from "./records.ts"
import { choose } from "./ui.ts"

// The workflow forms' submit button is common.save.
export function save(page: Page) {
  return page.getByRole("button", { name: "บันทึก", exact: true }).click()
}

// The transaction pages' footer submit is assetOperation.reviewAndSave (group 3 spec §5); the other forms keep
// common.save.
export function reviewAndSave(page: Page) {
  return page.getByRole("button", { name: "ตรวจสอบและบันทึก", exact: true }).click()
}

// ส่งมอบ's forward press: on the phone step 1's ถัดไป (the three steps, group 3 spec §7.4); on the desktop the footer's
// ตรวจสอบและบันทึก.
export function handoverForward(page: Page, device: E2eDevice): Promise<void> {
  if (device === "phone") return page.getByRole("button", { name: TX_WORDS.phoneNext, exact: true }).click()
  return reviewAndSave(page)
}

// A date input's value, days from today on this machine (Asia/Bangkok, like the browser's timezoneId).
export function isoDay(offset: number): string {
  const day = new Date()
  day.setDate(day.getDate() + offset)
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`
}

// The return form (src/components/asset-operations/checkin-form.tsx) once its asset is chosen (group 3 spec §8.3): the
// handover's holder returns it and the signed-in IT staff receive it (both start filled), Good (the chips start empty),
// back to Ready in the run's room (searchable, "code - name"; the full label, since the run's room code is a prefix of the
// second room's).
export async function fillReturn(page: Page, choices: AssetChoices) {
  const run = readRunData()
  const room = runRecords(readRunState().runId).location
  await expect(page.locator("#checkin-return-by")).toContainText(run.employees.receiver1.code)
  await expect(page.locator("#checkin-receive-by")).toContainText(run.employees.itStaff.code)
  await page.locator(`input[name="checkin-condition-after"][value="${choices.goodConditionId}"]`).check()
  await page.locator("#checkin-next-status").selectOption({ label: "พร้อมใช้งาน" })
  await choose(page, "checkin-next-location", room.code, `${room.code} - ${room.name}`)
}
