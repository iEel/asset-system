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
      '<table className="min-w-[760px] w-full text-sm">',
      '<th className="w-56 px-3 py-2">{t("batchAssetTag")}</th>',
      '<th className="w-56 px-3 py-2">{t("batchSerialNumber")}</th>',
      'showRowCustodian ? <th className="w-64 px-3 py-2">{t("batchCustodian")}</th> : null',
      'showRowDepartment ? <th className="w-64 px-3 py-2">{t("batchDepartment")}</th> : null',
      'showRowCurrentLocation ? <th className="w-72 px-3 py-2">{t("batchCurrentLocation")}</th> : null',
      'showRowHomeLocation ? <th className="w-72 px-3 py-2">{t("batchHomeLocation")}</th> : null',
    ],
    "desktop batch row table"
  )

  assertOrdered(
    source,
    [
      '<table className="w-full min-w-[1100px] text-sm">',
      '<th className="px-3 py-2">{t("batchAssetTag")}</th>',
      '<th className="px-3 py-2">{t("batchSerialNumber")}</th>',
      '<th className="px-3 py-2">{t("batchCustodian")}</th>',
      '<th className="px-3 py-2">{t("batchDepartment")}</th>',
      '<th className="px-3 py-2">{t("batchCurrentLocation")}</th>',
      '<th className="px-3 py-2">{t("batchHomeLocation")}</th>',
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
