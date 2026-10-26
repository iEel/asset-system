import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  firstIdByAssetId,
  getAssetActions,
  getAssetRecordRepairAction,
  openDisposalRequestWhere,
  type AssetAction,
  type AssetActionInput,
  type AssetOwnershipKind,
} from "../src/lib/asset-actions.ts"
import { getAssetLifecycleTransitionError, getCheckinHandoverStatusError, isLegacyReturnEligible } from "../src/lib/asset-lifecycle-policy.ts"

const base: AssetActionInput = {
  locale: "th",
  assetId: "a-1",
  statusName: "Ready",
  ownership: "personal",
  custodianId: null,
  openCheckoutId: null,
  openCheckoutHandoverMode: null,
  openRepairId: null,
  openDisposalId: null,
  returnTo: "/th/assets?search=nb&page=1&pageSize=25",
  can: { assetEdit: true, maintenanceCreate: true, maintenanceView: true, disposalView: true },
}
const actions = (overrides: Partial<AssetActionInput>) => getAssetActions({ ...base, ...overrides })
const brief = (action: AssetAction | null | undefined) => (action ? [action.key, action.labelKey, action.enabled, action.reasonKey] : null)
const all = (overrides: Partial<AssetActionInput>) => {
  const set = actions(overrides)
  return [...(set.primary ? [set.primary] : []), ...set.transactions]
}
// Every status the seed holds (prisma/seed.ts:17-30).
const statuses = ["Draft", "Ready", "In Use", "Reserved", "Checked Out", "In Transit", "Pending Repair", "Under Inspection", "Lost", "Missing", "Under Maintenance", "Pending Disposal", "Disposed", "Retired"]
// labelKey and reasonKey are full message keys, read through the root translator.
const message = (locale: "th" | "en", key: string): unknown =>
  key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")))

test("labels follow the ownership type on both pages, and a licence has its own two edits (group 1 spec §7.1)", () => {
  const labels = (ownership: AssetOwnershipKind) =>
    Object.fromEntries(all({ ownership, statusName: "Disposed" }).map((action) => [action.key, action.labelKey]))
  assert.deepEqual(labels("personal"), { checkout: "asset.rowActionCheckout", checkin: "asset.rowActionCheckin", transfer: "asset.rowActionTransfer" })
  assert.deepEqual(labels("stock"), { checkout: "asset.quickIssueFromStock", checkin: "asset.rowActionCheckin", transfer: "asset.quickMoveStock" })
  assert.deepEqual(labels("shared"), { checkout: "asset.quickTemporaryHandover", checkin: "asset.rowActionCheckin", transfer: "asset.quickRelocateShared" })
  assert.deepEqual(labels("component"), { manageComponents: "asset.manageComponents", transfer: "asset.quickMoveComponent" })
  assert.deepEqual(labels("software_license"), { bindLicense: "asset.quickAssignLicense", renewLicense: "asset.quickRenewLicense" })
})

