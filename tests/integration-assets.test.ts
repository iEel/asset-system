import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  buildIntegrationAssetOrderBy,
  buildIntegrationAssetWhere,
  parseIntegrationAssetListParams,
  toIntegrationAssetDto,
} from "../src/lib/integration-assets.ts"

test("parses bounded read-only asset query filters for external systems", () => {
  const filters = parseIntegrationAssetListParams(
    new URLSearchParams({
      q: "monitor",
      assetTag: " SNI-EQU-26-0087 ",
      serialNumber: "ABC123",
      employeeCode: "8044",
      companyCode: "SONIC",
      branchCode: "SathuPradit",
      locationCode: "IT_FL1",
      status: "in_use",
      condition: "normal",
      limit: "999",
      page: "3",
      includeInactive: "false",
    })
  )

  assert.equal(filters.q, "monitor")
  assert.equal(filters.assetTag, "SNI-EQU-26-0087")
  assert.equal(filters.employeeCode, "8044")
  assert.equal(filters.limit, 100)
  assert.equal(filters.page, 3)
  assert.equal(filters.includeInactive, false)
})

test("builds safe Prisma where/order inputs for integration asset lists", () => {
  const filters = parseIntegrationAssetListParams({
    q: "apc",
    employeeCode: "8044",
    companyCode: "SONIC",
    branchCode: "PIN",
    locationCode: "OFFICE",
    status: "ready",
    condition: "normal",
  })

  assert.deepEqual(buildIntegrationAssetWhere(filters), {
    isActive: true,
    custodian: { code: { contains: "8044" } },
    company: { code: { contains: "SONIC" } },
    branch: { code: { contains: "PIN" } },
    currentLocation: { code: { contains: "OFFICE" } },
    status: {
      OR: [{ name: { contains: "ready" } }, { nameTh: { contains: "ready" } }],
    },
    condition: {
      OR: [{ name: { contains: "normal" } }, { nameTh: { contains: "normal" } }],
    },
    OR: [
      { assetTag: { contains: "apc" } },
      { name: { contains: "apc" } },
      { serialNumber: { contains: "apc" } },
      { fixedAssetCode: { contains: "apc" } },
      { custodian: { code: { contains: "apc" } } },
    ],
  })
  assert.deepEqual(buildIntegrationAssetOrderBy(), [{ updatedAt: "desc" }, { assetTag: "asc" }])
})

test("maps assets to a stable integration DTO without sensitive accounting or supplier data", () => {
  const dto = toIntegrationAssetDto({
    id: "asset-1",
    assetTag: "SNI-EQU-26-0087",
    name: "APC EASY UPS BVX700LUI-MS",
    serialNumber: "9B2523A01208",
    fixedAssetCode: "FA-001",
    ownershipType: "personal",
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-06-14T04:00:00.000Z"),
    purchasePrice: 120000,
    poNumber: "PO-SECRET",
    invoiceNumber: "INV-SECRET",
    supplier: { code: "TAX", name: "Supplier" },
    category: { code: "UPS", name: "UPS - เครื่องสำรองไฟ" },
    brand: { name: "APC" },
    model: { name: "BVX700LUI-MS" },
    company: { code: "SNI", nameTh: "SONIC" },
    branch: { code: "PIN", name: "Pinthong", company: { code: "SNI" } },
    department: { code: "IT", name: "IT" },
    custodian: {
      code: "8044",
      fullNameTh: "HARUTHAI PHOSRI",
      company: { code: "SNI", nameTh: "SONIC" },
      branch: { code: "PIN", name: "Pinthong", company: { code: "SNI" } },
      department: { code: "IT", name: "IT" },
    },
    currentLocation: {
      code: "OFFICE",
      name: "Container Yard - OFFICE",
      branch: { code: "PIN", name: "Pinthong", company: { code: "SNI" } },
    },
    homeLocation: {
      code: "OFFICE",
      name: "Container Yard - OFFICE",
      branch: { code: "PIN", name: "Pinthong", company: { code: "SNI" } },
    },
    status: { name: "in_use", nameTh: "ใช้งานอยู่", colorCode: "#16a34a" },
    condition: { name: "normal", nameTh: "ปกติ", colorCode: "#16a34a" },
  } as never)

  assert.equal(dto.assetTag, "SNI-EQU-26-0087")
  assert.equal(dto.custodian?.employeeCode, "8044")
  assert.equal(dto.currentLocation.branch.companyCode, "SNI")
  assert.equal("purchasePrice" in dto, false)
  assert.equal("poNumber" in dto, false)
  assert.equal("invoiceNumber" in dto, false)
  assert.equal("supplier" in dto, false)
})

test("integration asset routes require the read-only asset scope", () => {
  const listRoute = readFileSync("src/app/api/integrations/v1/assets/route.ts", "utf8")
  const detailRoute = readFileSync("src/app/api/integrations/v1/assets/[assetTag]/route.ts", "utf8")

  assert.match(listRoute, /requireIntegrationScope\(request,\s*"asset:read"/)
  assert.match(detailRoute, /requireIntegrationScope\(request,\s*"asset:read"/)
  assert.doesNotMatch(listRoute + detailRoute, /POST|PUT|PATCH|DELETE/)
})
