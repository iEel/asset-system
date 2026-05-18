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
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] backdrop-blur md:hidden">
      <div className="grid grid-cols-4 gap-2">
        {visibleActions.map((action) =>
          action.disabled ? (
            <span
              key={action.label}
              className="inline-flex h-11 items-center justify-center gap-1 rounded-md border border-border bg-muted px-2 text-xs font-medium text-muted-foreground"
            >
              {action.icon}
              <span className="truncate">{action.label}</span>
            </span>
          ) : (
            <Link
              key={action.label}
              href={action.href}
              className={`inline-flex h-11 items-center justify-center gap-1 rounded-md px-2 text-xs font-medium transition-colors ${
                action.primary
                  ? "bg-primary text-white hover:bg-primary/90"
                  : "border border-border bg-background text-foreground hover:bg-accent"
              }`}
            >
              {action.icon}
              <span className="truncate">{action.label}</span>
            </Link>
          ),
        )}
      </div>
    </div>
  )
}
