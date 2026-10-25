// The setup step (spec §7): once per run, through the app's own pages and APIs, signed in as the seed admin (the
// storage state the global setup saved). No direct SQL write, so the app's own rules apply. It creates the E2E
// department and location, the employees, the four roles with exactly the permissions of the spec (on the role
// form, which has no API to list permissions), the four users with generated passwords, and one storage state per user.
import { randomBytes } from "node:crypto"
import { mkdirSync } from "node:fs"
import path from "node:path"
import { expect, test as setup, type APIRequestContext, type Page } from "@playwright/test"
import { runSuffix } from "../support/env-guard.ts"
import { ADMIN_STATE_FILE, authStateFile, fromRoot } from "../support/paths.ts"
import {
  E2E_ROLE_PERMISSIONS,
  E2E_USER_KEYS,
  E2E_USER_PLANS,
  passwordFrom,
  roleDisplayFor,
  roleNameFor,
  runRecords,
  usernameFor,
  type E2eUserKey,
} from "../support/run-plan.ts"
import { signInOnce } from "../support/sign-in.ts"
import { readRunData, readRunState, writeRunData, type RunData, type RunUser } from "../support/state.ts"

setup.use({ storageState: fromRoot(ADMIN_STATE_FILE) })

// The role form's action labels (messages/th.json adminRolesPage.actions).
const ACTION_LABELS: Record<string, string> = { view: "ดู", create: "เพิ่ม", edit: "แก้ไข", delete: "ลบ", export: "ส่งออก", approve: "อนุมัติ" }

async function created<T>(request: APIRequestContext, url: string, data: unknown): Promise<T> {
  const response = await request.post(url, { data })
  if (response.status() !== 201) throw new Error(`POST ${url} answered ${response.status()}: ${(await response.text()).slice(0, 300)}`)
  return (await response.json()) as T
}

// One role on the role form, ticking exactly its permissions; the stored set is read back on the edit page.
async function createRole(page: Page, key: E2eUserKey, runId: string): Promise<{ id: string; name: string }> {
  const name = roleNameFor(key, runId)
  const display = roleDisplayFor(key, runId)
  await page.goto("/th/admin/roles/new")
  await page.locator("#role-key").fill(name)
  await page.locator("#role-display-name").fill(display.displayName)
  await page.locator("#role-display-name-th").fill(display.displayNameTh)
  for (const permission of E2E_ROLE_PERMISSIONS[key]) {
    const [moduleName, action] = permission.split(":")
    const row = page.locator("tr").filter({ has: page.locator("span.tag", { hasText: new RegExp(`^${moduleName}$`) }) })
    await row.getByRole("checkbox", { name: ACTION_LABELS[action], exact: true }).check()
  }
  const saved = page.waitForResponse((response) => response.url().endsWith("/api/admin/roles") && response.request().method() === "POST")
  await page.getByRole("button", { name: "บันทึกสิทธิ์" }).click()
  const response = await saved
  if (response.status() !== 201) throw new Error(`the role form's save of ${name} answered ${response.status()}: ${(await response.text()).slice(0, 300)}`)
  const role = (await response.json()) as { id: string; name: string }
  await page.waitForURL("**/th/admin/roles")

  // Read back: the edit page ticks exactly the stored permissions.
  await page.goto(`/th/admin/roles/${role.id}/edit`)
  await expect(page.locator("#role-key")).toHaveValue(name)
  const ticked: string[] = []
  for (const row of await page.locator("tbody tr").all()) {
    const moduleName = (await row.locator("span.tag").first().textContent())?.trim()
    for (const [action, label] of Object.entries(ACTION_LABELS)) {
      if (await row.getByRole("checkbox", { name: label, exact: true }).isChecked()) ticked.push(`${moduleName}:${action}`)
    }
  }
  expect(ticked.sort(), `the stored permissions of ${name}`).toEqual([...E2E_ROLE_PERMISSIONS[key]].sort())
  return role
}

