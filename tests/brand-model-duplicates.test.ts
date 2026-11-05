import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  canReadSimilarNames,
  findBrandNameClash,
  findModelNameClash,
  isSimilarName,
  listSimilarBrands,
  listSimilarModels,
  nameClashBody,
  type BrandNameDb,
  type ModelNameDb,
} from "../src/lib/brand-model-duplicates.ts"
import { brandSchema, assetModelSchema } from "../src/lib/validations/brand-model.ts"

// Page group 7 plan 1 Task 1: one duplicate rule for brands and models (spec §4.1, G7P1-R1, G7P1-R2). Sources are read
// with LF endings so CRLF and LF checkouts pin alike.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

type Row = { id: string; name: string; isActive: boolean; brandId?: string }

function brandDb(rows: Row[]): BrandNameDb & { calls: unknown[] } {
  const calls: unknown[] = []
  return {
    calls,
    assetBrand: {
      findMany: async (args) => {
        calls.push(args)
        return rows.map(({ id, name, isActive }) => ({ id, name, isActive }))
      },
    },
  }
}

function modelDb(rows: Row[]): ModelNameDb & { calls: unknown[] } {
  const calls: unknown[] = []
  return {
    calls,
    assetModel: {
      findMany: async (args) => {
        calls.push(args)
        return rows
          .filter((row) => row.brandId === args.where.brandId)
          .map(({ id, name, isActive }) => ({ id, name, isActive }))
      },
    },
  }
}

const BRANDS: Row[] = [
  { id: "b-dell", name: "Dell", isActive: true },
  { id: "b-hp", name: "HP", isActive: true },
  { id: "b-old", name: "Acer", isActive: false },
]

test("findBrandNameClash: one brand per normalized name, active or inactive, never the record itself", async () => {
  for (const typed of ["dell", " DELL ", "D-E-L-L", "d.e l_l"]) {
    assert.deepEqual(await findBrandNameClash(brandDb(BRANDS), typed), { id: "b-dell", name: "Dell", isActive: true }, typed)
  }
  assert.deepEqual(await findBrandNameClash(brandDb(BRANDS), "ACER"), { id: "b-old", name: "Acer", isActive: false })
  assert.equal(await findBrandNameClash(brandDb(BRANDS), "Lenovo"), null)
  assert.equal(await findBrandNameClash(brandDb(BRANDS), "dell", "b-dell"), null, "excludeId: a rename of itself")
  assert.equal(await findBrandNameClash(brandDb(BRANDS), "  "), null)
  const db = brandDb(BRANDS)
  await findBrandNameClash(db, "dell")
  assert.deepEqual(db.calls[0], { select: { id: true, name: true, isActive: true } }, "reads every brand, active and inactive")
})

test("findModelNameClash: within the brand only", async () => {
  const models: Row[] = [
    { id: "m-1", name: "Latitude 5420", isActive: true, brandId: "b-dell" },
    { id: "m-2", name: "Old (Gen-1)", isActive: false, brandId: "b-dell" },
    { id: "m-3", name: "Latitude5420", isActive: true, brandId: "b-other" },
  ]
  assert.deepEqual(await findModelNameClash(modelDb(models), "b-dell", "Latitude5420"), { id: "m-1", name: "Latitude 5420", isActive: true })
  assert.deepEqual(await findModelNameClash(modelDb(models), "b-dell", "old gen1"), { id: "m-2", name: "Old (Gen-1)", isActive: false })
  assert.equal(await findModelNameClash(modelDb(models), "b-hp", "Latitude 5420"), null)
  assert.equal(await findModelNameClash(modelDb(models), "b-dell", "latitude 5420", "m-1"), null)
  const db = modelDb(models)
  await findModelNameClash(db, "b-dell", "x")
  assert.deepEqual(db.calls[0], { where: { brandId: "b-dell" }, select: { id: true, name: true, isActive: true } })
})

