import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type FormSectionProps = {
  number?: number
  title: ReactNode
  // h3 under a page that already has an h2 section title (the settings page).
  as?: "h2" | "h3"
  className?: string
  children?: ReactNode
}

const headingClasses = {
  h2: "text-base font-semibold text-foreground",
  h3: "text-sm font-semibold text-foreground",
}

// A numbered form section heading (spec 2C section 7.3, K18). The number is decoration in a quiet outlined circle,
// never the filled "current step" look; Steps is the only progress indicator. Without children it returns the heading
// row alone, for forms that place it as one row of a grid (className goes on the row). With children it wraps them in
// a plain div, not a section element, so a long settings page does not get one landmark region per section. Server-safe.
export function FormSection({ number, title, as: Heading = "h2", className, children }: FormSectionProps) {
  const hasBody = children !== undefined && children !== null
  const heading = (
    <div data-slot="form-section-heading" className={cn("flex items-center gap-2.5 border-b border-border-soft pb-2.5", hasBody ? "mb-4" : className)}>
      {number !== undefined ? (
        <span
          aria-hidden="true"
          className="inline-flex size-5.5 shrink-0 items-center justify-center rounded-full border border-control-border text-xs font-semibold text-muted-foreground num"
        >
          {number}
        </span>
      ) : null}
      <Heading className={headingClasses[Heading]}>{title}</Heading>
    </div>
  )

  if (!hasBody) return heading

  return (
    <div data-slot="form-section" className={className}>
      {heading}
      {children}
    </div>
  )
}
