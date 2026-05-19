import { prisma } from "@/lib/db"
import { hasPermission, type SessionUser } from "@/lib/auth-utils"
import { buildNotificationSummaryItems } from "@/lib/notification-summary-items"
import {
  notificationAuditActionDueSoonDaysKey,
  notificationLicenseExpiryDaysKey,
  notificationReturnDueSoonDaysKey,
  notificationRuleSettingKeys,
  notificationWarrantyExpiryDaysKey,
} from "@/lib/system-setting-defaults"
import { parseWorkflowApprovalPolicy, workflowApprovalSettingKeys } from "@/lib/workflow-approval"

const openMaintenanceStatuses = ["open", "reported", "accepted", "in_progress", "waiting_parts", "waiting_vendor", "completed"]
const openAuditActionStatuses = ["planned", "in_progress"]
const defaultNotificationRuleDays = {
  [notificationReturnDueSoonDaysKey]: 3,
  [notificationAuditActionDueSoonDaysKey]: 7,
  [notificationWarrantyExpiryDaysKey]: 30,
  [notificationLicenseExpiryDaysKey]: 30,
} as const

export async function getNotificationSummary(user: SessionUser, locale: string) {
  const today = startOfToday(new Date())
  const [rules, approvalPolicy] = await Promise.all([
    getNotificationRuleSettings(),
    getWorkflowApprovalPolicy(),
  ])

  const canMaintenance = hasPermission(user, "maintenance", "view")
  const canAudit = hasPermission(user, "audit", "view")
  const canDisposal = hasPermission(user, "disposal", "view")
  const canCheckout = hasPermission(user, "checkout", "view") || hasPermission(user, "asset", "view")
  const canAsset = hasPermission(user, "asset", "view")
  const canApproveDisposal = hasPermission(user, "disposal", "approve")
  const canCloseMaintenance = hasPermission(user, "maintenance", "edit")
  const canApproveAudit = hasPermission(user, "audit", "approve")

  const [
    approvalDisposals,
    approvalMaintenanceClosures,
    approvalAuditFindings,
    approvalAuditRoundsReady,
    overdueMaintenance,
    pendingAuditFindings,
    openAuditActions,
    auditActionsDueSoon,
    pendingDisposals,
    approvedDisposals,
    returnsDueSoon,
    warrantyExpiringSoon,
    licenseExpiringSoon,
  ] = await Promise.all([
    canApproveDisposal && approvalPolicy.disposalRequired
      ? prisma.disposalRequest.count({ where: { isActive: true, requestStatus: "pending" } })
      : Promise.resolve(0),
    canCloseMaintenance && approvalPolicy.maintenanceCloseRequired
      ? prisma.maintenanceTicket.count({ where: { isActive: true, repairStatus: "completed" } })
      : Promise.resolve(0),
    canApproveAudit
      ? prisma.auditFinding.count({ where: { reviewStatus: "pending", reportedBy: { not: user.id } } })
      : Promise.resolve(0),
    canApproveAudit && approvalPolicy.auditCloseRequired
      ? getReadyAuditRoundCloseCount(user.id)
      : Promise.resolve(0),
    canMaintenance
      ? prisma.maintenanceTicket.count({
          where: { isActive: true, dueDate: { lt: today }, repairStatus: { in: openMaintenanceStatuses } },
        })
      : Promise.resolve(0),
    canAudit && !canApproveAudit ? prisma.auditFinding.count({ where: { reviewStatus: "pending" } }) : Promise.resolve(0),
    canAudit
      ? prisma.auditFinding.count({
          where: {
            actionStatus: { in: openAuditActionStatuses },
            OR: [
              { actionDueDate: null },
              { actionDueDate: { gt: addDays(today, rules[notificationAuditActionDueSoonDaysKey]) } },
            ],
          },
        })
      : Promise.resolve(0),
    canAudit
      ? prisma.auditFinding.count({
          where: {
            actionStatus: { in: openAuditActionStatuses },
            actionDueDate: { lte: addDays(today, rules[notificationAuditActionDueSoonDaysKey]) },
          },
        })
      : Promise.resolve(0),
    canDisposal && !(canApproveDisposal && approvalPolicy.disposalRequired)
      ? prisma.disposalRequest.count({ where: { isActive: true, requestStatus: "pending" } })
      : Promise.resolve(0),
    canDisposal ? prisma.disposalRequest.count({ where: { isActive: true, requestStatus: "approved" } }) : Promise.resolve(0),
    canCheckout
      ? prisma.assetCheckout.count({
          where: { isReturned: false, expectedReturnDate: { lte: addDays(today, rules[notificationReturnDueSoonDaysKey]) } },
        })
      : Promise.resolve(0),
    canAsset
      ? prisma.asset.count({
          where: {
            isActive: true,
            ownershipType: { not: "software_license" },
            warrantyEndDate: { gte: today, lte: addDays(today, rules[notificationWarrantyExpiryDaysKey]) },
          },
        })
      : Promise.resolve(0),
    canAsset
      ? prisma.asset.count({
          where: {
            isActive: true,
            ownershipType: "software_license",
            warrantyEndDate: { gte: today, lte: addDays(today, rules[notificationLicenseExpiryDaysKey]) },
          },
        })
      : Promise.resolve(0),
  ])

  const items = buildNotificationSummaryItems(locale, {
    approvalInbox: approvalDisposals + approvalMaintenanceClosures + approvalAuditFindings + approvalAuditRoundsReady,
    overdueMaintenance,
    pendingAuditFindings,
    openAuditActions,
    auditActionsDueSoon,
    pendingDisposals,
    approvedDisposals,
    returnsDueSoon,
    warrantyExpiringSoon,
    licenseExpiringSoon,
  })

  return {
    total: items.reduce((sum, item) => sum + item.count, 0),
    items,
    generatedAt: new Date().toISOString(),
  }
}

