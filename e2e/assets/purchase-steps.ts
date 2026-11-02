// The purchase-document steps of the asset form's E2E (page group 4 plan 3, spec
// docs/superpowers/specs/2026-11-01-page-group-4-register-form-design.md §9, §17): a model read as the seed admin (no
// master data is changed), a document created and linked to the test's own asset through the app's own multipart route,
// the picker's search answered for exactly the text typed, and the search read back as IT staff to count the links.
import { readFileSync } from "node:fs"
import { request, type Locator, type Page, type Response } from "@playwright/test"
import { expect } from "../support/fixtures.ts"
import { ADMIN_STATE_FILE, fromRoot } from "../support/paths.ts"
import { readRunState } from "../support/state.ts"
import { PDF_FIXTURE } from "../transactions/tx-support.ts"
import { REGISTER_WORDS } from "./register-words.ts"

export const PURCHASE_DOCUMENT_SEARCH_PATH = "/api/purchase-documents/search"

export type ExistingModel = { id: string; name: string; brandId: string; categoryId: string }
type MasterModel = { id: string; name: string; isActive: boolean; brand: { id: string } | null; category: { id: string } | null }

// One active model of the master data, with its brand and category, read as the seed admin (IT staff have no
// brand:view), as readSecondDepartment reads a department. Its name is one to three words, so the two-word query of the
// spec stays within the search's five words. The model of the category asked for comes first. E2E makes no model.
export async function readOneModel(preferredCategoryId?: string): Promise<ExistingModel> {
  const { baseURL } = readRunState()
  const admin = await request.newContext({ baseURL, storageState: fromRoot(ADMIN_STATE_FILE) })
  try {
    const response = await admin.get("/api/models")
    if (response.status() !== 200) throw new Error(`GET /api/models answered ${response.status()}: ${(await response.text()).slice(0, 300)}`)
    const usable = ((await response.json()) as MasterModel[]).filter(
      (model) => model.isActive && model.brand?.id && model.category?.id && /^\S+(?: \S+){0,2}$/.test(model.name) && model.name.length <= 60,
    )
    const chosen = usable.find((model) => model.category?.id === preferredCategoryId) ?? usable[0]
    if (!chosen?.brand || !chosen.category) throw new Error("the dev data has no active model with a brand and a category: the purchase-document search by model needs one")
    return { id: chosen.id, name: chosen.name, brandId: chosen.brand.id, categoryId: chosen.category.id }
  } finally {
    await admin.dispose()
  }
}

export type PurchaseDocumentFields = { documentType: "purchase_order" | "invoice" | "delivery_note"; documentNo: string; documentDate?: string; totalAmount?: string }
export type CreatedPurchaseDocument = { id: string; documentType: string; documentNo: string }

// A purchase document created and linked to the asset in one multipart request (POST /api/assets/<id>/purchase-documents,
// group 4 plan 3 Task 3), with the PDF fixture, as the signed-in user. The number goes to the PO or invoice number as the
// form sends it; the date and the amount are always sent ("" when not given), since the schema reads a missing key as
// missing.
export async function createPurchaseDocumentByApi(page: Page, assetId: string, fields: PurchaseDocumentFields): Promise<CreatedPurchaseDocument> {
  const response = await page.request.post(`/api/assets/${assetId}/purchase-documents`, {
    multipart: {
      documentType: fields.documentType,
      documentNo: fields.documentNo,
      ...(fields.documentType === "purchase_order" ? { poNumber: fields.documentNo } : {}),
      ...(fields.documentType === "invoice" ? { invoiceNumber: fields.documentNo } : {}),
      documentDate: fields.documentDate ?? "",
      totalAmount: fields.totalAmount ?? "",
      currency: "THB",
      file: { name: "evidence.pdf", mimeType: "application/pdf", buffer: readFileSync(PDF_FIXTURE) },
    },
  })
  expect(response.status(), `POST /api/assets/${assetId}/purchase-documents: ${(await response.text()).slice(0, 300)}`).toBe(201)
  const answer = (await response.json()) as { document: CreatedPurchaseDocument; linkedIds: string[] }
  expect(answer.linkedIds, "the new document is linked to the asset").toEqual([answer.document.id])
  return { id: answer.document.id, documentType: answer.document.documentType, documentNo: answer.document.documentNo }
}

// The picker's search (src/components/assets/purchase-document-picker.tsx): type into #<pickerId>-search and wait for
// the answer to exactly that text (300 ms after the fill; a fill that changes nothing sends no request), so no search
// is in flight when the test leaves the page. Returns the listbox.
export async function searchPurchaseDocuments(page: Page, text: string, pickerId = "asset-purchase-document"): Promise<Locator> {
  const answered = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return url.pathname === PURCHASE_DOCUMENT_SEARCH_PATH && url.searchParams.get("q") === text
  })
  await page.locator(`#${pickerId}-search`).fill(text)
  expect((await answered).status(), `${PURCHASE_DOCUMENT_SEARCH_PATH} q=${text}`).toBe(200)
  const listbox = page.locator(`#${pickerId}-listbox`)
  await expect(listbox).toBeAttached()
  return listbox
}

export type PurchaseDocumentRead = { id: string; documentType: string; documentNo: string; linkedAssetCount: number; linkedAssetNames: string[] }

// One document as the search route answers it to IT staff (GET, its number as the query): its active links counted.
export async function readPurchaseDocument(page: Page, documentNo: string): Promise<PurchaseDocumentRead> {
  const response = await page.request.get(`${PURCHASE_DOCUMENT_SEARCH_PATH}?q=${encodeURIComponent(documentNo)}`)
  expect(response.status(), `GET ${PURCHASE_DOCUMENT_SEARCH_PATH}?q=${documentNo}`).toBe(200)
  const { data } = (await response.json()) as { data: { rows: PurchaseDocumentRead[] } }
  const row = data.rows.find((candidate) => candidate.documentNo === documentNo)
  if (!row) throw new Error(`the search found no document ${documentNo}`)
  return row
}

// เอกสารจัดซื้อ's summary row (title, summary line, badge) and the <details> it folds (the form's FormDisclosure).
export function documentsSection(page: Page): { summary: Locator; section: Locator } {
  const summary = page.locator("summary").filter({ has: page.getByRole("heading", { name: REGISTER_WORDS.purchaseDocuments, exact: true }) })
  return { summary, section: page.locator("details").filter({ has: summary }) }
}

// The form's two POSTs to an asset's document route after the save (group 4 plan 3 Task 5): a new document created and
// linked as multipart, and the chosen documents linked as JSON.
export const ASSET_DOCUMENTS_PATH = /^\/api\/assets\/[^/]+\/purchase-documents$/
export function isAssetDocumentPost(response: Response, body: "multipart" | "json"): boolean {
  if (response.request().method() !== "POST" || !ASSET_DOCUMENTS_PATH.test(new URL(response.url()).pathname)) return false
  const type = response.request().headers()["content-type"] ?? ""
  return body === "json" ? type.startsWith("application/json") : type.startsWith("multipart/form-data")
}
