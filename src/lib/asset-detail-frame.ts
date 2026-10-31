// The asset page frame's one read (group 1 asset detail task 8B): eight single-row reads in one round, each with
// the API's own definition of "open" (spec §5 Performance, §7.1).
import { prisma } from "@/lib/db"
import { outstandingLinkWhere } from "@/lib/asset-component-outstanding"
import type { AssetOperationOutstandingFact } from "@/lib/asset-operation-eligibility"
import type { AuditRoundRef } from "@/lib/asset-detail-frame-rules"
import { auditRoundOperationalWhere } from "@/lib/audit-round-status"
import { latestAuditResultAt, latestAuditResultOrderBy, latestAuditResultWhere } from "@/lib/latest-audit-result-rules"
import {
  disposalReadinessAssetSelect,
  getDisposalReadinessBlockersForAsset,
  type DisposalReadinessBlocker,
} from "@/lib/disposal-readiness"
import { openRepairRecordWhere } from "@/lib/repair-record-policy"

export type AssetDetailFrame = {
  openCheckout: { id: string; checkoutDate: Date; handoverMode: string | null } | null
  openRepairId: string | null
  openDisposalId: string | null
  latestAuditResult: { auditResult: string; at: Date; round: AuditRoundRef } | null
  pendingAudit: { round: AuditRoundRef } | null
  latestHandover: { id: string; documentNo: string | null } | null
  disposalBlockers: DisposalReadinessBlocker[]
  /** The outstanding link holding this asset as a component (group 3 spec §8.5): the action rule's fact. */
  outstanding: AssetOperationOutstandingFact | null
}

const auditRoundRefSelect = { select: { id: true, auditNo: true } } as const

export async function getAssetDetailFrame(assetId: string): Promise<AssetDetailFrame> {
  const [openCheckout, openRepair, openDisposal, pendingItem, latestItem, latestHandover, readiness, outstandingLink] = await Promise.all([
    prisma.assetCheckout.findFirst({
      where: { assetId, isReturned: false, transactionStatus: "active" },
      orderBy: { checkoutDate: "desc" },
      select: { id: true, checkoutDate: true, handoverMode: true },
    }),
    prisma.maintenanceTicket.findFirst({
      where: { assetId, ...openRepairRecordWhere },
      select: { id: true },
    }),
    // The disposal API's own "open request" (src/app/api/disposal-requests/route.ts).
    prisma.disposalRequest.findFirst({
      where: { assetId, isActive: true, requestStatus: { in: ["pending", "approved"] } },
      select: { id: true },
    }),
    prisma.auditItem.findFirst({
      where: { assetId, auditStatus: "pending", auditRound: { isActive: true, status: auditRoundOperationalWhere } },
      select: { auditRound: auditRoundRefSelect },
    }),
    prisma.auditItem.findFirst({
      where: { assetId, ...latestAuditResultWhere },
      orderBy: latestAuditResultOrderBy,
      select: { auditResult: true, lastScanAt: true, updatedAt: true, auditRound: auditRoundRefSelect },
    }),
    // The latest handover that is not voided.
    prisma.assetCheckout.findFirst({
      where: { assetId, transactionStatus: "active" },
      orderBy: { checkoutDate: "desc" },
      select: { id: true, documentNo: true },
    }),
    prisma.asset.findUnique({ where: { id: assetId }, select: disposalReadinessAssetSelect }),
    // An outstanding link holding this asset (group 3 spec §8.5), the newest of duplicates (GP X1).
    prisma.assetComponent.findFirst({
      where: { componentAssetId: assetId, ...outstandingLinkWhere },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      select: { id: true, referenceId: true },
    }),
  ])

  return {
    openCheckout,
    openRepairId: openRepair?.id ?? null,
    openDisposalId: openDisposal?.id ?? null,
    latestAuditResult:
      latestItem && latestItem.auditResult
        ? { auditResult: latestItem.auditResult, at: latestAuditResultAt(latestItem), round: latestItem.auditRound }
        : null,
    pendingAudit: pendingItem ? { round: pendingItem.auditRound } : null,
    latestHandover,
    disposalBlockers: readiness ? getDisposalReadinessBlockersForAsset(readiness) : [],
    outstanding: outstandingLink ? { linkId: outstandingLink.id, checkinId: outstandingLink.referenceId } : null,
  }
}
