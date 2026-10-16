import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { linkVariants } from "@/components/ui/button-variants"
import { Notice } from "@/components/ui/notice"
import { cn } from "@/lib/utils"

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

  // Spec 2D D7: where this asset is installed is information, an inline info Notice (no tinted band, no icon tile).
  // Each parent is a text link with its code as a tag; "open parent" stays in the link's name for screen readers.
  return (
    <section aria-label={labels.title}>
      <Notice tone="info" title={labels.title}>
        <ul className="grid gap-1">
          {installedInLinks.map((link) => (
            <li key={link.id} className="min-w-0">
              <Link href={link.parentHref} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center gap-1.5 md:min-h-0")}>
                <span className="sr-only">{`${labels.openParent}: `}</span>
                <span className="tag font-medium">{link.parentAsset.assetTag}</span>
                <span className="min-w-0 break-words">{link.parentAsset.name}</span>
                <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
              </Link>
              <span className="block text-meta text-muted-foreground">
                {labels.roleLabel}: {link.componentRole}
                {link.slotNo ? ` · ${labels.slotLabel}: ${link.slotNo}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </Notice>
    </section>
  )
}
