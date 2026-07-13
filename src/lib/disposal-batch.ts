export type DisposalBatchPacketInput = {
  assetIds: string[]
  disposalType: string
  reason: string
  requestedById: string
  approverId?: string | null
  saleValue?: number | string | null
  salvageValue?: number | string | null
}

export type DisposalBatchPacket = {
  assetIds: string[]
  disposalType: DisposalBatchType
  reason: string
  requestedById: string
  approverId: string | null
  saleValue: number | null
  salvageValue: number | null
}

export const disposalBatchTypes = ["sell", "donate", "destroy", "lost", "dispose"] as const

export type DisposalBatchType = (typeof disposalBatchTypes)[number]
export type DisposalBatchStatus = "pending" | "approved" | "disposed" | "rejected" | "partial"

const supportedDisposalTypes = new Set<string>(disposalBatchTypes)

export function prepareDisposalBatchPacket(input: DisposalBatchPacketInput): DisposalBatchPacket {
  const assetIds = input.assetIds.map((assetId) => normalizeRequiredText(assetId, "Asset ID"))

  if (assetIds.length < 2) throw new Error("Disposal batch requires at least 2 asset IDs")
  if (assetIds.length > 100) throw new Error("Disposal batch supports up to 100 asset IDs")

  const uniqueAssetIds = new Set(assetIds.map((assetId) => assetId.toLowerCase()))
  if (uniqueAssetIds.size !== assetIds.length) throw new Error("Disposal batch asset IDs must be unique")

  const disposalType = normalizeRequiredText(input.disposalType, "Disposal type").toLowerCase()
  if (!supportedDisposalTypes.has(disposalType)) throw new Error("Disposal batch requires a supported disposal type")

  return {
    assetIds,
    disposalType: disposalType as DisposalBatchPacket["disposalType"],
    reason: normalizeRequiredText(input.reason, "Reason", 12),
    requestedById: normalizeRequiredText(input.requestedById, "Requester"),
    approverId: input.approverId?.trim() || null,
    saleValue: normalizeOptionalAmount(input.saleValue, "Sale value"),
    salvageValue: normalizeOptionalAmount(input.salvageValue, "Salvage value"),
  }
}

function normalizeOptionalAmount(value: number | string | null | undefined, label: string) {
  if (value == null || value === "") return null
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0) throw new Error(`${label} must be a non-negative number`)
  return amount
}

function normalizeRequiredText(value: string, label: string, minLength = 1) {
  const normalized = value.trim()
  if (!normalized) throw new Error(`${label} is required`)
  if (normalized.length < minLength) throw new Error(`${label} must contain at least ${minLength} characters`)
  return normalized
}

export function deriveDisposalBatchStatus(requestStatuses: string[]): DisposalBatchStatus {
  if (requestStatuses.length === 0 || requestStatuses.includes("pending")) return "pending"
  if (requestStatuses.every((status) => status === "disposed")) return "disposed"
  if (requestStatuses.every((status) => status === "rejected")) return "rejected"
  if (requestStatuses.every((status) => status === "approved" || status === "disposed")) return "approved"
  return "partial"
}
