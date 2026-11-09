import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"
import { pathToFileURL } from "node:url"

// ของใช้สิ้นเปลือง plan 2 task 4: the kind history page /[locale]/consumables/[id] (server), its header (client) and the
// pure helpers it formats with. Source pins, CRLF-safe; the read itself is tested in tests/consumable-service.test.ts.
const pagePath = "src/app/[locale]/(dashboard)/consumables/[id]/page.tsx"
const headerPath = "src/components/consumables/consumable-history-header.tsx"
const read = (path: string) => (existsSync(path) ? readFileSync(path, "utf8").replace(/\r\n/g, "\n") : "")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as Record<string, Record<string, string>>

const rules = await import(pathToFileURL("src/lib/consumable-rules.ts").href) as typeof import("../src/lib/consumable-rules.ts")

// ---------------------------------------------------------------- helpers

test("the signed quantity: +n for a receipt, −n (U+2212) for an issue or a lower count, grouped", () => {
  assert.equal(rules.formatConsumableQuantityChange(3), "+3")
  assert.equal(rules.formatConsumableQuantityChange(-2), "−2")
  assert.equal(rules.formatConsumableQuantityChange(1234), "+1,234")
  assert.equal(rules.formatConsumableQuantityChange(-1234), "−1,234")
})

test("?page= reads a whole page number from 1; anything else is page 1", () => {
  assert.equal(rules.parseConsumableHistoryPage(undefined), 1)
  assert.equal(rules.parseConsumableHistoryPage("3"), 3)
  assert.equal(rules.parseConsumableHistoryPage(["2", "5"]), 2)
  for (const bad of ["0", "-1", "abc", "1.5", "", "99999999999"]) assert.equal(rules.parseConsumableHistoryPage(bad), 1, bad)
})

// ---------------------------------------------------------------- page

test("page: gated by consumable:view, the two flags, the history read with prisma and the page, notFound when missing", () => {
  const page = read(pagePath)
  assert.ok(page, "the page exists")
  assert.doesNotMatch(page, /^"use client"/m)
  assert.match(page, /params: Promise<\{ locale: string; id: string \}>/)
  assert.match(page, /searchParams: Promise<Record<string, string \| string\[\] \| undefined>>/)
  assert.match(page, /const user = await requirePagePermission\(locale, "consumable", "view"\)/)
  assert.match(page, /hasPermission\(user, "consumable", "create"\)/)
  assert.match(page, /hasPermission\(user, "consumable", "edit"\)/)
  assert.match(page, /getConsumableHistory\(prisma, id, parseConsumableHistoryPage\(\(await searchParams\)\.page\)\)/)
  assert.match(page, /if \(!history\) notFound\(\)/)
})

test("page: paging by 50 through Pagination links that keep ?page=", () => {
  const page = read(pagePath)
  assert.match(page, /<Pagination[\s\S]*?previousHref=\{pageHref\(history\.page - 1\)\}[\s\S]*?nextHref=\{pageHref\(history\.page \+ 1\)\}/)
  assert.match(page, /const pageHref = \(target: number\) => target <= 1 \? basePath : `\$\{basePath\}\?page=\$\{target\}`/)
  assert.match(read("src/lib/consumable-service.ts"), /export const CONSUMABLE_MOVEMENTS_PAGE_SIZE = 50/)
  assert.match(read("src/lib/consumable-service.ts"), /take: CONSUMABLE_MOVEMENTS_PAGE_SIZE/)
})

test("page: the columns, newest first from the read, with the signed quantity and the after count", () => {
  const page = read(pagePath)
  for (const key of ["col_date", "col_type", "col_quantity", "col_after", "col_detail", "col_note", "col_by"]) {
    assert.match(page, new RegExp(`t\\("${key}"\\)`), key)
  }
  assert.match(page, /formatConsumableQuantityChange\(row\.quantityChange\)/)
  assert.match(page, /formatCount\(row\.onHandAfter\)/)
  assert.match(page, /t\(`type_\$\{row\.type\}`\)/)
  assert.match(page, /row\.actor/)
})

