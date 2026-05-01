import { z } from "zod"
import { optionalText } from "@/lib/validations/shared"

const optionalDate = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? null : value),
  z.coerce.date().nullable().optional()
)

const optionalMoney = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? null : value),
  z.coerce.number().nonnegative().nullable().optional()
)

export const assetSchema = z.object({
  assetTag: optionalText,
  name: z.string().trim().min(1).max(200),
  categoryId: z.string().trim().min(1),
  brandId: optionalText,
  modelId: optionalText,
  serialNumber: optionalText,
  companyId: z.string().trim().min(1),
  branchId: z.string().trim().min(1),
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

export type AssetInput = z.infer<typeof assetSchema>
