"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { locationTypes } from "@/lib/validations/location"

type LocationFormValues = {
  id?: string
  code: string
  name: string
  branchId: string
  parentId?: string | null
  locationType: (typeof locationTypes)[number]
  description?: string | null
  isActive: boolean
}

type BranchOption = {
  id: string
  code: string
  name: string
  company: {
    code: string
    nameTh: string
  }
}

type ParentLocationOption = {
  id: string
  code: string
  name: string
}

const emptyLocation: LocationFormValues = {
  code: "",
  name: "",
  branchId: "",
  parentId: "",
  locationType: "Room",
  description: "",
  isActive: true,
}

export function LocationForm({
  location,
  branches,
  parentLocations,
}: {
  location?: LocationFormValues
  branches: BranchOption[]
  parentLocations: ParentLocationOption[]
}) {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations("location")
  const tCommon = useTranslations("common")
  const [values, setValues] = useState<LocationFormValues>(location ?? emptyLocation)
  const [saving, setSaving] = useState(false)

  const isEdit = Boolean(location?.id)
  const backHref = `/${locale}/master-data/locations`
  const title = useMemo(() => (isEdit ? t("editTitle") : t("createTitle")), [isEdit, t])

  function setField<K extends keyof LocationFormValues>(field: K, value: LocationFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)

    const url = isEdit ? `/api/locations/${location?.id}` : "/api/locations"
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
              maxLength={50}
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

          <Field label={t("branch")} required>
            <select
              value={values.branchId}
              onChange={(event) => setField("branchId", event.target.value)}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">{t("selectBranch")}</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.company.code} / {branch.code} - {branch.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t("locationType")} required>
            <select
              value={values.locationType}
              onChange={(event) =>
                setField("locationType", event.target.value as LocationFormValues["locationType"])
              }
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              {locationTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t("parentLocation")}>
            <select
              value={values.parentId ?? ""}
              onChange={(event) => setField("parentId", event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">{t("noParent")}</option>
              {parentLocations.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.code} - {parent.name}
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

          <div className="md:col-span-2">
            <Field label={t("description")}>
              <textarea
                value={values.description ?? ""}
                onChange={(event) => setField("description", event.target.value)}
                rows={4}
                maxLength={500}
                className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </Field>
          </div>
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
            disabled={saving || branches.length === 0}
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
