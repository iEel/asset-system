"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations, useLocale } from "next-intl"
import {
  LayoutDashboard,
  Package,
  PackageCheck,
  ClipboardCheck,
  FileCheck2,
  BarChart3,
  Database,
  Settings,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  PackagePlus,
  ArrowRightLeft,
  FileSpreadsheet,
  LogOut,
  LogIn,
  Printer,
  ScanLine,
  Wrench,
  Trash2,
  Building2,
  GitBranch,
  Users,
  MapPin,
  Tag,
  Layers,
  Truck,
  History,
  Inbox,
  KeyRound,
  Rocket,
  Boxes,
  Handshake,
  Move,
  ClipboardList,
  ListX,
  Network,
  UserCog,
  LockKeyhole,
  HardDrive,
  SlidersHorizontal,
  X,
} from "lucide-react"
import { useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { LabelTooltip, TooltipProvider } from "@/components/ui/tooltip"
import {
  filterNavigationSectionsByPermission,
  type NavigationPermission,
} from "@/lib/navigation-permissions"
import { collectNavigationHrefs, containsNavigationHref, getActiveNavigationHref, isExactNavigationMatch } from "@/lib/navigation-active"
import type { SessionUser } from "@/lib/auth-utils"
import { countUnreadDecisions } from "@/lib/notification-groups"
import type { ShellAccount } from "@/lib/user-display"
import { SidebarAccount } from "@/components/layout/sidebar-account"
import { useShellNotifications } from "@/components/layout/shell-notifications"

type MenuItem = {
  labelKey: string
  href?: string
  permission?: NavigationPermission
  anyPermissions?: NavigationPermission[]
  icon: React.ReactNode
  children?: MenuItem[]
  // A sentence for screen readers beside the row's dot. The menu never shows a number (The One Count Rule).
  attention?: string
}

type MenuSection = {
  labelKey: "sectionDaily" | "sectionAssets" | "sectionSystem"
  items: MenuItem[]
}

// Rows sit inside the nav's px-2 gutter. The focus ring is drawn outside the row on an offset of the sidebar's own
// color, because a teal ring inside the navy active row is under 3:1.
const rowClasses =
  "relative flex min-h-11 w-full items-center gap-2.5 rounded-control px-2.5 text-sm text-sidebar-foreground transition-colors motion-reduce:transition-none hover:bg-sidebar-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar lg:min-h-10"

// The open page's row: a lighter navy with the 3px teal bar on its leading edge (spec §6.2).
const activeRowClasses =
  "bg-sidebar-active font-medium text-sidebar-active-foreground shadow-[inset_3px_0_0_var(--sidebar-active-bar)] hover:bg-sidebar-active forced-colors:outline forced-colors:outline-2 forced-colors:-outline-offset-2"

// A rail row: a 40px square centred in the 64px rail, holding only its icon (spec §6.2).
const railRowClasses = "lg:mx-auto lg:size-10 lg:justify-center lg:px-0"

export function Sidebar({
  collapsed,
  mobileOpen,
  user,
  account,
  onMobileClose,
  onMobileNavigate,
  onExpand,
}: {
  collapsed: boolean
  mobileOpen: boolean
  user: SessionUser
  account: ShellAccount
  onMobileClose: () => void
  onMobileNavigate: () => void
  onExpand: () => void
}) {
  const t = useTranslations("nav")
  const locale = useLocale()
  const pathname = usePathname()
  const mobileRestoreFocusRef = useRef<HTMLElement | null>(null)
  const { summary } = useShellNotifications()
  const waitingDecisions = countUnreadDecisions(summary?.items ?? [])

  const menuSections: MenuSection[] = [
    {
      labelKey: "sectionDaily",
      items: [
        {
          labelKey: "dashboard",
          href: `/${locale}/dashboard`,
          permission: { module: "dashboard", action: "view" },
          icon: <LayoutDashboard size={20} />,
        },
        {
          labelKey: "workCenter",
          href: `/${locale}/work-center`,
          permission: { module: "dashboard", action: "view" },
          icon: <Inbox size={20} />,
          attention: waitingDecisions > 0 ? t("workCenterWaiting", { count: waitingDecisions }) : undefined,
        },
        ...(user.employeeId
          ? [
              {
                labelKey: "myAssets",
                href: `/${locale}/my-assets`,
                icon: <PackageCheck size={20} />,
              },
            ]
          : []),
      ],
    },
    {
      labelKey: "sectionAssets",
      items: [
        {
          labelKey: "assetRegister",
          href: `/${locale}/assets`,
          permission: { module: "asset", action: "view" },
          icon: <Package size={20} />,
        },
        {
          labelKey: "assetManagement",
          icon: <Boxes size={20} />,
          children: [
            { labelKey: "addAsset", href: `/${locale}/assets/new`, permission: { module: "asset", action: "create" }, icon: <PackagePlus size={18} /> },
            { labelKey: "scanSearchAsset", href: `/${locale}/asset-management/scan`, permission: { module: "asset", action: "view" }, icon: <ScanLine size={18} /> },
            { labelKey: "printLabels", href: `/${locale}/asset-management/labels`, permission: { module: "asset", action: "view" }, icon: <Printer size={18} /> },
            { labelKey: "importExport", href: `/${locale}/asset-management/import-export`, permission: { module: "asset", action: "view" }, icon: <FileSpreadsheet size={18} /> },
          ],
        },
        {
          labelKey: "assetTransactionsGroup",
          icon: <Handshake size={20} />,
          children: [
            { labelKey: "checkout", href: `/${locale}/asset-management/checkout`, permission: { module: "asset", action: "edit" }, icon: <LogOut size={18} /> },
            { labelKey: "checkin", href: `/${locale}/asset-management/checkin`, permission: { module: "asset", action: "edit" }, icon: <LogIn size={18} /> },
            { labelKey: "transfer", href: `/${locale}/asset-management/transfer`, permission: { module: "asset", action: "edit" }, icon: <ArrowRightLeft size={18} /> },
            { labelKey: "bulkMove", href: `/${locale}/asset-management/bulk-move`, permission: { module: "asset", action: "edit" }, icon: <Move size={18} /> },
          ],
        },
        {
          labelKey: "audit",
          icon: <ClipboardCheck size={20} />,
          children: [
            { labelKey: "auditRound", href: `/${locale}/audit/rounds`, permission: { module: "audit", action: "view" }, icon: <ClipboardList size={18} /> },
            { labelKey: "auditFinding", href: `/${locale}/audit/findings`, permission: { module: "audit", action: "view" }, icon: <ListX size={18} /> },
          ],
        },
        {
          labelKey: "maintenance",
          href: `/${locale}/maintenance`,
          permission: { module: "maintenance", action: "view" },
          icon: <Wrench size={20} />,
        },
        {
          labelKey: "disposal",
          href: `/${locale}/disposal`,
          permission: { module: "disposal", action: "view" },
          icon: <Trash2 size={20} />,
        },
      ],
    },
    {
      labelKey: "sectionSystem",
      items: [
        {
          labelKey: "reports",
          href: `/${locale}/reports`,
          permission: { module: "report", action: "view" },
          icon: <BarChart3 size={20} />,
        },
        {
          labelKey: "masterData",
          icon: <Database size={20} />,
          children: [
            { labelKey: "company", href: `/${locale}/master-data/companies`, permission: { module: "company", action: "view" }, icon: <Building2 size={18} /> },
            { labelKey: "branch", href: `/${locale}/master-data/branches`, permission: { module: "branch", action: "view" }, icon: <GitBranch size={18} /> },
            { labelKey: "department", href: `/${locale}/master-data/departments`, permission: { module: "department", action: "view" }, icon: <Network size={18} /> },
            { labelKey: "employee", href: `/${locale}/master-data/employees`, permission: { module: "employee", action: "view" }, icon: <Users size={18} /> },
            { labelKey: "location", href: `/${locale}/master-data/locations`, permission: { module: "location", action: "view" }, icon: <MapPin size={18} /> },
            { labelKey: "category", href: `/${locale}/master-data/categories`, permission: { module: "category", action: "view" }, icon: <Tag size={18} /> },
            { labelKey: "brandModel", href: `/${locale}/master-data/brands`, permission: { module: "brand", action: "view" }, icon: <Layers size={18} /> },
            { labelKey: "supplier", href: `/${locale}/master-data/suppliers`, permission: { module: "supplier", action: "view" }, icon: <Truck size={18} /> },
          ],
        },
        {
          labelKey: "administration",
          icon: <Settings size={20} />,
          children: [
            { labelKey: "userManagement", href: `/${locale}/admin/users`, permission: { module: "user", action: "view" }, icon: <UserCog size={18} /> },
            { labelKey: "rolePermission", href: `/${locale}/admin/roles`, permission: { module: "role", action: "view" }, icon: <LockKeyhole size={18} /> },
            {
              labelKey: "approvalInbox",
              href: `/${locale}/admin/approvals`,
              anyPermissions: [
                { module: "disposal", action: "approve" },
                { module: "audit", action: "approve" },
              ],
              icon: <FileCheck2 size={18} />,
            },
            { labelKey: "dataQuality", href: `/${locale}/admin/data-quality`, permission: { module: "setting", action: "view" }, icon: <ShieldAlert size={18} /> },
            { labelKey: "integrationApi", href: `/${locale}/admin/integrations`, permission: { module: "setting", action: "view" }, icon: <KeyRound size={18} /> },
            { labelKey: "fileStorage", href: `/${locale}/admin/storage`, permission: { module: "setting", action: "view" }, icon: <HardDrive size={18} /> },
            { labelKey: "productionReadiness", href: `/${locale}/admin/readiness`, permission: { module: "setting", action: "view" }, icon: <Rocket size={18} /> },
            { labelKey: "systemLog", href: `/${locale}/admin/logs`, permission: { module: "system", action: "view" }, icon: <History size={18} /> },
            { labelKey: "systemSetting", href: `/${locale}/admin/settings`, permission: { module: "setting", action: "view" }, icon: <SlidersHorizontal size={18} /> },
          ],
        },
      ],
    },
  ]
  const visibleSections = filterNavigationSectionsByPermission(menuSections, user)
  const activeHref = getActiveNavigationHref(
    pathname,
    visibleSections.flatMap((section) => collectNavigationHrefs(section.items)),
  )

  const renderBody = (mobile: boolean) => {
    const bodyCollapsed = mobile ? false : collapsed

    return (
      <>
        {/* Brand */}
        <div className="flex h-14 min-w-0 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-4">
          <Image
            src="/icons/icon-192.png"
            alt=""
            aria-hidden="true"
            width={32}
            height={32}
            loading="eager"
            className="h-8 w-8 shrink-0 rounded-md ring-1 ring-app-icon-frame"
          />
          <span className={cn("min-w-0 truncate text-sm font-semibold text-sidebar-foreground", bodyCollapsed && "lg:sr-only")}>
            {t("brandName")}
          </span>
          {mobile ? (
            <Button variant="ghost" size="icon" onClick={onMobileClose} className="ml-auto text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-active-foreground focus-visible:ring-sidebar-ring focus-visible:ring-offset-sidebar" aria-label={t("closeMenu")}>
              <X aria-hidden="true" />
            </Button>
          ) : null}
        </div>

        {/* Menu */}
        <nav aria-label={t("mainNavigation")} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3">
          {visibleSections.map((section, index) => {
            // The body renders twice (desktop aside and mobile drawer), so heading ids must differ.
            const headingId = `${mobile ? "mobile-" : ""}nav-section-${section.labelKey}`
            return (
              <div key={section.labelKey} role="group" aria-labelledby={headingId} className={cn(index > 0 && "mt-4")}>
                {bodyCollapsed && index > 0 ? (
                  <div aria-hidden="true" className="mx-2 mb-3 hidden h-px bg-sidebar-border lg:block" />
                ) : null}
                <p id={headingId} className={cn("flex h-6 items-center px-2.5 text-xs font-medium text-sidebar-muted", bodyCollapsed && "lg:sr-only")}>
                  {t(section.labelKey)}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <SidebarItem
                      key={item.labelKey}
                      item={item}
                      collapsed={bodyCollapsed}
                      activeHref={activeHref}
                      pathname={pathname}
                      t={t}
                      onNavigate={onMobileNavigate}
                      onExpand={onExpand}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </nav>
        {mobile ? null : <SidebarAccount user={user} account={account} collapsed={bodyCollapsed} />}
      </>
    )
  }

  return (
    <>
      <aside
        id="desktop-primary-navigation"
        className={cn(
          "relative hidden max-h-dvh flex-col bg-sidebar text-sidebar-foreground scheme-dark transition-all duration-300 motion-reduce:transition-none lg:flex",
          collapsed ? "lg:w-16" : "lg:w-64"
        )}
      >
        {/* Radix tooltips need a provider; in the rail a row names itself after 300 ms of hover, at once on focus. */}
        <TooltipProvider delayDuration={300}>
          {renderBody(false)}
        </TooltipProvider>
      </aside>

      <Sheet
        open={mobileOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) onMobileClose()
        }}
      >
        <SheetContent
          side="left"
          id="mobile-primary-navigation-drawer"
          showCloseButton={false}
          aria-describedby={undefined}
          onOpenAutoFocus={() => {
            mobileRestoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
          }}
          onCloseAutoFocus={(event) => {
            // The bottom "More" button unmounts while the drawer is open, so fall back to its re-rendered copy.
            const opener = mobileRestoreFocusRef.current
            const target =
              opener?.isConnected && opener !== document.body
                ? opener
                : document.querySelector<HTMLElement>('[aria-controls="mobile-primary-navigation-drawer"]')
            if (!target?.isConnected) return
            event.preventDefault()
            target.focus()
          }}
          className="w-[min(18rem,85vw)] gap-0 border-r border-sidebar-border bg-sidebar p-0 text-sidebar-foreground scheme-dark lg:hidden"
        >
          <SheetTitle className="sr-only">{t("mainNavigation")}</SheetTitle>
          {/* The rows' tooltips stay off in the drawer, but a Radix Tooltip Root throws without a provider. */}
          <TooltipProvider delayDuration={300}>
            {renderBody(true)}
          </TooltipProvider>
        </SheetContent>
      </Sheet>
    </>
  )
}

type SidebarItemProps = {
  item: MenuItem
  collapsed: boolean
  activeHref: string | null
  pathname: string
  t: (key: string) => string
  onNavigate: () => void
  onExpand: () => void
}

function SidebarItem(props: SidebarItemProps) {
  return props.item.children ? <SidebarGroup {...props} /> : <SidebarLink {...props} />
}

// The menu is at most two levels deep (spec 2B B1), so a group's rows always sit 20px in.
// The rail never shows a group's children: a click on a rail group expands the menu and opens that group (spec §6.2).
function SidebarGroup({ item, collapsed, activeHref, pathname, t, onNavigate, onExpand }: SidebarItemProps) {
  const containsActive = containsNavigationHref(item, activeHref)
  const [open, setOpen] = useState(containsActive)
  const [seenActiveHref, setSeenActiveHref] = useState(activeHref)
  const expanded = open && !collapsed

  // After navigation, open the group that holds the current page. Groups the user opened stay open.
  if (seenActiveHref !== activeHref) {
    setSeenActiveHref(activeHref)
    if (containsActive) setOpen(true)
  }

  return (
    <div>
      <LabelTooltip label={t(item.labelKey)} enabled={collapsed}>
        <button
          type="button"
          onClick={() => {
            if (collapsed) {
              setOpen(true)
              onExpand()
            } else setOpen(!open)
          }}
          aria-expanded={expanded}
          className={cn(
            rowClasses,
            "font-medium",
            expanded && "font-semibold text-sidebar-active-foreground",
            collapsed && railRowClasses,
            collapsed && containsActive && activeRowClasses,
          )}
        >
          <span className={cn("shrink-0 text-sidebar-muted", collapsed && containsActive && "text-sidebar-active-icon")}>{item.icon}</span>
          <span className={cn("flex-1 truncate text-left", collapsed && "lg:sr-only")}>{t(item.labelKey)}</span>
          <span aria-hidden="true" className={cn("shrink-0 text-sidebar-muted", collapsed && "lg:hidden")}>
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
        </button>
      </LabelTooltip>
      {expanded && (
        <div className="mt-0.5 ml-5 space-y-0.5 border-l border-sidebar-border pl-1">
          {item.children?.map((child) => (
            <SidebarItem
              key={child.labelKey}
              item={child}
              collapsed={collapsed}
              activeHref={activeHref}
              pathname={pathname}
              t={t}
              onNavigate={onNavigate}
              onExpand={onExpand}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SidebarLink({ item, collapsed, activeHref, pathname, t, onNavigate }: SidebarItemProps) {
  const isActive = item.href !== undefined && item.href === activeHref
  const ariaCurrent = isActive && item.href !== undefined ? (isExactNavigationMatch(pathname, item.href) ? "page" : "true") : undefined

  return (
    <LabelTooltip label={t(item.labelKey)} enabled={collapsed}>
      <Link
        href={item.href || "#"}
        onClick={onNavigate}
        aria-current={ariaCurrent}
        className={cn(
          rowClasses,
          isActive && activeRowClasses,
          collapsed && railRowClasses
        )}
      >
        <span className={cn("shrink-0 text-sidebar-muted", isActive && "text-sidebar-active-icon")}>{item.icon}</span>
        <span className={cn("truncate", collapsed && "lg:sr-only")}>{t(item.labelKey)}</span>
        {item.attention ? (
          <>
            <span aria-hidden="true" className={cn("ml-auto size-2 shrink-0 rounded-full bg-sidebar-dot", collapsed && "lg:absolute lg:right-1 lg:top-1 lg:ml-0")} />
            <span className="sr-only">{item.attention}</span>
          </>
        ) : null}
      </Link>
    </LabelTooltip>
  )
}
