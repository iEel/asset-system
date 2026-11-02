"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Save } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { orNil } from "@/components/ui/nil"
import { Notice } from "@/components/ui/notice"
import { ScannerTextInput } from "@/components/ui/scanner-text-input"
import { StickyFormFooter } from "@/components/ui/sticky-form-footer"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { AssetFormCustomFields } from "@/components/assets/asset-form-custom-fields"
import { AssetFormDocuments } from "@/components/assets/asset-form-documents"
import { AssetFormHeader } from "@/components/assets/asset-form-header"
import { AssetFormInstall } from "@/components/assets/asset-form-install"
import { AssetFormOther } from "@/components/assets/asset-form-other"
import { AssetFormOwnership } from "@/components/assets/asset-form-ownership"
import { AssetFormPhotos } from "@/components/assets/asset-form-photos"
import { AssetFormPurchase } from "@/components/assets/asset-form-purchase"
import { AssetFormRequiredCard } from "@/components/assets/asset-form-required-card"
import { CardGroup, Section, SelectField, type AssetFormDisclosure } from "@/components/assets/asset-form-section"
import { AssetStateHelpPopover } from "@/components/assets/asset-state-help-popover"
import {
  attachmentMatchesPhotoLabel,
  changeOwnershipType,
  countRequiredFilled,
  createClientId,
  createCustomFieldRow,
  customFieldKey,
  emptyAssetFormValues,
  FIELD_IDS,
  fieldId,
  fieldOrder,
  getAssetFormDepartmentLock,
  getRequiredAssetFields,
  isAssetMessageCode,
  legacySanitizedPhotoLabel,
  parseCustomFieldRows,
  sectionOfField,
  serializeCustomFieldRows,
  validate,
  validatePurchaseDocument,
  type AssetField,
  type AssetFixedField,
  type AssetFormOption as Option,
  type AssetFormSection,
  type AssetFormValues,
  type AssetPhotoDraft,
  type AssetRequiredField,
  type CloneSourceContext,
  type CustomFieldDefinition,
  type CustomFieldRow,
  type ExistingAssetPhoto,
  type PurchaseDocumentDraft,
  type PurchaseDocumentOption,
  type PurchaseDocumentType,
} from "@/lib/asset-form-rules"
import { summarizeAssetFormSection, type AssetFormFoldedSection, type AssetFormSummaryInput, type AssetFormSummaryPart } from "@/lib/asset-form-summary"
import { buildSuggestedAssetName } from "@/lib/asset-name-suggestion"
import { resolveModelIdForScope } from "@/lib/asset-model-selection"
import { normalizeAssetOwnershipType } from "@/lib/asset-ownership"
import { formatCount, formatMoney } from "@/lib/display-format"
import { optionMatchesOrganizationScope } from "@/lib/organization-option-filter"
import { cn, formatDate } from "@/lib/utils"

const protectedAssetWorkflowStatuses = new Set([
  "pending disposal",
  "disposed",
  "retired",
  "lost",
  "missing",
  "under maintenance",
  "pending repair",
])

