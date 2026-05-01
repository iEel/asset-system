"use client"

import { useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

type Option = {
  id: string
  label: string
  companyId?: string | null
  branchId?: string | null
  categoryId?: string | null
  brandId?: string | null
}

type AssetFormValues = {
  id?: string
  assetTag?: string | null
  name: string
  categoryId: string
  brandId?: string | null
  modelId?: string | null
  serialNumber?: string | null
  companyId: string
  branchId: string
  departmentId?: string | null
  custodianId?: string | null
  homeLocationId?: string | null
  currentLocationId: string
  statusId: string
  conditionId: string
  purchaseDate?: string | null
  purchasePrice?: string | null
  supplierId?: string | null
  warrantyStartDate?: string | null
  warrantyEndDate?: string | null
  fixedAssetCode?: string | null
  poNumber?: string | null
  invoiceNumber?: string | null
  remark?: string | null
  customFieldsJson?: string | null
  isActive: boolean
}

const emptyAsset: AssetFormValues = {
  assetTag: "",
  name: "",
  categoryId: "",
  brandId: "",
  modelId: "",
  serialNumber: "",
  companyId: "",
  branchId: "",
  departmentId: "",
  custodianId: "",
  homeLocationId: "",
  currentLocationId: "",
  statusId: "",
  conditionId: "",
  purchaseDate: "",
  purchasePrice: "",
  supplierId: "",
  warrantyStartDate: "",
  warrantyEndDate: "",
  fixedAssetCode: "",
  poNumber: "",
  invoiceNumber: "",
  remark: "",
  customFieldsJson: "",
  isActive: true,
}

export function AssetForm({
  asset,
  companies,
  branches,
  departments,
  employees,
  locations,
  categories,
  brands,
  models,
  statuses,
  conditions,
  suppliers,
}: {
  asset?: AssetFormValues
  companies: Option[]
  branches: Option[]
  departments: Option[]
  employees: Option[]
  locations: Option[]
  categories: Option[]
  brands: Option[]
  models: Option[]
  statuses: Option[]
  conditions: Option[]
  suppliers: Option[]
}) {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")
  const [values, setValues] = useState<AssetFormValues>(asset ?? emptyAsset)
  const [saving, setSaving] = useState(false)
  const [duplicateState, setDuplicateState] = useState<{
    checking: boolean
    assetTagExists: boolean
    serialNumberExists: boolean
  }>({ checking: false, assetTagExists: false, serialNumberExists: false })

  const isEdit = Boolean(asset?.id)
  const backHref = `/${locale}/assets`
  const title = useMemo(() => (isEdit ? t("editTitle") : t("createTitle")), [isEdit, t])

  const filteredBranches = branches.filter((branch) => branch.companyId === values.companyId)
  const filteredDepartments = departments.filter(
    (department) => !department.companyId || department.companyId === values.companyId
  )
  const filteredEmployees = employees.filter(
    (employee) =>
      (!values.companyId || employee.companyId === values.companyId) &&
      (!values.branchId || employee.branchId === values.branchId)
  )
  const filteredLocations = locations.filter((location) => location.branchId === values.branchId)
  const filteredModels = models.filter(
    (model) =>
      (!values.categoryId || model.categoryId === values.categoryId) &&
      (!values.brandId || model.brandId === values.brandId)
  )

  useEffect(() => {
    const assetTag = values.assetTag?.trim() ?? ""
    const serialNumber = values.serialNumber?.trim() ?? ""
    if (!assetTag && !serialNumber) {
      const resetTimeout = window.setTimeout(() => {
        setDuplicateState({ checking: false, assetTagExists: false, serialNumberExists: false })
      }, 0)
      return () => window.clearTimeout(resetTimeout)
    }

    if (!assetTag && duplicateState.assetTagExists) {
      const resetTimeout = window.setTimeout(() => {
        setDuplicateState((current) => ({ ...current, assetTagExists: false }))
      }, 0)
      return () => window.clearTimeout(resetTimeout)
    }
    if (!serialNumber && duplicateState.serialNumberExists) {
      const resetTimeout = window.setTimeout(() => {
        setDuplicateState((current) => ({ ...current, serialNumberExists: false }))
      }, 0)
      return () => window.clearTimeout(resetTimeout)
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setDuplicateState((current) => ({ ...current, checking: true }))
      const params = new URLSearchParams()
      if (assetTag) params.set("assetTag", assetTag)
      if (serialNumber) params.set("serialNumber", serialNumber)
      if (asset?.id) params.set("excludeId", asset.id)

      try {
        const response = await fetch(`/api/assets/duplicates?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error("Duplicate check failed")
        const result = await response.json()
        setDuplicateState({
          checking: false,
          assetTagExists: Boolean(result.assetTagExists),
          serialNumberExists: Boolean(result.serialNumberExists),
        })
      } catch {
        if (!controller.signal.aborted) {
          setDuplicateState((current) => ({ ...current, checking: false }))
        }
      }
    }, 450)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [asset?.id, duplicateState.assetTagExists, duplicateState.serialNumberExists, values.assetTag, values.serialNumber])

  function setField<K extends keyof AssetFormValues>(field: K, value: AssetFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function handleCompanyChange(companyId: string) {
    setValues((current) => ({
      ...current,
      companyId,
      branchId: "",
      departmentId: "",
      custodianId: "",
      homeLocationId: "",
      currentLocationId: "",
    }))
  }

  function handleBranchChange(branchId: string) {
    setValues((current) => ({
      ...current,
      branchId,
      custodianId: "",
      homeLocationId: "",
      currentLocationId: "",
    }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (duplicateState.assetTagExists || duplicateState.serialNumberExists) {
      toast.error(t("duplicateWarning"))
      return
    }
    setSaving(true)

    const url = isEdit ? `/api/assets/${asset?.id}` : "/api/assets"
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
    <div className="mx-auto max-w-6xl">
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

      <form onSubmit={handleSubmit} className="space-y-5">
        <Section title={t("basicInfo")}>
          <Field label={t("assetTag")}>
            <input
              value={values.assetTag ?? ""}
              onChange={(event) => setField("assetTag", event.target.value)}
              maxLength={50}
              placeholder={t("autoTagHint")}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            {duplicateState.assetTagExists && (
              <p className="mt-1.5 text-xs font-medium text-danger">{t("duplicateAssetTag")}</p>
            )}
          </Field>
          <Field label={t("assetName")} required>
            <input
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              maxLength={200}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>
          <SelectField label={t("category")} value={values.categoryId} required onChange={(value) => setField("categoryId", value)}>
            <option value="">{t("selectCategory")}</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
          </SelectField>
          <SelectField label={t("brand")} value={values.brandId ?? ""} onChange={(value) => setField("brandId", value)}>
            <option value="">{t("selectBrand")}</option>
            {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.label}</option>)}
          </SelectField>
          <SelectField label={t("model")} value={values.modelId ?? ""} onChange={(value) => setField("modelId", value)}>
            <option value="">{t("selectModel")}</option>
            {filteredModels.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
          </SelectField>
          <Field label={t("serialNumber")}>
            <input
              value={values.serialNumber ?? ""}
              onChange={(event) => setField("serialNumber", event.target.value)}
              maxLength={100}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            {duplicateState.serialNumberExists && (
              <p className="mt-1.5 text-xs font-medium text-danger">{t("duplicateSerialNumber")}</p>
            )}
          </Field>
        </Section>

        <Section title={t("ownership")}>
          <SelectField label={t("company")} value={values.companyId} required onChange={handleCompanyChange}>
            <option value="">{t("selectCompany")}</option>
            {companies.map((company) => <option key={company.id} value={company.id}>{company.label}</option>)}
          </SelectField>
          <SelectField label={t("branch")} value={values.branchId} required onChange={handleBranchChange}>
            <option value="">{t("selectBranch")}</option>
            {filteredBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.label}</option>)}
          </SelectField>
          <SelectField label={t("department")} value={values.departmentId ?? ""} onChange={(value) => setField("departmentId", value)}>
            <option value="">{t("selectDepartment")}</option>
            {filteredDepartments.map((department) => <option key={department.id} value={department.id}>{department.label}</option>)}
          </SelectField>
          <SelectField label={t("custodian")} value={values.custodianId ?? ""} onChange={(value) => setField("custodianId", value)}>
            <option value="">{t("selectCustodian")}</option>
            {filteredEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.label}</option>)}
          </SelectField>
        </Section>

        <Section title={t("locationCustodian")}>
          <SelectField label={t("homeLocation")} value={values.homeLocationId ?? ""} onChange={(value) => setField("homeLocationId", value)}>
            <option value="">{t("selectLocation")}</option>
            {filteredLocations.map((location) => <option key={location.id} value={location.id}>{location.label}</option>)}
          </SelectField>
          <SelectField label={t("currentLocation")} value={values.currentLocationId} required onChange={(value) => setField("currentLocationId", value)}>
            <option value="">{t("selectLocation")}</option>
            {filteredLocations.map((location) => <option key={location.id} value={location.id}>{location.label}</option>)}
          </SelectField>
          <SelectField label={t("status")} value={values.statusId} required onChange={(value) => setField("statusId", value)}>
            <option value="">{t("selectStatus")}</option>
            {statuses.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
          </SelectField>
          <SelectField label={t("condition")} value={values.conditionId} required onChange={(value) => setField("conditionId", value)}>
            <option value="">{t("selectCondition")}</option>
            {conditions.map((condition) => <option key={condition.id} value={condition.id}>{condition.label}</option>)}
          </SelectField>
        </Section>

        <Section title={t("purchaseWarranty")}>
          <Field label={t("purchaseDate")}>
            <input type="date" value={values.purchaseDate ?? ""} onChange={(event) => setField("purchaseDate", event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </Field>
          <Field label={t("purchasePrice")}>
            <input type="number" min="0" step="0.01" value={values.purchasePrice ?? ""} onChange={(event) => setField("purchasePrice", event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </Field>
          <SelectField label={t("supplier")} value={values.supplierId ?? ""} onChange={(value) => setField("supplierId", value)}>
            <option value="">{t("selectSupplier")}</option>
            {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.label}</option>)}
          </SelectField>
          <Field label={t("warrantyStart")}>
            <input type="date" value={values.warrantyStartDate ?? ""} onChange={(event) => setField("warrantyStartDate", event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </Field>
          <Field label={t("warrantyEnd")}>
            <input type="date" value={values.warrantyEndDate ?? ""} onChange={(event) => setField("warrantyEndDate", event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </Field>
          <Field label={t("fixedAssetCode")}>
            <input value={values.fixedAssetCode ?? ""} onChange={(event) => setField("fixedAssetCode", event.target.value)} maxLength={50} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </Field>
          <Field label={t("poNumber")}>
            <input value={values.poNumber ?? ""} onChange={(event) => setField("poNumber", event.target.value)} maxLength={50} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </Field>
          <Field label={t("invoiceNumber")}>
            <input value={values.invoiceNumber ?? ""} onChange={(event) => setField("invoiceNumber", event.target.value)} maxLength={50} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </Field>
        </Section>

        <Section title={t("customFields")}>
          <div className="md:col-span-2">
            <Field label={t("remark")}>
              <textarea value={values.remark ?? ""} onChange={(event) => setField("remark", event.target.value)} rows={4} className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label={t("customFieldsJson")}>
              <textarea value={values.customFieldsJson ?? ""} onChange={(event) => setField("customFieldsJson", event.target.value)} rows={4} className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </Field>
          </div>
          <label className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm">
            <input type="checkbox" checked={values.isActive} onChange={(event) => setField("isActive", event.target.checked)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
            {tCommon("active")}
          </label>
        </Section>

        <div className="flex justify-end gap-3">
          <Link href={backHref} className="inline-flex h-10 items-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent">
            {tCommon("cancel")}
          </Link>
          <button
            type="submit"
            disabled={saving || duplicateState.checking || duplicateState.assetTagExists || duplicateState.serialNumberExists}
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-5 text-lg font-semibold text-foreground">{title}</h2>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">{children}</div>
    </section>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
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

function SelectField({
  label,
  value,
  required,
  onChange,
  children,
}: {
  label: string
  value: string
  required?: boolean
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <Field label={label} required={required}>
      <select
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      >
        {children}
      </select>
    </Field>
  )
}
