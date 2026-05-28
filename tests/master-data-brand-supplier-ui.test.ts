import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("brand model page exposes create model action in the top header", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/master-data/brands/page.tsx", "utf8")

  assert.match(source, /<MasterDataHeader[\s\S]*actions=\{[\s\S]*master-data\/brands\/models\/new/)
  assert.match(source, /actions=\{[\s\S]*t\("createModel"\)[\s\S]*\}/)
})

test("supplier code labels guide Thai vendors toward tax id without removing legacy code support", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.equal(th.supplier.code, "เลขประจำตัวผู้เสียภาษี / รหัสผู้ขาย")
  assert.equal(en.supplier.code, "Tax ID / Supplier Code")
  assert.match(th.supplier.searchPlaceholder, /เลขประจำตัวผู้เสียภาษี/)
  assert.match(en.supplier.searchPlaceholder, /tax ID/i)
})
