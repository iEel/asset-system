import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import test from "node:test"
import { pathToFileURL } from "node:url"

// Group 8 plan 1 Task 4: the departments list on board MD-Departments (spec §3, §5) and what spec §8 keeps; the
// department guard on DELETE and the PUT that deactivates (G8P1-R3). Sources are read with \r stripped, so a regex here
// may hold \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const page = read("src/app/[locale]/(dashboard)/master-data/departments/page.tsx")
const route = read("src/app/api/departments/[id]/route.ts")
const th = JSON.parse(read("messages/th.json")) as { department: Record<string, unknown> }
const en = JSON.parse(read("messages/en.json")) as { department: Record<string, unknown> }
type DepartmentMessages = Record<string, string> & { list: Record<string, string>; deactivate: Record<string, string> & { clear: Record<string, string> }; reactivate: Record<string, string> }
const departmentTh = th.department as DepartmentMessages
const departmentEn = en.department as DepartmentMessages

test("departments: the record-status segmented control with counts; the status column only under ทั้งหมด (spec §3)", () => {
  assert.match(page, /readRecordStatusCounts\(prisma\.department, recordStatusCountWheres\(listState, buildDepartmentWhere\)\)/)
  assert.match(page, /<RecordStatusSegmented value=\{listState\.status\} counts=\{recordStatusCounts\} hrefFor=\{\(status\) => listHref\(\{ status, page: 1 \}\)\} \/>/)
  assert.match(page, /\{listState\.status !== "active" \? <input type="hidden" name="status" value=\{listState\.status\} \/> : null\}/, "a search keeps the status")
  assert.doesNotMatch(page, /<FilterSelect\s+label=\{tCommon\("status"\)\}/, "the status select is gone")
  assert.match(page, /const showRecordStatus = listState\.status === "all"/)
  assert.match(page, /\{showRecordStatus \? <DataTableHead>\{tCommon\("status"\)\}<\/DataTableHead> : null\}/)
})

