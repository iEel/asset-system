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

export const assetSchema = assetBaseSchema
  .superRefine((input, context) => {
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
  })

export type AssetInput = z.infer<typeof assetSchema>
