import Link from "next/link"
import { Boxes, PackagePlus, Puzzle } from "lucide-react"

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

  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Boxes className="h-5 w-5 text-primary" />
            {labels.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{labels.help}</p>
        </div>
        {canManage ? (
          <Link
            href={manageHref}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-white transition-colors hover:bg-primary/90 sm:h-10 sm:min-h-0"
          >
            <PackagePlus className="h-4 w-4" />
            {labels.manage}
          </Link>
        ) : null}
      </div>

      {installedInLinks.length > 0 ? (
        <div className="mt-4 rounded-md border border-primary/20 bg-primary/5 p-3">
          <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">{labels.installedIn}</div>
          <div className="mt-2 grid gap-2">
            {installedInLinks.map((link) => (
              <Link
                key={link.id}
                href={link.parentHref}
                className="text-sm font-medium text-primary hover:underline"
              >
                {link.parentAsset.assetTag} - {link.parentAsset.name}
                <span className="block pt-0.5 text-xs font-normal text-muted-foreground">
                  {labels.roleLabel}: {link.componentRole}
                  {link.slotNo ? ` · ${labels.slotLabel}: ${link.slotNo}` : ""}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Puzzle className="h-4 w-4 text-primary" />
            {labels.current}
          </div>
          {missingSerialCount > 0 ? (
            <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
              {labels.missingSerial}: {missingSerialCount}
            </span>
          ) : null}
        </div>
        {visibleComponents.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">{labels.noCurrent}</p>
        ) : (
          <div className="divide-y divide-border rounded-md border border-border">
            {visibleComponents.map((component) => (
              <Link
                key={component.id}
                href={`/${locale}/assets/${component.componentAsset.id}`}
                className="flex min-w-0 items-center justify-between gap-3 px-3 py-3 transition-colors hover:bg-accent"
              >
                <span className="min-w-0">
                  <span className="block break-words font-mono text-sm font-semibold text-foreground">{component.componentAsset.assetTag}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{component.componentAsset.name}</span>
                  <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{labels.roleLabel}: {component.componentRole}</span>
                    {component.slotNo ? <span>{labels.slotLabel}: {component.slotNo}</span> : null}
                  </span>
                </span>
                {component.componentAsset.serialNumber ? (
                  <span className="shrink-0 text-xs text-muted-foreground">SN: {component.componentAsset.serialNumber}</span>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
