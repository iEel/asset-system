// Page group 11 plan 3 Task 5 (plan docs/superpowers/plans/2026-11-08-group11-roles.md; spec
// docs/superpowers/specs/2026-11-08-page-group-11-users-roles-design.md §6, §7, boards US-Roles and US-Role-Edit): the
// role list (/th/admin/roles), the role editor (/th/admin/roles/new, /th/admin/roles/[id]/edit) and the people in a
// role, as the seed admin. No run role holds role:view, role:create or role:edit, so the pages open with the seed
// admin's saved session (ADMIN_STATE_FILE), as e2e/admin/users-list.spec.ts.
// Desktop (desktop-light, desktop-dark):
// - A search for the run id lists the run's four roles, each user count linking to the user list with role=<id>; the
//   ตารางสิทธิ์ตามโมดูล tab shows the module matrix.
// - The project's own audit role (e2e_audit_<project>_<run>), created on the form with no permission: audit เพิ่ม and
//   อนุมัติ show "+", the change summary and the audit segregation warning; saved with a note, the list shows 2 / <total>.
//   No user holds this role.
// - The project's own people role (e2e_people_<project>_<run>), created on the form with NO permission (controller
//   ruling on Task 5: adding a role with a permission to the shared run users would change their access for every other
//   spec): the add dialog adds the run viewer and the run employee; the people list and the user list with role= show
//   both. A role with no permission changes nobody's access.
// Phone (phone-light, phone-dark):
// - The list never scrolls sideways; the run viewer role's editor scrolls its matrix inside its box and keeps the
//   footer's บันทึกสิทธิ์ on screen. Nothing is saved.
// Writes, through the pages only, once per desktop project: POST /api/admin/roles twice (the two project roles), PUT
// /api/admin/roles/[id] once (the audit role) and POST /api/admin/roles/[id]/users once (the people role). Seed roles and
// system_admin are never opened for a save. Nothing is deleted; no settings, LDAP or sign-in request. axe through
// recordSettled on every page and the dialog.
import type { Page } from "../shell/shell-steps.ts"
import { fillTemplate, templatePattern } from "../shell/shell-words.ts"
import { expect, test } from "../support/fixtures.ts"
import type { Measure } from "../support/measure.ts"
import { ADMIN_STATE_FILE, fromRoot } from "../support/paths.ts"
import { runSuffix } from "../support/env-guard.ts"
import { E2E_USER_KEYS, roleDisplayFor, roleNameFor } from "../support/run-plan.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { recordSettled } from "../audit/settle.ts"
import { escapeRegExp } from "../disposal/disposal-support.ts"
import { projectCode, txAssetName } from "../transactions/tx-plan.ts"
import { ROLES_WORDS as W } from "./roles-words.ts"

// The seed admin's saved session (written by the global setup), in place of a run user: the pages need role:*.
test.use({ storageState: fromRoot(ADMIN_STATE_FILE) })

const ROLES = "/th/admin/roles"
const DESKTOP_ONLY = "the list's table and the editor's workflow run on the desktop; the phone test checks the layout"
const PHONE_ONLY = "the layout check is the phone's; the desktop tests run the workflow"

// The page as a person opens it: navigate, wait for its heading, and run axe once it has settled.
async function open(page: Page, measure: Measure, path: string, heading: string, label: string) {
  await page.goto(path, { waitUntil: "load" })
  await expect(page.getByRole("heading", { level: 1, name: heading, exact: true })).toBeVisible()
  await recordSettled(page, measure, label)
}

// The list's visible search: type the words and press ค้นหา.
async function search(page: Page, words: string) {
  const form = page.getByRole("search").filter({ visible: true })
  await form.getByRole("searchbox", { name: W.search, exact: true }).fill(words)
  await form.getByRole("button", { name: W.search, exact: true }).click()
  await page.waitForURL((url) => url.pathname === ROLES && url.searchParams.get("search") === words)
}

// The table's role row whose key tag reads exactly this key (each <tr> is named แก้ไข: <label>).
const roleRow = (page: Page, key: string) =>
  page.locator("tbody tr[aria-label]").filter({ visible: true }).filter({ has: page.locator("span.tag", { hasText: new RegExp(`^${escapeRegExp(key)}$`) }) })

