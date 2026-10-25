import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { getUserRoleLabel } from "../src/lib/user-display.ts"
const read = (p: string) => readFileSync(p, "utf8").replace(/\r/g, "")

test("the role line reads the role's own name in the page language (spec §6.2)", () => {
  const roles = [{ displayName: "System Administrator", displayNameTh: "ผู้ดูแลระบบ" }, { displayName: "Auditor", displayNameTh: null }]
  assert.equal(getUserRoleLabel(roles, "th"), "ผู้ดูแลระบบ, Auditor")
  assert.equal(getUserRoleLabel(roles, "en"), "System Administrator, Auditor")
  assert.equal(getUserRoleLabel([], "th"), null)
})

test("menu rows are navy rows: 40px, 6px corners, the teal ring on a navy offset, the 3px bar on the open page (spec §6.2)", () => {
  const sidebar = read("src/components/layout/sidebar.tsx")
  assert.equal(sidebar.match(/const rowClasses =\n\s+"([^"]+)"/)?.[1], "relative flex min-h-11 w-full items-center gap-2.5 rounded-control px-2.5 text-sm text-sidebar-foreground transition-colors motion-reduce:transition-none hover:bg-sidebar-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar lg:min-h-10")
  assert.equal(sidebar.match(/const activeRowClasses =\n\s+"([^"]+)"/)?.[1], "bg-sidebar-active font-medium text-sidebar-active-foreground shadow-[inset_3px_0_0_var(--sidebar-active-bar)] hover:bg-sidebar-active forced-colors:outline forced-colors:outline-2 forced-colors:-outline-offset-2")
  assert.match(sidebar, /<div className="flex h-14 min-w-0 shrink-0 items-center gap-2\.5 border-b border-sidebar-border px-4">/)
  assert.match(sidebar, /"min-w-0 truncate text-sm font-semibold text-sidebar-foreground"/)
  assert.doesNotMatch(sidebar, /(?<![\w-])text-foreground\b|focus-visible:ring-ring\b|border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all/)
  assert.match(sidebar, /"relative hidden max-h-dvh flex-col bg-sidebar text-sidebar-foreground scheme-dark transition-all duration-300 motion-reduce:transition-none lg:flex"/)
  assert.match(sidebar, /open && "font-semibold text-sidebar-active-foreground"/) // the open group's title: white, bold
  assert.doesNotMatch(sidebar, /containsActive && "font-semibold"/)
  assert.match(sidebar, /"mt-0\.5 ml-5 space-y-0\.5 border-l border-sidebar-border pl-1"/) // the guide line
})

test("the work center shows a dot and a hidden sentence, never a number (spec §6.2, The One Count Rule)", () => {
  const sidebar = read("src/components/layout/sidebar.tsx")
  assert.match(sidebar, /const \{ summary \} = useShellNotifications\(\)/)
  assert.match(sidebar, /const waitingDecisions = countUnreadDecisions\(summary\?\.items \?\? \[\]\)/)
  assert.match(sidebar, /labelKey: "workCenter",[\s\S]*?attention: waitingDecisions > 0 \? t\("workCenterWaiting", \{ count: waitingDecisions \}\) : undefined/)
  assert.match(sidebar, /<span aria-hidden="true" className=\{cn\("ml-auto size-2 shrink-0 rounded-full bg-sidebar-dot"/)
  assert.match(sidebar, /<span className="sr-only">\{item\.attention\}<\/span>/)
  assert.doesNotMatch(sidebar, /formatCount|\.total\b|99\+/)
  for (const [locale, text] of [["th", "มีงานรอคุณ {count} รายการ"], ["en", "{count, plural, one {# item waits for you} other {# items wait for you}}"]]) {
    assert.equal(JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).nav.workCenterWaiting, text)
  }
})

test("the person sits pinned at the foot of the desktop menu and opens the account menu (spec §6.2)", () => {
  const sidebar = read("src/components/layout/sidebar.tsx")
  assert.match(sidebar, /<nav aria-label=\{t\("mainNavigation"\)\} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3">/)
  assert.match(sidebar, /\{mobile \? null : <SidebarAccount user=\{user\} account=\{account\} collapsed=\{bodyCollapsed\} \/>\}/)
  const account = read("src/components/layout/sidebar-account.tsx")
  assert.match(account, /export function SidebarAccount\(\{ user, account, collapsed \}: \{ user: SessionUser; account: ShellAccount; collapsed: boolean \}\)/)
  assert.match(account, /<DropdownMenuTrigger asChild>\s*<Button\s+variant="ghost"/)
  assert.doesNotMatch(account, /<button\b|text-white|bg-white|(?:aria-label|title)="[A-Z]/)
  assert.match(account, /<div className="flex shrink-0 justify-center border-t border-sidebar-border p-2">/)
  assert.match(account, /getUserInitial\(user\)[\s\S]*account\.roleLabel[\s\S]*<ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-sidebar-muted" \/>/)
  assert.match(account, /aria-label=\{collapsed \? tNav\("userMenu", \{ name: displayName \}\) : undefined\}/)
  assert.match(account, /focus-visible:ring-sidebar-ring focus-visible:ring-offset-sidebar/)
  assert.match(account, /getUserSecondaryLabel\(user\)/)
  assert.match(account, /<DropdownMenuItem variant="destructive" onSelect=\{\(\) => void signOut\(\{ callbackUrl: `\/\$\{locale\}\/login` \}\)\}>/)
})

test("a long Thai name and role stay on one line each, cut short, the full text still the button's name; the rail shows the initial only (Review Focus F5)", () => {
  const longRole = "ผู้ดูแลระบบทรัพย์สิน".repeat(4)
  assert.ok(longRole.length >= 60)
  assert.equal(getUserRoleLabel([{ displayName: "Asset Admin", displayNameTh: longRole }], "th"), longRole)
  const account = read("src/components/layout/sidebar-account.tsx")
  assert.match(account, /\{collapsed \? null : \(/)
  assert.match(account, /<span className="flex min-w-0 flex-1 flex-col">\s*<span className="truncate text-sm font-medium text-sidebar-active-foreground">\{displayName\}<\/span>/)
  assert.match(account, /\{account\.roleLabel \? <span className="truncate text-xs text-sidebar-muted">\{account\.roleLabel\}<\/span> : null\}/)
  assert.match(account, /"h-auto min-h-12 w-full min-w-0 /)
})

test("the dashboard layout reads the role and department once and hands them to the shell", () => {
  const layout = read("src/app/[locale]/(dashboard)/layout.tsx")
  assert.match(layout, /const account = await getShellAccount\(user, locale\)/)
  assert.match(layout, /<DashboardShell user=\{user\} account=\{account\}>/)
  const server = read("src/lib/shell-account.ts")
  assert.match(server, /displayNameTh: true/)
  assert.match(server, /isActive: true/)
  assert.match(server, /department: \{ select: \{ name: true \} \}/)
  assert.match(server, /getUserRoleLabel\(/)
  assert.match(server, /catch[\s\S]*?roleLabel: null, departmentLabel: null/)
  assert.match(read("src/components/layout/dashboard-shell.tsx"), /<Sidebar[\s\S]*?account=\{account\}/)
})
