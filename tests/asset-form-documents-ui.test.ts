import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  ACTIVE_PURCHASE_DOCUMENT_DRAFT,
  buildPurchaseDocumentUploadForm,
  failedPurchaseDocumentsKey,
  listPurchaseDocumentUploads,
  mapPurchaseDocumentDuplicates,
  parseFailedPurchaseDocuments,
  planPurchaseDocumentLinks,
  purchaseDocumentCheckPath,
} from "../src/lib/asset-form-documents.ts"
import { changeFieldId, diffAssetFormDocuments, isPurchaseDocumentChange, sectionOfChange } from "../src/lib/asset-form-diff.ts"
import { emptyAssetFormValues, type PurchaseDocumentDraft } from "../src/lib/asset-form-rules.ts"
import { summarizeAssetFormSection, type AssetFormSummaryInput } from "../src/lib/asset-form-summary.ts"

// Group 4 plan 3 Task 5 (spec §9, P3-R4..R7, Review Focus 1, 3, 4): the single form's เอกสารจัดซื้อ. Left the picker over
// the documents already in the system, right the upload of new ones; บันทึก first asks the pre-check, then saves the
// asset, then creates and links each new document, links the chosen ones and, on edit, unlinks the removed ones. The
// working tree is CRLF on Windows: every read strips \r before the multi-line regexes.
const C = "src/components/assets/"
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { asset: Record<string, unknown>; apiErrors: Record<string, string> }
const EDIT_PAGE = "src/app/[locale]/(dashboard)/assets/[id]/edit/page.tsx"
const NEW_PAGE = "src/app/[locale]/(dashboard)/assets/new/page.tsx"

function handleSubmitBody(source: string) {
  const start = source.indexOf("  async function handleSubmit(")
  assert.notEqual(start, -1, "async function handleSubmit(")
  return source.slice(start, source.indexOf("\n  }\n", start))
}

const file = (name: string) => new File(["x"], name, { type: "application/pdf" })
const draft = (over: Partial<PurchaseDocumentDraft> = {}): PurchaseDocumentDraft => ({
  id: "q1",
  documentType: "invoice",
  documentNo: "INV-1",
  documentDate: "",
  totalAmount: "",
  supplierId: null,
  file: file("inv.pdf"),
  ...over,
})
const doc = (id: string, documentNo: string, documentType: "purchase_order" | "invoice" = "purchase_order") => ({ id, documentNo, documentType })

test("the uploads: the queued drafts, then the active fields when they hold a file and a number", () => {
  const queued = [draft()]
  const active = { documentType: "purchase_order" as const, documentNo: "  PO-9 ", documentDate: "2026-11-01", totalAmount: "100", supplierId: "s2", file: file("po.pdf") }
  const uploads = listPurchaseDocumentUploads(queued, active)
  assert.deepEqual(uploads.map((upload) => [upload.id, upload.documentNo]), [["q1", "INV-1"], [ACTIVE_PURCHASE_DOCUMENT_DRAFT, "PO-9"]])
  assert.equal(uploads[1].supplierId, "s2")
  // No file, or no number: the active fields are not uploaded (the file stays optional on the server, not in this form).
  assert.deepEqual(listPurchaseDocumentUploads(queued, { ...active, file: null }), queued)
  assert.deepEqual(listPurchaseDocumentUploads(queued, { ...active, documentNo: "  " }), queued)
})

