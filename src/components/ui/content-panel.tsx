import type React from "react"
import { cn } from "@/lib/utils"
import { getPanelClasses } from "@/lib/design-system"

type ContentPanelProps = {
  title?: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function ContentPanel({ title, description, actions, children, className }: ContentPanelProps) {
  return (
    <section className={cn(getPanelClasses(), "p-4 sm:p-5", className)}>
      {title || description || actions ? (
        <div className="mb-4 flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            {title ? <h2 className="break-words text-base font-semibold text-foreground">{title}</h2> : null}
            {description ? <p className="mt-1 break-words text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">{actions}</div> : null}
        </div>
      ) : null}
      <div className="min-w-0 max-w-full">{children}</div>
    </section>
  )
}