test("isSimilarName: the rule, or one normalized name containing the other", () => {
  assert.equal(isSimilarName("HP", "HPE"), true)
  assert.equal(isSimilarName("HPE", "hp"), true)
  assert.equal(isSimilarName("Dell", "d-e-l-l"), true)
  assert.equal(isSimilarName("HP", "Dell"), false)
  assert.equal(isSimilarName("", "Dell"), false)
  assert.equal(isSimilarName(" - ", "Dell"), false)
})

test("the similar lists: at most 8, active first, then by name (G7P1-R2)", async () => {
  const rows: Row[] = [
    { id: "1", name: "HP Inc", isActive: false },
    { id: "2", name: "HPE", isActive: true },
    { id: "3", name: "HP", isActive: true },
    { id: "4", name: "Dell", isActive: true },
    ...Array.from({ length: 10 }, (_, index) => ({ id: `x${index}`, name: `HP ${String.fromCharCode(65 + index)}`, isActive: true })),
  ]
  const list = await listSimilarBrands(brandDb(rows), "hp")
  assert.equal(list.length, 8)
  assert.ok(list.every((item) => item.isActive), "the inactive one falls past the cap")
  assert.deepEqual(list.slice(0, 3).map((item) => item.name), ["HP", "HP A", "HP B"])
  assert.deepEqual(
    (await listSimilarBrands(brandDb(rows.slice(0, 4)), "hp")).map((item) => item.name),
    ["HP", "HPE", "HP Inc"],
  )
  assert.deepEqual(await listSimilarBrands(brandDb(rows), " "), [])

  const models: Row[] = [
    { id: "m-1", name: "Latitude 5420", isActive: true, brandId: "b-dell" },
    { id: "m-2", name: "Latitude 5420 Rugged", isActive: false, brandId: "b-dell" },
    { id: "m-3", name: "Latitude 5420", isActive: true, brandId: "b-other" },
  ]
  assert.deepEqual(
    (await listSimilarModels(modelDb(models), "b-dell", "latitude5420")).map((item) => item.id),
    ["m-1", "m-2"],
  )
})

test("the clash body (G7P1-R1) and the similar read's permission: brand:view or asset:create", () => {
  const body = nameClashBody("brand", { id: "b-dell", name: "Dell", isActive: false })
  assert.equal(body.code, "BRAND_NAME_EXISTS")
  assert.equal(body.field, "name")
  assert.deepEqual(body.existing, { id: "b-dell", name: "Dell", isActive: false })
  assert.deepEqual(body.fieldErrors, { name: "duplicate" })
  assert.equal(nameClashBody("model", { id: "m", name: "X", isActive: true }).code, "MODEL_NAME_EXISTS")

  const grants = (list: string[]) => (module: string, action: string) => list.includes(`${module}:${action}`)
  assert.equal(canReadSimilarNames(grants([])), false)
  assert.equal(canReadSimilarNames(grants(["asset:view", "brand:create"])), false)
  assert.equal(canReadSimilarNames(grants(["brand:view"])), true)
  assert.equal(canReadSimilarNames(grants(["asset:create"])), true)
})

test("the schemas take an optional source that defaults to master-data", () => {
  assert.equal(brandSchema.parse({ name: "Dell" }).source, "master-data")
  assert.equal(brandSchema.parse({ name: "Dell", source: "asset-form" }).source, "asset-form")
  assert.throws(() => brandSchema.parse({ name: "Dell", source: "x" }))
  assert.equal(assetModelSchema.parse({ name: "M", categoryId: "c", brandId: "b" }).source, "master-data")
})

