import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import test from "node:test"

// Plan 2B-2 Task 12 (spec 2B §5.4, R-k): the repair-record list draws the shared Pagination from the range helper it
// already had, and maintenance-pagination.tsx went with its last caller. Sources are read with \r: no regex holds \n.
test("maintenance pagination exposes exact range, page size, and navigation", async () => {
  const source = await readFile("src/app/[locale]/(dashboard)/maintenance/page.tsx", "utf8")
  assert.match(source, /const pagination = buildMaintenancePagination\(filters\.page, filters\.pageSize, total\)/)
  assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(\(value\) => \(\{ value, href: buildMaintenancePageHref\(locale, listQuery, \{ pageSize: value, page: 1 \}\) \}\)\)\}/)
  assert.match(source, /previousHref=\{buildMaintenancePageHref\(locale, listQuery, \{ page: pagination\.page - 1 \}\)\}/)
  assert.match(source, /nextHref=\{buildMaintenancePageHref\(locale, listQuery, \{ page: pagination\.page \+ 1 \}\)\}/)
  assert.match(source, /range: tCommon\("showingRange", \{ from: formatCount\(pagination\.start\), to: formatCount\(pagination\.end\), total: formatCount\(pagination\.total\) \}\)/)
  const pagination = await readFile("src/components/ui/pagination.tsx", "utf8")
  assert.match(pagination, /<p aria-live="polite"/, "the range and page line is still announced when it changes (R-k)")
})

test("maintenance list renders pagination", async () => {
  const source = await readFile("src/app/[locale]/(dashboard)/maintenance/page.tsx", "utf8")
  assert.match(source, /<DataTableFoot>/)
  assert.match(source, /<Pagination\b/)
  assert.equal(existsSync("src/components/maintenance/maintenance-pagination.tsx"), false, "the local pager went with its last caller")
})

test("maintenance APIs return exact paginated envelopes", async () => {
  const ticketRoute = await readFile("src/app/api/maintenance-tickets/route.ts", "utf8")
  const planRoute = await readFile("src/app/api/maintenance-plans/route.ts", "utf8")
  for (const source of [ticketRoute, planRoute]) {
    assert.match(source, /request\.nextUrl\.searchParams/)
    assert.match(source, /skip:/)
    assert.match(source, /take:/)
    assert.match(source, /total/)
    assert.match(source, /pageSize/)
  }
})

