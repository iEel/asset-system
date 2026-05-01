import { getAssetOperationOptions } from "@/lib/asset-operation-options"
import { requirePagePermission } from "@/lib/page-auth"
import { TransferForm } from "@/components/asset-operations/transfer-form"

type TransferPageProps = {
  params: Promise<{ locale: string }>
}

export default async function TransferPage({ params }: TransferPageProps) {
  const { locale } = await params
  await requirePagePermission(locale, "asset", "edit")
  const options = await getAssetOperationOptions()

  return (
    <TransferForm
      assets={options.assets}
      employees={options.employees}
      departments={options.departments}
      locations={options.locations}
    />
  )
}
