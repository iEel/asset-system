import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

// ของใช้สิ้นเปลือง plan 2 task 2: the list page (server) and its client workspace. Source pins, CRLF-safe.
const pagePath = "src/app/[locale]/(dashboard)/consumables/page.tsx"
const workspacePath = "src/components/consumables/consumables-workspace.tsx"
const read = (path: string) => (existsSync(path) ? readFileSync(path, "utf8").replace(/\r\n/g, "\n") : "")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as Record<string, Record<string, string>>

// ---------------------------------------------------------------- page

test("page: gated by consumable:view, the two flags, and the list read with prisma", () => {
  const page = read(pagePath)
  assert.ok(page, "the page exists")
  assert.doesNotMatch(page, /^"use client"/m)
  assert.match(page, /requirePagePermission\(locale, "consumable", "view"\)/)
  assert.match(page, /const canCreate = hasPermission\(user, "consumable", "create"\)/)
  assert.match(page, /const canEdit = hasPermission\(user, "consumable", "edit"\)/)
  assert.match(page, /listConsumablesWithUsage\(prisma\)/)
  assert.match(page, /params: Promise<\{ locale: string \}>/)
  assert.match(page, /<ConsumablesWorkspace[\s\S]*canCreate=\{canCreate\}[\s\S]*canEdit=\{canEdit\}/)
})

// ---------------------------------------------------------------- workspace, actions

test("workspace: a client component on the main-system parts", () => {
  const ws = read(workspacePath)
  assert.ok(ws, "the workspace exists")
  assert.match(ws, /^"use client"/)
  for (const part of ["PageHeader", "ContentPanel", "DataTable", "StatusBadge", "Notice", "RowActions", "ActionEmptyState", "ActionBar"]) {
    assert.match(ws, new RegExp(`import \\{[^}]*\\b${part}\\b[^}]*\\} from "@/components/ui/`), part)
  }
  assert.match(ws, /useTranslations\("consumablesPage"\)/)
})