test("the pre-check's duplicates land under the active number or on the queued row (Review Focus 1)", () => {
  const uploads = [draft({ id: "q1" }), draft({ id: "q2", documentNo: "INV-2" }), draft({ id: ACTIVE_PURCHASE_DOCUMENT_DRAFT, documentNo: "INV-2" })]
  assert.deepEqual(mapPurchaseDocumentDuplicates(uploads, []), { active: null, rows: {} })
  assert.deepEqual(
    mapPurchaseDocumentDuplicates(uploads, [{ index: 0, id: "pd-9", reason: "exists" }, { index: 2, id: null, reason: "repeated" }]),
    { active: "purchaseDocumentRepeated", rows: { q1: "purchaseDocumentExists" } },
  )
  assert.deepEqual(mapPurchaseDocumentDuplicates(uploads, [{ index: 2, id: "pd-1", reason: "exists" }]), { active: "purchaseDocumentExists", rows: {} })
  // An index the list does not hold is ignored.
  assert.deepEqual(mapPurchaseDocumentDuplicates(uploads, [{ index: 7, id: "pd-1", reason: "exists" }]), { active: null, rows: {} })
  assert.equal(purchaseDocumentCheckPath, "/api/purchase-documents/check-duplicates")
})

test("the links after the save: the newly chosen ones; on edit the stored ones marked for removal (P3-R5)", () => {
  const chosen = [doc("a", "PO-1"), doc("b", "PO-2"), doc("c", "PO-3")]
  // Create (a clone too): every chosen document is new.
  assert.deepEqual(planPurchaseDocumentLinks({ originalIds: [], chosen, removedIds: new Set() }), { linkIds: ["a", "b", "c"], unlinkIds: [] })
  // Edit: a and b are stored, c is new; b is marked for removal.
  assert.deepEqual(planPurchaseDocumentLinks({ originalIds: ["a", "b"], chosen, removedIds: new Set(["b"]) }), { linkIds: ["c"], unlinkIds: ["b"] })
  // ยกเลิก-like: nothing changed, nothing to send.
  assert.deepEqual(planPurchaseDocumentLinks({ originalIds: ["a", "b"], chosen: chosen.slice(0, 2), removedIds: new Set() }), { linkIds: [], unlinkIds: [] })
})

test("each draft is one multipart body: type, number, the PO or invoice copy, date, amount, its own supplier and the file", () => {
  const po = buildPurchaseDocumentUploadForm(draft({ documentType: "purchase_order", documentNo: "PO-7", documentDate: "2026-11-02", totalAmount: "1500.5", supplierId: "s9", file: file("po.pdf") }))
  assert.equal(po.get("documentType"), "purchase_order")
  assert.equal(po.get("documentNo"), "PO-7")
  assert.equal(po.get("poNumber"), "PO-7")
  assert.equal(po.get("invoiceNumber"), null)
  assert.equal(po.get("documentDate"), "2026-11-02")
  assert.equal(po.get("totalAmount"), "1500.5")
  assert.equal(po.get("supplierId"), "s9")
  assert.equal(po.get("currency"), "THB")
  assert.equal((po.get("file") as File).name, "po.pdf")
  // The asset's supplier is the server's default (Task 3), so a draft that follows it sends none.
  const invoice = buildPurchaseDocumentUploadForm(draft())
  assert.equal(invoice.get("invoiceNumber"), "INV-1")
  assert.equal(invoice.get("poNumber"), null)
  assert.equal(invoice.get("supplierId"), null)
  assert.equal(invoice.get("documentDate"), null)
  assert.equal(invoice.get("totalAmount"), null)
})

test("the failure hand-off names type, number and file name only, under a key with the asset id (P3-R6)", () => {
  assert.equal(failedPurchaseDocumentsKey("a-1"), "asset-form:documents-failed:a-1")
  const items = [{ documentType: "invoice", documentNo: "INV-1", fileName: "inv.pdf" }]
  assert.deepEqual(parseFailedPurchaseDocuments(JSON.stringify(items)), items)
  assert.deepEqual(parseFailedPurchaseDocuments(null), [])
  assert.deepEqual(parseFailedPurchaseDocuments("{not json"), [])
  assert.deepEqual(parseFailedPurchaseDocuments(JSON.stringify([{ documentType: "nope", documentNo: "X" }, { documentNo: 5 }, ...items])), items)
})

