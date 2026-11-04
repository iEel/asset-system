"use client"

import { useTranslations } from "next-intl"
import { CheckCircle2 } from "lucide-react"
import { AssetThumbnail } from "@/components/assets/asset-thumbnail"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { toneIcons } from "@/components/ui/tone-icons"
import { getAssetStateTone } from "@/lib/design-system"
import { disposalReadinessLine } from "@/lib/disposal-request-form-rules"
import type { DisposalReadinessBlocker } from "@/lib/disposal-readiness"

/** The `card` of GET /api/disposal-assets?id=, with the row's readiness. */
export type DisposalAssetCardData = {
  id: string
  name: string
  assetTag: string
  statusName: string
  statusNameTh: string
  locationName: string
  branchName: string
  custodianName: string | null
  photoAttachmentId: string | null
  eligible: boolean
  blockers: Array<DisposalReadinessBlocker | "lifecycle_status">
  outstandingComponentTags: string[]
}

// The chosen asset of ยื่นคำขอตัดจำหน่าย (group 6 spec §8.2), modelled on บันทึกซ่อม's card: the register photo or its
// empty frame, the name, the mono tag, the status badge, "อยู่ที่ {room} · {branch} · {holder}", "เปลี่ยน", and the
// readiness line under it. The line comes from the same blockers the server checks: an eligible asset has none, and a
// blocked one (it changed after the pick) names its blockers instead. fieldId keeps the form's stable hook: the card is
// the asset field (#<fieldId>) once chosen, and takes focus (tabIndex -1) when it replaces the picker.
export function DisposalAssetCard({ asset, onChange, fieldId }: { asset: DisposalAssetCardData; onChange: () => void; fieldId?: string }) {
  const t = useTranslations("disposalPage")
  const line = disposalReadinessLine({ eligible: asset.eligible, blockers: asset.blockers })
  const WarningIcon = toneIcons.warning
  // The route returns only an image the thumbnail route can serve (isThumbnailable), so its type is an image type.
  const photo = asset.photoAttachmentId ? { id: asset.photoAttachmentId, alt: asset.name, fileType: "image/jpeg" } : null
  const blockerText = asset.blockers
    .map((blocker) => t(`readinessBlockers.${blocker}`, { tags: asset.outstandingComponentTags.join(", ") }))
    .join(" · ")

  return (
    <div className="grid gap-2">
      <div id={fieldId} tabIndex={-1} data-disposal-asset-card className="flex min-w-0 items-start gap-3 rounded-md border border-border bg-background p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <AssetThumbnail photo={photo} assetTag={asset.assetTag} assetName={asset.name} size={44} />
        <div className="grid min-w-0 flex-1 gap-1">
          <p id={fieldId ? `${fieldId}-value` : undefined} className="grid min-w-0 gap-1">
            <span className="min-w-0 break-words font-medium text-foreground">{asset.name}</span>
            <span className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="tag">{asset.assetTag}</span>
              <StatusBadge label={asset.statusNameTh} tone={getAssetStateTone(asset.statusName)} />
            </span>
          </p>
          <p className="min-w-0 break-words text-meta text-muted-foreground">
            {t("createForm.cardWhere", { room: asset.locationName, branch: asset.branchName, holder: asset.custodianName ?? t("createForm.noHolder") })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onChange}>
          {t("createForm.change")}
        </Button>
      </div>
      <p data-disposal-readiness={line} className="flex min-w-0 items-start gap-1.5 text-meta text-foreground">
        {line === "ready" ? (
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <WarningIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0 break-words">{line === "ready" ? t("readyLine") : `${t("errors.DISPOSAL_ASSET_BLOCKED")} · ${blockerText}`}</span>
      </p>
    </div>
  )
}
