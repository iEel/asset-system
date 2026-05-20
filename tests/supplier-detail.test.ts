import assert from "node:assert/strict"
import test from "node:test"

import {
  buildSupplierDetailHrefs,
  buildSupplierDetailSummary,
  buildSupplierFollowUpItems,
} from "../src/lib/supplier-detail.ts"

test("builds supplier profile drilldown hrefs", () => {
  assert.deepEqual(buildSupplierDetailHrefs({ locale: "th", supplierId: "supplier-1" }), {
    list: "/th/master-data/suppliers",
    edit: "/th/master-data/suppliers/supplier-1/edit",
    assets: "/th/assets?supplierId=supplier-1&page=1",
  })
})

test("summarizes supplier relationships and costs", () => {
  assert.deepEqual(
    buildSupplierDetailSummary({
      assetCount: 8,
      purchaseDocumentCount: 3,
      maintenanceTicketCount: 5,
      openMaintenanceTicketCount: 2,
      purchaseAmount: 120000,
      maintenanceCost: 15000,
    }),
    {
      assetCount: 8,
      purchaseDocumentCount: 3,
      maintenanceTicketCount: 5,
      openMaintenanceTicketCount: 2,
      purchaseAmount: 120000,
      maintenanceCost: 15000,
      attentionCount: 2,
    }
  )
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
