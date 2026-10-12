"use client"

import { useId, useMemo, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { Copy, Download, Plus, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { AssetForm } from "@/components/assets/asset-form"
import { Button, buttonVariants } from "@/components/ui/button"
import { ChoiceChip } from "@/components/ui/choice-card"
import { Field } from "@/components/ui/field"
import { checkboxVariants, fieldLabelClasses } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { PageHeader } from "@/components/ui/page-header"
import { ScannerTextInput } from "@/components/ui/scanner-text-input"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { cn } from "@/lib/utils"
import { buildSuggestedAssetName } from "@/lib/asset-name-suggestion"
import { resolveModelIdForScope } from "@/lib/asset-model-selection"
import { defaultAssetOwnershipType, normalizeAssetOwnershipType, assetOwnershipTypes } from "@/lib/asset-ownership"
import { buildAssetBatchPreviewRows, buildAssetBatchReceiptCsv, createAssetBatchRows, findDuplicateBatchValues, parseBatchSerialPaste, type AssetBatchEditableRow } from "@/lib/asset-batch-create"
import { optionMatchesOrganizationScope } from "@/lib/organization-option-filter"
import { useApiError } from "@/components/ui/use-api-error"
import { ApiErrorText } from "@/components/ui/api-error-text"

type AssetBatchFormProps = React.ComponentProps<typeof AssetForm>
type ScopedEmployeeOption = AssetBatchFormProps["employees"][number]
type ScopedLocationOption = AssetBatchFormProps["locations"][number]

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

type BatchOptionalColumnKey = "custodian" | "department" | "currentLocation" | "homeLocation" | "remark"

const batchOptionalColumnKeys: BatchOptionalColumnKey[] = ["custodian", "department", "currentLocation", "homeLocation", "remark"]

const emptyRowColumns: Record<BatchOptionalColumnKey, boolean> = {
  custodian: false,
  department: false,
  currentLocation: false,
  homeLocation: false,
  remark: false,
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
  const apiError = useApiError()
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")
  // The help line under the row-column chips, read when focus enters the group (T4).
  const optionalColumnsHelpId = useId()
  const [common, setCommon] = useState<BatchCommonValues>(emptyCommon)
  const [rows, setRows] = useState<BatchRow[]>(() => createAssetBatchRows())
  const [visibleRowColumns, setVisibleRowColumns] = useState<Record<BatchOptionalColumnKey, boolean>>(emptyRowColumns)
  const [selectedPurchaseDocumentIds, setSelectedPurchaseDocumentIds] = useState<string[]>([])
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)
  const [duplicateCheckMessage, setDuplicateCheckMessage] = useState("")
  const [duplicateCheckStatus, setDuplicateCheckStatus] = useState<"clean" | "duplicate" | "error" | null>(null)
  const [allowCrossCompanyCustodian, setAllowCrossCompanyCustodian] = useState(false)
  const [allowCrossBranchLocation, setAllowCrossBranchLocation] = useState(false)
  const [saving, setSaving] = useState(false)
  const [createdBatch, setCreatedBatch] = useState<CreatedBatch | null>(null)
  const ownershipType = normalizeAssetOwnershipType(common.ownershipType)
  const isSoftwareLicense = ownershipType === "software_license"
  const filteredBranches = branches.filter((branch) => branch.companyId === common.companyId)
  const filteredDepartments = departments.filter((department) => !department.companyId || department.companyId === common.companyId)
  const selectedBranch = branches.find((branch) => branch.id === common.branchId)
  const selectedDepartment = departments.find((department) => department.id === common.departmentId)
  const filteredEmployees = allowCrossCompanyCustodian ? employees : employees.filter(
    (employee) =>
      optionMatchesOrganizationScope(employee, {
        companyId: common.companyId,
        branchId: common.branchId,
        branchCode: selectedBranch?.code,
        departmentId: common.departmentId,
        departmentCode: selectedDepartment?.code,
      })
  )
  const selectedCustodianIds = [common.custodianId, ...rows.map((row) => row.custodianId)].filter(Boolean)
  const hasCrossCompanyCustodian = selectedCustodianIds.some((id) => {
    const employee = employees.find((item) => item.id === id)
    return Boolean(employee?.companyId && common.companyId && employee.companyId !== common.companyId)
  })
  const filteredLocations = allowCrossBranchLocation ? locations : locations.filter((location) => location.branchId === common.branchId)
  const rowLocationOptions = filteredLocations.map((location) => ({
    ...location,
    label: getLocationOptionLabel(location, allowCrossBranchLocation, branches),
  }))
  const selectedHomeLocation = locations.find((location) => location.id === common.homeLocationId)
  const selectedCurrentLocation = locations.find((location) => location.id === common.currentLocationId)
  const selectedRowLocations = rows.flatMap((row) => [row.currentLocationId, row.homeLocationId].filter(Boolean))
  const hasCrossBranchLocation =
    isCrossBranchLocation(selectedHomeLocation, common.branchId) ||
    isCrossBranchLocation(selectedCurrentLocation, common.branchId) ||
    selectedRowLocations.some((id) => isCrossBranchLocation(locations.find((location) => location.id === id), common.branchId))
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
  const rowOverrideCounts = useMemo(
    () => ({
      custodian: rows.filter((row) => row.custodianId.trim()).length,
      department: rows.filter((row) => row.departmentId.trim()).length,
      currentLocation: rows.filter((row) => row.currentLocationId.trim()).length,
      homeLocation: rows.filter((row) => row.homeLocationId.trim()).length,
      remark: rows.filter((row) => row.remark.trim()).length,
    }),
    [rows]
  )
  const showRowCustodian = visibleRowColumns.custodian || rowOverrideCounts.custodian > 0
  const showRowDepartment = visibleRowColumns.department || rowOverrideCounts.department > 0
  const showRowCurrentLocation = visibleRowColumns.currentLocation || rowOverrideCounts.currentLocation > 0
  const showRowHomeLocation = visibleRowColumns.homeLocation || rowOverrideCounts.homeLocation > 0
  const showRowRemark = visibleRowColumns.remark || rowOverrideCounts.remark > 0
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

  function toggleRowColumn(key: BatchOptionalColumnKey) {
    setVisibleRowColumns((current) => ({ ...current, [key]: !current[key] }))
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
        modelId: resolveModelIdForScope({
          models,
          categoryId,
          brandId: current.brandId,
          currentModelId: current.modelId,
        }),
      })
    )
  }

  function handleBrandChange(brandId: string) {
    setCreatedBatch(null)
    setReviewing(false)
    clearDuplicateCheck()
    setCommon((current) => {
      return withSuggestedName({
        ...current,
        brandId,
        modelId: resolveModelIdForScope({
          models,
          categoryId: current.categoryId,
          brandId,
          currentModelId: current.modelId,
        }),
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
    setRows((current) => current.map((row) => ({ ...row, custodianId: "", departmentId: "", currentLocationId: "", homeLocationId: "" })))
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
    setRows((current) => current.map((row) => ({ ...row, custodianId: "", currentLocationId: "", homeLocationId: "" })))
  }

  function handleCrossCompanyCustodianToggle(checked: boolean) {
    setAllowCrossCompanyCustodian(checked)
    if (checked) return

    setCommon((current) => {
      const custodian = employees.find((employee) => employee.id === current.custodianId)
      if (employeeMatchesBatchScope(custodian, current)) return current
      return { ...current, custodianId: "" }
    })
    setRows((current) =>
      current.map((row) => {
        const custodian = employees.find((employee) => employee.id === row.custodianId)
        if (employeeMatchesBatchScope(custodian, { ...common, departmentId: row.departmentId || common.departmentId })) return row
        return { ...row, custodianId: "" }
      })
    )
  }

  function handleCrossBranchLocationToggle(checked: boolean) {
    setCreatedBatch(null)
    setReviewing(false)
    clearDuplicateCheck()
    setAllowCrossBranchLocation(checked)
    if (checked) return

    setCommon((current) => {
      const homeLocation = locations.find((location) => location.id === current.homeLocationId)
      const currentLocation = locations.find((location) => location.id === current.currentLocationId)
      const nextHomeLocationId = locationMatchesAssetBranch(homeLocation, current.branchId) ? current.homeLocationId : ""
      const nextCurrentLocationId = locationMatchesAssetBranch(currentLocation, current.branchId) ? current.currentLocationId : ""

      if (nextHomeLocationId === current.homeLocationId && nextCurrentLocationId === current.currentLocationId) {
        return current
      }

      return {
        ...current,
        homeLocationId: nextHomeLocationId,
        currentLocationId: nextCurrentLocationId,
      }
    })
    setRows((current) =>
      current.map((row) => {
        const homeLocation = locations.find((location) => location.id === row.homeLocationId)
        const currentLocation = locations.find((location) => location.id === row.currentLocationId)
        return {
          ...row,
          homeLocationId: locationMatchesAssetBranch(homeLocation, common.branchId) ? row.homeLocationId : "",
          currentLocationId: locationMatchesAssetBranch(currentLocation, common.branchId) ? row.currentLocationId : "",
        }
      })
    )
  }

  function employeeMatchesBatchScope(employee: ScopedEmployeeOption | undefined, scope: BatchCommonValues) {
    if (!employee) return true
    const branch = branches.find((item) => item.id === scope.branchId)
    const department = departments.find((item) => item.id === scope.departmentId)

    return optionMatchesOrganizationScope(employee, {
      companyId: scope.companyId,
      branchId: scope.branchId,
      branchCode: branch?.code,
      departmentId: scope.departmentId,
      departmentCode: department?.code,
    })
  }

  function isCrossBranchLocation(location: ScopedLocationOption | undefined, branchId?: string | null) {
    return Boolean(location?.branchId && branchId && location.branchId !== branchId)
  }

  function locationMatchesAssetBranch(location: ScopedLocationOption | undefined, branchId?: string | null) {
    if (!location) return true
    if (!branchId) return false
    return !location.branchId || location.branchId === branchId
  }

  function getRowEmployeeOptions(row: BatchRow) {
    if (allowCrossCompanyCustodian) return employees
    const rowDepartment = departments.find((department) => department.id === row.departmentId)
    return employees.filter((employee) =>
      optionMatchesOrganizationScope(employee, {
        companyId: common.companyId,
        branchId: common.branchId,
        branchCode: selectedBranch?.code,
        departmentId: row.departmentId || common.departmentId,
        departmentCode: rowDepartment?.code ?? selectedDepartment?.code,
      })
    )
  }

  function getLocationOptionLabel(location: ScopedLocationOption, includeBranch: boolean, branchOptions: AssetBatchFormProps["branches"]) {
    if (!includeBranch || !location.branchId) return location.label
    const branch = branchOptions.find((item) => item.id === location.branchId)
    return branch ? `${location.label} (${branch.label})` : location.label
  }

  function getOptionalColumnLabel(key: BatchOptionalColumnKey) {
    switch (key) {
      case "custodian":
        return t("batchCustodian")
      case "department":
        return t("batchDepartment")
      case "currentLocation":
        return t("batchCurrentLocation")
      case "homeLocation":
        return t("batchHomeLocation")
      case "remark":
        return t("batchRemark")
    }
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
      apiError.toast(message)
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
      apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("batchCreateTitle")} meta={t("batchCreateSubtitle")} className="mb-6" />

      <form onSubmit={handleSubmit} className="space-y-5">
        <Section title={t("batchCommonData")}>
          <div className="grid min-w-0 gap-2">
            <Field label={t("assetName")} required hint={t("assetNameHelp")}>
              <Input
                value={common.name}
                onChange={(event) => {
                  setNameManuallyEdited(true)
                  setCommonField("name", event.target.value)
                }}
                required
                maxLength={200}
              />
            </Field>
            {suggestedAssetName && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-accent px-2.5 py-1 text-xs text-muted-foreground">
                  {t("suggestedAssetName")}: <span className="font-medium text-foreground">{suggestedAssetName}</span>
                </span>
                {common.name !== suggestedAssetName && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNameManuallyEdited(false)
                      setCommonField("name", suggestedAssetName)
                    }}
                  >
                    {t("useSuggestedName")}
                  </Button>
                )}
              </div>
            )}
          </div>
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
          <SelectField label={t("assetOwnerCompany")} value={common.companyId} required hint={t("assetOwnerCompanyHelp")} onChange={handleCompanyChange}>
            <option value="">{t("selectCompany")}</option>
            {companies.map((company) => <option key={company.id} value={company.id}>{company.label}</option>)}
          </SelectField>
          <SelectField label={t("assetOwnerBranch")} value={common.branchId} required hint={t("assetOwnerBranchHelp")} onChange={handleBranchChange}>
            <option value="">{t("selectBranch")}</option>
            {filteredBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.label}</option>)}
          </SelectField>
          <SelectField label={t("department")} value={common.departmentId} required={ownershipType !== "personal" && !isSoftwareLicense} onChange={(value) => setCommonField("departmentId", value)}>
            <option value="">{t("selectDepartment")}</option>
            {filteredDepartments.map((department) => <option key={department.id} value={department.id}>{department.label}</option>)}
          </SelectField>
          <div>
            <SearchableSelect
              label={isSoftwareLicense ? t("licenseAssignee") : t("custodian")}
              value={common.custodianId}
              options={filteredEmployees}
              placeholder={isSoftwareLicense ? t("selectLicenseAssignee") : t("selectCustodian")}
              searchPlaceholder={tCommon("searchSelectPlaceholder")}
              emptyLabel={tCommon("searchSelectNoResults")}
              onChange={(value) => setCommonField("custodianId", value)}
            />
            <label className="mt-2 flex min-h-11 items-start gap-2 py-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={allowCrossCompanyCustodian}
                onChange={(event) => handleCrossCompanyCustodianToggle(event.target.checked)}
                className={cn(checkboxVariants(), "mt-0.5")}
              />
              <span>
                <span className="block font-medium text-foreground">{t("allowCrossCompanyCustodian")}</span>
                <span>{t("allowCrossCompanyCustodianHelp")}</span>
              </span>
            </label>
            {hasCrossCompanyCustodian ? (
              <p className="mt-2 text-xs font-medium text-warning">{t("crossCompanyCustodianWarning")}</p>
            ) : null}
          </div>
          <div className="md:col-span-2">
            <label className="flex min-h-11 items-start gap-2 py-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={allowCrossBranchLocation}
                onChange={(event) => handleCrossBranchLocationToggle(event.target.checked)}
                className={cn(checkboxVariants(), "mt-0.5")}
              />
              <span>
                <span className="block font-medium text-foreground">{t("allowCrossBranchLocation")}</span>
                <span>{t("allowCrossBranchLocationHelp")}</span>
              </span>
            </label>
            {hasCrossBranchLocation ? (
              <p className="mt-2 text-xs font-medium text-warning">{t("crossBranchLocationWarning")}</p>
            ) : null}
          </div>
          <SelectField label={t("currentLocation")} value={common.currentLocationId} required onChange={(value) => setCommonField("currentLocationId", value)}>
            <option value="">{t("selectLocation")}</option>
            {filteredLocations.map((location) => <option key={location.id} value={location.id}>{getLocationOptionLabel(location, allowCrossBranchLocation, branches)}</option>)}
          </SelectField>
          <SelectField label={t("homeLocation")} value={common.homeLocationId} onChange={(value) => setCommonField("homeLocationId", value)}>
            <option value="">{t("selectLocation")}</option>
            {filteredLocations.map((location) => <option key={location.id} value={location.id}>{getLocationOptionLabel(location, allowCrossBranchLocation, branches)}</option>)}
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
            <Input type="date" value={common.purchaseDate} onChange={(event) => setCommonField("purchaseDate", event.target.value)} />
          </Field>
          <Field label={t("purchasePriceBaht")}>
            <Input type="number" min="0" step="0.01" inputMode="decimal" value={common.purchasePrice} onChange={(event) => setCommonField("purchasePrice", event.target.value)} />
          </Field>
          <SelectField label={t("supplier")} value={common.supplierId} onChange={(value) => setCommonField("supplierId", value)}>
            <option value="">{t("selectSupplier")}</option>
            {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.label}</option>)}
          </SelectField>
          <Field label={t("warrantyStart")}>
            <Input type="date" value={common.warrantyStartDate} onChange={(event) => setCommonField("warrantyStartDate", event.target.value)} />
          </Field>
          <Field label={t("warrantyEnd")}>
            <Input type="date" value={common.warrantyEndDate} onChange={(event) => setCommonField("warrantyEndDate", event.target.value)} />
          </Field>
          <Field label={t("poNumber")}>
            <Input value={common.poNumber} onChange={(event) => setCommonField("poNumber", event.target.value)} maxLength={50} />
          </Field>
          <Field label={t("invoiceNumber")}>
            <Input value={common.invoiceNumber} onChange={(event) => setCommonField("invoiceNumber", event.target.value)} maxLength={50} />
          </Field>
          <Field label={t("remark")}>
            <Input value={common.remark} onChange={(event) => setCommonField("remark", event.target.value)} />
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
                    <input type="checkbox" checked={selectedPurchaseDocumentIds.includes(document.id)} onChange={() => togglePurchaseDocument(document.id)} className={cn(checkboxVariants(), "mt-0.5")} />
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
            <Button variant="outline" className="w-full sm:w-auto" onClick={handleAddRow} disabled={rows.length >= 100}>
              <Plus aria-hidden="true" />
              {t("batchAddRow")}
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" onClick={handleCheckDuplicates} busy={checkingDuplicates} disabled={hasClientDuplicates}>
              {t("batchCheckDuplicates")}
            </Button>
          </div>

          <div className="md:col-span-2 rounded-md border border-border bg-background p-3">
            <fieldset className="min-w-0" aria-describedby={optionalColumnsHelpId}>
              <legend className={fieldLabelClasses}>{t("batchOptionalColumns")}</legend>
              <p id={optionalColumnsHelpId} className="mt-1 text-meta text-faint-foreground">{t("batchOptionalColumnsHelp")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {batchOptionalColumnKeys.map((key) => (
                  <BatchOptionalColumnToggle
                    key={key}
                    label={getOptionalColumnLabel(key)}
                    active={visibleRowColumns[key] || rowOverrideCounts[key] > 0}
                    count={rowOverrideCounts[key]}
                    onClick={() => toggleRowColumn(key)}
                  />
                ))}
              </div>
            </fieldset>
          </div>

          {hasClientDuplicates ? (
            <div className="md:col-span-2 rounded-md border border-warning-border bg-warning-soft p-3 text-sm text-warning">
              {t("duplicateWarning")}
              {duplicateValues.serialNumbers.length > 0 ? ` Serial: ${duplicateValues.serialNumbers.join(", ")}` : ""}
              {duplicateValues.assetTags.length > 0 ? ` Asset Tag: ${duplicateValues.assetTags.join(", ")}` : ""}
            </div>
          ) : null}

          {duplicateCheckMessage ? (
            <div
              className={`md:col-span-2 rounded-md border p-3 text-sm ${
                duplicateCheckStatus === "clean"
                  ? "border-success-border bg-success-soft text-success"
                  : duplicateCheckStatus === "duplicate"
                    ? "border-warning-border bg-warning-soft text-warning"
                    : "border-danger-border bg-danger-soft text-danger"
              }`}
            >
              {duplicateCheckStatus === "error" ? <ApiErrorText error={duplicateCheckMessage} /> : duplicateCheckMessage}
            </div>
          ) : null}

          <div className="grid gap-3 md:hidden">
            {rows.map((row, index) => (
              <div key={row.clientId} className="rounded-md border border-border bg-background p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-foreground">{t("batchRowNo")} {index + 1}</div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => handleRemoveRow(row.clientId)}
                    disabled={rows.length <= 2}
                    title={t("batchRemoveRow")}
                  >
                    <Trash2 aria-hidden="true" />
                    <span className="sr-only">{t("batchRemoveRow")}</span>
                  </Button>
                </div>
                <div className="grid gap-3">
                  <Field label={t("batchAssetTag")} hint={t("batchAssetTagHelp")}>
                    <Input value={row.assetTag} onChange={(event) => setRowField(row.clientId, "assetTag", event.target.value)} placeholder={t("autoTagHint")} />
                  </Field>
                  <Field label={t("batchSerialNumber")} hint={t("batchPasteSerialHint")}>
                    <ScannerTextInput value={row.serialNumber} onChange={(value) => setRowField(row.clientId, "serialNumber", value)} onPaste={(event) => handleSerialPaste(row.clientId, event)} labels={scannerLabels} maxLength={100} />
                  </Field>
                  {showRowCustodian ? (
                    <SearchableSelect label={t("batchCustodian")} value={row.custodianId} options={getRowEmployeeOptions(row)} placeholder={t("batchUseSharedCustodian")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setRowField(row.clientId, "custodianId", value)} />
                  ) : null}
                  {showRowDepartment ? (
                    <SearchableSelect label={t("batchDepartment")} value={row.departmentId} options={filteredDepartments} placeholder={t("batchUseSharedDepartment")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setRowField(row.clientId, "departmentId", value)} />
                  ) : null}
                  {showRowCurrentLocation ? (
                    <SearchableSelect label={t("batchCurrentLocation")} value={row.currentLocationId} options={rowLocationOptions} placeholder={t("batchUseSharedCurrentLocation")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setRowField(row.clientId, "currentLocationId", value)} />
                  ) : null}
                  {showRowHomeLocation ? (
                    <SearchableSelect label={t("batchHomeLocation")} value={row.homeLocationId} options={rowLocationOptions} placeholder={t("batchUseSharedHomeLocation")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setRowField(row.clientId, "homeLocationId", value)} />
                  ) : null}
                  {showRowRemark ? (
                    <Field label={t("batchRemark")}>
                      <Input value={row.remark} onChange={(event) => setRowField(row.clientId, "remark", event.target.value)} placeholder={t("batchUseSharedRemark")} />
                    </Field>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-md border border-border md:col-span-2 md:block">
            <table className="min-w-[760px] w-full text-sm">
              <thead className="bg-surface text-left text-meta font-medium text-faint-foreground">
                <tr>
                  <th className="w-16 px-3 py-2">{t("batchRowNo")}</th>
                  <th className="w-56 px-3 py-2">{t("batchAssetTag")}</th>
                  <th className="w-56 px-3 py-2">{t("batchSerialNumber")}</th>
                  {showRowCustodian ? <th className="w-64 px-3 py-2">{t("batchCustodian")}</th> : null}
                  {showRowDepartment ? <th className="w-64 px-3 py-2">{t("batchDepartment")}</th> : null}
                  {showRowCurrentLocation ? <th className="w-72 px-3 py-2">{t("batchCurrentLocation")}</th> : null}
                  {showRowHomeLocation ? <th className="w-72 px-3 py-2">{t("batchHomeLocation")}</th> : null}
                  {showRowRemark ? <th className="w-64 px-3 py-2">{t("batchRemark")}</th> : null}
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
                      <Field label={t("batchAssetTag")} hideLabel hint={t("batchAssetTagHelp")}>
                        <Input value={row.assetTag} onChange={(event) => setRowField(row.clientId, "assetTag", event.target.value)} placeholder={t("autoTagHint")} />
                      </Field>
                    </td>
                    <td className="px-3 py-3">
                      <Field label={t("batchSerialNumber")} hideLabel hint={t("batchPasteSerialHint")}>
                        <ScannerTextInput value={row.serialNumber} onChange={(value) => setRowField(row.clientId, "serialNumber", value)} onPaste={(event) => handleSerialPaste(row.clientId, event)} labels={scannerLabels} maxLength={100} />
                      </Field>
                    </td>
                    {showRowCustodian ? (
                      <td className="px-3 py-3">
                        <SearchableSelect label="" value={row.custodianId} options={getRowEmployeeOptions(row)} placeholder={t("batchUseSharedCustodian")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setRowField(row.clientId, "custodianId", value)} />
                      </td>
                    ) : null}
                    {showRowDepartment ? (
                      <td className="px-3 py-3">
                        <SearchableSelect label="" value={row.departmentId} options={filteredDepartments} placeholder={t("batchUseSharedDepartment")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setRowField(row.clientId, "departmentId", value)} />
                      </td>
                    ) : null}
                    {showRowCurrentLocation ? (
                      <td className="px-3 py-3">
                        <SearchableSelect label="" value={row.currentLocationId} options={rowLocationOptions} placeholder={t("batchUseSharedCurrentLocation")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setRowField(row.clientId, "currentLocationId", value)} />
                      </td>
                    ) : null}
                    {showRowHomeLocation ? (
                      <td className="px-3 py-3">
                        <SearchableSelect label="" value={row.homeLocationId} options={rowLocationOptions} placeholder={t("batchUseSharedHomeLocation")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setRowField(row.clientId, "homeLocationId", value)} />
                      </td>
                    ) : null}
                    {showRowRemark ? (
                      <td className="px-3 py-3">
                        <Field label={t("batchRemark")} hideLabel>
                          <Input value={row.remark} onChange={(event) => setRowField(row.clientId, "remark", event.target.value)} placeholder={t("batchUseSharedRemark")} />
                        </Field>
                      </td>
                    ) : null}
                    <td className="px-3 py-3 text-right">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleRemoveRow(row.clientId)}
                        disabled={rows.length <= 2}
                        title={t("batchRemoveRow")}
                      >
                        <Trash2 aria-hidden="true" />
                        <span className="sr-only">{t("batchRemoveRow")}</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {reviewing ? (
          <section className="rounded-lg border border-primary-border bg-primary-soft p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground">{t("batchReviewTitle")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("batchReviewDescription")}</p>
              </div>
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => setReviewing(false)}>
                {t("batchReviewBack")}
              </Button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <SummaryItem label={t("batchReviewSharedLocation")} value={locations.find((location) => location.id === common.currentLocationId)?.label ?? "-"} />
              <SummaryItem label={t("batchReviewSharedFixedAssetCode")} value={common.fixedAssetCode || "-"} />
              <SummaryItem label={t("batchCurrentCount", { count: rows.length })} value={String(rows.length)} />
            </div>
            <div className="mt-4 max-h-80 max-w-full overflow-auto rounded-md border border-border bg-background">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="bg-surface text-left text-meta font-medium text-faint-foreground">
                  <tr>
                    <th className="px-3 py-2">{t("batchRowNo")}</th>
                    <th className="px-3 py-2">{t("batchAssetTag")}</th>
                    <th className="px-3 py-2">{t("batchSerialNumber")}</th>
                    <th className="px-3 py-2">{t("batchCustodian")}</th>
                    <th className="px-3 py-2">{t("batchDepartment")}</th>
                    <th className="px-3 py-2">{t("batchCurrentLocation")}</th>
                    <th className="px-3 py-2">{t("batchHomeLocation")}</th>
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
                      <td className="px-3 py-2">{employees.find((employee) => employee.id === (row.custodianId || common.custodianId))?.label ?? "-"}</td>
                      <td className="px-3 py-2">{departments.find((department) => department.id === (row.departmentId || common.departmentId))?.label ?? "-"}</td>
                      <td className="px-3 py-2">{locations.find((location) => location.id === (row.currentLocationId || common.currentLocationId))?.label ?? "-"}</td>
                      <td className="px-3 py-2">{locations.find((location) => location.id === (row.homeLocationId || common.homeLocationId))?.label ?? "-"}</td>
                      <td className="px-3 py-2">{row.remark || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {createdBatch ? (
          <div className="rounded-md border border-success-border bg-success-soft p-4">
            <h2 className="text-lg font-semibold text-foreground">{t("batchCreatedTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("batchCreatedDescription", { count: createdBatch.created })}</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link href={`/${locale}/assets`} className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}>
                {t("batchGoToRegister")}
              </Link>
              <Link href={`/${locale}/asset-management/labels?assetIds=${createdBatch.assetIds.join(",")}`} className={cn(buttonVariants({ variant: "default" }), "w-full sm:w-auto")}>
                {t("batchPrintLabels")}
              </Link>
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => void handleCopyAssetTags()}>
                <Copy aria-hidden="true" />
                {t("batchCopyAssetTags")}
              </Button>
              <Button variant="outline" className="w-full sm:w-auto" onClick={handleDownloadReceiptCsv}>
                <Download aria-hidden="true" />
                {t("batchDownloadReceiptCsv")}
              </Button>
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-foreground">{t("batchReceiptAssets")}</h3>
              <div className="mt-2 overflow-auto rounded-md border border-border bg-background">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-surface text-left text-meta font-medium text-faint-foreground">
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
          <Button type="submit" className="w-full sm:w-auto" busy={saving} disabled={hasClientDuplicates}>
            <Save aria-hidden="true" />
            {reviewing ? t("batchReviewConfirm") : t("batchSubmit")}
          </Button>
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
    <section className="min-w-0 rounded-lg border border-border bg-surface p-4 sm:p-5">
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

// A real checkbox chip (K16): Space toggles it and Enter does not submit the batch form. Still checked while rows
// hold their own value, as before (spec 2C section 7.4.4).
function BatchOptionalColumnToggle({
  label,
  active,
  count,
  onClick,
}: {
  label: string
  active: boolean
  count: number
  onClick: () => void
}) {
  return <ChoiceChip type="checkbox" checked={active} onChange={onClick} label={label} detail={count > 0 ? <span className="num">{count}</span> : undefined} />
}

// Keeps the name and props it had before 2C, so its 12 call sites stay as they are. hint carries the help line
// that used to sit in a <p> under 2 of them (spec 2C section 4.3 F6).
function SelectField({
  label,
  value,
  required,
  hint,
  onChange,
  children,
}: {
  label: string
  value: string
  required?: boolean
  hint?: React.ReactNode
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <Field label={label} required={required} hint={hint}>
      <NativeSelect value={value} required={required} onChange={(event) => onChange(event.target.value)}>
        {children}
      </NativeSelect>
    </Field>
  )
}
