"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Save } from "lucide-react"
import { toast } from "sonner"

type RoleFormValue = {
  id: string
  name: string
  displayName: string
  displayNameTh?: string | null
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
  const [values, setValues] = useState(() => new Set(selectedPermissionIds))
  const backHref = `/${locale}/admin/roles`
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(`/api/admin/roles/${role.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionIds: Array.from(values) }),
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
          <p className="mt-1 text-sm text-muted-foreground">
            {role.displayNameTh || role.displayName} · {role.name}
          </p>
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
          <h2 className="text-base font-semibold text-foreground">{t("permissionSelection")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("formSubtitle")}</p>
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
                              onChange={() => togglePermission(permission.id)}
                              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
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
