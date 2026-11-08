"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { StickyFormFooter } from "@/components/ui/sticky-form-footer"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"
import { RoleChangeSummary } from "@/components/admin/role-form/role-change-summary"
import { RoleDetailsSection, type RoleField, type RoleMeta } from "@/components/admin/role-form/role-details-section"
import { RoleFormHeader } from "@/components/admin/role-form/role-form-header"
import { RolePeopleSection } from "@/components/admin/role-form/role-people-section"
import { RolePermissionMatrix } from "@/components/admin/role-form/role-permission-matrix"
import { getPanelClasses } from "@/lib/design-system"
import { PERMISSION_GROUPS, type PermissionGroupKey } from "@/lib/permission-groups"
import { permissionMarks, setMany } from "@/lib/role-editor-model"
import type { RoleFormData } from "@/lib/role-form-data"
import { cn } from "@/lib/utils"
import { maxLength, minLength, pattern, required } from "@/lib/validation-rules"

// Page group 11 plan 3 task 4 (spec §7; board US-Role-Edit): the create and edit role form. The parts are in role-form/:
// the header, ข้อมูลบทบาท, the grouped permission matrix, the change summary with the segregation warning (edit), and
// the people in the role (edit, user:view). Below sm the note is the form's last section; from sm it sits in the footer
// with its visible label. Both note fields share one state and only one is displayed at a time.

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1).
const FIELD_IDS = {
  name: "role-key",
  displayName: "role-display-name",
  displayNameTh: "role-display-name-th",
  description: "role-description",
  permissionIds: "role-permissions",
} as const
const FIELD_ORDER = Object.keys(FIELD_IDS) as RoleField[]

// The two long groups start folded unless they hold a change (spec §7.2).
const FOLDED_GROUPS: readonly PermissionGroupKey[] = ["masterData", "system"]

