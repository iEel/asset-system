import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  readRecentBrandModels,
  recentAddedWindowStart,
  type RecentBrandModelDb,
} from "../src/lib/brand-model-recent.ts"
import { buildBrandModelQueryString, parseBrandModelListParams } from "../src/lib/brand-model-query.ts"

// Page group 7 plan 1 Task 4: the brands page gains "เพิ่มล่าสุด", "ปิดใช้งาน" with a confirm, the model photo fallback
// and a phone view (spec §4.3, G7P1-R3). Sources are read with LF endings so CRLF and LF checkouts pin alike.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const PAGE = "src/app/[locale]/(dashboard)/master-data/brands/page.tsx"
const DAY = 86_400_000

// 2026-11-05 10:00 Bangkok.
const NOW = new Date("2026-11-05T03:00:00.000Z")
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY)

type LogRow = { recordId: string; newValue: string | null; createdAt: Date; user: { displayName: string } | null }

function fakeDb({
  brands = [],
  models = [],
  logs = [],
}: {
  brands?: Array<{ id: string; name: string; createdAt: Date }>
  models?: Array<{ id: string; name: string; createdAt: Date; brand: { name: string } }>
  logs?: LogRow[]
}): RecentBrandModelDb & { logCalls: unknown[] } {
  const logCalls: unknown[] = []
  const inWindow = (args: { where: { createdAt: { gte: Date } } }) => (row: { createdAt: Date }) => row.createdAt >= args.where.createdAt.gte
  return {
    logCalls,
    assetBrand: { findMany: async (args) => brands.filter(inWindow(args)) },
    assetModel: { findMany: async (args) => models.filter(inWindow(args)) },
    systemLog: {
      findMany: async (args) => {
        logCalls.push(args)
        const ids = new Set(args.where.recordId.in)
        return logs
          .filter((log) => ids.has(log.recordId))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      },
    },
  }
}

test("recent windows are whole Bangkok days: 7 days is today and the six days before it (G7P1-R3)", () => {
  // Today in Bangkok starts 2026-11-05 00:00 +07:00; 7 days back to 2026-10-30 00:00 +07:00.
  assert.equal(recentAddedWindowStart(7, NOW).toISOString(), "2026-10-29T17:00:00.000Z")
  assert.equal(recentAddedWindowStart(30, NOW).toISOString(), "2026-10-06T17:00:00.000Z")
})

test("a model added 3 days ago shows for 7 and 30 days, one added 20 days ago only for 30 (G7P1-R3)", async () => {
  const db = fakeDb({
    models: [
      { id: "m-3", name: "Latitude 5450", createdAt: daysAgo(3), brand: { name: "Dell" } },
      { id: "m-20", name: "ThinkPad T14", createdAt: daysAgo(20), brand: { name: "Lenovo" } },
    ],
  })
  const week = await readRecentBrandModels(db, 7, NOW)
  assert.deepEqual(week.map((row) => row.id), ["m-3"])
  const month = await readRecentBrandModels(db, 30, NOW)
  assert.deepEqual(month.map((row) => row.id), ["m-3", "m-20"], "newest first")
  assert.equal(month[1]?.brandName, "Lenovo")
  assert.equal(month[1]?.kind, "model")
})

