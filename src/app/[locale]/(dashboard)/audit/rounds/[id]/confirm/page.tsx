import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { requirePagePermission } from "@/lib/page-auth"
import { hasPermission } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { Notice } from "@/components/ui/notice"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { InspectionConfirmWorkspace } from "@/components/audit/inspection-confirm/inspection-confirm-workspace"
import { appendOperationalReturnTo, normalizeAuditRoundDetailReturnTo } from "@/lib/operational-return-navigation"
import { loadRoundDisposalSummary, loadRoundInspectionRows } from "@/lib/inspection-confirm-data"
import { inspectionTabCounts, parseInspectionTab, toInspectionPageRow } from "@/lib/inspection-confirm-page-model"
import type { InspectionTargetStatusName } from "@/lib/inspection-confirm-rules"

const inspectionTargetStatusNames: readonly InspectionTargetStatusName[] = ["In Use", "Ready", "Checked Out", "Missing"]

type InspectionConfirmPageProps = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ tab?: string | string[]; returnTo?: string | string[] }>
}

// ยืนยันผลตรวจ, the round's confirm page (inspection-confirm plan 3): the round's assets still under inspection, in five
// tabs. Anyone with audit:view reads it; asset:edit (the confirm API's permission) gets the tick column (Task 3).
export default async function InspectionConfirmPage({ params, searchParams }: InspectionConfirmPageProps) {
  const { locale, id } = await params
  const rawSearchParams = await searchParams
  const user = await requirePagePermission(locale, "audit", "view")
  const canConfirm = hasPermission(user, "asset", "edit")
  // Plan 4 task 3: the damaged row's two ways on, and the not-found tab's lost-disposal block.
  const canRepair = hasPermission(user, "maintenance", "create")
  const canDispose = hasPermission(user, "disposal", "create")
  const t = await getTranslations("inspectionConfirmPage")

  const round = await prisma.auditRound.findUnique({ where: { id }, select: { id: true, auditNo: true, status: true, isActive: true } })
  if (!round || !round.isActive) notFound()

  // The round page's way back comes along (its confirmHref carries roundDetailReturnHref), read as the pending page reads
  // its own: only the round page, with its query, else the bare round. The crumb, the back link, the empty state and the
  // pending list's way back all use it.
  const rawReturnTo = Array.isArray(rawSearchParams.returnTo) ? rawSearchParams.returnTo[0] : rawSearchParams.returnTo
  const roundHref = normalizeAuditRoundDetailReturnTo(locale, round.id, rawReturnTo)
  const links = {
    round: roundHref,
    pendingFindings: `/${locale}/audit/findings?status=pending&roundId=${round.id}`,
    pendingItems: appendOperationalReturnTo(`/${locale}/audit/rounds/${round.id}/pending`, roundHref),
  }

  const header = (
    <PageHeader
      className="mb-6"
      breadcrumbs={[
        // No /audit page of its own: the section name is plain text.
        { label: t("crumbAudit") },
        { label: t("crumbRounds"), href: `/${locale}/audit/rounds` },
        { label: round.auditNo, href: links.round, code: true },
        { label: t("title") },
      ]}
      title={t("title")}
      meta={
        <>
          <span>{t("eyebrow", { auditNo: round.auditNo })}</span>
          <span>{t("lead")}</span>
        </>
      }
      back={<PageBackLink href={links.round} label={t("backToRound")} />}
    />
  )

  // A cancelled round has nothing to confirm (Global Constraints): the header and the notice only.
  if (round.status === "cancelled") {
    return (
      <div>
        {header}
        <ContentPanel>
          <Notice tone="info">{t("cancelledNotice")}</Notice>
        </ContentPanel>
      </div>
    )
  }

  // No pagination (final review ruling): a round holds at most a few hundred assets, and select-all takes at most
  // INSPECTION_CONFIRM_MAX_ASSETS (500) of the tab and says so when it caps, so the whole tab is one list.
  const [inspectionRows, disposal] = await Promise.all([loadRoundInspectionRows(prisma, round.id), loadRoundDisposalSummary(prisma, round.id)])
  const rows = inspectionRows.map(toInspectionPageRow)
  const counts = inspectionTabCounts(rows)
  const tabParam = Array.isArray(rawSearchParams.tab) ? rawSearchParams.tab[0] : rawSearchParams.tab
  const tab = parseInspectionTab(tabParam, counts)
  const tabRows = rows.filter((row) => row.tab === tab)

  // Each target's Thai name, read once.
  const statuses = await prisma.assetStatus.findMany({ where: { name: { in: [...inspectionTargetStatusNames] } }, select: { name: true, nameTh: true } })
  const statusLabels = Object.fromEntries(
    inspectionTargetStatusNames.map((name) => [name, statuses.find((status) => status.name === name)?.nameTh ?? name]),
  ) as Record<InspectionTargetStatusName, string>

  // The disposal line (plan 4 task 3): requests made from this round, and once some are approved the way to a disposal
  // round, the queue filtered to this round's approved requests. The line only with disposal:view and the link only with
  // disposal:edit (plan 4 final review): nobody is offered a page or a round the app would refuse.
  const canViewDisposal = hasPermission(user, "disposal", "view")
  const canCreateDisposalRound = hasPermission(user, "disposal", "edit")
  const disposalLine = canViewDisposal && disposal.requests > 0 ? (
    <p className="mb-4 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
      <span>{t("disposalLine", { requests: disposal.requests, approved: disposal.approved })}</span>
      {canCreateDisposalRound && disposal.approved > 0 ? (
        <Link href={`/${locale}/disposal?status=approved&auditRound=${round.id}`} className={`${linkVariants({ size: "inherit" })} inline-flex min-h-11 items-center md:min-h-0`}>
          {t("disposalRoundLink")}
        </Link>
      ) : null}
    </p>
  ) : null

  return (
    <div>
      {header}
      {disposalLine}
      <InspectionConfirmWorkspace
        locale={locale}
        roundId={round.id}
        auditNo={round.auditNo}
        roundStatus={round.status}
        tab={tab}
        counts={counts}
        rows={tabRows}
        canConfirm={canConfirm}
        canRepair={canRepair}
        canDispose={canDispose}
        missingForDisposal={disposal.missingForDisposal}
        damagedForDisposal={disposal.damagedForDisposal}
        statusLabels={statusLabels}
        links={links}
        returnTo={rawReturnTo ? roundHref : null}
      />
    </div>
  )
}
