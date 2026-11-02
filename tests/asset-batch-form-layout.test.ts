import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("batch asset rows show legacy asset tag before serial number in edit and review tables", () => {
  const source = readFileSync("src/components/assets/asset-batch-form.tsx", "utf8")

  assertOrdered(
    source,
    [
      '{t("batchOptionalColumns")}',
      'batchOptionalColumnKeys',
      '<BatchOptionalColumnToggle',
    ],
    "batch optional column controls"
  )

  assertOrdered(
    source,
    [
      '<div className="grid gap-3 md:hidden">',
      'Field label={t("batchAssetTag")}',
      'Field label={t("batchSerialNumber")}',
      'showRowCustodian ?',
      'showRowDepartment ?',
      'showRowCurrentLocation ?',
      'showRowHomeLocation ?',
      'showRowRemark ?',
    ],
    "mobile batch row card"
  )

  assertOrdered(
    source,
    [
      // Plan 2D-3: both tables are the shared DataTable.
      '<DataTable framed={false} minWidth={760} caption={t("batchRows")} className="hidden md:col-span-2 md:block">',
      '<DataTableHead className="w-56">{t("batchAssetTag")}</DataTableHead>',
      '<DataTableHead className="w-56">{t("batchSerialNumber")}</DataTableHead>',
      'showRowCustodian ? <DataTableHead className="w-64">{t("batchCustodian")}</DataTableHead> : null',
      'showRowDepartment ? <DataTableHead className="w-64">{t("batchDepartment")}</DataTableHead> : null',
      'showRowCurrentLocation ? <DataTableHead className="w-72">{t("batchCurrentLocation")}</DataTableHead> : null',
      'showRowHomeLocation ? <DataTableHead className="w-72">{t("batchHomeLocation")}</DataTableHead> : null',
    ],
    "desktop batch row table"
  )

  assertOrdered(
    source,
    [
      '<DataTable framed={false} minWidth={1100} caption={t("batchReviewTitle")} className="mt-4 max-h-80 overflow-y-auto">',
      '<DataTableHead>{t("batchAssetTag")}</DataTableHead>',
      '<DataTableHead>{t("batchSerialNumber")}</DataTableHead>',
      '<DataTableHead>{t("batchCustodian")}</DataTableHead>',
      '<DataTableHead>{t("batchDepartment")}</DataTableHead>',
      '<DataTableHead>{t("batchCurrentLocation")}</DataTableHead>',
      '<DataTableHead>{t("batchHomeLocation")}</DataTableHead>',
    ],
    "batch review table"
  )
})

function assertOrdered(source: string, snippets: string[], context: string) {
  let cursor = -1
  for (const snippet of snippets) {
    const nextIndex = source.indexOf(snippet, cursor + 1)
    assert.notEqual(nextIndex, -1, `Missing ${snippet} in ${context}`)
    assert.ok(nextIndex > cursor, `${snippet} should appear after the previous snippet in ${context}`)
    cursor = nextIndex
  }
}

// Group 4 plan 3 Task 6 (P3-R8, spec §8): one purchase-document search and one upload for the whole batch.
test("batch form: the purchase-document picker and one upload draft, gated on asset:edit, multipart only with a draft", () => {
  const source = readFileSync("src/components/assets/asset-batch-form.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /<PurchaseDocumentPicker\n\s+id="asset-batch-purchase-document"/)
  assert.equal(source.match(/<FileDropzone\b/g)?.length, 1, "one upload")
  // The 300-document checkbox list and its prop went (getAssetFormOptions no longer reads them).
  assert.doesNotMatch(source, /addPurchaseDocument|<ChoiceCard\b|linkedAssets|\bpurchaseDocuments,|purchaseDocuments\.(?:length|map)|selectedPurchaseDocumentIds/)
  assert.match(source, /canLinkPurchaseDocuments \?/)
  assert.match(source, /\{t\("purchaseDocumentsNeedEdit"\)\}/)
  for (const id of ["type", "no", "date", "amount", "supplier", "file"]) {
    assert.equal(source.match(new RegExp(`"asset-batch-purchase-document-${id}"`, "g"))?.length, 1, id)
  }
  // The draft's pre-check runs before the batch POST; the body is multipart only when a draft exists.
  const submit = source.slice(source.indexOf("async function handleSubmit"))
  assert.ok(submit.indexOf("passesBatchDocumentPreCheck(") > 0 && submit.indexOf("passesBatchDocumentPreCheck(") < submit.indexOf('fetch("/api/assets/batch"'))
  assert.match(source, /buildAssetBatchRequestBody\(\{ common, rows, purchaseDocumentIds: chosenDocuments\.map\(\(document\) => document\.id\) \}, documentUpload\)/)
})