test("the change list names the documents added and removed (P3-R5), in the documents section", () => {
  const original = [doc("a", "PO-1"), doc("b", "INV-2", "invoice")]
  const chosen = [...original, doc("c", "PO-3")]
  const changes = diffAssetFormDocuments({ original, chosen, removedIds: new Set(["b"]), uploads: [draft({ id: "q1", documentNo: "INV-9" })] })
  assert.deepEqual(changes, [
    { field: "purchaseDocuments.c", from: "", to: "PO-3", automatic: false },
    { field: "purchaseDocuments.b", from: "INV-2", to: "", automatic: false },
    { field: "purchaseDocuments.new.q1", from: "", to: "INV-9", automatic: false },
  ])
  assert.deepEqual(diffAssetFormDocuments({ original, chosen: original, removedIds: new Set(), uploads: [] }), [])
  assert.equal(isPurchaseDocumentChange("purchaseDocuments.c"), true)
  assert.equal(isPurchaseDocumentChange("remark"), false)
  assert.equal(sectionOfChange("purchaseDocuments.c"), "documents")
  assert.equal(changeFieldId("purchaseDocuments.c", []), "asset-purchase-document-search")
})

test("the section summary: the chosen refs and the queued count; the badge เลือกแล้ว on create, ผูกไว้ on edit", () => {
  const base: AssetFormSummaryInput = {
    values: { ...emptyAssetFormValues },
    install: { parentAssetId: "", componentRole: "", slotNo: "", reason: "" },
    documents: { mode: "create", chosen: [], queued: 0 },
    photos: { checklistTotal: 0, checklistCovered: 0, existing: 0, queued: 0 },
    customFields: { definitions: [], valueOf: () => "", extraRows: 0 },
  }
  assert.deepEqual(summarizeAssetFormSection("documents", base), { filled: 0, total: 0, parts: [] })
  const chosen = [doc("a", "PO-1"), doc("b", "INV-2", "invoice")]
  assert.deepEqual(summarizeAssetFormSection("documents", { ...base, documents: { mode: "create", chosen, queued: 1 } }), {
    filled: 0,
    total: 0,
    parts: [{ key: "documentRefs", refs: chosen }, { key: "documentsQueued", count: 1 }],
    badge: { key: "documentsSelected", count: 2 },
  })
  // Edit: what stays linked after the save (stored minus removed plus newly chosen); a removed one leaves the refs.
  assert.deepEqual(summarizeAssetFormSection("documents", { ...base, documents: { mode: "edit", chosen, removedIds: new Set(["b"]), queued: 0 } }), {
    filled: 0,
    total: 0,
    parts: [{ key: "documentRefs", refs: [chosen[0]] }],
    badge: { key: "documentsLinked", count: 1 },
  })
})

test("the section: the picker on the left, the upload on the right (stacked below 1024 px, the upload second)", () => {
  const source = read(`${C}asset-form-documents.tsx`)
  assert.match(source, /<div id="documents" className="scroll-mt-24">\n\s+<FoldedSection title=\{t\("purchaseDocuments"\)\} disclosure=\{disclosure\}>/)
  assert.match(source, /className="grid grid-cols-1 gap-5 lg:grid-cols-2"/)
  const picker = source.indexOf("<PurchaseDocumentPicker")
  const upload = source.indexOf('{t("createPurchaseDocument")}')
  assert.ok(picker > 0 && upload > picker, "the picker comes first in the DOM, the upload second")
  assert.match(source, /<PurchaseDocumentPicker\n\s+id="asset-purchase-document"\n\s+chosen=\{chosen\}\n\s+recent=\{recent\}\n\s+supplierId=\{supplierId\}\n\s+onChoose=\{onChoose\}\n\s+onRemove=\{onRemove\}\n\s+removedIds=\{removedIds\}\n\s+disabled=\{saving\}/)
  // The upload part's order: the drop zone, ประเภทเอกสาร, เลขที่เอกสาร, วันที่เอกสาร, ยอดรวม (บาท), ผู้ขาย, + เพิ่มอีกใบ.
  const order = ["<FileDropzone", 'label={t("documentType")}', 'label={t("purchaseDocumentNo")}', 'label={t("purchaseDocumentDate")}', 'label={t("purchaseDocumentAmountBaht")}', 'label={t("supplier")}', '{t("addPurchaseDocument")}'].map((needle) => source.indexOf(needle))
  assert.ok(order.every((at, index) => at > upload && (index === 0 || at > order[index - 1])), order.join(","))
  for (const id of ["asset-purchase-document-type", "asset-purchase-document-date", "asset-purchase-document-supplier"]) assert.ok(source.includes(`id="${id}"`), id)
  // The ChoiceCards over 300 documents are gone; each queued draft keeps its red remove and its own error line.
  assert.doesNotMatch(source, /ChoiceCard|linkedAssets|purchaseDocumentOptions/)
  assert.match(source, /aria-label=\{t\("purchaseDocumentRemoveNamed", \{ number: document\.documentNo \}\)\}/)
  assert.match(source, /<FieldError id=\{`asset-purchase-document-draft-\$\{document\.id\}-error`\}/)
  assert.match(source, /\{failedNotice\}/)
})

