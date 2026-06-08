"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

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
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
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
              onChange={(event) => setField("code", event.target.value.toUpperCase())}
              maxLength={20}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">{t("codeHelp")}</p>
          </Field>

          <Field label={t("assetTagCode")}>
            <input
              value={values.assetTagCode ?? ""}
              onChange={(event) => setField("assetTagCode", event.target.value.toUpperCase())}
              maxLength={20}
              placeholder={values.code || t("code")}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">{t("assetTagCodeHelp")}</p>
          </Field>

          <Field label={t("nameTh")} required>
            <input
              value={values.nameTh}
              onChange={(event) => setField("nameTh", event.target.value)}
              maxLength={200}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>

          <Field label={t("nameEn")}>
            <input
              value={values.nameEn ?? ""}
              onChange={(event) => setField("nameEn", event.target.value)}
              maxLength={200}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>

          <Field label={t("taxId")}>
            <input
              value={values.taxId ?? ""}
              onChange={(event) => setField("taxId", event.target.value)}
              maxLength={20}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>

          <div className="md:col-span-2">
            <Field label={t("address")}>
              <textarea
                value={values.address ?? ""}
                onChange={(event) => setField("address", event.target.value)}
                rows={4}
                maxLength={500}
                className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </Field>
          </div>

          <label className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm">
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
