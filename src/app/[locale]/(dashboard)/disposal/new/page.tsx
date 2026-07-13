import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { getDisposalAssetEligibilityError } from "@/lib/disposal-policy"
import { normalizeOperationalReturnTo } from "@/lib/operational-return-navigation"
import { DisposalRequestForm } from "@/components/disposal/disposal-request-form"

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("createTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("createSubtitle")}</p>
        </div>
        <Link
          href={returnToHref}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-10 sm:min-h-0"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {tCommon("back")}
        </Link>
      </div>
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
