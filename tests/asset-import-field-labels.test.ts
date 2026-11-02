import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { assetImportColumns } from "../src/lib/asset-excel.ts"

const th = JSON.parse(readFileSync("messages/th.json", "utf8")).asset.importField as Record<string, string> | undefined
const en = JSON.parse(readFileSync("messages/en.json", "utf8")).asset.importField as Record<string, string> | undefined
const mappingSource = readFileSync("src/lib/asset-import-mapping.ts", "utf8")

test("every import column and alias key has a th (Thai) and en field label", () => {
  assert.ok(th && en, "asset.importField missing")
  const aliasBlock = mappingSource.match(/const headerAliases[^{]*\{([\s\S]*?)\n\}/)
  assert.ok(aliasBlock)
  const aliasKeys = [...aliasBlock[1].matchAll(/^\s*(\w+):/gm)].map((match) => match[1])
  const keys = new Set([...assetImportColumns.map((column) => column.key), ...aliasKeys])
  for (const key of keys) {
    assert.match(th[key] ?? "", /[฀-๿]|Serial/, `th asset.importField.${key}`)
    assert.ok(en[key], `en asset.importField.${key}`)
  }
  assert.equal(th.currentLocationCode, "รหัสที่ตั้งปัจจุบัน")
  assert.equal(th.homeLocationCode, "รหัสที่ตั้งประจำ")
  // Group 4 plan 5 (P5-R5): every column has aliases, and each lists its Thai field label.
  assert.deepEqual([...new Set(aliasKeys)].sort(), assetImportColumns.map((column) => column.key).sort())
  for (const column of assetImportColumns) {
    assert.ok(mappingSource.toLowerCase().includes(`"${th[column.key].toLowerCase()}"`), `alias ${column.key}: ${th[column.key]}`)
  }
})

test("the import preview panel shows message labels by column key", () => {
  const panel = readFileSync("src/components/assets/asset-import-preview-panel.tsx", "utf8")
  // Group 4 plan 5 Task 4: the panel reads asset.importField itself; issue lines and missing columns name fields by key.
  assert.match(panel, /const fields = t\.raw\("importField"\) as Record<string, string>/)
  assert.match(panel, /keys\.map\(\(key\) => fields\[key\] \?\? key\)/)
  assert.match(panel, /buildImportIssueParts\(issue, t, \{ fields, locale \}\)/)
  assert.doesNotMatch(panel, /\{column\.label\}/)
  assert.doesNotMatch(readFileSync("src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx", "utf8"), /fields: t\.raw\("importField"\)/)
  assert.doesNotMatch(readFileSync("src/app/[locale]/(dashboard)/assets/page.tsx", "utf8"), /importField/)
})
