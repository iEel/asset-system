// The one read of the waiting work (group 1 dashboard task 1). It never writes: the bell records count drops itself.
import { prisma } from "@/lib/db"
import { hasPermission, type SessionUser } from "@/lib/auth-utils"
import {
  getApprovalInboxAccess,
  getApprovalInboxCounts,
  getApprovalInboxOldest,
  type ApprovalInboxCounts,
} from "@/lib/approval-inbox-query"
import {
  notificationAuditActionDueSoonDaysKey,
  notificationLicenseExpiryDaysKey,
  notificationReturnDueSoonDaysKey,
  notificationRuleSettingKeys,
  notificationWarrantyExpiryDaysKey,
} from "@/lib/system-setting-defaults"
import { workflowApprovalDefaults } from "@/lib/workflow-approval"
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
  returnsDueSoonLoanWhere,
  startOfBangkokDay,
  stuckRepairsOldestSince,
  stuckRepairsWhere,
  WAITING_WORK_KEYS,
  waitingWorkAgeFrom,
  waitingWorkVisibleKeys,
  warrantyExpiringSoonWhere,
  type WaitingWorkAge,
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

// How long each kind has waited, from columns that already exist (group 1 dashboard task 2). Each age reads its count's
// own where; it reads every key it is given, so the caller asks only for the kinds with a count above 0.
export async function getWaitingWorkAges(
  user: SessionUser,
  visibleKeys: readonly WaitingWorkKey[],
  rules: WaitingWorkRules,
  now: Date = new Date(),
): Promise<Partial<Record<WaitingWorkKey, WaitingWorkAge>>> {
  const today = startOfBangkokDay(now)
  const defaultSlaDays = workflowApprovalDefaults.slaDays
  type Oldest = { oldest: Date | null; slaDays: number }
  const plain = (oldest: Date | null | undefined): Oldest => ({ oldest: oldest ?? null, slaDays: defaultSlaDays })

  const readers: Record<WaitingWorkKey, () => Promise<Oldest>> = {
    approvalInbox: () => getApprovalInboxOldest(user),
    openRepairs: async () =>
      plain((await prisma.maintenanceTicket.aggregate({ where: openRepairsWhere, _min: { reportedDate: true } }))._min.reportedDate),
    stuckRepairs: async () => plain(await getStuckRepairsOldest()),
    duePm: async () =>
      plain((await prisma.maintenancePlan.aggregate({ where: duePmWhere(today), _min: { nextDueDate: true } }))._min.nextDueDate),
    pendingAuditFindings: async () =>
      plain((await prisma.auditFinding.aggregate({ where: pendingAuditFindingsWhere, _min: { reportedAt: true } }))._min.reportedAt),
    openAuditActions: async () =>
      plain((await prisma.auditFinding.aggregate({ where: openAuditActionsWhere(today, rules), _min: { actionDueDate: true } }))._min.actionDueDate),
    auditActionsDueSoon: async () =>
      plain((await prisma.auditFinding.aggregate({ where: auditActionsDueSoonWhere(today, rules), _min: { actionDueDate: true } }))._min.actionDueDate),
    pendingDisposals: async () =>
      plain((await prisma.disposalRequest.aggregate({ where: pendingDisposalsWhere, _min: { requestDate: true } }))._min.requestDate),
    approvedDisposals: async () =>
      plain((await prisma.disposalRequest.aggregate({ where: approvedDisposalsWhere, _min: { approvedAt: true } }))._min.approvedAt),
    // The loans of the active assets returnsDueSoonAssetWhere counts.
    returnsDueSoon: async () =>
      plain(
        (
          await prisma.assetCheckout.aggregate({
            where: { ...returnsDueSoonLoanWhere(today, rules), asset: { isActive: true } },
            _min: { expectedReturnDate: true },
          })
        )._min.expectedReturnDate,
      ),
    warrantyExpiringSoon: async () =>
      plain((await prisma.asset.aggregate({ where: warrantyExpiringSoonWhere(today, rules), _min: { warrantyEndDate: true } }))._min.warrantyEndDate),
    licenseExpiringSoon: async () =>
      plain((await prisma.asset.aggregate({ where: licenseExpiringSoonWhere(today, rules), _min: { warrantyEndDate: true } }))._min.warrantyEndDate),
  }

  // Every read starts in the order of visibleKeys, inside one Promise.all.
  const oldests = await Promise.all(visibleKeys.map((key) => readers[key]()))
  const ages: Partial<Record<WaitingWorkKey, WaitingWorkAge>> = {}
  visibleKeys.forEach((key, index) => {
    const age = waitingWorkAgeFrom(key, oldests[index].oldest, today, oldests[index].slaDays)
    if (age !== null) ages[key] = age
  })
  return ages
}

// A stuck asset waits from its latest move into its current status, else from its last edit.
async function getStuckRepairsOldest(): Promise<Date | null> {
  const assets = await prisma.asset.findMany({ where: stuckRepairsWhere, select: { id: true, statusId: true, updatedAt: true } })
  if (assets.length === 0) return null
  const movements = await prisma.assetMovement.groupBy({
    by: ["assetId", "toValue"],
    where: { assetId: { in: assets.map((asset) => asset.id) }, toValue: { in: [...new Set(assets.map((asset) => asset.statusId))] } },
    _max: { performedAt: true },
  })
  return stuckRepairsOldestSince(assets, movements)
}