// The matrix folds ข้อมูลหลัก and ผู้ใช้และระบบ: open every folded group, as the E2E setup's createRole does.
async function openAllGroups(page: Page) {
  const folded = page.locator('#role-permission-matrix button[aria-expanded="false"]')
  while ((await folded.count()) > 0) await folded.first().click()
}

// The audit row's cell for an action: its name starts with the Thai action, then the module (plus a mark once changed).
const auditCell = (page: Page, action: keyof typeof W.actions) =>
  page
    .locator("#role-permission-matrix tbody tr")
    .filter({ has: page.locator("span.tag", { hasText: /^audit$/ }) })
    .getByRole("checkbox", { name: new RegExp(`^${escapeRegExp(W.actions[action])} `) })

// One of the project's own roles: key e2e_<slug>_<project>_<run> (a retry adds _r<n>, the key is unique), its display
// names marked with the run id and the project.
function projectRole(testInfo: { project: { name: string }; retry: number }, slug: "audit" | "people", labelTh: string) {
  const { runId } = readRunState()
  const code = projectCode(testInfo.project.name)
  const retry = testInfo.retry > 0 ? `_r${testInfo.retry}` : ""
  return {
    key: `e2e_${slug}_${code.toLowerCase()}_${runSuffix(runId)}${retry}`,
    displayName: `${runId} ${code} ${slug} role`,
    displayNameTh: txAssetName(runId, testInfo.project.name, labelTh),
  }
}

// The role form, with no permission ticked (the E2E setup's createRole pattern): fill the key and names, save, and read
// the new role's id from the POST's answer; the form returns to the list.
async function createRoleOnForm(page: Page, measure: Measure, role: ReturnType<typeof projectRole>): Promise<string> {
  await open(page, measure, `${ROLES}/new`, W.createTitle, "role form, create")
  await page.locator("#role-key").fill(role.key)
  await page.locator("#role-display-name").fill(role.displayName)
  await page.locator("#role-display-name-th").fill(role.displayNameTh)
  const saved = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/admin/roles" && response.request().method() === "POST")
  await page.locator('[data-slot="sticky-form-footer"]').getByRole("button", { name: W.save, exact: true }).click()
  const response = await saved
  expect(response.status(), `POST /api/admin/roles ${role.key}: ${(await response.text()).slice(0, 300)}`).toBe(201)
  await page.waitForURL((url) => url.pathname === ROLES)
  return ((await response.json()) as { id: string }).id
}