// noValidate turns the browser's check off, so this restates the controls' required, maxLength and pattern, and
// the server's length of the role key (v-track M-R2).
function validate(values: RoleMeta) {
  const errors: Partial<Record<RoleField, string>> = {}
  const check = (key: RoleField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("name", required(values.name) ?? minLength(values.name, 2) ?? maxLength(values.name, 50) ?? pattern(values.name, /^[a-z][a-z0-9_]*$/))
  check("displayName", required(values.displayName) ?? maxLength(values.displayName, 200))
  check("displayNameTh", maxLength(values.displayNameTh, 200))
  check("description", maxLength(values.description, 500))
  return errors
}

export function RolePermissionForm({ data, usersHref = "" }: { data: RoleFormData; usersHref?: string }) {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations("adminRolesPage")
  const tCommon = useTranslations("common")
  const apiError = useApiError()
  const role = data.role
  const [saving, setSaving] = useState(false)
  const fieldErrors = useFieldErrors<RoleField>()
  const validationMessage = useValidationMessage()
  const [meta, setMeta] = useState<RoleMeta>({
    name: role.name,
    displayName: role.displayName,
    displayNameTh: role.displayNameTh ?? "",
    description: role.description ?? "",
    isActive: role.isActive,
  })
  const [note, setNote] = useState("")
  // Permissions as "module:action" keys; the save maps them back to ids.
  const idByKey = useMemo(
    () => new Map(data.permissions.map((permission) => [`${permission.module}:${permission.action}`, permission.id])),
    [data.permissions],
  )
  const [initialKeys] = useState<ReadonlySet<string>>(() => {
    const selected = new Set(data.selectedIds)
    return new Set(data.permissions.filter((permission) => selected.has(permission.id)).map((permission) => `${permission.module}:${permission.action}`))
  })
  const [values, setValues] = useState<Set<string>>(() => new Set(initialKeys))
  const [openGroups, setOpenGroups] = useState<Partial<Record<PermissionGroupKey, boolean>>>({})
  const backHref = `/${locale}/admin/roles`
  const isCreate = !role.id
  const isSystemRole = role.isSystem
  const permissionsLocked = role.name === "system_admin"
  const lockedKeys = useMemo(() => new Set(data.lockedKeys), [data.lockedKeys])
  const isLocked = (key: string) => permissionsLocked || lockedKeys.has(key)
  const { added, removed } = permissionMarks(initialKeys, values)
  const changedKeys = new Set([...added, ...removed])
  const groupHasChange = (key: PermissionGroupKey) =>
    (PERMISSION_GROUPS.find((group) => group.key === key)?.modules ?? []).some((module) =>
      [...changedKeys].some((changed) => changed.startsWith(`${module}:`)),
    )
  const isOpen = (key: PermissionGroupKey) => openGroups[key] ?? (groupHasChange(key) || !FOLDED_GROUPS.includes(key))

  // A permissions error opens every group first, so the cell focus goes to is shown.
  const focusFirstError = () =>
    fieldErrors.focusFirst(FIELD_ORDER, {
      idFor: (key) => FIELD_IDS[key],
      reveal: (key) => {
        if (key === "permissionIds") setOpenGroups(Object.fromEntries(PERMISSION_GROUPS.map((group) => [group.key, true])))
      },
    })

  function setMetaField<K extends keyof RoleMeta>(field: K, value: RoleMeta[K]) {
    setMeta((current) => ({ ...current, [field]: value }))
    if (field in FIELD_IDS) fieldErrors.clear(field as RoleField)
  }

  function togglePermission(key: string) {
    if (isLocked(key)) return
    setValues((current) => {
      const next = new Set(current)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
    fieldErrors.clear("permissionIds")
  }

  // A row or a column at once; locked keys keep their state.
  function setPermissions(keys: string[], on: boolean) {
    if (permissionsLocked) return
    setValues((current) => setMany(current, keys, on, isLocked))
    fieldErrors.clear("permissionIds")
  }

  function toggleGroup(key: PermissionGroupKey) {
    setOpenGroups((current) => ({ ...current, [key]: !isOpen(key) }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    fieldErrors.setErrors(validate(meta))
    if (focusFirstError()) return
    setSaving(true)

    try {
      const response = await fetch(isCreate ? "/api/admin/roles" : `/api/admin/roles/${role.id}`, {
        method: isCreate ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: meta.name,
          displayName: meta.displayName,
          displayNameTh: meta.displayNameTh || null,
          description: meta.description || null,
          isActive: meta.isActive,
          permissionIds: [...values].flatMap((key) => idByKey.get(key) ?? []),
          note: note.trim() || null,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        // A refusal that names a field of this form shows under it; any other keeps the toast (spec §4.1).
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        throw new Error(payload?.error ?? tCommon("error"))
      }
      toast.success(tCommon("savedSuccess"))
      router.push(backHref)
      router.refresh()
    } catch (error) {
      apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <RoleFormHeader
        role={role}
        backHref={backHref}
        userCount={data.userCount}
        canViewUsers={data.canViewUsers}
        canViewLogs={data.canViewLogs}
      />

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <RoleDetailsSection
          meta={meta}
          fieldErrors={fieldErrors}
          validationMessage={validationMessage}
          isSystemRole={isSystemRole}
          permissionsLocked={permissionsLocked}
          onFieldChange={setMetaField}
        />

        <RolePermissionMatrix
          permissions={data.permissions}
          initial={initialKeys}
          current={values}
          isLocked={isLocked}
          allLocked={permissionsLocked}
          isOpen={isOpen}
          error={fieldErrors.errors.permissionIds ? fieldErrors.message("permissionIds") : undefined}
          caption={t("permissionSelection")}
          onToggleGroup={toggleGroup}
          onToggle={togglePermission}
          onSetMany={setPermissions}
        />

        {isCreate ? null : (
          <RoleChangeSummary
            initial={initialKeys}
            current={values}
            userCount={data.userCount}
            people={data.people}
            canViewUsers={data.canViewUsers}
            disposalSegregationOn={data.disposalSegregationOn}
          />
        )}

        <section className={cn(getPanelClasses(), "p-4 sm:hidden")}>
          <Field label={t("form.noteOptional")} id="role-note-phone">
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              maxLength={500}
              placeholder={t("form.notePlaceholder")}
              className="field-sizing-content max-h-32 min-h-11"
            />
          </Field>
        </section>

        <StickyFormFooter
          status={
            <span role="status" className="num block sm:whitespace-normal">
              {t("form.footerStatus", {
                count: values.size,
                total: idByKey.size,
                added: added.length,
                removed: removed.length,
                users: data.userCount,
              })}
            </span>
          }
        >
          <Field label={t("form.noteOptional")} id="role-note" className="hidden sm:grid sm:w-80">
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={1}
              maxLength={500}
              placeholder={t("form.notePlaceholder")}
              className="field-sizing-content max-h-32 min-h-11 md:min-h-9"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2 sm:contents">
            <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
              {tCommon("cancel")}
            </Link>
            <Button type="submit" busy={saving}>
              <Save aria-hidden="true" />
              {t("savePermissions")}
            </Button>
          </div>
        </StickyFormFooter>
      </form>

      {role.id && data.canViewUsers ? (
        <RolePeopleSection
          roleId={role.id}
          roleActive={role.isActive}
          people={data.people}
          userCount={data.userCount}
          canEditUsers={data.canEditUsers}
          usersHref={usersHref}
        />
      ) : null}
    </div>
  )
}
