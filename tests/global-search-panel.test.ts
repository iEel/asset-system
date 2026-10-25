import assert from "node:assert/strict"
import test from "node:test"
import { buildGlobalSearchSections, flattenGlobalSearchOptions, getGlobalSearchNotFoundActions, getGlobalSearchPanelState, isGlobalSearchShortcut } from "../src/lib/global-search-panel.ts"
import { splitSearchHighlight } from "../src/lib/search-highlight.ts"
const row = (type: "asset" | "maintenance" | "audit" | "employee" | "branch", id: string) => ({ id, type, title: `${type}-${id}`, subtitle: "", href: `/th/${type}/${id}` })
const base = { state: "results" as const, query: "NB", locale: "th", recent: [], canViewAssets: true, canCreateAssets: true }

test("the panel state covers the empty box, one character, a pending search, an error, nothing found and results (menu B shell task 8)", () => {
  const s = (query: string, settledQuery: string | null, resultCount = 0, failed = false) => getGlobalSearchPanelState({ query, settledQuery, resultCount, failed })
  assert.equal(s("", null), "hint"); assert.equal(s("   ", null), "hint"); assert.equal(s("a", null), "minChars"); assert.equal(s(" ก ", null), "minChars")
  assert.equal(s("ab", null), "loading"); assert.equal(s("abc", "ab"), "loading"); assert.equal(s("ab", "ab"), "notFound"); assert.equal(s("ab", "ab", 0, true), "error")
  assert.equal(s("abc", "ab", 3), "results") // the last answer stays while the next loads
})

test("results group in the shell order, keep their rank, and the asset group ends with the register total (menu B shell task 8)", () => {
  const results = [row("employee", "e1"), row("asset", "a1"), row("branch", "b1"), row("maintenance", "m1"), row("asset", "a2"), row("audit", "r1")]
  const sections = buildGlobalSearchSections({ ...base, results, assetTotal: 37 })
  assert.deepEqual(sections.map((section) => section.id), ["asset", "maintenance", "audit", "employee", "branch"])
  assert.deepEqual(sections[0].options.at(-1), { kind: "registerAll", key: "registerAll", href: "/th/assets?search=NB&exact=1", count: 37 })
  assert.deepEqual(flattenGlobalSearchOptions(sections).map((option) => option.key), ["asset:a1", "asset:a2", "registerAll", "maintenance:m1", "audit:r1", "employee:e1", "branch:b1"])
  for (const assetTotal of [0, null]) assert.ok(!flattenGlobalSearchOptions(buildGlobalSearchSections({ ...base, results, assetTotal })).some((option) => option.kind === "registerAll"))
  const onlyTotal = buildGlobalSearchSections({ ...base, results: [row("employee", "e1")], assetTotal: 4 })
  assert.deepEqual(onlyTotal.map((section) => [section.id, section.options.map((option) => option.kind)]), [["asset", ["registerAll"]], ["employee", ["result"]]])
})

test("an empty box lists the recent items and the clear option; nothing found offers ways forward by permission (menu B shell task 8)", () => {
  const recent = [{ type: "asset" as const, title: "NB-1", href: "/th/assets/1" }]
  assert.deepEqual(buildGlobalSearchSections({ ...base, state: "hint", query: "", results: [], assetTotal: null, recent }).map((section) => [section.id, section.options.map((option) => option.key)]), [["recent", ["recent:/th/assets/1", "clearRecent"]]])
  assert.deepEqual(buildGlobalSearchSections({ ...base, state: "hint", query: "", results: [], assetTotal: null }), [])
  assert.deepEqual(getGlobalSearchNotFoundActions("th", { canViewAssets: true, canCreateAssets: true }), [
    { kind: "action", key: "scan", href: "/th/asset-management/scan" }, { kind: "action", key: "registerFilters", href: "/th/assets" }, { kind: "action", key: "createAsset", href: "/th/assets/new" }])
  assert.deepEqual(getGlobalSearchNotFoundActions("th", { canViewAssets: true, canCreateAssets: false }).map((action) => action.key), ["scan", "registerFilters"])
  assert.deepEqual(getGlobalSearchNotFoundActions("th", { canViewAssets: false, canCreateAssets: true }), [])
  assert.deepEqual(buildGlobalSearchSections({ ...base, state: "notFound", results: [], assetTotal: 0 }).map((section) => section.id), ["notFound"])
})

test("/ opens the search unless focus is in a field or a dialog, also on the Thai layout (menu B shell task 8, Review Focus F3)", () => {
  const key = { key: "/", code: "Slash", altKey: false, ctrlKey: false, metaKey: false, shiftKey: false }
  const at = (tagName: string, extra: { isContentEditable?: boolean; inDialog?: boolean } = {}) => ({ tagName, isContentEditable: Boolean(extra.isContentEditable), closest: (selector: string) => (extra.inDialog && selector.includes("dialog") ? {} : null) })
  assert.equal(isGlobalSearchShortcut(key, at("BODY")), true); assert.equal(isGlobalSearchShortcut(key, null), true)
  assert.equal(isGlobalSearchShortcut({ ...key, key: "ฝ" }, at("BODY")), true) // the same key on the Thai layout
  for (const tag of ["INPUT", "TEXTAREA", "SELECT"]) assert.equal(isGlobalSearchShortcut(key, at(tag)), false)
  assert.equal(isGlobalSearchShortcut(key, at("DIV", { isContentEditable: true })), false); assert.equal(isGlobalSearchShortcut(key, at("BUTTON", { inDialog: true })), false)
  for (const change of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { shiftKey: true, key: "?" }, { isComposing: true }, { defaultPrevented: true }]) assert.equal(isGlobalSearchShortcut({ ...key, ...change }, at("BODY")), false)
})

test("the highlight marks the first match in any case (menu B shell task 8)", () => {
  assert.deepEqual(splitSearchHighlight("SNI-EQU-26-0001", "equ"), ["SNI-", "EQU", "-26-0001"])
  assert.deepEqual(splitSearchHighlight("เครื่องพิมพ์ ชั้น 2", "พิมพ์"), ["เครื่อง", "พิมพ์", " ชั้น 2"])
  assert.equal(splitSearchHighlight("Printer", "zz"), null); assert.equal(splitSearchHighlight("Printer", "  "), null)
})
