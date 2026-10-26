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

test("disposal request form: the form sits in a ContentPanel at the one panel spacing (spec 2D D9)", () => {
  const source = read(`${C}disposal/disposal-request-form.tsx`)
  assert.match(source, /<ContentPanel>\n\s+<form onSubmit=\{handleSubmit\} noValidate className="grid grid-cols-1 gap-5 md:grid-cols-2">/)
  assert.match(source, /<\/form>\n\s+<\/ContentPanel>/)
  assert.doesNotMatch(source, /<section\b|rounded-lg border|sm:p-6/)
})

test("disposal batch form: two ContentPanels, the review facts a KeyValueList with Nil and formatMoney, a plain count and one quiet asset list (spec 2D D9, D19, M17, M22)", () => {
  const source = read(`${C}disposal/disposal-batch-form.tsx`)
  assert.equal(source.match(/<ContentPanel\b/g)?.length, 2, "the review step and the form step")
  assert.match(source, /<ContentPanel\n\s+title=\{t\("batchReviewTitle"\)\}\n\s+description=\{t\("batchReviewHelp", \{ count: selectedIds\.length \}\)\}\n\s+actions=\{<span className="text-count num text-foreground" aria-hidden="true">\{formatCount\(selectedIds\.length\)\}<\/span>\}\n\s+>/)
  assert.equal(source.match(/<KeyValueList\b/g)?.length, 1)
  assert.match(source, /\{ key: "requestedBy", label: t\("requestedBy"\), value: employees\.find\(\(item\) => item\.id === values\.requestedById\)\?\.label \}/)
  assert.match(source, /value: values\.saleValue \? <span className="num">\{formatMoney\(Number\(values\.saleValue\), \{ unit: tCommon\("baht"\) \}\)\}<\/span> : null/)
  assert.match(source, /value: values\.salvageValue \? <span className="num">\{formatMoney\(Number\(values\.salvageValue\), \{ unit: tCommon\("baht"\) \}\)\}<\/span> : null/)
  assert.match(source, /<div className="mt-4 max-h-72 divide-y divide-border-soft overflow-y-auto rounded-md border border-border">/)
  assert.match(source, /<ArrowLeft aria-hidden="true" \/>/, "back to editing keeps its arrow (LFG EXEMPT.LB1)")
  assert.doesNotMatch(source, /function Summary\b|"-"|<section\b|rounded-lg border|bg-primary-soft|text-lg|\btext-xs\b|border-b border-border(?!-)/)
})

test("disposal decision dialog: what a rejection does is a neutral Notice, not a box (spec 2D D7)", () => {
  const source = read(`${C}disposal/disposal-decision-button.tsx`)
  assert.match(source, /<Notice tone="neutral">\{t\("rejectRestoresPreviousStatus"\)\}<\/Notice>/)
  assert.doesNotMatch(source, /rounded-md border border-border bg-background/)
})

test("disposal execution dialog: the missing-evidence and historical warnings are warning Notices (spec 2D D7)", () => {
  const source = read(`${C}disposal/disposal-execution-button.tsx`)
  assert.match(source, /<Notice tone="warning" role="alert" id="disposal-execution-evidence-reason" className="md:col-span-2">\{t\("errors\.DISPOSAL_EVIDENCE_REQUIRED"\)\}<\/Notice>/)
  assert.match(source, /<Notice tone="warning" id=\{historicalEvidenceWarningId\} hidden=\{!values\.useHistoricalEvidenceException\} role="alert" className="mt-2">\{t\("historicalEvidenceWarning"\)\}<\/Notice>/)
  assert.doesNotMatch(source, /AlertTriangle|bg-warning-soft|border-warning-border/)
})