test("the primary is the first rule that applies (group 1 spec §7.1, rules 1-7)", () => {
  // 1. An open checkout whose return the API accepts, or a legacy custodian the return rule accepts.
  assert.deepEqual(brief(actions({ statusName: "Checked Out", custodianId: "e-1", openCheckoutId: "co-1", openCheckoutHandoverMode: "temporary_loan" }).primary), ["checkin", "asset.rowActionCheckin", true, null])
  assert.deepEqual(brief(actions({ statusName: "In Use", custodianId: "e-1", openCheckoutId: "co-1", openCheckoutHandoverMode: "permanent_assignment" }).primary), ["checkin", "asset.rowActionCheckin", true, null])
  assert.deepEqual(brief(actions({ statusName: "In Use", custodianId: "e-1" }).primary), ["checkin", "asset.rowActionCheckin", true, null])
  // A Ready asset with a legacy custodian: the return comes first (today's register offered ส่งมอบ there).
  assert.deepEqual(brief(actions({ custodianId: "e-1" }).primary), ["checkin", "asset.rowActionCheckin", true, null])
  assert.deepEqual(brief(actions({ ownership: "stock", statusName: "Checked Out", custodianId: "e-1", openCheckoutId: "co-1", openCheckoutHandoverMode: "temporary_loan" }).primary), ["checkin", "asset.rowActionCheckin", true, null])
  // 2. A component manages its components and a licence binds, whatever the status.
  assert.deepEqual(brief(actions({ ownership: "component", statusName: "Pending Repair", openRepairId: "r-1" }).primary), ["manageComponents", "asset.manageComponents", true, null])
  assert.deepEqual(brief(actions({ ownership: "software_license", statusName: "In Use", custodianId: "e-1" }).primary), ["bindLicense", "asset.quickAssignLicense", true, null])
  // 3. Ready: the checkout label (personal, stock), or ย้ายจุดติดตั้ง (shared).
  assert.deepEqual(brief(actions({}).primary), ["checkout", "asset.rowActionCheckout", true, null])
  assert.deepEqual(brief(actions({ ownership: "stock" }).primary), ["checkout", "asset.quickIssueFromStock", true, null])
  assert.deepEqual(brief(actions({ ownership: "shared" }).primary), ["transfer", "asset.quickRelocateShared", true, null])
  // 4. Pending Repair or Under Maintenance with an open repair record: the record.
  for (const statusName of ["Pending Repair", "Under Maintenance"]) {
    assert.deepEqual(brief(actions({ statusName, openRepairId: "r-1" }).primary), ["viewRepair", "asset.actionViewRepair", true, null], statusName)
    // A loan that went to repair: the return waits for the repair, so the record comes first.
    assert.deepEqual(brief(actions({ statusName, custodianId: "e-1", openCheckoutId: "co-1", openCheckoutHandoverMode: "temporary_loan", openRepairId: "r-1" }).primary), ["viewRepair", "asset.actionViewRepair", true, null], statusName)
  }
  // 5. Pending Repair without a record: บันทึกซ่อม.
  assert.deepEqual(brief(actions({ statusName: "Pending Repair" }).primary), ["recordRepair", "asset.quickMaintenance", true, null])
  // 6. Pending Disposal: the open request; without one there is nothing to open.
  assert.deepEqual(brief(actions({ statusName: "Pending Disposal", openDisposalId: "d-1" }).primary), ["viewDisposal", "asset.actionViewDisposal", true, null])
  assert.equal(actions({ statusName: "Pending Disposal" }).primary, null)
  // 7. Otherwise no primary. Reserved and In Transit too: a checkout starts only from Ready (asset-lifecycle-policy.ts:58), and a return without a checkout needs a custodian (:171).
  for (const statusName of ["Draft", "In Use", "Reserved", "In Transit", "Under Maintenance", "Under Inspection", "Lost", "Missing", "Disposed", "Retired"]) {
    assert.equal(actions({ statusName }).primary, null, statusName)
  }
})

