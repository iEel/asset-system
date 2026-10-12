"use client"

import { Fragment, useId, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode, type RefObject } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { MoreHorizontal, Trash2 } from "lucide-react"
import { useDeleteAction } from "@/components/master-data/use-delete-action"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemDescription,
  DropdownMenuItemText,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  menuItemClasses,
  menuItemDestructiveClasses,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useMediaQuery } from "@/components/ui/use-media-query"
import { cn } from "@/lib/utils"

// Row actions, pattern ช1 (spec 2B §3.11, I5): one next-step button in a fixed 120px slot, then ⋯ with every other
// action of the row. The props are data only, so a server page renders RowActions directly; onSelect and onNavigate
// can only come from a client caller. A menu never holds a dialog: an "action" item calls onSelect, and the caller
// opens its own dialog, rendered outside with hideTrigger and returnFocusRef={openerRef}, through its handle (R-m).

// Next step: a link (a server page can pass it) or, from a client caller only, a button that opens a dialog.
export type RowNextAction =
  | { label: string; href: string; icon?: ReactNode; onNavigate?: () => void }
  | { label: string; onSelect: () => void; icon?: ReactNode }

export type RowActionItem =
  | { kind: "link"; key: string; label: string; href: string; icon?: ReactNode; onNavigate?: () => void }
  | { kind: "action"; key: string; label: string; onSelect: () => void; icon?: ReactNode; destructive?: boolean }
  | { kind: "unavailable"; key: string; label: string; reason: string; icon?: ReactNode }

export type RowActionGroup = { key: string; label?: string; items: readonly RowActionItem[] }

export type RowActionsProps = {
  code: string
  name?: string
  menuLabel: string
  next?: RowNextAction | null
  groups: readonly RowActionGroup[]
  deleteAction?: { endpoint: string; label?: string }
  openerRef?: RefObject<HTMLElement | null>
  menu?: "auto" | "dropdown" | "sheet"
  className?: string
}

// Mockup .next-btn: 120px wide and 32px tall from md (44px tall below), 13px medium primary text, a 16px icon on the
// left. It fills with primary-soft on hover, while its row is hovered or holds focus, and while the row's menu is open.
const rowNextClasses =
  "inline-flex min-h-11 w-30 shrink-0 items-center justify-start gap-1.5 rounded-control border border-transparent px-2.5 text-meta font-medium whitespace-nowrap text-primary transition-colors hover:bg-primary-soft hover:text-primary-hover hover:duration-0 group-hover/row:bg-primary-soft group-hover/row:text-primary-hover group-focus-within/row:bg-primary-soft group-focus-within/row:text-primary-hover group-has-[[aria-expanded=true]]/row:bg-primary-soft active:border-primary-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-8 md:min-h-0 [&_svg]:size-4 [&_svg]:shrink-0"

// Rows of the phone sheet look like menu rows (44px, primary-soft focus, danger for delete). dropdown-menu.tsx is a
// client module, so only client files may import these two strings.
const sheetItemClasses = cn(menuItemClasses, menuItemDestructiveClasses, "w-full text-left")

// React sends the events of the menu and sheet portals up through this component to the row. The row skips clicks on
// the marked parts, but the sheet's scrim is not one of them: a tap that closes the sheet would also open the row.
function stopPortalClick(event: ReactMouseEvent<HTMLDivElement>) {
  if (!event.currentTarget.contains(event.target as Node)) event.stopPropagation()
}

