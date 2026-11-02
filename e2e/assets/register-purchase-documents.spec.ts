// Page group 4 plan 3 (spec docs/superpowers/specs/2026-11-01-page-group-4-register-form-design.md §8, §9, §17; plan
// rulings P3-R1..R9): purchase documents on the asset form, as IT staff use them.
// - PD1, in all four projects: asset A has an existing model (read by the seed admin, never made) and document D1, made and
//   linked through the asset's document route. On the new asset form the search "<model name> <A's tag>" finds only D1:
//   the model word matches through the asset linked to it and the tag word keeps the answer to this run, so without the
//   model match the two words would find nothing. D1 is chosen (chip, badge เลือกแล้ว 1 ใบ); a new upload with D1's type
//   and number is refused under its number by the pre-check, nothing is posted and the file stays; as ใบกำกับ <B>-INV it
//   saves with the asset, created and linked in one request, then D1 linked in another. The search reads D1 linked to 2;
//   B's edit page holds เอกสารจัดซื้อ folded with its summary and ผูกไว้ 2 ใบ, and opened shows both chips;
// - PD2, desktop only (one batch upload a run is enough; the phone's batch form is bulk-move.spec's): the batch form's
//   one search and one upload for 2 rows: D1 chosen and a new ใบส่งของ, 2 created, D1 linked to 4, the new one to 2.
// Not driven here (the UAT list, docs/07_UAT_CHECKLIST.md): a chip's × on the edit page (the unlink is a DELETE at the
// save, which the suite never sends), the failure landing on the edit page, and a create-only user's note. Every asset and
// document is the test's own, through the app's own APIs; no master data is changed.
import { asUser, expect, test } from "../support/fixtures.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { fillTemplate, templatePattern } from "../shell/shell-words.ts"
import { bangkokDate, txAssetName, txAssetTag } from "../transactions/tx-plan.ts"
import {
  createTxAsset,
  expectFieldError,
  openAssetFormSection,
  PDF_FIXTURE,
  readAssetMasters,
  record,
  visit,
} from "../transactions/tx-support.ts"
import {
  createPurchaseDocumentByApi,
  documentsSection,
  isAssetDocumentPost,
  readOneModel,
  readPurchaseDocument,
  searchPurchaseDocuments,
  type CreatedPurchaseDocument,
} from "./purchase-steps.ts"
import { REGISTER_WORDS } from "./register-words.ts"

asUser("itStaff")

const DESKTOP_ONLY = "one batch upload a run is enough; the phone's batch form is bulk-move.spec's (group 4 spec §8)"
const CHECK_PATH = "/api/purchase-documents/check-duplicates"

// PD1's document and its asset, by project, for PD2.
const linked = new Map<string, { query: string; document: CreatedPurchaseDocument }>()

