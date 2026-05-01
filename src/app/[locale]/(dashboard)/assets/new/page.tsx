import { requirePagePermission } from "@/lib/page-auth"
import { getAssetFormOptions } from "@/lib/asset-form-options"
import { AssetForm } from "@/components/assets/asset-form"

type NewAssetPageProps = {
  params: Promise<{ locale: string }>
}

export default async function NewAssetPage({ params }: NewAssetPageProps) {
  const { locale } = await params
  await requirePagePermission(locale, "asset", "create")

  const options = await getAssetFormOptions()

  return <AssetForm {...options} />
}
