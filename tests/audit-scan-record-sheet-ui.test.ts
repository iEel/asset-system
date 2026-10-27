import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const A = "src/components/audit/"
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).auditScan

test("a record row: the field name, the expected value struck through on ไม่ตรง, the shared Segmented ตรง / ไม่ตรง and, under ไม่ตรง, the ที่พบ picker (group 2 spec §12, P3-R8)", () => {
  const field = read(`${A}audit-scan-check-field.tsx`)
  assert.match(field, /^import \{ Segmented \} from "@\/components\/ui\/segmented"$/m)
  assert.match(field, /data-audit-check-field=\{field\}\n\s+data-mismatch=\{mismatch \? "true" : undefined\}/)
  assert.match(field, /const mismatch = state\.mode === "mismatch"/)
  assert.match(field, /<p className=\{fieldLabelClasses\}>\{label\}<\/p>/)
  assert.match(field, /<p className=\{cn\("break-words text-sm", mismatch \? "text-muted-foreground line-through" : "text-foreground"\)\}>\{labelFor\(expectedValue\)\}<\/p>/)
  assert.match(field, /<Segmented\n\s+aria-label=\{label\}\n\s+value=\{state\.mode\}\n\s+options=\{\[\n\s+\{ value: "match", label: t\("fieldMatch"\) \},\n\s+\{ value: "mismatch", label: t\("fieldMismatch"\) \},\n\s+\]\}\n\s+onValueChange=\{onModeChange\}\n\s+size="md"\n\s+showCheck\n\s+disabled=\{disabled\}/)
  assert.match(field, /\{mismatch \? \(\n\s+<div className="mt-2">\n\s+<SearchableSelect\n\s+id=\{id\}\n\s+label=\{t\("foundValue"\)\}\n\s+value=\{value\}\n\s+options=\{options\}\n\s+required\n/)
  assert.match(field, /placeholder=\{t\("foundPlaceholder"\)\}/)
  assert.match(field, /\{followsCustodian \? <p className="mt-1 text-meta text-muted-foreground">\{t\("departmentFollowsCustodian"\)\}<\/p> : null\}/)
  // The pressed segment keeps Segmented's own selected look: no solid warning fill (DESIGN.md colour rule); no raw button.
  assert.doesNotMatch(field, /bg-warning(?!-)|text-warning|clearLabel|t\("inSystem"|<button\b/)
})

test("the form keeps one record of values and per-field state, starts it from the shared defaults and still saves the server's diff (P3-R8)", () => {
  const form = read(`${A}audit-scan-check-form.tsx`)
  assert.match(form, /const \[record, setRecord\] = useState<AuditCheckRecord>\(\(\) =>\n\s+startAuditCheckRecord\(/)
  assert.match(form, /const values = record\.values/)
  assert.match(form, /const shown = auditCheckShownFields\(ownershipType\)/)
  assert.match(form, /const diff = diffCheckValues\(values, expected, ownershipType\)/)
  assert.match(form, /const marked = auditCheckMarkedFields\(record, ownershipType\)/)
  assert.match(form, /\{shown\.map\(\(field\) => \(\n\s+<AuditScanCheckField\n\s+key=\{field\}\n\s+id=\{FIELD_IDS\[FIELD_KEY\[field\]\]\}\n\s+field=\{field\}/)
  assert.match(form, /mode === "match" \? pressAuditCheckMatch\(current, field, recordContext\) : pressAuditCheckMismatch\(current, field\)/)
  assert.match(form, /chooseAuditCheckValue\(current, field, auditCheckValueFromFound\(id\), recordContext\)/)
  assert.match(form, /followsCustodian=\{field === "department" && record\.departmentFollowsCustodian\}/)
  assert.match(form, /custodian: auditCheckFoundOptions\("custodian", auditCheckCustodianOptions\(options\.employees, options\.departments\), t\("none"\)\)/)
  assert.match(form, /return \(id: string\) => \(id \? labels\[field\]\.get\(id\) \?\? t\("valueNotInList"\) : t\("none"\)\)/)
  assert.doesNotMatch(form, /suggestDepartmentForCustodian|setDepartmentTouched|fieldConfig|setValues/)
  assert.match(form, /onSubmit\(\{ values, remark, photos, applyCorrections, diff, mode \}\)/)
})

test("ไม่ตรง with nothing chosen: save shows เลือกค่าที่พบ under that row and moves focus to its ที่พบ picker (spec §12)", () => {
  const form = read(`${A}audit-scan-check-form.tsx`)
  assert.match(form, /const FIELD_IDS = \{\n  actualLocationId: "audit-check-location",\n  actualCustodianId: "audit-check-custodian",\n  actualDepartmentId: "audit-check-department",\n  actualConditionId: "audit-check-condition",\n\} as const/)
  const start = form.indexOf("function validate(")
  const validate = form.slice(start, form.indexOf("\n}\n", start))
  for (const line of [
    'check("actualLocationId", required(values.location) ?? chosen("location"))',
    'check("actualCustodianId", chosen("custodian"))',
    'check("actualDepartmentId", chosen("department"))',
    'check("actualConditionId", chosen("condition"))',
  ]) assert.ok(validate.includes(line), line)
  assert.match(form, /fieldErrors\.setErrors\(validate\(values, auditCheckUnchosenFields\(record, ownershipType\)\)\)\n\s+if \(focusFirstError\(\)\) return/)
  assert.match(form, /const fieldError = \(key: CheckField\) => \(fieldErrors\.errors\[key\] === CHOOSE_FOUND \? t\("chooseFoundValue"\) : fieldErrors\.message\(key\)\)/)
  assert.match(form, /error=\{fieldError\(FIELD_KEY\[field\]\)\}/)
})

test("the first scan's hint, the save label from the rows marked ไม่ตรง, and ถ่ายรูป / เพิ่มหมายเหตุ with a camera (spec §12)", () => {
  const form = read(`${A}audit-scan-check-form.tsx`)
  assert.match(form, /target\.item\.auditResult === "not_found" \? t\("sheetStatusNotFound"\) : t\("sheetHintFirstScan"\)/)
  assert.doesNotMatch(form, /sheetStatusPending/)
  assert.match(form, /const fields = marked\.map\(\(field\) => t\(fieldLabelKey\[field\]\)\)\.join\(", "\)/)
  assert.match(form, /marked\.length === 0 \? t\("saveAllMatch"\) : t\("saveMismatch", \{ count: marked\.length, fields \}\)/)
  assert.match(form, /variant=\{marked\.length === 0 \? "default" : "warning"\}/)
  assert.match(form, /<span className="inline-flex items-center gap-1\.5">\n\s+<Camera aria-hidden="true" \/>\n\s+\{t\("addNotePhoto"\)\}\n\s+<\/span>\n\s+<ChevronDown aria-hidden="true" \/>/)
})

test("the title is the asset's name; line 2 is its code and serial as tags that wrap, the out-of-scope sheet's too (bug 23, P3-R12)", () => {
  const workspace = read(`${A}audit-scan-workspace.tsx`)
  assert.match(workspace, /const targetTitle = target\?\.kind === "item" \? target\.item\.name : target\?\.asset\.subtitle \?\? ""/)
  assert.match(workspace, /const targetCode = target\?\.kind === "item" \? target\.item\.assetTag : target\?\.asset\.assetTag \?\? ""/)
  assert.match(workspace, /const targetSerial = target\?\.kind === "item" \? target\.item\.serialNumber : target\?\.asset\.serialNumber \?\? null/)
  assert.match(workspace, /<span className="tag whitespace-normal break-all">\{targetCode\}<\/span>/)
  assert.match(workspace, /\{targetSerial \? <> · Serial <span className="tag whitespace-normal break-all">\{targetSerial\}<\/span><\/> : null\}/)
  assert.match(read(`${A}audit-scan-types.ts`), /export type AuditLookupAsset = \{[\s\S]*?\n  subtitle: string\n  serialNumber: string \| null\n/)
  const panel = read(`${A}audit-scan-check-panel.tsx`)
  assert.match(panel, /<SheetHeader>\n\s+<SheetTitle>\{title\}<\/SheetTitle>\n\s+<SheetDescription>\{description\}<\/SheetDescription>\n\s+<\/SheetHeader>/)
  assert.match(panel, /<p className="text-sm text-muted-foreground">\{description\}<\/p>/)
  assert.doesNotMatch(panel, /truncate/)
})

test("a component row: พบ and ไม่พบ side by side, ไม่พบ opens the missing dialog, ⋯ keeps only the QR scan (spec §12)", () => {
  const panels = read(`${A}audit-scan-panels.tsx`)
  const panel = panels.slice(panels.indexOf("export function AuditComponentPanel"), panels.indexOf("export function AuditQrScannerOverlay"))
  assert.match(panel, /<Button variant="outline" size="sm" className="min-w-16" disabled=\{rowDisabled\} onClick=\{\(\) => onMarkMissing\(component\)\}>\n\s+\{t\("componentMarkMissing"\)\}\n\s+<span className="sr-only"> \{component\.assetTag\}<\/span>/)
  assert.ok(panel.indexOf('t("componentFound")') < panel.indexOf('t("componentMarkMissing")'), "พบ comes first")
  assert.ok(panel.indexOf('t("componentMarkMissing")') < panel.indexOf("<DropdownMenu>"), "ไม่พบ sits before ⋯, outside it")
  assert.equal(panel.match(/<DropdownMenuItem\b/g)?.length, 1, "⋯ holds the QR scan only")
  assert.doesNotMatch(panel, /openingDialogRef|onCloseAutoFocus|openMissing|AlertTriangle/)
})

test("Segmented turns every option off on disabled, in the shared disabled look (never opacity)", () => {
  const source = read("src/components/ui/segmented.tsx")
  assert.match(source, /\n  disabled\?: boolean\n/)
  assert.match(source, /const segmentedDisabledClasses = "disabled:cursor-not-allowed disabled:bg-background disabled:text-faint-foreground"/)
  assert.match(source, /aria-pressed=\{pressed\}\n\s+disabled=\{disabled\}\n/)
  assert.match(source, /pressed \? segmentedPressedClasses : segmentedIdleClasses,\n\s+segmentedDisabledClasses,/)
  assert.doesNotMatch(source, /opacity-/)
})

test("record sheet words in Thai and English, with the glossary's ไม่ตรง (spec §5, §12)", () => {
  const th = messages("th")
  const en = messages("en")
  assert.equal(th.fieldMatch, "ตรง")
  assert.equal(th.fieldMismatch, "ไม่ตรง")
  assert.equal(th.foundValue, "ที่พบ")
  assert.equal(th.foundPlaceholder, "เลือกจากรายการ")
  assert.equal(th.chooseFoundValue, "เลือกค่าที่พบ")
  assert.equal(th.departmentFollowsCustodian, "ตามแผนกของผู้ถือครองที่พบ")
  assert.equal(th.sheetHintFirstScan, "ตรงกับของจริงไหม แตะ ไม่ตรง เฉพาะเรื่องที่ต่าง")
  assert.equal(th.valueNotInList, "ไม่อยู่ในรายการ")
  assert.equal(th.addNotePhoto, "ถ่ายรูป / เพิ่มหมายเหตุ")
  assert.equal(th.componentMarkMissing, "ไม่พบ")
  assert.equal(en.fieldMatch, "Match")
  assert.equal(en.fieldMismatch, "Mismatch")
  assert.equal(en.chooseFoundValue, "Choose what you found")
  for (const gone of ["inSystem", "clearValue", "sheetStatusPending"]) {
    assert.equal(th[gone], undefined, gone)
    assert.equal(en[gone], undefined, gone)
  }
})