test("who and where come from the newest create log row of the record; no row gives null (G7P1-R3)", async () => {
  const db = fakeDb({
    brands: [{ id: "b-1", name: "Acer", createdAt: daysAgo(1) }],
    models: [
      { id: "m-1", name: "Aspire 5", createdAt: daysAgo(2), brand: { name: "Acer" } },
      { id: "m-2", name: "Swift 3", createdAt: daysAgo(4), brand: { name: "Acer" } },
    ],
    logs: [
      { recordId: "b-1", newValue: JSON.stringify({ name: "Acer", source: "asset-form" }), createdAt: daysAgo(1), user: { displayName: "Somchai" } },
      { recordId: "m-1", newValue: JSON.stringify({ name: "Aspire 5", source: "asset-form" }), createdAt: daysAgo(3), user: { displayName: "Old" } },
      { recordId: "m-1", newValue: JSON.stringify({ name: "Aspire 5", source: "master-data" }), createdAt: daysAgo(2), user: { displayName: "Malee" } },
    ],
  })
  const rows = await readRecentBrandModels(db, 7, NOW)
  assert.deepEqual(
    rows.map(({ kind, id, name, brandName, addedByName, source }) => ({ kind, id, name, brandName, addedByName, source })),
    [
      { kind: "brand", id: "b-1", name: "Acer", brandName: null, addedByName: "Somchai", source: "asset-form" },
      { kind: "model", id: "m-1", name: "Aspire 5", brandName: "Acer", addedByName: "Malee", source: "master-data" },
      { kind: "model", id: "m-2", name: "Swift 3", brandName: "Acer", addedByName: null, source: null },
    ]
  )
  const where = (db.logCalls[0] as { where: Record<string, unknown> }).where
  assert.equal(where.module, "brand")
  assert.equal(where.action, "create")
})

test("an unknown source and a missing user read as null; ids go to the log read in chunks of 2,000", async () => {
  const models = Array.from({ length: 2001 }, (_, index) => ({ id: `m-${index}`, name: `M ${index}`, createdAt: daysAgo(1), brand: { name: "B" } }))
  const db = fakeDb({
    models,
    logs: [{ recordId: "m-0", newValue: JSON.stringify({ source: "import" }), createdAt: daysAgo(1), user: null }],
  })
  const rows = await readRecentBrandModels(db, 7, NOW)
  const first = rows.find((row) => row.id === "m-0")
  assert.equal(first?.addedByName, null)
  assert.equal(first?.source, null)
  assert.equal(db.logCalls.length, 2)
})

test("?added= reads 7 or 30, anything else is no window, and the query string keeps it (G7P1-R3)", () => {
  assert.equal(parseBrandModelListParams({ added: "7" }).added, 7)
  assert.equal(parseBrandModelListParams({ added: "30" }).added, 30)
  assert.equal(parseBrandModelListParams({ added: "14" }).added, null)
  assert.equal(parseBrandModelListParams({}).added, null)
  const state = parseBrandModelListParams({ added: "30" })
  assert.match(buildBrandModelQueryString(state, {}), /(?:^|&)added=30(?:&|$)/)
  assert.doesNotMatch(buildBrandModelQueryString(state, { added: null }), /added=/)
})

test("the brands page: ⋯ deactivates through the confirm button, with no ลบ left (spec §4.3)", () => {
  const source = read(PAGE)
  assert.match(source, /import \{ BrandModelDeactivateButton \} from "@\/components\/master-data\/brand-model-deactivate-button"/)
  assert.doesNotMatch(source, /deleteAction=/, "the page no longer uses the generic delete")
  assert.doesNotMatch(source, /tCommon\("delete"\)/)
  assert.match(source, /<BrandModelDeactivateButton\n\s+kind="brand"/)
  assert.match(source, /<BrandModelDeactivateButton\n\s+kind="model"/)
  assert.match(source, /endpoint=\{`\/api\/brands\/\$\{selectedBrand\.id\}`\}/)
  assert.match(source, /endpoint=\{`\/api\/models\/\$\{model\.id\}`\}/)

  const button = read("src/components/master-data/brand-model-deactivate-button.tsx")
  assert.match(button, /^"use client"/)
  assert.match(button, /<RowActions\b/)
  assert.match(button, /method: "DELETE"/)
  assert.match(button, /t\("deactivate\.confirmTitle", \{ name \}\)/)
  assert.match(button, /t\("deactivate\.confirmBody", \{ models, assets \}\)/)
  assert.match(button, /tone: "destructive"/)
  assert.doesNotMatch(button, /deleteAction|Trash2/)
})