// The words of each required field, as its label reads (the footer's "ยังขาด n ช่องที่ต้องกรอก · <fields>").
const REQUIRED_FIELD_LABELS: Record<AssetRequiredField, string> = {
  name: "assetName",
  categoryId: "category",
  ownershipType: "ownershipType",
  companyId: "assetOwnerCompany",
  branchId: "assetOwnerBranch",
  departmentId: "department",
  currentLocationId: "currentLocation",
  statusId: "status",
  conditionId: "condition",
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
  headerActions,
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
  // The create page's own switch (เพิ่มทีละรายการ / เพิ่มเป็นชุด), shown in the header's actions.
  headerActions?: ReactNode
}) {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")
  const apiError = useApiError()
  // A held บุคคล or Stock asset opens with its holder's department, a clone too (group 4 plan 2 Task 6b).
  const [values, setValues] = useState<AssetFormValues>(() => withDepartmentLock(asset ?? emptyAssetFormValues, employees, asset))
  const [customFieldRows, setCustomFieldRows] = useState<CustomFieldRow[]>(() => parseCustomFieldRows(asset?.customFieldsJson))
  const [installAfterCreate, setInstallAfterCreate] = useState({
    parentAssetId: "",
    componentRole: "",
    slotNo: "",
    reason: "",
  })
  const [purchaseDocumentType, setPurchaseDocumentType] = useState<PurchaseDocumentType>("purchase_order")
  const [purchaseDocumentNo, setPurchaseDocumentNo] = useState("")
  const [purchaseDocumentDate, setPurchaseDocumentDate] = useState("")
  const [purchaseDocumentTotalAmount, setPurchaseDocumentTotalAmount] = useState("")
  const [selectedPurchaseFile, setSelectedPurchaseFile] = useState<File | null>(null)
  const [newPurchaseDocuments, setNewPurchaseDocuments] = useState<PurchaseDocumentDraft[]>([])
  const [selectedPurchaseDocumentIds, setSelectedPurchaseDocumentIds] = useState<string[]>(asset?.purchaseDocumentIds ?? [])
  const [photoLabel, setPhotoLabel] = useState("")
  const [newAssetPhotos, setNewAssetPhotos] = useState<AssetPhotoDraft[]>([])
  const [nameManuallyEdited, setNameManuallyEdited] = useState(() => Boolean(asset?.id || asset?.name?.trim()))
  const [showRawJson, setShowRawJson] = useState(false)
  // The folded sections that are open (spec §8, P2-R11): เอกสารจัดซื้อ starts open; an error, the #purchase link and the
  // person's own click open the others. On edit every folded section starts folded too (Task 8 opens a changed one).
  const [openSections, setOpenSections] = useState<Set<AssetFormSection>>(() => new Set<AssetFormSection>(["documents"]))
  const [allowCrossCompanyCustodian, setAllowCrossCompanyCustodian] = useState(() => shouldAllowCrossCompanyCustodianOnLoad(asset, employees, branches))
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
  // The department's star reads the list validate() and the counter read (asset-form-rules.ts).
  const requiredFields: readonly AssetField[] = getRequiredAssetFields(ownershipType)
  // The card's counter and the footer's missing line read the same list (asset-form-rules.ts).
  const requiredProgress = countRequiredFilled(values, ownershipType)
  const showMissing = !isEdit && requiredProgress.missing.length > 0
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
  // The holder is picked by company and branch, not by แผนก: แผนก follows the holder (spec §7.3).
  const filteredEmployees = allowCrossCompanyCustodian ? employees : employees.filter(
    (employee) =>
      optionMatchesOrganizationScope(employee, {
        companyId: values.companyId,
        branchId: values.branchId,
        branchCode: selectedBranch?.code,
      })
  )
  const selectedCustodian = employees.find((employee) => employee.id === values.custodianId)
  // แผนก follows the holder on บุคคล and Stock (P2-R1); its text is the holder's department, else the option's label.
  const departmentLock = departmentLockOf(values, employees, asset)
  const departmentLockText = departmentLock.text ?? departments.find((department) => department.id === departmentLock.departmentId)?.label ?? ""
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
      // The raw JSON shows only after its toggle, and a folded section opens before its field takes focus.
      reveal: (key) => {
        if (key === "customFieldsJson") setShowRawJson(true)
        openSection(sectionOfField(key))
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

  // The asset page's "บันทึกข้อมูลการซื้อ" links here with #purchase: that folded section opens (the browser has already
  // scrolled to its anchor). A later hash change does the same.
  useEffect(() => {
    const openSectionNow = (section: AssetFormSection) => setOpenSections((current) => (current.has(section) ? current : new Set(current).add(section)))
    const openFromHash = () => {
      if (window.location.hash === "#purchase") openSectionNow("purchase")
    }
    const timeout = window.setTimeout(openFromHash, 0)
    window.addEventListener("hashchange", openFromHash)
    return () => {
      window.clearTimeout(timeout)
      window.removeEventListener("hashchange", openFromHash)
    }
  }, [])

  function openSection(section: AssetFormSection) {
    setOpenSections((current) => (current.has(section) ? current : new Set(current).add(section)))
  }

  function setSectionOpen(section: AssetFormSection, open: boolean) {
    setOpenSections((current) => {
      if (current.has(section) === open) return current
      const next = new Set(current)
      if (open) next.add(section)
      else next.delete(section)
      return next
    })
  }

  // "ไปช่องแรกที่ยังขาด": each missing required field shows its error, and focus goes to the first one.
  function goToFirstMissing() {
    fieldErrors.setErrors({ ...fieldErrors.errors, ...Object.fromEntries(requiredProgress.missing.map((field) => [field, "required"])) })
    focusFirstError()
  }

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
      if (employeeMatchesAssetScope(custodian, current, branches)) return current
      return { ...current, custodianId: "" }
    })
  }

  // A holder on บุคคล or Stock brings its department (the lock); a cleared holder frees แผนก, which keeps its value.
  function handleCustodianChange(custodianId: string) {
    fieldErrors.clear("custodianId", "departmentId")
    setValues((current) => withDepartmentLock({ ...current, custodianId }, employees, asset))
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
    // The ownership type decides the department, the license and the parent rules. The holder stays, except on ส่วนควบ
    // (P2-R2), and a held บุคคล or Stock asset takes the holder's department.
    fieldErrors.clear("ownershipType", "departmentId", "custodianId", "licenseTotalSeats", "licenseUsedSeats", "parentAssetId")
    setValues((current) => withDepartmentLock(changeOwnershipType(current, nextOwnershipType), employees, asset))
    // ส่วนควบ needs its parent, which sits in the folded install section.
    if (!isEdit && normalizeAssetOwnershipType(nextOwnershipType) === "component") openSection("install")
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

        try {
          if (newAssetPhotos.length > 0) await uploadAssetPhotos(savedId, newAssetPhotos)
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

  // A chosen file joins the queue at once under the chosen photo type, and the next missing type is chosen (spec §8).
  function addAssetPhoto(file: File | null) {
    fieldErrors.clear("assetPhotoFile")
    if (!file) return

    const nextPhotos = [...newAssetPhotos, { id: createClientId(), label: effectivePhotoLabel, file }]
    const nextQueuedLabels = new Set(nextPhotos.map((photo) => photo.label).filter(Boolean))
    const nextMissingLabel = selectedPhotoChecklist.find((item) => !nextQueuedLabels.has(item)) ?? ""

    setNewAssetPhotos(nextPhotos)
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

  // The folded sections (spec §8, P2-R11): each one's summary line, its "กรอกแล้ว n จาก m ช่อง" count and its frame. A
  // section that holds an error has the error frame; the first error's section opens through focusFirstError's reveal.
  const sectionsWithErrors = new Set(
    Object.keys(fieldErrors.errors)
      .filter((key) => key in FIELD_IDS || key.startsWith("customFields."))
      .map((key) => sectionOfField(key as AssetField)),
  )
  const summaryInput: AssetFormSummaryInput = {
    values,
    install: installAfterCreate,
    installParentLabel: parentAssets.find((parentAsset) => parentAsset.id === installAfterCreate.parentAssetId)?.label,
    documents: { selected: selectedPurchaseDocumentIds.length, queued: newPurchaseDocuments.length },
    photos: {
      checklistTotal: selectedPhotoChecklist.length,
      checklistCovered: selectedPhotoChecklist.filter((item) => queuedPhotoLabels.has(item) || existingPhotoLabels.has(item)).length,
      existing: existingAssetPhotos.length,
      queued: newAssetPhotos.length,
    },
    customFields: { definitions: selectedCustomFieldDefinitions, valueOf: getCustomFieldValue, extraRows: additionalCustomFieldRows.length },
  }

  function summaryText(part: AssetFormSummaryPart) {
    switch (part.key) {
      case "purchaseDate":
      case "warrantyEnd":
        return t(`sectionSummary.${part.key}`, { date: formatDate(part.date) })
      case "purchasePrice":
        return t("sectionSummary.purchasePrice", { amount: formatMoney(part.amount, { unit: tCommon("baht") }) })
      case "installParent":
        return t("sectionSummary.installParent", { label: part.label })
      case "remarkSet":
        return t("sectionSummary.remarkSet")
      default:
        return t(`sectionSummary.${part.key}`, { count: part.count })
    }
  }

  function disclosureFor(section: AssetFormFoldedSection): AssetFormDisclosure {
    const summary = summarizeAssetFormSection(section, summaryInput)
    return {
      open: openSections.has(section),
      onOpenChange: (open) => setSectionOpen(section, open),
      summary: summary.parts.length > 0 ? summary.parts.map(summaryText).join(" · ") : undefined,
      badge: summary.total > 0 ? t("sectionFilled", { filled: summary.filled, total: summary.total }) : undefined,
      tone: sectionsWithErrors.has(section) ? "error" : "default",
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <AssetFormHeader mode={isEdit ? "edit" : "create"} title={title} backHref={backHref} actions={headerActions} />

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
        <AssetFormRequiredCard title={t("requiredCardTitle")} counter={requiredProgress}>
          <CardGroup title={t("basicInfo")}>
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
          </CardGroup>

          <AssetFormOwnership
            values={values}
            ownershipType={ownershipType}
            requiredFields={requiredFields}
            companies={companies}
            branches={filteredBranches}
            departments={filteredDepartments}
            employees={filteredEmployees}
            departmentLock={departmentLock}
            departmentLockText={departmentLockText}
            allowCrossCompanyCustodian={allowCrossCompanyCustodian}
            hasCrossCompanyCustodian={hasCrossCompanyCustodian}
            errorText={errorText}
            onOwnershipTypeChange={handleOwnershipTypeChange}
            onCompanyChange={handleCompanyChange}
            onBranchChange={handleBranchChange}
            onDepartmentChange={(value) => setField("departmentId", value)}
            onCustodianChange={handleCustodianChange}
            onCrossCompanyCustodianToggle={handleCrossCompanyCustodianToggle}
          />

          <CardGroup title={t("locationStatus")}>
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
              label={t("homeLocation")}
              id="asset-home-location"
              value={values.homeLocationId ?? ""}
              error={errorText("homeLocationId")}
              onChange={(value) => setField("homeLocationId", value)}
            >
              <option value="">{t("selectLocation")}</option>
              {filteredLocations.map((location) => <option key={location.id} value={location.id}>{getLocationOptionLabel(location, allowCrossBranchLocation, branches)}</option>)}
            </SelectField>
            <div className="grid min-w-0 gap-2">
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
              {/* ใช้ที่ตั้งประจำ: the asset is back in its home room (group 4 plan 2 Task 6b). */}
              {values.homeLocationId && values.homeLocationId !== values.currentLocationId ? (
                <div>
                  <Button variant="outline" size="sm" onClick={() => setField("currentLocationId", values.homeLocationId ?? "")}>
                    {t("useHomeLocation")}
                  </Button>
                </div>
              ) : null}
            </div>
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
          </CardGroup>
        </AssetFormRequiredCard>

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

        {!isEdit && (
          <AssetFormInstall
            ownershipType={ownershipType}
            installAfterCreate={installAfterCreate}
            parentAssets={parentAssets}
            errorText={errorText}
            setInstallField={setInstallField}
            disclosure={disclosureFor("install")}
          />
        )}

        <AssetFormPurchase
          values={values}
          setField={setField}
          errorText={errorText}
          suppliers={suppliers}
          disclosure={disclosureFor("purchase")}
        />

        <AssetFormDocuments
          errorText={errorText}
          fieldErrors={fieldErrors}
          saving={saving}
          purchaseDocumentOptions={purchaseDocumentOptions}
          selectedPurchaseDocumentIds={selectedPurchaseDocumentIds}
          togglePurchaseDocument={togglePurchaseDocument}
          purchaseDocumentType={purchaseDocumentType}
          setPurchaseDocumentType={setPurchaseDocumentType}
          purchaseDocumentNo={purchaseDocumentNo}
          setPurchaseDocumentNo={setPurchaseDocumentNo}
          purchaseDocumentDate={purchaseDocumentDate}
          setPurchaseDocumentDate={setPurchaseDocumentDate}
          purchaseDocumentTotalAmount={purchaseDocumentTotalAmount}
          setPurchaseDocumentTotalAmount={setPurchaseDocumentTotalAmount}
          selectedPurchaseFile={selectedPurchaseFile}
          selectPurchaseFile={selectPurchaseFile}
          addPurchaseDocument={addPurchaseDocument}
          newPurchaseDocuments={newPurchaseDocuments}
          removePurchaseDocument={removePurchaseDocument}
          disclosure={disclosureFor("documents")}
        />

        <AssetFormPhotos
          isEdit={isEdit}
          categoryId={values.categoryId}
          errorText={errorText}
          fieldErrors={fieldErrors}
          saving={saving}
          selectedPhotoChecklist={selectedPhotoChecklist}
          effectivePhotoLabel={effectivePhotoLabel}
          queuedPhotoLabels={queuedPhotoLabels}
          existingPhotoLabels={existingPhotoLabels}
          setPhotoLabel={setPhotoLabel}
          existingAssetPhotos={existingAssetPhotos}
          addAssetPhoto={addAssetPhoto}
          newAssetPhotos={newAssetPhotos}
          removeAssetPhoto={removeAssetPhoto}
          disclosure={disclosureFor("photos")}
        />

        <AssetFormCustomFields
          categoryId={values.categoryId}
          errorText={errorText}
          definitions={selectedCustomFieldDefinitions}
          getCustomFieldValue={getCustomFieldValue}
          onTemplateCustomFieldChange={handleTemplateCustomFieldChange}
          additionalCustomFieldRows={additionalCustomFieldRows}
          onAdditionalCustomFieldRowsChange={handleAdditionalCustomFieldRowsChange}
          disclosure={disclosureFor("customFields")}
        />

        <AssetFormOther
          values={values}
          setField={setField}
          errorText={errorText}
          showRawJson={showRawJson}
          toggleRawJson={() => setShowRawJson((current) => !current)}
          onRawJsonChange={handleRawJsonChange}
          disclosure={disclosureFor("other")}
        />

        {/* The save stays enabled while fields are missing: validate() shows each error and focuses the first one. */}
        <StickyFormFooter
          status={
            duplicateState.checking || showMissing ? (
              <span className="grid gap-1">
                {duplicateState.checking ? <span id="asset-save-reason">{t("duplicateCheckPending")}</span> : null}
                {showMissing ? (
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="min-w-0 break-words">
                      {t("requiredMissing", { count: requiredProgress.missing.length, fields: requiredProgress.missing.map((field) => t(REQUIRED_FIELD_LABELS[field])).join(", ") })}
                    </span>
                    <Button variant="ghost" size="sm" onClick={goToFirstMissing}>
                      {t("goToFirstMissing")}
                    </Button>
                  </span>
                ) : null}
              </span>
            ) : undefined
          }
        >
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

function shouldAllowCrossCompanyCustodianOnLoad(current: AssetFormValues | undefined, employees: Option[], branches: Option[]) {
  if (!current?.custodianId) return false
  const custodian = employees.find((employee) => employee.id === current.custodianId)
  return !employeeMatchesAssetScope(custodian, current, branches)
}

// The holder's scope is the owner company and branch; แผนก follows the holder, so it is not part of it (spec §7.3).
function employeeMatchesAssetScope(employee: Option | undefined, current: AssetFormValues, branches: Option[]) {
  if (!employee) return true
  const branch = branches.find((item) => item.id === current.branchId)

  return optionMatchesOrganizationScope(employee, {
    companyId: current.companyId,
    branchId: current.branchId,
    branchCode: branch?.code,
  })
}

// The department lock of these values (asset-form-rules.ts). original is the stored asset on edit: its holder and
// department are the current ones; on create (a clone included) there are none. No open handover yet: Task 7 passes it.
function departmentLockOf(values: AssetFormValues, employees: Option[], original: AssetFormValues | undefined) {
  const holder = employees.find((employee) => employee.id === values.custodianId)
  const stored = original?.id ? original : undefined
  return getAssetFormDepartmentLock({
    ownership: normalizeAssetOwnershipType(values.ownershipType),
    custodianId: values.custodianId || null,
    holderDepartmentId: holder?.departmentId ?? null,
    holderDepartmentName: holder?.departmentName ?? null,
    currentCustodianId: stored?.custodianId || null,
    currentDepartmentId: stored?.departmentId || null,
    openHandover: false,
  })
}

// Writes the locked department into the values, so the counter counts it and the save sends it.
function withDepartmentLock(values: AssetFormValues, employees: Option[], original: AssetFormValues | undefined): AssetFormValues {
  const lock = departmentLockOf(values, employees, original)
  if (!lock.locked || !lock.departmentId || lock.departmentId === values.departmentId) return values
  return { ...values, departmentId: lock.departmentId }
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
