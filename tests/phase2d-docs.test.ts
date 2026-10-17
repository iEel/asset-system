import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-5 (spec 2D §1 point 5, §6): the design docs say what the code does after phase 2D. No sentence may still
// wait for phase 2D ("until 2D", "2D moves", "waits for 2D-5"), and the guards are described by their EXEMPT and
// OWNERS lists (spec 2D §5.1, §5.2), not by budgets that go down. DEVELOPER_HANDOFF.md and docs/99_CHANGELOG.md are
// dated history, so the phrase check reads only DESIGN.md, docs/14 and .impeccable/design.json. One test per docs
// commit; each fails before its commit. Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

const STALE_2D = [
  /\buntil (?:phase )?2D\b/i,
  /\b2D moves?\b/i,
  /\bphase 2D (?:sets|empties|widens|moves?)\b/i,
  /\b2D-5's\b/,
  /\bwaits? for (?:plan )?2D-5\b/i,
  /\b2D-4 and 2D-5 (?:still )?(?:move|own)\b/i,
]
const staleLines = (path: string) =>
  read(path)
    .split("\n")
    .flatMap((line, index) => STALE_2D.filter((pattern) => pattern.test(line)).map((pattern) => `${path}:${index + 1} ${pattern}`))

test("DESIGN.md: nothing waits for phase 2D, and the guards are their EXEMPT lists (plan 2D-5, spec 2D §1 point 5)", () => {
  assert.deepEqual(staleLines("DESIGN.md"), [])
  const design = read("DESIGN.md")
  assert.doesNotMatch(design, /per-file budget|may only go down|`KEEP`|MIGRATED_FILTER_FILES|ratchet guards|has not moved to the parts yet/, "since plan 2D-5 every rule holds an exact EXEMPT list")
  assert.match(design, /Phase 2D \(spec `docs\/superpowers\/specs\/2026-10-15-ui-phase2d-design\.md`/, "the overview reaches phase 2D")
  assert.match(design, /the register's bulk selection bar, the login page frame and the topbar search/, "the three phase 3 places (D2)")
  assert.match(design, /holds exactly these 8 in its `EXEMPT` list/, "§4: the shadows that stay")
  assert.match(design, /fails a raw palette class/, "§2: the raw-color guard")
  assert.match(design, /A raw `<button>` stays only in a shared part that owns it \(the guard's `OWNERS`/, "§5: the raw button guard")
  assert.match(design, /no `disabled:opacity-\*` in `src`/)
  assert.match(design, /only the shared parts that draw one have a dashed border/)
  assert.match(design, /sets a height of its own at `sm:`/)
  assert.match(design, /Every `AccessibleDialog` in `src` has its footer part \(guard GD2\)/)
  assert.match(design, /holds every filter form in `src` to the shared fields/, "M19")
  assert.match(design, /\(guard LH1 `EXEMPT`\)/)
  assert.match(design, /an optional faint foot of at most two lines/, "StatStrip: the foot wraps to two lines before its ellipsis")
  assert.match(design, /24px help button in `labelAction` \(44px to tap below `md`/, "the help trigger's hit area on phones")
  assert.match(design, /which waits for phase 3 \(the user, 2026-10-16\)/, "codes inside translated sentences")
})

test("docs/14: the guard paragraph names OWNERS and EXEMPT, and the registry lists phase 2D (plan 2D-5)", () => {
  assert.deepEqual(staleLines("docs/14_UI_UX_DESIGN_SYSTEM.md"), [])
  const index = read("docs/14_UI_UX_DESIGN_SYSTEM.md")
  assert.doesNotMatch(index, /per-file budgets|`KEEP`|sets every budget|ratchet guards in/)
  assert.match(index, /each rule allows only the shared parts that own its pattern \(`OWNERS`\) and the sites of its `EXEMPT` list/)
  assert.match(index, /`exemptProblems` in `tests\/helpers\/guard-exempt\.ts`/)
  assert.match(index, /\n\| [^|\n]+ \| \[`2026-10-15-ui-phase2d-design\.md`\]\(superpowers\/specs\/2026-10-15-ui-phase2d-design\.md\)/, "Current-Surface Registry: the phase 2D row")
  assert.match(index, /never a height of its own at `sm:` and never `disabled:opacity-\*`/, "the Button row")
  assert.match(index, /a foot wraps to two lines at most/, "the StatStrip row")
})

test(".impeccable/design.json: valid LF JSON whose examples match the code after phase 2D (plan 2D-5)", () => {
  const raw = readFileSync(".impeccable/design.json", "utf8")
  assert.equal(raw.includes("\r"), false, "the file stays LF")
  type Design = {
    components: Array<{ name: string; description: string; css: string }>
    narrative: { rules: Array<{ name: string; body: string }>; dos: string[]; donts: string[] }
  }
  const design = JSON.parse(raw) as Design
  assert.deepEqual(staleLines(".impeccable/design.json"), [])
  assert.doesNotMatch(raw, /IBM Plex Sans Thai|table shell|per-file budget/)
  const component = (name: string) => design.components.find((entry) => entry.name === name) ?? { name, description: "", css: "" }
  for (const [name, cls] of [["Primary Button", "ds-btn-primary"], ["Secondary Button", "ds-btn-secondary"]]) {
    assert.match(component(name).css, new RegExp(`\\.${cls} \\{ min-height: 44px; padding: 0 14px;`), `${name}: 44px below 768px, 14px padding`)
    assert.match(component(name).css, new RegExp(`@media \\(min-width: 768px\\) \\{ \\.${cls} \\{ min-height: 0; height: 36px; \\} \\}`), `${name}: 36px from 768px (spec 2D D3)`)
  }
  assert.match(component("Dialog").css, /@media \(min-width: 768px\) \{ \.ds-dialog-x \{ width: 36px; height: 36px; \} \.ds-dialog-btn \{ min-height: 0; height: 36px; \} \}/)
  for (const entry of design.components) {
    // Only fields stay 40px from 768px (2C K7, spec 2D D4).
    if (entry.name !== "Text Field") assert.doesNotMatch(entry.css, /\b(?:height|width): 40px/, entry.name)
    if (/"IBM Plex Sans"/.test(entry.css)) assert.match(entry.css, /"IBM Plex Sans", "Noto Sans Thai Looped", system-ui, sans-serif/, `${entry.name}: the Thai font of src/app/layout.tsx`)
  }
  assert.match(component("Stat Strip").description, /foot of at most two lines/)
  assert.match(component("Stat Strip").css, /\.ds-stat-foot \{[^}]*-webkit-line-clamp: 2;/)
  const rule = (name: string) => design.narrative.rules.find((entry) => entry.name === name)?.body ?? ""
  assert.match(rule("The Where Color Lives Rule"), /no screen uses the info tokens/)
  assert.match(rule("The Border First Rule"), /holds exactly these 8 in its EXEMPT list/)
  for (const part of ["Chip", "PageHeader", "DataTable", "StatStrip", "KeyValueList", "ContentPanel divided", "ActionBar"]) assert.ok(design.narrative.dos[0].includes(part), `dos[0] names ${part}`)
  assert.ok(design.narrative.donts.some((entry) => /^Don't fade a disabled control with opacity/.test(entry)))
  assert.ok(design.narrative.donts.some((entry) => /allow only their shared parts \(OWNERS\) and the sites of their EXEMPT lists\.$/.test(entry)))
})
