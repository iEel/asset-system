"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { Field, FieldError } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { Notice } from "@/components/ui/notice"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"
import { maxLength, minLength, pattern, required } from "@/lib/validation-rules"

type RoleFormValue = {
  id?: string
  name: string
  displayName: string
  displayNameTh?: string | null
  description?: string | null
  isSystem?: boolean
  isActive?: boolean
}

type PermissionOption = {
  id: string
  module: string
  action: string
}

type RoleMeta = {
  name: string
  displayName: string
  displayNameTh: string
  description: string
  isActive: boolean
}

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1).
const FIELD_IDS = {
  name: "role-key",
  displayName: "role-display-name",
  displayNameTh: "role-display-name-th",
  description: "role-description",
  permissionIds: "role-permissions",
} as const
type RoleField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as RoleField[]

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

export function RolePermissionForm({
  role,
  permissions,
  selectedPermissionIds,
}: {
  role: RoleFormValue
  permissions: PermissionOption[]
  selectedPermissionIds: string[]
}) {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations("adminRolesPage")
  const tCommon = useTranslations("common")
  const apiError = useApiError()
  const [saving, setSaving] = useState(false)
  const fieldErrors = useFieldErrors<RoleField>()
  const validationMessage = useValidationMessage()
  const [meta, setMeta] = useState<RoleMeta>({
    name: role.name,
    displayName: role.displayName,
    displayNameTh: role.displayNameTh ?? "",
    description: role.description ?? "",
    isActive: role.isActive ?? true,
  })
  const [values, setValues] = useState(() => new Set(selectedPermissionIds))
  const backHref = `/${locale}/admin/roles`
  const isCreate = !role.id
  const isSystemRole = Boolean(role.isSystem)
  const permissionsLocked = role.name === "system_admin"
  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, PermissionOption[]>()
    for (const permission of permissions) {
      const current = groups.get(permission.module) ?? []
      current.push(permission)
      groups.set(permission.module, current)
    }
    return Array.from(groups.entries())
  }, [permissions])
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })
  const firstPermissionId = groupedPermissions[0]?.[1][0]?.id

  function setMetaField<K extends keyof RoleMeta>(field: K, value: RoleMeta[K]) {
    setMeta((current) => ({ ...current, [field]: value }))
    if (field in FIELD_IDS) fieldErrors.clear(field as RoleField)
  }

