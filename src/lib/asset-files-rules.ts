// The files tab's rules (group 1 spec §7.7). Pure: the loader and the tests import it directly.
import { isThumbnailable } from "./attachment-thumbnail.ts"
import { getMissingPhotoChecklistLabels, matchPhotoChecklistLabel } from "./asset-detail-format.ts"
import { buildAssetMovementDocumentHref, type AssetMovementDocument } from "./asset-movement-labels.ts"

export type AssetFileRecord = { id: string; module: string; originalName: string; fileType: string; fileSize: number; uploadedAt: Date }

// round: the audit round the photo belongs to under the one rule (audit photos spec §2), or null.
export type AssetFilePhotoRound = { auditNo: string; roundId: string }

export type AssetFilePhoto = AssetFileRecord & { label: string | null; primary: boolean; round: AssetFilePhotoRound | null }

export type AssetFileGroups = { photos: AssetFilePhoto[]; documents: AssetFileRecord[]; missingChecklistLabels: string[] }

function newestFirst(left: { id: string; uploadedAt: Date }, right: { id: string; uploadedAt: Date }) {
  const byTime = right.uploadedAt.getTime() - left.uploadedAt.getTime()
  if (byTime !== 0) return byTime
  return left.id < right.id ? 1 : left.id > right.id ? -1 : 0
}

// A photo is the asset's own image the thumbnail route can render (R27); every other file (an asset_purchase image, a
// HEIC or SVG, a PDF) is a document. The main photo is the newest photo, then the checklist's order, then the newest.
// roundOf (audit photos spec §4) names each round photo's round by its id; the order and the primary do not use it.
export function groupAssetFiles(
  files: readonly AssetFileRecord[],
  photoChecklist: readonly string[],
  roundOf: ReadonlyMap<string, AssetFilePhotoRound> = new Map(),
): AssetFileGroups {
  const sorted = [...files].sort(newestFirst)
  const isPhoto = (file: AssetFileRecord) => file.module === "asset" && isThumbnailable(file.fileType)
  const labelled = sorted.filter(isPhoto).map((file, index): AssetFilePhoto => ({
    ...file,
    label: matchPhotoChecklistLabel(photoChecklist, file),
    primary: index === 0,
    round: roundOf.get(file.id) ?? null,
  }))
  const checklistOrder = (photo: AssetFilePhoto) => (photo.label === null ? photoChecklist.length : photoChecklist.indexOf(photo.label))
  const rest = labelled.filter((photo) => !photo.primary)
  // A stable sort keeps the newest first within a label and among the unlabelled.
  const ordered = [...rest].sort((left, right) => checklistOrder(left) - checklistOrder(right))
  const photos = labelled.length > 0 ? [labelled[0], ...ordered] : []

  return {
    photos,
    documents: sorted.filter((file) => !isPhoto(file)),
    // Today's rule: any image of the asset fills its checklist item, a HEIC one too.
    missingChecklistLabels: getMissingPhotoChecklistLabels([...photoChecklist], files.filter((file) => file.module === "asset")),
  }
}

// Audit photos spec §4 (option ข): the files tab's filter chips by round. The facts of one round for this asset, the
// same as the history row: its scan time, the result's message key (auditItemResultKey) and who scanned, by name.
export type AssetPhotoRoundFacts = {
  roundId: string
  auditNo: string
  cancelled: boolean
  scannedAtIso: string | null
  resultKey: string | null
  scannedBy: string | null
}

// chips: "all" first, the rounds latest first, then "none". A round chip's label is its auditNo; "all" and "none" carry
// their key as the label, and the page puts the words on them. selected === null is "ทั้งหมด".
export type AssetPhotoRoundFilter = {
  chips: Array<{ key: string; label: string; count: number; href: string; selected: boolean }>
  selected: AssetPhotoRoundFacts | "none" | null
  visiblePhotoIds: string[]
}

