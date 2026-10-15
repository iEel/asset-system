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
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { Notice } from "@/components/ui/notice"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"

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
  const [meta, setMeta] = useState({
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
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <ContentPanel divided title={t("roleMetadata")} description={t("metadataSubtitle")}>
          {/* D7: a condition before acting is a neutral Notice (it was a teal info box). */}
          {isSystemRole ? <Notice tone="neutral" className="mb-5">{permissionsLocked ? t("systemAdminGuard") : t("systemRoleGuard")}</Notice> : null}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label={t("roleKey")} required>
              <Input
                value={meta.name}
                required
                pattern="[a-z][a-z0-9_]*"
                disabled={isSystemRole}
                onChange={(event) => setMeta((current) => ({ ...current, name: event.target.value }))}
              />
            </Field>
            <Field label={t("displayName")} required>
              <Input
                value={meta.displayName}
                required
                maxLength={200}
                onChange={(event) => setMeta((current) => ({ ...current, displayName: event.target.value }))}
              />
            </Field>
            <Field label={t("displayNameTh")}>
              <Input
                value={meta.displayNameTh}
                maxLength={200}
                onChange={(event) => setMeta((current) => ({ ...current, displayNameTh: event.target.value }))}
              />
            </Field>
            <label className="flex min-h-11 items-center gap-2 self-end text-sm font-medium text-foreground has-disabled:cursor-not-allowed has-disabled:text-faint-foreground">
              <input
                type="checkbox"
                checked={meta.isActive}
                disabled={isSystemRole}
                onChange={(event) => setMeta((current) => ({ ...current, isActive: event.target.checked }))}
                className={checkboxVariants()}
              />
              {tCommon("active")}
            </label>
            <div className="md:col-span-2">
              <Field label={t("description")}>
                <Textarea
                  value={meta.description}
                  rows={3}
                  maxLength={500}
                  onChange={(event) => setMeta((current) => ({ ...current, description: event.target.value }))}
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
