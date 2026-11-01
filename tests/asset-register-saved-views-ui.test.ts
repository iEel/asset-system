import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const component = () => read("src/components/assets/asset-register-saved-views.tsx")
const page = () => read("src/app/[locale]/(dashboard)/assets/page.tsx")
const toolbar = () => read("src/components/assets/asset-register-toolbar.tsx")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).asset

// Group 4 plan 1 Task 6 (spec §6.4, §6.7, call 4).
test("the page mounts the saved-views row under the toolbar with the session user and the page's view query", () => {
  const source = page()

  assert.match(source, /const savedViewQuery = assetRegisterSavedViewQuery\(filters\)/)
  assert.match(source, /<AssetRegisterToolbar\n[\s\S]*?userId=\{user\.id\}\n\s+viewQuery=\{savedViewQuery\}\n\s+\/>\n\s+<AssetRegisterSavedViews locale=\{locale\} userId=\{user\.id\} viewQuery=\{savedViewQuery\} \/>\n\s+<AssetRegisterStatusTabs/)
})

test("the desktop row lists each view as a link, marks the current one and offers save, rename and delete", () => {
  const source = component()

  assert.match(source, /^"use client"/)
  assert.match(source, /data-asset-saved-views/)
  assert.match(source, /className="mb-3 hidden min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm md:flex"/)
  assert.match(source, /href=\{`\/\$\{locale\}\/assets\?\$\{view\.query\}`\}/)
  assert.match(source, /aria-current=\{view\.query === viewQuery \? "page" : undefined\}/)
  assert.match(source, /t\("savedViews"\)/)
  assert.match(source, /t\("saveView"\)/)
  assert.match(source, /t\("renameView"\)/)
  assert.match(source, /tCommon\("delete"\)/)
  assert.match(source, /t\("savedViewActions", \{ name: view\.name \}\)/)
  assert.match(source, /<AccessibleDialog\b/)
  assert.match(source, /<Field\b[^>]*label=\{t\("viewName"\)\}/)
  assert.match(source, /<Input\b[\s\S]*?maxLength=\{assetRegisterSavedViewNameMax\}/)
  assert.match(source, /<DropdownMenu\b/)
  assert.match(source, /crypto\.randomUUID|addSavedView\(/)
})

test("the phone opens the views from a button beside the filter button, with no save", () => {
  const source = component()
  const bar = toolbar()

  assert.match(source, /export function AssetRegisterSavedViewsMenu\(/)
  const menu = source.slice(source.indexOf("export function AssetRegisterSavedViewsMenu("))
  assert.doesNotMatch(menu, /saveView|AccessibleDialog/, "saving is desktop only (call 4)")
  assert.match(bar, /<AssetRegisterSavedViewsMenu locale=\{locale\} userId=\{userId\} viewQuery=\{viewQuery\} className="md:hidden" \/>\n\s+<AssetRegisterFilterSheet/)
})

test("every localStorage access sits in a try/catch", () => {
  const source = component()
  const accesses = source.match(/window\.localStorage\.(getItem|setItem)/g) ?? []
  assert.equal(accesses.length, 2)
  for (const access of ["window.localStorage.getItem", "window.localStorage.setItem"]) {
    const index = source.indexOf(access)
    const before = source.slice(Math.max(0, index - 120), index)
    assert.match(before, /try \{\s*(return )?$/, `${access} is inside try`)
  }
})

test("the words exist in Thai and English and follow the glossary", () => {
  for (const locale of ["th", "en"] as const) {
    const asset = messages(locale)
    for (const key of ["savedViews", "saveView", "renameView", "renameViewTitle", "viewName", "viewNameHint", "viewNameRequired", "viewNameTaken", "savedViewsFull", "savedViewsStorageError", "savedViewActions"]) {
      assert.equal(typeof asset[key], "string", `${locale} asset.${key}`)
    }
  }
  assert.equal(messages("th").savedViews, "มุมมองที่บันทึกไว้")
  assert.equal(messages("th").saveView, "บันทึกมุมมองนี้")
  assert.match(read("docs/19_THAI_GLOSSARY.md"), /\| [^|]+ \| \*\*มุมมองที่บันทึกไว้\*\*/)
})
