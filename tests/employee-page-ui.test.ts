import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 7 plan 2 Task 3 (spec §5.2): the employee page rebuilt to its board (MD-Employee) on readEmployeePage.
// CRLF and LF checkouts alike: the pins below match "\n".
const page = readFileSync("src/app/[locale]/(dashboard)/master-data/employees/[id]/page.tsx", "utf8").replace(/\r\n/g, "\n")
const th = JSON.parse(readFileSync("messages/th.json", "utf8")) as { employee: { detail: Record<string, string> } }
const en = JSON.parse(readFileSync("messages/en.json", "utf8")) as { employee: { detail: Record<string, string> } }

test("the employee page reads the Task 2 read model, the user-account line only for user:view and the held page from ?heldPage=", () => {
  assert.match(page, /const user = await requirePagePermission\(locale, "employee", "view"\)/)
  assert.match(page, /const canViewUsers = hasPermission\(user, "user", "view"\)/)
  assert.match(page, /const canEditAssets = hasPermission\(user, "asset", "edit"\)/)
  assert.match(page, /readEmployeePage\(prisma as unknown as EmployeePageDb, id, \{ canViewUsers \}, \{ heldPage: parseEmployeeHeldPage\(rawSearchParams\.heldPage\) \}\)/)
  assert.doesNotMatch(page, /prisma\.(?:asset|assetCheckout|maintenanceTicket|auditItem|auditFinding|auditRound|disposalRequest|employee)\./, "every read goes through readEmployeePage")
})

