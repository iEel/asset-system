import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { disposalRoundApprovedTabHref, disposalRoundSelectionScope } from "../src/lib/disposal-round-selection.ts"

// Group 6 plan 4 Task 4 (spec §11.2–11.4, §9.3): the three round pages, the request page's round and the print's.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const FORM = "src/components/disposal/disposal-round-form.tsx"
const NEW_PAGE = "src/app/[locale]/(dashboard)/disposal/rounds/new/page.tsx"
const ROUND_PAGE = "src/app/[locale]/(dashboard)/disposal/rounds/[id]/page.tsx"
const LIST_PAGE = "src/app/[locale]/(dashboard)/disposal/rounds/page.tsx"
const REQUEST_PAGE = "src/app/[locale]/(dashboard)/disposal/[id]/page.tsx"
const PRINT_PAGE = "src/app/[locale]/(print)/disposal/[id]/print/page.tsx"
type Messages = Record<string, unknown>
const messages = (locale: "th" | "en") => JSON.parse(read(`messages/${locale}.json`)) as Messages
const at = (root: Messages, path: string) => path.split(".").reduce<unknown>((node, key) => (node as Messages | undefined)?.[key], root)
const th = (path: string) => at(messages("th"), `disposalPage.${path}`)

test("the create form sits on OperationFormFrame with five method ChoiceCards", () => {
  const source = read(FORM)
  assert.match(source, /<OperationFormFrame\b/)
  assert.match(source, /<OperationSummaryCard\b/)
  assert.match(source, /const METHODS = \["sell", "donate", "destroy", "lost", "dispose"\] as const/)
  assert.match(source, /METHODS\.map\(\(method\) => \(\s*<ChoiceCard\b[\s\S]*?type="radio"/)
  assert.equal(th("types.dispose"), "ตัดจำหน่าย")
})

test("the lump price shows only for ขาย and reads ราคาขายเหมาทั้งรอบ (บาท)", () => {
  const source = read(FORM)
  assert.match(source, /\{values\.disposalType === "sell" \? \(/)
  assert.match(source, /t\("rounds\.form\.saleValue"\)/)
  assert.equal(th("rounds.form.saleValue"), "ราคาขายเหมาทั้งรอบ (บาท)")
  assert.equal(th("rounds.form.saleValueHint"), "ราคาเดียวสำหรับ {count} เครื่องในรอบนี้")
  // The lump price goes only with a sale.
  assert.match(source, /saleValue: values\.disposalType === "sell" \? values\.saleValue : null/)
})

test("the form previews, then commits, then clears the selection and opens the round", () => {
  const source = read(FORM)
  assert.match(source, /fetch\("\/api\/disposal-rounds"/)
  assert.match(source, /mode: "preview"/)
  assert.match(source, /mode: "commit"/)
  assert.match(source, /sessionStorage\.removeItem\(disposalRoundSelectionStorageKey\)/)
  assert.match(source, /toast\.success\(t\("rounds\.form\.saved", \{ roundNo: payload\.roundNo \}\)\)/)
  assert.match(source, /router\.push\(`\/\$\{locale\}\/disposal\/rounds\/\$\{payload\.id\}`\)/)
  assert.equal(th("rounds.form.saved"), "บันทึกรอบตัดจำหน่าย {roundNo} แล้ว")
  assert.equal(th("rounds.form.review"), "ตรวจสอบรอบ")
  assert.equal(th("rounds.form.save"), "บันทึกรอบตัดจำหน่าย {count} รายการ")
})

test("blocked machines are named with their reasons and saving waits until they are removed", () => {
  const source = read(FORM)
  assert.match(source, /data-disposal-round-blocked/)
  assert.match(source, /submitDisabled: /)
  assert.equal(th("rounds.form.blocked.DISPOSAL_SOD_CONFLICT"), "คุณอนุมัติรายการนี้")
  assert.equal(th("rounds.form.blocked.DISPOSAL_INVALID_STAGE"), "คำขอไม่อยู่ในสถานะอนุมัติแล้ว")
  assert.equal(th("rounds.form.blocked.DISPOSAL_ASSET_INELIGIBLE"), "ทรัพย์สินไม่อยู่ในสถานะรอตัดจำหน่าย")
  assert.equal(th("rounds.form.blocked.DISPOSAL_EVIDENCE_REQUIRED"), "ยังไม่มีหลักฐาน · ให้ผู้ดูแลระบบบันทึก")
})

test("the form's words: sections, method change line, the admin exception and the summary", () => {
  assert.equal(th("rounds.form.sectionMachines"), "เครื่องในรอบ")
  assert.equal(th("rounds.form.sectionDetail"), "ข้อมูลการตัดจำหน่าย")
  assert.equal(th("rounds.form.askedAs"), "ขอเป็น: {method}")
  assert.equal(th("rounds.form.addMore"), "เพิ่มจากรายการอนุมัติแล้ว")
  assert.equal(th("rounds.form.methodChange"), "จะเปลี่ยนวิธีของ {count} คำขอเป็น {method}")
  assert.equal(th("rounds.form.exception"), "บันทึกย้อนหลังโดยไม่มีหลักฐาน (เฉพาะผู้ดูแลระบบ)")
  assert.equal(th("rounds.form.summaryTitle"), "หลังบันทึกรอบ")
  assert.equal(th("rounds.form.final"), "บันทึกแล้วแก้หรือยกเลิกไม่ได้")
  const source = read(FORM)
  assert.match(source, /canUseEvidenceException \? \(/)
  for (const locale of ["th", "en"] as const) {
    const round = at(messages(locale), "disposalPage.rounds")
    assert.ok(round && typeof round === "object", `${locale} disposalPage.rounds`)
  }
  assert.doesNotMatch(JSON.stringify(th("rounds")), /จริง|รอบจำหน่าย/)
})

test("the new page reads the selection's scope back to the approved tab with the same filters", () => {
  const scope = disposalRoundSelectionScope({ search: " LG ", disposalType: "sell", dateFrom: "2026-11-01", dateTo: "" })
  const href = disposalRoundApprovedTabHref("th", scope)
  const url = new URL(href, "http://x")
  assert.equal(url.pathname, "/th/disposal")
  assert.equal(url.searchParams.get("status"), "approved")
  assert.equal(url.searchParams.get("search"), "LG")
  assert.equal(url.searchParams.get("disposalType"), "sell")
  assert.equal(url.searchParams.get("dateFrom"), "2026-11-01")
  assert.equal(url.searchParams.has("dateTo"), false)
  assert.equal(disposalRoundApprovedTabHref("en", null), "/en/disposal?status=approved")
  assert.equal(disposalRoundApprovedTabHref("en", "not json"), "/en/disposal?status=approved")
  const source = read(FORM)
  assert.match(source, /disposalRoundApprovedTabHref\(locale, /)
  const page = read(NEW_PAGE)
  assert.match(page, /requirePagePermission\(locale, "disposal", "edit"\)/)
  assert.match(page, /<DisposalRoundForm\b/)
  assert.match(page, /t\("rounds\.createCrumb"\)/)
  assert.equal(th("rounds.createCrumb"), "สร้างรอบ")
  assert.equal(th("rounds.form.noSelection"), "ยังไม่ได้เลือกเครื่อง")
})

test("the round page has the header button ส่งออกรายงานส่งบัญชี linking the report", () => {
  const source = read(ROUND_PAGE)
  assert.match(source, /readDisposalRound\(prisma, id/)
  assert.match(source, /href=\{`\/api\/disposal-rounds\/\$\{round\.id\}\/report`\}/)
  assert.match(source, /t\("rounds\.exportReport"\)/)
  assert.equal(th("rounds.exportReport"), "ส่งออกรายงานส่งบัญชี")
  assert.match(source, /t\("rounds\.pageTitle", \{ title: round\.title \}\)/)
  assert.equal(th("rounds.pageTitle"), "รอบตัดจำหน่าย · {title}")
  assert.match(source, /t\("rounds\.infoTitle"\)/)
  assert.equal(th("rounds.infoTitle"), "ข้อมูลรอบ")
  assert.match(source, /t\("rounds\.machinesTitle", \{ count: /)
  assert.equal(th("rounds.noPhoto"), "ไม่มีรูป")
  assert.doesNotMatch(source, /StatStrip/)
})

test("the rounds list has its columns, search, paging and the empty state with the approved-tab link", () => {
  const source = read(LIST_PAGE)
  assert.match(source, /readDisposalRoundList\(prisma, \{/)
  assert.match(source, /parseListPage\(/)
  assert.match(source, /LIST_PAGE_SIZES/)
  assert.match(source, /<SearchField\b/)
  for (const key of ["colRound", "colMachines", "colMethod", "colRecipient", "colDate", "colSaleValue"]) {
    assert.match(source, new RegExp(`t\\("rounds\\.${key}"\\)`), key)
  }
  assert.match(source, /<ActionEmptyState\b[\s\S]*?title=\{t\("rounds\.emptyTitle"\)\}[\s\S]*?description=\{t\("rounds\.emptyHelp"\)\}[\s\S]*?actionHref=\{`\/\$\{locale\}\/disposal\?status=approved`\}/)
  assert.equal(th("rounds.emptyTitle"), "ยังไม่มีรอบตัดจำหน่าย")
  assert.equal(th("rounds.emptyHelp"), "สร้างรอบจากแท็บอนุมัติแล้ว")
  assert.deepEqual(
    ["colRound", "colMachines", "colMethod", "colRecipient", "colDate", "colSaleValue"].map((key) => th(`rounds.${key}`)),
    ["เลขที่รอบ", "ทรัพย์สินในรอบ", "วิธี", "ผู้ซื้อ/ผู้รับ", "วันที่จำหน่าย", "ราคาเหมา"],
  )
})

test("a request in a round shows the round on the request page and on the print", () => {
  assert.equal(th("rounds.saleLine"), "ราคาขายเหมาของรอบ {value} บาท · {count} เครื่อง")
  for (const path of [REQUEST_PAGE, PRINT_PAGE]) {
    const source = read(path)
    assert.match(source, /round: \{ select: disposalRequestRoundSelect \}/, path)
    assert.match(source, /t\("rounds\.saleLine", \{/, path)
  }
  assert.match(read(REQUEST_PAGE), /data-disposal-execution-round/)
})

test("the approved tab link keeps the audit round the selection was made under", () => {
  const scope = disposalRoundSelectionScope({ search: "", disposalType: "", dateFrom: "", dateTo: "", auditRound: "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b" })
  const url = new URL(disposalRoundApprovedTabHref("th", scope), "http://x")
  assert.equal(url.searchParams.get("status"), "approved")
  assert.equal(url.searchParams.get("auditRound"), "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b")
  assert.equal(new URL(disposalRoundApprovedTabHref("th", disposalRoundSelectionScope({ search: "", disposalType: "", dateFrom: "", dateTo: "" })), "http://x").searchParams.has("auditRound"), false)
})