test.describe("the roles pages as the seed admin (group 11 plan 3)", () => {
  test("the role list finds run roles and the matrix tab opens", async ({ page, measure, e2eDevice }) => {
    test.skip(e2eDevice === "phone", DESKTOP_ONLY)
    const { runId } = readRunState()
    const { users } = readRunData()

    await open(page, measure, ROLES, W.title, "role list")
    await search(page, runId)
    await recordSettled(page, measure, "role list, the run's roles")

    // The run's four roles; each holds at least its run user, so its count is a link to the user list with role=<id>.
    for (const key of E2E_USER_KEYS) {
      const user = users[key]
      if (!user) throw new Error(`the run has no ${key} role: the setup did not finish`)
      expect(user.roleName).toBe(roleNameFor(key, runId))
      const row = roleRow(page, user.roleName)
      await expect(row, `the run role ${user.roleName}`).toHaveCount(1)
      const usersLink = row.locator(`a[href*="/th/admin/users?"][href*="role=${user.roleId}"]`)
      await expect(usersLink, `the user count of ${user.roleName}`).toHaveCount(1)
      await expect(usersLink).toHaveText(/^[\d,]+$/)
    }

    // The matrix tab: the module × action table, whose chips name the roles (the run viewer among them).
    await page.getByRole("navigation", { name: W.viewLabel, exact: true }).getByRole("link", { name: W.tabMatrix }).click()
    await page.waitForURL((url) => url.pathname === ROLES && url.searchParams.get("view") === "matrix")
    const matrix = page.getByRole("table", { name: W.tabMatrix, exact: true })
    await expect(matrix).toBeVisible()
    await expect(matrix.locator("span.tag", { hasText: /^audit$/ })).toHaveCount(1)
    await expect(matrix.locator(`[title="${roleDisplayFor("viewer", runId).displayName}"]`).first()).toBeVisible()
    await recordSettled(page, measure, "role list, the matrix tab")
  })

  test("editing a run role shows marks, summary and saves with a note", async ({ page, measure, e2eDevice }, testInfo) => {
    test.skip(e2eDevice === "phone", DESKTOP_ONLY)
    const role = projectRole(testInfo, "audit", "บทบาทตรวจนับทดสอบ")
    const roleId = await createRoleOnForm(page, measure, role)

    await open(page, measure, `${ROLES}/${roleId}/edit`, fillTemplate(W.editTitle, { name: role.displayNameTh }), "role form, edit")
    await openAllGroups(page)
    await auditCell(page, "create").check()
    await auditCell(page, "approve").check()

    // Both cells are named as added and carry the "+" mark.
    for (const action of ["create", "approve"] as const) {
      const cell = page.getByRole("checkbox", { name: fillTemplate(W.cellAdded, { action: W.actions[action], module: W.moduleAudit }), exact: true })
      await expect(cell).toBeChecked()
      await expect(page.locator("#role-permission-matrix label").filter({ has: cell })).toContainText("+")
    }

    // The summary: 0 → 2 with one line per added permission, then the audit segregation warning.
    await expect(page.getByRole("heading", { name: fillTemplate(W.summaryTitle, { before: 0, after: 2 }), exact: true })).toBeVisible()
    for (const action of ["create", "approve"] as const) {
      await expect(page.getByText(fillTemplate(W.summaryAdd, { action: W.actions[action], module: W.moduleAudit }), { exact: true })).toBeVisible()
    }
    await expect(page.getByText(W.sodTitle, { exact: true })).toBeVisible()
    await expect(page.getByText(W.sodAudit, { exact: true })).toBeVisible()
    await recordSettled(page, measure, "role form, audit create and approve ticked")

    // Save with a note; the form returns to the list.
    await page.getByLabel(W.noteOptional, { exact: true }).filter({ visible: true }).fill("E2E เพิ่มสิทธิ์ตรวจนับ เพิ่ม + อนุมัติ")
    const saved = page.waitForResponse((response) => response.request().method() === "PUT" && new URL(response.url()).pathname === `/api/admin/roles/${roleId}`)
    await page.locator('[data-slot="sticky-form-footer"]').getByRole("button", { name: W.save, exact: true }).click()
    const response = await saved
    expect(response.status(), `PUT /api/admin/roles/${roleId}: ${(await response.text()).slice(0, 300)}`).toBe(200)
    await page.waitForURL((url) => url.pathname === ROLES)

    // The list: the role now holds 2 permissions of the total.
    await expect(page.getByRole("heading", { level: 1, name: W.title, exact: true })).toBeVisible()
    await search(page, role.key)
    const row = roleRow(page, role.key)
    await expect(row).toHaveCount(1)
    const permissionCount = templatePattern(W.permissionsOf, { count: "2", total: "[\\d,]+" })
    await expect(row.locator("span.num").filter({ hasText: new RegExp(`^${permissionCount.source}$`) })).toHaveCount(1)
    await recordSettled(page, measure, "role list, the audit role saved")
  })

  test("people in the role and bulk add", async ({ page, measure, e2eDevice }, testInfo) => {
    test.skip(e2eDevice === "phone", DESKTOP_ONLY)
    const { users } = readRunData()
    const viewer = users.viewer
    const employee = users.employee
    if (!viewer || !employee) throw new Error("the run has no viewer or employee user: the setup did not finish")
    // A role with no permission (controller ruling on Task 5): the two shared run users gain nothing.
    const role = projectRole(testInfo, "people", "บทบาทไม่มีสิทธิ์สำหรับเพิ่มผู้ใช้")
    const roleId = await createRoleOnForm(page, measure, role)

    await open(page, measure, `${ROLES}/${roleId}/edit`, fillTemplate(W.editTitle, { name: role.displayNameTh }), "role form, people role")
    const people = page.locator("#role-people")
    await expect(people.getByText(W.peopleEmpty, { exact: true })).toBeVisible()

    // The add dialog: search each run user's login name and tick it; the ticks stay while the search changes.
    await people.getByRole("button", { name: W.addUsers, exact: true }).click()
    const dialog = page.getByRole("dialog", { name: W.addUsers, exact: true })
    await expect(dialog).toBeVisible()
    const searchBox = dialog.getByRole("searchbox", { name: W.addUsersSearch, exact: true }).or(dialog.getByRole("textbox", { name: W.addUsersSearch, exact: true }))
    for (const user of [viewer, employee]) {
      await searchBox.fill(user.username)
      const pick = dialog.getByRole("checkbox", { name: new RegExp(escapeRegExp(user.username)) })
      await expect(pick).toHaveCount(1)
      await pick.check()
      await expect(pick).toBeChecked()
    }
    await expect(dialog.getByText(fillTemplate(W.addUsersPicked, { count: 2 }), { exact: true })).toBeVisible()
    await dialog.getByLabel(W.noteOptional, { exact: true }).fill("E2E เพิ่มผู้ใช้ทดสอบเข้าบทบาทไม่มีสิทธิ์")
    await recordSettled(page, measure, "role form, add users dialog")

    const answered = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === `/api/admin/roles/${roleId}/users`)
    await dialog.getByRole("button", { name: fillTemplate(W.addUsersConfirm, { count: 2 }), exact: true }).click()
    const response = await answered
    expect(response.status(), `POST /api/admin/roles/${roleId}/users: ${(await response.text()).slice(0, 300)}`).toBe(200)
    const result = (await response.json()) as { added: string[]; refused: unknown[] }
    expect(result.refused, "no run user is refused").toEqual([])
    expect([...result.added].sort()).toEqual([viewer.userId, employee.userId].sort())
    await expect(dialog.getByText(fillTemplate(W.addUsersDone, { count: 2 }), { exact: true })).toBeVisible()
    await recordSettled(page, measure, "role form, add users done")
    await page.keyboard.press("Escape")
    await expect(dialog).toHaveCount(0)

    // The people list (after the page's refresh) shows both login names.
    for (const user of [viewer, employee]) await expect(people.locator("span.tag", { hasText: new RegExp(`^${escapeRegExp(user.username)}$`) })).toBeVisible()

    // ดูทั้งหมด opens the user list with role=<id>, which lists both.
    await people.getByRole("link", { name: W.peopleAll }).click()
    await page.waitForURL((url) => url.pathname === "/th/admin/users" && url.searchParams.get("role") === roleId)
    await expect(page.getByRole("heading", { level: 1, name: W.usersTitle, exact: true })).toBeVisible()
    const rows = page.locator("tbody tr[aria-label]").filter({ visible: true })
    for (const user of [viewer, employee]) await expect(rows.filter({ hasText: user.username })).toHaveCount(1)
    await recordSettled(page, measure, "user list, the people role")
  })
})

