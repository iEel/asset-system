import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { isOptionsEditorOpen, keepsOptionsEditorOpen } from "../src/lib/category-custom-field-names.ts"
import { categoryCreateHasValues } from "../src/lib/category-form-summary.ts"

// Group 8 plan 2 final review fixes (categories list and form).

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const page = read("src/app/[locale]/(dashboard)/master-data/categories/page.tsx")
const form = read("src/components/master-data/category-form.tsx")
const table = read("src/components/master-data/category-form/template-table.tsx")
const summary = read("src/components/master-data/category-form/edit-summary.tsx")
const prefixBox = read("src/components/master-data/category-form/prefix-box.tsx")
const shell = read("src/components/layout/dashboard-shell.tsx")
const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

test("fix 1: the count sorts read the filtered ids' active counts in chunks, order them in memory, then read the page by id", () => {
  assert.match(page, /const readRows = isCategoryCountSort\(sort\)/)
  assert.match(page, /const ids = \(await prisma\.assetCategory\.findMany\(\{ where, select: \{ id: true \} \}\)\)\.map\(\(row\) => row\.id\)/)
  assert.match(page, /readCounts: \(chunk\) => readActiveCategoryCounts\(sort, chunk\)/)
  assert.match(page, /prisma\.assetCategory\.findMany\(\{ where: \{ id: \{ in: pageIds \} \}, include: rowInclude \}\)/)
  // The other sorts keep the query's order and paging.
  assert.match(page, /orderBy: buildCategoryOrderBy\(\{ sort, direction: listState\.direction \}\),\n\s+skip: \(listState\.page - 1\) \* listState\.pageSize,\n\s+take: listState\.pageSize,/)
  // Active rows only, as the columns.
  assert.match(page, /const where = \{ isActive: true, categoryId: \{ in: chunk \} \}/)
  for (const model of ["assetModel", "asset", "customFieldDefinition"]) {
    assert.ok(page.includes(`prisma.${model}.groupBy({ by: ["categoryId"], where, _count: { _all: true } })`), model)
  }
})

test("fix 4: the options editor of an empty รายการเลือก row stays open while its options are typed key by key", () => {
  const open = new Set<string>()
  const key = "new-1"
  let field = { fieldType: "text", options: "" }
  // ชนิดข้อมูล becomes รายการเลือก: the row joins the open set.
  assert.equal(keepsOptionsEditorOpen("fieldType", "select"), true)
  open.add(key)
  field = { ...field, fieldType: "select" }
  assert.equal(isOptionsEditorOpen(open, key, field), true)
  // Each typed character keeps it open (before the fix the first one closed it).
  for (const options of ["W", "Wi", "Windows 11", "Windows 11\nW", "Windows 11\nWindows 10"]) {
    assert.equal(keepsOptionsEditorOpen("options", options), true)
    assert.equal(isOptionsEditorOpen(open, key, { ...field, options }), true, options)
  }
  // A row never opened shows its editor by itself only while it has no option; another row's key does not open it.
  assert.equal(isOptionsEditorOpen(new Set(), key, { fieldType: "select", options: "" }), true)
  assert.equal(isOptionsEditorOpen(new Set(["new-2"]), key, { fieldType: "select", options: "A" }), false)
  assert.equal(keepsOptionsEditorOpen("fieldLabel", "x"), false)
  assert.equal(keepsOptionsEditorOpen("fieldType", "text"), false)
  // The table wires both, by the row's stable key.
  assert.match(table, /if \(keepsOptionsEditorOpen\(field, value\)\) keepOptionsOpen\(keys\[index\]\)/)
  assert.match(table, /onClick=\{\(\) => toggleOptions\(rowKey\)\}/)
})

