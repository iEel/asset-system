// The work center's row readers (group 9 spec §4.2, plan 1 task 4): one light read per visible source (id, since,
// deadline, number) behind its key's visibility and its module's view permission, ranked in memory, and only the rows
// on screen loaded in full. Each light read uses its count's own where, so the table's total equals the queue counts.
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { hasPermission, type SessionUser } from "@/lib/auth-utils"
import { getApprovalInboxAccess, getApprovalInboxLightRecords } from "@/lib/approval-inbox-query"
import { formatApprovalInboxDay } from "@/lib/approval-inbox"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
import { bangkokDayDiff } from "@/lib/preventive-maintenance"
import type { WaitingWork } from "@/lib/waiting-work"
import {
  approvedDisposalsWhere,
  auditActionsDueSoonWhere,
  duePmWhere,
  openAuditActionsWhere,
  openRepairsWhere,
  pendingAuditFindingsWhere,
  pendingDisposalsWhere,
  stuckRepairsWhere,
  type WaitingWorkKey,
  type WaitingWorkRules,
} from "@/lib/waiting-work-rules"
import { queueKeysFor, type WorkQueue } from "@/lib/work-queues"
import {
  rankWorkRows,
  workRowPermittedNextStep,
  workRowQueue,
  workRowUrgency,
  type WorkRowKind,
  type WorkRowLite,
  type WorkRowNextStep,
  type WorkRowUrgency,
} from "@/lib/work-center-rows"
import {
  applyAssetWorkCenterScope,
  applyAuditFindingWorkCenterScope,
  applyDisposalWorkCenterScope,
  applyMaintenanceWorkCenterScope,
  applyPlanWorkCenterScope,
  type WorkCenterUserScope,
} from "@/lib/work-center-scope"

/** The backlog's sources, one light read each, in the waiting work's order. */
export const WORK_ROW_SOURCES = [
  "approvalInbox",
  "openRepairs",
  "stuckRepairs",
  "duePm",
  "pendingAuditFindings",
  "openAuditActions",
  "auditActionsDueSoon",
  "pendingDisposals",
  "approvedDisposals",
] as const satisfies readonly WaitingWorkKey[]

export type WorkRowSource = (typeof WORK_ROW_SOURCES)[number]

export type WorkRowReadContext = {
  user: SessionUser
  today: Date
  rules: WaitingWorkRules
  /** งานของฉัน: the user's scope; null for งานทั้งหมด and always null for the approval rows (the user's own). */
  scope: WorkCenterUserScope | null
  slaDays: number
}

export type WorkRowReaders = Record<WorkRowSource, (context: WorkRowReadContext) => Promise<WorkRowLite[]>>

const ID_CHUNK = 2000
const dayMs = 86_400_000

function chunks<T>(values: readonly T[], size = ID_CHUNK): T[][] {
  const result: T[][] = []
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size))
  return result
}

async function findInChunks<T>(ids: readonly string[], read: (chunk: string[]) => Promise<T[]>): Promise<T[]> {
  const unique = [...new Set(ids)]
  if (unique.length === 0) return []
  return (await Promise.all(chunks(unique).map(read))).flat()
}

function scoped<T>(where: T, scope: WorkCenterUserScope | null, apply: (where: T, active: boolean, scope: WorkCenterUserScope) => T): T {
  return scope ? apply(where, true, scope) : where
}

// Bangkok has no daylight saving, so adding whole days keeps the Bangkok day.
function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * dayMs)
}

// A stuck asset waits from its latest move into its current status, else from its last edit (stuckRepairsOldestSince).
async function readStuckRepairs(scope: WorkCenterUserScope | null): Promise<WorkRowLite[]> {
  const assets = await prisma.asset.findMany({
    where: scoped(stuckRepairsWhere, scope, applyAssetWorkCenterScope),
    select: { id: true, assetTag: true, statusId: true, updatedAt: true },
  })
  if (assets.length === 0) return []
  const statusIds = [...new Set(assets.map((asset) => asset.statusId))]
  const movements = await findInChunks(assets.map((asset) => asset.id), (chunk) =>
    prisma.assetMovement.groupBy({
      by: ["assetId", "toValue"],
      where: { assetId: { in: chunk }, toValue: { in: statusIds } },
      _max: { performedAt: true },
    }),
  )
  const movedIn = new Map<string, Date>()
  for (const movement of movements) {
    if (movement._max.performedAt) movedIn.set(`${movement.assetId}:${movement.toValue}`, movement._max.performedAt)
  }
  return assets.map((asset) => ({
    kind: "stuckRepair",
    id: asset.id,
    since: movedIn.get(`${asset.id}:${asset.statusId}`) ?? asset.updatedAt,
    deadline: null,
    number: asset.assetTag,
  }))
}

