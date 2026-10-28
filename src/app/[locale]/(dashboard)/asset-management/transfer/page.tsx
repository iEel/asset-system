import { getAssetOperationMasterOptions, getAssetOperationPreselect } from "@/lib/asset-operation-options"
import { requirePagePermission } from "@/lib/page-auth"
import { TransferForm } from "@/components/asset-operations/transfer-form"
import { normalizeAssetReturnTo } from "@/lib/asset-return-navigation"

type TransferPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ assetId?: string | string[]; returnTo?: string | string[] }>
}

export default async function TransferPage({ params, searchParams }: TransferPageProps) {
  const { locale } = await params
  const filters = await searchParams
  await requirePagePermission(locale, "asset", "edit")
  const [options, initialAsset] = await Promise.all([
    getAssetOperationMasterOptions(),
    getAssetOperationPreselect("transfer", filters.assetId),
  ])

  return (
    <TransferForm
      employees={options.employees}
      departments={options.departments}
      locations={options.locations}
      initialAsset={initialAsset}
      returnTo={filters.returnTo ? normalizeAssetReturnTo(locale, filters.returnTo) : undefined}
    />
  )
}
