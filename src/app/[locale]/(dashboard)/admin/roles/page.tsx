import Link from "next/link"
import { Check, Edit } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { ActiveBadge, ColumnHeader } from "@/components/master-data/master-data-layout"

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
  await requirePagePermission(locale, "role", "view")

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

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
                <tr key={role.id} className="hover:bg-accent/50">
                  <td className="min-w-64 px-4 py-3">
                    <div className="font-medium text-foreground">{role.displayNameTh || role.displayName}</div>
                    <div className="mt-1 font-mono text-xs text-muted-foreground">{role.name}</div>
                  </td>
                  <td className="min-w-64 px-4 py-3 text-muted-foreground">{role.description ?? "-"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-foreground">{role._count.userRoles}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-foreground">{role._count.rolePermissions}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="inline-flex rounded-full bg-info/10 px-2 py-1 text-xs font-medium text-info">
                      {role.isSystem ? t("systemRole") : t("customRole")}
                    </span>
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
                </tr>
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
    </div>
  )
}