test("the form: create opens เอกสารจัดซื้อ, edit folds it, ?documents=failed and #documents open it with the Notice (P3-R6)", () => {
  const form = read(`${C}asset-form.tsx`)
  assert.match(form, /const \[openSections, setOpenSections\] = useState<Set<AssetFormSection>>\(\(\) => new Set<AssetFormSection>\(asset\?\.id && !documentsFailed \? \[\] : \["documents"\]\)\)/)
  assert.match(form, /if \(window\.location\.hash === "#documents"\) openSectionNow\("documents"\)/)
  assert.match(form, /window\.sessionStorage\.getItem\(key\)/)
  assert.match(form, /<Notice tone="warning" title=\{t\("documentsFailedTitle"\)\}>/)
  // The badge of เอกสารจัดซื้อ comes from the summary; the other sections keep กรอกแล้ว n จาก m ช่อง.
  assert.match(form, /badge: summary\.badge\n\s+\? t\(`sectionSummary\.\$\{summary\.badge\.key\}`, \{ count: summary\.badge\.count \}\)\n\s+: summary\.total > 0 \? t\("sectionFilled", \{ filled: summary\.filled, total: summary\.total \}\) : undefined/)
  const edit = read(EDIT_PAGE)
  assert.match(edit, /searchParams: Promise<\{ returnTo\?: string \| string\[\]; documents\?: string \| string\[\] \}>/)
  assert.match(edit, /const documentsFailed = getSingleSearchParam\(rawSearchParams\.documents\) === "failed"/)
  assert.match(edit, /documentsFailed=\{documentsFailed\}/)
})

