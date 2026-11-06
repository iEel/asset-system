import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 8 plan 1 Task 2: the companies list on board MD-Companies (spec §3, §4) and what spec §8 keeps. Sources are read
// with \r stripped, so a regex here may hold \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const page = read("src/app/[locale]/(dashboard)/master-data/companies/page.tsx")
const rowActions = read("src/components/master-data/master-data-row-actions.tsx")
const th = JSON.parse(read("messages/th.json")) as { company: Record<string, unknown>; common: { recordStatus: Record<string, string> } }

test("companies: the record-status segmented control with counts; the status column only under ทั้งหมด (spec §3)", () => {
  assert.match(page, /readRecordStatusCounts\(prisma\.company, recordStatusCountWheres\(listState, buildCompanyWhere\)\)/)
  assert.match(page, /<RecordStatusSegmented value=\{listState\.status\} counts=\{recordStatusCounts\} hrefFor=\{\(status\) => listHref\(\{ status, page: 1 \}\)\} \/>/)
  assert.match(page, /\{listState\.status !== "active" \? <input type="hidden" name="status" value=\{listState\.status\} \/> : null\}/, "a search keeps the status")
  assert.doesNotMatch(page, /<FilterSelect\s+label=\{tCommon\("status"\)\}/, "the status select is gone")
  assert.match(page, /const showRecordStatus = listState\.status === "all"/)
  assert.match(page, /\{showRecordStatus \? <DataTableHead>\{tCommon\("status"\)\}<\/DataTableHead> : null\}/)
  assert.match(page, /tCommon\("recordStatus\.footerCounts", \{ active: recordStatusCounts\.active, inactive: recordStatusCounts\.inactive \}\)/, "the footer's ใช้งาน n · ไม่ใช้งาน n")
  assert.match(page, /<p>\{t\("list\.countsNote"\)\}<\/p>/)
})

test("companies: name first with the code and English name under it; the board's empty-value words (spec §4)", () => {
  assert.match(page, /<DataTableHead sort=\{sortBy\("nameTh"\)\}>\{t\("list\.name"\)\}<\/DataTableHead>/)
  assert.match(page, /\{deactivatedLine \?\? company\.nameEn \?\? t\("list\.noNameEn"\)\}/)
  assert.match(page, /\{company\.assetTagCode \? null : <span className="block text-xs">\{t\("list\.assetTagCodeFallback"\)\}<\/span>\}/)
  assert.match(page, /t\("list\.taxIdMissing"\)/)
  assert.match(page, /<StatusBadge label=\{t\("withoutBranches"\)\} tone="warning" \/>/, "ยังไม่มีสาขา in the branch column")
  assert.equal(th.company.list && (th.company.list as Record<string, string>).noNameEn, "ยังไม่มีชื่อภาษาอังกฤษ")
  assert.equal((th.company.list as Record<string, string>).assetTagCodeFallback, "เว้นว่าง ใช้รหัสบริษัทแทน")
  assert.equal((th.company.list as Record<string, string>).taxIdMissing, "ยังไม่ระบุ")
})

test("companies: an inactive row reads ปิดใช้งานเมื่อ {date} from the system log, or – (G8P1-R2)", () => {
  assert.match(page, /readDeactivatedAt\(\n\s+prisma,\n\s+"company",\n\s+companies\.filter\(\(company\) => !company\.isActive\)\.map\(\(company\) => company\.id\)\n\s+\)/)
  assert.match(page, /tCommon\("recordStatus\.deactivatedAt", \{ date: at \? formatDeactivatedAt\(at, locale\) : "–" \}\)/)
  assert.equal(th.common.recordStatus.deactivatedAt, "ปิดใช้งานเมื่อ {date}")
})

test("companies ⋯: แก้ไข, เพิ่มสาขาให้บริษัทนี้, ปิดใช้งาน with company:delete and the reason, เปิดใช้งาน with company:edit (spec §3, §4)", () => {
  assert.match(page, /const canDeactivate = hasPermission\(user, "company", "delete"\)/)
  assert.match(page, /const canReactivate = hasPermission\(user, "company", "edit"\)/)
  assert.match(page, /const canCreateBranch = hasPermission\(user, "branch", "create"\)/)
  assert.match(page, /appendMasterDataReturnTo\(`\/\$\{locale\}\/master-data\/branches\/new\?companyId=\$\{encodeURIComponent\(company\.id\)\}`, companyReturnHref\)/)
  assert.match(page, /blocked: getCompanyDeleteBlockReason\(company\._count\)/)
  // The counts are the DELETE route's: every relation active, audit rounds with isActive true.
  assert.match(page, /auditRounds: \{ where: \{ isActive: true \} \},\n\s+\},\n\s+\},\n\s+\},\n\s+orderBy: buildCompanyOrderBy/)
  assert.match(page, /\{reactivate \? <MasterDataReactivateButton reactivate=\{reactivate\} \/> : null\}/, "เปิดใช้งาน beside the ไม่ใช้งาน badge")
  assert.match(page, /record: \{\n\s+code: company\.code,\n\s+assetTagCode: company\.assetTagCode,\n\s+nameTh: company\.nameTh,\n\s+nameEn: company\.nameEn,\n\s+taxId: company\.taxId,\n\s+address: company\.address,\n\s+\}/)

  assert.match(rowActions, /next=\{null\}/, "the row opens the edit page; no next button")
  assert.match(rowActions, /statusItems\.push\(\{ \.\.\.deactivateItem, hint: deactivate\?\.labels\.hint, onSelect: \(\) => setOpen\(true\) \}\)/)
  assert.match(rowActions, /await sendOrThrow\(deactivate\.endpoint, \{ method: "DELETE" \}, tCommon\("error"\)\)/)
  assert.match(rowActions, /body: JSON\.stringify\(\{ \.\.\.reactivate\.record, isActive: true \}\)/)
  assert.match(rowActions, /deactivateMenuItem\(\{/)
})

test("companies keep every sort, paging, returnTo and the clear link (spec §8); name A→Z is the default", () => {
  assert.match(page, /options=\{companySorts\.map\(\(sort\) => \(\{ value: sort, label: sortLabel\(sort\) \}\)\)\}/, "every sort in the sort select")
  assert.match(page, /name="direction"/)
  for (const sort of ["nameTh", "assetTagCode", "branches", "employees", "assets"]) {
    assert.match(page, new RegExp(`sort=\\{sortBy\\("${sort}"\\)\\}`), sort)
  }
  assert.match(page, /previousHref=\{listHref\(\{ page: listState\.page - 1 \}\)\}/)
  assert.match(page, /clear=\{hasActiveFilters \? \{ href: basePath, label: t\("clearFilters"\) \} : undefined\}/)
  assert.match(page, /actionHref: basePath, actionLabel: t\("clearFilters"\)/)
  assert.match(page, /scrollHint=\{tCommon\("tableScrollHint"\)\}/)
})
