import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import type { AuditRoundInput } from "@/lib/validations/audit"

export function buildAuditAssetWhere(input: AuditRoundInput): Prisma.AssetWhereInput {
  return {
    isActive: true,
    ...(input.scopeCompanyId ? { companyId: input.scopeCompanyId } : {}),
    ...(input.scopeBranchId ? { branchId: input.scopeBranchId } : {}),
    ...(input.scopeDepartmentId ? { departmentId: input.scopeDepartmentId } : {}),
    ...(input.scopeLocationId ? { currentLocationId: input.scopeLocationId } : {}),
    ...(input.scopeCategoryId ? { categoryId: input.scopeCategoryId } : {}),
    ...(input.scopeCustodianId ? { custodianId: input.scopeCustodianId } : {}),
    ...(input.scopeStatusId ? { statusId: input.scopeStatusId } : {}),
    ...(input.scopeConditionId ? { conditionId: input.scopeConditionId } : {}),
  }
}

export async function generateAuditNo(auditYear: number) {
  const prefix = `AUD-${auditYear}-`
  const latest = await prisma.auditRound.findFirst({
    where: { auditNo: { startsWith: prefix } },
    orderBy: { auditNo: "desc" },
    select: { auditNo: true },
  })
  const nextNumber = latest ? Number(latest.auditNo.slice(prefix.length)) + 1 : 1
  return `${prefix}${String(nextNumber).padStart(4, "0")}`
}
