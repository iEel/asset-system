"use client"

import { Download, FileDown, FileSpreadsheet } from "lucide-react"
import { useTranslations } from "next-intl"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function AssetRegisterExportMenu({ exportHref, templateHref }: { exportHref: string; templateHref: string }) {
  const t = useTranslations("asset")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Download className="size-4" aria-hidden="true" />
          {t("exportMenu")}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <a href={exportHref}>
            <FileDown aria-hidden="true" />
            {t("exportFiltered")}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={templateHref}>
            <FileSpreadsheet aria-hidden="true" />
            {t("downloadTemplate")}
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
