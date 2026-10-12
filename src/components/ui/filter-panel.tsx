import type React from "react"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
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
    <section className={cn(getPanelClasses(), "p-3 sm:p-4", className)}>
      {title || description ? (
        <div className="mb-4 min-w-0">
          {title ? <h2 className="break-words text-base font-semibold text-foreground">{title}</h2> : null}
          {description ? <p className="mt-1 break-words text-sm text-muted-foreground">{description}</p> : null}
        </div>
      ) : null}
      <div className="min-w-0 max-w-full">{children}</div>
    </section>
  )
}

type FilterFormActionsProps = {
  // "กรอง" / "ใช้ตัวกรอง"
  submitLabel: string
  // Pass it only while a filter is active (hasActiveFilters); the link goes to the list without filters.
  clear?: { href: string; label: string }
  // Layout in the filter grid (col-span).
  className?: string
}

// The submit button and the "clear filters" link of a GET filter form. size="lg" is written out: the buttons sit in
// one row with 40px fields, and phase 2D moves the default size to 36px. items-end lines them up with the bottom of
// the fields in a grid cell that has labels on top. Phones: one button fills the row, two share it. Server-safe.
export function FilterFormActions({ submitLabel, clear, className }: FilterFormActionsProps) {
  return (
    <div data-slot="filter-form-actions" className={cn("flex items-end gap-2", className)}>
      <Button type="submit" size="lg" className="flex-1 md:flex-none">{submitLabel}</Button>
      {clear ? (
        <Link href={clear.href} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "flex-1 md:flex-none")}>
          {clear.label}
        </Link>
      ) : null}
    </div>
  )
}