test("the transactions are the ownership type's others: available first, then unavailable with the register's reasons (group 1 spec §7.1)", () => {
  assert.deepEqual(actions({}).transactions.map(brief), [
    ["transfer", "asset.rowActionTransfer", true, null],
    ["checkin", "asset.rowActionCheckin", false, "asset.transactionReasonNoReturnRecord"],
  ])
  const handedOver = actions({ statusName: "In Use", custodianId: "e-1", openCheckoutId: "co-1", openCheckoutHandoverMode: "permanent_assignment" })
  assert.deepEqual(handedOver.transactions.map(brief), [
    ["checkout", "asset.rowActionCheckout", false, "asset.transactionReasonStatusNotReady"],
    ["transfer", "asset.rowActionTransfer", false, "asset.transactionReasonOpenCheckout"],
  ])
  // A loan that went to repair cannot be returned until the repair closes; the record is the next step.
  const repair = actions({ statusName: "Pending Repair", custodianId: "e-1", openCheckoutId: "co-1", openCheckoutHandoverMode: "temporary_loan", openRepairId: "r-1" })
  assert.equal(repair.primary?.key, "viewRepair")
  assert.deepEqual(repair.transactions.map(brief), [
    ["checkout", "asset.rowActionCheckout", false, "asset.transactionReasonStatusNotReady"],
    ["checkin", "asset.rowActionCheckin", false, "asset.transactionReasonActiveMaintenance"],
    ["transfer", "asset.rowActionTransfer", false, "asset.transactionReasonStatusNotTransferable"],
  ])
  assert.deepEqual(brief(actions({ statusName: "Lost", custodianId: "e-1" }).transactions.find((action) => action.key === "checkin")), ["checkin", "asset.rowActionCheckin", false, "asset.transactionReasonStatusNotReturnable"])
  const stockOut = actions({ ownership: "stock", statusName: "Checked Out", custodianId: "e-1", openCheckoutId: "co-1", openCheckoutHandoverMode: "temporary_loan" })
  assert.deepEqual(stockOut.transactions.map(brief), [
    ["checkout", "asset.quickIssueFromStock", false, "asset.transactionReasonStatusNotReady"],
    ["transfer", "asset.quickMoveStock", false, "asset.transactionReasonOpenCheckout"],
  ])
  // A shared asset waiting for repair can still be moved: a move without a custodian is accepted in that status.
  const sharedRepair = actions({ ownership: "shared", statusName: "Pending Repair" })
  assert.equal(sharedRepair.primary?.key, "recordRepair")
  assert.deepEqual(sharedRepair.transactions.map(brief), [
    ["transfer", "asset.quickRelocateShared", true, null],
    ["checkout", "asset.quickTemporaryHandover", false, "asset.transactionReasonStatusNotReady"],
    ["checkin", "asset.rowActionCheckin", false, "asset.transactionReasonNoReturnRecord"],
  ])
  assert.deepEqual(actions({ ownership: "software_license" }).transactions.map(brief), [["renewLicense", "asset.quickRenewLicense", true, null]])
  assert.deepEqual(actions({ ownership: "component", statusName: "Retired" }).transactions.map(brief), [["transfer", "asset.quickMoveComponent", false, "asset.transactionReasonWrittenOff"]])
  // The primary never repeats in the transactions, and only an unavailable action lacks a link.
  for (const statusName of statuses) {
    for (const ownership of ["personal", "stock", "shared", "component", "software_license"] as const) {
      const set = actions({ ownership, statusName, custodianId: "e-1" })
      assert.ok(!set.transactions.some((action) => action.key === set.primary?.key), `${ownership} ${statusName}`)
      for (const action of all({ ownership, statusName, custodianId: "e-1" })) assert.equal(action.href === null, !action.enabled, `${ownership} ${statusName} ${action.key}`)
    }
  }
})

test("a transfer is offered exactly when the transfer API accepts it (group 1 spec §7.1 \"Transfers follow the API exactly\")", () => {
  for (const ownership of ["personal", "stock", "shared", "component"] as const) {
    for (const statusName of statuses) {
      for (const openCheckoutId of [null, "co-1"]) {
        const transfer = all({ ownership, statusName, custodianId: "e-1", openCheckoutId, openCheckoutHandoverMode: openCheckoutId ? "temporary_loan" : null }).find((action) => action.key === "transfer")!
        // api/assets/[id]/transfer: a custodian (personal) is assign_custodian, a move without one is move_scope; then the open checkout.
        const statusError = getAssetLifecycleTransitionError(ownership === "personal" ? "assign_custodian" : "move_scope", statusName)
        const where = `${ownership} ${statusName} ${openCheckoutId}`
        assert.equal(transfer.enabled, statusError === null && openCheckoutId === null, where)
        assert.equal(
          transfer.reasonKey,
          statusError ? (ownership === "personal" ? "asset.transactionReasonStatusNotTransferable" : "asset.transactionReasonWrittenOff") : openCheckoutId ? "asset.transactionReasonOpenCheckout" : null,
          where,
        )
      }
    }
  }
})

