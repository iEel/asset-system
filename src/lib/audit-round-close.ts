import { prisma } from "@/lib/db"
import { openAuditFindingActionStatuses } from "@/lib/audit-finding-filters"

export type AuditRoundCloseChecklist = { pendingItems: number; pendingFindings: number; openActions: number; canClose: boolean }

// The close API's checklist (group 2 spec §8 step 3, R2): nothing pending, no finding awaiting a decision, no open action
// plan (done included). The PATCH close and the round page read this one function, so the card lists what the API
// checks. The opener rule is apart (isSameAuditActor): the route refuses it before this runs, the page names it.
export async function getAuditRoundCloseChecklist(auditRoundId: string): Promise<AuditRoundCloseChecklist> {
  const [pendingItems, pendingFindings, openActions] = await Promise.all([
    prisma.auditItem.count({ where: { auditRoundId, auditStatus: "pending" } }),
    prisma.auditFinding.count({ where: { auditRoundId, reviewStatus: "pending" } }),
    prisma.auditFinding.count({ where: { auditRoundId, actionStatus: { in: [...openAuditFindingActionStatuses] } } }),
  ])
  return { pendingItems, pendingFindings, openActions, canClose: pendingItems === 0 && pendingFindings === 0 && openActions === 0 }
}
