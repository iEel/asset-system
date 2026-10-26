import { FileDown } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { buttonVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { AssetHistoryPanel } from "@/components/assets/asset-history-panel"
import type { AssetHistory, AssetHistoryCategory } from "@/lib/asset-history-rules"
import { buildAssetHistoryExportHref, buildAssetHistoryRows } from "@/lib/asset-history-view"
import type { AssetMovementDocumentKind } from "@/lib/asset-movement-labels"
import { cn } from "@/lib/utils"

// The history tab (group 1 spec §7.6): the rows are built here, on the server, in Bangkok time, with a document only
// where the person may open its page (R12). No section id: a tab link carries no anchor (R22). The Excel export is
// a desktop link; the route checks asset:view again (R15).
export async function AssetHistoryTab({
  assetId,
  locale,
  history,
  initialType,
  documentAccess,
}: {
  assetId: string
  locale: string
  history: AssetHistory
  initialType: AssetHistoryCategory | null
  documentAccess: Record<AssetMovementDocumentKind, boolean>
}) {
  const t = await getTranslations("asset")
  // Task 3's labelKey is a full message key (R2).
  const tAll = await getTranslations()
  const rows = buildAssetHistoryRows(history.events, { locale, now: new Date(), access: documentAccess, label: (key) => tAll(key) })

  return (
    <ContentPanel
      divided
      flush
      title={t("history.title")}
      actions={
        history.total > 0 ? (
          <a href={buildAssetHistoryExportHref(locale, assetId)} download className={cn(buttonVariants({ variant: "outline", size: "md" }), "max-md:hidden")}>
            <FileDown aria-hidden="true" />
            {t("history.export")}
          </a>
        ) : undefined
      }
    >
      <AssetHistoryPanel rows={rows} total={history.total} counts={history.counts} capped={history.capped} initialType={initialType} />
    </ContentPanel>
  )
}
