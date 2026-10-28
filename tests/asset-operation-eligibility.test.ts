import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { getAssetActions, type AssetActionInput } from "../src/lib/asset-actions.ts"
import {
  assetOperationModes, assetOperationRefusalReasonKeys, getAssetOperationOwnershipRefusal, getBulkMoveVerdict,
  getCheckinVerdict, getCheckoutParentVerdict, getCheckoutVerdict, getTransferVerdict, type AssetOperationFacts,
} from "../src/lib/asset-operation-eligibility.ts"

const facts = (overrides: Partial<AssetOperationFacts>): AssetOperationFacts => ({
  statusName: "Ready", ownership: "personal", custodianId: null, openCheckout: null, hasOpenRepair: false, ...overrides,
})
const handover = (handoverMode: string | null) => ({ id: "co-1", handoverMode })
const yes = { eligible: true, reasonKey: null }
const no = (reasonKey: string) => ({ eligible: false, reasonKey })
const owners = ["personal", "shared", "stock", "component", "software_license"] as const
// Every status the seed holds (prisma/seed.ts:17-30), as tests/asset-actions.test.ts:36.
const statuses = ["Draft", "Ready", "In Use", "Reserved", "Checked Out", "In Transit", "Pending Repair", "Under Inspection", "Lost", "Missing", "Under Maintenance", "Pending Disposal", "Disposed", "Retired"]
const handovers = [null, handover(null), handover("temporary_loan"), handover("permanent_assignment")]
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))

test("the modes are the four pages' pickers plus the handover-into-an-asset destination", () => {
  assert.deepEqual([...assetOperationModes], ["checkout", "checkoutParent", "checkin", "transfer", "bulkMove"])
})

test("ownership comes first: what a ส่วนควบ and a License never take, as the codes the routes answer", () => {
  assert.deepEqual(
    [...owners, null, "unknown"].map((ownership) => (["checkout", "legacyCheckin", "move"] as const).map((op) => getAssetOperationOwnershipRefusal(op, ownership))),
    [[null, null, null], [null, null, null], [null, null, null],
      ["ASSET_COMPONENT_CHECKOUT_NOT_ALLOWED", "ASSET_COMPONENT_CHECKIN_NOT_ALLOWED", null],
      ["ASSET_LICENSE_CHECKOUT_NOT_ALLOWED", "ASSET_LICENSE_CHECKIN_NOT_ALLOWED", "ASSET_LICENSE_MOVE_NOT_ALLOWED"],
      [null, null, null], [null, null, null]],
  )
  assert.deepEqual(assetOperationRefusalReasonKeys, {
    ASSET_COMPONENT_CHECKOUT_NOT_ALLOWED: "asset.transactionReasonComponentCheckout",
    ASSET_LICENSE_CHECKOUT_NOT_ALLOWED: "asset.transactionReasonLicenseCheckout",
    ASSET_COMPONENT_CHECKIN_NOT_ALLOWED: "asset.transactionReasonComponentCheckin",
    ASSET_LICENSE_CHECKIN_NOT_ALLOWED: "asset.transactionReasonLicenseCheckin",
    ASSET_LICENSE_MOVE_NOT_ALLOWED: "asset.transactionReasonLicenseMove",
  })
})

test("ส่งมอบ takes a บุคคล, ส่วนกลาง or Stock asset that is Ready with no open handover (spec 6.3)", () => {
  for (const ownership of ["personal", "shared", "stock"] as const) assert.deepEqual(getCheckoutVerdict(facts({ ownership })), yes, ownership)
  assert.deepEqual(getCheckoutVerdict(facts({ ownership: "component" })), no("asset.transactionReasonComponentCheckout"))
  assert.deepEqual(getCheckoutVerdict(facts({ ownership: "software_license" })), no("asset.transactionReasonLicenseCheckout"))
  assert.deepEqual(getCheckoutVerdict(facts({ ownership: "component", statusName: "In Use" })), no("asset.transactionReasonComponentCheckout"), "ownership first")
  assert.deepEqual(getCheckoutVerdict(facts({ statusName: "In Use" })), no("asset.transactionReasonStatusNotReady"))
  assert.deepEqual(getCheckoutVerdict(facts({ openCheckout: handover("temporary_loan") })), no("asset.transactionReasonOpenCheckoutHandover"))
  assert.deepEqual(getCheckoutVerdict(facts({ statusName: "Checked Out", openCheckout: handover("temporary_loan") })), no("asset.transactionReasonStatusNotReady"), "the route's order")
  assert.deepEqual(getCheckoutVerdict(facts({ hasOpenRepair: true })), yes, "an open repair is not the checkout route's rule")
})

