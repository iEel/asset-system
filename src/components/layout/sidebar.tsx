"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations, useLocale } from "next-intl"
import {
  LayoutDashboard,
  Package,
  ClipboardCheck,
  BarChart3,
  Database,
  Settings,
  ChevronDown,
  ChevronRight,
  PackagePlus,
  ArrowRightLeft,
  LogOut,
  LogIn,
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
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

type MenuItem = {
  labelKey: string
  href?: string
  icon: React.ReactNode
  children?: MenuItem[]
}

export function Sidebar({
  collapsed,
  mobileOpen,
  onMobileClose,
}: {
  collapsed: boolean
  mobileOpen: boolean
  onMobileClose: () => void
}) {
  const t = useTranslations("nav")
  const locale = useLocale()
  const pathname = usePathname()

  const menuItems: MenuItem[] = [
    {
      labelKey: "dashboard",
      href: `/${locale}/dashboard`,
      icon: <LayoutDashboard size={20} />,
    },
    {
      labelKey: "assetManagement",
      icon: <Package size={20} />,
      children: [
        { labelKey: "assetRegister", href: `/${locale}/assets`, icon: <Package size={18} /> },
        { labelKey: "addAsset", href: `/${locale}/assets/new`, icon: <PackagePlus size={18} /> },
        { labelKey: "checkout", href: `/${locale}/asset-management/checkout`, icon: <LogOut size={18} /> },
        { labelKey: "checkin", href: `/${locale}/asset-management/checkin`, icon: <LogIn size={18} /> },
        { labelKey: "transfer", href: `/${locale}/asset-management/transfer`, icon: <ArrowRightLeft size={18} /> },
        { labelKey: "bulkMove", href: `/${locale}/asset-management/bulk-move`, icon: <MapPin size={18} /> },
        { labelKey: "assetHistory", href: `/${locale}/asset-management/history`, icon: <History size={18} /> },
      ],
    },
    {
      labelKey: "masterData",
      icon: <Database size={20} />,
      children: [
        { labelKey: "company", href: `/${locale}/master-data/companies`, icon: <Building2 size={18} /> },
        { labelKey: "branch", href: `/${locale}/master-data/branches`, icon: <GitBranch size={18} /> },
        { labelKey: "department", href: `/${locale}/master-data/departments`, icon: <Users size={18} /> },
        { labelKey: "employee", href: `/${locale}/master-data/employees`, icon: <Users size={18} /> },
        { labelKey: "location", href: `/${locale}/master-data/locations`, icon: <MapPin size={18} /> },
        { labelKey: "category", href: `/${locale}/master-data/categories`, icon: <Tag size={18} /> },
        { labelKey: "brandModel", href: `/${locale}/master-data/brands`, icon: <Layers size={18} /> },
        { labelKey: "supplier", href: `/${locale}/master-data/suppliers`, icon: <Truck size={18} /> },
      ],
    },
    {
      labelKey: "reports",
      href: `/${locale}/reports`,
      icon: <BarChart3 size={20} />,
    },
    {
      labelKey: "audit",
      icon: <ClipboardCheck size={20} />,
      children: [
        { labelKey: "auditRound", href: `/${locale}/audit/rounds`, icon: <ClipboardCheck size={18} /> },
      ],
    },
    {
      labelKey: "administration",
      icon: <Settings size={20} />,
      children: [
        { labelKey: "userManagement", href: `/${locale}/admin/users`, icon: <Users size={18} /> },
        { labelKey: "rolePermission", href: `/${locale}/admin/roles`, icon: <Settings size={18} /> },
        { labelKey: "systemLog", href: `/${locale}/admin/logs`, icon: <History size={18} /> },
        { labelKey: "systemSetting", href: `/${locale}/admin/settings`, icon: <Settings size={18} /> },
      ],
    },
  ]

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-sidebar transition-all duration-300 lg:relative",
        collapsed ? "w-16" : "w-64",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border px-4">
        <Package className="h-8 w-8 shrink-0 text-primary" />
        {!collapsed && (
          <span className="ml-3 text-lg font-semibold text-primary truncate">
            AMS
          </span>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-4">
        {menuItems.map((item) => (
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
  const hasActiveChild = item.children?.some((child) =>
    child.href ? pathname.startsWith(child.href) : false
  )

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent",
            hasActiveChild && "text-primary",
            collapsed && "justify-center px-2"
          )}
        >
          <span className="shrink-0">{item.icon}</span>
          {!collapsed && (
            <>
              <span className="flex-1 text-left truncate">{t(item.labelKey)}</span>
              {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </>
          )}
        </button>
        {open && !collapsed && (
          <div className="ml-4 border-l border-border">
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
        "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-accent",
        isActive
          ? "bg-primary/10 font-medium text-primary border-r-2 border-primary"
          : "text-muted-foreground",
        collapsed && "justify-center px-2"
      )}
    >
      <span className="shrink-0">{item.icon}</span>
      {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
    </Link>
  )
}
