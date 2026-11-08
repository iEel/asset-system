import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Page group 12 plan 4 task 2 (spec §10, recon §5, board AD-Integrations): the Integration API page. Source pins, read
// with \r stripped.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const C = "src/components/admin/"
const page = () => read("src/app/[locale]/(dashboard)/admin/integrations/page.tsx")
const manager = () => read(`${C}IntegrationClientManager.tsx`)
const sheet = () => read(`${C}integrations/client-create-sheet.tsx`)
const row = () => read(`${C}integrations/client-row.tsx`)
const tiles = () => read(`${C}integrations/client-tiles.tsx`)
const all = () => [manager(), sheet(), row(), tiles()].join("\n")
const messages = (locale: "th" | "en") => JSON.parse(read(`messages/${locale}.json`)).integrationApiPage as Record<string, string>

test("create opens a side panel and the token gate stays", () => {
  const source = manager()
  // The header: the history link to the Integration API quick filter, and สร้าง client only with setting:edit.
  assert.match(source, /href=\{buildSystemLogFilterHref\(locale, "integration_api"\)\}/)
  assert.match(source, /\{canEdit \? \(\n\s+<Button ref=\{createButtonRef\} onClick=\{openCreate\}>\n\s+<Plus aria-hidden="true" \/>\n\s+\{labels\.createClient\}/)
  assert.match(source, /<ClientCreateSheet\n/)
  // The create form is step 1 of the panel; the old panel above the list is gone.
  assert.doesNotMatch(source, /<ContentPanel divided title=\{labels\.createTitle\}>/)
  assert.match(source, /setNewClientIds\(\(current\) => new Set\(current\)\.add\(payload\.data\.id\)\)/, "the new row is marked until the page reloads")

  const panel = sheet()
  assert.match(panel, /from "@\/components\/ui\/sheet"/)
  assert.match(panel, /<Sheet open=\{open\} onOpenChange=\{requestOpenChange\}>/)
  assert.match(panel, /<SheetContent\n\s+side="right"/)
  // The panel closes only once the acknowledgement is ticked: the X, Escape and a click outside all go through the gate.
  assert.match(panel, /const gated = token !== null && !tokenAcknowledgement/)
  assert.match(panel, /function requestOpenChange\(next: boolean\) \{\n\s+if \(!next && locked\) return\n/)
  assert.match(panel, /onEscapeKeyDown=\{\(event\) => \{\n\s+if \(locked\) event\.preventDefault\(\)/)
  assert.match(panel, /onInteractOutside=\{\(event\) => \{\n\s+if \(locked\) event\.preventDefault\(\)/)
  // After create step 1 collapses to a summary: the display name, the client ID and the scopes.
  assert.match(panel, /\{token \? \(\n\s+<dl /)
  assert.match(panel, /<span className="tag">\{token\.clientId\}<\/span>/)
  assert.match(panel, /\{token\.scopes\.map\(\(scope\) => scopeLabels\[scope\] \?\? scope\)\.join\(" · "\)\}/)
  // Step 2: the token, copy, the warning and the acknowledgement that gates dismiss.
  assert.match(panel, /<Notice tone="warning">\{labels\.tokenPanelWarning\}<\/Notice>/)
  assert.match(panel, /<div className="mt-1 break-all font-mono text-sm text-foreground">\{token\.token\}<\/div>/)
  assert.match(panel, /<Button variant="outline" onClick=\{onCopyToken\}>\n\s+<Copy aria-hidden="true" \/>\n\s+\{labels\.copyToken\}/)
  assert.match(panel, /checked=\{tokenAcknowledgement\}\n\s+onChange=\{\(event\) => onTokenAcknowledgementChange\(event\.target\.checked\)\}/)
  assert.match(panel, /<Button onClick=\{dismissToken\} disabled=\{!tokenAcknowledgement\} aria-describedby=\{gated \? hintId : undefined\}>/)
  assert.match(panel, /\{gated \? <p id=\{hintId\}[^>]*>\{labels\.dismissHint\}<\/p> : null\}/)

  const th = messages("th")
  assert.equal(th.historyLink, "ประวัติการเรียกใช้")
  assert.equal(th.createClient, "สร้าง client")
  assert.equal(th.stepDetails, "รายละเอียด client")
  assert.equal(th.dismissHint, "ติ๊กยืนยันข้างบนก่อน แล้วจึงปิดได้")
  assert.equal(th.newBadge, "ใหม่")
})

test("the token lives in component state only", () => {
  const source = all()
  assert.match(manager(), /const \[oneTimeToken, setOneTimeToken\] = useState<OneTimeToken \| null>\(null\)/)
  // Never stored, logged or put in a URL; the history links name the client ID, never the token.
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|document\.cookie|console\.|useRouter|useSearchParams|history\.(?:push|replace)State|location\.(?:href|search|hash)/)
  assert.doesNotMatch(source, /[?&]token=|encodeURIComponent\([^)]*token/i)
  assert.match(row(), /buildSystemLogRecordHref\(locale, "integration_api", client\.clientId\)/)
  // Dismiss (after the acknowledgement) drops the token from memory.
  assert.match(manager(), /function dismissToken\(\) \{\n\s+if \(!tokenAcknowledgement\) return\n\s+setOneTimeToken\(null\)/)
  assert.doesNotMatch(source, /tokenHash/)
})

test("rows show creator, rotation date, usage and error badge", () => {
  const source = row()
  // The display name first, the client ID under it, then "สร้าง {date} · {creator or ไม่ทราบผู้สร้าง}".
  assert.match(source, /const creator = creatorLabel\(client\)/)
  assert.match(source, /t\("createdLine", \{ date: formatDay\(client\.createdAt\), creator: creator\.kind === "name" \? creator\.name : t\("createdUnknown"\) \}\)/)
  assert.match(source, /\{isNew \? <StatusBadge tone="success" label=\{t\("newBadge"\)\} \/> : null\}/)
  // Thai scope badges, the token preview with its rotation date, the last use, the 7-day count and the error badge.
  assert.match(source, /<Chip key=\{scope\}>\{scopeLabels\[scope\] \?\? <span className="tag">\{scope\}<\/span>\}<\/Chip>/)
  assert.match(source, /<span className="tag">\{client\.tokenPreview\}<\/span>/)
  assert.match(source, /\{client\.lastRotatedAt \? <span className="block text-meta text-muted-foreground">\{t\("rotatedOn", \{ date: formatDay\(client\.lastRotatedAt\) \}\)\}<\/span> : null\}/)
  assert.match(source, /const usage = clientUsage\(client\)/)
  assert.match(source, /usage\.neverUsed \? labels\.noLastUsed : formatDateTime\(usage\.lastUsedAt\)/)
  assert.match(source, /t\("calls7d", \{ count: usage\.calls7d \}\)/)
  assert.match(source, /\{usage\.hasErrors \? <StatusBadge tone="danger" label=\{t\("errorsBadge", \{ count: usage\.errors7d \}\)\} \/> : null\}/)
  // The highlighted row (ใหม่) is marked with data-new; the phone gets a card per client with the same parts.
  assert.match(source, /export function ClientTableRows\(/)
  assert.match(source, /export function ClientCard\(/)
  assert.match(manager(), /<ul className="grid gap-3 p-4 md:hidden">/)
  assert.match(manager(), /<p className="flex items-start gap-2 border-t border-border px-4 py-2\.5 text-meta text-muted-foreground md:px-5">/)

  const th = messages("th")
  assert.equal(th.createdLine, "สร้าง {date} · {creator}")
  assert.equal(th.createdUnknown, "ไม่ทราบผู้สร้าง")
  assert.equal(th.rotatedOn, "เปลี่ยน {date}")
  assert.equal(th.calls7d, "7 วัน {count, number} ครั้ง")
  assert.equal(th.errorsBadge, "Error 7 วัน {count, number}")
  assert.equal(th.noLastUsed, "ยังไม่เคยใช้")
  assert.equal(th.hashNote, "ระบบเก็บเฉพาะค่า hash ของ token จึงแสดงซ้ำไม่ได้ · ถ้า token หาย ให้ \"เปลี่ยน token\" แล้วนำ token ใหม่ไปใส่ที่ระบบปลายทาง")
  assert.match(messages("en").calls7d, /\{count, plural,/)
  assert.match(messages("en").errorsBadge, /\{count, plural,/)
})

test("the expand keeps 24h, top endpoint and latest error", () => {
  const source = row()
  assert.match(source, /aria-expanded=\{open\}\n\s+aria-controls=\{controls\}/)
  assert.match(source, /t\("calls24h", \{ count: operations\.requestCount24h \}\)/)
  assert.match(source, /operations\.topEndpoint \? \(/)
  assert.match(source, /<span className="tag">\{INTEGRATION_API_METHOD\}<\/span>/)
  assert.match(source, /\{operations\.topEndpoint\.route\}/)
  assert.match(source, /formatCount\(operations\.topEndpoint\.count\)/)
  assert.match(source, /operations\.latestError \? \(/)
  assert.match(source, /formatDateTime\(operations\.latestError\.at\)/)
  assert.match(source, /<StatusBadge tone="danger" label=\{String\(operations\.latestError\.status\)\} \/>/)
  assert.match(source, /\{operations\.latestError\.route\}/)
  assert.match(source, /operations\.requestCountTotal === 0 \? \(\n\s+<p className="text-muted-foreground">\{labels\.noOperationalData\}<\/p>/)

  const th = messages("th")
  assert.equal(th.calls24h, "24 ชม. {count, number} ครั้ง")
  assert.equal(th.noOperationalData, "ยังไม่มีการเรียกใช้")
  assert.match(messages("en").calls24h, /\{count, plural,/)
})

test("the ⋯ menu keeps rotate and disable confirms", () => {
  const source = row()
  assert.match(source, /<RowActions\n/)
  assert.match(source, /key: "copyPowerShell", label: labels\.copyPowerShell/)
  assert.match(source, /kind: "link", key: "history", label: t\("historyItem"\)/)
  assert.match(source, /key: "rotate", label: t\("rotateItem"\), hint: t\("rotateHint"\)/)
  // ปิดใช้งาน… in red, or เปิดใช้งาน…, in its own group after a separator.
  assert.match(source, /\{ key: "status", items: canEdit \? \[client\.enabled \? disableItem : enableItem\] : \[\] \}/)
  assert.match(source, /key: "disable", label: t\("disableItem"\), hint: t\("disableHint"\), destructive: true/)
  assert.match(source, /key: "enable", label: t\("enableItem"\)/)
  // The confirms are the ones the page always had.
  const composer = manager()
  assert.match(composer, /confirm\(\{ title: labels\.confirmRotate, confirmLabel: labels\.rotate, tone: "destructive", returnFocusRef: openerRef \}\)/)
  assert.match(composer, /\? \{ title: labels\.confirmEnable, confirmLabel: labels\.enable, returnFocusRef: openerRef \}\n\s+: \{ title: labels\.confirmDisable, confirmLabel: labels\.disable, tone: "destructive", returnFocusRef: openerRef \}/)

  const th = messages("th")
  assert.equal(th.historyItem, "ดูประวัติ")
  assert.equal(th.rotateItem, "เปลี่ยน token…")
  assert.equal(th.disableItem, "ปิดใช้งาน…")
  assert.equal(th.enableItem, "เปิดใช้งาน…")
  assert.equal(th.edit, "แก้ไข")
})

test("read-only viewers keep copy and history only", () => {
  assert.match(page(), /const user = await requirePagePermission\(locale, "setting", "view"\)/)
  assert.match(page(), /canEdit=\{hasPermission\(user, "setting", "edit"\)\}/)
  const source = row()
  // แก้ไข, เปลี่ยน token and the status item need setting:edit; Copy PowerShell and ดูประวัติ do not.
  assert.match(source, /next=\{canEdit \? \{ label: t\("edit"\), onSelect: onEdit, icon: <Pencil aria-hidden="true" \/> \} : undefined\}/)
  assert.match(source, /\.\.\.\(canEdit\n\s+\? \[\n\s+\{\n\s+kind: "action",\n\s+key: "rotate"/)
  assert.match(source, /\.\.\.\(example\n\s+\? \[\n\s+\{\n\s+kind: "action",\n\s+key: "copyPowerShell"/)
  // The composer refuses writes without the permission too (no dialog, no request).
  assert.match(manager(), /function openEditClient\(client: IntegrationClient\) \{\n\s+if \(!canEdit\) return/)
})

test("kept: edit dialog with widening confirm, empty state, load and action errors", () => {
  const source = manager()
  assert.match(source, /<AccessibleDialog\n\s+open=\{editingClient !== null\}\n\s+title=\{labels\.editScopes\}/)
  assert.match(source, /confirm\(\{ title: labels\.confirmScopeExpansion, confirmLabel: labels\.confirmScopeExpansionAction \}\)/)
  assert.match(source, /<ActionEmptyState title=\{labels\.emptyTitle\} description=\{labels\.emptyDescription\} \/>/)
  assert.match(source, /if \(!response\.ok\) throw new Error\(labels\.loadFailed\)/)
  assert.match(source, /\{error && !editingClient && !sheetOpen \? \(\n\s+<Notice tone="danger" role="alert">/)
  assert.match(source, /if \(!response\.ok\) throw new Error\(labels\.actionFailed\)/)
  // The create error shows inside the panel, where the form is.
  assert.match(sheet(), /\{error \? \(\n\s+<Notice tone="danger" role="alert">\n\s+\{labels\.error\}: \{error\}/)
  // After an action the row keeps its creator's name (the action responses carry createdByName null).
  assert.match(source, /function mergeClient\(previous: IntegrationClient \| undefined, next: IntegrationClient\): IntegrationClient \{\n\s+return \{ \.\.\.next, createdByName: next\.createdByName \?\? previous\?\.createdByName \?\? null, operations: previous\?\.operations \?\? next\.operations \}/)
  // Tiles and chips: four tiles from the page model, chips with counts in client state.
  const strip = tiles()
  assert.match(strip, /\{ key: "usage", label: t\("usageTile"\), value: formatCount\(summary\.calls7d\), unit: t\("usageUnit"\), foot: t\("usageErrors", \{ count: summary\.errors7d \}\) \}/)
  assert.match(strip, /<Segmented\n\s+aria-label=\{t\("filterLabel"\)\}\n\s+value=\{value\}\n\s+onValueChange=\{onChange\}/)
  assert.match(source, /const summary = useMemo\(\(\) => integrationSummary\(clients\), \[clients\]\)/)
  assert.match(source, /const visibleClients = useMemo\(\(\) => filterClients\(clients, statusFilter\), \[clients, statusFilter\]\)/)
  assert.match(source, /counts=\{statusCounts\(clients\)\}/)
})

test("final review: token stays on screen, usage kept, history links, focus and busy", () => {
  const source = manager()
  const panel = sheet()
  const rows = row()
  // A create in flight cannot be closed away: the panel refuses every close while busy, the composer too, and a
  // token that arrives while the panel is closed opens it again at its gated step 2.
  assert.match(source, /busy=\{saving\}/)
  assert.match(panel, /const locked = gated \|\| busy/)
  assert.match(panel, /function requestOpenChange\(next: boolean\) \{\n\s+if \(!next && locked\) return\n/)
  assert.match(panel, /onEscapeKeyDown=\{\(event\) => \{\n\s+if \(locked\) event\.preventDefault\(\)/)
  assert.match(panel, /onInteractOutside=\{\(event\) => \{\n\s+if \(locked\) event\.preventDefault\(\)/)
  assert.match(panel, /showCloseButton=\{!busy\}/)
  assert.match(source, /function changeSheetOpen\(open: boolean\) \{\n\s+if \(open\) \{\n\s+setSheetOpen\(true\)\n\s+return\n\s+\}\n\s+if \(saving\) return\n/)
  assert.match(source, /token: payload\.token \}\)\n\s+setSheetMode\("create"\)\n\s+setSheetOpen\(true\)/)
  // An action's response carries no usage, so a row keeps the usage it had.
  assert.match(source, /operations: previous\?\.operations \?\? next\.operations/)
  // The history links only for viewers who can open the logs page (system:view).
  assert.match(page(), /canViewLogs=\{hasPermission\(user, "system", "view"\)\}/)
  assert.match(source, /\{canViewLogs \? \(\n\s+<Link href=\{buildSystemLogFilterHref\(locale, "integration_api"\)\}/)
  assert.match(rows, /\.\.\.\(canViewLogs\n\s+\? \[\n\s+\{ kind: "link", key: "history"/)
  // Focus: the panel returns focus to its opener; the ⋯ confirms return to the row's ⋯; copy returns there too.
  assert.match(panel, /onCloseAutoFocus=\{\(event\) => \{\n\s+event\.preventDefault\(\)\n\s+const target = returnFocusRef\.current\n\s+if \(target\?\.isConnected\) target\.focus\(\)/)
  assert.match(source, /returnFocusRef=\{sheetReturnFocusRef\}/)
  assert.match(source, /sheetReturnFocusRef\.current = createButtonRef\.current/)
  assert.match(source, /sheetReturnFocusRef\.current = openerRef\.current/)
  assert.match(source, /confirm\(\{ title: labels\.confirmRotate, confirmLabel: labels\.rotate, tone: "destructive", returnFocusRef: openerRef \}\)/)
  assert.match(source, /\{ title: labels\.confirmEnable, confirmLabel: labels\.enable, returnFocusRef: openerRef \}/)
  assert.match(source, /\{ title: labels\.confirmDisable, confirmLabel: labels\.disable, tone: "destructive", returnFocusRef: openerRef \}/)
  assert.match(source, /finally \{\n\s+const opener = openerRef\.current\n\s+if \(opener\?\.isConnected\) opener\.focus\(\)/)
  // A status change that filters its row out sends focus to the status chips.
  assert.match(source, /focusChipsAfterFilterRef\.current = true/)
  assert.match(source, /chipsRef\.current\?\.querySelector<HTMLElement>\('\[aria-pressed="true"\]'\)\?\.focus\(\)/)
  // A second action while one runs is refused out loud, checked through a ref before its confirm opens.
  assert.match(source, /function refuseWhileBusy\(\) \{\n\s+if \(!mutatingRef\.current\) return false\n\s+setError\(labels\.actionBusy\)\n\s+return true/)
  assert.doesNotMatch(source, /if \(mutatingId\) return/)
  assert.match(rows, /\{busy \? <Loader2 aria-hidden="true" className="size-4 animate-spin text-muted-foreground motion-reduce:animate-none" \/> : null\}/)
  // Thai words: the rotate confirm says เปลี่ยน token; the page title is the board's.
  const th = messages("th")
  assert.equal(th.confirmRotate, "ต้องการเปลี่ยน token ของ client นี้หรือไม่? token เดิมจะใช้ไม่ได้ทันที")
  assert.equal(th.title, "Integration API")
  assert.equal(messages("en").title, "Integration API")
  assert.equal(typeof th.actionBusy, "string")
  assert.equal(typeof messages("en").actionBusy, "string")
})
