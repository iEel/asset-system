"use client"

import { Fragment } from "react"
import { useTranslations } from "next-intl"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { FormSection } from "@/components/ui/form-section"
import { accessPreview, type AccessGroupRow, type FormRole } from "@/lib/admin-user-form-model"
import { getPanelClasses } from "@/lib/design-system"
import { PERMISSION_ACTION_ORDER } from "@/lib/permission-groups"
import { cn } from "@/lib/utils"

// "หลังบันทึก ผู้ใช้นี้จะทำอะไรได้" (spec §5.3): the permissions before and after the role change, by the five module
// groups of the role editor. A gained action is "+" in the success tone and a lost one a struck "−" in the danger tone
// (plan 2 task 4, my call); a group with nothing says ไม่มี and an unchanged one เหมือนเดิม. Inactive roles grant nothing.
// Final review: a row is unchanged only when its permission keys are equal; an action already held that gains or loses
// modules shows them, for example "+แก้ไข (ผู้ใช้)". Each permission is named through a message, so English reads
// "Delete Asset Register" and Thai "ลบทะเบียนทรัพย์สิน".
export function UserAccessPreview({ roles, initialIds, currentIds }: { roles: FormRole[]; initialIds: string[]; currentIds: string[] }) {
  const t = useTranslations("adminUsersPage")
  const tRoles = useTranslations("adminRolesPage")
  const preview = accessPreview(roles, initialIds, currentIds)
  const actionName = (action: string) => (tRoles.has(`actions.${action}`) ? tRoles(`actions.${action}`) : action)
  const moduleName = (module: string) => (tRoles.has(`modules.${module}`) ? tRoles(`modules.${module}`) : module)
  const keyName = (key: string) => {
    const [module, action = ""] = key.split(":")
    return t("form.permissionName", { action: actionName(action), module: moduleName(module) })
  }
  const inModules = (action: string, modules: string[]) =>
    t("form.actionInModules", { action: actionName(action), modules: modules.map(moduleName).join(", ") })

  return (
    <section className={cn(getPanelClasses(), "p-4 sm:p-5")} aria-labelledby="admin-user-preview-heading">
      <FormSection
        title={
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span id="admin-user-preview-heading">{t("form.previewTitle")}</span>
            <span className="text-meta font-normal text-muted-foreground num">
              {t("form.previewTotal", { before: preview.beforeCount, after: preview.afterCount })}
            </span>
          </span>
        }
      >
        <DataTable caption={t("form.previewTitle")}>
          <DataTableHeader>
            <tr>
              <DataTableHead>{t("form.previewTask")}</DataTableHead>
              <DataTableHead>{t("form.previewNow")}</DataTableHead>
              <DataTableHead>{t("form.previewAfter")}</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {preview.rows.map((row) => (
              <DataTableRow key={row.group}>
                <DataTableCell className="font-medium text-foreground">{t(`form.group.${row.group}`)}</DataTableCell>
                <DataTableCell className="text-muted-foreground">
                  {row.before.length > 0 ? row.before.map(actionName).join(" · ") : t("form.previewNone")}
                </DataTableCell>
                <DataTableCell>
                  <AfterCell row={row} actionName={actionName} inModules={inModules} none={t("form.previewNone")} same={t("form.previewSame")} />
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>

        <ul className="mt-3 grid gap-1.5 text-meta">
          {preview.highRiskGained.length > 0 ? (
            <li className="text-warning">{t("form.highRiskGained", { list: preview.highRiskGained.map(keyName).join(", ") })}</li>
          ) : null}
          {preview.coveredRemovals.map((label) => (
            <li key={label} className="text-muted-foreground">
              {t("form.coveredRemoval", { role: label })}
            </li>
          ))}
          <li className="text-muted-foreground">{t("form.appliesNow")}</li>
        </ul>
      </FormSection>
    </section>
  )
}

function AfterCell({
  row,
  actionName,
  inModules,
  none,
  same,
}: {
  row: AccessGroupRow
  actionName: (action: string) => string
  inModules: (action: string, modules: string[]) => string
  none: string
  same: string
}) {
  const unchanged = row.gained.length === 0 && row.lost.length === 0 && row.moduleGains.length === 0 && row.moduleLosses.length === 0
  if (unchanged) {
    return <span className="text-muted-foreground">{row.after.length === 0 ? none : same}</span>
  }
  const gainedModules = (action: string) => row.moduleGains.find((change) => change.action === action)?.modules
  const lostModules = (action: string) => row.moduleLosses.find((change) => change.action === action)?.modules
  const order = PERMISSION_ACTION_ORDER as readonly string[]
  const rank = (action: string) => (order.includes(action) ? order.indexOf(action) : order.length)
  const shown = [...row.after, ...row.lost].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
  if (shown.length === 0) return <span className="text-muted-foreground">{none}</span>
  return (
    <span className="text-foreground">
      {shown.map((action, index) => (
        <Fragment key={action}>
          {index > 0 ? " · " : null}
          {row.gained.includes(action) ? (
            <span className="font-medium text-success">+{actionName(action)}</span>
          ) : row.lost.includes(action) ? (
            <span className="text-danger line-through">−{actionName(action)}</span>
          ) : (
            <KeptAction action={action} gained={gainedModules(action)} lost={lostModules(action)} actionName={actionName} inModules={inModules} />
          )}
        </Fragment>
      ))}
    </span>
  )
}

// An action held before and after: plain, or with the modules it gains (+, success) and loses (struck −, danger).
function KeptAction({
  action,
  gained,
  lost,
  actionName,
  inModules,
}: {
  action: string
  gained: string[] | undefined
  lost: string[] | undefined
  actionName: (action: string) => string
  inModules: (action: string, modules: string[]) => string
}) {
  if (!gained && !lost) return <>{actionName(action)}</>
  return (
    <>
      {gained ? <span className="font-medium text-success">+{inModules(action, gained)}</span> : null}
      {gained && lost ? " " : null}
      {lost ? <span className="text-danger line-through">−{inModules(action, lost)}</span> : null}
    </>
  )
}
