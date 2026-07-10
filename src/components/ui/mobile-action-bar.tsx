import Link from "next/link"
import type React from "react"

type MobileAction = {
  label: string
  href: string
  icon?: React.ReactNode
  primary?: boolean
  disabled?: boolean
}

export function MobileActionBar({ actions }: { actions: MobileAction[] }) {
  const visibleActions = actions.slice(0, 4)

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-md backdrop-blur md:hidden">
      <div className="grid min-w-0 grid-cols-4 gap-2">
        {visibleActions.map((action) =>
          action.disabled ? (
            <span
              key={action.label}
              className="inline-flex h-11 min-w-0 items-center justify-center gap-1 rounded-md border border-border bg-muted px-2 text-xs font-medium leading-tight text-muted-foreground"
              aria-disabled="true"
            >
              <span className="shrink-0">{action.icon}</span>
              <span className="min-w-0 truncate">{action.label}</span>
            </span>
          ) : (
            <Link
              key={action.label}
              href={action.href}
              className={`inline-flex h-11 min-w-0 items-center justify-center gap-1 rounded-md px-2 text-xs font-medium leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                action.primary
                  ? "bg-primary text-white hover:bg-primary/90"
                  : "border border-border bg-background text-foreground hover:bg-accent"
              }`}
            >
              <span className="shrink-0">{action.icon}</span>
              <span className="min-w-0 truncate">{action.label}</span>
            </Link>
          ),
        )}
      </div>
    </div>
  )
}
