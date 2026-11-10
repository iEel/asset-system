// The files tab's reads (group 1 spec §7.7): the asset's own files uncapped, its purchase documents, and the evidence of
// the work the person may open (the file route refuses the rest). Read only.
import type { ComponentProps } from "react"
import type { AssetPurchaseDocuments } from "@/components/assets/asset-purchase-documents"
import { prisma } from "@/lib/db"
import { assetDetailFileWhere } from "@/lib/asset-detail-data"
import { getCategoryPhotoChecklist } from "@/lib/category-photo-checklist"
import {
  ASSET_EVIDENCE_MODULES,
  buildAssetEvidenceGroups,
  buildAssetPhotoRoundFilter,
  groupAssetFiles,
  type AssetEvidenceGroup,
  type AssetEvidenceKind,
  type AssetFileGroups,
  type AssetFilePhotoRound,
  type AssetPhotoRoundFacts,
  type AssetPhotoRoundFilter,
} from "@/lib/asset-files-rules"
import { assetHistoryActorLabel, auditItemResultKey } from "@/lib/asset-history-rules"
import { buildAssetMovementDocumentHref } from "@/lib/asset-movement-labels"
import { chunkAuditIds } from "@/lib/audit-round-counts-rules"
import { loadAuditRoundPhotos, type AuditRoundPhotoDb } from "@/lib/audit-round-photos-data"

// The repair, auditRound and disposal rows of ASSET_MOVEMENT_DOCUMENT_PERMISSION. A handover and a return need
// asset:view, which every reader of the page holds. A document the person may not open shows neither its link, its code
// nor its files (R12).
export type AssetEvidenceAccess = { maintenanceView: boolean; auditView: boolean; disposalView: boolean }

export type AssetFilesTabData = AssetFileGroups & {
  purchaseDocuments: ComponentProps<typeof AssetPurchaseDocuments>["documents"]
  evidence: AssetEvidenceGroup[]
  // Audit photos spec §4: the chips by round (null: no round photo), and the selected round's link, only with audit:view.
  photoRoundFilter: AssetPhotoRoundFilter | null
  photoRoundHref: string | null
}

const fileSelect = { id: true, module: true, originalName: true, fileType: true, fileSize: true, uploadedAt: true } as const

