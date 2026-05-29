"use client"

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
  Rocket,
  X,
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  filterNavigationItemsByPermission,
  type NavigationPermission,
} from "@/lib/navigation-permissions"
import type { SessionUser } from "@/lib/auth-utils"

type MenuItem = {
  labelKey: string
  href?: string
  permission?: NavigationPermission
  anyPermissions?: NavigationPermission[]
  icon: React.ReactNode
  children?: MenuItem[]
}

export function Sidebar({
  collapsed,
  mobileOpen,
  user,
  onMobileClose,
}: {
  collapsed: boolean
  mobileOpen: boolean
  user: SessionUser
  onMobileClose: () => void
}) {
  const t = useTranslations("nav")
  const locale = useLocale()
  const pathname = usePathname()

  const menuItems: MenuItem[] = [
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
    {
      labelKey: "assetManagement",
      icon: <Package size={20} />,
      children: [
        {
          labelKey: "assetRegistryGroup",
          icon: <Package size={18} />,
          children: [
            { labelKey: "assetRegister", href: `/${locale}/assets`, permission: { module: "asset", action: "view" }, icon: <Package size={18} /> },
            { labelKey: "addAsset", href: `/${locale}/assets/new`, permission: { module: "asset", action: "create" }, icon: <PackagePlus size={18} /> },
            { labelKey: "scanSearchAsset", href: `/${locale}/asset-management/scan`, permission: { module: "asset", action: "view" }, icon: <ScanLine size={18} /> },
            { labelKey: "printLabels", href: `/${locale}/asset-management/labels`, permission: { module: "asset", action: "view" }, icon: <Printer size={18} /> },
            { labelKey: "importExport", href: `/${locale}/asset-management/import-export`, permission: { module: "asset", action: "view" }, icon: <FileSpreadsheet size={18} /> },
          ],
        },
        {
          labelKey: "assetTransactionsGroup",
          icon: <ArrowRightLeft size={18} />,
          children: [
            { labelKey: "checkout", href: `/${locale}/asset-management/checkout`, permission: { module: "asset", action: "edit" }, icon: <LogOut size={18} /> },
            { labelKey: "checkin", href: `/${locale}/asset-management/checkin`, permission: { module: "asset", action: "edit" }, icon: <LogIn size={18} /> },
            { labelKey: "transfer", href: `/${locale}/asset-management/transfer`, permission: { module: "asset", action: "edit" }, icon: <ArrowRightLeft size={18} /> },
            { labelKey: "bulkMove", href: `/${locale}/asset-management/bulk-move`, permission: { module: "asset", action: "edit" }, icon: <MapPin size={18} /> },
          ],
        },
      ],
    },
    {
      labelKey: "masterData",
      icon: <Database size={20} />,
      children: [
        { labelKey: "company", href: `/${locale}/master-data/companies`, permission: { module: "company", action: "view" }, icon: <Building2 size={18} /> },
        { labelKey: "branch", href: `/${locale}/master-data/branches`, permission: { module: "branch", action: "view" }, icon: <GitBranch size={18} /> },
        { labelKey: "department", href: `/${locale}/master-data/departments`, permission: { module: "department", action: "view" }, icon: <Users size={18} /> },
        { labelKey: "employee", href: `/${locale}/master-data/employees`, permission: { module: "employee", action: "view" }, icon: <Users size={18} /> },
        { labelKey: "location", href: `/${locale}/master-data/locations`, permission: { module: "location", action: "view" }, icon: <MapPin size={18} /> },
        { labelKey: "category", href: `/${locale}/master-data/categories`, permission: { module: "category", action: "view" }, icon: <Tag size={18} /> },
        { labelKey: "brandModel", href: `/${locale}/master-data/brands`, permission: { module: "brand", action: "view" }, icon: <Layers size={18} /> },
        { labelKey: "supplier", href: `/${locale}/master-data/suppliers`, permission: { module: "supplier", action: "view" }, icon: <Truck size={18} /> },
      ],
    },
    {
      labelKey: "reports",
      href: `/${locale}/reports`,
      permission: { module: "report", action: "view" },
      icon: <BarChart3 size={20} />,
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
    {
      labelKey: "audit",
      icon: <ClipboardCheck size={20} />,
      children: [
        { labelKey: "auditRound", href: `/${locale}/audit/rounds`, permission: { module: "audit", action: "view" }, icon: <ClipboardCheck size={18} /> },
        { labelKey: "auditFinding", href: `/${locale}/audit/findings`, permission: { module: "audit", action: "view" }, icon: <History size={18} /> },
      ],
    },
    {
      labelKey: "administration",
      icon: <Settings size={20} />,
      children: [
        { labelKey: "userManagement", href: `/${locale}/admin/users`, permission: { module: "user", action: "view" }, icon: <Users size={18} /> },
        { labelKey: "rolePermission", href: `/${locale}/admin/roles`, permission: { module: "role", action: "view" }, icon: <Settings size={18} /> },
        {
          labelKey: "approvalInbox",
          href: `/${locale}/admin/approvals`,
          anyPermissions: [
            { module: "disposal", action: "approve" },
            { module: "maintenance", action: "edit" },
            { module: "audit", action: "approve" },
          ],
          icon: <FileCheck2 size={18} />,
        },
        { labelKey: "dataQuality", href: `/${locale}/admin/data-quality`, permission: { module: "setting", action: "view" }, icon: <ShieldAlert size={18} /> },
        { labelKey: "fileStorage", href: `/${locale}/admin/storage`, permission: { module: "setting", action: "view" }, icon: <Database size={18} /> },
        { labelKey: "productionReadiness", href: `/${locale}/admin/readiness`, permission: { module: "setting", action: "view" }, icon: <Rocket size={18} /> },
        { labelKey: "systemLog", href: `/${locale}/admin/logs`, permission: { module: "system", action: "view" }, icon: <History size={18} /> },
        { labelKey: "systemSetting", href: `/${locale}/admin/settings`, permission: { module: "setting", action: "view" }, icon: <Settings size={18} /> },
      ],
    },
  ]
  const visibleMenuItems = filterNavigationItemsByPermission(menuItems, user)

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex max-h-dvh flex-col border-r border-border bg-sidebar transition-all duration-300 lg:relative",
        collapsed ? "w-[min(18rem,85vw)] lg:w-16" : "w-[min(18rem,85vw)] lg:w-64",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 min-w-0 items-center border-b border-border px-4">
        <Package className="h-8 w-8 shrink-0 text-primary" />
        <span className={cn("ml-3 truncate text-lg font-semibold text-primary", collapsed && "lg:hidden")}>
          AMS
        </span>
        <button
          type="button"
          onClick={onMobileClose}
          className="ml-auto inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-sm text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 lg:hidden"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Menu */}
      <nav className="min-h-0 flex-1 overflow-y-auto py-4">
        {visibleMenuItems.map((item) => (
          <SidebarItem
            key={item.labelKey}
            item={item}
            collapsed={collapsed}
            pathname={pathname}
            t={t}
            onNavigate={onMobileClose}
          />
        ))}
      </nav>
    </aside>
  )
}

