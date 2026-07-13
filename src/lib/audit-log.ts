import { prisma } from "@/lib/db"
import { writeAuditLog, type AuditLogParams } from "@/lib/audit-log-writer"

export { writeAuditLog, type AuditLogParams } from "@/lib/audit-log-writer"

export async function logAudit(params: AuditLogParams) {
  try {
    await writeAuditLog(prisma, params)
  } catch (error) {
    console.error("Failed to write audit log:", error)
  }
}
