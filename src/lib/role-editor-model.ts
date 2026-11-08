import { PERMISSION_ACTION_ORDER, PERMISSION_GROUPS, type PermissionGroupKey } from "./permission-groups.ts"

// Page group 11 plan 3 task 1: the pure model behind the role editor (change marks, group summaries, column
// checkboxes, bulk set with locked keys, and the create+approve segregation warnings). Keys are "module:action".

export function permissionMarks(
  initial: ReadonlySet<string>,
  current: ReadonlySet<string>
): { added: string[]; removed: string[] } {
  return {
    added: [...current].filter((key) => !initial.has(key)).sort(),
    removed: [...initial].filter((key) => !current.has(key)).sort(),
  }
}

/** modules = modules in the group; total = modules × 6 actions; byAction counts every action, 0 included. */
export function groupSummary(
  current: ReadonlySet<string>,
  group: PermissionGroupKey
): { modules: number; selected: number; total: number; byAction: Record<string, number> } {
  const modules = PERMISSION_GROUPS.find((entry) => entry.key === group)?.modules ?? []
  const byAction: Record<string, number> = {}
  let selected = 0
  for (const action of PERMISSION_ACTION_ORDER) {
    const count = modules.filter((module) => current.has(`${module}:${action}`)).length
    byAction[action] = count
    selected += count
  }
  return { modules: modules.length, selected, total: modules.length * PERMISSION_ACTION_ORDER.length, byAction }
}

export function columnState(current: ReadonlySet<string>, action: string, modules: readonly string[]): "all" | "some" | "none" {
  const held = modules.filter((module) => current.has(`${module}:${action}`)).length
  if (held === 0) return "none"
  return held === modules.length ? "all" : "some"
}

/** Turns keys on or off in a new set; locked keys keep their state. */
export function setMany(
  current: ReadonlySet<string>,
  keys: readonly string[],
  on: boolean,
  locked: (key: string) => boolean
): Set<string> {
  const next = new Set(current)
  for (const key of keys) {
    if (locked(key)) continue
    if (on) next.add(key)
    else next.delete(key)
  }
  return next
}

// settingOn only for disposal (the disposal segregation setting); null for audit, where it is always enforced.
export type SegregationWarning = { module: "disposal" | "audit"; settingOn: boolean | null }

export function segregationWarnings(current: ReadonlySet<string>, disposalSegregationOn: boolean): SegregationWarning[] {
  const holdsBoth = (module: string) => current.has(`${module}:create`) && current.has(`${module}:approve`)
  const warnings: SegregationWarning[] = []
  if (holdsBoth("disposal")) warnings.push({ module: "disposal", settingOn: disposalSegregationOn })
  if (holdsBoth("audit")) warnings.push({ module: "audit", settingOn: null })
  return warnings
}
