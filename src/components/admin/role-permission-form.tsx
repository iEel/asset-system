"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { ArrowLeft, Info, Loader2, Save } from "lucide-react"
import { toast } from "sonner"

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
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("editTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{isCreate ? t("createSubtitle") : `${role.displayNameTh || role.displayName} · ${role.name}`}</p>
        </div>
        <Link
          href={backHref}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          {tCommon("back")}
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">{t("roleMetadata")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("metadataSubtitle")}</p>
            </div>
            {isSystemRole ? (
              <div className="inline-flex max-w-md items-start gap-2 rounded-md border border-info/30 bg-info/10 px-3 py-2 text-sm text-info">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{permissionsLocked ? t("systemAdminGuard") : t("systemRoleGuard")}</span>
              </div>
            ) : null}
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label={t("roleKey")} required>
              <input
                value={meta.name}
                required
                pattern="[a-z][a-z0-9_]*"
                disabled={isSystemRole}
                onChange={(event) => setMeta((current) => ({ ...current, name: event.target.value }))}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
              />
            </Field>
            <Field label={t("displayName")} required>
              <input
                value={meta.displayName}
                required
                maxLength={200}
                onChange={(event) => setMeta((current) => ({ ...current, displayName: event.target.value }))}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </Field>
            <Field label={t("displayNameTh")}>
              <input
                value={meta.displayNameTh}
                maxLength={200}
                onChange={(event) => setMeta((current) => ({ ...current, displayNameTh: event.target.value }))}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={meta.isActive}
                disabled={isSystemRole}
                onChange={(event) => setMeta((current) => ({ ...current, isActive: event.target.checked }))}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary disabled:opacity-60"
              />
              {tCommon("active")}
            </label>
            <div className="md:col-span-2">
              <Field label={t("description")}>
                <textarea
                  value={meta.description}
                  rows={3}
                  maxLength={500}
                  onChange={(event) => setMeta((current) => ({ ...current, description: event.target.value }))}
                  className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </Field>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-base font-semibold text-foreground">{t("permissionSelection")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {permissionsLocked ? t("permissionLockedSubtitle") : t("formSubtitle")}
          </p>
        </section>

        <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                    {t("module")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                    {t("permissions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {groupedPermissions.map(([moduleName, modulePermissions]) => (
                  <tr key={moduleName} className="hover:bg-accent/50">
                    <td className="whitespace-nowrap px-4 py-3 align-top">
                      <div className="font-medium text-foreground">{t(`modules.${moduleName}`)}</div>
                      <div className="mt-1 font-mono text-xs text-muted-foreground">{moduleName}</div>
                      <label className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={modulePermissions.every((permission) => values.has(permission.id))}
                          disabled={permissionsLocked}
                          onChange={(event) => setModulePermissions(modulePermissions, event.target.checked)}
                          className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary disabled:opacity-60"
                        />
                        {t("selectModule")}
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
                        {modulePermissions.map((permission) => (
                          <label
                            key={permission.id}
                            className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2"
                          >
                            <input
                              type="checkbox"
                              checked={values.has(permission.id)}
                              disabled={permissionsLocked}
                              onChange={() => togglePermission(permission.id)}
                              className="h-4 w-4 rounded border-border text-primary focus:ring-primary disabled:opacity-60"
                            />
                            <span className="text-sm text-foreground">{t(`actions.${permission.action}`)}</span>
                          </label>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <Link
            href={backHref}
            className="inline-flex h-10 items-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            {tCommon("cancel")}
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("savePermissions")}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-1 text-danger">*</span>}
      </span>
      {children}
    </label>
  )
}
