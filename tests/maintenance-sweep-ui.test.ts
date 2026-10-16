import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-4 (spec 2D §3.4, D7, D9, D10, M21, M22, M24, M25, M28, M29, M33): the repair records, the PM plans and the
// repair print page on the shared parts. Panels are ContentPanel (or getPanelClasses where a section keeps an id),
// messages Notice by meaning, states StatusBadge, cadences the shared Chip, empty states EmptyNote, buttons Button and
// buttonVariants, text links linkVariants, codes tag, money formatMoney. Each test pins one file (or one tight pair) and
// fails before that commit. Sources are read with LF line endings, so the regexes may contain \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const C = "src/components/"

test("repair attachments: a ContentPanel, a warning Notice, a plain count, EmptyNote and the shared buttons; the thumbnail stays a raw button (spec 2D M28, D7, D9, M21, M29)", () => {
  const source = read(`${C}maintenance/maintenance-attachments.tsx`)
  assert.match(source, /<ContentPanel title=\{t\("attachments"\)\}>/)
  assert.match(source, /<Notice tone="warning"[^>]*>\{t\("closedEvidenceAppendOnlyHelp"\)\}<\/Notice>/)
  assert.match(source, /<EmptyNote>\{tCommon\("noData"\)\}<\/EmptyNote>/)
  assert.match(source, /<span className="text-meta num text-muted-foreground">\{formatCount\(group\.attachments\.length\)\}<\/span>/)
  assert.match(source, /<Button variant="outline" size="sm" className="flex-1" onClick=\{\(\) => setPreview\(attachment\)\}>/)
  assert.match(source, /<a\s+href=\{`\/api\/attachments\/\$\{attachment\.id\}`\}\s+className=\{cn\(buttonVariants\(\{ variant: "outline", size: "sm" \}\), "flex-1"\)\}/)
  assert.match(source, /<Button\s+variant="danger"\s+size="icon-sm"\s+onClick=\{\(\) => void handleDelete\(attachment\.id\)\}\s+busy=\{deletingId === attachment\.id\}\s+aria-label=\{tCommon\("delete"\)\}\s+title=\{tCommon\("delete"\)\}\s*>/)
  // The thumbnail that opens the preview stays a raw button: the image or the PDF preview is the control (2D-4, for 2D-5's EXEMPT list).
  assert.equal(source.match(/<button\b/g)?.length, 1)
  assert.match(source, /className="mb-3 flex aspect-\[4\/3\] w-full items-center justify-center overflow-hidden rounded-md bg-surface text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"/)
  assert.doesNotMatch(source, /Loader2|disabled:opacity|border-dashed|rounded-full|rounded-lg|hover:bg-accent|sm:h-8|sm:min-h-0|\btext-xs\b|\btext-lg\b|text-(?:info|danger|warning|primary)\b|bg-warning-soft|closeLabel=/)
})

test("repair form: a ContentPanel, the open-record error and the status effect as Notices, the reporter hint on its select, and an outline disclosure over a quiet grouping (spec 2D D7, D9, M29)", () => {
  const source = read(`${C}maintenance/repair-record-form.tsx`)
  assert.match(source, /<ContentPanel>\s*<form onSubmit=\{handleSubmit\} className="space-y-5">/)
  assert.match(source, /<Notice tone="danger" role="alert">\s*\{tMaintenance\("errors\.MAINTENANCE_OPEN_RECORD_EXISTS"\)\}/)
  assert.match(source, /<Notice tone="warning">\s*\{t\(`assetStatusEffect\.\$\{effectKey\}`\)\}\s*<\/Notice>/)
  assert.match(source, /hint=\{t\("reporterHelp"\)\}/)
  assert.match(source, /const detailsId = useId\(\)/)
  assert.match(source, /<Button\s+variant="outline"\s+aria-expanded=\{showDetails\}\s+aria-controls=\{showDetails \? detailsId : undefined\}\s+onClick=\{\(\) => setShowDetails\(\(open\) => !open\)\}\s+className="w-full justify-between"\s*>/)
  assert.match(source, /<div id=\{detailsId\} className="mt-3 grid gap-4 rounded-md border border-border bg-background p-4 md:grid-cols-2">/)
  assert.doesNotMatch(source, /<button\b|<section\b|rounded-lg|bg-warning-soft|border-warning-border|text-warning|hover:bg-accent|\btext-xs\b|transition-transform|\bh-4 w-4\b/)
  const select = read(`${C}maintenance/maintenance-option-select.tsx`)
  assert.match(select, /\n\s+hint\?: React\.ReactNode\n/)
  assert.match(select, /\n\s+hint=\{hint\}\n/)
})
