// The asset transaction area's records (spec docs/superpowers/specs/2026-10-19-e2e-workflow-suite-design.md §6.1), as
// plain data and pure functions: every asset tag and name carries the run id and the project's code, so the four
// projects never share an asset (spec §11 "Run order") and repeat runs never collide on a tag (spec §5). Imports
// nothing, so tests/e2e-transactions.test.ts (node --test) can load it.

// The project's two letters in a tag: desktop or phone, light or dark.
export const PROJECT_CODES: Readonly<Record<string, string>> = {
  "desktop-light": "DL",
  "desktop-dark": "DD",
  "phone-light": "PL",
  "phone-dark": "PD",
}

export function projectCode(projectName: string): string {
  const code = PROJECT_CODES[projectName]
  if (!code) throw new Error(`the transaction specs run in the four device × theme projects, not in ${projectName}`)
  return code
}

// E2E-1019N-DL-HO1: the run, the project, the workflow's key. The tag column holds 50 characters.
export function txAssetTag(runId: string, projectName: string, key: string): string {
  const tag = `${runId}-${projectCode(projectName)}-${key}`
  if (tag.length > 50) throw new Error(`asset tag ${tag} is longer than 50 characters`)
  return tag
}

// E2E-1019N DL โน้ตบุ๊กส่งมอบ: the marker a person sees in any list (spec §5).
export function txAssetName(runId: string, projectName: string, label: string): string {
  return `${runId} ${projectCode(projectName)} ${label}`
}

// The second room of the run, where returns, transfers and bulk moves take an asset (the setup's room is the first).
export function secondLocation(runId: string) {
  return { code: `${runId}-L2`, name: `${runId} ห้องปลายทาง E2E`, locationType: "Room" as const }
}

// A date input's value (YYYY-MM-DD) in the app's time zone, Asia/Bangkok (UTC+7, no daylight saving), days from now.
export function bangkokDate(offsetDays = 0, now: Date = new Date()): string {
  const bangkok = new Date(now.getTime() + 7 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000)
  return bangkok.toISOString().slice(0, 10)
}

// The phone with the on-screen keyboard open (spec §8 "the keyboard-open height for the forms with a sticky save
// bar"): 390 wide, 360 of the 664 visible points left above the keyboard.
export const PHONE_KEYBOARD_OPEN = { width: 390, height: 360 } as const
