"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

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

export function EmployeeForm({
  employee,
  companies,
  branches,
  departments,
  managers,
}: {
  employee?: EmployeeFormValues
  companies: CompanyOption[]
  branches: BranchOption[]
  departments: DepartmentOption[]
  managers: ManagerOption[]
}) {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations("employee")
  const tCommon = useTranslations("common")
  const [values, setValues] = useState<EmployeeFormValues>(employee ?? emptyEmployee)
  const [saving, setSaving] = useState(false)

  const isEdit = Boolean(employee?.id)
  const backHref = `/${locale}/master-data/employees`
  const title = useMemo(() => (isEdit ? t("editTitle") : t("createTitle")), [isEdit, t])
  const filteredBranches = branches.filter((branch) => branch.companyId === values.companyId)
  const filteredDepartments = departments.filter(
    (department) => !department.companyId || department.companyId === values.companyId
  )

  function setField<K extends keyof EmployeeFormValues>(field: K, value: EmployeeFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
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
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
        throw new Error(result?.error ?? tCommon("error"))
      }

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
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
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
          <Field label={t("code")} required>
            <input
              value={values.code}
              onChange={(event) => setField("code", event.target.value)}
              maxLength={20}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>

          <Field label={t("fullNameTh")} required>
            <input
              value={values.fullNameTh}
              onChange={(event) => setField("fullNameTh", event.target.value)}
              maxLength={200}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>

          <Field label={t("fullNameEn")}>
            <input
              value={values.fullNameEn ?? ""}
              onChange={(event) => setField("fullNameEn", event.target.value)}
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

          <Field label={t("company")} required>
            <select
              value={values.companyId}
              onChange={(event) => handleCompanyChange(event.target.value)}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">{t("selectCompany")}</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.code} - {company.nameTh}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t("branch")} required>
            <select
              value={values.branchId}
              onChange={(event) => setField("branchId", event.target.value)}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">{t("selectBranch")}</option>
              {filteredBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.code} - {branch.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t("department")} required>
            <select
              value={values.departmentId}
              onChange={(event) => setField("departmentId", event.target.value)}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">{t("selectDepartment")}</option>
              {filteredDepartments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.code} - {department.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t("position")}>
            <input
              value={values.position ?? ""}
              onChange={(event) => setField("position", event.target.value)}
              maxLength={200}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>

          <Field label={t("employmentStatus")} required>
            <select
              value={values.employmentStatus}
              onChange={(event) =>
                setField("employmentStatus", event.target.value as EmployeeFormValues["employmentStatus"])
              }
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="active">{t("statusActive")}</option>
              <option value="resigned">{t("statusResigned")}</option>
              <option value="suspended">{t("statusSuspended")}</option>
            </select>
          </Field>

          <Field label={t("manager")}>
            <select
              value={values.managerId ?? ""}
              onChange={(event) => setField("managerId", event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">{t("noManager")}</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.code} - {manager.fullNameTh}
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

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
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
