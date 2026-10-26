"use client"

import { Fragment, useRef } from "react"
import Link from "next/link"
import { ChevronDown, Printer, ScanLine, Wrench } from "lucide-react"
import { useTranslations } from "next-intl"
import {
  AssetStatusCorrectionDialog,
  type AssetStatusCorrectionDialogHandle,
  type AssetStatusCorrectionLabels,
} from "@/components/assets/asset-status-correction-dialog"
import {
  TransactionCancelDialog,
  type TransactionCancelDialogHandle,
  type TransactionCancelDialogProps,
} from "@/components/asset-operations/transaction-cancel-dialog"
import { ActionBar, type ActionBarLink } from "@/components/ui/action-bar"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemDescription,
  DropdownMenuItemText,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { RowActionGroup, RowActionItem } from "@/components/ui/row-actions"
import { withoutPhoneOnly, type AssetDetailDialogKey, type AssetDetailMoreGroup } from "@/lib/asset-detail-frame-rules"

export type AssetDetailActionLink = { key: string; label: string; href: string }

// The asset page header's client part (group 1 spec §7.1, §7.8; R20, R21, R35). From md: "อื่น ๆ", then the pinned
// "พิมพ์ป้าย" and "บันทึกซ่อม", then the shared rule's next step last. Below md the header's buttons hide and the fixed
// ActionBar holds the next step, "บันทึกซ่อม" and "การดำเนินการอื่น", whose sheet ends with "แก้ไข" and "พิมพ์ป้าย".
// Both menus open the same two dialogs, rendered here outside the menus; focus returns to the control that opened them.
export function AssetDetailActions({
  asset,
  primary,
  printLabel,
  recordRepair,
  scanNext,
  groups,
  cancelTransaction,
  statusCorrection,
}: {
  asset: { assetTag: string; name: string }
  primary: AssetDetailActionLink | null
  printLabel: AssetDetailActionLink
  recordRepair: AssetDetailActionLink | null
  scanNext: AssetDetailActionLink | null
  groups: AssetDetailMoreGroup[]
  cancelTransaction?: TransactionCancelDialogProps
  statusCorrection: { assetId: string; readyStatusId: string; labels: AssetStatusCorrectionLabels } | null
}) {
  const t = useTranslations("assetDetail")
  const tCommon = useTranslations("common")
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null)
  // RowActions points this at the bar's ⋯ before it calls an item's onSelect.
  const moreTriggerRef = useRef<HTMLElement | null>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const openingDialogRef = useRef(false)
  const cancelDialogRef = useRef<TransactionCancelDialogHandle | null>(null)
  const correctionDialogRef = useRef<AssetStatusCorrectionDialogHandle | null>(null)

  function openDialog(key: AssetDetailDialogKey, opener: HTMLElement | null) {
    returnFocusRef.current = opener
    if (key === "cancelLatest") cancelDialogRef.current?.open()
    else correctionDialogRef.current?.open()
  }

  const desktopGroups = withoutPhoneOnly(groups)

  const barActions: ActionBarLink[] = [
    ...(scanNext ? [{ ...scanNext, icon: <ScanLine className="h-4 w-4" />, primary: true }] : []),
    ...(primary ? [{ ...primary, primary: !scanNext }] : []),
    ...(recordRepair && !scanNext ? [{ ...recordRepair, icon: <Wrench className="h-4 w-4" /> }] : []),
  ]

  const phoneGroups: RowActionGroup[] = groups.map((group) => ({
    key: group.key,
    items: group.items.map((item): RowActionItem => {
      if (item.kind === "link") return { kind: "link", key: item.key, label: item.label, href: item.href }
      if (item.kind === "unavailable") return { kind: "unavailable", key: item.key, label: item.label, reason: item.reason }
      return { kind: "action", key: item.key, label: item.label, onSelect: () => openDialog(item.key, moreTriggerRef.current), destructive: item.key === "cancelLatest" }
    }),
  }))

  return (
    <>
      <div className="hidden md:flex md:flex-wrap md:items-center md:gap-2">
        {desktopGroups.length > 0 ? (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button ref={menuTriggerRef} variant="outline" size="md">
                {t("more")}
                <ChevronDown aria-hidden="true" />
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
              {desktopGroups.map((group, index) => (
                <Fragment key={group.key}>
                  {index > 0 ? <DropdownMenuSeparator /> : null}
                  {group.items.map((item) => {
                    if (item.kind === "link") {
                      return (
                        <DropdownMenuItem key={item.key} asChild data-asset-action={item.key}>
                          <Link href={item.href}>{item.label}</Link>
                        </DropdownMenuItem>
                      )
                    }
                    if (item.kind === "unavailable") {
                      return (
                        <DropdownMenuItem key={item.key} unavailable data-asset-action={item.key}>
                          <DropdownMenuItemText>
                            {item.label}
                            <DropdownMenuItemDescription>{item.reason}</DropdownMenuItemDescription>
                          </DropdownMenuItemText>
                        </DropdownMenuItem>
                      )
                    }
                    return (
                      <DropdownMenuItem
                        key={item.key}
                        data-asset-action={item.key}
                        variant={item.key === "cancelLatest" ? "destructive" : undefined}
                        onSelect={() => {
                          openingDialogRef.current = true
                          openDialog(item.key, menuTriggerRef.current)
                        }}
                      >
                        {item.label}
                      </DropdownMenuItem>
                    )
                  })}
                </Fragment>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        <Link href={printLabel.href} data-asset-action={printLabel.key} className={buttonVariants({ variant: "outline", size: "md" })}>
          <Printer aria-hidden="true" />
          {printLabel.label}
        </Link>
        {recordRepair ? (
          <Link href={recordRepair.href} data-asset-action={recordRepair.key} className={buttonVariants({ variant: "outline", size: "md" })}>
            <Wrench aria-hidden="true" />
            {recordRepair.label}
          </Link>
        ) : null}
        {primary ? (
          <Link href={primary.href} data-asset-action={primary.key} className={buttonVariants({ size: "md" })}>
            {primary.label}
          </Link>
        ) : null}
      </div>
      <ActionBar
        label={tCommon("actions")}
        actions={barActions}
        more={{ label: t("moreActions"), code: asset.assetTag, name: asset.name, groups: phoneGroups, openerRef: moreTriggerRef }}
      />
      {cancelTransaction ? <TransactionCancelDialog ref={cancelDialogRef} hideTrigger returnFocusRef={returnFocusRef} {...cancelTransaction} /> : null}
      {statusCorrection ? <AssetStatusCorrectionDialog ref={correctionDialogRef} hideTrigger returnFocusRef={returnFocusRef} {...statusCorrection} /> : null}
    </>
  )
}
