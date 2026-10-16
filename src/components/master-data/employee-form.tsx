"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Save } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { useApiError } from "@/components/ui/use-api-error"
import { getPanelClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"

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
  backHref: providedBackHref,
}: {
  employee?: EmployeeFormValues
  companies: CompanyOption[]
  branches: BranchOption[]
  departments: DepartmentOption[]
  managers: ManagerOption[]
  backHref?: string
}) {
  const locale = useLocale()
  const apiError = useApiError()
  const router = useRouter()
  const t = useTranslations("employee")
  const tCommon = useTranslations("common")
  const [values, setValues] = useState<EmployeeFormValues>(employee ?? emptyEmployee)
  const [saving, setSaving] = useState(false)

  const isEdit = Boolean(employee?.id)
  const backHref = providedBackHref ?? `/${locale}/master-data/employees`
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

      <form onSubmit={handleSubmit} className={cn(getPanelClasses(), "p-4 sm:p-5")}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("code")} required>
            <Input
              value={values.code}
              onChange={(event) => setField("code", event.target.value)}
              maxLength={20}
              required
            />
          </Field>

          <Field label={t("fullNameTh")} required>
            <Input
              value={values.fullNameTh}
              onChange={(event) => setField("fullNameTh", event.target.value)}
              maxLength={200}
              required
            />
          </Field>

          <Field label={t("fullNameEn")}>
            <Input
              value={values.fullNameEn ?? ""}
              onChange={(event) => setField("fullNameEn", event.target.value)}
              maxLength={200}
            />
          </Field>

          <Field label={t("email")}>
            <Input
              type="email"
              value={values.email ?? ""}
              onChange={(event) => setField("email", event.target.value)}
              maxLength={200}
            />
          </Field>

          <Field label={t("company")} required>
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

          <Field label={t("branch")} required>
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

          <Field label={t("department")} required>
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

          <Field label={t("position")}>
            <Input
              value={values.position ?? ""}
              onChange={(event) => setField("position", event.target.value)}
              maxLength={200}
            />
          </Field>

          <Field label={t("employmentStatus")} required>
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

          <Field label={t("manager")}>
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
