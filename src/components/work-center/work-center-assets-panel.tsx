import Link from "next/link"
import { useTranslations } from "next-intl"
import { ArrowRight } from "lucide-react"
import { statusMarkerVariants } from "@/components/ui/badge-variants"
import { linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { hasAssetResponsibility } from "@/lib/asset-ownership"
import { buildExactAssetRegisterHref } from "@/lib/asset-register-view-memory"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"
import type { WorkCenterAssetsData } from "@/lib/work-center-page-data"

type FixKey = WorkCenterAssetsData["fixGroups"][number]["key"]

// The ข้อมูลไม่ครบ tab (spec §4.2, §8), moved unchanged from the old page: the three fix cards (no custodian / serial /
// photo, each to the register's dataQuality= filter) and the latest assets with an issue. Server-safe.
export function WorkCenterAssetsPanel({ locale, assets }: { locale: string; assets: WorkCenterAssetsData }) {
  const t = useTranslations("workCenter")
  const tCommon = useTranslations("common")
  const issueLabels: Record<FixKey, string> = {
    responsibility: t("dataQuality_responsibility"),
    serial: t("dataQuality_serial"),
    photo: t("dataQuality_photo"),
  }
  const issueDetails: Record<FixKey, string> = {
    responsibility: t("dataQuality_responsibilityDetail"),
    serial: t("dataQuality_serialDetail"),
    photo: t("dataQuality_photoDetail"),
  }

  return (
    <ContentPanel
      title={t("assetDataTitle")}
      description={t("assetDataSubtitle")}
      actions={
        <Link href={buildExactAssetRegisterHref(locale)} className={cn(linkVariants(), "inline-flex min-h-11 items-center gap-1 md:min-h-0")}>
          {tCommon("view")}
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      }
    >
      <div className="space-y-2">
        {assets.fixGroups.length > 0 ? (
          <div className="mb-3 rounded-md border border-border bg-background p-3">
            <div className="mb-2">
              <div className="text-sm font-semibold text-foreground">{t("bulkFixTitle")}</div>
              <div className="text-xs text-muted-foreground">{t("bulkFixSubtitle")}</div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {assets.fixGroups.map((group) => (
                <div key={group.key} className="rounded-md border border-border bg-surface p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{issueLabels[group.key]}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{issueDetails[group.key]}</p>
                    </div>
                    <span className="num shrink-0 text-sm font-semibold text-foreground">{formatCount(group.count)}</span>
                  </div>
                  {/* D19: text links at every width, 44px tall on phones. */}
                  <div className="mt-3 flex flex-col gap-x-4 gap-y-1 sm:flex-row sm:flex-wrap">
                    <Link href={group.assetsHref} className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}>
                      {t("openFilteredAssets")}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {assets.assets.length === 0 ? (
          <EmptyNote tone="clear">{t("noAssetDataIssues")}</EmptyNote>
        ) : (
          assets.assets.map((asset) => {
            const issues = [
              hasAssetResponsibility(asset) ? null : t("missingCustodianShort"),
              asset.serialNumber ? null : t("missingSerialShort"),
              asset.ownershipType === "software_license" || asset.attachments.length > 0 ? null : t("missingPhotoShort"),
            ].filter((issue): issue is string => Boolean(issue))
            return (
              <Link
                key={asset.id}
                href={`/${locale}/assets/${asset.id}`}
                className="block rounded-md border border-border bg-background p-3 text-sm transition-colors hover:bg-row-hover"
              >
                <div className="flex items-start gap-2">
                  {/* The status marker carries the urgency by shape, not by color alone. */}
                  <span aria-hidden="true" className={cn(statusMarkerVariants({ tone: "warning" }), "mt-2")} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{`${asset.assetTag} - ${asset.name}`}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{issues.join(" · ")}</p>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </ContentPanel>
  )
}
