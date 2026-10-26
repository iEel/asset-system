"use client"

import { useEffect, useId, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Code2, Plus, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { ChoiceCard, ChoiceChip } from "@/components/ui/choice-card"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field, FieldError } from "@/components/ui/field"
import { checkboxVariants, fieldLabelClasses } from "@/components/ui/field-variants"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { orNil } from "@/components/ui/nil"
import { Notice } from "@/components/ui/notice"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { ScannerTextInput } from "@/components/ui/scanner-text-input"
import { StickyFormFooter } from "@/components/ui/sticky-form-footer"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { AssetStateHelpPopover } from "@/components/assets/asset-state-help-popover"
import { buildSuggestedAssetName } from "@/lib/asset-name-suggestion"
import { resolveModelIdForScope } from "@/lib/asset-model-selection"
import { assetOwnershipTypes, defaultAssetOwnershipType, normalizeAssetOwnershipType } from "@/lib/asset-ownership"
import { formatCount } from "@/lib/display-format"
import { optionMatchesOrganizationScope } from "@/lib/organization-option-filter"
import { formatFileSize } from "@/lib/uploads"
import { cn } from "@/lib/utils"
import { atLeastOne, decimals, maxLength, notBefore, range, required, wholeNumber } from "@/lib/validation-rules"

type Option = {
  id: string
  label: string
  name?: string | null
  description?: string | null
  code?: string | null
  companyId?: string | null
  branchId?: string | null
  branchCode?: string | null
  departmentId?: string | null
  departmentCode?: string | null
  categoryId?: string | null
  brandId?: string | null
  photoChecklist?: string[]
}

type CustomFieldDefinition = {
  id: string
  categoryId: string
  fieldName: string
  fieldLabel: string
  fieldLabelTh?: string | null
  fieldType: string
  options: string[]
  isRequired: boolean
  sortOrder: number
}

type AssetFormValues = {
  id?: string
  assetTag?: string | null
  name: string
  categoryId: string
  brandId?: string | null
  modelId?: string | null
  serialNumber?: string | null
  licenseTotalSeats?: string | number | null
  licenseUsedSeats?: string | number | null
  licenseAssignedAssetId?: string | null
  companyId: string
  branchId: string
  ownershipType?: string | null
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
  purchaseDocumentIds?: string[]
  isActive: boolean
}

type CustomFieldRow = {
  id: string
  key: string
  value: string
}

type PurchaseDocumentOption = {
  id: string
  documentType: string
  documentNo: string
  poNumber?: string | null
  invoiceNumber?: string | null
  supplierName?: string | null
  assetCount: number
}

type PurchaseDocumentDraft = {
  id: string
  documentType: string
  documentNo: string
  documentDate: string
  totalAmount: string
  file: File
}

type AssetPhotoDraft = {
  id: string
  label: string
  file: File
}

type ExistingAssetPhoto = {
  id: string
  originalName: string
  fileType: string
  fileSize: number
}

type CloneSourceContext = {
  id: string
  assetTag: string
  name: string
}

const purchaseDocumentTypes = ["purchase_order", "invoice", "delivery_note", "warranty", "quotation", "contract", "other"] as const
const protectedAssetWorkflowStatuses = new Set([
  "pending disposal",
  "disposed",
  "retired",
  "lost",
  "missing",
  "under maintenance",
  "pending repair",
])

