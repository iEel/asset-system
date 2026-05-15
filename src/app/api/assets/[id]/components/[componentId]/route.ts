import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { optionalFormFile, optionalFormText, saveComponentEvidenceFile } from "@/lib/asset-component-evidence"
import { assetComponentRemoveSchema } from "@/lib/validations/asset-operations"

type ComponentRouteContext = {
  params: Promise<{ id: string; componentId: string }>
}

export async function DELETE(request: NextRequest, context: ComponentRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "edit")

    const { id: parentAssetId, componentId } = await context.params
    const { input, removeEvidence } = await parseRemoveRequest(request)
    const existing = await prisma.assetComponent.findFirst({
      where: {
        id: componentId,
        parentAssetId,
        status: "installed",
        removedAt: null,
      },
      include: {
        parentAsset: { select: { assetTag: true, name: true } },
        componentAsset: { select: { id: true, assetTag: true, name: true } },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Installed component not found" }, { status: 404 })
    }

    const removedAt = input.removedAt ?? new Date()
    const component = await prisma.$transaction(async (tx) => {
      const record = await tx.assetComponent.update({
        where: { id: componentId },
        data: {
          removedAt,
          status: "removed",
          reason: input.reason ?? existing.reason,
          referenceType: input.referenceType ?? existing.referenceType,
          referenceId: input.referenceId ?? existing.referenceId,
          updatedBy: user.id,
        },
      })

      if (removeEvidence) {
        await tx.attachment.create({
          data: {
            assetId: parentAssetId,
            module: "asset_component_remove",
            referenceId: record.id,
            fileName: removeEvidence.fileName,
            originalName: removeEvidence.originalName,
            fileType: removeEvidence.fileType,
            fileSize: removeEvidence.fileSize,
            filePath: removeEvidence.filePath,
            uploadedBy: user.id,
          },
        })
      }

      await tx.assetMovement.createMany({
        data: [
          {
            assetId: parentAssetId,
            movementType: "component_remove",
            fromValue: JSON.stringify({
              componentAssetId: existing.componentAsset.id,
              componentAssetTag: existing.componentAsset.assetTag,
              componentRole: existing.componentRole,
              slotNo: existing.slotNo,
            }),
            reason: input.reason,
            referenceType: input.referenceType ?? "asset_component",
            referenceId: record.id,
            performedBy: user.id,
          },
          {
            assetId: existing.componentAsset.id,
            movementType: "removed_from_parent",
            fromValue: JSON.stringify({
              parentAssetId,
              parentAssetTag: existing.parentAsset.assetTag,
              componentRole: existing.componentRole,
              slotNo: existing.slotNo,
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
      action: "component_remove",
      module: "asset",
      recordId: parentAssetId,
      oldValue: existing,
      newValue: component,
    })

    return NextResponse.json(component)
  } catch (error) {
    return errorResponse(error, 400)
  }
}

async function parseRemoveRequest(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.includes("multipart/form-data")) {
    const body = await request.json().catch(() => ({}))
    return {
      input: assetComponentRemoveSchema.parse(body),
      removeEvidence: null,
    }
  }

  const formData = await request.formData()
  const evidenceFile = optionalFormFile(formData, "removeEvidence")
  return {
    input: assetComponentRemoveSchema.parse({
      removedAt: optionalFormText(formData, "removedAt"),
      reason: optionalFormText(formData, "reason"),
      referenceType: optionalFormText(formData, "referenceType"),
      referenceId: optionalFormText(formData, "referenceId"),
    }),
    removeEvidence: evidenceFile ? await saveComponentEvidenceFile(evidenceFile) : null,
  }
}
