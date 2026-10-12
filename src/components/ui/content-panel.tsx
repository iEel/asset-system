import type React from "react"
import { cn } from "@/lib/utils"
import { getPanelClasses } from "@/lib/design-system"

type ContentPanelProps = {
  title?: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
} & (
  // The panel as it has always been: padding on the frame, no line under the head.
  | { divided?: false; flush?: never }
  // Mockup .panel: a 56px head with a line under it, and a padded body. flush drops the body padding for content
  // that brings its own (DataTable framed={false}, ContentPanelRows, EmptyNote padded). Never a frame in a frame.
  | { divided: true; flush?: boolean }
)

export function ContentPanel({ title, description, actions, children, className, divided = false, flush = false }: ContentPanelProps) {
  if (divided) {
    return (
      <section className={cn(getPanelClasses(), className)}>
        {title || description || actions ? (
          <div data-slot="content-panel-head" className="flex min-h-14 min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-2.5 md:px-5">
            {title || description ? (
              <div className="min-w-0">
                {title ? <h2 className="text-base font-semibold text-foreground text-balance">{title}</h2> : null}
                {description ? <p className="text-meta text-muted-foreground text-pretty">{description}</p> : null}
              </div>
            ) : null}
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
        ) : null}
        <div className={cn("min-w-0 max-w-full", !flush && "px-4 py-4 md:px-5")}>{children}</div>
      </section>
    )
  }

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

// Mockup .rows: rows split by soft lines, each with the panel's side gutter. Put it in ContentPanel divided flush.
export function ContentPanelRows({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul data-slot="content-panel-rows" className={cn("divide-y divide-border-soft [&>*]:px-4 [&>*]:py-3 md:[&>*]:px-5", className)} {...props} />
}
