import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { assertCanInstallComponent } from "@/lib/asset-components"
import { optionalFormFile, optionalFormText, saveComponentEvidenceFile } from "@/lib/asset-component-evidence"
import { assetComponentInstallSchema } from "@/lib/validations/asset-operations"

type ComponentRouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: ComponentRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "edit")

    const { id: parentAssetId } = await context.params
    const { input, installEvidence } = await parseInstallRequest(request)
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

      if (installEvidence) {
        await tx.attachment.create({
          data: {
            assetId: parentAssetId,
            module: "asset_component_install",
            referenceId: record.id,
            fileName: installEvidence.fileName,
            originalName: installEvidence.originalName,
            fileType: installEvidence.fileType,
            fileSize: installEvidence.fileSize,
            filePath: installEvidence.filePath,
            uploadedBy: user.id,
          },
        })
      }

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

async function parseInstallRequest(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.includes("multipart/form-data")) {
    return {
      input: assetComponentInstallSchema.parse(await request.json()),
      installEvidence: null,
    }
  }

  const formData = await request.formData()
  const evidenceFile = optionalFormFile(formData, "installEvidence")
  return {
    input: assetComponentInstallSchema.parse({
      componentAssetId: optionalFormText(formData, "componentAssetId") ?? "",
      componentRole: optionalFormText(formData, "componentRole") ?? "",
      slotNo: optionalFormText(formData, "slotNo"),
      installedAt: optionalFormText(formData, "installedAt"),
      reason: optionalFormText(formData, "reason"),
      referenceType: optionalFormText(formData, "referenceType"),
      referenceId: optionalFormText(formData, "referenceId"),
    }),
    installEvidence: evidenceFile ? await saveComponentEvidenceFile(evidenceFile) : null,
  }
}