test.describe("purchase documents on the asset form", () => {
  test.describe.configure({ mode: "serial" })

  test("PD1: a document found by a linked asset's model is chosen, a new one with a stored number is refused under its field first, then uploaded with the new asset; the edit page holds both, folded (group 4 spec §9; P3-R1, P3-R3, P3-R4, P3-R5)", async ({ page, measure }, testInfo) => {
    const { runId } = readRunState()
    const data = readRunData()
    const masters = await readAssetMasters(page)
    const model = await readOneModel(masters.categoryId)
    const assetA = await createTxAsset(page, masters, testInfo.project.name, "PDA", "โน้ตบุ๊กมีเอกสารจัดซื้อ", {
      categoryId: model.categoryId,
      brandId: model.brandId,
      modelId: model.id,
    })
    const d1 = await createPurchaseDocumentByApi(page, assetA.id, { documentType: "purchase_order", documentNo: `${assetA.assetTag}-PO`, documentDate: bangkokDate(), totalAmount: "25000" })
    const tagB = txAssetTag(runId, testInfo.project.name, "PDB")
    const nameB = txAssetName(runId, testInfo.project.name, "โน้ตบุ๊กเอกสารจัดซื้อใหม่")
    const invoiceNo = `${tagB}-INV`
    const query = `${model.name} ${assetA.assetTag}`

    // Asset B's required fields; เอกสารจัดซื้อ starts open on create (spec §9.1).
    await visit(measure, "/th/assets/new", "new asset form, purchase documents", testInfo)
    await page.locator("#asset-tag").fill(tagB)
    await page.locator("#asset-category").selectOption(masters.categoryId)
    await page.locator("#asset-company").selectOption(data.companyId)
    await page.locator("#asset-branch").selectOption(data.branchId)
    await page.locator("#asset-department").selectOption(data.departmentId)
    await page.locator("#asset-current-location").selectOption(data.locationId)
    await page.locator("#asset-status").selectOption(masters.readyStatusId)
    await page.locator("#asset-condition").selectOption(masters.goodConditionId)
    await page.locator("#asset-name").fill(nameB)
    const { summary, section } = documentsSection(page)
    await expect(section).toHaveAttribute("open", "")

    // The search: two words, the model's name and A's tag, find D1 alone (§9.2), with the asset it is linked to and the
    // footer line.
    const listbox = await searchPurchaseDocuments(page, query)
    const options = listbox.locator("[data-purchase-document-option]")
    await expect(options).toHaveCount(1)
    const result = listbox.locator(`[data-purchase-document-option="${d1.id}"]`)
    await expect(result).toContainText(`${REGISTER_WORDS.typePurchaseOrder} · ${d1.documentNo}`)
    await expect(result).toContainText(fillTemplate(REGISTER_WORDS.purchaseDocumentLinkedNames, { count: 1, names: assetA.name }))
    await expect(page.locator("#asset-purchase-document [data-purchase-document-footer]")).toHaveText(templatePattern(REGISTER_WORDS.purchaseDocumentSearchFooter, { count: "1" }))
    await record(measure, "new asset form, a document found by a linked asset's model", testInfo)

    // Chosen: a chip, the row marked, the badge เลือกแล้ว 1 ใบ.
    await result.click()
    const chip = page.locator(`#asset-purchase-document [data-purchase-document-chip="${d1.id}"]`)
    await expect(chip).toContainText(d1.documentNo)
    await expect(chip).toContainText(fillTemplate(REGISTER_WORDS.purchaseDocumentLinkedCount, { count: 1 }))
    await expect(result).toContainText(REGISTER_WORDS.purchaseDocumentChosen)
    await expect(summary).toContainText(fillTemplate(REGISTER_WORDS.documentsSelected, { count: 1 }))

    // A wrong entry first: a new upload with D1's type and number. The pre-check refuses it under the number before the
    // asset is saved (P3-R3): nothing is posted, the number takes focus, and the file is still there (§4).
    await page.locator("#asset-purchase-document-type").selectOption("purchase_order")
    await page.locator("#asset-purchase-document-no").fill(d1.documentNo)
    await page.locator("#asset-purchase-document-file").setInputFiles(PDF_FIXTURE)
    await expect(page.getByText("evidence.pdf")).toBeVisible()
    const save = page.locator("[data-slot=sticky-form-footer]").getByRole("button", { name: "บันทึก", exact: true })
    // The tag's duplicate check runs while it is typed; the save waits for it.
    await expect(page.locator("#asset-save-reason")).toHaveCount(0)
    let posted = 0
    page.on("request", (request) => {
      if (request.method() === "POST" && new URL(request.url()).pathname === "/api/assets") posted += 1
    })
    const checked = page.waitForResponse((response) => new URL(response.url()).pathname === CHECK_PATH && response.request().method() === "POST")
    await save.click()
    expect((await checked).status(), `POST ${CHECK_PATH}`).toBe(200)
    await expectFieldError(page, "asset-purchase-document-no", REGISTER_WORDS.purchaseDocumentExists)
    await expect(page.locator("#asset-purchase-document-no")).toBeFocused()
    expect(posted, "the refused document posts nothing").toBe(0)
    await expect(page.getByText("evidence.pdf")).toBeVisible()
    await expect(chip).toBeVisible()
    await record(measure, "new asset form, a stored document number refused under its field", testInfo)

    // Fixed: ใบกำกับ <B>-INV. The save posts the asset, then the new document created and linked in one multipart
    // request, then D1 linked in one JSON request (§9.3).
    await page.locator("#asset-purchase-document-type").selectOption("invoice")
    await page.locator("#asset-purchase-document-no").fill(invoiceNo)
    await expect(page.locator("#asset-purchase-document-no-error")).toHaveCount(0)
    const created = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/assets" && response.request().method() === "POST")
    const uploaded = page.waitForResponse((response) => isAssetDocumentPost(response, "multipart"))
    const linkedD1 = page.waitForResponse((response) => isAssetDocumentPost(response, "json"))
    await measure.timed("asset save with a chosen and a new purchase document", async () => {
      await save.click()
      await Promise.all([created, uploaded, linkedD1])
    })
    expect((await created).status(), "POST /api/assets").toBe(201)
    const assetB = (await (await created).json()) as { id: string; assetTag: string }
    expect(assetB.assetTag).toBe(tagB)
    expect(new URL((await uploaded).url()).pathname).toBe(`/api/assets/${assetB.id}/purchase-documents`)
    expect((await uploaded).status(), "the new document is created and linked in one request").toBe(201)
    expect((await linkedD1).status(), "the chosen document is linked").toBe(200)
    expect(((await (await linkedD1).json()) as { linkedIds: string[] }).linkedIds).toEqual([d1.id])
    await expect(page.locator("[data-sonner-toast]").filter({ hasText: REGISTER_WORDS.savedSuccess })).toBeVisible()
    await page.waitForURL("**/th/assets")
    // The register loads its list and thumbnails; leaving before they arrive would cancel them.
    await page.waitForLoadState("networkidle")

    // Read back with the search: D1 linked to A and B, the new invoice to B.
    const d1After = await readPurchaseDocument(page, d1.documentNo)
    expect([d1After.id, d1After.linkedAssetCount]).toEqual([d1.id, 2])
    expect([...d1After.linkedAssetNames].sort()).toEqual([assetA.name, nameB].sort())
    const invoice = await readPurchaseDocument(page, invoiceNo)
    expect([invoice.documentType, invoice.linkedAssetCount, invoice.linkedAssetNames]).toEqual(["invoice", 1, [nameB]])

    // B's edit page: เอกสารจัดซื้อ starts folded (§9.1), its summary names both documents and ผูกไว้ 2 ใบ; opened, both
    // chips show with their × (never clicked here: the unlink is sent at บันทึกการแก้ไข, P3-R5, and the suite sends no
    // such request).
    await visit(measure, `/th/assets/${assetB.id}/edit`, "asset edit, เอกสารจัดซื้อ folded", testInfo)
    const edit = documentsSection(page)
    await expect(edit.section).not.toHaveAttribute("open", "")
    await expect(edit.summary).toContainText(`${REGISTER_WORDS.typePurchaseOrder} ${d1.documentNo}`)
    await expect(edit.summary).toContainText(`${REGISTER_WORDS.typeInvoice} ${invoiceNo}`)
    await expect(edit.summary).toContainText(fillTemplate(REGISTER_WORDS.documentsLinked, { count: 2 }))
    await openAssetFormSection(page, REGISTER_WORDS.purchaseDocuments)
    const chips = page.locator("#asset-purchase-document [data-purchase-document-chip]")
    await expect(chips).toHaveCount(2)
    for (const documentNo of [d1.documentNo, invoiceNo]) {
      await expect(chips.filter({ hasText: documentNo })).toHaveCount(1)
      await expect(page.getByRole("button", { name: fillTemplate(REGISTER_WORDS.purchaseDocumentRemoveNamed, { number: documentNo }), exact: true })).toBeVisible()
    }
    await record(measure, "asset edit, เอกสารจัดซื้อ open with both chips", testInfo)

    linked.set(testInfo.project.name, { query, document: d1 })
  })

  test("PD2: the batch form's one search and one upload link D1 and a new ใบส่งของ to every asset of the batch (group 4 spec §8; P3-R8)", async ({ page, measure, e2eDevice }, testInfo) => {
    test.skip(e2eDevice === "phone", DESKTOP_ONLY)
    const { runId } = readRunState()
    const data = readRunData()
    const before = linked.get(testInfo.project.name)
    expect(before, "PD1 made this project's document").toBeDefined()
    if (!before) return
    const masters = await readAssetMasters(page)
    const tags = [1, 2].map((index) => txAssetTag(runId, testInfo.project.name, `PDC${index}`))
    const name = txAssetName(runId, testInfo.project.name, "โน้ตบุ๊กชุดเอกสารจัดซื้อ")
    const deliveryNo = `${tags[0]}-DN`

    await visit(measure, "/th/assets/new", "new asset form, batch with purchase documents", testInfo)
    await page.getByRole("group", { name: "วิธีเพิ่มทรัพย์สิน" }).getByRole("button", { name: REGISTER_WORDS.createModeBatch }).click()
    await page.locator("#asset-batch-name").fill(name)
    await page.locator("#asset-batch-category").selectOption(masters.categoryId)
    await page.locator("#asset-batch-company").selectOption(data.companyId)
    await page.locator("#asset-batch-branch").selectOption(data.branchId)
    await page.locator("#asset-batch-department").selectOption(data.departmentId)
    await page.locator("#asset-batch-current-location").selectOption(data.locationId)
    await page.locator("#asset-batch-status").selectOption(masters.readyStatusId)
    await page.locator("#asset-batch-condition").selectOption(masters.goodConditionId)
    await expect(page.locator("#asset-batch-row-count")).toContainText("รายการตอนนี้ 2 รายการ")
    for (const [index, tag] of tags.entries()) await page.locator(`#asset-batch-row-${index}-tag`).fill(tag)

    // One search for the whole batch: the same two words find D1, now linked to 2.
    const listbox = await searchPurchaseDocuments(page, before.query, "asset-batch-purchase-document")
    await expect(listbox.locator("[data-purchase-document-option]")).toHaveCount(1)
    const result = listbox.locator(`[data-purchase-document-option="${before.document.id}"]`)
    await expect(result).toContainText(templatePattern(REGISTER_WORDS.purchaseDocumentLinkedNames, { count: "2" }))
    await result.click()
    await expect(page.locator(`#asset-batch-purchase-document [data-purchase-document-chip="${before.document.id}"]`)).toContainText(before.document.documentNo)

    // One upload for the whole batch: a ใบส่งของ.
    await page.locator("#asset-batch-purchase-document-file").setInputFiles(PDF_FIXTURE)
    await page.locator("#asset-batch-purchase-document-type").selectOption("delivery_note")
    await page.locator("#asset-batch-purchase-document-no").fill(deliveryNo)
    await expect(page.getByText("evidence.pdf")).toBeVisible()
    await record(measure, "batch form, a chosen document and one upload", testInfo)

    await page.getByRole("button", { name: REGISTER_WORDS.batchSubmit }).click()
    await expect(page.getByText(REGISTER_WORDS.batchReviewTitle).first()).toBeVisible()
    const checked = page.waitForResponse((response) => new URL(response.url()).pathname === CHECK_PATH && response.request().method() === "POST")
    const created = page.waitForResponse((response) => response.url().endsWith("/api/assets/batch") && response.request().method() === "POST")
    await measure.timed("batch save with purchase documents", async () => {
      await page.getByRole("button", { name: REGISTER_WORDS.batchReviewConfirm }).click()
      await Promise.all([checked, created])
    })
    expect((await checked).status(), `POST ${CHECK_PATH}`).toBe(200)
    expect((await created).status(), "POST /api/assets/batch").toBe(201)
    const batch = (await (await created).json()) as { created: number; assetIds: string[]; assets: { id: string; assetTag: string }[] }
    expect(batch.created).toBe(2)
    expect(batch.assets.map((asset) => asset.assetTag).sort()).toEqual([...tags].sort())
    await expect(page.getByText(REGISTER_WORDS.batchCreatedTitle)).toBeVisible()
    await record(measure, "batch created with purchase documents", testInfo)

    // Read back: D1 linked to A, B and the two new assets; the new ใบส่งของ to the two.
    expect((await readPurchaseDocument(page, before.document.documentNo)).linkedAssetCount).toBe(4)
    const delivery = await readPurchaseDocument(page, deliveryNo)
    expect([delivery.documentType, delivery.linkedAssetCount]).toEqual(["delivery_note", 2])
  })
})
