"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Save } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { locationTypes } from "@/lib/validations/location"
import { Button, buttonVariants } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { getPanelClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"
import { maxLength, required } from "@/lib/validation-rules"

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

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1).
const FIELD_IDS = {
  code: "location-code",
  name: "location-name",
  branchId: "location-branch",
  locationType: "location-type",
  parentId: "location-parent",
  description: "location-description",
} as const
type LocationField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as LocationField[]

// noValidate turns the browser's check off, so this restates the controls' required and maxLength (v-track M-R2).
function validate(values: LocationFormValues): Partial<Record<LocationField, string>> {
  const errors: Partial<Record<LocationField, string>> = {}
  const check = (key: LocationField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("code", required(values.code) ?? maxLength(values.code, 50))
  check("name", required(values.name) ?? maxLength(values.name, 200))
  check("branchId", required(values.branchId))
  check("locationType", required(values.locationType))
  check("description", maxLength(values.description, 500))
  return errors
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
  const fieldErrors = useFieldErrors<LocationField>()

  const isEdit = Boolean(location?.id)
  const backHref = providedBackHref ?? `/${locale}/master-data/locations`
  const title = useMemo(() => (isEdit ? t("editTitle") : t("createTitle")), [isEdit, t])

  const needsBranch = branches.length === 0
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })

  function setField<K extends keyof LocationFormValues>(field: K, value: LocationFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    if (field in FIELD_IDS) fieldErrors.clear(field as LocationField)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (needsBranch) return
    fieldErrors.setErrors(validate(values))
    if (focusFirstError()) return
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
          <Field label={t("code")} id="location-code" required error={fieldErrors.message("code")}>
            <Input
              value={values.code}
              onChange={(event) => setField("code", event.target.value)}
              maxLength={50}
              required
            />
          </Field>

          <Field label={t("name")} id="location-name" required error={fieldErrors.message("name")}>
            <Input
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              maxLength={200}
              required
            />
          </Field>

          <Field label={t("branch")} id="location-branch" required error={fieldErrors.message("branchId")}>
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

          <Field label={t("locationType")} id="location-type" required error={fieldErrors.message("locationType")}>
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

          <Field label={t("parentLocation")} id="location-parent" error={fieldErrors.message("parentId")}>
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
            <Field label={t("description")} id="location-description" error={fieldErrors.message("description")}>
              <Textarea
                value={values.description ?? ""}
                onChange={(event) => setField("description", event.target.value)}
                rows={4}
                maxLength={500}
              />
            </Field>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-border pt-5">
          {needsBranch ? <p id="location-save-reason" className="basis-full text-meta text-muted-foreground sm:mr-auto sm:basis-auto sm:self-center">{t("saveNeedsBranch")}</p> : null}
          <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
            {tCommon("cancel")}
          </Link>
          <Button type="submit" busy={saving} aria-disabled={needsBranch || undefined} aria-describedby={needsBranch ? "location-save-reason" : undefined}>
            <Save aria-hidden="true" />
            {tCommon("save")}
          </Button>
        </div>
      </form>
    </div>
  )
}
