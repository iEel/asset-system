// One history of an asset (group 1 spec §7.6): its movements as the spine, the audit scans that wrote no movement, and
// a repair record's details merged into its movements. The page and the Excel read it; it never writes.
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import {
  ASSET_HISTORY_DEFAULT_LIMIT,
  assetHistoryActorLabel,
  assetHistoryCategory,
  assetHistoryLookupIds,
  assetHistoryMovementDetail,
  auditItemResultKey,
  auditItemsWithoutMovement,
  countAssetHistory,
  orderAssetHistory,
  type AssetHistory,
  type AssetHistoryCategory,
  type AssetHistoryCounts,
  type AssetHistoryEvent,
  type AssetHistoryField,
  type AssetHistoryLabels,
} from "@/lib/asset-history-rules"
import { assetMovementLabelKey, assetMovementReferenceLookup, buildAssetMovementDocumentHref } from "@/lib/asset-movement-labels"
import { resolveAssetMovementDocuments } from "@/lib/asset-movement-documents"
import { getMovementValueLookup } from "@/lib/movement-labels"

export type { AssetHistory, AssetHistoryCategory, AssetHistoryEvent }

const historyFields: readonly AssetHistoryField[] = [
  "location",
  "custodian",
  "department",
  "status",
  "condition",
  "branch",
  "component",
  "parent",
  "role",
  "slot",
]

const ownershipTypes = ["personal", "shared", "stock", "component", "software_license"] as const

type MovementGroup = { movementType: string; _count: { _all: number } }

// The inputs of the audit events and the counts: every audit movement, not only the loaded ones, so a count never
// depends on the limit. Only the counts need the groups by type.
async function readAuditInputs(assetId: string, withGroups: boolean) {
  const [groups, items, references] = await Promise.all([
    withGroups
      ? prisma.assetMovement.groupBy({
          by: ["movementType"],
          where: { assetId },
          _count: { _all: true },
        })
      : Promise.resolve([] as MovementGroup[]),
    // A pending item has no result yet.
    prisma.auditItem.findMany({
      where: { assetId, auditStatus: { not: "pending" } },
      select: {
        id: true,
        auditStatus: true,
        auditResult: true,
        lastScanAt: true,
        updatedAt: true,
        scannedBy: true,
        auditRound: { select: { id: true, auditNo: true } },
        findings: { select: { id: true } },
      },
    }),
    prisma.assetMovement.findMany({
      where: { assetId, referenceType: { in: ["audit_finding", "audit_scan"] } },
      select: { referenceType: true, referenceId: true, performedAt: true },
    }),
  ])
  const auditItems = auditItemsWithoutMovement(
    items.map((item) => ({ ...item, findingIds: item.findings.map((finding) => finding.id) })),
    references,
  )
  return { groups: groups as MovementGroup[], auditItems }
}

function countsOf(groups: readonly MovementGroup[], auditEvents: number): AssetHistoryCounts {
  return countAssetHistory(groups.map((group) => ({ movementType: group.movementType, count: group._count._all })), auditEvents)
}

