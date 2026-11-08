"use client"

import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { Undo2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { ChoiceCard } from "@/components/ui/choice-card"
import { FieldError, FieldRequiredMark } from "@/components/ui/field"
import { FormSection } from "@/components/ui/form-section"
import { SearchField } from "@/components/ui/search-field"
import { StatusBadge } from "@/components/ui/status-badge"
import { roleChangeMarks, type FormRole } from "@/lib/admin-user-form-model"
import { getPanelClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"

// บทบาท (spec §5.3). The chosen roles show as chips first: one added in this session is marked ใหม่, one removed stays
// struck through with เอาออก and เลิกทำ, and a held inactive role says ปิดใช้งาน (it may be kept, it grants nothing).
// Then a search over two groups of active roles. A role the viewer cannot grant is disabled with its reason; the server
// check stays the authority (§9). The section is one group with one error under it; focus goes to its first checkbox
// that can be used (v-track M-R8).
export function UserRolesSection({
  roles,
  initialIds,
  currentIds,
  query,
  error,
  onQueryChange,
  onToggle,
}: {
  roles: FormRole[]
  initialIds: string[]
  currentIds: string[]
  query: string
  error: string | undefined
  onQueryChange: (query: string) => void
  onToggle: (roleId: string) => void
}) {
  const locale = useLocale()
  const t = useTranslations("adminUsersPage")
  const rolesById = new Map(roles.map((role) => [role.id, role]))
  const initial = new Set(initialIds)
  const { added, removed } = roleChangeMarks(initialIds, currentIds)
  const chipIds = [...currentIds, ...removed]
  const needle = query.trim().toLocaleLowerCase()
  const listed = roles.filter((role) => role.isActive).filter((role) => needle === "" || `${role.label} ${role.name}`.toLocaleLowerCase().includes(needle))
  const groups = [
    { key: "system", title: t("form.systemRoles"), roles: listed.filter((role) => role.isSystem) },
    { key: "custom", title: t("form.customRoles"), roles: listed.filter((role) => !role.isSystem) },
  ].filter((group) => group.roles.length > 0)
  const isLocked = (role: FormRole) => role.lockReason !== null && !initial.has(role.id)
  const focusRoleId = groups.flatMap((group) => group.roles).find((role) => !isLocked(role))?.id

  return (
    <section
      className={cn(getPanelClasses(), "p-4 sm:p-5")}
      role="group"
      aria-labelledby="admin-user-roles-label"
      aria-describedby={error ? "admin-user-roles-error" : undefined}
    >
      <FormSection
        title={
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span id="admin-user-roles-label">
              {t("form.rolesSection")}
              <FieldRequiredMark />
            </span>
            <span className="text-meta font-normal text-muted-foreground num">{t("form.rolesChosen", { count: currentIds.length })}</span>
          </span>
        }
      >
        <div className="grid gap-4">
          {chipIds.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {chipIds.map((id) => {
                const role = rolesById.get(id)
                if (!role) return null
                const isAdded = added.includes(id)
                const isRemoved = removed.includes(id)
                return (
                  <li
                    key={id}
                    className={cn(
                      "inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-control border py-0.5 pr-0.5 pl-2.5 text-sm",
                      isRemoved ? "border-border bg-background text-muted-foreground" : "border-control-border bg-surface text-foreground",
                    )}
                  >
                    <span className={cn("min-w-0 break-words", isRemoved && "line-through decoration-1")}>{role.label}</span>
                    {isAdded ? <StatusBadge label={t("form.roleNew")} tone="info" /> : null}
                    {isRemoved ? <StatusBadge label={t("form.roleRemoved")} tone="danger" /> : null}
                    {!role.isActive ? <StatusBadge label={t("form.roleInactive")} tone="muted" /> : null}
                    {isRemoved ? (
                      <Button variant="ghost" size="sm" onClick={() => onToggle(id)}>
                        <Undo2 aria-hidden="true" />
                        {t("form.undo")}
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon-sm" aria-label={t("form.removeRole", { name: role.label })} onClick={() => onToggle(id)}>
                        <X aria-hidden="true" />
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : null}

          <SearchField
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onClear={() => onQueryChange("")}
            clearLabel={t("form.roleSearch")}
            placeholder={t("form.roleSearch")}
            aria-label={t("form.roleSearch")}
            maxLength={100}
          />

          {groups.map((group) => (
            <div key={group.key} className="grid gap-2">
              <h3 className="text-meta font-medium text-muted-foreground">
                {group.title} <span className="num">· {group.roles.length}</span>
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {group.roles.map((role) => {
                  const locked = isLocked(role)
                  return (
                    <ChoiceCard
                      key={role.id}
                      type="checkbox"
                      id={role.id === focusRoleId ? "admin-user-roles" : undefined}
                      checked={currentIds.includes(role.id)}
                      disabled={locked}
                      onChange={() => onToggle(role.id)}
                      label={role.label}
                      description={
                        locked
                          ? role.lockReason === "systemAdminOnly" ? t("form.lockSystemAdmin") : t("form.lockMissing")
                          : t("form.permissionCount", { count: role.permissionKeys.length })
                      }
                    />
                  )
                })}
              </div>
            </div>
          ))}

          <p className="text-meta text-muted-foreground">
            {t("form.inactiveRolesNote")} ·{" "}
            <Link href={`/${locale}/admin/roles?view=matrix`} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}>
              {t("form.viewRolePermissions")}
            </Link>
          </p>
        </div>
      </FormSection>
      {error ? <FieldError id="admin-user-roles-error" className="mt-2">{error}</FieldError> : null}
    </section>
  )
}
