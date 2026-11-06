import assert from "node:assert/strict"
import test from "node:test"

import {
  buildSupplierDetailHrefs,
  buildSupplierFollowUpItems,
} from "../src/lib/supplier-detail.ts"

test("builds supplier profile drilldown hrefs", () => {
  assert.deepEqual(buildSupplierDetailHrefs({ locale: "th", supplierId: "supplier-1" }), {
    list: "/th/master-data/suppliers",
    edit: "/th/master-data/suppliers/supplier-1/edit",
    assets: "/th/assets?supplierId=supplier-1&page=1",
  })
})

test("builds supplier follow-up items", () => {
  assert.deepEqual(
    buildSupplierFollowUpItems({
      hasContact: false,
      assetsWithoutDocument: 4,
      openMaintenanceTicketCount: 2,
    }),
    ["missing_contact", "assets_without_purchase_documents", "open_vendor_maintenance"]
  )
})

// G8P3-R3, as the strip's ทรัพย์สิน foot: an active asset with no active purchase document is the item, even when the
// supplier has other documents; every asset linked is no item, even with no document of the supplier's own.
test("the assets-without-documents item follows the strip's count (G8P3-R3)", () => {
  assert.deepEqual(buildSupplierFollowUpItems({ hasContact: true, assetsWithoutDocument: 1, openMaintenanceTicketCount: 0 }), ["assets_without_purchase_documents"])
  assert.deepEqual(buildSupplierFollowUpItems({ hasContact: true, assetsWithoutDocument: 0, openMaintenanceTicketCount: 0 }), [])
})
