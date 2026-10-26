import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { matchPhotoChecklistLabel } from "../src/lib/asset-detail-format.ts"
import { ASSET_EVIDENCE_MODULES, buildAssetEvidenceGroups, groupAssetFiles, type AssetEvidenceSource, type AssetFileRecord } from "../src/lib/asset-files-rules.ts"

// Group 1 asset detail task 11 (spec 2026-10-25 §7.7): the files tab. Photos are the asset's own thumbnailable images,
// the main photo first, then the category checklist's order, then the newest; everything else of modules asset and
// asset_purchase is a document. The evidence from other work is grouped by its document, newest first.
const at = (day: number) => new Date(Date.UTC(2026, 9, day, 3))
const file = (id: string, module: string, originalName: string, fileType: string, day: number): AssetFileRecord => ({ id, module, originalName, fileType, fileSize: 2048, uploadedAt: at(day) })
const checklist = ["ด้านหน้า", "ป้ายรหัส", "Serial number"]

test("a file matches the first checklist label its name starts with, as the upload route names it", () => {
  assert.equal(matchPhotoChecklistLabel(checklist, { originalName: "ป้ายรหัส - IMG_2.jpg" }), "ป้ายรหัส")
  assert.equal(matchPhotoChecklistLabel(checklist, { originalName: "Serial number - sn.png" }), "Serial number")
  // The route replaces \ / : * ? " < > | with a space; the label comes back as the checklist wrote it.
  assert.equal(matchPhotoChecklistLabel(["ป้าย/รหัส"], { originalName: "ป้าย รหัส - x.jpg" }), "ป้าย/รหัส")
  assert.equal(matchPhotoChecklistLabel(checklist, { originalName: "IMG_9.png" }), null)
  assert.equal(matchPhotoChecklistLabel([], { originalName: "ด้านหน้า - a.jpg" }), null)
})

test("photos: the main photo first, then the checklist's order, then the newest; other files are documents (spec §7.7)", () => {
  const files = [
    file("f7", "asset", "ป้ายรหัส - IMG_1.jpg", "image/jpeg", 8),
    file("f1", "asset", "ป้ายรหัส - IMG_2.jpg", "image/jpeg", 20),
    file("f2", "asset", "IMG_9.png", "image/png", 19),
    file("f3", "asset_purchase", "ใบกำกับ INV-7 - scan.jpg", "image/jpeg", 18),
    file("f4", "asset", "ด้านหน้า - front.heic", "image/heic", 17),
    file("f5", "asset", "quote.pdf", "application/pdf", 16),
    file("f8", "asset", "logo.svg", "image/svg+xml", 15),
    file("f6", "asset", "ด้านหน้า - old.jpg", "image/jpeg", 10),
  ]
  const groups = groupAssetFiles(files, checklist)
  assert.deepEqual(groups.photos.map((photo) => [photo.id, photo.label, photo.primary]), [
    ["f1", "ป้ายรหัส", true],
    ["f6", "ด้านหน้า", false],
    ["f7", "ป้ายรหัส", false],
    ["f2", null, false],
  ])
  // An asset_purchase file is a document even when it is an image; a HEIC or SVG image cannot be thumbnailed (415),
  // so it is one too (R27): "รูปหลัก" is the newest thumbnailable asset image, the rule of the overview's รูป card.
  assert.deepEqual(groups.documents.map((document) => document.id), ["f3", "f4", "f5", "f8"])
  // The HEIC front photo still fills its checklist item, as today's data health counts it.
  assert.deepEqual(groups.missingChecklistLabels, ["Serial number"])
  assert.deepEqual(groupAssetFiles([], []), { photos: [], documents: [], missingChecklistLabels: [] })
  assert.deepEqual(groupAssetFiles([file("h", "asset", "a.heic", "image/heic", 1)], ["ด้านหน้า"]).photos, [], "no thumbnailable image: no main photo")
})

