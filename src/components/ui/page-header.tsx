import type { MouseEventHandler, ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/breadcrumbs"
import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"

export type PageHeaderProps = {
  // The h1: words, or a record code in <span className="tag font-medium"> when the record has no name of its own.
  title: ReactNode
  // The row under the title, one fact per element and no separators: code, status badge, facts, then what the page is for.
  meta?: ReactNode
  // The page's buttons at size "md": the ⋯ menu first, the primary action last.
  actions?: ReactNode
  // A <PageBackLink /> only. It comes first in the button row.
  back?: ReactNode
  // Written as an array literal at the call site: tests read the trail from the page source.
  breadcrumbs?: BreadcrumbItem[]
  // The asset register only: below md the title and its button share one row and the meta row is hidden.
  compactOnMobile?: boolean
  // Layout only. The header has no margin of its own; the gap below it belongs to the page.
  className?: string
}

// The page header (spec 2B §4.3, I1): breadcrumbs 4px above the title, one h1 at weight 600, the meta row, the buttons.
// Title and buttons stack below md and share a row from md, where buttons and fields change size. Flex, not the
// mockup's grid, so five buttons wrap to a new line instead of squeezing the title to nothing.
// No client directive and no hooks, like Button: server pages and client forms both render it.
export function PageHeader({ title, meta, actions, back, breadcrumbs, compactOnMobile = false, className }: PageHeaderProps) {
  return (
    <header data-slot="page-header" className={cn("min-w-0", className)}>
      {breadcrumbs ? <Breadcrumbs items={breadcrumbs} className="mb-1" /> : null}
      <div className={compactOnMobile ? "flex items-center justify-between gap-3 md:items-start md:gap-x-6" : "flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-x-6"}>
        <div className="min-w-0">
          <h1 className={cn("text-2xl font-semibold text-balance break-words text-foreground", compactOnMobile && "max-md:text-xl")}>{title}</h1>
          {meta ? (
            <div data-slot="page-header-meta" className={cn("mt-1 flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted-foreground", compactOnMobile && "max-md:hidden")}>
              {meta}
            </div>
          ) : null}
        </div>
        {back || actions ? (
          <div data-slot="page-header-actions" className={cn("flex flex-wrap items-center gap-2 md:justify-end", compactOnMobile && "shrink-0")}>
            {back}
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  )
}

export type PageBackLinkProps = {
  // The href the page already computed, returnTo included. The link never builds a URL itself.
  href: string
  // The page's own words (common.back, disposalPage.backToQueue …). Below md they stay as the icon button's name.
  label: string
  // Client callers only, for example a form that asks before it drops unsaved changes.
  onClick?: MouseEventHandler<HTMLAnchorElement>
  // Layout only.
  className?: string
}

// The one back button (spec 2B B2): outline md with a left arrow and the page's words. Below md it is a 44px icon
// button; the words stay in the accessibility tree (max-md:sr-only), so the name a screen reader reads is the
// visible text at every width and no separate label attribute is needed.
export function PageBackLink({ href, label, onClick, className }: PageBackLinkProps) {
  return (
    <Link href={href} onClick={onClick} data-slot="page-back-link" className={cn(buttonVariants({ variant: "outline", size: "md" }), "min-w-11 max-md:px-0", className)}>
      <ArrowLeft aria-hidden="true" />
      <span className="max-md:sr-only">{label}</span>
    </Link>
  )
}