const ROUTES = [
  { path: "src/app/api/brands/route.ts", fn: "POST", finder: /findBrandNameClash\(prisma, data\.name\)/, call: "prisma.assetBrand.create", kind: "brand" },
  { path: "src/app/api/brands/[id]/route.ts", fn: "PUT", finder: /findBrandNameClash\(prisma, data\.name, id\)/, call: "prisma.assetBrand.update", kind: "brand" },
  { path: "src/app/api/models/route.ts", fn: "POST", finder: /findModelNameClash\(prisma, data\.brandId, data\.name\)/, call: "prisma.assetModel.create", kind: "model" },
  { path: "src/app/api/models/[id]/route.ts", fn: "PUT", finder: /findModelNameClash\(prisma, data\.brandId, data\.name, id\)/, call: "prisma.assetModel.update", kind: "model" },
]

test("the four routes check the rule before they write, answer 409 with the clash body, and keep the unique-key fallback", () => {
  for (const route of ROUTES) {
    const source = read(route.path)
    const start = source.indexOf(`export async function ${route.fn}`)
    assert.ok(start >= 0, `${route.path}: no ${route.fn}`)
    const end = source.indexOf("export async function", start + 1)
    const body = source.slice(start, end < 0 ? undefined : end)
    const finder = body.search(route.finder)
    assert.ok(finder >= 0, `${route.path}: the clash finder`)
    assert.ok(finder < body.indexOf(route.call), `${route.path}: the check comes before ${route.call}`)
    assert.match(body, new RegExp(`NextResponse\\.json\\(nameClashBody\\("${route.kind}", clash\\), \\{ status: 409 \\}\\)`), route.path)
    assert.match(body, /isPrismaUniqueConstraintError\(error\)\) return uniqueConflictResponse/, `${route.path}: the fallback`)
    assert.match(body, /const \{ source(?:: _source)?, \.\.\.data \} = input/, `${route.path}: source is not stored`)
  }
  for (const path of ["src/app/api/brands/route.ts", "src/app/api/models/route.ts"]) {
    assert.match(read(path), /newValue: \{ \.\.\.data, source \}/, `${path}: the log names the source`)
  }
})

test("the similar route: kind brand or model, q under 2 answers [], brandId for models, either permission", () => {
  const source = read("src/app/api/brand-models/similar/route.ts")
  assert.match(source, /export async function GET/)
  assert.match(source, /canReadSimilarNames\(\(module, action\) => hasPermission\(user, module, action\)\)/)
  assert.match(source, /throw new Error\("Forbidden: insufficient permissions"\)/)
  assert.match(source, /q\.length < 2/)
  assert.match(source, /listSimilarBrands\(prisma/)
  assert.match(source, /listSimilarModels\(prisma/)
  assert.match(source, /NextResponse\.json\(\{ data/)
})

// Final review fix 1: a normalized group with an active and an inactive record names the active one, so the form offers
// "ใช้ {name}" and not "เปิดใช้งาน"; then by name for a stable answer.
test("findBrandNameClash / findModelNameClash: an active record wins over an inactive one of the same normalized name", async () => {
  const brands: Row[] = [
    { id: "b-old", name: "DELL", isActive: false },
    { id: "b-new", name: "Dell", isActive: true },
  ]
  assert.deepEqual(await findBrandNameClash(brandDb(brands), "dell"), { id: "b-new", name: "Dell", isActive: true })
  assert.deepEqual(await findBrandNameClash(brandDb([...brands].reverse()), "dell"), { id: "b-new", name: "Dell", isActive: true })
  const twoInactive: Row[] = [
    { id: "b-2", name: "Dell", isActive: false },
    { id: "b-1", name: "DELL", isActive: false },
  ]
  assert.equal((await findBrandNameClash(brandDb(twoInactive), "dell"))?.id, "b-2", "then by name (Dell before DELL)")
  const models: Row[] = [
    { id: "m-old", name: "Latitude 5420", isActive: false, brandId: "b1" },
    { id: "m-new", name: "Latitude5420", isActive: true, brandId: "b1" },
  ]
  assert.equal((await findModelNameClash(modelDb(models), "b1", "latitude 5420"))?.id, "m-new")
})