test("bulk approval: the toolbar is a quiet grouping, errors and the zero case are Notices, the counts a StatStrip and codes tag (spec 2D M26, D7, M33)", () => {
  const source = read(`${C}disposal/disposal-bulk-approval.tsx`)
  assert.match(source, /<div className="mx-4 mt-3 flex flex-col gap-3 rounded-md border border-border bg-background p-3 md:mx-5 md:flex-row md:items-center md:justify-between" aria-label=\{copy\.toolbarLabel\}>/)
  assert.match(source, /\{error \? <Notice tone="danger" role="alert" className="mx-4 mt-3 md:mx-5" action=\{<Button variant="outline" size="md" onClick=\{\(\) => void preview\(\)\} disabled=\{busy\}>\{copy\.retry\}<\/Button>\}>\{error\}<\/Notice> : null\}/)
  assert.match(source, /<AccessibleDialogBody className="space-y-5">\n\s+\{error \? <Notice tone="danger" role="alert">\{error\}<\/Notice> : null\}/, "a dialog error is the first thing in its body")
  assert.match(source, /<Notice tone="warning" role="alert" id="disposal-bulk-approval-zero-eligible">\{copy\.zeroEligible\}<\/Notice>/)
  assert.equal(source.match(/value: formatCount\(response\.summary\.(?:selected|eligible|blocked|approved|failed)\) \}/g)?.length, 5)
  assert.match(source, /<StatStrip\n\s+items=\{\[/)
  assert.equal(source.match(/<span className="tag">\{item\.disposalNo\}<\/span> - <span className="tag">\{item\.assetTag\}<\/span>/g)?.length, 2, "the blocked groups and the result lists")
  assert.doesNotMatch(source, /function (?:BulkSummary|Metric)\b|<button\b|linkVariants|bg-warning-soft|text-danger|\btext-xs\b|h-4 w-4 text-primary/)
})

test("bulk execution: a quiet toolbar, danger and warning Notices, KeyValueList reviews with Nil, a StatStrip and outcome StatusBadges (spec 2D M26, D7, D19, M22)", () => {
  const source = read(`${C}disposal/disposal-bulk-execution.tsx`)
  assert.match(source, /className="mx-4 mt-3 flex flex-col gap-3 rounded-md border border-border bg-background p-3 md:mx-5 md:flex-row md:items-center md:justify-between"\n\s+aria-label=\{copy\.toolbarLabel\}/)
  assert.match(source, /\{error \? <Notice tone="danger" role="alert" className="mx-4 mt-3 md:mx-5">\{error\}<\/Notice> : null\}/)
  assert.match(source, /<AccessibleDialogBody className="space-y-5">\n\s+\{error \? <Notice tone="danger" role="alert">\{error\}<\/Notice> : null\}\n\s+<div aria-live="polite" className="min-h-5 text-sm">/, "a dialog error is the first thing in its body")
  assert.match(source, /<section className="space-y-3">\n\s+<Notice tone="warning" id=\{historicalWarningId\}>\n\s+\{copy\.historicalWarning\}\n\s+<\/Notice>/, "the warning is a Notice and the controls sit outside its fill")
  assert.equal(source.match(/<KeyValueList\b/g)?.length, 2, "the shared values and each request's values")
  assert.equal(source.match(/nilLabel: copy\.notProvided/g)?.length, 7)
  // The number a row uses, and whether it is the request's own or the shared one (e2e decision DX2), as the recipient.
  assert.match(source, /\{ key: "documentNo", label: copy\.documentNo, value: documentReview\.documentNo \? <><span className="tag">\{documentReview\.documentNo\}<\/span>\{documentSource \? <span className="mt-1 block text-meta text-muted-foreground">\{documentSource\}<\/span> : null\}<\/> : null, nilLabel: copy\.notProvided \}/)
  assert.match(source, /<h4 className="text-sm text-foreground"><span className="tag font-medium">\{item\.disposalNo\}<\/span><\/h4>/)
  assert.equal(source.match(/value: formatCount\(response\.(?:selected|eligible|executed|blocked|failed)Count\) \}/g)?.length, 5)
  assert.match(source, /<StatusBadge label=\{copy\[item\.outcome\]\} tone=\{outcomeTones\[item\.outcome\]\} \/>/)
  assert.match(source, /eligible: "success",\n\s+executed: "primary",\n\s+blocked: "warning",\n\s+failed: "danger",/)
  assert.equal(source.match(/divide-y divide-border-soft rounded-md border border-border/g)?.length, 2, "the request list and the result list")
  assert.doesNotMatch(source, /function (?:ReviewValue|SummaryValue)\b|bg-warning-soft|border-warning-border|text-success|text-danger|border-y border-border|\btext-xs\b|text-lg|h-4 w-4 text-primary|copy\.notProvided\}/)
})

