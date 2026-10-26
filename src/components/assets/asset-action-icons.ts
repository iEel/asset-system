import { Archive, ArrowRightLeft, KeyRound, PackageCheck, Puzzle, RefreshCw, Undo2, Wrench, type LucideIcon } from "lucide-react"
import type { AssetActionKey } from "@/lib/asset-actions"

// One icon per action of the shared rule (src/lib/asset-actions.ts), for the register's rows and the asset page.
export const assetActionIcons: Record<AssetActionKey, LucideIcon> = {
  checkout: PackageCheck,
  checkin: Undo2,
  transfer: ArrowRightLeft,
  viewRepair: Wrench,
  recordRepair: Wrench,
  viewDisposal: Archive,
  manageComponents: Puzzle,
  bindLicense: KeyRound,
  renewLicense: RefreshCw,
}
