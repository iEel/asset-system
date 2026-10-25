"use client"

import Link from "next/link"
import { useTranslations, useLocale } from "next-intl"
import { useRouter, usePathname } from "next/navigation"
import {
  Menu,
  Globe,
  ScanLine,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { GlobalSearch } from "@/components/layout/global-search"
import { MobileSearchSheet } from "@/components/layout/mobile-search-sheet"
import { NotificationBell } from "@/components/layout/notification-bell"
import { useNavigationMenu } from "@/components/layout/sidebar"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { switchLocalePath } from "@/lib/locale-path"
import { hasNavigationPermission } from "@/lib/navigation-permissions"
import type { SessionUser } from "@/lib/auth-utils"

export function Topbar({
  user,
  sidebarCollapsed,
  onToggleSidebar,
  onOpenMoreSheet,
  moreSheetOpen,
  mobileNavigationMode,
}: {
  user: SessionUser
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
  onOpenMoreSheet: (trigger: HTMLButtonElement) => void
  moreSheetOpen: boolean
  mobileNavigationMode: boolean
}) {
  const tAssetTools = useTranslations("assetTools")
  const tNav = useTranslations("nav")
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  // The phone's title is the open menu row's label, else the brand name (spec §6.6).
  const { activeLabel } = useNavigationMenu(user)
  const localeCode = locale === "th" ? "TH" : "EN"
  const canViewAssets = hasNavigationPermission(user, { module: "asset", action: "view" })
  const canCreateAssets = hasNavigationPermission(user, { module: "asset", action: "create" })
  // The toggle names what a press does, and aria-expanded says whether the menu is open (spec §6.2).
  const sidebarToggleLabel = tNav(sidebarCollapsed ? "expandSidebar" : "collapseSidebar")

  const switchLocale = (newLocale: string) => {
    router.push(switchLocalePath(pathname, locale, newLocale))
  }

  return (
    <header className="flex h-14 max-w-full shrink-0 items-center justify-between gap-1 border-b border-chrome-border bg-chrome px-3 sm:gap-2 sm:px-4">
      {/* Left side */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {/* Focus pages' menu button: it opens the เพิ่มเติม sheet, as the bottom bar's เพิ่มเติม does on other pages. */}
        <Button
          variant="ghost"
          size="icon"
          onClick={(event) => onOpenMoreSheet(event.currentTarget)}
          className={cn("lg:hidden", mobileNavigationMode && "hidden")}
          aria-label={tNav("openMenu")}
          aria-haspopup="dialog"
          aria-expanded={moreSheetOpen}
          aria-controls="mobile-more-sheet"
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

        {/* The phone's title shows only with the bottom menu; focus task pages keep their own task header (spec §6.6). */}
        <p className={cn("min-w-0 truncate text-base font-semibold text-foreground lg:hidden", !mobileNavigationMode && "hidden")}>{activeLabel ?? tNav("brandName")}</p>

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

        {/* On the phone the bell shows only with the bottom menu (spec §6.6). */}
        <div className={cn("relative shrink-0", !mobileNavigationMode && "hidden lg:block")}>
          <NotificationBell user={user} />
        </div>

        {/* Language Switcher: on the phone it lives in the เพิ่มเติม sheet. */}
        <div className="relative hidden shrink-0 lg:block">
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

        <div className="hidden lg:block">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