function SidebarItem({
  item,
  collapsed,
  pathname,
  t,
  onNavigate,
  depth = 0,
}: {
  item: MenuItem
  collapsed: boolean
  pathname: string
  t: (key: string) => string
  onNavigate: () => void
  depth?: number
}) {
  const [open, setOpen] = useState(false)
  const isActive = item.href ? pathname === item.href : false
  const hasActiveChild = hasActiveDescendant(item, pathname)

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
            hasActiveChild && "text-primary",
            collapsed && "lg:justify-center lg:px-2"
          )}
        >
          <span className="shrink-0">{item.icon}</span>
          <span className={cn("flex-1 text-left truncate", collapsed && "lg:hidden")}>{t(item.labelKey)}</span>
          <span className={cn(collapsed && "lg:hidden")}>
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
        </button>
        {open && (
          <div className={cn("border-l border-border", depth === 0 ? "ml-4" : "ml-6")}>
            {item.children.map((child) => (
              <SidebarItem
                key={child.labelKey}
                item={child}
                collapsed={collapsed}
                pathname={pathname}
                t={t}
                onNavigate={onNavigate}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      href={item.href || "#"}
      onClick={onNavigate}
      className={cn(
        "flex min-h-11 items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
        isActive
          ? "bg-primary/10 font-medium text-primary border-r-2 border-primary"
          : "text-muted-foreground",
        collapsed && "lg:justify-center lg:px-2"
      )}
    >
      <span className="shrink-0">{item.icon}</span>
      <span className={cn("truncate", collapsed && "lg:hidden")}>{t(item.labelKey)}</span>
    </Link>
  )
}

function hasActiveDescendant(item: MenuItem, pathname: string): boolean {
  return item.children?.some((child) => {
    if (child.href) return pathname.startsWith(child.href)
    return hasActiveDescendant(child, pathname)
  }) ?? false
}
