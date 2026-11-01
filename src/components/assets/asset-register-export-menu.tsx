"use client"

import Link from "next/link"
import { Download, FileDown, FileSpreadsheet, Upload } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { formatCount } from "@/lib/display-format"

// "ส่งออก / นำเข้า" in the register header (group 4 spec §6.3). exportCount is the register's total under the filters.
// templateHref and importHref are given only to a role that may import (asset:create); without them the menu offers the export alone.
export function AssetRegisterExportMenu({ exportHref, exportCount, templateHref, importHref }: { exportHref: string; exportCount: number; templateHref?: string; importHref?: string }) {
  const t = useTranslations("asset")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="md">
          <Download aria-hidden="true" />
          {t("exportImportMenu")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <a href={exportHref} download>
            <FileDown aria-hidden="true" />
            {t("exportFilteredCount", { count: formatCount(exportCount) })}
          </a>
        </DropdownMenuItem>
        {templateHref ? (
          <DropdownMenuItem asChild>
            <a href={templateHref} download>
              <FileSpreadsheet aria-hidden="true" />
              {t("downloadTemplate")}
            </a>
          </DropdownMenuItem>
        ) : null}
        {importHref ? (
          <DropdownMenuItem asChild>
            <Link href={importHref}>
              <Upload aria-hidden="true" />
              {t("importFromExcel")}
            </Link>
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
