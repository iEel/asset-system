"use client"

import { useTranslations } from "next-intl"
import { Notice } from "@/components/ui/notice"
import { getPanelClasses } from "@/lib/design-system"
import { permissionMarks, segregationWarnings } from "@/lib/role-editor-model"
import type { RoleFormPerson } from "@/lib/role-form-data"
import { cn } from "@/lib/utils"

// The change summary (spec §7.2, edit only): "การเปลี่ยนแปลง {before} → {after}", one line per added or removed
// permission, and who it reaches at once (up to three names with user:view; the count alone without it).
export function RoleChangeSummary({
  initial,
  current,
  userCount,
  people,
  canViewUsers,
}: {
  initial: ReadonlySet<string>
  current: ReadonlySet<string>
  userCount: number
  people: RoleFormPerson[]
  canViewUsers: boolean
}) {
  const t = useTranslations("adminRolesPage")
  const actionName = (action: string) => (t.has(`actions.${action}`) ? t(`actions.${action}`) : action)
  const moduleName = (module: string) => (t.has(`modules.${module}`) ? t(`modules.${module}`) : module)
  const { added, removed } = permissionMarks(initial, current)
  if (added.length === 0 && removed.length === 0) return null

  const parts = (key: string) => {
    const [module, action = ""] = key.split(":")
    return { action: actionName(action), module: moduleName(module) }
  }
  const shown = people.slice(0, 3).map((person) => person.displayName)
  const names = userCount > shown.length ? `${shown.join(", ")}…` : shown.join(", ")

  return (
    <section className={cn(getPanelClasses(), "p-4 sm:p-5")} aria-labelledby="role-change-summary-heading">
      <h2 id="role-change-summary-heading" className="num text-base font-semibold text-foreground">
        {t("form.summaryTitle", { before: initial.size, after: current.size })}
      </h2>
      <ul className="mt-3 grid gap-1.5 text-sm">
        {added.map((key) => (
          <li key={key} className="flex items-baseline gap-2">
            <span aria-hidden="true" className="w-3 font-semibold text-success">+</span>
            {t("form.summaryAdd", parts(key))}
          </li>
        ))}
        {removed.map((key) => (
          <li key={key} className="flex items-baseline gap-2">
            <span aria-hidden="true" className="w-3 font-semibold text-danger">−</span>
            {t("form.summaryRemove", parts(key))}
          </li>
        ))}
      </ul>
      <p className="num mt-3 text-meta text-muted-foreground">
        {canViewUsers && people.length > 0
          ? t("form.appliesToNames", { count: userCount, names })
          : t("form.appliesTo", { count: userCount })}
      </p>
    </section>
  )
}

// The segregation warning (spec §7.2, create and edit): shown whenever the role ends up holding create and approve on
// disposal or audit, worded from the real rules (the disposal setting is read, the audit rule always applies). It never
// blocks the save.
export function RoleSegregationNotice({ current, disposalSegregationOn }: { current: ReadonlySet<string>; disposalSegregationOn: boolean }) {
  const t = useTranslations("adminRolesPage")
  const warnings = segregationWarnings(current, disposalSegregationOn)
  if (warnings.length === 0) return null

  return (
    <Notice tone="warning" title={t("form.sodTitle")}>
      <ul className="grid gap-1">
        {warnings.map((warning) => (
          <li key={warning.module}>
            {warning.module === "disposal"
              ? warning.settingOn ? t("form.sodDisposalOn") : t("form.sodDisposalOff")
              : t("form.sodAudit")}
          </li>
        ))}
      </ul>
      <p className="mt-1">{t("form.sodHint")}</p>
    </Notice>
  )
}
