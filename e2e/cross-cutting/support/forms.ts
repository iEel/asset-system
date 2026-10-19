// The workflow forms as IT staff fill them (spec §6.7): their save button, a date a few days from today, and the return
// form filled correctly after a handover to the run's first receiver.
import type { Page } from "@playwright/test"
import { readRunData } from "../../support/state.ts"
import type { AssetChoices } from "./records.ts"
import { choose } from "./ui.ts"

// Every workflow form's submit button is common.save.
export function save(page: Page) {
  return page.getByRole("button", { name: "บันทึก", exact: true }).click()
}

// A date input's value, days from today on this machine (Asia/Bangkok, like the browser's timezoneId).
export function isoDay(offset: number): string {
  const day = new Date()
  day.setDate(day.getDate() + offset)
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`
}

// The return form (src/components/asset-operations/checkin-form.tsx) from its first person on: the receiver returns it,
// IT staff receive it, Good, back to Ready in the run's room.
export async function fillReturn(page: Page, choices: AssetChoices) {
  const run = readRunData()
  await choose(page, "checkin-return-by", run.employees.receiver1.code)
  await choose(page, "checkin-receive-by", run.employees.itStaff.code)
  await page.locator("#checkin-condition-after").selectOption(choices.goodConditionId)
  await page.locator("#checkin-next-status").selectOption({ label: "พร้อมใช้งาน" })
  await page.locator("#checkin-next-location").selectOption(run.locationId)
}
