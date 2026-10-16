import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-4 (spec 2D §3.4, D7, D9, D10, D19, M17, M21, M22, M24, M25, M26, M28, M29, M33): the disposal screens on the
// shared parts. Panels are ContentPanel (or getPanelClasses where the element cannot be one), messages Notice by meaning,
// numbers StatStrip, label and value pairs KeyValueList, states StatusBadge, names the shared Chip, empty states
// EmptyNote, codes tag, empty values Nil, money formatMoney. Each test pins one file and fails before that commit.
// Sources are read with LF line endings, so the regexes may contain \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const C = "src/components/"

test("disposal stepper: the stage row and the steps sit in a ContentPanel (spec 2D D9, M28)", () => {
  const source = read(`${C}disposal/disposal-workflow-stepper.tsx`)
  assert.match(source, /^import \{ ContentPanel \} from "@\/components\/ui\/content-panel"$/m)
  assert.match(source, /<ContentPanel>\n\s+<div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">/)
  assert.match(source, /<Steps className="mt-4" label=\{stepsLabel\} steps=\{steps\} \/>\n\s+<\/ContentPanel>/)
  assert.doesNotMatch(source, /<section\b|rounded-lg border|waits for 2D/)
})
