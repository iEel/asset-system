import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("topbar exposes a PWA install prompt without a large blocking banner", () => {
  const topbar = readFileSync("src/components/layout/topbar.tsx", "utf8")
  assert.match(topbar, /PwaInstallPrompt/)

  const prompt = readFileSync("src/components/pwa/pwa-install-prompt.tsx", "utf8")
  assert.match(prompt, /beforeinstallprompt/)
  assert.match(prompt, /\.prompt\(\)/)
  assert.match(prompt, /userChoice/)
  assert.match(prompt, /standalone\?: boolean/)
  assert.match(prompt, /matchMedia\("\(display-mode: standalone\)"\)/)
  assert.doesNotMatch(prompt, /fixed inset/)
})

test("PWA install prompt copy is translated", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  for (const messages of [th, en]) {
    assert.equal(typeof messages.pwaInstall.title, "string")
    assert.equal(typeof messages.pwaInstall.install, "string")
    assert.equal(typeof messages.pwaInstall.iosHint, "string")
    assert.equal(typeof messages.pwaInstall.installed, "string")
  }
})
