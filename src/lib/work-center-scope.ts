// The work center's "งานของฉัน" scope: each source's where narrowed to the user's employee or department (moved
// unchanged from the work-center page, group 9 plan 1 task 4). Client-safe: Prisma for types only, relative imports.
import type { Prisma } from "@prisma/client"

import type { WorkCenterUserScope } from "./work-center-view.ts"

export type { WorkCenterUserScope } from "./work-center-view.ts"

export function applyAssetWorkCenterScope(
  where: Prisma.AssetWhereInput,
  active: boolean,
  scope: WorkCenterUserScope,
): Prisma.AssetWhereInput {
  return applyWorkCenterScope(where, active, buildAssetScopeWhere(scope))
}

export function applyMaintenanceWorkCenterScope(
  where: Prisma.MaintenanceTicketWhereInput,
  active: boolean,
  scope: WorkCenterUserScope,
): Prisma.MaintenanceTicketWhereInput {
  const scopeWhere = getScopedWhere<Prisma.MaintenanceTicketWhereInput>(scope, ({ employeeId, departmentId }) => ({
    OR: [
      ...(employeeId ? [{ reportedById: employeeId }, { assignedToId: employeeId }, { inspectedById: employeeId }, { asset: { custodianId: employeeId } }] : []),
      ...(departmentId ? [{ asset: { departmentId } }] : []),
    ],
  }))
  return applyWorkCenterScope(where, active, scopeWhere)
}

export function applyPlanWorkCenterScope(
  where: Prisma.MaintenancePlanWhereInput,
  active: boolean,
  scope: WorkCenterUserScope,
): Prisma.MaintenancePlanWhereInput {
  const scopeWhere = getScopedWhere<Prisma.MaintenancePlanWhereInput>(scope, ({ employeeId, departmentId }) => ({
    OR: [
      ...(employeeId ? [{ asset: { custodianId: employeeId } }] : []),
      ...(departmentId ? [{ asset: { departmentId } }] : []),
    ],
  }))
  return applyWorkCenterScope(where, active, scopeWhere)
}

export function applyAuditFindingWorkCenterScope(
  where: Prisma.AuditFindingWhereInput,
  active: boolean,
  scope: WorkCenterUserScope,
): Prisma.AuditFindingWhereInput {
  const scopeWhere = getScopedWhere<Prisma.AuditFindingWhereInput>(scope, ({ employeeId, departmentId }) => ({
    OR: [
      ...(employeeId ? [{ actionOwnerId: employeeId }, { asset: { custodianId: employeeId } }] : []),
      ...(departmentId ? [{ asset: { departmentId } }] : []),
    ],
  }))
  return applyWorkCenterScope(where, active, scopeWhere)
}

export function applyAuditItemWorkCenterScope(
  where: Prisma.AuditItemWhereInput,
  active: boolean,
  scope: WorkCenterUserScope,
): Prisma.AuditItemWhereInput {
  const scopeWhere = getScopedWhere<Prisma.AuditItemWhereInput>(scope, ({ employeeId, departmentId }) => ({
    OR: [
      ...(employeeId ? [{ asset: { custodianId: employeeId } }] : []),
      ...(departmentId ? [{ asset: { departmentId } }] : []),
    ],
  }))
  return applyWorkCenterScope(where, active, scopeWhere)
}

export function applyDisposalWorkCenterScope(
  where: Prisma.DisposalRequestWhereInput,
  active: boolean,
  scope: WorkCenterUserScope,
): Prisma.DisposalRequestWhereInput {
  const scopeWhere = getScopedWhere<Prisma.DisposalRequestWhereInput>(scope, ({ employeeId, departmentId }) => ({
    OR: [
      ...(employeeId ? [{ requestedById: employeeId }, { approverId: employeeId }, { executedById: employeeId }, { asset: { custodianId: employeeId } }] : []),
      ...(departmentId ? [{ asset: { departmentId } }] : []),
    ],
  }))
  return applyWorkCenterScope(where, active, scopeWhere)
}

export function buildAssetScopeWhere(scope: WorkCenterUserScope): Prisma.AssetWhereInput {
  return getScopedWhere<Prisma.AssetWhereInput>(scope, ({ employeeId, departmentId }) => ({
    OR: [
      ...(employeeId ? [{ custodianId: employeeId }] : []),
      ...(departmentId ? [{ departmentId }] : []),
    ],
  }))
}

export function getScopedWhere<T extends { OR?: unknown; id?: unknown }>(
  scope: WorkCenterUserScope,
  build: (scope: { employeeId: string | null; departmentId: string | null }) => T,
): T {
  if (!scope.enabled) return { id: "__work_center_no_user_scope__" } as T
  return build(scope)
}

export function applyWorkCenterScope<T>(where: T, active: boolean, scopeWhere: T): T {
  if (!active) return where
  return { AND: [where, scopeWhere] } as T
}