test("the brands page: thumbnails go through ModelPhoto, which falls back on a failed load (spec §4.3)", () => {
  const source = read(PAGE)
  assert.match(source, /import \{ ModelPhoto \} from "@\/components\/master-data\/model-photo"/)
  assert.ok((source.match(/<ModelPhoto\b/g)?.length ?? 0) >= 2, "the table row and the phone card")
  assert.doesNotMatch(source, /from "next\/image"/)

  const photo = read("src/components/master-data/model-photo.tsx")
  assert.match(photo, /^"use client"/)
  assert.match(photo, /onError=\{\(\) => setFailed\(true\)\}/)
  assert.match(photo, /t\("photo\.failed"\)/)
  assert.match(photo, /t\("photo\.none"\)/)
})

test("the brands page: the phone shows a brand select and model cards; the desktop keeps the picker and the table (spec §4.3)", () => {
  const source = read(PAGE)
  assert.match(source, /<aside className=\{cn\(getPanelClasses\(\), "hidden overflow-hidden md:block lg:sticky lg:top-4 lg:self-start"\)\}>/)
  const phoneStart = source.indexOf('<div className={cn(getPanelClasses(), "space-y-3 p-4 md:hidden")}>\n            <form role="search" action={basePath} className="grid gap-3">')
  assert.ok(phoneStart !== -1, "the phone brand select form")
  const phoneForm = source.slice(phoneStart, source.indexOf("</form>", phoneStart))
  assert.match(phoneForm, /label=\{t\("phoneBrandSelect"\)\}\n\s+name="modelBrandId"/)
  assert.match(source, /<ContentPanelRows className="md:hidden">/)
  assert.match(source, /<DataTable\n\s+framed=\{false\}\n\s+className="hidden md:block"/)
})

test("the brands page: เพิ่มล่าสุด is a filter of the form, narrows by createdAt and shows who added each row (G7P1-R3)", () => {
  const source = read(PAGE)
  assert.match(source, /<FilterSelect\n\s+label=\{t\("recent\.label"\)\}\n\s+name="added"/)
  assert.match(source, /readRecentBrandModels\(prisma, listState\.added, now\)/)
  assert.match(source, /createdAt: \{ gte: recentAddedWindowStart\(listState\.added, now\) \}/)
  assert.match(source, /t\("recent\.addedBy", \{/)
})

test("the recent and deactivate words are in both locales (spec §4.3)", () => {
  const th = JSON.parse(read("messages/th.json")).brandModel
  const en = JSON.parse(read("messages/en.json")).brandModel
  assert.equal(th.recent.label, "เพิ่มล่าสุด")
  assert.equal(th.recent.days7, "7 วัน")
  assert.equal(th.recent.days30, "30 วัน")
  assert.equal(th.recent.addedBy, "เพิ่มโดย {name} · {source}")
  assert.equal(th.recent.sourceAssetForm, "จากฟอร์มทรัพย์สิน")
  assert.equal(th.recent.sourceMasterData, "จากหน้าข้อมูลหลัก")
  assert.equal(th.deactivate.action, "ปิดใช้งาน")
  assert.equal(th.deactivate.confirmTitle, "ปิดใช้งาน {name}?")
  assert.equal(th.deactivate.confirmBody, "ใช้อยู่ใน {models} รุ่น และ {assets} ทรัพย์สิน · ข้อมูลเดิมไม่เปลี่ยน · เปิดใช้งานอีกครั้งได้จากหน้าแก้ไข")
  assert.equal(th.photo.failed, "โหลดรูปไม่สำเร็จ")
  assert.equal(th.photo.none, "ยังไม่มีรูป")
  assert.equal(th.phoneBrandSelect, "ยี่ห้อ")
  for (const key of ["label", "days7", "days30", "addedBy", "sourceAssetForm", "sourceMasterData"]) assert.ok(en.recent[key], `en recent.${key}`)
  for (const key of ["action", "confirmTitle", "confirmBody", "success"]) assert.ok(en.deactivate[key], `en deactivate.${key}`)
  assert.ok(en.photo.failed && en.photo.none && en.phoneBrandSelect)
})
