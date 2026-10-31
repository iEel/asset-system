import { getAssetOperationMasterOptions, getAssetOperationPreselect } from "@/lib/asset-operation-options"
import { requirePagePermission } from "@/lib/page-auth"
import { hasPermission } from "@/lib/auth-utils"
import { CheckoutForm } from "@/components/asset-operations/checkout-form"
import { normalizeAssetReturnTo } from "@/lib/asset-return-navigation"
import { getUserDisplayLabel } from "@/lib/user-display"

type CheckoutPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ assetId?: string | string[]; returnTo?: string | string[] }>
}

export default async function CheckoutPage({ params, searchParams }: CheckoutPageProps) {
  const { locale } = await params
  const filters = await searchParams
  const user = await requirePagePermission(locale, "asset", "edit")
  const [options, initialAsset] = await Promise.all([
    getAssetOperationMasterOptions({ employeeDetail: true, conditionsFor: "checkout" }),
    getAssetOperationPreselect("checkout", filters.assetId, { detail: true }),
  ])

  return (
    <CheckoutForm
      employees={options.employees}
      departments={options.departments}
      locations={options.locations}
      conditions={options.conditions}
      initialAsset={initialAsset}
      returnTo={filters.returnTo ? normalizeAssetReturnTo(locale, filters.returnTo) : undefined}
      deliveredByLabel={getUserDisplayLabel(user)}
      canCreateRepair={hasPermission(user, "maintenance", "create")}
    />
  )
}
