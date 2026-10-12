import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Phase 2B menu (spec 2B §4.2, B1, I27). sidebar.tsx is CRLF in the working tree, so \r is stripped before the regexes.
// The menu is read from the source between `const menuSections` and `const visibleSections`.
const sidebar = readFileSync("src/components/layout/sidebar.tsx", "utf8").replace(/\r\n/g, "\n")
const menu = sidebar.slice(sidebar.indexOf("const menuSections"), sidebar.indexOf("const visibleSections"))
const nav = (locale: "th" | "en") => (JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { nav: Record<string, string> }).nav

type MenuRow = { key: string; level: number; icon: string | null; size: number | null }

// Every labelKey in source order. level 0 = a section or a row or group of a section; level 1 = inside a group.
// An array opened right after `children:` is a group; one opened inside another group would be a third level.
// A row's icon is the first `icon: <Name size={N} />` after its labelKey and before the next labelKey.
function readMenu(source: string): { rows: MenuRow[]; nestedGroups: number } {
  const arrays: boolean[] = []
  const rows: MenuRow[] = []
  let nestedGroups = 0
  for (let index = 0; index < source.length; index++) {
    if (source[index] === "[") {
      const isChildren = /children:\s*$/.test(source.slice(Math.max(0, index - 24), index))
      if (isChildren && arrays.includes(true)) nestedGroups++
      arrays.push(isChildren)
    } else if (source[index] === "]") {
      arrays.pop()
    } else if (source.startsWith('labelKey: "', index)) {
      const start = index + 'labelKey: "'.length
      const key = source.slice(start, source.indexOf('"', start))
      const nextKey = source.indexOf('labelKey: "', start)
      const own = source.slice(start, nextKey === -1 ? undefined : nextKey)
      const icon = /icon: <(\w+) size=\{(\d+)\} \/>/.exec(own)
      rows.push({ key, level: arrays.filter(Boolean).length, icon: icon?.[1] ?? null, size: icon ? Number(icon[2]) : null })
    }
  }
  return { rows, nestedGroups }
}

const { rows, nestedGroups } = readMenu(menu)
const isSection = (row: MenuRow) => row.key.startsWith("section")

test("the asset register is the first row of the assets section, one click from any page (B1)", () => {
  assert.match(
    menu,
    /labelKey: "sectionAssets",\s*items: \[\s*\{\s*labelKey: "assetRegister",\s*href: `\/\$\{locale\}\/assets`,\s*permission: \{ module: "asset", action: "view" \}/,
  )
  assert.equal(menu.match(/labelKey: "assetRegister"/g)?.length, 1)
})

test("the assets section holds the register, the management and transaction groups, then audit, maintenance and disposal (B1)", () => {
  const first = rows.findIndex((row) => row.key === "sectionAssets")
  const next = rows.findIndex((row) => row.key === "sectionSystem")
  assert.ok(first !== -1 && next > first, "sectionAssets comes before sectionSystem")
  assert.deepEqual(
    rows.slice(first + 1, next).map((row) => `${row.level}:${row.key}`),
    [
      "0:assetRegister",
      "0:assetManagement",
      "1:addAsset",
      "1:scanSearchAsset",
      "1:printLabels",
      "1:importExport",
      "0:assetTransactionsGroup",
      "1:checkout",
      "1:checkin",
      "1:transfer",
      "1:bulkMove",
      "0:audit",
      "1:auditRound",
      "1:auditFinding",
      "0:maintenance",
      "0:disposal",
    ],
  )
})

test("the menu is at most two levels deep, so groups lost their depth prop", () => {
  assert.equal(nestedGroups, 0, "a group inside a group is a third level")
  assert.deepEqual(rows.filter((row) => row.level > 1).map((row) => row.key), [])
  assert.doesNotMatch(sidebar, /\bdepth\b/)
  assert.match(sidebar, /"mt-0\.5 ml-5 space-y-0\.5 border-l border-sidebar-border pl-1"/)
})

test("every row and group has its own icon, because the collapsed rail shows icons only (I27)", () => {
  const items = rows.filter((row) => !isSection(row))
  assert.equal(items.length, 39, "34 rows and 5 groups")
  assert.equal(menu.match(/\bicon:/g)?.length, 39, "every icon is written as icon: <Name size={N} />")
  assert.deepEqual(items.filter((row) => row.icon === null).map((row) => row.key), [])
  const names = items.map((row) => row.icon)
  assert.deepEqual(names.filter((name, index) => names.indexOf(name) !== index), [], "an icon used twice")
  assert.deepEqual(items.filter((row) => row.size !== (row.level === 0 ? 20 : 18)).map((row) => row.key), [], "20px at the first level, 18px inside a group")
})

test("the register group key is gone, and every menu label exists in Thai and English", () => {
  assert.doesNotMatch(sidebar, /assetRegistryGroup/)
  for (const locale of ["th", "en"] as const) {
    const labels = nav(locale)
    assert.equal(labels.assetRegistryGroup, undefined, locale)
    assert.deepEqual(rows.filter((row) => typeof labels[row.key] !== "string").map((row) => row.key), [], locale)
  }
})
