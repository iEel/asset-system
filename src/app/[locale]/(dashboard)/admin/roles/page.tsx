import Link from "next/link"
import { Check, Download, Pencil, Plus, ShieldCheck } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { formatCount } from "@/lib/display-format"
import { ActiveBadge } from "@/components/master-data/master-data-layout"
import { buttonVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow, TableEmptyRow } from "@/components/ui/data-table"
import { Nil, orNil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { RowActions } from "@/components/ui/row-actions"
import { StatStrip } from "@/components/ui/stat-strip"

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
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          canExport ? (
            <a href="/api/admin/roles/export" download className={buttonVariants({ variant: "outline", size: "md" })}>
              <Download aria-hidden="true" />
              {t("exportAudit")}
            </a>
          ) : undefined
        }
      />

      <StatStrip
        items={[
          { key: "systemRoles", label: t("systemRoleCount"), value: formatCount(systemRoles.length), foot: t("systemRoleCountDetail"), footTitle: t("systemRoleCountDetail") },
          { key: "highRiskRoles", label: t("highRiskRoleCount"), value: formatCount(highRiskRoles.length), foot: t("highRiskRoleCountDetail"), footTitle: t("highRiskRoleCountDetail") },
          {
            key: "inactiveRolesWithUsers",
            label: t("inactiveRoleWithUsers"),
            value: formatCount(inactiveRolesWithUsers.length),
            foot: t("inactiveRoleWithUsersDetail"),
            footTitle: t("inactiveRoleWithUsersDetail"),
            attention: inactiveRolesWithUsers.length > 0,
          },
        ]}
      />

      <ContentPanel divided flush className="overflow-hidden" title={t("roleSummary")}>
        <DataTable framed={false} caption={t("roleSummary")} scrollHint={tCommon("tableScrollHint")}>
          <DataTableHeader>
            <tr>
              <DataTableHead>{t("role")}</DataTableHead>
              <DataTableHead>{t("description")}</DataTableHead>
              <DataTableHead align="right">{t("users")}</DataTableHead>
              <DataTableHead align="right">{t("permissions")}</DataTableHead>
              <DataTableHead>{t("type")}</DataTableHead>
              <DataTableHead>{tCommon("status")}</DataTableHead>
              <DataTableHead align="right" sticky="right" hideLabel>{tCommon("actions")}</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {roles.length === 0 ? (
              <TableEmptyRow colSpan={7}>{tCommon("noData")}</TableEmptyRow>
            ) : (
              roles.map((role) => {
                const roleName = role.displayNameTh || role.displayName
                const editHref = `/${locale}/admin/roles/${role.id}/edit`
                return (
                  <ClickableTableRow key={role.id} href={editHref} label={`${tCommon("edit")}: ${roleName}`}>
                    <DataTableCell className="min-w-64">
                      <div className="font-medium text-foreground">{roleName}</div>
                      <div className="mt-1 text-xs text-muted-foreground"><span className="tag">{role.name}</span></div>
                    </DataTableCell>
                    <DataTableCell className="min-w-64 text-muted-foreground">{orNil(role.description)}</DataTableCell>
                    <DataTableCell numeric className="font-medium text-foreground">{formatCount(role._count.userRoles)}</DataTableCell>
                    <DataTableCell numeric className="font-medium text-foreground">{formatCount(role._count.rolePermissions)}</DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${role.isSystem ? "bg-info-soft text-info" : "bg-muted text-muted-foreground"}`}>
                        {role.isSystem ? t("systemRole") : t("customRole")}
                      </span>
                      {role.name === "system_admin" ? (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-1 text-xs font-medium text-warning">
                          <ShieldCheck className="h-3 w-3" />
                          {t("protectedRole")}
                        </span>
                      ) : null}
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      {role.isActive ? (
                        <ActiveBadge label={tCommon("active")} />
                      ) : (
                        <span className="inline-flex rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                          {tCommon("inactive")}
                        </span>
                      )}
                    </DataTableCell>
                    <DataTableCell align="right" sticky="right">
                      <RowActions
                        code={role.name}
                        name={roleName}
                        menuLabel={tCommon("moreActionsFor", { code: role.name })}
                        next={{ label: tCommon("edit"), href: editHref, icon: <Pencil aria-hidden="true" /> }}
                        groups={[]}
                      />
                    </DataTableCell>
                  </ClickableTableRow>
                )
              })
            )}
          </DataTableBody>
        </DataTable>
      </ContentPanel>

      <ContentPanel divided flush className="overflow-hidden" title={t("permissionMatrix")} description={t("permissionMatrixSubtitle")}>
        <DataTable framed={false} caption={t("permissionMatrix")} scrollHint={tCommon("tableScrollHint")}>
          <DataTableHeader>
            <tr>
              <DataTableHead>{t("module")}</DataTableHead>
              {permissionActions.map((action) => (
                <DataTableHead key={action}>{t(`actions.${action}`)}</DataTableHead>
              ))}
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {permissionModules.map((moduleName) => (
              <DataTableRow key={moduleName}>
                <DataTableCell className="whitespace-nowrap">
                  <div className="font-medium text-foreground">{t(`modules.${moduleName}`)}</div>
                  <div className="mt-1 text-xs text-muted-foreground"><span className="tag">{moduleName}</span></div>
                </DataTableCell>
                {permissionActions.map((action) => {
                  const permissionKey = `${moduleName}:${action}`
                  const assignedRoles = roles.filter((role) => rolePermissions.get(role.id)?.has(permissionKey))

                  return (
                    <DataTableCell key={permissionKey} className="min-w-44">
                      {assignedRoles.length === 0 ? (
                        <Nil />
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {assignedRoles.map((role) => (
                            <span
                              key={role.id}
                              className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-1 text-xs font-medium text-success"
                              title={role.displayName}
                            >
                              <Check className="h-3 w-3" />
                              {role.displayNameTh || role.displayName}
                            </span>
                          ))}
                        </div>
                      )}
                    </DataTableCell>
                  )
                })}
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      </ContentPanel>

      {canCreate ? (
        <Link
          href={`/${locale}/admin/roles/new`}
          className="fixed bottom-6 right-6 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-white shadow-lg transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          {t("createTitle")}
        </Link>
      ) : null}
    </div>
  )
}
