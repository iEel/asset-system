import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const helpComponentSource = () => readFileSync("src/components/assets/asset-state-help-popover.tsx", "utf8")
const assetFormSource = () => readFileSync("src/components/assets/asset-form.tsx", "utf8")
const assetDetailSource = () => readFileSync("src/app/[locale]/(dashboard)/assets/[id]/page.tsx", "utf8")
const assetRegisterTableSource = () => readFileSync("src/components/assets/asset-register-table.tsx", "utf8")
const assetRegisterPageSource = () => readFileSync("src/app/[locale]/(dashboard)/assets/page.tsx", "utf8")

test("asset status and condition help uses an accessible popover component", () => {
  const source = helpComponentSource()

  assert.match(source, /"use client"/)
  assert.match(source, /CircleHelp/)
  assert.match(source, /aria-expanded=\{open\}/)
  assert.match(source, /onMouseEnter/)
  assert.match(source, /onFocus/)
  assert.match(source, /onClick/)
  assert.match(source, /role="status"/)
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
  ]

  for (const file of ["messages/th.json", "messages/en.json"]) {
    const messages = JSON.parse(readFileSync(file, "utf8")).asset
    const missing = keys.filter((key) => typeof messages[key] !== "string")
    assert.deepEqual(missing, [], file)
  }
})