// No round photo, no chips (null). An unknown value, a round without a photo here, or "none" without a photo outside the
// rounds falls back to "ทั้งหมด". The visible ids keep the photos' order, so the primary stays first.
export function buildAssetPhotoRoundFilter(input: {
  photos: readonly AssetFilePhoto[]
  rounds: readonly AssetPhotoRoundFacts[]
  selected: string | null
  hrefFor: (key: string | null) => string
}): AssetPhotoRoundFilter | null {
  const { photos, rounds, hrefFor } = input
  const byRound = new Map<string, { round: AssetFilePhotoRound; ids: string[] }>()
  const outside: string[] = []
  for (const photo of photos) {
    if (!photo.round) {
      outside.push(photo.id)
      continue
    }
    const entry = byRound.get(photo.round.auditNo) ?? { round: photo.round, ids: [] }
    entry.ids.push(photo.id)
    byRound.set(photo.round.auditNo, entry)
  }
  if (byRound.size === 0) return null

  // The latest round first: round numbers run in order (AUD-YYYY-NNNN).
  const roundEntries = [...byRound.values()].sort((left, right) => (left.round.auditNo < right.round.auditNo ? 1 : left.round.auditNo > right.round.auditNo ? -1 : 0))
  const choice = input.selected ?? ""
  const selectedKey = byRound.has(choice) ? choice : choice === "none" && outside.length > 0 ? "none" : null

  const chips: AssetPhotoRoundFilter["chips"] = [
    { key: "all", label: "all", count: photos.length, href: hrefFor(null), selected: selectedKey === null },
    ...roundEntries.map(({ round, ids }) => ({ key: round.auditNo, label: round.auditNo, count: ids.length, href: hrefFor(round.auditNo), selected: selectedKey === round.auditNo })),
    ...(outside.length > 0 ? [{ key: "none", label: "none", count: outside.length, href: hrefFor("none"), selected: selectedKey === "none" }] : []),
  ]

  if (selectedKey === null) return { chips, selected: null, visiblePhotoIds: photos.map((photo) => photo.id) }
  if (selectedKey === "none") return { chips, selected: "none", visiblePhotoIds: outside }
  const entry = byRound.get(selectedKey)!
  const facts = rounds.find((round) => round.auditNo === selectedKey) ?? {
    roundId: entry.round.roundId,
    auditNo: entry.round.auditNo,
    cancelled: false,
    scannedAtIso: null,
    resultKey: null,
    scannedBy: null,
  }
  return { chips, selected: facts, visiblePhotoIds: entry.ids }
}

export type AssetEvidenceKind = "checkout" | "checkin" | "componentInstall" | "componentRemove" | "repair" | "finding" | "disposal"

// The modules of the evidence from other work, in each group's file order. A label key is in the asset namespace; a
// null label shows the file's name.
export const ASSET_EVIDENCE_MODULES: Readonly<Record<string, { kind: AssetEvidenceKind; labelKey: string | null }>> = {
  checkout_photo_before: { kind: "checkout", labelKey: "checkoutPhotoBefore" },
  checkout_receiver_signature: { kind: "checkout", labelKey: "receiverSignature" },
  checkin_photo_after: { kind: "checkin", labelKey: "checkinPhotoAfter" },
  checkin_return_signature: { kind: "checkin", labelKey: "returnSignature" },
  checkin_receive_signature: { kind: "checkin", labelKey: "receiveSignature" },
  asset_component_install: { kind: "componentInstall", labelKey: "filesTab.componentInstallPhoto" },
  asset_component_remove: { kind: "componentRemove", labelKey: "filesTab.componentRemovePhoto" },
  maintenance: { kind: "repair", labelKey: null },
  audit_finding: { kind: "finding", labelKey: null },
  disposal: { kind: "disposal", labelKey: null },
}

const evidenceModuleOrder = Object.keys(ASSET_EVIDENCE_MODULES)

