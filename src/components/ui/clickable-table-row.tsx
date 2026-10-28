"use client"

import { useRef } from "react"
import { useRouter } from "next/navigation"
import { dataTableRowClasses } from "@/components/ui/data-table"
import {
  CLICKABLE_ROW_BEFORE_NAVIGATE_EVENT,
  shouldCancelClickableRowNavigation,
} from "@/lib/clickable-row-navigation"
import { cn } from "@/lib/utils"

// The record that is open beside the list (the findings review panel): the primary-soft fill, hovered, focused or with
// its menu open, so the open row never looks like a hovered one (DESIGN.md Data Tables; faint text stays AA on it).
const clickableTableRowCurrentClasses = "bg-primary-soft hover:bg-primary-soft focus-within:bg-primary-soft has-[[aria-expanded=true]]:bg-primary-soft"

export function ClickableTableRow({
  href,
  label,
  className,
  onNavigate,
  scroll = true,
  current = false,
  rowData,
  children,
}: {
  href: string
  label: string
  className?: string
  onNavigate?: () => boolean | void
  /** false keeps the scroll position: the row opens its record in a panel of the same page (the findings list). */
  scroll?: boolean
  /** The record open beside the list: aria-current="true" and the primary-soft fill. */
  current?: boolean
  /** data-* hooks on the <tr>, for the tests that read a row (the findings list: its finding id and type). */
  rowData?: Readonly<Record<`data-${string}`, string>>
  children: React.ReactNode
}) {
  const router = useRouter()
  const rowRef = useRef<HTMLTableRowElement | null>(null)

  function shouldIgnoreClick(target: EventTarget | null) {
    return target instanceof Element && Boolean(target.closest("a,button,input,select,textarea,[data-no-row-click]"))
  }

  function openDetail() {
    const beforeNavigateEvent = new CustomEvent<{ href: string }>(CLICKABLE_ROW_BEFORE_NAVIGATE_EVENT, {
      bubbles: true,
      cancelable: true,
      detail: { href },
    })
    if (rowRef.current && !rowRef.current.dispatchEvent(beforeNavigateEvent)) return
    if (shouldCancelClickableRowNavigation(onNavigate?.())) return
    router.push(href, { scroll })
  }

  return (
    <tr
      {...rowData}
      ref={rowRef}
      tabIndex={0}
      aria-label={label}
      aria-current={current ? "true" : undefined}
      onClick={(event) => {
        if (shouldIgnoreClick(event.target)) return
        openDetail()
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return
        if (shouldIgnoreClick(event.target)) return
        event.preventDefault()
        openDetail()
      }}
      className={cn(dataTableRowClasses, "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", current && clickableTableRowCurrentClasses, className)}
    >
      {children}
    </tr>
  )
}
