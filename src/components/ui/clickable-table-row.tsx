"use client"

import { useRouter } from "next/navigation"

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
  onNavigate?: () => void
  children: React.ReactNode
}) {
  const router = useRouter()

  function shouldIgnoreClick(target: EventTarget | null) {
    return target instanceof Element && Boolean(target.closest("a,button,input,select,textarea,[data-no-row-click]"))
  }

  function openDetail() {
    onNavigate?.()
    router.push(href)
  }

  return (
    <tr
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
