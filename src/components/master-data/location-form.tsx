"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { locationTypes } from "@/lib/validations/location"
import { Button, buttonVariants } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"

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
  backHref: providedBackHref,
}: {
  location?: LocationFormValues
  branches: BranchOption[]
  parentLocations: ParentLocationOption[]
  backHref?: string
}) {
  const locale = useLocale()
  const apiError = useApiError()
  const router = useRouter()
  const t = useTranslations("location")
  const tCommon = useTranslations("common")
  const [values, setValues] = useState<LocationFormValues>(location ?? emptyLocation)
  const [saving, setSaving] = useState(false)

  const isEdit = Boolean(location?.id)
  const backHref = providedBackHref ?? `/${locale}/master-data/locations`
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
      apiError.toast(error)
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

      <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-surface p-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("code")} required>
            <Input
              value={values.code}
              onChange={(event) => setField("code", event.target.value)}
              maxLength={50}
              required
            />
          </Field>

          <Field label={t("name")} required>
            <Input
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              maxLength={200}
              required
            />
          </Field>

          <Field label={t("branch")} required>
            <NativeSelect
              value={values.branchId}
              onChange={(event) => setField("branchId", event.target.value)}
              required
            >
              <option value="">{t("selectBranch")}</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.company.code} / {branch.code} - {branch.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label={t("locationType")} required>
            <NativeSelect
              value={values.locationType}
              onChange={(event) =>
                setField("locationType", event.target.value as LocationFormValues["locationType"])
              }
              required
            >
              {locationTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label={t("parentLocation")}>
            <NativeSelect
              value={values.parentId ?? ""}
              onChange={(event) => setField("parentId", event.target.value)}
            >
              <option value="">{t("noParent")}</option>
              {parentLocations.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.code} - {parent.name}
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

          <div className="md:col-span-2">
            <Field label={t("description")}>
              <Textarea
                value={values.description ?? ""}
                onChange={(event) => setField("description", event.target.value)}
                rows={4}
                maxLength={500}
              />
            </Field>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-border pt-5">
          <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
            {tCommon("cancel")}
          </Link>
          <Button type="submit" busy={saving} disabled={branches.length === 0}>
            <Save aria-hidden="true" />
            {tCommon("save")}
          </Button>
        </div>
      </form>
    </div>
  )
}