test("evidence from other work: one group per document, its files in the module order, newest group first (spec §7.7)", () => {
  const source: AssetEvidenceSource = {
    checkouts: [
      { id: "co1", documentNo: "HO-2026-0001", checkins: [{ id: "ci1", documentNo: "RT-2026-0001" }] },
      { id: "co2", documentNo: null, checkins: [] },
    ],
    components: [{ id: "ac1", otherAssetTag: "GRL-RAM-26-0003" }],
    repairs: [{ id: "mt1", repairNo: "MR-2026-0031" }],
    findings: [{ id: "fd1", auditRoundId: "ar1", auditNo: "AUD-2026-0003" }],
    disposals: [],
  }
  const evidence = [
    { ...file("e1", "checkout_receiver_signature", "sign.png", "image/png", 2), referenceId: "co1" },
    { ...file("e2", "checkout_photo_before", "before.jpg", "image/jpeg", 3), referenceId: "co1" },
    { ...file("e3", "checkin_return_signature", "return.png", "image/png", 9), referenceId: "ci1" },
    { ...file("e4", "asset_component_remove", "ram.jpg", "image/jpeg", 5), referenceId: "ac1" },
    { ...file("e10", "asset_component_install", "ram-in.jpg", "image/jpeg", 4), referenceId: "ac1" },
    { ...file("e5", "maintenance", "invoice.pdf", "application/pdf", 7), referenceId: "mt1" },
    { ...file("e6", "audit_finding", "shelf.jpg", "image/jpeg", 12), referenceId: "fd1" },
    // A disposal request the person may not open is not in the source, so its file is left out.
    { ...file("e7", "disposal", "quote.pdf", "application/pdf", 13), referenceId: "dr9" },
    { ...file("e8", "checkout_photo_before", "old.jpg", "image/jpeg", 1), referenceId: "co2" },
    // The asset's own files are not evidence from other work.
    { ...file("e9", "asset", "x.jpg", "image/jpeg", 14), referenceId: "a1" },
  ]
  const groups = buildAssetEvidenceGroups(source, evidence, { locale: "th", componentsHref: "/th/assets/a1?view=components" })
  assert.deepEqual(groups.map((group) => [group.key, group.kind, group.code, group.href]), [
    ["finding:fd1", "finding", "AUD-2026-0003", "/th/audit/rounds/ar1"],
    ["checkin:ci1", "checkin", "RT-2026-0001", "/th/asset-management/checkins/ci1"],
    ["repair:mt1", "repair", "MR-2026-0031", "/th/maintenance/mt1"],
    ["componentRemove:ac1", "componentRemove", "GRL-RAM-26-0003", "/th/assets/a1?view=components"],
    ["componentInstall:ac1", "componentInstall", "GRL-RAM-26-0003", "/th/assets/a1?view=components"],
    ["checkout:co1", "checkout", "HO-2026-0001", "/th/asset-management/checkouts/co1"],
    // A handover without a document number shows its id, as the handover card did.
    ["checkout:co2", "checkout", "co2", "/th/asset-management/checkouts/co2"],
  ])
  assert.deepEqual(groups.find((group) => group.key === "checkout:co1")?.files.map((entry) => [entry.id, entry.labelKey]), [["e2", "checkoutPhotoBefore"], ["e1", "receiverSignature"]])
  assert.deepEqual(groups.find((group) => group.key === "repair:mt1")?.files.map((entry) => [entry.id, entry.labelKey, entry.name]), [["e5", null, "invoice.pdf"]])
  assert.equal(groups[0].at.getTime(), at(12).getTime())
  assert.equal(groups.find((group) => group.key === "checkout:co1")?.at.getTime(), at(3).getTime(), "a group's time is its newest file")
})

test("the evidence modules are the ones the drawer and the handover cards showed, and each label is a Thai message", () => {
  assert.deepEqual(Object.keys(ASSET_EVIDENCE_MODULES), [
    "checkout_photo_before",
    "checkout_receiver_signature",
    "checkin_photo_after",
    "checkin_return_signature",
    "checkin_receive_signature",
    "asset_component_install",
    "asset_component_remove",
    "maintenance",
    "audit_finding",
    "disposal",
  ])
  const asset = (JSON.parse(readFileSync("messages/th.json", "utf8")) as { asset: Record<string, unknown> }).asset
  for (const [module, { labelKey }] of Object.entries(ASSET_EVIDENCE_MODULES)) {
    if (!labelKey) continue
    const value = labelKey.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], asset)
    assert.equal(typeof value, "string", `${module}: asset.${labelKey}`)
  }
})
