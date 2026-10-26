// The one read of the waiting work (group 1 dashboard task 1). It never writes: the bell records count drops itself.
import { prisma } from "@/lib/db"
import { hasPermission, type SessionUser } from "@/lib/auth-utils"
import { getApprovalInboxAccess, getApprovalInboxCounts, type ApprovalInboxCounts } from "@/lib/approval-inbox-query"
import {
  notificationAuditActionDueSoonDaysKey,
  notificationLicenseExpiryDaysKey,
  notificationReturnDueSoonDaysKey,
  notificationRuleSettingKeys,
  notificationWarrantyExpiryDaysKey,
} from "@/lib/system-setting-defaults"
import {
  approvedDisposalsWhere,
  auditActionsDueSoonWhere,
  DEFAULT_WAITING_WORK_RULES,
  duePmWhere,
  licenseExpiringSoonWhere,
  openAuditActionsWhere,
  openRepairsWhere,
  pendingAuditFindingsWhere,
  pendingDisposalsWhere,
  returnsDueSoonAssetWhere,
  startOfBangkokDay,
  stuckRepairsWhere,
  WAITING_WORK_KEYS,
  waitingWorkVisibleKeys,
  warrantyExpiringSoonWhere,
  type WaitingWorkCounts,
  type WaitingWorkKey,
  type WaitingWorkRules,
} from "@/lib/waiting-work-rules"

export type WaitingWork = {
  counts: WaitingWorkCounts
  visibleKeys: WaitingWorkKey[]
  rules: WaitingWorkRules
  approvalInbox: ApprovalInboxCounts
}

// The days each rule looks ahead, from Admin > Settings; a value that is not a whole number 0-365 keeps the default.
export async function getWaitingWorkRules(): Promise<WaitingWorkRules> {
  const savedSettings = await prisma.systemSetting.findMany({
    where: { key: { in: [...notificationRuleSettingKeys] } },
    select: { key: true, value: true },
  })
  const valueByKey = new Map(savedSettings.map((setting) => [setting.key, setting.value]))
  const days = (key: string, fallback: number) => parseRuleDays(valueByKey.get(key), fallback)

  return {
    returnDueSoonDays: days(notificationReturnDueSoonDaysKey, DEFAULT_WAITING_WORK_RULES.returnDueSoonDays),
    auditActionDueSoonDays: days(notificationAuditActionDueSoonDaysKey, DEFAULT_WAITING_WORK_RULES.auditActionDueSoonDays),
    warrantyExpiryDays: days(notificationWarrantyExpiryDaysKey, DEFAULT_WAITING_WORK_RULES.warrantyExpiryDays),
    licenseExpiryDays: days(notificationLicenseExpiryDaysKey, DEFAULT_WAITING_WORK_RULES.licenseExpiryDays),
  }
}

function parseRuleDays(value: string | undefined, fallback: number) {
  const days = Number(value)
  if (!Number.isInteger(days) || days < 0 || days > 365) return fallback
  return days
}

export async function getWaitingWork(user: SessionUser, now: Date = new Date()): Promise<WaitingWork> {
  const today = startOfBangkokDay(now)
  const [rules, approvalInbox] = await Promise.all([getWaitingWorkRules(), getApprovalInboxCounts(user)])

  const visibleKeys = waitingWorkVisibleKeys(
    {
      approval: getApprovalInboxAccess(user).canAnyApproval,
      maintenance: hasPermission(user, "maintenance", "view"),
      audit: hasPermission(user, "audit", "view"),
      disposal: hasPermission(user, "disposal", "view"),
      // Returns count assets and link to the register, so asset:view gates them like warranty and licence.
      asset: hasPermission(user, "asset", "view"),
    },
    approvalInbox,
  )

  const counters: Record<Exclude<WaitingWorkKey, "approvalInbox">, () => Promise<number>> = {
    openRepairs: () => prisma.maintenanceTicket.count({ where: openRepairsWhere }),
    stuckRepairs: () => prisma.asset.count({ where: stuckRepairsWhere }),
    duePm: () => prisma.maintenancePlan.count({ where: duePmWhere(today) }),
    pendingAuditFindings: () => prisma.auditFinding.count({ where: pendingAuditFindingsWhere }),
    openAuditActions: () => prisma.auditFinding.count({ where: openAuditActionsWhere(today, rules) }),
    auditActionsDueSoon: () => prisma.auditFinding.count({ where: auditActionsDueSoonWhere(today, rules) }),
    pendingDisposals: () => prisma.disposalRequest.count({ where: pendingDisposalsWhere }),
    approvedDisposals: () => prisma.disposalRequest.count({ where: approvedDisposalsWhere }),
    returnsDueSoon: () => prisma.asset.count({ where: returnsDueSoonAssetWhere(today, rules) }),
    warrantyExpiringSoon: () => prisma.asset.count({ where: warrantyExpiringSoonWhere(today, rules) }),
    licenseExpiringSoon: () => prisma.asset.count({ where: licenseExpiringSoonWhere(today, rules) }),
  }

  const visible = new Set(visibleKeys)
  // Every count starts in WAITING_WORK_KEYS order, inside one Promise.all; a hidden key counts 0.
  const values = await Promise.all(
    WAITING_WORK_KEYS.map((key) => {
      if (!visible.has(key)) return Promise.resolve(0)
      if (key === "approvalInbox") return Promise.resolve(approvalInbox.total)
      return counters[key]()
    }),
  )
  const counts = Object.fromEntries(WAITING_WORK_KEYS.map((key, index) => [key, values[index]])) as WaitingWorkCounts

  return { counts, visibleKeys, rules, approvalInbox }
}
