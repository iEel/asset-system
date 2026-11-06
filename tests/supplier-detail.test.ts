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
      assetCount: 4,
      purchaseDocumentCount: 0,
      openMaintenanceTicketCount: 2,
    }),
    ["missing_contact", "assets_without_purchase_documents", "open_vendor_maintenance"]
  )
})
