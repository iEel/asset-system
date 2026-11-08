"use client"

import { useState } from "react"
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
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { UserAccessPreview } from "@/components/admin/user-form/user-access-preview"
import { UserAccountSection } from "@/components/admin/user-form/user-account-section"
import { UserEmployeeSection } from "@/components/admin/user-form/user-employee-section"
import { UserFormHeader } from "@/components/admin/user-form/user-form-header"
import { UserRolesSection } from "@/components/admin/user-form/user-roles-section"
import type { UserFormData, UserFormEmployee } from "@/lib/admin-user-form-data"
import { fillFromEmployee, roleChangeMarks } from "@/lib/admin-user-form-model"
import { getPanelClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"
import { atLeastOne, email, maxLength, minLength, required } from "@/lib/validation-rules"

// Page group 11 plan 2 task 4 (spec §5; board US-User-Edit): the create and edit user form. Two columns from lg:
// account then linked employee on the left, roles then the access preview on the right. The parts are in user-form/.

export type AdminUserFormValues = {
  username: string
  password: string
  displayName: string
  email: string
  employeeId: string
  roleIds: string[]
  // Create only: an AD account has no password of its own (the server stores a random hash).
  authMode: "ad" | "local"
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
export type AdminUserField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as AdminUserField[]

export type AdminUserFieldErrors = ReturnType<typeof useFieldErrors<AdminUserField>>

// noValidate turns the browser's check off, so this restates the controls' required, minLength, maxLength and
// type="email", and the server's rule of at least one role (v-track M-R2).
function validate(values: AdminUserFormValues, isEdit: boolean) {
  const errors: Partial<Record<AdminUserField, string>> = {}
  const check = (key: AdminUserField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("username", required(values.username) ?? maxLength(values.username, 100))
  // A new local account needs a password; an AD account has none, and an edit keeps the old one when the field stays empty.
  check("password", (isEdit || values.authMode === "ad" ? null : required(values.password)) ?? minLength(values.password, 8) ?? maxLength(values.password, 100))
  check("displayName", required(values.displayName) ?? maxLength(values.displayName, 200))
  check("email", email(values.email) ?? maxLength(values.email, 200))
  check("roleIds", atLeastOne(values.roleIds))
  return errors
}

// The fields that differ from the loaded values; a typed password is always a change.
function changedFields(initial: AdminUserFormValues, values: AdminUserFormValues) {
  const keys = ["username", "displayName", "email", "employeeId"] as const
  return keys.filter((key) => initial[key].trim() !== values[key].trim()).length + (values.password !== "" ? 1 : 0)
}

export function AdminUserForm({ data, canViewAssets }: { data: UserFormData; canViewAssets: boolean }) {
  const locale = useLocale()
  const apiError = useApiError()
  const router = useRouter()
  const t = useTranslations("adminUsersPage")
  const tCommon = useTranslations("common")
  const user = data.user
  const isEdit = Boolean(user)
  const [initialValues] = useState<AdminUserFormValues>(() => ({
    username: user?.username ?? "",
    password: "",
    displayName: user?.displayName ?? "",
    email: user?.email ?? "",
    employeeId: user?.employeeId ?? "",
    roleIds: user?.roleIds ?? [],
    authMode: "ad",
  }))
  const [values, setValues] = useState<AdminUserFormValues>(initialValues)
  const [note, setNote] = useState("")
  const [roleQuery, setRoleQuery] = useState("")
  const [usernameSuggested, setUsernameSuggested] = useState(false)
  const [saving, setSaving] = useState(false)
  const fieldErrors = useFieldErrors<AdminUserField>()
  const backHref = `/${locale}/admin/users`
  const title = user ? `${t("editTitle")} · ${user.displayName}` : t("createTitle")
  const { added, removed } = roleChangeMarks(initialValues.roleIds, values.roleIds)
  const changeCount = changedFields(initialValues, values) + added.length + removed.length

  // A filtered role list may hide the first checkbox: the search clears before focus moves to it.
  const focusFirstError = () =>
    fieldErrors.focusFirst(FIELD_ORDER, {
      idFor: (key) => FIELD_IDS[key],
      reveal: (key) => {
        if (key === "roleIds") setRoleQuery("")
      },
    })

  function setField<K extends keyof AdminUserFormValues>(field: K, value: AdminUserFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    if (field === "username") setUsernameSuggested(false)
    if (field in FIELD_IDS) fieldErrors.clear(field as AdminUserField)
  }

  function changeAuthMode(mode: AdminUserFormValues["authMode"]) {
    setValues((current) => ({ ...current, authMode: mode, password: mode === "ad" ? "" : current.password }))
    fieldErrors.clear("password")
  }

  // On create a chosen employee fills the empty fields; a typed field is never overwritten (spec §5.2).
  function changeEmployee(next: UserFormEmployee | null) {
    if (!isEdit && next) {
      const filled = fillFromEmployee({ displayName: values.displayName, email: values.email, username: values.username }, next)
      setUsernameSuggested(values.username.trim() === "" && filled.username !== values.username)
      setValues((current) => ({ ...current, ...filled, employeeId: next.id }))
      fieldErrors.clear("employeeId", "username", "displayName", "email")
      return
    }
    setField("employeeId", next?.id ?? "")
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
      const response = await fetch(user ? `/api/admin/users/${user.id}` : "/api/admin/users", {
        method: user ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: values.username,
          displayName: values.displayName,
          email: values.email || null,
          employeeId: values.employeeId || null,
          roleIds: values.roleIds,
          // The status changes only through the อื่น ๆ menu (the status route); a new account is active.
          isActive: user ? user.isActive : true,
          note: note.trim() || null,
          ...(isEdit ? { password: values.password || null } : { authMode: values.authMode }),
          ...(!isEdit && values.authMode === "local" ? { password: values.password } : {}),
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
      <UserFormHeader title={title} backHref={backHref} user={user} canViewLogs={data.canViewLogs} dirty={changeCount > 0} />

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
          <div className="grid min-w-0 gap-5">
            <section className={cn(getPanelClasses(), "p-4 sm:p-5")} aria-labelledby="admin-user-account-heading">
              <UserAccountSection
                isEdit={isEdit}
                values={values}
                fieldErrors={fieldErrors}
                usernameSuggested={usernameSuggested}
                onFieldChange={setField}
                onAuthModeChange={changeAuthMode}
              />
            </section>
            <section className={cn(getPanelClasses(), "p-4 sm:p-5")} aria-labelledby="admin-user-employee-heading">
              <UserEmployeeSection
                employees={data.employees}
                value={values.employeeId}
                error={fieldErrors.message("employeeId")}
                canViewAssets={canViewAssets}
                onChange={changeEmployee}
              />
            </section>
          </div>
          <div className="grid min-w-0 gap-5">
            <UserRolesSection
              roles={data.roles}
              initialIds={initialValues.roleIds}
              currentIds={values.roleIds}
              query={roleQuery}
              error={fieldErrors.errors.roleIds ? fieldErrors.message("roleIds") : undefined}
              onQueryChange={setRoleQuery}
              onToggle={toggleRole}
            />
            <UserAccessPreview roles={data.roles} initialIds={initialValues.roleIds} currentIds={values.roleIds} />
          </div>
        </div>

        <StickyFormFooter
          className="mt-5"
          status={
            <span role="status" className="break-words">
              {changeCount > 0 ? t("form.changes", { count: changeCount }) : t("form.noChanges")}
            </span>
          }
        >
          <Field label={t("form.note")} hideLabel id="admin-user-note" className="sm:w-80">
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={1}
              maxLength={500}
              placeholder={t("form.notePlaceholder")}
              className="field-sizing-content max-h-32 min-h-11 md:min-h-9"
            />
          </Field>
          <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
            {tCommon("cancel")}
          </Link>
          <Button type="submit" busy={saving}>
            <Save aria-hidden="true" />
            {tCommon("save")}
          </Button>
        </StickyFormFooter>
      </form>
    </div>
  )
}
