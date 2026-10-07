"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { Activity, Copy, Edit, FolderOpen, MoreHorizontal, Printer, Puzzle, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ActivityDrawer, type ActivityDrawerItem } from "@/components/ui/activity-drawer"
import {
  AssetEvidenceDrawer,
  type AssetEvidenceDrawerItem,
  type AssetEvidenceDrawerLabels,
} from "@/components/assets/asset-evidence-drawer"
import {
  TransactionCancelDialog,
  type TransactionCancelDialogHandle,
  type TransactionCancelDialogProps,
} from "@/components/asset-operations/transaction-cancel-dialog"

const linkIcons = { print: Printer, components: Puzzle, clone: Copy, edit: Edit }

export function AssetDetailActionMenu({
  label,
  cancelTransaction,
  activity,
  evidence,
  links,
}: {
  label: string
  cancelTransaction?: TransactionCancelDialogProps
  activity: { title: string; triggerLabel: string; emptyLabel: string; items: ActivityDrawerItem[] }
  evidence: { items: AssetEvidenceDrawerItem[]; labels: AssetEvidenceDrawerLabels }
  links: Array<{ key: keyof typeof linkIcons; href: string; label: string; mobileOnly?: boolean }>
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const openingDialogRef = useRef(false)
  const cancelDialogRef = useRef<TransactionCancelDialogHandle | null>(null)
  const [panel, setPanel] = useState<"activity" | "evidence" | null>(null)

  function openFromMenu(open: () => void) {
    openingDialogRef.current = true
    open()
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button ref={triggerRef} variant="outline" size="icon" aria-label={label} title={label}>
            <MoreHorizontal className="size-5" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-72"
          onCloseAutoFocus={(event) => {
            if (!openingDialogRef.current) return
            openingDialogRef.current = false
            event.preventDefault()
          }}
        >
          {cancelTransaction ? (
            <DropdownMenuItem variant="destructive" onSelect={() => openFromMenu(() => cancelDialogRef.current?.open())}>
              <Undo2 aria-hidden="true" />
              {cancelTransaction.labels.action}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onSelect={() => openFromMenu(() => setPanel("activity"))}>
            <Activity aria-hidden="true" />
            {activity.triggerLabel}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openFromMenu(() => setPanel("evidence"))}>
            <FolderOpen aria-hidden="true" />
            {evidence.labels.triggerLabel}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {links.map((link) => {
            const Icon = linkIcons[link.key]
            return (
              <DropdownMenuItem key={link.key} asChild className={link.mobileOnly ? "md:hidden" : undefined}>
                <Link href={link.href}>
                  <Icon aria-hidden="true" />
                  {link.label}
                </Link>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {cancelTransaction ? (
        <TransactionCancelDialog ref={cancelDialogRef} hideTrigger returnFocusRef={triggerRef} {...cancelTransaction} />
      ) : null}
      <ActivityDrawer
        hideTrigger
        open={panel === "activity"}
        onOpenChange={(open) => setPanel(open ? "activity" : null)}
        returnFocusRef={triggerRef}
        {...activity}
      />
      <AssetEvidenceDrawer
        hideTrigger
        open={panel === "evidence"}
        onOpenChange={(open) => setPanel(open ? "evidence" : null)}
        returnFocusRef={triggerRef}
        {...evidence}
      />
    </>
  )
}
