import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { readSourceFiles } from "./helpers/source-files.ts"

// Phase 2C K19 (spec 2C sections 7.6.1, 7.6.2, I13-I15). Call sites join this file in batches 1a-1e.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const common = (locale: "th" | "en") => (JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { common: Record<string, unknown> }).common

test("FileDropzone takes its id and aria wiring from a Field and an always-visible description", () => {
  const source = read("src/components/ui/file-dropzone.tsx")
  assert.match(source, /\n {2}hint\?: string\n/, "hint is optional: queue-mode call sites stop passing it")
  assert.match(source, /\n {2}description\?: React\.ReactNode\n/)
  assert.match(source, /\n {2}id\?: string\n/)
  assert.match(source, /\n {2}"aria-describedby"\?: string\n/)
  assert.match(source, /\n {2}"aria-invalid"\?: boolean \| "true" \| "false"\n/)
  assert.match(source, /\n {2}"aria-required"\?: boolean \| "true" \| "false"\n/)
  assert.match(source, /const inputId = id \?\? generatedId/)
  assert.match(source, /const describedBy = \[ariaDescribedBy, statusId, descriptionId, optimizeId\]\.filter\(Boolean\)\.join\(" "\)/)
  const input = source.match(/<input\n[\s\S]*?\/>/)?.[0]
  assert.ok(input, "file input not found")
  assert.match(input, /id=\{inputId\}/)
  assert.match(input, /aria-describedby=\{describedBy\}/)
  assert.match(input, /aria-invalid=\{invalid \|\| undefined\}/)
  // aria-required is accepted so Field's control props type-check, but a file input has no role that supports it.
  assert.doesNotMatch(input, /aria-required/)
})

