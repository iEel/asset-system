import { getAssetOperationMasterOptions } from "@/lib/asset-operation-options"
import { countLegacyReturns, getCheckinPreselect } from "@/lib/checkin-page-data"
import { requirePagePermission } from "@/lib/page-auth"
import { CheckinForm } from "@/components/asset-operations/checkin-form"
import { normalizeAssetReturnTo } from "@/lib/asset-return-navigation"

type CheckinPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ checkoutId?: string | string[]; assetId?: string | string[]; returnTo?: string | string[] }>
}

export default async function CheckinPage({ params, searchParams }: CheckinPageProps) {
  const { locale } = await params
  const filters = await searchParams
  await requirePagePermission(locale, "asset", "edit")
  // The master lists, at most one preselect answer and one count: the picker asks the server search (spec 6.3).
  const [options, preselect, legacyReturnCount] = await Promise.all([
    getAssetOperationMasterOptions(),
    getCheckinPreselect({ checkoutId: filters.checkoutId, assetId: filters.assetId }),
    countLegacyReturns(),
  ])

  return (
    <CheckinForm
      employees={options.employees}
      locations={options.locations}
      statuses={options.statuses}
      conditions={options.conditions}
      initialRow={preselect.row}
      initialQuery={preselect.query}
      legacyReturnCount={legacyReturnCount}
      returnTo={filters.returnTo ? normalizeAssetReturnTo(locale, filters.returnTo) : undefined}
    />
  )
}
