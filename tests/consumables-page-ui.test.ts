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

test("workspace: the low banner renders only when a kind is low or out", () => {
  const ws = read(workspacePath)
  assert.match(ws, /const lowRows = rows\.filter\(\(row\) => row\.state !== "ok"\)/)
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
