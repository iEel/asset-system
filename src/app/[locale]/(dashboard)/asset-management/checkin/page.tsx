import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { linkVariants } from "@/components/ui/button-variants"
import { getAssetOperationMasterOptions } from "@/lib/asset-operation-options"
import { buildExactAssetRegisterHref } from "@/lib/asset-register-view-memory"
import { countLegacyReturns, getCheckinPreselect } from "@/lib/checkin-page-data"
import { formatCount } from "@/lib/display-format"
import { requirePagePermission } from "@/lib/page-auth"
import { CheckinForm } from "@/components/asset-operations/checkin-form"
import { normalizeAssetReturnTo } from "@/lib/asset-return-navigation"
import { cn } from "@/lib/utils"

type CheckinPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ checkoutId?: string | string[]; assetId?: string | string[]; returnTo?: string | string[] }>
}

export default async function CheckinPage({ params, searchParams }: CheckinPageProps) {
  const { locale } = await params
  const filters = await searchParams
  await requirePagePermission(locale, "asset", "edit")
  const t = await getTranslations("checkin")
  // The master lists, at most one preselect answer and one count: the picker asks the server search (spec 6.3).
  const [options, preselect, legacyReturnCount] = await Promise.all([
    getAssetOperationMasterOptions(),
    getCheckinPreselect({ checkoutId: filters.checkoutId, assetId: filters.assetId }),
    countLegacyReturns(),
  ])
  // The header link (group 3 spec §8.1): N opens the register's noHandover list, the count's own where, as an exact
  // link that leaves the viewer's saved register view alone. Nothing when N is 0. Built here because the form is a
  // client file that imports no next/link (tests/operations-sweep-ui.test.ts).
  const legacyLink = legacyReturnCount > 0 ? (
    <Link href={buildExactAssetRegisterHref(locale, { dataQuality: "noHandover" })} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center text-meta md:min-h-0")}>
      {t("legacyReturnLink", { count: formatCount(legacyReturnCount) })}
    </Link>
  ) : null

  return (
    <CheckinForm
      employees={options.employees}
      locations={options.locations}
      statuses={options.statuses}
      conditions={options.conditions}
      initialRow={preselect.row}
      initialQuery={preselect.query}
      legacyLink={legacyLink}
      returnTo={filters.returnTo ? normalizeAssetReturnTo(locale, filters.returnTo) : undefined}
    />
  )
}
