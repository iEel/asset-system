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
