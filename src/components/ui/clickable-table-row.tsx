"use client"

import { useRef } from "react"
import { useRouter } from "next/navigation"
import {
  CLICKABLE_ROW_BEFORE_NAVIGATE_EVENT,
  shouldCancelClickableRowNavigation,
} from "@/lib/clickable-row-navigation"

export function ClickableTableRow({
  href,
  label,
  className = "",
  onNavigate,
  children,
}: {
  href: string
  label: string
  className?: string
  onNavigate?: () => boolean | void
  children: React.ReactNode
}) {
  const router = useRouter()
  const rowRef = useRef<HTMLTableRowElement | null>(null)

  function shouldIgnoreClick(target: EventTarget | null) {
    return target instanceof Element && Boolean(target.closest("a,button,input,select,textarea,[data-no-row-click]"))
  }

  function openDetail() {
    const beforeNavigateEvent = new CustomEvent(CLICKABLE_ROW_BEFORE_NAVIGATE_EVENT, {
      bubbles: true,
      cancelable: true,
    })
    if (rowRef.current && !rowRef.current.dispatchEvent(beforeNavigateEvent)) return
    if (shouldCancelClickableRowNavigation(onNavigate?.())) return
    router.push(href)
  }

  return (
    <tr
      ref={rowRef}
      tabIndex={0}
      aria-label={label}
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
      className={`cursor-pointer hover:bg-accent/50 focus:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${className}`}
    >
      {children}
    </tr>
  )
}
