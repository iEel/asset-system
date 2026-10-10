import Link from "next/link"
import { cn } from "@/lib/utils"

export type AssetRegisterStatusTabItem = {
  key: string
  label: string
  /** Already formatted for the locale. */
  count: string
  href: string
  active: boolean
}

export function AssetRegisterStatusTabs({ label, items }: { label: string; items: AssetRegisterStatusTabItem[] }) {
  return (
    <nav aria-label={label} data-asset-status-tabs className="-mx-4 mb-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6 md:mx-0 md:mb-3 md:overflow-visible md:border-b md:border-border md:px-0">
      <ul className="flex w-max gap-2 md:w-auto md:gap-1">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:-mb-px md:min-h-10 md:rounded-none md:border-0 md:border-b-2",
                item.active
                  ? "border-primary-border bg-primary-soft text-primary md:border-primary md:bg-transparent"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground md:border-transparent md:bg-transparent",
              )}
            >
              <span>{item.label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs tabular-nums",
                  item.active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {item.count}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
