"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Save } from "lucide-react"
import { toast } from "sonner"
import {
  parseSupplierFormError,
  type SupplierFormErrorCode,
  type SupplierFormErrors,
  type SupplierFormField,
} from "@/lib/supplier-form-errors"
import { Button, buttonVariants } from "@/components/ui/button"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Textarea } from "@/components/ui/textarea"
import { shouldGuardLinkClick } from "@/lib/navigation-guard"
import { useApiError } from "@/components/ui/use-api-error"

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
    if (!isDirty || !shouldGuardLinkClick(event, event.currentTarget)) return
    event.preventDefault()
    const href = event.currentTarget.getAttribute("href")
    if (!href) return
    void confirm({ title: t("unsavedChangesConfirm"), confirmLabel: t("unsavedChangesLeave"), tone: "destructive" }).then((confirmed) => {
      if (confirmed) router.push(href)
    })
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

      <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-surface p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("code")} id="supplier-code" required error={fieldErrors.code ? getErrorMessage(fieldErrors.code) : undefined}>
            <Input
              value={values.code}
              onChange={(event) => setField("code", event.target.value)}
              maxLength={20}
              required
              autoComplete="off"
            />
          </Field>

          <Field label={t("name")} id="supplier-name" required error={fieldErrors.name ? getErrorMessage(fieldErrors.name) : undefined}>
            <Input
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              maxLength={200}
              required
              autoComplete="organization"
            />
          </Field>

          <Field label={t("contactPerson")} id="supplier-contact" error={fieldErrors.contactPerson ? getErrorMessage(fieldErrors.contactPerson) : undefined}>
            <Input
              value={values.contactPerson ?? ""}
              onChange={(event) => setField("contactPerson", event.target.value)}
              maxLength={200}
              autoComplete="name"
            />
          </Field>

          <Field label={t("phone")} id="supplier-phone" error={fieldErrors.phone ? getErrorMessage(fieldErrors.phone) : undefined}>
            <Input
              type="tel"
              inputMode="tel"
              value={values.phone ?? ""}
              onChange={(event) => setField("phone", event.target.value)}
              maxLength={50}
              autoComplete="tel"
            />
          </Field>

          <Field label={t("email")} id="supplier-email" error={fieldErrors.email ? getErrorMessage(fieldErrors.email) : undefined}>
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
            <Field label={t("address")} id="supplier-address" error={fieldErrors.address ? getErrorMessage(fieldErrors.address) : undefined}>
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
