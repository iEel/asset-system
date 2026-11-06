"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { MobileFieldNavigation } from "@/components/layout/mobile-field-navigation"
import { MobileMoreSheet } from "@/components/layout/mobile-more-sheet"
import { SessionKeeper } from "@/components/layout/session-keeper"
import { ShellBanner, ShellBannerProvider } from "@/components/layout/shell-banner"
import { Sidebar } from "@/components/layout/sidebar"
import { ShellNotificationsProvider } from "@/components/layout/shell-notifications"
import { Topbar } from "@/components/layout/topbar"
import { ConfirmProvider } from "@/components/ui/confirm-dialog"
import type { SessionUser } from "@/lib/auth-utils"
import { landOnHashTarget } from "@/lib/hash-target-landing"
import type { HashLandResult } from "@/lib/hash-target-landing"
import type { SessionClock } from "@/lib/session-deadline"
import type { ShellAccount } from "@/lib/user-display"
import { sidebarCookieString, type SidebarPreference } from "@/lib/sidebar-preference"
import { getMobileShellMode, isMobileVirtualKeyboardVisible } from "@/lib/mobile-field-navigation"
import { cn } from "@/lib/utils"

export function DashboardShell({
  children,
  user,
  account,
  initialSidebar,
  sessionClock,
}: {
  children: React.ReactNode
  user: SessionUser
  account: ShellAccount
  initialSidebar: SidebarPreference
  sessionClock: SessionClock | null
}) {
  const shellRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const pathname = usePathname()
  const tNav = useTranslations("nav")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(initialSidebar === "collapsed")
  const [moreSheetOpen, setMoreSheetOpen] = useState(false)
  const moreTriggerRef = useRef<HTMLElement | null>(null)
  const [mobileKeyboardVisible, setMobileKeyboardVisible] = useState(false)
  const isNavigationMode = getMobileShellMode(pathname) === "navigation"
  // The bottom bar stays mounted under the เพิ่มเติม sheet's scrim, so focus can return to its tab (spec §6.6).
  const mobileFieldNavigationVisible = isNavigationMode && !mobileKeyboardVisible

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

  // The skip link moves focus itself: a native hash jump would fire hashchange, scroll main and leave #main in the URL (spec §6.9).
  const skipToMain = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    mainRef.current?.focus({ preventScroll: true })
  }

  // The bottom bar's เพิ่มเติม and the focus pages' hamburger open the same sheet; it returns focus to whichever opened it.
  const openMoreSheet = useCallback((trigger: HTMLButtonElement) => {
    moreTriggerRef.current = trigger
    setMoreSheetOpen(true)
  }, [])

  const scrollMainToHash = useCallback((): HashLandResult => {
    const main = mainRef.current
    const hash = window.location.hash

    if (!main || !hash || hash === "#") return "none"

    let targetId = hash.slice(1)

    try {
      targetId = decodeURIComponent(targetId)
    } catch {
      // Keep the raw hash when the browser URL contains a malformed escape.
    }

    const target = document.getElementById(targetId)

    if (target === main) return "none"
    // A fresh load mounts the shell under loading.tsx's skeleton, so the caller waits for the target. React streams the
    // page into a hidden holder under <body> (<div hidden id="S:0">) and moves it into main ~100-300ms later; a target
    // found there is not in place yet (measured on next start, 2026-11-04).
    if (!target || !main.contains(target)) return "missing"

    // The target's own scroll-margin-top (scroll-mt-*) is its gap under main's top: a client-side <Link> to the hash
    // lands with it through Next's scrollIntoView, so a fresh load, a reload and a click put the target in one place.
    const anchorOffset = Number.parseFloat(window.getComputedStyle(target).scrollMarginTop) || 0
    const mainRect = main.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()

    main.scrollTo({
      top: main.scrollTop + targetRect.top - mainRect.top - anchorOffset,
      behavior: "auto",
    })
    return "landed"
  }, [])

  // Watches main for the streamed page and ends the wait on the reader's own scroll, tap or key.
  const watchMainForHashTarget = useCallback((retry: () => void, interrupt: () => void) => {
    const main = mainRef.current

    if (!main) return () => {}

    const observer = new MutationObserver(retry)
    observer.observe(main, { childList: true, subtree: true })
    const readerEvents = ["wheel", "touchstart", "keydown", "pointerdown"] as const
    for (const type of readerEvents) window.addEventListener(type, interrupt, { capture: true, passive: true })

    return () => {
      observer.disconnect()
      for (const type of readerEvents) window.removeEventListener(type, interrupt, { capture: true })
    }
  }, [])

  useEffect(() => {
    let stopWaiting = () => {}
    let frame = 0

    const landAndResetShell = (): HashLandResult => {
      resetShellScroll()
      const result = scrollMainToHash()
      window.requestAnimationFrame(resetShellScroll)
      return result
    }

    const resetAfterAnchorScroll = () => {
      stopWaiting()
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        stopWaiting = landOnHashTarget({
          tryLand: landAndResetShell,
          watch: watchMainForHashTarget,
          startTimer: (onTimeout, ms) => {
            const timer = window.setTimeout(onTimeout, ms)
            return () => window.clearTimeout(timer)
          },
        })
      })
    }

    resetAfterAnchorScroll()
    window.addEventListener("hashchange", resetAfterAnchorScroll)

    return () => {
      window.removeEventListener("hashchange", resetAfterAnchorScroll)
      window.cancelAnimationFrame(frame)
      stopWaiting()
    }
  }, [resetShellScroll, scrollMainToHash, watchMainForHashTarget])

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
    <ShellBannerProvider>
      <SessionKeeper initialClock={sessionClock} />
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
              user={user}
              account={account}
              onExpand={expandSidebar}
            />

            <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden">
              <Topbar
                user={user}
                sidebarCollapsed={sidebarCollapsed}
                onToggleSidebar={() => changeSidebarCollapsed(!sidebarCollapsed)}
                onOpenMoreSheet={openMoreSheet}
                moreSheetOpen={moreSheetOpen}
                mobileNavigationMode={isNavigationMode}
              />

              <ShellBanner />

              {/* A page with a sticky save bar (StickyFormFooter): a control the browser scrolls to on focus (Tab) stops above the
                  bar, not under it. The bar is one row from sm; on phones it stacks the status line over full-width
                  buttons. Pages without the bar keep no scroll padding (group 8 plan 2 final review fix 8). */}
              <main ref={mainRef} id="main" tabIndex={-1} data-dashboard-main className={cn("min-h-0 min-w-0 max-w-full flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 outline-none sm:px-6 sm:py-6 has-[[data-slot=sticky-form-footer]]:scroll-pb-56 sm:has-[[data-slot=sticky-form-footer]]:scroll-pb-28", mobileFieldNavigationVisible && "scroll-pb-[calc(5.25rem+env(safe-area-inset-bottom))] lg:scroll-pb-0")}>
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
                moreOpen={moreSheetOpen}
                onOpenMore={openMoreSheet}
              />
            ) : null}

            <MobileMoreSheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen} user={user} account={account} returnFocusRef={moreTriggerRef} />
          </div>
        </ShellNotificationsProvider>
      </ConfirmProvider>
    </ShellBannerProvider>
  )
}
