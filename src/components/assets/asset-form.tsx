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
import { Textarea } from "@/components/ui/textarea"
import { StickyFormFooter } from "@/components/ui/sticky-form-footer"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"
import { AssetFormChangeList, CHANGE_LIST_TRIGGER_ID, type AssetFormChangeRow } from "@/components/assets/asset-form-change-list"
import { AssetFormChangedField, type AssetFieldChange } from "@/components/assets/asset-form-changed-field"
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
import { AssetFormTagDialog } from "@/components/assets/asset-form-tag-dialog"
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
  isCustodyFrozen,
  legacySanitizedPhotoLabel,
  parseCustomFieldRows,
  sectionOfField,
  serializeCustomFieldRows,
  validate,
  validatePurchaseDocument,
  type AssetEditContext,
  type AssetField,
  type AssetFixedField,
  type AssetFormOption as Option,
  type AssetFormSection,
  type AssetFormValues,
  type AssetOriginalLabelField,
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
import {
  assetPurchaseDocumentPath,
  assetPurchaseDocumentsPath,
  buildPurchaseDocumentUploadForm,
  failedPurchaseDocumentsKey,
  listPurchaseDocumentUploads,
  mapPurchaseDocumentDuplicates,
  parseFailedPurchaseDocuments,
  planPurchaseDocumentLinks,
  purchaseDocumentCheckPath,
  type FailedPurchaseDocument,
  type PurchaseDocumentDraftErrorCode,
  type PurchaseDocumentDuplicateAnswer,
} from "@/lib/asset-form-documents"
import {
  changeFieldId,
  diffAssetFormDocuments,
  diffAssetFormValues,
  getAssetEditCorrection,
  isPurchaseDocumentChange,
  sectionOfChange,
  type AssetDiffField,
  type AssetFormChange,
} from "@/lib/asset-form-diff"
import { summarizeAssetFormSection, type AssetFormFoldedSection, type AssetFormSummaryInput, type AssetFormSummaryPart } from "@/lib/asset-form-summary"
import { buildSuggestedAssetName } from "@/lib/asset-name-suggestion"
import { departmentFollowsHolder } from "@/lib/asset-department-rule"
import { resolveModelIdForScope } from "@/lib/asset-model-selection"
import { normalizeAssetOwnershipType } from "@/lib/asset-ownership"
import { formatCount, formatMoney } from "@/lib/display-format"
import { focusField, waitForElement } from "@/lib/field-focus"
import { optionMatchesOrganizationScope } from "@/lib/organization-option-filter"
import { buildPurchaseDocumentRefsSummary } from "@/lib/purchase-document-picker-rules"
import type { PurchaseDocumentSearchAnswer, PurchaseDocumentSearchRow } from "@/lib/purchase-document-search-rules"
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

