import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { requirePagePermission } from "@/lib/page-auth"
import { hasPermission } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { ContentPanel } from "@/components/ui/content-panel"
import { Notice } from "@/components/ui/notice"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { InspectionConfirmWorkspace } from "@/components/audit/inspection-confirm/inspection-confirm-workspace"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
import { loadRoundInspectionRows } from "@/lib/inspection-confirm-data"
import { inspectionTabCounts, parseInspectionTab, toInspectionPageRow } from "@/lib/inspection-confirm-page-model"
import type { InspectionTargetStatusName } from "@/lib/inspection-confirm-rules"

const inspectionTargetStatusNames: readonly InspectionTargetStatusName[] = ["In Use", "Ready", "Checked Out", "Missing"]

type InspectionConfirmPageProps = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ tab?: string | string[] }>
}

// ยืนยันผลตรวจ, the round's confirm page (inspection-confirm plan 3): the round's assets still under inspection, in five
// tabs. Anyone with audit:view reads it; asset:edit (the confirm API's permission) gets the tick column (Task 3).
export default async function InspectionConfirmPage({ params, searchParams }: InspectionConfirmPageProps) {
  const { locale, id } = await params
  const rawSearchParams = await searchParams
  const user = await requirePagePermission(locale, "audit", "view")
  const canConfirm = hasPermission(user, "asset", "edit")
  const t = await getTranslations("inspectionConfirmPage")

  const round = await prisma.auditRound.findUnique({ where: { id }, select: { id: true, auditNo: true, status: true, isActive: true } })
  if (!round || !round.isActive) notFound()

  // The round page's own links: its pending list comes back to the round (the round page's pendingHref construction).
  const roundHref = `/${locale}/audit/rounds/${round.id}`
  const links = {
    round: `/${locale}/audit/rounds/${round.id}`,
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

  const rows = (await loadRoundInspectionRows(prisma, round.id)).map(toInspectionPageRow)
  const counts = inspectionTabCounts(rows)
  const tabParam = Array.isArray(rawSearchParams.tab) ? rawSearchParams.tab[0] : rawSearchParams.tab
  const tab = parseInspectionTab(tabParam, counts)
  const tabRows = rows.filter((row) => row.tab === tab)

  // Each target's Thai name, read once.
  const statuses = await prisma.assetStatus.findMany({ where: { name: { in: [...inspectionTargetStatusNames] } }, select: { name: true, nameTh: true } })
  const statusLabels = Object.fromEntries(
    inspectionTargetStatusNames.map((name) => [name, statuses.find((status) => status.name === name)?.nameTh ?? name]),
  ) as Record<InspectionTargetStatusName, string>

  return (
    <div>
      {header}
      <InspectionConfirmWorkspace
        locale={locale}
        roundId={round.id}
        auditNo={round.auditNo}
        tab={tab}
        counts={counts}
        rows={tabRows}
        canConfirm={canConfirm}
        statusLabels={statusLabels}
        links={links}
      />
    </div>
  )
}
