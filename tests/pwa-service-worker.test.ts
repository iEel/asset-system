import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

test("PWA service worker only caches safe static shell assets", () => {
  assert.equal(existsSync("public/sw.js"), true)
  assert.equal(existsSync("public/offline.html"), true)

  const worker = readFileSync("public/sw.js", "utf8")
  assert.match(worker, /ASSET_SYSTEM_PWA_CACHE/)
  assert.match(worker, /\/offline\.html/)
  assert.match(worker, /\/icons\/icon-192\.png/)
  assert.match(worker, /request\.mode === "navigate"/)
  assert.match(worker, /pathname\.startsWith\("\/api\/"\)/)
  assert.match(worker, /pathname\.startsWith\("\/_next\/"\)/)
  assert.match(worker, /pathname\.startsWith\("\/uploads\/"\)/)
  assert.doesNotMatch(worker, /cache\.put\(request/)
})

test("root layout registers the PWA service worker", () => {
  const layout = readFileSync("src/app/layout.tsx", "utf8")
  assert.match(layout, /PwaServiceWorkerRegister/)

  const register = readFileSync("src/components/pwa/pwa-service-worker-register.tsx", "utf8")
  assert.match(register, /navigator\.serviceWorker\.register\("\/sw\.js"/)
  assert.match(register, /process\.env\.NODE_ENV !== "production"/)
})