function togglePermission(permissionId: string) {
    if (permissionsLocked) return
    setValues((current) => {
      const next = new Set(current)
      if (next.has(permissionId)) {
        next.delete(permissionId)
      } else {
        next.add(permissionId)
      }
      return next
    })
    fieldErrors.clear("permissionIds")
  }

  function setModulePermissions(modulePermissions: PermissionOption[], checked: boolean) {
    if (permissionsLocked) return
    setValues((current) => {
      const next = new Set(current)
      for (const permission of modulePermissions) {
        if (checked) {
          next.add(permission.id)
        } else {
          next.delete(permission.id)
        }
      }
      return next
    })
    fieldErrors.clear("permissionIds")
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
          permissionIds: Array.from(values),
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
      <PageHeader
        title={isCreate ? t("createTitle") : t("editTitle")}
        meta={isCreate ? t("createSubtitle") : `${role.displayNameTh || role.displayName} · ${role.name}`}
        className="mb-6"
        back={<PageBackLink href={backHref} label={tCommon("back")} />}
      />

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <ContentPanel divided title={t("roleMetadata")} description={t("metadataSubtitle")}>
          {/* D7: a condition before acting is a neutral Notice (it was a teal info box). */}
          {isSystemRole ? <Notice tone="neutral" className="mb-5">{permissionsLocked ? t("systemAdminGuard") : t("systemRoleGuard")}</Notice> : null}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label={t("roleKey")}
              id="role-key"
              required
              error={fieldErrors.errors.name ? validationMessage(fieldErrors.errors.name, { min: 2, max: 50 }) : undefined}
            >
              <Input
                value={meta.name}
                required
                pattern="[a-z][a-z0-9_]*"
                disabled={isSystemRole}
                onChange={(event) => setMetaField("name", event.target.value)}
              />
            </Field>
            <Field label={t("displayName")} id="role-display-name" required error={fieldErrors.message("displayName")}>
              <Input
                value={meta.displayName}
                required
                maxLength={200}
                onChange={(event) => setMetaField("displayName", event.target.value)}
              />
            </Field>
            <Field label={t("displayNameTh")} id="role-display-name-th" error={fieldErrors.message("displayNameTh")}>
              <Input
                value={meta.displayNameTh}
                maxLength={200}
                onChange={(event) => setMetaField("displayNameTh", event.target.value)}
              />
            </Field>
            <label className="flex min-h-11 items-center gap-2 self-end text-sm font-medium text-foreground has-disabled:cursor-not-allowed has-disabled:text-faint-foreground">
              <input
                type="checkbox"
                checked={meta.isActive}
                disabled={isSystemRole}
                onChange={(event) => setMetaField("isActive", event.target.checked)}
                className={checkboxVariants()}
              />
              {tCommon("active")}
            </label>
            <div className="md:col-span-2">
              <Field label={t("description")} id="role-description" error={fieldErrors.message("description")}>
                <Textarea
                  value={meta.description}
                  rows={3}
                  maxLength={500}
                  onChange={(event) => setMetaField("description", event.target.value)}
                />
              </Field>
            </div>
          </div>
        </ContentPanel>

        <ContentPanel
          divided
          flush
          className="overflow-hidden"
          title={t("permissionSelection")}
          description={permissionsLocked ? t("permissionLockedSubtitle") : t("formSubtitle")}
        >
          {/* The permissions are one group with one error above the table; focus goes to the first permission (v-track M-R8). */}
          {fieldErrors.errors.permissionIds ? (
            <FieldError id="role-permissions-error" className="px-4 pt-3 md:px-5">{fieldErrors.message("permissionIds")}</FieldError>
          ) : null}
          <div
            role="group"
            aria-label={t("permissionSelection")}
            aria-describedby={fieldErrors.errors.permissionIds ? "role-permissions-error" : undefined}
          >
            <DataTable framed={false} caption={t("permissionSelection")}>
              <DataTableHeader>
                <tr>
                  <DataTableHead>{t("module")}</DataTableHead>
                  <DataTableHead>{t("permissions")}</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                  {groupedPermissions.map(([moduleName, modulePermissions]) => (
                    <DataTableRow key={moduleName}>
                      <DataTableCell className="whitespace-nowrap">
                        <div className="font-medium text-foreground">{t(`modules.${moduleName}`)}</div>
                        <div className="mt-1 text-xs text-muted-foreground"><span className="tag">{moduleName}</span></div>
                        <label className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs text-muted-foreground has-disabled:cursor-not-allowed has-disabled:text-faint-foreground">
                          <input
                            type="checkbox"
                            checked={modulePermissions.every((permission) => values.has(permission.id))}
                            disabled={permissionsLocked}
                            onChange={(event) => setModulePermissions(modulePermissions, event.target.checked)}
                            className={checkboxVariants()}
                          />
                          {t("selectModule")}
                        </label>
                      </DataTableCell>
                      <DataTableCell>
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
                          {modulePermissions.map((permission) => (
                            <label
                              key={permission.id}
                              className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 has-disabled:cursor-not-allowed has-disabled:text-faint-foreground"
                            >
                              <input
                                id={permission.id === firstPermissionId ? "role-permissions" : undefined}
                                type="checkbox"
                                checked={values.has(permission.id)}
                                disabled={permissionsLocked}
                                onChange={() => togglePermission(permission.id)}
                                className={checkboxVariants()}
                              />
                              <span className="text-sm">{t(`actions.${permission.action}`)}</span>
                            </label>
                          ))}
                        </div>
                      </DataTableCell>
                    </DataTableRow>
                  ))}
              </DataTableBody>
            </DataTable>
          </div>
        </ContentPanel>

        <div className="flex justify-end gap-3">
          <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
            {tCommon("cancel")}
          </Link>
          <Button type="submit" busy={saving}>
            <Save aria-hidden="true" />
            {t("savePermissions")}
          </Button>
        </div>
      </form>
    </div>
  )
}
