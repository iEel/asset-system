"use client"

import { useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { AlertTriangle, ArrowLeft, Camera, Code2, Copy, FileText, Loader2, Plus, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { ScannerTextInput } from "@/components/ui/scanner-text-input"
import { AssetStateHelpPopover } from "@/components/assets/asset-state-help-popover"
import { buildSuggestedAssetName } from "@/lib/asset-name-suggestion"
import { resolveModelIdForScope } from "@/lib/asset-model-selection"
import { assetOwnershipTypes, defaultAssetOwnershipType, normalizeAssetOwnershipType } from "@/lib/asset-ownership"
import { optionMatchesOrganizationScope } from "@/lib/organization-option-filter"
import { formatFileSize } from "@/lib/uploads"

type Option = {
  id: string
  label: string
  name?: string | null
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
  const isSelectedPendingRepair = selectedStatusName === "pending repair"
  const repairWorkflowHref = asset?.id ? `/${locale}/maintenance?assetId=${encodeURIComponent(asset.id)}` : ""
  const protectedStatusHelp = currentStatusIsProtected
    ? t("protectedStatusCorrectionHelp")
    : isSelectedPendingRepair
      ? t("protectedStatusEditHelp")
      : t("protectedStatusEditBlocked")
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
    setValues((current) => ({
      ...current,
      ownershipType: normalizeAssetOwnershipType(nextOwnershipType),
      custodianId: nextOwnershipType === "personal" ? current.custodianId : "",
    }))
  }

  function handleCategoryChange(categoryId: string) {
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
    if (isProtectedStatusChange) {
      toast.error(t("protectedStatusEditBlocked"))
      return
    }
    if (duplicateState.assetTagExists || duplicateState.serialNumberExists) {
      toast.error(t("duplicateWarning"))
      return
    }
    if (!isValidCustomFieldsJson(values.customFieldsJson)) {
      toast.error(t("customFieldsJsonInvalid"))
      return
    }
    const missingRequiredField = selectedCustomFieldDefinitions.find(
      (definition) => definition.isRequired && !getCustomFieldValue(definition.fieldName).trim()
    )
    if (missingRequiredField) {
      toast.error(t("customFieldRequired", { field: getTemplateFieldLabel(missingRequiredField, locale) }))
      return
    }
    if (!isEdit && installAfterCreate.parentAssetId && !installAfterCreate.componentRole.trim()) {
      toast.error(t("componentRoleRequired"))
      return
    }
    if (!isEdit && ownershipType === "component" && !installAfterCreate.parentAssetId) {
      toast.error(t("componentParentRequired"))
      return
    }
    if (isSoftwareLicense && !values.departmentId && !values.custodianId) {
      toast.error(t("licenseResponsibilityRequired"))
      return
    }
    if (isSoftwareLicense && values.licenseTotalSeats !== "" && values.licenseUsedSeats !== "") {
      const totalSeats = Number(values.licenseTotalSeats ?? 0)
      const usedSeats = Number(values.licenseUsedSeats ?? 0)
      if (Number.isFinite(totalSeats) && Number.isFinite(usedSeats) && usedSeats > totalSeats) {
        toast.error(t("licenseSeatUsageInvalid"))
        return
      }
    }
    if (selectedPurchaseFile && !purchaseDocumentNo.trim()) {
      toast.error(t("purchaseDocumentNoRequired"))
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

      const result = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(result?.error ?? tCommon("error"))
      }

      if (!isEdit && installAfterCreate.parentAssetId && result?.id) {
        const installResponse = await fetch(`/api/assets/${installAfterCreate.parentAssetId}/components`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            componentAssetId: result.id,
            componentRole: installAfterCreate.componentRole,
            slotNo: installAfterCreate.slotNo,
            reason: installAfterCreate.reason || t("installAfterCreateDefaultReason"),
          }),
        })
        const installResult = await installResponse.json().catch(() => null)
        if (!installResponse.ok) {
          throw new Error(installResult?.error ?? t("installAfterCreateFailed"))
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

      if (result?.id) {
        const createdDocumentIds = documentsToCreate.length > 0 ? await createPurchaseDocuments(documentsToCreate) : []
        const purchaseDocumentIds = [...selectedPurchaseDocumentIds, ...createdDocumentIds]
        if (purchaseDocumentIds.length > 0) {
          await linkPurchaseDocuments(result.id, purchaseDocumentIds)
        }

        const photosToUpload = selectedAssetPhotoFile
          ? [...newAssetPhotos, { id: createClientId(), label: effectivePhotoLabel, file: selectedAssetPhotoFile }]
          : newAssetPhotos
        if (photosToUpload.length > 0) {
          await uploadAssetPhotos(result.id, photosToUpload)
        }
      }

      toast.success(tCommon("savedSuccess"))
      router.push(backHref)
      router.refresh()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : tCommon("error")
      toast.error(errorMessage.includes("Protected lifecycle statuses") ? t("protectedStatusEditBlocked") : errorMessage)
    } finally {
      setSaving(false)
    }
  }

  function setInstallField(field: keyof typeof installAfterCreate, value: string) {
    setInstallAfterCreate((current) => ({ ...current, [field]: value }))
  }

  function addPurchaseDocument() {
    if (!selectedPurchaseFile) {
      toast.error(t("fileRequired"))
      return
    }
    if (!purchaseDocumentNo.trim()) {
      toast.error(t("purchaseDocumentNoRequired"))
      return
    }

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
      toast.error(t("fileRequired"))
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

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error ?? t("assetPhotoUploadFailed"))
      }
    }
  }

  async function createPurchaseDocuments(documents: PurchaseDocumentDraft[]) {
    const createdIds: string[] = []
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

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error ?? t("purchaseDocumentUploadFailed"))
      }
      const createdDocument = await response.json()
      if (createdDocument?.id) createdIds.push(createdDocument.id)
    }
    return createdIds
  }

  async function linkPurchaseDocuments(assetId: string, purchaseDocumentIds: string[]) {
    const response = await fetch(`/api/assets/${assetId}/purchase-documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchaseDocumentIds }),
    })
    if (!response.ok) {
      const result = await response.json().catch(() => null)
      throw new Error(result?.error ?? t("purchaseDocumentLinkFailed"))
    }
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
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold text-foreground">{title}</h1>
          <p className="mt-1 break-words text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link
          href={backHref}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent sm:w-auto"
        >
          <ArrowLeft className="h-4 w-4" />
          {tCommon("back")}
        </Link>
      </div>

      {cloneSource ? (
        <div className="mb-5 rounded-md border border-warning/30 bg-warning/10 px-4 py-3">
          <div className="flex gap-3">
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-warning/15 text-warning">
              <Copy className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="break-words text-sm font-semibold text-foreground">
                {t("cloneBannerTitle", { assetTag: cloneSource.assetTag })}
              </div>
              <p className="mt-1 break-words text-sm text-muted-foreground">
                {t("cloneBannerDescription", { assetName: cloneSource.name })}
              </p>
              <p className="mt-2 break-words text-xs font-medium text-warning">
                {t("cloneBannerReview")}
              </p>
            </div>
          </div>
        </div>
      ) : null}

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
              onChange={(event) => {
                setNameManuallyEdited(true)
                setField("name", event.target.value)
              }}
              maxLength={200}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">{t("assetNameHelp")}</p>
            {suggestedAssetName && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-accent px-2.5 py-1 text-xs text-muted-foreground">
                  {t("suggestedAssetName")}: <span className="font-medium text-foreground">{suggestedAssetName}</span>
                </span>
                {values.name !== suggestedAssetName && (
                  <button
                    type="button"
                    onClick={() => {
                      setNameManuallyEdited(false)
                      setField("name", suggestedAssetName)
                    }}
                    className="inline-flex h-8 items-center rounded-md border border-border px-2.5 text-xs font-medium transition-colors hover:bg-accent"
                  >
                    {t("useSuggestedName")}
                  </button>
                )}
              </div>
            )}
          </Field>
          <SelectField label={t("category")} value={values.categoryId} required onChange={handleCategoryChange}>
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
          <Field label={isSoftwareLicense ? t("licenseKey") : t("serialNumber")}>
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
            {duplicateState.serialNumberExists && (
              <p className="mt-1.5 text-xs font-medium text-danger">{t("duplicateSerialNumber")}</p>
            )}
          </Field>
        </Section>

        <Section title={t("ownership")}>
          <div className="md:col-span-2">
            <SelectField label={t("ownershipType")} value={ownershipType} required onChange={handleOwnershipTypeChange}>
              {assetOwnershipTypes.map((type) => (
                <option key={type} value={type}>{t(`ownershipType_${type}`)}</option>
              ))}
            </SelectField>
            <p className="mt-1.5 text-xs text-muted-foreground">{t(`ownershipType_${ownershipType}_help`)}</p>
          </div>
          <div>
            <SelectField label={t("assetOwnerCompany")} value={values.companyId} required onChange={handleCompanyChange}>
              <option value="">{t("selectCompany")}</option>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.label}</option>)}
            </SelectField>
            <p className="mt-1.5 text-xs text-muted-foreground">{t("assetOwnerCompanyHelp")}</p>
          </div>
          <div>
            <SelectField label={t("assetOwnerBranch")} value={values.branchId} required onChange={handleBranchChange}>
              <option value="">{t("selectBranch")}</option>
              {filteredBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.label}</option>)}
            </SelectField>
            <p className="mt-1.5 text-xs text-muted-foreground">{t("assetOwnerBranchHelp")}</p>
          </div>
          <SelectField label={t("department")} value={values.departmentId ?? ""} required={ownershipType !== "personal" && !isSoftwareLicense} onChange={(value) => setField("departmentId", value)}>
            <option value="">{t("selectDepartment")}</option>
            {filteredDepartments.map((department) => <option key={department.id} value={department.id}>{department.label}</option>)}
          </SelectField>
          {ownershipType === "personal" || isSoftwareLicense ? (
            <div>
              <SearchableSelect
                label={isSoftwareLicense ? t("licenseAssignee") : t("custodian")}
                value={values.custodianId ?? ""}
                options={filteredEmployees}
                placeholder={isSoftwareLicense ? t("selectLicenseAssignee") : t("selectCustodian")}
                searchPlaceholder={tCommon("searchSelectPlaceholder")}
                emptyLabel={tCommon("searchSelectNoResults")}
                onChange={(value) => setField("custodianId", value)}
              />
              <label className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={allowCrossCompanyCustodian}
                  onChange={(event) => handleCrossCompanyCustodianToggle(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
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
          ) : (
            <div className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
              <div className="font-medium text-foreground">{t("custodianNotRequired")}</div>
              <p className="mt-1 text-xs">{t("custodianNotRequiredHelp")}</p>
            </div>
          )}
        </Section>

        {isSoftwareLicense && (
          <Section title={t("licenseManagement")}>
            <Field label={t("licenseTotalSeats")} required>
              <input
                type="number"
                min="0"
                step="1"
                value={values.licenseTotalSeats ?? ""}
                onChange={(event) => setField("licenseTotalSeats", event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </Field>
            <Field label={t("licenseUsedSeats")}>
              <input
                type="number"
                min="0"
                step="1"
                value={values.licenseUsedSeats ?? ""}
                onChange={(event) => setField("licenseUsedSeats", event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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
            <div className="rounded-md border border-info/30 bg-info/10 px-3 py-2 text-sm text-muted-foreground">
              <div className="font-medium text-foreground">{t("licenseRemainingSeats")}: {getRemainingLicenseSeats(values.licenseTotalSeats, values.licenseUsedSeats)}</div>
              <p className="mt-1 text-xs">{t("licenseManagementHelp")}</p>
            </div>
          </Section>
        )}

        <Section title={t("locationCustodian")}>
          <div className="md:col-span-2">
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={allowCrossBranchLocation}
                onChange={(event) => handleCrossBranchLocationToggle(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
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
          <SelectField label={t("homeLocation")} value={values.homeLocationId ?? ""} onChange={(value) => setField("homeLocationId", value)}>
            <option value="">{t("selectLocation")}</option>
            {filteredLocations.map((location) => <option key={location.id} value={location.id}>{getLocationOptionLabel(location, allowCrossBranchLocation, branches)}</option>)}
          </SelectField>
          <SelectField label={t("currentLocation")} value={values.currentLocationId} required onChange={(value) => setField("currentLocationId", value)}>
            <option value="">{t("selectLocation")}</option>
            {filteredLocations.map((location) => <option key={location.id} value={location.id}>{getLocationOptionLabel(location, allowCrossBranchLocation, branches)}</option>)}
          </SelectField>
          <div>
            <AssetStateFieldLabel label={t("status")} required help={assetStatusHelp} />
            <select
              value={values.statusId}
              required
              onChange={(event) => setField("statusId", event.target.value)}
              className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:h-10 sm:min-h-0"
            >
              <option value="">{t("selectStatus")}</option>
              {statuses.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
            </select>
            {isProtectedStatusChange && (
              <div className="mt-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
                <div className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium">{t("protectedStatusEditBlocked")}</p>
                    <p className="mt-1 leading-relaxed">{protectedStatusHelp}</p>
                    {isSelectedPendingRepair && repairWorkflowHref && (
                      <Link href={repairWorkflowHref} className="mt-2 inline-flex font-medium underline underline-offset-2">
                        {t("openRepairWorkflow")}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div>
            <AssetStateFieldLabel label={t("condition")} required help={assetConditionHelp} />
            <select
              value={values.conditionId}
              required
              onChange={(event) => setField("conditionId", event.target.value)}
              className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:h-10 sm:min-h-0"
            >
              <option value="">{t("selectCondition")}</option>
              {conditions.map((condition) => <option key={condition.id} value={condition.id}>{condition.label}</option>)}
            </select>
          </div>
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
              value={installAfterCreate.parentAssetId}
              onChange={(value) => setInstallField("parentAssetId", value)}
            >
              <option value="">{t("skipInstallAfterCreate")}</option>
              {parentAssets.map((parentAsset) => (
                <option key={parentAsset.id} value={parentAsset.id}>{parentAsset.label}</option>
              ))}
            </SelectField>
            <Field label={t("componentRole")} required={Boolean(installAfterCreate.parentAssetId)}>
              <input
                value={installAfterCreate.componentRole}
                onChange={(event) => setInstallField("componentRole", event.target.value)}
                maxLength={100}
                placeholder="Harddisk"
                disabled={!installAfterCreate.parentAssetId}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
              />
            </Field>
            <Field label={t("slotNo")}>
              <input
                value={installAfterCreate.slotNo}
                onChange={(event) => setInstallField("slotNo", event.target.value)}
                maxLength={50}
                placeholder="Slot 1"
                disabled={!installAfterCreate.parentAssetId}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
              />
            </Field>
            <Field label={t("reason")}>
              <input
                value={installAfterCreate.reason}
                onChange={(event) => setInstallField("reason", event.target.value)}
                maxLength={500}
                disabled={!installAfterCreate.parentAssetId}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
              />
            </Field>
          </Section>
        )}

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
          <div className="md:col-span-2">
            <div className="rounded-md border border-border bg-background p-4">
              <div className="mb-3 flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{t("purchaseDocuments")}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t("purchaseDocumentsHelp")}</p>
                </div>
              </div>

              <div className="mb-4 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("existingPurchaseDocuments")}</div>
                {purchaseDocumentOptions.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
                    {t("noPurchaseDocuments")}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                    {purchaseDocumentOptions.map((document) => (
                      <label key={document.id} className="flex cursor-pointer gap-3 rounded-md border border-border bg-surface p-3 text-sm transition-colors hover:bg-accent">
                        <input
                          type="checkbox"
                          checked={selectedPurchaseDocumentIds.includes(document.id)}
                          onChange={() => togglePurchaseDocument(document.id)}
                          className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-foreground">
                            {t(`purchaseDocumentTypes.${document.documentType}`)} · {document.documentNo}
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {document.supplierName || "-"} · {t("linkedAssets", { count: document.assetCount })}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4">
                <div className="mb-3 text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("createPurchaseDocument")}</div>
                <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-4">
                  <select
                    value={purchaseDocumentType}
                    onChange={(event) => setPurchaseDocumentType(event.target.value as (typeof purchaseDocumentTypes)[number])}
                    className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    {purchaseDocumentTypes.map((type) => (
                      <option key={type} value={type}>{t(`purchaseDocumentTypes.${type}`)}</option>
                    ))}
                  </select>
                  <input
                    value={purchaseDocumentNo}
                    onChange={(event) => setPurchaseDocumentNo(event.target.value)}
                    maxLength={100}
                    placeholder={t("purchaseDocumentNo")}
                    className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <input
                    type="date"
                    value={purchaseDocumentDate}
                    onChange={(event) => setPurchaseDocumentDate(event.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={purchaseDocumentTotalAmount}
                    onChange={(event) => setPurchaseDocumentTotalAmount(event.target.value)}
                    placeholder={t("purchaseDocumentAmount")}
                    className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <FileDropzone
                  file={selectedPurchaseFile}
                  onFileChange={setSelectedPurchaseFile}
                  disabled={saving}
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.doc,.docx"
                  title={t("dropPurchaseDocumentTitle")}
                  hint={t("dropFileSelected")}
                  browseLabel={t("dropFileHint")}
                />
              </div>

              <button
                type="button"
                onClick={addPurchaseDocument}
                disabled={saving}
                className="mt-3 inline-flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {t("addPurchaseDocument")}
              </button>

              {newPurchaseDocuments.length > 0 && (
                <div className="mt-4 space-y-2">
                  {newPurchaseDocuments.map((document) => (
                    <div key={document.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-foreground">
                          {t(`purchaseDocumentTypes.${document.documentType}`)} · {document.documentNo} · {document.file.name}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{formatFileSize(document.file.size)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePurchaseDocument(document.id)}
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-danger transition-colors hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 sm:h-8 sm:w-8"
                        aria-label={t("removePurchaseDocument")}
                        title={t("removePurchaseDocument")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Section>

        <Section title={t("initialAssetPhotos")}>
          <div className="md:col-span-2 rounded-md border border-border bg-background p-4">
            <div className="mb-3 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Camera className="h-5 w-5" />
              </span>
              <div>
                <div className="text-sm font-semibold text-foreground">{t("initialAssetPhotos")}</div>
                <p className="mt-1 text-sm text-muted-foreground">{t("initialAssetPhotosHelp")}</p>
              </div>
            </div>

            {selectedPhotoChecklist.length > 0 ? (
              <div className="mb-3 rounded-md border border-border bg-surface p-3">
                <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm font-semibold text-foreground">{t("selectPhotoType")}</div>
                  <div className="text-xs text-muted-foreground">
                    {t("autoPhotoLabelHint", { label: effectivePhotoLabel || t("generalPhoto") })}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedPhotoChecklist.map((item) => {
                    const isSelected = effectivePhotoLabel === item
                    const isQueued = queuedPhotoLabels.has(item)
                    const alreadyExists = existingPhotoLabels.has(item)

                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setPhotoLabel(item)}
                        className={[
                          "inline-flex min-h-9 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-foreground hover:bg-accent",
                        ].join(" ")}
                        >
                        <span>{item}</span>
                        <span className={alreadyExists || isQueued ? "text-xs text-success" : "text-xs text-muted-foreground"}>
                          {alreadyExists ? t("photoChecklistDone") : isQueued ? t("photoChecklistQueued") : t("photoChecklistPending")}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                {values.categoryId ? t("photoChecklistEmptyForCategory") : t("photoChecklistSelectCategory")}
              </p>
            )}

            <FileDropzone
              file={selectedAssetPhotoFile}
              onFileChange={setSelectedAssetPhotoFile}
              disabled={saving}
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif"
              capture="environment"
              title={t("dropAssetPhotoTitle")}
              hint={t("dropFileSelected")}
              browseLabel={t("dropAssetPhotoHint")}
            />

            {existingAssetPhotos.length > 0 && (
              <div className="mt-4 rounded-md border border-border bg-surface p-3">
                <div className="mb-3 text-sm font-semibold text-foreground">{t("existingAssetPhotos")}</div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {existingAssetPhotos.map((photo) => (
                    <a
                      key={photo.id}
                      href={`/api/attachments/${photo.id}?inline=1`}
                      target="_blank"
                      rel="noreferrer"
                      className="overflow-hidden rounded-md border border-border bg-background transition-colors hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <div className="flex aspect-video items-center justify-center bg-muted/40 p-2">
                        {/* Authenticated attachment URLs render more reliably as browser-native images. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/attachments/${photo.id}?inline=1`}
                          alt={photo.originalName}
                          width={240}
                          height={160}
                          loading="lazy"
                          className="max-h-full w-full object-contain"
                        />
                      </div>
                      <div className="border-t border-border p-2">
                        <div className="truncate text-xs font-medium text-foreground">{photo.originalName}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{formatFileSize(photo.fileSize)}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={addAssetPhoto}
              disabled={saving}
              className="mt-3 inline-flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {effectivePhotoLabel ? t("addAssetPhotoWithLabel", { label: effectivePhotoLabel }) : t("addAssetPhoto")}
            </button>

            {newAssetPhotos.length > 0 && (
              <div className="mt-4 space-y-2">
                {newAssetPhotos.map((photo) => (
                  <div key={photo.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">
                        {photo.label ? `${photo.label} · ` : ""}{photo.file.name}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{formatFileSize(photo.file.size)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAssetPhoto(photo.id)}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-danger transition-colors hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 sm:h-8 sm:w-8"
                      aria-label={t("removeAssetPhoto")}
                      title={t("removeAssetPhoto")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        <Section title={t("customFields")}>
          <div className="md:col-span-2">
            <Field label={t("remark")}>
              <textarea value={values.remark ?? ""} onChange={(event) => setField("remark", event.target.value)} rows={4} className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </Field>
          </div>
          <div className="md:col-span-2">
            <div className="space-y-4 border-t border-border pt-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{t("customFieldsStructuredTitle")}</h3>
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("customFieldsStructuredHelp")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRawJson((current) => !current)}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-accent"
                >
                  <Code2 className="h-4 w-4" />
                  {showRawJson ? t("hideJson") : t("showJson")}
                </button>
              </div>

              {selectedCustomFieldDefinitions.length > 0 ? (
                <TemplateCustomFields
                  definitions={selectedCustomFieldDefinitions}
                  locale={locale}
                  getValue={getCustomFieldValue}
                  onChange={handleTemplateCustomFieldChange}
                />
              ) : (
                <div className="rounded-md border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
                  {values.categoryId ? t("customFieldsNoTemplate") : t("customFieldsSelectCategory")}
                </div>
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
                <Field label={t("customFieldsJson")}>
                  <textarea
                    value={values.customFieldsJson ?? ""}
                    onChange={(event) => handleRawJsonChange(event.target.value)}
                    rows={5}
                    className="min-h-32 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">{t("customFieldsJsonHelp")}</p>
                </Field>
              )}
            </div>
          </div>
          <label className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm">
            <input type="checkbox" checked={values.isActive} onChange={(event) => setField("isActive", event.target.checked)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
            {tCommon("active")}
          </label>
        </Section>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <Link href={backHref} className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent sm:w-auto">
            {tCommon("cancel")}
          </Link>
          <button
            type="submit"
            disabled={saving || isProtectedStatusChange || duplicateState.checking || duplicateState.assetTagExists || duplicateState.serialNumberExists}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50 sm:w-auto"
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
    <section className="min-w-0 rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-6">
      <h2 className="mb-4 break-words text-lg font-semibold text-foreground sm:mb-5">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">{children}</div>
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

function AssetStateFieldLabel({
  label,
  required,
  help,
}: {
  label: string
  required?: boolean
  help: { title: string; description: string; items: string[] }
}) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
      <span>
        {label}
        {required && <span className="ml-1 text-danger">*</span>}
      </span>
      <AssetStateHelpPopover {...help} />
    </div>
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
        className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:h-10 sm:min-h-0"
      >
        {children}
      </select>
    </Field>
  )
}

function getRemainingLicenseSeats(total?: string | number | null, used?: string | number | null) {
  const totalSeats = Number(total ?? 0)
  const usedSeats = Number(used ?? 0)
  if (!Number.isFinite(totalSeats) || totalSeats <= 0) return "-"
  const remainingSeats = Math.max(totalSeats - (Number.isFinite(usedSeats) ? usedSeats : 0), 0)
  return remainingSeats.toLocaleString("th-TH")
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
        <div className="rounded-md border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
          {labels.empty}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)_2.5rem]">
              <input
                value={row.key}
                onChange={(event) => updateRow(row.id, "key", event.target.value)}
                placeholder={labels.key}
                className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:h-10 sm:min-h-0"
              />
              <input
                value={row.value}
                onChange={(event) => updateRow(row.id, "value", event.target.value)}
                placeholder={labels.value}
                className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:h-10 sm:min-h-0"
              />
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                aria-label={labels.remove}
                title={labels.remove}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 sm:h-10 sm:w-10"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => onChange([...rows, createCustomFieldRow()])}
        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:h-9 sm:min-h-0"
      >
        <Plus className="h-4 w-4" />
        {labels.add}
      </button>
    </div>
  )
}

function TemplateCustomFields({
  definitions,
  locale,
  getValue,
  onChange,
}: {
  definitions: CustomFieldDefinition[]
  locale: string
  getValue: (fieldName: string) => string
  onChange: (fieldName: string, value: string) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {definitions.map((definition) => (
        <TemplateField
          key={definition.id}
          definition={definition}
          label={getTemplateFieldLabel(definition, locale)}
          value={getValue(definition.fieldName)}
          onChange={(value) => onChange(definition.fieldName, value)}
        />
      ))}
    </div>
  )
}

function TemplateField({
  definition,
  label,
  value,
  onChange,
}: {
  definition: CustomFieldDefinition
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const fieldLabel = (
    <span className="mb-1.5 block text-sm font-medium text-foreground">
      {label}
      {definition.isRequired && <span className="ml-1 text-danger">*</span>}
    </span>
  )

  if (definition.fieldType === "boolean") {
    return (
      <label className="flex min-h-10 items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm">
        <input
          type="checkbox"
          checked={value === "true"}
          onChange={(event) => onChange(event.target.checked ? "true" : "false")}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
        />
        {label}
      </label>
    )
  }

  if (definition.fieldType === "select") {
    return (
      <label className="block">
        {fieldLabel}
        <select
          value={value}
          required={definition.isRequired}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        >
          <option value=""></option>
          {definition.options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
    )
  }

  return (
    <label className="block">
      {fieldLabel}
      <input
        type={definition.fieldType === "number" ? "number" : definition.fieldType === "date" ? "date" : "text"}
        value={value}
        required={definition.isRequired}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      />
    </label>
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
