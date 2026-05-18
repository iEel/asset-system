import { prisma } from "@/lib/db"
import { hasPermission, type SessionUser } from "@/lib/auth-utils"
import {
  notificationAuditActionDueSoonDaysKey,
  notificationLicenseExpiryDaysKey,
  notificationReturnDueSoonDaysKey,
  notificationRuleSettingKeys,
  notificationWarrantyExpiryDaysKey,
} from "@/lib/system-setting-defaults"

export type NotificationSummaryItem = {
  key: string
  count: number
  href: string
  tone: "danger" | "warning" | "primary"
}

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
  const rules = await getNotificationRuleSettings()

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
    canAudit ? prisma.auditFinding.count({ where: { reviewStatus: "pending" } }) : Promise.resolve(0),
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
    canDisposal ? prisma.disposalRequest.count({ where: { isActive: true, requestStatus: "pending" } }) : Promise.resolve(0),
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
      key: "auditActionsDueSoon",
      count: auditActionsDueSoon,
      href: `/${locale}/audit/findings?status=all`,
      tone: "danger",
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
    {
      key: "warrantyExpiringSoon",
      count: warrantyExpiringSoon,
      href: `/${locale}/assets`,
      tone: "warning",
    },
    {
      key: "licenseExpiringSoon",
      count: licenseExpiringSoon,
      href: `/${locale}/assets?ownershipType=software_license`,
      tone: "warning",
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
