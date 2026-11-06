import type { ReactNode } from "react"
import type { RowActionItem } from "@/components/ui/row-actions"

export type DeactivateMenuItemInput = {
  label: string
  // The caller's <module>:delete permission (G7F-R2): without it there is no item at all.
  canDeactivate: boolean
  // Why the record cannot be deactivated now, already worded (held assets, subordinates, …); null or "" when nothing blocks.
  blocked: string | null
  onSelect: () => void
  key?: string
  icon?: ReactNode
}

// G7F-R2: "ปิดใช้งาน" in a row's ⋯. Hidden without the delete permission; while something blocks it, RowActions'
// unavailable item that reads the reason (pressing it does nothing); otherwise a destructive action whose onSelect opens
// the caller's confirm, as LocationDeactivateButton does. The server still checks, so a blocker that appears meanwhile
// still refuses. Plain data, so a client list builds its groups with it.
export function deactivateMenuItem({ label, canDeactivate, blocked, onSelect, key = "deactivate", icon }: DeactivateMenuItemInput): RowActionItem | null {
  if (!canDeactivate) return null
  if (blocked) return { kind: "unavailable", key, label, reason: blocked, icon }
  return { kind: "action", key, label, onSelect, icon, destructive: true }
}
