"use client"

import Link from "next/link"
import { useTranslations, useLocale } from "next-intl"
import { useRouter, usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  Menu,
  Globe,
  LogOut,
  ScanLine,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { GlobalSearch } from "@/components/layout/global-search"
import { MobileSearchSheet } from "@/components/layout/mobile-search-sheet"
import { NotificationBell } from "@/components/layout/notification-bell"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
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
import { getUserDisplayLabel, getUserInitial, getUserSecondaryLabel } from "@/lib/user-display"
import { hasNavigationPermission } from "@/lib/navigation-permissions"
import type { SessionUser } from "@/lib/auth-utils"

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
  const tNav = useTranslations("nav")
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const userDisplayLabel = getUserDisplayLabel(user)
  const userSecondaryLabel = getUserSecondaryLabel(user)
  const localeCode = locale === "th" ? "TH" : "EN"
  const canViewAssets = hasNavigationPermission(user, { module: "asset", action: "view" })
  const canCreateAssets = hasNavigationPermission(user, { module: "asset", action: "create" })
  // The toggle names what a press does, and aria-expanded says whether the menu is open (spec §6.2).
  const sidebarToggleLabel = tNav(sidebarCollapsed ? "expandSidebar" : "collapseSidebar")

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

        <GlobalSearch canViewAssets={canViewAssets} canCreateAssets={canCreateAssets} />
      </div>

      {/* Right side: it keeps its width, so at 200% zoom the search narrows instead of running under the bell (D18). */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <MobileSearchSheet canViewAssets={canViewAssets} canCreateAssets={canCreateAssets} />

        <Link
          href={`/${locale}/asset-management/scan`}
          className={cn(buttonVariants({ variant: "outline", size: "icon" }), "hidden lg:inline-flex")}
          title={tAssetTools("globalScanShortcut")}
          aria-label={tAssetTools("globalScanShortcut")}
        >
          <ScanLine aria-hidden="true" className="size-5" />
        </Link>

        <div className="relative shrink-0">
          <NotificationBell user={user} />
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
