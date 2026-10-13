"use client"

import { useRef, type ComponentProps, type KeyboardEvent, type MouseEvent } from "react"
import { FileText, FolderOpen } from "lucide-react"
import { DisposalDecisionButton, type DisposalDecisionButtonHandle } from "@/components/disposal/disposal-decision-button"
import { DisposalExecutionButton, type DisposalExecutionButtonHandle } from "@/components/disposal/disposal-execution-button"
import { RowActions, type RowActionItem, type RowNextAction } from "@/components/ui/row-actions"

// The props the page hands to the dialog it opens: the dialog's own props, without the three this file sets.
type DisposalDecisionDialogProps = Omit<ComponentProps<typeof DisposalDecisionButton>, "ref" | "hideTrigger" | "returnFocusRef">
type DisposalExecutionDialogProps = Omit<ComponentProps<typeof DisposalExecutionButton>, "ref" | "hideTrigger" | "returnFocusRef">

export type DisposalRowNext =
  | { kind: "review"; label: string; dialog: DisposalDecisionDialogProps }
  | { kind: "execute"; label: string; dialog: DisposalExecutionDialogProps }
  | { kind: "view"; label: string }

export type DisposalRowActionsProps = {
  // The request number: read after the next step and named in the ⋯ label.
  code: string
  menuLabel: string
  // The request page: the next step of a "view" row, else the first item in ⋯.
  detail: { label: string; href: string }
  batch?: { label: string; href: string }
  next: DisposalRowNext
}

// React sends the events of a dialog's portal up the component tree to the table row, which would open the request on a
// click or an Enter inside the dialog. The dialogs sit in this empty hidden span, which stops events that come from
// outside it, as RowActions does for its own menu.
function stopPortalEvent(event: MouseEvent<HTMLSpanElement> | KeyboardEvent<HTMLSpanElement>) {
  if (!event.currentTarget.contains(event.target as Node)) event.stopPropagation()
}

// RowActions for a row of the disposal queue (spec 2B §5.4, R-m). The page is a server component and cannot hold a
// handle, so this client file does: the next step opens the 2C decision or execution dialog through ref.current?.open(),
// the dialog renders outside the menu with hideTrigger, and returnFocusRef={openerRef} gives focus back to the button
// that opened it. The table shows from md only, so the menu is always the dropdown.
export function DisposalRowActions({ code, menuLabel, detail, batch, next }: DisposalRowActionsProps) {
  const openerRef = useRef<HTMLElement | null>(null)
  const decisionRef = useRef<DisposalDecisionButtonHandle | null>(null)
  const executionRef = useRef<DisposalExecutionButtonHandle | null>(null)
  // A "view" row's next step already opens the request, so ⋯ does not repeat it.
  const items: RowActionItem[] = [
    ...(next.kind === "view" ? [] : [{ kind: "link" as const, key: "request", label: detail.label, href: detail.href, icon: <FileText aria-hidden="true" /> }]),
    ...(batch ? [{ kind: "link" as const, key: "batch", label: batch.label, href: batch.href, icon: <FolderOpen aria-hidden="true" /> }] : []),
  ]
  // No icon on the next step: at 13px "พิจารณาคำขอ" is 79px and "บันทึกตัดจำหน่าย" 93px, and the 120px slot leaves
  // 98px for words alone but 76px beside an icon.
  const rowNext: RowNextAction =
    next.kind === "review"
      ? { label: next.label, onSelect: () => decisionRef.current?.open() }
      : next.kind === "execute"
        ? { label: next.label, onSelect: () => executionRef.current?.open() }
        : { label: next.label, href: detail.href }

  return (
    <>
      <RowActions
        code={code}
        menuLabel={menuLabel}
        next={rowNext}
        groups={items.length > 0 ? [{ key: "links", items }] : []}
        openerRef={openerRef}
        menu="dropdown"
      />
      <span hidden onClick={stopPortalEvent} onKeyDown={stopPortalEvent}>
        {next.kind === "review" ? <DisposalDecisionButton {...next.dialog} ref={decisionRef} hideTrigger returnFocusRef={openerRef} /> : null}
        {next.kind === "execute" ? <DisposalExecutionButton {...next.dialog} ref={executionRef} hideTrigger returnFocusRef={openerRef} /> : null}
      </span>
    </>
  )
}
