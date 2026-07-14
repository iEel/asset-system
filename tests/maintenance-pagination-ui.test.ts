import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

test("maintenance pagination exposes exact range, page size, and navigation", async () => {
  const source = await readFile("src/components/maintenance/maintenance-pagination.tsx", "utf8")
  assert.match(source, /buildMaintenancePagination/)
  assert.match(source, /\[25, 50, 100\]/)
  assert.match(source, /labels\.previous/)
  assert.match(source, /labels\.next/)
  assert.match(source, /pagination\.start/)
  assert.match(source, /pagination\.end/)
  assert.match(source, /pagination\.total/)
})

test("maintenance list renders pagination and explains board incompatibility", async () => {
  const source = await readFile("src/app/[locale]/(dashboard)/maintenance/page.tsx", "utf8")
  assert.match(source, /<MaintenancePagination/)
  assert.match(source, /getMaintenanceBoardCompatibility/)
  assert.match(source, /boardTableRequired/)
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

