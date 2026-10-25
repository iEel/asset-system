"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { MobileFieldNavigation } from "@/components/layout/mobile-field-navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { ShellNotificationsProvider } from "@/components/layout/shell-notifications"
import { Topbar } from "@/components/layout/topbar"
import { ConfirmProvider } from "@/components/ui/confirm-dialog"
import type { SessionUser } from "@/lib/auth-utils"
import type { ShellAccount } from "@/lib/user-display"
import { sidebarCookieString, type SidebarPreference } from "@/lib/sidebar-preference"
import { getMobileShellMode, isMobileVirtualKeyboardVisible } from "@/lib/mobile-field-navigation"
import { cn } from "@/lib/utils"

export function DashboardShell({
  children,
  user,
  account,
  initialSidebar,
}: {
  children: React.ReactNode
  user: SessionUser
  account: ShellAccount
  initialSidebar: SidebarPreference
}) {
  const shellRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const pathname = usePathname()
  const tNav = useTranslations("nav")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(initialSidebar === "collapsed")
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

  // The cookie mirrors the menu's width on every change, so the next page load paints it the same way (spec §6.2).
  const changeSidebarCollapsed = useCallback((next: boolean) => {
    setSidebarCollapsed(next)
    document.cookie = sidebarCookieString(next ? "collapsed" : "expanded")
  }, [])

  const expandSidebar = useCallback(() => changeSidebarCollapsed(false), [changeSidebarCollapsed])

  // The skip link moves focus itself: a native hash jump would fire hashchange, scroll main 96px and leave #main in the URL (spec §6.9).
  const skipToMain = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    mainRef.current?.focus({ preventScroll: true })
  }

  const closeMobileSidebar = useCallback(() => {
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

    if (!target || target === main || !main.contains(target)) return

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
    <ConfirmProvider>
      <ShellNotificationsProvider>
        <div ref={shellRef} onScroll={resetShellScroll} className="fixed inset-0 flex max-w-full overflow-hidden bg-canvas">
          <a
            href="#main"
            onClick={skipToMain}
            className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-2 focus:z-50 focus:rounded-md focus:border focus:border-border focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-overlay"
          >
            {tNav("skipToContent")}
          </a>

          <Sidebar
            collapsed={sidebarCollapsed}
            mobileOpen={mobileSidebarOpen}
            user={user}
            account={account}
            onMobileClose={closeMobileSidebar}
            onMobileNavigate={closeMobileSidebar}
            onExpand={expandSidebar}
          />

          <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden">
            <Topbar
              user={user}
              sidebarCollapsed={sidebarCollapsed}
              onToggleSidebar={() => changeSidebarCollapsed(!sidebarCollapsed)}
              onMobileMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              mobileNavigationMode={isNavigationMode}
            />

            <main ref={mainRef} id="main" tabIndex={-1} data-dashboard-main className={cn("min-h-0 min-w-0 max-w-full flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 outline-none sm:px-6 sm:py-6", mobileFieldNavigationVisible && "scroll-pb-[calc(5.25rem+env(safe-area-inset-bottom))] lg:scroll-pb-0")}>
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
              onOpenMore={() => setMobileSidebarOpen(true)}
            />
          ) : null}
        </div>
      </ShellNotificationsProvider>
    </ConfirmProvider>
  )
}