test("ทรัพย์สินอื่น as the destination: what ส่งมอบ could take, never the asset being handed over", () => {
  assert.deepEqual(getCheckoutParentVerdict(facts({}), { handedOverAssetId: "a-1", assetId: "a-2" }), yes)
  assert.deepEqual(getCheckoutParentVerdict(facts({}), { handedOverAssetId: null, assetId: "a-2" }), yes)
  assert.deepEqual(getCheckoutParentVerdict(facts({}), { handedOverAssetId: "a-1", assetId: "a-1" }), no("asset.transactionReasonSameAsset"))
  assert.deepEqual(getCheckoutParentVerdict(facts({ statusName: "In Use" }), { handedOverAssetId: "a-1", assetId: "a-2" }), no("asset.transactionReasonStatusNotReady"))
  assert.deepEqual(getCheckoutParentVerdict(facts({ ownership: "component" }), { handedOverAssetId: "a-1", assetId: "a-2" }), no("asset.transactionReasonComponentCheckout"))
})

test("รับคืน: an open handover of any ownership is returnable when its custody type is set and the status fits, an open repair included (spec 6.3, S-R2, S-R43)", () => {
  const back = (overrides: Partial<AssetOperationFacts>) => getCheckinVerdict(facts(overrides))
  for (const ownership of owners) {
    assert.deepEqual(back({ ownership, statusName: "Checked Out", custodianId: "e-1", openCheckout: handover("temporary_loan") }), { ...yes, path: "handover" }, ownership)
    assert.deepEqual(back({ ownership, statusName: "In Use", custodianId: "e-1", openCheckout: handover("permanent_assignment") }), { ...yes, path: "handover" }, ownership)
  }
  // S-R43: an open repair no longer refuses the return; the return goes into ส่งซ่อม under that repair.
  assert.deepEqual(back({ statusName: "Checked Out", openCheckout: handover("temporary_loan"), hasOpenRepair: true }), { ...yes, path: "handover" }, "an open repair")
  assert.deepEqual(back({ statusName: "In Use", openCheckout: handover("permanent_assignment"), hasOpenRepair: true }), { ...yes, path: "handover" }, "an open repair")
  assert.deepEqual(back({ statusName: "Pending Repair", openCheckout: handover("temporary_loan"), hasOpenRepair: true }), { ...no("asset.transactionReasonHandoverStatusMismatch"), path: "handover" }, "the status still has to fit")
  for (const mode of [null, "bogus"]) assert.deepEqual(back({ statusName: "In Use", openCheckout: handover(mode) }), { ...no("asset.transactionReasonHandoverModeMissing"), path: "handover" }, String(mode))
  assert.deepEqual(back({ statusName: "In Use", openCheckout: handover("temporary_loan") }), { ...no("asset.transactionReasonHandoverStatusMismatch"), path: "handover" })
  assert.deepEqual(back({ statusName: "Checked Out", openCheckout: handover("permanent_assignment") }), { ...no("asset.transactionReasonHandoverStatusMismatch"), path: "handover" })
})

test("รับคืน without a handover: the legacy rule for a held บุคคล, ส่วนกลาง or Stock asset; ส่วนควบ and License say why; nothing to return has no path (spec 6.3)", () => {
  const back = (overrides: Partial<AssetOperationFacts>) => getCheckinVerdict(facts(overrides))
  for (const ownership of ["personal", "shared", "stock"] as const) {
    for (const statusName of ["Ready", "In Use"]) assert.deepEqual(back({ ownership, statusName, custodianId: "e-1" }), { ...yes, path: "legacy" }, `${ownership} ${statusName}`)
  }
  assert.deepEqual(back({ ownership: "component", statusName: "In Use", custodianId: "e-1" }), { ...no("asset.transactionReasonComponentCheckin"), path: "legacy" })
  assert.deepEqual(back({ ownership: "software_license", statusName: "In Use", custodianId: "e-1" }), { ...no("asset.transactionReasonLicenseCheckin"), path: "legacy" })
  assert.deepEqual(back({ ownership: "component", custodianId: "e-1", hasOpenRepair: true }), { ...no("asset.transactionReasonComponentCheckin"), path: "legacy" }, "ownership first")
  assert.deepEqual(back({ ownership: "component" }), { ...no("asset.transactionReasonComponentCheckin"), path: null })
  assert.deepEqual(back({ statusName: "In Use", custodianId: "e-1", hasOpenRepair: true }), { ...no("asset.transactionReasonActiveMaintenance"), path: "legacy" })
  assert.deepEqual(back({ statusName: "Pending Repair", hasOpenRepair: true }), { ...no("asset.transactionReasonActiveMaintenance"), path: null }, "the asset page's order: repair before holder")
  for (const ownership of ["shared", "stock"] as const) assert.deepEqual(back({ ownership }), { ...no("asset.transactionReasonNoReturnRecord"), path: null }, ownership)
  assert.deepEqual(back({ statusName: "Lost", custodianId: "e-1" }), { ...no("asset.transactionReasonStatusNotReturnable"), path: "legacy" })
})