setup("the run's department, location, employees, roles and users, and a session for each user", async ({ page, browser }) => {
  setup.setTimeout(300_000)
  const { runId, baseURL } = readRunState()
  const records = runRecords(runId)
  const request = page.request

  // The company and branch the E2E records sit in: the first active company with an asset tag code and a branch.
  const companies = (await (await request.get("/api/companies")).json()) as { id: string; code: string; assetTagCode: string | null }[]
  const branches = (await (await request.get("/api/branches")).json()) as { id: string; code: string; company: { id: string } }[]
  const company = companies
    .filter((candidate) => candidate.assetTagCode && branches.some((branch) => branch.company.id === candidate.id))
    .sort((left, right) => left.code.localeCompare(right.code))[0]
  if (!company) throw new Error("no active company with an asset tag code and a branch")
  const branch = branches.filter((candidate) => candidate.company.id === company.id).sort((left, right) => left.code.localeCompare(right.code))[0]

  // The department first: its code claims the run id (the global setup reads it to find the next one).
  const department = await created<{ id: string }>(request, "/api/departments", { ...records.department, companyId: company.id, isActive: true })
  const location = await created<{ id: string }>(request, "/api/locations", { ...records.location, branchId: branch.id, isActive: true })
  const employees: RunData["employees"] = {}
  for (const employee of records.employees) {
    const row = await created<{ id: string }>(request, "/api/employees", {
      code: employee.code,
      fullNameTh: employee.fullNameTh,
      fullNameEn: employee.fullNameEn,
      // The schema takes a missing email only when the key is there (the employee form sends "").
      email: null,
      companyId: company.id,
      branchId: branch.id,
      departmentId: department.id,
      employmentStatus: "active",
      isActive: true,
    })
    employees[employee.key] = { id: row.id, code: employee.code, fullNameTh: employee.fullNameTh }
  }

  const data: RunData = { companyId: company.id, branchId: branch.id, departmentId: department.id, locationId: location.id, employees, users: {} }
  for (const key of E2E_USER_KEYS) {
    const role = await createRole(page, key, runId)
    const plan = E2E_USER_PLANS[key]
    const user: RunUser = {
      key,
      username: usernameFor(key, runId),
      password: passwordFrom(randomBytes(24)),
      displayName: roleDisplayFor(key, runId).displayNameTh,
      employeeId: plan.linked ? employees[key].id : null,
      roleId: role.id,
      roleName: role.name,
      landingPath: plan.landingPath,
    }
    // Saved before the user exists, so a generated password is never lost.
    data.users[key] = user
    writeRunData(runId, data)
    const createdUser = await created<{ id: string }>(request, "/api/admin/users", {
      username: user.username,
      password: user.password,
      displayName: user.displayName,
      email: null,
      employeeId: user.employeeId,
      roleIds: [role.id],
      isActive: true,
    })
    user.userId = createdUser.id
    writeRunData(runId, data)
  }

  // One session per user: a sign-in with the password just set (never a failed one), then the storage state.
  for (const key of E2E_USER_KEYS) {
    const user = data.users[key]
    if (!user) throw new Error(`the ${key} user was not created`)
    // Signed out: the setup.use storage state would sign this context in as the seed admin, and the login sends a signed-in visitor on.
    const context = await browser.newContext({ baseURL, locale: "th-TH", timezoneId: "Asia/Bangkok", storageState: { cookies: [], origins: [] } })
    const userPage = await context.newPage()
    await signInOnce(userPage, user.username, user.password)
    await userPage.goto("/th")
    await expect(userPage).toHaveURL(new RegExp(`${user.landingPath}(?:[?#]|$)`))
    const file = fromRoot(authStateFile(runId, key))
    mkdirSync(path.dirname(file), { recursive: true })
    await context.storageState({ path: file })
    await context.close()
  }
})

// Finding A1, fixed by decision DX1: users_employeeId_key ignores NULL, so the seed admin and the unlinked viewer leave
// room for one more user with no employee link.
setup("a second user with no employee link can be created (finding A1)", async ({ page }) => {
  const { runId } = readRunState()
  const viewer = readRunData(runId).users.viewer
  if (!viewer) throw new Error("the run has no viewer role: the setup test did not finish")
  const response = await page.request.post("/api/admin/users", {
    data: {
      username: `e2e.unlinked-${runSuffix(runId)}`,
      password: passwordFrom(randomBytes(24)),
      displayName: `${runId} ไม่ผูกพนักงาน`,
      email: null,
      employeeId: null,
      roleIds: [viewer.roleId],
      isActive: true,
    },
  })
  expect(response.status(), "a user with no employee link is saved").toBe(201)
})
