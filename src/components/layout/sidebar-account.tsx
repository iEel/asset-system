"use client"

import { useLocale, useTranslations } from "next-intl"
import { signOut } from "next-auth/react"
import { ChevronsUpDown, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LabelTooltip } from "@/components/ui/tooltip"
import type { SessionUser } from "@/lib/auth-utils"
import { getUserDisplayLabel, getUserInitial, getUserSecondaryLabel, type ShellAccount } from "@/lib/user-display"
import { cn } from "@/lib/utils"

// The person pinned at the foot of the desktop menu (spec §6.2). Expanded, the visible name and role are the
// trigger's accessible name; in the rail only the initial shows, so the trigger carries the name itself.
export function SidebarAccount({ user, account, collapsed }: { user: SessionUser; account: ShellAccount; collapsed: boolean }) {
  const tNav = useTranslations("nav")
  const tAuth = useTranslations("auth")
  const locale = useLocale()
  const displayName = getUserDisplayLabel(user)
  const secondaryLabel = getUserSecondaryLabel(user)

  return (
    <div className="flex shrink-0 justify-center border-t border-sidebar-border p-2">
      <DropdownMenu modal={false}>
        <LabelTooltip label={displayName} enabled={collapsed}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size={collapsed ? "icon" : "md"}
              aria-label={collapsed ? tNav("userMenu", { name: displayName }) : undefined}
              className={cn(
                collapsed
                  ? "rounded-full p-0 hover:bg-sidebar-hover active:bg-sidebar-hover data-[state=open]:bg-sidebar-hover focus-visible:ring-sidebar-ring focus-visible:ring-offset-sidebar md:size-10"
                  : "h-auto min-h-12 w-full min-w-0 justify-start gap-2.5 px-2.5 py-2 text-left font-normal text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-foreground active:bg-sidebar-hover data-[state=open]:bg-sidebar-hover focus-visible:ring-sidebar-ring focus-visible:ring-offset-sidebar md:h-auto md:min-h-12",
              )}
            >
              <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-active text-sm font-semibold text-sidebar-active-foreground">
                {getUserInitial(user)}
              </span>
              {collapsed ? null : (
                <>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-sidebar-active-foreground">{displayName}</span>
                    {account.roleLabel ? <span className="truncate text-xs text-sidebar-muted">{account.roleLabel}</span> : null}
                  </span>
                  <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-sidebar-muted" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
        </LabelTooltip>
        <DropdownMenuContent side={collapsed ? "right" : "top"} align={collapsed ? "end" : "start"} className="w-[calc(100vw-2rem)] max-w-[16rem]">
          <DropdownMenuLabel className="py-1.5 text-sm font-normal text-foreground">
            <span className="block truncate font-medium">{displayName}</span>
            {secondaryLabel ? <span className="block truncate text-meta text-faint-foreground">{secondaryLabel}</span> : null}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => void signOut({ callbackUrl: `/${locale}/login` })}>
            <LogOut aria-hidden="true" />
            {tAuth("logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