async function readAuditActions(where: Prisma.AuditFindingWhereInput, scope: WorkCenterUserScope | null): Promise<WorkRowLite[]> {
  const findings = await prisma.auditFinding.findMany({
    where: scoped(where, scope, applyAuditFindingWorkCenterScope),
    select: { id: true, updatedAt: true, actionDueDate: true, auditRound: { select: { auditNo: true } } },
  })
  return findings.map((finding) => ({
    kind: "auditAction",
    id: finding.id,
    since: finding.updatedAt,
    deadline: finding.actionDueDate,
    number: finding.auditRound.auditNo,
  }))
}

/** The Prisma light reads, one per source, each with its count's where. */
export const prismaWorkRowReaders: WorkRowReaders = {
  approvalInbox: async ({ user, slaDays }) => {
    const records = await getApprovalInboxLightRecords(user)
    return [
      ...records.disposal.map((request): WorkRowLite => ({
        kind: "disposalApproval",
        id: request.id,
        since: request.requestDate,
        deadline: addDays(request.requestDate, slaDays),
        number: request.disposalNo,
      })),
      ...records.findings.map((finding): WorkRowLite => ({
        kind: "findingApproval",
        id: finding.id,
        since: finding.reportedAt,
        deadline: addDays(finding.reportedAt, slaDays),
        number: finding.auditNo,
      })),
      ...records.rounds.map((round): WorkRowLite => ({
        kind: "roundClose",
        id: round.id,
        since: round.updatedAt,
        deadline: addDays(round.updatedAt, slaDays),
        number: round.auditNo,
      })),
    ]
  },
  openRepairs: async ({ scope }) => {
    const tickets = await prisma.maintenanceTicket.findMany({
      where: scoped({ ...openRepairsWhere }, scope, applyMaintenanceWorkCenterScope),
      select: { id: true, reportedDate: true, repairNo: true },
    })
    return tickets.map((ticket) => ({ kind: "openRepair", id: ticket.id, since: ticket.reportedDate, deadline: null, number: ticket.repairNo }))
  },
  stuckRepairs: ({ scope }) => readStuckRepairs(scope),
  duePm: async ({ today, scope }) => {
    const plans = await prisma.maintenancePlan.findMany({
      where: scoped(duePmWhere(today), scope, applyPlanWorkCenterScope),
      select: { id: true, createdAt: true, nextDueDate: true, planNo: true },
    })
    return plans.map((plan) => ({ kind: "duePm", id: plan.id, since: plan.createdAt, deadline: plan.nextDueDate, number: plan.planNo }))
  },
  pendingAuditFindings: async ({ scope }) => {
    const findings = await prisma.auditFinding.findMany({
      where: scoped(pendingAuditFindingsWhere, scope, applyAuditFindingWorkCenterScope),
      select: { id: true, reportedAt: true, auditRound: { select: { auditNo: true } } },
    })
    return findings.map((finding) => ({
      kind: "pendingFinding",
      id: finding.id,
      since: finding.reportedAt,
      deadline: null,
      number: finding.auditRound.auditNo,
    }))
  },
  openAuditActions: ({ today, rules, scope }) => readAuditActions(openAuditActionsWhere(today, rules), scope),
  auditActionsDueSoon: ({ today, rules, scope }) => readAuditActions(auditActionsDueSoonWhere(today, rules), scope),
  pendingDisposals: async ({ scope }) => {
    const requests = await prisma.disposalRequest.findMany({
      where: scoped(pendingDisposalsWhere, scope, applyDisposalWorkCenterScope),
      select: { id: true, requestDate: true, disposalNo: true },
    })
    return requests.map((request) => ({ kind: "pendingDisposal", id: request.id, since: request.requestDate, deadline: null, number: request.disposalNo }))
  },
  approvedDisposals: async ({ scope }) => {
    const requests = await prisma.disposalRequest.findMany({
      where: scoped(approvedDisposalsWhere, scope, applyDisposalWorkCenterScope),
      select: { id: true, approvedAt: true, updatedAt: true, disposalNo: true },
    })
    return requests.map((request) => ({
      kind: "approvedDisposal",
      id: request.id,
      since: request.approvedAt ?? request.updatedAt,
      deadline: null,
      number: request.disposalNo,
    }))
  },
}

