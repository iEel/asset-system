// Page group 11 plan 1 Task 4 (plan docs/superpowers/plans/2026-11-08-group11-users-list.md; spec
// docs/superpowers/specs/2026-11-08-page-group-11-users-roles-design.md §4, boards US-Users and US-Users-Phone): the
// rebuilt user list (/th/admin/users), as the seed admin. No run role holds user:view (e2e/support/run-plan.ts), and
// no run role is changed for this spec, so the page opens with the seed admin's saved session (ADMIN_STATE_FILE), the
// session the setup project and the suite's API helpers already use.
// The dev database is a copy of Production with many users whose counts move, so nothing asserts a global total: every
// step reads the run's own users, or compares two numbers of the same render.
// Desktop (desktop-light, desktop-dark):
// - A search for the run id, then the role chip's run viewer role: every row left holds that role, the viewer is
//   there and IT staff are not, and the status chips read ใช้งาน + ไม่ใช้งาน = ทั้งหมด.
// - A search for the setup's unlinked user (e2e.unlinked-<run>), then ไม่เคยเข้าสู่ระบบ: the user is listed.
// - A run-marked employee (code <run>-<project>-US) with a user linked to it, then the employee set to ลาออก: the
//   review list finds the account with พนักงานลาออกแล้ว, and the unfiltered page's warning opens the review list.
// Phone (phone-light, phone-dark):
// - A search for the run id shows the run users' cards, and the page never scrolls sideways.
// Writes: POST /api/employees, POST /api/admin/users and PUT /api/employees/[id], once per desktop project, as the seed
// admin. Nothing is deleted; no settings, LDAP or sign-in request. axe through recordSettled on every page.
import { randomBytes } from "node:crypto"
import type { Locator, Page } from "../shell/shell-steps.ts"
import { fillTemplate, templatePattern } from "../shell/shell-words.ts"
import { expect, test } from "../support/fixtures.ts"
import type { Measure } from "../support/measure.ts"
import { ADMIN_STATE_FILE, fromRoot } from "../support/paths.ts"
import { runSuffix } from "../support/env-guard.ts"
import { passwordFrom } from "../support/run-plan.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { recordSettled } from "../audit/settle.ts"
import { escapeRegExp, seedAdminApi } from "../disposal/disposal-support.ts"
import { projectCode, txAssetName } from "../transactions/tx-plan.ts"
import { USERS_WORDS as W } from "./users-words.ts"

// The seed admin's saved session (written by the global setup), in place of a run user: the list needs user:view.
test.use({ storageState: fromRoot(ADMIN_STATE_FILE) })

const USERS = "/th/admin/users"
const DESKTOP_ONLY = "the table, its status chips and the warning bar are the desktop's; the phone test reads the cards"
const PHONE_ONLY = "the cards are the phone's (md:hidden); the desktop tests read the table"
const toNumber = (text: string) => Number(text.trim().replaceAll(",", ""))

// The page as a person opens it: navigate, wait for its heading, and run axe once it has settled.
async function open(page: Page, measure: Measure, path: string, label: string) {
  await page.goto(path, { waitUntil: "load" })
  await expect(page.getByRole("heading", { level: 1, name: W.title, exact: true })).toBeVisible()
  await recordSettled(page, measure, label)
}

// The visible search (the desktop toolbar's, or the phone's): type the words and press ค้นหา.
async function search(page: Page, words: string) {
  const form = page.getByRole("search").filter({ visible: true })
  await form.getByRole("searchbox", { name: W.search, exact: true }).fill(words)
  await form.getByRole("button", { name: W.search, exact: true }).click()
  await page.waitForURL((url) => url.pathname === USERS && url.searchParams.get("search") === words)
}

// The table's user rows (each <tr> is named แก้ไขผู้ใช้ <name>); the empty row has no name.
const userRows = (page: Page): Locator => page.locator("tbody tr[aria-label]").filter({ visible: true })

// A status chip's count: the link in the status <nav> whose text is the word then its number.
async function statusCount(page: Page, word: string): Promise<number> {
  const nav = page.getByRole("navigation", { name: W.statusNavigation, exact: true }).filter({ visible: true })
  const chip = nav.getByRole("link").filter({ hasText: new RegExp(`^${escapeRegExp(word)}[\\d,]+$`) })
  await expect(chip).toHaveCount(1)
  return toNumber(await chip.locator(".num").innerText())
}

