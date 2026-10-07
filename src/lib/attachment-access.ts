import { prisma } from "@/lib/db"
import { hasPermission, type requireAuth } from "@/lib/auth-utils"

type AttachmentUser = Awaited<ReturnType<typeof requireAuth>>

export type AttachmentAccessRecord = {
  module: string
  assetId: string | null
  referenceId: string
}

export function getAttachmentPermissionModule(module: string) {
  return (
    module === "maintenance"
      ? "maintenance"
      : module === "audit_finding"
        ? "audit"
        : module === "disposal" || module === "disposal_batch"
          ? "disposal"
        : module === "asset_model"
          ? "brand"
          : "asset"
  )
}

export function hasAttachmentPermission(user: AttachmentUser, module: string, action: "view" | "edit") {
  return hasPermission(user, getAttachmentPermissionModule(module), action)
}

export function requireAttachmentPermission(user: AttachmentUser, module: string, action: "view" | "edit") {
  if (!hasAttachmentPermission(user, module, action)) {
    throw new Error("Forbidden: insufficient permissions")
  }
}

export async function canViewOwnAssetAttachment(user: AttachmentUser, attachment: AttachmentAccessRecord) {
  if (attachment.module !== "asset" || !user.employeeId) return false

  const assetId = attachment.assetId ?? attachment.referenceId
  if (!assetId) return false

  const asset = await prisma.asset.findFirst({
    where: { id: assetId, isActive: true, custodianId: user.employeeId },
    select: { id: true },
  })

  return Boolean(asset)
}

/** File and thumbnail routes share one rule: module permission, or the employee who holds the asset. */
export async function assertCanViewAttachment(user: AttachmentUser, attachment: AttachmentAccessRecord) {
  if (hasAttachmentPermission(user, attachment.module, "view")) return
  if (await canViewOwnAssetAttachment(user, attachment)) return
  requireAttachmentPermission(user, attachment.module, "view")
}
