import test from "node:test"
import assert from "node:assert/strict"

import { filterApprovalInboxItems, parseApprovalInboxFilter } from "../src/lib/approval-inbox-filter.ts"
import type { ApprovalInboxItem } from "../src/lib/approval-inbox.ts"

const baseItem = {
  id: "item-1",
  kind: "disposal_review",
  recordId: "record-1",
  title: "Item",
  description: "Description",
  requestedBy: "User",
  requestedAt: new Date("2026-05-01T00:00:00.000Z"),
  actionLabel: "Open",
  href: "/th/admin/approvals",
  tone: "warning",
} satisfies Omit<ApprovalInboxItem, "module">

test("parses approval inbox filter safely", () => {
  assert.equal(parseApprovalInboxFilter("disposal"), "disposal")
  assert.equal(parseApprovalInboxFilter("maintenance"), "maintenance")
  assert.equal(parseApprovalInboxFilter("audit"), "audit")
  assert.equal(parseApprovalInboxFilter("unknown"), "all")
  assert.equal(parseApprovalInboxFilter(undefined), "all")
  assert.equal(parseApprovalInboxFilter(["audit", "disposal"]), "audit")
})

test("filters approval inbox items by module", () => {
  const items: ApprovalInboxItem[] = [
    { ...baseItem, id: "disposal", module: "disposal" },
    { ...baseItem, id: "maintenance", module: "maintenance" },
    { ...baseItem, id: "audit", module: "audit" },
  ]

  assert.deepEqual(filterApprovalInboxItems(items, "all").map((item) => item.id), ["disposal", "maintenance", "audit"])
  assert.deepEqual(filterApprovalInboxItems(items, "audit").map((item) => item.id), ["audit"])
})
