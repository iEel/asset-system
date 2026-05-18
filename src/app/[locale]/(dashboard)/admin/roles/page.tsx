import Link from "next/link"
import { Check, Download, Edit, Plus, ShieldAlert, ShieldCheck } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { ActiveBadge, ColumnHeader } from "@/components/master-data/master-data-layout"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"

type RolesPageProps = {
  params: Promise<{ locale: string }>
}

const permissionActions = ["view", "create", "edit", "delete", "export", "approve"] as const
const permissionModules = [
  "dashboard",
  "asset",
  "checkout",
  "checkin",
  "transfer",
  "audit",
  "maintenance",
  "disposal",
  "report",
  "company",
  "branch",
  "department",
  "employee",
  "location",
  "category",
  "brand",
  "supplier",
  "status",
  "condition",
  "user",
  "role",
  "setting",
  "import",
  "export",
  "log",
] as const

export default async function RolesPage({ params }: RolesPageProps) {
  const { locale } = await params
  const user = await requirePagePermission(locale, "role", "view")
  const canCreate = hasPermission(user, "role", "create")
  const canExport = hasPermission(user, "role", "export")

  const t = await getTranslations("adminRolesPage")
  const tCommon = await getTranslations("common")

  const roles = await prisma.role.findMany({
    include: {
      _count: {
        select: {
          userRoles: true,
          rolePermissions: true,
        },
      },
      rolePermissions: {
        include: {
          permission: { select: { module: true, action: true } },
        },
        orderBy: [{ permission: { module: "asc" } }, { permission: { action: "asc" } }],
      },
    },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  })

  const rolePermissions = new Map(
    roles.map((role) => [
      role.id,
      new Set(role.rolePermissions.map((rolePermission) => `${rolePermission.permission.module}:${rolePermission.permission.action}`)),
    ])
  )
  const highRiskRoles = roles.filter((role) =>
    role.rolePermissions.some((rolePermission) => ["delete", "approve", "export"].includes(rolePermission.permission.action))
  )
  const inactiveRolesWithUsers = roles.filter((role) => !role.isActive && role._count.userRoles > 0)
  const systemRoles = roles.filter((role) => role.isSystem)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        {canExport ? (
          <Link
            href="/api/admin/roles/export"
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Download className="h-4 w-4" />
            {t("exportAudit")}
          </Link>
        ) : null}
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <RoleAuditCard
          label={t("systemRoleCount")}
          value={systemRoles.length}
          detail={t("systemRoleCountDetail")}
          tone="primary"
        />
        <RoleAuditCard
          label={t("highRiskRoleCount")}
          value={highRiskRoles.length}
          detail={t("highRiskRoleCountDetail")}
          tone="warning"
        />
        <RoleAuditCard
          label={t("inactiveRoleWithUsers")}
          value={inactiveRolesWithUsers.length}
          detail={t("inactiveRoleWithUsersDetail")}
          tone={inactiveRolesWithUsers.length > 0 ? "danger" : "muted"}
        />
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold text-foreground">{t("roleSummary")}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <ColumnHeader>{t("role")}</ColumnHeader>
                <ColumnHeader>{t("description")}</ColumnHeader>
                <ColumnHeader align="right">{t("users")}</ColumnHeader>
                <ColumnHeader align="right">{t("permissions")}</ColumnHeader>
                <ColumnHeader>{t("type")}</ColumnHeader>
                <ColumnHeader>{tCommon("status")}</ColumnHeader>
                <ColumnHeader>{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {roles.map((role) => (
                <ClickableTableRow
                  key={role.id}
                  href={`/${locale}/admin/roles/${role.id}/edit`}
                  label={`${tCommon("edit")}: ${role.displayNameTh || role.displayName}`}
                >
                  <td className="min-w-64 px-4 py-3">
                    <div className="font-medium text-foreground">{role.displayNameTh || role.displayName}</div>
                    <div className="mt-1 font-mono text-xs text-muted-foreground">{role.name}</div>
                  </td>
                  <td className="min-w-64 px-4 py-3 text-muted-foreground">{role.description ?? "-"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-foreground">{role._count.userRoles}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-foreground">{role._count.rolePermissions}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${role.isSystem ? "bg-info/10 text-info" : "bg-muted text-muted-foreground"}`}>
                      {role.isSystem ? t("systemRole") : t("customRole")}
                    </span>
                    {role.name === "system_admin" ? (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
                        <ShieldCheck className="h-3 w-3" />
                        {t("protectedRole")}
                      </span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {role.isActive ? (
                      <ActiveBadge label={tCommon("active")} />
                    ) : (
                      <span className="inline-flex rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                        {tCommon("inactive")}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Link
                      href={`/${locale}/admin/roles/${role.id}/edit`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-medium transition-colors hover:bg-accent"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      {tCommon("edit")}
                    </Link>
                  </td>
                </ClickableTableRow>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold text-foreground">{t("permissionMatrix")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("permissionMatrixSubtitle")}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <ColumnHeader>{t("module")}</ColumnHeader>
                {permissionActions.map((action) => (
                  <ColumnHeader key={action}>{t(`actions.${action}`)}</ColumnHeader>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {permissionModules.map((moduleName) => (
                <tr key={moduleName} className="hover:bg-accent/50">
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="font-medium text-foreground">{t(`modules.${moduleName}`)}</div>
                    <div className="mt-1 font-mono text-xs text-muted-foreground">{moduleName}</div>
                  </td>
                  {permissionActions.map((action) => {
                    const permissionKey = `${moduleName}:${action}`
                    const assignedRoles = roles.filter((role) => rolePermissions.get(role.id)?.has(permissionKey))

                    return (
                      <td key={permissionKey} className="min-w-44 px-4 py-3 align-top">
                        {assignedRoles.length === 0 ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {assignedRoles.map((role) => (
                              <span
                                key={role.id}
                                className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success"
                                title={role.displayName}
                              >
                                <Check className="h-3 w-3" />
                                {role.displayNameTh || role.displayName}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {canCreate ? (
        <Link
          href={`/${locale}/admin/roles/new`}
          className="fixed bottom-6 right-6 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-white shadow-lg transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {t("createTitle")}
        </Link>
      ) : null}
    </div>
  )
}

function RoleAuditCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: number
  detail: string
  tone: "primary" | "warning" | "danger" | "muted"
}) {
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${roleAuditToneClass(tone)}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value.toLocaleString("th-TH")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <ShieldAlert className="h-5 w-5 shrink-0 text-current" />
      </div>
    </div>
  )
}

function roleAuditToneClass(tone: "primary" | "warning" | "danger" | "muted") {
  if (tone === "primary") return "border-primary/30 bg-primary/5 text-primary"
  if (tone === "warning") return "border-warning/30 bg-warning/5 text-warning"
  if (tone === "danger") return "border-danger/30 bg-danger/5 text-danger"
  return "border-border bg-surface text-muted-foreground"
}
