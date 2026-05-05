"use client"

import { useTranslations, useLocale } from "next-intl"
import { useRouter, usePathname } from "next/navigation"
import {
  Menu,
  Bell,
  Search,
  Globe,
  LogOut,
  ChevronDown,
  PanelLeftClose,
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

export function Topbar({
  onToggleSidebar,
  onMobileMenuToggle,
}: {
  onToggleSidebar: () => void
  onMobileMenuToggle: () => void
}) {
  const t = useTranslations("common")
  const tAuth = useTranslations("auth")
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [langMenuOpen, setLangMenuOpen] = useState(false)

  const switchLocale = (newLocale: string) => {
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`)
    router.push(newPath)
    setLangMenuOpen(false)
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-4 shadow-sm">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onMobileMenuToggle}
          className="rounded-md p-2 hover:bg-accent lg:hidden"
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

        {/* Global Search */}
        <div className="relative hidden md:block">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder={`${t("search")} Asset Tag, Serial, Employee...`}
            className="h-9 w-80 rounded-md border border-border bg-background pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button className="relative rounded-md p-2 hover:bg-accent">
          <Bell size={20} />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger" />
        </button>

        {/* Language Switcher */}
        <div className="relative">
          <button
            onClick={() => setLangMenuOpen(!langMenuOpen)}
            className="flex items-center gap-1 rounded-md px-2 py-2 text-sm hover:bg-accent"
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
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-accent"
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
              <button className="flex w-full items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-accent">
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
