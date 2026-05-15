import { getAssetOperationOptions } from "@/lib/asset-operation-options"
import { requirePagePermission } from "@/lib/page-auth"
import { CheckoutForm } from "@/components/asset-operations/checkout-form"

type CheckoutPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ assetId?: string }>
}

export default async function CheckoutPage({ params, searchParams }: CheckoutPageProps) {
  const { locale } = await params
  const filters = await searchParams
  await requirePagePermission(locale, "asset", "edit")
  const options = await getAssetOperationOptions()

  return (
    <CheckoutForm
      assets={options.assets}
      employees={options.employees}
      departments={options.departments}
      locations={options.locations}
      conditions={options.conditions}
      initialAssetId={filters.assetId}
    />
  )
}
