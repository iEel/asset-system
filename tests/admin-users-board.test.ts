import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

// Page group 11 plan 1 task 2 (spec §4, §9; board US-Users): the desktop /admin/users list. Sources are read with \r
// stripped, so a regex here may hold \n.
const read = (path: string) => (existsSync(path) ? readFileSync(path, "utf8").replace(/\r\n/g, "\n") : "")
const PAGE = "src/app/[locale]/(dashboard)/admin/users/page.tsx"
const DATA = "src/lib/admin-users-page-data.ts"
const U = "src/components/admin/users/"

test("the list has the board's filters", () => {
  const page = read(PAGE)
  assert.match(page, /<UserStatusChips\b/)
  assert.match(page, /<UserRoleFilterChip\b/)
  assert.match(page, /<MasterDataSearch\b[\s\S]*?placeholder=\{t\("searchPlaceholder"\)\}/)
  assert.match(page, /hiddenInputs=\{\{\n\s+pageSize: listState\.pageSize,\n\s+sort: listState\.sort,\n\s+direction: listState\.direction,\n\s+\.\.\.\(filters\.status !== "all" \? \{ status: filters\.status \} : \{\}\),\n\s+\.\.\.\(filters\.roleId \? \{ role: filters\.roleId \} : \{\}\),\n\s+\}\}/)
})

test("status chips are links with counts and aria-current", () => {
  const chips = read(`${U}user-status-chips.tsx`)
  assert.doesNotMatch(chips, /^"use client"/m, "server-safe")
  assert.match(chips, /<Link\b/)
  assert.match(chips, /aria-current=\{/)
  assert.match(chips, /formatCount\(/)
  assert.match(chips, /counts\.defaultOnly === undefined/, "defaultOnly hides when its count is missing")
  assert.match(chips, /value === "review"/, "review shows only while it is chosen")
})

test("the role chip is a searchable filter that resets the page", () => {
  const chip = read(`${U}user-role-filter-chip.tsx`)
  assert.match(chip, /^"use client"/)
  assert.match(chip, /<FilterMenuChip\b[\s\S]*?\bsearchable\b/)
  assert.match(chip, /router\.push\([^)]*buildUserListQuery\(state, filters, \{ roleId: [^}]*, page: 1 \}\)/)
  assert.match(chip, /\{ value: "", label: labels\.all \}/, "ทุกบทบาท is the empty value")
})

test("the warning links to the review filter", () => {
  const warning = read(`${U}user-review-warning.tsx`)
  assert.match(warning, /if \(count === 0\) return null/)
  assert.match(warning, /status: "review"/)
  assert.match(warning, /<Notice\b[^>]*tone="warning"/)
  assert.match(read(PAGE), /<UserReviewWarning\b[^>]*count=\{reviewTotal\}/)
})

test("the table has the board's columns and no sticky column", () => {
  const page = read(PAGE)
  const heads = [...page.matchAll(/<DataTableHead\b[^>]*>\{(t|tCommon)\("(\w+)"\)\}<\/DataTableHead>/g)].map((match) => match[2])
  assert.deepEqual(heads, ["columnUser", "columnEmployee", "roles", "status", "lastLoginAt", "actions"])
  assert.doesNotMatch(page, /sticky="right"/)
  assert.match(page, /<DataTableHead sort=\{sortBy\("displayName"\)\}>\{t\("columnUser"\)\}/)
  assert.match(page, /<DataTableHead sort=\{sortBy\("lastLoginAt"\)\}>\{t\("lastLoginAt"\)\}/)
  assert.match(page, /<DataTableCell align="right">\s*<RowActions/)
  assert.match(page, /range: t\("listRange", \{/)
  assert.match(page, /className="hidden space-y-4 md:block"/, "desktop only: Task 4 adds the phone list")
})

test("rows show you, left employees and holdings", () => {
  const page = read(PAGE)
  assert.match(page, /\{row\.isSelf \? [\s\S]*?\{t\("you"\)\}/)
  assert.match(page, /\{row\.employee\.hasLeft \? \(\s*<div[^>]*>\s*<StatusBadge label=\{t\("employeeLeft"\)\} tone="warning" \/>/)
  assert.match(page, /const canViewAssets = hasPermission\(currentUser, "asset", "view"\)/)
  assert.match(page, /canViewAssets \? \(\s*<Link href=\{`\/\$\{locale\}\/assets\?custodianId=\$\{row\.employee\.id\}`\}[\s\S]*?\{heldText\}[\s\S]*?\) : \(\s*<span[^>]*>\{heldText\}<\/span>/)
  assert.match(page, /\{t\("noEmployeeLinked"\)\}/)
  assert.match(page, /<span className="text-warning">\{t\("neverLoggedIn"\)\}<\/span>/)
})

test("role chips cap at two with a +N disclosure", () => {
  const cell = read(`${U}user-roles-cell.tsx`)
  assert.match(cell, /splitRoleChips\(roles\)/)
  assert.match(cell, /<details data-no-row-click\b/)
  assert.match(cell, /<summary\b[^>]*aria-label=\{t\("moreRolesLabel", \{/)
})

test("kept: search by role names, every sort, page sizes, redirect past the end, create gate", () => {
  const page = read(PAGE)
  const data = read(DATA)
  for (const field of ["displayName", "displayNameTh", "name"]) {
    assert.match(data, new RegExp(`\\{ userRoles: \\{ some: \\{ role: \\{ ${field}: \\{ contains: searchText \\} \\} \\} \\} \\}`), field)
  }
  for (const field of ["username", "displayName", "email"]) {
    assert.match(data, new RegExp(`\\{ ${field}: \\{ contains: searchText \\} \\}`), field)
  }
  assert.match(data, /export const userSorts = \["createdAt", "username", "displayName", "email", "lastLoginAt"\] as const/)
  assert.match(page, /allowedSorts: userSorts,\n\s+defaultSort: "createdAt"/)
  assert.match(page, /pageSizes=\{LIST_PAGE_SIZES\.map\(/)
  assert.match(page, /const lastPage = lastListPage\(total, listState\.pageSize\)\n\s+if \(rows\.length === 0 && total > 0 && listState\.page > lastPage\) \{\n\s+redirect\(/)
  assert.match(page, /const canCreate = hasPermission\(currentUser, "user", "create"\)/)
  assert.match(page, /requirePagePermission\(locale, "user", "view"\)/)
  assert.match(page, /<ClickableTableRow\b[\s\S]*?href=\{editHref\}/)
  assert.match(page, /next=\{\{ label: tCommon\("edit"\), href: editHref, icon: <Pencil aria-hidden="true" \/> \}\}\n\s+groups=\{\[\]\}/)
})

test("page data: one holdings groupBy, counts per status in parallel, default role through getLdapConfig", () => {
  const data = read(DATA)
  assert.match(data, /getLdapConfig\(\{ ldap_default_role: /)
  assert.match(data, /prisma\.asset\.groupBy\(\{\n?\s*by: \["custodianId"\],/)
  assert.match(data, /userStatusWhere\(status, defaultRoleId\)/)
  assert.match(data, /resolveUserListFilters\(/)
})
