"use client"

import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { ClipboardCheck, Ellipsis, House, Package, ScanLine, type LucideIcon } from "lucide-react"
import type { SessionUser } from "@/lib/auth-utils"
import { getMobileFieldNavigationActiveItem, type MobileFieldNavigationItem } from "@/lib/mobile-field-navigation"
import { hasNavigationPermission } from "@/lib/navigation-permissions"
import { cn } from "@/lib/utils"

type MobileFieldDestination = {
  id: MobileFieldNavigationItem
  labelKey: "mobileHome" | "mobileAssets" | "mobileScan" | "mobileAudit"
  href: string
  icon: LucideIcon
  emphasized?: boolean
}

export function MobileFieldNavigation({
  pathname,
  user,
  onOpenMore,
}: {
  pathname: string
  user: SessionUser
  onOpenMore: () => void
}) {
  const locale = useLocale()
  const t = useTranslations("nav")
  const activeItem = getMobileFieldNavigationActiveItem(pathname)
  const canViewDashboard = hasNavigationPermission(user, { module: "dashboard", action: "view" })
  const canViewAssets = hasNavigationPermission(user, { module: "asset", action: "view" })
  const canViewAudit = hasNavigationPermission(user, { module: "audit", action: "view" })
  const assetHref = canViewAssets ? `/${locale}/assets` : user.employeeId ? `/${locale}/my-assets` : null
  const destinations: MobileFieldDestination[] = [
    ...(canViewDashboard
      ? [{ id: "home" as const, labelKey: "mobileHome" as const, href: `/${locale}/dashboard`, icon: House }]
      : []),
    ...(assetHref
      ? [{ id: "assets" as const, labelKey: "mobileAssets" as const, href: assetHref, icon: Package }]
      : []),
    ...(canViewAssets
      ? [{ id: "scan" as const, labelKey: "mobileScan" as const, href: `/${locale}/asset-management/scan`, icon: ScanLine, emphasized: true }]
      : []),
    ...(canViewAudit
      ? [{ id: "audit" as const, labelKey: "mobileAudit" as const, href: `/${locale}/audit/rounds`, icon: ClipboardCheck }]
      : []),
  ]

  return (
    <nav
      data-mobile-field-navigation
      aria-label={t("mobileNavigationLabel")}
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 shadow-md backdrop-blur lg:hidden"
    >
      <div className="mx-auto flex min-h-16 max-w-lg items-end justify-around gap-1">
        {destinations.map((destination) => {
          const Icon = destination.icon
          const isActive = activeItem === destination.id

          return (
            <Link
              key={destination.id}
              href={destination.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-[11px] font-medium leading-tight text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                isActive && !destination.emphasized && "text-primary",
                destination.emphasized && "relative -mt-3 text-primary",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-md",
                  destination.emphasized && "h-12 w-12 rounded-full bg-primary text-white shadow-md",
                  isActive && !destination.emphasized && "bg-primary/10",
                )}
              >
                <Icon className={destination.emphasized ? "h-6 w-6" : "h-5 w-5"} aria-hidden="true" />
              </span>
              <span className={cn("max-w-full truncate", destination.emphasized && "font-semibold text-primary")}>
                {t(destination.labelKey)}
              </span>
            </Link>
          )
        })}

        <button
          type="button"
          onClick={onOpenMore}
          aria-current={activeItem === "more" ? "page" : undefined}
          className={cn(
            "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-[11px] font-medium leading-tight text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            activeItem === "more" && "text-primary",
          )}
        >
          <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-md", activeItem === "more" && "bg-primary/10")}>
            <Ellipsis className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="max-w-full truncate">{t("mobileMore")}</span>
        </button>
      </div>
    </nav>
  )
}
