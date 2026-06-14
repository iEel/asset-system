import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  buildIntegrationAssetChangeWhere,
  decodeIntegrationChangeCursor,
  encodeIntegrationChangeCursor,
  parseIntegrationAssetChangeParams,
} from "../src/lib/integration-assets.ts"
import {
  toIntegrationBranchDto,
  toIntegrationCompanyDto,
  toIntegrationLocationDto,
  toIntegrationStatusDto,
} from "../src/lib/integration-reference.ts"

test("encodes and decodes stable integration change-feed cursors", () => {
  const cursor = encodeIntegrationChangeCursor({ updatedAt: "2026-06-14T04:00:00.000Z", id: "asset-1" })

  assert.deepEqual(decodeIntegrationChangeCursor(cursor), {
    updatedAt: "2026-06-14T04:00:00.000Z",
    id: "asset-1",
  })
  assert.equal(decodeIntegrationChangeCursor("bad-cursor"), null)
})

test("builds change-feed where input from updatedSince and cursor", () => {
  const filters = parseIntegrationAssetChangeParams({
    updatedSince: "2026-06-14T01:00:00.000Z",
    cursor: encodeIntegrationChangeCursor({ updatedAt: "2026-06-14T04:00:00.000Z", id: "asset-1" }),
    limit: "700",
  })

  assert.equal(filters.limit, 500)
  assert.deepEqual(buildIntegrationAssetChangeWhere(filters), {
    AND: [
      { updatedAt: { gte: new Date("2026-06-14T01:00:00.000Z") } },
      {
        OR: [
          { updatedAt: { gt: new Date("2026-06-14T04:00:00.000Z") } },
          { updatedAt: new Date("2026-06-14T04:00:00.000Z"), id: { gt: "asset-1" } },
        ],
      },
    ],
  })
})

test("maps reference rows to compact integration DTOs", () => {
  assert.deepEqual(toIntegrationStatusDto({ id: "status-1", name: "ready", nameTh: "พร้อมใช้งาน", colorCode: "#16a34a", sortOrder: 1, isActive: true }), {
    id: "status-1",
    code: "ready",
    nameTh: "พร้อมใช้งาน",
    colorCode: "#16a34a",
    sortOrder: 1,
    isActive: true,
  })
  assert.deepEqual(toIntegrationCompanyDto({ id: "company-1", code: "SNI", nameTh: "SONIC", nameEn: "SONIC", isActive: true }), {
    id: "company-1",
    code: "SNI",
    nameTh: "SONIC",
    nameEn: "SONIC",
    isActive: true,
  })
  assert.deepEqual(toIntegrationBranchDto({ id: "branch-1", code: "HQ", name: "สำนักงานใหญ่", isActive: true, company: { code: "SNI", nameTh: "SONIC" } }), {
    id: "branch-1",
    code: "HQ",
    name: "สำนักงานใหญ่",
    isActive: true,
    company: { code: "SNI", nameTh: "SONIC" },
  })
  assert.deepEqual(toIntegrationLocationDto({ id: "loc-1", code: "IT_FL1", name: "IT ชั้น 1", locationType: "Floor", isActive: true, branch: { code: "HQ", name: "สำนักงานใหญ่", company: { code: "SNI", nameTh: "SONIC" } } }), {
    id: "loc-1",
    code: "IT_FL1",
    name: "IT ชั้น 1",
    locationType: "Floor",
    isActive: true,
    branch: { code: "HQ", name: "สำนักงานใหญ่", company: { code: "SNI", nameTh: "SONIC" } },
  })
})

test("integration change/reference routes require read-only scopes", () => {
  const routeFiles = [
    "src/app/api/integrations/v1/assets/changes/route.ts",
    "src/app/api/integrations/v1/reference/statuses/route.ts",
    "src/app/api/integrations/v1/reference/locations/route.ts",
    "src/app/api/integrations/v1/reference/companies/route.ts",
    "src/app/api/integrations/v1/reference/branches/route.ts",
  ]
  const sources = routeFiles.map((file) => readFileSync(file, "utf8")).join("\n")

  assert.match(sources, /requireIntegrationScope\(request,\s*"asset:read"/)
  assert.match(sources, /requireIntegrationScope\(request,\s*"reference:read"/)
  assert.doesNotMatch(sources, /POST|PUT|PATCH|DELETE/)
})
