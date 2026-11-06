import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  buildLocationParentOptions,
  parentAfterBranchChange,
  resolveLocationFormPreset,
  type LocationRuleRow,
} from "../src/lib/location-parent-options.ts"

// Page group 7 plan 3 Task 2 (spec §6.2; Review Focus 1, 5): the location form's parent picker lists only active
// locations of the chosen branch with their name path, leaves out the location and all its descendants on edit (an
// inactive middle node included), changing the branch clears a parent of another branch, and ?branchId=&parentId=
// presets both on create. Sources are read CRLF-safe.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

const row = (input: Partial<LocationRuleRow> & { id: string }): LocationRuleRow => ({
  code: input.id.toUpperCase(),
  name: input.id,
  locationType: "Room",
  branchId: "b1",
  parentId: null,
  isActive: true,
  ...input,
})

// อาคาร A › ชั้น 3 › (ห้องเก่า, inactive) › ห้อง IT; อาคาร A › ชั้น 4; a second branch with its own building; and an
// inactive room of b1.
const rows: LocationRuleRow[] = [
  row({ id: "bldA", code: "A", name: "อาคาร A", locationType: "Building" }),
  row({ id: "fl3", code: "A-3", name: "ชั้น 3", locationType: "Floor", parentId: "bldA" }),
  row({ id: "old", code: "A-3-OLD", name: "ห้องเก่า", parentId: "fl3", isActive: false }),
  row({ id: "it", code: "A-3-IT", name: "ห้อง IT", parentId: "old" }),
  row({ id: "fl4", code: "A-4", name: "ชั้น 4", locationType: "Floor", parentId: "bldA" }),
  row({ id: "bldB", code: "B", name: "อาคาร B", locationType: "Building", branchId: "b2" }),
  row({ id: "gone", code: "Z", name: "ห้องปิด", isActive: false }),
]

test("the parent options are the active locations of the chosen branch, in tree order, each with its name path", () => {
  const options = buildLocationParentOptions(rows, { branchId: "b1", editingId: null })
  assert.deepEqual(options.map((option) => option.id), ["bldA", "fl3", "fl4", "it"])
  assert.deepEqual(options.find((option) => option.id === "fl3")?.path, ["อาคาร A", "ชั้น 3"])
  assert.equal(options.find((option) => option.id === "fl3")?.parentId, "bldA")
  assert.equal(options.find((option) => option.id === "bldA")?.activeChildCount, 2)
  // Under an inactive parent a location is a root of the tree, so its path starts at itself.
  assert.deepEqual(options.find((option) => option.id === "it")?.path, ["ห้อง IT"])
  assert.deepEqual(buildLocationParentOptions(rows, { branchId: "b2", editingId: null }).map((option) => option.id), ["bldB"])
  assert.deepEqual(buildLocationParentOptions(rows, { branchId: "", editingId: null }), [], "no branch, no parent")
})

test("editing leaves out the location and every descendant, also below an inactive middle node (Review Focus 1)", () => {
  const options = buildLocationParentOptions(rows, { branchId: "b1", editingId: "fl3" })
  assert.deepEqual(options.map((option) => option.id), ["bldA", "fl4"], "ชั้น 3 itself and ห้อง IT under the inactive ห้องเก่า")
  assert.deepEqual(buildLocationParentOptions(rows, { branchId: "b1", editingId: "bldA" }).map((option) => option.id), [], "the whole building")
})

test("an existing parent outside the list is kept as an option so an unrelated edit does not drop it (spec §6.2)", () => {
  const crossing = [...rows, row({ id: "roomX", branchId: "b2", parentId: "fl4" })]
  const options = buildLocationParentOptions(crossing, { branchId: "b2", editingId: "roomX", keepParentId: "fl4" })
  const kept = options.find((option) => option.id === "fl4")
  assert.ok(kept, "the stored parent of another branch stays chosen")
  assert.equal(kept.kept, true)
  assert.deepEqual(kept.path, ["อาคาร A", "ชั้น 4"])
  // Never a cycle, never an unknown id.
  assert.equal(buildLocationParentOptions(rows, { branchId: "b1", editingId: "fl3", keepParentId: "it" }).some((option) => option.id === "it"), false)
  assert.equal(buildLocationParentOptions(rows, { branchId: "b1", editingId: null, keepParentId: "nope" }).length, 4)
})

