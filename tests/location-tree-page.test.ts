import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { buildLocationTree, type LocationNodeInput } from "../src/lib/location-tree.ts"
import {
  buildLocationAddChildHref,
  buildLocationDrilldownHrefs,
  buildLocationQueryString,
  locationListHasFieldFilters,
  parseLocationListParams,
} from "../src/lib/location-list-query.ts"
import { LOCATION_TREE_LEVEL_PAGE, locationDeactivateBlockers, locationTreeLevelSlice } from "../src/lib/location-tree-view.ts"

// Page group 7 plan 3 Task 3 (spec §6.1): the locations page as a tree beside the list. Sources are read CRLF-safe.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const PAGE = "src/app/[locale]/(dashboard)/master-data/locations/page.tsx"
const TREE = "src/components/master-data/location-tree-view.tsx"
const DEACTIVATE = "src/components/master-data/location-deactivate-button.tsx"
const th = JSON.parse(read("messages/th.json"))
const en = JSON.parse(read("messages/en.json"))
const message = (messages: Record<string, unknown>, key: string) =>
  key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages)

const row = (id: string, name: string, parentId: string | null, extra: Partial<LocationNodeInput> = {}): LocationNodeInput => ({
  id,
  code: id.toUpperCase(),
  name,
  locationType: "Room",
  branchId: "hq",
  parentId,
  isActive: true,
  ownAssetCount: 0,
  ...extra,
})

test("G7P3-R4: the view is ?view=tree|list, tree by default, and the list's links keep it", () => {
  assert.equal(parseLocationListParams({}).view, "tree")
  assert.equal(parseLocationListParams({ view: "list" }).view, "list")
  assert.equal(parseLocationListParams({ view: "nonsense" }).view, "tree")
  const list = parseLocationListParams({ view: "list" })
  assert.match(buildLocationQueryString(list, { page: 2 }), /(^|&)view=list(&|$)/)
  assert.doesNotMatch(buildLocationQueryString(parseLocationListParams({}), {}), /view=/, "the tree is the default: no parameter")
})

test("G7P3-R3: an asset count opens the register filtered to that location exactly", () => {
  assert.deepEqual(buildLocationDrilldownHrefs({ locale: "th", locationId: "loc 1" }), { assets: "/th/assets?locationId=loc%201&page=1" })
})

test("เพิ่มที่ตั้งในนี้ opens the form with the branch and the parent chosen (Review Focus 5)", () => {
  assert.equal(
    buildLocationAddChildHref({ locale: "th", branchId: "b 1", parentId: "p&2" }),
    "/th/master-data/locations/new?branchId=b%201&parentId=p%262",
  )
  assert.equal(buildLocationAddChildHref({ locale: "en", branchId: "b1" }), "/en/master-data/locations/new?branchId=b1")
})

test("Review Focus 4: the confirm names each blocker with its count, in the server's order, and nothing when clear", () => {
  assert.deepEqual(locationDeactivateBlockers({ currentAssets: 0, homeAssets: 0, activeChildren: 0, auditRounds: 0 }), [])
  assert.deepEqual(locationDeactivateBlockers({ currentAssets: 2, homeAssets: 0, activeChildren: 3, auditRounds: 1 }), [
    { key: "currentAssets", count: 2 },
    { key: "activeChildren", count: 3 },
    { key: "auditRounds", count: 1 },
  ])
  assert.deepEqual(locationDeactivateBlockers({ currentAssets: 0, homeAssets: 5, activeChildren: 0, auditRounds: 0 }), [{ key: "homeAssets", count: 5 }])
})

test("the tree under ทั้งหมด: a row given to the builder as active hangs under its stored parent, inactive or not (board MD-Locations)", () => {
  // The page passes isActive: true for every row it shows, so an inactive floor keeps its rooms and paths run through it.
  const tree = buildLocationTree([row("a", "อาคาร A", null), row("f3", "ชั้น 3", "a"), row("arc", "ห้องเก็บเอกสารเก่า", "f3")])
  const [root] = tree.get("hq") ?? []
  assert.deepEqual(root.children[0].children[0].path, ["อาคาร A", "ชั้น 3", "ห้องเก็บเอกสารเก่า"])
})

