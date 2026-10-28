import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { assetOperationRowLabel, chosenAssetReasonKey, transferAssetToClear } from "../src/lib/asset-operation-form-rules.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const P = "src/app/[locale]/(dashboard)/asset-management/"
const C = "src/components/asset-operations/"
const row = (overrides: Record<string, unknown> = {}) => ({ id: "a1", assetTag: "NB-0228", name: "Notebook Dell", eligible: true, reasonKey: null as string | null, ...overrides })

test("a chosen row reads as today's label, and its reason only when the transaction cannot take it (server search Task 5)", () => {
  assert.equal(assetOperationRowLabel(row()), "NB-0228 - Notebook Dell")
  assert.equal(chosenAssetReasonKey(null), null)
  assert.equal(chosenAssetReasonKey(row()), null)
  assert.equal(chosenAssetReasonKey(row({ eligible: false, reasonKey: "asset.transactionReasonStatusNotReady" })), "asset.transactionReasonStatusNotReady")
})

test("a custodian chosen after the asset clears it only when the answer says it no longer fits, never on a late answer (spec 6.3)", () => {
  const chosen = { asset: row(), toCustodianId: "emp-1" }
  const blocked = row({ eligible: false, reasonKey: "asset.transactionReasonStatusNotTransferable" })
  assert.deepEqual(transferAssetToClear(chosen, blocked), { assetTag: "NB-0228", reasonKey: "asset.transactionReasonStatusNotTransferable" })
  assert.equal(transferAssetToClear(chosen, row()), null, "still fits")
  assert.equal(transferAssetToClear(chosen, null), null, "the search failed: the save route decides")
  assert.equal(transferAssetToClear(chosen, { ...blocked, id: "a2" }), null, "another asset chosen since")
  assert.equal(transferAssetToClear({ ...chosen, toCustodianId: "" }, blocked), null, "custodian cleared since")
  assert.equal(transferAssetToClear({ asset: null, toCustodianId: "emp-1" }, blocked), null, "nothing chosen")
})

