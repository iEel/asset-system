import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { getAssetActions, type AssetActionInput } from "../src/lib/asset-actions.ts"
import {
  assetOperationModes, assetOperationRefusalReasonKeys, getAssetOperationOwnershipRefusal, getBulkMoveVerdict,
  getCheckinVerdict, getCheckoutVerdict, getTransferVerdict, type AssetOperationFacts,
} from "../src/lib/asset-operation-eligibility.ts"

const facts = (overrides: Partial<AssetOperationFacts>): AssetOperationFacts => ({
  statusName: "Ready", ownership: "personal", custodianId: null, openCheckout: null, hasOpenRepair: false, conditionName: null, outstanding: null, ...overrides,
})
const outstanding = { linkId: "link-1", checkinId: "rt-1" }
const handover = (handoverMode: string | null) => ({ id: "co-1", handoverMode })
const yes = { eligible: true, reasonKey: null }
const no = (reasonKey: string) => ({ eligible: false, reasonKey })
const owners = ["personal", "shared", "stock", "component", "software_license"] as const
// Every status the seed holds (prisma/seed.ts:17-30), as tests/asset-actions.test.ts:36.
const statuses = ["Draft", "Ready", "In Use", "Reserved", "Checked Out", "In Transit", "Pending Repair", "Under Inspection", "Lost", "Missing", "Under Maintenance", "Pending Disposal", "Disposed", "Retired"]
const handovers = [null, handover(null), handover("temporary_loan"), handover("permanent_assignment")]
// The seeded condition names that matter to the verdicts (prisma/seed.ts), and none.
const conditionNames = [null, "Not Assessed", "Good", "Damaged", "Non-functional", "Salvage"]
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))

