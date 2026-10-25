import assert from "node:assert/strict"
import test from "node:test"
import { RECENT_SEARCH_LIMIT, addRecentSearch, parseRecentSearches, readRecentSearches, recentSearchStorageKey, writeRecentSearches } from "../src/lib/global-search-recent.ts"
const item = (n: number) => ({ type: "asset" as const, title: `NB-${n}`, href: `/th/assets/${n}` })
test("the key is per locale and the list keeps five, newest first, once each (menu B shell task 8)", () => {
  assert.equal(recentSearchStorageKey("th"), "asset-system:recent-search:v1:th"); assert.equal(RECENT_SEARCH_LIMIT, 5)
  const list = [1, 2, 3, 4, 5].map(item)
  assert.deepEqual(addRecentSearch(list, item(3)).map((r) => r.title), ["NB-3", "NB-1", "NB-2", "NB-4", "NB-5"])
  assert.deepEqual(addRecentSearch(list, item(6)).map((r) => r.title), ["NB-6", "NB-1", "NB-2", "NB-3", "NB-4"])
})
test("stored values are read defensively and stay inside the app (menu B shell task 8)", () => {
  for (const raw of [null, "{", '{"a":1}']) assert.deepEqual(parseRecentSearches(raw, "th"), [])
  const raw = JSON.stringify([item(1), { type: "asset", title: "x", href: "https://evil.example/th/" }, { type: "asset", title: "y", href: "//evil.example/th/" }, { type: "planet", title: "z", href: "/th/x" }, { type: "asset", title: "", href: "/th/assets/9" }, { ...item(2), href: "/en/assets/2" }, item(3), item(4), item(5), item(6), item(7)])
  assert.deepEqual(parseRecentSearches(raw, "th").map((r) => r.title), ["NB-1", "NB-3", "NB-4", "NB-5", "NB-6"])
})
test("blocked storage reads empty and a failed write says so; clearing removes the key (menu B shell task 8)", () => {
  const blocked = () => { throw new Error("blocked") }
  assert.deepEqual(readRecentSearches(blocked, "th"), []); assert.equal(writeRecentSearches(blocked, "th", [item(1)]), false)
  const calls: string[] = []
  const storage = { setItem: (k: string, v: string) => void calls.push(`set ${k} ${v}`), removeItem: (k: string) => void calls.push(`remove ${k}`) }
  assert.equal(writeRecentSearches(() => storage, "th", []), true); assert.deepEqual(calls, ["remove asset-system:recent-search:v1:th"])
})
