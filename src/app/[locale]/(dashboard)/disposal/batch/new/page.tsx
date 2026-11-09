import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { DisposalBatchForm } from "@/components/disposal/disposal-batch-form"
import { buttonVariants } from "@/components/ui/button-variants"
import { Notice } from "@/components/ui/notice"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { requirePagePermission } from "@/lib/page-auth"
import { prisma } from "@/lib/db"
import { defaultDisposalRequester } from "@/lib/disposal-request-form-rules"
import { disposalAssetOptionSelect, toDisposalAssetOption } from "@/lib/disposal-asset-option"
import { DISPOSAL_BATCH_MAX_ASSETS } from "@/lib/disposal-batch-form-rules"
import { loadRoundDisposalSummary } from "@/lib/inspection-confirm-data"
import { normalizeDisposalFormReturnTo } from "@/lib/operational-return-navigation"
import { isDisposalBatchSchemaReady } from "@/lib/disposal-schema-readiness"
import { ActionEmptyState } from "@/components/ui/action-empty-state"

const PENDING_DISPOSAL_STATUS = "Pending Disposal"
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type NewDisposalBatchPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    type?: string | string[]
    fromAuditRound?: string | string[]
    returnTo?: string | string[]
  }>
}

// สร้างชุดคำขอตัดจำหน่าย (DP-Batch-New, request batches spec §4). The form is for the computer: below md the page shows
// only its header and a notice with a link to the single request form; the form itself hides there.
// ?type=lost&fromAuditRound=<uuid> (ยืนยันผลตรวจ plan 4 task 4, the confirm page's lost-disposal link): the form opens
// with the round's หาไม่พบ assets that have no open request, the first DISPOSAL_BATCH_MAX_ASSETS of them, the method สูญหาย
// and the source audit_round. Without both params, or with a round that is not there, the page is as before.
export default async function NewDisposalBatchPage({ params, searchParams }: NewDisposalBatchPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  const user = await requirePagePermission(locale, "disposal", "create")
  const [t, tCommon, schemaReady] = await Promise.all([
    getTranslations("disposalPage"),
    getTranslations("common"),
    isDisposalBatchSchemaReady(),
  ])
  // returnTo: the queue (with its query) or the confirm page that linked here; anything else is the queue.
  const returnToHref = normalizeDisposalFormReturnTo(locale, rawSearchParams.returnTo)
  const backLabel = returnToHref.startsWith(`/${locale}/disposal`) ? t("backToQueue") : tCommon("back")
  const back = <PageBackLink href={returnToHref} label={backLabel} />

  if (!schemaReady) {
    return <div className="space-y-6">
      <PageHeader title={t("batchCreateTitle")} meta={t("batchCreateHelp")} back={back} />
      <ActionEmptyState
        tone="error"
        title={t("batchSchemaMissingTitle")}
        description={t("batchSchemaMissingHelp")}
        actionHref={returnToHref}
        actionLabel={backLabel}
      />
    </div>
  }

  const type = getSingleSearchParam(rawSearchParams.type)
  const fromAuditRound = getSingleSearchParam(rawSearchParams.fromAuditRound)
  const fromRoundId = type === "lost" && fromAuditRound && uuidPattern.test(fromAuditRound) ? fromAuditRound : null

  // The round's prefill: its active หาไม่พบ assets with no open request (loadRoundDisposalSummary), the first
  // DISPOSAL_BATCH_MAX_ASSETS kept in tag order, each read as the picker reads it for a lost request.
  async function readRoundPrefill(id: string) {
    const round = await prisma.auditRound.findUnique({ where: { id }, select: { id: true, auditNo: true, isActive: true } })
    if (!round || !round.isActive) return null
    const confirmPath = `/${locale}/audit/rounds/${round.id}/confirm`
    const summary = await loadRoundDisposalSummary(prisma, round.id)
    const kept = summary.missingForDisposal.slice(0, DISPOSAL_BATCH_MAX_ASSETS)
    const assets = kept.length > 0
      ? await prisma.asset.findMany({ where: { id: { in: kept.map((item) => item.assetId) }, isActive: true }, select: disposalAssetOptionSelect })
      : []
    const byId = new Map(assets.map((asset) => [asset.id, toDisposalAssetOption(asset, "lost")]))
    // Only eligible ones are chosen, as the picker lets no blocked option be picked; the POST checks them again.
    const machines = kept.flatMap((item) => {
      const option = byId.get(item.assetId)
      return option && option.eligible ? [option] : []
    })
    return {
      roundId: round.id,
      auditNo: round.auditNo,
      machines,
      capped: summary.missingForDisposal.length > DISPOSAL_BATCH_MAX_ASSETS,
      // The notice links back to the confirm page: the one returnTo names (with its tab and way back) when it is this
      // round's, else its not-found tab.
      confirmHref: returnToHref.startsWith(`${confirmPath}?`) || returnToHref === confirmPath ? returnToHref : `${confirmPath}?tab=notFound`,
    }
  }

  const [employees, pendingStatus, prefill] = await Promise.all([
    prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, code: true, fullNameTh: true, department: { select: { name: true } } },
      orderBy: { code: "asc" },
    }),
    prisma.assetStatus.findFirst({ where: { name: PENDING_DISPOSAL_STATUS, isActive: true }, select: { nameTh: true } }),
    fromRoundId
      ? readRoundPrefill(fromRoundId)
      : null,
  ])
  // Pickers keep "code - name", and the requester's adds the department, as the single form (group 6 spec §8.3).
  const employeeOptions = employees.map((employee) => ({
    id: employee.id,
    label: `${employee.code} - ${employee.fullNameTh} · ${employee.department.name}`,
  }))
  // The requester starts as the signed-in user's employee; with no link it stays empty and the hint says so.
  const requester = defaultDisposalRequester({ employeeId: user.employeeId ?? null }, employeeOptions)

  return <>
    <div data-disposal-batch-phone className="space-y-6 md:hidden">
      <PageHeader title={t("batchCreateTitle")} meta={t("batchCreateHelp")} back={back} />
      <Notice
        tone="info"
        title={t("batchForm.phoneTitle")}
        action={<Link href={`/${locale}/disposal/new`} className={buttonVariants({ variant: "outline", size: "md" })}>{t("batchForm.phoneLink")}</Link>}
      />
    </div>
    <DisposalBatchForm
      breadcrumbs={[{ label: t("title"), href: `/${locale}/disposal` }, { label: t("batchCreateTitle") }]}
      back={back}
      locale={locale}
      cancelHref={returnToHref}
      employees={employeeOptions}
      initialRequesterId={requester.requestedById}
      requesterNeedsChoice={requester.needsChoice}
      pendingDisposalLabel={pendingStatus?.nameTh ?? PENDING_DISPOSAL_STATUS}
      initialMachines={prefill?.machines}
      initialDisposalType={prefill ? "lost" : undefined}
      source={prefill ? { sourceType: "audit_round", sourceId: prefill.roundId } : undefined}
      roundNotice={prefill ? { auditNo: prefill.auditNo, count: prefill.machines.length, href: prefill.confirmHref } : undefined}
      capNotice={prefill?.capped ?? false}
    />
  </>
}

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}
