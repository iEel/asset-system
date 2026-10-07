import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const helpComponentSource = () => readFileSync("src/components/assets/asset-state-help-popover.tsx", "utf8")
const assetFormSource = () => readFileSync("src/components/assets/asset-form.tsx", "utf8")
const assetDetailSource = () => readFileSync("src/app/[locale]/(dashboard)/assets/[id]/page.tsx", "utf8")
const assetRegisterTableSource = () => readFileSync("src/components/assets/asset-register-table.tsx", "utf8")
const assetRegisterPageSource = () => readFileSync("src/app/[locale]/(dashboard)/assets/page.tsx", "utf8")

test("asset status and condition help uses a Radix popover that opens on mouse hover and stays open on click or tap", () => {
  const source = helpComponentSource()

  assert.match(source, /"use client"/)
  assert.match(source, /CircleHelp/)
  assert.match(source, /<Popover open=\{open\} onOpenChange=/)
  assert.match(source, /<PopoverTrigger asChild>/)
  assert.match(source, /pointerType === "mouse"/)
  assert.match(source, /onClick=\{\(event\) => \{\s*event\.preventDefault\(\)/)
  assert.match(source, /pinnedRef/)
  assert.doesNotMatch(source, /onFocus=/)
  assert.match(source, /onOpenAutoFocus=\{\(event\) => event\.preventDefault\(\)\}/)
  assert.match(source, /size = "default"/)
  assert.match(source, /isCompact/)
  assert.doesNotMatch(source, /getBoundingClientRect|addEventListener|style=\{\{ top/)
})

test("asset form, detail, and register expose status and condition help", () => {
  assert.match(assetFormSource(), /AssetStateHelpPopover/)
  assert.match(assetFormSource(), /statusHelpTitle/)
  assert.match(assetFormSource(), /conditionHelpTitle/)

  assert.match(assetDetailSource(), /AssetStateHelpPopover/)
  assert.match(assetDetailSource(), /assetStatusHelp/)
  assert.match(assetDetailSource(), /assetConditionHelp/)

  assert.match(assetRegisterTableSource(), /AssetStateHelpPopover/)
  assert.match(assetRegisterPageSource(), /statusHelpTitle: t\("statusHelpTitle"\)/)
  assert.match(assetRegisterPageSource(), /conditionHelpTitle: t\("conditionHelpTitle"\)/)
})

test("asset register keeps status and condition filters together with their help", () => {
  const source = readFileSync("src/components/assets/asset-register-filter-sheet.tsx", "utf8")
  const statusIndex = source.indexOf('label={t("status")}')
  const conditionIndex = source.indexOf('label={t("condition")}')

  assert.ok(statusIndex > -1, "status select is missing")
  assert.ok(conditionIndex > statusIndex, "condition must follow status")
  assert.match(source, /help=\{statusHelp\}/)
  assert.match(source, /help=\{conditionHelp\}/)
  assert.match(source, /<AssetStateHelpPopover \{\.\.\.help\} size="compact" \/>/)
})

test("asset status and condition help messages are localized", () => {
  const keys = [
    "statusHelpTitle",
    "statusHelpDescription",
    "statusHelpReady",
    "statusHelpPendingRepair",
    "statusHelpUnderMaintenance",
    "statusHelpPendingDisposal",
    "statusHelpLostMissing",
    "statusHelpUnderInspection",
    "conditionHelpTitle",
    "conditionHelpDescription",
    "conditionHelpGood",
    "conditionHelpDamaged",
    "conditionHelpNeedsReview",
    "conditionHelpMissing",
    "assetStateFilterGroup",
  ]

  for (const file of ["messages/th.json", "messages/en.json"]) {
    const messages = JSON.parse(readFileSync(file, "utf8")).asset
    const missing = keys.filter((key) => typeof messages[key] !== "string")
    assert.deepEqual(missing, [], file)
  }
})
