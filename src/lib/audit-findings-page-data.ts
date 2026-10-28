import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { buildAuditReferenceLabels, buildFindingValueLabels, formatFindingValue } from "@/lib/audit-finding-labels"
import {
  auditFindingCountedStatuses,
  auditFindingReviewableWhere,
  auditFindingsAfterWhere,
  auditFindingsBack,
  auditFindingsBeforeWhere,
  auditFindingsListOrderBy,
  buildAuditFindingWhere,
  buildAuditFindingsHref,
  isAuditFindingWaitingStatus,
  pickAuditFindingNextReviewId,
  resolveAuditFindingsListPage,
  type AuditFindingCounts,
  type AuditFindingStatus,
  type AuditFindingTypeSearchLabels,
  type AuditFindingsListFilters,
} from "@/lib/audit-finding-filters"
import { formatAuditUserLabel } from "@/lib/audit-round-page-rules"
import { auditRoundCoverageWhere, isAuditRoundReadOnlyStatus } from "@/lib/audit-round-status"
import { isSameAuditActor } from "@/lib/audit-segregation"
import { listPageWindow } from "@/lib/list-pagination"
import type { WaitingWorkRules } from "@/lib/waiting-work-rules"

// The findings page's data (group 2 spec §5, §10; plan 4 Task 2): one server load, so every tab and sub-chip count, the
// rows they open and the panel come from one builder. It never writes.

export type AuditFindingEvidenceAttachment = { id: string; originalName: string; fileType: string; fileSize: number; uploadedAt: Date }

export type AuditFindingParent = { id: string; assetTag: string; name: string }

const rowInclude = {
  auditRound: { select: { id: true, auditNo: true, name: true, status: true } },
  auditItem: { select: { auditStatus: true, reconcileStatus: true } },
  asset: {
    select: {
      id: true,
      assetTag: true,
      name: true,
      // "ส่วนควบของ <parent code> <parent name>": the component's installed link, read as the round page reads it
      // (audit-round-page-data.ts:60-63; decision 6).
      installedInLinks: { where: { status: "installed", removedAt: null }, select: { parentAsset: { select: { id: true, assetTag: true, name: true } } } },
    },
  },
  // The owner's name through the relation, for every viewer: never an employee id (P4-R11).
  actionOwner: { select: { code: true, fullNameTh: true } },
} satisfies Prisma.AuditFindingInclude

// The panel's finding (spec §10): the row's include and the item's four compared fields, who checked it, when, its remark.
const panelInclude = {
  ...rowInclude,
  auditItem: {
    select: {
      auditStatus: true,
      reconcileStatus: true,
      expectedLocationId: true,
      expectedCustodianId: true,
      expectedDepartmentId: true,
      expectedConditionId: true,
      actualLocationId: true,
      actualCustodianId: true,
      actualDepartmentId: true,
      actualConditionId: true,
      scannedAt: true,
      scannedBy: true,
      remark: true,
    },
  },
} satisfies Prisma.AuditFindingInclude

type FindingExtrasInput = {
  id: string
  findingType: string
  expectedValue: string | null
  actualValue: string | null
  reportedBy: string
  reviewStatus: string
  auditRound: { status: string }
  asset: { installedInLinks: ReadonlyArray<{ parentAsset: AuditFindingParent }> } | null
  actionOwner: { code: string; fullNameTh: string } | null
}

type ReviewQueueInput = { total: number; chosenReviewable: number; before: number; after: readonly { id: string }[]; earlier: readonly { id: string }[] }

// "k จาก N" and the next finding (P4-R18) from the queue's counts and its candidates in the list's order: one href for
// a single decision, one past the siblings for "อนุมัติทุกช่องของทรัพย์สินนี้". Neither carries a page.
function toReviewQueue(queue: ReviewQueueInput, siblingIds: ReadonlySet<string>, nextHref: (id: string) => string) {
  const afterIds = queue.after.map((entry) => entry.id)
  const earlierIds = queue.earlier.map((entry) => entry.id)
  const next = pickAuditFindingNextReviewId(afterIds, earlierIds, new Set())
  const nextAfterSiblings = pickAuditFindingNextReviewId(afterIds, earlierIds, siblingIds)
  return {
    position: queue.chosenReviewable > 0 ? queue.before + 1 : null,
    total: queue.total,
    nextHref: next ? nextHref(next) : null,
    nextHrefAfterSiblings: nextAfterSiblings ? nextHref(nextAfterSiblings) : null,
  }
}

export type AuditFindingsPageDataInput = {
  locale: string
  filters: AuditFindingsListFilters
  user: { id: string }
  /** audit:approve: the review queue and the plan dialog's owners are read for a reviewer only. */
  canApprove: boolean
  typeSearchLabels: AuditFindingTypeSearchLabels
  rules: WaitingWorkRules
  now: Date
}

