import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

// Page group 11 plan 3 task 3 (spec §6, §9; board US-Roles): the /admin/roles list. Sources are read with \r stripped,
// so a regex here may hold \n.
const read = (path: string) => (existsSync(path) ? readFileSync(path, "utf8").replace(/\r\n/g, "\n") : "")
const PAGE = "src/app/[locale]/(dashboard)/admin/roles/page.tsx"
const DATA = "src/lib/admin-roles-page-data.ts"
const R = "src/components/admin/roles/"

test("tabs switch between roles and the matrix", () => {
  const page = read(PAGE)
  assert.match(page, /<TabNav\n\s+aria-label=\{t\("viewLabel"\)\}/)
  assert.match(page, /key: "roles", label: t\("tabRoles"\), count: formatCount\(counts\.all\)/)
  assert.match(page, /key: "matrix", label: t\("tabMatrix"\)/)
  assert.match(page, /current=\{filters\.view\}/)
  assert.match(page, /buildRoleListQuery\(filters, \{ view: "matrix", page: 1 \}\)/)
  // The matrix only renders on its own tab; the list, the chips and the warning only on the roles tab.
  assert.match(page, /\{filters\.view === "matrix" \? \(/)
  const data = read(DATA)
  assert.match(data, /filters\.view === "matrix"/, "the matrix rows are built only for the matrix tab")
  assert.doesNotMatch(page, /<StatStrip\b/, "the StatStrip's facts moved into the chips and the warning")
})

test("the warning links to the users of the first inactive role", () => {
  const warning = read(`${R}role-inactive-warning.tsx`)
  assert.doesNotMatch(warning, /^"use client"/m, "server-safe")
  assert.match(warning, /if \(roles\.length === 0\) return null/)
  assert.match(warning, /<Notice\b[^>]*tone="warning"/)
  assert.match(warning, /usersHref\(roles\[0\]\.id\)/)
  assert.match(warning, /names: roles\.map\(\(role\) => role\.label\)\.join\(", "\)/, "every such role is named")
  assert.match(warning, /users: roles\.reduce\(\(sum, role\) => sum \+ role\.userCount, 0\)/, "the users are summed")
  assert.match(warning, /t\("inactiveWarningLink"\)/)
  const page = read(PAGE)
  assert.match(page, /<RoleInactiveWarning roles=\{inactiveWithUsers\} usersHref=\{usersHref\}/)
  // buildUserListQuery with the user list's defaults, so the link opens exactly role=<id>.
  assert.match(page, /buildUserListQuery\(USER_LIST_DEFAULT_STATE, USER_LIST_DEFAULT_FILTERS, \{ roleId \}\)/)
  assert.match(read(DATA), /inactiveWithUsers: inactiveRolesWithUsers\(roles\)/)
})

test("chips are links with counts and aria-current", () => {
  const chips = read(`${R}role-list-chips.tsx`)
  assert.doesNotMatch(chips, /^"use client"/m, "server-safe")
  assert.match(chips, /<Link\b/)
  assert.match(chips, /aria-current=\{current \? "page" : undefined\}/)
  assert.match(chips, /count=\{formatCount\(counts\[value\]\)\}/)
  assert.match(chips, /ROLE_TYPE_FILTERS\.map\(/)
  assert.match(chips, /ROLE_CHECK_FILTERS\.map\(/)
  assert.match(chips, /\{t\("checkLabel"\)\}/, "the check group has its caption")
  // Clicking the chosen check chip clears it; a chip resets the page.
  assert.match(chips, /hrefFor\(\{ check: current \? null : value, page: 1 \}\)/)
  assert.match(chips, /hrefFor\(\{ type: value, page: 1 \}\)/)
  const page = read(PAGE)
  assert.match(page, /<RoleListChips\b/)
  // The search sits on the right, as in the user list toolbar; its button never wraps under the input.
  const wrappers = [...page.matchAll(/<div className="([^"]*)">\{searchForm\}<\/div>/g)]
  assert.equal(wrappers.length, 2, "the phone block and the desktop toolbar each place the search")
  const wrapper = wrappers.find((match) => match[1].includes("ml-auto"))
  assert.ok(wrapper, "the desktop toolbar wraps searchForm in one div")
  for (const name of ["ml-auto", "w-full", "max-w-md", "md:[&>form]:flex-nowrap", "[&>form]:mb-0"]) {
    assert.ok(wrapper[1].split(/\s+/).includes(name), name)
  }
  assert.match(page, /<MasterDataSearch\b[\s\S]*?placeholder=\{t\("searchPlaceholder"\)\}/)
})

test("user counts link to the user list only with user:view", () => {
  const page = read(PAGE)
  assert.match(page, /const canViewUsers = hasPermission\(user, "user", "view"\)/)
  assert.match(page, /role\.userCount === 0 \? \(\s*<span[^>]*>\{t\("noUsers"\)\}<\/span>\s*\) : canViewUsers \? \(\s*<Link href=\{usersHref\(role\.id\)\}/)
  assert.match(page, /const permissionCount = role\.permissionKeys\.length/)
  assert.match(page, /t\("permissionsOf", \{ count: permissionCount, total: permissionTotal \}\)/)
  assert.match(page, /isHighRiskRole\(role\.permissionKeys\) \? <StatusBadge label=\{t\("highRiskBadge"\)\} tone="warning" \/> : null/)
  assert.match(page, /t\("stillHasUsers", \{ count: role\.userCount \}\)/)
  assert.match(page, /t\("footnote"\)/)
  assert.match(read(DATA), /prisma\.permission\.count\(\)/)
})

test("kept: export and create gates, protected chip, ordering, matrix content", () => {
  const page = read(PAGE)
  const data = read(DATA)
  assert.match(page, /requirePagePermission\(locale, "role", "view"\)/)
  assert.match(page, /const canCreate = hasPermission\(user, "role", "create"\)/)
  assert.match(page, /const canExport = hasPermission\(user, "role", "export"\)/)
  assert.match(page, /<a href="\/api\/admin\/roles\/export" download className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.match(page, /\{t\("exportAudit"\)\}/)
  assert.match(page, /role\.name === "system_admin" \? <Chip>\{t\("protectedRole"\)\}<\/Chip> : null/)
  assert.match(data, /orderBy: \[\{ isSystem: "desc" \}, \{ name: "asc" \}\]/, "system roles first, then by key")
  // Paging: page sizes, the range, and a page past the end goes to the last page.
  assert.match(page, /pageSizes=\{LIST_PAGE_SIZES\.map\(/)
  assert.match(page, /range: t\("listRange", \{/)
  assert.match(page, /const lastPage = lastListPage\(total, filters\.pageSize\)\n\s+if \(items\.length === 0 && total > 0 && filters\.page > lastPage\) \{\n\s+redirect\(/)
  // Clickable rows and the RowActions labels.
  assert.match(page, /<ClickableTableRow key=\{role\.id\} href=\{editHref\} label=\{`\$\{tCommon\("edit"\)\}: \$\{role\.label\}`\}>/)
  assert.match(page, /menuLabel=\{tCommon\("moreActionsFor", \{ code: role\.name \}\)\}/)
  // The matrix: module × action, role chips in each cell, the same captions.
  assert.match(page, /title=\{t\("permissionMatrix"\)\} description=\{t\("permissionMatrixSubtitle"\)\}/)
  assert.match(page, /permissionModules\.map\(\(moduleName\) => \(/)
  assert.match(page, /permissionActions\.map\(\(action\) => \{/)
  assert.match(page, /<Chip key=\{role\.id\} title=\{role\.displayName\}>\n\s+\{role\.label\}/)
  // The search also matches the English display name (ruling).
  assert.match(data, /displayName: role\.displayName,/)
})

test("phone cards are stretched links", () => {
  const cards = read(`${R}role-list-cards.tsx`)
  assert.doesNotMatch(cards, /^"use client"/m, "server-safe")
  assert.doesNotMatch(cards, /aria-label=/, "no aria-label replaces the card's content")
  const link = cards.match(/<Link\b([\s\S]*?)>([\s\S]*?)<\/Link>/)
  assert.ok(link, "the card has a link")
  for (const name of ["before:absolute", "before:inset-0", "before:content-['']", "focus-visible:before:ring-2", "focus-visible:before:ring-ring"]) {
    assert.ok(link[1].includes(name), name)
  }
  assert.match(link[2], /\{role\.label\}/)
  assert.match(cards, /<li\b[^>]*className="[^"]*\brelative\b/)
  assert.match(cards, /<span className="tag">\{role\.name\}<\/span>/)
  assert.match(cards, /\{tCommon\("edit"\)\} ›/)
  assert.doesNotMatch(cards, /(?<![-\w])w-(\d|\[)/, "no fixed width")
  const page = read(PAGE)
  assert.match(page, /<div\b[^>]*className="[^"]*\bmd:hidden\b[^"]*"[^>]*>[\s\S]*?<RoleListCards\b/)
})
