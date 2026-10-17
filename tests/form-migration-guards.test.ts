import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"
import { getMobileShellMode } from "../src/lib/mobile-field-navigation.ts"
import { exemptProblems, phase3Rows, type ExemptList } from "./helpers/guard-exempt.ts"
import {
  countByFile,
  countMatchesByFile,
  findJsxElements,
  findJsxTags,
  findMatches,
  hasJsxAttr,
  jsxAttrValue,
  readSourceFiles,
} from "./helpers/source-files.ts"

// The phase 2C form guards (spec 2C §9), locked by plan 2D-5 (spec 2D §5.1, §5.2, §5.5, D1, D13). Every rule reads all
// of src. A rule that lets a file keep a site counts its sites per file: that file is an owner (a shared part that must
// write the markup itself, OWNERS) or a row of the rule's EXEMPT list with its exact count, why it stays, the ruling that
// keeps it and its kind, "permanent" or "phase 3" (the last test lists those); every other file counts 0. A count that
// drops fails too: lower or delete the row in the commit that moves the site. A new site uses the shared part, never a
// new row. Two lists are not budgets: CONSTRAINT_FLOORS only protect, and STAR_ONLY's three stars wait for the V track.
const sources = readSourceFiles("src")
const C = "src/components/"
const read = (path: string) => sources.find((file) => file.path === path)?.source ?? ""

const NON_FIELD_INPUT = /^(?:checkbox|radio|hidden|file)$/
const CONTROL_TAGS = ["Input", "NativeSelect", "Textarea", "SearchField", "ScannerTextInput", "FileDropzone", "input", "select", "textarea", "Select", "SelectField", "QueueSelect"]
const CONSTRAINT_TAGS = [...CONTROL_TAGS, "ChoiceCard", "ChoiceChip"]
const CONSTRAINT_ATTRS = ["required", "maxLength", "minLength"] as const
// "Class string" = one double-quoted string on one line (as in visual-foundation-guards.test.ts). A field class string
// has the field focus border, or a field's border, corners, padding and width/height with no button or box words.
// Strings with hover: are left out (fields have no hover; list buttons do).
const isFieldClassString = (text: string) =>
  !/\bhover:/.test(text) &&
  (/\bfocus(?:-visible)?:border-ring\b/.test(text) ||
    (/\bborder-(?:border|input)\b/.test(text) &&
      /\brounded(?:-md)?\b/.test(text) &&
      /\b(?:px-3|px-2|pl-9|pl-10)\b/.test(text) &&
      /\b(?:w-full|min-h-\d+|h-(?:9|10|11))\b/.test(text) &&
      !/\b(?:inline-flex|flex|grid|justify-center|font-medium|font-semibold)\b|\bfile:/.test(text)))
const rawFieldTags = (source: string) =>
  findJsxTags(source, ["input", "select", "textarea"]).filter((tag) => tag.name !== "input" || !NON_FIELD_INPUT.test(jsxAttrValue(tag.text, "type") ?? ""))
