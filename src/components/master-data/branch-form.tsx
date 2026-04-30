"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

type BranchFormValues = {
  id?: string
  code: string
  name: string
  companyId: string
  address?: string | null
  contactPerson?: string | null
  isActive: boolean
}

type CompanyOption = {
  id: string
  code: string
  nameTh: string
}

const emptyBranch: BranchFormValues = {
  code: "",
  name: "",
  companyId: "",
  address: "",
  contactPerson: "",
  isActive: true,
}

export function BranchForm({
  branch,
  companies,
}: {
  branch?: BranchFormValues
  companies: CompanyOption[]
}) {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations("branch")
  const tCommon = useTranslations("common")
  const [values, setValues] = useState<BranchFormValues>(branch ?? emptyBranch)
  const [saving, setSaving] = useState(false)

  const isEdit = Boolean(branch?.id)
  const backHref = `/${locale}/master-data/branches`
  const title = useMemo(() => (isEdit ? t("editTitle") : t("createTitle")), [isEdit, t])

  function setField<K extends keyof BranchFormValues>(field: K, value: BranchFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)

    const url = isEdit ? `/api/branches/${branch?.id}` : "/api/branches"
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
              onChange={(event) => setField("code", event.target.value)}
              maxLength={20}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>

          <Field label={t("name")} required>
            <input
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              maxLength={200}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>

          <Field label={t("company")} required>
            <select
              value={values.companyId}
              onChange={(event) => setField("companyId", event.target.value)}
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

          <Field label={t("contactPerson")}>
            <input
              value={values.contactPerson ?? ""}
              onChange={(event) => setField("contactPerson", event.target.value)}
              maxLength={200}
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
            disabled={saving || companies.length === 0}
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