test("a checkout and a return are offered exactly when their APIs accept them", () => {
  for (const ownership of ["personal", "stock", "shared"] as const) {
    for (const statusName of statuses) {
      for (const mode of [null, "temporary_loan", "permanent_assignment"] as const) {
        for (const openRepairId of [null, "r-1"]) {
          for (const custodianId of [null, "e-1"]) {
            const openCheckoutId = mode ? "co-1" : null
            const list = all({ ownership, statusName, custodianId, openCheckoutId, openCheckoutHandoverMode: mode, openRepairId })
            const checkout = list.find((action) => action.key === "checkout")!
            const checkin = list.find((action) => action.key === "checkin")!
            const where = `${ownership} ${statusName} ${mode} ${openRepairId} ${custodianId}`
            // api/assets/[id]/checkout: Ready, then no open checkout.
            assert.equal(checkout.enabled, getAssetLifecycleTransitionError("checkout", statusName) === null && openCheckoutId === null, where)
            if (getAssetLifecycleTransitionError("checkout", statusName) === null && openCheckoutId) assert.equal(checkout.reasonKey, "asset.transactionReasonOpenCheckoutHandover", where)
            // api/assets/[id]/checkin against the open checkout, or api/assets/[id]/legacy-checkout.
            const returnAccepted = (openCheckoutId !== null && getCheckinHandoverStatusError(mode, statusName) === null && openRepairId === null)
              || isLegacyReturnEligible({ statusName, custodianId, hasOpenCheckout: openCheckoutId !== null, hasActiveMaintenance: openRepairId !== null })
            assert.equal(checkin.enabled, returnAccepted, where)
          }
        }
      }
    }
  }
})

test("an action the person may not take is left out, never shown as unavailable (group 1 spec §7.1)", () => {
  const viewer = { assetEdit: false, maintenanceCreate: false, maintenanceView: true, disposalView: true }
  assert.deepEqual(actions({ can: viewer }), { primary: null, transactions: [] })
  assert.deepEqual(actions({ can: viewer, statusName: "In Use", custodianId: "e-1" }), { primary: null, transactions: [] })
  assert.deepEqual(actions({ can: viewer, ownership: "software_license" }), { primary: null, transactions: [] })
  assert.equal(actions({ can: viewer, statusName: "Pending Repair", openRepairId: "r-1" }).primary?.key, "viewRepair")
  assert.equal(actions({ can: { ...viewer, maintenanceView: false }, statusName: "Pending Repair", openRepairId: "r-1" }).primary, null)
  assert.equal(actions({ can: viewer, statusName: "Pending Repair" }).primary, null, "บันทึกซ่อม needs maintenance:create")
  assert.equal(actions({ can: { ...viewer, disposalView: false }, statusName: "Pending Disposal", openDisposalId: "d-1" }).primary, null)
  // A component without asset:edit falls through to the status rules.
  assert.equal(actions({ can: viewer, ownership: "component", statusName: "Pending Repair", openRepairId: "r-1" }).primary?.key, "viewRepair")
})

test("the asset's own pages carry returnTo, the repair and disposal pages none, and a return opens the open handover itself (group 1 spec §7.1)", () => {
  const rt = `returnTo=${encodeURIComponent(base.returnTo)}`
  assert.equal(actions({}).primary?.href, `/th/asset-management/checkout?assetId=a-1&${rt}`)
  assert.equal(actions({}).transactions[0].href, `/th/asset-management/transfer?assetId=a-1&${rt}`)
  assert.equal(actions({ statusName: "Checked Out", custodianId: "e-1", openCheckoutId: "co-1", openCheckoutHandoverMode: "temporary_loan" }).primary?.href, `/th/asset-management/checkin?checkoutId=co-1&${rt}`)
  assert.equal(actions({ statusName: "In Use", custodianId: "e-1" }).primary?.href, `/th/asset-management/checkin?assetId=a-1&${rt}`)
  // The repair and disposal pages go back only to their own lists (normalizeOperationalReturnTo), so their links carry no returnTo.
  assert.equal(actions({ statusName: "Pending Repair", openRepairId: "r-1" }).primary?.href, "/th/maintenance/r-1")
  assert.equal(actions({ statusName: "Pending Repair" }).primary?.href, "/th/maintenance/new?assetId=a-1")
  assert.equal(actions({ statusName: "Pending Disposal", openDisposalId: "d-1" }).primary?.href, "/th/disposal/d-1")
  assert.equal(actions({ ownership: "component" }).primary?.href, `/th/assets/a-1/components?${rt}`)
  const licence = actions({ ownership: "software_license" })
  assert.equal(licence.primary?.href, `/th/assets/a-1/edit?${rt}`)
  assert.equal(licence.transactions[0].href, `/th/assets/a-1/edit?${rt}#asset-warranty-end`)
})

