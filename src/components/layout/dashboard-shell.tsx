"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import type { SessionUser } from "@/lib/auth-utils"

export function DashboardShell({
  children,
  user,
}: {
  children: React.ReactNode
  user: SessionUser
}) {
  const shellRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const resetShellScroll = useCallback(() => {
    const shell = shellRef.current

    if (!shell) return

    if (shell.scrollTop !== 0) shell.scrollTop = 0
    if (shell.scrollLeft !== 0) shell.scrollLeft = 0
  }, [])

  const scrollMainToHash = useCallback(() => {
    const main = mainRef.current
    const hash = window.location.hash

    if (!main || !hash) return

    let targetId = hash.slice(1)

    try {
      targetId = decodeURIComponent(targetId)
    } catch {
      // Keep the raw hash when the browser URL contains a malformed escape.
    }

    const target = document.getElementById(targetId)

    if (!target || !main.contains(target)) return

    const anchorOffset = 96
    const mainRect = main.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()

    main.scrollTo({
      top: main.scrollTop + targetRect.top - mainRect.top - anchorOffset,
      behavior: "auto",
    })
  }, [])

  useEffect(() => {
    const resetAfterAnchorScroll = () => {
      window.requestAnimationFrame(() => {
        resetShellScroll()
        scrollMainToHash()
        window.requestAnimationFrame(resetShellScroll)
      })
    }

    resetAfterAnchorScroll()
    window.addEventListener("hashchange", resetAfterAnchorScroll)

    return () => window.removeEventListener("hashchange", resetAfterAnchorScroll)
  }, [resetShellScroll, scrollMainToHash])

  return (
    <div ref={shellRef} onScroll={resetShellScroll} className="fixed inset-0 flex max-w-full overflow-hidden bg-background">
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        user={user}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden">
        <Topbar
          user={user}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onMobileMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        />

        <main ref={mainRef} className="min-h-0 min-w-0 max-w-full flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          {children}
        </main>
      </div>

      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
    </div>
  )
}
