import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { listAssetStateReviews } from "@/lib/asset-state-review-service"
import { assetMissingResponsibilityWhere } from "@/lib/asset-ownership"
import { assetDataQualityRulesKey, parseAssetDataQualityRules } from "@/lib/data-quality-rules"
import { buildDataQualityRuleHref } from "@/lib/data-quality-drilldown"
import { distribution, parseDataQualityTab, type RuleCount } from "@/lib/data-quality-page-model"
import { getWaitingWorkRules } from "@/lib/waiting-work"
import { startOfBangkokDay, warrantyExpiringSoonWhere } from "@/lib/waiting-work-rules"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"
import { DataQualityRuleForm } from "@/components/admin/data-quality-rule-form"
import { AssetStateReviewWorkspace, type AssetStateReviewResponse } from "@/components/admin/asset-state-review-workspace"
import { statusMarkerVariants } from "@/components/ui/badge-variants"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { DistributionBar } from "@/components/ui/distribution-bar"
import { PageHeader } from "@/components/ui/page-header"
import { TabNav } from "@/components/ui/tab-nav"

type DataQualityPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// Board AD-DataQuality (page group 12 plan 3, spec §7): two tabs, each with its number. ข้อมูลไม่ครบ holds the issue
// distribution of the enabled rules and the rule cards; สถานะไม่สอดคล้อง holds the review workspace as it was. The pending
// review count is on its tab for every viewer of the page.
export default async function DataQualityPage({ params, searchParams }: DataQualityPageProps) {
  const { locale } = await params
  const user = await requirePagePermission(locale, "setting", "view")
  const canEdit = hasPermission(user, "setting", "edit")
  const tab = parseDataQualityTab((await searchParams).tab)
  const t = await getTranslations("dataQualityPage")
  const tCommon = await getTranslations("common")

  const [setting, counts, reviewResult] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: assetDataQualityRulesKey }, select: { value: true } }),
    getRuleCounts(),
    listAssetStateReviews(prisma, { page: 1, pageSize: 25, reviewStatus: "pending" }),
  ])
  const rules = parseAssetDataQualityRules(setting?.value)
  const ruleCounts: RuleCount[] = rules.map((rule) => ({ key: rule.key, count: counts[rule.key] ?? 0 }))
  const issues = distribution(rules, ruleCounts)
  const enabledCount = rules.filter((rule) => rule.enabled).length
  const severityByKey = new Map(rules.map((rule) => [rule.key, rule.severity]))
  const ruleLabel = (key: string) => t(`rules.${key}.label`)
  const basePath = `/${locale}/admin/data-quality`

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          <Link href={`/${locale}/reports`} className={buttonVariants({ variant: "outline", size: "md" })}>
            {t("openReports")}
          </Link>
        }
      />

      <TabNav
        aria-label={t("tabsLabel")}
        current={tab}
        items={[
          { key: "rules", label: t("tabRules"), count: formatCount(issues.total), href: basePath },
          { key: "review", label: t("tabReview"), count: formatCount(reviewResult.total), href: `${basePath}?tab=review` },
        ]}
      />

      {tab === "review" ? (
        <AssetStateReviewWorkspace
          locale={locale}
          canEdit={canEdit}
          initialData={JSON.parse(JSON.stringify(reviewResult)) as AssetStateReviewResponse}
          labels={{
            title: t("assetStateReviews.title"),
            description: t("assetStateReviews.description"),
            scan: t("assetStateReviews.scan"),
            scanSuccess: t.raw("assetStateReviews.scanSuccess"),
            scanError: t("assetStateReviews.scanError"),
            loadError: t("assetStateReviews.loadError"),
            saveError: t("assetStateReviews.saveError"),
            staleError: t("assetStateReviews.staleError"),
            resolveSuccess: t("assetStateReviews.resolveSuccess"),
            dismissSuccess: t("assetStateReviews.dismissSuccess"),
            reviewStatus: t("assetStateReviews.reviewStatus"),
            severity: t("assetStateReviews.severity"),
            issueType: t("assetStateReviews.issueType"),
            pending: t("assetStateReviews.pending"),
            resolved: t("assetStateReviews.resolved"),
            dismissed: t("assetStateReviews.dismissed"),
            all: t("assetStateReviews.all"),
            critical: t("assetStateReviews.critical"),
            warning: t("assetStateReviews.warning"),
            info: t("assetStateReviews.info"),
            asset: t("assetStateReviews.asset"),
            currentState: t("assetStateReviews.currentState"),
            issue: t("assetStateReviews.issue"),
            lastDetected: t("assetStateReviews.lastDetected"),
            actions: t("assetStateReviews.actions"),
            custodian: t("assetStateReviews.custodian"),
            unassigned: t("assetStateReviews.unassigned"),
            status: t("assetStateReviews.status"),
            condition: t("assetStateReviews.condition"),
            resolve: t("assetStateReviews.resolve"),
            dismiss: t("assetStateReviews.dismiss"),
            readOnly: t("assetStateReviews.readOnly"),
            workflowRequired: t("assetStateReviews.workflowRequired"),
            loading: t("assetStateReviews.loading"),
            emptyTitle: t("assetStateReviews.emptyTitle"),
            emptyDescription: t("assetStateReviews.emptyDescription"),
            total: t.raw("assetStateReviews.total"),
            previous: t("assetStateReviews.previous"),
            next: t("assetStateReviews.next"),
            pagination: tCommon("pagination"),
            pageOf: tCommon.raw("pageOf"),
            tableScrollHint: tCommon("tableScrollHint"),
            resolveTitle: t("assetStateReviews.resolveTitle"),
            resolveDescription: t("assetStateReviews.resolveDescription"),
            dismissTitle: t("assetStateReviews.dismissTitle"),
            dismissDescription: t("assetStateReviews.dismissDescription"),
            nextStatus: t("assetStateReviews.nextStatus"),
            nextCondition: t("assetStateReviews.nextCondition"),
            reason: t("assetStateReviews.reason"),
            reasonPlaceholder: t("assetStateReviews.reasonPlaceholder"),
            reasonHelp: t("assetStateReviews.reasonHelp"),
            cancel: tCommon("cancel"),
            confirmResolve: t("assetStateReviews.confirmResolve"),
            confirmDismiss: t("assetStateReviews.confirmDismiss"),
          }}
          issueTypes={{
            repair_status_without_active_ticket: t("assetStateReviews.issueTypes.repair_status_without_active_ticket"),
            active_repair_ticket_status_mismatch: t("assetStateReviews.issueTypes.active_repair_ticket_status_mismatch"),
            checked_out_without_open_checkout: t("assetStateReviews.issueTypes.checked_out_without_open_checkout"),
            open_checkout_status_mismatch: t("assetStateReviews.issueTypes.open_checkout_status_mismatch"),
            open_checkout_mode_missing: t("assetStateReviews.issueTypes.open_checkout_mode_missing"),
            personal_in_use_without_custodian: t("assetStateReviews.issueTypes.personal_in_use_without_custodian"),
            personal_ready_with_custodian: t("assetStateReviews.issueTypes.personal_ready_with_custodian"),
            incompatible_status_condition: t("assetStateReviews.issueTypes.incompatible_status_condition"),
            legacy_condition_value: t("assetStateReviews.issueTypes.legacy_condition_value"),
            controlled_legacy_status: t("assetStateReviews.issueTypes.controlled_legacy_status"),
            legacy_disposal_missing_previous_status: t("assetStateReviews.issueTypes.legacy_disposal_missing_previous_status"),
          }}
        />
      ) : (
        <>
          <ContentPanel title={t("distributionTitle")} description={t("distributionSummary", { enabled: enabledCount, all: rules.length, total: issues.total })}>
            {issues.segments.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noIssues")}</p>
            ) : (
              <div className="space-y-3">
                <DistributionBar
                  segments={issues.segments.map((segment) => ({
                    key: segment.key,
                    count: segment.count,
                    tone: severityByKey.get(segment.key) ?? "warning",
                    href: buildDataQualityRuleHref(locale, segment.key),
                    title: t("segmentTitle", { rule: ruleLabel(segment.key), count: segment.count }),
                  }))}
                />
                {/* The legend names every rule in the bar with its count and opens its register list (the bar is hidden
                    from assistive technology and out of the tab order). */}
                <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  {issues.segments.map((segment) => (
                    <li key={segment.key} className="flex items-center gap-2">
                      <span aria-hidden="true" className={statusMarkerVariants({ tone: severityByKey.get(segment.key) ?? "warning" })} />
                      <Link href={buildDataQualityRuleHref(locale, segment.key)} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center gap-1.5 md:min-h-0")}>
                        {ruleLabel(segment.key)}
                        <span className="num font-semibold">{formatCount(segment.count)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="text-meta text-muted-foreground">{t("distributionNote")}</p>
              </div>
            )}
          </ContentPanel>

          <DataQualityRuleForm
            rules={rules}
            counts={counts}
            hrefs={Object.fromEntries(rules.map((rule) => [rule.key, buildDataQualityRuleHref(locale, rule.key)]))}
            canEdit={canEdit}
            labels={{
              saveRules: t("saveRules"),
              cancel: tCommon("cancel"),
              saved: t("saved"),
              error: tCommon("error"),
              readOnly: t("readOnly"),
              severity: t("assetStateReviews.severity"),
              warning: t("warning"),
              danger: t("danger"),
              inactive: tCommon("inactive"),
              countAfterSave: t("countAfterSave"),
              changeTurnedOn: t.raw("changeTurnedOn"),
              changeTurnedOff: t.raw("changeTurnedOff"),
              changeEnabled: t.raw("changeEnabled"),
              noChanges: t("noChanges"),
              ruleLabels: Object.fromEntries(rules.map((rule) => [rule.key, ruleLabel(rule.key)])),
              ruleDescriptions: Object.fromEntries(rules.map((rule) => [rule.key, t(`rules.${rule.key}.description`)])),
            }}
          />
        </>
      )}
    </div>
  )
}

async function getRuleCounts() {
  const warrantyWhere = warrantyExpiringSoonWhere(startOfBangkokDay(new Date()), await getWaitingWorkRules())
  const [missingCustodian, missingSerial, missingPhoto, missingDepartment, missingPurchaseInfo, warrantyExpiring] = await Promise.all([
    prisma.asset.count({ where: { AND: [{ isActive: true }, assetMissingResponsibilityWhere] } }),
    prisma.asset.count({ where: { isActive: true, OR: [{ serialNumber: null }, { serialNumber: "" }] } }),
    prisma.asset.count({
      where: {
        isActive: true,
        ownershipType: { not: "software_license" },
        attachments: { none: { module: "asset", fileType: { startsWith: "image/" }, isActive: true } },
      },
    }),
    prisma.asset.count({ where: { isActive: true, departmentId: null } }),
    prisma.asset.count({
      where: {
        isActive: true,
        OR: [
          { purchaseDate: null },
          { purchasePrice: null },
          { supplierId: null },
          { poNumber: null },
          { poNumber: "" },
          { invoiceNumber: null },
          { invoiceNumber: "" },
        ],
      },
    }),
    prisma.asset.count({ where: warrantyWhere }),
  ])
  return { missingCustodian, missingSerial, missingPhoto, missingDepartment, missingPurchaseInfo, warrantyExpiring }
}
