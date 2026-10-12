import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { getDisposalAssetEligibilityError } from "@/lib/disposal-policy"
import { normalizeOperationalReturnTo } from "@/lib/operational-return-navigation"
import { DisposalRequestForm } from "@/components/disposal/disposal-request-form"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"

type NewDisposalPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    assetId?: string | string[]
    reason?: string | string[]
    sourceType?: string | string[]
    sourceId?: string | string[]
    returnTo?: string | string[]
  }>
}

export default async function NewDisposalPage({ params, searchParams }: NewDisposalPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  await requirePagePermission(locale, "disposal", "create")
  const initialAssetId = getSingleSearchParam(rawSearchParams.assetId)
  const [t, tCommon, initialAsset, employees] = await Promise.all([
    getTranslations("disposalPage"),
    getTranslations("common"),
    initialAssetId
      ? prisma.asset.findFirst({
          where: { id: initialAssetId, isActive: true },
          select: { id: true, assetTag: true, name: true, status: { select: { name: true, nameTh: true } } },
        })
      : Promise.resolve(null),
    prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, code: true, fullNameTh: true },
      orderBy: { code: "asc" },
    }),
  ])
  const returnToHref = normalizeOperationalReturnTo(locale, "disposal", rawSearchParams.returnTo)
  const eligibleInitialAsset = initialAsset && getDisposalAssetEligibilityError(initialAsset.status) === null
    ? { id: initialAsset.id, label: `${initialAsset.assetTag} - ${initialAsset.name} (${initialAsset.status.nameTh})` }
    : undefined
  const employeeOptions = employees.map((employee) => ({ id: employee.id, label: `${employee.code} - ${employee.fullNameTh}` }))

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("createTitle")}
        meta={t("createSubtitle")}
        back={<PageBackLink href={returnToHref} label={tCommon("back")} />}
      />
      <DisposalRequestForm
        employees={employeeOptions}
        initialAsset={eligibleInitialAsset}
        initialReason={getSingleSearchParam(rawSearchParams.reason)}
        initialSourceType={getSingleSearchParam(rawSearchParams.sourceType)}
        initialSourceId={getSingleSearchParam(rawSearchParams.sourceId)}
      />
    </div>
  )
}

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}
