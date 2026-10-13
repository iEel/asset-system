"use client"

import { ArrowUpDown } from "lucide-react"
import { useTranslations } from "next-intl"
import { useAssetRegisterNavigation } from "@/components/assets/asset-register-navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { assetRegisterSortOptions, getActiveSortKey } from "@/lib/asset-register-sort"

const sortLabelKeys = {
  newest: "sortNewest",
  oldest: "sortOldest",
  tagAsc: "sortTagAsc",
  tagDesc: "sortTagDesc",
  nameAsc: "sortNameAsc",
  purchaseDateDesc: "sortPurchaseDateDesc",
  priceDesc: "sortPriceDesc",
} as const

export function AssetRegisterSortMenu() {
  const t = useTranslations("asset")
  const { filters, navigate } = useAssetRegisterNavigation()
  const activeKey = getActiveSortKey(filters.sort, filters.direction)
  const activeLabel = activeKey ? t(sortLabelKeys[activeKey]) : t("sortMenu")

  // Ghost below md: the summary bar is 44px tall and a frame would touch its lines. From md the md: classes are the
  // outline variant's colors, so the button matches the column and export buttons beside it (spec 2B §7.8.6, I26).
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="md"
          aria-label={`${t("sortMenu")}: ${activeLabel}`}
          className="md:border-control-border md:bg-surface md:text-foreground md:hover:border-input md:hover:bg-background md:active:border-input md:active:bg-muted"
        >
          <ArrowUpDown className="text-muted-foreground" aria-hidden="true" />
          <span className="hidden text-muted-foreground md:inline">{t("sortMenu")}:</span>
          <span>{activeLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("sortMenu")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={activeKey ?? ""} onValueChange={(key) => {
          const option = assetRegisterSortOptions.find((item) => item.key === key)
          if (option) navigate({ sort: option.sort, direction: option.direction })
        }}>
          {assetRegisterSortOptions.map((option) => (
            <DropdownMenuRadioItem key={option.key} value={option.key}>
              {t(sortLabelKeys[option.key])}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
