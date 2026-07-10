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
