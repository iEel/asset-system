import { prisma } from "@/lib/db"
import { hasPermission, type SessionUser } from "@/lib/auth-utils"

export type NotificationSummaryItem = {
  key: string
  count: number
  href: string
  tone: "danger" | "warning" | "primary"
}

const openMaintenanceStatuses = ["open", "reported", "accepted", "in_progress", "waiting_parts", "waiting_vendor", "completed"]

export async function getNotificationSummary(user: SessionUser, locale: string) {
  const today = startOfToday(new Date())
  const soon = new Date(today)
  soon.setDate(soon.getDate() + 3)

  const canMaintenance = hasPermission(user, "maintenance", "view")
  const canAudit = hasPermission(user, "audit", "view")
  const canDisposal = hasPermission(user, "disposal", "view")
  const canCheckout = hasPermission(user, "checkout", "view") || hasPermission(user, "asset", "view")

  const [
    overdueMaintenance,
    pendingAuditFindings,
    openAuditActions,
    pendingDisposals,
    approvedDisposals,
    returnsDueSoon,
  ] = await Promise.all([
    canMaintenance
      ? prisma.maintenanceTicket.count({
          where: { isActive: true, dueDate: { lt: today }, repairStatus: { in: openMaintenanceStatuses } },
        })
      : Promise.resolve(0),
    canAudit ? prisma.auditFinding.count({ where: { reviewStatus: "pending" } }) : Promise.resolve(0),
    canAudit ? prisma.auditFinding.count({ where: { actionStatus: { in: ["planned", "in_progress"] } } }) : Promise.resolve(0),
    canDisposal ? prisma.disposalRequest.count({ where: { isActive: true, requestStatus: "pending" } }) : Promise.resolve(0),
    canDisposal ? prisma.disposalRequest.count({ where: { isActive: true, requestStatus: "approved" } }) : Promise.resolve(0),
    canCheckout
      ? prisma.assetCheckout.count({
          where: { isReturned: false, expectedReturnDate: { lte: soon } },
        })
      : Promise.resolve(0),
  ])

  const notificationItems = [
    {
      key: "overdueMaintenance",
      count: overdueMaintenance,
      href: `/${locale}/maintenance?overdue=yes`,
      tone: "danger",
    },
    {
      key: "pendingAuditFindings",
      count: pendingAuditFindings,
      href: `/${locale}/audit/findings?status=pending`,
      tone: "warning",
    },
    {
      key: "openAuditActions",
      count: openAuditActions,
      href: `/${locale}/audit/findings?status=all`,
      tone: "warning",
    },
    {
      key: "pendingDisposals",
      count: pendingDisposals,
      href: `/${locale}/disposal?status=pending`,
      tone: "danger",
    },
    {
      key: "approvedDisposals",
      count: approvedDisposals,
      href: `/${locale}/disposal?status=approved`,
      tone: "warning",
    },
    {
      key: "returnsDueSoon",
      count: returnsDueSoon,
      href: `/${locale}/asset-management/checkin`,
      tone: "primary",
    },
  ] satisfies NotificationSummaryItem[]
  const items = notificationItems.filter((item) => item.count > 0)

  return {
    total: items.reduce((sum, item) => sum + item.count, 0),
    items,
    generatedAt: new Date().toISOString(),
  }
}

function startOfToday(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}
