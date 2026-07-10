import Link from "next/link"
import {
  assetDetailViews,
  buildAssetDetailViewHref,
  type AssetDetailView,
} from "@/lib/asset-detail-view"

export function AssetDetailTabs({
  locale,
  assetId,
  view,
  returnTo,
  label,
  labels,
}: {
  locale: string
  assetId: string
  view: AssetDetailView
  returnTo?: string | null
  label: string
  labels: Record<AssetDetailView, string>
}) {
  return (
    <nav aria-label={label} className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-2">
        {assetDetailViews.map((item) => (
          <Link
            key={item}
            href={buildAssetDetailViewHref(locale, assetId, item, returnTo)}
            aria-current={view === item ? "page" : undefined}
            className={`inline-flex min-h-11 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors sm:h-9 sm:min-h-0 ${
              view === item
                ? "border-primary bg-primary text-white"
                : "border-border bg-surface text-muted-foreground hover:border-primary/40 hover:bg-accent hover:text-foreground"
            }`}
          >
            {labels[item]}
          </Link>
        ))}
      </div>
    </nav>
  )
}