// Each source shows with its key visible and its module's view permission (approvals: the inbox access).
function canReadSource(user: SessionUser, source: WorkRowSource): boolean {
  switch (source) {
    case "approvalInbox":
      return getApprovalInboxAccess(user).canAnyApproval
    case "openRepairs":
    case "stuckRepairs":
    case "duePm":
      return hasPermission(user, "maintenance", "view")
    case "pendingAuditFindings":
    case "openAuditActions":
    case "auditActionsDueSoon":
      return hasPermission(user, "audit", "view")
    case "pendingDisposals":
    case "approvedDisposals":
      return hasPermission(user, "disposal", "view")
  }
}

export type WorkRowLiteOptions = { today: Date; scope: WorkCenterUserScope | null; queue: WorkQueue | null; slaDays: number }

/** Every light row the user may see: visible keys with their module permission, the scope on all but approvals, one queue or all. */
export async function readWorkRowLites(
  user: SessionUser,
  work: WaitingWork,
  options: WorkRowLiteOptions,
  readers: WorkRowReaders = prismaWorkRowReaders,
): Promise<WorkRowLite[]> {
  const visible = new Set(work.visibleKeys)
  const inQueue = options.queue ? new Set<WaitingWorkKey>(queueKeysFor(options.queue)) : null
  const sources = WORK_ROW_SOURCES.filter(
    (source) => visible.has(source) && (!inQueue || inQueue.has(source)) && canReadSource(user, source),
  )
  const results = await Promise.all(
    sources.map((source) =>
      readers[source]({
        user,
        today: options.today,
        rules: work.rules,
        scope: source === "approvalInbox" ? null : options.scope,
        slaDays: options.slaDays,
      }),
    ),
  )
  return results.flat()
}

export type WorkRowMenuKey = "openRecord" | "openAsset" | "printRequest"

export type WorkRow = WorkRowLite & {
  queue: WorkQueue
  urgency: WorkRowUrgency
  assetName: string | null
  assetTag: string | null
  /** The asset's name, or the round's name for roundClose. */
  title: string
  documentNo: string | null
  context: { key: string; values: Record<string, string> } | null
  ageDays: number
  overdueDays: number
  dueInDays: number | null
  /** null when neither the step's target nor the record's own page is allowed (final review ruling 1). */
  nextStep: WorkRowNextStep | null
  menu: { key: WorkRowMenuKey; href: string }[]
}

export type WorkRowLoadOptions = { today: Date; locale: string; returnTo: string }

type RowDetail = {
  assetId: string | null
  assetName: string | null
  assetTag: string | null
  title: string
  documentNo: string | null
  context: WorkRow["context"]
  /** The record page for ⋯ เปิดคำขอ / เปิดงาน, with the module whose view permission it needs. */
  record: { href: string; module: "disposal" | "audit" | "maintenance" } | null
}

const DASH = "-"
const contextKey = (key: string) => `workCenter.rowContext.${key}`
const text = (value: string | null | undefined) => (value && value.trim() ? value : DASH)

const disposalKinds = new Set<WorkRowKind>(["disposalApproval", "approvedDisposal", "pendingDisposal"])
const findingKinds = new Set<WorkRowKind>(["findingApproval", "auditAction", "pendingFinding"])

function idsOf(lites: readonly WorkRowLite[], kinds: ReadonlySet<WorkRowKind>) {
  return lites.filter((lite) => kinds.has(lite.kind)).map((lite) => lite.id)
}

