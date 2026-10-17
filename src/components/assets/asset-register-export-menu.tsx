"use client"

import { Download, FileDown, FileSpreadsheet } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function AssetRegisterExportMenu({ exportHref, templateHref }: { exportHref: string; templateHref: string }) {
  const t = useTranslations("asset")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="md">
          <Download aria-hidden="true" />
          {t("exportMenu")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <a href={exportHref} download>
            <FileDown aria-hidden="true" />
            {t("exportFiltered")}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={templateHref} download>
            <FileSpreadsheet aria-hidden="true" />
            {t("downloadTemplate")}
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
