export const disposalReadinessBlockers = [
  "open_checkout",
  "active_maintenance",
  "operational_audit",
  "unresolved_audit_finding",
  "installed_child_components",
  "installed_in_parent",
  "assigned_licenses",
  "license_assignment",
] as const

export type DisposalReadinessBlocker = (typeof disposalReadinessBlockers)[number]

export type DisposalReadinessFacts = {
  openCheckoutCount?: number
  activeMaintenanceCount?: number
  operationalAuditItemCount?: number
  unresolvedAuditFindingCount?: number
  installedChildComponentCount?: number
  installedInParentCount?: number
  assignedLicenseCount?: number
  hasLicenseAssignment?: boolean
}

export const disposalReadinessAssetSelect = {
  licenseAssignedAssetId: true,
  _count: {
    select: {
      checkouts: { where: { isReturned: false } },
      maintenanceTickets: { where: { isActive: true, repairStatus: { not: "closed" } } },
      auditItems: {
        where: { auditRound: { isActive: true, status: { notIn: ["closed", "cancelled"] } } },
      },
      auditFindings: {
        where: {
          auditRound: { isActive: true, status: { notIn: ["closed", "cancelled"] } },
          OR: [
            { reviewStatus: "pending" },
            { actionStatus: { in: ["planned", "in_progress", "done"] } },
          ],
        },
      },
      parentComponents: { where: { status: "installed", removedAt: null } },
      installedInLinks: { where: { status: "installed", removedAt: null } },
      assignedLicenses: { where: { isActive: true } },
    },
  },
} satisfies Prisma.AssetSelect

type DisposalReadinessAsset = {
  licenseAssignedAssetId?: string | null
  _count?: {
    checkouts?: number
    maintenanceTickets?: number
    auditItems?: number
    auditFindings?: number
    parentComponents?: number
    installedInLinks?: number
    assignedLicenses?: number
  }
}

export function getDisposalReadinessFacts(asset: DisposalReadinessAsset): DisposalReadinessFacts {
  return {
    openCheckoutCount: asset._count?.checkouts,
    activeMaintenanceCount: asset._count?.maintenanceTickets,
    operationalAuditItemCount: asset._count?.auditItems,
    unresolvedAuditFindingCount: asset._count?.auditFindings,
    installedChildComponentCount: asset._count?.parentComponents,
    installedInParentCount: asset._count?.installedInLinks,
    assignedLicenseCount: asset._count?.assignedLicenses,
    hasLicenseAssignment: Boolean(asset.licenseAssignedAssetId),
  }
}

export function getDisposalReadinessBlockers(facts: DisposalReadinessFacts): DisposalReadinessBlocker[] {
  const blockers: DisposalReadinessBlocker[] = []
  if ((facts.openCheckoutCount ?? 0) > 0) blockers.push("open_checkout")
  if ((facts.activeMaintenanceCount ?? 0) > 0) blockers.push("active_maintenance")
  if ((facts.operationalAuditItemCount ?? 0) > 0) blockers.push("operational_audit")
  if ((facts.unresolvedAuditFindingCount ?? 0) > 0) blockers.push("unresolved_audit_finding")
  if ((facts.installedChildComponentCount ?? 0) > 0) blockers.push("installed_child_components")
  if ((facts.installedInParentCount ?? 0) > 0) blockers.push("installed_in_parent")
  if ((facts.assignedLicenseCount ?? 0) > 0) blockers.push("assigned_licenses")
  if (facts.hasLicenseAssignment) blockers.push("license_assignment")
  return blockers
}

export function getDisposalReadinessBlockersForAsset(asset: DisposalReadinessAsset) {
  return getDisposalReadinessBlockers(getDisposalReadinessFacts(asset))
}
import type { Prisma } from "@prisma/client"
