import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { buildAuditCorrectionHistoryByItemId } from "@/lib/audit-correction-history"
import { buildFindingValueLabels } from "@/lib/audit-finding-labels"
import { getAuditRoundCloseChecklist } from "@/lib/audit-round-close"
import { chunkAuditIds, withAuditRoundOwnItems } from "@/lib/audit-round-counts-rules"
import { countAuditRoundItemCategories, findAuditRoundSearchLocations } from "@/lib/audit-round-list-lookups"
import {
  auditRoundAnyFieldFindingWhere,
  auditRoundPersonDecidedFindingWhere,
  auditRoundTopCategoryIds,
  buildAuditRoundCategoryChips,
  foldAuditRoundEvidence,
  formatAuditUserLabel,
  hasMultipleAuditFieldFindings,
  listAuditRoundMissingComponents,
  resolveAuditRoundRowChecker,
} from "@/lib/audit-round-page-rules"
import {
  auditFindingFields,
  auditRoundItemListOrderBy,
  buildAuditRoundItemWhere,
  foldAuditRoundResultCounts,
  parseAuditRoundListFilters,
  type AuditFindingField,
  type AuditRoundListFilters,
} from "@/lib/audit-round-result-filters"
import { isAuditRoundReadOnlyStatus } from "@/lib/audit-round-status"
import { isSameAuditActor } from "@/lib/audit-segregation"
import { categoryPhotoChecklistKey, parsePhotoChecklist } from "@/lib/category-photo-checklist"

// The round page's data (group 2 spec §5, §8): one server load, so every number and the rows it opens come from one
// where. The result card, the next-step card and "ไม่ตรงเรื่องอะไร" are round-wide (their links clear the other
// filters); every chip counts within the other active filters; the list follows them all. It never writes.

const roundSelect = {
  id: true, auditNo: true, name: true, status: true, startDate: true, endDate: true,
  createdBy: true, cancelledAt: true, cancelledBy: true, cancelReason: true,
} satisfies Prisma.AuditRoundSelect

function rowInclude(roundId: string) {
  return {
    asset: {
      select: {
        id: true,
        assetTag: true,
        name: true,
        currentLocation: { select: { code: true, name: true } },
        custodian: { select: { code: true, fullNameTh: true } },
        condition: { select: { nameTh: true } },
        parentComponents: {
          where: { status: "installed", removedAt: null },
          select: {
            componentRole: true,
            slotNo: true,
            // The components' own not-found items in this round: the row's "ไม่พบ: <name> (<tag>)" (spec §8, P2-R19).
            componentAsset: { select: { id: true, assetTag: true, name: true, auditItems: { where: { auditRoundId: roundId, auditResult: "not_found" }, select: { id: true } } } },
          },
        },
        installedInLinks: {
          where: { status: "installed", removedAt: null },
          select: { componentRole: true, slotNo: true, parentAsset: { select: { id: true, assetTag: true, name: true } } },
        },
      },
    },
    // สิ่งที่ต่าง, พิจารณา and a not-found row's ตรวจโดย (Task 5).
    findings: {
      orderBy: [{ reportedAt: "asc" }, { id: "asc" }],
      select: { id: true, findingType: true, expectedValue: true, actualValue: true, reviewStatus: true, actionTaken: true, reportedBy: true, reportedAt: true },
    },
  } satisfies Prisma.AuditItemInclude
}

type ItemWhereInput = Parameters<typeof buildAuditRoundItemWhere>[0]
type CountRow = { auditStatus: string; auditResult: string | null; _count: { _all: number } }
const toCountRows = (rows: readonly CountRow[]) => rows.map((row) => ({ auditStatus: row.auditStatus, auditResult: row.auditResult, count: row._count._all }))

export type AuditRoundPageDataInput = { roundId: string; filters: AuditRoundListFilters; page: number; pageSize: number; user: { id: string } }