test("the header: the employment status, แก้ไข, ส่งมอบทรัพย์สินให้คนนี้ only for an active employee and asset:edit, and room for plan 4's รับคืนหลายรายการ", () => {
  assert.match(page, /<StatusBadge label=\{t\(`status_\$\{employee\.employmentStatus\}`\)\} tone=\{employee\.employmentStatus === "active" \? "success" : "warning"\} \/>/)
  assert.match(page, /const canHandOver = canEditAssets && !isFormerEmployee\(employee\)/)
  assert.match(page, /appendReturnTo\(`\/\$\{locale\}\/asset-management\/checkout\?custodianId=\$\{employee\.id\}`, pageHref\)/)
  assert.match(page, /\{canHandOver \? \(/)
  assert.match(page, /tDetail\("handOverToPerson"\)/)
  assert.match(page, /รับคืนหลายรายการ/, "a marked place for plan 4's header button")
  assert.match(page, /<Link href=\{editHref\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
})

test("the warning panel: a former employee holding assets, with the total", () => {
  assert.match(page, /\{data\.warning \? \(\n\s+<Notice tone="warning" title=\{tDetail\("formerHoldingTitle", \{ count: formatCount\(data\.warning\.heldCount\) \}\)\}/)
  assert.equal(th.employee.detail.formerHoldingTitle, "พ้นสภาพแล้ว ยังถือครอง {count} รายการ")
})

test("held rows: the handover document or ข้อมูลเก่า with สร้างใบส่งมอบย้อนหลัง, the last audit, and รับคืน by checkoutId or assetId back to this page", () => {
  assert.match(page, /row\.handover\n\s+\? `\/\$\{locale\}\/asset-management\/checkin\?checkoutId=\$\{row\.handover\.id\}`\n\s+: `\/\$\{locale\}\/asset-management\/checkin\?assetId=\$\{row\.assetId\}`/)
  assert.match(page, /appendReturnTo\(checkinPath, pageHref\)/)
  assert.match(page, /tDetail\("legacy"\)/)
  assert.match(page, /tDetail\("createBackfill"\)/)
  assert.match(page, /auditRoundResultBadge\(row\.lastAudit\.status, row\.lastAudit\.result\)/)
  assert.match(page, /<AssetThumbnail photo=\{row\.photo\}/)
  // The page's own address, the held page kept, is the way back from the forms (normalizeAssetReturnTo accepts it).
  assert.match(page, /const pageHref = buildEmployeePageHref\(/)
})

test("a blocked held asset shows รับคืน disabled with the return form's own reason; no asset:edit shows no รับคืน", () => {
  assert.match(page, /if \(!canEdit\) return null/)
  assert.match(page, /if \(row\.returnBlock\) \{/)
  assert.match(page, /<span aria-disabled="true" className=\{buttonVariants\(\{ variant: "outline", size: "sm" \}\)\}>/)
  assert.match(page, /reason: \(key\) => tAll\(key\),/)
  assert.match(page, /labels\.reason\(row\.returnBlock\.reasonKey\)/)
})

test("held assets page at 25 with links that keep the person's page", () => {
  assert.match(page, /<Pagination\n\s+page=\{data\.held\.page\}/)
  assert.match(page, /previousHref=\{heldPageHref\(data\.held\.page - 1\)\}/)
  assert.match(page, /`\$\{buildEmployeePageHref\(locale, employee\.id, \{ returnTo: returnToHref, heldPage \}\)\}#held`/)
})

test("open handovers split regular, loans and overdue loans; only an overdue loan is the warning tone (G7P2-R4)", () => {
  assert.match(page, /tDetail\("openHandoversFoot", \{/)
  assert.match(page, /attention: data\.openHandovers\.overdueLoans > 0/)
  assert.equal(th.employee.detail.openHandoversFoot, "ใช้ประจำ {regular} · ยืม {loans} · ยืมเกินกำหนด {overdue}")
})

test("บัญชีผู้ใช้ในระบบ: hidden without user:view, else the username or ไม่มีบัญชีผู้ใช้", () => {
  assert.match(page, /\{canViewUsers \? \(/)
  assert.match(page, /data\.account \?/)
  assert.equal(th.employee.detail.accountTitle, "บัญชีผู้ใช้ในระบบ")
  assert.equal(th.employee.detail.noAccount, "ไม่มีบัญชีผู้ใช้")
})

test("phone cards for the held assets below md, the table from md", () => {
  assert.match(page, /<ContentPanelRows className="md:hidden">/)
  assert.match(page, /<DataTable framed=\{false\} className="hidden md:block" caption=\{tDetail\("heldTitle"\)\}/)
})

test("every employee.detail key exists in Thai and English", () => {
  assert.deepEqual(Object.keys(en.employee.detail).sort(), Object.keys(th.employee.detail).sort())
  for (const key of page.matchAll(/tDetail\("([A-Za-z]+)"/g)) assert.ok(th.employee.detail[key[1]], `employee.detail.${key[1]}`)
})

// Final review fix 1 (G7P2-R4): only overdue loans are a follow-up; the item names how many.
test("the follow-up panel's handover item is overdue loans only, with the count", () => {
  const thFollowUp = (JSON.parse(readFileSync("messages/th.json", "utf8")) as { employee: { followUp: Record<string, { title: string }> } }).employee.followUp
  const enFollowUp = (JSON.parse(readFileSync("messages/en.json", "utf8")) as { employee: { followUp: Record<string, { title: string }> } }).employee.followUp
  assert.equal(thFollowUp.overdue_loans.title, "ยืมเกินกำหนด {count} รายการ")
  assert.match(enFollowUp.overdue_loans.title, /\{count\}/)
  assert.equal(thFollowUp.open_checkout_returns, undefined)
  assert.equal(enFollowUp.open_checkout_returns, undefined)
  assert.match(page, /title=\{t\(`followUp\.\$\{item\}\.title`, \{ count: formatCount\(data\.openHandovers\.overdueLoans\) \}\)\}/)
})

// Final review fix 2: รับคืน, the page's main action, stays in view beside the aside (1440) and at 1024.
test("the held table pins the รับคืน column right and keeps its text columns narrow enough to read", () => {
  const table = page.slice(page.indexOf('caption={tDetail("heldTitle")}'), page.indexOf("</DataTable>", page.indexOf('caption={tDetail("heldTitle")}')))
  assert.match(table, /<DataTableHead align="right" sticky="right" hideLabel>\{tDetail\("colActions"\)\}<\/DataTableHead>/)
  assert.match(table, /<DataTableCell align="right" sticky="right">\n\s+<HeldReturnAction /)
  for (const width of ["min-w-48", "min-w-36", "min-w-40", "min-w-32"]) assert.match(table, new RegExp(`<DataTableCell className="${width}">`))
  assert.doesNotMatch(table, /min-w-(?:52|44)/)
})
