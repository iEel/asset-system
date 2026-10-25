import assert from "node:assert/strict"
import test from "node:test"

import { createSessionExpiryRedirect } from "../src/lib/session-expiry.ts"

function harness(path = "/th/assets/a1?view=custody") {
  const went: string[] = []; let online = true
  const redirect = createSessionExpiryRedirect({ navigate: (href) => went.push(href), currentPath: () => path, isOnline: () => online })
  return { redirect, went, setOnline: (value: boolean) => { online = value } }
}

test("an expired session goes to the login once, with the reason and the page", () => {
  const { redirect, went } = harness()
  assert.equal(redirect.expire("th"), true); assert.equal(redirect.expire("th"), true)
  assert.deepEqual(went, ["/th/login?reason=session-expired&callbackUrl=%2Fth%2Fassets%2Fa1%3Fview%3Dcustody"])
  const home = harness("/th"); home.redirect.expire("th"); assert.deepEqual(home.went, ["/th/login?reason=session-expired"])
})

test("offline never redirects", () => {
  const { redirect, went, setOnline } = harness(); setOnline(false)
  assert.equal(redirect.expire("th"), false); assert.deepEqual(went, [])
  setOnline(true); redirect.expire("th"); assert.equal(went.length, 1)
})

test("a hold (the audit queue sending) defers the redirect until the last hold is released", () => {
  const { redirect, went } = harness()
  const a = redirect.hold(); const b = redirect.hold()
  assert.equal(redirect.expire("th"), true); assert.deepEqual(went, [])
  a(); a(); assert.deepEqual(went, [])
  b(); assert.equal(went.length, 1)
})