test("โอนย้าย: no custodian is a move (not Disposed/Retired), a custodian needs Ready or In Use, then the open handover; a License never moves (spec 6.3)", () => {
  const move = { assignCustodian: false }
  const assign = { assignCustodian: true }
  for (const ownership of ["personal", "shared", "stock", "component"] as const) {
    for (const statusName of ["Ready", "In Use", "Pending Repair", "Under Maintenance", "Lost"]) assert.deepEqual(getTransferVerdict(facts({ ownership, statusName }), move), yes, `${ownership} ${statusName}`)
    for (const statusName of ["Disposed", "Retired"]) assert.deepEqual(getTransferVerdict(facts({ ownership, statusName }), move), no("asset.transactionReasonWrittenOff"), `${ownership} ${statusName}`)
  }
  assert.deepEqual(getTransferVerdict(facts({ ownership: "software_license", statusName: "Disposed" }), move), no("asset.transactionReasonLicenseMove"), "ownership first")
  assert.deepEqual(getTransferVerdict(facts({ openCheckout: handover("temporary_loan") }), move), no("asset.transactionReasonOpenCheckout"))
  for (const statusName of ["Ready", "In Use"]) assert.deepEqual(getTransferVerdict(facts({ statusName }), assign), yes, statusName)
  assert.deepEqual(getTransferVerdict(facts({ statusName: "Pending Repair" }), assign), no("asset.transactionReasonStatusNotTransferable"))
  assert.deepEqual(getTransferVerdict(facts({ statusName: "In Use", openCheckout: handover("permanent_assignment") }), assign), no("asset.transactionReasonOpenCheckout"))
  assert.deepEqual(getTransferVerdict(facts({ statusName: "Checked Out", openCheckout: handover("temporary_loan") }), assign), no("asset.transactionReasonStatusNotTransferable"), "the route's order")
})

test("ย้ายที่ตั้งหลายรายการ: not a License, no open handover, not Disposed/Retired, in the route's order (spec 6.3)", () => {
  for (const ownership of ["personal", "shared", "stock", "component"] as const) {
    for (const statusName of ["Ready", "In Use", "Pending Repair", "Lost"]) assert.deepEqual(getBulkMoveVerdict(facts({ ownership, statusName })), yes, `${ownership} ${statusName}`)
  }
  for (const statusName of ["Disposed", "Retired"]) assert.deepEqual(getBulkMoveVerdict(facts({ statusName })), no("asset.transactionReasonWrittenOff"), statusName)
  assert.deepEqual(getBulkMoveVerdict(facts({ openCheckout: handover("temporary_loan") })), no("asset.transactionReasonOpenCheckout"))
  assert.deepEqual(getBulkMoveVerdict(facts({ ownership: "software_license", statusName: "Disposed", openCheckout: handover("temporary_loan") })), no("asset.transactionReasonLicenseMove"))
  assert.deepEqual(getBulkMoveVerdict(facts({ statusName: "Disposed", openCheckout: handover("temporary_loan") })), no("asset.transactionReasonOpenCheckout"), "the open handover before the status, as the route")
})

