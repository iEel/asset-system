import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { SIDEBAR_COOKIE, parseSidebarPreference, sidebarCookieString } from "../src/lib/sidebar-preference.ts"
const read = (p: string) => readFileSync(p, "utf8").replace(/\r/g, "")

test("the sidebar cookie holds collapsed or expanded for a year; anything else is expanded (spec §6.2)", () => {
  assert.equal(SIDEBAR_COOKIE, "sidebar")
  assert.equal(parseSidebarPreference("collapsed"), "collapsed")
  for (const value of [undefined, "", "expanded", "Collapsed", " collapsed", "collapsed;", "true"]) assert.equal(parseSidebarPreference(value), "expanded", String(value))
  assert.equal(sidebarCookieString("collapsed"), "sidebar=collapsed; Path=/; Max-Age=31536000; SameSite=Lax")
  assert.equal(sidebarCookieString("expanded"), "sidebar=expanded; Path=/; Max-Age=31536000; SameSite=Lax")
  assert.doesNotMatch(read("src/lib/sidebar-preference.ts"), /from "@\/|"use client"|\bdocument\.|\bwindow\./)
})

test("the server reads the cookie, so the first paint is right, and the shell writes it on each change", () => {
  const layout = read("src/app/[locale]/(dashboard)/layout.tsx")
  assert.match(layout, /^import \{ cookies \} from "next\/headers"$/m)
  assert.match(layout, /\nasync function readSidebarPreference\(\) \{\n  return parseSidebarPreference\(\(await cookies\(\)\)\.get\(SIDEBAR_COOKIE\)\?\.value\)\n\}\n/)
  assert.match(layout, /const \[account, initialSidebar\] = await Promise\.all\(\[getShellAccount\(user, locale\), readSidebarPreference\(\)\]\)/)
  assert.match(layout, /<DashboardShell user=\{user\} account=\{account\} initialSidebar=\{initialSidebar\}>/)
  const shell = read("src/components/layout/dashboard-shell.tsx")
  assert.match(shell, /const \[sidebarCollapsed, setSidebarCollapsed\] = useState\(initialSidebar === "collapsed"\)/)
  assert.match(shell, /document\.cookie = sidebarCookieString\(next \? "collapsed" : "expanded"\)/)
  assert.match(shell, /sidebarCollapsed=\{sidebarCollapsed\}/)
  assert.match(shell, /onExpand=\{expandSidebar\}/)
})

test("the toggle says what it does and whether the menu is open (spec §6.2)", () => {
  const topbar = read("src/components/layout/topbar.tsx")
  assert.match(topbar, /const sidebarToggleLabel = tNav\(sidebarCollapsed \? "expandSidebar" : "collapseSidebar"\)/)
  assert.match(topbar, /aria-expanded=\{!sidebarCollapsed\}\s+aria-controls="desktop-primary-navigation"\s+title=\{sidebarToggleLabel\}\s+aria-label=\{sidebarToggleLabel\}/)
  assert.match(topbar, /\{sidebarCollapsed \? <PanelLeftOpen aria-hidden="true" className="size-5" \/> : <PanelLeftClose aria-hidden="true" className="size-5" \/>\}/)
  assert.doesNotMatch(topbar, /toggleSidebar/)
  for (const [locale, collapse, expand] of [["th", "ย่อเมนู", "ขยายเมนู"], ["en", "Collapse menu", "Expand menu"]]) {
    const nav = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).nav
    assert.equal(nav.collapseSidebar, collapse); assert.equal(nav.expandSidebar, expand); assert.equal(nav.toggleSidebar, undefined)
  }
})

test("rail icons name themselves on hover and focus; a group icon expands the menu and opens its group (spec §6.2)", () => {
  const sidebar = read("src/components/layout/sidebar.tsx")
  assert.match(sidebar, /id="desktop-primary-navigation"/)
  assert.match(sidebar, /<TooltipProvider delayDuration=\{300\}>\s*\{renderBody\(false\)\}\s*<\/TooltipProvider>/)
  assert.equal(sidebar.match(/<LabelTooltip label=\{t\(item\.labelKey\)\} enabled=\{collapsed\}>/g)?.length, 2, "the link and the group row")
  assert.match(sidebar, /if \(collapsed\) \{\s*setOpen\(true\)\s*onExpand\(\)\s*\} else setOpen\(!open\)/)
  assert.match(sidebar, /aria-expanded=\{expanded\}/)
  assert.match(sidebar, /const expanded = open && !collapsed/)
  assert.match(sidebar, /\{expanded && \(\s*<div className="mt-0\.5 ml-5 space-y-0\.5 border-l border-sidebar-border pl-1">/)
  assert.match(sidebar, /collapsed && containsActive && activeRowClasses/) // the open page stays marked in the rail
  assert.doesNotMatch(sidebar, /lg:ml-0 lg:border-l-0 lg:pl-0/)
  assert.match(read("src/components/layout/sidebar-account.tsx"), /<LabelTooltip label=\{displayName\} enabled=\{collapsed\}>\s*<DropdownMenuTrigger asChild>/)
  const tooltip = read("src/components/ui/tooltip.tsx")
  assert.match(tooltip, /import \{ Tooltip as TooltipPrimitive \} from "radix-ui"/)
  assert.match(tooltip, /<TooltipPrimitive\.Portal>/)
  assert.match(tooltip, /"z-50 [^"]*rounded-md border border-border bg-popover px-2\.5 py-1\.5 text-meta text-popover-foreground shadow-overlay [^"]*motion-reduce:animate-none!"/)
  assert.match(tooltip, /<Tooltip open=\{enabled && open\} onOpenChange=\{setOpen\}>/)
})
