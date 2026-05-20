import { prisma } from "@/lib/db"
import { hasPermission, type SessionUser } from "@/lib/auth-utils"
import { buildNotificationSummaryItems } from "@/lib/notification-summary-items"
import { buildActiveNotificationSummary, mergeNotificationItemsWithStates } from "@/lib/notification-center"
import { getApprovalInboxCounts } from "@/lib/approval-inbox-query"
import {
  notificationAuditActionDueSoonDaysKey,
  notificationLicenseExpiryDaysKey,
  notificationReturnDueSoonDaysKey,
  notificationRuleSettingKeys,
  notificationWarrantyExpiryDaysKey,
} from "@/lib/system-setting-defaults"

const openMaintenanceStatuses = ["open", "reported", "accepted", "in_progress", "waiting_parts", "waiting_vendor", "completed"]
const openAuditActionStatuses = ["planned", "in_progress"]
const defaultNotificationRuleDays = {
  [notificationReturnDueSoonDaysKey]: 3,
  [notificationAuditActionDueSoonDaysKey]: 7,
  [notificationWarrantyExpiryDaysKey]: 30,
  [notificationLicenseExpiryDaysKey]: 30,
} as const

export async function getNotificationSummary(user: SessionUser, locale: string) {
  const center = await getNotificationCenter(user, locale)
  const active = buildActiveNotificationSummary(center.items)
  return {
    total: active.total,
    items: active.items,
    generatedAt: center.generatedAt,
  }
}

export async function getNotificationCenter(user: SessionUser, locale: string) {
  const today = startOfToday(new Date())
  const [rules, approvalInboxCounts] = await Promise.all([
    getNotificationRuleSettings(),
    getApprovalInboxCounts(user),
  ])

  const canMaintenance = hasPermission(user, "maintenance", "view")
  const canAudit = hasPermission(user, "audit", "view")
  const canDisposal = hasPermission(user, "disposal", "view")
  const canCheckout = hasPermission(user, "checkout", "view") || hasPermission(user, "asset", "view")
  const canAsset = hasPermission(user, "asset", "view")

  const [
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
    canMaintenance
      ? prisma.maintenanceTicket.count({
          where: { isActive: true, dueDate: { lt: today }, repairStatus: { in: openMaintenanceStatuses } },
        })
      : Promise.resolve(0),
    canAudit && approvalInboxCounts.audit === 0
      ? prisma.auditFinding.count({ where: { reviewStatus: "pending" } })
      : Promise.resolve(0),
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
    canDisposal && approvalInboxCounts.disposal === 0
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
    approvalInbox: approvalInboxCounts.total,
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
  const states = items.length > 0
    ? await prisma.notificationUserState.findMany({
        where: {
          userId: user.id,
          key: { in: items.map((item) => item.key) },
        },
        select: {
          key: true,
          isRead: true,
          lastCount: true,
          snoozedUntil: true,
          assignedToUserId: true,
        },
      })
    : []
  const centerItems = mergeNotificationItemsWithStates(items, states)

  return {
    total: centerItems.reduce((sum, item) => sum + item.count, 0),
    activeTotal: buildActiveNotificationSummary(centerItems).total,
    items: centerItems,
    generatedAt: new Date().toISOString(),
  }
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
