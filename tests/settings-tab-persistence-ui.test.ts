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

// Phase 2C batch 5 (O7, 2B spec R-g): the tab row is TabNav, links named by the nav with the current one marked by
// aria-current. A plain click runs onSelect, which cancels the Link navigation and keeps the replaceState switch the
// test above pins, so unsaved edits stay; Ctrl+click opens the tab's own URL.
test("the settings tab row is TabNav, and a click switches tabs in place (O7, 2C batch 5)", () => {
  const source = readFileSync("src/components/admin/system-settings-form.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /^import \{ TabNav \} from "@\/components\/ui\/tab-nav"$/m)
  assert.match(source, /^import \{ useTranslations \} from "next-intl"$/m)
  assert.match(source, /const tPage = useTranslations\("systemSettingsPage"\)/)
  assert.match(source, /const tabs = getSettingsTabOrder\(\)\.map\(\(id\) => \(\{ key: id, label: tabLabels\[id\], href: buildSystemSettingsTabHref\(pathname, searchParams\.toString\(\), id\) \}\)\)/)
  assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate className="space-y-6">\n\s+<TabNav\n\s+aria-label=\{tPage\("title"\)\}\n\s+items=\{tabs\}\n\s+current=\{activeTab\}\n\s+onSelect=\{\(key, event\) => \{\n\s+event\.preventDefault\(\)\n\s+selectTab\(parseSystemSettingsTab\(key\)\)\n\s+\}\}\n\s+\/>/)
  assert.doesNotMatch(source, /aria-pressed=\{isActive\}|bg-primary text-white|tabs\.map\(\(tab\)/, "the hand-made tab buttons are gone")
})
