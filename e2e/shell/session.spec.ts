// The session in the shell (menu B shell spec §6.8): the status and the keep-alive tell the deadlines; the idle and
// ceiling warnings show in the shell banner; offline holds the deadline; a deadline passed and a stale session cookie
// both land on the login that says why. The status read is stood in for (shell-steps.ts standInStatus), answering 401
// after its deadline as the server does; the keep-alive stays the app's own. No test signs in, and the real idle limit
// (SESSION_IDLE_SECONDS 10800 in the run, 3 hours = 10_800_000 ms) is never waited out.
import { asUser, expect, test } from "../support/fixtures.ts"
import { readRunState } from "../support/state.ts"
import { SHELL_WORDS } from "./shell-words.ts"
import { shellBanner, standInStatus } from "./shell-steps.ts"

asUser("itStaff")

const RUN_IDLE_MS = 10_800_000
const CEILING_MS = 43_200_000
const STAY = { name: SHELL_WORDS.stay, exact: true } as const

type SessionBody = { loginAt: string; activeAt: string; idleDeadline: string; ceilingDeadline: string; serverNow: string }

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/

test("the status and the keep-alive tell the deadlines; the idle and ceiling warnings show in the banner", async ({ page, measure }) => {
  await measure.visit("/th/dashboard", "IT staff: dashboard (session)")

  // The status: the run's session, signed in once by the setup, ends 12 hours after that sign-in at the latest.
  const status = await page.evaluate(async () => {
    const response = await fetch("/api/session/status", { cache: "no-store" })
    return { status: response.status, body: (await response.json()) as SessionBody }
  })
  expect(status.status).toBe(200)
  for (const field of ["loginAt", "activeAt", "idleDeadline", "ceilingDeadline", "serverNow"] as const) expect(status.body[field], field).toMatch(ISO)
  const ceilingDeadline = Date.parse(status.body.ceilingDeadline)
  expect(Date.parse(status.body.idleDeadline)).toBeLessThanOrEqual(ceilingDeadline)
  expect(ceilingDeadline - Date.parse(status.body.loginAt)).toBe(CEILING_MS)
  const startedAt = Date.parse(readRunState().startedAt)
  expect(ceilingDeadline).toBeGreaterThanOrEqual(startedAt + CEILING_MS)
  expect(ceilingDeadline).toBeLessThanOrEqual(startedAt + CEILING_MS + 20 * 60 * 1000)

  // The keep-alive moves the idle deadline to now plus the run's idle limit; the ceiling stays.
  const kept = await page.evaluate(async () => {
    const response = await fetch("/api/session/keep-alive", { method: "POST", cache: "no-store" })
    return { status: response.status, body: (await response.json()) as SessionBody }
  })
  expect(kept.status).toBe(200)
  expect(kept.body.ceilingDeadline).toBe(status.body.ceilingDeadline)
  expect(Math.abs(Date.parse(kept.body.idleDeadline) - (Date.now() + RUN_IDLE_MS))).toBeLessThanOrEqual(120_000)

  // Four minutes to the idle deadline: the banner counts down, and "อยู่ในระบบต่อ" (the app's own keep-alive) clears it.
  await standInStatus(page, { idleInMs: 240_000 })
  await measure.visit("/th/dashboard", "IT staff: the idle warning")
  const banner = shellBanner(page)
  await expect(banner).toContainText(/จะออกจากระบบใน [34]:\d{2} นาทีเพราะไม่มีการใช้งาน · งานที่กรอกค้างไว้ยังไม่ถูกบันทึก/)
  await measure.recordPage("IT staff: the idle warning in the banner")
  await banner.getByRole("button", STAY).click()
  await expect(banner).not.toContainText("จะออกจากระบบ")

  // Four minutes to the 12-hour ceiling: the banner says when, and offers no way to stay.
  await standInStatus(page, { idleInMs: 240_000, ceilingInMs: 240_000 })
  await measure.visit("/th/dashboard", "IT staff: the ceiling warning")
  await expect(banner).toContainText(/จะออกจากระบบเวลา \d{2}:\d{2} · ครบ 12 ชั่วโมงของการเข้าระบบ บันทึกงานก่อนแล้วเข้าใหม่/)
  await expect(banner.getByRole("button", STAY)).toHaveCount(0)
  await page.unroute("**/api/session/status")
})

test("offline holds the deadline; the deadline and a stale cookie both land on the login that says why", async ({ page, measure, baseURL, e2eTheme }) => {
  const banner = shellBanner(page)

  // Offline across the deadline: nothing redirects, and the banner says offline, not the session.
  await standInStatus(page, { idleInMs: 15_000 })
  await measure.visit("/th/assets", "IT staff: the register (offline)")
  // The keeper has read the stand-in: its warning shows before the browser goes offline.
  await expect(banner).toContainText("จะออกจากระบบใน")
  await measure.whileOffline(async () => {
    await expect(banner).toContainText(SHELL_WORDS.offline)
    await expect(banner).not.toContainText("จะออกจากระบบ")
    await page.waitForTimeout(20_000)
    expect(new URL(page.url()).pathname).toBe("/th/assets")
    await page.unroute("**/api/session/status")
  })
  // Online again: the first request is the status (the server's own now), which keeps the session.
  await expect(banner).not.toContainText(SHELL_WORDS.offline)
  await expect(banner).not.toContainText("จะออกจากระบบ")
  expect(new URL(page.url()).pathname).toBe("/th/assets")

  // The deadline passes online: the 401 sends the person to the login, which keeps the page and says why.
  measure.expectRefusal({ method: "GET", url: /\/api\/session\/status$/, status: 401, reason: "the stand-in status answers 401 after its deadline, as the server does" })
  await standInStatus(page, { idleInMs: 3_000 })
  // Not measure.visit: the redirect comes about 5 seconds after the stand-in starts, and could land in the middle of
  // the register's load or its axe run. The login it lands on is measured below.
  await page.goto("/th/assets?search=E2E", { waitUntil: "commit" })
  await page.waitForURL((url) => url.pathname === "/th/login", { timeout: 30_000 })
  const login = new URL(page.url())
  expect(login.searchParams.get("reason")).toBe("session-expired")
  expect(login.searchParams.get("callbackUrl")).toBe("/th/assets?search=E2E")
  await expect(page.getByText(SHELL_WORDS.sessionExpired, { exact: true })).toBeVisible()
  await measure.recordPage("IT staff: the login after the deadline")
  await page.unroute("**/api/session/status")

  // A session cookie that no longer opens a session (a reload after the client missed the deadline) lands there too.
  if (!baseURL) throw new Error("playwright.config.ts sets use.baseURL")
  await page.context().clearCookies()
  await page.context().addCookies([
    { name: "authjs.session-token", value: "e2e-stale-session", url: baseURL },
    { name: "theme", value: e2eTheme, url: baseURL },
  ])
  await page.goto("/th/dashboard")
  await page.waitForURL((url) => url.pathname === "/th/login")
  expect(new URL(page.url()).searchParams.get("reason")).toBe("session-expired")
})
