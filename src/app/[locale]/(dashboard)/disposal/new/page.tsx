import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { getDisposalAssetEligibilityError } from "@/lib/disposal-policy"
import {
  disposalReadinessAssetSelect,
  getDisposalOutstandingComponentTags,
  getDisposalReadinessBlockersForAsset,
} from "@/lib/disposal-readiness"
import { defaultDisposalRequester, initialDisposalAsset } from "@/lib/disposal-request-form-rules"
import { normalizeOperationalReturnTo } from "@/lib/operational-return-navigation"
import { DisposalRequestForm } from "@/components/disposal/disposal-request-form"
import { PageBackLink } from "@/components/ui/page-header"

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
  const user = await requirePagePermission(locale, "disposal", "create")
  const initialAssetId = getSingleSearchParam(rawSearchParams.assetId)
  const [t, tCommon, initialAsset, employees, statuses] = await Promise.all([
    getTranslations("disposalPage"),
    getTranslations("common"),
    initialAssetId
      ? prisma.asset.findFirst({
          where: { id: initialAssetId, isActive: true },
          select: {
            id: true,
            assetTag: true,
            name: true,
            status: { select: { name: true, nameTh: true } },
            ...disposalReadinessAssetSelect,
          },
        })
      : Promise.resolve(null),
    prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, code: true, fullNameTh: true, department: { select: { name: true } } },
      orderBy: { code: "asc" },
    }),
    // Every active status by its name: the summary's รอตัดจำหน่าย and its footnote (spec §8.5).
    prisma.assetStatus.findMany({ where: { isActive: true }, select: { name: true, nameTh: true } }),
  ])
  const returnToHref = normalizeOperationalReturnTo(locale, "disposal", rawSearchParams.returnTo)
  // The ?assetId= prefill (plan 3 Task 1, review focus 5): readiness as the POST computes it. A ready asset is
  // preselected; a blocked one is not, and the page says why.
  const initialBlockers = initialAsset
    ? [
        ...(getDisposalAssetEligibilityError(initialAsset.status) !== null ? ["lifecycle_status" as const] : []),
        ...getDisposalReadinessBlockersForAsset(initialAsset),
      ]
    : []
  const initialAssetRule = initialDisposalAsset(initialAsset ? { eligible: initialBlockers.length === 0, blockers: initialBlockers } : null)
  const eligibleInitialAsset = initialAsset && initialAssetRule === "use"
    ? { id: initialAsset.id, label: `${initialAsset.assetTag} - ${initialAsset.name} (${initialAsset.status.nameTh})` }
    : undefined
  const blockedInitialAsset = initialAsset && initialAssetRule === "blocked"
    ? {
        label: `${initialAsset.assetTag} - ${initialAsset.name}`,
        reasons: initialBlockers
          .map((blocker) => t(`readinessBlockers.${blocker}`, { tags: getDisposalOutstandingComponentTags(initialAsset).join(", ") }))
          .join(" · "),
      }
    : undefined
  // Pickers keep "code - name", and the requester's adds the department (spec §8.3).
  const employeeOptions = employees.map((employee) => ({
    id: employee.id,
    label: `${employee.code} - ${employee.fullNameTh} · ${employee.department.name}`,
  }))
  // The requester starts as the signed-in user's employee; with no link it stays empty and the hint says so.
  const requester = defaultDisposalRequester({ employeeId: user.employeeId ?? null }, employeeOptions)
  const statusLabels = Object.fromEntries(statuses.map((status) => [status.name, status.nameTh]))

  return (
    <DisposalRequestForm
      breadcrumbs={[{ label: t("title"), href: `/${locale}/disposal` }, { label: t("createTitle") }]}
      back={<PageBackLink href={returnToHref} label={tCommon("back")} />}
      locale={locale}
      cancelHref={returnToHref}
      employees={employeeOptions}
      initialAsset={eligibleInitialAsset}
      initialBlocked={blockedInitialAsset}
      initialReason={getSingleSearchParam(rawSearchParams.reason)}
      initialSourceType={getSingleSearchParam(rawSearchParams.sourceType)}
      initialSourceId={getSingleSearchParam(rawSearchParams.sourceId)}
      initialRequesterId={requester.requestedById}
      requesterNeedsChoice={requester.needsChoice}
      statusLabels={statusLabels}
    />
  )
}

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}
