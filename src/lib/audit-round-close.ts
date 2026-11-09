import { prisma } from "@/lib/db"
import { openAuditFindingActionStatuses } from "@/lib/audit-finding-filters"
import { countRoundUnconfirmedAssets } from "@/lib/inspection-confirm-data"

export type AuditRoundCloseChecklist = { pendingItems: number; pendingFindings: number; openActions: number; unconfirmedAssets: number; canClose: boolean }

// The close API's checklist (group 2 spec §8 step 3, R2): nothing pending, no finding awaiting a decision, no open action
// plan (done included), and no asset of the round left "Under Inspection" (ยืนยันผลตรวจ spec §3). The PATCH close and the round page read this one function, so the card lists what the API
// checks. The opener rule is apart (isSameAuditActor): the route refuses it before this runs, the page names it.
export async function getAuditRoundCloseChecklist(auditRoundId: string): Promise<AuditRoundCloseChecklist> {
  const [pendingItems, pendingFindings, openActions, unconfirmedAssets] = await Promise.all([
    prisma.auditItem.count({ where: { auditRoundId, auditStatus: "pending" } }),
    prisma.auditFinding.count({ where: { auditRoundId, reviewStatus: "pending" } }),
    prisma.auditFinding.count({ where: { auditRoundId, actionStatus: { in: [...openAuditFindingActionStatuses] } } }),
    countRoundUnconfirmedAssets(prisma, auditRoundId),
  ])
  return {
    pendingItems,
    pendingFindings,
    openActions,
    unconfirmedAssets,
    canClose: pendingItems === 0 && pendingFindings === 0 && openActions === 0 && unconfirmedAssets === 0,
  }
}
