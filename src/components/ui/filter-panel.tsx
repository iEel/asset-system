import type React from "react"
import { cn } from "@/lib/utils"
import { getPanelClasses } from "@/lib/design-system"

type FilterPanelProps = {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function FilterPanel({ title, description, children, className }: FilterPanelProps) {
  return (
    <section className={cn(getPanelClasses(), "p-4", className)}>
      {title || description ? (
        <div className="mb-4">
          {title ? <h2 className="text-base font-semibold text-foreground">{title}</h2> : null}
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}
