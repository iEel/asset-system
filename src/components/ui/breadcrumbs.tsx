import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

export type BreadcrumbItem = {
  label: string
  href?: string
  // A record code (asset tag, document number): shown in the mono tag style and never cut.
  code?: boolean
}

// No client directive: every caller is a server page. Spacing to the page title belongs to the caller.
export function Breadcrumbs({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  const t = useTranslations("common")

  return (
    <nav aria-label={t("breadcrumb")} className={cn("min-w-0 text-meta text-faint-foreground", className)}>
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {isLast ? (
                <span aria-current="page" className={cn("font-medium text-foreground", item.code && "tag")}>
                  {item.label}
                </span>
              ) : item.href ? (
                <Link href={item.href} className="hover:text-foreground hover:underline underline-offset-3">
                  {item.code ? <span className="tag">{item.label}</span> : item.label}
                </Link>
              ) : (
                <span className={item.code ? "tag" : undefined}>{item.label}</span>
              )}
              {isLast ? null : <ChevronRight className="size-3 shrink-0 text-input" strokeWidth={3} />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