test("FileDropzone is named by its title only; the three sub-lines are its description", () => {
  const source = read("src/components/ui/file-dropzone.tsx")
  assert.equal(source.match(/aria-hidden="true" className=\{subLineClasses\}/g)?.length, 3)
  assert.match(source, /<span id=\{statusId\} aria-hidden="true" className=\{subLineClasses\}>\n\s+\{optimizing \? tCommon\("imageOptimizing"\) : file \? \(hint \?\? browseLabel\) : browseLabel\}\n/)
  assert.match(source, /\{description \? \(\n\s+<span id=\{descriptionId\} aria-hidden="true" className=\{subLineClasses\}>\n\s+\{description\}\n/)
  assert.match(source, /<span id=\{optimizeId\} aria-hidden="true" className=\{subLineClasses\}>\n\s+\{tCommon\("imageOptimizationHint"\)\}\n/)
  // The status line comes first, the description second, the image hint last.
  assert.ok(source.indexOf("id={statusId}") < source.indexOf("id={descriptionId}"))
  assert.ok(source.indexOf("id={descriptionId}") < source.indexOf("id={optimizeId}"))
})

test("an invalid FileDropzone gets a red dashed border, after the disabled and drag states", () => {
  const source = read("src/components/ui/file-dropzone.tsx")
  assert.match(source, /const invalid = ariaInvalid === true \|\| ariaInvalid === "true"/)
  assert.match(
    source,
    /isDisabled \? "pointer-events-none border-border bg-background" : dragging \? "border-primary bg-primary-soft" : invalid \? "border-danger bg-surface hover:bg-background" : "border-input bg-surface hover:bg-background"/,
  )
})

test("FileQueueList: one row per queued file, each with a neutral remove button that names the file", () => {
  const source = read("src/components/ui/file-queue-list.tsx")
  assert.match(source, /^"use client"\n/)
  assert.match(source, /export type FileQueueItem = \{ id: string; name: string; detail\?: ReactNode \}/)
  assert.match(source, /<ul data-slot="file-queue-list" aria-label=\{label \?\? t\("selectedFiles"\)\} className=\{cn\("grid gap-2", className\)\}>/)
  assert.match(source, /<li key=\{item\.id\} className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-surface py-1 pl-3 pr-1 text-sm">/)
  assert.match(source, /<span className="grid min-w-0 flex-1">/)
  assert.match(source, /<span className="truncate text-foreground">\{item\.name\}<\/span>/)
  assert.match(source, /\{item\.detail \? <span className="truncate text-meta text-faint-foreground">\{item\.detail\}<\/span> : null\}/)
  assert.match(
    source,
    /<Button\n\s+variant="outline"\n\s+size="icon-sm"\n\s+disabled=\{disabled\}\n\s+aria-label=\{t\("removeFile", \{ name: item\.name \}\)\}\n\s+onClick=\{\(\) => onRemove\(item\.id\)\}\n\s+>\n\s+<X aria-hidden="true" \/>/,
  )
  assert.match(source, /return emptyLabel \? <EmptyNote className=\{className\}>\{emptyLabel\}<\/EmptyNote> : null/)
  // Taking a file out of the queue deletes nothing that is saved, so the button is neutral (K22 family, I16).
  assert.doesNotMatch(source, /variant="(?:danger|destructive)"|Trash2|text-danger/)
  assert.doesNotMatch(source, /opacity-|shadow-|leading-tight|rounded-\[/)
})

test("queue words exist in Thai and English with the same placeholder", () => {
  assert.equal(common("th").removeFile, "นำ {name} ออก")
  assert.equal(common("en").removeFile, "Remove {name}")
  assert.equal(common("th").selectedFiles, "ไฟล์ที่เลือก")
  assert.equal(common("en").selectedFiles, "Selected files")
})

test("the repair form picks receipts with FileDropzone and lists them with FileQueueList (2C batch 1a)", () => {
  const source = readFileSync("src/components/maintenance/repair-record-form.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.doesNotMatch(source, /type="file"/, "the raw file input is gone")
  assert.doesNotMatch(source, /capture=/, "no capture attribute: a receipt can be a PDF")
  assert.match(source, /<Field label=\{t\("files"\)\} className="md:col-span-2">\n\s+\{\(control\) => \(/)
  assert.match(source, /<FileDropzone\n\s+\{\.\.\.control\}\n\s+file=\{null\}/)
  assert.match(source, /\n\s+multiple\n/)
  assert.match(source, /onFilesChange=\{addFiles\}/)
  assert.match(source, /title=\{t\("dropFilesTitle"\)\}\n\s+description=\{t\("filesHelp"\)\}\n\s+browseLabel=\{t\("dropFilesHint"\)\}/)
  assert.match(source, /<FileQueueList items=\{files\.map\(\(file, index\) => \(\{ id: String\(index\), name: file\.name \}\)\)\} disabled=\{saving\} onRemove=\{removeFile\} \/>/)
  assert.match(source, /setFiles\(\(current\) => \[\.\.\.current, \.\.\.next\]\)/, "a second pick adds to the list instead of replacing it")
  assert.match(source, /uploadRepairFiles\(payload\.id, files/)
})

test("the repair file picker copy exists in Thai and English (2C batch 1a)", () => {
  for (const locale of ["th", "en"]) {
    const repairRecord = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).repairRecord as Record<string, string>
    for (const key of ["dropFilesTitle", "dropFilesHint", "files", "filesHelp"]) {
      assert.ok(repairRecord[key]?.trim(), `${locale}.repairRecord.${key}`)
    }
  }
})

test("the finish-repair dialog picks files the same way, and src has no raw file input left (2C batch 1a)", () => {
  const source = readFileSync("src/components/maintenance/repair-record-actions.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /<Field label=\{t\("files"\)\}>\n\s+\{\(control\) => \(/)
  assert.match(source, /<FileDropzone\n\s+\{\.\.\.control\}\n\s+file=\{null\}/)
  assert.match(source, /\n\s+multiple\n/)
  assert.match(source, /title=\{t\("dropFilesTitle"\)\}\n\s+description=\{t\("filesHelp"\)\}\n\s+browseLabel=\{t\("dropFilesHint"\)\}/)
  assert.match(source, /<FileQueueList items=\{files\.map\(\(file, index\) => \(\{ id: String\(index\), name: file\.name \}\)\)\} disabled=\{saving\} onRemove=\{removeFile\} \/>/)
  assert.match(source, /setFiles\(\(current\) => \[\.\.\.current, \.\.\.next\]\)/)
  assert.match(source, /uploadRepairFiles\(recordId, files, "after_repair"\)/)
  const rawFileInputs = readSourceFiles("src").filter((file) => /type="file"/.test(file.source)).map((file) => file.path)
  assert.deepEqual(rawFileInputs.sort(), ["src/components/assets/asset-import-preview-panel.tsx", "src/components/ui/file-dropzone.tsx"])
})

test("the check-in photo picker explains itself before a pick and lists the queue with FileQueueList (2C batch 1b)", () => {
  const source = readFileSync("src/components/asset-operations/checkin-form.tsx", "utf8").replace(/\r\n/g, "\n")
  const start = source.indexOf("<FileDropzone")
  const dropzone = source.slice(start, source.indexOf("/>", start))
  assert.doesNotMatch(dropzone, /\bhint=/)
  assert.match(dropzone, /description=\{t\("photoAfterDescription"\)\}/)
  assert.match(source, /<FileQueueList\n\s+items=\{photosAfter\.map\(\(photo\) => \(\{ id: photo\.id, name: photo\.label, detail: photo\.file\.name \}\)\)\}\n\s+emptyLabel=\{t\("noQueuedPhotos"\)\}\n\s+disabled=\{saving\}/)
  assert.equal(source.match(/rounded-md bg-primary-soft text-primary/g)?.length, 1, "only the no-checkouts icon tile stays")
  assert.doesNotMatch(source, /Trash2|FileImage|t\("photoQueued"\)|t\("removePhoto"\)/)
  for (const locale of ["th", "en"]) {
    const checkin = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).checkin as Record<string, string>
    assert.ok(checkin.photoAfterDescription?.trim(), `${locale}.checkin.photoAfterDescription`)
    assert.equal(checkin.photoQueued, undefined, `${locale}.checkin.photoQueued has no reader and is removed`)
    assert.equal(checkin.removePhoto, undefined, `${locale}.checkin.removePhoto has no reader and is removed`)
  }
})
