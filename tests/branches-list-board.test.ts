import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 8 plan 1 Task 3: the branches list on board MD-Branches (spec §3, §5) and what spec §8 keeps; the branch form's
// ?companyId= preset. Sources are read with \r stripped, so a regex here may hold \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const page = read("src/app/[locale]/(dashboard)/master-data/branches/page.tsx")
const newPage = read("src/app/[locale]/(dashboard)/master-data/branches/new/page.tsx")
const form = read("src/components/master-data/branch-form.tsx")
const locationNewPage = read("src/app/[locale]/(dashboard)/master-data/locations/new/page.tsx")
const th = JSON.parse(read("messages/th.json")) as { branch: Record<string, unknown> }
const en = JSON.parse(read("messages/en.json")) as { branch: Record<string, unknown> }
const branchTh = th.branch as Record<string, string> & { list: Record<string, string>; deactivate: Record<string, unknown>; reactivate: Record<string, string> }

test("branches: the record-status segmented control with counts; the status column only under ทั้งหมด (spec §3)", () => {
  assert.match(page, /readRecordStatusCounts\(prisma\.branch, recordStatusCountWheres\(listState, buildBranchWhere\)\)/)
  assert.match(page, /<RecordStatusSegmented value=\{listState\.status\} counts=\{recordStatusCounts\} hrefFor=\{\(status\) => listHref\(\{ status, page: 1 \}\)\} \/>/)
  assert.match(page, /\{listState\.status !== "active" \? <input type="hidden" name="status" value=\{listState\.status\} \/> : null\}/, "a search keeps the status")
  assert.doesNotMatch(page, /<FilterSelect\s+label=\{tCommon\("status"\)\}/, "the status select is gone")
  assert.match(page, /const showRecordStatus = listState\.status === "all"/)
  assert.match(page, /\{showRecordStatus \? <DataTableHead>\{tCommon\("status"\)\}<\/DataTableHead> : null\}/)
})

test("branches: the company filter offers names only; the cards' per-company breakdown and a + b = n (spec §5)", () => {
  assert.match(page, /\.\.\.companies\.map\(\(company\) => \(\{ value: company\.id, label: company\.nameTh \}\)\)/)
  assert.doesNotMatch(page, /`\$\{company\.code\} - \$\{company\.nameTh\}`/)
  assert.match(page, /summary\.byCompany\.map\(\(item\) => t\("summaryCompanyCount", \{ name: item\.name, count: item\.count \}\)\)\.join\(" · "\)/)
  assert.match(page, /t\("summaryWithoutAssetsFoot", \{ withAssets: summary\.withAssets, withoutAssets: summary\.withoutAssets, total: summary\.total \}\)/)
  assert.equal(branchTh.summaryTotal, "สาขาทั้งหมด (ใช้งาน)")
  assert.equal(branchTh.summaryWithoutAssetsFoot, "{withAssets, number} + {withoutAssets, number} = {total, number} · ควรตรวจว่าเป็นสาขาใหม่หรือข้อมูลเก่า")
  assert.equal(branchTh.summaryWithLocations, undefined, "no caller left")
  assert.equal(branchTh.summaryWithoutAssetsHelp, undefined, "no caller left")
})

