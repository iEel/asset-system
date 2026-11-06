import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const source = read("src/components/master-data/category-form.tsx")
const table = read("src/components/master-data/category-form/template-table.tsx")
const prefixBox = read("src/components/master-data/category-form/prefix-box.tsx")
const editPage = read("src/app/[locale]/(dashboard)/master-data/categories/[id]/edit/page.tsx")
const newPage = read("src/app/[locale]/(dashboard)/master-data/categories/new/page.tsx")
const context = read("src/lib/category-form-context.ts")
const summary = read("src/components/master-data/category-form/edit-summary.tsx")
const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

test("the category form uses the shared fields, buttons and a busy save button (2C batch 2)", () => {
  for (const text of [source, table]) {
    assert.match(text, /import \{ Field(?:, FieldRequiredMark)? \} from "@\/components\/ui\/field"/)
    assert.doesNotMatch(text, /function Field\(|<select|<textarea|<button|Loader2|ml-1 text-danger|rounded border-border|disabled:opacity/)
  }
  assert.equal(source.match(/<input\b/g)?.length, 1, "only the status checkbox stays a raw input in the form")
  assert.equal(table.match(/<input\b/g)?.length, 1, "and the จำเป็น checkbox in the table")
  for (const text of [source, table]) assert.equal(text.match(/<input\n\s+type="checkbox"/g)?.length, 1)
  // The status checkbox sits beside its two-line text (Task 3), top-aligned as the admin forms' checkboxes.
  assert.equal(source.match(/className=\{cn\(checkboxVariants\(\), "mt-0\.5"\)\}/g)?.length, 1)
  assert.equal(table.match(/className=\{checkboxVariants\(\)\}/g)?.length, 1)
  assert.equal(source.match(/<Field label=/g)?.length, 4, "code, name, description, photo item")
  assert.equal(table.match(/<Field label=/g)?.length, 5, "field name, label, Thai label, type, options")
  assert.equal(source.match(/^\s+required$/gm)?.length, 2, "code and name keep the browser's own required check")
  assert.equal(table.match(/^\s+required$/gm)?.length, 2, "field name and label keep the browser's own required check")
  assert.match(source, /<Link href=\{backHref\} className=\{buttonVariants\(\{ variant: "outline" \}\)\}>/)
  assert.match(source, /<Button type="submit" busy=\{saving\}>\n\s+<Save aria-hidden="true" \/>\n\s+\{tCommon\("save"\)\}/)
})

test("the header: แก้ไขหมวดหมู่ · {name} and the usage line with its links on edit; the create page has no counts (board MD-Category-Edit)", () => {
  assert.equal(th.category.form.editTitle, "แก้ไขหมวดหมู่ · {name}")
  assert.match(th.category.form.usageLine, /^รหัส <mono>\{code\}<\/mono> · ใช้อยู่กับ <modelsLink>\{models, number\} รุ่น<\/modelsLink> และ <assetsLink>\{assets, number\} ทรัพย์สิน<\/assetsLink> · /)
  assert.match(en.category.form.usageLine, /\{models, plural, one \{# model\} other \{# models\}\}/)
  assert.match(source, /const title = isEdit \? t\("form\.editTitle", \{ name: category\?\.name \?\? "" \}\) : t\("createTitle"\)\n/)
  assert.match(source, /isEdit && context\.usage \? \(/)
  assert.match(source, /modelsLink: usageLink\(context\.usage\.modelsHref\)/)
  assert.match(source, /assetsLink: usageLink\(context\.usage\.assetsHref\)/)
  // The counts are the active models and assets (as the list), each linked with its list's view permission.
  assert.match(context, /prisma\.assetModel\.count\(\{ where: \{ categoryId, isActive: true \} \}\)/)
  assert.match(context, /prisma\.asset\.count\(\{ where: \{ categoryId, isActive: true \} \}\)/)
  assert.match(context, /modelsHref: hasPermission\(user, "brand", "view"\) \? hrefs\.models : null/)
  assert.match(context, /assetsHref: hasPermission\(user, "asset", "view"\) \? hrefs\.assets : null/)
  assert.match(editPage, /readCategoryFormContext\(\{ locale, user, categoryId: id \}\)/)
  assert.match(editPage, /context=\{context\}/)
  assert.match(newPage, /const context = await readCategoryFormContext\(\{ locale, user \}\)/)
  assert.match(newPage, /<CategoryForm backHref=\{returnToHref\} context=\{context\} \/>/)
})

test("section 1: the board's hints and the read-only prefix box with แก้ในการตั้งค่า for setting:view only", () => {
  assert.match(source, /<CategoryFormSection number=\{1\} title=\{t\("form\.sectionInfo"\)\} titleId="category-section-info">/)
  assert.match(source, /hint=\{isEdit \? t\("form\.codeHintEdit"\) : t\("form\.codeHintCreate"\)\}/)
  assert.match(source, /hint=\{t\("form\.nameHint"\)\}/)
  assert.equal(th.category.form.codeHintEdit, "แก้รหัสหมวดหมู่ไม่เปลี่ยนรหัสทรัพย์สินที่ออกไปแล้ว")
  assert.equal(th.category.form.nameHint, "ชื่อที่เห็นในหน้าเพิ่มทรัพย์สิน รายงาน และตัวกรอง")
  assert.match(source, /<CategoryPrefixBox context=\{context\} code=\{values\.code\} isEdit=\{isEdit\} \/>/)
  assert.match(prefixBox, /renderAssetTagExample\(context\.tagExample, context\.prefix, typedCode\)/)
  assert.match(prefixBox, /context\.sharedWith\.length > 0 \?/)
  assert.match(prefixBox, /\{context\.settingsHref \? \(\n\s+<Link href=\{context\.settingsHref\}/)
  assert.match(context, /settingsHref: hasPermission\(user, "setting", "view"\) \? buildCategoryPrefixSettingsHref\(locale\) : null/)
  // The shared-with names: active categories, read in id chunks of 2,000.
  assert.match(context, /chunkListIds\(sharedWithIds\)\.map\(\(chunk\) =>\n\s+prisma\.assetCategory\.findMany\(\{ where: \{ id: \{ in: chunk \}, isActive: true \}, select: \{ name: true \} \}\)/)
})

test("section 2: the compact table keeps all five types, ขึ้น/ลง, ⋯ with ทำซ้ำ and ลบ, option chips, ใหม่ and the rename warning", () => {
  assert.match(table, /const FIELD_TYPES = \["text", "number", "select", "date", "boolean"\] as const/)
  for (const key of ["fieldTypeText", "fieldTypeNumber", "fieldTypeSelect", "fieldTypeDate", "fieldTypeBoolean"]) assert.ok(table.includes(`: "${key}"`), key)
  assert.match(table, /onClick=\{\(\) => moveField\(index, -1\)\}\n\s+disabled=\{index === 0\}/)
  assert.match(table, /onClick=\{\(\) => moveField\(index, 1\)\}\n\s+disabled=\{index === fields\.length - 1\}/)
  assert.match(table, /\{ kind: "action", key: "duplicate", label: t\("duplicateItem"\), icon: <Copy aria-hidden="true" \/>, onSelect: \(\) => duplicateField\(index\) \}/)
  assert.match(table, /\{ kind: "action", key: "remove", label: t\("removeCustomField"\), icon: <Trash2 aria-hidden="true" \/>, destructive: true, onSelect: \(\) => removeField\(index\) \}/)
  assert.match(table, /menuLabel=\{t\("form\.fieldMenu", \{ name \}\)\}/)
  // Option chips with แก้ตัวเลือก; an empty รายการเลือก opens its editor.
  assert.match(table, /const options = splitCustomFieldOptions\(field\.options\)/)
  assert.match(table, /const optionsOpen = openOptions\.has\(index\) \|\| \(field\.fieldType === "select" && options\.length === 0\)/)
  assert.match(table, /<Chip key=\{`\$\{optionIndex\}-\$\{option\}`\} title=\{option\}>\{option\}<\/Chip>/)
  assert.match(table, /aria-expanded=\{optionsOpen\}/)
  // G8P2-R2 and G8P2-R1.
  assert.match(table, /const isNew = isNewCustomField\(field, savedIds\)/)
  assert.match(table, /\{isNew \? <StatusBadge tone="info" label=\{t\("form\.newBadge"\)\} \/> : null\}/)
  assert.match(table, /const warning = customFieldRenameWarning\(field, savedNameById, valueCounts\)/)
  assert.match(source, /savedFields=\{savedFields\}\n\s+valueCounts=\{context\.fieldValueCounts\}/)
  assert.match(source, /const savedFields = category\?\.customFieldDefs \?\? emptySavedFields/)
  assert.match(context, /readCategoryCustomFieldValueCounts\(categoryId, \(args\) => prisma\.asset\.findMany\(args\)\)/)
  assert.equal(th.category.form.newBadge, "ใหม่")
  assert.equal(th.category.form.optionsEdit, "แก้ตัวเลือก")
})

test("the save sends the form values as before: the API and its payload are unchanged", () => {
  assert.match(source, /body: JSON\.stringify\(values\),/)
  assert.match(source, /const url = isEdit \? `\/api\/categories\/\$\{category\?\.id\}` : "\/api\/categories"/)
  assert.match(source, /const method = isEdit \? "PUT" : "POST"/)
})

test("section 3: numbered photo items keep the editor's move limits and the shared button looks (board MD-Category-Edit, Task 3)", () => {
  assert.equal(source.match(/<Button variant="outline" size="sm"/g)?.length, 1, "add photo item")
  assert.match(source, /<Button\n\s+variant="outline"\n\s+size="sm"\n\s+onClick=\{\(\) => setCustomFields/, "add custom field in the section head")
  assert.match(source, /meta=\{photoCount > 0 \? t\("list\.photoCount", \{ count: photoCount \}\) : null\}/)
  // An ordered list: the visible "1." is decoration, the hidden label carries the number.
  assert.match(source, /<ol className="grid gap-2">/)
  assert.match(source, /<span aria-hidden="true" className="pt-2\.5 text-sm text-muted-foreground num">\{index \+ 1\}\.<\/span>/)
  assert.match(source, /<Field label=\{labels\.item\(index \+ 1\)\} hideLabel id=\{`category-photo-\$\{index\}`\} error=\{errorFor\(index\)\}>\n\s+<Input\n\s+value=\{item\}[\s\S]*?maxLength=\{100\}/)
  assert.match(source, /item: \(row: number\) => t\("form\.photoItemLabel", \{ row \}\)/)
  assert.equal(th.category.form.photoItemLabel, "รายการรูปที่ต้องการ {row, number}")
  assert.equal(source.match(/variant="outline"\n\s+size="icon-lg"/g)?.length, 4, "the photo item icons are 40px beside the 40px field (2D D5); remove is neutral (K22)")
  assert.match(source, /onClick=\{\(\) => moveItem\(index, -1\)\}\n\s+disabled=\{index === 0\}/)
  assert.match(source, /onClick=\{\(\) => moveItem\(index, 1\)\}\n\s+disabled=\{index === items\.length - 1\}/)
})

test("section 4: ใช้งาน is disabled only while an active saved category still has models or assets, counted as the PUT guard counts", () => {
  // Every model and asset, active or not (the guard reads _count), with the guard's own reason.
  assert.match(context, /prisma\.assetCategory\.findUnique\(\{ where: \{ id: categoryId \}, select: \{ _count: \{ select: \{ assets: true, models: true \} \} \} \}\)/)
  assert.match(context, /deactivationBlockReason: guardCounts \? getCategoryDeleteBlockReason\(guardCounts\._count\) : null/)
  assert.match(source, /const statusLocked = categoryStatusLocked\(\{ savedIsActive: category\?\.isActive, isActive: values\.isActive, blockReason: context\.deactivationBlockReason \}\)/)
  assert.match(source, /checked=\{values\.isActive\}\n\s+disabled=\{statusLocked\}/)
  assert.match(source, /aria-describedby=\{statusLocked \? "category-status-help category-status-locked" : "category-status-help"\}/)
  assert.match(source, /\{statusLocked \? <span id="category-status-locked" className="block text-meta text-muted-foreground">\{context\.deactivationBlockReason\}<\/span> : null\}/)
  assert.equal(th.category.form.statusHelp, "ถ้าไม่ใช้งาน หมวดหมู่นี้จะไม่แสดงในรายการเลือกของหน้าอื่น")
})

test("the side panel ผลของการแก้ไข: ตอนนี้ against หลังบันทึก from the live form state (G8P2-R3), sticky from lg, under the form on phones", () => {
  assert.match(source, /<\/div>\n\n\s+<CategoryEditSummary saved=\{category\} values=\{values\} context=\{context\} \/>/, "after the main column in the DOM")
  assert.match(summary, /<aside\n\s+data-category-edit-summary\n\s+aria-labelledby="category-summary-title"\n\s+className=\{cn\(getPanelClasses\(\), "grid min-w-0 content-start gap-4 p-4 sm:p-5 lg:sticky lg:top-4 lg:self-start"\)\}/)
  assert.match(summary, /const after = categoryFormTotals\(values\)/)
  assert.match(summary, /const now = saved \? categoryFormTotals\(saved\) : null/)
  // Create has no saved column: only หลังบันทึก.
  assert.match(summary, /\{now \? <th scope="col"[^>]*>\{t\("form\.summaryNow"\)\}<\/th> : null\}/)
  for (const key of ["summaryFields", "summaryRequired", "summaryPhotos", "summaryStatus"]) assert.ok(summary.includes(`t("form.${key}")`), key)
  assert.equal(th.category.form.summaryTitle, "ผลของการแก้ไข")
  assert.equal(th.category.form.summaryNow, "ตอนนี้")
  assert.equal(th.category.form.summaryAfter, "หลังบันทึก")
  assert.equal(th.category.form.summaryModels, "รุ่นในหมวดหมู่")
  assert.equal(th.category.form.summaryAssets, "ทรัพย์สินที่ได้รับผล")
  assert.match(en.category.form.summaryFieldCount, /\{count, plural, one \{# field\} other \{# fields\}\}/)
})

test("the sticky footer: the change summary from saved against current, cancel before save", () => {
  assert.match(source, /<StickyFormFooter\n\s+className="lg:col-span-2"\n\s+status=\{<span data-category-footer className="break-words">\{footerLine\}<\/span>\}\n\s+>/)
  assert.match(source, /const changeParts = category \? categoryChangeParts\(diffCategoryForm\(category, values\)\) : \[\]/)
  assert.equal(th.category.form.changeFieldsAdded, "เพิ่มช่องข้อมูล {count, number} ช่อง")
  assert.equal(th.category.form.footerEdit, "แก้ไข <b>{name}</b>")
  assert.equal(th.category.form.noChanges, "ยังไม่ได้แก้ไข")
  assert.match(en.category.form.changeFieldsAdded, /\{count, plural, one \{# field\} other \{# fields\}\}/)
})
