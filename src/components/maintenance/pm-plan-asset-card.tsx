import { useTranslations } from "next-intl"
import { Lock } from "lucide-react"
import { AssetThumbnail } from "@/components/assets/asset-thumbnail"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { getAssetStateTone } from "@/lib/design-system"
import type { RepairAssetFacts } from "@/lib/repair-record-outlook"

// The asset of a PM plan (MT-PM-Form section 1, group 5 spec §10, G5P4-R9), from the same facts as บันทึกซ่อม's card
// (RepairAssetFacts): the register photo or its empty frame, the name, the tag, the status badge and "<room> · <branch>".
// On edit the asset is fixed: "แก้ไขไม่ได้" with the lock, and no "เปลี่ยน". On create "เปลี่ยน" shows when the caller
// passes onChange and brings the picker back. No eligibility line: only a written-off asset is refused (decision 10.4),
// and its status badge already says so. State colour stays in the badge; the lock is muted.
export function PmPlanAssetCard({ facts, locked, onChange }: {
  facts: RepairAssetFacts
  locked: boolean
  onChange?: () => void
}) {
  const t = useTranslations("maintenancePage")
  const tRecord = useTranslations("repairRecord")
  const where = [facts.roomName, facts.branchName].filter((part): part is string => Boolean(part))

  return (
    <div data-pm-asset-card data-locked={locked || undefined} className="flex min-w-0 items-start gap-3 rounded-md border border-border bg-background p-3">
      <AssetThumbnail photo={facts.photo} assetTag={facts.assetTag} assetName={facts.name} size={44} />
      <div className="grid min-w-0 flex-1 gap-1">
        <p className="grid min-w-0 gap-1">
          <span className="min-w-0 break-words font-medium text-foreground">{facts.name}</span>
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="tag">{facts.assetTag}</span>
            <StatusBadge label={facts.statusLabel} tone={getAssetStateTone(facts.statusName)} />
          </span>
        </p>
        {where.length > 0 ? <p className="min-w-0 break-words text-meta text-muted-foreground">{where.join(" · ")}</p> : null}
      </div>
      {locked ? (
        <span className="flex shrink-0 items-center gap-1.5 text-meta text-muted-foreground">
          <Lock aria-hidden="true" className="size-3.5" />
          {t("pmFormLocked")}
        </span>
      ) : null}
      {onChange && !locked ? (
        <Button variant="outline" size="sm" onClick={onChange}>
          {tRecord("createForm.change")}
        </Button>
      ) : null}
    </div>
  )
}
