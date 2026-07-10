"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { MobileFieldNavigation } from "@/components/layout/mobile-field-navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import type { SessionUser } from "@/lib/auth-utils"
import { getMobileShellMode, isMobileVirtualKeyboardVisible } from "@/lib/mobile-field-navigation"
import { cn } from "@/lib/utils"

export function DashboardShell({
  children,
  user,
}: {
  children: React.ReactNode
  user: SessionUser
}) {
  const shellRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const mobileMoreTriggerRef = useRef<HTMLButtonElement | null>(null)
  const restoreMobileMoreFocusRef = useRef(false)
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [mobileKeyboardVisible, setMobileKeyboardVisible] = useState(false)
  const isNavigationMode = getMobileShellMode(pathname) === "navigation"
  const mobileFieldNavigationVisible = isNavigationMode && !mobileKeyboardVisible && !mobileSidebarOpen

  const resetShellScroll = useCallback(() => {
    const shell = shellRef.current

    if (!shell) return

    if (shell.scrollTop !== 0) shell.scrollTop = 0
    if (shell.scrollLeft !== 0) shell.scrollLeft = 0
  }, [])

  const closeMobileSidebar = useCallback((restoreFocus: boolean) => {
    restoreMobileMoreFocusRef.current = restoreFocus
    setMobileSidebarOpen(false)
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

  useEffect(() => {
    if (mobileSidebarOpen || !restoreMobileMoreFocusRef.current) return

    const frame = window.requestAnimationFrame(() => {
      mobileMoreTriggerRef.current?.focus()
      restoreMobileMoreFocusRef.current = false
    })

    return () => window.cancelAnimationFrame(frame)
  }, [mobileSidebarOpen])

  useEffect(() => {
    if (!mobileSidebarOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobileSidebar(true)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [closeMobileSidebar, mobileSidebarOpen])

  useEffect(() => {
    const viewport = window.visualViewport

    if (!viewport) return

    const updateKeyboardVisibility = () => {
      const layoutHeight = Math.max(window.innerHeight, document.documentElement.clientHeight)
      setMobileKeyboardVisible(isMobileVirtualKeyboardVisible(viewport.height, layoutHeight))
    }

    updateKeyboardVisibility()
    viewport.addEventListener("resize", updateKeyboardVisibility)
    viewport.addEventListener("scroll", updateKeyboardVisibility)

    return () => {
      viewport.removeEventListener("resize", updateKeyboardVisibility)
      viewport.removeEventListener("scroll", updateKeyboardVisibility)
    }
  }, [])

  return (
    <div ref={shellRef} onScroll={resetShellScroll} className="fixed inset-0 flex max-w-full overflow-hidden bg-background">
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        user={user}
        onMobileClose={() => closeMobileSidebar(true)}
        onMobileNavigate={() => closeMobileSidebar(false)}
      />

      <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden">
        <Topbar
          user={user}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onMobileMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          mobileNavigationMode={isNavigationMode}
        />

        <main ref={mainRef} data-dashboard-main className="min-h-0 min-w-0 max-w-full flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          <div
            className={cn(
              "min-w-0 max-w-full",
              mobileFieldNavigationVisible && "pb-[calc(5.25rem+env(safe-area-inset-bottom))] lg:pb-0",
            )}
          >
            {children}
          </div>
        </main>
      </div>

      {mobileFieldNavigationVisible ? (
        <MobileFieldNavigation
          pathname={pathname}
          user={user}
          sidebarOpen={mobileSidebarOpen}
          onOpenMore={(trigger) => {
            mobileMoreTriggerRef.current = trigger
            setMobileSidebarOpen(true)
          }}
        />
      ) : null}

      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => closeMobileSidebar(true)}
        />
      )}
    </div>
  )
}
