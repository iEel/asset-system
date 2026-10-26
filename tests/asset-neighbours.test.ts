import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { buildRegisterCrumbLabel, parseRegisterReturnTo, pickAssetNeighbours } from "../src/lib/asset-neighbours-rules.ts"
import { parseAssetListParams } from "../src/lib/asset-list-query.ts"
import { buildAssetRegisterClearAllHref } from "../src/lib/asset-register-chips.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("only a register address gives previous and next; opened directly, from the scan page or any other page gives none (group 1 spec §7.2)", () => {
  for (const raw of [undefined, "", [], "/th/asset-management/scan", "/th/assets/asset-2", "/th/assets/asset-2?view=history", "/th/dashboard", "/en/assets?search=nb", "https://evil.example/th/assets?search=nb", "//evil.example/th/assets"]) {
    assert.equal(parseRegisterReturnTo(raw, "th"), null, String(raw))
  }
  // The plain register is told apart from "opened directly": it gives the whole list.
  assert.equal(parseRegisterReturnTo("/th/assets", "th")?.toString(), "")
  assert.equal(parseRegisterReturnTo("/th/assets?search=notebook&page=2&pageSize=25", "th")?.get("search"), "notebook")
  assert.equal(parseRegisterReturnTo(["/th/assets?search=a", "/th/dashboard"], "th")?.get("search"), "a")
  assert.equal(parseRegisterReturnTo("/en/assets?locationId=l-1", "en")?.get("locationId"), "l-1")
})

test("the middle crumb names the search, else says the list is filtered, else is left out (group 1 spec §7.2)", () => {
  const crumb = (query: string) => buildRegisterCrumbLabel(new URLSearchParams(query))
  assert.deepEqual(crumb("search=notebook&statusId=s-1&page=2"), { kind: "search", text: "notebook" })
  assert.deepEqual(crumb("statusId=s-1"), { kind: "filters" })
  assert.equal(crumb("search=%20%20"), null, "a blank search is no search")
  assert.equal(crumb("sort=name&direction=asc&page=3&pageSize=50"), null, "the order, the page and the page size are not filters")
  assert.equal(crumb("dataQuality=bogus&ownershipType=bogus"), null, "a value the register ignores is not a filter")
  // Every filter the register can clear is a filter here, and a cleared list has none.
  const everyFilter = "companyId=c&branchId=b&categoryId=k&brandId=br&modelId=m&statusId=s&conditionId=co&ownershipType=stock&custodianId=e&custodianState=assigned&locationId=l&supplierId=sp&dataQuality=serial&crossScope=all&activity=idle_180d"
  for (const pair of everyFilter.split("&")) assert.deepEqual(crumb(pair), { kind: "filters" }, pair)
  const cleared = buildAssetRegisterClearAllHref("/th/assets", parseAssetListParams(new URLSearchParams(everyFilter)))
  assert.equal(crumb(cleared.slice(cleared.indexOf("?") + 1)), null)
})

test("previous and next follow the list's order; the first has no previous, the last no next, an asset outside the list none (group 1 spec §7.2)", () => {
  const ids = ["a", "b", "c"]
  assert.deepEqual(pickAssetNeighbours(ids, "a"), { index: 1, total: 3, previousId: null, nextId: "b" })
  assert.deepEqual(pickAssetNeighbours(ids, "b"), { index: 2, total: 3, previousId: "a", nextId: "c" })
  assert.deepEqual(pickAssetNeighbours(ids, "c"), { index: 3, total: 3, previousId: "b", nextId: null })
  assert.deepEqual(pickAssetNeighbours(["a"], "a"), { index: 1, total: 1, previousId: null, nextId: null })
  assert.equal(pickAssetNeighbours(ids, "z"), null)
  assert.equal(pickAssetNeighbours([], "a"), null)
})

test("the neighbours read the register's own where and order, ids only (group 1 spec §7.2)", () => {
  const source = read("src/lib/asset-neighbours.ts")
  assert.match(source, /const filters = parseAssetListParams\(params\)/)
  assert.match(source, /const \{ where \} = await buildAssetRegisterWhere\(filters\)/)
  assert.match(source, /prisma\.asset\.findMany\(\{\s*where,\s*orderBy: buildAssetOrderBy\(filters\),\s*select: \{ id: true \},?\s*\}\)/)
  assert.match(source, /return pickAssetNeighbours\(rows\.map\(\(row\) => row\.id\), assetId\)/)
  assert.match(source, /withPerformanceTiming\(\s*"asset-detail\.neighbours"/)
  assert.doesNotMatch(source, /include:|skip:|take:/, "never whole rows")
  assert.doesNotMatch(read("src/lib/asset-neighbours-rules.ts"), /from "@\/|\bprisma\./, "the rules stay pure")
  const register = read("src/app/[locale]/(dashboard)/assets/page.tsx")
  assert.match(register, /orderBy: buildAssetOrderBy\(filters\),/)
})