test("final review 2: the stored parent is kept only while the chosen branch is the stored one", () => {
  const crossing = [...rows, row({ id: "roomX", branchId: "b2", parentId: "fl4" })]
  const keep = { editingId: "roomX", keepParentId: "fl4", keepBranchId: "b2" }
  assert.equal(buildLocationParentOptions(crossing, { ...keep, branchId: "b2" }).find((option) => option.id === "fl4")?.kept, true)
  assert.equal(buildLocationParentOptions(crossing, { ...keep, branchId: "b3" }).some((option) => option.id === "fl4"), false)
  assert.equal(buildLocationParentOptions(crossing, { ...keep, branchId: "" }).some((option) => option.id === "fl4"), false)
  const form = read("src/components/master-data/location-form.tsx")
  assert.match(form, /keepBranchId: location\?\.branchId \?\? null,/)
})

test("changing the branch clears a parent of another branch and keeps one of the new branch", () => {
  assert.equal(parentAfterBranchChange(rows, "fl3", "b2"), "")
  assert.equal(parentAfterBranchChange(rows, "fl3", "b1"), "fl3")
  assert.equal(parentAfterBranchChange(rows, "", "b1"), "")
  assert.equal(parentAfterBranchChange(rows, "nope", "b1"), "")
})

test("?branchId=&parentId= preset both on create and are ignored when invalid (Review Focus 5)", () => {
  const branchIds = ["b1", "b2"]
  assert.deepEqual(resolveLocationFormPreset({ branchId: "b1", parentId: "fl3" }, { branchIds, rows }), { branchId: "b1", parentId: "fl3" })
  assert.deepEqual(resolveLocationFormPreset({ branchId: "b1" }, { branchIds, rows }), { branchId: "b1", parentId: "" })
  assert.deepEqual(resolveLocationFormPreset({ branchId: "b9", parentId: "fl3" }, { branchIds, rows }), { branchId: "", parentId: "" }, "unknown branch")
  assert.deepEqual(resolveLocationFormPreset({ branchId: "b2", parentId: "fl3" }, { branchIds, rows }), { branchId: "b2", parentId: "" }, "parent of another branch")
  assert.deepEqual(resolveLocationFormPreset({ branchId: "b1", parentId: "gone" }, { branchIds, rows }), { branchId: "b1", parentId: "" }, "inactive parent")
  assert.deepEqual(resolveLocationFormPreset({ branchId: ["b1", "b2"], parentId: ["fl3"] }, { branchIds, rows }), { branchId: "", parentId: "" }, "repeated parameters")
  assert.deepEqual(resolveLocationFormPreset({ parentId: "fl3" }, { branchIds, rows }), { branchId: "", parentId: "" }, "a parent needs its branch")
})

