// Page group 11 plan 2 Task 5 (plan docs/superpowers/plans/2026-11-08-group11-user-form.md; spec
// docs/superpowers/specs/2026-11-08-page-group-11-users-roles-design.md §5, board US-User-Edit): the create and edit
// user form (/th/admin/users/new, /th/admin/users/[id]/edit), as the seed admin. No run role holds user:create or
// user:edit, so the pages open with the seed admin's saved session (ADMIN_STATE_FILE), as e2e/admin/users-list.spec.ts.
// Desktop (desktop-light, desktop-dark), in order (serial: the edit test opens the account the create test made):
// - An AD account from a run-marked employee (code <run>-<project>-UF, with an email): AD is the default and there is
//   no password field; picking the employee fills the display name and email and suggests the username; the run
//   viewer role shows "+" in the access preview; a note and save; the list finds the account with the role.
// - The same account: the run employee role is added and saved (the list shows both roles), then อื่น ๆ closes it with
//   a note (the header reads ไม่ใช้งาน) and reopens it (ใช้งาน). Each project has its own employee and account, so
//   desktop-light and desktop-dark never touch the same record.
// Phone (phone-light, phone-dark):
// - The run viewer's edit page: no sideways scroll, the footer's บันทึก on screen, and the อื่น ๆ menu opens (Escape
//   closes it; nothing is chosen, nothing saved).
// Writes: POST /api/employees through the API, once per desktop project; then through the page POST /api/admin/users,
// PUT /api/admin/users/[id] and PATCH /api/admin/users/[id]/status twice, all as the seed admin. Nothing is deleted; no
// settings, LDAP or sign-in request (an AD account is stored with no password; the server makes no AD call). axe
// through recordSettled on every page and dialog.
import type { Page } from "../shell/shell-steps.ts"
import { fillTemplate } from "../shell/shell-words.ts"
import { expect, test } from "../support/fixtures.ts"
import type { Measure } from "../support/measure.ts"
import { ADMIN_STATE_FILE, fromRoot } from "../support/paths.ts"
import { runSuffix } from "../support/env-guard.ts"
import { roleDisplayFor } from "../support/run-plan.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { recordSettled } from "../audit/settle.ts"
import { seedAdminApi } from "../disposal/disposal-support.ts"
import { projectCode, txAssetName } from "../transactions/tx-plan.ts"
import { USERS_WORDS as L, USER_FORM_WORDS as W } from "./users-words.ts"

// The seed admin's saved session (written by the global setup), in place of a run user: the form needs user:create/edit.
test.use({ storageState: fromRoot(ADMIN_STATE_FILE) })

const USERS = "/th/admin/users"
const DESKTOP_ONLY = "the create and edit workflow runs on the desktop; the phone test checks the layout"
const PHONE_ONLY = "the layout check is the phone's; the desktop tests run the workflow"

// The project's form account: its employee (code E2E-1108A-DL-UF) and the username the form suggests from the email.
function formAccount(projectName: string) {
  const { runId } = readRunState()
  const code = projectCode(projectName)
  const username = `e2e.form-${code.toLowerCase()}-${runSuffix(runId)}`
  return {
    code: `${runId}-${code}-UF`,
    fullNameTh: txAssetName(runId, projectName, "พนักงานมีบัญชี AD"),
    email: `${username}@example.com`,
    username,
  }
}

const roleLabel = (key: "viewer" | "employee") => roleDisplayFor(key, readRunState().runId).displayNameTh

// The page as a person opens it: navigate, wait for its heading, and run axe once it has settled.
async function open(page: Page, measure: Measure, path: string, heading: string, label: string) {
  await page.goto(path, { waitUntil: "load" })
  await expect(page.getByRole("heading", { level: 1, name: heading, exact: true })).toBeVisible()
  await recordSettled(page, measure, label)
}

// The list's visible search: type the words and press ค้นหา, then the one row of that username.
async function listRow(page: Page, measure: Measure, username: string) {
  await expect(page.getByRole("heading", { level: 1, name: L.title, exact: true })).toBeVisible()
  const form = page.getByRole("search").filter({ visible: true })
  await form.getByRole("searchbox", { name: L.search, exact: true }).fill(username)
  await form.getByRole("button", { name: L.search, exact: true }).click()
  await page.waitForURL((url) => url.pathname === USERS && url.searchParams.get("search") === username)
  await recordSettled(page, measure, "user list, the form account")
  const row = page.locator("tbody tr[aria-label]").filter({ visible: true }).filter({ hasText: username })
  await expect(row).toHaveCount(1)
  return row
}

