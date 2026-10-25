import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  globalSearchGroupOrder,
  groupGlobalSearchResults,
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

const read = (path: string) => readFileSync(path, "utf8").replace(/\r/g, "")
test("results group in the shell's type order and keep their rank inside a group (menu B shell task 8)", () => {
  assert.deepEqual([...globalSearchGroupOrder], ["asset", "maintenance", "audit", "disposal", "employee", "location", "supplier", "company", "branch"])
  const r = (type: "asset" | "supplier", id: string) => ({ id, type })
  assert.deepEqual(groupGlobalSearchResults([r("supplier", "s1"), r("asset", "a2"), r("supplier", "s2"), r("asset", "a1")]).map((g) => [g.type, g.results.map((x) => x.id)]), [["asset", ["a2", "a1"]], ["supplier", ["s1", "s2"]]])
})
test("the route counts assets with the register's search only for scope=all and 2+ characters (menu B shell task 8)", () => {
  const route = read("src/app/api/search/route.ts")
  assert.match(route, /if \(query\.length < globalSearchMinChars\) return NextResponse\.json\(\{ results: \[\], scope, assetTotal: null \}\)/)
  assert.match(route, /const canSearchAssets = hasPermission\(user, "asset", "view"\)/)
  assert.match(route, /scope === "all" && canSearchAssets \? prisma\.asset\.count\(\{ where: buildAssetSearchWhere\(query\) \}\) : Promise\.resolve\(null\)/)
  assert.match(route, /results: sortGlobalSearchResults\(results\.flat\(\), query, scope === "asset" \? 8 : 14\),\s*scope,\s*assetTotal,/)
  assert.match(route, /audit: "รอบตรวจนับ",/)
  assert.match(route, /import \{ assetSearchConditions, buildAssetSearchWhere \} from "@\/lib\/asset-list-query"/)
  assert.match(route, /OR: assetSearchConditions\(query\)/)
  assert.doesNotMatch(route, /\{ brand: \{ name: \{ contains: query \} \} \}/, "one list of asset search fields")
})