test("the asset page and the picker give one asset the same answer (spec §5, §8)", () => {
  const base: AssetActionInput = {
    locale: "th", assetId: "a-1", statusName: "Ready", ownership: "personal", custodianId: null, openCheckoutId: null,
    openCheckoutHandoverMode: null, openRepairId: null, openDisposalId: null, returnTo: "/th/assets",
    can: { assetEdit: true, maintenanceCreate: true, maintenanceView: true, disposalView: true },
  }
  for (const ownership of owners) for (const statusName of statuses) for (const openCheckout of handovers) for (const hasOpenRepair of [false, true]) for (const custodianId of [null, "e-1"]) {
    const set = getAssetActions({ ...base, ownership, statusName, custodianId, openCheckoutId: openCheckout?.id ?? null, openCheckoutHandoverMode: openCheckout?.handoverMode ?? null, openRepairId: hasOpenRepair ? "r-1" : null })
    const list = [...(set.primary ? [set.primary] : []), ...set.transactions]
    const f: AssetOperationFacts = { statusName, ownership, custodianId, openCheckout, hasOpenRepair }
    const verdicts = { checkout: getCheckoutVerdict(f), checkin: getCheckinVerdict(f), transfer: getTransferVerdict(f, { assignCustodian: ownership === "personal" }) }
    const where = `${ownership} ${statusName} ${openCheckout?.handoverMode} ${hasOpenRepair} ${custodianId}`
    for (const key of ["checkout", "checkin", "transfer"] as const) {
      const action = list.find((item) => item.key === key)
      if (!action) continue // the ownership type has no such action on the asset page (ส่วนควบ: transfer only; License: none)
      assert.deepEqual([action.enabled, action.reasonKey], [verdicts[key].eligible, verdicts[key].reasonKey], `${where} ${key}`)
    }
    const checkin = list.find((item) => item.key === "checkin")
    if (checkin?.enabled) assert.equal(checkin.href?.includes("checkoutId=co-1"), verdicts.checkin.path === "handover", where)
  }
  // S-R40: one function, two contexts. The asset page's โอนย้าย for บุคคล is an assign; the transfer page with no custodian is a move.
  const inspected = facts({ ownership: "personal", statusName: "Under Inspection" })
  assert.deepEqual(getTransferVerdict(inspected, { assignCustodian: true }), no("asset.transactionReasonStatusNotTransferable"))
  assert.deepEqual(getTransferVerdict(inspected, { assignCustodian: false }), yes)
})

test("the new words are the spec's, the custody-type words are the return form's, and every reason exists in Thai and English (spec 6.3)", () => {
  const th = messages("th"), en = messages("en")
  assert.deepEqual(["ComponentCheckout", "ComponentCheckin", "LicenseCheckout", "LicenseCheckin", "LicenseMove", "SameAsset"].map((name) => th.asset[`transactionReason${name}`]), [
    "ส่วนควบไปพร้อมเครื่องหลัก ส่งมอบแยกไม่ได้", "ส่วนควบรับคืนพร้อมเครื่องหลัก", "License ผูกสิทธิ์ที่หน้าทรัพย์สิน ส่งมอบไม่ได้",
    "License ผูกสิทธิ์ที่หน้าทรัพย์สิน รับคืนไม่ได้", "License ผูกสิทธิ์ที่หน้าทรัพย์สิน ย้ายไม่ได้", "เป็นทรัพย์สินที่กำลังส่งมอบ เลือกเป็นปลายทางไม่ได้",
  ])
  for (const table of [th, en]) {
    assert.equal(table.asset.transactionReasonHandoverModeMissing, table.checkin.handoverModeMissing)
    assert.equal(table.asset.transactionReasonHandoverStatusMismatch, table.checkin.handoverStatusMismatch)
  }
  const keys = new Set<string>()
  for (const ownership of owners) for (const statusName of statuses) for (const openCheckout of handovers) for (const hasOpenRepair of [false, true]) for (const custodianId of [null, "e-1"]) {
    const f = facts({ ownership, statusName, openCheckout, hasOpenRepair, custodianId })
    for (const verdict of [getCheckoutVerdict(f), getCheckoutParentVerdict(f, { handedOverAssetId: "a-1", assetId: "a-1" }), getCheckinVerdict(f), getTransferVerdict(f, { assignCustodian: true }), getTransferVerdict(f, { assignCustodian: false }), getBulkMoveVerdict(f)]) {
      if (verdict.reasonKey) keys.add(verdict.reasonKey)
    }
  }
  assert.deepEqual([...keys].sort(), ["ActiveMaintenance", "ComponentCheckin", "ComponentCheckout", "HandoverModeMissing", "HandoverStatusMismatch", "LicenseCheckin", "LicenseCheckout", "LicenseMove", "NoReturnRecord", "OpenCheckout", "OpenCheckoutHandover", "SameAsset", "StatusNotReady", "StatusNotReturnable", "StatusNotTransferable", "WrittenOff"].map((name) => `asset.transactionReason${name}`))
  for (const key of keys) for (const table of [th, en]) assert.equal(typeof table.asset[key.slice("asset.".length)], "string", key)
})

test("the verdicts stay pure: relative .ts imports, no database", () => {
  const source = readFileSync("src/lib/asset-operation-eligibility.ts", "utf8")
  assert.doesNotMatch(source, /from "@\/|from "@prisma\/client"|\bprisma\./)
  for (const [, path] of source.matchAll(/from "([^"]+)"/g)) assert.match(path, /^\.\/[\w-]+\.ts$/, path)
})