export async function getAssetFilesTabData(
  asset: { id: string; categoryId: string },
  {
    locale,
    componentsHref,
    filesHref,
    photoRound,
    can,
  }: {
    locale: string
    componentsHref: string
    // The files tab's own link (view=files and the returnTo); a chip adds its photoRound to it.
    filesHref: string
    photoRound?: string | string[]
    can: AssetEvidenceAccess
  },
): Promise<AssetFilesTabData> {
  const [files, checklist, purchaseDocumentLinks, checkouts, componentLinks, repairs, findings, disposals, roundPhotos] = await Promise.all([
    // The files count's where (Task 7): the tab lists exactly the rows its count says (R24).
    prisma.attachment.findMany({
      where: assetDetailFileWhere(asset.id),
      orderBy: [{ uploadedAt: "desc" }, { id: "desc" }],
      select: fileSelect,
    }),
    getCategoryPhotoChecklist(asset.categoryId),
    prisma.purchaseDocumentAsset.findMany({
      where: { assetId: asset.id },
      orderBy: { linkedAt: "desc" },
      include: { purchaseDocument: { include: { supplier: { select: { code: true, name: true } } } } },
    }),
    prisma.assetCheckout.findMany({
      where: { assetId: asset.id },
      select: { id: true, documentNo: true, checkins: { select: { id: true, documentNo: true } } },
    }),
    // Every link on either side, removed ones too, so a removed part's photos stay.
    prisma.assetComponent.findMany({
      where: { OR: [{ parentAssetId: asset.id }, { componentAssetId: asset.id }] },
      select: { id: true, parentAssetId: true, parentAsset: { select: { assetTag: true } }, componentAsset: { select: { assetTag: true } } },
    }),
    can.maintenanceView ? prisma.maintenanceTicket.findMany({ where: { assetId: asset.id, isActive: true }, select: { id: true, repairNo: true } }) : [],
    can.auditView ? prisma.auditFinding.findMany({ where: { assetId: asset.id }, select: { id: true, auditRound: { select: { id: true, auditNo: true } } } }) : [],
    can.disposalView ? prisma.disposalRequest.findMany({ where: { assetId: asset.id, isActive: true }, select: { id: true, disposalNo: true } }) : [],
    // The one rule of a round's photos (audit photos spec §2), through the shared loader.
    loadAuditRoundPhotos(prisma as unknown as AuditRoundPhotoDb, [asset.id]),
  ])

  const components = componentLinks.map((component) => ({
    id: component.id,
    otherAssetTag: component.parentAssetId === asset.id ? component.componentAsset.assetTag : component.parentAsset.assetTag,
  }))
  const purchaseDocumentIds = purchaseDocumentLinks.map((link) => link.purchaseDocumentId)
  const referenceIds: Record<AssetEvidenceKind, string[]> = {
    checkout: checkouts.map((checkout) => checkout.id),
    checkin: checkouts.flatMap((checkout) => checkout.checkins.map((checkin) => checkin.id)),
    componentInstall: components.map((component) => component.id),
    componentRemove: components.map((component) => component.id),
    repair: repairs.map((repair) => repair.id),
    finding: findings.map((finding) => finding.id),
    disposal: disposals.map((disposal) => disposal.id),
  }
  const or = [
    ...(purchaseDocumentIds.length > 0 ? [{ module: "purchase_document", referenceId: { in: purchaseDocumentIds } }] : []),
    ...Object.entries(ASSET_EVIDENCE_MODULES).flatMap(([module, { kind }]) =>
      referenceIds[kind].length > 0 ? [{ module, referenceId: { in: referenceIds[kind] } }] : [],
    ),
  ]
  // One read of every other file: the purchase documents' and the evidence's.
  const otherFiles = or.length > 0
    ? await prisma.attachment.findMany({
        where: { isActive: true, OR: or },
        orderBy: { uploadedAt: "desc" },
        select: { ...fileSelect, referenceId: true },
      })
    : []

  const purchaseDocumentFiles = new Map<string, typeof otherFiles>()
  for (const file of otherFiles) {
    if (file.module !== "purchase_document") continue
    purchaseDocumentFiles.set(file.referenceId, [...(purchaseDocumentFiles.get(file.referenceId) ?? []), file])
  }
  const purchaseDocuments = purchaseDocumentLinks.map((link) => ({
    id: link.purchaseDocument.id,
    documentType: link.purchaseDocument.documentType,
    documentNo: link.purchaseDocument.documentNo,
    poNumber: link.purchaseDocument.poNumber,
    invoiceNumber: link.purchaseDocument.invoiceNumber,
    documentDate: link.purchaseDocument.documentDate,
    linkedAt: link.linkedAt,
    supplierName: link.purchaseDocument.supplier ? `${link.purchaseDocument.supplier.code} - ${link.purchaseDocument.supplier.name}` : null,
    totalAmount: link.purchaseDocument.totalAmount ? Number(link.purchaseDocument.totalAmount) : null,
    currency: link.purchaseDocument.currency,
    attachments: purchaseDocumentFiles.get(link.purchaseDocument.id) ?? [],
  }))

  const evidence = buildAssetEvidenceGroups(
    {
      checkouts,
      components,
      repairs,
      findings: findings.map((finding) => ({ id: finding.id, auditRoundId: finding.auditRound.id, auditNo: finding.auditRound.auditNo })),
      disposals,
    },
    otherFiles.filter((file) => file.module !== "purchase_document"),
    { locale, componentsHref },
  )

  const { roundOf, rounds } = await readPhotoRounds(asset.id, roundPhotos)
  const groups = groupAssetFiles(files, checklist, roundOf)
  const photoRoundFilter = buildAssetPhotoRoundFilter({
    photos: groups.photos,
    rounds,
    selected: (Array.isArray(photoRound) ? photoRound[0] : photoRound) ?? null,
    hrefFor: (key) => (key === null ? filesHref : `${filesHref}&photoRound=${encodeURIComponent(key)}`),
  })
  const selected = photoRoundFilter && photoRoundFilter.selected !== "none" ? photoRoundFilter.selected : null
  // The round number links to the round only with audit:view; without it the line names it as plain text.
  const photoRoundHref =
    can.auditView && selected ? buildAssetMovementDocumentHref(locale, { kind: "auditRound", id: selected.roundId, code: selected.auditNo }) : null

  return { ...groups, purchaseDocuments, evidence, photoRoundFilter, photoRoundHref }
}

