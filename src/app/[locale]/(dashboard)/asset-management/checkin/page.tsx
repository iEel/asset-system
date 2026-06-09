import { getAssetOperationOptions } from "@/lib/asset-operation-options"
import { requirePagePermission } from "@/lib/page-auth"
import { CheckinForm } from "@/components/asset-operations/checkin-form"

type CheckinPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ checkoutId?: string }>
}

export default async function CheckinPage({ params, searchParams }: CheckinPageProps) {
  const { locale } = await params
  const filters = await searchParams
  await requirePagePermission(locale, "asset", "edit")
  const options = await getAssetOperationOptions()

  return (
    <CheckinForm
      activeCheckouts={options.activeCheckouts}
      legacyReturnCandidates={options.legacyReturnCandidates}
      employees={options.employees}
      locations={options.locations}
      statuses={options.statuses}
      conditions={options.conditions}
      initialCheckoutId={filters.checkoutId}
    />
  )
}
