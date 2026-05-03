"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Save } from "lucide-react"
import { toast } from "sonner"

type RoleOption = {
  id: string
  name: string
  displayName: string
  displayNameTh?: string | null
}

type EmployeeOption = {
  id: string
  code: string
  fullNameTh: string
}

type AdminUserFormValues = {
  id?: string
  username: string
  password: string
  displayName: string
  email?: string | null
  employeeId?: string | null
  roleIds: string[]
  isActive: boolean
}

const emptyUser: AdminUserFormValues = {
  username: "",
  password: "",
  displayName: "",
  email: "",
  employeeId: "",
  roleIds: [],
  isActive: true,
}

export function AdminUserForm({
  user,
  employees,
  roles,
}: {
  user?: AdminUserFormValues
  employees: EmployeeOption[]
  roles: RoleOption[]
}) {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations("adminUsersPage")
  const tCommon = useTranslations("common")
  const [values, setValues] = useState<AdminUserFormValues>(user ?? emptyUser)
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(user?.id)
  const backHref = `/${locale}/admin/users`
  const title = useMemo(() => (isEdit ? t("editTitle") : t("createTitle")), [isEdit, t])

  function setField<K extends keyof AdminUserFormValues>(field: K, value: AdminUserFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function toggleRole(roleId: string) {
    setValues((current) => ({
      ...current,
      roleIds: current.roleIds.includes(roleId)
        ? current.roleIds.filter((id) => id !== roleId)
        : [...current.roleIds, roleId],
    }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(isEdit ? `/api/admin/users/${user?.id}` : "/api/admin/users", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: values.username,
          password: values.password || null,
          displayName: values.displayName,
          email: values.email || null,
          employeeId: values.employeeId || null,
          roleIds: values.roleIds,
          isActive: values.isActive,
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
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("formSubtitle")}</p>
        </div>
        <Link
          href={backHref}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          {tCommon("back")}
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-surface p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("username")} required>
            <input
              value={values.username}
              onChange={(event) => setField("username", event.target.value)}
              required
              maxLength={100}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>
          <Field label={isEdit ? t("newPassword") : t("password")} required={!isEdit}>
            <input
              type="password"
              value={values.password}
              onChange={(event) => setField("password", event.target.value)}
              required={!isEdit}
              minLength={8}
              maxLength={100}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>
          <Field label={t("displayName")} required>
            <input
              value={values.displayName}
              onChange={(event) => setField("displayName", event.target.value)}
              required
              maxLength={200}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>
          <Field label={t("email")}>
            <input
              type="email"
              value={values.email ?? ""}
              onChange={(event) => setField("email", event.target.value)}
              maxLength={200}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>
          <Field label={t("employee")}>
            <select
              value={values.employeeId ?? ""}
              onChange={(event) => setField("employeeId", event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">{t("noEmployee")}</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.code} - {employee.fullNameTh}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm md:self-end">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(event) => setField("isActive", event.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            {tCommon("active")}
          </label>
        </div>

        <section className="mt-6 border-t border-border pt-5">
          <div className="mb-3 text-sm font-medium text-foreground">{t("roles")}</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {roles.map((role) => (
              <label key={role.id} className="flex items-start gap-3 rounded-md border border-border bg-background p-3 text-sm">
                <input
                  type="checkbox"
                  checked={values.roleIds.includes(role.id)}
                  onChange={() => toggleRole(role.id)}
                  className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span>
                  <span className="block font-medium text-foreground">{role.displayNameTh || role.displayName}</span>
                  <span className="mt-1 block font-mono text-xs text-muted-foreground">{role.name}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <div className="mt-6 flex justify-end gap-3 border-t border-border pt-5">
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
            {tCommon("save")}
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
