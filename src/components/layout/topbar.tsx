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
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { GlobalSearch } from "@/components/layout/global-search"

type NotificationItem = {
  key: string
  count: number
  href: string
  tone: "danger" | "warning" | "primary"
}

type NotificationSummary = {
  total: number
  items: NotificationItem[]
}

export function Topbar({
  onToggleSidebar,
  onMobileMenuToggle,
}: {
  onToggleSidebar: () => void
  onMobileMenuToggle: () => void
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
  const [notificationSummary, setNotificationSummary] = useState<NotificationSummary>({ total: 0, items: [] })

  useEffect(() => {
    let cancelled = false
    fetch(`/api/notifications?locale=${locale}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: NotificationSummary | null) => {
        if (!cancelled && data) setNotificationSummary(data)
      })
      .catch(() => {
        if (!cancelled) setNotificationSummary({ total: 0, items: [] })
      })
    return () => {
      cancelled = true
    }
  }, [locale])

  const switchLocale = (newLocale: string) => {
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`)
    router.push(newPath)
    setLangMenuOpen(false)
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border bg-surface px-3 shadow-sm sm:px-4">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onMobileMenuToggle}
          className="rounded-md p-2 hover:bg-accent lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        {/* Desktop sidebar toggle */}
        <button
          onClick={onToggleSidebar}
          className="hidden rounded-md p-2 hover:bg-accent lg:block"
          title="Toggle sidebar"
        >
          <PanelLeftClose size={20} />
        </button>

        <GlobalSearch />
      </div>

      {/* Right side */}
      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        <Link
          href={`/${locale}/asset-management/scan`}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-surface px-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary sm:px-3"
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
            className="relative rounded-md p-2 hover:bg-accent"
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
            <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-md border border-border bg-surface shadow-lg">
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
                      onClick={() => setNotificationOpen(false)}
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
                  href={`/${locale}/work-center`}
                  onClick={() => setNotificationOpen(false)}
                  className="block rounded-md px-3 py-2 text-center text-sm font-medium text-primary hover:bg-accent"
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
            className="flex items-center gap-1 rounded-md px-2 py-2 text-sm hover:bg-accent"
            aria-label="Change language"
          >
            <Globe size={18} />
            <span className="hidden sm:inline">{locale === "th" ? "TH" : "EN"}</span>
          </button>
          {langMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-32 rounded-md border border-border bg-surface py-1 shadow-lg z-50">
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
            className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-accent sm:px-3"
            aria-label="User menu"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-white">
              A
            </div>
            <span className="hidden text-sm font-medium sm:inline">Admin</span>
            <ChevronDown size={16} className="hidden sm:block" />
          </button>
          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-md border border-border bg-surface py-1 shadow-lg z-50">
              <div className="border-b border-border px-4 py-2">
                <p className="text-sm font-medium">System Admin</p>
                <p className="text-xs text-muted-foreground">admin@company.com</p>
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
