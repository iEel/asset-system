export const disposalTypeValues = ["sell", "donate", "destroy", "lost", "dispose"] as const

export type DisposalType = (typeof disposalTypeValues)[number]

type DisposalExecutionFields = {
  disposalType: DisposalType
  recipientName?: string | null
  documentNo?: string | null
  useHistoricalEvidenceException?: boolean
  actualSaleValue?: number | null
  executionRemark?: string | null
}

export type DisposalFieldError = {
  field: "recipientName" | "documentNo" | "actualSaleValue" | "executionRemark"
  message: string
}

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

export function getDisposalExecutionFieldErrors(input: DisposalExecutionFields): DisposalFieldError[] {
  const errors: DisposalFieldError[] = []
  const hasRecipient = Boolean(input.recipientName?.trim())
  const hasDocument = Boolean(input.documentNo?.trim())
  const hasRemark = Boolean(input.executionRemark?.trim())

  if (["sell", "donate", "dispose"].includes(input.disposalType) && !hasRecipient) {
    errors.push({ field: "recipientName", message: "Recipient, buyer, or destination is required" })
  }
  if (!hasDocument && !input.useHistoricalEvidenceException) {
    errors.push({ field: "documentNo", message: "Reference document number is required" })
  }
  if (input.disposalType === "sell" && input.actualSaleValue == null) {
    errors.push({ field: "actualSaleValue", message: "Actual sale value is required" })
  }
  if (["destroy", "lost"].includes(input.disposalType) && !hasRemark) {
    errors.push({ field: "executionRemark", message: "Execution or incident detail is required" })
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
