// The asset form's pure rules (group 4 plan 2 Task 5): the values and their field keys, the fields in visual order with
// the ids focus moves to, the required list behind validate() and the form's counter, the section each field sits in,
// validate() itself, the custom-field JSON helpers and the photo-label matching. Pure and client-safe, with relative
// imports only, so tests and the form's client components import this file.
import { getRegisterDepartment } from "./asset-department-rule.ts"
import { getAssetLifecycleTransitionError } from "./asset-lifecycle-policy.ts"
import { defaultAssetOwnershipType, normalizeAssetOwnershipType, ownershipMayHaveHolder, type AssetOwnershipType } from "./asset-ownership.ts"
import { atLeastOne, decimals, maxLength, notBefore, range, required, wholeNumber } from "./validation-rules.ts"

export type AssetFormOption = {
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
  // An employee's department name: the department lock's "ตามผู้ถือครอง: {department}" (group 4 plan 2 Task 6b).
  departmentName?: string | null
  categoryId?: string | null
  brandId?: string | null
  photoChecklist?: string[]
}

export type CustomFieldDefinition = {
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

export type AssetFormValues = {
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

export type CustomFieldRow = {
  id: string
  key: string
  value: string
}

export type PurchaseDocumentOption = {
  id: string
  documentType: string
  documentNo: string
  poNumber?: string | null
  invoiceNumber?: string | null
  supplierName?: string | null
  assetCount: number
}

export type PurchaseDocumentDraft = {
  id: string
  documentType: string
  documentNo: string
  documentDate: string
  totalAmount: string
  file: File
}

export type AssetPhotoDraft = {
  id: string
  label: string
  file: File
}

export type ExistingAssetPhoto = {
  id: string
  originalName: string
  fileType: string
  fileSize: number
}

export type CloneSourceContext = {
  id: string
  assetTag: string
  name: string
}

export const purchaseDocumentTypes = ["purchase_order", "invoice", "delivery_note", "warranty", "quotation", "contract", "other"] as const
export type PurchaseDocumentType = (typeof purchaseDocumentTypes)[number]

export const emptyAssetFormValues: AssetFormValues = {
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
// fields sit between the photo and the raw JSON: fieldOrder() puts them there and fieldId() names them. correctionReason
// is the edit page's reason for a room, holder or แผนก correction (group 4 plan 2 Task 8, P2-R4), under those rows.
export const FIELD_IDS = {
  assetTag: "asset-tag",
  name: "asset-name",
  categoryId: "asset-category",
  serialNumber: "asset-serial-number",
  ownershipType: "asset-ownership-type",
  companyId: "asset-company",
  branchId: "asset-branch",
  departmentId: "asset-department",
  custodianId: "asset-custodian",
  homeLocationId: "asset-home-location",
  currentLocationId: "asset-current-location",
  statusId: "asset-status",
  conditionId: "asset-condition",
  correctionReason: "asset-correction-reason",
  licenseTotalSeats: "asset-license-total-seats",
  licenseUsedSeats: "asset-license-used-seats",
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
export type AssetFixedField = keyof typeof FIELD_IDS
export type AssetField = AssetFixedField | `customFields.${string}`

// The asset rules that read the message their toast used (spec §7.1); every other code reads common.validation or the
// api-error catalog through the hook.
export const ASSET_MESSAGE_CODES = [
  "componentParentRequired",
  "componentRoleRequired",
  "licenseResponsibilityRequired",
  "purchaseDocumentNoRequired",
  "fileRequired",
  "customFieldsJsonInvalid",
  "correctionReasonRequired",
] as const
export type AssetMessageCode = (typeof ASSET_MESSAGE_CODES)[number]

export function isAssetMessageCode(code: string): code is AssetMessageCode {
  return (ASSET_MESSAGE_CODES as readonly string[]).includes(code)
}

export function customFieldKey(fieldName: string): AssetField {
  return `customFields.${fieldName}`
}

// Visual order: the fixed fields, the template's custom fields, then the raw JSON.
export function fieldOrder(definitions: CustomFieldDefinition[]): AssetField[] {
  const fixed = (Object.keys(FIELD_IDS) as AssetFixedField[]).filter((key) => key !== "customFieldsJson")
  return [...fixed, ...definitions.map((definition) => customFieldKey(definition.fieldName)), "customFieldsJson"]
}

// A custom field's id is its place in the template: a field name may hold a space, which an id list cannot.
export function fieldId(key: AssetField, definitions: CustomFieldDefinition[]): string {
  if (key in FIELD_IDS) return FIELD_IDS[key as AssetFixedField]
  return `asset-custom-field-${definitions.findIndex((definition) => customFieldKey(definition.fieldName) === key)}`
}

// The fields a save needs, in visual order (spec §8): 8 for บุคคล and License, 9 with the department for ส่วนกลาง,
// Stock and ส่วนควบ. validate() and the form's counter both read this list, so the two cannot drift.
const REQUIRED_ASSET_FIELDS = ["name", "categoryId", "ownershipType", "companyId", "branchId", "departmentId", "currentLocationId", "statusId", "conditionId"] as const
export type AssetRequiredField = (typeof REQUIRED_ASSET_FIELDS)[number]

export function getRequiredAssetFields(ownership: AssetOwnershipType): AssetRequiredField[] {
  const departmentRequired = ownership !== "personal" && ownership !== "software_license"
  return REQUIRED_ASSET_FIELDS.filter((field) => field !== "departmentId" || departmentRequired)
}

// The counter of the required card: how many of the required fields hold a value, and the missing ones in visual
// order. A department locked to the holder's is set to it, so it counts as filled.
export function countRequiredFilled(values: AssetFormValues, ownership: AssetOwnershipType): { filled: number; total: number; missing: AssetRequiredField[] } {
  const fields = getRequiredAssetFields(ownership)
  const missing = fields.filter((field) => required(values[field]) !== null)
  return { filled: fields.length - missing.length, total: fields.length, missing }
}

// The form's sections (P2-R11): the required card, the License seats, then the folded ones. A field error opens the
// section that holds the field before focus moves to it.
export type AssetFormSection = "main" | "license" | "install" | "purchase" | "documents" | "photos" | "customFields" | "other"

const FIELD_SECTIONS: Record<AssetFixedField, AssetFormSection> = {
  assetTag: "main",
  name: "main",
  categoryId: "main",
  serialNumber: "main",
  ownershipType: "main",
  companyId: "main",
  branchId: "main",
  departmentId: "main",
  custodianId: "main",
  homeLocationId: "main",
  currentLocationId: "main",
  statusId: "main",
  conditionId: "main",
  correctionReason: "main",
  licenseTotalSeats: "license",
  licenseUsedSeats: "license",
  parentAssetId: "install",
  componentRole: "install",
  slotNo: "install",
  installReason: "install",
  purchaseDate: "purchase",
  purchasePrice: "purchase",
  warrantyStartDate: "purchase",
  warrantyEndDate: "purchase",
  fixedAssetCode: "purchase",
  poNumber: "purchase",
  invoiceNumber: "purchase",
  purchaseDocumentNo: "documents",
  purchaseDocumentAmount: "documents",
  purchaseDocumentFile: "documents",
  assetPhotoFile: "photos",
  customFieldsJson: "other",
}

export function sectionOfField(field: AssetField): AssetFormSection {
  return field in FIELD_SECTIONS ? FIELD_SECTIONS[field as AssetFixedField] : "customFields"
}

// What the edit page reads with the asset for the form (group 4 plan 2 Task 7, spec §7.1-§7.3): the header's facts, the
// links to the asset page and to โอนย้าย, the open handover (holder, room and แผนก read-only, P2-R3), the stored holder's
// department (an inactive holder is not among the options) and the stored label of every reference field, so "เดิม:"
// reads for an inactive record too (Task 8).
export type AssetEditContext = {
  statusName: string
  statusNameTh: string
  holder: { name: string; departmentName: string | null } | null
  locationLine: string | null
  viewHref: string
  transferHref: string
  openHandover: { id: string; documentNo: string | null; href: string } | null
  holderDepartmentId: string | null
  originalLabels: Partial<Record<AssetOriginalLabelField, string>>
}
// Brand, model and supplier have no FIELD_IDS entry (no error of their own) but do have a stored label.
export type AssetOriginalLabelField = AssetField | "brandId" | "modelId" | "supplierId"

// The form's department lock (spec §7.3, P2-R1): on บุคคล and Stock with a holder, แผนก is the holder's and cannot be
// picked; the form writes it into values.departmentId, so the counter counts it and the save sends it. The register's
// own rule decides (getRegisterDepartment, the one POST and PUT use). text is the department's name for
// "ตามผู้ถือครอง: {department}", or null when the holder's department is not among the options. Under an open handover
// holder, room and department are read-only (Task 7), so the lock stays off; on a written-off asset (custodyFrozen) with
// the holder unchanged it stays off too, as the server skips the automatic fix there (final review).
export type AssetFormDepartmentLock = { locked: boolean; departmentId: string | null; text: string | null }

// A written-off status (Disposed, Retired): its custody cannot move (move_scope refused), the server's own test.
export function isCustodyFrozen(statusName: string | null | undefined): boolean {
  return getAssetLifecycleTransitionError("move_scope", statusName) !== null
}

export function getAssetFormDepartmentLock(input: {
  ownership: AssetOwnershipType
  custodianId: string | null
  holderDepartmentId: string | null
  holderDepartmentName: string | null
  currentCustodianId: string | null
  currentDepartmentId: string | null
  openHandover: boolean
  custodyFrozen?: boolean
}): AssetFormDepartmentLock {
  const free: AssetFormDepartmentLock = { locked: false, departmentId: null, text: null }
  if (input.openHandover || !input.custodianId) return free
  const register = getRegisterDepartment({
    ownership: input.ownership,
    currentCustodianId: input.currentCustodianId,
    nextCustodianId: input.custodianId,
    currentDepartmentId: input.currentDepartmentId,
    chosenDepartmentId: null,
    nextHolderDepartmentId: input.holderDepartmentId,
    openHandover: false,
    custodyFrozen: input.custodyFrozen,
  })
  if (register.source !== "holder") return free
  return { locked: true, departmentId: register.departmentId, text: input.holderDepartmentId ? input.holderDepartmentName : null }
}

// A change of the ownership type keeps the holder (P2-R2), except a change to ส่วนควบ: a component takes its parent's
// holder through the sync. Under an open handover (custodyLocked) the holder is read-only and the server's lock refuses
// a change of it, so ส่วนควบ keeps it too (final review).
export function changeOwnershipType(values: AssetFormValues, next: string, options: { custodyLocked?: boolean } = {}): AssetFormValues {
  const ownershipType = normalizeAssetOwnershipType(next)
  const keepsHolder = ownershipMayHaveHolder(ownershipType) || options.custodyLocked === true
  return { ...values, ownershipType, custodianId: keepsHolder ? values.custodianId : "" }
}

export type AssetRuleInput = {
  values: AssetFormValues
  // The stored asset on edit: the warranty pair is checked only when one of its dates changed (spec §7.4).
  original?: AssetFormValues
  duplicates: { assetTag: boolean; serialNumber: boolean }
  install: { parentAssetId: string; componentRole: string; slotNo: string; reason: string }
  customFields: { definitions: CustomFieldDefinition[]; valueOf: (fieldName: string) => string }
  purchaseDocument: { file: File | null; documentNo: string; totalAmount: string }
  // The edit page's reason (P2-R4), passed while its field shows: the room, the holder or แผนก changed by hand.
  correction?: { required: boolean; reason: string }
}

// noValidate turns the browser's check off, so this restates the controls' required, maxLength, min and the seats'
// step, and the rules the toasts used to say: the duplicate tag and serial, the license's assignee or department and
// its seats, the warranty pair, the install after create, the template's required fields, the raw JSON and a chosen
// purchase document's number (v-track M-R2, spec §7.4).
export function validate({ values, original, duplicates, install, customFields, purchaseDocument, correction }: AssetRuleInput): Partial<Record<AssetField, string>> {
  const errors: Partial<Record<AssetField, string>> = {}
  const check = (key: AssetField, code: string | null) => {
    if (code) errors[key] = code
  }
  const ownershipType = normalizeAssetOwnershipType(values.ownershipType)
  const isLicense = ownershipType === "software_license"
  // The required fields are getRequiredAssetFields' list, the one the form's counter reads.
  const requiredFields: readonly AssetField[] = getRequiredAssetFields(ownershipType)
  const requiredField = (key: AssetRequiredField) => (requiredFields.includes(key) ? required(values[key]) : null)
  const warrantyChanged =
    !original ||
    (values.warrantyStartDate ?? "") !== (original.warrantyStartDate ?? "") ||
    (values.warrantyEndDate ?? "") !== (original.warrantyEndDate ?? "")
  check("assetTag", duplicates.assetTag ? "duplicate" : maxLength(values.assetTag, 50))
  check("name", requiredField("name") ?? maxLength(values.name, 200))
  check("categoryId", requiredField("categoryId"))
  check("serialNumber", duplicates.serialNumber ? "duplicate" : maxLength(values.serialNumber, 100))
  check("ownershipType", requiredField("ownershipType"))
  check("companyId", requiredField("companyId"))
  check("branchId", requiredField("branchId"))
  check("departmentId", requiredField("departmentId"))
  check("custodianId", isLicense && atLeastOne([values.departmentId, values.custodianId]) ? "licenseResponsibilityRequired" : null)
  if (isLicense) {
    check("licenseTotalSeats", range(values.licenseTotalSeats, 0) ?? wholeNumber(values.licenseTotalSeats))
    check("licenseUsedSeats", range(values.licenseUsedSeats, 0) ?? wholeNumber(values.licenseUsedSeats) ?? seatsExceeded(values))
  }
  check("currentLocationId", requiredField("currentLocationId"))
  check("statusId", requiredField("statusId"))
  check("conditionId", requiredField("conditionId"))
  check("correctionReason", correction?.required && required(correction.reason) ? "correctionReasonRequired" : maxLength(correction?.reason, 500))
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
export function validatePurchaseDocument(file: File | null, documentNo: string): Partial<Record<AssetField, string>> {
  const errors: Partial<Record<AssetField, string>> = {}
  if (!file) errors.purchaseDocumentFile = "fileRequired"
  const number = required(documentNo) ? "purchaseDocumentNoRequired" : maxLength(documentNo, 100)
  if (number) errors.purchaseDocumentNo = number
  return errors
}

// The server's rule (validations/asset.ts): used seats never exceed the total, when both are given.
export function seatsExceeded(values: AssetFormValues): "licenseSeatsExceeded" | null {
  if (required(values.licenseTotalSeats) || required(values.licenseUsedSeats)) return null
  return Number(values.licenseUsedSeats) > Number(values.licenseTotalSeats) ? "licenseSeatsExceeded" : null
}

export function createCustomFieldRow(key = "", value = ""): CustomFieldRow {
  return {
    id: createClientId(),
    key,
    value,
  }
}

export function createClientId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
}

export function attachmentMatchesPhotoLabel(
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

export function legacySanitizedPhotoLabel(label: string) {
  const normalized = label.normalize("NFKD")
  return normalized.replace(/[^\w.\- ]+/g, "_").replace(/\s+/g, " ").trim()
}

export function parseCustomFieldRows(json?: string | null): CustomFieldRow[] {
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

export function serializeCustomFieldRows(rows: CustomFieldRow[]) {
  const data = rows.reduce<Record<string, string>>((current, row) => {
    const key = row.key.trim()
    if (key) {
      current[key] = row.value.trim()
    }
    return current
  }, {})

  return Object.keys(data).length > 0 ? JSON.stringify(data, null, 2) : ""
}

export function isValidCustomFieldsJson(json?: string | null) {
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