test("บันทึกซ่อม beside the primary follows the one repair rule and maintenance:create, with no returnTo (group 1 spec §7.1)", () => {
  assert.deepEqual(getAssetRecordRepairAction(base), { key: "recordRepair", labelKey: "asset.quickMaintenance", href: "/th/maintenance/new?assetId=a-1", enabled: true, reasonKey: null })
  // Rule 5's primary and the pinned button are the same action.
  assert.deepEqual(actions({ statusName: "Pending Repair" }).primary, getAssetRecordRepairAction({ ...base, statusName: "Pending Repair" }))
  // repair-record-policy.ts: a finished repair of a loaned asset is accepted, an unfinished one is not.
  assert.equal(getAssetRecordRepairAction({ ...base, statusName: "Checked Out", openCheckoutId: "co-1", openCheckoutHandoverMode: "temporary_loan" })?.key, "recordRepair")
  assert.equal(getAssetRecordRepairAction({ ...base, statusName: "Under Maintenance", openRepairId: "r-1" }), null, "one open record per asset")
  for (const statusName of ["Disposed", "Retired"]) assert.equal(getAssetRecordRepairAction({ ...base, statusName }), null, statusName)
  assert.equal(getAssetRecordRepairAction({ ...base, can: { ...base.can, maintenanceCreate: false } }), null)
})

test("the register reads the open records of its rows with these helpers", () => {
  assert.deepEqual(openDisposalRequestWhere, { isActive: true, requestStatus: { in: ["pending", "approved"] } })
  assert.deepEqual([...firstIdByAssetId([{ id: "r-2", assetId: "a" }, { id: "r-1", assetId: "a" }, { id: "r-3", assetId: "b" }])], [["a", "r-2"], ["b", "r-3"]])
})

test("the action words are the spec's, and every key the rule names exists in Thai and English (group 1 spec §5, §7.1)", () => {
  assert.deepEqual(
    ["asset.rowActionCheckout", "asset.quickIssueFromStock", "asset.quickTemporaryHandover", "asset.rowActionCheckin", "asset.rowActionTransfer", "asset.quickMoveStock", "asset.quickRelocateShared", "asset.quickMoveComponent", "asset.manageComponents", "asset.quickAssignLicense", "asset.quickRenewLicense", "asset.quickMaintenance", "asset.actionViewRepair", "asset.actionViewDisposal"].map((key) => message("th", key)),
    ["ส่งมอบ", "เบิกจากคลัง", "ยืมใช้ชั่วคราว", "รับคืน", "โอนย้าย", "ย้ายคลัง/ตำแหน่ง", "ย้ายจุดติดตั้ง", "ย้ายชิ้นส่วน", "จัดการส่วนควบ", "ผูก License", "ต่ออายุ License", "บันทึกซ่อม", "ดูงานซ่อม", "ดูคำขอตัดจำหน่าย"],
  )
  assert.equal(message("th", "asset.transactionReasonWrittenOff"), "ย้ายไม่ได้เมื่อสถานะเป็น ตัดจำหน่ายแล้ว หรือ ปลดระวาง")
  assert.equal(message("th", "asset.transactionReasonOpenCheckoutHandover"), "มีการส่งมอบค้างอยู่ รับคืนก่อนจึงส่งมอบใหม่ได้")
  assert.equal(message("th", "asset.transactionReasonPermission"), undefined, "nobody is shown an action they may not take")
  assert.equal(message("en", "asset.transactionReasonPermission"), undefined)
  const keys = new Set<string>()
  for (const ownership of ["personal", "stock", "shared", "component", "software_license"] as const) {
    for (const statusName of statuses) {
      for (const openCheckoutId of [null, "co-1"]) {
        const input = { ownership, statusName, custodianId: "e-1", openCheckoutId, openCheckoutHandoverMode: openCheckoutId ? "temporary_loan" : null, openRepairId: statusName === "Under Maintenance" ? "r-1" : null, openDisposalId: "d-1" }
        for (const action of [...all(input), getAssetRecordRepairAction({ ...base, ...input })]) {
          if (!action) continue
          keys.add(action.labelKey)
          if (action.reasonKey) keys.add(action.reasonKey)
        }
      }
    }
  }
  for (const key of keys) {
    assert.match(key, /^asset\.\w+$/, `${key} is a full key`)
    assert.equal(typeof message("th", key), "string", `th ${key}`)
    assert.equal(typeof message("en", key), "string", `en ${key}`)
  }
})