test("the page: tree by default, a search shows the list with its hint, the list with name paths and the exact register link", () => {
  const source = read(PAGE)
  assert.match(source, /const showList = listState\.view === "list" \|\| listState\.search !== ""/)
  assert.match(source, /<TabNav\n\s+aria-label=\{t\("view\.label"\)\}\n\s+current=\{showList \? "list" : "tree"\}/)
  assert.match(source, /\{t\("view\.hint"\)\}/)
  assert.match(source, /view === "tree" \? \{ view, search: "", page: 1 \}/, "โครงสร้าง clears the search")
  assert.match(source, /<LocationTreeView key=/)
  assert.match(source, /buildLocationDrilldownHrefs\(\{ locale, locationId: location\.id \}\)/)
  assert.doesNotMatch(source, /locationCode:/, "the register is no longer searched by code")
  assert.match(source, /\.join\(" › "\)/, "the list writes the path with names")
  assert.match(source, /<LocationDeactivateButton\n/)
  assert.doesNotMatch(source, /deleteAction=/, "⋯ says ปิดใช้งาน through LocationDeactivateButton, not ลบ")
  // The tree follows the status filter; every shown row hangs under its stored parent.
  assert.match(source, /isActive: true,\n\s+ownAssetCount: location\._count\.currentAssets,/)
  assert.match(source, /listState\.status === "all"\n\s+\? fullTree/)
  // ?view=list shows the list at every width: the table from md, compact cards below.
  assert.match(source, /<DataTable framed=\{false\} className="hidden md:block" caption=\{t\("title"\)\} scrollHint=\{tCommon\("tableScrollHint"\)\}>/)
  assert.match(source, /<div data-location-mobile-list className="md:hidden">/)
  assert.match(source, /\{total > 0 \? \(\n\s+<DataTableFoot>\n\s+<Pagination/, "one pagination under both layouts")
  // เปิดใช้งาน beside the ไม่ใช้งาน badge, in the table and on the cards.
  assert.equal(source.match(/<LocationReactivateButton endpoint=\{`\/api\/locations\/\$\{location\.id\}`\}/g)?.length, 2)
})

test("the tree: a client component with real disclosure buttons (aria-expanded, aria-controls) reachable by Tab", () => {
  const source = read(TREE)
  assert.match(source, /^"use client"/)
  assert.match(source, /<Button\n\s+type="button"\n\s+aria-expanded=\{open\}\n\s+aria-controls=\{open \? groupId : undefined\}/)
  assert.doesNotMatch(source, /tabIndex=\{-1\}/)
  assert.match(source, /t\("tree\.subtree", \{ n: formatCount\(node\.subtreeAssetCount\) \}\)/)
  assert.match(source, /t\("tree\.parentOtherBranch"\)/)
  assert.match(source, /<LocationDeactivateButton\n/)
  assert.match(source, /href=\{node\.assetsHref\}/)
  // Board MD-Locations: a child-count column and a status column with เปิดใช้งาน on an inactive row.
  assert.match(source, /\{formatCount\(node\.children\.length\)\}<\/div>/)
  assert.match(source, /\{node\.isActive \? null : <LocationReactivateButton endpoint=\{`\/api\/locations\/\$\{node\.id\}`\} name=\{node\.name\} record=\{node\.record\} \/>\}/)
  assert.doesNotMatch(source, /initialExpanded|matches/, "a search shows the list, the tree has no search state")
})

test("ปิดใช้งาน: the confirm lists the blockers and offers no deactivate button while any remains", () => {
  const source = read(DEACTIVATE)
  assert.match(source, /^"use client"/)
  assert.match(source, /const blockers = locationDeactivateBlockers\(counts\)/)
  assert.match(source, /\{blocked \? null : \(\n\s+<AlertDialogAction/)
  assert.match(source, /t\("deactivate\.blockedFooter"\)/)
  assert.match(source, /fetch\(endpoint, \{ method: "DELETE" \}\)/)
})

test("เปิดใช้งาน: the same confirm as other master data, then PUT with the stored record and isActive true (no new API)", () => {
  const source = read(DEACTIVATE)
  assert.match(source, /export function LocationReactivateButton\(/)
  assert.match(source, /title: t\("reactivate\.confirmTitle", \{ name \}\)/)
  assert.match(source, /method: "PUT",[\s\S]*?body: JSON\.stringify\(\{ \.\.\.record, isActive: true \}\)/)
  assert.match(read("src/app/api/locations/[id]/route.ts"), /const input = locationSchema\.parse\(await request\.json\(\)\)/)
})

test("the Thai copy of the tree and the confirm (task 3 brief; board MD-Locations for the views)", () => {
  const expected: Record<string, string> = {
    "location.view.tree": "โครงสร้าง",
    "location.view.list": "รายการพร้อมเส้นทาง",
    "location.view.hint": "พิมพ์ค้นหาแล้วจะสลับเป็นรายการพร้อมเส้นทาง เช่น สำนักงานใหญ่ › อาคาร A › ชั้น 3 › ห้อง 301 · กดที่แถวเพื่อเปิดหน้าแก้ไขที่ตั้ง",
    "location.reactivate.action": "เปิดใช้งาน",
    "location.tree.subtree": "รวมที่ตั้งย่อย {n}",
    "location.tree.parentOtherBranch": "อยู่คนละสาขากับที่ตั้งแม่",
    "location.tree.addChild": "เพิ่มที่ตั้งในนี้",
    "location.deactivate.action": "ปิดใช้งาน",
    "location.deactivate.confirmTitle": "ปิดใช้งาน {name}?",
    "location.deactivate.blocked.currentAssets": "มีทรัพย์สินอยู่ที่นี่ {n}",
    "location.deactivate.blocked.homeAssets": "เป็นที่ตั้งประจำของทรัพย์สิน {n}",
    "location.deactivate.blocked.activeChildren": "มีที่ตั้งย่อยที่ใช้งาน {n}",
    "location.deactivate.blocked.auditRounds": "ถูกใช้ในรอบตรวจนับ {n}",
    "location.deactivate.blockedFooter": "ปิดใช้งานไม่ได้จนกว่าจะย้ายหรือปิดรายการข้างบน",
  }
  for (const [key, text] of Object.entries(expected)) {
    assert.equal(message(th, key), text, key)
    assert.equal(typeof message(en, key), "string", `en ${key}`)
  }
})

// --- final review fixes -----------------------------------------------------------------------------------------------

test("final review 1: the ปิดใช้งาน dialog sits in a span that stops its portal's clicks and keys before the list's row", () => {
  const source = read(DEACTIVATE)
  assert.match(source, /function stopPortalEvent\(event: MouseEvent<HTMLSpanElement> \| KeyboardEvent<HTMLSpanElement>\) \{\n\s+if \(!event\.currentTarget\.contains\(event\.target as Node\)\) event\.stopPropagation\(\)/)
  assert.match(source, /<span hidden onClick=\{stopPortalEvent\} onKeyDown=\{stopPortalEvent\}>\n\s+<AlertDialog open=\{open\}/)
  assert.match(source, /<\/AlertDialog>\n\s+<\/span>\n\s+<\/>/)
  // เปิดใช้งาน asks through the app's ConfirmProvider, whose dialog is not inside the row.
  assert.match(source, /const confirm = useConfirm\(\)/)
})

test("final review 5: one level shows 100 nodes at a time; แสดงอีก adds the next 100", () => {
  assert.equal(LOCATION_TREE_LEVEL_PAGE, 100)
  const items = Array.from({ length: 2351 }, (_, index) => index)
  const first = locationTreeLevelSlice(items, undefined)
  assert.equal(first.visible.length, 100)
  assert.equal(first.nextCount, 100)
  const later = locationTreeLevelSlice(items, 2300)
  assert.equal(later.visible.length, 2300)
  assert.equal(later.nextCount, 51)
  assert.deepEqual(locationTreeLevelSlice(items, 2351), { visible: items, nextCount: 0 })
  assert.deepEqual(locationTreeLevelSlice([1, 2], undefined), { visible: [1, 2], nextCount: 0 })
  assert.equal(message(th, "location.tree.showMore"), "แสดงอีก {n} รายการ")
  assert.equal(typeof message(en, "location.tree.showMore"), "string")
})

test("final review 5: a closed level is not rendered (no hidden subtrees), and each level goes through the slice", () => {
  const source = read(TREE)
  assert.doesNotMatch(source, /hidden=\{!open\}/)
  assert.match(source, /\{hasChildren && open \? <ul id=\{groupId\}>\{renderChildren\(\)\}<\/ul> : null\}/)
  assert.match(source, /\{hasRoots && open \? <ul id=\{groupId\}>\{children\}<\/ul> : null\}/)
  assert.match(source, /\{openBranches\.has\(branch\.id\) \? renderLevel\(`branch:\$\{branch\.id\}`, branch\.roots, 0\) : null\}/)
  assert.match(source, /renderChildren=\{\(\) => renderLevel\(node\.id, node\.children, depth \+ 1\)\}/)
  assert.match(source, /locationTreeLevelSlice\(nodes, shown\.get\(levelKey\)\)/)
  assert.match(source, /t\("tree\.showMore", \{ n: formatCount\(nextCount\) \}\)/)
})

test("final review 4 and 6: a branch filter builds that branch's own tree; the list path starts with the branch name", () => {
  const source = read(PAGE)
  assert.match(source, /buildBranchLocationTree\(statusRows\.map\(asTreeInput\), listState\.branchId, allLocations\)/)
  assert.doesNotMatch(source, /!listState\.branchId \|\| branchId === listState\.branchId/)
  assert.match(source, /\[locationById\.get\(location\.id\)\?\.branch\.name, \.\.\.\(namePaths\.get\(location\.id\) \?\? \[location\.name\]\)\]\.filter\(Boolean\)\.join\(" › "\)/)
})

test("final review 7: on phones the filters fold, open only while a field filter is set", () => {
  assert.equal(locationListHasFieldFilters(parseLocationListParams({})), false)
  assert.equal(locationListHasFieldFilters(parseLocationListParams({ branchId: "b1" })), true)
  assert.equal(locationListHasFieldFilters(parseLocationListParams({ status: "all" })), true)
  // The tree's form has no type, usage or hierarchy fields.
  assert.equal(locationListHasFieldFilters(parseLocationListParams({ hierarchy: "root" })), false)
  assert.equal(locationListHasFieldFilters(parseLocationListParams({ view: "list" })), false)
  assert.equal(locationListHasFieldFilters(parseLocationListParams({ view: "list", hierarchy: "root" })), true)
  assert.equal(locationListHasFieldFilters(parseLocationListParams({ search: "301" })), true)
  const source = read(PAGE)
  assert.match(source, /const hasActiveFilters = locationListHasFieldFilters\(listState\)/)
  assert.match(source, /<details data-location-filters-phone className=\{cn\(getPanelClasses\(\), "md:hidden"\)\} open=\{hasActiveFilters\}>/)
  assert.match(source, /\{filterForm\("grid gap-3 border-t border-border p-4"\)\}/)
  assert.match(source, /<FilterPanel className="hidden md:block">/)
  assert.equal(message(th, "location.filtersTitle"), "ค้นหาและตัวกรอง")
  assert.equal(typeof message(en, "location.filtersTitle"), "string")
})

test("final review 8: the unused locationCycle message and its catalog entry are gone", () => {
  assert.equal(message(th, "apiErrors.locationCycle"), undefined)
  assert.equal(message(en, "apiErrors.locationCycle"), undefined)
  assert.doesNotMatch(read("src/lib/api-error-catalog.ts"), /locationCycle|Location hierarchy cannot contain a cycle/)
  assert.ok(message(th, "apiErrors.locationParentCycle"), "the cycle refusal keeps its own key")
})
