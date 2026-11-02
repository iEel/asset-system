import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 4 plan 5 final review: the import card's confirm cannot send the old file while a new one is checked, a refusal
// from confirm shows (and takes focus) by the footer the user pressed, a successful import moves focus to the done
// notice, a used batch offers a fresh start and refreshes the history, the repeated-problem summary words a duplicate
// in the file without a row, and long file values wrap on the phone.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const panel = () => read("src/components/assets/asset-import-preview-panel.tsx")
const page = () => read("src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx")

test("confirm waits while a newly picked file is checked, and the upload-again label looks disabled", () => {
  const source = panel()
  assert.match(source, /async function confirmImport\(\) \{\n(?:\s+\/\/.*\n)*\s+if \(!selectedFile \|\| !preview \|\| preview\.summary\.readyRows === 0 \|\| isLoading\) return/)
  assert.match(source, /<Button\n\s+busy=\{isImporting \|\| isLoading\}/)
  assert.match(source, /<label htmlFor="asset-import-file" aria-disabled=\{isLoading \|\| isImporting \|\| undefined\} className=\{buttonVariants\(\{ variant: "outline" \}\)\}>/)
  // The footer says what is happening while the check or the import runs.
  assert.match(source, /isLoading \? t\("importPage\.checking"\) : t\("importPage\.importing"\)/)
})

test("a refusal from confirm shows inside the footer and takes focus; the dropzone's own refusals stay above", () => {
  const source = panel()
  assert.match(source, /const \[refusalAt, setRefusalAt\] = useState<"file" \| "confirm">\("file"\)/)
  // confirm marks its refusals as its own, the file pick as the dropzone's.
  assert.match(source, /async function confirmImport\(\) \{[\s\S]*?setRefusalAt\("confirm"\)/)
  assert.match(source, /async function handleFile\(file\?: File\) \{[\s\S]*?setRefusalAt\("file"\)/)
  assert.match(source, /\{refusalAt === "file" \? refusal : null\}/)
  assert.match(source, /\{refusalAt === "confirm" && \(notice \|\| error\) \? \(\n\s+<div ref=\{refusalRef\} tabIndex=\{-1\} data-import-refusal className="[^"]*focus-visible:ring-2[^"]*">\n\s+\{refusal\}/)
  // Every confirm refusal (the three 409s and any error) asks for the focus.
  const confirm = source.slice(source.indexOf("async function confirmImport()"), source.indexOf("function startOver()"))
  assert.equal(confirm.split('requestFocus("refusal")').length - 1, 3)
  assert.match(source, /useEffect\(\(\) => \{\n\s+if \(!focus\) return\n\s+;?\(focus\.target === "done" \? doneRef\.current : refusalRef\.current\)\?\.focus\(\)\n\s+\}, \[focus\]\)/)
  // The footer is still in the card, sticky from lg only.
  assert.match(source, /className="rounded-b-lg border-t border-border bg-surface lg:sticky lg:bottom-0 lg:z-10"/)
})

test("after a successful import the done notice takes focus, so it is announced", () => {
  const source = panel()
  assert.match(source, /<div ref=\{doneRef\} tabIndex=\{-1\} className="[^"]*focus-visible:ring-2[^"]*">\n\s+<Notice tone="success" role="status"/)
  assert.match(source, /router\.refresh\(\)\n\s+requestFocus\("done"\)/)
  // The checking line is one status region that stays mounted and is filled while the check runs.
  assert.match(source, /<p role="status" className=\{isLoading \? "text-meta text-muted-foreground" : "sr-only"\}>\n\s+\{isLoading \? t\("importPage\.checking"\) : null\}/)
})

test("a used batch offers นำเข้าไฟล์ใหม่ and refreshes the history", () => {
  const source = panel()
  assert.match(source, /if \(payload\.code === "batchUsed"\) router\.refresh\(\)/)
  assert.match(source, /action=\{notice === "batchUsed" \? <Button onClick=\{startOver\}>\{t\("importPage\.importAnother"\)\}<\/Button> : undefined\}/)
})

test("the repeated-problem summary uses the summary wording", () => {
  assert.match(panel(), /problem: importIssueSummaryProblem\(item, t, fields\)/)
})

test("long file values and tags wrap in the preview and the history", () => {
  for (const source of [panel(), page()]) {
    assert.match(source, /<p className="break-words text-meta text-muted-foreground">\n\s+\{parts\.value\}/)
    assert.match(source, /<div className="tag break-words text-muted-foreground">/)
  }
})
