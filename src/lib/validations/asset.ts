import { z } from "zod"
import { assetOwnershipTypes, defaultAssetOwnershipType } from "../asset-ownership.ts"
import { optionalText } from "./shared.ts"

const optionalDate = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? null : value),
  z.coerce.date().nullable().optional()
)

const optionalMoney = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? null : value),
  z.coerce.number().nonnegative().nullable().optional()
)

const optionalNonNegativeInt = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? null : value),
  z.coerce.number().int().nonnegative().nullable().optional()
)

export const assetBaseSchema = z.object({
    assetTag: optionalText,
    name: z.string().trim().min(1).max(200),
    categoryId: z.string().trim().min(1),
    brandId: optionalText,
    modelId: optionalText,
    serialNumber: optionalText,
    licenseTotalSeats: optionalNonNegativeInt,
    licenseUsedSeats: optionalNonNegativeInt,
    licenseAssignedAssetId: optionalText,
    companyId: z.string().trim().min(1),
    branchId: z.string().trim().min(1),
    ownershipType: z.enum(assetOwnershipTypes).default(defaultAssetOwnershipType),
    departmentId: optionalText,
    custodianId: optionalText,
    homeLocationId: optionalText,
    currentLocationId: z.string().trim().min(1),
    statusId: z.string().trim().min(1),
    conditionId: z.string().trim().min(1),
    purchaseDate: optionalDate,
    purchasePrice: optionalMoney,
    supplierId: optionalText,
    warrantyStartDate: optionalDate,
    warrantyEndDate: optionalDate,
    fixedAssetCode: optionalText,
    poNumber: optionalText,
    invoiceNumber: optionalText,
    remark: optionalText,
    customFieldsJson: optionalText,
    isActive: z.boolean().default(true),
  })

function refineLicenseSeats(
  input: { ownershipType: string; licenseTotalSeats?: number | null; licenseUsedSeats?: number | null },
  context: z.RefinementCtx,
) {
  if (
    input.ownershipType === "software_license" &&
    input.licenseTotalSeats != null &&
    input.licenseUsedSeats != null &&
    input.licenseUsedSeats > input.licenseTotalSeats
  ) {
    context.addIssue({
      code: "custom",
      path: ["licenseUsedSeats"],
      message: "Used license seats cannot exceed total seats",
    })
  }
}

export const assetSchema = assetBaseSchema.superRefine(refineLicenseSeats)

export type AssetInput = z.infer<typeof assetSchema>

// The asset edit (PUT, group 4 plan 2, P2-R4, P2-R7): no isActive (a sent value is ignored; deactivating is DELETE's,
// under its own permission), and the reason for a room, holder or department correction.
export const assetUpdateSchema = assetBaseSchema
  .omit({ isActive: true })
  .extend({ correctionReason: z.string().trim().max(500).optional() })
  .superRefine(refineLicenseSeats)

export type AssetUpdateInput = z.infer<typeof assetUpdateSchema>
