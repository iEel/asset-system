import type React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export type TabNavItem = {
  key: string
  label: React.ReactNode
  href: string
  // Already formatted (formatCount).
  count?: string
  // For example the warning icon of an asset detail tab.
  icon?: React.ReactNode
}

// ...navProps reaches <nav>: ref, style, onScroll and data-* for the client wrappers that scroll the row (I9).
// onSelect is left out of the <nav> props because its event type differs from the one below.
type TabNavProps = Omit<React.ComponentProps<"nav">, "children" | "aria-label" | "onSelect"> & {
  "aria-label": string
  items: readonly TabNavItem[]
  // The key of the current tab: its link gets aria-current="page".
  current: string
  // Passed to Link; false keeps the scroll position.
  scroll?: boolean
  // Client components only (a server page cannot pass a function): runs through Link onNavigate, so it fires on
  // client-side navigation only, and event.preventDefault() keeps the URL. Ctrl+click still opens a new tab.
  onSelect?: (key: string, event: { preventDefault: () => void }) => void
  // Added to every link, for example "snap-start" from a client wrapper.
  linkClassName?: string
  // Layout, for example the full-bleed register status tabs.
  className?: string
}

// Mockup .tabs: 14px links 22px apart on one 1px base line; the current tab is ink 600 with a 2px primary line.
// Both lines are inset shadows, so the current tab is no taller than the others, and the 2px line sits in a li that
// fills the row height: it covers the base line and scrolls with its tab. Focus ring inside, so the scroller cannot cut it.
const tabNavLinkClasses = "flex min-h-11 items-center gap-1.5 pt-2 pb-2.5 text-sm transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:min-h-0"
const tabNavSelectedClasses = "font-semibold text-foreground shadow-[inset_0_-2px_0_var(--primary)]"
const tabNavIdleClasses = "text-muted-foreground hover:text-foreground hover:shadow-[inset_0_-2px_0_var(--border)]"

// Links that change the URL, named by the <nav> and marked with aria-current, not an ARIA tab list (R-g). State that
// does not change the URL uses Segmented. Underline at every width; 40px from md, 44px below. Keeps the system
// scrollbar: the settings row has 11 tabs. Server-safe.
export function TabNav({ "aria-label": ariaLabel, items, current, scroll, onSelect, linkClassName, className, ...navProps }: TabNavProps) {
  return (
    <nav aria-label={ariaLabel} data-slot="tab-nav" {...navProps} className={cn("overflow-x-auto overscroll-x-contain", className)}>
      <ul className="flex w-max min-w-full gap-5.5 shadow-[inset_0_-1px_0_var(--border)]">
        {items.map((item) => {
          const selected = item.key === current
          return (
            <li key={item.key} className="flex">
              <Link
                href={item.href}
                scroll={scroll}
                aria-current={selected ? "page" : undefined}
                onNavigate={onSelect ? (event) => onSelect(item.key, event) : undefined}
                className={cn(tabNavLinkClasses, selected ? tabNavSelectedClasses : tabNavIdleClasses, linkClassName)}
              >
                {item.icon}
                <span className="whitespace-nowrap">
                  {item.label}
                  {item.count !== undefined ? <span className={cn("ms-1.5 text-meta num", selected ? "font-semibold text-primary" : "text-faint-foreground")}>{item.count}</span> : null}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
