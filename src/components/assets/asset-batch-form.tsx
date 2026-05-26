"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { AssetForm } from "@/components/assets/asset-form"
import { ScannerTextInput } from "@/components/ui/scanner-text-input"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { defaultAssetOwnershipType, normalizeAssetOwnershipType, assetOwnershipTypes } from "@/lib/asset-ownership"
import { findDuplicateBatchValues } from "@/lib/asset-batch-create"

type AssetBatchFormProps = React.ComponentProps<typeof AssetForm>

type BatchCommonValues = {
  name: string
  categoryId: string
  brandId: string
  modelId: string
  licenseTotalSeats: string
  licenseUsedSeats: string
  licenseAssignedAssetId: string
  companyId: string
  branchId: string
  ownershipType: string
  departmentId: string
  custodianId: string
  homeLocationId: string
  currentLocationId: string
  statusId: string
  conditionId: string
  purchaseDate: string
  purchasePrice: string
  supplierId: string
  warrantyStartDate: string
  warrantyEndDate: string
  fixedAssetCode: string
  poNumber: string
  invoiceNumber: string
  remark: string
  customFieldsJson: string
  isActive: boolean
}

type BatchRow = {
  clientId: string
  assetTag: string
  serialNumber: string
  custodianId: string
  departmentId: string
  currentLocationId: string
  fixedAssetCode: string
  remark: string
}

type CreatedBatch = {
  created: number
  assets: Array<{ id: string; assetTag: string; name: string }>
  assetIds: string[]
}