test("workspace: the low banner renders only when a kind is low (the bell's rule)", () => {
  const ws = read(workspacePath)
  // Consumables plan 4: the page hands the banner its kinds from the whole list, so ?state=low keeps it. Plan 4 final
  // review: the filter is isConsumableLow (tests/consumable-rules.test.ts), so a kind with no minimum is never named.
  assert.match(read(pagePath), /lowRows=\{filterConsumablesByListState\(rows, "low"\)\}/)
  assert.match(ws, /lowRows: ConsumableUsageRow\[\]/)
  assert.match(ws, /\{lowRows\.length > 0 \? \(\s*<Notice tone="warning"/)
  assert.match(ws, /t\("lowBanner", \{ count: lowRows\.length, list: /)
  assert.match(ws, /t\("lowItem", \{ name: row\.name, onHand: row\.onHand \}\)/)
  assert.match(ws, /\.join\(", "\)/)
})

test("workspace: states map to พอใช้ success, ต้องซื้อเพิ่ม warning, หมด danger", () => {
  const ws = read(workspacePath)
  assert.match(ws, /ok: \{ key: "state_ok", tone: "success" \}/)
  assert.match(ws, /low: \{ key: "state_low", tone: "warning" \}/)
  assert.match(ws, /out: \{ key: "state_out", tone: "danger" \}/)
})

test("workspace: เบิก is disabled with outReason when onHand === 0", () => {
  const ws = read(workspacePath)
  assert.match(ws, /const out = row\.onHand === 0/)
  assert.match(ws, /<Button[^>]*disabled[^>]*aria-describedby=\{reasonId\}/)
  assert.match(ws, /<span id=\{reasonId\}[^>]*>\{t\("outReason"\)\}<\/span>/)
  // The disabled เบิก keeps the enabled one's ghost look: no border, no fill (as dialog.tsx's close button).
  assert.match(ws, /<Button variant="ghost" size="sm" disabled aria-describedby=\{reasonId\} className="disabled:border-transparent disabled:bg-transparent">/)
})

test("workspace: buttons follow the flags", () => {
  const ws = read(workspacePath)
  // Header: รับเข้า outline and เบิกไปใช้ primary, both canCreate.
  assert.match(ws, /actions=\{\s*canCreate \? \(\s*<>\s*<Button variant="outline" size="md" onClick=\{\(event\) => \{ openerRef\.current = event\.currentTarget; onAction\("receive", null\) \}\}/)
  assert.match(ws, /onClick=\{\(event\) => \{ openerRef\.current = event\.currentTarget; onAction\("issue", null\) \}\}>\s*\{t\("issue"\)\}/)
  // Row: เบิก only with canCreate.
  assert.match(ws, /canCreate \? \(\s*out \?/)
  // ⋯ items and their flags.
  assert.match(ws, /canCreate \? \[\{ kind: "action", key: "receive", label: t\("menu_receive"\)/)
  assert.match(ws, /canEdit \? \[\{ kind: "action", key: "adjust", label: t\("menu_adjust"\)/)
  assert.match(ws, /\{ kind: "link", key: "history", label: t\("menu_history"\), href: detailHref\(row\.id\) \}/)
  assert.match(ws, /canEdit\s*\?\s*\[\s*\{ kind: "action", key: "edit", label: t\("menu_edit"\)[\s\S]*?\{ kind: "action", key: "deactivate", label: t\("menu_deactivate"\), destructive: true/)
  // + เพิ่มชนิดของ under the table and the empty-state action, both canEdit.
  assert.match(ws, /\{canEdit \? \(\s*<div[^>]*>\s*<Button[^\n]*onClick=\{\(event\) => \{ openerRef\.current = event\.currentTarget; onAction\("create", null\) \}\}>\s*\{t\("addKind"\)\}/)
  assert.match(ws, /action=\{canEdit \? \(/)
  // Phone ActionBar only with canCreate.
  assert.match(ws, /\{canCreate \? \(\s*<ActionBar/)
})

test("workspace: Task 3's mount point is one onAction(kind, item) handler", () => {
  const ws = read(workspacePath)
  assert.match(ws, /export type ConsumableAction = "issue" \| "receive" \| "adjust" \| "edit" \| "deactivate" \| "create"/)
  assert.match(ws, /function onAction\(kind: ConsumableAction, item: ConsumableUsageRow \| null\)/)
})

// ---------------------------------------------------------------- workspace, layout

test("workspace: the table is hidden md:block and the phone cards md:hidden", () => {
  const ws = read(workspacePath)
  assert.match(ws, /<DataTable[^>]*className="hidden md:block"/)
  assert.match(ws, /data-consumables-cards className="[^"]*\bmd:hidden\b/)
  // Columns in order.
  const head = ws.slice(ws.indexOf("<DataTableHeader>"), ws.indexOf("</DataTableHeader>"))
  const cols = [...head.matchAll(/t\("(col_\w+)"\)/g)].map((match) => match[1])
  assert.deepEqual(cols, ["col_name", "col_onHand", "col_min", "col_state", "col_used90"])
  assert.match(head, /<DataTableHead align="right">\{t\("col_onHand"\)\}/)
  assert.match(ws, /<DataTableCell numeric>\{formatCount\(row\.onHand\)\}/)
  // The phone primary moves to the ActionBar: the header's เบิกไปใช้ hides below md.
  assert.match(ws, /className="max-md:hidden" onClick=\{\(event\) => \{ openerRef\.current = event\.currentTarget; onAction\("issue", null\) \}\}/)
})

test("workspace: the kind name links to /consumables/${id}, the empty state names the cabinet", () => {
  const ws = read(workspacePath)
  assert.match(ws, /const detailHref = \(id: string\) => `\/\$\{locale\}\/consumables\/\$\{id\}`/)
  assert.ok((ws.match(/href=\{detailHref\(row\.id\)\}/g) ?? []).length >= 2, "table and card")
  assert.match(ws, /rows\.length === 0/)
  assert.match(ws, /title=\{t\("emptyTitle"\)\}/)
})

// ---------------------------------------------------------------- words

test("words: consumablesPage list keys in both catalogs", () => {
  const th = messages("th").consumablesPage
  const en = messages("en").consumablesPage
  const expected: Record<string, string> = {
    title: "ของใช้สิ้นเปลือง",
    cabinet: "ตู้สำรอง ห้อง IT",
    receive: "รับเข้า",
    issue: "เบิกไปใช้",
    issueShort: "เบิก",
    lowBanner: "ต้องซื้อเพิ่ม {count, number} ชนิด: {list}",
    lowItem: "{name} (เหลือ {onHand, number})",
    col_name: "ชนิด",
    col_onHand: "คงเหลือ",
    col_min: "ขั้นต่ำ",
    col_state: "สถานะ",
    col_used90: "ใช้ไป 90 วัน",
    state_ok: "พอใช้",
    state_low: "ต้องซื้อเพิ่ม",
    state_out: "หมด",
    outReason: "ของหมด",
    menu_receive: "รับเข้า",
    menu_adjust: "ปรับยอดตามที่นับได้",
    menu_history: "ดูประวัติ",
    menu_edit: "แก้ชื่อหรือขั้นต่ำ",
    menu_deactivate: "ปิดใช้งาน",
    addKind: "+ เพิ่มชนิดของ",
    emptyTitle: "ยังไม่มีชนิดของในตู้",
    emptyBody: "เพิ่มชนิดของ เช่น เมาส์ คีย์บอร์ด อะแดปเตอร์ แล้วรับเข้าเพื่อเริ่มนับ",
  }
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(th[key], value, `th ${key}`)
    assert.ok(en[key], `en ${key}`)
  }
  assert.match(en.lowBanner, /\{count, plural, one \{[^}]*\} other \{[^}]*\}\}/)
})

// ---------------------------------------------------------------- plan 2 final review: focus after removal, deactivate lock

test("focus after ปิดใช้งาน: the next row's name, else the previous one's, else + เพิ่มชนิดของ, else the h1 (as asset-component-manager.tsx)", () => {
  const ws = read(workspacePath)
  assert.match(ws, /import \{ componentFocusAfterRemoval \} from "@\/lib\/asset-component-links"/)
  assert.match(ws, /const focusAfterRemovalRef = useRef<\{ removedId: string; order: string\[\] \} \| null>\(null\)/)
  // Recorded after the PATCH succeeds, before the refresh.
  assert.match(ws, /focusAfterRemovalRef\.current = \{ removedId: item\.id, order: rows\.map\(\(row\) => row\.id\) \}\n\s*toast\.success\(t\("deactivateToast"/)
  assert.match(ws, /const targetId = componentFocusAfterRemoval\(order, pending\.removedId\)\n\s*const target = \(targetId \? visibleInRow\(root, targetId, ROW_NAME\) : null\) \?\? createButtonRef\.current \?\? pageHeading\(root\)/)
  assert.match(ws, /const ROW_NAME = "\[data-consumable-name\]"/)
  assert.match(ws, /const ROW_MENU = "\[data-consumable-actions\] \[aria-haspopup\]"/)
  // Both copies of a row (table and card) carry the row id and the name marker; both add-a-kind buttons hold the ref.
  assert.equal(ws.match(/data-consumable-row=\{row\.id\}/g)?.length, 2)
  assert.equal(ws.match(/<Link data-consumable-name href=\{detailHref\(row\.id\)\}/g)?.length, 2)
  assert.equal(ws.match(/<Button ref=\{createButtonRef\}/g)?.length, 2)
  assert.match(ws, /<div ref=\{rootRef\} className=/)
  assert.match(ws, /<div data-consumable-actions className=/)
  assert.match(ws, /if \(heading\) heading\.tabIndex = -1/)
  assert.match(ws, /target && target\.getClientRects\(\)\.length > 0/)
})

test("focus when the opener goes: เบิก of the last unit → that row's ⋯; the empty state's เพิ่มชนิดของ → the new kind's name, else + เพิ่มชนิดของ", () => {
  const ws = read(workspacePath)
  // Only when focus fell to <body> and the opener is gone or disabled.
  assert.match(ws, /if \(activeElement !== null && activeElement !== document\.body\) return false\n\s*return !opener\.isConnected \|\| \(opener instanceof HTMLButtonElement && opener\.disabled\)/)
  assert.match(ws, /if \(!openerLost\(openerRef\.current\)\) return/)
  assert.match(ws, /openerRowRef\.current = item\?\.id \?\? null/)
  assert.match(
    ws,
    /\(rowId && current\.has\(rowId\) \? visibleInRow\(root, rowId, ROW_MENU\) : null\) \?\?\n\s*\(goneNeighbourId \? visibleInRow\(root, goneNeighbourId, ROW_NAME\) : null\) \?\?\n\s*\(added\.length === 1 \? visibleInRow\(root, added\[0\], ROW_NAME\) : null\) \?\?\n\s*createButtonRef\.current \?\?\n\s*pageHeading\(root\)/,
  )
  // Plan 4 final review: under ?state=low, รับเข้า / ปรับยอด can lift the opener's kind out of the list; its neighbour's
  // name takes focus, as after ปิดใช้งาน.
  assert.match(
    ws,
    /const goneNeighbourId =\n\s*rowId && !current\.has\(rowId\) && previousIds\.includes\(rowId\)\n\s*\? componentFocusAfterRemoval\(previousIds\.filter\(\(id\) => id === rowId \|\| current\.has\(id\)\), rowId\)\n\s*: null/,
  )
  assert.match(ws, /\}, \[rows\]\)/)
})

test("ปิดใช้งาน lock: no second confirm or PATCH for a kind in flight, and its ⋯ is busy until the refresh drops the row", () => {
  const ws = read(workspacePath)
  assert.match(ws, /async function deactivate\(item: ConsumableUsageRow\) \{\n\s*if \(deactivatingRef\.current\.has\(item\.id\)\) return\n\s*const confirmed = await confirm\(/)
  assert.match(ws, /if \(!confirmed \|\| deactivatingRef\.current\.has\(item\.id\)\) return\n\s*setDeactivating\(item\.id, true\)\n\s*try \{/)
  // A refusal unlocks; a success stays locked until the row leaves.
  assert.match(ws, /\} catch \(error\) \{\n\s*setDeactivating\(item\.id, false\)\n\s*apiError\.toast\(error\)/)
  assert.match(ws, /for \(const id of \[\.\.\.deactivatingRef\.current\]\) if \(!current\.has\(id\)\) deactivatingRef\.current\.delete\(id\)/)
  assert.match(ws, /deactivating=\{deactivatingIds\.has\(row\.id\)\}/)
  assert.match(ws, /<RowActions code=\{row\.name\} menuLabel=\{menuLabel\} groups=\{groups\} openerRef=\{openerRef\} busy=\{deactivating\} \/>/)
  // RowActions hands busy to the ⋯ Button: aria-busy and aria-disabled, focus kept, clicks ignored (button.tsx).
  const rowActions = read("src/components/ui/row-actions.tsx")
  assert.match(rowActions, /busy\?: boolean/)
  assert.match(rowActions, /aria-label=\{menuLabel\} title=\{menuLabel\} busy=\{busy\}>/)
})

// ---------------------------------------------------------------- plan 4 task 2: ?state=low

test("page: ?state=low keeps the low and out kinds; the chip removes state only; no filter, the whole list", () => {
  const page = read(pagePath)
  assert.match(page, /searchParams: Promise<\{ view\?: string \| string\[\]; days\?: string \| string\[\]; item\?: string \| string\[\]; asset\?: string \| string\[\]; state\?: string \| string\[\] \}>/)
  assert.match(page, /state: oneParam\(raw\.state\)/)
  assert.match(page, /const listState = parseConsumableListState\(query\.state\)/)
  assert.match(page, /const rows = await listConsumablesWithUsage\(prisma\)/)
  assert.match(page, /rows=\{filterConsumablesByListState\(rows, listState\)\}/)
  assert.match(page, /\{ key: "state", label: t\("filterLow"\), href: consumablesHref\(locale, query, \{ state: undefined \}\) \}/)
  assert.match(page, /const listChips: FilterChipItem\[\] = listState === "low"/)
  assert.match(page, /chips=\{listChips\}/)
})

test("workspace: the chips under the tabs, and a filtered list with nothing left says so", () => {
  const ws = read(workspacePath)
  assert.match(ws, /chips\?: FilterChipItem\[\]/)
  assert.match(ws, /<FilterChipList chips=\{chips\} label=\{tAsset\("activeFilters"\)\} removeLabel=\{tAsset\("clearDrilldownFilter"\)\} \/>/)
  // Plan 4 final review: EmptyNote padded sits in <ContentPanel divided flush> (its contract).
  assert.match(ws, /rows\.length === 0 && chips\.length > 0 \? \(\s*<ContentPanel divided flush>\s*<EmptyNote padded>\{t\("filterLowEmpty"\)\}<\/EmptyNote>/)
})

test("words: the low filter chip and its empty line", () => {
  assert.equal(messages("th").consumablesPage.filterLow, "เฉพาะที่ต้องซื้อเพิ่ม")
  assert.equal(messages("th").consumablesPage.filterLowEmpty, "ไม่มีชนิดที่ต้องซื้อเพิ่ม")
  assert.equal(messages("en").consumablesPage.filterLow, "Only to restock")
  assert.equal(messages("en").consumablesPage.filterLowEmpty, "No kinds to restock")
})

// ---------------------------------------------------------------- plan 4 final review: the dialogs keep the whole list

test("page and workspace: เบิกไปใช้ / รับเข้า pick from every active kind, even under ?state=low", () => {
  const page = read(pagePath)
  const ws = read(workspacePath)
  assert.match(page, /allRows=\{rows\}/)
  assert.match(ws, /allRows: ConsumableUsageRow\[\]/)
  assert.equal(ws.match(/items=\{allRows\}/g)?.length, 2, "both the issue and the receive dialog")
  assert.doesNotMatch(ws, /items=\{rows\}/)
})
