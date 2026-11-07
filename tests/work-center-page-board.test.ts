import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 9 plan 2 Task 2: the work center on board WC (spec §4). Sources are read with \r stripped, so a regex here may
// hold \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const page = read("src/app/[locale]/(dashboard)/work-center/page.tsx")
const strip = read("src/components/work-center/work-center-strip.tsx")
const tracking = read("src/components/work-center/work-center-tracking.tsx")
const tabs = read("src/components/work-center/work-center-tabs.tsx")
const table = read("src/components/work-center/work-rows-table.tsx")
const assetsPanel = read("src/components/work-center/work-center-assets-panel.tsx")
const th = JSON.parse(read("messages/th.json")) as { workCenter: Record<string, unknown> }
const en = JSON.parse(read("messages/en.json")) as { workCenter: Record<string, unknown> }

function message(messages: { workCenter: Record<string, unknown> }, dotted: string): unknown {
  return dotted.split(".").reduce<unknown>((node, part) => (node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined), messages.workCenter)
}

test("the page reads everything from getWorkCenterPageData and nothing from the database", () => {
  assert.match(page, /await getWorkCenterPageData\(user, \{ searchParams: rawSearchParams, locale, returnTo \}\)/)
  assert.doesNotMatch(page, /from "@\/lib\/db"|prisma\.|getWaitingWork|work-center-metrics|mineCounters/)
  assert.match(page, /requirePagePermission\(locale, "dashboard", "view"\)/)
})