const emptyCommon: BatchCommonValues = {
  name: "",
  categoryId: "",
  brandId: "",
  modelId: "",
  licenseTotalSeats: "",
  licenseUsedSeats: "",
  licenseAssignedAssetId: "",
  companyId: "",
  branchId: "",
  ownershipType: defaultAssetOwnershipType,
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

export function AssetBatchForm({
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
  purchaseDocuments,
}: AssetBatchFormProps) {
  const locale = useLocale()
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")
  const [common, setCommon] = useState<BatchCommonValues>(emptyCommon)
  const [quantity, setQuantity] = useState(10)
  const [rows, setRows] = useState<BatchRow[]>(() => createBatchRows(10))
  const [selectedPurchaseDocumentIds, setSelectedPurchaseDocumentIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [createdBatch, setCreatedBatch] = useState<CreatedBatch | null>(null)
  const ownershipType = normalizeAssetOwnershipType(common.ownershipType)
  const isSoftwareLicense = ownershipType === "software_license"
  const filteredBranches = branches.filter((branch) => branch.companyId === common.companyId)
  const filteredDepartments = departments.filter((department) => !department.companyId || department.companyId === common.companyId)
  const filteredEmployees = employees.filter(
    (employee) => (!common.companyId || employee.companyId === common.companyId) && (!common.branchId || employee.branchId === common.branchId)
  )
  const filteredLocations = locations.filter((location) => location.branchId === common.branchId)
  const filteredModels = models.filter(
    (model) => (!common.categoryId || model.categoryId === common.categoryId) && (!common.brandId || model.brandId === common.brandId)
  )
  const duplicateValues = useMemo(
    () =>
      findDuplicateBatchValues(
        rows.map((row) => ({
          clientId: row.clientId,
          serialNumber: row.serialNumber,
          assetTag: row.assetTag,
        }))
      ),
    [rows]
  )
  const hasClientDuplicates = duplicateValues.serialNumbers.length > 0 || duplicateValues.assetTags.length > 0
  const scannerLabels = {
    start: t("scanSerialNumber"),
    stop: t("stopSerialScan"),
    title: t("serialScannerTitle"),
    help: t("serialScannerHelp"),
    cameraUnsupported: t("cameraUnsupported"),
    cameraNotFound: t("cameraNotFound"),
    cameraError: t("cameraError"),
    cameraDevice: t("cameraDevice"),
    cameraDeviceFallback: t("cameraDeviceFallback"),
    scanning: t("serialScannerRunning"),
    scanned: t("serialScanned"),
  }

  function setCommonField<K extends keyof BatchCommonValues>(field: K, value: BatchCommonValues[K]) {
    setCreatedBatch(null)
    setCommon((current) => ({ ...current, [field]: value }))
  }

  function setRowField<K extends keyof BatchRow>(clientId: string, field: K, value: BatchRow[K]) {
    setCreatedBatch(null)
    setRows((current) => current.map((row) => (row.clientId === clientId ? { ...row, [field]: value } : row)))
  }

  function handleCompanyChange(companyId: string) {
    setCommon((current) => ({
      ...current,
      companyId,
      branchId: "",
      departmentId: "",
      custodianId: "",
      homeLocationId: "",
      currentLocationId: "",
    }))
    setRows((current) => current.map((row) => ({ ...row, custodianId: "", departmentId: "", currentLocationId: "" })))
  }

  function handleBranchChange(branchId: string) {
    setCommon((current) => ({
      ...current,
      branchId,
      custodianId: "",
      homeLocationId: "",
      currentLocationId: "",
    }))
    setRows((current) => current.map((row) => ({ ...row, custodianId: "", currentLocationId: "" })))
  }

  function handleGenerateRows() {
    const safeQuantity = Math.min(Math.max(Number.isFinite(quantity) ? quantity : 10, 2), 100)
    setQuantity(safeQuantity)
    setRows(createBatchRows(safeQuantity))
    setCreatedBatch(null)
  }

  function togglePurchaseDocument(id: string) {
    setCreatedBatch(null)
    setSelectedPurchaseDocumentIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (hasClientDuplicates) {
      toast.error(t("duplicateWarning"))
      return
    }
    if (isSoftwareLicense && !common.departmentId && !common.custodianId) {
      toast.error(t("licenseResponsibilityRequired"))
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/assets/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          common,
          rows,
          purchaseDocumentIds: selectedPurchaseDocumentIds,
        }),
      })
      const result = (await response.json().catch(() => null)) as CreatedBatch | { error?: string } | null
      if (!response.ok) throw new Error(getErrorMessage(result) ?? tCommon("error"))
      if (!isCreatedBatch(result)) throw new Error(tCommon("error"))
      setCreatedBatch(result)
      toast.success(t("batchSubmitSuccess", { count: result.created }))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t("batchCreateTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("batchCreateSubtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Section title={t("batchCommonData")}>
          <Field label={t("assetName")} required>
            <input value={common.name} onChange={(event) => setCommonField("name", event.target.value)} required maxLength={200} className={inputClassName} />
          </Field>
          <SelectField label={t("category")} value={common.categoryId} required onChange={(value) => setCommonField("categoryId", value)}>
            <option value="">{t("selectCategory")}</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
          </SelectField>
          <SelectField label={t("brand")} value={common.brandId} onChange={(value) => setCommonField("brandId", value)}>
            <option value="">{t("selectBrand")}</option>
            {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.label}</option>)}
          </SelectField>
          <SelectField label={t("model")} value={common.modelId} onChange={(value) => setCommonField("modelId", value)}>
            <option value="">{t("selectModel")}</option>
            {filteredModels.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
          </SelectField>
          <SelectField label={t("ownershipType")} value={ownershipType} required onChange={(value) => setCommonField("ownershipType", value)}>
            {assetOwnershipTypes.map((type) => <option key={type} value={type}>{t(`ownershipType_${type}`)}</option>)}
          </SelectField>
          <SelectField label={t("company")} value={common.companyId} required onChange={handleCompanyChange}>
            <option value="">{t("selectCompany")}</option>
            {companies.map((company) => <option key={company.id} value={company.id}>{company.label}</option>)}
          </SelectField>
          <SelectField label={t("branch")} value={common.branchId} required onChange={handleBranchChange}>
            <option value="">{t("selectBranch")}</option>
            {filteredBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.label}</option>)}
          </SelectField>
          <SelectField label={t("department")} value={common.departmentId} required={ownershipType !== "personal" && !isSoftwareLicense} onChange={(value) => setCommonField("departmentId", value)}>
            <option value="">{t("selectDepartment")}</option>
            {filteredDepartments.map((department) => <option key={department.id} value={department.id}>{department.label}</option>)}
          </SelectField>
          <SearchableSelect
            label={isSoftwareLicense ? t("licenseAssignee") : t("custodian")}
            value={common.custodianId}
            options={filteredEmployees}
            placeholder={isSoftwareLicense ? t("selectLicenseAssignee") : t("selectCustodian")}
            searchPlaceholder={tCommon("searchSelectPlaceholder")}
            emptyLabel={tCommon("searchSelectNoResults")}
            onChange={(value) => setCommonField("custodianId", value)}
          />
          <SelectField label={t("currentLocation")} value={common.currentLocationId} required onChange={(value) => setCommonField("currentLocationId", value)}>
            <option value="">{t("selectLocation")}</option>
            {filteredLocations.map((location) => <option key={location.id} value={location.id}>{location.label}</option>)}
          </SelectField>
          <SelectField label={t("homeLocation")} value={common.homeLocationId} onChange={(value) => setCommonField("homeLocationId", value)}>
            <option value="">{t("selectLocation")}</option>
            {filteredLocations.map((location) => <option key={location.id} value={location.id}>{location.label}</option>)}
          </SelectField>
          <SelectField label={t("status")} value={common.statusId} required onChange={(value) => setCommonField("statusId", value)}>
            <option value="">{t("selectStatus")}</option>
            {statuses.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
          </SelectField>
          <SelectField label={t("condition")} value={common.conditionId} required onChange={(value) => setCommonField("conditionId", value)}>
            <option value="">{t("selectCondition")}</option>
            {conditions.map((condition) => <option key={condition.id} value={condition.id}>{condition.label}</option>)}
          </SelectField>
        </Section>

        <Section title={t("purchaseWarranty")}>
          <Field label={t("purchaseDate")}>
            <input type="date" value={common.purchaseDate} onChange={(event) => setCommonField("purchaseDate", event.target.value)} className={inputClassName} />
          </Field>
          <Field label={t("purchasePrice")}>
            <input type="number" min="0" step="0.01" value={common.purchasePrice} onChange={(event) => setCommonField("purchasePrice", event.target.value)} className={inputClassName} />
          </Field>
          <SelectField label={t("supplier")} value={common.supplierId} onChange={(value) => setCommonField("supplierId", value)}>
            <option value="">{t("selectSupplier")}</option>
            {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.label}</option>)}
          </SelectField>
          <Field label={t("warrantyStart")}>
            <input type="date" value={common.warrantyStartDate} onChange={(event) => setCommonField("warrantyStartDate", event.target.value)} className={inputClassName} />
          </Field>
          <Field label={t("warrantyEnd")}>
            <input type="date" value={common.warrantyEndDate} onChange={(event) => setCommonField("warrantyEndDate", event.target.value)} className={inputClassName} />
          </Field>
          <Field label={t("poNumber")}>
            <input value={common.poNumber} onChange={(event) => setCommonField("poNumber", event.target.value)} maxLength={50} className={inputClassName} />
          </Field>
          <Field label={t("invoiceNumber")}>
            <input value={common.invoiceNumber} onChange={(event) => setCommonField("invoiceNumber", event.target.value)} maxLength={50} className={inputClassName} />
          </Field>
          <Field label={t("remark")}>
            <input value={common.remark} onChange={(event) => setCommonField("remark", event.target.value)} className={inputClassName} />
          </Field>
          <div className="md:col-span-2">
            <div className="text-sm font-medium text-foreground">{t("existingPurchaseDocuments")}</div>
            <p className="mt-1 text-xs text-muted-foreground">{t("purchaseDocumentsHelp")}</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {purchaseDocuments.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">{t("noPurchaseDocuments")}</div>
              ) : (
                purchaseDocuments.map((document) => (
                  <label key={document.id} className="flex items-start gap-2 rounded-md border border-border bg-background p-3 text-sm">
                    <input type="checkbox" checked={selectedPurchaseDocumentIds.includes(document.id)} onChange={() => togglePurchaseDocument(document.id)} className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-foreground">{document.documentNo}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{document.supplierName ?? document.documentType} · {t("linkedAssets", { count: document.assetCount })}</span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        </Section>

        <Section title={t("batchRows")}>
          <div className="md:col-span-2 flex flex-wrap items-end gap-3">
            <Field label={t("batchQuantity")}>
              <input type="number" min={2} max={100} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="h-10 w-32 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </Field>
            <button type="button" onClick={handleGenerateRows} className="inline-flex h-10 items-center rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-accent">
              {t("batchGenerateRows")}
            </button>
            <p className="pb-2 text-xs text-muted-foreground">{t("batchRowHelp")}</p>
          </div>

          {hasClientDuplicates ? (
            <div className="md:col-span-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
              {t("duplicateWarning")}
              {duplicateValues.serialNumbers.length > 0 ? ` Serial: ${duplicateValues.serialNumbers.join(", ")}` : ""}
              {duplicateValues.assetTags.length > 0 ? ` Asset Tag: ${duplicateValues.assetTags.join(", ")}` : ""}
            </div>
          ) : null}

          <div className="md:col-span-2 overflow-x-auto rounded-md border border-border">
            <table className="min-w-[1180px] w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs font-semibold text-muted-foreground">
                <tr>
                  <th className="w-16 px-3 py-2">{t("batchRowNo")}</th>
                  <th className="w-56 px-3 py-2">{t("batchSerialNumber")}</th>
                  <th className="w-56 px-3 py-2">{t("batchAssetTag")}</th>
                  <th className="w-64 px-3 py-2">{t("batchCustodian")}</th>
                  <th className="w-64 px-3 py-2">{t("batchLocation")}</th>
                  <th className="w-44 px-3 py-2">{t("batchFixedAssetCode")}</th>
                  <th className="w-64 px-3 py-2">{t("batchRemark")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.clientId} className="border-t border-border align-top">
                    <td className="px-3 py-3 font-medium text-foreground">{index + 1}</td>
                    <td className="px-3 py-3">
                      <ScannerTextInput value={row.serialNumber} onChange={(value) => setRowField(row.clientId, "serialNumber", value)} labels={scannerLabels} maxLength={100} />
                    </td>
                    <td className="px-3 py-3">
                      <input value={row.assetTag} onChange={(event) => setRowField(row.clientId, "assetTag", event.target.value)} placeholder={t("autoTagHint")} aria-label={t("batchAssetTagHelp")} className={inputClassName} />
                      <p className="mt-1 text-[11px] text-muted-foreground">{t("batchAssetTagHelp")}</p>
                    </td>
                    <td className="px-3 py-3">
                      <SearchableSelect label={t("batchCustodian")} value={row.custodianId} options={filteredEmployees} placeholder={t("selectCustodian")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setRowField(row.clientId, "custodianId", value)} />
                    </td>
                    <td className="px-3 py-3">
                      <select value={row.currentLocationId} onChange={(event) => setRowField(row.clientId, "currentLocationId", event.target.value)} className={inputClassName}>
                        <option value="">{t("selectLocation")}</option>
                        {filteredLocations.map((location) => <option key={location.id} value={location.id}>{location.label}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <input value={row.fixedAssetCode} onChange={(event) => setRowField(row.clientId, "fixedAssetCode", event.target.value)} className={inputClassName} />
                    </td>
                    <td className="px-3 py-3">
                      <input value={row.remark} onChange={(event) => setRowField(row.clientId, "remark", event.target.value)} className={inputClassName} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {createdBatch ? (
          <div className="rounded-md border border-success/30 bg-success/10 p-4">
            <h2 className="text-lg font-semibold text-foreground">{t("batchCreatedTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("batchCreatedDescription", { count: createdBatch.created })}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/${locale}/assets`} className="inline-flex h-10 items-center rounded-md border border-border px-3 text-sm font-medium hover:bg-accent">
                {t("batchGoToRegister")}
              </Link>
              <Link href={`/${locale}/asset-management/labels?assetIds=${createdBatch.assetIds.join(",")}`} className="inline-flex h-10 items-center rounded-md bg-primary px-3 text-sm font-medium text-white hover:bg-primary/90">
                {t("batchPrintLabels")}
              </Link>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end">
          <button type="submit" disabled={saving || hasClientDuplicates} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("batchSubmit")}
          </button>
        </div>
      </form>
    </div>
  )
}

function createBatchRows(count: number): BatchRow[] {
  return Array.from({ length: count }, (_, index) => ({
    clientId: `row-${Date.now()}-${index + 1}`,
    assetTag: "",
    serialNumber: "",
    custodianId: "",
    departmentId: "",
    currentLocationId: "",
    fixedAssetCode: "",
    remark: "",
  }))
}

function getErrorMessage(result: CreatedBatch | { error?: string } | null) {
  return result && "error" in result ? result.error : null
}

function isCreatedBatch(result: CreatedBatch | { error?: string } | null): result is CreatedBatch {
  return Boolean(result && "created" in result && Array.isArray(result.assetIds))
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-foreground">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
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
      <select value={value} required={required} onChange={(event) => onChange(event.target.value)} className={inputClassName}>
        {children}
      </select>
    </Field>
  )
}

const inputClassName = "h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
