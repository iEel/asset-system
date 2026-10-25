import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"

const read = (p: string) => readFileSync(p, "utf8").replace(/\r/g, "")
const has = (src: string, ...res: RegExp[]) => res.forEach((re) => assert.match(src, re))
const sheet = () => read("src/components/layout/mobile-more-sheet.tsx")

test("เพิ่มเติม is one bottom sheet: the person, the full menu, language, theme, then sign-out (menu B §6.6)", () => {
  const s = sheet()
  has(s, /^export function MobileMoreSheet\(/m, /<SheetContent[\s\S]*?side="bottom"[\s\S]*?id="mobile-more-sheet"/,
    /className="max-h-\[85dvh\] gap-0 rounded-t-xl"/, /<SheetTitle className="sr-only">\{t\("mobileMore"\)\}<\/SheetTitle>/,
    /getUserInitial\(user\)/, /const detailLine = getAccountDetailLine\(\[account\.roleLabel, account\.departmentLabel\]\)/,
    /signOut\(\{ callbackUrl: `\/\$\{locale\}\/login` \}\)/, /<Button variant="danger" size="lg" className="w-full"/)
  const order = ["data-more-sheet-person", "data-more-sheet-nav", 't("moreLanguage")', 't("moreTheme")', 'tAuth("logout")'].map((m) => s.indexOf(m))
  assert.ok(order.every((i) => i > -1), String(order)); assert.deepEqual([...order].sort((a, b) => a - b), order)
})
test("a long Thai name and role stay one line each, cut by CSS only (Review Focus F5)", () => {
  const s = sheet()
  has(s, /data-more-sheet-person[\s\S]*?<div className="min-w-0 flex-1">\s*<p className="truncate text-base font-semibold text-foreground">\{getUserDisplayLabel\(user\)\}<\/p>/,
    /<p className="truncate text-sm text-muted-foreground">\{detailLine\}<\/p>/)
  assert.doesNotMatch(s, /\.(?:slice|substring)\(0,/)
})
test("the sheet closes by its X, the scrim and a swipe down, scrolls inside, closes at lg, adds no motion of its own", () => {
  const s = sheet()
  assert.doesNotMatch(s, /showCloseButton=\{false\}/)
  has(s, /data-more-sheet-grab[^>]*className="[^"]*\btouch-none\b/, /onPointerDown=/, /isSheetSwipeClose\(/, /overflow-y-auto overscroll-contain/,
    /useMediaQuery\("\(min-width: 64rem\)"\)/, /open=\{open && !isWide\}/)
  assert.doesNotMatch(s, /\banimate-|translate-|duration-|style=\{\{/)
})
test("focus starts on the first menu link and returns to the button that opened the sheet", () => {
  has(sheet(), /onOpenAutoFocus=\{\(event\) => \{\n\s+event\.preventDefault\(\)\n\s+navRef\.current\?\.querySelector<HTMLElement>\("a\[href\]"\)\?\.focus\(\)/,
    /onCloseAutoFocus=\{\(event\) => \{[\s\S]*?returnFocusRef\.current[\s\S]*?isConnected[\s\S]*?\[aria-controls="mobile-more-sheet"\][\s\S]*?event\.preventDefault\(\)[\s\S]*?\.focus\(\)/)
})
test("the sheet holds the permission-filtered menu with its groups; the work center shows a dot, never a number", () => {
  const s = sheet()
  has(s, /import \{ useNavigationMenu[^}]*\} from "@\/components\/layout\/sidebar"/, /useNavigationMenu\(user\)/,
    /role="group" aria-labelledby=\{headingId\}/, /`more-nav-section-\$\{section\.labelKey\}`/, /aria-expanded=\{open\}/, /aria-current=\{ariaCurrent\}/,
    /<span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-warning" \/>/, /<span className="sr-only">\{item\.attention\}<\/span>/)
  assert.doesNotMatch(s, /formatCount|StatusBadge|countUnreadDecisions|useShellNotifications/)
})
test("the theme switch shows the theme on screen without learning it and keeps focus on the switch (dark mode G6)", () => {
  has(sheet(), /import \{ switchTheme \} from "@\/components\/layout\/theme-toggle"/, /data-when-theme=\{shown\}/, /value=\{shown\}/,
    /switchTheme\(\)\n\s+faces\[value\]\.current\?\.querySelector<HTMLElement>\('\[aria-pressed="true"\]'\)\?\.focus\(\)/,
    /<span lang="th">ภาษาไทย<\/span>/, /<span lang="en">English<\/span>/, /router\.push\(switchLocalePath\(pathname, locale, next\)\)/)
  has(read("src/components/layout/theme-toggle.tsx"), /^export function switchTheme\(\) \{$/m)
})
test("the shell opens the sheet from the bottom bar and the focus-page hamburger; the bar stays under it", () => {
  const shell = read("src/components/layout/dashboard-shell.tsx")
  has(shell, /const mobileFieldNavigationVisible = isNavigationMode && !mobileKeyboardVisible\n/, /const moreTriggerRef = useRef<HTMLElement \| null>\(null\)/,
    /<MobileMoreSheet[\s\S]*?open=\{moreSheetOpen\}[\s\S]*?returnFocusRef=\{moreTriggerRef\}/, /onOpenMoreSheet=\{openMoreSheet\}/, /moreOpen=\{moreSheetOpen\}/)
  assert.doesNotMatch(shell, /mobileSidebarOpen|closeMobileSidebar|onMobileNavigate|mobileOpen=/)
  has(read("src/components/layout/mobile-field-navigation.tsx"), /moreOpen: boolean/, /aria-expanded=\{moreOpen\}/, /aria-controls="mobile-more-sheet"/,
    /aria-haspopup="dialog"/, /const moreActive = activeItem === "more" \|\| moreOpen/, /moreActive && "bg-primary-soft"/, /isActive && !destination\.emphasized && "bg-primary-soft"/)
})
test("the phone top bar: the page title and, with the bottom menu, the bell; language, theme and avatar desktop-only or gone", () => {
  const top = read("src/components/layout/topbar.tsx")
  has(top, /onClick=\{\(event\) => onOpenMoreSheet\(event\.currentTarget\)\}/, /aria-expanded=\{moreSheetOpen\}/, /aria-controls="mobile-more-sheet"/,
    /mobileNavigationMode && "hidden"/, /<div className=\{cn\("relative shrink-0", !mobileNavigationMode && "hidden lg:block"\)\}>\s*<NotificationBell user=\{user\} \/>/,
    /<div className="relative hidden shrink-0 lg:block">\n\s+<DropdownMenu>/, /<div className="hidden lg:block">\n\s+<ThemeToggle \/>/,
    /switchLocalePath\(pathname, locale, newLocale\)/, /const \{ activeLabel \} = useNavigationMenu\(user\)/,
    /<p className=\{cn\("min-w-0 truncate text-base font-semibold text-foreground lg:hidden", !mobileNavigationMode && "hidden"\)\}>\{activeLabel \?\? tNav\("brandName"\)\}<\/p>/)
  assert.doesNotMatch(top, /tNav\("userMenu"|getUserInitial|signOut|onMobileMenuToggle|<h[1-6]\b/)
})
test("the sidebar has no phone drawer; its menu is exported for the sheet and the title", () => {
  const side = read("src/components/layout/sidebar.tsx")
  has(side, /^export function useNavigationMenu\(user: SessionUser\)[\s\S]*?const \{ summary \} = useShellNotifications\(\)/m, /^export type MenuItem = /m,
    /^export type MenuSection = /m, /filterNavigationSectionsByPermission\(menuSections, user\)/,
    /getActiveNavigationLabelKey\(visibleSections\.flatMap\(\(section\) => section\.items\), activeHref\)/)
  assert.doesNotMatch(side, /<Sheet\b|mobile-primary-navigation-drawer|onMobileClose|mobileRestoreFocusRef|renderBody/)
})
test("the sheet's labels exist in Thai and English", () => {
  const th = JSON.parse(read("messages/th.json")).nav, en = JSON.parse(read("messages/en.json")).nav
  assert.deepEqual([th.moreLanguage, th.moreTheme, th.themeLight, th.themeDark], ["ภาษา", "ธีม", "สว่าง", "มืด"])
  assert.deepEqual([en.moreLanguage, en.moreTheme, en.themeLight, en.themeDark], ["Language", "Theme", "Light", "Dark"])
  assert.equal(th.closeMenu, undefined); assert.equal(en.closeMenu, undefined)
})
