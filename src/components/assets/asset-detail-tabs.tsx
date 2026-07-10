import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import {
  assetDetailViews,
  buildAssetDetailViewHref,
  type AssetDetailView,
} from "@/lib/asset-detail-view"

type AssetDetailTabIndicator = {
  count?: number
  hasWarning?: boolean
}

export function AssetDetailTabs({
  locale,
  assetId,
  view,
  returnTo,
  label,
  labels,
  indicators,
  warningLabel,
}: {
  locale: string
  assetId: string
  view: AssetDetailView
  returnTo?: string | null
  label: string
  labels: Record<AssetDetailView, string>
  indicators?: Partial<Record<AssetDetailView, AssetDetailTabIndicator>>
  warningLabel: string
}) {
  return (
    <nav aria-label={label} className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-2">
        {assetDetailViews.map((item) => {
          const indicator = indicators?.[item]

          return (
            <Link
              key={item}
              href={buildAssetDetailViewHref(locale, assetId, item, returnTo)}
              aria-current={view === item ? "page" : undefined}
              className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors sm:h-9 sm:min-h-0 ${
                view === item
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-surface text-muted-foreground hover:border-primary/40 hover:bg-accent hover:text-foreground"
              }`}
            >
              <span>{labels[item]}</span>
              {indicator?.count ? (
                <span className={`rounded-full px-1.5 py-0.5 text-xs tabular-nums ${view === item ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                  {indicator.count}
                </span>
              ) : null}
              {indicator?.hasWarning ? (
                <span className={`inline-flex ${view === item ? "text-white" : "text-warning"}`}>
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">{warningLabel}</span>
                </span>
              ) : null}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
