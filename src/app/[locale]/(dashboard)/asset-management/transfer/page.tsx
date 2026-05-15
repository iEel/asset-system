import { getAssetOperationOptions } from "@/lib/asset-operation-options"
import { requirePagePermission } from "@/lib/page-auth"
import { TransferForm } from "@/components/asset-operations/transfer-form"

type TransferPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ assetId?: string }>
}

export default async function TransferPage({ params, searchParams }: TransferPageProps) {
  const { locale } = await params
  const filters = await searchParams
  await requirePagePermission(locale, "asset", "edit")
  const options = await getAssetOperationOptions()

  return (
    <TransferForm
      assets={options.assets}
      employees={options.employees}
      departments={options.departments}
      locations={options.locations}
      initialAssetId={filters.assetId}
    />
  )
}