async function loadDisposalDetails(lites: readonly WorkRowLite[], locale: string, details: Map<string, RowDetail>) {
  const requests = await findInChunks(idsOf(lites, disposalKinds), (chunk) =>
    prisma.disposalRequest.findMany({
      where: { id: { in: chunk } },
      select: {
        id: true,
        disposalNo: true,
        assetId: true,
        approvedAt: true,
        asset: { select: { name: true, assetTag: true } },
        requestedBy: { select: { code: true, fullNameTh: true, department: { select: { name: true } } } },
        approver: { select: { code: true, fullNameTh: true } },
      },
    }),
  )
  const kindOf = new Map(lites.filter((lite) => disposalKinds.has(lite.kind)).map((lite) => [lite.id, lite.kind]))
  for (const request of requests) {
    const context: WorkRow["context"] = kindOf.get(request.id) === "approvedDisposal"
      ? {
          key: contextKey("approvedBy"),
          values: {
            name: text(request.approver?.fullNameTh || request.approver?.code),
            date: request.approvedAt ? formatApprovalInboxDay(request.approvedAt, locale, true) : DASH,
          },
        }
      : {
          key: contextKey("requestedBy"),
          values: {
            name: text(request.requestedBy.fullNameTh || request.requestedBy.code),
            department: text(request.requestedBy.department?.name),
          },
        }
    details.set(`disposal:${request.id}`, {
      assetId: request.assetId,
      assetName: request.asset.name,
      assetTag: request.asset.assetTag,
      title: request.asset.name,
      documentNo: request.disposalNo,
      context,
      record: { href: `/${locale}/disposal/${request.id}`, module: "disposal" },
    })
  }
}

async function loadFindingDetails(lites: readonly WorkRowLite[], locale: string, details: Map<string, RowDetail>) {
  const findings = await findInChunks(idsOf(lites, findingKinds), (chunk) =>
    prisma.auditFinding.findMany({
      where: { id: { in: chunk } },
      select: {
        id: true,
        findingType: true,
        reportedBy: true,
        actionPlan: true,
        assetId: true,
        asset: { select: { name: true, assetTag: true } },
        actionOwner: { select: { code: true, fullNameTh: true } },
        auditRound: { select: { auditNo: true } },
        auditItem: { select: { expectedLocationId: true, actualLocationId: true, expectedCustodianId: true, actualCustodianId: true } },
      },
    }),
  )
  if (findings.length === 0) return
  const kindOf = new Map(lites.filter((lite) => findingKinds.has(lite.kind)).map((lite) => [lite.id, lite.kind]))

  const locationIds: string[] = []
  const employeeIds: string[] = []
  for (const finding of findings) {
    if (finding.findingType === "wrong_location") {
      for (const id of [finding.auditItem.expectedLocationId, finding.auditItem.actualLocationId]) if (id) locationIds.push(id)
    }
    if (finding.findingType === "wrong_custodian") {
      for (const id of [finding.auditItem.expectedCustodianId, finding.auditItem.actualCustodianId]) if (id) employeeIds.push(id)
    }
  }
  const [users, locations, employees] = await Promise.all([
    findInChunks(findings.map((finding) => finding.reportedBy), (chunk) =>
      prisma.user.findMany({ where: { id: { in: chunk } }, select: { id: true, displayName: true } }),
    ),
    findInChunks(locationIds, (chunk) => prisma.location.findMany({ where: { id: { in: chunk } }, select: { id: true, name: true } })),
    findInChunks(employeeIds, (chunk) =>
      prisma.employee.findMany({ where: { id: { in: chunk } }, select: { id: true, code: true, fullNameTh: true } }),
    ),
  ])
  const userNames = new Map(users.map((row) => [row.id, row.displayName]))
  const locationNames = new Map(locations.map((row) => [row.id, row.name]))
  const employeeNames = new Map(employees.map((row) => [row.id, row.fullNameTh || row.code]))
  const nameIn = (names: Map<string, string>, id: string | null) => text(id ? names.get(id) : null)

  for (const finding of findings) {
    const item = finding.auditItem
    let context: WorkRow["context"]
    if (kindOf.get(finding.id) === "auditAction") {
      context = {
        key: contextKey("actionPlan"),
        values: { plan: text(finding.actionPlan), owner: text(finding.actionOwner?.fullNameTh || finding.actionOwner?.code) },
      }
    } else if (finding.findingType === "wrong_location") {
      context = {
        key: contextKey("locationChange"),
        values: { from: nameIn(locationNames, item.expectedLocationId), to: nameIn(locationNames, item.actualLocationId) },
      }
    } else if (finding.findingType === "wrong_custodian") {
      context = {
        key: contextKey("holderChange"),
        values: { from: nameIn(employeeNames, item.expectedCustodianId), to: nameIn(employeeNames, item.actualCustodianId) },
      }
    } else {
      context = { key: contextKey("reportedBy"), values: { name: text(userNames.get(finding.reportedBy) || finding.reportedBy) } }
    }
    details.set(`finding:${finding.id}`, {
      assetId: finding.assetId,
      assetName: finding.asset?.name ?? null,
      assetTag: finding.asset?.assetTag ?? null,
      title: finding.asset?.name ?? finding.auditRound.auditNo,
      documentNo: finding.auditRound.auditNo,
      context,
      record: { href: `/${locale}/audit/findings?finding=${finding.id}`, module: "audit" },
    })
  }
}

