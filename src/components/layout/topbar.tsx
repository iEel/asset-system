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
  PanelLeftOpen,
} from "lucide-react"
import { useState, type MouseEvent as ReactMouseEvent } from "react"
import { cn } from "@/lib/utils"
import { formatCount } from "@/lib/display-format"
import { GlobalSearch } from "@/components/layout/global-search"
import { useShellNotifications } from "@/components/layout/shell-notifications"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { EmptyNote } from "@/components/ui/empty-note"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { getUserDisplayLabel, getUserInitial, getUserSecondaryLabel } from "@/lib/user-display"
import type { SessionUser } from "@/lib/auth-utils"
import { isPlainPrimaryClick, type NotificationClientItem } from "@/lib/notification-client-sync"
import { hasNavigationPermission } from "@/lib/navigation-permissions"

export function Topbar({
  user,
  sidebarCollapsed,
  onToggleSidebar,
  onMobileMenuToggle,
  mobileNavigationMode,
}: {
  user: SessionUser
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
  onMobileMenuToggle: () => void
  mobileNavigationMode: boolean
}) {
  const tAuth = useTranslations("auth")
  const tAssetTools = useTranslations("assetTools")
  const tNotifications = useTranslations("notifications")
  const tNav = useTranslations("nav")
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [notificationOpen, setNotificationOpen] = useState(false)
  // The shell's provider owns the fetch and the polling (menu B shell task 3); the bell only reads its summary.
  const { summary: notificationSummary, markRead } = useShellNotifications()
  const notificationTotal = notificationSummary?.total ?? 0
  const userDisplayLabel = getUserDisplayLabel(user)
  const userSecondaryLabel = getUserSecondaryLabel(user)
  // C2: the work center needs dashboard:view, so the bell offers it only to people who can open it.
  const canOpenWorkCenter = hasNavigationPermission(user, { module: "dashboard", action: "view" })
  const localeCode = locale === "th" ? "TH" : "EN"
  // The toggle names what a press does, and aria-expanded says whether the menu is open (spec §6.2).
  const sidebarToggleLabel = tNav(sidebarCollapsed ? "expandSidebar" : "collapseSidebar")
  // Read and snoozed rows stay out of the bell for now; Task 7 lists them as read.
  const notificationItems = notificationSummary?.items.filter((item) => !item.isSuppressed) ?? []

  const handleNotificationClick = async (
    event: ReactMouseEvent<HTMLAnchorElement>,
    item: NotificationClientItem,
  ) => {
    if (!isPlainPrimaryClick(event)) {
      setNotificationOpen(false)
      return
    }

    event.preventDefault()
    try {
      await markRead(item.key)
    } finally {
      setNotificationOpen(false)
      router.push(item.href)
    }
  }

  const switchLocale = (newLocale: string) => {
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`)
    router.push(newPath)
  }

  return (
    <header className="flex h-14 max-w-full shrink-0 items-center justify-between gap-1 border-b border-chrome-border bg-chrome px-3 sm:gap-2 sm:px-4">
      {/* Left side */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMobileMenuToggle}
          className={cn("lg:hidden", mobileNavigationMode && "hidden")}
          aria-label={tNav("openMenu")}
        >
          <Menu aria-hidden="true" className="size-5" />
        </Button>

        {/* Desktop sidebar toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="hidden lg:inline-flex"
          aria-expanded={!sidebarCollapsed}
          aria-controls="desktop-primary-navigation"
          title={sidebarToggleLabel}
          aria-label={sidebarToggleLabel}
        >
          {sidebarCollapsed ? <PanelLeftOpen aria-hidden="true" className="size-5" /> : <PanelLeftClose aria-hidden="true" className="size-5" />}
        </Button>

        <GlobalSearch />
      </div>

      {/* Right side: it keeps its width, so at 200% zoom the search narrows instead of running under the bell (D18). */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <Link
          href={`/${locale}/asset-management/scan`}
          className={cn(buttonVariants({ variant: "outline", size: "icon" }), "hidden lg:inline-flex")}
          title={tAssetTools("globalScanShortcut")}
          aria-label={tAssetTools("globalScanShortcut")}
        >
          <ScanLine aria-hidden="true" className="size-5" />
        </Link>

        {/* Notifications */}
        <div className="relative shrink-0">
          <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                aria-label={tNotifications("title")}
                title={tNotifications("title")}
              >
                <Bell aria-hidden="true" className="size-5" />
                {notificationTotal > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-xs font-semibold leading-none text-danger-foreground">
                    {notificationTotal > 99 ? "99+" : notificationTotal}
                  </span>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[calc(100vw-2rem)] max-w-[20rem] p-0">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground">{tNotifications("title")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{tNotifications("subtitle")}</p>
              </div>
              <div className="max-h-80 overflow-y-auto p-2">
                {notificationItems.length === 0 ? (
                  <EmptyNote className="px-3 py-3">{tNotifications("empty")}</EmptyNote>
                ) : (
                  notificationItems.map((item) => (
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
                      <StatusBadge label={formatCount(item.count)} tone={item.tone} />
                    </Link>
                  ))
                )}
              </div>
              <div className="grid gap-1 border-t border-border p-2">
                <Link
                  href={`/${locale}/notifications`}
                  onClick={() => setNotificationOpen(false)}
                  className={cn(buttonVariants({ variant: "outline", size: "md" }), "w-full")}
                >
                  {tNotifications("openNotificationCenter")}
                </Link>
                {canOpenWorkCenter ? (
                  <Link
                    href={`/${locale}/work-center`}
                    onClick={() => setNotificationOpen(false)}
                    className={cn(buttonVariants({ variant: "ghost", size: "md" }), "w-full")}
                  >
                    {tNotifications("openWorkCenter")}
                  </Link>
                ) : null}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Language Switcher */}
        <div className="relative shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="md" aria-label={tNav("languageMenu", { code: localeCode })}>
                <Globe aria-hidden="true" />
                <span className="hidden sm:inline">{localeCode}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup value={locale} onValueChange={(next) => {
                if (next !== locale) switchLocale(next)
              }}>
                <DropdownMenuRadioItem value="th">
                  <span lang="th">ภาษาไทย</span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="en">
                  <span lang="en">English</span>
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <ThemeToggle />

        {/* User Menu */}
        <div className="relative shrink-0 lg:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="md" className="gap-2 text-foreground" aria-label={tNav("userMenu", { name: userDisplayLabel })}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                  {getUserInitial(user)}
                </span>
                <span className="hidden max-w-36 truncate sm:inline">{userDisplayLabel}</span>
                <ChevronDown aria-hidden="true" className="hidden sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] max-w-[16rem]">
              <DropdownMenuLabel className="py-1.5 text-sm font-normal text-foreground">
                <span className="block truncate font-medium">{userDisplayLabel}</span>
                {userSecondaryLabel ? <span className="block truncate text-meta text-faint-foreground">{userSecondaryLabel}</span> : null}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => void signOut({ callbackUrl: `/${locale}/login` })}>
                <LogOut aria-hidden="true" />
                {tAuth("logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
