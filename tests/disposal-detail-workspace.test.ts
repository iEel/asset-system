import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const detailPath = "src/app/[locale]/(dashboard)/disposal/[id]/page.tsx"
const detailSource = () => readFileSync(detailPath, "utf8")

// Group 6 plan 3 Task 3 (spec §9.2): the next-step card replaced the stepper and its owner line.
test("disposal detail surfaces one stage-aware next action in the next-step card", () => {
  assert.ok(existsSync("src/components/disposal/disposal-next-step-card.tsx"))
  assert.ok(!existsSync("src/components/disposal/disposal-workflow-stepper.tsx"))

  const source = detailSource()
  assert.match(source, /<DisposalNextStepCard\b/)
  assert.match(source, /getDisposalNextAction/)
  assert.match(source, /nextAction === "review"/)
  assert.match(source, /<DisposalDecisionButton/)
  // An approved request is recorded only in a disposal round (group 6 plan 4, P4-R1): no execution dialog here.
  assert.doesNotMatch(source, /DisposalExecutionButton/)
  assert.match(source, /centralApprovalQueue/)
  assert.doesNotMatch(source, /getCurrentOwnerContext|executionQueue/)
})

test("disposal detail progressively reveals reviewed and completed information", () => {
  const source = detailSource()

  assert.match(source, /disposalRequest\.requestStatus !== "pending" \? \(/)
  assert.match(source, /disposalRequest\.requestStatus === "disposed" \? \(/)
})

test("disposal detail preserves operational navigation and uses an ArrowLeft back affordance", () => {
  const source = detailSource()

  assert.match(source, /<PageBackLink href=\{returnToHref\}/)
  assert.match(source, /normalizeDisposalRequestReturnTo/)
  assert.match(source, /<ActionBar/)
  assert.match(source, /href=\{returnToHref\}/)
  assert.doesNotMatch(source, /Trash2/)
})

test("mobile disposal detail promotes the stage action without duplicating desktop controls", () => {
  const source = detailSource()
  const actionBar = readFileSync("src/components/ui/action-bar.tsx", "utf8")

  // Group 6 plan 3 Task 4: the bar holds the next step only, and only when there is one (DP-Request-Phone).
  assert.match(source, /primaryAction=\{phoneAction\}/)
  assert.match(source, /hidden[^\"]*md:flex/)
  assert.match(actionBar, /primaryAction/)
  assert.match(actionBar, /fixed inset-x-0 bottom-0/)
  assert.match(actionBar, /md:hidden/)
})

test("disposal evidence remains downloadable but only managers can upload or delete", () => {
  const source = readFileSync("src/components/disposal/disposal-attachments.tsx", "utf8")

  assert.match(source, /canManage: boolean/)
  assert.match(source, /\{canManage \? \(/)
  assert.match(source, /<FileDropzone/)
  assert.match(source, /\{canManage \? \(/)
  assert.match(source, /\/api\/attachments\/\$\{attachment\.id\}/)
  assert.match(source, /href=\{`\/api\/attachments\/\$\{attachment\.id\}`\}/)
  assert.match(source, /aria-label=\{tCommon\("delete"\)\}/)
})

test("disposal history uses existing movement translations rather than raw underscored values", () => {
  const source = detailSource()

  assert.match(source, /getTranslations\("asset"\)/)
  assert.match(source, /tAsset\(`movementTypes\.\$\{movement\.movementType\}`\)/)
  assert.doesNotMatch(source, /movement\.movementType\.replaceAll\("_", " "\)/)
})

test("the decision dialog uses the shared accessible dialog", () => {
  for (const path of [
    "src/components/disposal/disposal-decision-button.tsx",
  ]) {
    const dialogSource = readFileSync(path, "utf8").replace(/\r\n/g, "\n")
    assert.match(dialogSource, /<AccessibleDialog[\s\S]*?busy=\{saving\}/, path)
    assert.match(dialogSource, /returnFocusRef=\{triggerRef\}/, path)
    assert.doesNotMatch(dialogSource, /fixed inset-0|role="dialog"|restoreFocusRef|event\.key === "Tab"|handleKeyDown/, path)
  }
  assert.ok(!existsSync("src/components/disposal/disposal-execution-button.tsx"))
})

test("the print action is structured for pending-request versus final-document copy", () => {
  const source = detailSource()

  assert.match(source, /const printLabel = disposalRequest\.requestStatus === "disposed" \? t\("printFinalDocument"\) : t\("printRequest"\)/)
  assert.match(source, /\{printLabel\}/)
})

test("child requests disclose their source batch and inherited evidence", () => {
  const source = detailSource()

  assert.match(source, /batch: \{ select: \{ id: true, batchNo: true \} \}/)
  assert.match(source, /module: "disposal_batch"/)
  assert.match(source, /batchAttachments/)
  assert.match(source, /\/disposal\/batches\/\$\{disposalRequest\.batch\.id\}/)
})

// Plan 2B-4 Task 4 (spec 2B §4.4.5, §4.5.4, §8.8 row 4, B2, I32): the request page header is PageHeader with the asset's
// name as the h1. Group 6 plan 3 Task 3 (spec §9.1): the meta reads "tag · คำขอ DP-…", the status badge and the method
// chip; print and ⋯ (history, the asset page) stay in the md-and-up group (the mobile bar has them on phones). The
// next-step card sits under the header; 2C plan 5 moved the O11 bottom padding to actionBarPagePadding. Raw read (CRLF):
// no line breaks here.
test("disposal request header is PageHeader with the asset name and a back button at every width (spec 2B §4.5.4)", () => {
  const source = detailSource()

  // From a batch page a batch-number crumb sits between ตัดจำหน่าย and the request (request batches).
  assert.match(source, /breadcrumbs=\{\[\s*\{ label: t\("title"\), href: titleCrumbHref \},\s*\.\.\.batchCrumbs,\s*\{ label: disposalRequest\.disposalNo, code: true \},\s*\]\}\s*title=\{disposalRequest\.asset\.name\}/)
  assert.match(source, /meta=\{\s*<>\s*<span className="text-meta text-muted-foreground">\s*<span className="tag">\{disposalRequest\.asset\.assetTag\}<\/span>\s*\{" · "\}\s*\{t\("requestPage\.metaRequest", \{ number: disposalRequest\.disposalNo \}\)\}\s*<\/span>\s*<StatusBadge [^\n]*\/>\s*<Chip>\{method\}<\/Chip>/)
  assert.match(source, /back=\{<PageBackLink href=\{returnToHref\} label=\{tCommon\("back"\)\} \/>\}\s*actions=\{\s*<>\s*<div className="md:hidden">/)
  assert.match(source, /<div className="hidden items-center gap-2 md:flex">/)
  assert.ok(source.indexOf("<PageHeader") < source.indexOf("<DisposalNextStepCard"), "the next-step card sits under the header")
  assert.match(source, /<div className=\{`space-y-6 \$\{phoneAction \? actionBarPagePadding\.withPrimary : ""\}`\}>/, "room for the ActionBar only when it shows (2C plan 5, O11; DP-Request-Phone)")
  assert.equal(source.match(/<KeyValueList\b/g)?.length, 7, "the phone's asset status, request, decision, execution, the historical exception, a history row, the asset")
  assert.doesNotMatch(source, /<h1\b|<Breadcrumbs\b|ArrowLeft|formatCurrency|function Info\b|"-"/)
})