test("the new and edit pages read the locations once and hand the form the rows; the new page presets from the URL", () => {
  const newPage = read("src/app/[locale]/(dashboard)/master-data/locations/new/page.tsx")
  const editPage = read("src/app/[locale]/(dashboard)/master-data/locations/[id]/edit/page.tsx")
  for (const [name, source] of [["new", newPage], ["edit", editPage]] as const) {
    assert.match(source, /prisma\.location\.findMany\(\{\n\s+select: locationRuleSelect,/, `${name}: every location, inactive ones too (descendants)`)
    assert.match(source, /locationRows=\{locationRows\}/, `${name}: the rows go to the form`)
    assert.doesNotMatch(source, /parentLocations/, `${name}: the flat parent list is gone`)
  }
  assert.match(newPage, /resolveLocationFormPreset\(\{ branchId: rawSearchParams\.branchId, parentId: rawSearchParams\.parentId \}/)
  assert.match(newPage, /preset=\{preset\}/)
})

test("the form: the parent is a searchable picker of the branch's paths, the type reads in Thai, and the board's sections", () => {
  const source = read("src/components/master-data/location-form.tsx")
  assert.match(source, /buildLocationParentOptions\(locationRows, \{\n\s+branchId: values\.branchId,\n\s+editingId: location\?\.id \?\? null,\n\s+keepParentId: location\?\.parentId \?\? null,/)
  assert.match(source, /<SearchableSelect\n\s+id="location-parent"/)
  assert.match(source, /error=\{fieldErrors\.message\("parentId"\)\}/)
  assert.doesNotMatch(source, /<NativeSelect[^>]*\n\s+value=\{values\.parentId/, "the parent is no NativeSelect")
  assert.match(source, /parentAfterBranchChange\(locationRows, current\.parentId \?\? "", branchId\)/)
  assert.match(source, /fieldErrors\.clear\("branchId", "parentId"\)/)
  // The path is written with the branch first, as the board ("สำนักงานใหญ่ › อาคาร A › ชั้น 3").
  assert.match(source, /const PATH_SEPARATOR = " › "/)
  // Type: three Segmented groups inside one FieldGroup, every label through formatLocationType.
  assert.match(source, /<FieldGroup legend=\{t\("locationType"\)\} id="location-type" required error=\{fieldErrors\.message\("locationType"\)\}>/)
  assert.equal(source.match(/<Segmented\b/g)?.length, 1, "one Segmented, mapped over the three groups")
  assert.match(source, /label: formatLocationType\(type, t\)/)
  // The board: three numbered sections, the "after save" column and the save bar.
  for (const number of [1, 2, 3]) assert.match(source, new RegExp(`<FormSection number=\\{${number}\\} `))
  assert.match(source, /<StickyFormFooter\b/)
  assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate className="mx-auto max-w-6xl">/)
  assert.match(source, /data-location-preview/)
})

// Group 7 follow-ups Task 4 (MD-Location-New): each parent row shows the name (with its code) bold, the path from the
// branch as a muted second line, the type as a chip and "ย่อย {n}" (active children); the path stays searchable through
// keywords, and the kept stored parent still says so in its label.
test("the parent picker's rich rows: name · code, path line, type chip, active child count, path searchable", () => {
  const source = read("src/components/master-data/location-form.tsx")
  assert.match(source, /label: `\$\{option\.name\} · \$\{option\.code\}\$\{option\.kept \? ` \(\$\{t\("form\.parentKept"\)\}\)` : ""\}`,/)
  assert.match(source, /description: pathOf\(option\)\.join\(PATH_SEPARATOR\),/)
  assert.match(source, /keywords: pathOf\(option\)\.join\(PATH_SEPARATOR\),/)
  assert.match(source, /meta: formatLocationType\(option\.locationType, t\),/)
  assert.match(source, /aside: t\("form\.parentChildCount", \{ count: option\.activeChildCount \}\),/)
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).location.form as Record<string, string>
  const en = JSON.parse(readFileSync("messages/en.json", "utf8")).location.form as Record<string, string>
  assert.equal(th.parentChildCount, "ย่อย {count}")
  assert.equal(en.parentChildCount, "{count} children")
})

test("the form's new copy is in th and en", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).location.form as Record<string, string>
  const en = JSON.parse(readFileSync("messages/en.json", "utf8")).location.form as Record<string, string>
  assert.equal(th.sectionWhere, "อยู่ที่ไหนในโครงสร้าง")
  assert.equal(th.previewTitle, "หลังบันทึกจะอยู่ที่")
  assert.equal(th.branchHint, "เปลี่ยนสาขาแล้ว ที่ตั้งแม่ที่เลือกไว้จะถูกล้าง")
  for (const key of Object.keys(th)) assert.ok(en[key], `en location.form.${key}`)
  for (const key of Object.keys(en)) assert.ok(th[key], `th location.form.${key}`)
})
