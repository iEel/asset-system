"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Textarea } from "@/components/ui/textarea"
import { shouldGuardLinkClick } from "@/lib/navigation-guard"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { getPanelClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"
import { email, maxLength, required } from "@/lib/validation-rules"

type SupplierFormValues = {
  id?: string
  code: string
  name: string
  contactPerson?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  isActive: boolean
}

const emptySupplier: SupplierFormValues = {
  code: "",
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  isActive: true,
}

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1).
const FIELD_IDS = {
  code: "supplier-code",
  name: "supplier-name",
  contactPerson: "supplier-contact",
  phone: "supplier-phone",
  email: "supplier-email",
  address: "supplier-address",
} as const
type SupplierField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as SupplierField[]

// noValidate turns the browser's check off, so this restates the controls' required, maxLength and type="email" (v-track M-R2).
function validate(values: SupplierFormValues): Partial<Record<SupplierField, string>> {
  const errors: Partial<Record<SupplierField, string>> = {}
  const check = (key: SupplierField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("code", required(values.code) ?? maxLength(values.code, 20))
  check("name", required(values.name) ?? maxLength(values.name, 200))
  check("contactPerson", maxLength(values.contactPerson, 200))
  check("phone", maxLength(values.phone, 50))
  check("email", email(values.email) ?? maxLength(values.email, 200))
  check("address", maxLength(values.address, 500))
  return errors
}

export function SupplierForm({
  supplier,
  backHref: providedBackHref,
}: {
  supplier?: SupplierFormValues
  backHref?: string
}) {
  const locale = useLocale()
  const apiError = useApiError()
  const router = useRouter()
  const confirm = useConfirm()
  const t = useTranslations("supplier")
  const tCommon = useTranslations("common")
  const [initialValues] = useState<SupplierFormValues>(() => supplier ?? emptySupplier)
  const [values, setValues] = useState<SupplierFormValues>(initialValues)
  const fieldErrors = useFieldErrors<SupplierField>()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const isEdit = Boolean(supplier?.id)
  const isDirty = !saved && JSON.stringify(values) !== JSON.stringify(initialValues)
  const backHref = providedBackHref ?? `/${locale}/master-data/suppliers`
  const title = useMemo(() => (isEdit ? t("editTitle") : t("createTitle")), [isEdit, t])
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })

  useEffect(() => {
    if (!isDirty) return

    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", warnBeforeUnload)
    return () => window.removeEventListener("beforeunload", warnBeforeUnload)
  }, [isDirty])

  function setField<K extends keyof SupplierFormValues>(field: K, value: SupplierFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    if (field in FIELD_IDS) fieldErrors.clear(field as SupplierField)
  }

  function confirmNavigation(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!isDirty || !shouldGuardLinkClick(event, event.currentTarget)) return
    event.preventDefault()
    const href = event.currentTarget.getAttribute("href")
    if (!href) return
    void confirm({ title: t("unsavedChangesConfirm"), confirmLabel: t("unsavedChangesLeave"), tone: "destructive" }).then((confirmed) => {
      if (confirmed) router.push(href)
    })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    fieldErrors.setErrors(validate(values))
    if (focusFirstError()) return
    setSaving(true)

    const url = isEdit ? `/api/suppliers/${supplier?.id}` : "/api/suppliers"
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

      setSaved(true)
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
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={title}
        meta={t("subtitle")}
        className="mb-6"
        back={<PageBackLink href={backHref} onClick={confirmNavigation} label={tCommon("back")} />}
      />

      <form onSubmit={handleSubmit} noValidate className={cn(getPanelClasses(), "p-4 sm:p-5")}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("code")} id="supplier-code" required error={fieldErrors.message("code")}>
            <Input
              value={values.code}
              onChange={(event) => setField("code", event.target.value)}
              maxLength={20}
              required
              autoComplete="off"
            />
          </Field>

          <Field label={t("name")} id="supplier-name" required error={fieldErrors.message("name")}>
            <Input
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              maxLength={200}
              required
              autoComplete="organization"
            />
          </Field>

          <Field label={t("contactPerson")} id="supplier-contact" error={fieldErrors.message("contactPerson")}>
            <Input
              value={values.contactPerson ?? ""}
              onChange={(event) => setField("contactPerson", event.target.value)}
              maxLength={200}
              autoComplete="name"
            />
          </Field>

          <Field label={t("phone")} id="supplier-phone" error={fieldErrors.message("phone")}>
            <Input
              type="tel"
              inputMode="tel"
              value={values.phone ?? ""}
              onChange={(event) => setField("phone", event.target.value)}
              maxLength={50}
              autoComplete="tel"
            />
          </Field>

          <Field label={t("email")} id="supplier-email" error={fieldErrors.message("email")}>
            <Input
              type="email"
              value={values.email ?? ""}
              onChange={(event) => setField("email", event.target.value)}
              maxLength={200}
              autoComplete="email"
            />
          </Field>

          <label className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-background px-3 text-sm md:self-end">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(event) => setField("isActive", event.target.checked)}
              className={checkboxVariants()}
            />
            {tCommon("active")}
          </label>

          <div className="md:col-span-2">
            <Field label={t("address")} id="supplier-address" error={fieldErrors.message("address")}>
              <Textarea
                value={values.address ?? ""}
                onChange={(event) => setField("address", event.target.value)}
                maxLength={500}
                rows={4}
                autoComplete="street-address"
                className="min-h-28"
              />
            </Field>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-5 sm:flex sm:justify-end">
          <Link href={backHref} onClick={confirmNavigation} className={buttonVariants({ variant: "outline" })}>
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
