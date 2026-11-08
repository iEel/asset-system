import Link from "next/link"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"

export type StorageFilterChip = { key: string; label: string; count: number; href: string }

// Board AD-Storage .fchip, the ReadinessFilterChips look: a pill, 32px from md (44px below). The chosen one is filled.
const chipClasses =
  "inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-meta transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-8 md:min-h-0"
const chipCurrentClasses = "border-primary-border bg-primary-soft font-semibold text-primary-hover"
const chipIdleClasses = "border-border bg-surface font-medium text-foreground hover:bg-background"

// Group 12 spec §8: ทั้งหมด · ไฟล์หาย · ไฟล์หลุด with counts. The filter is in the URL (filter=), so each chip is a real
// link marked with aria-current. Server-safe.
export function StorageFilterChips({ label, chips, current }: { label: string; chips: readonly StorageFilterChip[]; current: string }) {
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap items-center gap-1.5">
        {chips.map((chip) => (
          <li key={chip.key} className="flex">
            <Link
              href={chip.href}
              scroll={false}
              aria-current={chip.key === current ? "page" : undefined}
              className={cn(chipClasses, chip.key === current ? chipCurrentClasses : chipIdleClasses)}
            >
              {chip.label}
              <span className={cn("num", chip.key === current ? "text-primary" : "text-faint-foreground")}>{formatCount(chip.count)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
