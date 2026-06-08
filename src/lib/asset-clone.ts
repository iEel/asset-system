type StringableValue = { toString(): string }

export type AssetCloneSource = {
  id: string
  assetTag: string
  name: string
  categoryId: string
  brandId?: string | null
  modelId?: string | null
  serialNumber?: string | null
  licenseTotalSeats?: number | null
  licenseUsedSeats?: number | null
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
  purchaseDate?: Date | string | null
  purchasePrice?: StringableValue | number | string | null
  supplierId?: string | null
  warrantyStartDate?: Date | string | null
  warrantyEndDate?: Date | string | null
  fixedAssetCode?: string | null
  poNumber?: string | null
  invoiceNumber?: string | null
  remark?: string | null
  customFieldsJson?: string | null
  isActive: boolean
  purchaseDocumentLinks?: Array<{ purchaseDocumentId: string }>
}

export type AssetCloneFormState = {
  cloneSource: {
    id: string
    assetTag: string
    name: string
  }
  asset: {
    id?: string
    assetTag: string
    name: string
    categoryId: string
    brandId: string | null
    modelId: string | null
    serialNumber: string
    licenseTotalSeats: string
    licenseUsedSeats: string
    licenseAssignedAssetId: string | null
    companyId: string
    branchId: string
    ownershipType: string | null
    departmentId: string | null
    custodianId: string | null
    homeLocationId: string | null
    currentLocationId: string
    statusId: string
    conditionId: string
    purchaseDate: string
    purchasePrice: string
    supplierId: string | null
    warrantyStartDate: string
    warrantyEndDate: string
    fixedAssetCode: string
    poNumber: string | null
    invoiceNumber: string | null
    remark: string | null
    customFieldsJson: string | null
    purchaseDocumentIds: string[]
    isActive: boolean
  }
}

export function buildAssetCloneFormState(
  source: AssetCloneSource,
  options: { readyStatusId?: string | null }
): AssetCloneFormState {
  return {
    cloneSource: {
      id: source.id,
      assetTag: source.assetTag,
      name: source.name,
    },
    asset: {
      assetTag: "",
      name: source.name,
      categoryId: source.categoryId,
      brandId: source.brandId ?? null,
      modelId: source.modelId ?? null,
      serialNumber: "",
      licenseTotalSeats: stringifyOptionalNumber(source.licenseTotalSeats),
      licenseUsedSeats: stringifyOptionalNumber(source.licenseUsedSeats),
      licenseAssignedAssetId: source.licenseAssignedAssetId ?? null,
      companyId: source.companyId,
      branchId: source.branchId,
      ownershipType: source.ownershipType ?? null,
      departmentId: source.departmentId ?? null,
      custodianId: source.custodianId ?? null,
      homeLocationId: source.homeLocationId ?? null,
      currentLocationId: source.currentLocationId,
      statusId: options.readyStatusId ?? source.statusId,
      conditionId: source.conditionId,
      purchaseDate: formatDateInput(source.purchaseDate),
      purchasePrice: stringifyOptionalValue(source.purchasePrice),
      supplierId: source.supplierId ?? null,
      warrantyStartDate: formatDateInput(source.warrantyStartDate),
      warrantyEndDate: formatDateInput(source.warrantyEndDate),
      fixedAssetCode: "",
      poNumber: source.poNumber ?? null,
      invoiceNumber: source.invoiceNumber ?? null,
      remark: source.remark ?? null,
      customFieldsJson: source.customFieldsJson ?? null,
      purchaseDocumentIds: source.purchaseDocumentLinks?.map((link) => link.purchaseDocumentId) ?? [],
      isActive: true,
    },
  }
}

function formatDateInput(date: Date | string | null | undefined) {
  if (!date) return ""
  const value = typeof date === "string" ? new Date(date) : date
  if (Number.isNaN(value.getTime())) return ""
  return value.toISOString().slice(0, 10)
}

function stringifyOptionalNumber(value: number | null | undefined) {
  return value == null ? "" : String(value)
}

function stringifyOptionalValue(value: StringableValue | number | string | null | undefined) {
  return value == null ? "" : value.toString()
}
