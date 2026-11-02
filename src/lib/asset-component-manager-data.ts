// The components page's rows (group 4 plan 4 Task 2): every link of one parent, current and past, built on the server
// with dates in the asset page's format (R37), who installed and removed it, its document only with that page's
// permission (R12), its photo count and the outstanding line. It never writes.
import { getTranslations } from "next-intl/server"
import type { prisma as prismaClient } from "@/lib/db"
import { formatOutstandingComponentLine, isOutstandingLink } from "@/lib/asset-component-outstanding"
import { formatAssetDetailDate } from "@/lib/asset-detail-frame-rules"
import { assetHistoryActorLabel } from "@/lib/asset-history-rules"
import { assetDocumentAccess } from "@/lib/asset-history-view"
import { resolveAssetMovementDocuments } from "@/lib/asset-movement-documents"
import { buildAssetMovementDocumentHref } from "@/lib/asset-movement-labels"

export type ComponentLinkState = "installed" | "outstanding" | "removed"

export type ComponentLinkRow = {
  id: string
  componentAsset: { id: string; assetTag: string; name: string; serialNumber: string | null }
  /** The stored role; the page shows componentRoleLabelKey's label when it has one. */
  role: string
  slotNo: string | null
  state: ComponentLinkState
  installedOn: string
  installedBy: string | null
  removedOn: string | null
  removedBy: string | null
  reason: string | null
  document: { code: string; href: string } | null
  evidenceCount: number
  /** "ค้างคืน · อยู่กับ <code> - <name> · RT-…" for an outstanding link (code-first holder, E2E-pinned); else null. */
  outstandingLine: string | null
}

export type ComponentManagerRows = {
  rows: ComponentLinkRow[]
  installedCount: number
  outstandingCount: number
  removedCount: number
}

type ComponentManagerDb = Pick<typeof prismaClient, "assetComponent" | "attachment" | "user">

// As the page read them before: at most 100 links, newest installed first.
const LINK_LIMIT = 100

export async function loadComponentManagerRows(
  db: ComponentManagerDb,
  input: { parentAssetId: string; locale: string; can: (module: string, action: "view") => boolean },
): Promise<ComponentManagerRows> {
  const links = await db.assetComponent.findMany({
    where: { parentAssetId: input.parentAssetId },
    orderBy: { installedAt: "desc" },
    take: LINK_LIMIT,
    select: {
      id: true,
      componentRole: true,
      slotNo: true,
      installedAt: true,
      removedAt: true,
      status: true,
      reason: true,
      referenceType: true,
      referenceId: true,
      createdBy: true,
      updatedBy: true,
      componentAsset: {
        select: { id: true, assetTag: true, name: true, serialNumber: true, custodian: { select: { code: true, fullNameTh: true } } },
      },
    },
  })
  if (links.length === 0) return { rows: [], installedCount: 0, outstandingCount: 0, removedCount: 0 }

  // updatedBy names who removed a link only once it is removed; on a current link it is whoever touched it last.
  const userIds = new Set<string>()
  for (const link of links) {
    if (link.createdBy) userIds.add(link.createdBy)
    if (link.removedAt && link.updatedBy) userIds.add(link.updatedBy)
  }
  const linkIds = links.map((link) => link.id)
  const [t, documentOf, users, evidence] = await Promise.all([
    getTranslations({ locale: input.locale, namespace: "asset" }),
    resolveAssetMovementDocuments(links),
    userIds.size > 0
      ? db.user.findMany({
          where: { id: { in: [...userIds] } },
          select: { id: true, username: true, displayName: true, email: true, employee: { select: { code: true, fullNameTh: true } } },
        })
      : [],
    db.attachment.findMany({
      where: {
        isActive: true,
        module: { in: ["asset_component_install", "asset_component_remove"] },
        referenceId: { in: linkIds },
      },
      select: { referenceId: true },
    }),
  ])

  const access = assetDocumentAccess(input.can)
  const userLabels = new Map(users.map((user) => [user.id, assetHistoryActorLabel(user)]))
  // A by-value that is no user's id (an import, an older row) shows as stored.
  const actor = (value: string | null) => (value ? userLabels.get(value) ?? value : null)
  const evidenceCounts = new Map<string, number>()
  for (const attachment of evidence) evidenceCounts.set(attachment.referenceId, (evidenceCounts.get(attachment.referenceId) ?? 0) + 1)
  const outstandingWords = { outstanding: t("componentOutstanding"), withHolder: (holder: string) => t("componentOutstandingWith", { holder }) }

  const built = links.map((link) => {
    const state: ComponentLinkState = link.removedAt
      ? "removed"
      : isOutstandingLink(link)
        ? "outstanding"
        : link.status === "installed"
          ? "installed"
          : "removed"
    const document = documentOf(link)
    // The RT- of an outstanding link names it in the line; the document cell still asks for its page's permission.
    const outstandingLine = state === "outstanding"
      ? formatOutstandingComponentLine({ holder: link.componentAsset.custodian, documentNo: document?.kind === "checkin" ? document.code : null }, outstandingWords)
      : null
    const row: ComponentLinkRow = {
      id: link.id,
      componentAsset: {
        id: link.componentAsset.id,
        assetTag: link.componentAsset.assetTag,
        name: link.componentAsset.name,
        serialNumber: link.componentAsset.serialNumber,
      },
      role: link.componentRole,
      slotNo: link.slotNo,
      state,
      installedOn: formatAssetDetailDate(link.installedAt, input.locale),
      installedBy: actor(link.createdBy),
      removedOn: link.removedAt ? formatAssetDetailDate(link.removedAt, input.locale) : null,
      removedBy: link.removedAt ? actor(link.updatedBy) : null,
      reason: link.reason,
      document: document && access[document.kind] ? { code: document.code, href: buildAssetMovementDocumentHref(input.locale, document) } : null,
      evidenceCount: evidenceCounts.get(link.id) ?? 0,
      outstandingLine,
    }
    return { row, endedAt: link.removedAt ?? link.installedAt }
  })

  // Current links first, in the order read; past links newest removal first.
  const current = built.filter((entry) => entry.row.state !== "removed").map((entry) => entry.row)
  const past = built
    .filter((entry) => entry.row.state === "removed")
    .sort((left, right) => right.endedAt.getTime() - left.endedAt.getTime())
    .map((entry) => entry.row)
  const count = (state: ComponentLinkState) => built.filter((entry) => entry.row.state === state).length
  return { rows: [...current, ...past], installedCount: count("installed"), outstandingCount: count("outstanding"), removedCount: count("removed") }
}
