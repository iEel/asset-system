import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const rowActions = () => read("src/components/assets/asset-register-row-actions.tsx")
const table = () => read("src/components/assets/asset-register-table.tsx")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).asset

test("row actions show one next-step button and keep every action in the ⋯ menu", () => {
  const source = rowActions()

  assert.match(source, /const nextAction = getRowNextAction\(transactions\)/)
  assert.match(source, /next \? \[next, \.\.\.transactions\.filter\(\(transaction\) => transaction !== next\)\] : transactions/)
  assert.match(source, /<DropdownMenuTrigger asChild>/)
  assert.match(source, /<DropdownMenuContent data-no-row-click/)
  assert.match(source, /<SheetTrigger asChild>/)
  assert.match(source, /<SheetContent\s+side="bottom"/)
  assert.match(source, /useDeleteAction\(`\/api\/assets\/\$\{assetId\}`, \{ returnFocusRef: triggerRef \}\)/)
  assert.match(source, /variant="destructive"/)
  assert.match(source, /permissions\.canEdit \?/)
  assert.match(source, /permissions\.canCreate \?/)
  assert.match(source, /permissions\.canDelete \?/)
  assert.match(source, /reasonLabelKeys\[transaction\.reason\]/)
  assert.match(source, /size-11/)
  assert.doesNotMatch(source, /createPortal|getBoundingClientRect|addEventListener/)
})

test("the desktop table uses the row actions instead of four icon buttons", () => {
  const source = table()

  assert.match(source, /<AssetRegisterRowActions\s+variant="desktop"/)
  assert.match(source, /permissions=\{permissions\}/)
  assert.doesNotMatch(source, /<AssetRegisterTransactionMenu actions=\{asset\.transactions\} labels=\{transactionLabels\} \/>/)
  assert.doesNotMatch(source, /title=\{labels\.detail\}/)
})

test("row action copy exists in Thai and English", () => {
  assert.equal(messages("th").rowActionCheckout, "ส่งมอบ")
  assert.equal(messages("th").rowActionCheckin, "รับคืน")
  assert.equal(messages("th").rowActionTransfer, "โอนย้าย")
  for (const locale of ["th", "en"] as const) {
    assert.equal(typeof messages(locale).rowActionsMenu, "string", locale)
  }
})
