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

function toAuditLogData(params: AuditLogParams) {
  return {
    userId: params.userId,
    action: params.action,
    module: params.module,
    recordId: params.recordId,
    oldValue: params.oldValue ? JSON.stringify(params.oldValue) : null,
    newValue: params.newValue ? JSON.stringify(params.newValue) : null,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    remark: params.remark,
  }
}

export async function writeAuditLog(
  db: Pick<Prisma.TransactionClient, "systemLog">,
  params: AuditLogParams,
) {
  return db.systemLog.create({ data: toAuditLogData(params) })
}

// Many audit rows in one statement (a disposal round of up to 200 machines writes one per request).
export async function writeAuditLogs(
  db: Pick<Prisma.TransactionClient, "systemLog">,
  params: readonly AuditLogParams[],
) {
  if (params.length === 0) return { count: 0 }
  return db.systemLog.createMany({ data: params.map(toAuditLogData) })
}