export async function getAuditRoundPageData({ roundId, filters, page, pageSize, user }: AuditRoundPageDataInput) {
  // A. The round, and the rooms the search names (the item's expected room, bug 11, P2-R5): Task 2's lookup, the one
  // the exports use (P2-R25).
  const [round, searchRooms] = await Promise.all([
    prisma.auditRound.findFirst({ where: { id: roundId, isActive: true }, select: roundSelect }),
    findAuditRoundSearchLocations(roundId, filters.search),
  ])
  if (!round) return null
  // The round's own rooms go with the matches, so the room branch sends the smaller of in / notIn (final review M3).
  const listFilters: AuditRoundListFilters = searchRooms.matchedRoomIds.length > 0 ? { ...filters, expectedLocationIds: searchRooms.matchedRoomIds, roundLocationIds: searchRooms.roomIds } : filters
  const roundWideFilters = parseAuditRoundListFilters({})
  const roundWideWhere = (overrides: Partial<ItemWhereInput>) => buildAuditRoundItemWhere({ ...roundWideFilters, ...overrides, roundId })

  // B. The category chips count within every other filter (spec §5). "อื่น ๆ" (categoryId=other) is every category but
  // the six shown (P2-R11), so the list, its total and the result chips need those six first. Task 2's count, the
  // exports' too, so both fold the same rows (in id order) to the same six. The six are ranked over every result (the
  // same where with no category and result all), so a result chip under อื่น ๆ counts against the same six its link
  // opens. Each chip's count is within the result in use (`categoryCounts`).
  const rankingRows = await countAuditRoundItemCategories(buildAuditRoundItemWhere({ ...listFilters, categoryId: null, result: "all", roundId }))
  const categoryRows = filters.result === "all" ? rankingRows : await countAuditRoundItemCategories(buildAuditRoundItemWhere({ ...listFilters, categoryId: null, roundId }))
  const categoryCounts = categoryRows.map((row) => ({ id: row.categoryId, count: row.count }))
  const categoryRanking = rankingRows.map((row) => ({ id: row.categoryId, count: row.count }))
  const topCategoryIds = auditRoundTopCategoryIds(categoryRanking)
  const shownCategoryIds = filters.categoryId === "other" ? topCategoryIds : undefined
  const listWhere = (overrides: Partial<ItemWhereInput> = {}) => buildAuditRoundItemWhere({ ...listFilters, ...overrides, roundId, shownCategoryIds })
  const rowsWhere = listWhere()
  const selectedCategoryId = filters.categoryId && filters.categoryId !== "other" ? filters.categoryId : null
  const categoryNameIds = [...new Set([...topCategoryIds, ...(selectedCategoryId ? [selectedCategoryId] : [])])]

  // C. The list and every count, in parallel.
  const [
    [roundRows, chipRows, outOfScopeInFilters, pendingReviewInFilters, componentsMissingInFilters, items, total],
    [fieldItemCounts, fieldItems, componentsMissing, reviewDecidedFindings, checklist, approvedFindings, scanHistoryRows, evidenceItems],
    [categories, company, branch],
  ] = await Promise.all([
    Promise.all([
      prisma.auditItem.groupBy({ by: ["auditStatus", "auditResult"], where: { auditRoundId: roundId }, _count: { _all: true } }),
      prisma.auditItem.groupBy({ by: ["auditStatus", "auditResult"], where: listWhere({ result: "all" }), _count: { _all: true } }),
      prisma.auditItem.count({ where: listWhere({ result: "out_of_scope" }) }),
      prisma.auditItem.count({ where: listWhere({ result: "pending_review" }) }),
      prisma.auditItem.count({ where: listWhere({ components: "missing" }) }),
      prisma.auditItem.findMany({
        where: rowsWhere,
        orderBy: auditRoundItemListOrderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: rowInclude(roundId),
      }),
      prisma.auditItem.count({ where: rowsWhere }),
    ]),
    Promise.all([
      Promise.all(auditFindingFields.map((field) => prisma.auditItem.count({ where: roundWideWhere({ field }) }))),
      prisma.auditItem.count({ where: withAuditRoundOwnItems({ AND: [{ auditRoundId: roundId }, auditRoundAnyFieldFindingWhere] }) }),
      prisma.auditItem.count({ where: roundWideWhere({ components: "missing" }) }),
      // Step 2 counts findings (P2-R26): its รอ n is the checklist's pendingFindings below, the findings page's rows.
      prisma.auditFinding.count({ where: auditRoundPersonDecidedFindingWhere(roundId) }),
      getAuditRoundCloseChecklist(roundId),
      prisma.auditFinding.count({ where: { auditRoundId: roundId, reviewStatus: "approved" } }),
      prisma.auditScanHistory.count({ where: { auditRoundId: roundId } }),
      // Every checked item, out-of-scope finds included: the row photo column reads them; the count keeps own items.
      prisma.auditItem.findMany({
        where: { auditRoundId: roundId, auditStatus: { not: "pending" } },
        select: { assetId: true, auditStatus: true, auditResult: true, asset: { select: { categoryId: true } } },
      }),
    ]),
    Promise.all([
      categoryNameIds.length > 0 ? prisma.assetCategory.findMany({ where: { id: { in: categoryNameIds } }, select: { id: true, code: true, name: true } }) : Promise.resolve([]),
      // AuditItem.expectedCompanyId / expectedBranchId have no relation, so the chips' names need their own reads.
      filters.companyId ? prisma.company.findUnique({ where: { id: filters.companyId }, select: { code: true, nameTh: true } }) : Promise.resolve(null),
      filters.branchId ? prisma.branch.findUnique({ where: { id: filters.branchId }, select: { name: true, company: { select: { code: true } } } }) : Promise.resolve(null),
    ]),
  ])

  // D. What the page's rows and the photo count need: the page's correction history (its item ids only, P2-R9), the
  // people, the finding values, and the photos of the checked items in chunks of 2,000 (bug 10, R17).
  const findings = items.flatMap((item) => item.findings)
  const userIds = [...new Set([round.createdBy, round.cancelledBy, ...items.map((item) => item.scannedBy), ...findings.map((finding) => finding.reportedBy)].filter((id): id is string => Boolean(id)))]
  const evidenceAssetIds = [...new Set(evidenceItems.map((item) => item.assetId))]
  const evidenceCategoryIds = [...new Set(evidenceItems.map((item) => item.asset.categoryId))]
  const [logs, users, findingValueLabels, attachmentChunks, checklistSettings] = await Promise.all([
    items.length > 0
      ? prisma.systemLog.findMany({
          where: { module: "audit", action: "scan_result_corrected", recordId: { in: items.map((item) => item.id) } },
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          include: { user: { select: { username: true, displayName: true } } },
        })
      : Promise.resolve([]),
    userIds.length > 0 ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, username: true, displayName: true } }) : Promise.resolve([]),
    findings.length > 0 ? buildFindingValueLabels(findings) : Promise.resolve(new Map<string, string>()),
    Promise.all(
      chunkAuditIds(evidenceAssetIds).map((chunk) =>
        prisma.attachment.findMany({
          where: { assetId: { in: chunk }, module: "asset", isActive: true, uploadedAt: { gte: round.startDate } },
          select: { assetId: true, originalName: true },
        }),
      ),
    ),
    evidenceCategoryIds.length > 0
      ? prisma.systemSetting.findMany({ where: { key: { in: evidenceCategoryIds.map(categoryPhotoChecklistKey) } }, select: { key: true, value: true } })
      : Promise.resolve([]),
  ])

  const usersById = new Map(users.map((entry) => [entry.id, entry]))
  const userLabel = (id: string | null) => formatAuditUserLabel(id ? usersById.get(id) : null, id)
  const attachmentNamesByAssetId = new Map<string, string[]>()
  for (const attachment of attachmentChunks.flat()) {
    if (!attachment.assetId) continue
    attachmentNamesByAssetId.set(attachment.assetId, [...(attachmentNamesByAssetId.get(attachment.assetId) ?? []), attachment.originalName])
  }
  const checklistByCategoryId = new Map(checklistSettings.map((setting) => [setting.key.replace("asset_category_photo_checklist:", ""), parsePhotoChecklist(setting.value)]))
  const correctionHistoryByItemId = buildAuditCorrectionHistoryByItemId(logs)
  const categoryNames = new Map(categories.map((category) => [category.id, { code: category.code, name: category.name }]))
  const resultCard = foldAuditRoundResultCounts(toCountRows(roundRows))
  const walk = { checked: resultCard.all - resultCard.pending, total: resultCard.all, left: resultCard.pending }
  const fieldCounts = Object.fromEntries(auditFindingFields.map((field, index) => [field, fieldItemCounts[index]])) as Record<AuditFindingField, number>
  const openedByViewer = isSameAuditActor(user.id, round.createdBy)

  return {
    round: { ...round, createdByLabel: userLabel(round.createdBy), cancelledByLabel: userLabel(round.cancelledBy) },
    resultCard,
    resultChips: { ...foldAuditRoundResultCounts(toCountRows(chipRows)), outOfScope: outOfScopeInFilters, pendingReview: pendingReviewInFilters },
    categoryChips: buildAuditRoundCategoryChips({ rows: categoryCounts, rankingRows: categoryRanking, names: categoryNames, selectedCategoryId, topIds: topCategoryIds }),
    fieldBars: { counts: fieldCounts, distinctItems: fieldItems, multipleFields: hasMultipleAuditFieldFindings(fieldCounts, fieldItems) },
    componentsMissing,
    componentsMissingInFilters,
    steps: {
      walk,
      review: { pendingFindings: checklist.pendingFindings, decidedFindings: reviewDecidedFindings },
      close: { checklist, openedByViewer, canClose: !isAuditRoundReadOnlyStatus(round.status) && checklist.canClose && !openedByViewer },
    },
    evidence: foldAuditRoundEvidence({
      items: evidenceItems.map((item) => ({ assetId: item.assetId, categoryId: item.asset.categoryId, auditStatus: item.auditStatus, auditResult: item.auditResult })),
      attachmentNamesByAssetId,
      checklistByCategoryId,
    }),
    cancelImpact: {
      pendingItems: walk.left,
      processedItems: walk.checked + resultCard.outOfScope,
      pendingFindings: checklist.pendingFindings,
      approvedFindings,
      openActions: checklist.openActions,
      scanHistoryRows,
    },
    rows: items.map((item) => {
      const checker = resolveAuditRoundRowChecker(item)
      return {
        ...item,
        correctionHistory: correctionHistoryByItemId.get(item.id) ?? [],
        missingComponents: listAuditRoundMissingComponents(item.asset.parentComponents),
        hasPhoto: item.auditStatus === "pending" ? null : attachmentNamesByAssetId.has(item.assetId),
        checkedBy: checker ? { label: userLabel(checker.userId) ?? checker.userId, at: checker.at } : null,
      }
    }),
    total,
    findingValueLabels,
    filterNames: { company, branch, category: selectedCategoryId ? (categoryNames.get(selectedCategoryId) ?? null) : null },
  }
}

export type AuditRoundPageData = NonNullable<Awaited<ReturnType<typeof getAuditRoundPageData>>>
export type AuditRoundPageRow = AuditRoundPageData["rows"][number]
