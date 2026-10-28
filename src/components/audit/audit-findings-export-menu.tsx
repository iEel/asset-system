"use client"

import { ChevronDown, Download, FileSpreadsheet, FileText } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemDescription,
  DropdownMenuItemText,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// The findings page's "ส่งออก ▾" (group 2 spec §10, P4-R7): the Excel and the PDF of the list as filtered, each an
// <a download> (spec 2D M31), as the round page's menu (audit-round-header-menus.tsx). The page builds the hrefs, with
// its filters and locale, and renders the menu only for audit:export (E2E AU1, M1).
export function AuditFindingsExportMenu({ excelHref, pdfHref }: { excelHref: string; pdfHref: string }) {
  const t = useTranslations("auditFinding")
  const tCommon = useTranslations("common")

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="md">
          <Download aria-hidden="true" />
          {tCommon("export")}
          <ChevronDown aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuItem asChild>
          <a href={excelHref} download>
            <FileSpreadsheet aria-hidden="true" />
            <DropdownMenuItemText>
              {t("exportFindings")}
              <DropdownMenuItemDescription>{t("exportFilteredHint")}</DropdownMenuItemDescription>
            </DropdownMenuItemText>
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={pdfHref} download>
            <FileText aria-hidden="true" />
            <DropdownMenuItemText>
              {t("exportFindingsPdf")}
              <DropdownMenuItemDescription>{t("exportFilteredHint")}</DropdownMenuItemDescription>
            </DropdownMenuItemText>
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
