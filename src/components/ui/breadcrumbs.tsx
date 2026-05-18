import Link from "next/link"
import { ChevronRight } from "lucide-react"

type BreadcrumbItem = {
  label: string
  href?: string
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
      {items.map((item, index) => {
        const isLast = index === items.length - 1

        return (
          <span key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
            {item.href && !isLast ? (
              <Link href={item.href} className="truncate hover:text-primary">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "truncate font-medium text-foreground" : "truncate"}>{item.label}</span>
            )}
            {!isLast ? <ChevronRight className="h-3.5 w-3.5 shrink-0" /> : null}
          </span>
        )
      })}
    </nav>
  )
}