async function loadRoundDetails(lites: readonly WorkRowLite[], locale: string, details: Map<string, RowDetail>) {
  const roundIds = idsOf(lites, new Set<WorkRowKind>(["roundClose"]))
  const [rounds, items] = await Promise.all([
    findInChunks(roundIds, (chunk) =>
      prisma.auditRound.findMany({ where: { id: { in: chunk } }, select: { id: true, auditNo: true, name: true } }),
    ),
    findInChunks(roundIds, (chunk) =>
      prisma.auditItem.groupBy({ by: ["auditRoundId", "auditStatus"], where: { auditRoundId: { in: chunk } }, _count: { _all: true } }),
    ),
  ])
  for (const round of rounds) {
    const counts = items.filter((row) => row.auditRoundId === round.id)
    const total = counts.reduce((sum, row) => sum + row._count._all, 0)
    const done = counts.filter((row) => row.auditStatus !== "pending").reduce((sum, row) => sum + row._count._all, 0)
    details.set(`round:${round.id}`, {
      assetId: null,
      assetName: null,
      assetTag: null,
      title: round.name,
      documentNo: round.auditNo,
      context: { key: contextKey("roundProgress"), values: { done: String(done), total: String(total) } },
      record: { href: `/${locale}/audit/rounds/${round.id}`, module: "audit" },
    })
  }
}

async function loadPlanDetails(lites: readonly WorkRowLite[], locale: string, details: Map<string, RowDetail>) {
  const plans = await findInChunks(idsOf(lites, new Set<WorkRowKind>(["duePm"])), (chunk) =>
    prisma.maintenancePlan.findMany({
      where: { id: { in: chunk } },
      select: {
        id: true,
        planNo: true,
        title: true,
        assetId: true,
        asset: { select: { name: true, assetTag: true, currentLocation: { select: { name: true } } } },
      },
    }),
  )
  for (const plan of plans) {
    details.set(`plan:${plan.id}`, {
      assetId: plan.assetId,
      assetName: plan.asset.name,
      assetTag: plan.asset.assetTag,
      title: plan.asset.name,
      documentNo: plan.planNo,
      context: { key: contextKey("planTitle"), values: { title: text(plan.title), location: text(plan.asset.currentLocation?.name) } },
      record: { href: `/${locale}/maintenance/pm?q=${encodeURIComponent(plan.planNo)}`, module: "maintenance" },
    })
  }
}

async function loadRepairDetails(lites: readonly WorkRowLite[], locale: string, details: Map<string, RowDetail>) {
  const tickets = await findInChunks(idsOf(lites, new Set<WorkRowKind>(["openRepair"])), (chunk) =>
    prisma.maintenanceTicket.findMany({
      where: { id: { in: chunk } },
      select: {
        id: true,
        repairNo: true,
        problem: true,
        assetId: true,
        asset: { select: { name: true, assetTag: true } },
        reportedBy: { select: { code: true, fullNameTh: true } },
      },
    }),
  )
  for (const ticket of tickets) {
    details.set(`repair:${ticket.id}`, {
      assetId: ticket.assetId,
      assetName: ticket.asset.name,
      assetTag: ticket.asset.assetTag,
      title: ticket.asset.name,
      documentNo: ticket.repairNo,
      context: {
        key: contextKey("repairProblem"),
        values: { problem: text(ticket.problem), name: text(ticket.reportedBy.fullNameTh || ticket.reportedBy.code) },
      },
      record: { href: `/${locale}/maintenance/${ticket.id}`, module: "maintenance" },
    })
  }
}

async function loadStuckDetails(lites: readonly WorkRowLite[], details: Map<string, RowDetail>) {
  const assets = await findInChunks(idsOf(lites, new Set<WorkRowKind>(["stuckRepair"])), (chunk) =>
    prisma.asset.findMany({ where: { id: { in: chunk } }, select: { id: true, name: true, assetTag: true } }),
  )
  for (const asset of assets) {
    details.set(`asset:${asset.id}`, {
      assetId: asset.id,
      assetName: asset.name,
      assetTag: asset.assetTag,
      title: asset.name,
      documentNo: null,
      context: null,
      record: null,
    })
  }
}

