"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Search } from "lucide-react"

import { GlobalSearch } from "@/components/layout/global-search"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

// The phone's search: the top bar's icon opens the same search in a full-height sheet from the top (spec §6.5).
export function MobileSearchSheet({ canViewAssets, canCreateAssets }: { canViewAssets: boolean; canCreateAssets: boolean }) {
  const t = useTranslations("globalSearch")
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("label")} title={t("label")}>
          <Search aria-hidden="true" className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="top" className="h-dvh gap-0" aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>{t("label")}</SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col px-4 py-3">
          <GlobalSearch
            variant="sheet"
            canViewAssets={canViewAssets}
            canCreateAssets={canCreateAssets}
            onNavigate={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