test("the four pages load the master lists; ส่งมอบ and โอนย้าย start from the by-id answer, asked after the permission (spec §3, 6.4)", () => {
  for (const page of ["checkout", "transfer"]) {
    const source = read(`${P}${page}/page.tsx`)
    const permission = source.indexOf('await requirePagePermission(locale, "asset", "edit")')
    assert.ok(permission >= 0 && permission < source.indexOf(`getAssetOperationPreselect("${page}", filters.assetId)`), page)
    assert.ok(source.includes("getAssetOperationMasterOptions()") && source.includes("initialAsset={initialAsset}"), page)
    assert.doesNotMatch(source, /getAssetOperationAssetLists|initialAssetId|assets=/, page)
  }
  for (const page of ["checkout", "checkin", "transfer", "bulk-move"]) assert.doesNotMatch(read(`${P}${page}/page.tsx`), /getAssetOperationOptions\(/, page)
})

test("ส่งมอบ: the asset and the ทรัพย์สินอื่น destination are the shared picker; an asset that arrived blocked reads its reason under the field (spec 6.3, 6.4)", () => {
  const source = read(`${C}checkout-form.tsx`)
  assert.ok(source.includes('import { AssetOperationPicker } from "@/components/ui/asset-operation-picker"'))
  assert.match(source, /<AssetOperationPicker\n\s+id="checkout-asset"\n\s+label=\{t\("asset"\)\}\n\s+mode="checkout"\n\s+value=\{values\.asset\}\n\s+required\n\s+error=\{errorText\("assetId"\)\}\n\s+onChange=\{setAsset\}/)
  assert.match(source, /\{values\.checkoutType === "asset" \? \(\n\s+<AssetOperationPicker\n\s+id="checkout-destination"\n\s+label=\{t\("checkoutTo"\)\}\n\s+mode="checkoutParent"\n\s+context=\{\{ handedOverAssetId: values\.asset\?\.id \}\}/)
  assert.ok(source.includes('if (key === "assetId" && assetReasonKey) return tAll(assetReasonKey)'))
  assert.ok(source.includes("parentAsset: current.parentAsset?.id === asset?.id ? null : current.parentAsset"))
  assert.match(source, /\{initialAsset\?\.eligible && values\.asset\?\.id === initialAsset\.id \? \(\n\s+<div className="md:col-span-2">\n\s+<FormContextBanner label=\{t\("asset"\)\} value=\{assetOperationRowLabel\(initialAsset\)\} \/>/)
  assert.ok(source.includes("const response = await fetch(`/api/assets/${values.asset?.id}/checkout`, {"))
  assert.doesNotMatch(source, /options=\{assets\}|assets\.(?:filter|find)\(|initialAssetId|t\("selectAsset"\)/)
})

test("โอนย้าย: the asset is the shared picker under the custodian's rule; a custodian chosen after it asks again and clears it with the reason (spec 6.3, 6.4)", () => {
  const source = read(`${C}transfer-form.tsx`)
  assert.match(source, /<AssetOperationPicker\n\s+id="transfer-asset"\n\s+label=\{t\("asset"\)\}\n\s+mode="transfer"\n\s+context=\{\{ assignCustodian: Boolean\(values\.toCustodianId\) \}\}\n\s+value=\{values\.asset\}\n\s+required\n\s+error=\{assetError\}\n\s+onChange=\{setAsset\}/)
  assert.ok(source.includes('if (field === "toCustodianId" && value && values.asset) void recheckAssetForCustodian(values.asset.id)'))
  assert.ok(source.includes('buildAssetOperationSearchHref({ mode: "transfer", id: assetId, assignCustodian: true })'))
  assert.ok(source.includes("const cleared = transferAssetToClear(current, rechecked)"))
  assert.ok(source.includes('t("assetClearedForCustodian", { assetTag: values.clearedAsset.assetTag, reason: tAll(values.clearedAsset.reasonKey) })'))
  assert.match(source, /\{initialAsset\?\.eligible && values\.asset\?\.id === initialAsset\.id \? \(\n\s+<div className="md:col-span-2">\n\s+<FormContextBanner label=\{t\("asset"\)\} value=\{assetOperationRowLabel\(initialAsset\)\} \/>/)
  assert.doesNotMatch(source, /personalTransferEligible|availableAssets|initialAssetId|t\("selectAsset"\)/)
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
  assert.equal(th.transfer.assetClearedForCustodian, "นำ {assetTag} ออกแล้ว: {reason}")
  assert.equal(en.transfer.assetClearedForCustodian, "Removed {assetTag}: {reason}")
  for (const [locale, messages] of [["th", th], ["en", en]]) {
    assert.equal(messages.checkout.selectAsset, undefined, `${locale}.checkout.selectAsset has no reader and is removed`)
    assert.equal(messages.transfer.selectAsset, undefined, `${locale}.transfer.selectAsset has no reader and is removed`)
  }
})

test("look step: the arrival banner shows only while the arrival asset is still the chosen one (cleared or changed, it goes)", () => {
  for (const form of ["checkout-form.tsx", "transfer-form.tsx"]) {
    const source = read(`${C}${form}`)
    assert.equal(source.match(/<FormContextBanner /g)?.length, 1, form)
    assert.ok(source.includes("{initialAsset?.eligible && values.asset?.id === initialAsset.id ? ("), form)
    assert.doesNotMatch(source, /\{initialAsset\?\.eligible \? \(/, form)
  }
  const checkin = read(`${C}checkin-form.tsx`)
  assert.equal(checkin.match(/<FormContextBanner /g)?.length, 1)
  assert.match(checkin, /\{initialRow\?\.eligible && chosen\?\.id === initialRow\.id \? \(\n\s+<div className="md:col-span-2">\n\s+<FormContextBanner label=\{t\("asset"\)\} value=\{`\$\{initialRow\.assetTag\} - \$\{initialRow\.name\}`\} \/>/)
  assert.doesNotMatch(checkin, /\{initialRow\?\.eligible \? \(/)
})