export function RowActions({
  code,
  name,
  menuLabel,
  next,
  groups,
  deleteAction,
  openerRef,
  menu = "auto",
  className,
}: RowActionsProps) {
  const tCommon = useTranslations("common")
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const openingRef = useRef(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const groupId = useId()
  // False on the server and during hydration, so "auto" starts as the sheet; ⋯ looks the same either way.
  const isDesktop = useMediaQuery("(min-width: 48rem)")
  // Hooks run on every render. Without deleteAction the endpoint is empty and runDelete is never called.
  const { deleting, runDelete } = useDeleteAction(deleteAction?.endpoint ?? "", { returnFocusRef: triggerRef })
  const filled = groups.filter((group) => group.items.length > 0)
  const hasMenu = filled.length > 0 || Boolean(deleteAction)
  const deleteLabel = deleteAction?.label ?? tCommon("delete")
  const asSheet = menu === "sheet" || (menu === "auto" && !isDesktop)

  // The caller's dialog takes focus, so the closing menu or sheet must not pull it back to ⋯. When the dialog
  // closes it returns focus to openerRef, which now points at ⋯.
  function openFromMenu(select: () => void) {
    openingRef.current = true
    if (openerRef) openerRef.current = triggerRef.current
    select()
  }

  // A next button that opens a dialog: the dialog gives focus back to this button.
  function openFromNext(button: HTMLElement, select: () => void) {
    if (openerRef) openerRef.current = button
    select()
  }

  function keepDialogFocus(event: Event) {
    if (!openingRef.current) return
    openingRef.current = false
    event.preventDefault()
  }

  function renderNext(action: RowNextAction) {
    const content = (
      <>
        {action.icon}
        <span className="truncate">{action.label}</span>
        <span className="sr-only"> {code}</span>
      </>
    )
    if ("href" in action) {
      return (
        <Link href={action.href} onClick={action.onNavigate} className={rowNextClasses}>
          {content}
        </Link>
      )
    }
    const { onSelect } = action
    return (
      <button
        type="button"
        className={rowNextClasses}
        onClick={(event) => openFromNext(event.currentTarget, onSelect)}
      >
        {content}
      </button>
    )
  }

  function menuItem(item: RowActionItem) {
    if (item.kind === "link") {
      return (
        <DropdownMenuItem key={item.key} asChild>
          <Link href={item.href} onClick={item.onNavigate}>
            {item.icon}
            {item.label}
          </Link>
        </DropdownMenuItem>
      )
    }
    if (item.kind === "action") {
      const { onSelect } = item
      return (
        <DropdownMenuItem key={item.key} variant={item.destructive ? "destructive" : "default"} onSelect={() => openFromMenu(onSelect)}>
          {item.icon}
          {item.label}
        </DropdownMenuItem>
      )
    }
    return (
      <DropdownMenuItem key={item.key} unavailable>
        {item.icon}
        <DropdownMenuItemText>
          {item.label}
          <DropdownMenuItemDescription>{item.reason}</DropdownMenuItemDescription>
        </DropdownMenuItemText>
      </DropdownMenuItem>
    )
  }

  function sheetItem(item: RowActionItem) {
    if (item.kind === "link") {
      return (
        <Link href={item.href} onClick={item.onNavigate} className={sheetItemClasses}>
          {item.icon}
          {item.label}
        </Link>
      )
    }
    if (item.kind === "action") {
      const { onSelect } = item
      return (
        <button
          type="button"
          data-variant={item.destructive ? "destructive" : undefined}
          onClick={() => {
            setSheetOpen(false)
            openFromMenu(onSelect)
          }}
          className={sheetItemClasses}
        >
          {item.icon}
          {item.label}
        </button>
      )
    }
    // Not a control: it reads its name and its reason, and pressing it does nothing.
    return (
      <div aria-disabled="true" className={sheetItemClasses}>
        {item.icon}
        <DropdownMenuItemText>
          {item.label}
          <DropdownMenuItemDescription>{item.reason}</DropdownMenuItemDescription>
        </DropdownMenuItemText>
      </div>
    )
  }

  const trigger = (
    <Button ref={triggerRef} variant="ghost" size="icon-sm" aria-label={menuLabel} title={menuLabel}>
      <MoreHorizontal aria-hidden="true" />
    </Button>
  )

  function renderDropdown() {
    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent data-no-row-click align="end" onCloseAutoFocus={keepDialogFocus}>
          {filled.map((group, index) => (
            <Fragment key={group.key}>
              {index > 0 ? <DropdownMenuSeparator /> : null}
              {group.label ? <DropdownMenuLabel>{group.label}</DropdownMenuLabel> : null}
              {group.items.map((item) => menuItem(item))}
            </Fragment>
          ))}
          {deleteAction ? (
            <>
              {filled.length > 0 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem variant="destructive" disabled={deleting} onSelect={() => void runDelete()}>
                <Trash2 aria-hidden="true" />
                {deleteLabel}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // The Sheet primitive already draws the close X (common.close), the room for it in the header and the home-bar padding.
  function renderSheet() {
    return (
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="bottom" data-no-row-click className="max-h-[85dvh] gap-0 rounded-t-lg" onCloseAutoFocus={keepDialogFocus} {...(name ? {} : { "aria-describedby": undefined })}>
          <SheetHeader>
            <SheetTitle>
              <span className="tag font-medium">{code}</span>
            </SheetTitle>
            {name ? <SheetDescription className="truncate">{name}</SheetDescription> : null}
          </SheetHeader>
          <div className="overflow-y-auto px-2 pt-1 pb-3">
            {filled.map((group, index) => {
              const labelId = `${groupId}-${group.key}`
              return (
                <div key={group.key} role="group" aria-labelledby={group.label ? labelId : undefined} className={cn(index > 0 && "mt-1 border-t border-border-soft pt-1")}>
                  {group.label ? (
                    <p id={labelId} className="px-2.5 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                      {group.label}
                    </p>
                  ) : null}
                  <ul className="grid gap-px">
                    {group.items.map((item) => (
                      <li key={item.key}>{sheetItem(item)}</li>
                    ))}
                  </ul>
                </div>
              )
            })}
            {deleteAction ? (
              <div className={cn(filled.length > 0 && "mt-1 border-t border-border-soft pt-1")}>
                <button
                  type="button"
                  data-variant="destructive"
                  aria-disabled={deleting || undefined}
                  onClick={() => {
                    if (deleting) return
                    setSheetOpen(false)
                    void runDelete()
                  }}
                  className={sheetItemClasses}
                >
                  <Trash2 aria-hidden="true" />
                  {deleteLabel}
                </button>
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div data-slot="row-actions" data-no-row-click onClick={stopPortalClick} className={cn("flex items-center justify-end gap-1 [td>&]:-my-1.25", className)}>
      {next === undefined ? null : next === null ? <span aria-hidden="true" className="w-30 shrink-0" /> : renderNext(next)}
      {!hasMenu ? <span aria-hidden="true" className="w-11 shrink-0 md:w-8" /> : asSheet ? renderSheet() : renderDropdown()}
    </div>
  )
}
