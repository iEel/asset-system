import Link from "next/link"
import type React from "react"
import { getMessages, getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import {
  buildSystemLogPresentation,
  isSyntheticRecordId,
  normalizeLogModule,
  parseLogJson,
  type SystemLogRecordLabels,
} from "@/lib/system-log-presenter"
import { formatDateTime } from "@/lib/utils"

type LogsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ module?: string; action?: string }>
}

export default async function LogsPage({ params, searchParams }: LogsPageProps) {
  const { locale } = await params
  const filters = await searchParams
  await requirePagePermission(locale, "system", "view")
  const t = await getTranslations("systemLogPage")
  const messages = await getMessages()
  const systemLogMessages = messages.systemLogPage && typeof messages.systemLogPage === "object"
    ? messages.systemLogPage as Record<string, string>
    : {}

  const logs = await prisma.systemLog.findMany({
    where: {
      ...(filters.module ? { module: filters.module } : {}),
      ...(filters.action ? { action: filters.action } : {}),
    },
    include: { user: { select: { username: true, displayName: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  })
  const recordLabels = await buildRecordLabels(logs)
  const translate = (key: string) => {
    const messageKey = key.replaceAll(".", "_")
    return systemLogMessages[messageKey] ?? key
  }
  const displayLogs = logs.map((log) => buildSystemLogPresentation(log, recordLabels, locale, translate))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <form className="grid grid-cols-1 gap-3 md:grid-cols-4" action={`/${locale}/admin/logs`}>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("module")}</span>
            <input name="module" defaultValue={filters.module ?? ""} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("action")}</span>
            <input name="action" defaultValue={filters.action ?? ""} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </label>
          <button type="submit" className="h-10 self-end rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90">
            {t("filter")}
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <Head>{t("date")}</Head>
                <Head>{t("user")}</Head>
                <Head>{t("module")}</Head>
                <Head>{t("action")}</Head>
                <Head>{t("record")}</Head>
                <Head>{t("detail")}</Head>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayLogs.map((log) => (
                <tr key={log.id} className="hover:bg-accent/50">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(log.createdAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-foreground">{log.userLabel}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{log.moduleLabel}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-foreground">{log.actionLabel}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {log.href ? (
                      <Link href={log.href} className="font-medium text-primary hover:underline">
                        {log.recordLabel}
                      </Link>
                    ) : (
                      log.recordLabel
                    )}
                  </td>
                  <td className="min-w-[28rem] px-4 py-3 text-muted-foreground">
                    <div className="space-y-2">
                      <p className="font-medium text-foreground">{log.summary}</p>
                      {(log.changes.length > 0 || log.remark) ? (
                        <details className="group">
                          <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
                            {t("viewDetails")}
                          </summary>
                          <div className="mt-2 space-y-2 rounded-md border border-border bg-background p-3">
                            {log.changes.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-xs">
                                  <thead>
                                    <tr className="text-muted-foreground">
                                      <th className="pb-1 pr-3 text-left font-medium">{t("field")}</th>
                                      <th className="pb-1 pr-3 text-left font-medium">{t("before")}</th>
                                      <th className="pb-1 text-left font-medium">{t("after")}</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border">
                                    {log.changes.map((change, index) => (
                                      <tr key={`${log.id}-${change.field}-${index}`}>
                                        <td className="py-1.5 pr-3 text-foreground">{change.field}</td>
                                        <td className="py-1.5 pr-3">{change.before}</td>
                                        <td className="py-1.5 text-foreground">{change.after}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : null}
                            {log.remark ? (
                              <p className="text-xs">
                                <span className="font-medium text-foreground">{t("remark")}:</span> {log.remark}
                              </p>
                            ) : null}
                          </div>
                        </details>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Head({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{children}</th>
}

type SystemLogRow = {
  id: string
  userId: string | null
  action: string
  module: string
  recordId: string | null
  oldValue: string | null
  newValue: string | null
  ipAddress: string | null
  userAgent: string | null
  remark: string | null
  createdAt: Date
  user: { username: string; displayName: string | null } | null
}

type RecordLabels = SystemLogRecordLabels

async function buildRecordLabels(logs: SystemLogRow[]): Promise<RecordLabels> {
  const idsByModule = new Map<string, Set<string>>()
  for (const log of logs) {
    if (log.recordId && !isSyntheticRecordId(log.recordId)) {
      if (log.module === "audit") {
        addRecordId(idsByModule, "auditRound", log.recordId)
        addRecordId(idsByModule, "auditFinding", log.recordId)
        addRecordId(idsByModule, "auditItem", log.recordId)
      } else {
        addRecordId(idsByModule, normalizeLogModule(log.module, log), log.recordId)
      }
    }
    addReferencedValueIds(idsByModule, log)
  }
  const ids = (module: string) => Array.from(idsByModule.get(module) ?? [])
  const [
    assets,
    maintenanceTickets,
    disposalRequests,
    auditRounds,
    auditFindings,
    auditItems,
    companies,
    branches,
    departments,
    locations,
    categories,
    brands,
    suppliers,
    employees,
    users,
    roles,
    models,
    purchaseDocuments,
    statuses,
    conditions,
  ] = await Promise.all([
    prisma.asset.findMany({ where: { id: { in: ids("asset") } }, select: { id: true, assetTag: true, name: true } }),
    prisma.maintenanceTicket.findMany({ where: { id: { in: ids("maintenance") } }, select: { id: true, repairNo: true, asset: { select: { assetTag: true } } } }),
    prisma.disposalRequest.findMany({ where: { id: { in: ids("disposal") } }, select: { id: true, disposalNo: true, asset: { select: { assetTag: true } } } }),
    prisma.auditRound.findMany({ where: { id: { in: ids("auditRound") } }, select: { id: true, auditNo: true, name: true } }),
    prisma.auditFinding.findMany({ where: { id: { in: ids("auditFinding") } }, select: { id: true, findingType: true, asset: { select: { assetTag: true } }, auditRound: { select: { auditNo: true } } } }),
    prisma.auditItem.findMany({ where: { id: { in: ids("auditItem") } }, select: { id: true, asset: { select: { assetTag: true } }, auditRound: { select: { auditNo: true } } } }),
    prisma.company.findMany({ where: { id: { in: ids("company") } }, select: { id: true, code: true, nameTh: true } }),
    prisma.branch.findMany({ where: { id: { in: ids("branch") } }, select: { id: true, code: true, name: true } }),
    prisma.department.findMany({ where: { id: { in: ids("department") } }, select: { id: true, code: true, name: true } }),
    prisma.location.findMany({ where: { id: { in: ids("location") } }, select: { id: true, code: true, name: true } }),
    prisma.assetCategory.findMany({ where: { id: { in: ids("category") } }, select: { id: true, code: true, name: true } }),
    prisma.assetBrand.findMany({ where: { id: { in: ids("brand") } }, select: { id: true, name: true } }),
    prisma.supplier.findMany({ where: { id: { in: ids("supplier") } }, select: { id: true, code: true, name: true } }),
    prisma.employee.findMany({ where: { id: { in: ids("employee") } }, select: { id: true, code: true, fullNameTh: true } }),
    prisma.user.findMany({ where: { id: { in: ids("user") } }, select: { id: true, username: true, displayName: true } }),
    prisma.role.findMany({ where: { id: { in: ids("role") } }, select: { id: true, displayName: true, name: true } }),
    prisma.assetModel.findMany({ where: { id: { in: ids("model") } }, select: { id: true, name: true, brand: { select: { name: true } } } }),
    prisma.purchaseDocument.findMany({ where: { id: { in: ids("purchaseDocument") } }, select: { id: true, documentType: true, documentNo: true } }),
    prisma.assetStatus.findMany({ where: { id: { in: ids("status") } }, select: { id: true, nameTh: true, name: true } }),
    prisma.assetCondition.findMany({ where: { id: { in: ids("condition") } }, select: { id: true, nameTh: true, name: true } }),
  ])

  return {
    asset: new Map(assets.map((item) => [item.id, `${item.assetTag} - ${item.name}`])),
    maintenance: new Map(maintenanceTickets.map((item) => [item.id, `${item.repairNo} - ${item.asset.assetTag}`])),
    disposal: new Map(disposalRequests.map((item) => [item.id, `${item.disposalNo} - ${item.asset.assetTag}`])),
    auditRound: new Map(auditRounds.map((item) => [item.id, `${item.auditNo} - ${item.name}`])),
    auditFinding: new Map(auditFindings.map((item) => [item.id, `${item.auditRound.auditNo} - ${item.asset?.assetTag ?? item.findingType}`])),
    auditItem: new Map(auditItems.map((item) => [item.id, `${item.auditRound.auditNo} - ${item.asset.assetTag}`])),
    company: new Map(companies.map((item) => [item.id, `${item.code} - ${item.nameTh}`])),
    branch: new Map(branches.map((item) => [item.id, `${item.code} - ${item.name}`])),
    department: new Map(departments.map((item) => [item.id, `${item.code} - ${item.name}`])),
    location: new Map(locations.map((item) => [item.id, `${item.code} - ${item.name}`])),
    category: new Map(categories.map((item) => [item.id, `${item.code} - ${item.name}`])),
    brand: new Map(brands.map((item) => [item.id, item.name])),
    supplier: new Map(suppliers.map((item) => [item.id, `${item.code} - ${item.name}`])),
    employee: new Map(employees.map((item) => [item.id, `${item.code} - ${item.fullNameTh}`])),
    user: new Map(users.map((item) => [item.id, item.displayName ?? item.username])),
    role: new Map(roles.map((item) => [item.id, item.displayName ?? item.name])),
    model: new Map(models.map((item) => [item.id, `${item.brand.name} - ${item.name}`])),
    purchaseDocument: new Map(purchaseDocuments.map((item) => [item.id, `${item.documentType} - ${item.documentNo}`])),
    status: new Map(statuses.map((item) => [item.id, item.nameTh ?? item.name])),
    condition: new Map(conditions.map((item) => [item.id, item.nameTh ?? item.name])),
  }
}

function addRecordId(idsByModule: Map<string, Set<string>>, module: string, id: string) {
  if (!idsByModule.has(module)) idsByModule.set(module, new Set())
  idsByModule.get(module)?.add(id)
}

function addReferencedValueIds(idsByModule: Map<string, Set<string>>, log: SystemLogRow) {
  const values = [parseLogJson(log.oldValue), parseLogJson(log.newValue)].filter((value): value is Record<string, unknown> => Boolean(value))
  for (const value of values) {
    addStringReference(idsByModule, "location", value.currentLocationId)
    addStringReference(idsByModule, "location", value.locationId)
    addStringReference(idsByModule, "location", value.nextLocationId)
    addStringReference(idsByModule, "employee", value.custodianId)
    addStringReference(idsByModule, "employee", value.returnByEmployeeId)
    addStringReference(idsByModule, "employee", value.receiveByEmployeeId)
    addStringReference(idsByModule, "department", value.departmentId)
    addStringReference(idsByModule, "asset", value.assetId)
    addStringReference(idsByModule, "asset", value.parentAssetId)
    addStringReference(idsByModule, "company", value.companyId)
    addStringReference(idsByModule, "branch", value.branchId)
    addStringReference(idsByModule, "category", value.categoryId)
    addStringReference(idsByModule, "brand", value.brandId)
    addStringReference(idsByModule, "model", value.modelId)
    addStringReference(idsByModule, "supplier", value.supplierId)
    addStringReference(idsByModule, "location", value.homeLocationId)
    addStringReference(idsByModule, "status", value.statusId)
    addStringReference(idsByModule, "status", value.nextStatusId)
    addStringReference(idsByModule, "condition", value.conditionId)
    addStringReference(idsByModule, "condition", value.conditionBefore)
    addStringReference(idsByModule, "condition", value.conditionAfter)
    addStringReference(idsByModule, "role", value.roleId)
    addStringReference(idsByModule, "role", value.ldap_default_role)
  }
}

function addStringReference(idsByModule: Map<string, Set<string>>, module: string, value: unknown) {
  if (typeof value === "string" && value.trim()) addRecordId(idsByModule, module, value)
}