test("บันทึก: the pre-check first, then the asset, then each draft, the chosen link, the unlinks, the photos (P3-R5, Review Focus 1, 4)", () => {
  const form = read(`${C}asset-form.tsx`)
  const body = handleSubmitBody(form)
  const at = (needle: string) => {
    const index = body.indexOf(needle)
    assert.notEqual(index, -1, needle)
    return index
  }
  const steps = [
    "fieldErrors.setErrors(",
    "await passesPurchaseDocumentPreCheck(documentUploads)",
    "await fetch(url, {",
    'failedSteps.push(t("followUpInstall"))',
    "await uploadPurchaseDocument(savedId, upload)",
    "await linkPurchaseDocuments(savedId, documentLinks.linkIds)",
    "await unlinkPurchaseDocument(savedId, documentId)",
    'failedSteps.push(t("followUpDocuments"))',
    "await uploadAssetPhotos(savedId, newAssetPhotos)",
  ].map(at)
  assert.deepEqual([...steps].sort((a, b) => a - b), steps)
  // A refused pre-check returns before the asset is posted: nothing else is sent, the file and fields stay.
  assert.match(body, /if \(documentUploads\.length > 0 && !\(await passesPurchaseDocumentPreCheck\(documentUploads\)\)\) return/)
  // A failed document step lands on the edit page with เอกสารจัดซื้อ open; any other failed step on the asset page.
  assert.match(body, /if \(documentStepFailed\) router\.push\(`\/\$\{locale\}\/assets\/\$\{savedId\}\/edit\?documents=failed#documents`\)\n\s+else router\.push\(`\/\$\{locale\}\/assets\/\$\{savedId\}`\)/)
  // One request each: a multipart POST per draft, a JSON link, a DELETE per removed chip.
  assert.match(form, /fetch\(assetPurchaseDocumentsPath\(assetId\), \{ method: "POST", body: buildPurchaseDocumentUploadForm\(draft\) \}\)/)
  assert.match(form, /fetch\(assetPurchaseDocumentPath\(assetId, documentId\), \{ method: "DELETE" \}\)/)
  assert.match(form, /fetch\(purchaseDocumentCheckPath, \{/)
  // The old create-then-link and the 300 ChoiceCards are gone from the form.
  assert.doesNotMatch(form, /"\/api\/purchase-documents"|togglePurchaseDocument|selectedPurchaseDocumentIds|createPurchaseDocuments/)
  // The asset bodies no longer carry the chosen ids: the links do.
  assert.match(form, /delete body\.purchaseDocumentIds/)
})

test("the pages hand the form the chosen documents by id and the empty-query list; no fetch on load (P3-R4)", () => {
  const edit = read(EDIT_PAGE)
  assert.match(edit, /readPurchaseDocumentChoices\(purchaseDocumentDb, asset\.purchaseDocumentLinks\.map\(\(link\) => link\.purchaseDocumentId\)\)/)
  assert.match(edit, /searchPurchaseDocuments\(purchaseDocumentDb, \{ q: "", supplierId: asset\.supplierId \}\)/)
  assert.match(edit, /chosenDocuments=\{chosenDocuments\}\n\s+recentDocuments=\{recentDocuments\}/)
  assert.doesNotMatch(edit, /purchaseDocumentIds:/)
  const create = read(NEW_PAGE)
  assert.match(create, /searchPurchaseDocuments\(purchaseDocumentDb, \{ q: "", supplierId: null \}\)/)
  assert.match(create, /readPurchaseDocumentChoices\(purchaseDocumentDb, cloneState\.asset\.purchaseDocumentIds\)/)
  assert.match(create, /searchPurchaseDocuments\(purchaseDocumentDb, \{ q: "", supplierId: cloneState\.asset\.supplierId \}\)/)
})

test("the words: ใบ for documents, the two part titles, + เพิ่มอีกใบ, and the failure Notice in th and en", () => {
  const th = messages("th").asset
  const en = messages("en").asset
  assert.equal(th.existingPurchaseDocuments, "เลือกเอกสารที่มีอยู่")
  assert.equal(th.createPurchaseDocument, "อัปโหลดเอกสารใหม่")
  assert.equal(th.addPurchaseDocument, "เพิ่มอีกใบ")
  assert.equal(th.purchaseDocumentChangeAdd, "เพิ่ม {number}")
  assert.equal(th.purchaseDocumentRemoveNamed, "เอา {number} ออก")
  assert.equal(typeof th.purchaseDocumentRepeated, "string")
  assert.equal(typeof th.documentsFailedTitle, "string")
  assert.equal(typeof th.documentsFailedList, "string")
  assert.equal(typeof th.documentsFailedGeneric, "string")
  for (const key of ["existingPurchaseDocuments", "createPurchaseDocument", "addPurchaseDocument", "purchaseDocumentChangeAdd", "purchaseDocumentRepeated", "documentsFailedTitle", "documentsFailedList", "documentsFailedGeneric"]) {
    assert.equal(typeof en[key], "string", `en ${key}`)
  }
  // The draft's remove reads เอา <เลขที่> ออก; the old words are gone.
  assert.equal(th.removePurchaseDocument, undefined)
  assert.equal(messages("th").apiErrors.purchaseDocumentExists, "เอกสารจัดซื้อนี้มีอยู่แล้ว")
})

test("without asset:edit (P3-R2): the create page and the clone link no documents, the section is a note, the save sends no document step", () => {
  const create = read(NEW_PAGE)
  assert.match(create, /const user = await requirePagePermission\(locale, "asset", "create"\)/)
  assert.match(create, /const canLinkPurchaseDocuments = hasPermission\(user, "asset", "edit"\)/)
  // No clone: the recent list is read only with the permission, and the flag goes to the form.
  assert.match(create, /const recentDocuments = canLinkPurchaseDocuments \? await searchPurchaseDocuments\(purchaseDocumentDb, \{ q: "", supplierId: null \}\) : noDocuments/)
  assert.match(create, /<AssetCreateWorkspace \{\.\.\.options\} recentDocuments=\{recentDocuments\} canLinkPurchaseDocuments=\{canLinkPurchaseDocuments\} backHref=\{returnToHref\} \/>/)
  // A clone without the permission carries no chips and reads no documents.
  assert.match(create, /const \[cloneDocuments, recentDocuments\] = canLinkPurchaseDocuments\n\s+\? await Promise\.all\(\[[\s\S]+?\]\)\n\s+: \[\[\], noDocuments\]/)
  assert.match(create, /chosenDocuments=\{chosenDocuments\}\n\s+recentDocuments=\{recentDocuments\}\n\s+canLinkPurchaseDocuments=\{canLinkPurchaseDocuments\}/)
  // The edit page needs asset:edit itself, so it always may link.
  const edit = read(EDIT_PAGE)
  assert.match(edit, /await requirePagePermission\(locale, "asset", "edit"\)/)
  assert.match(edit, /recentDocuments=\{recentDocuments\}\n\s+\/\/ [^\n]+\n\s+canLinkPurchaseDocuments\n/)

  const form = read(`${C}asset-form.tsx`)
  assert.match(form, /canLinkPurchaseDocuments: boolean/)
  // No uploads and no links: the pre-check (documentUploads.length > 0) and the document requests have nothing to send.
  assert.match(form, /const documentUploads = canLinkPurchaseDocuments\n\s+\? listPurchaseDocumentUploads\(/)
  assert.match(form, /\n\s+: \[\]\n\s+const documentLinks = canLinkPurchaseDocuments\n\s+\? planPurchaseDocumentLinks\([^\n]+\n\s+: NO_DOCUMENT_LINKS/)
  assert.match(form, /const NO_DOCUMENT_LINKS = \{ linkIds: \[\], unlinkIds: \[\] \}/)
  assert.match(form, /canLink=\{canLinkPurchaseDocuments\}/)
  assert.match(handleSubmitBody(form), /for \(const upload of documentUploads\)/)
  assert.match(handleSubmitBody(form), /if \(documentLinks\.linkIds\.length > 0\)/)

  // The section: a quiet note in place of the picker and the upload part.
  const section = read(`${C}asset-form-documents.tsx`)
  const denied = section.slice(section.indexOf("if (!canLink) {"), section.indexOf("\n  return (", section.indexOf("if (!canLink) {")))
  assert.match(denied, /<FoldedSection title=\{t\("purchaseDocuments"\)\} disclosure=\{disclosure\}>\n\s+<Notice tone="neutral" className="md:col-span-2">\{t\("purchaseDocumentsNeedEdit"\)\}<\/Notice>\n\s+<\/FoldedSection>/)
  assert.doesNotMatch(denied, /PurchaseDocumentPicker|FileDropzone/)
  assert.ok(section.indexOf("if (!canLink) {") < section.indexOf("<PurchaseDocumentPicker"), "the note returns before the picker and the upload")
  assert.equal(messages("th").asset.purchaseDocumentsNeedEdit, "ผูกหรืออัปโหลดเอกสารจัดซื้อได้เมื่อมีสิทธิ์แก้ไขทรัพย์สิน")
  assert.equal(messages("en").asset.purchaseDocumentsNeedEdit, "Linking or uploading purchase documents needs permission to edit assets")
})