// The rounds the asset's photos belong to and the asset's item in each: one read of the rounds and one of the items (by
// the matched round ids and the asset id), then the scanners' names as the history names them.
async function readPhotoRounds(
  assetId: string,
  roundPhotos: readonly { id: string; auditRoundId: string | null }[],
): Promise<{ roundOf: Map<string, AssetFilePhotoRound>; rounds: AssetPhotoRoundFacts[] }> {
  const roundIds = [...new Set(roundPhotos.flatMap((photo) => (photo.auditRoundId ? [photo.auditRoundId] : [])))]
  if (roundIds.length === 0) return { roundOf: new Map(), rounds: [] }

  const chunks = chunkAuditIds(roundIds)
  const [roundRows, itemRows] = await Promise.all([
    Promise.all(chunks.map((chunk) => prisma.auditRound.findMany({ where: { id: { in: chunk } }, select: { id: true, auditNo: true, status: true } }))),
    Promise.all(
      chunks.map((chunk) =>
        prisma.auditItem.findMany({
          where: { assetId, auditRoundId: { in: chunk } },
          select: { auditRoundId: true, lastScanAt: true, updatedAt: true, scannedBy: true, auditStatus: true, auditResult: true },
        }),
      ),
    ),
  ])
  const items = new Map(itemRows.flat().map((item) => [item.auditRoundId, item]))
  const scannerIds = [...new Set([...items.values()].flatMap((item) => (item.scannedBy ? [item.scannedBy] : [])))]
  const users = scannerIds.length > 0
    ? (await Promise.all(
        chunkAuditIds(scannerIds).map((chunk) =>
          prisma.user.findMany({
            where: { id: { in: chunk } },
            select: { id: true, username: true, displayName: true, email: true, employee: { select: { code: true, fullNameTh: true } } },
          }),
        ),
      )).flat()
    : []
  const nameOf = new Map(users.map((user) => [user.id, assetHistoryActorLabel(user)]))

  const roundsById = new Map(roundRows.flat().map((round) => [round.id, round]))
  const roundOf = new Map<string, AssetFilePhotoRound>()
  for (const photo of roundPhotos) {
    const round = photo.auditRoundId ? roundsById.get(photo.auditRoundId) : undefined
    if (round) roundOf.set(photo.id, { auditNo: round.auditNo, roundId: round.id })
  }
  const rounds = [...roundsById.values()].map((round): AssetPhotoRoundFacts => {
    const item = items.get(round.id)
    return {
      roundId: round.id,
      auditNo: round.auditNo,
      cancelled: round.status === "cancelled",
      scannedAtIso: item ? (item.lastScanAt ?? item.updatedAt).toISOString() : null,
      resultKey: item ? auditItemResultKey(item.auditStatus, item.auditResult) : null,
      scannedBy: item?.scannedBy ? nameOf.get(item.scannedBy) ?? null : null,
    }
  })
  return { roundOf, rounds }
}