test("branches: name first with code · company under it; ที่ตั้ง, พนักงาน and ทรัพย์สิน link to the filtered lists (spec §5)", () => {
  assert.match(page, /<DataTableHead sort=\{sortBy\("name"\)\}>\{t\("name"\)\}<\/DataTableHead>/)
  assert.match(page, /<span className="tag">\{branch\.code\}<\/span>\n\s+\{" · "\}\n\s+\{branch\.company\.nameTh\}\n\s+\{deactivatedLine \? ` · \$\{deactivatedLine\}` : null\}/)
  assert.match(page, /<DataTableHead>\{t\("contactPerson"\)\}<\/DataTableHead>/)
  // ยังไม่มีที่ตั้ง + เพิ่มที่ตั้งในสาขานี้ on active rows; the add link needs location:create.
  assert.match(page, /<StatusBadge label=\{t\("withoutLocations"\)\} tone="warning" \/>/)
  assert.match(page, /\{addLocationHref \? \(\n\s+<Link href=\{addLocationHref\}/)
  assert.match(page, /const canCreateLocation = hasPermission\(user, "location", "create"\)/)
  assert.match(page, /appendMasterDataReturnTo\(`\/\$\{locale\}\/master-data\/locations\/new\?branchId=\$\{encodeURIComponent\(branch\.id\)\}`, branchReturnHref\)/)
  // The employee count opens the employee list by branch, only with employee:view.
  assert.match(page, /const canViewEmployees = hasPermission\(user, "employee", "view"\)/)
  assert.match(page, /canViewEmployees && branch\._count\.employees > 0 \? \(\n\s+<Link\n\s+href=\{drilldown\.employees\}/)
  assert.match(page, /href=\{drilldown\.assets\}/)
  assert.match(page, /href=\{drilldown\.locations\}/)
})

test("branches: the footer totals over the filtered set (board MD-Branches)", () => {
  assert.match(page, /const footerWheres = branchFooterTotalWheres\(where\)/)
  assert.match(page, /prisma\.location\.count\(\{ where: footerWheres\.locations \}\)/)
  assert.match(page, /prisma\.employee\.count\(\{ where: footerWheres\.employees \}\)/)
  assert.match(page, /prisma\.asset\.count\(\{ where: footerWheres\.assets \}\)/)
  assert.match(page, /t\("list\.footerTotals", \{ locations: footerTotals\.locations, employees: footerTotals\.employees, assets: footerTotals\.assets \}\)/)
  assert.equal(branchTh.list.footerTotals, "ที่ตั้ง {locations, number} · พนักงาน {employees, number} · ทรัพย์สิน {assets, number}")
  assert.match(String((en.branch as Record<string, Record<string, string>>).list.footerTotals), /\{locations, plural, one \{# location\} other \{# locations\}\}/)
})

test("branches: an inactive row reads ปิดใช้งานเมื่อ {date} from the system log, or – (G8P1-R2)", () => {
  assert.match(page, /readDeactivatedAt\(\n\s+prisma,\n\s+"branch",\n\s+branches\.filter\(\(branch\) => !branch\.isActive\)\.map\(\(branch\) => branch\.id\)\n\s+\)/)
  assert.match(page, /tCommon\("recordStatus\.deactivatedAt", \{ date: at \? formatDeactivatedAt\(at, locale\) : "–" \}\)/)
})

test("branches ⋯: แก้ไข, เพิ่มที่ตั้งในสาขานี้, ดูพนักงานในสาขานี้ ({n}), ปิดใช้งาน with branch:delete and the reason, เปิดใช้งาน with branch:edit (spec §3, §5)", () => {
  assert.match(page, /const canDeactivate = hasPermission\(user, "branch", "delete"\)/)
  assert.match(page, /const canEdit = hasPermission\(user, "branch", "edit"\)/)
  assert.match(page, /\{ key: "add-location", label: t\("list\.addLocation"\), href: addLocationHref, icon: <Plus aria-hidden="true" \/> \}/)
  assert.match(page, /\{ key: "employees", label: t\("list\.viewEmployees", \{ count: branch\._count\.employees \}\), href: drilldown\.employees, icon: <Users aria-hidden="true" \/> \}/)
  assert.match(page, /blocked: getBranchDeleteBlockReason\(branch\._count\)/)
  // The counts are the DELETE route's: every relation active, audit rounds with isActive true.
  assert.match(page, /auditRounds: \{ where: \{ isActive: true \} \},\n\s+\},\n\s+\},\n\s+\},\n\s+orderBy: buildBranchOrderBy/)
  assert.match(page, /deactivate:\n\s+canDeactivate && branch\.isActive\n\s+\? \{/)
  // Final review: PATCH { isActive: true } (no snapshot), unavailable with the reason while the company is inactive.
  assert.match(page, /canEdit && !branch\.isActive\n\s+\? \{\n\s+endpoint,\n\s+blocked: getReactivateBlockedByCompanyReason\("branch", branch\.company\),\n\s+labels: \{/)
  assert.match(page, /code: true,\n\s+nameTh: true,\n(?:\s+\/\/.*\n)?\s+isActive: true,\n\s+\},/, "the row's company reads isActive")
  assert.match(page, /\{reactivate \? <MasterDataReactivateButton reactivate=\{reactivate\} \/> : null\}/)
  assert.doesNotMatch(page, /record: \{/, "no snapshot of the record (final review)")
  assert.equal(branchTh.list.addLocation, "เพิ่มที่ตั้งในสาขานี้")
  assert.equal(branchTh.list.viewEmployees, "ดูพนักงานในสาขานี้ ({count, number})")
  assert.equal(branchTh.deactivate.action, "ปิดใช้งาน")
  assert.equal(branchTh.reactivate.action, "เปิดใช้งาน")
})

test("branches keep every sort, paging, returnTo and the clear link (spec §8); name A→Z is the default", () => {
  assert.match(page, /options=\{branchSorts\.map\(\(sort\) => \(\{ value: sort, label: sortLabel\(sort\) \}\)\)\}/, "every sort in the sort select")
  assert.match(page, /name="direction"/)
  for (const sort of ["name", "locations", "employees", "assets"]) {
    assert.match(page, new RegExp(`sort=\\{sortBy\\("${sort}"\\)\\}`), sort)
  }
  assert.match(page, /previousHref=\{listHref\(\{ page: listState\.page - 1 \}\)\}/)
  assert.match(page, /redirect\(listHref\(\{ page: lastPage \}\)\)/)
  assert.match(page, /clear=\{hasActiveFilters \? \{ href: basePath, label: t\("clearFilters"\) \} : undefined\}/)
  assert.match(page, /actionHref: basePath, actionLabel: t\("clearFilters"\)/)
  assert.match(page, /placeholder=\{t\("searchPlaceholder"\)\}/)
})

test("branch form: ?companyId= presets an active company the picker offers; the no-company gate stays (spec §4, §8)", () => {
  assert.match(newPage, /searchParams: Promise<\{ returnTo\?: string \| string\[\]; companyId\?: string \| string\[\] \}>/)
  assert.match(newPage, /const presetCompanyId = resolveBranchFormCompanyPreset\(rawSearchParams\.companyId, companies\.map\(\(company\) => company\.id\)\)/)
  assert.match(newPage, /<BranchForm companies=\{companies\} presetCompanyId=\{presetCompanyId\} backHref=\{returnToHref\} \/>/)
  assert.match(newPage, /where: \{ isActive: true \}/, "the picker offers active companies only")
  assert.match(form, /useState<BranchFormValues>\(branch \?\? \{ \.\.\.emptyBranch, companyId: presetCompanyId \?\? "" \}\)/)
  assert.match(form, /const needsCompany = companies\.length === 0/)
  // เพิ่มสาขาให้บริษัทนี้ comes from the companies list: its returnTo is honoured.
  assert.match(newPage, /normalizeMasterDataReturnTo\(locale, "branches", rawSearchParams\.returnTo, \["companies"\]\)/)
  assert.match(locationNewPage, /normalizeMasterDataReturnTo\(locale, "locations", rawSearchParams\.returnTo, \["branches"\]\)/)
})

// Group 8 plan 1 final review: what the page offers follows the user's permissions, and the form follows the URL.
test("branches: without branch:edit no แก้ไข and a plain row; counts link only with location:view / employee:view / asset:view; เพิ่มสาขา only with branch:create (final review)", () => {
  assert.match(page, /const canCreate = hasPermission\(user, "branch", "create"\)/)
  assert.match(page, /const canViewLocations = hasPermission\(user, "location", "view"\)/)
  assert.match(page, /const canViewAssets = hasPermission\(user, "asset", "view"\)/)
  assert.match(page, /\.\.\.\(canEdit \? \[\{ key: "edit", label: tCommon\("edit"\), href: editHref, icon: <Pencil aria-hidden="true" \/> \}\] : \[\]\),/)
  assert.match(page, /return canEdit \? \(\n\s+<ClickableTableRow key=\{branch\.id\} href=\{editHref\} label=\{`\$\{tCommon\("edit"\)\}: \$\{branch\.code\}`\}>\n\s+\{cells\}\n\s+<\/ClickableTableRow>\n\s+\) : \(\n\s+<DataTableRow key=\{branch\.id\}>\{cells\}<\/DataTableRow>\n\s+\)/)
  assert.match(page, /actions=\{\n\s+canCreate \? \(\n\s+<Link href=\{appendMasterDataReturnTo\(`\/\$\{locale\}\/master-data\/branches\/new`/)
  assert.match(page, /\{canViewLocations && branch\._count\.locations > 0 \? \(/)
  assert.match(page, /\) : branch\._count\.locations === 0 && branch\.isActive \? \(/)
  assert.match(page, /formatCount\(branch\._count\.locations\)\n\s+\)\}/)
  assert.match(page, /\{canViewEmployees && branch\._count\.employees > 0 \? \(/)
  assert.match(page, /\{canViewAssets && branch\._count\.assets > 0 \? \(/)
  assert.match(page, /formatCount\(branch\._count\.assets\)\n\s+\)\}/)
})

test("branches: the filter form is keyed on the list's query, so a header sort is what the next search sends (final review)", () => {
  assert.match(page, /<form key=\{branchReturnHref\} role="search" action=\{basePath\}/)
  assert.match(page, /const branchReturnHref = `\$\{basePath\}\?\$\{buildBranchQueryString\(listState, \{\}\)\}`/)
})
