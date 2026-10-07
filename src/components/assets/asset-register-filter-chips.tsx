import Link from "next/link"
import { X } from "lucide-react"
import type { AssetRegisterChip } from "@/lib/asset-register-chips"
import { cn } from "@/lib/utils"

export function AssetRegisterFilterChips({
  chips,
  clearAllHref,
  labels,
}: {
  chips: AssetRegisterChip[]
  clearAllHref: string
  labels: { activeFilters: string; remove: string; clearAll: string }
}) {
  if (chips.length === 0) return null
  const onlyMobileChips = chips.every((chip) => chip.mobileOnly)

  return (
    <div
      role="group"
      aria-label={labels.activeFilters}
      data-asset-active-filters
      className={cn("mb-3 flex flex-wrap items-center gap-2", onlyMobileChips && "md:hidden")}
    >
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          aria-label={`${labels.remove}: ${chip.label}`}
          className={cn(
            "inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border border-info-border bg-primary-soft px-3 text-sm font-medium text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-8",
            chip.mobileOnly && "md:hidden",
          )}
        >
          <span className="truncate">{chip.label}</span>
          <X className="size-3.5 shrink-0" aria-hidden="true" />
        </Link>
      ))}
      <Link
        href={clearAllHref}
        className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-8"
      >
        {labels.clearAll}
      </Link>
    </div>
  )
}
