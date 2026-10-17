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
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { getPanelClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"
import { maxLength, required } from "@/lib/validation-rules"

type CompanyFormValues = {
  id?: string
  code: string
  assetTagCode?: string | null
  nameTh: string
  nameEn?: string | null
  taxId?: string | null
  address?: string | null
  isActive: boolean
}

const emptyCompany: CompanyFormValues = {
  code: "",
  assetTagCode: "",
  nameTh: "",
  nameEn: "",
  taxId: "",
  address: "",
  isActive: true,
}

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1).
const FIELD_IDS = {
  code: "company-code",
  assetTagCode: "company-asset-tag-code",
  nameTh: "company-name-th",
  nameEn: "company-name-en",
  taxId: "company-tax-id",
  address: "company-address",
} as const
type CompanyField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as CompanyField[]

// noValidate turns the browser's check off, so this restates the controls' required and maxLength (v-track M-R2).
function validate(values: CompanyFormValues): Partial<Record<CompanyField, string>> {
  const errors: Partial<Record<CompanyField, string>> = {}
  const check = (key: CompanyField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("code", required(values.code) ?? maxLength(values.code, 20))
  check("assetTagCode", maxLength(values.assetTagCode, 20))
  check("nameTh", required(values.nameTh) ?? maxLength(values.nameTh, 200))
  check("nameEn", maxLength(values.nameEn, 200))
  check("taxId", maxLength(values.taxId, 20))
  check("address", maxLength(values.address, 500))
  return errors
}

export function CompanyForm({
  company,
  backHref: providedBackHref,
}: {
  company?: CompanyFormValues
  backHref?: string
}) {
  const locale = useLocale()
  const apiError = useApiError()
  const router = useRouter()
  const t = useTranslations("company")
  const tCommon = useTranslations("common")
  const [values, setValues] = useState<CompanyFormValues>(company ?? emptyCompany)
  const [saving, setSaving] = useState(false)
  const fieldErrors = useFieldErrors<CompanyField>()

  const isEdit = Boolean(company?.id)
  const backHref = providedBackHref ?? `/${locale}/master-data/companies`
  const title = useMemo(() => (isEdit ? t("editTitle") : t("createTitle")), [isEdit, t])

  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })

  function setField<K extends keyof CompanyFormValues>(field: K, value: CompanyFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    if (field in FIELD_IDS) fieldErrors.clear(field as CompanyField)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    fieldErrors.setErrors(validate(values))
    if (focusFirstError()) return
    setSaving(true)

    const url = isEdit ? `/api/companies/${company?.id}` : "/api/companies"
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
          <Field label={t("code")} id="company-code" required hint={t("codeHelp")} error={fieldErrors.message("code")}>
            <Input
              value={values.code}
              onChange={(event) => setField("code", event.target.value.toUpperCase())}
              maxLength={20}
              required
            />
          </Field>

          <Field label={t("assetTagCode")} id="company-asset-tag-code" hint={t("assetTagCodeHelp")} error={fieldErrors.message("assetTagCode")}>
            <Input
              value={values.assetTagCode ?? ""}
              onChange={(event) => setField("assetTagCode", event.target.value.toUpperCase())}
              maxLength={20}
              placeholder={values.code || t("code")}
            />
          </Field>

          <Field label={t("nameTh")} id="company-name-th" required error={fieldErrors.message("nameTh")}>
            <Input
              value={values.nameTh}
              onChange={(event) => setField("nameTh", event.target.value)}
              maxLength={200}
              required
            />
          </Field>

          <Field label={t("nameEn")} id="company-name-en" error={fieldErrors.message("nameEn")}>
            <Input
              value={values.nameEn ?? ""}
              onChange={(event) => setField("nameEn", event.target.value)}
              maxLength={200}
            />
          </Field>

          <Field label={t("taxId")} id="company-tax-id" error={fieldErrors.message("taxId")}>
            <Input
              value={values.taxId ?? ""}
              onChange={(event) => setField("taxId", event.target.value)}
              maxLength={20}
            />
          </Field>

          <div className="md:col-span-2">
            <Field label={t("address")} id="company-address" error={fieldErrors.message("address")}>
              <Textarea
                value={values.address ?? ""}
                onChange={(event) => setField("address", event.target.value)}
                rows={4}
                maxLength={500}
              />
            </Field>
          </div>

          <label className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm">
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
