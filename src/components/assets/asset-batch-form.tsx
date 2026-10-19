"use client"

import { useId, useMemo, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { Copy, Download, Plus, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { AssetForm } from "@/components/assets/asset-form"
import { Button, buttonVariants } from "@/components/ui/button"
import { ChoiceCard, ChoiceChip } from "@/components/ui/choice-card"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field } from "@/components/ui/field"
import { checkboxVariants, fieldLabelClasses } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { KeyValueList } from "@/components/ui/key-value-list"
import { NativeSelect } from "@/components/ui/native-select"
import { orNil } from "@/components/ui/nil"
import { Notice } from "@/components/ui/notice"
import { PageHeader } from "@/components/ui/page-header"
import { ScannerTextInput } from "@/components/ui/scanner-text-input"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"
import { buildSuggestedAssetName } from "@/lib/asset-name-suggestion"
import { toLocalDateInputValue } from "@/lib/local-date"
import { resolveModelIdForScope } from "@/lib/asset-model-selection"
import { defaultAssetOwnershipType, normalizeAssetOwnershipType, assetOwnershipTypes } from "@/lib/asset-ownership"
import {
  buildAssetBatchDuplicateFieldErrors,
  buildAssetBatchPreviewRows,
  buildAssetBatchReceiptCsv,
  createAssetBatchRows,
  findDuplicateBatchValues,
  parseBatchSerialPaste,
  type AssetBatchEditableRow,
} from "@/lib/asset-batch-create"
import { optionMatchesOrganizationScope } from "@/lib/organization-option-filter"
import { atLeastOne, decimals, maxLength, notBefore, range, required } from "@/lib/validation-rules"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"
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

// The shared fields in visual order, with the id focus moves to (v-track M-R1). The server keys them common.<field>
// (S-R12); the rows' tag and serial are rows.<index>.<field>, after the shared fields (fieldOrder).
const COMMON_FIELD_IDS = {
  name: "asset-batch-name",
  categoryId: "asset-batch-category",
  ownershipType: "asset-batch-ownership-type",
  companyId: "asset-batch-company",
  branchId: "asset-batch-branch",
  departmentId: "asset-batch-department",
  custodianId: "asset-batch-custodian",
  currentLocationId: "asset-batch-current-location",
  statusId: "asset-batch-status",
  conditionId: "asset-batch-condition",
  purchaseDate: "asset-batch-purchase-date",
  purchasePrice: "asset-batch-purchase-price",
  warrantyStartDate: "asset-batch-warranty-start",
  warrantyEndDate: "asset-batch-warranty-end",
  poNumber: "asset-batch-po-number",
  invoiceNumber: "asset-batch-invoice-number",
} as const
type CommonField = keyof typeof COMMON_FIELD_IDS
type RowField = "assetTag" | "serialNumber"
type BatchField = `common.${CommonField}` | `rows.${number}.${RowField}`

function commonKey(field: CommonField): BatchField {
  return `common.${field}`
}

function rowKey(index: number, field: RowField): BatchField {
  return `rows.${index}.${field}`
}

// A row's control in the table (from md) or in its card (below md): both are rendered, one is hidden.
function rowFieldId(index: number, field: RowField, view: "row" | "card") {
  return `asset-batch-${view}-${index}-${field === "assetTag" ? "tag" : "serial"}`
}

// Visual order: the shared fields, then each row's tag and serial.
function fieldOrder(rows: BatchRow[]): BatchField[] {
  return [
    ...(Object.keys(COMMON_FIELD_IDS) as CommonField[]).map(commonKey),
    ...rows.flatMap((_, index) => [rowKey(index, "assetTag"), rowKey(index, "serialNumber")]),
  ]
}

// noValidate turns the browser's check off, so this restates the controls' required, maxLength and min, and the rules
// the toasts used to say: the license's assignee or department, and the rows' duplicate tags and serials. The warranty
// pair always holds in a batch (v-track M-R2, spec §7.4).
function validate(common: BatchCommonValues, rows: BatchRow[]): Partial<Record<BatchField, string>> {
  const errors: Partial<Record<BatchField, string>> = {}
  const check = (key: BatchField, code: string | null) => {
    if (code) errors[key] = code
  }
  const ownershipType = normalizeAssetOwnershipType(common.ownershipType)
  const isLicense = ownershipType === "software_license"
  check("common.name", required(common.name) ?? maxLength(common.name, 200))
  check("common.categoryId", required(common.categoryId))
  check("common.ownershipType", required(common.ownershipType))
  check("common.companyId", required(common.companyId))
  check("common.branchId", required(common.branchId))
  check("common.departmentId", ownershipType !== "personal" && !isLicense ? required(common.departmentId) : null)
  check("common.custodianId", isLicense && atLeastOne([common.departmentId, common.custodianId]) ? "licenseResponsibilityRequired" : null)
  check("common.currentLocationId", required(common.currentLocationId))
  check("common.statusId", required(common.statusId))
  check("common.conditionId", required(common.conditionId))
  check("common.purchasePrice", range(common.purchasePrice, 0) ?? decimals(common.purchasePrice, 2))
  check("common.warrantyEndDate", notBefore(common.warrantyEndDate, common.warrantyStartDate))
  check("common.poNumber", maxLength(common.poNumber, 50))
  check("common.invoiceNumber", maxLength(common.invoiceNumber, 50))
  rows.forEach((row, index) => check(rowKey(index, "serialNumber"), maxLength(row.serialNumber, 100)))
  // A tag or a serial two rows share is an error on every row that holds it, keyed as the server keys it (S-R12).
  Object.assign(errors, buildAssetBatchDuplicateFieldErrors(rows, findDuplicateBatchValues(rows)))
  return errors
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
  const fieldErrors = useFieldErrors<BatchField>()
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
  // A batch holds 2–100 rows. At a limit, add or remove is a prerequisite gate: it stays focusable, does nothing and says
  // why on the row count line (spec §4.4, A-R6); so does the duplicate check while the rows hold a duplicate (A-R7).
  const atRowLimit = rows.length >= 100
  const atRowMinimum = rows.length <= 2
  // The duplicate warning shows while typing, under each row that holds the value (spec U8); a save says nothing twice.
  const liveDuplicates = useMemo(() => buildAssetBatchDuplicateFieldErrors(rows, duplicateValues), [rows, duplicateValues])
  // A server refusal leaves the review and goes back to the field (spec §4.2); the row on screen takes the focus.
  const focusFirstError = () =>
    fieldErrors.focusFirst(fieldOrder(rows), {
      idFor: (key) => {
        const row = key.match(/^rows\.(\d+)\.(assetTag|serialNumber)$/)
        if (!row) return COMMON_FIELD_IDS[key.slice("common.".length) as CommonField]
        const tableId = rowFieldId(Number(row[1]), row[2] as RowField, "row")
        return document.getElementById(tableId)?.getClientRects().length ? tableId : rowFieldId(Number(row[1]), row[2] as RowField, "card")
      },
      reveal: () => setReviewing(false),
    })
  const errorText = (key: BatchField) => {
    const code = fieldErrors.errors[key]
    return code === "licenseResponsibilityRequired" ? t(code) : fieldErrors.message(key)
  }
  const rowError = (index: number, field: RowField) =>
    liveDuplicates[rowKey(index, field)] ? t("batchRowDuplicate") : fieldErrors.message(rowKey(index, field))
  // Only the live duplicate's text, for the row field's polite region; a save's error is read once, by focus (v-track
  // final task 3).
  const rowLiveError = (index: number, field: RowField) => (liveDuplicates[rowKey(index, field)] ? t("batchRowDuplicate") : null)
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
    if (field in COMMON_FIELD_IDS) fieldErrors.clear(commonKey(field as CommonField))
    // A pair or a group clears together (spec §4.3): the warranty dates; the license's assignee or department.
    if (field === "warrantyStartDate") fieldErrors.clear("common.warrantyEndDate")
    if (field === "departmentId" || field === "ownershipType") fieldErrors.clear("common.departmentId", "common.custodianId")
  }

  function setRowField<K extends keyof BatchRow>(clientId: string, field: K, value: BatchRow[K]) {
    setCreatedBatch(null)
    setReviewing(false)
    clearDuplicateCheck()
    setRows((current) => current.map((row) => (row.clientId === clientId ? { ...row, [field]: value } : row)))
    const index = rows.findIndex((row) => row.clientId === clientId)
    if (field === "assetTag" || field === "serialNumber") fieldErrors.clear(rowKey(index, field as RowField))
  }

  // Adding, removing or pasting rows moves the rows below, so every row error goes (spec §4.3, v-track M-R7).
  function clearRowErrors() {
    fieldErrors.clear(...(Object.keys(fieldErrors.errors).filter((key) => key.startsWith("rows.")) as BatchField[]))
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
    fieldErrors.clear("common.categoryId")
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
    fieldErrors.clear("common.companyId", "common.branchId", "common.departmentId", "common.custodianId", "common.currentLocationId")
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
    fieldErrors.clear("common.branchId", "common.custodianId", "common.currentLocationId")
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
    if (atRowLimit) return
    setRows((current) => {
      if (current.length >= 100) return current
      return [...current, createAssetBatchRows(1, `row-${Date.now()}-${current.length + 1}`)[0]]
    })
    setCreatedBatch(null)
    setReviewing(false)
    clearDuplicateCheck()
  }

  function handleRemoveRow(clientId: string) {
    if (atRowMinimum) return
    setRows((current) => {
      if (current.length <= 2) return current
      return current.filter((row) => row.clientId !== clientId)
    })
    clearRowErrors()
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
    if (hasClientDuplicates) return
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
      // The result shows in the Notice under the buttons, which reads it out (role status); no toast says it again.
      setDuplicateCheckMessage(message)
      setDuplicateCheckStatus("duplicate")
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
    clearRowErrors()
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
    link.download = `asset-batch-${toLocalDateInputValue()}.csv`
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
    fieldErrors.setErrors(validate(common, rows))
    if (focusFirstError()) return
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
      if (!response.ok) {
        // A refusal that names a field leaves the review and shows under it (spec §4.2); any other keeps the toast.
        if (fieldErrors.applyServer(result) && focusFirstError()) return
        throw new Error(getErrorMessage(result) ?? tCommon("error"))
      }
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

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Section title={t("batchCommonData")}>
          <div className="grid min-w-0 gap-2">
            <Field label={t("assetName")} id="asset-batch-name" required hint={t("assetNameHelp")} error={errorText("common.name")}>
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
                <span className="text-meta text-muted-foreground">
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
          <SelectField
            label={t("category")}
            id="asset-batch-category"
            value={common.categoryId}
            required
            error={errorText("common.categoryId")}
            onChange={handleCategoryChange}
          >
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
          <SelectField
            label={t("ownershipType")}
            id="asset-batch-ownership-type"
            value={ownershipType}
            required
            error={errorText("common.ownershipType")}
            onChange={(value) => setCommonField("ownershipType", value)}
          >
            {assetOwnershipTypes.map((type) => <option key={type} value={type}>{t(`ownershipType_${type}`)}</option>)}
          </SelectField>
          <SelectField
            label={t("assetOwnerCompany")}
            id="asset-batch-company"
            value={common.companyId}
            required
            hint={t("assetOwnerCompanyHelp")}
            error={errorText("common.companyId")}
            onChange={handleCompanyChange}
          >
            <option value="">{t("selectCompany")}</option>
            {companies.map((company) => <option key={company.id} value={company.id}>{company.label}</option>)}
          </SelectField>
          <SelectField
            label={t("assetOwnerBranch")}
            id="asset-batch-branch"
            value={common.branchId}
            required
            hint={t("assetOwnerBranchHelp")}
            error={errorText("common.branchId")}
            onChange={handleBranchChange}
          >
            <option value="">{t("selectBranch")}</option>
            {filteredBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.label}</option>)}
          </SelectField>
          <SelectField
            label={t("department")}
            id="asset-batch-department"
            value={common.departmentId}
            required={ownershipType !== "personal" && !isSoftwareLicense}
            error={errorText("common.departmentId")}
            onChange={(value) => setCommonField("departmentId", value)}
          >
            <option value="">{t("selectDepartment")}</option>
            {filteredDepartments.map((department) => <option key={department.id} value={department.id}>{department.label}</option>)}
          </SelectField>
          <div>
            <SearchableSelect
              id="asset-batch-custodian"
              label={isSoftwareLicense ? t("licenseAssignee") : t("custodian")}
              value={common.custodianId}
              options={filteredEmployees}
              placeholder={isSoftwareLicense ? t("selectLicenseAssignee") : t("selectCustodian")}
              searchPlaceholder={tCommon("searchSelectPlaceholder")}
              emptyLabel={tCommon("searchSelectNoResults")}
              error={errorText("common.custodianId")}
              onChange={(value) => setCommonField("custodianId", value)}
            />
            <label className="mt-2 flex min-h-11 items-start gap-2 py-2 text-meta text-muted-foreground">
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
              <Notice tone="warning" className="mt-2">{t("crossCompanyCustodianWarning")}</Notice>
            ) : null}
          </div>
          <div className="md:col-span-2">
            <label className="flex min-h-11 items-start gap-2 py-2 text-meta text-muted-foreground">
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
              <Notice tone="warning" className="mt-2">{t("crossBranchLocationWarning")}</Notice>
            ) : null}
          </div>
          <SelectField
            label={t("currentLocation")}
            id="asset-batch-current-location"
            value={common.currentLocationId}
            required
            error={errorText("common.currentLocationId")}
            onChange={(value) => setCommonField("currentLocationId", value)}
          >
            <option value="">{t("selectLocation")}</option>
            {filteredLocations.map((location) => <option key={location.id} value={location.id}>{getLocationOptionLabel(location, allowCrossBranchLocation, branches)}</option>)}
          </SelectField>
          <SelectField label={t("homeLocation")} value={common.homeLocationId} onChange={(value) => setCommonField("homeLocationId", value)}>
            <option value="">{t("selectLocation")}</option>
            {filteredLocations.map((location) => <option key={location.id} value={location.id}>{getLocationOptionLabel(location, allowCrossBranchLocation, branches)}</option>)}
          </SelectField>
          <SelectField
            label={t("status")}
            id="asset-batch-status"
            value={common.statusId}
            required
            error={errorText("common.statusId")}
            onChange={(value) => setCommonField("statusId", value)}
          >
            <option value="">{t("selectStatus")}</option>
            {statuses.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
          </SelectField>
          <SelectField
            label={t("condition")}
            id="asset-batch-condition"
            value={common.conditionId}
            required
            error={errorText("common.conditionId")}
            onChange={(value) => setCommonField("conditionId", value)}
          >
            <option value="">{t("selectCondition")}</option>
            {conditions.map((condition) => <option key={condition.id} value={condition.id}>{condition.label}</option>)}
          </SelectField>
        </Section>

        <Section title={t("purchaseWarranty")}>
          <Field label={t("purchaseDate")} id="asset-batch-purchase-date" error={errorText("common.purchaseDate")}>
            <Input type="date" value={common.purchaseDate} onChange={(event) => setCommonField("purchaseDate", event.target.value)} />
          </Field>
          <Field label={t("purchasePriceBaht")} id="asset-batch-purchase-price" error={errorText("common.purchasePrice")}>
            <Input type="number" min="0" step="0.01" inputMode="decimal" value={common.purchasePrice} onChange={(event) => setCommonField("purchasePrice", event.target.value)} />
          </Field>
          <SelectField label={t("supplier")} value={common.supplierId} onChange={(value) => setCommonField("supplierId", value)}>
            <option value="">{t("selectSupplier")}</option>
            {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.label}</option>)}
          </SelectField>
          {/* The end cannot be picked before the start (spec U4, §7.4). */}
          <Field label={t("warrantyStart")} id="asset-batch-warranty-start" error={errorText("common.warrantyStartDate")}>
            <Input
              type="date"
              value={common.warrantyStartDate}
              max={common.warrantyEndDate || undefined}
              onChange={(event) => setCommonField("warrantyStartDate", event.target.value)}
            />
          </Field>
          <Field label={t("warrantyEnd")} id="asset-batch-warranty-end" error={errorText("common.warrantyEndDate")}>
            <Input
              type="date"
              value={common.warrantyEndDate}
              min={common.warrantyStartDate || undefined}
              onChange={(event) => setCommonField("warrantyEndDate", event.target.value)}
            />
          </Field>
          <Field label={t("poNumber")} id="asset-batch-po-number" error={errorText("common.poNumber")}>
            <Input value={common.poNumber} onChange={(event) => setCommonField("poNumber", event.target.value)} maxLength={50} />
          </Field>
          <Field label={t("invoiceNumber")} id="asset-batch-invoice-number" error={errorText("common.invoiceNumber")}>
            <Input value={common.invoiceNumber} onChange={(event) => setCommonField("invoiceNumber", event.target.value)} maxLength={50} />
          </Field>
          <Field label={t("remark")}>
            <Input value={common.remark} onChange={(event) => setCommonField("remark", event.target.value)} />
          </Field>
          <div className="md:col-span-2">
            <h3 className="text-sm font-medium text-foreground">{t("existingPurchaseDocuments")}</h3>
            <p className="mt-1 text-meta text-muted-foreground">{t("purchaseDocumentsHelp")}</p>
            {purchaseDocuments.length === 0 ? (
              <EmptyNote className="mt-3">{t("noPurchaseDocuments")}</EmptyNote>
            ) : (
              // Each document is a shared ChoiceCard (spec 2D D9), as in the single asset form.
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {purchaseDocuments.map((document) => (
                  <ChoiceCard
                    key={document.id}
                    type="checkbox"
                    checked={selectedPurchaseDocumentIds.includes(document.id)}
                    onChange={() => togglePurchaseDocument(document.id)}
                    label={<span className="tag">{document.documentNo}</span>}
                    description={<>{document.supplierName ?? document.documentType} · {t("linkedAssets", { count: document.assetCount })}</>}
                  />
                ))}
              </div>
            )}
          </div>
        </Section>

        <Section title={t("batchRows")}>
          <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-0 flex-1">
              <div id="asset-batch-row-count" className="text-sm font-medium text-foreground">{t("batchCurrentCount", { count: rows.length })} · {t("batchRowLimits")}</div>
              <p className="mt-1 text-meta text-muted-foreground">{t("batchRowHelp")}</p>
            </div>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={handleAddRow}
              aria-disabled={atRowLimit || undefined}
              aria-describedby={atRowLimit ? "asset-batch-row-count" : undefined}
            >
              <Plus aria-hidden="true" />
              {t("batchAddRow")}
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={handleCheckDuplicates}
              busy={checkingDuplicates}
              aria-disabled={hasClientDuplicates || undefined}
              aria-describedby={hasClientDuplicates ? "asset-batch-row-count" : undefined}
            >
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

          {/* Spec 2D D7: the check result by meaning. The clean result and a failure have their toast; the duplicates found
              have only this Notice, which reads them out (v-track plan 2 A2). */}
          {duplicateCheckMessage ? (
            <Notice
              tone={duplicateCheckStatus === "clean" ? "success" : duplicateCheckStatus === "duplicate" ? "warning" : "danger"}
              className="md:col-span-2"
              role={duplicateCheckStatus === "duplicate" ? "status" : undefined}
            >
              {duplicateCheckStatus === "error" ? <ApiErrorText error={duplicateCheckMessage} /> : duplicateCheckMessage}
            </Notice>
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
                    aria-disabled={atRowMinimum || undefined}
                    aria-describedby={atRowMinimum ? "asset-batch-row-count" : undefined}
                    title={t("batchRemoveRow")}
                  >
                    <Trash2 aria-hidden="true" />
                    <span className="sr-only">{t("batchRemoveRow")}</span>
                  </Button>
                </div>
                <div className="grid gap-3">
                  <Field label={t("batchAssetTag")} id={rowFieldId(index, "assetTag", "card")} hint={t("batchAssetTagHelp")} liveError={rowLiveError(index, "assetTag")} error={rowError(index, "assetTag")}>
                    <Input value={row.assetTag} onChange={(event) => setRowField(row.clientId, "assetTag", event.target.value)} placeholder={t("autoTagHint")} />
                  </Field>
                  <Field label={t("batchSerialNumber")} id={rowFieldId(index, "serialNumber", "card")} hint={t("batchPasteSerialHint")} liveError={rowLiveError(index, "serialNumber")} error={rowError(index, "serialNumber")}>
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

          {/* Spec 2D D9: the shared table without a frame of its own inside the section panel; rows are plain (no hover fill on fields). */}
          <DataTable framed={false} minWidth={760} caption={t("batchRows")} className="hidden md:col-span-2 md:block">
            <DataTableHeader>
              <tr>
                <DataTableHead className="w-16">{t("batchRowNo")}</DataTableHead>
                <DataTableHead className="w-56">{t("batchAssetTag")}</DataTableHead>
                <DataTableHead className="w-56">{t("batchSerialNumber")}</DataTableHead>
                {showRowCustodian ? <DataTableHead className="w-64">{t("batchCustodian")}</DataTableHead> : null}
                {showRowDepartment ? <DataTableHead className="w-64">{t("batchDepartment")}</DataTableHead> : null}
                {showRowCurrentLocation ? <DataTableHead className="w-72">{t("batchCurrentLocation")}</DataTableHead> : null}
                {showRowHomeLocation ? <DataTableHead className="w-72">{t("batchHomeLocation")}</DataTableHead> : null}
                {showRowRemark ? <DataTableHead className="w-64">{t("batchRemark")}</DataTableHead> : null}
                <DataTableHead align="right" hideLabel className="w-16">{t("batchRowActions")}</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {rows.map((row, index) => (
                <tr key={row.clientId}>
                  <DataTableCell className="num font-medium text-foreground">{index + 1}</DataTableCell>
                  <DataTableCell>
                    <Field label={t("batchAssetTag")} id={rowFieldId(index, "assetTag", "row")} hideLabel hint={t("batchAssetTagHelp")} liveError={rowLiveError(index, "assetTag")} error={rowError(index, "assetTag")}>
                      <Input value={row.assetTag} onChange={(event) => setRowField(row.clientId, "assetTag", event.target.value)} placeholder={t("autoTagHint")} />
                    </Field>
                  </DataTableCell>
                  <DataTableCell>
                    <Field label={t("batchSerialNumber")} id={rowFieldId(index, "serialNumber", "row")} hideLabel hint={t("batchPasteSerialHint")} liveError={rowLiveError(index, "serialNumber")} error={rowError(index, "serialNumber")}>
                      <ScannerTextInput value={row.serialNumber} onChange={(value) => setRowField(row.clientId, "serialNumber", value)} onPaste={(event) => handleSerialPaste(row.clientId, event)} labels={scannerLabels} maxLength={100} />
                    </Field>
                  </DataTableCell>
                  {showRowCustodian ? (
                    <DataTableCell>
                      <SearchableSelect label="" value={row.custodianId} options={getRowEmployeeOptions(row)} placeholder={t("batchUseSharedCustodian")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setRowField(row.clientId, "custodianId", value)} />
                    </DataTableCell>
                  ) : null}
                  {showRowDepartment ? (
                    <DataTableCell>
                      <SearchableSelect label="" value={row.departmentId} options={filteredDepartments} placeholder={t("batchUseSharedDepartment")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setRowField(row.clientId, "departmentId", value)} />
                    </DataTableCell>
                  ) : null}
                  {showRowCurrentLocation ? (
                    <DataTableCell>
                      <SearchableSelect label="" value={row.currentLocationId} options={rowLocationOptions} placeholder={t("batchUseSharedCurrentLocation")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setRowField(row.clientId, "currentLocationId", value)} />
                    </DataTableCell>
                  ) : null}
                  {showRowHomeLocation ? (
                    <DataTableCell>
                      <SearchableSelect label="" value={row.homeLocationId} options={rowLocationOptions} placeholder={t("batchUseSharedHomeLocation")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setRowField(row.clientId, "homeLocationId", value)} />
                    </DataTableCell>
                  ) : null}
                  {showRowRemark ? (
                    <DataTableCell>
                      <Field label={t("batchRemark")} hideLabel>
                        <Input value={row.remark} onChange={(event) => setRowField(row.clientId, "remark", event.target.value)} placeholder={t("batchUseSharedRemark")} />
                      </Field>
                    </DataTableCell>
                  ) : null}
                  <DataTableCell align="right">
                    <Button
                      variant="outline"
                      size="icon-lg"
                      onClick={() => handleRemoveRow(row.clientId)}
                      aria-disabled={atRowMinimum || undefined}
                      aria-describedby={atRowMinimum ? "asset-batch-row-count" : undefined}
                      title={t("batchRemoveRow")}
                    >
                      <Trash2 aria-hidden="true" />
                      <span className="sr-only">{t("batchRemoveRow")}</span>
                    </Button>
                  </DataTableCell>
                </tr>
              ))}
            </DataTableBody>
          </DataTable>
        </Section>

        {/* Spec 2D D9: the review and the result are ContentPanels; no primary or success tint (color only where it means something). */}
        {reviewing ? (
          <ContentPanel
            title={t("batchReviewTitle")}
            description={t("batchReviewDescription")}
            actions={
              <Button variant="outline" size="md" className="w-full sm:w-auto" onClick={() => setReviewing(false)}>
                {t("batchReviewBack")}
              </Button>
            }
          >
            <KeyValueList
              items={[
                { key: "location", label: t("batchReviewSharedLocation"), value: locations.find((location) => location.id === common.currentLocationId)?.label },
                { key: "fixedAssetCode", label: t("batchReviewSharedFixedAssetCode"), value: common.fixedAssetCode },
                { key: "count", label: t("batchRows"), value: formatCount(rows.length) },
              ]}
            />
            {/* The review keeps its 320px height cap: the outer frame scrolls down, the table scrolls sideways. */}
            <DataTable framed={false} minWidth={1100} caption={t("batchReviewTitle")} className="mt-4 max-h-80 overflow-y-auto">
              <DataTableHeader>
                <tr>
                  <DataTableHead>{t("batchRowNo")}</DataTableHead>
                  <DataTableHead>{t("batchAssetTag")}</DataTableHead>
                  <DataTableHead>{t("batchSerialNumber")}</DataTableHead>
                  <DataTableHead>{t("batchCustodian")}</DataTableHead>
                  <DataTableHead>{t("batchDepartment")}</DataTableHead>
                  <DataTableHead>{t("batchCurrentLocation")}</DataTableHead>
                  <DataTableHead>{t("batchHomeLocation")}</DataTableHead>
                  <DataTableHead>{t("batchRemark")}</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {previewRows.map((row) => (
                  <tr key={row.rowNo}>
                    <DataTableCell className="num font-medium">{row.rowNo}</DataTableCell>
                    <DataTableCell>
                      {row.assetTag ? (
                        <span className="tag font-medium text-foreground">{row.assetTag}</span>
                      ) : (
                        <span className="font-medium text-foreground">{t("batchReviewAutoAssetTag")}</span>
                      )}
                      {row.assetTagSource === "manual" ? <span className="ml-2 text-meta text-muted-foreground">{t("batchReviewManualAssetTag")}</span> : null}
                    </DataTableCell>
                    <DataTableCell>{orNil(row.serialNumber)}</DataTableCell>
                    <DataTableCell>{orNil(employees.find((employee) => employee.id === (row.custodianId || common.custodianId))?.label)}</DataTableCell>
                    <DataTableCell>{orNil(departments.find((department) => department.id === (row.departmentId || common.departmentId))?.label)}</DataTableCell>
                    <DataTableCell>{orNil(locations.find((location) => location.id === (row.currentLocationId || common.currentLocationId))?.label)}</DataTableCell>
                    <DataTableCell>{orNil(locations.find((location) => location.id === (row.homeLocationId || common.homeLocationId))?.label)}</DataTableCell>
                    <DataTableCell>{orNil(row.remark)}</DataTableCell>
                  </tr>
                ))}
              </DataTableBody>
            </DataTable>
          </ContentPanel>
        ) : null}

        {createdBatch ? (
          <ContentPanel title={t("batchCreatedTitle")} description={t("batchCreatedDescription", { count: createdBatch.created })}>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
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
              <DataTable framed={false} minWidth={640} caption={t("batchReceiptAssets")} scrollHint={tCommon("tableScrollHint")} className="mt-2">
                <DataTableHeader>
                  <tr>
                    <DataTableHead>{t("assetTag")}</DataTableHead>
                    <DataTableHead>{t("assetName")}</DataTableHead>
                  </tr>
                </DataTableHeader>
                <DataTableBody>
                  {createdBatch.assets.map((asset) => (
                    <tr key={asset.id}>
                      <DataTableCell>
                        <span className="tag font-medium text-foreground">{asset.assetTag}</span>
                      </DataTableCell>
                      <DataTableCell className="text-muted-foreground">{asset.name}</DataTableCell>
                    </tr>
                  ))}
                </DataTableBody>
              </DataTable>
            </div>
          </ContentPanel>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" className="w-full sm:w-auto" busy={saving}>
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

// Spec 2D D9: each form section is a ContentPanel, as in the single asset form.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <ContentPanel title={title}>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </ContentPanel>
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
  id,
  value,
  required,
  hint,
  error,
  onChange,
  children,
}: {
  label: string
  // The id focus moves to and the error is tied to (v-track M-R1).
  id?: string
  value: string
  required?: boolean
  hint?: React.ReactNode
  error?: React.ReactNode
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <Field label={label} id={id} required={required} hint={hint} error={error}>
      <NativeSelect value={value} required={required} onChange={(event) => onChange(event.target.value)}>
        {children}
      </NativeSelect>
    </Field>
  )
}
