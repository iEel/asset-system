"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { Field, FieldError } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"
import { getPanelClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"
import { atLeastOne, email, maxLength, minLength, required } from "@/lib/validation-rules"

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

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1).
const FIELD_IDS = {
  username: "admin-user-username",
  password: "admin-user-password",
  displayName: "admin-user-display-name",
  email: "admin-user-email",
  employeeId: "admin-user-employee",
  roleIds: "admin-user-roles",
} as const
type AdminUserField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as AdminUserField[]

// noValidate turns the browser's check off, so this restates the controls' required, minLength, maxLength and
// type="email", and the server's rule of at least one role (v-track M-R2).
function validate(values: AdminUserFormValues, isEdit: boolean) {
  const errors: Partial<Record<AdminUserField, string>> = {}
  const check = (key: AdminUserField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("username", required(values.username) ?? maxLength(values.username, 100))
  // A new user needs a password; an edit keeps the old one when the field stays empty.
  check("password", (isEdit ? null : required(values.password)) ?? minLength(values.password, 8) ?? maxLength(values.password, 100))
  check("displayName", required(values.displayName) ?? maxLength(values.displayName, 200))
  check("email", email(values.email) ?? maxLength(values.email, 200))
  check("roleIds", atLeastOne(values.roleIds))
  return errors
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
  const apiError = useApiError()
  const router = useRouter()
  const t = useTranslations("adminUsersPage")
  const tCommon = useTranslations("common")
  const [values, setValues] = useState<AdminUserFormValues>(user ?? emptyUser)
  const [saving, setSaving] = useState(false)
  const fieldErrors = useFieldErrors<AdminUserField>()
  const validationMessage = useValidationMessage()
  const isEdit = Boolean(user?.id)
  const backHref = `/${locale}/admin/users`
  const title = useMemo(() => (isEdit ? t("editTitle") : t("createTitle")), [isEdit, t])

  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })

  function setField<K extends keyof AdminUserFormValues>(field: K, value: AdminUserFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    if (field in FIELD_IDS) fieldErrors.clear(field as AdminUserField)
  }

  function toggleRole(roleId: string) {
    setValues((current) => ({
      ...current,
      roleIds: current.roleIds.includes(roleId)
        ? current.roleIds.filter((id) => id !== roleId)
        : [...current.roleIds, roleId],
    }))
    fieldErrors.clear("roleIds")
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    fieldErrors.setErrors(validate(values, isEdit))
    if (focusFirstError()) return
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
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={title}
        meta={t("formSubtitle")}
        className="mb-6"
        back={<PageBackLink href={backHref} label={tCommon("back")} />}
      />

      {/* The form is the panel (D9): the panel classes and ContentPanel's own padding, since a <form> cannot be ContentPanel. */}
      <form onSubmit={handleSubmit} noValidate className={cn(getPanelClasses(), "p-4 sm:p-5")}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("username")} id="admin-user-username" required error={fieldErrors.message("username")}>
            <Input
              value={values.username}
              onChange={(event) => setField("username", event.target.value)}
              required
              maxLength={100}
            />
          </Field>
          <Field
            label={isEdit ? t("newPassword") : t("password")}
            id="admin-user-password"
            required={!isEdit}
            error={fieldErrors.errors.password ? validationMessage(fieldErrors.errors.password, { min: 8, max: 100 }) : undefined}
          >
            <Input
              type="password"
              value={values.password}
              onChange={(event) => setField("password", event.target.value)}
              required={!isEdit}
              minLength={8}
              maxLength={100}
            />
          </Field>
          <Field label={t("displayName")} id="admin-user-display-name" required error={fieldErrors.message("displayName")}>
            <Input
              value={values.displayName}
              onChange={(event) => setField("displayName", event.target.value)}
              required
              maxLength={200}
            />
          </Field>
          <Field label={t("email")} id="admin-user-email" error={fieldErrors.message("email")}>
            <Input
              type="email"
              value={values.email ?? ""}
              onChange={(event) => setField("email", event.target.value)}
              maxLength={200}
            />
          </Field>
          <Field label={t("employee")} id="admin-user-employee" error={fieldErrors.message("employeeId")}>
            <NativeSelect
              value={values.employeeId ?? ""}
              onChange={(event) => setField("employeeId", event.target.value)}
            >
              <option value="">{t("noEmployee")}</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.code} - {employee.fullNameTh}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <label className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm md:self-end">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(event) => setField("isActive", event.target.checked)}
              className={checkboxVariants()}
            />
            {tCommon("active")}
          </label>
        </div>

        {/* The roles are one group with one error under it; focus goes to its first checkbox (v-track M-R8). */}
        <section
          className="mt-6 border-t border-border pt-5"
          role="group"
          aria-labelledby="admin-user-roles-label"
          aria-describedby={fieldErrors.errors.roleIds ? "admin-user-roles-error" : undefined}
        >
          <div id="admin-user-roles-label" className="mb-3 text-sm font-medium text-foreground">{t("roles")}</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {roles.map((role, index) => (
              <label key={role.id} className="flex items-start gap-3 rounded-md border border-border bg-background p-3 text-sm">
                <input
                  id={index === 0 ? "admin-user-roles" : undefined}
                  type="checkbox"
                  checked={values.roleIds.includes(role.id)}
                  onChange={() => toggleRole(role.id)}
                  className={cn(checkboxVariants(), "mt-0.5")}
                />
                <span>
                  <span className="block font-medium text-foreground">{role.displayNameTh || role.displayName}</span>
                  <span className="mt-1 block text-xs text-muted-foreground"><span className="tag">{role.name}</span></span>
                </span>
              </label>
            ))}
          </div>
          {fieldErrors.errors.roleIds ? (
            <FieldError id="admin-user-roles-error" className="mt-2">{fieldErrors.message("roleIds")}</FieldError>
          ) : null}
        </section>

        <div className="mt-6 flex justify-end gap-3 border-t border-border pt-5">
          <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
            {tCommon("cancel")}
          </Link>
          <Button type="submit" busy={saving}>
            <Save aria-hidden="true" />
            {tCommon("save")}
          </Button>
        </div>
      </form>
    </div>
  )
}
