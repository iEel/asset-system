export const PERMISSION_ACTION_ORDER = ["view", "create", "edit", "export", "approve", "delete"] as const

export type PermissionGroupKey = "assets" | "transactions" | "operations" | "masterData" | "system"

export const PERMISSION_GROUPS: readonly { key: PermissionGroupKey; modules: readonly string[] }[] = [
  { key: "assets", modules: ["dashboard", "asset"] },
  { key: "transactions", modules: ["checkout", "checkin", "transfer"] },
  { key: "operations", modules: ["audit", "maintenance", "disposal", "report"] },
  {
    key: "masterData",
    modules: ["company", "branch", "department", "employee", "location", "category", "brand", "supplier", "status", "condition"],
  },
  { key: "system", modules: ["user", "role", "setting", "import", "export", "log"] },
]

export const HIGH_RISK_ACTIONS: readonly string[] = ["delete", "approve", "export"]

export function permissionGroupOf(module: string): PermissionGroupKey | null {
  return PERMISSION_GROUPS.find((group) => group.modules.includes(module))?.key ?? null
}