// Tick a role: search its label (the list is long on the dev data), then the checkbox named by it.
async function tickRole(page: Page, label: string) {
  await page.getByRole("searchbox", { name: W.roleSearch, exact: true }).or(page.getByRole("textbox", { name: W.roleSearch, exact: true })).fill(label)
  const role = page.getByRole("checkbox", { name: label, exact: true })
  await expect(role).toHaveCount(1)
  await role.check()
  await expect(role).toBeChecked()
}

// Save the form and wait for the request's answer, then the list it returns to.
async function save(page: Page, verb: "POST" | "PUT", path: string | RegExp) {
  const answered = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return response.request().method() === verb && (typeof path === "string" ? url.pathname === path : path.test(url.pathname))
  })
  await page.locator('[data-slot="sticky-form-footer"]').getByRole("button", { name: W.save, exact: true }).click()
  const response = await answered
  expect(response.status(), `${verb} ${new URL(response.url()).pathname}: ${(await response.text()).slice(0, 300)}`).toBe(verb === "POST" ? 201 : 200)
  await page.waitForURL((url) => url.pathname === USERS)
  return response
}

// The project's account id, read with the user API (a GET) so the edit test does not depend on module state.
async function accountId(username: string): Promise<string> {
  const admin = await seedAdminApi()
  try {
    const response = await admin.get("/api/admin/users")
    expect(response.status(), "GET /api/admin/users").toBe(200)
    const found = ((await response.json()) as { data: { id: string; username: string }[] }).data.find((user) => user.username === username)
    if (!found) throw new Error(`no account ${username}: the create test did not finish`)
    return found.id
  } finally {
    await admin.dispose()
  }
}

// The status badge in the edit header.
const headerStatus = (page: Page) => page.locator('[data-slot="page-header-meta"] [data-slot="status-badge"]').filter({ visible: true })

// อื่น ๆ → close or reopen → the dialog that names the account → confirm; the PATCH answers 200 and the header follows.
async function changeStatus(page: Page, measure: Measure, userId: string, displayName: string, closing: boolean) {
  const item = closing ? W.closeAccount : W.reopenAccount
  await page.getByRole("button", { name: W.more, exact: true }).filter({ visible: true }).click()
  await page.getByRole("menuitem", { name: item, exact: true }).click()
  const dialog = page.getByRole("dialog", { name: fillTemplate(closing ? W.closeTitle : W.reopenTitle, { name: displayName }), exact: true })
  await expect(dialog).toBeVisible()
  await recordSettled(page, measure, closing ? "user form, close dialog" : "user form, reopen dialog")
  if (closing) await dialog.getByLabel(W.note, { exact: true }).fill("E2E ปิดบัญชีทดสอบ")
  const answered = page.waitForResponse((response) => response.request().method() === "PATCH" && new URL(response.url()).pathname === `/api/admin/users/${userId}/status`)
  await dialog.getByRole("button", { name: item, exact: true }).click()
  const response = await answered
  expect(response.status(), `PATCH status: ${(await response.text()).slice(0, 300)}`).toBe(200)
  await expect(dialog).toHaveCount(0)
  await expect(headerStatus(page)).toHaveText(closing ? W.inactive : W.active)
}