async function getWorkflowApprovalPolicy() {
  const savedSettings = await prisma.systemSetting.findMany({
    where: { key: { in: [...workflowApprovalSettingKeys] } },
    select: { key: true, value: true },
  })
  return parseWorkflowApprovalPolicy(savedSettings)
}

async function getReadyAuditRoundCloseCount(currentUserId: string) {
  const rounds = await prisma.auditRound.findMany({
    where: { isActive: true, status: { not: "closed" }, createdBy: { not: currentUserId } },
    select: { id: true },
  })
  const roundIds = rounds.map((round) => round.id)
  if (roundIds.length === 0) return 0

  const [pendingItems, pendingFindings, openActions] = await Promise.all([
    prisma.auditItem.groupBy({
      by: ["auditRoundId"],
      where: { auditRoundId: { in: roundIds }, auditStatus: "pending" },
      _count: { _all: true },
    }),
    prisma.auditFinding.groupBy({
      by: ["auditRoundId"],
      where: { auditRoundId: { in: roundIds }, reviewStatus: "pending" },
      _count: { _all: true },
    }),
    prisma.auditFinding.groupBy({
      by: ["auditRoundId"],
      where: { auditRoundId: { in: roundIds }, actionStatus: { in: ["planned", "in_progress", "done"] } },
      _count: { _all: true },
    }),
  ])

  const blockedRoundIds = new Set<string>()
  for (const row of [...pendingItems, ...pendingFindings, ...openActions]) {
    if (row._count._all > 0) blockedRoundIds.add(row.auditRoundId)
  }

  return rounds.filter((round) => !blockedRoundIds.has(round.id)).length
}

function startOfToday(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

async function getNotificationRuleSettings() {
  const savedSettings = await prisma.systemSetting.findMany({
    where: { key: { in: [...notificationRuleSettingKeys] } },
    select: { key: true, value: true },
  })
  const valueByKey = new Map(savedSettings.map((setting) => [setting.key, setting.value]))

  return Object.fromEntries(
    notificationRuleSettingKeys.map((key) => [
      key,
      parseNotificationDays(valueByKey.get(key), defaultNotificationRuleDays[key]),
    ])
  ) as Record<(typeof notificationRuleSettingKeys)[number], number>
}

function parseNotificationDays(value: string | undefined, fallback: number) {
  const days = Number(value)
  if (!Number.isInteger(days) || days < 0 || days > 365) return fallback
  return days
}
