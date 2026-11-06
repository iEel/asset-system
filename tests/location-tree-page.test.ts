import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { buildLocationTree, type LocationNodeInput } from "../src/lib/location-tree.ts"
import {
  buildLocationAddChildHref,
  buildLocationDrilldownHrefs,
  buildLocationQueryString,
  parseLocationListParams,
} from "../src/lib/location-list-query.ts"
import { locationDeactivateBlockers, locationTreeOpenState } from "../src/lib/location-tree-view.ts"

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

test("G7P3-R1: the tree opens one level; a search opens the ancestors of every match and marks the matches", () => {
  const tree = buildLocationTree([
    row("a", "อาคาร A", null, { locationType: "Building" }),
    row("f3", "ชั้น 3", "a", { locationType: "Floor" }),
    row("it", "ห้อง IT", "f3"),
    row("b", "อาคาร B", null, { locationType: "Building" }),
    row("rack", "ตู้ 1", "b", { locationType: "Rack" }),
  ])
  const roots = tree.get("hq") ?? []
  const label = (type: string) => ({ Building: "อาคาร", Floor: "ชั้น", Room: "ห้อง", Rack: "แร็ก" })[type] ?? type

  assert.deepEqual(locationTreeOpenState(roots, "", label), { expanded: [], matches: [] })
  assert.deepEqual(locationTreeOpenState(roots, "  ", label), { expanded: [], matches: [] })

  const byName = locationTreeOpenState(roots, "ห้อง it", label)
  assert.deepEqual(byName.matches, ["it"])
  assert.deepEqual([...byName.expanded].sort(), ["a", "f3"])

  const byCode = locationTreeOpenState(roots, "rack", label)
  assert.deepEqual(byCode.matches, ["rack"])
  assert.deepEqual(byCode.expanded, ["b"])

  const byType = locationTreeOpenState(roots, "แร็ก", label)
  assert.deepEqual(byType.matches, ["rack"])

  const root = locationTreeOpenState(roots, "อาคาร a", label)
  assert.deepEqual(root.matches, ["a"])
  assert.deepEqual(root.expanded, [], "a matching root needs nothing opened")
})

test("the page: tree by default, the view links, the list with name paths and the exact register link", () => {
  const source = read(PAGE)
  assert.match(source, /const showList = listState\.view === "list"/)
  assert.match(source, /<TabNav\n\s+aria-label=\{t\("view\.label"\)\}/)
  assert.match(source, /<LocationTreeView\n/)
  assert.match(source, /buildLocationDrilldownHrefs\(\{ locale, locationId: location\.id \}\)/)
  assert.doesNotMatch(source, /locationCode:/, "the register is no longer searched by code")
  assert.match(source, /\.join\(" › "\)/, "the list writes the path with names")
  assert.match(source, /<LocationDeactivateButton\n/)
  assert.doesNotMatch(source, /deleteAction=/, "⋯ says ปิดใช้งาน through LocationDeactivateButton, not ลบ")
  // Phone: the tree only (spec §6.1). The list is a desktop view; the view links are too.
  assert.match(source, /\{showList \? \(\n\s+<div className="hidden md:block">\n\s+<DataTable/)
  assert.match(source, /className=\{showList \? "md:hidden" : undefined\}/)
})

test("the tree: a client component with real disclosure buttons (aria-expanded, aria-controls) reachable by Tab", () => {
  const source = read(TREE)
  assert.match(source, /^"use client"/)
  assert.match(source, /<Button\n\s+type="button"\n\s+aria-expanded=\{open\}\n\s+aria-controls=\{groupId\}/)
  assert.doesNotMatch(source, /tabIndex=\{-1\}/)
  assert.match(source, /t\("tree\.subtree", \{ n: formatCount\(node\.subtreeAssetCount\) \}\)/)
  assert.match(source, /t\("tree\.parentOtherBranch"\)/)
  assert.match(source, /<LocationDeactivateButton\n/)
  assert.match(source, /href=\{node\.assetsHref\}/)
})

test("ปิดใช้งาน: the confirm lists the blockers and offers no deactivate button while any remains", () => {
  const source = read(DEACTIVATE)
  assert.match(source, /^"use client"/)
  assert.match(source, /const blockers = locationDeactivateBlockers\(counts\)/)
  assert.match(source, /\{blocked \? null : \(\n\s+<AlertDialogAction/)
  assert.match(source, /t\("deactivate\.blockedFooter"\)/)
  assert.match(source, /fetch\(endpoint, \{ method: "DELETE" \}\)/)
})

test("the Thai copy of the tree and the confirm (task 3 brief)", () => {
  const expected: Record<string, string> = {
    "location.view.tree": "แผนผัง",
    "location.view.list": "รายการ",
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
