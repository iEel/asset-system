export const disposalStages = ["pending_approval", "awaiting_execution", "complete", "rejected"] as const

export type DisposalStage = (typeof disposalStages)[number]
export type DisposalNextAction = "review" | "execute" | "view"

export function getDisposalStage(requestStatus?: string | null): DisposalStage {
  if (requestStatus === "approved") return "awaiting_execution"
  if (requestStatus === "disposed") return "complete"
  if (requestStatus === "rejected") return "rejected"
  return "pending_approval"
}

export function getDisposalNextAction(
  requestStatus: string | null | undefined,
  permissions: { canApprove: boolean; canExecute: boolean },
): DisposalNextAction {
  const stage = getDisposalStage(requestStatus)
  if (stage === "pending_approval" && permissions.canApprove) return "review"
  if (stage === "awaiting_execution" && permissions.canExecute) return "execute"
  return "view"
}
