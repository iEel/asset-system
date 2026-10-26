import type { ReactNode } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslations } from "next-intl"
import { AssetStateHelpPopover } from "@/components/assets/asset-state-help-popover"
import { buttonVariants } from "@/components/ui/button-variants"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { getAssetStateTone } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"

// Where this asset sits in the register list it was opened from (Task 2's 1-based index, R8). Each href keeps the
// detail's returnTo unchanged, so a neighbour opens on its overview with the same trail.
export type AssetDetailNeighbours = { position: number; total: number; previousHref: string | null; nextHref: string | null }

// The asset page's header (group 1 spec §7.2, canvas B): the trail (the register, the search or filter it came from as
// text, R10, then the code), the name, the meta row (code, status badge with its help, S/N), then the back link,
// previous / next and the actions part. No directive and no hook beyond next-intl's, as Breadcrumbs: server-rendered.
export function AssetDetailHeader({
  asset,
  returnToHref,
  backLabel,
  crumbLabel,
  neighbours,
  statusHelp,
  actions,
}: {
  asset: { assetTag: string; name: string; serialNumber: string | null; status: { name: string; nameTh: string } }
  returnToHref: string
  backLabel: string
  crumbLabel: string | null
  neighbours: AssetDetailNeighbours | null
  statusHelp: { title: string; description: string; items: string[] }
  actions: ReactNode
}) {
  const t = useTranslations("assetDetail")
  const tAsset = useTranslations("asset")

  return (
    <PageHeader
      breadcrumbs={[
        { label: tAsset("title"), href: returnToHref },
        ...(crumbLabel ? [{ label: crumbLabel }] : []),
        { label: asset.assetTag, code: true },
      ]}
      title={asset.name}
      meta={
        <span data-testid="asset-identity-summary" className="contents">
          <span className="tag">{asset.assetTag}</span>
          <span className="inline-flex items-center gap-1.5">
            <StatusBadge label={asset.status.nameTh} tone={getAssetStateTone(asset.status.name)} />
            <AssetStateHelpPopover {...statusHelp} />
          </span>
          {asset.serialNumber ? (
            <span className="min-w-0 break-words">
              {t("serialPrefix")} <span className="tag">{asset.serialNumber}</span>
            </span>
          ) : null}
        </span>
      }
      back={<PageBackLink href={returnToHref} label={backLabel} />}
      actions={
        <>
          {neighbours ? <AssetNeighbourNav neighbours={neighbours} /> : null}
          {actions}
        </>
      }
    />
  )
}

// Previous / next in the register's list (R33, R35): icon links named in words, the first item has no previous link
// and the last no next link; the phone shows only next. "k / N" stays visible while the list is known.
function AssetNeighbourNav({ neighbours }: { neighbours: AssetDetailNeighbours }) {
  const t = useTranslations("assetDetail")
  const position = formatCount(neighbours.position)
  const total = formatCount(neighbours.total)

  return (
    <nav aria-label={t("neighbourNav")} className="flex items-center gap-1">
      {neighbours.previousHref ? (
        <Link href={neighbours.previousHref} aria-label={t("neighbourPrevious")} title={t("neighbourPrevious")} className={cn(buttonVariants({ variant: "outline", size: "icon" }), "max-md:hidden")}>
          <ChevronLeft aria-hidden="true" />
        </Link>
      ) : null}
      <span aria-hidden="true" className="num px-1 text-meta text-muted-foreground">{t("neighbourPosition", { position, total })}</span>
      <span className="sr-only">{t("neighbourPositionLabel", { position, total })}</span>
      {neighbours.nextHref ? (
        <Link href={neighbours.nextHref} aria-label={t("neighbourNext")} title={t("neighbourNext")} className={buttonVariants({ variant: "outline", size: "icon" })}>
          <ChevronRight aria-hidden="true" />
        </Link>
      ) : null}
    </nav>
  )
}
