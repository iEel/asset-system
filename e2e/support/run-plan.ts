// What the setup step creates once per run (spec §7), as plain data: the E2E department, location and employees, the
// four E2E roles with exactly the permissions of the spec's table, and the four users. Every code, name and username
// carries the run id, so repeat runs never collide on a unique value and a person sees the marker in any list.
// tests/e2e-setup.test.ts pins it; e2e/setup/run-data.setup.ts creates it through the app as the seed admin.
import { runSuffix } from "./env-guard.ts"

export type E2eUserKey = "itStaff" | "itHead" | "viewer" | "employee"

// Spec §7, the users table. IT staff: no approve; the IT head: the IT staff set plus audit and disposal approve and the
// audit, maintenance and disposal exports (decision DX6 (ก)); the viewer: view only, on the modules the IT staff work
// in; the employee: no permission (lands on My Assets).
const IT_STAFF_PERMISSIONS = [
  "asset:view", "asset:create", "asset:edit",
  "audit:view", "audit:create", "audit:edit",
  "maintenance:view", "maintenance:create", "maintenance:edit",
  "disposal:view", "disposal:create", "disposal:edit",
  "report:view", "report:export",
] as const

export const E2E_ROLE_PERMISSIONS: Record<E2eUserKey, readonly string[]> = {
  itStaff: IT_STAFF_PERMISSIONS,
  itHead: [...IT_STAFF_PERMISSIONS, "audit:approve", "disposal:approve", "audit:export", "maintenance:export", "disposal:export"],
  viewer: ["asset:view", "audit:view", "maintenance:view", "disposal:view", "report:view"],
  employee: [],
}

type UserPlan = {
  slug: string
  linked: boolean
  roleTh: string
  roleEn: string
  // Where "/th" sends the user (src/lib/default-home.ts): the work dashboard, or My Assets for an employee with no
  // overview permission.
  landingPath: string
}

export const E2E_USER_PLANS: Record<E2eUserKey, UserPlan> = {
  itStaff: { slug: "it-staff", linked: true, roleTh: "เจ้าหน้าที่ IT", roleEn: "IT staff", landingPath: "/th/dashboard" },
  itHead: { slug: "it-head", linked: true, roleTh: "หัวหน้า IT", roleEn: "IT head", landingPath: "/th/dashboard" },
  // Unlinked, as spec §7 says (finding A1 fixed by decision DX1: users_employeeId_key ignores NULL).
  viewer: { slug: "viewer", linked: false, roleTh: "ผู้ดูอย่างเดียว", roleEn: "Viewer", landingPath: "/th/dashboard" },
  employee: { slug: "employee", linked: true, roleTh: "พนักงาน", roleEn: "Employee", landingPath: "/th/my-assets" },
}

export const E2E_USER_KEYS = Object.keys(E2E_USER_PLANS) as E2eUserKey[]

// e2e.it-staff-1019a (spec §7: e2e.it-staff-<run>).
export function usernameFor(key: E2eUserKey, runId: string): string {
  return `e2e.${E2E_USER_PLANS[key].slug}-${runSuffix(runId)}`
}

// A role key takes a-z, 0-9 and _ only (src/lib/validations/admin-role.ts): e2e_it_staff_1019a.
export function roleNameFor(key: E2eUserKey, runId: string): string {
  return `e2e_${E2E_USER_PLANS[key].slug.replaceAll("-", "_")}_${runSuffix(runId)}`
}

export function roleDisplayFor(key: E2eUserKey, runId: string) {
  const plan = E2E_USER_PLANS[key]
  return { displayName: `${runId} ${plan.roleEn}`, displayNameTh: `${runId} ${plan.roleTh}` }
}

export type EmployeePlan = { key: string; code: string; fullNameTh: string; fullNameEn: string; userKey?: E2eUserKey }

// The department, the location (a room) and the employees: one for each linked user, and two receivers for the
// handovers. Codes stay within the schemas' limits (department and employee 20, location 50).
export function runRecords(runId: string) {
  const employees: EmployeePlan[] = [
    ...E2E_USER_KEYS.filter((key) => E2E_USER_PLANS[key].linked).map((key, index) => ({
      key,
      code: `${runId}-E${index + 1}`,
      fullNameTh: `${runId} ${E2E_USER_PLANS[key].roleTh}`,
      fullNameEn: `${runId} ${E2E_USER_PLANS[key].roleEn}`,
      userKey: key,
    })),
    { key: "receiver1", code: `${runId}-R1`, fullNameTh: `${runId} ผู้รับมอบ 1`, fullNameEn: `${runId} Receiver 1` },
    { key: "receiver2", code: `${runId}-R2`, fullNameTh: `${runId} ผู้รับมอบ 2`, fullNameEn: `${runId} Receiver 2` },
  ]
  return {
    department: { code: `${runId}-D`, name: `${runId} แผนกทดสอบ E2E` },
    location: { code: `${runId}-L`, name: `${runId} ห้องทดสอบ E2E`, locationType: "Room" as const },
    employees,
  }
}

// A generated password: 24 random characters from the bytes given, plus one of each class; never printed.
export function passwordFrom(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
  if (bytes.length < 24) throw new Error("passwordFrom needs 24 random bytes")
  const body = Array.from(bytes.slice(0, 24), (byte) => alphabet[byte % alphabet.length]).join("")
  return `${body}Aa9-`
}
