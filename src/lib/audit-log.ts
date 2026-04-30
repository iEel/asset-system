import { prisma } from "@/lib/db"

type AuditLogParams = {
  userId?: string
  action: string
  module: string
  recordId?: string
  oldValue?: Record<string, unknown> | null
  newValue?: Record<string, unknown> | null
  ipAddress?: string
  userAgent?: string
  remark?: string
}

export async function logAudit(params: AuditLogParams) {
  try {
    await prisma.systemLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        module: params.module,
        recordId: params.recordId,
        oldValue: params.oldValue ? JSON.stringify(params.oldValue) : null,
        newValue: params.newValue ? JSON.stringify(params.newValue) : null,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        remark: params.remark,
      },
    })
  } catch (error) {
    console.error("Failed to write audit log:", error)
  }
}
