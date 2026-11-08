import {
  HIGH_RISK_ACTIONS,
  PERMISSION_ACTION_ORDER,
  PERMISSION_GROUPS,
  type PermissionGroupKey,
} from "./permission-groups.ts"

// Page group 11 plan 2 task 3: the pure model behind the create/edit user form (role change marks, the before→after
// access preview, grant locks and the auto-fill from an employee). The queries are in admin-user-form-data.ts.

export type FormRole = {
  id: string
  name: string
  // displayNameTh || displayName
  label: string
  isSystem: boolean
  isActive: boolean
  permissionKeys: string[]
  lockReason: "systemAdminOnly" | "missingPermissions" | null
}

export function roleChangeMarks(
  initialIds: readonly string[],
  currentIds: readonly string[]
): { added: string[]; removed: string[] } {
  const initial = new Set(initialIds)
  const current = new Set(currentIds)
  return {
    added: [...current].filter((id) => !initial.has(id)),
    removed: [...initial].filter((id) => !current.has(id)),
  }
}

// One row per permission group; the arrays are action names in PERMISSION_ACTION_ORDER. An action is present in a
// group when any module of the group has it.
export type AccessGroupRow = {
  group: PermissionGroupKey
  before: string[]
  after: string[]
  gained: string[]
  lost: string[]
}

function splitKey(key: string): { module: string; action: string } {
  const index = key.indexOf(":")
  return index < 0 ? { module: key, action: "" } : { module: key.slice(0, index), action: key.slice(index + 1) }
}

// Distinct permission keys granted by the active roles among the ids. An inactive role grants nothing.
function activeKeys(rolesById: ReadonlyMap<string, FormRole>, ids: readonly string[]): Set<string> {
  const keys = new Set<string>()
  for (const id of ids) {
    const role = rolesById.get(id)
    if (!role || !role.isActive) continue
    for (const key of role.permissionKeys) keys.add(key)
  }
  return keys
}

function groupActions(keys: ReadonlySet<string>, modules: readonly string[]): string[] {
  const present = new Set<string>()
  for (const key of keys) {
    const { module, action } = splitKey(key)
    if (modules.includes(module)) present.add(action)
  }
  return orderActions(present)
}

function orderActions(actions: ReadonlySet<string>): string[] {
  const ordered: string[] = PERMISSION_ACTION_ORDER.filter((action) => actions.has(action))
  const extra = [...actions].filter((action) => !(PERMISSION_ACTION_ORDER as readonly string[]).includes(action)).sort()
  return [...ordered, ...extra]
}

// Group order, then module order within the group, then action order; keys outside every group last, sorted.
function keyRank(key: string): [number, number, number, string] {
  const { module, action } = splitKey(key)
  const groupIndex = PERMISSION_GROUPS.findIndex((group) => group.modules.includes(module))
  const moduleIndex = groupIndex < 0 ? 0 : PERMISSION_GROUPS[groupIndex].modules.indexOf(module)
  const actionIndex = (PERMISSION_ACTION_ORDER as readonly string[]).indexOf(action)
  return [
    groupIndex < 0 ? PERMISSION_GROUPS.length : groupIndex,
    moduleIndex,
    actionIndex < 0 ? PERMISSION_ACTION_ORDER.length : actionIndex,
    key,
  ]
}

function compareKeys(a: string, b: string): number {
  const ra = keyRank(a)
  const rb = keyRank(b)
  for (let index = 0; index < 3; index += 1) {
    const diff = (ra[index] as number) - (rb[index] as number)
    if (diff !== 0) return diff
  }
  return ra[3] < rb[3] ? -1 : ra[3] > rb[3] ? 1 : 0
}

export function accessPreview(
  roles: readonly FormRole[],
  beforeIds: readonly string[],
  afterIds: readonly string[]
): { beforeCount: number; afterCount: number; rows: AccessGroupRow[]; highRiskGained: string[]; coveredRemovals: string[] } {
  const rolesById = new Map(roles.map((role) => [role.id, role]))
  const beforeKeys = activeKeys(rolesById, beforeIds)
  const afterKeys = activeKeys(rolesById, afterIds)

  const rows: AccessGroupRow[] = PERMISSION_GROUPS.map((group) => {
    const before = groupActions(beforeKeys, group.modules)
    const after = groupActions(afterKeys, group.modules)
    return {
      group: group.key,
      before,
      after,
      gained: after.filter((action) => !before.includes(action)),
      lost: before.filter((action) => !after.includes(action)),
    }
  })

  const highRiskGained = [...afterKeys]
    .filter((key) => !beforeKeys.has(key) && HIGH_RISK_ACTIONS.includes(splitKey(key).action))
    .sort(compareKeys)

  // A removed role is covered when every permission it grants (none, if it is inactive) is still held after.
  const { removed } = roleChangeMarks(beforeIds, afterIds)
  const coveredRemovals = removed.flatMap((id) => {
    const role = rolesById.get(id)
    if (!role) return []
    const granted = role.isActive ? role.permissionKeys : []
    return granted.every((key) => afterKeys.has(key)) ? [role.label] : []
  })

  return { beforeCount: beforeKeys.size, afterCount: afterKeys.size, rows, highRiskGained, coveredRemovals }
}

// Only a system admin grants system_admin; anyone else grants a role only when they hold all of its permissions.
export function grantLockReason(
  role: { name: string; permissionKeys: string[] },
  actor: { roles: string[]; permissions: string[] }
): FormRole["lockReason"] {
  if (actor.roles.includes("system_admin")) return null
  if (role.name === "system_admin") return "systemAdminOnly"
  const held = new Set(actor.permissions)
  return role.permissionKeys.every((key) => held.has(key)) ? null : "missingPermissions"
}

// The part before "@", trimmed; null without "@" or when that part is empty.
export function suggestUsername(email: string | null | undefined): string | null {
  if (!email) return null
  const trimmed = email.trim()
  const at = trimmed.indexOf("@")
  if (at < 0) return null
  const local = trimmed.slice(0, at).trim()
  return local === "" ? null : local
}

// Fills the empty fields only: the display name from the employee's Thai name, the email from the employee's email,
// and the username from the (typed or filled) email.
export function fillFromEmployee(
  values: { displayName: string; email: string; username: string },
  employee: { fullNameTh: string; email: string | null }
): { displayName: string; email: string; username: string } {
  const displayName = values.displayName.trim() === "" ? employee.fullNameTh : values.displayName
  const email = values.email.trim() === "" ? (employee.email ?? values.email) : values.email
  const username = values.username.trim() === "" ? (suggestUsername(email) ?? values.username) : values.username
  return { displayName, email, username }
}
