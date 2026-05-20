import assert from "node:assert/strict"
import test from "node:test"

import {
  normalizeGlobalSearchScope,
  scoreGlobalSearchResult,
  sortGlobalSearchResults,
} from "../src/lib/global-search.ts"

test("normalizes global search scope", () => {
  assert.equal(normalizeGlobalSearchScope("asset"), "asset")
  assert.equal(normalizeGlobalSearchScope("all"), "all")
  assert.equal(normalizeGlobalSearchScope("unexpected"), "all")
})

test("scores exact and prefix matches ahead of loose metadata matches", () => {
  const exact = { id: "1", type: "asset", title: "SNI-EQU-26-0001", subtitle: "Printer", href: "/th/assets/1" }
  const prefix = { id: "2", type: "employee", title: "SNI User", subtitle: "IT", href: "/th/master-data/employees/2" }
  const metadata = {
    id: "3",
    type: "supplier",
    title: "Vendor",
    subtitle: "Printer service",
    href: "/th/master-data/suppliers/3",
    metadata: [{ label: "Email", value: "contact@sni.example" }],
  }

  assert.ok(scoreGlobalSearchResult(exact, "SNI-EQU-26-0001") > scoreGlobalSearchResult(prefix, "SNI-EQU-26-0001"))
  assert.ok(scoreGlobalSearchResult(prefix, "sni") > scoreGlobalSearchResult(metadata, "sni"))
})

test("sorts global search results by relevance and limit", () => {
  const results = sortGlobalSearchResults(
    [
      { id: "supplier", type: "supplier", title: "Supplier Sonic", subtitle: "Vendor", href: "/supplier" },
      { id: "asset", type: "asset", title: "SNI-EQU-26-0001", subtitle: "Sonic printer", href: "/asset" },
      { id: "employee", type: "employee", title: "Sonic User", subtitle: "IT", href: "/employee" },
    ],
    "SNI",
    2
  )

  assert.deepEqual(results.map((result) => result.id), ["asset", "employee"])
})