test.describe("the roles pages on the phone (group 11 plan 3)", () => {
  test("the role list and editor fit the phone", async ({ page, measure, e2eDevice }) => {
    test.skip(e2eDevice !== "phone", PHONE_ONLY)
    const { runId } = readRunState()
    const viewer = readRunData().users.viewer
    if (!viewer) throw new Error("the run has no viewer role: the setup did not finish")

    await open(page, measure, ROLES, W.title, "role list (phone)")
    const listFits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    expect(listFits, "the list does not scroll sideways").toBe(true)

    // The run viewer role's editor, opened only: nothing is ticked or saved.
    await open(page, measure, `${ROLES}/${viewer.roleId}/edit`, fillTemplate(W.editTitle, { name: roleDisplayFor("viewer", runId).displayNameTh }), "role form, edit (phone)")
    const layout = await page.evaluate(() => {
      const box = document.querySelector('#role-permission-matrix [data-slot="data-table-scroll"]')
      const main = document.querySelector("main")
      return {
        page: document.documentElement.scrollWidth <= window.innerWidth && (!main || main.scrollWidth <= main.clientWidth),
        box: box ? box.scrollWidth > box.clientWidth && getComputedStyle(box).overflowX !== "visible" : null,
      }
    })
    expect(layout.page, "the editor page does not scroll sideways").toBe(true)
    expect(layout.box, "the matrix scrolls sideways inside its own box").toBe(true)
    await expect(page.locator('[data-slot="sticky-form-footer"]').getByRole("button", { name: W.save, exact: true })).toBeInViewport()
  })
})
