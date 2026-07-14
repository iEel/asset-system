"use client"

import Link from "next/link"
import { useTranslations, useLocale } from "next-intl"
import { useRouter, usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  Menu,
  Bell,
  Globe,
  LogOut,
  ScanLine,
  ChevronDown,
  PanelLeftClose,
} from "lucide-react"
import { useCallback, useEffect, useState, type MouseEvent as ReactMouseEvent } from "react"
import { cn } from "@/lib/utils"
import { GlobalSearch } from "@/components/layout/global-search"
import { getUserDisplayLabel, getUserInitial, getUserSecondaryLabel } from "@/lib/user-display"
import type { SessionUser } from "@/lib/auth-utils"
import {
  isPlainPrimaryClick,
  markNotificationRead,
  notificationSummaryChangedEvent,
  notifyNotificationSummaryChanged,
  removeNotificationSummaryItem,
  type NotificationClientSummary,
} from "@/lib/notification-client-sync"
import type { NotificationSummaryItem } from "@/lib/notification-summary-items"

async function fetchNotificationSummary(locale: string) {
  try {
    const response = await fetch(`/api/notifications?locale=${locale}`)
    if (!response.ok) return null
    return await response.json() as NotificationClientSummary
  } catch {
    return null
  }
}

export function Topbar({
  user,
  onToggleSidebar,
  onMobileMenuToggle,
  mobileNavigationMode,
}: {
  user: SessionUser
  onToggleSidebar: () => void
  onMobileMenuToggle: () => void
  mobileNavigationMode: boolean
}) {
  const tAuth = useTranslations("auth")
  const tAssetTools = useTranslations("assetTools")
  const tNotifications = useTranslations("notifications")
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notificationSummary, setNotificationSummary] = useState<NotificationClientSummary>({ total: 0, items: [] })
  const userDisplayLabel = getUserDisplayLabel(user)
  const userSecondaryLabel = getUserSecondaryLabel(user)

  const loadNotificationSummary = useCallback(async () => {
    const data = await fetchNotificationSummary(locale)
    if (data) setNotificationSummary(data)
  }, [locale])

  useEffect(() => {
    let cancelled = false
    void fetchNotificationSummary(locale).then((data) => {
      if (!cancelled && data) setNotificationSummary(data)
    })
    window.addEventListener(notificationSummaryChangedEvent, loadNotificationSummary)
    return () => {
      cancelled = true
      window.removeEventListener(notificationSummaryChangedEvent, loadNotificationSummary)
    }
  }, [loadNotificationSummary, locale])

  const handleNotificationClick = async (
    event: ReactMouseEvent<HTMLAnchorElement>,
    item: NotificationSummaryItem,
  ) => {
    if (!isPlainPrimaryClick(event)) {
      setNotificationOpen(false)
      return
    }

    event.preventDefault()
    try {
      if (await markNotificationRead(item)) {
        setNotificationSummary((current) => removeNotificationSummaryItem(current, item.key))
        notifyNotificationSummaryChanged()
      }
    } finally {
      setNotificationOpen(false)
      router.push(item.href)
    }
  }

  const switchLocale = (newLocale: string) => {
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`)
    router.push(newPath)
    setLangMenuOpen(false)
  }

  return (
    <header className="flex h-16 max-w-full shrink-0 items-center justify-between gap-1 border-b border-border bg-surface px-3 shadow-sm sm:gap-2 sm:px-4">
      {/* Left side */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onMobileMenuToggle}
          className={cn(
            "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 lg:hidden",
            mobileNavigationMode && "hidden",
          )}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        {/* Desktop sidebar toggle */}
        <button
          onClick={onToggleSidebar}
          className="hidden min-h-11 min-w-11 items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 lg:inline-flex"
          title="Toggle sidebar"
          aria-label="Toggle sidebar"
        >
          <PanelLeftClose size={20} />
        </button>

        <GlobalSearch />
      </div>

      {/* Right side */}
      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        <Link
          href={`/${locale}/asset-management/scan`}
          className="hidden min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-surface px-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 sm:h-9 sm:min-h-0 sm:min-w-0 sm:px-3 lg:inline-flex"
          title={tAssetTools("globalScanShortcut")}
          aria-label={tAssetTools("globalScanShortcut")}
        >
          <ScanLine className="h-4 w-4" />
          <span className="hidden xl:inline">{tAssetTools("globalScanShortcut")}</span>
        </Link>

        {/* Notifications */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setNotificationOpen(!notificationOpen)}
            className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
            aria-label={tNotifications("title")}
            title={tNotifications("title")}
          >
            <Bell size={20} />
            {notificationSummary.total > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white">
                {notificationSummary.total > 99 ? "99+" : notificationSummary.total}
              </span>
            ) : null}
          </button>
          {notificationOpen ? (
            <div className="absolute right-0 top-full z-50 mt-1 w-[calc(100vw-2rem)] max-w-[20rem] rounded-md border border-border bg-surface shadow-lg">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground">{tNotifications("title")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{tNotifications("subtitle")}</p>
              </div>
              <div className="max-h-80 overflow-y-auto p-2">
                {notificationSummary.items.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                    {tNotifications("empty")}
                  </div>
                ) : (
                  notificationSummary.items.map((item) => (
                    <Link
                      key={item.key}
                      href={item.href}
                      onClick={(event) => void handleNotificationClick(event, item)}
                      className="flex items-start justify-between gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{tNotifications(item.key)}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{tNotifications(`${item.key}Detail`)}</p>
                      </div>
                      <span className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                        item.tone === "danger" && "bg-danger/10 text-danger",
                        item.tone === "warning" && "bg-warning/10 text-warning",
                        item.tone === "primary" && "bg-primary/10 text-primary"
                      )}>
                        {item.count}
                      </span>
                    </Link>
                  ))
                )}
              </div>
              <div className="border-t border-border p-2">
                <Link
                  href={`/${locale}/notifications`}
                  onClick={() => setNotificationOpen(false)}
                  className="block rounded-md px-3 py-2 text-center text-sm font-medium text-primary hover:bg-accent"
                >
                  {tNotifications("openNotificationCenter")}
                </Link>
                <Link
                  href={`/${locale}/work-center`}
                  onClick={() => setNotificationOpen(false)}
                  className="block rounded-md px-3 py-2 text-center text-sm font-medium text-muted-foreground hover:bg-accent"
                >
                  {tNotifications("openWorkCenter")}
                </Link>
              </div>
            </div>
          ) : null}
        </div>

        {/* Language Switcher */}
        <div className="relative shrink-0">
          <button
            onClick={() => setLangMenuOpen(!langMenuOpen)}
            className="flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md px-2 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
            aria-label="Change language"
          >
            <Globe size={18} />
            <span className="hidden sm:inline">{locale === "th" ? "TH" : "EN"}</span>
          </button>
          {langMenuOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-32 rounded-md border border-border bg-surface py-1 shadow-lg">
              <button
                onClick={() => switchLocale("th")}
                className={cn(
                  "block w-full px-4 py-2 text-left text-sm hover:bg-accent",
                  locale === "th" && "font-medium text-primary"
                )}
              >
                🇹🇭 ภาษาไทย
              </button>
              <button
                onClick={() => switchLocale("en")}
                className={cn(
                  "block w-full px-4 py-2 text-left text-sm hover:bg-accent",
                  locale === "en" && "font-medium text-primary"
                )}
              >
                🇺🇸 English
              </button>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative shrink-0">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-2 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 sm:px-3"
            aria-label="User menu"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-white">
              {getUserInitial(user)}
            </div>
            <span className="hidden max-w-36 truncate text-sm font-medium sm:inline">{userDisplayLabel}</span>
            <ChevronDown size={16} className="hidden sm:block" />
          </button>
          {userMenuOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-[calc(100vw-2rem)] max-w-[16rem] rounded-md border border-border bg-surface py-1 shadow-lg">
              <div className="border-b border-border px-4 py-2">
                <p className="truncate text-sm font-medium">{userDisplayLabel}</p>
                {userSecondaryLabel ? (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{userSecondaryLabel}</p>
                ) : null}
              </div>
              <button
                onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-accent"
              >
                <LogOut size={16} />
                {tAuth("logout")}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