test("disposal queue: the phone filter on the panel classes, text links with a 44px phone target, the type a Chip and the phone facts KeyValueLists (spec 2D D9, D19, M22, M29)", () => {
  const source = read("src/app/[locale]/(dashboard)/disposal/page.tsx")
  assert.match(source, /<details className=\{cn\(getPanelClasses\(\), "group md:hidden"\)\} open=\{hasActiveFilters\}>/)
  assert.match(source, /<SlidersHorizontal className="h-4 w-4" aria-hidden="true" \/>/)
  assert.match(source, /<Link href=\{detailHref\} className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center text-sm text-foreground md:min-h-0"\)\}><span className="tag font-medium">\{request\.disposalNo\}<\/span><\/Link>/)
  assert.match(source, /className=\{cn\(linkVariants\(\), "inline-flex min-h-11 items-center md:min-h-0"\)\}><span className="tag">\{request\.batch\.batchNo\}<\/span><\/Link>/)
  assert.match(source, /<Link href=\{detailHref\} className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "text-foreground"\)\}><span className="tag font-medium">\{request\.disposalNo\}<\/span><\/Link>/, "the row's own code stays ink")
  assert.match(source, /className=\{cn\(linkVariants\(\), "mt-1 block"\)\}><span className="tag">\{request\.batch\.batchNo\}<\/span><\/Link>/)
  assert.match(source, /<Chip>\{t\(`types\.\$\{request\.disposalType\}`\)\}<\/Chip>/)
  assert.equal(source.match(/<KeyValueList\b/g)?.length, 2, "the phone card's facts and its more-details list")
  assert.match(source, /<details className="mt-3 border-t border-border-soft"><summary className="cursor-pointer py-3 text-sm font-medium text-primary">\{t\("moreDetails"\)\}<\/summary><KeyValueList /)
  assert.doesNotMatch(source, /function MobileDisposalField\b|hover:text-primary|hover:underline|\btext-xs\b|rounded-lg border|bg-surface px-3 py-2|tone="muted" \/>/)
})

