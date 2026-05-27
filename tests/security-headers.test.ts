import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { getSecurityHeadersConfig } from "../src/lib/security-headers.ts"

function headerMap(headers: Array<{ key: string; value: string }>) {
  return new Map(headers.map((header) => [header.key.toLowerCase(), header.value]))
}

test("defines global browser security headers without blocking camera scanning", () => {
  const [globalHeaders] = getSecurityHeadersConfig()
  assert.equal(globalHeaders.source, "/:path*")

  const headers = headerMap(globalHeaders.headers)
  assert.equal(headers.get("x-content-type-options"), "nosniff")
  assert.equal(headers.get("x-frame-options"), "DENY")
  assert.equal(headers.get("referrer-policy"), "strict-origin-when-cross-origin")
  assert.match(headers.get("permissions-policy") ?? "", /camera=\(self\)/)
  assert.match(headers.get("permissions-policy") ?? "", /microphone=\(\)/)
  assert.match(headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/)
  assert.match(headers.get("content-security-policy") ?? "", /object-src 'none'/)
})

test("defines strict service worker headers", () => {
  const serviceWorkerHeaders = getSecurityHeadersConfig().find((entry) => entry.source === "/sw.js")
  assert.ok(serviceWorkerHeaders)

  const headers = headerMap(serviceWorkerHeaders.headers)
  assert.equal(headers.get("content-type"), "application/javascript; charset=utf-8")
  assert.equal(headers.get("cache-control"), "no-cache, no-store, must-revalidate")
  assert.equal(headers.get("content-security-policy"), "default-src 'self'; script-src 'self'")
})

test("attachment downloads disable MIME sniffing and shared caching", () => {
  const source = readFileSync("src/app/api/attachments/[id]/route.ts", "utf8")
  assert.match(source, /"X-Content-Type-Options": "nosniff"/)
  assert.match(source, /"Cache-Control": "private, no-store"/)
})