type RunEmployee = { id: string; code: string; fullNameTh: string }

// The employee API's whole body (employeeSchema), as e2e/master-data/employees.spec.ts sends it.
function employeeBody(employee: RunEmployee, employmentStatus: "active" | "resigned") {
  const run = readRunData()
  return {
    code: employee.code,
    fullNameTh: employee.fullNameTh,
    fullNameEn: null,
    email: null,
    companyId: run.companyId,
    branchId: run.branchId,
    departmentId: run.departmentId,
    position: null,
    employmentStatus,
    managerId: null,
    isActive: true,
  }
}

// The three writes of this spec, as the seed admin: the project's run employee (E2E-1108A-DL-US, the run's code
// pattern), a user linked to it with the run viewer role and a generated password (never printed), then ลาออก.
async function createResignedEmployeeUser(projectName: string): Promise<{ username: string; displayName: string }> {
  const { runId } = readRunState()
  const viewer = readRunData().users.viewer
  if (!viewer) throw new Error("the run has no viewer role: the setup did not finish")
  const code = projectCode(projectName)
  const employee: RunEmployee = { id: "", code: `${runId}-${code}-US`, fullNameTh: txAssetName(runId, projectName, "พนักงานลาออกมีบัญชี") }
  const user = { username: `e2e.left-${code.toLowerCase()}-${runSuffix(runId)}`, displayName: txAssetName(runId, projectName, "บัญชีของพนักงานที่ลาออก") }
  const admin = await seedAdminApi()
  try {
    const createdEmployee = await admin.post("/api/employees", { data: employeeBody(employee, "active") })
    expect(createdEmployee.status(), `POST /api/employees ${employee.code}: ${(await createdEmployee.text()).slice(0, 300)}`).toBe(201)
    employee.id = ((await createdEmployee.json()) as { id: string }).id

    const createdUser = await admin.post("/api/admin/users", {
      data: {
        username: user.username,
        password: passwordFrom(randomBytes(24)),
        displayName: user.displayName,
        email: null,
        employeeId: employee.id,
        roleIds: [viewer.roleId],
        isActive: true,
      },
    })
    expect(createdUser.status(), `POST /api/admin/users ${user.username}: ${(await createdUser.text()).slice(0, 300)}`).toBe(201)

    const resigned = await admin.put(`/api/employees/${employee.id}`, { data: employeeBody(employee, "resigned") })
    expect(resigned.status(), `PUT /api/employees/${employee.id}: ${(await resigned.text()).slice(0, 300)}`).toBe(200)
  } finally {
    await admin.dispose()
  }
  return user
}

