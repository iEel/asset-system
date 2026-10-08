import Link from "next/link"
import { AlertTriangle, CheckCircle2, FileWarning } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { listAssetStateReviews } from "@/lib/asset-state-review-service"
import { assetMissingResponsibilityWhere } from "@/lib/asset-ownership"
import { assetDataQualityRulesKey, parseAssetDataQualityRules, type AssetDataQualityRule } from "@/lib/data-quality-rules"
import { buildDataQualityRuleHref } from "@/lib/data-quality-drilldown"
import { DataQualityRuleForm } from "@/components/admin/data-quality-rule-form"
import { AssetStateReviewWorkspace, type AssetStateReviewResponse } from "@/components/admin/asset-state-review-workspace"

type DataQualityPageProps = {
  params: Promise<{ locale: string }>
}

export default async function DataQualityPage({ params }: DataQualityPageProps) {
  const { locale } = await params
  const user = await requirePagePermission(locale, "setting", "view")
  const t = await getTranslations("dataQualityPage")
  const tCommon = await getTranslations("common")
  const warrantyThreshold = new Date()
  warrantyThreshold.setDate(warrantyThreshold.getDate() + 30)

  const [setting, counts, reviewResult] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: assetDataQualityRulesKey }, select: { value: true } }),
    getRuleCounts(warrantyThreshold),
    listAssetStateReviews(prisma, { page: 1, pageSize: 25, reviewStatus: "pending" }),
  ])
  const rules = parseAssetDataQualityRules(setting?.value)
  const enabledRules = rules.filter((rule) => rule.enabled)
  const totalIssues = enabledRules.reduce((sum, rule) => sum + (counts[rule.key] ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link
          href={`/${locale}/reports`}
          className="inline-flex h-10 w-fit items-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
        >
          {t("openReports")}
        </Link>
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <SummaryCard label={t("enabledRules")} value={enabledRules.length} tone="primary" />
        <SummaryCard label={t("totalIssues")} value={totalIssues} tone={totalIssues > 0 ? "danger" : "success"} />
        <SummaryCard label={t("rulesConfigured")} value={rules.length} tone="muted" />
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {rules.map((rule) => (
          <RuleStatusCard
            key={rule.key}
            rule={rule}
            count={counts[rule.key] ?? 0}
            label={t(`rules.${rule.key}.label`)}
            description={t(`rules.${rule.key}.description`)}
            viewLabel={tCommon("view")}
            href={buildDataQualityRuleHref(locale, rule.key)}
          />
        ))}
      </section>

      <AssetStateReviewWorkspace
        locale={locale}
        canEdit={hasPermission(user, "setting", "edit")}
        initialData={JSON.parse(JSON.stringify(reviewResult)) as AssetStateReviewResponse}
        labels={{
          title: t("assetStateReviews.title"),
          description: t("assetStateReviews.description"),
          scan: t("assetStateReviews.scan"),
          scanning: t("assetStateReviews.scanning"),
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
          saving: tCommon("saving"),
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

      <DataQualityRuleForm
        rules={rules}
        labels={{
          save: tCommon("save"),
          saved: t("saved"),
          error: tCommon("error"),
          enabled: t("enabledRules"),
          warning: t("warning"),
          danger: t("danger"),
          ruleLabels: Object.fromEntries(rules.map((rule) => [rule.key, t(`rules.${rule.key}.label`)])),
          ruleDescriptions: Object.fromEntries(rules.map((rule) => [rule.key, t(`rules.${rule.key}.description`)])),
        }}
      />
    </div>
  )
}

async function getRuleCounts(warrantyThreshold: Date) {
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
    prisma.asset.count({ where: { isActive: true, warrantyEndDate: { gte: new Date(), lte: warrantyThreshold } } }),
  ])
  return { missingCustodian, missingSerial, missingPhoto, missingDepartment, missingPurchaseInfo, warrantyExpiring }
}

function RuleStatusCard({
  rule,
  count,
  label,
  description,
  viewLabel,
  href,
}: {
  rule: AssetDataQualityRule
  count: number
  label: string
  description: string
  viewLabel: string
  href: string
}) {
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${rule.enabled ? severityClass(rule.severity) : "border-border bg-surface text-muted-foreground"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {rule.enabled ? <FileWarning className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
            <h2 className="font-semibold text-foreground">{label}</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-foreground">{count.toLocaleString("th-TH")}</div>
          <Link href={href} className="mt-1 inline-flex text-xs font-medium text-primary hover:underline">
            {viewLabel}
          </Link>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: "primary" | "danger" | "success" | "muted" }) {
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${summaryClass(tone)}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value.toLocaleString("th-TH")}</p>
        </div>
        <AlertTriangle className="h-5 w-5 text-current" />
      </div>
    </div>
  )
}

function severityClass(severity: AssetDataQualityRule["severity"]) {
  return severity === "danger" ? "border-danger/30 bg-danger-soft text-danger" : "border-warning/30 bg-warning-soft text-warning"
}

function summaryClass(tone: "primary" | "danger" | "success" | "muted") {
  if (tone === "primary") return "border-primary/30 bg-primary-soft text-primary"
  if (tone === "danger") return "border-danger/30 bg-danger-soft text-danger"
  if (tone === "success") return "border-success/30 bg-success-soft text-success"
  return "border-border bg-surface text-muted-foreground"
}
