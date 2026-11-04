import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 3 plan 1 Task 5 (spec §5, P1-R3, P1-R7): the shared parts of ส่งมอบ, รับคืน and โอนย้าย. node --test cannot load .tsx, so these read the source.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const DIR = "src/components/asset-operations/"
const RAW = /\bdark:|#[0-9a-fA-F]{3,8}\b|\brgba?\(|\b(?:bg|text|border|ring)-[a-z-]+\/\d+|\bopacity-|<button\b|<input\b|<table\b|<form\b|"use client"/

test("OperationSummaryCard: ตอนนี้ then หลังบันทึก per row, the new value semibold only when it changes, the checklist, warnings, sticky from lg", () => {
  const source = read(`${DIR}operation-summary-card.tsx`)
  assert.match(source, /^export function OperationSummaryCard\(\{ title, nowLabel, nextLabel, rows, checklist = \[\], warnings = \[\], footnote, photo, assetLabel, lead, afterRows \}: OperationSummaryCardProps\) \{$/m)
  // An optional block right after the rows and before the checklist (บันทึกซ่อม's "ถ้าตอบว่าซ่อมเสร็จแล้ว", group 5 spec §7.5).
  assert.ok(source.includes("  afterRows?: ReactNode\n"), "the afterRows prop")
  assert.ok(source.includes("{afterRows ? <div data-summary-after-rows>{afterRows}</div> : null}"), "the slot, only when given")
  assert.ok(source.indexOf("{rows.length > 0 ? (") < source.indexOf("data-summary-after-rows") && source.indexOf("data-summary-after-rows") < source.indexOf("{checklist.length > 0 ? ("), "rows, the slot, then the checklist")
  for (const form of ["checkout-form.tsx", "checkin-form.tsx", "transfer-form.tsx"]) assert.doesNotMatch(read(`${DIR}${form}`), /afterRows=/, form)
  // The asset line (group 3 spec §19.5): the register photo and the asset's label, under the title, only when given.
  assert.ok(source.includes('{photo || assetLabel ? (\n        <div data-summary-asset className="flex min-w-0 items-center gap-3 text-sm">'), "the asset line")
  for (const part of [
    "export type OperationSummaryRow = { key: string; label: string; now: ReactNode; next: ReactNode; changed: boolean }",
    "export type OperationSummaryCheck = { key: string; label: string; done: boolean; note?: string }",
    'data-slot="operation-summary-card"', '"grid content-start gap-4 p-4 sm:p-5 lg:sticky lg:top-4 lg:self-start"',
    '<h2 className="text-base font-semibold text-foreground">{title}</h2>',
    "data-summary-row={row.key}", "data-changed={row.changed || undefined}", 'row.changed && "font-semibold"',
    '<span className="sr-only">{nowLabel}: </span>', '<span className="sr-only">{nextLabel}: </span>',
    "data-summary-check={item.key}", "data-done={item.done || undefined}", 't(item.done ? "summaryCheckDone" : "summaryCheckMissing")',
    '<Notice key={index} tone="warning">',
  ]) assert.ok(source.includes(part), part)
  assert.match(source, /<div aria-hidden="true"[^>]*>\s*<span \/>\s*<span>\{nowLabel\}<\/span>\s*<span>\{nextLabel\}<\/span>/, "the column heads are visual only")
  assert.ok(source.indexOf('<div aria-hidden="true"') < source.indexOf("<dl"), "the heads sit outside the <dl> (axe definition-list)")
  assert.doesNotMatch(source, RAW)
})

test("OperationSummaryCard: an optional lead line under the asset line, above the rows (group 3 spec §9.3, plan 3 P3-R11)", () => {
  const source = read(`${DIR}operation-summary-card.tsx`)
  assert.ok(source.includes("  lead?: ReactNode\n"), "the prop")
  assert.ok(source.includes('{lead ? <p data-summary-lead className="min-w-0 break-words text-sm font-medium text-foreground">{lead}</p> : null}'), "the lead, only when given")
  const at = (text: string) => {
    const index = source.indexOf(text)
    assert.ok(index >= 0, text)
    return index
  }
  assert.ok(at("<div data-summary-asset") < at("<p data-summary-lead") && at("<p data-summary-lead") < at("{rows.length > 0 ? ("), "the asset line, the lead, then the rows")
  const design = read("DESIGN.md")
  const block = design.slice(design.indexOf("- **`OperationFormFrame`**"), design.indexOf("\n### Forms: Errors Under the Field\n"))
  assert.ok(block.includes("an optional `lead`"), "DESIGN.md names the lead")
})

test("OperationFormFrame: PageHeader with optional breadcrumbs and back link (P1-R3; group 5 spec §7.1), the audit-round grid, the summary column, the bar across both with ยกเลิก before the submit bound to formId", () => {
  const source = read(`${DIR}operation-form-frame.tsx`)
  assert.match(source, /^export function OperationFormFrame\(\{ title, description, actions, breadcrumbs, back, summary, footer, phoneSteps = false, summaryOnPhone = true, children \}: OperationFormFrameProps\) \{$/m)
  for (const part of [
    "export type OperationFormFooter = { description: ReactNode; cancelHref: string; cancelLabel: string; submitLabel: string; busy: boolean; formId: string }",
    "breadcrumbs?: BreadcrumbItem[]", "back?: ReactNode",
    'data-slot="operation-form-frame"', 'className="mx-auto max-w-6xl"', '<PageHeader title={title} meta={description} actions={actions} breadcrumbs={breadcrumbs} back={back} className="mb-6" />',
    '"grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"', 'data-slot="operation-form-main"', '"grid min-w-0 content-start gap-8 p-4 sm:p-5"',
    '<StickyFormFooter className={cn("lg:col-span-2", phoneSteps && "max-lg:hidden")} status={footer.description}>',
    '<div className={cn("min-w-0", (phoneSteps || !summaryOnPhone) && "max-lg:hidden")}>{summary}</div>', "actions?: ReactNode", "summaryOnPhone?: boolean",
    '<Link href={footer.cancelHref} className={buttonVariants({ variant: "outline" })}>', '<Button type="submit" form={footer.formId} busy={footer.busy}>',
  ]) assert.ok(source.includes(part), part)
  assert.ok(source.indexOf("{children}") < source.indexOf("{summary}") && source.indexOf("{summary}") < source.indexOf("<StickyFormFooter"), "main, summary, then the bar")
  // ส่งมอบ, รับคืน and โอนย้าย pass neither, so their headers keep no breadcrumb and no back link.
  for (const form of ["checkout-form.tsx", "checkin-form.tsx", "transfer-form.tsx"]) assert.doesNotMatch(read(`${DIR}${form}`), /\n\s+(?:breadcrumbs|back)=\{/, form)
  assert.doesNotMatch(source, RAW)
})

test("AssetConditionChoice: one FieldGroup of radio ChoiceChips that wrap; the field id is the group's and its error <id>-error (spec §7.2)", () => {
  const source = read(`${DIR}condition-choice.tsx`)
  assert.match(source, /^export function AssetConditionChoice\(\{ id, legend, options, value, onChange, error, required, disabled = false \}: AssetConditionChoiceProps\) \{$/m)
  for (const part of [
    "<FieldGroup legend={legend} id={id} required={required} error={error}>", '<div className="flex flex-wrap gap-2">', "<ChoiceChip", 'type="radio"',
    "name={id}", "value={option.id}", "checked={value === option.id}", "required={required}", "disabled={disabled}", "onChange={() => onChange(option.id)}",
  ]) assert.ok(source.includes(part), part)
  assert.doesNotMatch(source, /NativeSelect|ChoiceCard\b/)
  assert.doesNotMatch(source, RAW)
})

test("the words: ตรวจสอบและบันทึก (never ตรวจทาน), สรุปก่อนบันทึก, ตอนนี้, หลังบันทึก and the checklist's hidden states; common.save stays (P1-R7)", () => {
  const th = JSON.parse(read("messages/th.json"))
  const en = JSON.parse(read("messages/en.json"))
  const words: Record<string, [string, string]> = {
    reviewAndSave: ["ตรวจสอบและบันทึก", "Review and save"], summaryTitle: ["สรุปก่อนบันทึก", "Summary before saving"],
    summaryNow: ["ตอนนี้", "Now"], summaryNext: ["หลังบันทึก", "After saving"],
    summaryCheckDone: ["ครบแล้ว", "Done"], summaryCheckMissing: ["ยังไม่ครบ", "Not yet"],
  }
  for (const [key, [thai, english]] of Object.entries(words)) {
    assert.equal(th.assetOperation[key], thai, `th ${key}`)
    assert.equal(en.assetOperation[key], english, `en ${key}`)
  }
  assert.equal(th.common.save, "บันทึก")
})

test("DESIGN.md and docs/14 describe the three parts after SignaturePad and FormSection; the page's form wraps the frame, onSubmit first", () => {
  const design = read("DESIGN.md")
  const end = design.indexOf("\n### Forms: Errors Under the Field\n")
  const start = design.indexOf("- **`OperationFormFrame`**")
  assert.ok(start > design.indexOf("- **`SignaturePad`**") && start < end, "a bullet after SignaturePad")
  const block = design.slice(start, end)
  for (const phrase of [
    "`OperationSummaryCard`", "`AssetConditionChoice`", "`src/components/asset-operations/operation-form-frame.tsx`", "ตอนนี้", "หลังบันทึก",
    "`<form onSubmit={handleSubmit} noValidate id={formId}>` wraps it", "`FormSection`s", "`form={formId}`", "`</OperationFormFrame>`", "`STICKY_FOOTER_ROUTES`", "its optional `breadcrumbs` and `back` (only บันทึกซ่อม and the PM form pass them)",
    "`summaryOnPhone={false}`", "`actions`",
  ]) assert.ok(block.includes(phrase), phrase)
  const index = read("docs/14_UI_UX_DESIGN_SYSTEM.md")
  const row = index.split("\n").find((line) => line.startsWith("| The frame of ส่งมอบ, รับคืน, โอนย้าย and บันทึกซ่อม (optional breadcrumbs and back;"))
  assert.ok(row && index.indexOf(row) > index.indexOf("\n| A numbered form section |"), "a row after FormSection")
  assert.ok(row?.includes("| `OperationFormFrame` with `OperationSummaryCard` in `summary`"), "the frame's part")
  assert.ok(row?.includes("the page's `<form onSubmit={handleSubmit} noValidate id={formId}>` wraps the frame"), "the form wraps the frame")
})
