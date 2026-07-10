import Link from "next/link"
import { ArrowRight, Puzzle } from "lucide-react"

type InstalledInLink = {
  id: string
  componentRole: string
  slotNo?: string | null
  parentHref: string
  parentAsset: {
    id: string
    assetTag: string
    name: string
  }
}

export function AssetComponentContextBanner({
  installedInLinks,
  labels,
}: {
  installedInLinks: InstalledInLink[]
  labels: {
    title: string
    openParent: string
    roleLabel: string
    slotLabel: string
  }
}) {
  if (installedInLinks.length === 0) return null

  return (
    <section aria-label={labels.title} className="border-y border-primary/20 bg-primary/5 px-4 py-3 sm:rounded-lg sm:border">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-white">
            <Puzzle className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{labels.title}</p>
            <div className="mt-1 grid gap-1">
              {installedInLinks.map((link) => (
                <Link
                  key={link.id}
                  href={link.parentHref}
                  className="group inline-flex min-h-11 items-center gap-2 rounded-md py-1 text-sm text-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <span className="min-w-0">
                    <span className="block break-words font-mono font-semibold">{link.parentAsset.assetTag}</span>
                    <span className="block truncate text-xs text-muted-foreground">{link.parentAsset.name}</span>
                    <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>{labels.roleLabel}: {link.componentRole}</span>
                      {link.slotNo ? <span>{labels.slotLabel}: {link.slotNo}</span> : null}
                    </span>
                  </span>
                  <span className="ml-auto hidden shrink-0 items-center gap-1 text-xs font-medium text-primary sm:inline-flex">
                    {labels.openParent}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                  <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5 sm:hidden" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
