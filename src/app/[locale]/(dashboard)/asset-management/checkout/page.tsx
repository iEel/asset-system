import { getAssetOperationMasterOptions, getAssetOperationPreselect } from "@/lib/asset-operation-options"
import { requirePagePermission } from "@/lib/page-auth"
import { CheckoutForm } from "@/components/asset-operations/checkout-form"
import { normalizeAssetReturnTo } from "@/lib/asset-return-navigation"

type CheckoutPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ assetId?: string | string[]; returnTo?: string | string[] }>
}

export default async function CheckoutPage({ params, searchParams }: CheckoutPageProps) {
  const { locale } = await params
  const filters = await searchParams
  await requirePagePermission(locale, "asset", "edit")
  const [options, initialAsset] = await Promise.all([
    getAssetOperationMasterOptions(),
    getAssetOperationPreselect("checkout", filters.assetId),
  ])

  return (
    <CheckoutForm
      employees={options.employees}
      departments={options.departments}
      locations={options.locations}
      conditions={options.conditions}
      initialAsset={initialAsset}
      returnTo={filters.returnTo ? normalizeAssetReturnTo(locale, filters.returnTo) : undefined}
    />
  )
}
