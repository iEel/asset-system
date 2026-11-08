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

// Task 4 (board US-Users-Phone; Review Focus 5): a phone at 390 with a long Thai name and five roles wraps, shows two
// chips and "+3", and does not scroll sideways.
test("user cards wrap and cap role chips", () => {
  const cards = read(`${U}user-list-cards.tsx`)
  assert.match(cards, /splitRoleChips\(/)
  assert.match(cards, /\bflex-wrap\b/)
  assert.match(cards, /\bmin-w-0\b/)
  assert.match(cards, /\bbreak-words\b/)
  assert.doesNotMatch(cards, /(?<![-\w])w-(\d|\[)/, "the cards have no fixed width")
  assert.match(cards, /<Link\b[^>]*\baria-label=\{/, "each card is one link with an aria-label")
  assert.match(cards, /t\("editUserLabel", \{ name: row\.displayName \}\)/)
  assert.match(cards, /row\.isSelf \?/)
  const page = read(PAGE)
  assert.match(page, /<div\b[^>]*className="[^"]*\bmd:hidden\b[^"]*"[^>]*>[\s\S]*?<UserListCards\b/, "the page renders the cards inside md:hidden")
  assert.match(page, /t\("foundCount", \{ shown: total, total: /)
  assert.match(read(`${U}user-review-warning.tsx`), /t\("reviewShort"\)/, "the phone warning is one line")
})

// Task 4: the user list E2E spec (e2e/admin/users-list.spec.ts) reads the app's own words, opens the page with the seed
// admin's saved session, writes only its three requests, and deletes nothing. These pins need no app.
test("the user list E2E spec reads the app's words and writes only its three requests", async () => {
  const { USERS_WORDS: W } = await import("../e2e/admin/users-words.ts")
  const th = JSON.parse(read("messages/th.json"))
  const page = th.adminUsersPage
  assert.equal(W.title, page.title)
  assert.equal(W.search, th.common.search)
  assert.equal(W.statusNavigation, page.status.label)
  assert.equal(W.statusAll, page.status.all)
  assert.equal(W.statusActive, page.status.active)
  assert.equal(W.statusInactive, page.status.inactive)
  assert.equal(W.statusNever, page.status.never)
  assert.equal(W.statusReview, page.status.review)
  assert.equal(W.roleFilter, page.roleFilter)
  assert.equal(W.roleFilterAll, page.roleFilterAll)
  assert.equal(W.roleFilterSearch, page.roleFilterSearch)
  assert.equal(W.employeeLeft, page.employeeLeft)
  assert.equal(W.reviewTitle, page.reviewTitle)
  assert.equal(W.reviewLink, page.reviewLink)
  assert.equal(W.editUserLabel, page.editUserLabel)

  const spec = read("e2e/admin/users-list.spec.ts")
  assert.ok(spec.includes(`import { expect, test } from "../support/fixtures.ts"`), "the suite's fixtures")
  assert.ok(!spec.includes(`from "@playwright/test"`))
  assert.ok(spec.includes("test.use({ storageState: fromRoot(ADMIN_STATE_FILE) })"), "the seed admin's saved session")
  assert.ok(spec.includes(`import { recordSettled } from "../audit/settle.ts"`) && !spec.includes("measure.recordPage("), "axe through recordSettled")
  const writes = [...spec.matchAll(/admin\.(post|put|patch)\(\s*([`"][^`"]+[`"])/g)].map((match) => `${match[1]} ${match[2]}`)
  assert.deepEqual(writes, ['post "/api/employees"', 'post "/api/admin/users"', "put `/api/employees/${employee.id}`"])
  assert.doesNotMatch(spec, /page\.request\.(?:post|put|patch|delete)|\.delete\(|method:\s*["'`]|signInOnce\(|ldap-(?:sync|test)|\/api\/admin\/settings/)
  assert.match(spec, /code: `\$\{runId\}-\$\{code\}-US`/, "the run's employee code pattern")
})
