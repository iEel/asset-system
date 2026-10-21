"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Save } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { Field, FieldHint } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { getPanelClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"
import { email, maxLength, required } from "@/lib/validation-rules"

type EmployeeFormValues = {
  id?: string
  code: string
  fullNameTh: string
  fullNameEn?: string | null
  email?: string | null
  companyId: string
  branchId: string
  departmentId: string
  position?: string | null
  employmentStatus: "active" | "resigned" | "suspended"
  managerId?: string | null
  isActive: boolean
}

type CompanyOption = {
  id: string
  code: string
  nameTh: string
}

type BranchOption = {
  id: string
  code: string
  name: string
  companyId: string
}

type DepartmentOption = {
  id: string
  code: string
  name: string
  companyId?: string | null
}

type ManagerOption = {
  id: string
  code: string
  fullNameTh: string
}

const emptyEmployee: EmployeeFormValues = {
  code: "",
  fullNameTh: "",
  fullNameEn: "",
  email: "",
  companyId: "",
  branchId: "",
  departmentId: "",
  position: "",
  employmentStatus: "active",
  managerId: "",
  isActive: true,
}

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1).
const FIELD_IDS = {
  code: "employee-code",
  fullNameTh: "employee-full-name-th",
  fullNameEn: "employee-full-name-en",
  email: "employee-email",
  companyId: "employee-company",
  branchId: "employee-branch",
  departmentId: "employee-department",
  position: "employee-position",
  employmentStatus: "employee-employment-status",
  managerId: "employee-manager",
} as const
type EmployeeField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as EmployeeField[]

