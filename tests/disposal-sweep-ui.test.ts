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

test("disposal evidence: a ContentPanel, EmptyNote, the shared download link and delete button, and no teal icon (spec 2D D9, M21, M29)", () => {
  const source = read(`${C}disposal/disposal-attachments.tsx`)
  assert.match(source, /<ContentPanel title=\{title \?\? t\("requestEvidence"\)\}>/)
  assert.match(source, /<EmptyNote>\{tCommon\("noData"\)\}<\/EmptyNote>/)
  assert.match(source, /<a href=\{`\/api\/attachments\/\$\{attachment\.id\}`\} className=\{cn\(buttonVariants\(\{ variant: "outline", size: "sm" \}\), "flex-1"\)\}>/)
  assert.match(source, /<Button\s+variant="danger"\s+size="icon-sm"\s+onClick=\{\(\) => handleDelete\(attachment\.id\)\}\s+busy=\{deletingId === attachment\.id\}\s+aria-label=\{tCommon\("delete"\)\}/)
  assert.doesNotMatch(source, /<button\b|<section\b|Loader2|disabled:opacity|border-dashed|rounded-lg border|text-lg|text-info|text-primary|hover:bg-accent|\btext-xs\b|sm:h-8/)
})

test("disposal asset picker: shared remove buttons, one quiet list of the chosen assets, options on the row hover, EmptyNote and 13px meta lines (spec 2D M21, M29)", () => {
  const source = read(`${C}disposal/disposal-asset-picker.tsx`)
  assert.equal(source.match(/<Button variant="outline" size="icon-sm" onClick=\{\(\) => (?:onChange\(\[\]\)|toggle\(asset\))\}[^>]*><X aria-hidden="true" \/><\/Button>/g)?.length, 2, "clearing the one choice and taking an asset off the list")
  // Open issue 10 b (approved 2026-10-16): each remove button names its action and its asset, not the no-results text.
  assert.match(source, /const tAssetTools = useTranslations\("assetTools"\)/)
  assert.equal(source.match(/aria-label=\{`\$\{tAssetTools\("removeSelectedAsset"\)\}: \$\{(?:selected\[0\]|asset)\.label\}`\}/g)?.length, 2)
  assert.doesNotMatch(source, /aria-label=\{emptyLabel\}/)
  assert.match(source, /<div className="mt-3 max-h-56 divide-y divide-border-soft overflow-y-auto rounded-md border border-border">/)
  assert.match(source, /<EmptyNote className="px-3 py-4">\{emptyLabel\}<\/EmptyNote>/)
  // The options stay raw buttons: a listbox option with its own check box and two lines (plan 2D-4 R5, for 2D-5's EXEMPT list).
  assert.equal(source.match(/<button\b/g)?.length, 1)
  assert.match(source, /role="option" aria-selected=\{active\} disabled=\{!option\.eligible\} onClick=\{\(\) => toggle\(option\)\} className="[^"]*\bborder-b border-border-soft\b[^"]*\bhover:bg-row-hover\b/)
  assert.doesNotMatch(source, /hover:bg-accent|hover:bg-danger-soft|\btext-xs\b|h-10 w-10|space-y-2 overflow-y-auto|px-3 py-6 text-center/)
})
