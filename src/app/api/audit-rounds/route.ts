import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { auditRoundSchema } from "@/lib/validations/audit"
import { generateAuditNo, getAuditRoundCandidateAssets, selectAuditSample } from "@/lib/audit-round"

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
    const candidateAssets = await getAuditRoundCandidateAssets(input)
    const assets = selectAuditSample(candidateAssets, input.sampleRate)
    if (assets.length === 0) {
      return NextResponse.json({ error: "No assets found in audit scope" }, { status: 400 })
    }

    const auditNo = await generateAuditNo(input.auditYear)
    const round = await prisma.$transaction(async (tx) => {
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
          status: input.status,
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

    await logAudit({
      userId: user.id,
      action: "create",
      module: "audit",
      recordId: round.id,
      newValue: { ...input, auditNo, matchedAssets: candidateAssets.length, generatedItems: assets.length },
    })

    return NextResponse.json({ ...round, matchedAssets: candidateAssets.length, generatedItems: assets.length }, { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
