"use client"

import { useRef } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { CheckCircle2, ChevronDown, Printer } from "lucide-react"
import { useRepairRecordActions } from "@/components/maintenance/repair-record-actions"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

// The record header's client part (group 5 spec §8.1), from md: "อื่น ๆ" (แก้ไขรายละเอียด; separator; ยกเลิกบันทึก,
// destructive, open records only), "พิมพ์", then the primary "ซ่อมเสร็จ" while open. The menu needs maintenance:edit,
// so it is hidden when it would be empty. Its items open the provider's dialogs, which sit outside the menu
// (DESIGN.md:651) and give focus back to the menu's trigger. Below md the phone bar holds these (G5P3-R8).
export function RepairRecordHeaderActions({ printHref, canEdit, isOpen }: { printHref: string; canEdit: boolean; isOpen: boolean }) {
  const t = useTranslations("repairRecord")
  const { openCancel, openEdit } = useRepairRecordActions()
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null)
  // The closing menu must not pull focus back to its trigger while a dialog opens.
  const openingDialogRef = useRef(false)

  return (
    <div className="hidden md:flex md:flex-wrap md:items-center md:gap-2">
      {canEdit ? (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button ref={menuTriggerRef} variant="outline" size="md">
              {t("detail.more")}
              <ChevronDown aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-64"
            onCloseAutoFocus={(event) => {
              if (!openingDialogRef.current) return
              openingDialogRef.current = false
              event.preventDefault()
            }}
          >
            <DropdownMenuItem
              data-repair-action="edit"
              onSelect={() => {
                openingDialogRef.current = true
                openEdit(menuTriggerRef.current)
              }}
            >
              {t("edit")}
            </DropdownMenuItem>
            {isOpen ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  data-repair-action="cancel"
                  variant="destructive"
                  onSelect={() => {
                    openingDialogRef.current = true
                    openCancel(menuTriggerRef.current)
                  }}
                >
                  {t("cancel")}
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      <Link href={printHref} className={buttonVariants({ variant: "outline", size: "md" })}>
        <Printer aria-hidden="true" />
        {t("print")}
      </Link>
      {canEdit && isOpen ? <RepairCompleteButton /> : null}
    </div>
  )
}

// "ซ่อมเสร็จ": the header's and the next-step card's button. It opens the provider's dialog, which gives focus back to it.
export function RepairCompleteButton({ className }: { className?: string }) {
  const t = useTranslations("repairRecord")
  const { openComplete } = useRepairRecordActions()

  return (
    <Button size="md" onClick={(event) => openComplete(event.currentTarget)} className={cn(className)}>
      <CheckCircle2 aria-hidden="true" />
      {t("complete")}
    </Button>
  )
}
