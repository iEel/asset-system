import { getAssetOperationOptions } from "@/lib/asset-operation-options"
import { requirePagePermission } from "@/lib/page-auth"
import { BulkMoveForm } from "@/components/asset-operations/bulk-move-form"

type BulkMovePageProps = {
  params: Promise<{ locale: string }>
}

export default async function BulkMovePage({ params }: BulkMovePageProps) {
  const { locale } = await params
  await requirePagePermission(locale, "asset", "edit")
  const options = await getAssetOperationOptions()

  return <BulkMoveForm assets={options.assets} locations={options.locations} />
}
