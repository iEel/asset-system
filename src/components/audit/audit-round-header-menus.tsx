"use client"

import { useRef } from "react"
import { AlertTriangle, ChevronDown, Download, FileSpreadsheet, FileText, Scale } from "lucide-react"
import { useTranslations } from "next-intl"
import { AuditRoundCancelButton, type AuditRoundCancelButtonHandle, type AuditRoundCancellationImpact } from "@/components/audit/audit-round-cancel-button"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemDescription,
  DropdownMenuItemText,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type AuditRoundExportLinks = { excel: string; pdf: string; variance: string }

// The round page header's client part (group 2 spec §8): "ส่งออก ▾" with the three exports, each following the list's
// filters (the page builds the hrefs), then "อื่น ๆ ▾" with "ยกเลิกรอบตรวจ". The cancel dialog sits outside the menu
// with hideTrigger and opens through its handle; focus returns to "อื่น ๆ" (asset-detail-actions.tsx, R-m).
// exports comes only for audit:export, cancel only for audit:approve on an open round.
export function AuditRoundHeaderMenus({ exports, cancel }: { exports: AuditRoundExportLinks | null; cancel: { roundId: string; impact: AuditRoundCancellationImpact } | null }) {
  const t = useTranslations("auditRound")
  const tCommon = useTranslations("common")
  const moreTriggerRef = useRef<HTMLButtonElement | null>(null)
  const openingDialogRef = useRef(false)
  const cancelDialogRef = useRef<AuditRoundCancelButtonHandle | null>(null)

  return (
    <>
      {exports ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="md">
              <Download aria-hidden="true" />
              {tCommon("export")}
              <ChevronDown aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuItem asChild>
              <a href={exports.excel} download>
                <FileSpreadsheet aria-hidden="true" />
                <DropdownMenuItemText>
                  {t("exportResult")}
                  <DropdownMenuItemDescription>{t("exportFilteredHint")}</DropdownMenuItemDescription>
                </DropdownMenuItemText>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={exports.pdf} download>
                <FileText aria-hidden="true" />
                <DropdownMenuItemText>
                  {t("exportResultPdf")}
                  <DropdownMenuItemDescription>{t("exportFilteredHint")}</DropdownMenuItemDescription>
                </DropdownMenuItemText>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={exports.variance} download>
                <Scale aria-hidden="true" />
                <DropdownMenuItemText>
                  {t("exportVariance")}
                  <DropdownMenuItemDescription>{t("exportFilteredHint")}</DropdownMenuItemDescription>
                </DropdownMenuItemText>
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      {cancel ? (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button ref={moreTriggerRef} variant="outline" size="md">
              {t("more")}
              <ChevronDown aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            onCloseAutoFocus={(event) => {
              if (!openingDialogRef.current) return
              openingDialogRef.current = false
              event.preventDefault()
            }}
          >
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                openingDialogRef.current = true
                cancelDialogRef.current?.open()
              }}
            >
              <AlertTriangle aria-hidden="true" />
              {t("cancelRound")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      {cancel ? <AuditRoundCancelButton ref={cancelDialogRef} hideTrigger returnFocusRef={moreTriggerRef} roundId={cancel.roundId} impact={cancel.impact} /> : null}
    </>
  )
}