export type AssetEvidenceSource = {
  checkouts: { id: string; documentNo: string | null; checkins: { id: string; documentNo: string | null }[] }[]
  components: { id: string; otherAssetTag: string }[]
  repairs: { id: string; repairNo: string }[]
  findings: { id: string; auditRoundId: string; auditNo: string }[]
  disposals: { id: string; disposalNo: string }[]
}

export type AssetEvidenceFile = { id: string; name: string; fileType: string; labelKey: string | null; uploadedAt: Date }

export type AssetEvidenceGroup = { key: string; kind: AssetEvidenceKind; code: string; href: string; at: Date; files: AssetEvidenceFile[] }

// One group per document (a component link with install and remove photos makes two), newest first. A file whose
// record is not in the source (a document the person may not open) is left out.
export function buildAssetEvidenceGroups(
  source: AssetEvidenceSource,
  files: readonly (AssetFileRecord & { referenceId: string })[],
  options: { locale: string; componentsHref: string },
): AssetEvidenceGroup[] {
  const movement = (document: AssetMovementDocument) => ({ code: document.code, href: buildAssetMovementDocumentHref(options.locale, document) })
  const documents: Record<AssetEvidenceKind, Map<string, { code: string; href: string }>> = {
    checkout: new Map(source.checkouts.map((checkout) => [checkout.id, movement({ kind: "checkout", id: checkout.id, code: checkout.documentNo ?? checkout.id })])),
    checkin: new Map(
      source.checkouts.flatMap((checkout) => checkout.checkins).map((checkin) => [checkin.id, movement({ kind: "checkin", id: checkin.id, code: checkin.documentNo ?? checkin.id })]),
    ),
    componentInstall: new Map(source.components.map((component) => [component.id, { code: component.otherAssetTag, href: options.componentsHref }])),
    componentRemove: new Map(source.components.map((component) => [component.id, { code: component.otherAssetTag, href: options.componentsHref }])),
    repair: new Map(source.repairs.map((repair) => [repair.id, movement({ kind: "repair", id: repair.id, code: repair.repairNo })])),
    finding: new Map(source.findings.map((finding) => [finding.id, movement({ kind: "auditRound", id: finding.auditRoundId, code: finding.auditNo })])),
    disposal: new Map(source.disposals.map((disposal) => [disposal.id, movement({ kind: "disposal", id: disposal.id, code: disposal.disposalNo })])),
  }

  const groups = new Map<string, AssetEvidenceGroup & { modules: string[] }>()
  for (const file of files) {
    const evidence = ASSET_EVIDENCE_MODULES[file.module]
    if (!evidence) continue
    const document = documents[evidence.kind].get(file.referenceId)
    if (!document) continue
    const key = `${evidence.kind}:${file.referenceId}`
    const group = groups.get(key) ?? { key, kind: evidence.kind, code: document.code, href: document.href, at: file.uploadedAt, files: [], modules: [] }
    if (file.uploadedAt.getTime() > group.at.getTime()) group.at = file.uploadedAt
    group.files.push({ id: file.id, name: file.originalName, fileType: file.fileType, labelKey: evidence.labelKey, uploadedAt: file.uploadedAt })
    group.modules.push(file.module)
    groups.set(key, group)
  }

  return [...groups.values()]
    .map(({ modules, ...group }) => {
      const moduleOf = new Map(group.files.map((entry, index) => [entry.id, modules[index]]))
      const order = (entry: AssetEvidenceFile) => evidenceModuleOrder.indexOf(moduleOf.get(entry.id) ?? "")
      const files = [...group.files].sort((left, right) => order(left) - order(right) || left.uploadedAt.getTime() - right.uploadedAt.getTime())
      return { ...group, files }
    })
    .sort((left, right) => right.at.getTime() - left.at.getTime() || (left.key < right.key ? -1 : left.key > right.key ? 1 : 0))
}
