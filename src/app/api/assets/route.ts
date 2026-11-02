import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { writeAuditLog } from "@/lib/audit-log-writer"
import { errorResponse } from "@/lib/api-response"
import { FieldRefusalError } from "@/lib/field-errors"
import { assetSchema } from "@/lib/validations/asset"
import { generateAssetTag } from "@/lib/asset-tag"
import { buildAssetOrderBy, buildAssetWhere, parseAssetListParams } from "@/lib/asset-list-query"
import { getAssetWhereOptions } from "@/lib/asset-list-where-options"
import { applyAssetCrossScopeFilter } from "@/lib/asset-cross-scope"
import { buildCustodianScopeAudit } from "@/lib/asset-custodian-scope"
import { getAssetStateSelectionError } from "@/lib/asset-lifecycle-policy"
import { getRegisterDepartment } from "@/lib/asset-department-rule"
import { normalizeAssetOwnershipType } from "@/lib/asset-ownership"
import { isPrismaUniqueConstraintError, withPrismaUniqueRetry } from "@/lib/prisma-unique-retry"
import { withDeadlockRetry } from "@/lib/transaction-retry"

const assetInclude = {
  category: { select: { code: true, name: true } },
  brand: { select: { name: true } },
  model: { select: { name: true } },
  company: { select: { code: true, nameTh: true } },
  branch: { select: { code: true, name: true } },
  department: { select: { code: true, name: true } },
  custodian: { select: { code: true, fullNameTh: true } },
  currentLocation: { select: { code: true, name: true } },
  status: { select: { name: true, nameTh: true, colorCode: true } },
  condition: { select: { name: true, nameTh: true, colorCode: true } },
} as const

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "view")

    const filters = parseAssetListParams(request.nextUrl.searchParams)
    const where = await applyAssetCrossScopeFilter(buildAssetWhere(filters, await getAssetWhereOptions(filters)), filters.crossScope)
    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        include: assetInclude,
        orderBy: buildAssetOrderBy(filters),
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      prisma.asset.count({ where }),
    ])

    return NextResponse.json({ data: assets, total, page: filters.page, pageSize: filters.pageSize })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "create")

    const input = assetSchema.parse(await request.json())
    const [status, condition] = await Promise.all([
      prisma.assetStatus.findFirst({
        where: { id: input.statusId, isActive: true },
        select: { id: true, name: true, isActive: true },
      }),
      prisma.assetCondition.findFirst({
        where: { id: input.conditionId, isActive: true },
        select: { id: true, name: true, isActive: true },
      }),
    ])
    const stateError = getAssetStateSelectionError({ operation: "create", status, condition })
    if (stateError) {
      return NextResponse.json({ code: stateError, error: stateError }, { status: 400 })
    }
    await assertUniqueSerial(input.serialNumber)
    await assertUniqueAssetTag(input.assetTag)
    const ownership = normalizeAssetOwnershipType(input.ownershipType)
    const typedTag = input.assetTag ?? null

    // The asset, its first movement and its audit in one transaction (P2-R8). A generated tag that another create took
    // meanwhile is generated again; a typed one is the tag's field error. A deadlock victim runs again.
    const createOnce = async () => {
      const assetTag =
        typedTag ??
        (await generateAssetTag({
          companyId: input.companyId,
          branchId: input.branchId,
          categoryId: input.categoryId,
        }))
      return withDeadlockRetry(() => prisma.$transaction(async (tx) => {
        // The holder is read active; their department is the asset's for บุคคล and Stock (P2-R1).
        const custodian = input.custodianId
          ? await tx.employee.findFirst({
              where: { id: input.custodianId, isActive: true },
              select: {
                id: true,
                departmentId: true,
                companyId: true,
                branchId: true,
                company: { select: { code: true, nameTh: true } },
                branch: { select: { code: true, name: true } },
              },
            })
          : null
        if (input.custodianId && !custodian) throw new CreateHolderInactiveError()
        const { departmentId } = getRegisterDepartment({
          ownership,
          currentCustodianId: null,
          nextCustodianId: input.custodianId ?? null,
          currentDepartmentId: null,
          chosenDepartmentId: input.departmentId ?? null,
          nextHolderDepartmentId: custodian?.departmentId ?? null,
          openHandover: false,
        })
        const custodianScopeAudit = buildCustodianScopeAudit(input, custodian)

        // A new asset is always active (P2-R7): deactivating is DELETE's.
        const asset = await tx.asset.create({
          data: {
            ...input,
            departmentId,
            isActive: true,
            assetTag,
            createdBy: user.id,
            updatedBy: user.id,
          },
          include: assetInclude,
        })

        await tx.assetMovement.create({
          data: {
            assetId: asset.id,
            movementType: "create",
            toValue: asset.currentLocationId,
            reason: "Initial asset registration",
            referenceType: "asset",
            referenceId: asset.id,
            performedBy: user.id,
            remark: input.remark,
          },
        })

        await writeAuditLog(tx, {
          userId: user.id,
          action: "create",
          module: "asset",
          recordId: asset.id,
          newValue: { ...input, departmentId, isActive: true, assetTag, custodianScope: custodianScopeAudit },
        })

        return asset
      }))
    }

    let asset
    try {
      asset = typedTag ? await createOnce() : await withPrismaUniqueRetry(createOnce)
    } catch (error) {
      if (typedTag && isPrismaUniqueConstraintError(error)) {
        throw new FieldRefusalError("Asset tag already exists", { assetTag: "duplicate" })
      }
      throw error
    }

    return NextResponse.json(asset, { status: 201 })
  } catch (error) {
    if (error instanceof CreateHolderInactiveError) {
      return NextResponse.json({
        code: "ASSET_TRANSFER_DESTINATION_INACTIVE",
        error: "ASSET_TRANSFER_DESTINATION_INACTIVE",
        fieldErrors: { custodianId: "checkoutReceiverInactive" },
      }, { status: 409 })
    }
    return errorResponse(error, 400)
  }
}

// A holder who left or is unknown (P2-R8): the same answer as the asset edit's.
class CreateHolderInactiveError extends Error {
  constructor() {
    super("ASSET_TRANSFER_DESTINATION_INACTIVE")
    this.name = "CreateHolderInactiveError"
  }
}

async function assertUniqueSerial(serialNumber?: string | null, excludeId?: string) {
  if (!serialNumber) return

  const existing = await prisma.asset.findFirst({
    where: {
      isActive: true,
      serialNumber,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  })

  if (existing) {
    throw new FieldRefusalError("Serial Number already exists", { serialNumber: "duplicate" })
  }
}

// A typed asset tag that another asset holds is the tag's field error, not the database's refusal (a 500; the E2E
// suite's M3). The tag is unique over every row, active or not, as the unique index is.
async function assertUniqueAssetTag(assetTag?: string | null, excludeId?: string) {
  if (!assetTag) return

  const existing = await prisma.asset.findFirst({
    where: {
      assetTag,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  })

  if (existing) {
    throw new FieldRefusalError("Asset tag already exists", { assetTag: "duplicate" })
  }
}