test.describe("the user form as the seed admin (group 11 plan 2)", () => {
  test.describe.configure({ mode: "serial" })

  test("an AD account is created from an employee with roles ready", async ({ page, measure, e2eDevice }, testInfo) => {
    test.skip(e2eDevice === "phone", DESKTOP_ONLY)
    const run = readRunData()
    const { runId } = readRunState()
    const account = formAccount(testInfo.project.name)
    const code = projectCode(testInfo.project.name)

    // The project's run employee, active, with an email (employeeSchema's whole body), as the seed admin.
    const admin = await seedAdminApi()
    try {
      const created = await admin.post("/api/employees", {
        data: {
          code: `${runId}-${code}-UF`,
          fullNameTh: account.fullNameTh,
          fullNameEn: null,
          email: account.email,
          companyId: run.companyId,
          branchId: run.branchId,
          departmentId: run.departmentId,
          position: null,
          employmentStatus: "active",
          managerId: null,
          isActive: true,
        },
      })
      expect(created.status(), `POST /api/employees ${account.code}: ${(await created.text()).slice(0, 300)}`).toBe(201)
    } finally {
      await admin.dispose()
    }

    await open(page, measure, `${USERS}/new`, W.createTitle, "user form, create")

    // AD is the default, and an AD account has no password field.
    await expect(page.getByRole("radio", { name: W.authAd, exact: true })).toBeChecked()
    await expect(page.locator("#admin-user-password")).toHaveCount(0)

    // The employee picker: search the code, choose the name; the empty fields fill and the username is suggested.
    await page.locator("#admin-user-employee").click()
    await page.getByRole("combobox", { name: W.employeeSearch, exact: true }).fill(account.code)
    await page.getByRole("option", { name: account.fullNameTh, exact: true }).click()
    await expect(page.locator("#admin-user-display-name")).toHaveValue(account.fullNameTh)
    await expect(page.locator("#admin-user-email")).toHaveValue(account.email)
    await expect(page.locator("#admin-user-username")).toHaveValue(account.username)
    await expect(page.getByText(W.usernameSuggested, { exact: true })).toBeVisible()

    // The run viewer role: the preview shows what it adds with "+".
    const preview = page.getByRole("table", { name: W.previewTitle, exact: true }).filter({ visible: true })
    await expect(preview.getByText(/^\+/)).toHaveCount(0)
    await tickRole(page, roleLabel("viewer"))
    await expect(preview.getByText(/^\+/).first()).toBeVisible()
    await recordSettled(page, measure, "user form, create filled")

    await page.locator("#admin-user-note").fill("E2E สร้างบัญชี AD จากพนักงาน")
    await save(page, "POST", "/api/admin/users")

    const row = await listRow(page, measure, account.username)
    await expect(row).toContainText(roleLabel("viewer"))
  })

  test("edit adds a role, then the account is closed and reopened", async ({ page, measure, e2eDevice }, testInfo) => {
    test.skip(e2eDevice === "phone", DESKTOP_ONLY)
    const account = formAccount(testInfo.project.name)
    const userId = await accountId(account.username)
    const editPath = `${USERS}/${userId}/edit`
    const editHeading = `${W.editTitle} · ${account.fullNameTh}`

    await open(page, measure, editPath, editHeading, "user form, edit")
    await expect(headerStatus(page)).toHaveText(W.active)
    await tickRole(page, roleLabel("employee"))
    await save(page, "PUT", `/api/admin/users/${userId}`)
    const row = await listRow(page, measure, account.username)
    await expect(row).toContainText(roleLabel("viewer"))
    await expect(row).toContainText(roleLabel("employee"))

    await open(page, measure, editPath, editHeading, "user form, edit again")
    await changeStatus(page, measure, userId, account.fullNameTh, true)
    await changeStatus(page, measure, userId, account.fullNameTh, false)
  })
})

test.describe("the user form on the phone (group 11 plan 2)", () => {
  test("the form fits the phone", async ({ page, measure, e2eDevice }) => {
    test.skip(e2eDevice !== "phone", PHONE_ONLY)
    const viewer = readRunData().users.viewer
    if (!viewer?.userId) throw new Error("the run has no viewer user: the setup did not finish")

    await open(page, measure, `${USERS}/${viewer.userId}/edit`, `${W.editTitle} · ${viewer.displayName}`, "user form, edit (phone)")
    const fits = await page.evaluate(() => {
      const main = document.querySelector("main")
      return document.documentElement.scrollWidth <= window.innerWidth && (!main || main.scrollWidth <= main.clientWidth)
    })
    expect(fits, "the page does not scroll sideways").toBe(true)

    await expect(page.locator('[data-slot="sticky-form-footer"]').getByRole("button", { name: W.save, exact: true })).toBeInViewport()

    const more = page.getByRole("button", { name: W.more, exact: true }).filter({ visible: true })
    await more.click()
    await expect(page.getByRole("menuitem", { name: W.closeAccount, exact: true })).toBeVisible()
    await recordSettled(page, measure, "user form, อื่น ๆ open (phone)")
    await page.keyboard.press("Escape")
    await expect(page.getByRole("menuitem", { name: W.closeAccount, exact: true })).toHaveCount(0)
  })
})
