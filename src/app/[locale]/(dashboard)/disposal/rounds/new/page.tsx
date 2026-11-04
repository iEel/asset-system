import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { canUseHistoricalDisposalEvidenceException } from "@/lib/disposal-evidence-exception"
import { getBangkokDateKey } from "@/lib/preventive-maintenance"
import { DisposalRoundForm } from "@/components/disposal/disposal-round-form"
import { PageBackLink } from "@/components/ui/page-header"

type NewDisposalRoundPageProps = {
  params: Promise<{ locale: string }>
}

// สร้างรอบตัดจำหน่าย (group 6 plan 4 Task 4, spec §11.2): the machines come from the approved tab's selection in
// sessionStorage (P4-R2), so the page itself only gives the form its presets.
export default async function NewDisposalRoundPage({ params }: NewDisposalRoundPageProps) {
  const { locale } = await params
  const user = await requirePagePermission(locale, "disposal", "edit")
  const [t, tCommon, statuses] = await Promise.all([
    getTranslations("disposalPage"),
    getTranslations("common"),
    // Every active status by its name: the summary's รอตัดจำหน่าย and ตัดจำหน่ายแล้ว.
    prisma.assetStatus.findMany({ where: { isActive: true }, select: { name: true, nameTh: true } }),
  ])
  const approvedTabHref = `/${locale}/disposal?status=approved`

  return (
    <DisposalRoundForm
      breadcrumbs={[
        { label: t("title"), href: `/${locale}/disposal` },
        { label: t("rounds.listTitle"), href: `/${locale}/disposal/rounds` },
        { label: t("rounds.createCrumb") },
      ]}
      back={<PageBackLink href={approvedTabHref} label={tCommon("back")} />}
      locale={locale}
      todayKey={getBangkokDateKey(new Date())}
      initialExecutorId={user.employeeId ?? ""}
      canUseEvidenceException={canUseHistoricalDisposalEvidenceException(user.roles)}
      statusLabels={Object.fromEntries(statuses.map((status) => [status.name, status.nameTh]))}
    />
  )
}
