"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { Copy, Download, Loader2, Plus, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { AssetForm } from "@/components/assets/asset-form"
import { ScannerTextInput } from "@/components/ui/scanner-text-input"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { buildSuggestedAssetName } from "@/lib/asset-name-suggestion"
import { defaultAssetOwnershipType, normalizeAssetOwnershipType, assetOwnershipTypes } from "@/lib/asset-ownership"
import { buildAssetBatchPreviewRows, buildAssetBatchReceiptCsv, createAssetBatchRows, findDuplicateBatchValues, parseBatchSerialPaste, type AssetBatchEditableRow } from "@/lib/asset-batch-create"
import { optionMatchesOrganizationScope } from "@/lib/organization-option-filter"

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

type BatchRow = AssetBatchEditableRow

type CreatedBatch = {
  created: number
  assets: Array<{ id: string; assetTag: string; name: string }>
  assetIds: string[]
}

type DuplicateCheckResult = {
  ok: boolean
  message: string
  duplicateCount: number
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
  const [rows, setRows] = useState<BatchRow[]>(() => createAssetBatchRows())
  const [selectedPurchaseDocumentIds, setSelectedPurchaseDocumentIds] = useState<string[]>([])
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)
  const [duplicateCheckMessage, setDuplicateCheckMessage] = useState("")
  const [duplicateCheckStatus, setDuplicateCheckStatus] = useState<"clean" | "duplicate" | "error" | null>(null)
  const [saving, setSaving] = useState(false)
  const [createdBatch, setCreatedBatch] = useState<CreatedBatch | null>(null)
  const ownershipType = normalizeAssetOwnershipType(common.ownershipType)
  const isSoftwareLicense = ownershipType === "software_license"
  const filteredBranches = branches.filter((branch) => branch.companyId === common.companyId)
  const filteredDepartments = departments.filter((department) => !department.companyId || department.companyId === common.companyId)
  const selectedBranch = branches.find((branch) => branch.id === common.branchId)
  const selectedDepartment = departments.find((department) => department.id === common.departmentId)
  const filteredEmployees = employees.filter(
    (employee) =>
      optionMatchesOrganizationScope(employee, {
        companyId: common.companyId,
        branchId: common.branchId,
        branchCode: selectedBranch?.code,
        departmentId: common.departmentId,
        departmentCode: selectedDepartment?.code,
      })
  )
  const filteredLocations = locations.filter((location) => location.branchId === common.branchId)
  const filteredModels = models.filter(
    (model) => (!common.categoryId || model.categoryId === common.categoryId) && (!common.brandId || model.brandId === common.brandId)
  )
  const selectedCategory = categories.find((category) => category.id === common.categoryId)
  const selectedBrand = brands.find((brand) => brand.id === common.brandId)
  const selectedModel = models.find((model) => model.id === common.modelId)
  const suggestedAssetName = useMemo(
    () => buildSuggestedAssetName(selectedCategory, selectedBrand, selectedModel),
    [selectedCategory, selectedBrand, selectedModel]
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
  const previewRows = useMemo(() => buildAssetBatchPreviewRows(rows), [rows])
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
    cameraRear: t("cameraRear"),
    scanning: t("serialScannerRunning"),
    scanned: t("serialScanned"),
  }

  function setCommonField<K extends keyof BatchCommonValues>(field: K, value: BatchCommonValues[K]) {
    setCreatedBatch(null)
    setReviewing(false)
    clearDuplicateCheck()
    setCommon((current) => ({ ...current, [field]: value }))
  }

  function setRowField<K extends keyof BatchRow>(clientId: string, field: K, value: BatchRow[K]) {
    setCreatedBatch(null)
    setReviewing(false)
    clearDuplicateCheck()
    setRows((current) => current.map((row) => (row.clientId === clientId ? { ...row, [field]: value } : row)))
  }

  function clearDuplicateCheck() {
    setDuplicateCheckMessage("")
    setDuplicateCheckStatus(null)
  }

  function withSuggestedName(nextCommon: BatchCommonValues) {
    if (nameManuallyEdited) return nextCommon
    return { ...nextCommon, name: getSuggestedAssetName(nextCommon.categoryId, nextCommon.brandId, nextCommon.modelId) }
  }

  function getSuggestedAssetName(categoryId?: string | null, brandId?: string | null, modelId?: string | null) {
    return buildSuggestedAssetName(
      categories.find((category) => category.id === categoryId),
      brands.find((brand) => brand.id === brandId),
      models.find((model) => model.id === modelId)
    )
  }

  function handleCategoryChange(categoryId: string) {
    setCreatedBatch(null)
    setReviewing(false)
    clearDuplicateCheck()
    setCommon((current) =>
      withSuggestedName({
        ...current,
        categoryId,
        modelId: "",
      })
    )
  }

  function handleBrandChange(brandId: string) {
    setCreatedBatch(null)
    setReviewing(false)
    clearDuplicateCheck()
    setCommon((current) => {
      const currentModel = models.find((model) => model.id === current.modelId)
      const modelStillMatches =
        Boolean(currentModel) &&
        (!current.categoryId || currentModel?.categoryId === current.categoryId) &&
        (!brandId || currentModel?.brandId === brandId)

      return withSuggestedName({
        ...current,
        brandId,
        modelId: modelStillMatches ? current.modelId : "",
      })
    })
  }

  function handleModelChange(modelId: string) {
    setCreatedBatch(null)
    setReviewing(false)
    clearDuplicateCheck()
    setCommon((current) =>
      withSuggestedName({
        ...current,
        modelId,
      })
    )
  }

  function handleCompanyChange(companyId: string) {
    setReviewing(false)
    clearDuplicateCheck()
    setCommon((current) => ({
      ...current,
      companyId,
      branchId: "",
      departmentId: "",
      custodianId: "",
      homeLocationId: "",
      currentLocationId: "",
    }))
    setRows((current) => current.map((row) => ({ ...row, custodianId: "", departmentId: "" })))
  }

  function handleBranchChange(branchId: string) {
    setReviewing(false)
    clearDuplicateCheck()
    setCommon((current) => ({
      ...current,
      branchId,
      custodianId: "",
      homeLocationId: "",
      currentLocationId: "",
    }))
    setRows((current) => current.map((row) => ({ ...row, custodianId: "" })))
  }

  function handleAddRow() {
    setRows((current) => {
      if (current.length >= 100) return current
      return [...current, createAssetBatchRows(1, `row-${Date.now()}-${current.length + 1}`)[0]]
    })
    setCreatedBatch(null)
    setReviewing(false)
    clearDuplicateCheck()
  }

  function handleRemoveRow(clientId: string) {
    setRows((current) => {
      if (current.length <= 2) return current
      return current.filter((row) => row.clientId !== clientId)
    })
    setCreatedBatch(null)
    setReviewing(false)
    clearDuplicateCheck()
  }

  function togglePurchaseDocument(id: string) {
    setCreatedBatch(null)
    setReviewing(false)
    clearDuplicateCheck()
    setSelectedPurchaseDocumentIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  async function handleCheckDuplicates() {
    setCheckingDuplicates(true)
    setDuplicateCheckMessage("")
    setDuplicateCheckStatus(null)
    try {
      const response = await fetch("/api/assets/batch/check-duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          common,
          rows,
          purchaseDocumentIds: selectedPurchaseDocumentIds,
        }),
      })
      const result = (await response.json().catch(() => null)) as DuplicateCheckResult | { error?: string } | null
      if (!response.ok) throw new Error(getErrorMessage(result) ?? tCommon("error"))

      if (isDuplicateCheckResult(result) && result.ok) {
        setDuplicateCheckMessage(t("batchCheckDuplicatesClean"))
        setDuplicateCheckStatus("clean")
        toast.success(t("batchCheckDuplicatesClean"))
        return
      }

      const message = isDuplicateCheckResult(result) && result.message ? result.message : t("batchCheckDuplicatesFound")
      setDuplicateCheckMessage(message)
      setDuplicateCheckStatus("duplicate")
      toast.error(message)
    } catch (error) {
      const message = error instanceof Error ? error.message : tCommon("error")
      setDuplicateCheckMessage(message)
      setDuplicateCheckStatus("error")
      toast.error(message)
    } finally {
      setCheckingDuplicates(false)
    }
  }

  function handleSerialPaste(clientId: string, event: React.ClipboardEvent<HTMLInputElement>) {
    const pastedSerials = parseBatchSerialPaste(event.clipboardData.getData("text"), 100)
    if (pastedSerials.length <= 1) return

    event.preventDefault()
    setRows((current) => {
      const startIndex = current.findIndex((row) => row.clientId === clientId)
      if (startIndex < 0) return current

      const next = [...current]
      const requiredRows = Math.min(100, startIndex + pastedSerials.length)
      while (next.length < requiredRows) {
        next.push(createAssetBatchRows(1, `row-${Date.now()}-${next.length + 1}`)[0])
      }

      pastedSerials.slice(0, 100 - startIndex).forEach((serialNumber, offset) => {
        next[startIndex + offset] = { ...next[startIndex + offset], serialNumber }
      })

      return next
    })
    setCreatedBatch(null)
    setReviewing(false)
    clearDuplicateCheck()
  }

  function handleDownloadReceiptCsv() {
    if (!createdBatch) return
    const blob = new Blob([`\ufeff${buildAssetBatchReceiptCsv(createdBatch.assets)}`], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `asset-batch-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function handleCopyAssetTags() {
    if (!createdBatch) return
    await navigator.clipboard.writeText(createdBatch.assets.map((asset) => asset.assetTag).join("\n"))
    toast.success(t("batchCopyAssetTagsSuccess"))
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
    if (!reviewing) {
      setReviewing(true)
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
      setReviewing(false)
      toast.success(t("batchSubmitSuccess", { count: result.created }))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 min-w-0">
        <h1 className="break-words text-2xl font-bold text-foreground">{t("batchCreateTitle")}</h1>
        <p className="mt-1 break-words text-sm text-muted-foreground">{t("batchCreateSubtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Section title={t("batchCommonData")}>
          <Field label={t("assetName")} required>
            <input
              value={common.name}
              onChange={(event) => {
                setNameManuallyEdited(true)
                setCommonField("name", event.target.value)
              }}
              required
              maxLength={200}
              className={inputClassName}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">{t("assetNameHelp")}</p>
            {suggestedAssetName && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-accent px-2.5 py-1 text-xs text-muted-foreground">
                  {t("suggestedAssetName")}: <span className="font-medium text-foreground">{suggestedAssetName}</span>
                </span>
                {common.name !== suggestedAssetName && (
                  <button
                    type="button"
                    onClick={() => {
                      setNameManuallyEdited(false)
                      setCommonField("name", suggestedAssetName)
                    }}
                    className="inline-flex h-8 items-center rounded-md border border-border px-2.5 text-xs font-medium transition-colors hover:bg-accent"
                  >
                    {t("useSuggestedName")}
                  </button>
                )}
              </div>
            )}
          </Field>
          <SelectField label={t("category")} value={common.categoryId} required onChange={handleCategoryChange}>
            <option value="">{t("selectCategory")}</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
          </SelectField>
          <SelectField label={t("brand")} value={common.brandId} onChange={handleBrandChange}>
            <option value="">{t("selectBrand")}</option>
            {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.label}</option>)}
          </SelectField>
          <SelectField label={t("model")} value={common.modelId} onChange={handleModelChange}>
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
          <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground">{t("batchCurrentCount", { count: rows.length })}</div>
              <p className="mt-1 text-xs text-muted-foreground">{t("batchRowHelp")}</p>
            </div>
            <button
              type="button"
              onClick={handleAddRow}
              disabled={rows.length >= 100}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              {t("batchAddRow")}
            </button>
            <button
              type="button"
              onClick={handleCheckDuplicates}
              disabled={checkingDuplicates || hasClientDuplicates}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {checkingDuplicates ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {checkingDuplicates ? t("batchCheckDuplicatesRunning") : t("batchCheckDuplicates")}
            </button>
          </div>

          {hasClientDuplicates ? (
            <div className="md:col-span-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
              {t("duplicateWarning")}
              {duplicateValues.serialNumbers.length > 0 ? ` Serial: ${duplicateValues.serialNumbers.join(", ")}` : ""}
              {duplicateValues.assetTags.length > 0 ? ` Asset Tag: ${duplicateValues.assetTags.join(", ")}` : ""}
            </div>
          ) : null}

          {duplicateCheckMessage ? (
            <div
              className={`md:col-span-2 rounded-md border p-3 text-sm ${
                duplicateCheckStatus === "clean"
                  ? "border-success/40 bg-success/10 text-success"
                  : duplicateCheckStatus === "duplicate"
                    ? "border-warning/40 bg-warning/10 text-warning"
                    : "border-danger/40 bg-danger/10 text-danger"
              }`}
            >
              {duplicateCheckMessage}
            </div>
          ) : null}

          <div className="grid gap-3 md:hidden">
            {rows.map((row, index) => (
              <div key={row.clientId} className="rounded-md border border-border bg-background p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-foreground">{t("batchRowNo")} {index + 1}</div>
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(row.clientId)}
                    disabled={rows.length <= 2}
                    title={t("batchRemoveRow")}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">{t("batchRemoveRow")}</span>
                  </button>
                </div>
                <div className="grid gap-3">
                  <Field label={t("batchAssetTag")}>
                    <input value={row.assetTag} onChange={(event) => setRowField(row.clientId, "assetTag", event.target.value)} placeholder={t("autoTagHint")} aria-label={t("batchAssetTagHelp")} className={inputClassName} />
                    <p className="mt-1 text-[11px] text-muted-foreground">{t("batchAssetTagHelp")}</p>
                  </Field>
                  <Field label={t("batchSerialNumber")}>
                    <ScannerTextInput value={row.serialNumber} onChange={(value) => setRowField(row.clientId, "serialNumber", value)} onPaste={(event) => handleSerialPaste(row.clientId, event)} labels={scannerLabels} maxLength={100} />
                    <p className="mt-1 text-[11px] text-muted-foreground">{t("batchPasteSerialHint")}</p>
                  </Field>
                  <SearchableSelect label={t("batchCustodian")} value={row.custodianId} options={filteredEmployees} placeholder={t("selectCustodian")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setRowField(row.clientId, "custodianId", value)} />
                  <Field label={t("batchRemark")}>
                    <input value={row.remark} onChange={(event) => setRowField(row.clientId, "remark", event.target.value)} className={inputClassName} />
                  </Field>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-md border border-border md:col-span-2 md:block">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs font-semibold text-muted-foreground">
                <tr>
                  <th className="w-16 px-3 py-2">{t("batchRowNo")}</th>
                  <th className="w-56 px-3 py-2">{t("batchAssetTag")}</th>
                  <th className="w-56 px-3 py-2">{t("batchSerialNumber")}</th>
                  <th className="w-64 px-3 py-2">{t("batchCustodian")}</th>
                  <th className="w-64 px-3 py-2">{t("batchRemark")}</th>
                  <th className="w-16 px-3 py-2 text-right">
                    <span className="sr-only">{t("batchRowActions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.clientId} className="border-t border-border align-top">
                    <td className="px-3 py-3 font-medium text-foreground">{index + 1}</td>
                    <td className="px-3 py-3">
                      <input value={row.assetTag} onChange={(event) => setRowField(row.clientId, "assetTag", event.target.value)} placeholder={t("autoTagHint")} aria-label={t("batchAssetTagHelp")} className={inputClassName} />
                      <p className="mt-1 text-[11px] text-muted-foreground">{t("batchAssetTagHelp")}</p>
                    </td>
                    <td className="px-3 py-3">
                      <ScannerTextInput value={row.serialNumber} onChange={(value) => setRowField(row.clientId, "serialNumber", value)} onPaste={(event) => handleSerialPaste(row.clientId, event)} labels={scannerLabels} maxLength={100} />
                      <p className="mt-1 text-[11px] text-muted-foreground">{t("batchPasteSerialHint")}</p>
                    </td>
                    <td className="px-3 py-3">
                      <SearchableSelect label="" value={row.custodianId} options={filteredEmployees} placeholder={t("selectCustodian")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setRowField(row.clientId, "custodianId", value)} />
                    </td>
                    <td className="px-3 py-3">
                      <input value={row.remark} onChange={(event) => setRowField(row.clientId, "remark", event.target.value)} className={inputClassName} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.clientId)}
                        disabled={rows.length <= 2}
                        title={t("batchRemoveRow")}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">{t("batchRemoveRow")}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {reviewing ? (
          <section className="rounded-lg border border-primary/30 bg-primary/5 p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground">{t("batchReviewTitle")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("batchReviewDescription")}</p>
              </div>
              <button type="button" onClick={() => setReviewing(false)} className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent sm:w-auto">
                {t("batchReviewBack")}
              </button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <SummaryItem label={t("batchReviewSharedLocation")} value={locations.find((location) => location.id === common.currentLocationId)?.label ?? "-"} />
              <SummaryItem label={t("batchReviewSharedFixedAssetCode")} value={common.fixedAssetCode || "-"} />
              <SummaryItem label={t("batchCurrentCount", { count: rows.length })} value={String(rows.length)} />
            </div>
            <div className="mt-4 max-h-80 max-w-full overflow-auto rounded-md border border-border bg-background">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-muted/40 text-left text-xs font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">{t("batchRowNo")}</th>
                    <th className="px-3 py-2">{t("batchAssetTag")}</th>
                    <th className="px-3 py-2">{t("batchSerialNumber")}</th>
                    <th className="px-3 py-2">{t("batchCustodian")}</th>
                    <th className="px-3 py-2">{t("batchRemark")}</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => (
                    <tr key={row.rowNo} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{row.rowNo}</td>
                      <td className="px-3 py-2">
                        <span className="font-medium text-foreground">{row.assetTag || t("batchReviewAutoAssetTag")}</span>
                        {row.assetTagSource === "manual" ? <span className="ml-2 text-xs text-muted-foreground">{t("batchReviewManualAssetTag")}</span> : null}
                      </td>
                      <td className="px-3 py-2">{row.serialNumber || "-"}</td>
                      <td className="px-3 py-2">{employees.find((employee) => employee.id === row.custodianId)?.label ?? "-"}</td>
                      <td className="px-3 py-2">{row.remark || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {createdBatch ? (
          <div className="rounded-md border border-success/30 bg-success/10 p-4">
            <h2 className="text-lg font-semibold text-foreground">{t("batchCreatedTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("batchCreatedDescription", { count: createdBatch.created })}</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link href={`/${locale}/assets`} className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border px-3 text-sm font-medium hover:bg-accent sm:w-auto">
                {t("batchGoToRegister")}
              </Link>
              <Link href={`/${locale}/asset-management/labels?assetIds=${createdBatch.assetIds.join(",")}`} className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-white hover:bg-primary/90 sm:w-auto">
                {t("batchPrintLabels")}
              </Link>
              <button type="button" onClick={() => void handleCopyAssetTags()} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent sm:w-auto">
                <Copy className="h-4 w-4" />
                {t("batchCopyAssetTags")}
              </button>
              <button type="button" onClick={handleDownloadReceiptCsv} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent sm:w-auto">
                <Download className="h-4 w-4" />
                {t("batchDownloadReceiptCsv")}
              </button>
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-foreground">{t("batchReceiptAssets")}</h3>
              <div className="mt-2 overflow-auto rounded-md border border-border bg-background">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-muted/40 text-left text-xs font-semibold text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">{t("assetTag")}</th>
                      <th className="px-3 py-2">{t("assetName")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {createdBatch.assets.map((asset) => (
                      <tr key={asset.id} className="border-t border-border">
                        <td className="px-3 py-2 font-medium text-foreground">{asset.assetTag}</td>
                        <td className="px-3 py-2 text-muted-foreground">{asset.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end">
          <button type="submit" disabled={saving || hasClientDuplicates} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {reviewing ? t("batchReviewConfirm") : t("batchSubmit")}
          </button>
        </div>
      </form>
    </div>
  )
}

function getErrorMessage(result: unknown) {
  if (!result || typeof result !== "object" || !("error" in result)) return null
  return typeof result.error === "string" ? result.error : null
}

function isCreatedBatch(result: CreatedBatch | { error?: string } | null): result is CreatedBatch {
  return Boolean(result && "created" in result && Array.isArray(result.assetIds))
}

function isDuplicateCheckResult(result: DuplicateCheckResult | { error?: string } | null): result is DuplicateCheckResult {
  return Boolean(result && "ok" in result && typeof result.ok === "boolean")
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-5">
      <h2 className="mb-4 break-words text-lg font-semibold text-foreground">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
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

const inputClassName = "min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:h-10 sm:min-h-0"
