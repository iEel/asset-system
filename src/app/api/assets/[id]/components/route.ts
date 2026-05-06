import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { assertCanInstallComponent } from "@/lib/asset-components"
import { assetComponentInstallSchema } from "@/lib/validations/asset-operations"

type ComponentRouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: ComponentRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "edit")

    const { id: parentAssetId } = await context.params
    const input = assetComponentInstallSchema.parse(await request.json())
    await assertCanInstallComponent(parentAssetId, input.componentAssetId, input.slotNo)

    const component = await prisma.$transaction(async (tx) => {
      const record = await tx.assetComponent.create({
        data: {
          parentAssetId,
          componentAssetId: input.componentAssetId,
          componentRole: input.componentRole,
          slotNo: input.slotNo,
          installedAt: input.installedAt ?? new Date(),
          reason: input.reason,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          createdBy: user.id,
          updatedBy: user.id,
        },
        include: {
          parentAsset: { select: { assetTag: true, name: true } },
          componentAsset: { select: { assetTag: true, name: true } },
        },
      })

      await tx.assetMovement.createMany({
        data: [
          {
            assetId: parentAssetId,
            movementType: "component_install",
            toValue: JSON.stringify({
              componentAssetId: input.componentAssetId,
              componentAssetTag: record.componentAsset.assetTag,
              componentRole: input.componentRole,
              slotNo: input.slotNo,
            }),
            reason: input.reason,
            referenceType: input.referenceType ?? "asset_component",
            referenceId: record.id,
            performedBy: user.id,
          },
          {
            assetId: input.componentAssetId,
            movementType: "installed_in_parent",
            toValue: JSON.stringify({
              parentAssetId,
              parentAssetTag: record.parentAsset.assetTag,
              componentRole: input.componentRole,
              slotNo: input.slotNo,
            }),
            reason: input.reason,
            referenceType: input.referenceType ?? "asset_component",
            referenceId: record.id,
            performedBy: user.id,
          },
        ],
      })

      return record
    })

    await logAudit({
      userId: user.id,
      action: "component_install",
      module: "asset",
      recordId: parentAssetId,
      newValue: component,
    })

    return NextResponse.json(component, { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
