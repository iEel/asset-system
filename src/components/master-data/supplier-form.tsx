"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import {
  parseSupplierFormError,
  type SupplierFormErrorCode,
  type SupplierFormErrors,
  type SupplierFormField,
} from "@/lib/supplier-form-errors"

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

const controlClassName = "min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"

export function SupplierForm({
  supplier,
  backHref: providedBackHref,
}: {
  supplier?: SupplierFormValues
  backHref?: string
}) {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations("supplier")
  const tCommon = useTranslations("common")
  const [initialValues] = useState<SupplierFormValues>(() => supplier ?? emptySupplier)
  const [values, setValues] = useState<SupplierFormValues>(initialValues)
  const [fieldErrors, setFieldErrors] = useState<SupplierFormErrors>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const isEdit = Boolean(supplier?.id)
  const isDirty = !saved && JSON.stringify(values) !== JSON.stringify(initialValues)
  const backHref = providedBackHref ?? `/${locale}/master-data/suppliers`
  const title = useMemo(() => (isEdit ? t("editTitle") : t("createTitle")), [isEdit, t])

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
    setFieldErrors((current) => {
      if (!current[field as SupplierFormField]) return current
      const next = { ...current }
      delete next[field as SupplierFormField]
      return next
    })
  }

  function confirmNavigation(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!isDirty || window.confirm(t("unsavedChangesConfirm"))) return
    event.preventDefault()
  }

  function getErrorMessage(code: SupplierFormErrorCode) {
    if (code === "duplicate_code") return t("duplicateCode")
    if (code === "invalid_email") return t("invalidEmail")
    if (code === "too_long") return t("fieldTooLong")
    return tCommon("required")
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setFieldErrors({})

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
        const parsed = parseSupplierFormError(result)
        const firstFieldError = Object.values(parsed.fieldErrors)[0]

        if (firstFieldError) {
          setFieldErrors(parsed.fieldErrors)
          toast.error(getErrorMessage(firstFieldError))
          return
        }

        throw new Error(parsed.message ?? tCommon("error"))
      }

      setSaved(true)
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
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link
          href={backHref}
          onClick={confirmNavigation}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {tCommon("back")}
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("code")} required error={fieldErrors.code ? getErrorMessage(fieldErrors.code) : undefined} errorId="supplier-code-error">
            <input
              value={values.code}
              onChange={(event) => setField("code", event.target.value)}
              maxLength={20}
              required
              autoComplete="off"
              aria-invalid={Boolean(fieldErrors.code)}
              aria-describedby={fieldErrors.code ? "supplier-code-error" : undefined}
              className={controlClassName}
            />
          </Field>

          <Field label={t("name")} required error={fieldErrors.name ? getErrorMessage(fieldErrors.name) : undefined} errorId="supplier-name-error">
            <input
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              maxLength={200}
              required
              autoComplete="organization"
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "supplier-name-error" : undefined}
              className={controlClassName}
            />
          </Field>

          <Field label={t("contactPerson")} error={fieldErrors.contactPerson ? getErrorMessage(fieldErrors.contactPerson) : undefined} errorId="supplier-contact-error">
            <input
              value={values.contactPerson ?? ""}
              onChange={(event) => setField("contactPerson", event.target.value)}
              maxLength={200}
              autoComplete="name"
              aria-invalid={Boolean(fieldErrors.contactPerson)}
              aria-describedby={fieldErrors.contactPerson ? "supplier-contact-error" : undefined}
              className={controlClassName}
            />
          </Field>

          <Field label={t("phone")} error={fieldErrors.phone ? getErrorMessage(fieldErrors.phone) : undefined} errorId="supplier-phone-error">
            <input
              type="tel"
              inputMode="tel"
              value={values.phone ?? ""}
              onChange={(event) => setField("phone", event.target.value)}
              maxLength={50}
              autoComplete="tel"
              aria-invalid={Boolean(fieldErrors.phone)}
              aria-describedby={fieldErrors.phone ? "supplier-phone-error" : undefined}
              className={controlClassName}
            />
          </Field>

          <Field label={t("email")} error={fieldErrors.email ? getErrorMessage(fieldErrors.email) : undefined} errorId="supplier-email-error">
            <input
              type="email"
              value={values.email ?? ""}
              onChange={(event) => setField("email", event.target.value)}
              maxLength={200}
              autoComplete="email"
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "supplier-email-error" : undefined}
              className={controlClassName}
            />
          </Field>

          <label className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-background px-3 text-sm md:self-end">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(event) => setField("isActive", event.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            {tCommon("active")}
          </label>

          <div className="md:col-span-2">
            <Field label={t("address")} error={fieldErrors.address ? getErrorMessage(fieldErrors.address) : undefined} errorId="supplier-address-error">
              <textarea
                value={values.address ?? ""}
                onChange={(event) => setField("address", event.target.value)}
                maxLength={500}
                rows={4}
                autoComplete="street-address"
                aria-invalid={Boolean(fieldErrors.address)}
                aria-describedby={fieldErrors.address ? "supplier-address-error" : undefined}
                className={`${controlClassName} min-h-28 py-2`}
              />
            </Field>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-5 sm:flex sm:justify-end">
          <Link
            href={backHref}
            onClick={confirmNavigation}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {tCommon("cancel")}
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
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
  error,
  errorId,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  errorId: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
        {required ? <span className="ml-1 text-danger">*</span> : null}
      </span>
      {children}
      {error ? <span id={errorId} role="alert" className="mt-1.5 block text-xs font-medium text-danger">{error}</span> : null}
    </label>
  )
}
