"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { Undo2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { ChoiceCard, preventEnterSubmit } from "@/components/ui/choice-card"
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
// that can be used (v-track M-R8). Without a search each group shows ROLE_CAP roles, the held, chosen and
// ticked-this-session ones first, with a button that shows the whole group for the rest of the session; a search
// shows every match.
// Final review: the pinned set is taken when the search or the expansion changes, not on every tick, so a ticked card
// never moves under the pointer. A removed chip keeps its place. Focus never drops to the page body: show all moves it to
// the first role it reveals, removing a chip added this session to the next chip (or the search), clearing the search to
// the search box. Enter in the search does not submit the form.
const ROLE_CAP = 12

type PendingFocus = { kind: "role" | "chip" | "heading"; id: string } | { kind: "search" }

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
  const [expanded, setExpanded] = useState<string[]>([])
  const [touched, setTouched] = useState<string[]>([])
  const sectionRef = useRef<HTMLDivElement>(null)
  const pendingFocusRef = useRef<PendingFocus | null>(null)
  const rolesById = new Map(roles.map((role) => [role.id, role]))
  const initial = new Set(initialIds)
  const { added, removed } = roleChangeMarks(initialIds, currentIds)
  const chipIds = [...initialIds, ...added]
  const needle = query.trim().toLocaleLowerCase()
  const pinKey = `${needle}|${expanded.join(",")}`
  const [pinSnapshot, setPinSnapshot] = useState(() => ({ key: pinKey, ids: initialIds }))
  if (pinSnapshot.key !== pinKey) {
    setPinSnapshot({ key: pinKey, ids: [...initialIds, ...currentIds, ...touched] })
  }
  const listed = roles.filter((role) => role.isActive).filter((role) => needle === "" || `${role.label} ${role.name}`.toLocaleLowerCase().includes(needle))
  const groups = [
    { key: "system", title: t("form.systemRoles"), roles: listed.filter((role) => role.isSystem) },
    { key: "custom", title: t("form.customRoles"), roles: listed.filter((role) => !role.isSystem) },
  ].filter((group) => group.roles.length > 0)
  const pinned = new Set(pinSnapshot.ids)
  const isLocked = (role: FormRole) => role.lockReason !== null && !initial.has(role.id)
  const shownGroups = groups.map((group) => {
    const ordered = [...group.roles.filter((role) => pinned.has(role.id)), ...group.roles.filter((role) => !pinned.has(role.id))]
    const pinnedCount = group.roles.filter((role) => pinned.has(role.id)).length
    const capped = needle === "" && !expanded.includes(group.key)
    const shown = capped ? ordered.slice(0, Math.max(ROLE_CAP, pinnedCount)) : ordered
    return { ...group, shown, firstHiddenId: ordered.slice(shown.length).find((role) => !isLocked(role))?.id }
  })
  const focusRoleId = shownGroups.flatMap((group) => group.shown).find((role) => !isLocked(role))?.id

  function setPendingFocus(target: PendingFocus | null) {
    pendingFocusRef.current = target
  }

  // After the render that follows a show all, a chip removal or a cleared search.
  useEffect(() => {
    const target = pendingFocusRef.current
    if (!target) return
    pendingFocusRef.current = null
    const selector =
      target.kind === "search"
        ? "#admin-user-role-search"
        : target.kind === "chip"
          ? `[data-chip-id="${CSS.escape(target.id)}"] button`
          : target.kind === "role"
            ? `input[data-role-id="${CSS.escape(target.id)}"]`
            : `[data-group-heading="${CSS.escape(target.id)}"]`
    sectionRef.current?.querySelector<HTMLElement>(selector)?.focus()
  })

  function toggle(roleId: string) {
    if (!touched.includes(roleId)) setTouched((current) => [...current, roleId])
    onToggle(roleId)
  }

  // A chip added this session unmounts when removed; a held one stays in place as เอาออก (its button keeps focus).
  function removeChip(id: string) {
    if (added.includes(id)) {
      const index = chipIds.indexOf(id)
      const next = chipIds[index + 1] ?? chipIds[index - 1]
      setPendingFocus(next ? { kind: "chip", id: next } : { kind: "search" })
    }
    onToggle(id)
  }

  function showAll(groupKey: string, firstHiddenId: string | undefined) {
    setExpanded((current) => [...current, groupKey])
    setPendingFocus(firstHiddenId ? { kind: "role", id: firstHiddenId } : { kind: "heading", id: groupKey })
  }

  function clearSearch() {
    onQueryChange("")
    setPendingFocus({ kind: "search" })
  }

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
        <div ref={sectionRef} className="grid gap-4">
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
                    data-chip-id={id}
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
                      <Button variant="ghost" size="icon-sm" aria-label={t("form.removeRole", { name: role.label })} onClick={() => removeChip(id)}>
                        <X aria-hidden="true" />
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : null}

          <SearchField
            id="admin-user-role-search"
            value={query}
            onKeyDown={preventEnterSubmit}
            onChange={(event) => onQueryChange(event.target.value)}
            onClear={clearSearch}
            clearLabel={t("form.roleSearchClear")}
            placeholder={t("form.roleSearch")}
            aria-label={t("form.roleSearch")}
            maxLength={100}
          />

          {shownGroups.map((group) => (
            <div key={group.key} className="grid gap-2">
              <h3 data-group-heading={group.key} tabIndex={-1} className="text-meta font-medium text-muted-foreground focus-visible:outline-none">
                {group.title} <span className="num">· {group.roles.length}</span>
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {group.shown.map((role) => {
                  const locked = isLocked(role)
                  return (
                    <ChoiceCard
                      key={role.id}
                      type="checkbox"
                      id={role.id === focusRoleId ? "admin-user-roles" : undefined}
                      data-role-id={role.id}
                      checked={currentIds.includes(role.id)}
                      disabled={locked}
                      onChange={() => toggle(role.id)}
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
              {group.shown.length < group.roles.length ? (
                <Button variant="outline" size="sm" className="justify-self-start" onClick={() => showAll(group.key, group.firstHiddenId)}>
                  {t("form.showAllRoles", { count: group.roles.length })}
                </Button>
              ) : null}
            </div>
          ))}

          <p role="status" className="text-meta text-muted-foreground empty:hidden">
            {needle !== "" && shownGroups.length === 0 ? t("form.roleSearchEmpty") : null}
          </p>

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
