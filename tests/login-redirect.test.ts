import test from "node:test"
import assert from "node:assert/strict"
import {
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
