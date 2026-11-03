import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 3 plan 4 Task 4: what ย้ายที่ตั้งหลายรายการ needs from the shared parts. Pagination's button mode (P4-R12), the
// review dialog's children (P4-R17) and DESIGN.md's one exception to the page-bound selection (P4-R23).
// The working tree is CRLF on Windows: every read strips \r before the multi-line regexes.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const PAGINATION = "src/components/ui/pagination.tsx"
const REVIEW = "src/components/ui/operation-review-dialog.tsx"

const FOOT_BUTTONS = " A client list that pages in place (ย้ายที่ตั้งหลายรายการ) passes `onPrevious` and `onNext` instead of the hrefs, and no page sizes: previous and next are then outline `sm` `Button`s, and a disabled one stays a focusable `Button` instead of the `span`, `aria-disabled` with no handler, so keyboard paging keeps its focus."
const PAGES_EXCEPTION = " One written exception: ย้ายที่ตั้งหลายรายการ keeps its ticks across pages and filters, as a snapshot of each ticked row keyed by asset id, because its job is to gather assets from several rooms into one move (at most 100); its `page` (25 rows, no `pageSize`) and its filters are client state that its own list endpoint answers, not the URL, and a page past the end clamps to the last (group 3 plan 4)."
const CALLER_EXCEPTION = " ย้ายที่ตั้งหลายรายการ is the exception (**Pages on the server**): its ticks outlive the page and the filters, so its bar, its review and its save read the snapshots, never the rows on screen; it is a focus-task route with no Mobile Field Navigation, so it passes `className` to drop the bar's bottom offset below `lg`."
const DOCS14_PAGER_TAIL = "; a client list that pages in place passes `onPrevious` and `onNext` and no hrefs or page sizes (ย้ายที่ตั้งหลายรายการ: 25 rows, a page past the end clamps) |"
const DOCS14_REVIEW_ROW = "| The last check before a transaction saves | `OperationReviewDialog`, its items from `buildOperationReviewSummary` (`src/lib/asset-operation-review.ts`) on the single-asset pages | rendered after the page's `</form>`, never inside it; one label and value per item, and a value may be a node; focus opens on the confirm, which keeps it while `busy`; `children` sit under the items for what is not one label and value (ย้ายที่ตั้งหลายรายการ's sentence lines and its หมายเหตุ); a server refusal on a field closes it first and then focuses the field (`waitForDialogToClose`) |"

test("Pagination takes links or buttons, never both; a button pages in place and keeps focus at either end (group 3 spec §10.1; P4-R12)", () => {
  const source = read(PAGINATION)
  assert.match(source, /^import \{ Button \} from "@\/components\/ui\/button"$/m)
  assert.match(source, /^type PaginationLinkProps = \{ previousHref: string; nextHref: string; onPrevious\?: never; onNext\?: never \}$/m)
  assert.match(source, /^type PaginationButtonProps = \{ previousHref\?: never; nextHref\?: never; onPrevious: \(\) => void; onNext: \(\) => void; pageSizes\?: never \}$/m)
  assert.match(source, /^export type PaginationProps = PaginationBaseProps & \(PaginationLinkProps \| PaginationButtonProps\)$/m)
  assert.match(source, /export function Pagination\(\{ page, totalPages, previousHref, nextHref, onPrevious, onNext, labels, pageSize, pageSizes, className \}: PaginationProps\)/)
  assert.match(source, /<PaginationControl href=\{previousHref\} enabled=\{page > 1\} rel="prev" label=\{labels\.previous\} onClick=\{onPrevious\} \/>/)
  assert.match(source, /<PaginationControl href=\{nextHref\} enabled=\{page < totalPages\} rel="next" label=\{labels\.next\} onClick=\{onNext\} \/>/)
  const control = source.slice(source.indexOf("function PaginationControl("))
  assert.match(control, /if \(onClick\) \{\n\s+return \(\n\s+<Button variant="outline" size="sm" aria-disabled=\{enabled \? undefined : true\} onClick=\{enabled \? onClick : undefined\}>\n\s+\{label\}\n\s+<\/Button>\n\s+\)\n\s+\}\n\s+if \(!enabled \|\| href === undefined\) \{/)
  assert.ok(control.indexOf("if (onClick)") < control.indexOf('<span aria-disabled="true" className={controlClasses}>'), "the button mode is decided before the link mode's span")
  // Still server-safe: the client caller passes the handlers, as DesktopSelectionBar's onClear. No raw <button> (VFG N3),
  // no real disabled (it would drop focus at the last page), nothing that fades (LFG LT5, VFG N4).
  assert.doesNotMatch(source, /"use client"|\buse(?:State|Effect|LayoutEffect|Context|Ref)\b/)
  assert.doesNotMatch(source, /<button\b|(?<![\w-])disabled=\{|opacity-/)
})

test("OperationReviewDialog takes children under its items, inside the body; the three single-asset forms pass none (group 3 spec §10.2; P4-R17)", () => {
  const source = read(REVIEW)
  assert.match(source, /\n  onConfirm: \(\) => void\n  \/\*\* [^\n]+ \*\/\n  children\?: ReactNode\n\}/)
  assert.match(source, /\n  onConfirm,\n  children,\n\}: OperationReviewDialogProps\) \{/)
  assert.match(source, /<\/dl>\n\s+\{children \? <div className="border-t border-border py-3">\{children\}<\/div> : null\}\n\s+<\/AccessibleDialogBody>/)
  for (const host of ["checkout-form", "checkin-form", "transfer-form"]) {
    assert.doesNotMatch(read(`src/components/asset-operations/${host}.tsx`), /<\/OperationReviewDialog>/, host)
  }
})

test("DESIGN.md writes the bulk move's one exception to the page-bound selection, and Pagination's button mode (group 3 spec §10.1; P4-R12, P4-R19, P4-R23)", () => {
  const lines = read("DESIGN.md").split("\n")
  const line = (start: string) => lines.find((text) => text.startsWith(start)) ?? ""
  assert.ok(line("- **Foot:** `DataTable footer={<Pagination … />}`").endsWith("(guards LT4, LT5)." + FOOT_BUTTONS), "Foot")
  assert.ok(line("- **Pages on the server:**").endsWith("(the disposal providers take `selectionKey`, the findings selection provider takes it as its `key`)." + PAGES_EXCEPTION), "Pages on the server")
  assert.ok(line("- **The caller** mounts it").endsWith("The provider that holds the ticks takes `selectionKey` as its `key`." + CALLER_EXCEPTION), "The caller")
})

test("docs/14 names Pagination's button mode and gives OperationReviewDialog its own row after the operation frame (group 3 spec §10.1, §10.2; P4-R12, P4-R17)", () => {
  const lines = read("docs/14_UI_UX_DESIGN_SYSTEM.md").split("\n")
  const at = (start: string) => lines.findIndex((text) => text.startsWith(start))
  assert.ok(lines[at("| Page links under a table | `Pagination`")].endsWith("counts above the list cover every page" + DOCS14_PAGER_TAIL))
  const review = at("| The last check before a transaction saves | `OperationReviewDialog`")
  assert.equal(review, at("| The frame of ส่งมอบ, รับคืน, โอนย้าย and บันทึกซ่อม (optional breadcrumbs and back;") + 1, "right after the frame's row")
  assert.equal(lines[review + 1].startsWith("| The record a form is about | `FormContextBanner`"), true, "before FormContextBanner")
  assert.equal(lines[review], DOCS14_REVIEW_ROW)
})