// The words of each field the edit page can change, as its label reads (the change list, group 4 plan 2 Task 8).
const CHANGE_LABELS: Partial<Record<AssetDiffField, string>> = {
  assetTag: "assetTag",
  name: "assetName",
  categoryId: "category",
  brandId: "brand",
  modelId: "model",
  serialNumber: "serialNumber",
  ownershipType: "ownershipType",
  companyId: "assetOwnerCompany",
  branchId: "assetOwnerBranch",
  departmentId: "department",
  custodianId: "custodian",
  homeLocationId: "homeLocation",
  currentLocationId: "currentLocation",
  statusId: "status",
  conditionId: "condition",
  licenseTotalSeats: "licenseTotalSeats",
  licenseUsedSeats: "licenseUsedSeats",
  licenseAssignedAssetId: "licenseAssignedAsset",
  purchaseDate: "purchaseDate",
  purchasePrice: "purchasePriceBaht",
  supplierId: "supplier",
  warrantyStartDate: "warrantyStart",
  warrantyEndDate: "warrantyEnd",
  fixedAssetCode: "fixedAssetCode",
  poNumber: "poNumber",
  invoiceNumber: "invoiceNumber",
  remark: "remark",
  customFieldsJson: "customFieldsStructuredTitle",
}
const DATE_CHANGE_FIELDS = new Set<AssetDiffField>(["purchaseDate", "warrantyStartDate", "warrantyEndDate"])
// Create, and the edit before anything changed: no reason, no list.
const NO_CORRECTION = { departmentAutomatic: false, reasonNeeded: false }
const NO_CHANGES: AssetFormChange[] = []
// No asset:edit: the save links and unlinks nothing (P3-R2).
const NO_DOCUMENT_LINKS = { linkIds: [], unlinkIds: [] }

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
  chosenDocuments: initialChosenDocuments,
  recentDocuments,
  canLinkPurchaseDocuments,
  documentsFailed = false,
  customFieldDefinitions,
  existingAssetPhotos = [],
  cloneSource,
  backHref: providedBackHref,
  headerActions,
  editContext,
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
  // The 300 newest documents: only the batch form reads them (its props are this form's) until plan 3 Task 6.
  purchaseDocuments: PurchaseDocumentOption[]
  // เอกสารจัดซื้อ (group 4 plan 3 Task 5): the documents linked to the asset on edit, or a clone's, read by id with the
  // inactive ones (P3-R7); and the picker's empty-query list the page rendered, so nothing is fetched on load (P3-R4).
  chosenDocuments?: PurchaseDocumentSearchRow[]
  recentDocuments: PurchaseDocumentSearchAnswer
  // Creating and linking a purchase document needs asset:edit (P3-R2): without it the section shows a note only and the
  // save sends no pre-check and no document step (the create page passes the person's permission, the edit page true).
  canLinkPurchaseDocuments: boolean
  // The edit page after a failed document step (?documents=failed, P3-R6): เอกสารจัดซื้อ opens with the warning.
  documentsFailed?: boolean
  customFieldDefinitions: CustomFieldDefinition[]
  existingAssetPhotos?: ExistingAssetPhoto[]
  cloneSource?: CloneSourceContext
  backHref?: string
  // The create page's own switch (เพิ่มทีละรายการ / เพิ่มเป็นชุด), shown in the header's actions.
  headerActions?: ReactNode
  // The edit page's facts (group 4 plan 2 Task 7): the header, the open handover, the links, and the stored labels that
  // "เดิม:" reads (Task 8).
  editContext?: AssetEditContext
}) {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")
  const apiError = useApiError()
  const validationMessage = useValidationMessage()
  // A held บุคคล or Stock asset opens with its holder's department, a clone too (group 4 plan 2 Task 6b); under an open
  // handover the stored department stays (the server keeps it, Task 7).
  const [values, setValues] = useState<AssetFormValues>(() => withDepartmentLock(asset ?? emptyAssetFormValues, employees, asset, editContext))
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
  // The active draft's supplier: null follows the asset's (sent as none, the server's default), else the one picked.
  const [purchaseDocumentSupplierId, setPurchaseDocumentSupplierId] = useState<string | null>(null)
  const [selectedPurchaseFile, setSelectedPurchaseFile] = useState<File | null>(null)
  const [newPurchaseDocuments, setNewPurchaseDocuments] = useState<PurchaseDocumentDraft[]>([])
  // The queued drafts the pre-check refused, by draft id (the active draft's refusal is the number's field error).
  const [draftErrors, setDraftErrors] = useState<Record<string, PurchaseDocumentDraftErrorCode>>({})
  // The picker's chips (group 4 plan 3 Task 5): on edit the stored links first, on a clone the source's; and on edit
  // the stored ones marked for removal at บันทึกการแก้ไข (P3-R5).
  const [chosenDocuments, setChosenDocuments] = useState<PurchaseDocumentSearchRow[]>(() => initialChosenDocuments ?? [])
  const [removedDocumentIds, setRemovedDocumentIds] = useState<Set<string>>(() => new Set<string>())
  // The failure landing's list (P3-R6), read once from sessionStorage; [] shows the generic sentence.
  const [failedDocuments, setFailedDocuments] = useState<FailedPurchaseDocument[]>([])
  const [photoLabel, setPhotoLabel] = useState("")
  const [newAssetPhotos, setNewAssetPhotos] = useState<AssetPhotoDraft[]>([])
  const [nameManuallyEdited, setNameManuallyEdited] = useState(() => Boolean(asset?.id || asset?.name?.trim()))
  // The edit page's reason for a room, holder or แผนก correction (P2-R4).
  const [correctionReason, setCorrectionReason] = useState("")
  // The room, holder and แผนก the server last asked a reason for (a PUT refused under correctionReason): the reason stays
  // required while they stand, and no longer once one of them changes (final review).
  const [serverReasonFor, setServerReasonFor] = useState<string | null>(null)
  // The sections that held a change at the last render: a section opens when a change first shows in it (Task 8).
  const [changedSectionsSeen, setChangedSectionsSeen] = useState<Set<AssetFormSection>>(() => new Set<AssetFormSection>())
  // The folded sections that are open (spec §8, §9.1, P2-R11): on create เอกสารจัดซื้อ starts open; an error, the
  // #purchase and #documents links and the person's own click open the others. On edit every folded section starts
  // folded, เอกสารจัดซื้อ too, except after a failed document step (P3-R6); one with a change opens.
  const [openSections, setOpenSections] = useState<Set<AssetFormSection>>(() => new Set<AssetFormSection>(asset?.id && !documentsFailed ? [] : ["documents"]))
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
  // The stored links (edit only): what the save compares the chips with. A clone's documents are all new.
  const originalDocuments = isEdit ? initialChosenDocuments ?? [] : []
  const documentUploads = canLinkPurchaseDocuments
    ? listPurchaseDocumentUploads(newPurchaseDocuments, {
        documentType: purchaseDocumentType,
        documentNo: purchaseDocumentNo,
        documentDate: purchaseDocumentDate,
        totalAmount: purchaseDocumentTotalAmount,
        supplierId: purchaseDocumentSupplierId,
        file: selectedPurchaseFile,
      })
    : []
  const documentLinks = canLinkPurchaseDocuments
    ? planPurchaseDocumentLinks({ originalIds: originalDocuments.map((document) => document.id), chosen: chosenDocuments, removedIds: removedDocumentIds })
    : NO_DOCUMENT_LINKS
  const title = useMemo(() => (isEdit ? t("editTitleNamed", { name: asset?.name ?? "" }) : t("createTitle")), [isEdit, asset?.name, t])
  const headerEdit = isEdit && editContext ? { assetTag: asset?.assetTag ?? "", context: editContext } : undefined
  // An open handover (P2-R3): the server refuses a holder, room or แผนก change, so the three show the stored values.
  const openHandover = editContext?.openHandover ?? null
  const custodyLocked = openHandover !== null
  const originalLabels = editContext?.originalLabels ?? {}
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
  const departmentLock = departmentLockOf(values, employees, asset, editContext)
  const departmentLockText = departmentLock.text ?? departments.find((department) => department.id === departmentLock.departmentId)?.label ?? ""
  // The edit page's diff against the stored asset (group 4 plan 2 Task 8, spec §7.1, §7.3): the asset prop, never the
  // state, so the แผนก the form set to the holder's on load (the automatic fix) is a change of its own. The reason shows
  // when the person changed the room, the holder or แผนก (P2-R4), or when the save was refused for the lack of one.
  const correction = isEdit && asset ? getAssetEditCorrection({ original: asset, values, departmentLocked: departmentLock.locked }) : NO_CORRECTION
  // The documents the save adds, removes and uploads are rows of the list too (P3-R5).
  const changes = isEdit && asset
    ? [
        ...diffAssetFormValues(asset, values, { departmentAutomatic: correction.departmentAutomatic }),
        ...diffAssetFormDocuments({ original: originalDocuments, chosen: chosenDocuments, removedIds: removedDocumentIds, uploads: documentUploads }),
      ]
    : NO_CHANGES
  const showChanges = isEdit && changes.length > 0
  // Required by the change itself or by the server's refusal of these same values; a change put back drops it (final review).
  const custodyKey = [values.currentLocationId, values.custodianId, values.departmentId].join("|")
  const showCorrectionReason = isEdit && (correction.reasonNeeded || serverReasonFor === custodyKey)
  // An open handover keeps the stored แผนก (P2-R3); when it is not the holder's, the row says it is set later (spec §7.3).
  const departmentMismatchLater =
    custodyLocked &&
    departmentFollowsHolder(ownershipType) &&
    Boolean(values.custodianId) &&
    Boolean(editContext?.holderDepartmentId) &&
    editContext?.holderDepartmentId !== (values.departmentId || null)
  // A section with a change has the changed frame and opens once, when the change first shows; the person may fold it.
  const sectionsWithChanges = new Set(changes.map((change) => sectionOfChange(change.field)))
  const newlyChanged = [...sectionsWithChanges].filter((section) => !changedSectionsSeen.has(section))
  if (newlyChanged.length > 0 || [...changedSectionsSeen].some((section) => !sectionsWithChanges.has(section))) {
    setChangedSectionsSeen(sectionsWithChanges)
    if (newlyChanged.length > 0) setOpenSections((current) => new Set([...current, ...newlyChanged]))
  }
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
      // A folded section opens before its field takes focus.
      reveal: (key) => openSection(sectionOfField(key)),
    })
  // A rule with a message of its own reads it from the asset messages; any other code reads the hook's message.
  const errorText = (key: AssetField) => {
    const code = fieldErrors.errors[key]
    // PUT answers a missing reason with fieldErrors { correctionReason: "required" }; it reads as the client's rule does.
    if (key === "correctionReason" && code === "required") return t("correctionReasonRequired")
    // The pre-check's refusal of the active draft (its type and number twice in this save).
    if (key === "purchaseDocumentNo" && code === "purchaseDocumentRepeated") return t("purchaseDocumentRepeated")
    return code && isAssetMessageCode(code) ? t(code) : fieldErrors.message(key)
  }
  // Under the room and the holder on edit: this page corrects what was recorded wrongly; a real move goes through โอนย้าย.
  // Not under an open handover, where โอนย้าย refuses the asset and the notice names the way out (P2-R3).
  const correctionHint = isEdit && editContext && !custodyLocked ? (
    t.rich("correctionHint", {
      link: (chunks) => <Link href={editContext.transferHref} className={linkVariants({ size: "inherit" })}>{chunks}</Link>,
    })
  ) : null

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

  // The failure landing (P3-R6): the save left the failed documents' type, number and file name under the asset's key;
  // they are read once and dropped. Storage that is blocked or empty leaves the generic sentence.
  useEffect(() => {
    if (!documentsFailed || !asset?.id) return
    const key = failedPurchaseDocumentsKey(asset.id)
    const timeout = window.setTimeout(() => {
      try {
        const items = parseFailedPurchaseDocuments(window.sessionStorage.getItem(key))
        window.sessionStorage.removeItem(key)
        setFailedDocuments(items)
      } catch {
        // No storage: the Notice keeps its generic sentence.
      }
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [documentsFailed, asset?.id])

  // The asset page's "บันทึกข้อมูลการซื้อ" links here with #purchase: that folded section opens (the browser has already
  // scrolled to its anchor). A later hash change does the same.
  useEffect(() => {
    const openSectionNow = (section: AssetFormSection) => setOpenSections((current) => (current.has(section) ? current : new Set(current).add(section)))
    const openFromHash = () => {
      if (window.location.hash === "#purchase") openSectionNow("purchase")
      if (window.location.hash === "#documents") openSectionNow("documents")
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
    // Under an open handover the holder, แผนก and the room stay: they are read-only (P2-R3).
    setValues((current) => ({
      ...current,
      companyId,
      branchId: "",
      ...(custodyLocked ? {} : { departmentId: "", custodianId: "", currentLocationId: "" }),
      homeLocationId: "",
    }))
  }

  function handleBranchChange(branchId: string) {
    fieldErrors.clear("branchId", "custodianId", "currentLocationId")
    setValues((current) => ({
      ...current,
      branchId,
      ...(custodyLocked ? {} : { custodianId: "", currentLocationId: "" }),
      homeLocationId: "",
    }))
  }

  function handleCrossCompanyCustodianToggle(checked: boolean) {
    setAllowCrossCompanyCustodian(checked)
    if (checked || custodyLocked) return

    setValues((current) => {
      const custodian = employees.find((employee) => employee.id === current.custodianId)
      if (employeeMatchesAssetScope(custodian, current, branches)) return current
      return { ...current, custodianId: "" }
    })
  }

  // A holder on บุคคล or Stock brings its department (the lock); a cleared holder frees แผนก, which keeps its value.
  function handleCustodianChange(custodianId: string) {
    fieldErrors.clear("custodianId", "departmentId")
    setValues((current) => withDepartmentLock({ ...current, custodianId }, employees, asset, editContext))
  }

  function handleCrossBranchLocationToggle(checked: boolean) {
    setAllowCrossBranchLocation(checked)
    if (checked) return

    setValues((current) => {
      const homeLocation = locations.find((location) => location.id === current.homeLocationId)
      const currentLocation = locations.find((location) => location.id === current.currentLocationId)
      const nextHomeLocationId = locationMatchesAssetBranch(homeLocation, current.branchId) ? current.homeLocationId : ""
      const nextCurrentLocationId = custodyLocked || locationMatchesAssetBranch(currentLocation, current.branchId) ? current.currentLocationId : ""

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
    // Under an open handover the holder is read-only, so ส่วนควบ keeps it (the server's lock refuses a change, final review).
    setValues((current) => withDepartmentLock(changeOwnershipType(current, nextOwnershipType, { custodyLocked }), employees, asset, editContext))
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
        correction: showCorrectionReason ? { required: true, reason: correctionReason } : undefined,
      }),
    )
    if (focusFirstError()) return
    setSaving(true)

    const url = isEdit ? `/api/assets/${asset?.id}` : "/api/assets"
    const method = isEdit ? "PUT" : "POST"

    try {
      // A new document whose type and number are already stored (an inactive one too, P3-R3), or twice in this save, is
      // refused under its number before the asset is saved: nothing else is posted, the file and fields stay.
      if (documentUploads.length > 0 && !(await passesPurchaseDocumentPreCheck(documentUploads))) return

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? assetEditBody(values, showCorrectionReason ? correctionReason : "") : assetCreateBody(values)),
      })

      const result = await response.json().catch(() => null)
      if (!response.ok) {
        // A refusal that names a field of this form shows under it; any other keeps the toast (spec §4.1).
        if (result?.fieldErrors?.correctionReason) setServerReasonFor(custodyKey)
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

      let documentStepFailed = false
      if (savedId) {
        // เอกสารจัดซื้อ (spec §9.3, P3-R5): each new document is created and linked in one multipart request, then the
        // newly chosen ones are linked in one JSON request, then on edit each removed chip is unlinked. Each request
        // stands alone; a failed one sends the page to the edit form with the failed drafts named (P3-R6).
        const failedUploads: FailedPurchaseDocument[] = []
        let linksFailed = false
        for (const upload of documentUploads) {
          try {
            await uploadPurchaseDocument(savedId, upload)
          } catch {
            failedUploads.push({ documentType: upload.documentType, documentNo: upload.documentNo, fileName: upload.file.name })
          }
        }
        try {
          if (documentLinks.linkIds.length > 0) await linkPurchaseDocuments(savedId, documentLinks.linkIds)
        } catch {
          linksFailed = true
        }
        for (const documentId of documentLinks.unlinkIds) {
          try {
            await unlinkPurchaseDocument(savedId, documentId)
          } catch {
            linksFailed = true
          }
        }
        if (failedUploads.length > 0 || linksFailed) {
          documentStepFailed = true
          failedSteps.push(t("followUpDocuments"))
          rememberFailedDocuments(savedId, failedUploads)
        }

        try {
          if (newAssetPhotos.length > 0) await uploadAssetPhotos(savedId, newAssetPhotos)
        } catch {
          failedSteps.push(t("followUpPhotos"))
        }
      }

      if (failedSteps.length > 0) {
        toast.warning(t("savedWithFollowUpErrors", { items: failedSteps.join(", ") }))
        // A failed document step lands on the edit page with เอกสารจัดซื้อ open (P3-R6); any other on the asset page.
        if (documentStepFailed) router.push(`/${locale}/assets/${savedId}/edit?documents=failed#documents`)
        else router.push(`/${locale}/assets/${savedId}`)
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

  // "+ เพิ่มอีกใบ": the active draft joins the list above it and the fields empty for the next one.
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
        supplierId: purchaseDocumentSupplierId,
        file: selectedPurchaseFile,
      },
    ])
    setSelectedPurchaseFile(null)
    setPurchaseDocumentNo("")
    setPurchaseDocumentDate("")
    setPurchaseDocumentTotalAmount("")
    setPurchaseDocumentSupplierId(null)
    // A refusal of the moved fields belonged to the active draft; the next save checks the row again.
    fieldErrors.clear("purchaseDocumentNo")
  }

  function removePurchaseDocument(id: string) {
    setNewPurchaseDocuments((current) => current.filter((document) => document.id !== id))
    setDraftErrors((current) => {
      if (!(id in current)) return current
      const next = { ...current }
      delete next[id]
      return next
    })
  }

  // The picker's choice. On edit, choosing a stored document marked for removal keeps it ("เก็บไว้").
  function chooseDocument(row: PurchaseDocumentSearchRow) {
    if (removedDocumentIds.has(row.id)) {
      setRemovedDocumentIds((current) => {
        const next = new Set(current)
        next.delete(row.id)
        return next
      })
      return
    }
    setChosenDocuments((current) => (current.some((document) => document.id === row.id) ? current : [...current, row]))
  }

  // A chip's ×: on edit a stored document is marked for removal at the save (P3-R5); any other chip simply goes.
  function removeDocument(id: string) {
    if (originalDocuments.some((document) => document.id === id)) {
      setRemovedDocumentIds((current) => new Set(current).add(id))
      return
    }
    setChosenDocuments((current) => current.filter((document) => document.id !== id))
  }

  // The pre-check (Task 3) of every draft the save would upload. True when none is refused; a refusal shows under the
  // active number or on its queued row, and focus goes to the first. A failed request throws to the save's catch.
  async function passesPurchaseDocumentPreCheck(uploads: PurchaseDocumentDraft[]): Promise<boolean> {
    const response = await fetch(purchaseDocumentCheckPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documents: uploads.map((upload) => ({ documentType: upload.documentType, documentNo: upload.documentNo })) }),
    })
    const result = await response.json().catch(() => null)
    if (!response.ok) throw new Error(result?.error ?? tCommon("error"))
    const duplicates: PurchaseDocumentDuplicateAnswer[] = Array.isArray(result?.duplicates) ? result.duplicates : []
    const refused = mapPurchaseDocumentDuplicates(uploads, duplicates)
    setDraftErrors(refused.rows)
    if (refused.active) {
      fieldErrors.setErrors({ ...fieldErrors.errors, purchaseDocumentNo: refused.active })
      focusFirstError()
      return false
    }
    const firstRow = uploads.find((upload) => upload.id in refused.rows)
    if (!firstRow) return true
    openSection("documents")
    void waitForElement(`asset-purchase-document-draft-${firstRow.id}`).then((element) => {
      if (element) focusField(element)
    })
    return false
  }

  function draftErrorText(id: string): string | undefined {
    const code = draftErrors[id]
    if (!code) return undefined
    return code === "purchaseDocumentRepeated" ? t("purchaseDocumentRepeated") : validationMessage(code)
  }

  // What the edit page names after the move (P3-R6): type, number and file name, never the file. Storage that is
  // blocked leaves the generic sentence there.
  function rememberFailedDocuments(assetId: string, items: FailedPurchaseDocument[]) {
    if (items.length === 0) return
    try {
      window.sessionStorage.setItem(failedPurchaseDocumentsKey(assetId), JSON.stringify(items))
    } catch {
      // The edit page shows the generic sentence.
    }
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

  // One new document, created and linked to the asset in one request (Task 3); a refusal (a file check, the virus
  // scan, a duplicate raced in) throws, and no document or file is left behind.
  async function uploadPurchaseDocument(assetId: string, draft: PurchaseDocumentDraft) {
    const response = await fetch(assetPurchaseDocumentsPath(assetId), { method: "POST", body: buildPurchaseDocumentUploadForm(draft) })
    if (!response.ok) throw new Error(`purchase document upload ${response.status}`)
  }

  async function linkPurchaseDocuments(assetId: string, purchaseDocumentIds: string[]) {
    const response = await fetch(assetPurchaseDocumentsPath(assetId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchaseDocumentIds }),
    })
    if (!response.ok) throw new Error(`purchase document link ${response.status}`)
  }

  // Edit only: the link goes, the document and its files stay (Task 3).
  async function unlinkPurchaseDocument(assetId: string, documentId: string) {
    const response = await fetch(assetPurchaseDocumentPath(assetId, documentId), { method: "DELETE" })
    if (!response.ok) throw new Error(`purchase document unlink ${response.status}`)
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
    documents: { mode: isEdit ? "edit" : "create", chosen: chosenDocuments, removedIds: removedDocumentIds, queued: documentUploads.length },
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
      case "documentRefs":
        return buildPurchaseDocumentRefsSummary(part.refs, (type) => t(`purchaseDocumentTypes.${type}`))
      default:
        return t(`sectionSummary.${part.key}`, { count: part.count })
    }
  }

  // The edit page's changes as the form shows them (Task 8): a reference by its option label, else the stored label (a
  // record no longer active), the ownership type by its name, a date and a price as the asset page shows them.
  const changeOptions: Partial<Record<AssetDiffField, Option[]>> = {
    categoryId: categories,
    brandId: brands,
    modelId: models,
    companyId: companies,
    branchId: branches,
    departmentId: departments,
    custodianId: employees,
    homeLocationId: locations,
    currentLocationId: locations,
    statusId: statuses,
    conditionId: conditions,
    supplierId: suppliers,
    licenseAssignedAssetId: parentAssets,
  }

  function changeValueText(field: AssetDiffField, value: string): string {
    if (!value) return ""
    const options = changeOptions[field]
    if (options) return options.find((option) => option.id === value)?.label ?? originalLabels[field as AssetOriginalLabelField] ?? value
    if (field === "ownershipType") return t(`ownershipType_${normalizeAssetOwnershipType(value)}`)
    if (DATE_CHANGE_FIELDS.has(field)) return formatDate(value)
    if (field === "purchasePrice") return formatMoney(Number(value), { unit: tCommon("baht") })
    return value
  }

  function changeLabel(field: AssetDiffField): string {
    if (isPurchaseDocumentChange(field)) return t("purchaseDocuments")
    if (field === "serialNumber" && isSoftwareLicense) return t("licenseKey")
    if (field === "custodianId" && isSoftwareLicense) return t("licenseAssignee")
    const label = CHANGE_LABELS[field]
    if (label) return t(label)
    const fieldName = field.slice("customFields.".length)
    const definition = customFieldDefinitions.find((item) => item.fieldName === fieldName)
    return (locale === "th" && definition?.fieldLabelTh) || definition?.fieldLabel || fieldName
  }

  // A document row reads "เพิ่ม <เลขที่>" or "เอา <เลขที่> ออก" (P3-R5).
  const changeRows: AssetFormChangeRow[] = changes.map((change) => ({
    field: change.field,
    label: changeLabel(change.field),
    from: isPurchaseDocumentChange(change.field) ? "" : changeValueText(change.field, change.from),
    to: isPurchaseDocumentChange(change.field)
      ? change.to
        ? t("purchaseDocumentChangeAdd", { number: change.to })
        : t("purchaseDocumentRemoveNamed", { number: change.from })
      : changeValueText(change.field, change.to),
    automatic: change.automatic,
  }))
  const changeByField = new Map(changes.map((change) => [change.field, change]))

  // A changed field's old value and คืนค่าเดิม. A แผนก locked to a new holder comes back with the holder, so it has none.
  function changeOf(field: AssetDiffField): AssetFieldChange | null {
    const change = changeByField.get(field)
    if (!change) return null
    const restorable = !change.automatic && !(field === "departmentId" && departmentLock.locked)
    return {
      was: changeValueText(field, change.from) || tCommon("noValue"),
      automatic: change.automatic,
      onRestore: restorable ? () => restoreField(field) : undefined,
    }
  }

  // คืนค่าเดิม: the stored value comes back, and the department lock follows (a holder put back brings its แผนก). The
  // company or the branch brings back the rest of the asset's place with it (the branch, both rooms, the holder and แผนก),
  // so a branch of another company is never left behind; the read-only custody stays under an open handover (final
  // review). Focus then goes to the field, since คืนค่าเดิม itself leaves with the change.
  function restoreField(field: AssetDiffField) {
    if (!asset) return
    const keys: (keyof AssetFormValues)[] =
      field === "companyId" || field === "branchId"
        ? ["companyId", "branchId", "homeLocationId", ...(custodyLocked ? [] : (["currentLocationId", "custodianId", "departmentId"] as const))]
        : [field as keyof AssetFormValues]
    const stored = Object.fromEntries(keys.map((key) => [key, asset[key] ?? ""]))
    setValues((current) => withDepartmentLock({ ...current, ...stored }, employees, asset, editContext))
    fieldErrors.clear(...keys.filter((key) => key in FIELD_IDS).map((key) => key as AssetFixedField))
    goToField(field)
  }

  // ไปที่ช่อง: the field's section opens, then the field takes focus once the list has closed. A แผนก locked to the holder
  // has no control of its own (the holder brings it), so focus goes to the holder. A row with no control
  // left (an extra custom field, the stored custom-field JSON) gives focus back to the change list (final review).
  function goToField(field: AssetDiffField) {
    const target: AssetDiffField = field === "departmentId" && departmentLock.locked ? "custodianId" : field
    openSection(sectionOfChange(target))
    requestAnimationFrame(() => {
      void waitForElement(changeFieldId(target, selectedCustomFieldDefinitions)).then((element) => {
        if (element && focusField(element)) return
        document.getElementById(CHANGE_LIST_TRIGGER_ID)?.focus()
      })
    })
  }

  function disclosureFor(section: AssetFormFoldedSection): AssetFormDisclosure {
    const summary = summarizeAssetFormSection(section, summaryInput)
    return {
      open: openSections.has(section),
      onOpenChange: (open) => setSectionOpen(section, open),
      summary: summary.parts.length > 0 ? summary.parts.map(summaryText).join(" · ") : undefined,
      badge: summary.badge
        ? t(`sectionSummary.${summary.badge.key}`, { count: summary.badge.count })
        : summary.total > 0 ? t("sectionFilled", { filled: summary.filled, total: summary.total }) : undefined,
      tone: sectionsWithErrors.has(section) ? "error" : sectionsWithChanges.has(section) ? "changed" : "default",
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <AssetFormHeader mode={isEdit ? "edit" : "create"} title={title} backHref={backHref} actions={headerActions} edit={headerEdit} />

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
        {/* Create and edit both read ข้อมูลที่ต้องกรอก (the user's decision, 2026-11-02); edit has no counter, every field
            there already holds the stored value (Task 7). */}
        <AssetFormRequiredCard title={t("requiredCardTitle")} counter={isEdit ? null : requiredProgress}>
          {openHandover ? (
            <Notice
              tone="warning"
              action={
                <Link href={openHandover.href} className={linkVariants({ size: "inherit" })}>
                  {t("openHandoverLink")}
                </Link>
              }
            >
              {t("openHandoverLock", { documentNo: openHandover.documentNo ?? "" })}
            </Notice>
          ) : null}
          <CardGroup title={t("basicInfo")}>
            {/* The duplicate check stays live (spec U8); a save that finds it focuses the field and shows the same line.
                On edit the code is text behind เปลี่ยนรหัส (P2-R6); the field's id sits on the row, so an error focuses
                the button and the live check still reads values.assetTag. */}
            <AssetFormChangedField change={changeOf("assetTag")}>
              <Field
                label={t("assetTag")}
                id="asset-tag"
                liveError={duplicateState.assetTagExists ? t("duplicateAssetTag") : null}
                error={duplicateState.assetTagExists ? t("duplicateAssetTag") : errorText("assetTag")}
              >
                {isEdit ? (
                  (control) => (
                    <div id={control.id} className="flex flex-wrap items-center gap-2">
                      <span className="tag">{values.assetTag}</span>
                      <AssetFormTagDialog currentTag={values.assetTag ?? ""} fieldLabel={t("assetTag")} describedBy={control["aria-describedby"]} onConfirm={(next) => setField("assetTag", next)} />
                    </div>
                  )
                ) : (
                  <Input
                    value={values.assetTag ?? ""}
                    onChange={(event) => setField("assetTag", event.target.value)}
                    maxLength={50}
                    placeholder={t("autoTagHint")}
                  />
                )}
              </Field>
            </AssetFormChangedField>
            <div className="grid min-w-0 gap-2">
              <AssetFormChangedField change={changeOf("name")}>
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
              </AssetFormChangedField>
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
            <AssetFormChangedField change={changeOf("categoryId")}>
              <SelectField label={t("category")} id="asset-category" value={values.categoryId} required error={errorText("categoryId")} onChange={handleCategoryChange}>
                <option value="">{t("selectCategory")}</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
              </SelectField>
            </AssetFormChangedField>
            <AssetFormChangedField change={changeOf("brandId")}>
              <SelectField label={t("brand")} id="asset-brand" value={values.brandId ?? ""} onChange={handleBrandChange}>
                <option value="">{t("selectBrand")}</option>
                {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.label}</option>)}
              </SelectField>
            </AssetFormChangedField>
            <AssetFormChangedField change={changeOf("modelId")}>
              <SelectField label={t("model")} id="asset-model" value={values.modelId ?? ""} onChange={handleModelChange}>
                <option value="">{t("selectModel")}</option>
                {filteredModels.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
              </SelectField>
            </AssetFormChangedField>
            <AssetFormChangedField change={changeOf("serialNumber")}>
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
            </AssetFormChangedField>
          </CardGroup>

          <AssetFormOwnership
            values={values}
            ownershipType={ownershipType}
            requiredFields={requiredFields}
            companies={companies}
            branches={filteredBranches}
            departments={custodyLocked ? withStoredOption(filteredDepartments, values.departmentId, originalLabels.departmentId) : filteredDepartments}
            employees={custodyLocked ? withStoredOption(filteredEmployees, values.custodianId, originalLabels.custodianId) : filteredEmployees}
            departmentLock={departmentLock}
            departmentLockText={departmentLockText}
            allowCrossCompanyCustodian={allowCrossCompanyCustodian}
            hasCrossCompanyCustodian={hasCrossCompanyCustodian}
            custodyLocked={custodyLocked}
            correctionHint={correctionHint}
            departmentMismatchLater={departmentMismatchLater}
            changeOf={changeOf}
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
            <AssetFormChangedField change={changeOf("homeLocationId")}>
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
            </AssetFormChangedField>
            <div className="grid min-w-0 gap-2">
              <AssetFormChangedField change={changeOf("currentLocationId")}>
                <SelectField
                  label={t("currentLocation")}
                  id="asset-current-location"
                  value={values.currentLocationId}
                  required
                  disabled={custodyLocked}
                  hint={correctionHint}
                  error={errorText("currentLocationId")}
                  onChange={(value) => setField("currentLocationId", value)}
                >
                  <option value="">{t("selectLocation")}</option>
                  {(custodyLocked ? withStoredOption(filteredLocations, values.currentLocationId, originalLabels.currentLocationId) : filteredLocations).map((location) => <option key={location.id} value={location.id}>{getLocationOptionLabel(location, allowCrossBranchLocation, branches)}</option>)}
                </SelectField>
              </AssetFormChangedField>
              {/* ใช้ที่ตั้งประจำ: the asset is back in its home room (group 4 plan 2 Task 6b); not while the room is locked. */}
              {!custodyLocked && values.homeLocationId && values.homeLocationId !== values.currentLocationId ? (
                <div>
                  <Button variant="outline" size="sm" onClick={() => setField("currentLocationId", values.homeLocationId ?? "")}>
                    {t("useHomeLocation")}
                  </Button>
                </div>
              ) : null}
            </div>
            <div>
              <AssetFormChangedField change={changeOf("statusId")}>
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
              </AssetFormChangedField>
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
            <AssetFormChangedField change={changeOf("conditionId")}>
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
            </AssetFormChangedField>
            {/* The edit page's reason (P2-R4): under the room and status rows, while the room, the holder or แผนก is changed
                by the person; the change list repeats it. */}
            {showCorrectionReason ? (
              <div className="md:col-span-2">
                <Field label={t("correctionReasonLabel")} id="asset-correction-reason" required error={errorText("correctionReason")}>
                  <Textarea
                    value={correctionReason}
                    onChange={(event) => {
                      setCorrectionReason(event.target.value)
                      fieldErrors.clear("correctionReason")
                    }}
                    rows={3}
                    maxLength={500}
                    required
                  />
                </Field>
              </div>
            ) : null}
          </CardGroup>
        </AssetFormRequiredCard>

        {isSoftwareLicense && (
          <Section title={t("licenseManagement")}>
            {/* The server lets the total stay empty, so it has no star (spec §11 call 8). */}
            <AssetFormChangedField change={changeOf("licenseTotalSeats")}>
              <Field label={t("licenseTotalSeats")} id="asset-license-total-seats" error={errorText("licenseTotalSeats")}>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={values.licenseTotalSeats ?? ""}
                  onChange={(event) => setField("licenseTotalSeats", event.target.value)}
                />
              </Field>
            </AssetFormChangedField>
            <AssetFormChangedField change={changeOf("licenseUsedSeats")}>
              <Field label={t("licenseUsedSeats")} id="asset-license-used-seats" error={errorText("licenseUsedSeats")}>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={values.licenseUsedSeats ?? ""}
                  onChange={(event) => setField("licenseUsedSeats", event.target.value)}
                />
              </Field>
            </AssetFormChangedField>
            <AssetFormChangedField change={changeOf("licenseAssignedAssetId")}>
              <SelectField
                label={t("licenseAssignedAsset")}
                id="asset-license-assigned-asset"
                value={values.licenseAssignedAssetId ?? ""}
                onChange={(value) => setField("licenseAssignedAssetId", value)}
              >
                <option value="">{t("selectLicenseAssignedAsset")}</option>
                {parentAssets.map((parentAsset) => (
                  <option key={parentAsset.id} value={parentAsset.id}>{parentAsset.label}</option>
                ))}
              </SelectField>
            </AssetFormChangedField>
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
          changeOf={changeOf}
          disclosure={disclosureFor("purchase")}
        />

        <AssetFormDocuments
          errorText={errorText}
          fieldErrors={fieldErrors}
          saving={saving}
          canLink={canLinkPurchaseDocuments}
          chosen={chosenDocuments}
          recent={recentDocuments}
          supplierId={values.supplierId || null}
          removedIds={isEdit ? removedDocumentIds : undefined}
          onChoose={chooseDocument}
          onRemove={removeDocument}
          suppliers={suppliers}
          purchaseDocumentType={purchaseDocumentType}
          setPurchaseDocumentType={setPurchaseDocumentType}
          purchaseDocumentNo={purchaseDocumentNo}
          setPurchaseDocumentNo={setPurchaseDocumentNo}
          purchaseDocumentDate={purchaseDocumentDate}
          setPurchaseDocumentDate={setPurchaseDocumentDate}
          purchaseDocumentTotalAmount={purchaseDocumentTotalAmount}
          setPurchaseDocumentTotalAmount={setPurchaseDocumentTotalAmount}
          purchaseDocumentSupplierId={purchaseDocumentSupplierId ?? values.supplierId ?? ""}
          setPurchaseDocumentSupplierId={setPurchaseDocumentSupplierId}
          selectedPurchaseFile={selectedPurchaseFile}
          selectPurchaseFile={selectPurchaseFile}
          addPurchaseDocument={addPurchaseDocument}
          newPurchaseDocuments={newPurchaseDocuments}
          removePurchaseDocument={removePurchaseDocument}
          draftErrorText={draftErrorText}
          failedNotice={
            documentsFailed ? (
              <Notice tone="warning" title={t("documentsFailedTitle")}>
                {failedDocuments.length > 0 ? (
                  <>
                    <p>{t("documentsFailedList")}</p>
                    <ul className="mt-1 list-disc pl-5">
                      {failedDocuments.map((document, index) => (
                        <li key={`${document.documentType}-${document.documentNo}-${index}`} className="break-words">
                          {[t(`purchaseDocumentTypes.${document.documentType}`), document.documentNo, document.fileName].filter(Boolean).join(" · ")}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  t("documentsFailedGeneric")
                )}
              </Notice>
            ) : null
          }
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
          changeOf={changeOf}
          disclosure={disclosureFor("other")}
        />

        {/* The save stays enabled while fields are missing: validate() shows each error and focuses the first one. On edit
            the status holds "แก้ไข n ช่อง", which opens the list of changes (Task 8). The status grid starts its items, so that
            trigger is as wide as its text; the missing line names the fields from sm only, so a phone's footer stays short. */}
        <StickyFormFooter
          status={
            duplicateState.checking || showMissing || showChanges ? (
              <span className="grid justify-items-start gap-1">
                {duplicateState.checking ? <span id="asset-save-reason">{t("duplicateCheckPending")}</span> : null}
                {showMissing ? (
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="min-w-0 break-words">
                      {t("requiredMissing", { count: requiredProgress.missing.length })}
                      <span className="hidden sm:inline"> {t("requiredMissingFields", { fields: requiredProgress.missing.map((field) => t(REQUIRED_FIELD_LABELS[field])).join(", ") })}</span>
                    </span>
                    <Button variant="ghost" size="sm" onClick={goToFirstMissing}>
                      {t("goToFirstMissing")}
                    </Button>
                  </span>
                ) : null}
                {showChanges ? <AssetFormChangeList changes={changeRows} reason={correctionReason.trim()} onGoToField={goToField} /> : null}
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
            {isEdit ? t("saveCorrection") : tCommon("save")}
          </Button>
        </StickyFormFooter>
      </form>
    </div>
  )
}

// The POST body: the values without the chosen document ids, which the links after the save carry (plan 3 Task 5).
function assetCreateBody(values: AssetFormValues) {
  const body: Partial<AssetFormValues> = { ...values }
  delete body.purchaseDocumentIds
  return body
}

// The PUT body (P2-R4, P2-R7): the values without isActive, which the edit never sends, nor the document ids, which the
// links and unlinks after the save carry (plan 3 Task 5), and the reason, trimmed, when given.
function assetEditBody(values: AssetFormValues, reason: string) {
  const body: Partial<AssetFormValues> & { correctionReason?: string } = { ...values }
  delete body.isActive
  delete body.purchaseDocumentIds
  const correctionReason = reason.trim()
  if (correctionReason) body.correctionReason = correctionReason
  return body
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
// department are the current ones; on create (a clone included) there are none. context is the edit page's: the stored
// holder's department (an inactive holder is not among the options) and the open handover, which leaves the stored
// department as it is (Task 7, P2-R3).
function departmentLockOf(values: AssetFormValues, employees: Option[], original: AssetFormValues | undefined, context?: AssetEditContext) {
  const holder = employees.find((employee) => employee.id === values.custodianId)
  const stored = original?.id ? original : undefined
  const storedHolder = !holder && Boolean(stored?.custodianId) && values.custodianId === stored?.custodianId
  return getAssetFormDepartmentLock({
    ownership: normalizeAssetOwnershipType(values.ownershipType),
    custodianId: values.custodianId || null,
    holderDepartmentId: holder?.departmentId ?? (storedHolder ? context?.holderDepartmentId ?? null : null),
    holderDepartmentName: holder?.departmentName ?? (storedHolder ? context?.holder?.departmentName ?? null : null),
    currentCustodianId: stored?.custodianId || null,
    currentDepartmentId: stored?.departmentId || null,
    openHandover: context ? context.openHandover !== null : false,
    // A written-off asset keeps its stored แผนก with the holder unchanged, as the server does (final review).
    custodyFrozen: context ? isCustodyFrozen(context.statusName) : false,
  })
}

// Writes the locked department into the values, so the counter counts it and the save sends it.
function withDepartmentLock(values: AssetFormValues, employees: Option[], original: AssetFormValues | undefined, context?: AssetEditContext): AssetFormValues {
  const lock = departmentLockOf(values, employees, original, context)
  if (!lock.locked || !lock.departmentId || lock.departmentId === values.departmentId) return values
  return { ...values, departmentId: lock.departmentId }
}

// A read-only control shows the stored value even when the record is no longer among the active options (its label
// comes with the asset, editContext.originalLabels).
function withStoredOption(options: Option[], id: string | null | undefined, label: string | undefined): Option[] {
  if (!id || !label || options.some((option) => option.id === id)) return options
  return [...options, { id, label }]
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
