import test from "node:test"
import assert from "node:assert/strict"
import {
  buildLoginHref,
  buildRequestPath,
  isSessionExpiredLogin,
  normalizeLoginCallbackUrl,
} from "../src/lib/login-redirect.ts"

test("keeps safe callback paths inside the active locale", () => {
  assert.equal(normalizeLoginCallbackUrl("th", "/th/assets?view=ready"), "/th/assets?view=ready")
  assert.equal(normalizeLoginCallbackUrl("th", "/th"), "/th")
})

test("accepts an absolute callback only from an allowed application origin", () => {
  assert.equal(
    normalizeLoginCallbackUrl(
      "th",
      "https://asset.company.test/th/audit/rounds?view=open#queue",
      ["https://asset.company.test"]
    ),
    "/th/audit/rounds?view=open#queue"
  )
})

test("rejects external, protocol-relative, backslash, cross-locale, and malformed callbacks", () => {
  const fallback = "/th"
  assert.equal(normalizeLoginCallbackUrl("th", "https://evil.test/th/assets", ["https://asset.company.test"]), fallback)
  assert.equal(normalizeLoginCallbackUrl("th", "//evil.test/th/assets"), fallback)
  assert.equal(normalizeLoginCallbackUrl("th", "/th\\assets"), fallback)
  assert.equal(normalizeLoginCallbackUrl("th", "/en/assets"), fallback)
  assert.equal(normalizeLoginCallbackUrl("th", ["/th/assets", "/th/reports"]), fallback)
  assert.equal(normalizeLoginCallbackUrl("th", "%not-a-url"), fallback)
})

test("detects explicit session-expired login states", () => {
  assert.equal(isSessionExpiredLogin("session-expired", undefined), true)
  assert.equal(isSessionExpiredLogin(undefined, "SessionExpired"), true)
  assert.equal(isSessionExpiredLogin("signed-out", "CredentialsSignin"), false)
  assert.equal(isSessionExpiredLogin(["session-expired"], undefined), false)
})

test("the login link keeps the page asked for, and only a safe one", () => {
  assert.equal(buildLoginHref("th", "/th/assets/a1?view=custody"), "/th/login?callbackUrl=%2Fth%2Fassets%2Fa1%3Fview%3Dcustody")
  for (const requestPath of [null, undefined, "/th", "/th/login?callbackUrl=%2Fth%2Fx", "/th/login", "//evil.test/th/a", "/en/assets"]) {
    assert.equal(buildLoginHref("th", requestPath), "/th/login", String(requestPath))
  }
  assert.equal(buildRequestPath(new URL("http://x/th/assets?_rsc=1&search=a")), "/th/assets?search=a")
  assert.equal(buildRequestPath(new URL("http://x/th/assets/a1")), "/th/assets/a1")
})

test("an expired session's login link carries the reason before the page", () => {
  assert.equal(buildLoginHref("th", "/th/assets?view=a", { reason: "session-expired" }), "/th/login?reason=session-expired&callbackUrl=%2Fth%2Fassets%3Fview%3Da")
  for (const path of ["/th", null, "//evil.test/th/a"]) assert.equal(buildLoginHref("th", path, { reason: "session-expired" }), "/th/login?reason=session-expired", String(path))
})