// noValidate turns the browser's check off, so this restates the controls' required, maxLength and type="email" (v-track M-R2).
function validate(values: EmployeeFormValues): Partial<Record<EmployeeField, string>> {
  const errors: Partial<Record<EmployeeField, string>> = {}
  const check = (key: EmployeeField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("code", required(values.code) ?? maxLength(values.code, 20))
  check("fullNameTh", required(values.fullNameTh) ?? maxLength(values.fullNameTh, 200))
  check("fullNameEn", maxLength(values.fullNameEn, 200))
  check("email", email(values.email) ?? maxLength(values.email, 200))
  check("companyId", required(values.companyId))
  check("branchId", required(values.branchId))
  check("departmentId", required(values.departmentId))
  check("position", maxLength(values.position, 200))
  check("employmentStatus", required(values.employmentStatus))
  return errors
}

export function EmployeeForm({
  employee,
  companies,
  branches,
  departments,
  managers,
  backHref: providedBackHref,
  activeLockedBySync = false,
}: {
  employee?: EmployeeFormValues
  companies: CompanyOption[]
  branches: BranchOption[]
  departments: DepartmentOption[]
  managers: ManagerOption[]
  backHref?: string
  // While LDAP sync is on, the sync owns "ใช้งาน" (user decision 2026-10-21 Y4); the edit page passes it.
  activeLockedBySync?: boolean
}) {
  const locale = useLocale()
  const apiError = useApiError()
  const router = useRouter()
  const t = useTranslations("employee")
  const tCommon = useTranslations("common")
  const [values, setValues] = useState<EmployeeFormValues>(employee ?? emptyEmployee)
  const [saving, setSaving] = useState(false)
  const fieldErrors = useFieldErrors<EmployeeField>()

  const isEdit = Boolean(employee?.id)
  const backHref = providedBackHref ?? `/${locale}/master-data/employees`
  const title = useMemo(() => (isEdit ? t("editTitle") : t("createTitle")), [isEdit, t])
  const filteredBranches = branches.filter((branch) => branch.companyId === values.companyId)
  const filteredDepartments = departments.filter(
    (department) => !department.companyId || department.companyId === values.companyId
  )

  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })

  function setField<K extends keyof EmployeeFormValues>(field: K, value: EmployeeFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    if (field in FIELD_IDS) fieldErrors.clear(field as EmployeeField)
  }

  function handleCompanyChange(companyId: string) {
    setValues((current) => ({
      ...current,
      companyId,
      branchId: branches.some((branch) => branch.id === current.branchId && branch.companyId === companyId)
        ? current.branchId
        : "",
      departmentId: departments.some(
        (department) =>
          department.id === current.departmentId &&
          (!department.companyId || department.companyId === companyId)
      )
        ? current.departmentId
        : "",
    }))
    fieldErrors.clear("companyId", "branchId", "departmentId")
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    fieldErrors.setErrors(validate(values))
    if (focusFirstError()) return
    setSaving(true)

    const url = isEdit ? `/api/employees/${employee?.id}` : "/api/employees"
    const method = isEdit ? "PUT" : "POST"

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        // A refusal that names a field of this form shows under it; any other keeps the toast (spec §4.1).
        if (fieldErrors.applyServer(result) && focusFirstError()) return
        throw new Error(result?.error ?? tCommon("error"))
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
        meta={t("subtitle")}
        className="mb-6"
        back={<PageBackLink href={backHref} label={tCommon("back")} />}
      />

      <form onSubmit={handleSubmit} noValidate className={cn(getPanelClasses(), "p-4 sm:p-5")}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("code")} id="employee-code" required error={fieldErrors.message("code")}>
            <Input
              value={values.code}
              onChange={(event) => setField("code", event.target.value)}
              maxLength={20}
              required
            />
          </Field>

          <Field label={t("fullNameTh")} id="employee-full-name-th" required error={fieldErrors.message("fullNameTh")}>
            <Input
              value={values.fullNameTh}
              onChange={(event) => setField("fullNameTh", event.target.value)}
              maxLength={200}
              required
            />
          </Field>

          <Field label={t("fullNameEn")} id="employee-full-name-en" error={fieldErrors.message("fullNameEn")}>
            <Input
              value={values.fullNameEn ?? ""}
              onChange={(event) => setField("fullNameEn", event.target.value)}
              maxLength={200}
            />
          </Field>

          <Field label={t("email")} id="employee-email" error={fieldErrors.message("email")}>
            <Input
              type="email"
              value={values.email ?? ""}
              onChange={(event) => setField("email", event.target.value)}
              maxLength={200}
            />
          </Field>

          <Field label={t("company")} id="employee-company" required error={fieldErrors.message("companyId")}>
            <NativeSelect
              value={values.companyId}
              onChange={(event) => handleCompanyChange(event.target.value)}
              required
            >
              <option value="">{t("selectCompany")}</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.code} - {company.nameTh}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label={t("branch")} id="employee-branch" required error={fieldErrors.message("branchId")}>
            <NativeSelect
              value={values.branchId}
              onChange={(event) => setField("branchId", event.target.value)}
              required
            >
              <option value="">{t("selectBranch")}</option>
              {filteredBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.code} - {branch.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label={t("department")} id="employee-department" required error={fieldErrors.message("departmentId")}>
            <NativeSelect
              value={values.departmentId}
              onChange={(event) => setField("departmentId", event.target.value)}
              required
            >
              <option value="">{t("selectDepartment")}</option>
              {filteredDepartments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.code} - {department.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label={t("position")} id="employee-position" error={fieldErrors.message("position")}>
            <Input
              value={values.position ?? ""}
              onChange={(event) => setField("position", event.target.value)}
              maxLength={200}
            />
          </Field>

          <Field label={t("employmentStatus")} id="employee-employment-status" required error={fieldErrors.message("employmentStatus")}>
            <NativeSelect
              value={values.employmentStatus}
              onChange={(event) =>
                setField("employmentStatus", event.target.value as EmployeeFormValues["employmentStatus"])
              }
              required
            >
              <option value="active">{t("statusActive")}</option>
              <option value="resigned">{t("statusResigned")}</option>
              <option value="suspended">{t("statusSuspended")}</option>
            </NativeSelect>
          </Field>

          <Field label={t("manager")} id="employee-manager" error={fieldErrors.message("managerId")}>
            <NativeSelect
              value={values.managerId ?? ""}
              onChange={(event) => setField("managerId", event.target.value)}
            >
              <option value="">{t("noManager")}</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.code} - {manager.fullNameTh}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <div className="flex flex-col gap-1.5 md:self-end">
            <label className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={values.isActive}
                disabled={activeLockedBySync}
                aria-describedby={activeLockedBySync ? "employee-active-hint" : undefined}
                onChange={(event) => setField("isActive", event.target.checked)}
                className={checkboxVariants()}
              />
              {tCommon("active")}
            </label>
            {activeLockedBySync ? <FieldHint id="employee-active-hint">{t("activeLockedBySyncHint")}</FieldHint> : null}
          </div>
        </div>

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
