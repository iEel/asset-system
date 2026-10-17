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