test("fix 5: rows keep a stable key; ทำซ้ำ, ลบ and ขึ้น/ลง place focus on purpose after the update", () => {
  assert.match(table, /<Fragment key=\{rowKey\}>/)
  assert.doesNotMatch(table, /key=\{`\$\{field\.id \?\? "new"\}-\$\{index\}`\}/)
  assert.match(table, /return field\.id \? `saved-\$\{field\.id\}` : newRowKey\(\)/)
  assert.match(table, /setRowKeys\(\[\.\.\.keys\.slice\(0, index \+ 1\), newRowKey\(\), \.\.\.keys\.slice\(index \+ 1\)\]\)/)
  assert.match(table, /setRowKeys\(keys\.filter\(\(_, keyIndex\) => keyIndex !== index\)\)/)
  assert.match(table, /setRowKeys\(moveArrayItem\(\[\.\.\.keys\], index, target\)\)/)
  // The copy's ชื่อ field; after ลบ the next row's ⋯, else เพิ่มช่องข้อมูล; after a move the pressed arrow or the other one.
  assert.match(table, /focusAfterRowChange\(\(\) => document\.getElementById\(`category-field-\$\{index \+ 1\}-name`\)\)/)
  assert.match(table, /focusAfterRowChange\(\(\) => \(index < fields\.length - 1 \? rowMenuButton\(index\) : document\.getElementById\(ADD_CUSTOM_FIELD_ID\)\)\)/)
  assert.match(table, /focusAfterRowChange\(\(\) => rowMoveButton\(target, pressed\) \?\? rowMoveButton\(target, other\)\)/)
  // After the phone sheet has closed, on the next frame.
  assert.match(table, /void waitForDialogToClose\(\)\.then\(\(\) => \{\n\s+requestAnimationFrame\(\(\) => \{\n\s+const target = find\(\)\n\s+if \(target\) focusField\(target\)/)
  assert.match(form, /id=\{ADD_CUSTOM_FIELD_ID\}/)
})

test("fix 7: the category form asks before a link leaves unsaved edits, and warns on unload", () => {
  assert.match(form, /const isDirty = !saved && \(category \? changeParts\.length > 0 : categoryCreateHasValues\(values\)\)/)
  assert.match(form, /window\.addEventListener\("beforeunload", warnBeforeUnload\)/)
  assert.match(form, /if \(!isDirty \|\| !shouldGuardLinkClick\(event, event\.currentTarget\)\) return/)
  assert.match(form, /confirm\(\{ title: t\("form\.unsavedChangesConfirm"\), confirmLabel: t\("form\.unsavedChangesLeave"\), tone: "destructive" \}\)/)
  assert.match(form, /<PageBackLink href=\{backHref\} onClick=\{confirmNavigation\}/)
  assert.match(form, /<Link href=\{href\} onClick=\{confirmNavigation\} className=\{linkVariants\(\{ size: "inherit" \}\)\}>/)
  assert.match(form, /setSaved\(true\)\n\s+toast\.success/)
  assert.match(summary, /<Link href=\{item\.href\} onClick=\{onLinkClick\}/)
  assert.match(prefixBox, /<Link href=\{context\.settingsHref\} onClick=\{onLinkClick\}/)
  assert.equal(th.category.form.unsavedChangesLeave, "ออกโดยไม่บันทึก")
  assert.equal(typeof en.category.form.unsavedChangesConfirm, "string")
  // Create: anything filled in counts.
  const empty = { code: "", name: "", description: "", isActive: true, customFieldDefs: [], photoChecklist: [] }
  assert.equal(categoryCreateHasValues(empty), false)
  assert.equal(categoryCreateHasValues({ ...empty, code: " " }), false)
  assert.equal(categoryCreateHasValues({ ...empty, name: "โน้ตบุ๊ก" }), true)
  assert.equal(categoryCreateHasValues({ ...empty, photoChecklist: [""] }), true)
  assert.equal(categoryCreateHasValues({ ...empty, isActive: false }), true)
})

test("fix 8: main gets scroll padding only while a sticky save bar is on the page", () => {
  assert.match(shell, /has-\[\[data-slot=sticky-form-footer\]\]:scroll-pb-56 sm:has-\[\[data-slot=sticky-form-footer\]\]:scroll-pb-28/)
  // The mobile navigation's own padding is unchanged.
  assert.match(shell, /mobileFieldNavigationVisible && "scroll-pb-\[calc\(5\.25rem\+env\(safe-area-inset-bottom\)\)\] lg:scroll-pb-0"/)
})

test("fix 9: each รายการเลือก row's options textarea and toggle carry the field's name", () => {
  assert.match(table, /<span className="sr-only"> \{t\("form\.optionsOfField", \{ name \}\)\}<\/span>/)
  assert.match(table, /<Field label=\{optionsLabel\} id=\{`category-field-\$\{index\}-options`\}>/)
  assert.match(table, /aria-label=\{optionsOpen \? t\("form\.optionsDoneFor", \{ name \}\) : t\("form\.optionsEditFor", \{ name \}\)\}/)
  for (const messages of [th, en]) {
    for (const key of ["optionsOfField", "optionsEditFor", "optionsDoneFor"]) assert.match(messages.category.form[key], /\{name\}/, key)
  }
  // The accessible name holds the visible text.
  assert.ok(th.category.form.optionsEditFor.startsWith(th.category.form.optionsEdit))
  assert.ok(th.category.form.optionsDoneFor.startsWith(th.category.form.optionsDone))
  assert.ok(en.category.form.optionsEditFor.startsWith(en.category.form.optionsEdit))
  assert.ok(en.category.form.optionsDoneFor.startsWith(en.category.form.optionsDone))
})

test("fix 10: the sort direction reads น้อยไปมาก / มากไปน้อย on every list, with no alphabet hint", () => {
  for (const scope of [th.company.list, th.branch.list, th.department.list, th.employee, th.category.list]) {
    assert.equal(scope.sortAsc, "น้อยไปมาก")
    assert.equal(scope.sortDesc, "มากไปน้อย")
  }
  for (const scope of [en.company.list, en.branch.list, en.department.list, en.employee, en.category.list]) {
    assert.equal(scope.sortAsc, "Ascending")
    assert.equal(scope.sortDesc, "Descending")
  }
})
