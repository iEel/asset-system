import type { ReactNode } from "react"
import { useTranslations } from "next-intl"
import { isBlankValue } from "@/lib/display-format"
import { cn } from "@/lib/utils"

// An empty value: a dash people see, and words a screen reader says instead of reading the dash.
// No client directive, so server pages render it too. Faint ink belongs on neutral surfaces only, never on a tinted status fill.
export function Nil({ label, className }: { label?: string; className?: string }) {
  const t = useTranslations("common")

  return (
    <span data-slot="nil" className={cn("text-faint-foreground", className)}>
      <span aria-hidden="true">—</span>
      <span className="sr-only">{label ?? t("noValue")}</span>
    </span>
  )
}

// Shows value, or Nil when it is null, undefined or only spaces. 0 and false are values and stay.
export function orNil(value: ReactNode, label?: string): ReactNode {
  return isBlankValue(value) ? <Nil label={label} /> : value
}
