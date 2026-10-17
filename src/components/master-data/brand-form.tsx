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
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { getPanelClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"
import { maxLength, required } from "@/lib/validation-rules"

type BrandFormValues = {
  id?: string
  name: string
  isActive: boolean
}

const emptyBrand: BrandFormValues = {
  name: "",
  isActive: true,
}

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1).
const FIELD_IDS = {
  name: "brand-name",
} as const
type BrandField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as BrandField[]

// noValidate turns the browser's check off, so this restates the controls' required and maxLength (v-track M-R2).
function validate(values: BrandFormValues): Partial<Record<BrandField, string>> {
  const errors: Partial<Record<BrandField, string>> = {}
  const check = (key: BrandField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("name", required(values.name) ?? maxLength(values.name, 200))
  return errors
}

export function BrandForm({
  brand,
  backHref: providedBackHref,
}: {
  brand?: BrandFormValues
  backHref?: string
}) {
  const locale = useLocale()
  const apiError = useApiError()
  const router = useRouter()
  const t = useTranslations("brandModel")
  const tCommon = useTranslations("common")
  const [values, setValues] = useState<BrandFormValues>(brand ?? emptyBrand)
  const [saving, setSaving] = useState(false)
  const fieldErrors = useFieldErrors<BrandField>()

  const isEdit = Boolean(brand?.id)
  const backHref = providedBackHref ?? `/${locale}/master-data/brands`
  const title = useMemo(() => (isEdit ? t("editBrandTitle") : t("createBrandTitle")), [isEdit, t])
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })

  function setField<K extends keyof BrandFormValues>(field: K, value: BrandFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    if (field in FIELD_IDS) fieldErrors.clear(field as BrandField)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    fieldErrors.setErrors(validate(values))
    if (focusFirstError()) return
    setSaving(true)

    const url = isEdit ? `/api/brands/${brand?.id}` : "/api/brands"
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
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={title}
        meta={t("subtitle")}
        className="mb-6"
        back={<PageBackLink href={backHref} label={tCommon("back")} />}
      />

      <form onSubmit={handleSubmit} noValidate className={cn(getPanelClasses(), "p-4 sm:p-5")}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("brandName")} id="brand-name" required error={fieldErrors.message("name")}>
            <Input
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              maxLength={200}
              required
            />
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
