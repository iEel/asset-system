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
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { getPanelClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"
import { maxLength, required } from "@/lib/validation-rules"

type DepartmentFormValues = {
  id?: string
  code: string
  name: string
  companyId?: string | null
  isActive: boolean
}

type CompanyOption = {
  id: string
  code: string
  nameTh: string
}

const emptyDepartment: DepartmentFormValues = {
  code: "",
  name: "",
  companyId: "",
  isActive: true,
}

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1).
const FIELD_IDS = {
  code: "department-code",
  name: "department-name",
} as const
type DepartmentField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as DepartmentField[]

// noValidate turns the browser's check off, so this restates the controls' required and maxLength (v-track M-R2).
function validate(values: DepartmentFormValues): Partial<Record<DepartmentField, string>> {
  const errors: Partial<Record<DepartmentField, string>> = {}
  const check = (key: DepartmentField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("code", required(values.code) ?? maxLength(values.code, 20))
  check("name", required(values.name) ?? maxLength(values.name, 200))
  return errors
}

export function DepartmentForm({
  department,
  companies,
  backHref: providedBackHref,
}: {
  department?: DepartmentFormValues
  companies: CompanyOption[]
  backHref?: string
}) {
  const locale = useLocale()
  const apiError = useApiError()
  const router = useRouter()
  const t = useTranslations("department")
  const tCommon = useTranslations("common")
  const [values, setValues] = useState<DepartmentFormValues>(department ?? emptyDepartment)
  const [saving, setSaving] = useState(false)
  const fieldErrors = useFieldErrors<DepartmentField>()

  const isEdit = Boolean(department?.id)
  const backHref = providedBackHref ?? `/${locale}/master-data/departments`
  const title = useMemo(() => (isEdit ? t("editTitle") : t("createTitle")), [isEdit, t])

  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })

  function setField<K extends keyof DepartmentFormValues>(field: K, value: DepartmentFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    if (field in FIELD_IDS) fieldErrors.clear(field as DepartmentField)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    fieldErrors.setErrors(validate(values))
    if (focusFirstError()) return
    setSaving(true)

    const url = isEdit ? `/api/departments/${department?.id}` : "/api/departments"
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
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={title}
        meta={t("subtitle")}
        className="mb-6"
        back={<PageBackLink href={backHref} label={tCommon("back")} />}
      />

      <form onSubmit={handleSubmit} noValidate className={cn(getPanelClasses(), "p-4 sm:p-5")}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("code")} id="department-code" required error={fieldErrors.message("code")}>
            <Input
              value={values.code}
              onChange={(event) => setField("code", event.target.value)}
              maxLength={20}
              required
            />
          </Field>

          <Field label={t("name")} id="department-name" required error={fieldErrors.message("name")}>
            <Input
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              maxLength={200}
              required
            />
          </Field>

          <Field label={t("company")}>
            <NativeSelect
              value={values.companyId ?? ""}
              onChange={(event) => setField("companyId", event.target.value)}
            >
              <option value="">{t("sharedDepartment")}</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.code} - {company.nameTh}
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
