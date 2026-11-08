import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("System Settings synchronizes its selected tab with the URL and protects unsaved edits", () => {
  const source = readFileSync("src/components/admin/system-settings-form.tsx", "utf8")

  assert.match(source, /useSearchParams/)
  assert.match(source, /parseSystemSettingsTab/)
  assert.match(source, /buildSystemSettingsTabHref/)
  assert.match(source, /window\.history\.replaceState/)
  assert.match(source, /addEventListener\("beforeunload"/)
  assert.match(source, /removeEventListener\("beforeunload"/)
})

// Phase 2C batch 5 (O7, 2B spec R-g) made the tab row TabNav; group 12 plan 5 Task 3 (board AD-Settings) moved the same
// eleven links into the grouped left menu (SettingsMenu), named by the nav with the current one marked by aria-current.
// A plain click runs onSelect through Link onNavigate, which cancels the navigation and keeps the replaceState switch
// the test above pins, so unsaved edits stay; Ctrl+click opens the tab's own URL.
test("the settings menu links each tab, and a click switches tabs in place (O7, 2C batch 5; group 12 plan 5 Task 3)", () => {
  const source = readFileSync("src/components/admin/system-settings-form.tsx", "utf8").replace(/\r\n/g, "\n")
  const menu = readFileSync("src/components/admin/settings/settings-menu.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /^import \{ SettingsMenu \} from "@\/components\/admin\/settings\/settings-menu"$/m)
  assert.match(source, /^import \{ useTranslations \} from "next-intl"$/m)
  assert.match(source, /const tPage = useTranslations\("systemSettingsPage"\)/)
  assert.match(source, /const menuItems = getSettingsTabOrder\(\)\.map\(\(id\) => \(\{\n\s+tab: id,\n\s+label: tabLabels\[id\],\n\s+href: buildSystemSettingsTabHref\(pathname, searchParams\.toString\(\), id\),/)
  assert.match(source, /<SettingsMenu\n\s+aria-label=\{tPage\("title"\)\}\n\s+items=\{menuItems\}\n\s+activeTab=\{activeTab\}\n\s+groupUnsaved=\{dirty\.byGroup\}\n\s+onSelect=\{\(tab\) => selectTab\(tab\)\}/)
  assert.match(menu, /<Link\n\s+href=\{item\.href\}\n\s+scroll=\{false\}\n\s+aria-current=\{selected \? "page" : undefined\}\n\s+onNavigate=\{\(event\) => \{\n\s+event\.preventDefault\(\)\n\s+onSelect\(item\.tab\)/)
  assert.doesNotMatch(source, /aria-pressed=\{isActive\}|bg-primary text-white|tabs\.map\(\(tab\)|<TabNav\b/, "the hand-made tab buttons and the old row are gone")
})
