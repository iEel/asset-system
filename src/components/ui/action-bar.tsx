import Link from "next/link"
import type React from "react"
import { buttonVariants } from "@/components/ui/button-variants"
import { RowActions, type RowActionGroup } from "@/components/ui/row-actions"
import { getMobileActionGridClass } from "@/lib/mobile-action-layout"
import { cn } from "@/lib/utils"

export type ActionBarLink = {
  label: string
  href: string
  icon?: React.ReactNode
  primary?: boolean
  disabled?: boolean
}

// The ⋯ of the bar (group 1 asset detail, spec 2026-10-25 §7.8): it opens RowActions' bottom sheet, titled with code
// and name as on the register's phone rows. kind: "action" items and openerRef come only from a client caller, whose
// dialog then returns focus to ⋯.
export type ActionBarMore = {
  label: string
  code: string
  name?: string
  groups: readonly RowActionGroup[]
  openerRef?: React.RefObject<HTMLElement | null>
}

// The room a page leaves under its content for the bar, the iPhone home indicator included (spec 2C section 6.10,
// O11). A page puts one of these on its root next to <ActionBar>, so the bar and its room change together. The bar
// hides from md, and so does the room.
export const actionBarPagePadding = {
  single: "pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0",
  withPrimary: "pb-[calc(9rem+env(safe-area-inset-bottom))] md:pb-0",
} as const

// The phone action bar of a detail page (K23): up to four links, or three under a full-width primaryAction (the next
// step of a disposal request). No directive and no hook, so the server pages render it. A link is the primary button
// only when it says so (primary); a disabled item stays a link to screen readers (role="link", aria-disabled, no href)
// and takes the shared aria-disabled look. A short screen (max-height 32rem: 720×450 at 200% zoom of 1440×900, a phone
// on its side) keeps the 44px targets, gets 6px instead of 12px above and below them, and puts the next step beside the
// links, so the bar is one row there (spec 2D D18).
// With more (and a group that holds an item) the row is a flex row that ends in ⋯, which takes one link's place, and a
// primary link grows twice as much as an outline one, so the next step stays the widest button (canvas
// B-AssetDetail-Phone: the wide "รับคืน", then "บันทึกซ่อม", then ⋯). With no link, ⋯ stands alone at the row's end (a
// person who may only read). Nothing returns early: an empty actions with more still draws the bar (R21).
export function ActionBar({
  label,
  actions,
  primaryAction,
  more,
}: {
  label: string
  actions: readonly ActionBarLink[]
  primaryAction?: React.ReactNode
  more?: ActionBarMore
}) {
  // An empty sheet is never offered.
  const moreSlot = more?.groups.some((group) => group.items.length > 0) ? more : null
  const visibleActions = actions.slice(0, (primaryAction ? 3 : 4) - (moreSlot ? 1 : 0))

  return (
    <div
      role="group"
      aria-label={label}
      data-slot="action-bar"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:hidden [@media(max-height:32rem)]:pb-[max(0.375rem,env(safe-area-inset-bottom))] [@media(max-height:32rem)]:pt-1.5"
    >
      <div className={cn("mx-auto grid min-w-0 max-w-lg gap-2", primaryAction && "[@media(max-height:32rem)]:max-w-3xl [@media(max-height:32rem)]:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]")}>
        {primaryAction ? <div className="min-w-0 [&>button]:w-full">{primaryAction}</div> : null}
        <div className={moreSlot ? "flex min-w-0 justify-end gap-2" : cn("grid min-w-0 gap-2", getMobileActionGridClass(visibleActions.length))}>
          {visibleActions.map((action) => {
            const className = cn(buttonVariants({ variant: action.primary ? "default" : "outline", size: "sm" }), "min-w-0 px-2", moreSlot && (action.primary ? "flex-2" : "flex-1"))
            return action.disabled ? (
              <a key={action.label} role="link" aria-disabled="true" className={className}>
                {action.icon}
                <span className="min-w-0 truncate">{action.label}</span>
              </a>
            ) : (
              <Link key={action.label} href={action.href} className={className}>
                {action.icon}
                <span className="min-w-0 truncate">{action.label}</span>
              </Link>
            )
          })}
          {moreSlot ? (
            <RowActions code={moreSlot.code} name={moreSlot.name} menuLabel={moreSlot.label} groups={moreSlot.groups} openerRef={moreSlot.openerRef} menu="sheet" triggerVariant="outline" className="shrink-0" />
          ) : null}
        </div>
      </div>
    </div>
  )
}