test("the modes are the four pages' pickers; the ทรัพย์สินอื่น destination is gone (group 3 spec §7.3)", () => {
  assert.deepEqual([...assetOperationModes], ["checkout", "checkin", "transfer", "bulkMove"])
  assert.doesNotMatch(readFileSync("src/lib/asset-operation-eligibility.ts", "utf8"), /getCheckoutParentVerdict|checkoutParent|transactionReasonSameAsset/)
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
    ASSET_COMPONENT_OUTSTANDING: "asset.transactionReasonComponentOutstanding",
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

test("ส่งมอบ refuses a เสียหาย, ใช้งานไม่ได้ or ซาก asset last, after the ownership, the status and the open handover (group 3 spec §19.2, A1-R2)", () => {
  assert.deepEqual(getCheckoutVerdict(facts({ conditionName: "Damaged" })), no("asset.transactionReasonConditionDamaged"))
  assert.deepEqual(getCheckoutVerdict(facts({ conditionName: "Non-functional" })), no("asset.transactionReasonConditionNonFunctional"))
  assert.deepEqual(getCheckoutVerdict(facts({ conditionName: "Salvage" })), no("asset.transactionReasonConditionSalvage"))
  for (const conditionName of [null, "Not Assessed", "New", "Good", "Fair"]) assert.deepEqual(getCheckoutVerdict(facts({ conditionName })), yes, String(conditionName))
  assert.deepEqual(getCheckoutVerdict(facts({ statusName: "In Use", conditionName: "Damaged" })), no("asset.transactionReasonStatusNotReady"), "the status reason first")
  assert.deepEqual(getCheckoutVerdict(facts({ openCheckout: handover("temporary_loan"), conditionName: "Damaged" })), no("asset.transactionReasonOpenCheckoutHandover"), "the open handover first")
  assert.deepEqual(getCheckoutVerdict(facts({ ownership: "component", conditionName: "Salvage" })), no("asset.transactionReasonComponentCheckout"), "ownership first")
  // รับคืน and the bulk move do not read the condition; โอนย้าย reads it only for a new holder (P3-R1, which answers A1-R3).
  const broken = facts({ statusName: "In Use", custodianId: "e-1", conditionName: "Damaged" })
  assert.deepEqual(getCheckinVerdict(broken), { ...yes, path: "legacy" })
  assert.deepEqual(getTransferVerdict(broken, { assignCustodian: true }), no("asset.transactionReasonTransferConditionDamaged"))
  assert.deepEqual(getTransferVerdict(broken, { assignCustodian: false }), yes)
  assert.deepEqual(getBulkMoveVerdict(broken), yes)
})

test("โอนย้าย refuses a เสียหาย, ใช้งานไม่ได้ or ซาก asset only for a new holder, last, after the outstanding link, the ownership, the status and the open handover (group 3 spec §19 recorded question; plan 3 P3-R1)", () => {
  const assign = { assignCustodian: true }
  const move = { assignCustodian: false }
  const blocks = [
    ["Damaged", "asset.transactionReasonTransferConditionDamaged"],
    ["Non-functional", "asset.transactionReasonTransferConditionNonFunctional"],
    ["Salvage", "asset.transactionReasonTransferConditionSalvage"],
  ] as const
  for (const ownership of ["personal", "shared", "stock", "component"] as const) for (const statusName of ["Ready", "In Use"]) {
    for (const [conditionName, reasonKey] of blocks) {
      const where = `${ownership} ${statusName} ${conditionName}`
      assert.deepEqual(getTransferVerdict(facts({ ownership, statusName, conditionName }), assign), no(reasonKey), where)
      assert.deepEqual(getTransferVerdict(facts({ ownership, statusName, conditionName }), move), yes, `${where}: a room or department move stays allowed`)
    }
  }
  for (const conditionName of [null, "Not Assessed", "New", "Good", "Fair"]) assert.deepEqual(getTransferVerdict(facts({ conditionName }), assign), yes, String(conditionName))
  assert.deepEqual(getTransferVerdict(facts({ conditionName: " damaged " }), assign), no("asset.transactionReasonTransferConditionDamaged"), "the master name folded as checkout's")
  // The condition is the last rule: every earlier refusal keeps its own reason.
  assert.deepEqual(getTransferVerdict(facts({ conditionName: "Salvage", outstanding }), assign), no("asset.transactionReasonComponentOutstanding"), "the outstanding link first")
  assert.deepEqual(getTransferVerdict(facts({ ownership: "software_license", conditionName: "Damaged" }), assign), no("asset.transactionReasonLicenseMove"), "ownership first")
  assert.deepEqual(getTransferVerdict(facts({ statusName: "Pending Repair", conditionName: "Damaged" }), assign), no("asset.transactionReasonStatusNotTransferable"), "the status first")
  assert.deepEqual(getTransferVerdict(facts({ statusName: "In Use", openCheckout: handover("permanent_assignment"), conditionName: "Damaged" }), assign), no("asset.transactionReasonOpenCheckout"), "the open handover first")
  // A move to the repair room or IT storage: any status but Disposed/Retired, broken or not.
  assert.deepEqual(getTransferVerdict(facts({ statusName: "Pending Repair", conditionName: "Damaged" }), move), yes)
  assert.deepEqual(getBulkMoveVerdict(facts({ statusName: "Ready", conditionName: "Salvage" })), yes, "the bulk move does not read it")
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
  // S-R48: opening an unfinished repair moves a permanent handover to Under Maintenance; with that repair open it fits.
  for (const statusName of ["Under Maintenance", "Pending Repair"]) {
    assert.deepEqual(back({ statusName, openCheckout: handover("permanent_assignment"), hasOpenRepair: true }), { ...yes, path: "handover" }, `permanent ${statusName} with a repair`)
    assert.deepEqual(back({ statusName, openCheckout: handover("permanent_assignment") }), { ...no("asset.transactionReasonHandoverStatusMismatch"), path: "handover" }, `permanent ${statusName} without a repair`)
  }
  assert.deepEqual(back({ statusName: "Under Maintenance", openCheckout: handover("temporary_loan"), hasOpenRepair: true }), { ...no("asset.transactionReasonHandoverStatusMismatch"), path: "handover" }, "a loan is unchanged")
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

test("ส่งมอบ, โอนย้าย and the bulk move refuse an outstanding component before any other rule (group 3 spec §8.5, P2-R17)", () => {
  const why = no("asset.transactionReasonComponentOutstanding")
  for (const ownership of owners) for (const statusName of ["Ready", "In Use", "Disposed"]) {
    const f = facts({ ownership, statusName, custodianId: "e-1", outstanding })
    for (const verdict of [getCheckoutVerdict(f), getTransferVerdict(f, { assignCustodian: true }), getTransferVerdict(f, { assignCustodian: false }), getBulkMoveVerdict(f)]) {
      assert.deepEqual(verdict, why, `${ownership} ${statusName}`)
    }
  }
  assert.deepEqual(getCheckoutVerdict(facts({ openCheckout: handover("temporary_loan"), conditionName: "Salvage", outstanding })), why, "before the open handover and the condition")
})

test("รับคืน takes an outstanding component on the componentReturn path, before the handover, legacy and ownership rules (group 3 spec §8.6, P2-R17)", () => {
  const back = (overrides: Partial<AssetOperationFacts>) => getCheckinVerdict(facts({ custodianId: "e-1", outstanding, ...overrides }))
  const path = "componentReturn"
  for (const ownership of owners) for (const custodianId of [null, "e-1"]) assert.deepEqual(back({ ownership, custodianId }), { ...yes, path }, `${ownership} ${custodianId}`)
  // Missing (หาไม่พบ, being traced) is returned: a component brought back is found. Lost (สูญหาย, confirmed) is refused below.
  for (const statusName of ["Ready", "In Use", "Under Maintenance", "Pending Repair", "Pending Disposal", "Missing"]) assert.deepEqual(back({ statusName }), { ...yes, path }, statusName)
  for (const statusName of ["Disposed", "Retired", "Lost"]) assert.deepEqual(back({ statusName }), { ...no("asset.transactionReasonStatusNotReturnable"), path }, statusName)
  assert.deepEqual(back({ statusName: "In Use", openCheckout: handover("permanent_assignment") }), { ...no("asset.transactionReasonComponentOwnHandover"), path })
  assert.deepEqual(back({ hasOpenRepair: true }), { ...no("asset.transactionReasonActiveMaintenance"), path })
  assert.deepEqual(back({ outstanding: { linkId: "link-1", checkinId: null } }), { ...no("asset.transactionReasonNoReturnRecord"), path }, "a link that names no RT-")
  // In this order: the status, its own handover, an open repair, the RT- reference.
  assert.deepEqual(back({ statusName: "Lost", openCheckout: handover("temporary_loan"), hasOpenRepair: true }), { ...no("asset.transactionReasonStatusNotReturnable"), path })
  assert.deepEqual(back({ openCheckout: handover("temporary_loan"), hasOpenRepair: true, outstanding: { linkId: "link-1", checkinId: null } }), { ...no("asset.transactionReasonComponentOwnHandover"), path })
  assert.deepEqual(back({ hasOpenRepair: true, outstanding: { linkId: "link-1", checkinId: null } }), { ...no("asset.transactionReasonActiveMaintenance"), path })
  // Without the link the same asset takes today's paths.
  assert.deepEqual(getCheckinVerdict(facts({ ownership: "component", custodianId: "e-1" })), { ...no("asset.transactionReasonComponentCheckin"), path: "legacy" })
  assert.deepEqual(getCheckinVerdict(facts({ statusName: "In Use", custodianId: "e-1" })), { ...yes, path: "legacy" })
})

test("the asset page and the picker give one asset the same answer (spec §5, §8)", () => {
  const base: AssetActionInput = {
    locale: "th", assetId: "a-1", statusName: "Ready", ownership: "personal", custodianId: null, openCheckoutId: null,
    openCheckoutHandoverMode: null, openRepairId: null, openDisposalId: null, conditionName: null, outstanding: null, returnTo: "/th/assets",
    can: { assetEdit: true, maintenanceCreate: true, maintenanceView: true, disposalView: true },
  }
  for (const ownership of owners) for (const statusName of statuses) for (const openCheckout of handovers) for (const hasOpenRepair of [false, true]) for (const custodianId of [null, "e-1"]) for (const conditionName of [null, "Damaged"]) for (const outstanding of [null, { linkId: "l-1", checkinId: "rt-1" }]) {
    const set = getAssetActions({ ...base, ownership, statusName, custodianId, openCheckoutId: openCheckout?.id ?? null, openCheckoutHandoverMode: openCheckout?.handoverMode ?? null, openRepairId: hasOpenRepair ? "r-1" : null, conditionName, outstanding })
    const list = [...(set.primary ? [set.primary] : []), ...set.transactions]
    const f: AssetOperationFacts = { statusName, ownership, custodianId, openCheckout, hasOpenRepair, conditionName, outstanding }
    const verdicts = { checkout: getCheckoutVerdict(f), checkin: getCheckinVerdict(f), transfer: getTransferVerdict(f, { assignCustodian: ownership === "personal" }) }
    const where = `${ownership} ${statusName} ${openCheckout?.handoverMode} ${hasOpenRepair} ${custodianId} ${conditionName} ${outstanding?.linkId}`
    for (const key of ["checkout", "checkin", "transfer"] as const) {
      const action = list.find((item) => item.key === key)
      if (!action) continue // the ownership type has no such action on the asset page (ส่วนควบ: transfer only; License: none)
      assert.deepEqual([action.enabled, action.reasonKey], [verdicts[key].eligible, verdicts[key].reasonKey], `${where} ${key}`)
    }
    const checkin = list.find((item) => item.key === "checkin")
    if (checkin?.enabled) assert.equal(checkin.href?.includes("checkoutId=co-1"), verdicts.checkin.path === "handover", where)
    if (ownership === "component") assert.equal(list.some((item) => item.key === "checkin"), outstanding !== null, where)
  }
  // S-R40: one function, two contexts. The asset page's โอนย้าย for บุคคล is an assign; the transfer page with no custodian is a move.
  const inspected = facts({ ownership: "personal", statusName: "Under Inspection" })
  assert.deepEqual(getTransferVerdict(inspected, { assignCustodian: true }), no("asset.transactionReasonStatusNotTransferable"))
  assert.deepEqual(getTransferVerdict(inspected, { assignCustodian: false }), yes)
  // P3-R1, the same model: the asset page asks บุคคล as an assign, so a broken บุคคล asset's โอนย้าย is disabled with the
  // transfer words; ส่วนกลาง, Stock and ส่วนควบ move, and a room-only move of a บุคคล one starts from the menu.
  const brokenTransfer = (ownership: AssetActionInput["ownership"]) => {
    const set = getAssetActions({ ...base, ownership, statusName: "In Use", custodianId: "e-1", conditionName: "Damaged" })
    const action = [...(set.primary ? [set.primary] : []), ...set.transactions].find((item) => item.key === "transfer")
    return [action?.enabled, action?.reasonKey]
  }
  assert.deepEqual(brokenTransfer("personal"), [false, "asset.transactionReasonTransferConditionDamaged"])
  for (const ownership of ["shared", "stock", "component"] as const) assert.deepEqual(brokenTransfer(ownership), [true, null], ownership)
})

test("the new words are the spec's, the custody-type words are the return form's, and every reason exists in Thai and English (spec 6.3)", () => {
  const th = messages("th"), en = messages("en")
  assert.deepEqual(["ComponentCheckout", "ComponentCheckin", "LicenseCheckout", "LicenseCheckin", "LicenseMove"].map((name) => th.asset[`transactionReason${name}`]), [
    "ส่วนควบไปพร้อมเครื่องหลัก ส่งมอบแยกไม่ได้", "ส่วนควบรับคืนพร้อมเครื่องหลัก", "License ผูกสิทธิ์ที่หน้าทรัพย์สิน ส่งมอบไม่ได้",
    "License ผูกสิทธิ์ที่หน้าทรัพย์สิน รับคืนไม่ได้", "License ผูกสิทธิ์ที่หน้าทรัพย์สิน ย้ายไม่ได้",
  ])
  // The condition refusals (group 3 spec §19.2).
  assert.deepEqual(["Damaged", "NonFunctional", "Salvage"].map((name) => [th.asset[`transactionReasonCondition${name}`], en.asset[`transactionReasonCondition${name}`]]), [
    ["สภาพเสียหาย ต้องส่งซ่อมก่อนส่งมอบ", "Damaged. Send it for repair before handing it over."],
    ["ใช้งานไม่ได้ ต้องส่งซ่อมก่อนส่งมอบ", "Not working. Send it for repair before handing it over."],
    ["เป็นซาก รอตัดจำหน่าย ส่งมอบไม่ได้", "Salvage awaiting disposal. It cannot be handed over."],
  ])
  // โอนย้าย to a new holder (plan 3 P3-R1): its own words; checkout's say "ก่อนส่งมอบ".
  assert.deepEqual(["Damaged", "NonFunctional", "Salvage"].map((name) => [th.asset[`transactionReasonTransferCondition${name}`], en.asset[`transactionReasonTransferCondition${name}`]]), [
    ["สภาพเสียหาย ต้องส่งซ่อมก่อนโอนย้ายให้ผู้ถือครองใหม่", "Damaged: send it for repair before giving it to a new holder"],
    ["ใช้งานไม่ได้ ต้องส่งซ่อมก่อนโอนย้ายให้ผู้ถือครองใหม่", "Not working: send it for repair before giving it to a new holder"],
    ["เป็นซาก รอตัดจำหน่าย โอนย้ายให้ผู้ถือครองใหม่ไม่ได้", "Salvage awaiting disposal: it cannot go to a new holder"],
  ])
  // The outstanding component (group 3 spec §8.5, §8.6, P2-R17).
  assert.deepEqual(["ComponentOutstanding", "ComponentOwnHandover"].map((name) => [th.asset[`transactionReason${name}`], en.asset[`transactionReason${name}`]]), [
    ["ส่วนควบค้างคืน รับคืนก่อน", "An outstanding component: return it first"],
    ["ส่วนควบนี้มีใบส่งมอบของตัวเองค้างอยู่ ถอดออกจากเครื่องหลักก่อน", "This component has its own open handover. Remove it from its parent asset first."],
  ])
  for (const table of [th, en]) {
    assert.equal(table.asset.transactionReasonHandoverModeMissing, table.checkin.handoverModeMissing)
    assert.equal(table.asset.transactionReasonHandoverStatusMismatch, table.checkin.handoverStatusMismatch)
  }
  const keys = new Set<string>()
  for (const ownership of owners) for (const statusName of statuses) for (const openCheckout of handovers) for (const hasOpenRepair of [false, true]) for (const custodianId of [null, "e-1"]) for (const conditionName of conditionNames) for (const outstanding of [null, { linkId: "l-1", checkinId: "rt-1" }, { linkId: "l-1", checkinId: null }]) {
    const f = facts({ ownership, statusName, openCheckout, hasOpenRepair, custodianId, conditionName, outstanding })
    for (const verdict of [getCheckoutVerdict(f), getCheckinVerdict(f), getTransferVerdict(f, { assignCustodian: true }), getTransferVerdict(f, { assignCustodian: false }), getBulkMoveVerdict(f)]) {
      if (verdict.reasonKey) keys.add(verdict.reasonKey)
    }
  }
  assert.deepEqual([...keys].sort(), ["ActiveMaintenance", "ComponentCheckin", "ComponentCheckout", "ComponentOutstanding", "ComponentOwnHandover", "ConditionDamaged",
 "ConditionNonFunctional", "ConditionSalvage", "HandoverModeMissing", "HandoverStatusMismatch", "LicenseCheckin", "LicenseCheckout", "LicenseMove", "NoReturnRecord", "OpenCheckout", "OpenCheckoutHandover", "StatusNotReady", "StatusNotReturnable", "StatusNotTransferable", "TransferConditionDamaged",
 "TransferConditionNonFunctional", "TransferConditionSalvage", "WrittenOff"].map((name) => `asset.transactionReason${name}`))
  for (const key of keys) for (const table of [th, en]) assert.equal(typeof table.asset[key.slice("asset.".length)], "string", key)
})

test("the verdicts stay pure: relative .ts imports, no database", () => {
  const source = readFileSync("src/lib/asset-operation-eligibility.ts", "utf8")
  assert.doesNotMatch(source, /from "@\/|from "@prisma\/client"|\bprisma\./)
  for (const [, path] of source.matchAll(/from "([^"]+)"/g)) assert.match(path, /^\.\/[\w-]+\.ts$/, path)
})