export async function getAuditFindingsPageData({ locale, filters, user, canApprove, typeSearchLabels, rules, now }: AuditFindingsPageDataInput) {
  const base = { search: filters.search, roundId: filters.roundId, findingType: filters.findingType, now, rules, typeSearchLabels }
  const whereFor = (status: AuditFindingStatus) => buildAuditFindingWhere({ ...base, status })
  const listWhere = whereFor(filters.status)

  // A. The chosen finding (?finding=) loads wherever it is: on another page or outside the filters. A link with the
  // finding and no page opens the page that holds it, so the next finding after a decision opens where it now stands
  // (P4-R18).
  const chosen = filters.findingId ? await prisma.auditFinding.findUnique({ where: { id: filters.findingId }, include: panelInclude }) : null
  const chosenInList = chosen ? (await prisma.auditFinding.count({ where: { AND: [listWhere, { id: chosen.id }] } })) > 0 : false
  const findingIndex = chosen && chosenInList && !filters.pageGiven
    ? await prisma.auditFinding.count({ where: { AND: [listWhere, auditFindingsBeforeWhere(chosen)] } })
    : null
  const listPage = resolveAuditFindingsListPage(filters.listPage, { pageGiven: filters.pageGiven, findingIndex })
  const { skip, take } = listPageWindow(listPage)
  // "อนุมัติทุกช่องของทรัพย์สินนี้": the asset's other pending findings in the same round (spec §10). They come first,
  // because the next finding after approve-all steps over the ones the viewer may approve with it. Only an approver can
  // approve them, so a viewer reads none (M-5).
  const siblings = chosen?.assetId && canApprove
    ? (
        await prisma.auditFinding.findMany({
          where: { auditRoundId: chosen.auditRoundId, assetId: chosen.assetId, reviewStatus: "pending", id: { not: chosen.id } },
          select: { id: true, findingType: true, assetId: true, expectedValue: true, actualValue: true, reviewStatus: true, reportedBy: true },
          orderBy: [{ reportedAt: "asc" }, { id: "asc" }],
        })
      ).map((sibling) => ({ ...sibling, reportedByViewer: isSameAuditActor(user.id, sibling.reportedBy) }))
    : []
  const siblingIds = new Set(siblings.filter((sibling) => !sibling.reportedByViewer).map((sibling) => sibling.id))
  // The findings the viewer may decide, within the list: the panel's "k จาก N", its next finding and the empty panel's
  // "the tab is done" (P4-R18).
  const reviewableWhere: Prisma.AuditFindingWhereInput = { AND: [listWhere, auditFindingReviewableWhere(user.id)] }
  // The next finding's candidates: enough to step over every sibling, in the list's order, after and before the chosen one.
  const candidates = (where: Prisma.AuditFindingWhereInput) =>
    prisma.auditFinding.findMany({ where: { AND: [reviewableWhere, where] }, orderBy: auditFindingsListOrderBy, take: siblingIds.size + 1, select: { id: true } })

  // B. The rows and every count, in parallel. Each tab and sub-chip counts with the list's own builder, within the
  // round, the type and the search (spec §5 "counts equal lists"); a bell kind's list counts itself.
  const [rows, statusCounts, waitingTotal, reviewableTotal, employees, filterRound, roundOptions, queue] = await Promise.all([
    prisma.auditFinding.findMany({ where: listWhere, include: rowInclude, orderBy: auditFindingsListOrderBy, skip, take }),
    Promise.all(auditFindingCountedStatuses.map((status) => prisma.auditFinding.count({ where: whereFor(status) }))),
    isAuditFindingWaitingStatus(filters.status) ? prisma.auditFinding.count({ where: listWhere }) : Promise.resolve(null),
    canApprove ? prisma.auditFinding.count({ where: reviewableWhere }) : Promise.resolve(null),
    // The plan dialog's owners: the plan is an approver's action (route.ts:35), so a reviewer without audit:edit gets them
    // too (P4-R21). Only the open panel's dialog uses them, so they are read with a finding open (M-5).
    chosen && canApprove
      ? prisma.employee.findMany({ where: { isActive: true }, select: { id: true, code: true, fullNameTh: true }, orderBy: { code: "asc" } })
      : Promise.resolve([]),
    filters.roundId ? prisma.auditRound.findUnique({ where: { id: filters.roundId }, select: { id: true, auditNo: true, name: true } }) : Promise.resolve(null),
    // "รอบ:" lists every round the list shows without a round: active and not cancelled (the coverage scope).
    prisma.auditRound.findMany({ where: { isActive: true, status: auditRoundCoverageWhere }, select: { id: true, auditNo: true, name: true }, orderBy: [{ startDate: "desc" }, { id: "asc" }] }),
    chosen && canApprove
      ? Promise.all([
          prisma.auditFinding.count({ where: { AND: [reviewableWhere, { id: chosen.id }] } }),
          prisma.auditFinding.count({ where: { AND: [reviewableWhere, auditFindingsBeforeWhere(chosen)] } }),
          candidates(auditFindingsAfterWhere(chosen)),
          candidates(auditFindingsBeforeWhere(chosen)),
        ])
      : Promise.resolve(null),
  ])

  // C. The labels, the evidence and the people of the rows and the panel (a page holds at most 100 rows, under the
  // 2,100 parameters SQL Server takes).
  const evidenceFindingIds = [...new Set([...rows.map((finding) => finding.id), ...(chosen ? [chosen.id] : [])])]
  const userIds = chosen ? [...new Set([chosen.reportedBy, chosen.auditItem.scannedBy].filter((id): id is string => Boolean(id)))] : []
  const comparedIds = chosen
    ? [
        chosen.auditItem.expectedLocationId, chosen.auditItem.expectedCustodianId, chosen.auditItem.expectedDepartmentId, chosen.auditItem.expectedConditionId,
        chosen.auditItem.actualLocationId, chosen.auditItem.actualCustodianId, chosen.auditItem.actualDepartmentId, chosen.auditItem.actualConditionId,
      ]
    : []
  const [findingLabels, comparedLabels, attachments, users] = await Promise.all([
    buildFindingValueLabels([...rows, ...(chosen ? [chosen] : []), ...siblings]),
    comparedIds.length > 0 ? buildAuditReferenceLabels(comparedIds) : Promise.resolve(new Map<string, string>()),
    evidenceFindingIds.length > 0
      ? prisma.attachment.findMany({
          where: { module: "audit_finding", referenceId: { in: evidenceFindingIds }, isActive: true },
          select: { id: true, referenceId: true, originalName: true, fileType: true, fileSize: true, uploadedAt: true },
          orderBy: { uploadedAt: "desc" },
        })
      : Promise.resolve([]),
    userIds.length > 0 ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, username: true, displayName: true } }) : Promise.resolve([]),
  ])

  const evidenceByFindingId = new Map<string, AuditFindingEvidenceAttachment[]>()
  for (const { referenceId, ...attachment } of attachments) {
    evidenceByFindingId.set(referenceId, [...(evidenceByFindingId.get(referenceId) ?? []), attachment])
  }
  const usersById = new Map(users.map((entry) => [entry.id, entry]))
  const valueLabels = new Map([...findingLabels, ...comparedLabels])
  // A person's name, or nothing when the user is gone: never the id (spec §5).
  const userLabel = (id: string | null) => (id ? formatAuditUserLabel(usersById.get(id), null) : null)
  // A value in words, or null when empty: the page shows Nil, never a typed "-".
  const valueLabel = (findingType: string, value: string | null) => (value ? formatFindingValue(findingType, value, valueLabels) : null)
  const extras = (finding: FindingExtrasInput) => {
    const reportedByViewer = isSameAuditActor(user.id, finding.reportedBy)
    return {
      parent: finding.asset?.installedInLinks[0]?.parentAsset ?? null,
      ownerLabel: finding.actionOwner ? `${finding.actionOwner.code} - ${finding.actionOwner.fullNameTh}` : null,
      expectedLabel: valueLabel(finding.findingType, finding.expectedValue),
      actualLabel: valueLabel(finding.findingType, finding.actualValue),
      reportedByViewer,
      // The review route's own rule (auditFindingReviewableWhere): only these can be ticked or decided.
      reviewable: finding.reviewStatus === "pending" && !reportedByViewer && !isAuditRoundReadOnlyStatus(finding.auditRound.status),
      evidence: evidenceByFindingId.get(finding.id) ?? [],
    }
  }
  const counts = Object.fromEntries(auditFindingCountedStatuses.map((status, index) => [status, statusCounts[index]])) as AuditFindingCounts
  const total = isAuditFindingWaitingStatus(filters.status) ? (waitingTotal ?? 0) : counts[filters.status]

  return {
    counts,
    total,
    reviewableTotal,
    listPage,
    rows: rows.map((finding) => ({ ...finding, ...extras(finding) })),
    valueLabels,
    employees: employees.map((employee) => ({ id: employee.id, label: `${employee.code} - ${employee.fullNameTh}` })),
    filterRound,
    roundOptions,
    panel: chosen
      ? {
          finding: { ...chosen, ...extras(chosen) },
          inList: chosenInList,
          readOnly: isAuditRoundReadOnlyStatus(chosen.auditRound.status),
          reporterLabel: userLabel(chosen.reportedBy),
          scannedByLabel: userLabel(chosen.auditItem.scannedBy),
          labels: valueLabels,
          siblings,
          // No page in the next href: after this decision the list opens at the page that holds the next one (P4-R18).
          queue:
            queue && reviewableTotal !== null
              ? toReviewQueue(
                  { total: reviewableTotal, chosenReviewable: queue[0], before: queue[1], after: queue[2], earlier: queue[3] },
                  siblingIds,
                  (id) => buildAuditFindingsHref(locale, filters, { pageSize: listPage.pageSize, finding: id }),
                )
              : null,
        }
      : null,
    back: auditFindingsBack(locale, filters),
    loadedAt: now,
  }
}

export type AuditFindingsPageData = Awaited<ReturnType<typeof getAuditFindingsPageData>>
export type AuditFindingsPageRow = AuditFindingsPageData["rows"][number]
export type AuditFindingsPanel = NonNullable<AuditFindingsPageData["panel"]>