test.describe("the user list as the seed admin (group 11 plan 1)", () => {
  test("run users are found and filtered by role", async ({ page, measure, e2eDevice }) => {
    test.skip(e2eDevice === "phone", DESKTOP_ONLY)
    const { runId } = readRunState()
    const { users } = readRunData()
    const viewer = users.viewer
    const itStaff = users.itStaff
    if (!viewer || !itStaff) throw new Error("the run has no viewer or IT staff user: the setup did not finish")

    await open(page, measure, USERS, "user list")
    await search(page, runId)
    await expect(userRows(page).filter({ hasText: itStaff.username })).toHaveCount(1)

    // The role chip: "บทบาท: ทุกบทบาท", a searchable popover whose options read "<ชื่อไทย> · <key>".
    await page.getByRole("button", { name: `${W.roleFilter}: ${W.roleFilterAll}`, exact: true }).filter({ visible: true }).click()
    const menu = page.getByRole("dialog", { name: W.roleFilter, exact: true })
    await menu.getByRole("combobox", { name: W.roleFilterSearch, exact: true }).fill(viewer.roleName)
    await menu.getByRole("option", { name: new RegExp(`· ${escapeRegExp(viewer.roleName)}$`) }).click()
    await page.waitForURL((url) => url.pathname === USERS && url.searchParams.get("role") === viewer.roleId && url.searchParams.get("search") === runId)
    await recordSettled(page, measure, "user list, the run viewer role")

    // Every row left holds the viewer role (its label is the role's Thai name); the viewer is there, IT staff are not.
    const roleLabel = `${runId} ผู้ดูอย่างเดียว`
    const rows = userRows(page)
    await expect(rows.filter({ hasText: viewer.username })).toHaveCount(1)
    await expect(rows.filter({ hasText: itStaff.username })).toHaveCount(0)
    const count = await rows.count()
    expect(count, "the role leaves at least the viewer").toBeGreaterThan(0)
    for (let index = 0; index < count; index += 1) await expect(rows.nth(index)).toContainText(roleLabel)

    // The chips' counts follow the search and the role: ใช้งาน + ไม่ใช้งาน = ทั้งหมด.
    const all = await statusCount(page, W.statusAll)
    const active = await statusCount(page, W.statusActive)
    const inactive = await statusCount(page, W.statusInactive)
    expect(active + inactive, "ใช้งาน + ไม่ใช้งาน = ทั้งหมด").toBe(all)
    expect(all, "ทั้งหมด counts the rows shown").toBe(count)
  })

  test("never logged in shows the unlinked run user", async ({ page, measure, e2eDevice }) => {
    test.skip(e2eDevice === "phone", DESKTOP_ONLY)
    const unlinked = `e2e.unlinked-${runSuffix(readRunState().runId)}`

    await open(page, measure, USERS, "user list")
    await search(page, unlinked)
    const nav = page.getByRole("navigation", { name: W.statusNavigation, exact: true }).filter({ visible: true })
    await nav.getByRole("link").filter({ hasText: new RegExp(`^${escapeRegExp(W.statusNever)}[\\d,]+$`) }).click()
    await page.waitForURL((url) => url.pathname === USERS && url.searchParams.get("status") === "never" && url.searchParams.get("search") === unlinked)
    await expect(nav.getByRole("link", { name: new RegExp(`^${escapeRegExp(W.statusNever)}`) })).toHaveAttribute("aria-current", "page")
    await expect(userRows(page).filter({ hasText: unlinked })).toHaveCount(1)
    await recordSettled(page, measure, "user list, never signed in")
  })

  // The account's employee holds no asset (the brief allows these three writes only), so its row has the badge and no
  // holdings link; the holdings link is pinned in tests/admin-users-board.test.ts ("rows show you, left employees and
  // holdings").
  test("a resigned employee's account is flagged and the warning opens the review list", async ({ page, measure, e2eDevice }, testInfo) => {
    test.skip(e2eDevice === "phone", DESKTOP_ONLY)
    const user = await createResignedEmployeeUser(testInfo.project.name)

    await open(page, measure, `${USERS}?status=review&search=${encodeURIComponent(user.username)}`, "user list, needs review")
    const row = userRows(page).filter({ hasText: user.username })
    await expect(row).toHaveCount(1)
    await expect(row).toContainText(W.employeeLeft)

    // The unfiltered page: the warning names at least this account, and its link opens the review list.
    await open(page, measure, USERS, "user list with the warning")
    const warning = page.locator('[data-slot="user-review-warning"]').filter({ visible: true })
    await expect(warning).toHaveCount(1)
    await expect(warning).toContainText(templatePattern(W.reviewTitle, { count: "[\\d,]+" }))
    await warning.getByRole("link", { name: templatePattern(W.reviewLink, { count: "[\\d,]+" }) }).click()
    await page.waitForURL((url) => url.pathname === USERS && url.searchParams.get("status") === "review")
    await expect(page.getByRole("navigation", { name: W.statusNavigation, exact: true }).filter({ visible: true }).getByRole("link", { name: new RegExp(`^${escapeRegExp(W.statusReview)}`) })).toHaveAttribute("aria-current", "page")
    await recordSettled(page, measure, "user list, the warning's review list")
  })

  test("cards on the phone", async ({ page, measure, e2eDevice }) => {
    test.skip(e2eDevice !== "phone", PHONE_ONLY)
    const { runId } = readRunState()
    const { users } = readRunData()

    await open(page, measure, USERS, "user list (phone)")
    await search(page, runId)
    const cards = page.locator('[data-slot="user-list-cards"]').filter({ visible: true })
    for (const user of Object.values(users)) {
      if (!user) continue
      await expect(cards.getByRole("link", { name: fillTemplate(W.editUserLabel, { name: user.displayName, username: user.username }), exact: true })).toBeVisible()
    }
    await recordSettled(page, measure, "user list cards (phone)")
    const sideways = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    expect(sideways, "the page does not scroll sideways").toBe(true)
  })
})
