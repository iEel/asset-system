import { getAssetOperationOptions } from "@/lib/asset-operation-options"
import { requirePagePermission } from "@/lib/page-auth"
import { CheckinForm } from "@/components/asset-operations/checkin-form"

type CheckinPageProps = {
  params: Promise<{ locale: string }>
}

export default async function CheckinPage({ params }: CheckinPageProps) {
  const { locale } = await params
  await requirePagePermission(locale, "asset", "edit")
  const options = await getAssetOperationOptions()

  return (
    <CheckinForm
      activeCheckouts={options.activeCheckouts}
      employees={options.employees}
      locations={options.locations}
      statuses={options.statuses}
      conditions={options.conditions}
    />
  )
}