const emptyAsset: AssetFormValues = {
  assetTag: "",
  name: "",
  categoryId: "",
  brandId: "",
  modelId: "",
  serialNumber: "",
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

// The fields in visual order, keyed like the server's fieldErrors (the asset body's keys; the install, purchase
// document and photo keys are this form's own), with the id focus moves to (v-track M-R1). The template's custom
// fields sit between the photo and the raw JSON: fieldOrder() puts them there and fieldId() names them.
const FIELD_IDS = {
  assetTag: "asset-tag",
  name: "asset-name",
  categoryId: "asset-category",
  serialNumber: "asset-serial-number",
  ownershipType: "asset-ownership-type",
  companyId: "asset-company",
  branchId: "asset-branch",
  departmentId: "asset-department",
  custodianId: "asset-custodian",
  licenseTotalSeats: "asset-license-total-seats",
  licenseUsedSeats: "asset-license-used-seats",
  currentLocationId: "asset-current-location",
  statusId: "asset-status",
  conditionId: "asset-condition",
  parentAssetId: "asset-install-parent",
  componentRole: "asset-install-role",
  slotNo: "asset-install-slot",
  installReason: "asset-install-reason",
  purchaseDate: "asset-purchase-date",
  purchasePrice: "asset-purchase-price",
  warrantyStartDate: "asset-warranty-start",
  warrantyEndDate: "asset-warranty-end",
  fixedAssetCode: "asset-fixed-asset-code",
  poNumber: "asset-po-number",
  invoiceNumber: "asset-invoice-number",
  purchaseDocumentNo: "asset-purchase-document-no",
  purchaseDocumentAmount: "asset-purchase-document-amount",
  purchaseDocumentFile: "asset-purchase-document-file",
  assetPhotoFile: "asset-photo-file",
  customFieldsJson: "asset-custom-fields-json",
} as const
type AssetFixedField = keyof typeof FIELD_IDS
type AssetField = AssetFixedField | `customFields.${string}`

// The asset rules that read the message their toast used (spec §7.1); every other code reads common.validation or the
// api-error catalog through the hook.
const ASSET_MESSAGE_CODES = [
  "componentParentRequired",
  "componentRoleRequired",
  "licenseResponsibilityRequired",
  "purchaseDocumentNoRequired",
  "fileRequired",
  "customFieldsJsonInvalid",
] as const
type AssetMessageCode = (typeof ASSET_MESSAGE_CODES)[number]

function isAssetMessageCode(code: string): code is AssetMessageCode {
  return (ASSET_MESSAGE_CODES as readonly string[]).includes(code)
}

function customFieldKey(fieldName: string): AssetField {
  return `customFields.${fieldName}`
}

// Visual order: the fixed fields, the template's custom fields, then the raw JSON.
function fieldOrder(definitions: CustomFieldDefinition[]): AssetField[] {
  const fixed = (Object.keys(FIELD_IDS) as AssetFixedField[]).filter((key) => key !== "customFieldsJson")
  return [...fixed, ...definitions.map((definition) => customFieldKey(definition.fieldName)), "customFieldsJson"]
}

// A custom field's id is its place in the template: a field name may hold a space, which an id list cannot.
function fieldId(key: AssetField, definitions: CustomFieldDefinition[]): string {
  if (key in FIELD_IDS) return FIELD_IDS[key as AssetFixedField]
  return `asset-custom-field-${definitions.findIndex((definition) => customFieldKey(definition.fieldName) === key)}`
}

type AssetRuleInput = {
  values: AssetFormValues
  // The stored asset on edit: the warranty pair is checked only when one of its dates changed (spec §7.4).
  original?: AssetFormValues
  duplicates: { assetTag: boolean; serialNumber: boolean }
  install: { parentAssetId: string; componentRole: string; slotNo: string; reason: string }
  customFields: { definitions: CustomFieldDefinition[]; valueOf: (fieldName: string) => string }
  purchaseDocument: { file: File | null; documentNo: string; totalAmount: string }
}

// noValidate turns the browser's check off, so this restates the controls' required, maxLength, min and the seats'
// step, and the rules the toasts used to say: the duplicate tag and serial, the license's assignee or department and
// its seats, the warranty pair, the install after create, the template's required fields, the raw JSON and a chosen
// purchase document's number (v-track M-R2, spec §7.4).
function validate({ values, original, duplicates, install, customFields, purchaseDocument }: AssetRuleInput): Partial<Record<AssetField, string>> {
  const errors: Partial<Record<AssetField, string>> = {}
  const check = (key: AssetField, code: string | null) => {
    if (code) errors[key] = code
  }
  const ownershipType = normalizeAssetOwnershipType(values.ownershipType)
  const isLicense = ownershipType === "software_license"
  const warrantyChanged =
    !original ||
    (values.warrantyStartDate ?? "") !== (original.warrantyStartDate ?? "") ||
    (values.warrantyEndDate ?? "") !== (original.warrantyEndDate ?? "")
  check("assetTag", duplicates.assetTag ? "duplicate" : maxLength(values.assetTag, 50))
  check("name", required(values.name) ?? maxLength(values.name, 200))
  check("categoryId", required(values.categoryId))
  check("serialNumber", duplicates.serialNumber ? "duplicate" : maxLength(values.serialNumber, 100))
  check("ownershipType", required(values.ownershipType))
  check("companyId", required(values.companyId))
  check("branchId", required(values.branchId))
  check("departmentId", ownershipType !== "personal" && !isLicense ? required(values.departmentId) : null)
  check("custodianId", isLicense && atLeastOne([values.departmentId, values.custodianId]) ? "licenseResponsibilityRequired" : null)
  if (isLicense) {
    check("licenseTotalSeats", range(values.licenseTotalSeats, 0) ?? wholeNumber(values.licenseTotalSeats))
    check("licenseUsedSeats", range(values.licenseUsedSeats, 0) ?? wholeNumber(values.licenseUsedSeats) ?? seatsExceeded(values))
  }
  check("currentLocationId", required(values.currentLocationId))
  check("statusId", required(values.statusId))
  check("conditionId", required(values.conditionId))
  if (!original) {
    check("parentAssetId", ownershipType === "component" && required(install.parentAssetId) ? "componentParentRequired" : null)
    check("componentRole", install.parentAssetId && required(install.componentRole) ? "componentRoleRequired" : maxLength(install.componentRole, 100))
    check("slotNo", maxLength(install.slotNo, 50))
    check("installReason", maxLength(install.reason, 500))
  }
  check("purchasePrice", range(values.purchasePrice, 0) ?? decimals(values.purchasePrice, 2))
  check("warrantyEndDate", warrantyChanged ? notBefore(values.warrantyEndDate, values.warrantyStartDate) : null)
  check("fixedAssetCode", maxLength(values.fixedAssetCode, 50))
  check("poNumber", maxLength(values.poNumber, 50))
  check("invoiceNumber", maxLength(values.invoiceNumber, 50))
  check("purchaseDocumentNo", purchaseDocument.file && required(purchaseDocument.documentNo) ? "purchaseDocumentNoRequired" : maxLength(purchaseDocument.documentNo, 100))
  check("purchaseDocumentAmount", range(purchaseDocument.totalAmount, 0) ?? decimals(purchaseDocument.totalAmount, 2))
  for (const definition of customFields.definitions) {
    if (definition.isRequired) check(customFieldKey(definition.fieldName), required(customFields.valueOf(definition.fieldName)))
  }
  check("customFieldsJson", isValidCustomFieldsJson(values.customFieldsJson) ? null : "customFieldsJsonInvalid")
  return errors
}

// The purchase document's add button: a file and its number (the number's rule matches the save's).
function validatePurchaseDocument(file: File | null, documentNo: string): Partial<Record<AssetField, string>> {
  const errors: Partial<Record<AssetField, string>> = {}
  if (!file) errors.purchaseDocumentFile = "fileRequired"
  const number = required(documentNo) ? "purchaseDocumentNoRequired" : maxLength(documentNo, 100)
  if (number) errors.purchaseDocumentNo = number
  return errors
}

// The server's rule (validations/asset.ts): used seats never exceed the total, when both are given.
function seatsExceeded(values: AssetFormValues): "licenseSeatsExceeded" | null {
  if (required(values.licenseTotalSeats) || required(values.licenseUsedSeats)) return null
  return Number(values.licenseUsedSeats) > Number(values.licenseTotalSeats) ? "licenseSeatsExceeded" : null
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
  parentAssets,
  purchaseDocuments: purchaseDocumentOptions,
  customFieldDefinitions,
  existingAssetPhotos = [],
  cloneSource,
  backHref: providedBackHref,
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
  parentAssets: Option[]
  purchaseDocuments: PurchaseDocumentOption[]
  customFieldDefinitions: CustomFieldDefinition[]
  existingAssetPhotos?: ExistingAssetPhoto[]
  cloneSource?: CloneSourceContext
  backHref?: string
}) {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")
  const apiError = useApiError()
  // The photo-type chips are one radio group (T5): one name for the group and one id for its hint.
  const photoLabelRadioName = useId()
  const photoLabelHintId = useId()
  const [values, setValues] = useState<AssetFormValues>(asset ?? emptyAsset)
  const [customFieldRows, setCustomFieldRows] = useState<CustomFieldRow[]>(() => parseCustomFieldRows(asset?.customFieldsJson))
  const [installAfterCreate, setInstallAfterCreate] = useState({
    parentAssetId: "",
    componentRole: "",
    slotNo: "",
    reason: "",
  })
  const [purchaseDocumentType, setPurchaseDocumentType] = useState<(typeof purchaseDocumentTypes)[number]>("purchase_order")
  const [purchaseDocumentNo, setPurchaseDocumentNo] = useState("")
  const [purchaseDocumentDate, setPurchaseDocumentDate] = useState("")
  const [purchaseDocumentTotalAmount, setPurchaseDocumentTotalAmount] = useState("")
  const [selectedPurchaseFile, setSelectedPurchaseFile] = useState<File | null>(null)
  const [newPurchaseDocuments, setNewPurchaseDocuments] = useState<PurchaseDocumentDraft[]>([])
  const [selectedPurchaseDocumentIds, setSelectedPurchaseDocumentIds] = useState<string[]>(asset?.purchaseDocumentIds ?? [])
  const [photoLabel, setPhotoLabel] = useState("")
  const [selectedAssetPhotoFile, setSelectedAssetPhotoFile] = useState<File | null>(null)
  const [newAssetPhotos, setNewAssetPhotos] = useState<AssetPhotoDraft[]>([])
  const [nameManuallyEdited, setNameManuallyEdited] = useState(() => Boolean(asset?.id || asset?.name?.trim()))
  const [showRawJson, setShowRawJson] = useState(false)
  const [allowCrossCompanyCustodian, setAllowCrossCompanyCustodian] = useState(() => shouldAllowCrossCompanyCustodianOnLoad(asset, employees, branches, departments))
  const [allowCrossBranchLocation, setAllowCrossBranchLocation] = useState(() => shouldAllowCrossBranchLocationOnLoad(asset, locations))
  const [saving, setSaving] = useState(false)
  const [duplicateState, setDuplicateState] = useState<{
    checking: boolean
    assetTagExists: boolean
    serialNumberExists: boolean
  }>({ checking: false, assetTagExists: false, serialNumberExists: false })
  const fieldErrors = useFieldErrors<AssetField>()

  const isEdit = Boolean(asset?.id)
  const backHref = providedBackHref ?? `/${locale}/assets`
  const title = useMemo(() => (isEdit ? t("editTitle") : t("createTitle")), [isEdit, t])
  const ownershipType = normalizeAssetOwnershipType(values.ownershipType)
  const currentStatusId = asset?.statusId ?? ""
  const selectedStatus = statuses.find((status) => status.id === values.statusId)
  const currentStatus = statuses.find((status) => status.id === currentStatusId)
  const selectedStatusName = normalizeStatusOptionName(selectedStatus)
  const currentStatusIsProtected = isProtectedAssetWorkflowStatus(currentStatus)
  const selectedStatusIsProtected = isProtectedAssetWorkflowStatus(selectedStatus)
  const isStatusChanged = isEdit && Boolean(values.statusId) && values.statusId !== currentStatusId
  const isProtectedStatusChange = isStatusChanged && (currentStatusIsProtected || selectedStatusIsProtected)
  const isSelectedRepairStatus = selectedStatusName === "pending repair" || selectedStatusName === "under maintenance"
  const repairWorkflowHref = asset?.id ? `/${locale}/maintenance/new?assetId=${encodeURIComponent(asset.id)}` : ""
  // The warning's title already says "protectedStatusEditBlocked", so the plain case adds no second line.
  const protectedStatusHelp = currentStatusIsProtected
    ? t("protectedStatusCorrectionHelp")
    : isSelectedRepairStatus
      ? t("protectedStatusEditHelp")
      : null
  const assetStatusHelp = {
    title: t("statusHelpTitle"),
    description: t("statusHelpDescription"),
    items: [
      t("statusHelpReady"),
      t("statusHelpPendingRepair"),
      t("statusHelpUnderMaintenance"),
      t("statusHelpPendingDisposal"),
      t("statusHelpLostMissing"),
      t("statusHelpUnderInspection"),
    ],
  }
  const assetConditionHelp = {
    title: t("conditionHelpTitle"),
    description: t("conditionHelpDescription"),
    items: [
      t("conditionHelpGood"),
      t("conditionHelpDamaged"),
      t("conditionHelpNeedsReview"),
      t("conditionHelpMissing"),
    ],
  }

  const filteredBranches = branches.filter((branch) => branch.companyId === values.companyId)
  const filteredDepartments = departments.filter(
    (department) => !department.companyId || department.companyId === values.companyId
  )
  const selectedBranch = branches.find((branch) => branch.id === values.branchId)
  const selectedDepartment = departments.find((department) => department.id === values.departmentId)
  const filteredEmployees = allowCrossCompanyCustodian ? employees : employees.filter(
    (employee) =>
      optionMatchesOrganizationScope(employee, {
        companyId: values.companyId,
        branchId: values.branchId,
        branchCode: selectedBranch?.code,
        departmentId: values.departmentId,
        departmentCode: selectedDepartment?.code,
      })
  )
  const selectedCustodian = employees.find((employee) => employee.id === values.custodianId)
  const hasCrossCompanyCustodian = Boolean(
    selectedCustodian?.companyId &&
    values.companyId &&
    selectedCustodian.companyId !== values.companyId
  )
  const filteredLocations = allowCrossBranchLocation ? locations : locations.filter((location) => location.branchId === values.branchId)
  const selectedHomeLocation = locations.find((location) => location.id === values.homeLocationId)
  const selectedCurrentLocation = locations.find((location) => location.id === values.currentLocationId)
  const hasCrossBranchLocation =
    isCrossBranchLocation(selectedHomeLocation, values.branchId) ||
    isCrossBranchLocation(selectedCurrentLocation, values.branchId)
  const filteredModels = models.filter(
    (model) =>
      (!values.categoryId || model.categoryId === values.categoryId) &&
      (!values.brandId || model.brandId === values.brandId)
  )
  const selectedCategory = categories.find((category) => category.id === values.categoryId)
  const isSoftwareLicense = ownershipType === "software_license"
  const selectedBrand = brands.find((brand) => brand.id === values.brandId)
  const selectedModel = models.find((model) => model.id === values.modelId)
  const suggestedAssetName = useMemo(
    () => buildSuggestedAssetName(selectedCategory, selectedBrand, selectedModel),
    [selectedCategory, selectedBrand, selectedModel]
  )
  const selectedCustomFieldDefinitions = customFieldDefinitions
    .filter((definition) => definition.categoryId === values.categoryId)
    .sort((first, second) => first.sortOrder - second.sortOrder)
  const selectedTemplateFieldNames = new Set(selectedCustomFieldDefinitions.map((definition) => definition.fieldName))
  const additionalCustomFieldRows = customFieldRows.filter((row) => !selectedTemplateFieldNames.has(row.key))
  const selectedPhotoChecklist = categories.find((category) => category.id === values.categoryId)?.photoChecklist ?? []
  const legacyPhotoLabelCounts = selectedPhotoChecklist.reduce<Record<string, number>>((counts, item) => {
    const legacyLabel = legacySanitizedPhotoLabel(item)
    counts[legacyLabel] = (counts[legacyLabel] ?? 0) + 1
    return counts
  }, {})
  const existingPhotoLabels = new Set(
    selectedPhotoChecklist.filter((item) =>
      existingAssetPhotos.some((photo) => attachmentMatchesPhotoLabel(photo, item, legacyPhotoLabelCounts))
    )
  )
  const queuedPhotoLabels = new Set(newAssetPhotos.map((photo) => photo.label).filter(Boolean))
  const firstMissingPhotoLabel =
    selectedPhotoChecklist.find((item) => !queuedPhotoLabels.has(item) && !existingPhotoLabels.has(item)) ??
    selectedPhotoChecklist[0] ??
    ""
  const effectivePhotoLabel = photoLabel || firstMissingPhotoLabel
  // Prerequisites, not fields (spec §4.4): a protected status changes through its workflow (the warning under the
  // status says so), and the duplicate check has to finish. The save stays focusable and names its reason.
  const saveBlockedBy = isProtectedStatusChange ? "asset-status-protected" : duplicateState.checking ? "asset-save-reason" : null
  const focusFirstError = () =>
    fieldErrors.focusFirst(fieldOrder(selectedCustomFieldDefinitions), {
      idFor: (key) => fieldId(key, selectedCustomFieldDefinitions),
      // The raw JSON shows only after its toggle.
      reveal: (key) => {
        if (key === "customFieldsJson") setShowRawJson(true)
      },
    })
  // A rule with a message of its own reads it from the asset messages; any other code reads the hook's message.
  const errorText = (key: AssetField) => {
    const code = fieldErrors.errors[key]
    return code && isAssetMessageCode(code) ? t(code) : fieldErrors.message(key)
  }

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
    if (field in FIELD_IDS) fieldErrors.clear(field as AssetFixedField)
    // A pair or a group clears together (spec §4.3): the warranty dates, the seats, the license's assignee or department.
    if (field === "warrantyStartDate") fieldErrors.clear("warrantyEndDate")
    if (field === "licenseTotalSeats") fieldErrors.clear("licenseUsedSeats")
    if (field === "departmentId") fieldErrors.clear("custodianId")
  }

  function withSuggestedName(nextValues: AssetFormValues) {
    if (isEdit || nameManuallyEdited) return nextValues
    return { ...nextValues, name: getSuggestedAssetName(nextValues.categoryId, nextValues.brandId, nextValues.modelId) }
  }

  function getSuggestedAssetName(categoryId?: string | null, brandId?: string | null, modelId?: string | null) {
    return buildSuggestedAssetName(
      categories.find((category) => category.id === categoryId),
      brands.find((brand) => brand.id === brandId),
      models.find((model) => model.id === modelId)
    )
  }

  function handleCompanyChange(companyId: string) {
    fieldErrors.clear("companyId", "branchId", "departmentId", "custodianId", "currentLocationId")
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
    fieldErrors.clear("branchId", "custodianId", "currentLocationId")
    setValues((current) => ({
      ...current,
      branchId,
      custodianId: "",
      homeLocationId: "",
      currentLocationId: "",
    }))
  }

  function handleCrossCompanyCustodianToggle(checked: boolean) {
    setAllowCrossCompanyCustodian(checked)
    if (checked) return

    setValues((current) => {
      const custodian = employees.find((employee) => employee.id === current.custodianId)
      if (employeeMatchesAssetScope(custodian, current, branches, departments)) return current
      return { ...current, custodianId: "" }
    })
  }

  function handleCrossBranchLocationToggle(checked: boolean) {
    setAllowCrossBranchLocation(checked)
    if (checked) return

    setValues((current) => {
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
  }

  function handleOwnershipTypeChange(nextOwnershipType: string) {
    // The ownership type decides the department, the license and the parent rules.
    fieldErrors.clear("ownershipType", "departmentId", "custodianId", "licenseTotalSeats", "licenseUsedSeats", "parentAssetId")
    setValues((current) => ({
      ...current,
      ownershipType: normalizeAssetOwnershipType(nextOwnershipType),
      custodianId: nextOwnershipType === "personal" ? current.custodianId : "",
    }))
  }

  function handleCategoryChange(categoryId: string) {
    fieldErrors.clear("categoryId")
    setValues((current) =>
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
    setValues((current) => {
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
    setValues((current) =>
      withSuggestedName({
        ...current,
        modelId,
      })
    )
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saveBlockedBy) return
    fieldErrors.setErrors(
      validate({
        values,
        original: isEdit ? asset : undefined,
        duplicates: { assetTag: duplicateState.assetTagExists, serialNumber: duplicateState.serialNumberExists },
        install: installAfterCreate,
        customFields: { definitions: selectedCustomFieldDefinitions, valueOf: getCustomFieldValue },
        purchaseDocument: { file: selectedPurchaseFile, documentNo: purchaseDocumentNo, totalAmount: purchaseDocumentTotalAmount },
      }),
    )
    if (focusFirstError()) return
    setSaving(true)

    const url = isEdit ? `/api/assets/${asset?.id}` : "/api/assets"
    const method = isEdit ? "PUT" : "POST"

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      const result = await response.json().catch(() => null)
      if (!response.ok) {
        // A refusal that names a field of this form shows under it; any other keeps the toast (spec §4.1).
        if (fieldErrors.applyServer(result) && focusFirstError()) return
        throw new Error(result?.error ?? tCommon("error"))
      }

      // The asset is saved: from here on the form never stays open, or a second save would post it again. Each
      // follow-up step runs in its own try; a step that fails is named, and the page moves to the saved asset.
      const savedId: string | undefined = result?.id
      const failedSteps: string[] = []

      if (!isEdit && installAfterCreate.parentAssetId && savedId) {
        try {
          const installResponse = await fetch(`/api/assets/${installAfterCreate.parentAssetId}/components`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              componentAssetId: savedId,
              componentRole: installAfterCreate.componentRole,
              slotNo: installAfterCreate.slotNo,
              reason: installAfterCreate.reason || t("installAfterCreateDefaultReason"),
            }),
          })
          if (!installResponse.ok) throw new Error(`install ${installResponse.status}`)
        } catch {
          failedSteps.push(t("followUpInstall"))
        }
      }

      const documentsToCreate = selectedPurchaseFile && purchaseDocumentNo.trim()
        ? [
            ...newPurchaseDocuments,
            {
              id: createClientId(),
              documentType: purchaseDocumentType,
              documentNo: purchaseDocumentNo,
              documentDate: purchaseDocumentDate,
              totalAmount: purchaseDocumentTotalAmount,
              file: selectedPurchaseFile,
            },
          ]
        : newPurchaseDocuments

      if (savedId) {
        // A failed create still links the documents already selected and those created before the failure.
        const createdDocumentIds: string[] = []
        let documentsFailed = false
        try {
          if (documentsToCreate.length > 0) await createPurchaseDocuments(documentsToCreate, createdDocumentIds)
        } catch {
          documentsFailed = true
        }
        const purchaseDocumentIds = [...selectedPurchaseDocumentIds, ...createdDocumentIds]
        try {
          if (purchaseDocumentIds.length > 0) await linkPurchaseDocuments(savedId, purchaseDocumentIds)
        } catch {
          documentsFailed = true
        }
        if (documentsFailed) failedSteps.push(t("followUpDocuments"))

        const photosToUpload = selectedAssetPhotoFile
          ? [...newAssetPhotos, { id: createClientId(), label: effectivePhotoLabel, file: selectedAssetPhotoFile }]
          : newAssetPhotos
        try {
          if (photosToUpload.length > 0) await uploadAssetPhotos(savedId, photosToUpload)
        } catch {
          failedSteps.push(t("followUpPhotos"))
        }
      }

      if (failedSteps.length > 0) {
        toast.warning(t("savedWithFollowUpErrors", { items: failedSteps.join(", ") }))
        router.push(`/${locale}/assets/${savedId}`)
        router.refresh()
        return
      }

      toast.success(tCommon("savedSuccess"))
      router.push(backHref)
      router.refresh()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : ""
      if (errorMessage.includes("Protected lifecycle statuses")) toast.error(t("protectedStatusEditBlocked"))
      else apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  function setInstallField(field: keyof typeof installAfterCreate, value: string) {
    setInstallAfterCreate((current) => ({ ...current, [field]: value }))
    // The role's rule depends on the parent, so a parent change clears both.
    if (field === "parentAssetId") fieldErrors.clear("parentAssetId", "componentRole")
    else fieldErrors.clear(field === "reason" ? "installReason" : field)
  }

  function selectPurchaseFile(file: File | null) {
    setSelectedPurchaseFile(file)
    // The number's rule depends on the file, so a new file clears both.
    fieldErrors.clear("purchaseDocumentFile", "purchaseDocumentNo")
  }

  function selectAssetPhotoFile(file: File | null) {
    setSelectedAssetPhotoFile(file)
    fieldErrors.clear("assetPhotoFile")
  }

  function addPurchaseDocument() {
    // The add button checks its own two fields; the errors of the save stay as they are.
    const documentErrors = validatePurchaseDocument(selectedPurchaseFile, purchaseDocumentNo)
    if (Object.keys(documentErrors).length > 0) {
      fieldErrors.setErrors({ ...fieldErrors.errors, ...documentErrors })
      focusFirstError()
      return
    }
    if (!selectedPurchaseFile) return

    setNewPurchaseDocuments((current) => [
      ...current,
      {
        id: createClientId(),
        documentType: purchaseDocumentType,
        documentNo: purchaseDocumentNo.trim(),
        documentDate: purchaseDocumentDate,
        totalAmount: purchaseDocumentTotalAmount,
        file: selectedPurchaseFile,
      },
    ])
    setSelectedPurchaseFile(null)
    setPurchaseDocumentNo("")
    setPurchaseDocumentDate("")
    setPurchaseDocumentTotalAmount("")
  }

  function removePurchaseDocument(id: string) {
    setNewPurchaseDocuments((current) => current.filter((document) => document.id !== id))
  }

  function addAssetPhoto() {
    if (!selectedAssetPhotoFile) {
      fieldErrors.setErrors({ ...fieldErrors.errors, assetPhotoFile: "fileRequired" })
      focusFirstError()
      return
    }

    const label = effectivePhotoLabel
    const nextPhotos = [
      ...newAssetPhotos,
      {
        id: createClientId(),
        label,
        file: selectedAssetPhotoFile,
      },
    ]
    const nextQueuedLabels = new Set(nextPhotos.map((photo) => photo.label).filter(Boolean))
    const nextMissingLabel = selectedPhotoChecklist.find((item) => !nextQueuedLabels.has(item)) ?? ""

    setNewAssetPhotos(nextPhotos)
    setSelectedAssetPhotoFile(null)
    setPhotoLabel(nextMissingLabel)
  }

  function removeAssetPhoto(id: string) {
    setNewAssetPhotos((current) => current.filter((photo) => photo.id !== id))
  }

  async function uploadAssetPhotos(assetId: string, photos: AssetPhotoDraft[]) {
    for (const photo of photos) {
      const formData = new FormData()
      formData.append("file", photo.file)
      if (photo.label) formData.append("photoLabel", photo.label)

      const response = await fetch(`/api/assets/${assetId}/attachments`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error(`photo upload ${response.status}`)
    }
  }

  // Pushes each created id into createdIds as it goes, so the ids created before a failure stay with the caller.
  async function createPurchaseDocuments(documents: PurchaseDocumentDraft[], createdIds: string[]) {
    for (const document of documents) {
      const formData = new FormData()
      formData.append("file", document.file)
      formData.append("documentType", document.documentType)
      formData.append("documentNo", document.documentNo)
      if (document.documentType === "purchase_order") formData.append("poNumber", document.documentNo)
      if (document.documentType === "invoice") formData.append("invoiceNumber", document.documentNo)
      if (document.documentDate) formData.append("documentDate", document.documentDate)
      if (document.totalAmount) formData.append("totalAmount", document.totalAmount)
      if (values.supplierId) formData.append("supplierId", values.supplierId)
      formData.append("currency", "THB")

      const response = await fetch("/api/purchase-documents", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error(`purchase document upload ${response.status}`)
      const createdDocument = await response.json()
      if (createdDocument?.id) createdIds.push(createdDocument.id)
    }
  }

  async function linkPurchaseDocuments(assetId: string, purchaseDocumentIds: string[]) {
    const response = await fetch(`/api/assets/${assetId}/purchase-documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchaseDocumentIds }),
    })
    if (!response.ok) throw new Error(`purchase document link ${response.status}`)
  }

  function togglePurchaseDocument(id: string) {
    setSelectedPurchaseDocumentIds((current) =>
      current.includes(id) ? current.filter((documentId) => documentId !== id) : [...current, id]
    )
  }

  function handleCustomFieldRowsChange(nextRows: CustomFieldRow[]) {
    setCustomFieldRows(nextRows)
    setField("customFieldsJson", serializeCustomFieldRows(nextRows))
  }

  function handleAdditionalCustomFieldRowsChange(nextAdditionalRows: CustomFieldRow[]) {
    const templateRows = customFieldRows.filter((row) => selectedTemplateFieldNames.has(row.key))
    handleCustomFieldRowsChange([...templateRows, ...nextAdditionalRows])
  }

  function handleTemplateCustomFieldChange(fieldName: string, value: string) {
    const existingRow = customFieldRows.find((row) => row.key === fieldName)
    const nextRows = existingRow
      ? customFieldRows.map((row) => (row.id === existingRow.id ? { ...row, value } : row))
      : [...customFieldRows, createCustomFieldRow(fieldName, value)]

    handleCustomFieldRowsChange(nextRows)
    fieldErrors.clear(customFieldKey(fieldName))
  }

  function getCustomFieldValue(fieldName: string) {
    return customFieldRows.find((row) => row.key === fieldName)?.value ?? ""
  }

  function handleRawJsonChange(value: string) {
    setField("customFieldsJson", value)

    const parsedRows = parseCustomFieldRows(value)
    if (parsedRows.length > 0 || !value.trim()) {
      setCustomFieldRows(parsedRows)
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={title}
        meta={t("subtitle")}
        className="mb-6"
        back={<PageBackLink href={backHref} label={tCommon("back")} />}
      />

      {/* Spec 2D D7: where this new asset comes from is information, an inline info Notice (no warning box, no icon tile). */}
      {cloneSource ? (
        <Notice
          tone="info"
          className="mb-5"
          title={t("cloneBannerTitle", { assetTag: cloneSource.assetTag })}
        >
          <p className="break-words">{t("cloneBannerDescription", { assetName: cloneSource.name })}</p>
          <p className="mt-1 break-words">{t("cloneBannerReview")}</p>
        </Notice>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Section title={t("basicInfo")}>
          {/* The duplicate check stays live (spec U8); a save that finds it focuses the field and shows the same line. */}
          <Field
            label={t("assetTag")}
            id="asset-tag"
            liveError={duplicateState.assetTagExists ? t("duplicateAssetTag") : null}
            error={duplicateState.assetTagExists ? t("duplicateAssetTag") : errorText("assetTag")}
          >
            <Input
              value={values.assetTag ?? ""}
              onChange={(event) => setField("assetTag", event.target.value)}
              maxLength={50}
              placeholder={t("autoTagHint")}
            />
          </Field>
          <div className="grid min-w-0 gap-2">
            <Field label={t("assetName")} id="asset-name" required hint={t("assetNameHelp")} error={errorText("name")}>
              <Input
                value={values.name}
                onChange={(event) => {
                  setNameManuallyEdited(true)
                  setField("name", event.target.value)
                }}
                maxLength={200}
                required
              />
            </Field>
            {suggestedAssetName && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-meta text-muted-foreground">
                  {t("suggestedAssetName")}: <span className="font-medium text-foreground">{suggestedAssetName}</span>
                </span>
                {values.name !== suggestedAssetName && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNameManuallyEdited(false)
                      setField("name", suggestedAssetName)
                    }}
                  >
                    {t("useSuggestedName")}
                  </Button>
                )}
              </div>
            )}
          </div>
          <SelectField label={t("category")} id="asset-category" value={values.categoryId} required error={errorText("categoryId")} onChange={handleCategoryChange}>
            <option value="">{t("selectCategory")}</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
          </SelectField>
          <SelectField label={t("brand")} value={values.brandId ?? ""} onChange={handleBrandChange}>
            <option value="">{t("selectBrand")}</option>
            {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.label}</option>)}
          </SelectField>
          <SelectField label={t("model")} value={values.modelId ?? ""} onChange={handleModelChange}>
            <option value="">{t("selectModel")}</option>
            {filteredModels.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
          </SelectField>
          <Field
            label={isSoftwareLicense ? t("licenseKey") : t("serialNumber")}
            id="asset-serial-number"
            liveError={duplicateState.serialNumberExists ? t("duplicateSerialNumber") : null}
            error={duplicateState.serialNumberExists ? t("duplicateSerialNumber") : errorText("serialNumber")}
          >
            <ScannerTextInput
              value={values.serialNumber ?? ""}
              onChange={(value) => setField("serialNumber", value)}
              maxLength={100}
              disabled={saving}
              labels={{
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
              }}
            />
          </Field>
        </Section>

        <Section title={t("ownership")}>
          <div className="md:col-span-2">
            <SelectField
              label={t("ownershipType")}
              id="asset-ownership-type"
              value={ownershipType}
              required
              hint={t(`ownershipType_${ownershipType}_help`)}
              error={errorText("ownershipType")}
              onChange={handleOwnershipTypeChange}
            >
              {assetOwnershipTypes.map((type) => (
                <option key={type} value={type}>{t(`ownershipType_${type}`)}</option>
              ))}
            </SelectField>
          </div>
          <SelectField
            label={t("assetOwnerCompany")}
            id="asset-company"
            value={values.companyId}
            required
            hint={t("assetOwnerCompanyHelp")}
            error={errorText("companyId")}
            onChange={handleCompanyChange}
          >
            <option value="">{t("selectCompany")}</option>
            {companies.map((company) => <option key={company.id} value={company.id}>{company.label}</option>)}
          </SelectField>
          <SelectField
            label={t("assetOwnerBranch")}
            id="asset-branch"
            value={values.branchId}
            required
            hint={t("assetOwnerBranchHelp")}
            error={errorText("branchId")}
            onChange={handleBranchChange}
          >
            <option value="">{t("selectBranch")}</option>
            {filteredBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.label}</option>)}
          </SelectField>
          <SelectField
            label={t("department")}
            id="asset-department"
            value={values.departmentId ?? ""}
            required={ownershipType !== "personal" && !isSoftwareLicense}
            error={errorText("departmentId")}
            onChange={(value) => setField("departmentId", value)}
          >
            <option value="">{t("selectDepartment")}</option>
            {filteredDepartments.map((department) => <option key={department.id} value={department.id}>{department.label}</option>)}
          </SelectField>
          {ownershipType === "personal" || isSoftwareLicense ? (
            <div>
              <SearchableSelect
                id="asset-custodian"
                label={isSoftwareLicense ? t("licenseAssignee") : t("custodian")}
                value={values.custodianId ?? ""}
                options={filteredEmployees}
                placeholder={isSoftwareLicense ? t("selectLicenseAssignee") : t("selectCustodian")}
                searchPlaceholder={tCommon("searchSelectPlaceholder")}
                emptyLabel={tCommon("searchSelectNoResults")}
                error={errorText("custodianId")}
                onChange={(value) => setField("custodianId", value)}
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
          ) : (
            <Notice tone="neutral" title={t("custodianNotRequired")}>
              {t("custodianNotRequiredHelp")}
            </Notice>
          )}
        </Section>

        {isSoftwareLicense && (
          <Section title={t("licenseManagement")}>
            {/* The server lets the total stay empty, so it has no star (spec §11 call 8). */}
            <Field label={t("licenseTotalSeats")} id="asset-license-total-seats" error={errorText("licenseTotalSeats")}>
              <Input
                type="number"
                min="0"
                step="1"
                value={values.licenseTotalSeats ?? ""}
                onChange={(event) => setField("licenseTotalSeats", event.target.value)}
              />
            </Field>
            <Field label={t("licenseUsedSeats")} id="asset-license-used-seats" error={errorText("licenseUsedSeats")}>
              <Input
                type="number"
                min="0"
                step="1"
                value={values.licenseUsedSeats ?? ""}
                onChange={(event) => setField("licenseUsedSeats", event.target.value)}
              />
            </Field>
            <SelectField
              label={t("licenseAssignedAsset")}
              value={values.licenseAssignedAssetId ?? ""}
              onChange={(value) => setField("licenseAssignedAssetId", value)}
            >
              <option value="">{t("selectLicenseAssignedAsset")}</option>
              {parentAssets.map((parentAsset) => (
                <option key={parentAsset.id} value={parentAsset.id}>{parentAsset.label}</option>
              ))}
            </SelectField>
            <Notice
              tone="info"
              title={<>{t("licenseRemainingSeats")}: {orNil(getRemainingLicenseSeats(values.licenseTotalSeats, values.licenseUsedSeats))}</>}
            >
              {t("licenseManagementHelp")}
            </Notice>
          </Section>
        )}

        <Section title={t("locationStatus")}>
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
          <SelectField label={t("homeLocation")} value={values.homeLocationId ?? ""} onChange={(value) => setField("homeLocationId", value)}>
            <option value="">{t("selectLocation")}</option>
            {filteredLocations.map((location) => <option key={location.id} value={location.id}>{getLocationOptionLabel(location, allowCrossBranchLocation, branches)}</option>)}
          </SelectField>
          <SelectField
            label={t("currentLocation")}
            id="asset-current-location"
            value={values.currentLocationId}
            required
            error={errorText("currentLocationId")}
            onChange={(value) => setField("currentLocationId", value)}
          >
            <option value="">{t("selectLocation")}</option>
            {filteredLocations.map((location) => <option key={location.id} value={location.id}>{getLocationOptionLabel(location, allowCrossBranchLocation, branches)}</option>)}
          </SelectField>
          <div>
            <Field
              label={t("status")}
              id="asset-status"
              required
              labelAction={<AssetStateHelpPopover {...assetStatusHelp} />}
              hint={selectedStatus?.description}
              error={errorText("statusId")}
            >
              <NativeSelect value={values.statusId} required onChange={(event) => setField("statusId", event.target.value)}>
                <option value="">{t("selectStatus")}</option>
                {statuses.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
              </NativeSelect>
            </Field>
            {/* The save's reason while this change is blocked: the save names it with aria-describedby. */}
            {isProtectedStatusChange && (
              <Notice id="asset-status-protected" tone="warning" className="mt-2" title={t("protectedStatusEditBlocked")}>
                {protectedStatusHelp ? (
                  <>
                    <p>{protectedStatusHelp}</p>
                    {isSelectedRepairStatus && repairWorkflowHref && (
                      <Link href={repairWorkflowHref} className={cn(linkVariants({ size: "inherit" }), "mt-2 inline-flex decoration-current")}>
                        {t("openRepairWorkflow")}
                      </Link>
                    )}
                  </>
                ) : null}
              </Notice>
            )}
          </div>
          <Field
            label={t("condition")}
            id="asset-condition"
            required
            labelAction={<AssetStateHelpPopover {...assetConditionHelp} />}
            hint={conditions.find((condition) => condition.id === values.conditionId)?.description}
            error={errorText("conditionId")}
          >
            <NativeSelect value={values.conditionId} required onChange={(event) => setField("conditionId", event.target.value)}>
              <option value="">{t("selectCondition")}</option>
              {conditions.map((condition) => <option key={condition.id} value={condition.id}>{condition.label}</option>)}
            </NativeSelect>
          </Field>
        </Section>

        {!isEdit && (
          <Section title={t("installAfterCreate")}>
            <div className="md:col-span-2">
              <p className="text-sm text-muted-foreground">
                {ownershipType === "component" ? t("installAfterCreateComponentHelp") : t("installAfterCreateHelp")}
              </p>
            </div>
            <SelectField
              label={t("parentAsset")}
              id="asset-install-parent"
              value={installAfterCreate.parentAssetId}
              error={errorText("parentAssetId")}
              onChange={(value) => setInstallField("parentAssetId", value)}
            >
              <option value="">{t("skipInstallAfterCreate")}</option>
              {parentAssets.map((parentAsset) => (
                <option key={parentAsset.id} value={parentAsset.id}>{parentAsset.label}</option>
              ))}
            </SelectField>
            <Field
              label={t("componentRole")}
              id="asset-install-role"
              required={Boolean(installAfterCreate.parentAssetId)}
              error={errorText("componentRole")}
            >
              <Input
                value={installAfterCreate.componentRole}
                onChange={(event) => setInstallField("componentRole", event.target.value)}
                maxLength={100}
                placeholder="Harddisk"
                disabled={!installAfterCreate.parentAssetId}
              />
            </Field>
            <Field label={t("slotNo")} id="asset-install-slot" error={errorText("slotNo")}>
              <Input
                value={installAfterCreate.slotNo}
                onChange={(event) => setInstallField("slotNo", event.target.value)}
                maxLength={50}
                placeholder="Slot 1"
                disabled={!installAfterCreate.parentAssetId}
              />
            </Field>
            <Field label={t("reason")} id="asset-install-reason" error={errorText("installReason")}>
              <Input
                value={installAfterCreate.reason}
                onChange={(event) => setInstallField("reason", event.target.value)}
                maxLength={500}
                disabled={!installAfterCreate.parentAssetId}
              />
            </Field>
          </Section>
        )}

        {/* The anchor of the asset page's "บันทึกข้อมูลการซื้อ" and "เพิ่มข้อมูล" (group 1 asset detail task 8). */}
        <div id="purchase" className="scroll-mt-24">
          <Section title={t("purchaseWarranty")}>
            <Field label={t("purchaseDate")} id="asset-purchase-date" error={errorText("purchaseDate")}>
              <Input type="date" value={values.purchaseDate ?? ""} onChange={(event) => setField("purchaseDate", event.target.value)} />
            </Field>
            <Field label={t("purchasePriceBaht")} id="asset-purchase-price" error={errorText("purchasePrice")}>
              <Input type="number" min="0" step="0.01" inputMode="decimal" value={values.purchasePrice ?? ""} onChange={(event) => setField("purchasePrice", event.target.value)} />
            </Field>
            <SelectField label={t("supplier")} value={values.supplierId ?? ""} onChange={(value) => setField("supplierId", value)}>
              <option value="">{t("selectSupplier")}</option>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.label}</option>)}
            </SelectField>
            {/* The end cannot be picked before the start (spec U4, §7.4). */}
            <Field label={t("warrantyStart")} id="asset-warranty-start" error={errorText("warrantyStartDate")}>
              <Input
                type="date"
                value={values.warrantyStartDate ?? ""}
                max={values.warrantyEndDate || undefined}
                onChange={(event) => setField("warrantyStartDate", event.target.value)}
              />
            </Field>
            <Field label={t("warrantyEnd")} id="asset-warranty-end" error={errorText("warrantyEndDate")}>
              <Input
                type="date"
                value={values.warrantyEndDate ?? ""}
                min={values.warrantyStartDate || undefined}
                onChange={(event) => setField("warrantyEndDate", event.target.value)}
              />
            </Field>
            <Field label={t("fixedAssetCode")} id="asset-fixed-asset-code" error={errorText("fixedAssetCode")}>
              <Input value={values.fixedAssetCode ?? ""} onChange={(event) => setField("fixedAssetCode", event.target.value)} maxLength={50} />
            </Field>
            <Field label={t("poNumber")} id="asset-po-number" error={errorText("poNumber")}>
              <Input value={values.poNumber ?? ""} onChange={(event) => setField("poNumber", event.target.value)} maxLength={50} />
            </Field>
            <Field label={t("invoiceNumber")} id="asset-invoice-number" error={errorText("invoiceNumber")}>
              <Input value={values.invoiceNumber ?? ""} onChange={(event) => setField("invoiceNumber", event.target.value)} maxLength={50} />
            </Field>
            <div className="md:col-span-2">
              <div className="rounded-md border border-border bg-background p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-foreground">{t("purchaseDocuments")}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t("purchaseDocumentsHelp")}</p>
                </div>

                <div className="mb-4 space-y-2">
                  <h4 className="text-meta font-medium text-muted-foreground">{t("existingPurchaseDocuments")}</h4>
                  {purchaseDocumentOptions.length === 0 ? (
                    <EmptyNote>{t("noPurchaseDocuments")}</EmptyNote>
                  ) : (
                    // Each document is a shared ChoiceCard (spec 2D D9): Enter in it no longer submits the form.
                    <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                      {purchaseDocumentOptions.map((document) => (
                        <ChoiceCard
                          key={document.id}
                          type="checkbox"
                          checked={selectedPurchaseDocumentIds.includes(document.id)}
                          onChange={() => togglePurchaseDocument(document.id)}
                          label={<>{t(`purchaseDocumentTypes.${document.documentType}`)} · <span className="tag">{document.documentNo}</span></>}
                          description={<>{orNil(document.supplierName)} · {t("linkedAssets", { count: document.assetCount })}</>}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-4">
                  <h4 className="mb-3 text-meta font-medium text-muted-foreground">{t("createPurchaseDocument")}</h4>
                  <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-4">
                    <Field label={t("documentType")}>
                      <NativeSelect
                        value={purchaseDocumentType}
                        onChange={(event) => setPurchaseDocumentType(event.target.value as (typeof purchaseDocumentTypes)[number])}
                      >
                        {purchaseDocumentTypes.map((type) => (
                          <option key={type} value={type}>{t(`purchaseDocumentTypes.${type}`)}</option>
                        ))}
                      </NativeSelect>
                    </Field>
                    <Field label={t("purchaseDocumentNo")} id="asset-purchase-document-no" error={errorText("purchaseDocumentNo")}>
                      <Input
                        value={purchaseDocumentNo}
                        onChange={(event) => {
                          setPurchaseDocumentNo(event.target.value)
                          fieldErrors.clear("purchaseDocumentNo")
                        }}
                        maxLength={100}
                      />
                    </Field>
                    <Field label={t("purchaseDocumentDate")}>
                      <Input type="date" value={purchaseDocumentDate} onChange={(event) => setPurchaseDocumentDate(event.target.value)} />
                    </Field>
                    <Field label={t("purchaseDocumentAmountBaht")} id="asset-purchase-document-amount" error={errorText("purchaseDocumentAmount")}>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={purchaseDocumentTotalAmount}
                        onChange={(event) => {
                          setPurchaseDocumentTotalAmount(event.target.value)
                          fieldErrors.clear("purchaseDocumentAmount")
                        }}
                      />
                    </Field>
                  </div>
                  {/* The drop box's title is its name, so it takes the field's id, error tie and look itself (no Field label). */}
                  <FileDropzone
                    file={selectedPurchaseFile}
                    onFileChange={selectPurchaseFile}
                    id="asset-purchase-document-file"
                    aria-invalid={fieldErrors.errors.purchaseDocumentFile ? true : undefined}
                    aria-describedby={fieldErrors.errors.purchaseDocumentFile ? "asset-purchase-document-file-error" : undefined}
                    disabled={saving}
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.doc,.docx"
                    title={t("dropPurchaseDocumentTitle")}
                    hint={t("dropFileSelected")}
                    browseLabel={t("dropFileHint")}
                  />
                  {fieldErrors.errors.purchaseDocumentFile ? (
                    <FieldError id="asset-purchase-document-file-error" className="mt-1.5">{errorText("purchaseDocumentFile")}</FieldError>
                  ) : null}
                </div>

                <Button variant="outline" size="md" className="mt-3" onClick={addPurchaseDocument} disabled={saving}>
                  <Plus aria-hidden="true" />
                  {t("addPurchaseDocument")}
                </Button>

                {newPurchaseDocuments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {newPurchaseDocuments.map((document) => (
                      <div key={document.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-foreground">
                            {t(`purchaseDocumentTypes.${document.documentType}`)} · {document.documentNo} · {document.file.name}
                          </div>
                          <div className="mt-0.5 text-meta text-muted-foreground">{formatFileSize(document.file.size)}</div>
                        </div>
                        <Button
                          variant="danger"
                          size="icon-sm"
                          className="shrink-0"
                          onClick={() => removePurchaseDocument(document.id)}
                          aria-label={t("removePurchaseDocument")}
                          title={t("removePurchaseDocument")}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Section>
        </div>

        <Section title={t(isEdit ? "assetPhotos" : "initialAssetPhotos")}>
          <div className="md:col-span-2 rounded-md border border-border bg-background p-4">
            <p className="mb-3 text-sm text-muted-foreground">{t(isEdit ? "assetPhotosEditHelp" : "initialAssetPhotosHelp")}</p>

            {selectedPhotoChecklist.length > 0 ? (
              <div className="mb-3">
                <fieldset className="min-w-0" aria-describedby={photoLabelHintId}>
                  <legend className={fieldLabelClasses}>{t("selectPhotoType")}</legend>
                  <p id={photoLabelHintId} className="mt-1 text-meta text-faint-foreground">
                    {t("autoPhotoLabelHint", { label: effectivePhotoLabel || t("generalPhoto") })}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedPhotoChecklist.map((item) => {
                      const isSelected = effectivePhotoLabel === item
                      const isQueued = queuedPhotoLabels.has(item)
                      const alreadyExists = existingPhotoLabels.has(item)

                      return (
                        <ChoiceChip
                          key={item}
                          type="radio"
                          name={photoLabelRadioName}
                          checked={isSelected}
                          onChange={() => setPhotoLabel(item)}
                          label={item}
                          detail={
                            <span className={alreadyExists || isQueued ? "text-success" : undefined}>
                              {alreadyExists ? t("photoChecklistDone") : isQueued ? t("photoChecklistQueued") : t("photoChecklistPending")}
                            </span>
                          }
                        />
                      )
                    })}
                  </div>
                </fieldset>
              </div>
            ) : (
              <EmptyNote className="mb-3">
                {values.categoryId ? t("photoChecklistEmptyForCategory") : t("photoChecklistSelectCategory")}
              </EmptyNote>
            )}

            <FileDropzone
              file={selectedAssetPhotoFile}
              onFileChange={selectAssetPhotoFile}
              id="asset-photo-file"
              aria-invalid={fieldErrors.errors.assetPhotoFile ? true : undefined}
              aria-describedby={fieldErrors.errors.assetPhotoFile ? "asset-photo-file-error" : undefined}
              disabled={saving}
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif"
              capture="environment"
              title={t("dropAssetPhotoTitle")}
              hint={t("dropFileSelected")}
              browseLabel={t("dropAssetPhotoHint")}
            />
            {fieldErrors.errors.assetPhotoFile ? (
              <FieldError id="asset-photo-file-error" className="mt-1.5">{errorText("assetPhotoFile")}</FieldError>
            ) : null}

            {existingAssetPhotos.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-3 text-sm font-semibold text-foreground">{t("existingAssetPhotos")}</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {existingAssetPhotos.map((photo) => (
                    <a
                      key={photo.id}
                      href={`/api/attachments/${photo.id}?inline=1`}
                      target="_blank"
                      rel="noreferrer"
                      className="overflow-hidden rounded-md border border-border bg-surface transition-colors hover:border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="flex aspect-video items-center justify-center bg-background p-2">
                        {/* Authenticated attachment URLs render more reliably as browser-native images. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/attachments/${photo.id}?inline=1`}
                          alt={photo.originalName}
                          width={240}
                          height={160}
                          loading="lazy"
                          className="max-h-full w-full object-contain bg-image-stage"
                        />
                      </div>
                      <div className="border-t border-border p-2">
                        <div className="truncate text-meta font-medium text-foreground">{photo.originalName}</div>
                        <div className="mt-0.5 text-meta text-muted-foreground">{formatFileSize(photo.fileSize)}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
            <Button variant="outline" size="md" className="mt-3" onClick={addAssetPhoto} disabled={saving}>
              <Plus aria-hidden="true" />
              {effectivePhotoLabel ? t("addAssetPhotoWithLabel", { label: effectivePhotoLabel }) : t("addAssetPhoto")}
            </Button>

            {newAssetPhotos.length > 0 && (
              <div className="mt-4 space-y-2">
                {newAssetPhotos.map((photo) => (
                  <div key={photo.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">
                        {photo.label ? `${photo.label} · ` : ""}{photo.file.name}
                      </div>
                      <div className="mt-0.5 text-meta text-muted-foreground">{formatFileSize(photo.file.size)}</div>
                    </div>
                    <Button
                      variant="danger"
                      size="icon-sm"
                      className="shrink-0"
                      onClick={() => removeAssetPhoto(photo.id)}
                      aria-label={t("removeAssetPhoto")}
                      title={t("removeAssetPhoto")}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        <Section title={t("customFields")}>
          <div className="md:col-span-2">
            <Field label={t("remark")}>
              <Textarea value={values.remark ?? ""} onChange={(event) => setField("remark", event.target.value)} rows={4} className="min-h-28" />
            </Field>
          </div>
          <div className="md:col-span-2">
            <div className="space-y-4 border-t border-border pt-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{t("customFieldsStructuredTitle")}</h3>
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("customFieldsStructuredHelp")}</p>
                </div>
                <Button variant="outline" size="md" onClick={() => setShowRawJson((current) => !current)}>
                  <Code2 aria-hidden="true" />
                  {showRawJson ? t("hideJson") : t("showJson")}
                </Button>
              </div>

              {selectedCustomFieldDefinitions.length > 0 ? (
                <TemplateCustomFields
                  definitions={selectedCustomFieldDefinitions}
                  locale={locale}
                  getValue={getCustomFieldValue}
                  getError={(fieldName) => errorText(customFieldKey(fieldName))}
                  onChange={handleTemplateCustomFieldChange}
                />
              ) : (
                <EmptyNote>{values.categoryId ? t("customFieldsNoTemplate") : t("customFieldsSelectCategory")}</EmptyNote>
              )}

              <div className="space-y-3 border-t border-border pt-4">
                <h4 className="text-sm font-semibold text-foreground">{t("customFieldsAdditional")}</h4>
                <CustomFieldRowsEditor
                  rows={additionalCustomFieldRows}
                  labels={{
                    key: t("customFieldKey"),
                    value: t("customFieldValue"),
                    add: t("addCustomField"),
                    remove: t("removeCustomField"),
                    empty: t("customFieldsEmpty"),
                  }}
                  onChange={handleAdditionalCustomFieldRowsChange}
                />
              </div>

              {showRawJson && (
                <Field label={t("customFieldsJson")} id="asset-custom-fields-json" hint={t("customFieldsJsonHelp")} error={errorText("customFieldsJson")}>
                  <Textarea
                    value={values.customFieldsJson ?? ""}
                    onChange={(event) => handleRawJsonChange(event.target.value)}
                    rows={5}
                    className="min-h-32 font-mono"
                  />
                </Field>
              )}
            </div>
          </div>
          <label className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm">
            <input type="checkbox" checked={values.isActive} onChange={(event) => setField("isActive", event.target.checked)} className={checkboxVariants()} />
            {tCommon("active")}
          </label>
        </Section>

        <StickyFormFooter status={duplicateState.checking ? <span id="asset-save-reason">{t("duplicateCheckPending")}</span> : undefined}>
          <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
            {tCommon("cancel")}
          </Link>
          <Button
            type="submit"
            busy={saving}
            aria-disabled={saveBlockedBy ? true : undefined}
            aria-describedby={saveBlockedBy ?? undefined}
          >
            <Save aria-hidden="true" />
            {tCommon("save")}
          </Button>
        </StickyFormFooter>
      </form>
    </div>
  )
}

// Spec 2D D9: each form section is a ContentPanel (16px title, 16/20px padding), the frame of every other panel.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <ContentPanel title={title}>
      <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">{children}</div>
    </ContentPanel>
  )
}

// Keeps the name and props it had before 2C, so its 12 call sites stay as they are. hint carries the help line
// that used to sit in a <p> under 3 of them (spec 2C section 4.3 F6).
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

function getRemainingLicenseSeats(total?: string | number | null, used?: string | number | null) {
  const totalSeats = Number(total ?? 0)
  const usedSeats = Number(used ?? 0)
  if (!Number.isFinite(totalSeats) || totalSeats <= 0) return null
  const remainingSeats = Math.max(totalSeats - (Number.isFinite(usedSeats) ? usedSeats : 0), 0)
  return formatCount(remainingSeats)
}

function isProtectedAssetWorkflowStatus(status: Option | null | undefined) {
  return protectedAssetWorkflowStatuses.has(normalizeStatusOptionName(status))
}

function normalizeStatusOptionName(status: Option | null | undefined) {
  return status?.name?.trim().toLowerCase() ?? ""
}

function CustomFieldRowsEditor({
  rows,
  labels,
  onChange,
}: {
  rows: CustomFieldRow[]
  labels: {
    key: string
    value: string
    add: string
    remove: string
    empty: string
  }
  onChange: (rows: CustomFieldRow[]) => void
}) {
  function updateRow(id: string, field: "key" | "value", value: string) {
    onChange(rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
  }

  function removeRow(id: string) {
    onChange(rows.filter((row) => row.id !== id))
  }

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <EmptyNote>{labels.empty}</EmptyNote>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)_auto]">
              <Field label={labels.key} hideLabel>
                <Input value={row.key} onChange={(event) => updateRow(row.id, "key", event.target.value)} placeholder={labels.key} />
              </Field>
              <Field label={labels.value} hideLabel>
                <Input value={row.value} onChange={(event) => updateRow(row.id, "value", event.target.value)} placeholder={labels.value} />
              </Field>
              <Button
                variant="outline"
                size="icon-lg"
                className="justify-self-start"
                onClick={() => removeRow(row.id)}
                aria-label={labels.remove}
                title={labels.remove}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button variant="outline" size="md" onClick={() => onChange([...rows, createCustomFieldRow()])}>
        <Plus aria-hidden="true" />
        {labels.add}
      </Button>
    </div>
  )
}

function TemplateCustomFields({
  definitions,
  locale,
  getValue,
  getError,
  onChange,
}: {
  definitions: CustomFieldDefinition[]
  locale: string
  getValue: (fieldName: string) => string
  getError: (fieldName: string) => string | undefined
  onChange: (fieldName: string, value: string) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {definitions.map((definition, index) => (
        <TemplateField
          key={definition.id}
          id={`asset-custom-field-${index}`}
          definition={definition}
          label={getTemplateFieldLabel(definition, locale)}
          value={getValue(definition.fieldName)}
          error={getError(definition.fieldName)}
          onChange={(value) => onChange(definition.fieldName, value)}
        />
      ))}
    </div>
  )
}

function TemplateField({
  id,
  definition,
  label,
  value,
  error,
  onChange,
}: {
  // The id fieldId() gives this field's key: its place in the template.
  id: string
  definition: CustomFieldDefinition
  label: string
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  if (definition.fieldType === "boolean") {
    // A checkbox has no Field: its error sits under the box and is tied to the checkbox.
    return (
      <div className="grid min-w-0 content-start gap-1.5">
        <label className="flex min-h-10 items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm">
          <input
            id={id}
            type="checkbox"
            checked={value === "true"}
            onChange={(event) => onChange(event.target.checked ? "true" : "false")}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className={checkboxVariants()}
          />
          {label}
        </label>
        {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
      </div>
    )
  }

  if (definition.fieldType === "select") {
    return (
      <Field label={label} id={id} required={definition.isRequired} error={error}>
        <NativeSelect value={value} required={definition.isRequired} onChange={(event) => onChange(event.target.value)}>
          <option value=""></option>
          {definition.options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </NativeSelect>
      </Field>
    )
  }

  return (
    <Field label={label} id={id} required={definition.isRequired} error={error}>
      <Input
        type={definition.fieldType === "number" ? "number" : definition.fieldType === "date" ? "date" : "text"}
        value={value}
        required={definition.isRequired}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  )
}

function shouldAllowCrossCompanyCustodianOnLoad(
  current: AssetFormValues | undefined,
  employees: Option[],
  branches: Option[],
  departments: Option[]
) {
  if (!current?.custodianId) return false
  const custodian = employees.find((employee) => employee.id === current.custodianId)
  return !employeeMatchesAssetScope(custodian, current, branches, departments)
}

function employeeMatchesAssetScope(
  employee: Option | undefined,
  current: AssetFormValues,
  branches: Option[],
  departments: Option[]
) {
  if (!employee) return true
  const branch = branches.find((item) => item.id === current.branchId)
  const department = departments.find((item) => item.id === current.departmentId)

  return optionMatchesOrganizationScope(employee, {
    companyId: current.companyId,
    branchId: current.branchId,
    branchCode: branch?.code,
    departmentId: current.departmentId,
    departmentCode: department?.code,
  })
}

function shouldAllowCrossBranchLocationOnLoad(current: AssetFormValues | undefined, locations: Option[]) {
  if (!current?.branchId) return false
  return [current.homeLocationId, current.currentLocationId].some((locationId) => {
    const location = locations.find((item) => item.id === locationId)
    return isCrossBranchLocation(location, current.branchId)
  })
}

function isCrossBranchLocation(location: Option | undefined, branchId?: string | null) {
  return Boolean(location?.branchId && branchId && location.branchId !== branchId)
}

function locationMatchesAssetBranch(location: Option | undefined, branchId?: string | null) {
  if (!location) return true
  if (!branchId) return false
  return !location.branchId || location.branchId === branchId
}

function getLocationOptionLabel(location: Option, includeBranch: boolean, branches: Option[]) {
  if (!includeBranch || !location.branchId) return location.label
  const branch = branches.find((item) => item.id === location.branchId)
  return branch ? `${location.label} (${branch.label})` : location.label
}

function createCustomFieldRow(key = "", value = ""): CustomFieldRow {
  return {
    id: createClientId(),
    key,
    value,
  }
}

function createClientId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
}

function attachmentMatchesPhotoLabel(
  attachment: ExistingAssetPhoto,
  label: string,
  legacyLabelCounts: Record<string, number>
) {
  const normalizedLabel = normalizePhotoLabel(label)
  const legacyLabel = legacySanitizedPhotoLabel(label)
  const legacyLabelIsSafeFallback = Boolean(legacyLabel) && legacyLabelCounts[legacyLabel] === 1

  return [label, normalizedLabel, legacyLabelIsSafeFallback ? legacyLabel : ""]
    .filter(Boolean)
    .some((candidate) => attachment.originalName.startsWith(`${candidate} - `))
}

function normalizePhotoLabel(label: string) {
  return label.replace(/[\\/:*?"<>|\r\n]+/g, " ").replace(/\s+/g, " ").trim()
}

function legacySanitizedPhotoLabel(label: string) {
  const normalized = label.normalize("NFKD")
  return normalized.replace(/[^\w.\- ]+/g, "_").replace(/\s+/g, " ").trim()
}

function parseCustomFieldRows(json?: string | null): CustomFieldRow[] {
  if (!json?.trim()) {
    return []
  }

  try {
    const parsed = JSON.parse(json) as unknown
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      return []
    }

    return Object.entries(parsed).map(([key, value]) =>
      createCustomFieldRow(key, typeof value === "string" ? value : JSON.stringify(value))
    )
  } catch {
    return []
  }
}

function serializeCustomFieldRows(rows: CustomFieldRow[]) {
  const data = rows.reduce<Record<string, string>>((current, row) => {
    const key = row.key.trim()
    if (key) {
      current[key] = row.value.trim()
    }
    return current
  }, {})

  return Object.keys(data).length > 0 ? JSON.stringify(data, null, 2) : ""
}

function isValidCustomFieldsJson(json?: string | null) {
  if (!json?.trim()) {
    return true
  }

  try {
    const parsed = JSON.parse(json) as unknown
    return Boolean(parsed) && typeof parsed === "object" && !Array.isArray(parsed)
  } catch {
    return false
  }
}

function getTemplateFieldLabel(definition: CustomFieldDefinition, locale: string) {
  if (locale === "th" && definition.fieldLabelTh) {
    return definition.fieldLabelTh
  }

  return definition.fieldLabel
}
