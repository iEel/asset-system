import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { auditRoundSchema } from "@/lib/validations/audit"
import { generateAuditNo, getAuditRoundSelection } from "@/lib/audit-round"
import { withPrismaUniqueRetry } from "@/lib/prisma-unique-retry"

const roundInclude = {
  scopeCompany: { select: { code: true, nameTh: true } },
  scopeBranch: { select: { code: true, name: true } },
  scopeDepartment: { select: { code: true, name: true } },
  scopeLocation: { select: { code: true, name: true } },
  scopeCategory: { select: { code: true, name: true } },
  _count: { select: { items: true, findings: true } },
} as const

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "audit", "view")

    const search = request.nextUrl.searchParams.get("search")?.trim()
    const rounds = await prisma.auditRound.findMany({
      where: {
        isActive: true,
        ...(search
          ? {
              OR: [
                { auditNo: { contains: search } },
                { name: { contains: search } },
                { scopeCompany: { code: { contains: search } } },
                { scopeBranch: { code: { contains: search } } },
                { scopeLocation: { code: { contains: search } } },
              ],
            }
          : {}),
      },
      include: roundInclude,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(rounds)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "audit", "create")

    const input = auditRoundSchema.parse(await request.json())
    const selection = await getAuditRoundSelection(input)
    const assets = selection.selectedAssets
    if (assets.length === 0) {
      return NextResponse.json({ error: "No assets found in audit scope" }, { status: 400 })
    }

    // Two rounds opened at once can compute the same next number; the unique index refuses the second (P2002), which
    // then takes the number after it, as disposal and repair numbers do (the E2E suite's D4).
    const round = await withPrismaUniqueRetry(async () => {
      const auditNo = await generateAuditNo(input.auditYear)
      return prisma.$transaction(async (tx) => {
        // A new round is always open (group 2 spec §14): the schema takes no status.
        const record = await tx.auditRound.create({
          data: {
            auditNo,
            name: input.name,
            auditYear: input.auditYear,
            scopeCompanyId: input.scopeCompanyId,
            scopeBranchId: input.scopeBranchId,
            scopeDepartmentId: input.scopeDepartmentId,
            scopeLocationId: input.scopeLocationId,
            scopeCategoryId: input.scopeCategoryId,
            scopeCustodianId: input.scopeCustodianId,
            scopeStatusId: input.scopeStatusId,
            scopeConditionId: input.scopeConditionId,
            startDate: input.startDate,
            endDate: input.endDate,
            status: "open",
            createdBy: user.id,
            updatedBy: user.id,
          },
        })

        await tx.auditItem.createMany({
          data: assets.map((asset) => ({
            auditRoundId: record.id,
            assetId: asset.id,
            expectedCompanyId: asset.companyId,
            expectedBranchId: asset.branchId,
            expectedDepartmentId: asset.departmentId,
            expectedLocationId: asset.currentLocationId,
            expectedCustodianId: asset.custodianId,
            expectedConditionId: asset.conditionId,
            auditStatus: "pending",
          })),
        })

        return record
      })
    })

    await logAudit({
      userId: user.id,
      action: "create",
      module: "audit",
      recordId: round.id,
      newValue: {
        ...input,
        status: "open",
        auditNo: round.auditNo,
        matchedAssets: selection.matchedAssets,
        generatedItems: assets.length,
        componentItems: selection.componentItems,
      },
    })

    return NextResponse.json(
      {
        ...round,
        matchedAssets: selection.matchedAssets,
        generatedItems: assets.length,
        componentItems: selection.componentItems,
      },
      { status: 201 }
    )
  } catch (error) {
    return errorResponse(error, 400)
  }
}