function detailKey(lite: WorkRowLite): string {
  if (disposalKinds.has(lite.kind)) return `disposal:${lite.id}`
  if (findingKinds.has(lite.kind)) return `finding:${lite.id}`
  if (lite.kind === "roundClose") return `round:${lite.id}`
  if (lite.kind === "duePm") return `plan:${lite.id}`
  if (lite.kind === "openRepair") return `repair:${lite.id}`
  return `asset:${lite.id}`
}

/** Loads only the given rows in full (id lists chunked by 2,000), in the given order; a record gone since its light read is left out. */
export async function loadWorkRows(user: SessionUser, lites: readonly WorkRowLite[], options: WorkRowLoadOptions): Promise<WorkRow[]> {
  const { today, locale, returnTo } = options
  const details = new Map<string, RowDetail>()
  await Promise.all([
    loadDisposalDetails(lites, locale, details),
    loadFindingDetails(lites, locale, details),
    loadRoundDetails(lites, locale, details),
    loadPlanDetails(lites, locale, details),
    loadRepairDetails(lites, locale, details),
    loadStuckDetails(lites, details),
  ])

  const canViewAsset = hasPermission(user, "asset", "view")
  const canViewDisposal = hasPermission(user, "disposal", "view")
  const withReturn = (href: string) => appendOperationalReturnTo(href, returnTo)
  const can = (module: string, action: string) => hasPermission(user, module, action)

  return lites.flatMap((lite): WorkRow[] => {
    const detail = details.get(detailKey(lite))
    if (!detail) return []
    const dueInDays = lite.deadline ? bangkokDayDiff(today, lite.deadline) : null
    const menu: WorkRow["menu"] = []
    if (detail.record && hasPermission(user, detail.record.module, "view")) {
      menu.push({ key: "openRecord", href: withReturn(detail.record.href) })
    }
    if (detail.assetId && canViewAsset) menu.push({ key: "openAsset", href: `/${locale}/assets/${detail.assetId}` })
    if (disposalKinds.has(lite.kind) && canViewDisposal) {
      menu.push({ key: "printRequest", href: withReturn(`/${locale}/disposal/${lite.id}/print`) })
    }
    return [
      {
        ...lite,
        queue: workRowQueue(lite.kind),
        urgency: workRowUrgency(lite, today),
        assetName: detail.assetName,
        assetTag: detail.assetTag,
        title: detail.title,
        documentNo: detail.documentNo,
        context: detail.context,
        ageDays: Math.max(0, bangkokDayDiff(lite.since, today)),
        overdueDays: dueInDays !== null && dueInDays < 0 ? -dueInDays : 0,
        dueInDays,
        // The step only with its target's permission; else the record's own page, or none (final review ruling 1).
        nextStep: workRowPermittedNextStep(
          lite.kind,
          {
            id: lite.id,
            assetId: detail.assetId,
            planId: lite.kind === "duePm" ? lite.id : undefined,
            planNo: lite.kind === "duePm" ? detail.documentNo : undefined,
          },
          locale,
          can,
          returnTo,
        ),
        menu,
      },
    ]
  })
}

export type WorkCenterRowsOptions = WorkRowLiteOptions & { show: number; locale: string; returnTo: string }

/** readWorkRowLites → rankWorkRows → the first `show` → loadWorkRows; `total` is every light row. */
export async function getWorkCenterRows(
  user: SessionUser,
  work: WaitingWork,
  options: WorkCenterRowsOptions,
  deps: { readers?: WorkRowReaders; load?: typeof loadWorkRows } = {},
): Promise<{ rows: WorkRow[]; total: number }> {
  const lites = await readWorkRowLites(
    user,
    work,
    { today: options.today, scope: options.scope, queue: options.queue, slaDays: options.slaDays },
    deps.readers,
  )
  const shown = rankWorkRows(lites, options.today).slice(0, Math.max(0, options.show))
  const load = deps.load ?? loadWorkRows
  const rows = await load(user, shown, { today: options.today, locale: options.locale, returnTo: options.returnTo })
  return { rows, total: lites.length }
}
