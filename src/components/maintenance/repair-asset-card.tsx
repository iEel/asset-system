import Link from "next/link"
import { useTranslations } from "next-intl"
import { CheckCircle2 } from "lucide-react"
import { AssetThumbnail } from "@/components/assets/asset-thumbnail"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { StatusBadge } from "@/components/ui/status-badge"
import { toneIcons } from "@/components/ui/tone-icons"
import { getAssetStateTone } from "@/lib/design-system"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
import { getRepairEligibility, type RepairAssetFacts } from "@/lib/repair-record-outlook"
import { cn } from "@/lib/utils"

// The picked asset of บันทึกซ่อม (group 5 spec §7.2), reused by the record page (plan 3): the register photo or its empty
// frame, the name, the tag, the status badge, the holder line, and the eligibility line computed from the same facts the
// save reads. "เปลี่ยน" shows only when the caller passes onChange (hidden on the PM path, G5P2-R8). An open record links
// to the record itself with this page's returnTo (G5P2-R9). fieldId keeps the form's stable hooks: the card is the asset
// field (#<fieldId>) and its name and tag line is the shown value (#<fieldId>-value), as the picker's were. State colour
// stays in the badge (maintenance-contrast): the line's icons are muted. The card takes focus (tabIndex -1) when it
// replaces the picker after a pick, so focus does not fall to the page (final review 2).
export function RepairAssetCard({ facts, locale, returnTo, onChange, fieldId }: {
  facts: RepairAssetFacts
  locale: string
  returnTo: string
  onChange?: () => void
  fieldId?: string
}) {
  const t = useTranslations("repairRecord")
  const eligibility = getRepairEligibility(facts)
  const where = [
    facts.holderName ? t("createForm.holder", { holder: facts.holderName }) : t("createForm.noHolder"),
    facts.departmentName,
    facts.roomName,
    facts.branchName,
  ].filter((part): part is string => Boolean(part))
  const WarningIcon = toneIcons.warning

  return (
    <div id={fieldId} tabIndex={-1} data-repair-asset-card className="flex min-w-0 items-start gap-3 rounded-md border border-border bg-background p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <AssetThumbnail photo={facts.photo} assetTag={facts.assetTag} assetName={facts.name} size={44} />
      <div className="grid min-w-0 flex-1 gap-1">
        <p id={fieldId ? `${fieldId}-value` : undefined} className="grid min-w-0 gap-1">
          <span className="min-w-0 break-words font-medium text-foreground">{facts.name}</span>
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="tag">{facts.assetTag}</span>
            <StatusBadge label={facts.statusLabel} tone={getAssetStateTone(facts.statusName)} />
          </span>
        </p>
        <p className="min-w-0 break-words text-meta text-muted-foreground">{where.join(" · ")}</p>
        <p data-repair-eligibility={eligibility} className="flex min-w-0 items-start gap-1.5 text-meta text-foreground">
          {eligibility === "ok" ? (
            <CheckCircle2 aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <WarningIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className="min-w-0 break-words">
            {eligibility === "openRecord" && facts.openRecord ? (
              <>
                {t("createForm.eligibleOpenRecord", { repairNo: facts.openRecord.repairNo })}{" "}
                <Link
                  href={appendOperationalReturnTo(`/${locale}/maintenance/${facts.openRecord.id}`, returnTo)}
                  className={cn(linkVariants({ size: "inherit" }), "decoration-current")}
                >
                  {t("openExistingRecord")}
                </Link>
              </>
            ) : eligibility === "writtenOff" ? t("createForm.eligibleWrittenOff") : t("createForm.eligibleOk")}
          </span>
        </p>
      </div>
      {onChange ? (
        <Button variant="outline" size="sm" onClick={onChange}>
          {t("createForm.change")}
        </Button>
      ) : null}
    </div>
  )
}