test("departments: the cards แผนกทั้งหมด (per company + แผนกกลาง), มีพนักงาน (employee total), ยังไม่มีพนักงาน (board)", () => {
  assert.match(page, /const summary = buildDepartmentSummary\(summaryDepartments\)/)
  assert.match(page, /summary\.byCompany\.map\(\(item\) => t\("summaryCompanyCount", \{ name: item\.name, count: item\.count \}\)\)/)
  assert.match(page, /\.\.\.\(summary\.shared > 0 \? \[t\("summarySharedCount", \{ count: summary\.shared \}\)\] : \[\]\)/)
  assert.match(page, /t\("summaryWithEmployeesFoot", \{ employees: summary\.employeeTotal \}\)/)
  assert.match(page, /href: listHref\(\{ employeeUsage: "withEmployees", page: 1 \}\)/)
  assert.match(page, /href: listHref\(\{ employeeUsage: "withoutEmployees", page: 1 \}\),\n\s+current: listState\.employeeUsage === "withoutEmployees",\n\s+attention: summary\.withoutEmployees > 0,/)
  assert.equal(departmentTh.summaryTotal, "แผนกทั้งหมด (ใช้งาน)")
  assert.equal(departmentTh.summarySharedCount, "แผนกกลาง {count, number}")
  assert.equal(departmentTh.summaryWithEmployeesFoot, "รวมพนักงาน {employees, number} คน · กดเพื่อดูแผนกที่มีพนักงาน")
  assert.equal(departmentTh.summaryWithoutEmployeesFoot, "{withEmployees, number} + {withoutEmployees, number} = {total, number} · ควรตรวจว่ายังใช้อยู่หรือปิดใช้งานได้")
  assert.match(departmentEn.summaryWithEmployeesFoot, /\{employees, plural, one \{# employee\} other \{# employees\}\}/)
})

test("departments: filters บริษัท (names, แผนกกลาง), พนักงาน, ทรัพย์สิน; the chips and the summary line (board)", () => {
  assert.match(page, /\.\.\.companies\.map\(\(company\) => \(\{ value: company\.id, label: company\.nameTh \}\)\),\n\s+\{ value: departmentSharedCompanyValue, label: t\("sharedDepartment"\) \},/)
  assert.match(page, /name="employeeUsage"/)
  assert.match(page, /name="assetUsage"/)
  assert.match(page, /<FilterChipList\n\s+chips=\{filterChips\}/)
  assert.match(page, /clearAll=\{\{ href: basePath, label: t\("clearFilters"\) \}\}/)
  assert.match(page, /t\("list\.summaryLine", \{ departments: total, withAssets: departmentsWithAssets, assets: assetTotal, sort: sortLabel\(listState\.sort\) \}\)/)
  assert.match(page, /prisma\.department\.count\(\{ where: summaryLineWheres\.withAssets \}\)/)
  assert.match(page, /prisma\.asset\.count\(\{ where: summaryLineWheres\.assets \}\)/)
  assert.equal(departmentTh.list.summaryLine, "{departments, number} แผนก · ยังมีทรัพย์สินผูกอยู่ {withAssets, number} แผนก รวม {assets, number} รายการ · เรียงตาม{sort}")
  assert.match(departmentEn.list.summaryLine, /^\{departments, plural, one \{# department\} other \{# departments\}\}/)
})

test("departments: name first with the code under it; บริษัท by name or แผนกกลาง; the counts link to the filtered lists (spec §5)", () => {
  assert.match(page, /<DataTableHead sort=\{sortBy\("name"\)\}>\{t\("name"\)\}<\/DataTableHead>/)
  assert.match(page, /<span className="tag">\{department\.code\}<\/span>\n\s+\{deactivatedLine \? ` · \$\{deactivatedLine\}` : null\}/)
  assert.match(page, /\{department\.company \? department\.company\.nameTh : t\("sharedDepartment"\)\}/)
  assert.doesNotMatch(page, /\{department\.company\.code\}<\/span> - /, "no code - name")
  assert.match(page, /const canViewEmployees = hasPermission\(user, "employee", "view"\)/)
  assert.match(page, /canViewEmployees && department\._count\.employees > 0 \? \(\n\s+<Link\n\s+href=\{drilldown\.employees\}/)
  assert.match(page, /href=\{drilldown\.assets\}/)
  // "โอนย้ายก่อนปิดใช้งาน" on an active row that still holds assets.
  assert.match(page, /\{department\.isActive \? <span className="text-xs text-warning">\{t\("list\.moveBeforeDeactivate"\)\}<\/span> : null\}/)
  assert.equal(departmentTh.list.moveBeforeDeactivate, "โอนย้ายก่อนปิดใช้งาน")
})

test("departments: an inactive row reads ปิดใช้งานเมื่อ {date} from the system log, or – (G8P1-R2)", () => {
  assert.match(page, /readDeactivatedAt\(\n\s+prisma,\n\s+"department",\n\s+departments\.filter\(\(department\) => !department\.isActive\)\.map\(\(department\) => department\.id\)\n\s+\)/)
  assert.match(page, /tCommon\("recordStatus\.deactivatedAt", \{ date: at \? formatDeactivatedAt\(at, locale\) : "–" \}\)/)
})

test("departments ⋯: แก้ไข, ปิดใช้งาน with department:delete and the reason from the row's counts, เปิดใช้งาน with department:edit (spec §3, §5)", () => {
  assert.match(page, /const canDeactivate = hasPermission\(user, "department", "delete"\)/)
  assert.match(page, /const canEdit = hasPermission\(user, "department", "edit"\)/)
  // The route's counts: active employees and assets on the row, open scoped rounds in one grouped read.
  assert.match(page, /_count: \{\n\s+select: \{\n\s+employees: \{ where: \{ isActive: true \} \},\n\s+assets: \{ where: \{ isActive: true \} \},\n\s+\},\n\s+\},/)
  assert.match(page, /readDepartmentOpenAuditRoundCounts\(prisma, pageIds\)/)
  assert.match(page, /openAuditRounds: openAuditRounds\.get\(department\.id\) \?\? 0,/)
  assert.match(page, /blocked: getDepartmentDeleteBlockReason\(counts\)/)
  assert.match(page, /deactivate:\n\s+canDeactivate && department\.isActive\n\s+\? \{/)
  // Final review: PATCH { isActive: true } (no snapshot), unavailable with the reason while the company is inactive.
  assert.match(page, /canEdit && !department\.isActive\n\s+\? \{\n\s+endpoint,\n\s+blocked: getReactivateBlockedByCompanyReason\("department", department\.company\),\n\s+labels: \{/)
  assert.match(page, /company: \{ select: \{ id: true, nameTh: true, isActive: true \} \},/, "the row's company reads isActive")
  assert.match(page, /\{reactivate \? <MasterDataReactivateButton reactivate=\{reactivate\} \/> : null\}/)
  assert.doesNotMatch(page, /record: \{/, "no snapshot of the record (final review)")
  assert.match(page, /\(\["employees", "assets", "auditRounds"\] as const\)\.map\(\(key\) => t\(`deactivate\.clear\.\$\{key\}`\)\)/)
  assert.deepEqual(departmentTh.deactivate.clear, { employees: "ไม่มีพนักงาน", assets: "ไม่มีทรัพย์สินผูกอยู่", auditRounds: "ไม่อยู่ในขอบเขตรอบตรวจนับที่เปิดอยู่" })
  assert.equal(departmentTh.deactivate.action, "ปิดใช้งาน")
  assert.equal(departmentTh.deactivate.confirmTitle, "ปิดใช้งาน \"{name}\"?")
  assert.equal(departmentTh.reactivate.action, "เปิดใช้งาน")
})

test("departments keep every sort, paging, returnTo, the search fields and the clear link (spec §8); name A→Z is the default", () => {
  assert.match(page, /options=\{departmentSorts\.map\(\(sort\) => \(\{ value: sort, label: sortLabel\(sort\) \}\)\)\}/, "every sort in the sort select")
  assert.match(page, /name="direction"/)
  for (const sort of ["name", "company"]) {
    assert.match(page, new RegExp(`sort=\\{sortBy\\("${sort}"\\)\\}`), sort)
  }
  // Final review: no count sort on the employee and asset headers (Prisma _count counts inactive rows).
  assert.doesNotMatch(page, /sortBy\("(employees|assets)"\)/)
  assert.match(page, /<DataTableHead align="right">\{t\("employees"\)\}<\/DataTableHead>/)
  assert.match(page, /<DataTableHead align="right">\{t\("assets"\)\}<\/DataTableHead>/)
  assert.match(page, /const \{ skip, take \} = listPageWindow\(listState\)/)
  assert.match(page, /orderBy: buildDepartmentOrderBy\(listState\),\n\s+skip,\n\s+take,\n\s+\}\),\n\s+prisma\.department\.count\(\{ where \}\),/)
  assert.match(page, /previousHref=\{listHref\(\{ page: listState\.page - 1 \}\)\}/)
  assert.match(page, /redirect\(listHref\(\{ page: lastPage \}\)\)/)
  assert.match(page, /appendMasterDataReturnTo\(`\/\$\{locale\}\/master-data\/departments\/new`, departmentReturnHref\)/)
  assert.match(page, /appendMasterDataReturnTo\(`\/\$\{locale\}\/master-data\/departments\/\$\{department\.id\}\/edit`, departmentReturnHref\)/)
  assert.match(page, /clear=\{hasActiveFilters \? \{ href: basePath, label: t\("clearFilters"\) \} : undefined\}/)
  assert.match(page, /actionHref: basePath, actionLabel: t\("clearFilters"\)/)
  assert.match(page, /placeholder=\{t\("searchPlaceholder"\)\}/)
  assert.match(page, /\{t\("createTitle"\)\}/)
})

// Route modules import next/server and "@/…", which node --test cannot load, so a resolve hook serves stand-ins (as in
// tests/master-data-record-status.test.ts). The prisma stand-in calls globalThis.__departmentGuard[model][method].
const stubs = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    export async function requireAuth() { return { id: "actor-1", roles: ["system_admin"], permissions: [], employeeId: null } }
    export function hasRole() { return true }
    export function hasPermission() { return true }
    export function requirePermission() {}
  `],
  ["@/lib/audit-log", `export async function logAudit() {}`],
  ["@/lib/db", `
    const call = (model, method) => (...args) => {
      const handler = globalThis.__departmentGuard?.[model]?.[method]
      if (!handler) throw new Error("no stand-in for prisma." + model + "." + method)
      return handler(...args)
    }
    export const prisma = new Proxy({}, { get: (_, model) => new Proxy({}, { get: (_, method) => call(model, method) }) })
  `],
])
;(nodeModule as unknown as { registerHooks(hooks: { resolve(specifier: string, context: unknown, next: (specifier: string, context: unknown) => unknown): unknown }): void }).registerHooks({
  resolve(specifier, context, next) {
    const stub = stubs.get(specifier)
    if (stub !== undefined) return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(stub)}`, shortCircuit: true }
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return next(specifier, context)
  },
})

type DepartmentRoute = {
  PUT(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response>
  DELETE(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response>
}
const loadRoute = () => import(pathToFileURL("src/app/api/departments/[id]/route.ts").href) as Promise<DepartmentRoute>
const params = { params: Promise.resolve({ id: "dept-1" }) }
const request = (method: string, body?: unknown) =>
  new Request("http://asset.local/api/departments/dept-1", { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) })

function stubDepartment(counts: { employees: number; assets: number; auditRounds: number }, stored = true) {
  const lookups: Array<Record<string, unknown>> = []
  const updates: unknown[] = []
  ;(globalThis as unknown as { __departmentGuard: unknown }).__departmentGuard = {
    department: {
      findFirst: (args: Record<string, unknown>) => {
        lookups.push(args)
        return { id: "dept-1", code: "IT", name: "ไอที", companyId: null, isActive: stored, _count: counts }
      },
      update: (args: unknown) => {
        updates.push(args)
        return { id: "dept-1" }
      },
    },
  }
  return { lookups, updates }
}

test("G8P1-R3: DELETE refuses with 409 and the reason while employees, assets or open scoped rounds remain; else deactivates", async () => {
  const { getDepartmentDeleteBlockReason } = await import("../src/lib/organization-master-query.ts")
  const { departmentDeactivateCountSelect } = await import("../src/lib/department-list-query.ts")
  const { DELETE } = await loadRoute()
  for (const counts of [
    { employees: 3, assets: 0, auditRounds: 0 },
    { employees: 0, assets: 12, auditRounds: 0 },
    { employees: 0, assets: 0, auditRounds: 1 },
  ]) {
    const { lookups, updates } = stubDepartment(counts)
    const response = await DELETE(request("DELETE"), params)
    assert.equal(response.status, 409, JSON.stringify(counts))
    assert.deepEqual(await response.json(), { error: getDepartmentDeleteBlockReason({ employees: counts.employees, assets: counts.assets, openAuditRounds: counts.auditRounds }) })
    assert.equal(updates.length, 0, "nothing written")
    assert.deepEqual(lookups[0], { where: { id: "dept-1", isActive: true }, include: { _count: { select: departmentDeactivateCountSelect } } })
  }
  const clear = stubDepartment({ employees: 0, assets: 0, auditRounds: 0 })
  const response = await DELETE(request("DELETE"), params)
  assert.equal(response.status, 200)
  assert.deepEqual(clear.updates, [{ where: { id: "dept-1" }, data: { isActive: false, updatedBy: "actor-1" } }])
})

test("G8P1-R3: the PUT that unticks ใช้งาน is refused the same way; other saves and reactivation are not checked", async () => {
  const { getDepartmentDeleteBlockReason } = await import("../src/lib/organization-master-query.ts")
  const { PUT } = await loadRoute()
  const body = { code: "IT", name: "ไอที", companyId: "" }
  const blocked = stubDepartment({ employees: 2, assets: 5, auditRounds: 1 })
  const away = await PUT(request("PUT", { ...body, isActive: false }), params)
  assert.equal(away.status, 409)
  assert.deepEqual(await away.json(), { error: getDepartmentDeleteBlockReason({ employees: 2, assets: 5, openAuditRounds: 1 }) })
  assert.equal(blocked.updates.length, 0)

  const save = stubDepartment({ employees: 2, assets: 5, auditRounds: 1 })
  assert.equal((await PUT(request("PUT", { ...body, isActive: true }), params)).status, 200, "an ordinary save")
  assert.equal(save.lookups.length, 1, "no usage read")
  const back = stubDepartment({ employees: 2, assets: 5, auditRounds: 1 }, false)
  assert.equal((await PUT(request("PUT", { ...body, isActive: true }), params)).status, 200, "a reactivation")
  assert.equal(back.updates.length, 1)
  assert.match(route, /if \(isDeactivation\(existing\.isActive, input\.isActive\)\) \{\n\s+const usage = await prisma\.department\.findFirst\(\{\n\s+where: \{ id \},\n\s+select: \{ _count: \{ select: departmentDeactivateCountSelect \} \},/)
})

// Group 8 plan 1 final review: what the page offers follows the user's permissions, and the form follows the URL.
test("departments: without department:edit no แก้ไข and a plain row; counts link only with employee:view / asset:view; เพิ่มแผนก only with department:create (final review)", () => {
  assert.match(page, /const canCreate = hasPermission\(user, "department", "create"\)/)
  assert.match(page, /const canViewAssets = hasPermission\(user, "asset", "view"\)/)
  assert.match(page, /links: canEdit \? \[\{ key: "edit", label: tCommon\("edit"\), href: editHref, icon: <Pencil aria-hidden="true" \/> \}\] : \[\],/)
  assert.match(page, /return canEdit \? \(\n\s+<ClickableTableRow key=\{department\.id\} href=\{editHref\} label=\{`\$\{tCommon\("edit"\)\}: \$\{department\.code\}`\}>\n\s+\{cells\}\n\s+<\/ClickableTableRow>\n\s+\) : \(\n\s+<DataTableRow key=\{department\.id\}>\{cells\}<\/DataTableRow>\n\s+\)/)
  assert.match(page, /actions=\{\n\s+canCreate \? \(\n\s+<Link href=\{appendMasterDataReturnTo\(`\/\$\{locale\}\/master-data\/departments\/new`/)
  assert.match(page, /\{canViewEmployees && department\._count\.employees > 0 \? \(/)
  assert.match(page, /\{canViewAssets \? \(\n\s+<Link\n\s+href=\{drilldown\.assets\}/)
  assert.match(page, /\) : \(\n\s+formatCount\(department\._count\.assets\)\n\s+\)\}/)
})

test("departments: the filter form is keyed on the list's query, so a header sort, a card or a chip is what the next search sends (final review)", () => {
  assert.match(page, /<form key=\{departmentReturnHref\} role="search" action=\{basePath\}/)
  assert.match(page, /const departmentReturnHref = listHref\(\{\}\)/)
})

test("the employee list's filter form is keyed on the list's query too (its เรียงตาม / ลำดับ selects, final review)", () => {
  const employees = read("src/app/[locale]/(dashboard)/master-data/employees/page.tsx")
  assert.match(employees, /<form key=\{employeeReturnHref\} role="search" action=\{basePath\} className=\{className\}>/)
  assert.match(employees, /const employeeReturnHref = `\$\{basePath\}\?\$\{buildEmployeeQueryString\(listState, \{\}\)\}`/)
})
