import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("topbar does not expose a persistent PWA install prompt", () => {
  const topbar = readFileSync("src/components/layout/topbar.tsx", "utf8")
  assert.doesNotMatch(topbar, /PwaInstallPrompt/)
  assert.doesNotMatch(topbar, /pwa-install-prompt/)
})

test("PWA install remains available through browser metadata", () => {
  const manifest = readFileSync("src/app/manifest.ts", "utf8")
  assert.match(manifest, /display: "standalone"/)
  assert.match(manifest, /start_url: "\/th\/dashboard"/)
  assert.match(manifest, /icons:/)

  const rootLayout = readFileSync("src/app/layout.tsx", "utf8")
  assert.match(rootLayout, /PwaServiceWorkerRegister/)
})
