import type { Prisma } from "@prisma/client"

export type AuditLogParams = {
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

export async function writeAuditLog(
  db: Pick<Prisma.TransactionClient, "systemLog">,
  params: AuditLogParams,
) {
  return db.systemLog.create({
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
}
