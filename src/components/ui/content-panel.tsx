import type React from "react"
import { cn } from "@/lib/utils"

type ContentPanelProps = {
  title?: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function ContentPanel({ title, description, actions, children, className }: ContentPanelProps) {
  return (
    <section className={cn("rounded-lg border border-border bg-surface p-5 shadow-sm", className)}>
      {title || description || actions ? (
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            {title ? <h2 className="text-base font-semibold text-foreground">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}