test("the header: ศูนย์งานค้าง, the view switch as links and the notifications link with the unread count", () => {
  assert.match(page, /<PageHeader\n\s+title=\{t\("title"\)\}\n\s+meta=\{t\("subtitle"\)\}/)
  assert.match(page, /<WorkCenterViewSwitch locale=\{locale\} params=\{data\.params\} className="max-md:hidden" \/>/)
  assert.match(tabs, /aria-label=\{t\("viewNavigation"\)\}/)
  assert.match(tabs, /buildWorkCenterHref\(locale, params, \{ view, show: WORK_SHOW_STEP \}\)/, "the switch keeps panel and drops show")
  assert.match(tabs, /segmentedFrameClasses/)
  assert.match(page, /href=\{`\/\$\{locale\}\/notifications`\}/)
  assert.match(page, /aria-label=\{t\("notificationsLinkLabel", \{ count: data\.unreadTopics \}\)\}/)
  assert.match(page, /\{data\.unreadTopics > 0 \? \(/)
  assert.match(page, /<Notice tone="warning">\{t\("myWorkUnavailable"\)\}<\/Notice>/, "the view=mine notice stays")
})

test("the strip: ต้องทำวันนี้ with its two links, งานค้างทั้งหมด with the previous day, one cell per queue and the sum line", () => {
  assert.match(strip, /t\("today\.title"\)/)
  assert.match(strip, /t\("today\.parts", \{ approvals: summary\.today\.approvals, approved: summary\.today\.approvedDisposals \}\)/)
  assert.match(strip, /summary\.approvalParts \? \(/, "พิจารณา shows with the approvals queue")
  assert.match(strip, /href=\{`\/\$\{locale\}\/admin\/approvals`\}/)
  assert.match(strip, /summary\.today\.approvedDisposals > 0 \? \(/)
  assert.match(strip, /href=\{`\/\$\{locale\}\/disposal\?status=approved`\}/)
  assert.match(strip, /t\("backlog\.title"\)/)
  assert.match(strip, /previous\.isYesterday\n\s+\? t\("backlog\.yesterday", \{ count: previous\.backlogTotal \}\)\n\s+: t\("backlog\.onDay", \{ date: formatDate\(previous\.dayLabelDate\), count: previous\.backlogTotal \}\)/)
  assert.match(strip, /summary\.queues\.map\(\(entry\) => formatCount\(entry\.count\)\)\.join\(" \+ "\)/)
  assert.match(strip, /t\("backlog\.sumNote", \{ sum: sumLine \}\)/)
  // Final review ruling 3: no bare "= 0" sum note when no queue is visible.
  assert.match(
    strip,
    /\{summary\.queues\.length > 0 \? \(\n\s+<p className="mt-2\.5 text-xs num text-muted-foreground">\{t\("backlog\.sumNote", \{ sum: sumLine \}\)\}<\/p>\n\s+\) : null\}/,
  )
  assert.match(strip, /buildWorkCenterHref\(locale, params, \{ panel: entry\.queue, show: WORK_SHOW_STEP \}\)/)
})

test("ติดตามแยก: the round to its scan page, data issues to the assets tab, the advance warnings to notifications", () => {
  assert.match(tracking, /t\("tracking\.title"\)/)
  // Final review ruling 2: เดินตรวจต่อ only with audit:edit; otherwise the round's page, ดูรอบตรวจนับ.
  assert.match(tracking, /const \{ round, dataIssues, advanceTotal, canScan \} = tracking/)
  assert.match(
    tracking,
    /href=\{canScan \? `\/\$\{locale\}\/audit\/rounds\/\$\{round\.id\}\/scan` : `\/\$\{locale\}\/audit\/rounds\/\$\{round\.id\}`\}/,
  )
  assert.match(tracking, /\{canScan \? t\("tracking\.continueScan"\) : t\("tracking\.openRound"\)\}/)
  assert.equal(message(th, "tracking.openRound"), "ดูรอบตรวจนับ")
  assert.equal(typeof message(en, "tracking.openRound"), "string")
  assert.match(tracking, /<PaceBar value=\{round\.total > 0 \? round\.checked \/ round\.total : 0\} pace=\{null\}/)
  assert.match(tracking, /t\("tracking\.pending", \{ count: round\.pending \}\)/)
  assert.match(tracking, /buildWorkCenterHref\(locale, params, \{ panel: "assets", show: WORK_SHOW_STEP \}\)/)
  assert.match(tracking, /href=\{`\/\$\{locale\}\/notifications#advance`\}/)
  assert.match(tracking, /if \(!round && dataIssues === null && !showAdvance\) return null/, "hidden when all three are absent")
})

test("tabs come from the visible queues, keep view and drop show; ข้อมูลไม่ครบ needs asset:view (its count is not null)", () => {
  assert.match(tabs, /<TabNav\n\s+aria-label=\{t\("focusNavigation"\)\}/)
  assert.match(tabs, /\.\.\.summary\.queues\.map\(\(entry\) => \(\{/)
  assert.match(tabs, /\.\.\.\(dataIssues !== null\n\s+\? \[/)
  assert.match(tabs, /buildWorkCenterHref\(locale, params, \{ panel, show: WORK_SHOW_STEP \}\)/)
})

test("the table: urgency dot with a word, the work, queue and kind, the age lines, RowActions with next and the menu", () => {
  assert.match(table, /<DataTable\b/)
  assert.match(table, /t\("table\.sortNote"\)/)
  assert.match(table, /statusMarkerVariants\(\{ tone: urgencyTones\[row\.urgency\] \}\)/)
  assert.match(table, /<span className="sr-only">\{t\(`urgency\.\$\{row\.urgency\}`\)\}<\/span>/)
  assert.match(table, /<RowActions\n\s+code=\{row\.documentNo \?\? row\.assetTag \?\? row\.number\}/)
  assert.match(
    table,
    /next=\{row\.nextStep \? \{ label: tRoot\(row\.nextStep\.labelKey\), href: row\.nextStep\.href \} : null\}\n\s+nextWidth="auto"\n/,
    "the next step shows its whole label (look step); none without its target's permission (final review ruling 1)",
  )
  assert.match(
    table,
    /<col \/>\n\s+<col className="hidden w-44 xl:table-column" \/>\n\s+<col className="w-40" \/>\n\s+<col className="w-60" \/>\n\s+<\/colgroup>/,
    "the ขั้นถัดไป column has room for พิจารณารายการไม่ตรง and ⋯; the งาน column wraps",
  )
  // Look fix 2: at 1024 (sidebar open) the table fits its frame. Below xl the คิว · ประเภท column is hidden and its two
  // words lead the งาน cell's context line; from xl the table is as before.
  assert.match(table, /minWidth=\{640\}/, "four columns fit about 700px with no horizontal scroll")
  assert.doesNotMatch(table, /minWidth=\{880\}/)
  assert.match(table, /<DataTableHead className="hidden xl:table-cell">\{t\("table\.queueKind"\)\}<\/DataTableHead>/)
  assert.match(
    table,
    /<DataTableCell className="hidden xl:table-cell">\n\s+<p className="text-foreground">\{t\(`queue\.\$\{row\.queue\}`\)\}<\/p>/,
  )
  assert.match(
    table,
    /<span className="xl:hidden">\n\s+\{t\(`queue\.\$\{row\.queue\}`\)\} · \{t\(`kind\.\$\{row\.kind\}`\)\}\n\s+\{row\.assetTag \|\| row\.documentNo \|\| row\.context \? " · " : null\}\n\s+<\/span>/,
    "below xl the queue · kind joins the start of the work cell's context line",
  )
  assert.match(table, /items: row\.menu\.map\(\(item\) => \(\{ kind: "link", key: item\.key, label: menuLabel\(row, item\.key\), href: item\.href \}\)\)/)
  assert.match(table, /t\("deadline\.overSla", \{ days: row\.overdueDays \}\)/)
  assert.match(table, /t\("deadline\.overdue", \{ days: row\.overdueDays \}\)/)
  assert.match(table, /t\("deadline\.dueIn", \{ days: row\.dueInDays \}\)/)
  assert.match(table, /t\("deadline\.since", \{ date: formatDate\(row\.since\) \}\)/)
})

test("the more link stops at the total", () => {
  assert.match(table, /const moreCount = shown < total && shown < WORK_SHOW_MAX \? Math\.min\(WORK_SHOW_STEP, total - shown\) : 0/)
  assert.match(table, /buildWorkCenterHref\(locale, params, \{ show: params\.show \+ WORK_SHOW_STEP \}\)/)
  assert.match(table, /t\("table\.shown", \{ shown, total \}\)/)
  assert.match(table, /\{moreCount > 0 \? \(/)
})

test("a queue tab: its parts line and one link to the source page named by destination; the empty words", () => {
  assert.match(table, /t\("parts\.approvals", \{ disposal: summary\.approvalParts\.disposal, mismatches: summary\.approvalParts\.audit, rounds: summary\.approvalParts\.round \}\)/)
  assert.match(table, /\.map\(\(key\) => `\$\{tNotifications\(key\)\} \$\{formatCount\(counts\[key\] \?\? 0\)\}`\)\n\s+\.join\(" · "\)/)
  assert.match(table, /t\(`goTo\.\$\{queue\}`\)/)
  for (const key of ["noApprovalInboxIssues", "noMaintenanceIssues", "noAuditIssues", "noDisposalIssues", "noBacklog"]) {
    assert.match(table, new RegExp(`"${key}"`), key)
  }
})

test("the assets tab is the moved panel: the fix cards with their register filters and the asset list", () => {
  assert.match(page, /<WorkCenterAssetsPanel locale=\{locale\} assets=\{data\.assets\} \/>/)
  assert.match(assetsPanel, /buildExactAssetRegisterHref\(locale\)/)
  assert.match(assetsPanel, /group\.assetsHref/)
  assert.match(assetsPanel, /<EmptyNote tone="clear">\{t\("noAssetDataIssues"\)\}<\/EmptyNote>/)
  assert.match(assetsPanel, /hasAssetResponsibility\(asset\)/)
})

test("the board's words exist in th and en", () => {
  const keys = [
    "title", "subtitle", "notificationsLink", "notificationsLinkLabel", "today.title", "today.parts", "today.review", "today.recordDisposal",
    "backlog.title", "backlog.yesterday", "backlog.onDay", "backlog.up", "backlog.down", "backlog.same", "backlog.sumNote",
    "queue.approvals", "queue.maintenance", "queue.audit", "queue.disposal", "tracking.title", "tracking.roundProgress",
    "tracking.roundBar", "tracking.pending", "tracking.continueScan", "tracking.dataIssues", "tracking.pieces", "tracking.advance",
    "tabs.overview", "tabs.assets", "table.caption", "table.sortNote", "table.urgency", "table.work", "table.queueKind", "table.age",
    "table.nextStep", "table.more", "table.menuLabel", "table.shown", "table.showMoreRows", "urgency.overdue", "urgency.todo",
    "urgency.ready", "age.waiting", "age.pending", "age.due", "deadline.overSla", "deadline.overdue", "deadline.dueIn",
    "deadline.since", "menu.openRecord", "menu.openRequest", "menu.openAsset", "menu.printRequest", "goTo.approvals", "goTo.maintenance",
    "goTo.audit", "goTo.disposal", "parts.approvals", "noBacklog",
  ]
  for (const key of keys) {
    assert.equal(typeof message(th, key), "string", `th workCenter.${key}`)
    assert.equal(typeof message(en, key), "string", `en workCenter.${key}`)
  }
  assert.equal(message(th, "title"), "ศูนย์งานค้าง")
  assert.equal(message(th, "tracking.title"), "ติดตามแยก ไม่นับเป็นงานค้าง")
  assert.equal(message(th, "goTo.approvals"), "ไปหน้างานรออนุมัติ")
  assert.equal(message(th, "noBacklog"), "ไม่มีงานค้าง")
})

// Moved from the deleted work-center-metrics test: the source's titles live in notifications only.
test("the work center keeps no copies of the waiting-work titles (spec §6.3)", () => {
  for (const m of [th, en]) {
    for (const key of ["openRepairs", "duePm", "pendingAuditFindings", "openAuditActions", "pendingDisposals", "approvedDisposals", "approvalInbox"]) {
      assert.equal(m.workCenter[key], undefined, `workCenter.${key}`)
      assert.equal(m.workCenter[`${key}Detail`], undefined, `workCenter.${key}Detail`)
    }
  }
})

// Group 9 plan 2 Task 3: the phone layout to board WC-Phone (spec §4.2 "Phone"). The desktop from md is unchanged.
test("phone: the view switch full width under the title, the desktop one stays in the header", () => {
  assert.match(page, /<WorkCenterViewSwitch locale=\{locale\} params=\{data\.params\} className="max-md:hidden" \/>/)
  assert.match(page, /<WorkCenterViewSwitch locale=\{locale\} params=\{data\.params\} fullWidth className="md:hidden" \/>/)
})

test("phone: ต้องทำวันนี้ then one line งานค้างทั้งหมด n = a + b … · เมื่อวาน m; the backlog card from md", () => {
  assert.match(strip, /data-slot="work-center-backlog-line" className="[^"]*md:hidden/)
  assert.match(strip, /data-slot="work-center-backlog" className=\{cn\(cardClasses, "max-md:hidden"\)\}/)
  assert.match(strip, /`\$\{t\("backlog\.title"\)\} \$\{formatCount\(summary\.backlogTotal\)\} = \$\{summary\.queues\.map\(\(entry\) => formatCount\(entry\.count\)\)\.join\(" \+ "\)\}`/)
})

test("phone: the tabs are a 3 × 2 grid of links below md, the tab row from md", () => {
  assert.match(tabs, /data-slot="work-center-tabs-grid" className="grid grid-cols-3 gap-1\.5 md:hidden"/)
  assert.match(tabs, /aria-current=\{selected \? "page" : undefined\}/)
  assert.match(tabs, /<TabNav\n\s+aria-label=\{t\("focusNavigation"\)\}[\s\S]*?className="max-md:hidden"/)
})

test("phone: rows are cards below md and the table from md", () => {
  assert.match(table, /<DataTable\n\s+className="hidden md:block"/)
  assert.match(table, /data-slot="work-center-cards" className="grid gap-2\.5 md:hidden"/)
  assert.match(table, /<h3 className="line-clamp-2 [^"]*">\{row\.title\}<\/h3>/, "the title clamps at 2 lines")
  assert.match(table, /className=\{cn\(buttonVariants\(\{ size: "md" \}\), "mt-2\.5 min-h-11 w-full"\)\}/, "the next step is full width at 44px")
  assert.match(
    table,
    /\{row\.nextStep \? \(\n\s+<div className="pe-1\.5">\n\s+<Link href=\{row\.nextStep\.href\}/,
    "the card has no next button without its target's permission (final review ruling 1)",
  )
  assert.match(
    table,
    /<RowActions\n\s+menu="sheet"\n\s+code=\{row\.documentNo \?\? row\.assetTag \?\? row\.number\}\n\s+name=\{row\.title\}\n\s+menuLabel=[^\n]+\n\s+groups=\{menuGroups\(row\)\}/,
    "the card's ⋯ holds only the menu; the next step is its own button",
  )
})

test("phone: tag and document number are separate spans in a wrapping line, so the number drops below (look step)", () => {
  assert.match(table, /const codes = \[row\.assetTag, row\.documentNo\]\.filter\(\(code\): code is string => Boolean\(code\)\)/)
  assert.match(
    table,
    /\{codes\.length > 0 \? \(\n\s+<p className="flex flex-wrap items-baseline gap-x-1\.5 text-xs text-muted-foreground">\n\s+\{codes\.map\(\(code, index\) => \(\n\s+<Fragment key=\{code\}>\n\s+\{index > 0 \? <span aria-hidden="true">·<\/span> : null\}\n\s+<span className="tag min-w-0 break-all">\{code\}<\/span>/,
  )
  const cards = table.slice(table.indexOf('data-slot="work-center-cards"'))
  assert.doesNotMatch(cards, /<p className="[^"]*break-all/, "never break-all on a line that may hold Thai text")
  assert.equal(cards.match(/break-all/g)?.length, 1, "break-all only on a code's own span")
})

test("phone: ติดตามแยก comes after the list, the round reads ตรวจแล้ว x / y", () => {
  assert.match(tracking, /className="shrink-0 num text-muted-foreground md:hidden">\{t\("tracking\.roundChecked", \{ checked: round\.checked, total: round\.total \}\)\}/)
  assert.equal(message(th, "tracking.roundChecked"), "ตรวจแล้ว {checked, number} / {total, number}")
  assert.equal(typeof message(en, "tracking.roundChecked"), "string")
  // Final review ruling 5: two copies in reading order, no visual reorder; the phone overview list has its own h2.
  assert.doesNotMatch(page, /order-last/)
  assert.match(page, /tracking=\{data\.tracking\}[\s\S]*?className="max-md:hidden md:col-span-2 xl:col-span-1"/)
  assert.match(
    page,
    /\{data\.assets \? <WorkCenterAssetsPanel locale=\{locale\} assets=\{data\.assets\} \/> : null\}\n(?:\s+\{\/\*[^\n]*\*\/\}\n)?\s+<WorkCenterTracking\n[\s\S]*?headingId="work-center-tracking-phone"\n\s+className="md:hidden"/,
  )
  assert.equal(page.match(/<WorkCenterTracking\n/g)?.length, 2)
  assert.match(tracking, /headingId = "work-center-tracking"/)
  assert.match(tracking, /<section aria-labelledby=\{headingId\}/)
  assert.match(tracking, /<h2 id=\{headingId\}/)
  assert.match(
    table,
    /\) : queue === null \? \(\n\s+<h2 className="text-base font-semibold text-foreground md:hidden">\{t\("backlog\.title"\)\}<\/h2>/,
  )
  assert.match(page, /className="flex flex-col gap-4 md:block md:space-y-4"/)
  assert.match(page, /className="contents md:grid /)
})
