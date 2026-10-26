import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 1 asset detail task 11 (spec 2026-10-25 §7.7, §7.9): the files tab. Uploads and deletes only for asset:edit
// (the attachments POST and DELETE need it), photos through the card-size thumbnail (AssetPhotoFrame) and the original
// only when a person opens it, and the evidence from other work read-only. Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const FILES = "src/components/assets/asset-attachments.tsx"
const TAB = "src/components/assets/detail/asset-files-tab.tsx"
const PAGE = "src/app/[locale]/(dashboard)/assets/[id]/page.tsx"

test("asset files: every write control is an editor's, and the upload takes several files into a queue (spec §7.7)", () => {
  const source = read(FILES)
  assert.match(source, /\bcanEdit: boolean\b/)
  assert.match(source, /\{canEdit \? <AssetFileUpload assetId=\{assetId\} \/> : null\}/)
  assert.match(source, /\{canEdit \? missingChecklistLabels\.map\(/)
  assert.equal(source.match(/onDelete=\{canEdit \? \(\) => handleDelete\((?:photo|document)\) : undefined\}/g)?.length, 2)
  // The free drop zone: several files, queued in FileQueueList, sent by one button.
  assert.match(source, /onFilesChange=\{addFiles\}/)
  assert.match(source, /\n\s+multiple\n/)
  assert.match(source, /<FileQueueList\b/)
  assert.match(source, /<Button busy=\{uploading\} onClick=\{uploadQueued\}>/)
  assert.match(source, /description=\{t\("filesTab\.dropDescription", \{ size: formatCount\(MAX_UPLOAD_BYTES \/ \(1024 \* 1024\)\) \}\)\}/)
  // The phone's camera zone and each missing checklist photo open the rear camera.
  assert.equal(source.match(/capture="environment"/g)?.length, 2)
  assert.match(source, /<div className="md:hidden">\n\s+<FileDropzone\b/)
  assert.match(source, /if \(isUnauthorizedError\(error\)\)/, "a lapsed session goes to the login, as useApiError does")
})

test("asset files: a photo is the card-size frame, its original opens only in the preview, and a document is a row (spec §7.5, §7.7)", () => {
  const source = read(FILES)
  // The tile's own button opens the preview, so the frame inside it is not previewable: no button in a button (R26).
  assert.match(source, /<AssetPhotoFrame attachmentId=\{photo\.id\} alt=\{photo\.originalName\} canUpload=\{false\} previewable=\{false\} \/>/)
  assert.doesNotMatch(source, /from "next\/image"|<Image\b|<img\b/, "no image of its own: AssetPhotoFrame loads the thumbnail")
  assert.match(source, /src=\{preview \? `\/api\/attachments\/\$\{preview\.id\}\?inline=1` : ""\}/)
  assert.match(source, /href=\{`\/api\/attachments\/\$\{document\.id\}`\}/)
  assert.match(source, /aria-label=\{t\("filesTab\.downloadNamed", \{ name: document\.originalName \}\)\}/)
  assert.match(source, /aria-label=\{t\("filesTab\.deleteNamed", \{ name \}\)\}/)
  assert.match(source, /confirm\(\{ title: tCommon\("deleteConfirm"\), description: file\.originalName, confirmLabel: tCommon\("delete"\), tone: "destructive" \}\)/)
})

test("the files tab: the asset's files, the purchase documents and the read-only evidence, each in its own panel", () => {
  const tab = read(TAB)
  assert.doesNotMatch(tab, /"use client"/)
  assert.match(tab, /<div id="photos" className="scroll-mt-24">\n\s+<AssetAttachments assetId=\{assetId\} photos=\{data\.photos\} documents=\{data\.documents\} missingChecklistLabels=\{data\.missingChecklistLabels\} canEdit=\{canEdit\} \/>/)
  assert.match(tab, /<div id="purchase-documents" className="scroll-mt-24">\n\s+<AssetPurchaseDocuments documents=\{data\.purchaseDocuments\} canEdit=\{canEdit\} \/>/)
  assert.match(tab, /<ContentPanel divided flush title=\{t\("filesTab\.evidenceTitle"\)\} description=\{t\("filesTab\.evidenceHelp"\)\}>/)
  assert.match(tab, /<EmptyNote padded>\{t\("filesTab\.evidenceEmpty"\)\}<\/EmptyNote>/)
  assert.match(tab, /href=\{`\/api\/attachments\/\$\{file\.id\}\?inline=1`\} target="_blank" rel="noreferrer"/)
  assert.match(tab, /<AssetThumbnail photo=\{\{ id: file\.id, alt: "", fileType: file\.fileType \}\} assetTag=\{group\.code\} assetName=\{caption\} size=\{44\} preview=\{false\} \/>/)
  assert.match(tab, /<Link href=\{group\.href\} className=\{linkVariants\(\{ size: "inherit" \}\)\}>/)
  const evidence = tab.slice(tab.indexOf('t("filesTab.evidenceTitle")'))
  assert.doesNotMatch(evidence, /<Button\b|<FileDropzone\b|\bcanEdit\b|"DELETE"/, "the evidence is read-only")
})

test("the files loader: the asset's own files uncapped, and the evidence of the work the person may open", () => {
  const loader = read("src/lib/asset-files-data.ts")
  // The files count's where (Task 7): the tab lists exactly the rows its count says (R24).
  assert.match(loader, /prisma\.attachment\.findMany\(\{\n\s+where: assetDetailFileWhere\(asset\.id\),/)
  assert.match(loader, /can\.maintenanceView\s*\?\s*prisma\.maintenanceTicket\.findMany\(/)
  assert.match(loader, /can\.auditView\s*\?\s*prisma\.auditFinding\.findMany\(/)
  assert.match(loader, /can\.disposalView\s*\?\s*prisma\.disposalRequest\.findMany\(/)
  assert.match(loader, /OR: \[\{ parentAssetId: asset\.id \}, \{ componentAssetId: asset\.id \}\]/)
  assert.match(loader, /Object\.entries\(ASSET_EVIDENCE_MODULES\)/)
  assert.match(loader, /groupAssetFiles\(/)
  assert.match(loader, /buildAssetEvidenceGroups\(/)
  assert.doesNotMatch(loader, /\btake:/)
})

test("the page loads the files tab's data only on that tab, and the old files, handover and evidence parts are gone", () => {
  const page = read(PAGE)
  assert.match(page, /assetDetailView === "files"\s*\?\s*await withPerformanceTiming\(\s*"asset-detail\.files-tab",\s*\(\) =>\s*getAssetFilesTabData\(/)
  assert.match(page, /can: \{ maintenanceView: canViewMaintenance, auditView: canViewAudit, disposalView: canViewDisposal \}/)
  assert.match(page, /<AssetFilesTab locale=\{locale\} assetId=\{asset\.id\} data=\{filesData\} canEdit=\{canEditAsset\} \/>/)
  assert.doesNotMatch(page, /<AssetAttachments\b|<AssetPurchaseDocuments\b|<section id="handover"|function (?:HandoverEvidenceGrid|EvidenceLinks|buildEvidenceItems|getCheckoutDestination|getAssetHandoverModeLabel)\b|asset-detail\.evidence-references/)
  // R59: the page reads the checklist only for the overview's ข้อมูลยังไม่ครบ line; the files tab reads its own through the loader.
  assert.match(page, /canEditAsset && assetDetailView === "overview" \? getCategoryPhotoChecklist\(asset\.categoryId\) : Promise\.resolve\(\[\]\)/)
})

test("the files tab's words, in Thai and English (group 1 spec §7.7)", () => {
  const filesTab = (locale: string) => (JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { asset: { filesTab: Record<string, unknown> } }).asset.filesTab
  assert.equal(filesTab("th").title, "รูปและไฟล์แนบ")
  assert.equal(filesTab("th").evidenceTitle, "หลักฐานจากงานอื่น")
  assert.equal(filesTab("en").title, "Photos and attachments")
  assert.deepEqual(Object.keys(filesTab("th").evidenceKinds as object).sort(), ["checkin", "checkout", "componentInstall", "componentRemove", "disposal", "finding", "repair"])
  // The purchase section keeps the app's one word (R31), not the spec's "เอกสารการซื้อ".
  const asset = (JSON.parse(readFileSync("messages/th.json", "utf8")) as { asset: Record<string, unknown> }).asset
  assert.equal(asset.purchaseDocuments, "เอกสารจัดซื้อ")
  assert.doesNotMatch(JSON.stringify(filesTab("th")), /เอกสารการซื้อ/)
})