test("page: an issue row links its asset by tag and name; an adjust row shows its reason; a receipt its received date", () => {
  const page = read(pagePath)
  assert.match(page, /row\.type === "issue" && row\.asset \? \(\s*<Link href=\{`\/\$\{locale\}\/assets\/\$\{row\.asset\.id\}`\}/)
  assert.match(page, /\{row\.asset\.assetTag\}[\s\S]{0,120}\{row\.asset\.name\}/)
  assert.match(page, /row\.type === "adjust" \? \(?\s*row\.reason/)
  assert.match(page, /row\.type === "receive" && row\.receivedDate \?[\s\S]{0,80}t\("receivedOn", \{ date: formatAssetDetailDate\(row\.receivedDate, locale\) \}\)/)
})

test("page: no movements reads ยังไม่มีการเคลื่อนไหว; phones get cards", () => {
  const page = read(pagePath)
  assert.match(page, /history\.rows\.length === 0 \?[\s\S]{0,200}t\("noMovements"\)/)
  assert.match(page, /className="hidden md:block"/)
  assert.match(page, /data-consumable-history-cards className="[^"]*md:hidden/)
})

// ---------------------------------------------------------------- header

test("header: breadcrumbs ของใช้สิ้นเปลือง › name, the meta with the state badge, and the back link to the list", () => {
  const header = read(headerPath)
  assert.ok(header, "the header exists")
  assert.match(header, /^"use client"/)
  assert.match(header, /breadcrumbs=\{\[\{ label: t\("title"\), href: listHref \}, \{ label: item\.name \}\]\}/)
  assert.match(header, /t\("detailMeta", \{ onHand: item\.onHand, unit: item\.unit, min: item\.minQuantity \}\)/)
  assert.match(header, /<PageBackLink href=\{listHref\} label=\{t\("backToList"\)\}/)
  assert.match(header, /ok: \{ key: "state_ok", tone: "success" \}/)
})

test("header: an inactive kind shows ปิดใช้งานแล้ว and renders no action and no dialog", () => {
  const header = read(headerPath)
  assert.match(header, /const showCreate = item\.isActive && canCreate/)
  assert.match(header, /const showEdit = item\.isActive && canEdit/)
  assert.match(header, /item\.isActive \? \(\s*<StatusBadge[^>]*stateBadges\[item\.stockState\][\s\S]*?\) : \(\s*<StatusBadge label=\{t\("inactiveBadge"\)\} tone="muted"/)
  // Every button and dialog is behind showCreate or showEdit.
  assert.doesNotMatch(header, /\{canCreate \?|\{canEdit \?/)
  assert.match(header, /\{showCreate \? \(\s*<ConsumableIssueDialog/)
  assert.match(header, /\{showCreate \? \(\s*<ConsumableReceiveDialog/)
  assert.match(header, /\{showEdit && active === "adjust" \? \(\s*<ConsumableAdjustDialog/)
  assert.match(header, /\{showEdit \? \(\s*<ConsumableKindDialog/)
})

test("header: เบิก, รับเข้า (create) and ปรับยอด, แก้ (edit) reuse Task 3's dialogs on this kind", () => {
  const header = read(headerPath)
  // The primary เบิก comes last (PageHeader: the primary action last).
  assert.match(header, /showCreate \? \(\s*<>[\s\S]*?onOpen\("receive"[\s\S]*?\{t\("receive"\)\}[\s\S]*?variant="default"[\s\S]*?onOpen\("issue"[\s\S]*?\{t\("issueShort"\)\}/)
  assert.match(header, /showEdit \? \(\s*<>[\s\S]*?onOpen\("edit"[\s\S]*?\{t\("editShort"\)\}[\s\S]*?onOpen\("adjust"[\s\S]*?\{t\("adjustShort"\)\}/)
  assert.ok(header.indexOf('onOpen("adjust"') < header.indexOf('onOpen("receive"'), "the edit group comes before the create group")
  assert.match(header, /<ConsumableIssueDialog[\s\S]*?items=\{dialogItems\}[\s\S]*?initialItemId=\{item\.id\}/)
  assert.match(header, /<ConsumableKindDialog[\s\S]*?item=\{item\}/)
  // Nothing on hand: เบิก stays, disabled, with ของหมด beside it, as on the list.
  assert.match(header, /disabled=\{out\}[\s\S]{0,80}aria-describedby=\{out \? reasonId : undefined\}/)
})

test("phone cards label the detail by type: เครื่อง, เหตุผล, วันที่รับเข้า (plan 2 final review)", () => {
  const page = read(pagePath)
  assert.match(page, /row\.type === "issue"\n\s*\? \{ key: "detail", label: t\("detail_asset"\), value: detail\(row\) \}/)
  assert.match(page, /row\.type === "adjust"\n\s*\? \{ key: "detail", label: t\("field_reason"\), value: detail\(row\) \}/)
  assert.match(page, /: \{ key: "detail", label: t\("field_receivedDate"\), value: row\.receivedDate \? formatAssetDetailDate\(row\.receivedDate, locale\) : null \}/)
  assert.match(page, /\n\s*detailItem\(row\),\n/)
  assert.doesNotMatch(page, /label: t\("col_detail"\)/)
  // The desktop column header names all three.
  assert.match(page, /<DataTableHead>\{t\("col_detail"\)\}<\/DataTableHead>/)
  const en = messages("en").consumablesPage
  assert.equal(en.col_detail, "Asset / reason / received")
  assert.equal(en.detail_asset, "Asset")
})

test("words: the history page's messages in both languages", () => {
  const th = messages("th").consumablesPage
  const en = messages("en").consumablesPage
  const expected: Record<string, string> = {
    detailMeta: "คงเหลือ {onHand, number} {unit} · ขั้นต่ำ {min, number}",
    inactiveBadge: "ปิดใช้งานแล้ว",
    noMovements: "ยังไม่มีการเคลื่อนไหว",
    col_date: "วันที่",
    col_type: "รายการ",
    col_quantity: "จำนวน",
    col_after: "คงเหลือหลัง",
    col_detail: "เครื่อง / เหตุผล / วันที่รับ",
    detail_asset: "เครื่อง",
    col_note: "หมายเหตุ",
    col_by: "โดย",
    type_receive: "รับเข้า",
    type_issue: "เบิก",
    type_adjust: "ปรับยอด",
    adjustShort: "ปรับยอด",
    editShort: "แก้",
  }
  for (const [key, value] of Object.entries(expected)) assert.equal(th[key], value, key)
  for (const key of [...Object.keys(expected), "backToList", "receivedOn", "historyCaption"]) assert.ok(en[key], `en ${key}`)
  assert.ok(th.backToList && th.receivedOn && th.historyCaption)
})

test("header: issuing the last unit disables เบิก; focus lost on <body> goes to รับเข้า (plan 2 final review)", () => {
  const header = read(headerPath)
  assert.match(header, /const receiveRef = useRef<HTMLButtonElement \| null>\(null\)/)
  assert.match(header, /if \(!out \|\| !\(opener instanceof HTMLButtonElement\) \|\| !opener\.disabled\) return/)
  assert.match(header, /if \(activeElement !== null && activeElement !== document\.body && activeElement !== opener\) return\n\s*receiveRef\.current\?\.focus\(\)\n\s*\}, \[out\]\)/)
  assert.match(header, /<Button ref=\{receiveRef\} variant="outline" size="md" onClick=\{\(event\) => onOpen\("receive", event\.currentTarget\)\}>/)
})
