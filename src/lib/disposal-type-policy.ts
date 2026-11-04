import { getBangkokDateKey } from "./preventive-maintenance.ts"

export const disposalTypeValues = ["sell", "donate", "destroy", "lost", "dispose"] as const

export type DisposalType = (typeof disposalTypeValues)[number]

export type DisposalDecisionFieldError = {
  field: "approvalRemark"
  message: string
}

export function getDisposalRequestReasonError(reason: string) {
  return reason.trim().length >= 12 ? null : "Disposal reason must contain at least 12 characters"
}

export function getDisposalDecisionFieldErrors(input: { decision: "approve" | "reject"; approvalRemark?: string | null }): DisposalDecisionFieldError[] {
  if (input.decision === "reject" && !input.approvalRemark?.trim()) {
    return [{ field: "approvalRemark", message: "Rejection reason is required" }]
  }
  return []
}

export type DisposalRoundFieldError = {
  field: "recipientName" | "documentNo" | "saleValue" | "remark" | "executionDate"
  message: string
}

// The round's field rules (group 6 spec §11.2): one method for the whole round, so the rules follow the round's method,
// not each request's. The lump price replaces the per-request actual sale value; the date is not after the Bangkok today.
export function getDisposalRoundFieldErrors(
  input: {
    disposalType: DisposalType
    executionDate?: Date | null
    recipientName?: string | null
    documentNo?: string | null
    saleValue?: number | null
    remark?: string | null
  },
  now: Date = new Date(),
): DisposalRoundFieldError[] {
  const errors: DisposalRoundFieldError[] = []
  if (requiresDisposalExecutionRecipient(input.disposalType) && !input.recipientName?.trim()) {
    errors.push({ field: "recipientName", message: "Recipient, buyer, or destination is required" })
  }
  if (!input.documentNo?.trim()) {
    errors.push({ field: "documentNo", message: "Reference document number is required" })
  }
  if (input.disposalType === "sell" && input.saleValue == null) {
    errors.push({ field: "saleValue", message: "Round sale price is required" })
  }
  if (requiresDisposalExecutionRemark(input.disposalType) && !input.remark?.trim()) {
    errors.push({ field: "remark", message: "Execution or incident detail is required" })
  }
  if (input.executionDate && !Number.isNaN(input.executionDate.getTime()) && getBangkokDateKey(input.executionDate) > getBangkokDateKey(now)) {
    errors.push({ field: "executionDate", message: "Disposal date cannot be in the future" })
  }
  return errors
}

export function showsEstimatedSaleValue(disposalType: DisposalType) {
  return disposalType === "sell"
}

export function showsEstimatedSalvageValue(disposalType: DisposalType) {
  return disposalType === "sell" || disposalType === "dispose"
}

export function requiresDisposalExecutionRecipient(disposalType: DisposalType) {
  return disposalType === "sell" || disposalType === "donate" || disposalType === "dispose"
}

export function requiresDisposalExecutionRemark(disposalType: DisposalType) {
  return disposalType === "destroy" || disposalType === "lost"
}

export function showsActualSaleValue(disposalType: DisposalType) {
  return disposalType === "sell"
}

export function showsActualSalvageValue(disposalType: DisposalType) {
  return disposalType === "sell" || disposalType === "dispose"
}
