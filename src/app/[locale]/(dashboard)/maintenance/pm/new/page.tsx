import { getTranslations } from "next-intl/server"
import { MaintenancePlanForm } from "@/components/maintenance/maintenance-plan-form"
import { PageBackLink } from "@/components/ui/page-header"
import { prisma } from "@/lib/db"
import { maintenanceListCrumbHref, normalizeMaintenanceReturnTo } from "@/lib/operational-return-navigation"
import { requirePagePermission } from "@/lib/page-auth"
import { readPmDueCounts } from "@/lib/pm-due-counts"
import { getBangkokDateKey } from "@/lib/preventive-maintenance"
import { loadRepairAssetFacts, type RepairAssetFactsDb } from "@/lib/repair-asset-facts"

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ assetId?: string; returnTo?: string | string[] }>
}

// เพิ่มแผน PM (MT-PM-Form create, group 5 spec §10): ?assetId= preselects the asset (Appendix A); its card reads the
// same facts as บันทึกซ่อม's (G5P4-R9). The summary moves the new plan through the PM page's three counts (G5P4-R10).
export default async function NewMaintenancePlanPage({ params, searchParams }: Props) {
  const { locale } = await params
  const query = await searchParams
  await requirePagePermission(locale, "maintenance", "create")
  const t = await getTranslations("maintenancePage")
  const tRecord = await getTranslations("repairRecord")
  const tCommon = await getTranslations("common")
  // The PM list, the repair list or the asset tab the user came from (group 5 spec §5 "Way back").
  const returnTo = normalizeMaintenanceReturnTo(locale, query.returnTo, "maintenance-pm")
  const now = new Date()
  const [facts, due] = await Promise.all([
    query.assetId ? loadRepairAssetFacts(prisma as unknown as RepairAssetFactsDb, query.assetId) : Promise.resolve(null),
    readPmDueCounts(prisma, now),
  ])

  return (
    <MaintenancePlanForm
      breadcrumbs={[
        { label: tRecord("title"), href: `/${locale}/maintenance` },
        { label: t("pmTitle"), href: maintenanceListCrumbHref(returnTo, `/${locale}/maintenance/pm`) },
        { label: t("pmCreateTitle") },
      ]}
      back={<PageBackLink href={returnTo} label={tCommon("back")} />}
      title={t("pmCreateTitle")}
      description={t("pmSubtitle")}
      locale={locale}
      returnHref={returnTo}
      initialFacts={facts}
      dueCounts={{ overdue: due.overdue.count, soon: due.soon.count, later: due.later.count }}
      todayKey={getBangkokDateKey(now)}
    />
  )
}