// The newest `limit` events, in two rounds of reads: the movements, the audit inputs and the words; then the documents
// and the records the detail column needs.
async function loadAssetHistory(assetId: string, locale: string, limit: number, withGroups: boolean) {
  const [movements, { groups, auditItems }, t] = await Promise.all([
    prisma.assetMovement.findMany({
      where: { assetId },
      orderBy: [{ performedAt: "desc" }, { id: "desc" }],
      take: limit,
      select: {
        id: true,
        movementType: true,
        fromValue: true,
        toValue: true,
        reason: true,
        referenceType: true,
        referenceId: true,
        performedBy: true,
        performedAt: true,
      },
    }),
    readAuditInputs(assetId, withGroups),
    // Root and untyped: the movement labels live in the asset namespace, the audit results in auditRound and auditFinding.
    getTranslations({ locale }),
  ])

  const checkoutIds = new Set<string>()
  const checkinIds = new Set<string>()
  const repairIds = new Set<string>()
  const userIds = new Set<string>()
  for (const movement of movements) {
    userIds.add(movement.performedBy)
    if (!movement.referenceId) continue
    const lookup = assetMovementReferenceLookup(movement.referenceType)
    if (lookup === "checkout") checkoutIds.add(movement.referenceId)
    else if (lookup === "checkin") checkinIds.add(movement.referenceId)
    else if (lookup === "repair") repairIds.add(movement.referenceId)
  }
  for (const item of auditItems) if (item.scannedBy) userIds.add(item.scannedBy)

  // The document numbers come from the shared reader; these reads are only what the detail column needs.
  const [documentOf, checkouts, checkins, repairs, users] = await Promise.all([
    resolveAssetMovementDocuments(movements),
    checkoutIds.size > 0
      ? prisma.assetCheckout.findMany({
          where: { id: { in: [...checkoutIds] } },
          select: {
            id: true,
            checkoutType: true,
            handoverMode: true,
            custodian: { select: { code: true, fullNameTh: true } },
            departmentId: true,
            locationId: true,
            parentAssetId: true,
          },
        })
      : [],
    checkinIds.size > 0
      ? prisma.assetCheckin.findMany({
          where: { id: { in: [...checkinIds] } },
          select: { id: true, returnBy: true, returnByEmployee: { select: { code: true, fullNameTh: true } } },
        })
      : [],
    repairIds.size > 0
      ? prisma.maintenanceTicket.findMany({ where: { id: { in: [...repairIds] } }, select: { id: true, problem: true, resolution: true, reportedDate: true, returnDate: true, repairStatus: true } })
      : [],
    userIds.size > 0
      ? prisma.user.findMany({
          where: { id: { in: [...userIds] } },
          select: { id: true, username: true, displayName: true, email: true, employee: { select: { code: true, fullNameTh: true } } },
        })
      : [],
  ])

  const lookup = await getMovementValueLookup(
    assetHistoryLookupIds([
      ...movements.flatMap((movement) => [movement.fromValue, movement.toValue]),
      ...checkouts.flatMap((checkout) => [checkout.departmentId, checkout.locationId, checkout.parentAssetId]),
    ]),
  )

  const labels: AssetHistoryLabels = {
    fields: Object.fromEntries(historyFields.map((field) => [field, t(`asset.history.fields.${field}`)])) as Record<AssetHistoryField, string>,
    none: t("asset.history.none"),
    unknownRecord: t("asset.history.unknownRecord"),
    ownershipTypes: Object.fromEntries(ownershipTypes.map((type) => [type, t(`asset.ownershipType_${type}`)])),
    returnedFrom: (name) => t("asset.history.returnedFrom", { name }),
    repairDays: (days) => t("asset.history.repairDays", { days }),
  }

  const checkoutsById = new Map(checkouts.map((checkout) => [checkout.id, checkout]))
  const checkinsById = new Map(checkins.map((checkin) => [checkin.id, checkin]))
  const repairsById = new Map(repairs.map((repair) => [repair.id, repair]))
  const actorsById = new Map(users.map((user) => [user.id, assetHistoryActorLabel(user)]))
  const closedRepairIds = new Set(
    movements.flatMap((movement) => (movement.movementType === "maintenance_close" && movement.referenceId ? [movement.referenceId] : [])),
  )
  // An id with no record left is never printed.
  const labelOf = (id: string | null) => (id ? lookup.get(id.toLowerCase()) ?? labels.unknownRecord : null)
  const handoverModeOf = (mode: string | null) =>
    mode === "permanent_assignment" ? t("asset.handoverPermanentAssignment") : mode === "temporary_loan" ? t("asset.handoverTemporaryLoan") : null

  const movementEvents = movements.map((movement): AssetHistoryEvent => {
    const lookupKind = assetMovementReferenceLookup(movement.referenceType)
    const referenceId = movement.referenceId
    const checkout = lookupKind === "checkout" && referenceId ? checkoutsById.get(referenceId) : undefined
    const checkin = lookupKind === "checkin" && referenceId ? checkinsById.get(referenceId) : undefined
    const repair = lookupKind === "repair" && referenceId ? repairsById.get(referenceId) : undefined
    const destination = checkout
      ? checkout.checkoutType === "user" && checkout.custodian
        ? `${checkout.custodian.code} - ${checkout.custodian.fullNameTh}`
        : checkout.checkoutType === "department"
          ? labelOf(checkout.departmentId)
          : checkout.checkoutType === "location"
            ? labelOf(checkout.locationId)
            : checkout.checkoutType === "asset"
              ? labelOf(checkout.parentAssetId)
              : null
      : null
    const document = documentOf(movement)
    return {
      id: movement.id,
      at: movement.performedAt,
      category: assetHistoryCategory(movement.movementType),
      labelKey: assetMovementLabelKey(movement.movementType),
      detail: assetHistoryMovementDetail(
        {
          movementType: movement.movementType,
          fromValue: movement.fromValue,
          toValue: movement.toValue,
          reason: movement.reason,
          checkout: checkout ? { destination, handoverMode: handoverModeOf(checkout.handoverMode) } : null,
          checkin: checkin
            ? { returnBy: checkin.returnByEmployee ? `${checkin.returnByEmployee.code} - ${checkin.returnByEmployee.fullNameTh}` : checkin.returnBy }
            : null,
          repair: repair
            ? {
                problem: repair.problem,
                resolution: repair.resolution,
                reportedDate: repair.reportedDate,
                returnDate: repair.returnDate,
                repairStatus: repair.repairStatus,
                hasCloseMovement: closedRepairIds.has(repair.id),
              }
            : null,
        },
        lookup,
        labels,
      ),
      actor: actorsById.get(movement.performedBy) ?? movement.performedBy,
      document: document ? { code: document.code, kind: document.kind, href: buildAssetMovementDocumentHref(locale, document) } : null,
    }
  })

  const auditEvents = auditItems.map((item): AssetHistoryEvent => {
    const resultKey = auditItemResultKey(item.auditStatus, item.auditResult)
    const round = { kind: "auditRound" as const, id: item.auditRound.id, code: item.auditRound.auditNo }
    return {
      id: `audit-${item.id}`,
      at: item.lastScanAt ?? item.updatedAt,
      category: "audit",
      labelKey: "asset.history.auditScan",
      // A code without a label shows as it is stored.
      detail: resultKey ? t(resultKey) : item.auditResult ?? item.auditStatus,
      actor: item.scannedBy ? actorsById.get(item.scannedBy) ?? null : null,
      document: { code: round.code, kind: round.kind, href: buildAssetMovementDocumentHref(locale, round) },
    }
  })

  return { events: orderAssetHistory([...movementEvents, ...auditEvents], limit), groups, auditItems }
}

/** The asset's history: newest first, at most `limit` (500) events, with the total and each chip's count over every event. */
export async function getAssetHistory(assetId: string, locale: string, options?: { limit?: number }): Promise<AssetHistory> {
  const limit = options?.limit ?? ASSET_HISTORY_DEFAULT_LIMIT
  const { events, groups, auditItems } = await loadAssetHistory(assetId, locale, limit, true)
  const { total, counts } = countsOf(groups, auditItems.length)
  return { events, total, counts, capped: total > events.length }
}

/** The newest `take` events (the overview's latest), through the same loader, without the counts (R50). */
export async function getLatestAssetHistory(assetId: string, locale: string, take: number): Promise<AssetHistoryEvent[]> {
  return (await loadAssetHistory(assetId, locale, take, false)).events
}

/** The same total and chip counts as getAssetHistory, without loading the events (R11). */
export async function getAssetHistoryCounts(assetId: string): Promise<AssetHistoryCounts> {
  const { groups, auditItems } = await readAuditInputs(assetId, true)
  return countsOf(groups, auditItems.length)
}