const classStringsWhere = (source: string, keep: (text: string) => boolean) => [...source.matchAll(/"[^"\n]*"/g)].filter((match) => keep(match[0])).length
// GD1: a close label typed as a literal (English or Thai; it must come from tCommon("close") or a key), and English X labels.
const LITERAL_CLOSE_LABEL = /closeLabel(?:Prop)?\s*=\s*"|closeLabel=\{["`]|(?:aria-label|title)="(?:Close|Cancel|Dismiss)"/g
const CLOSE_IS_CANCEL = /closeLabel=\{[^}]*\bcancel\b[^}]*\}/g
const OLD_FIELD_MARKUP = /ml-1 text-danger">\*|mb-1\.5 block text-sm font-medium text-foreground|<legend className="mb-2 text-sm font-medium text-foreground"|\b(?:h-4 w-4|h-5 w-5|h-3\.5 w-3\.5) rounded border-border\b|\baccent-primary\b/g
const OLD_HELPER_MARKUP = /\bfunction (?:FormStep|WizardStep|Choice|AssetStateFieldLabel)\b|aria-label=\{t\("batchAssetTagHelp"\)\}/g
// The stars that the server enforces while the control has no required (spec 2C §4.3 F5), keyed by the label expression,
// not a line number. The V track adds required and then removes the entry (the meta-test fails while one is stale).
const STAR_ONLY = new Set([`${C}asset-operations/checkin-form.tsx|t("returnDate")`, `${C}assets/asset-form.tsx|t("licenseTotalSeats")`, `${C}assets/asset-form.tsx|t("componentRole")`])
// Files that render StickyFormFooter and the routes that show them. Every route must be a focus route (no bottom navigation).
const STICKY_FOOTER_ROUTES: Record<string, string[]> = {
  [`${C}assets/asset-form.tsx`]: ["/th/assets/new", "/th/assets/sample-1/edit"],
  [`${C}admin/system-settings-form.tsx`]: ["/th/admin/settings"],
}

// ---- EXEMPT lists (spec 2D §5.1) and OWNERS (§5.2), by rule, recounted over all of src at 388d4d5. A why or a ruling
// never holds a line number (lines move).

// GF1 `function Field(` per file
const LOCAL_FIELD: ExemptList = {}

// GF2 hand-written <input> (not checkbox/radio/hidden/file), <select> and <textarea>
const RAW_FIELDS: ExemptList = {
  [`${C}assets/asset-label-print.tsx`]: { count: 2, kind: "permanent", why: "the print toolbar's two boxed fields, the print reason and the tape size: the label box carries the field look", ruling: "2C K21" },
  [`${C}audit/audit-scan-room-picker.tsx`]: { count: 1, kind: "permanent", why: "the room search at the top of the room sheet", ruling: "2C O20" },
  [`${C}layout/global-search.tsx`]: { count: 1, kind: "phase 3", why: "the topbar search combobox", ruling: "2D D2" },
}

// GF3 hand-written field class strings
const FIELD_CLASS_STRINGS: ExemptList = {
  [`${C}layout/global-search.tsx`]: { count: 1, kind: "phase 3", why: "the topbar search combobox's own field classes", ruling: "2D D2" },
}

// GF5 floors per file: [required, maxLength, minLength] on CONSTRAINT_TAGS. Every file of src that has one of them holds
// a row (a new form adds its row), and a floor never drops.
const CONSTRAINT_FLOORS: Record<string, readonly [number, number, number]> = {
  [`${C}maintenance/maintenance-plan-form.tsx`]: [4, 2, 0],
  [`${C}maintenance/repair-record-form.tsx`]: [2, 3, 0],
  [`${C}maintenance/repair-record-actions.tsx`]: [3, 6, 0],
  [`${C}asset-operations/checkin-form.tsx`]: [4, 0, 0],
  [`${C}asset-operations/checkout-form.tsx`]: [6, 0, 0],
  [`${C}asset-operations/transfer-form.tsx`]: [1, 1, 0],
  [`${C}asset-operations/bulk-move-form.tsx`]: [1, 1, 0],
  [`${C}disposal/disposal-request-form.tsx`]: [3, 1, 1],
  [`${C}disposal/disposal-batch-form.tsx`]: [1, 1, 1],
  [`${C}disposal/disposal-execution-button.tsx`]: [8, 4, 1],
  [`${C}disposal/disposal-decision-button.tsx`]: [3, 1, 0],
  [`${C}audit/audit-finding-review-actions.tsx`]: [1, 3, 0],
  [`${C}master-data/asset-model-form.tsx`]: [3, 1, 0],
  [`${C}assets/asset-form.tsx`]: [12, 10, 0],
  [`${C}assets/asset-batch-form.tsx`]: [10, 5, 0],
  [`${C}assets/asset-component-manager.tsx`]: [0, 4, 0],
  [`${C}admin/system-settings-form.tsx`]: [0, 1, 0],
  [`${C}master-data/branch-form.tsx`]: [3, 4, 0],
  [`${C}master-data/brand-form.tsx`]: [1, 1, 0],
  [`${C}master-data/category-form.tsx`]: [4, 7, 0],
  [`${C}master-data/company-form.tsx`]: [2, 6, 0],
  [`${C}master-data/department-form.tsx`]: [2, 2, 0],
  [`${C}master-data/employee-form.tsx`]: [6, 5, 0],
  [`${C}master-data/location-form.tsx`]: [4, 3, 0],
  [`${C}master-data/supplier-form.tsx`]: [2, 6, 0],
  [`${C}disposal/disposal-bulk-approval.tsx`]: [0, 1, 0],
  [`${C}disposal/disposal-bulk-execution.tsx`]: [5, 2, 1],
  [`${C}audit/audit-round-form.tsx`]: [7, 1, 0],
  [`${C}audit/audit-round-cancel-button.tsx`]: [1, 0, 0],
  [`${C}admin/admin-user-form.tsx`]: [3, 4, 1],
  [`${C}admin/role-permission-form.tsx`]: [2, 3, 0],
  [`${C}admin/IntegrationClientManager.tsx`]: [3, 3, 1],
  [`${C}admin/asset-state-review-dialog.tsx`]: [1, 1, 1],
  [`${C}assets/asset-label-print.tsx`]: [0, 1, 0],
  [`${C}assets/asset-register-table.tsx`]: [1, 1, 0],
  [`${C}asset-operations/transaction-cancel-dialog.tsx`]: [0, 1, 0],
  [`${C}auth/login-form.tsx`]: [2, 0, 0],
  [`${C}reports/report-preset-controls.tsx`]: [0, 1, 0],
  // Plan 2D-5 (spec 2D §5.5): the shared scanner input passes maxLength to its Input.
  [`${C}ui/scanner-text-input.tsx`]: [0, 1, 0],
}

// GF7 old label span, red star, legend and checkbox markup
const OLD_MARKUP: ExemptList = {}

// GB1 <Loader2 tags (every tag, also icons kept in a variable). A busy Button brings its own spinner (an owner).
const LOADER2: ExemptList = {
  [`${C}admin/IntegrationClientManager.tsx`]: { count: 1, kind: "permanent", why: "the loading status in the client list head", ruling: "2C I27" },
  [`${C}asset-operations/transaction-cancel-dialog.tsx`]: { count: 1, kind: "permanent", why: "the loading line in the dialog body", ruling: "2C I27" },
  [`${C}assets/asset-component-manager.tsx`]: { count: 1, kind: "permanent", why: "the searching status line", ruling: "2C I27" },
  [`${C}assets/asset-label-batch-tool.tsx`]: { count: 2, kind: "permanent", why: "the loading lines of the search results and of the recent queue", ruling: "2C I27" },
  [`${C}assets/asset-scan-search-tool.tsx`]: { count: 1, kind: "permanent", why: "the loading line of the results", ruling: "2C I27" },
  [`${C}audit/audit-scan-camera.tsx`]: { count: 1, kind: "permanent", why: "the spinner on the camera box while the camera starts", ruling: "2C I27" },
  [`${C}audit/audit-scan-check-form.tsx`]: { count: 1, kind: "permanent", why: "the components loading line of the check sheet", ruling: "2C I27" },
  [`${C}audit/audit-scan-lookup-card.tsx`]: { count: 1, kind: "permanent", why: "the register search status line", ruling: "2C I27" },
  [`${C}disposal/disposal-asset-picker.tsx`]: { count: 1, kind: "permanent", why: "the spinner inside the picker's search field", ruling: "2C I27" },
  [`${C}disposal/disposal-bulk-approval.tsx`]: { count: 2, kind: "permanent", why: "the preview and commit status lines in the dialog body", ruling: "2C I27" },
  [`${C}disposal/disposal-bulk-execution.tsx`]: { count: 1, kind: "permanent", why: "BusyLabel, the status line in the dialog body", ruling: "2C I27" },
  [`${C}layout/global-search.tsx`]: { count: 2, kind: "phase 3", why: "the topbar search: the spinner in its field and its results loading line", ruling: "2D D2" },
  [`${C}ui/scanner-text-input.tsx`]: { count: 4, kind: "permanent", why: "the shared scanner while the camera starts or the torch switches: the start and torch buttons, the line on the camera image and the line under it", ruling: "2C I27" },
}

// GL3 old helpers: FormStep, WizardStep, Choice, AssetStateFieldLabel and the batch asset tag help label
const OLD_HELPERS: ExemptList = {}

// GD4 flex-col-reverse (K8: the DOM order is the visual order)
const REVERSE: ExemptList = {}

// GD1 closeLabel={…cancel…}: the X read "Cancel"
const CLOSE_LABEL_IS_CANCEL: ExemptList = {}

// GL1 class strings with both fixed and bottom-. No owner: each of the two shared bars is an exact row (spec 2D §5.3).
const FIXED_BOTTOM_BARS: ExemptList = {
  [`${C}assets/asset-register-table.tsx`]: { count: 1, kind: "phase 3", why: "the register's phone bulk-action bar", ruling: "2D D2, 2B R-q" },
  [`${C}layout/mobile-field-navigation.tsx`]: { count: 1, kind: "permanent", why: "the phone bottom navigation", ruling: "2D §5.3" },
  [`${C}ui/action-bar.tsx`]: { count: 1, kind: "permanent", why: "the phone ActionBar of the four detail pages", ruling: "2C K23" },
}

// Every EXEMPT list of this file by rule id (the meta-test and the phase 3 test read them), and the shared parts that own
// a rule's markup. A rule added later declares `const <NAME>: ExemptList = {` and joins EXEMPT_LISTS in the same commit.
const EXEMPT_LISTS: Readonly<Record<string, ExemptList>> = {
  GF1: LOCAL_FIELD,
  GF2: RAW_FIELDS,
  GF3: FIELD_CLASS_STRINGS,
  GF7: OLD_MARKUP,
  GB1: LOADER2,
  GD1: CLOSE_LABEL_IS_CANCEL,
  GD4: REVERSE,
  GL1: FIXED_BOTTOM_BARS,
  GL3: OLD_HELPERS,
}
const OWNERS: Readonly<Record<string, readonly string[]>> = {
  GF1: [`${C}ui/field.tsx`],
  GF2: [`${C}ui/input.tsx`, `${C}ui/native-select.tsx`, `${C}ui/textarea.tsx`],
  GF3: [`${C}ui/field-variants.ts`],
  GB1: [`${C}ui/button.tsx`, `${C}ui/search-field.tsx`],
}
const listProblems = (rule: string, counts: Readonly<Record<string, number>>) => exemptProblems(rule, counts, EXEMPT_LISTS[rule], OWNERS[rule])

test("the JSX reader skips arrows, selectors, braces, quoted text and comments", () => {
  const source = [
    '<input onChange={(e) => set(e.target.value)} className="[&>svg]:size-4 required" required />',
    '<Field label={t("a")} required>',
    '  <Input value={x > 1 ? "a" : "b"} maxLength={20} />',
    "</Field>",
    "// <input commented />",
    '<label htmlFor="n"><label>inner</label></label>',
    '<Field label={t("open")}>',
  ].join("\n")
  const [input, ...more] = findJsxTags(source, ["input"])
  assert.equal(more.length, 0, "a tag on a // line is a comment")
  assert.equal(hasJsxAttr(input.text, "required"), true)
  assert.equal(input.selfClosing, true)
  assert.equal(jsxAttrValue(input.text, "className"), "[&>svg]:size-4 required")
  assert.equal(jsxAttrValue(input.text, "onChange"), "(e) => set(e.target.value)")
  const [field, open] = findJsxElements(source, "Field")
  assert.equal(field.line, 2)
  assert.equal(jsxAttrValue(field.text, "label"), 't("a")')
  assert.equal(jsxAttrValue(field.text, "required"), "")
  assert.equal(jsxAttrValue(field.text, "hint"), null)
  assert.match(field.children ?? "", /<Input value=/)
  assert.equal(open.children, null, "no closing tag")
  const [control] = findJsxTags(field.children ?? "", ["Input"])
  assert.equal(jsxAttrValue(control.text, "maxLength"), "20")
  const [outer] = findJsxElements(source, "label")
  assert.equal(outer.children, "<label>inner</label>", "same-name nesting is counted")
  assert.equal(hasJsxAttr("<Input value={required} />", "required"), false)
  assert.equal(hasJsxAttr('<Input className="x required" />', "required"), false)
  assert.equal(hasJsxAttr("<Input aria-required />", "required"), false)
  assert.equal(findJsxTags("<SelectField required />", ["Select"]).length, 0)
  assert.deepEqual(countByFile([{ path: "src/a.tsx", source: "<input /><input />" }, { path: "src/b.tsx", source: "" }], (file) => findJsxTags(file.source, ["input"]).length), { "src/a.tsx": 2 })
})

test("the guard's own lists name real files, and every EXEMPT row has a count, a kind, a why and a ruling (spec 2D §5.1)", () => {
  const exists = (path: string) => sources.some((file) => file.path === path)
  const problems: string[] = []
  for (const [rule, list] of Object.entries(EXEMPT_LISTS)) {
    // Held against its own counts, a list shows only its format problems: count, kind, why, ruling, an owner as a row.
    problems.push(...exemptProblems(rule, Object.fromEntries(Object.entries(list).map(([path, entry]) => [path, entry.count])), list, OWNERS[rule]))
    for (const path of Object.keys(list)) if (!exists(path)) problems.push(`${rule}: EXEMPT ${path} not found`)
  }
  for (const [rule, owners] of Object.entries(OWNERS)) {
    if (!Object.hasOwn(EXEMPT_LISTS, rule)) problems.push(`OWNERS: ${rule} has no EXEMPT list`)
    for (const path of owners) if (!exists(path)) problems.push(`${rule}: owner ${path} not found`)
  }
  // Every list belongs to a test of this file, and every `const …: ExemptList =` of the file is in EXEMPT_LISTS.
  const self = readFileSync("tests/form-migration-guards.test.ts", "utf8").replace(/\r\n/g, "\n")
  const ruleIds = new Set([...self.matchAll(/^test\("(\S+) /gm)].map((match) => match[1]))
  for (const rule of Object.keys(EXEMPT_LISTS)) if (!ruleIds.has(rule)) problems.push(`EXEMPT_LISTS: no test is named ${rule}`)
  const declared = [...self.matchAll(/^const (\w+): ExemptList = /gm)].map((match) => match[1])
  if (declared.length !== Object.keys(EXEMPT_LISTS).length) problems.push(`EXEMPT_LISTS holds ${Object.keys(EXEMPT_LISTS).length} lists; the file declares ${declared.join(", ")}`)
  for (const path of Object.keys(CONSTRAINT_FLOORS)) if (!exists(path)) problems.push(`CONSTRAINT_FLOORS: ${path} not found`)
  for (const path of Object.keys(STICKY_FOOTER_ROUTES)) if (!exists(path)) problems.push(`STICKY_FOOTER_ROUTES: ${path} not found`)
  // A STAR_ONLY entry is still a Field with the star whose control has no native required; the V track removes it.
  for (const key of STAR_ONLY) {
    const [path, label] = [key.slice(0, key.indexOf("|")), key.slice(key.indexOf("|") + 1)]
    const field = findJsxElements(read(path), "Field").find((element) => jsxAttrValue(element.text, "label") === label && hasJsxAttr(element.text, "required"))
    const control = findJsxTags(field?.children ?? "", CONTROL_TAGS).find((tag) => !/^(?:checkbox|radio|hidden)$/.test(jsxAttrValue(tag.text, "type") ?? ""))
    if (!control || hasJsxAttr(control.text, "required")) problems.push(`STAR_ONLY: ${key} is not a star without native required any more; remove it`)
  }
  assert.deepEqual(problems, [])
})

test("GF1 no file keeps its own Field component", () => {
  assert.deepEqual(listProblems("GF1", countMatchesByFile(sources, /\bfunction Field\s*\(/g)), [])
})

test("GF2 hand-written inputs, selects and textareas stay in the shared fields and their EXEMPT rows", () => {
  assert.deepEqual(listProblems("GF2", countByFile(sources, (file) => rawFieldTags(file.source).length)), [])
})

test("GF3 hand-written field class strings stay in the shared field classes and their EXEMPT rows", () => {
  assert.deepEqual(listProblems("GF3", countByFile(sources, (file) => classStringsWhere(file.source, isFieldClassString))), [])
})

test("GF4 a Field that shows the required star keeps native required on its control (critic risk 5)", () => {
  const problems: string[] = []
  for (const file of sources) {
    const vTrack = /\bnoValidate\b/.test(file.source) && /\bvalidate\(/.test(file.source)
    for (const field of findJsxElements(file.source, "Field")) {
      const where = `${file.path}:${field.line}`
      const children = field.children ?? ""
      if (findJsxTags(children, ["SearchableSelect"]).length > 0) problems.push(`${where}: SearchableSelect inside Field (it renders its own label)`)
      // The first control (a file input counts; checkbox, radio and hidden do not).
      const control = findJsxTags(children, CONTROL_TAGS).find((tag) => !/^(?:checkbox|radio|hidden)$/.test(jsxAttrValue(tag.text, "type") ?? ""))
      const star = hasJsxAttr(field.text, "required")
      const native = control ? hasJsxAttr(control.text, "required") : /\brequired\b/.test(children)
      const exempt = STAR_ONLY.has(`${file.path}|${jsxAttrValue(field.text, "label")}`)
      if (star && !native && !vTrack && !exempt) problems.push(`${where}: star without native required (the only browser check would disappear)`)
      if (native && !star) problems.push(`${where}: native required without the star`)
    }
  }
  assert.deepEqual(problems, [])
})

test("GF5 required, maxLength and minLength never disappear quietly (K4)", () => {
  const lost: string[] = []
  for (const file of sources) {
    const tags = findJsxTags(file.source, CONSTRAINT_TAGS)
    const live = CONSTRAINT_ATTRS.map((attr) => tags.filter((tag) => hasJsxAttr(tag.text, attr)).length)
    const floor = CONSTRAINT_FLOORS[file.path]
    if (!floor) {
      if (live.some((count) => count > 0)) lost.push(`${file.path}: [${live.join(", ")}] and no row; add it to CONSTRAINT_FLOORS`)
      continue
    }
    CONSTRAINT_ATTRS.forEach((attr, index) => {
      if (live[index] < floor[index]) lost.push(`${file.path}: ${attr} ${live[index]} < ${floor[index]}`)
    })
  }
  assert.deepEqual(lost, [], "Field only adds aria-required: keep required, maxLength and minLength on the control itself")
})

test("GF6 money fields open the decimal keypad (K26)", () => {
  const problems: string[] = []
  for (const file of sources) {
    for (const tag of findJsxTags(file.source, ["Input", "input"])) {
      if (/\sstep="0\.01"/.test(tag.text) && jsxAttrValue(tag.text, "inputMode") !== "decimal") problems.push(`${file.path}:${tag.line}`)
    }
  }
  assert.deepEqual(problems, [], 'a step="0.01" field needs inputMode="decimal"')
})

test("GF7 the old label, star, legend and checkbox markup does not come back", () => {
  assert.deepEqual(listProblems("GF7", countMatchesByFile(sources, OLD_FIELD_MARKUP)), [])
})

test("GF8 a label never wraps something that brings its own label", () => {
  const problems: string[] = []
  for (const file of sources) {
    for (const label of findJsxElements(file.source, "label")) {
      const nested = (label.children ?? "").match(/<(Field|FileDropzone|ScannerTextInput|SearchableSelect|label)(?=[\s/>])/)
      if (nested) problems.push(`${file.path}:${label.line}: <label> wraps <${nested[1]}>`)
    }
  }
  assert.deepEqual(problems, [])
})

test("GB1 hand-written spinners stay in the shared parts and their EXEMPT rows", () => {
  assert.deepEqual(listProblems("GB1", countMatchesByFile(sources, /<Loader2\b/g)), [])
})

// Plan 2D-5: over all of src, and in a button too (a hand-placed spinner inside a raw button spins on as well). Busy
// Buttons bring their own spinner, which stops. Every line that spins (animate-spin) also stops under reduced motion.
test("GB2 every spinner stops for users who reduce motion, in a button or not", () => {
  const problems: string[] = []
  for (const file of sources) {
    file.source.split("\n").forEach((line, index) => {
      if (/\banimate-spin\b/.test(line) && !/\bmotion-reduce:animate-none\b/.test(line)) problems.push(`${file.path}:${index + 1}`)
    })
  }
  assert.deepEqual(problems, [], "add motion-reduce:animate-none to the class that spins, on the same line")
})

// Plan 2D-5 (spec 2D §5.5): one rule over all of src instead of the 2C list of label swaps (BUSY_LABEL_SWAPS, all gone
// by plan 2D-1). A Button or button with busy={x} never reads x in its children: no "…ing" label, no second icon.
test("GB3 a busy button keeps its label (K13)", () => {
  const problems: string[] = []
  let busyButtons = 0
  for (const file of sources) {
    for (const button of [...findJsxElements(file.source, "Button"), ...findJsxElements(file.source, "button")]) {
      const busy = jsxAttrValue(button.text, "busy")?.trim()
      if (!busy) continue
      busyButtons++
      const expression = busy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*")
      if (new RegExp(`(?<![\\w.$])${expression}(?![\\w$])`).test(button.children ?? "")) problems.push(`${file.path}:${button.line}: the label reads busy={${busy}}`)
    }
  }
  assert.ok(busyButtons >= 50, `the reader found ${busyButtons} busy buttons, expected 50 or more`)
  assert.deepEqual(problems, [], "keep the label and the leading icon: busy shows the spinner (2C K13)")
})

test("GB4 disabled never repeats the busy condition, so focus stays on the busy button", () => {
  const problems: string[] = []
  let busyTags = 0
  for (const file of sources) {
    for (const tag of findJsxTags(file.source, ["[A-Za-z][\\w.]*"])) {
      const busy = jsxAttrValue(tag.text, "busy")
      if (busy === null) continue
      busyTags++
      const disabled = jsxAttrValue(tag.text, "disabled")
      if (disabled === null || busy.trim() === "") continue
      const expression = busy.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*")
      if (new RegExp(`(?<![\\w.$])${expression}(?![\\w$])`).test(disabled)) problems.push(`${file.path}:${tag.line}: busy={${busy}} disabled={${disabled}}`)
    }
  }
  assert.ok(busyTags > 0, "the reader found no busy= at all")
  assert.deepEqual(problems, [])
})

test("GD1 close buttons are named in the reader's language, never Close or Cancel", () => {
  const english = ["dialog", "sheet", "alert-dialog", "accessible-dialog"]
    .map((name) => `${C}ui/${name}.tsx`)
    .filter((path) => !read(path) || /"Close"|>\s*Close\s*</.test(read(path)))
  assert.deepEqual(english, [], 'these dialog primitives are missing or still say "Close"')
  assert.deepEqual(findMatches(sources, LITERAL_CLOSE_LABEL), [], 'take the X label from tCommon("close") or a key')
  assert.deepEqual(listProblems("GD1", countMatchesByFile(sources, CLOSE_IS_CANCEL)), [])
})

test("GD2 every dialog uses the footer part", () => {
  const problems: string[] = []
  for (const file of sources) {
    if (file.path === `${C}ui/accessible-dialog.tsx`) continue
    const dialogs = findJsxTags(file.source, ["AccessibleDialog"]).length
    const footers = findJsxTags(file.source, ["AccessibleDialogFooter"]).length
    if (footers < dialogs) problems.push(`${file.path}: ${dialogs} AccessibleDialog, ${footers} AccessibleDialogFooter`)
  }
  assert.deepEqual(problems, [])
})

test("GD3 a dialog footer holds only Button parts", () => {
  const problems: string[] = []
  for (const file of sources) {
    for (const footer of findJsxElements(file.source, "AccessibleDialogFooter")) {
      if (footer.children === null) {
        problems.push(`${file.path}:${footer.line}: no closing tag`)
        continue
      }
      const bad = footer.children.match(/<button(?=[\s/>])|<Loader2\b|className=|size="|flex-col-reverse|\bsticky\b|opacity-/)
      if (bad) problems.push(`${file.path}:${footer.line}: ${bad[0]}`)
    }
  }
  assert.deepEqual(problems, [], "use Button / AccessibleDialogCancel with the default size, busy for work in progress, and no classes")
})

test("GD4 the secondary action comes before the primary one, and nothing reverses the order (K8)", () => {
  const problems: string[] = []
  for (const file of sources) {
    for (const name of ["AccessibleDialogFooter", "StickyFormFooter"]) {
      for (const footer of findJsxElements(file.source, name)) {
        const children = footer.children ?? ""
        const secondary = children.search(/<AccessibleDialogCancel\b|variant(?:=|: )"outline"/)
        const submit = children.indexOf('type="submit"')
        if (secondary !== -1 && submit !== -1 && submit < secondary) problems.push(`${file.path}:${footer.line}: submit before the secondary action`)
      }
    }
  }
  assert.deepEqual(problems, [])
  assert.deepEqual(listProblems("GD4", countMatchesByFile(sources, /\bflex-col-reverse\b/g)), [])
})

test("GD5 a dialog that renders inside a form has no form and no submit button of its own (P13)", () => {
  const problems: string[] = []
  let pairs = 0
  for (const file of sources) {
    for (const form of findJsxElements(file.source, "form")) {
      for (const dialog of findJsxElements(form.children ?? "", "AccessibleDialog")) {
        pairs++
        if (/<form(?=[\s/>])|type="submit"/.test(dialog.children ?? "")) problems.push(`${file.path}:${form.line}: the dialog inside this form submits the outer form`)
      }
    }
  }
  assert.ok(pairs > 0, "expected the settings prefix dialog inside the settings form")
  assert.deepEqual(problems, [])
})

test("GD6 a form that holds a dialog footer is a flex column, so the footer stays at the bottom", () => {
  const problems: string[] = []
  for (const file of sources) {
    for (const form of findJsxElements(file.source, "form")) {
      const children = form.children ?? ""
      // A page form that wraps a whole dialog (the settings prefix dialog) is not the dialog's form.
      if (!/<AccessibleDialogFooter(?=[\s/>])/.test(children) || /<AccessibleDialog(?=[\s/>])/.test(children)) continue
      if (jsxAttrValue(form.text, "className") !== "accessibleDialogFormClasses") problems.push(`${file.path}:${form.line}`)
    }
  }
  assert.deepEqual(problems, [], "use className={accessibleDialogFormClasses}")
})

test("GL1 the long-form save bar is a flat sticky bar, used only on focus routes", () => {
  const footer = read(`${C}ui/sticky-form-footer.tsx`)
  assert.match(footer, /\bsticky\b/)
  assert.doesNotMatch(footer, /\bfixed\b|\bshadow-|backdrop-blur|\bbg-[\w-]+\/\d+/)
  const problems: string[] = []
  for (const file of sources) {
    if (findJsxTags(file.source, ["StickyFormFooter"]).length === 0) continue
    const routes = STICKY_FOOTER_ROUTES[file.path]
    if (!routes) problems.push(`${file.path}: add its routes to STICKY_FOOTER_ROUTES`)
    for (const route of routes ?? []) if (getMobileShellMode(route) !== "focus") problems.push(`${file.path}: ${route} shows the bottom navigation, which covers the bar`)
  }
  assert.deepEqual(problems, [])
  const fixedBottom = (text: string) => /\bfixed\b/.test(text) && /\bbottom-/.test(text)
  assert.deepEqual(listProblems("GL1", countByFile(sources, (file) => classStringsWhere(file.source, fixedBottom))), [])
})

// Every route under the dashboard, read from its page.tsx files, with [segments] kept as written (spec 2C section 9.3).
function dashboardRoutes(dir = "src/app/[locale]/(dashboard)", prefix = ""): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return dashboardRoutes(path, prefix ? `${prefix}/${entry}` : entry)
    return entry === "page.tsx" ? [prefix] : []
  })
}
// The four asset task pages are focus routes without being forms (phase 1).
const TASK_ROUTES = new Set(["asset-management/checkout", "asset-management/checkin", "asset-management/transfer", "asset-management/bulk-move"])

test("GL2 form routes hide the bottom navigation and list routes keep it (K15)", () => {
  const routes = dashboardRoutes()
  assert.ok(routes.length > 70, `expected the dashboard routes, found ${routes.length}`)
  const wrong: string[] = []
  for (const route of routes) {
    const mode = getMobileShellMode(`/th/${route.replace(/\[[^\]]+\]/g, "sample-1")}`)
    const isForm = /(?:^|\/)new$|\/\[[^\]]+\]\/edit$/.test(route) || route === "admin/settings"
    const isList = !route.includes("[") && !isForm && !TASK_ROUTES.has(route)
    if (isForm && mode !== "focus") wrong.push(`${route}: ${mode}, a form route must be focus`)
    if (isList && mode !== "navigation") wrong.push(`${route}: ${mode}, a list route keeps the bottom navigation`)
  }
  assert.deepEqual(wrong, [])
})

test("GL3 the old step, choice and label helpers do not come back", () => {
  assert.deepEqual(listProblems("GL3", countMatchesByFile(sources, OLD_HELPER_MARKUP)), [])
})

test("phase 3: every row the form guards leave to phase 3, and their sum (spec 2D §5.1, D2)", () => {
  const rows = phase3Rows(EXEMPT_LISTS)
  assert.deepEqual(rows.map(({ rule, file, count }) => `${rule} ${file}: ${count}`), [
    "GF2 src/components/layout/global-search.tsx: 1",
    "GF3 src/components/layout/global-search.tsx: 1",
    "GB1 src/components/layout/global-search.tsx: 2",
    "GL1 src/components/assets/asset-register-table.tsx: 1",
  ])
  assert.equal(rows.reduce((sum, row) => sum + row.count, 0), 5)
})
