import Link from "next/link"
import { PackagePlus } from "lucide-react"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"

type AssetReference = {
  id: string
  assetTag: string
  name: string
  serialNumber?: string | null
}

type CurrentComponent = {
  id: string
  componentRole: string
  slotNo?: string | null
  componentAsset: AssetReference
}

type InstalledInLink = {
  id: string
  componentRole: string
  slotNo?: string | null
  parentHref: string
  parentAsset: AssetReference
}

export function AssetComponentsSummary({
  locale,
  currentComponents,
  installedInLinks,
  canManage,
  manageHref,
  labels,
}: {
  locale: string
  currentComponents: CurrentComponent[]
  installedInLinks: InstalledInLink[]
  canManage: boolean
  manageHref: string
  labels: {
    title: string
    help: string
    installedIn: string
    roleLabel: string
    slotLabel: string
    current: string
    noCurrent: string
    missingSerial: string
    manage: string
  }
}) {
  const missingSerialCount = currentComponents.filter((component) => !component.componentAsset.serialNumber).length
  const visibleComponents = currentComponents.slice(0, 5)

  // Spec 2D D9: the page-level panel is ContentPanel; the parent list and the component list are blocks of it, with no
  // tinted box. Codes are tag (M33), the manage link is the md button of a panel head.
  return (
    <ContentPanel
      title={labels.title}
      description={labels.help}
      actions={
        canManage ? (
          <Link href={manageHref} className={buttonVariants({ size: "md" })}>
            <PackagePlus aria-hidden="true" />
            {labels.manage}
          </Link>
        ) : undefined
      }
    >
      {installedInLinks.length > 0 ? (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">{labels.installedIn}</h3>
          <ul className="mt-2 grid gap-2">
            {installedInLinks.map((link) => (
              <li key={link.id} className="min-w-0">
                <Link href={link.parentHref} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center gap-1.5 md:min-h-0")}>
                  <span className="tag font-medium">{link.parentAsset.assetTag}</span>
                  <span className="min-w-0 break-words">{link.parentAsset.name}</span>
                </Link>
                <span className="block text-meta text-muted-foreground">
                  {labels.roleLabel}: {link.componentRole}
                  {link.slotNo ? ` · ${labels.slotLabel}: ${link.slotNo}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{labels.current}</h3>
        {missingSerialCount > 0 ? (
          <StatusBadge tone="warning" label={`${labels.missingSerial}: ${formatCount(missingSerialCount)}`} />
        ) : null}
      </div>
      {visibleComponents.length === 0 ? (
        <EmptyNote>{labels.noCurrent}</EmptyNote>
      ) : (
        <div className="divide-y divide-border-soft rounded-md border border-border">
          {visibleComponents.map((component) => (
            // On a phone the serial goes under the component, so a long serial cannot squeeze the name (Task 20 fix).
            <Link
              key={component.id}
              href={`/${locale}/assets/${component.componentAsset.id}`}
              className="flex min-w-0 flex-col gap-1 px-3 py-3 transition-colors hover:bg-row-hover sm:flex-row sm:items-center sm:justify-between sm:gap-3"
            >
              <span className="min-w-0">
                <span className="block text-sm text-foreground">
                  <span className="tag font-medium">{component.componentAsset.assetTag}</span>
                </span>
                <span className="mt-0.5 block truncate text-meta text-muted-foreground">{component.componentAsset.name}</span>
                <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-meta text-muted-foreground">
                  <span>{labels.roleLabel}: {component.componentRole}</span>
                  {component.slotNo ? <span>{labels.slotLabel}: {component.slotNo}</span> : null}
                </span>
              </span>
              {component.componentAsset.serialNumber ? (
                <span className="text-meta text-muted-foreground [overflow-wrap:anywhere] sm:shrink-0">SN: {component.componentAsset.serialNumber}</span>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </ContentPanel>
  )
}
