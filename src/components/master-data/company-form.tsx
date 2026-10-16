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
import { getPanelClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"

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

  const isEdit = Boolean(company?.id)
  const backHref = providedBackHref ?? `/${locale}/master-data/companies`
  const title = useMemo(() => (isEdit ? t("editTitle") : t("createTitle")), [isEdit, t])

  function setField<K extends keyof CompanyFormValues>(field: K, value: CompanyFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
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

      <form onSubmit={handleSubmit} className={cn(getPanelClasses(), "p-4 sm:p-5")}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("code")} required hint={t("codeHelp")}>
            <Input
              value={values.code}
              onChange={(event) => setField("code", event.target.value.toUpperCase())}
              maxLength={20}
              required
            />
          </Field>

          <Field label={t("assetTagCode")} hint={t("assetTagCodeHelp")}>
            <Input
              value={values.assetTagCode ?? ""}
              onChange={(event) => setField("assetTagCode", event.target.value.toUpperCase())}
              maxLength={20}
              placeholder={values.code || t("code")}
            />
          </Field>

          <Field label={t("nameTh")} required>
            <Input
              value={values.nameTh}
              onChange={(event) => setField("nameTh", event.target.value)}
              maxLength={200}
              required
            />
          </Field>

          <Field label={t("nameEn")}>
            <Input
              value={values.nameEn ?? ""}
              onChange={(event) => setField("nameEn", event.target.value)}
              maxLength={200}
            />
          </Field>

          <Field label={t("taxId")}>
            <Input
              value={values.taxId ?? ""}
              onChange={(event) => setField("taxId", event.target.value)}
              maxLength={20}
            />
          </Field>

          <div className="md:col-span-2">
            <Field label={t("address")}>
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
