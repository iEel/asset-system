import assert from "node:assert/strict"
import test from "node:test"
import { shouldGuardLinkClick, type AnchorLike, type LinkClickLike } from "../src/lib/navigation-guard.ts"

const click = (overrides: Partial<LinkClickLike> = {}): LinkClickLike => ({
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  defaultPrevented: false,
  ...overrides,
})

const anchor = (attributes: Record<string, string> = { href: "/th/disposal" }, target = ""): AnchorLike => ({
  target,
  hasAttribute: (name) => name in attributes,
  getAttribute: (name) => attributes[name] ?? null,
})

test("plain left clicks on in-app links are guarded", () => {
  assert.equal(shouldGuardLinkClick(click(), anchor()), true)
})

test("new-tab and modified clicks pass through without asking", () => {
  for (const key of ["metaKey", "ctrlKey", "shiftKey", "altKey"] as const) {
    assert.equal(shouldGuardLinkClick(click({ [key]: true }), anchor()), false, key)
  }
  assert.equal(shouldGuardLinkClick(click({ button: 1 }), anchor()), false)
  assert.equal(shouldGuardLinkClick(click(), anchor({ href: "/x" }, "_blank")), false)
  assert.equal(shouldGuardLinkClick(click(), anchor({ href: "/x", download: "" })), false)
})

test("links that do not leave the page are not guarded", () => {
  assert.equal(shouldGuardLinkClick(click(), anchor({ href: "#section" })), false)
  assert.equal(shouldGuardLinkClick(click(), anchor({})), false)
  assert.equal(shouldGuardLinkClick(click({ defaultPrevented: true }), anchor()), false)
})