test("disposal request page: ContentPanels, the batch an info Notice, the historical exception a warning Notice with its facts outside, remarks in the KeyValueLists and shape markers (spec 2D D7, D9, M21, M22, M29)", () => {
  const source = read("src/app/[locale]/(dashboard)/disposal/[id]/page.tsx")
  assert.equal(source.match(/<ContentPanel\b/g)?.length, 5)
  assert.equal(source.match(/<ContentPanel title=\{t\("(?:requestDetail|reason|decisionDetail|executionDetail|asset)"\)\}>/g)?.length, 5, "request, reason, decision, execution, asset")
  assert.match(source, /<Notice\n\s+tone="info"\n\s+title=\{t\("sourceBatch"\)\}\n\s+action=\{<Link href=\{`\/\$\{locale\}\/disposal\/batches\/\$\{disposalRequest\.batch\.id\}`\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>\{t\("openBatch"\)\}<\/Link>\}\n\s+>\n\s+<span className="tag">\{disposalRequest\.batch\.batchNo\}<\/span>/)
  assert.match(source, /<section aria-label=\{t\("historicalEvidenceSummary"\)\} className="mt-5 space-y-4">\n\s+<Notice tone="warning" title=\{t\("historicalEvidenceBadge"\)\}>/)
  assert.match(source, /key: "approvalRemark",\n\s+label: t\("approvalRemark"\),/)
  assert.match(source, /key: "executionRemark",\n\s+label: t\("executionRemark"\),/)
  assert.match(source, /<section id="history" className=\{cn\(getPanelClasses\(\), "p-4 sm:p-5"\)\}>/)
  assert.match(source, /<span aria-hidden="true" className=\{cn\(statusMarkerVariants\(\{ tone: "primary" \}\), "absolute top-2 -left-1"\)\} \/>/)
  assert.match(source, /<Link href=\{`\/\$\{locale\}\/assets\/\$\{disposalRequest\.asset\.id\}`\} className=\{cn\(buttonVariants\(\{ variant: "outline" \}\), "w-full"\)\}>/)
  assert.doesNotMatch(source, /function TextBlock\b|rounded-lg border|bg-(?:primary|warning)-soft|border-(?:primary|warning)-border|rounded-full|text-lg|\btext-xs\b|hover:bg-accent|sm:h-9|AlertTriangle|text-primary/)
})

test("disposal batch history: a flush ContentPanel with shared phone rows, a text link with a 44px phone target and 13px meta lines (spec 2D D9, D19, M29)", () => {
  const source = read("src/app/[locale]/(dashboard)/disposal/batches/page.tsx")
  assert.match(source, /<ContentPanel divided flush>\n\s+<ContentPanelRows className="md:hidden">/)
  assert.match(source, /return <li key=\{batch\.id\}><article><div className="flex items-start justify-between gap-3">/)
  assert.match(source, /<Link href=\{href\} className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center text-sm text-foreground md:min-h-0"\)\}><span className="tag font-medium">\{batch\.batchNo\}<\/span><\/Link>/)
  assert.match(source, /<\/DataTableFoot>\n\s+<\/ContentPanel>/)
  assert.doesNotMatch(source, /<section\b|rounded-lg border|hover:text-primary|\btext-xs\b|divide-border md:hidden/)
})

test("disposal batch page: the shared facts a ContentPanel, the requests a flush ContentPanel with shared phone rows, and 13px meta lines (spec 2D D9)", () => {
  const source = read("src/app/[locale]/(dashboard)/disposal/batches/[id]/page.tsx")
  assert.match(source, /<ContentPanel title=\{t\("batchSharedDetail"\)\}>\n\s+<KeyValueList\n\s+items=\{\[/)
  assert.match(source, /<ContentPanel divided flush title=\{t\("batchChildren"\)\}>/)
  assert.match(source, /<EmptyNote padded className="md:hidden">\{tCommon\("noData"\)\}<\/EmptyNote>/)
  assert.match(source, /<ContentPanelRows className="md:hidden">\n\s+\{batch\.disposalRequests\.map\(\(request\) => <li key=\{request\.id\}><BatchRequestCard /)
  assert.match(source, /<article>\n\s+<div className="flex items-start justify-between gap-3">/)
  assert.doesNotMatch(source, /<section\b|rounded-lg border|PackageCheck|text-lg|\btext-xs\b|text-primary/)
})

test("disposal print page: money through formatMoney with the baht unit, as on the screen (spec 2D D10, M24)", () => {
  const source = read("src/app/[locale]/(print)/disposal/[id]/print/page.tsx")
  assert.match(source, /^import \{ formatMoney \} from "@\/lib\/display-format"$/m)
  assert.equal(source.match(/formatMoney\(Number\(disposalRequest\.(?:actualSaleValue|actualSalvageValue|saleValue|salvageValue|asset\.purchasePrice)\), \{ unit: tCommon\("baht"\) \}\)/g)?.length, 5)
  assert.doesNotMatch(source, /formatCurrency/)
})

test("review focus 2: a missing amount on the disposal printout stays null and prints the print page's dash, never 0.00 บาท (plan 2D-4)", () => {
  const source = read("src/app/[locale]/(print)/disposal/[id]/print/page.tsx")
  for (const field of ["actualSaleValue", "actualSalvageValue", "saleValue", "salvageValue", "asset.purchasePrice"]) {
    const name = field.replace(".", "\\.")
    assert.match(source, new RegExp(`disposalRequest\\.${name} == null \\? null : formatMoney\\(Number\\(disposalRequest\\.${name}\\), \\{ unit: tCommon\\("baht"\\) \\}\\)`), field)
  }
})

test("one set of disposal status names (critique 2026-10-20 D3)", () => {
  const D = "src/app/[locale]/(dashboard)/"
  const queue = read(`${D}disposal/page.tsx`)
  const workCenter = read(`${D}work-center/page.tsx`)
  const th = JSON.parse(read("messages/th.json")), en = JSON.parse(read("messages/en.json"))
  assert.doesNotMatch(queue, /t\("stages\./)
  assert.match(queue, /pending_approval: t\("statuses\.pending"\),\s+awaiting_execution: t\("statuses\.approved"\),\s+complete: t\("statuses\.disposed"\),\s+rejected: t\("statuses\.rejected"\)/)
  assert.match(workCenter, /tDisposal\(`statuses\.\$\{request\.requestStatus\}`\)/); assert.doesNotMatch(workCenter, /disposalStatus_/)
  assert.deepEqual(th.disposalPage.statuses, { pending: "รอพิจารณา", approved: "อนุมัติแล้ว รอตัดจำหน่าย", disposed: "ตัดจำหน่ายแล้ว", rejected: "ไม่อนุมัติ" })
  assert.deepEqual(en.disposalPage.statuses, { pending: "Pending decision", approved: "Approved, awaiting disposal", disposed: "Disposed", rejected: "Not approved" })
  for (const m of [th, en]) { assert.equal(m.disposalPage.stages, undefined); assert.equal(m.workCenter.disposalStatus_pending, undefined); assert.equal(m.workCenter.disposalStatus_approved, undefined) }
  assert.equal(th.disposalPage.subtitle, "ติดตามคำขอที่รอพิจารณา รอตัดจำหน่าย และปิดงานตัดจำหน่าย")
  assert.equal(en.disposalPage.subtitle, "Track disposal requests pending decision, awaiting disposal, and completed.")
})

test("the batch list names its first column the batch number (critique 2026-10-20 D4)", () => {
  const src = read("src/app/[locale]/(dashboard)/disposal/batches/page.tsx")
  assert.match(src, /<DataTableHead>\{t\("batchNo"\)\}<\/DataTableHead>/)
  assert.doesNotMatch(src, /t\("sourceBatch"\)/)
  assert.equal(JSON.parse(read("messages/th.json")).disposalPage.batchNo, "เลขที่ชุด")
  assert.equal(JSON.parse(read("messages/en.json")).disposalPage.batchNo, "Batch No.")
})

test("queue names use the disposal status words (critique 2026-10-20 D3)", () => {
  const th = JSON.parse(read("messages/th.json")), en = JSON.parse(read("messages/en.json"))
  for (const ns of ["notifications"]) {
    assert.match(th[ns].pendingDisposals, /รอพิจารณา/, `th.${ns}.pendingDisposals`)
    assert.doesNotMatch(th[ns].pendingDisposals, /รออนุมัติ/, `th.${ns}.pendingDisposals`)
    assert.equal(th[ns].approvedDisposals, "อนุมัติแล้ว รอตัดจำหน่าย", `th.${ns}.approvedDisposals`)
    assert.equal(en[ns].pendingDisposals, "Disposals pending decision", `en.${ns}.pendingDisposals`)
    assert.equal(en[ns].approvedDisposals, "Approved, awaiting disposal", `en.${ns}.approvedDisposals`)
  }
  for (const m of [th, en]) {
    for (const key of ["pendingDisposals", "approvedDisposals"]) {
      assert.equal(m.workCenter[key], undefined, `workCenter.${key}: the work center reads notifications.${key} (group 1 dashboard task 4)`)
      assert.equal(m.dashboard[key], undefined, `dashboard.${key}: the dashboard reads notifications.${key} (group 1 dashboard task 9)`)
    }
  }
  assert.doesNotMatch(th.workCenter.disposalSubtitle, /รออนุมัติ|รอดำเนินการ/)
  assert.doesNotMatch(en.workCenter.disposalSubtitle, /pending approval/)
  const digest = read("src/lib/notification-digest-format.ts")
  const disposalLines = digest.split("\n").filter((line) => /(?:pending|approved)Disposals:/.test(line))
  assert.equal(disposalLines.length, 4)
  for (const line of disposalLines) assert.doesNotMatch(line, /รออนุมัติ|รอดำเนินการ|pending approval/)
  assert.ok(digest.includes('pendingDisposals: "ตัดจำหน่ายรอพิจารณา"'))
  assert.ok(digest.includes('approvedDisposals: "อนุมัติแล้ว รอตัดจำหน่าย"'))
})
