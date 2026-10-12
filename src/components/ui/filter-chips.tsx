import Link from "next/link"
import { X } from "lucide-react"
import { linkVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"

// href is the current URL without this filter. mobileOnly hides the chip from md (the register's scope chips, which
// the toolbar selects already show on desktop).
export type FilterChipItem = { key: string; label: string; href: string; mobileOnly?: boolean }

type FilterChipListProps = {
  chips: readonly FilterChipItem[]
  // The name of the group, for example "ตัวกรองที่ใช้อยู่".
  label: string
  // Starts each chip's name: `${removeLabel}: ${chip.label}`, so screen readers hear what a click removes.
  removeLabel: string
  // A "clear all" link after the chips (the register).
  clearAll?: { href: string; label: string }
  className?: string
}

// Mockup .toolbar .chip: 36px from md like its toolbar neighbours, 8px corners, primary-soft fill. The whole chip is
// one remove link (44px on phones), because a server page cannot pass a handler and a 24px x alone is too small to
// tap; the x is a picture. Server-safe. No chips, no group.
export function FilterChipList({ chips, label, removeLabel, clearAll, className }: FilterChipListProps) {
  if (chips.length === 0) return null

  return (
    <div role="group" aria-label={label} data-slot="filter-chips" className={cn("flex min-w-0 flex-wrap items-center gap-2", chips.every((chip) => chip.mobileOnly) && "md:hidden", className)}>
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          aria-label={`${removeLabel}: ${chip.label}`}
          className={cn("group/chip inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-md border border-primary-border bg-primary-soft pl-3 pr-1 text-meta text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-9 md:min-h-0", chip.mobileOnly && "md:hidden")}
        >
          <span className="min-w-0 truncate">{chip.label}</span>
          <span aria-hidden="true" className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm transition-colors motion-reduce:transition-none group-hover/chip:bg-primary-border">
            <X className="size-3" />
          </span>
        </Link>
      ))}
      {clearAll ? (
        <Link href={clearAll.href} className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}>
          {clearAll.label}
        </Link>
      ) : null}
    </div>
  )
}
