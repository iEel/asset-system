import assert from "node:assert/strict"
import test from "node:test"
import { findMatches as findSourceMatches, readSourceFiles } from "./helpers/source-files.ts"

const sources = readSourceFiles("src")

function findMatches(pattern: RegExp, allow: (path: string) => boolean = () => false) {
  return findSourceMatches(sources, pattern, allow)
}

test("status tints use soft tokens instead of opacity", () => {
  assert.deepEqual(findMatches(/\bbg-(?:success|warning|danger|info)\/\d+\b/g), [])
  assert.deepEqual(findMatches(/\bbg-primary\/(?:5|10|15|20)\b/g), [])
})

test("solid fills darken on hover instead of fading", () => {
  assert.deepEqual(findMatches(/\bbg-(?:primary|success|warning|danger|info)\/90\b/g), [])
})

test("status foreground tokens only appear inside shared ui components", () => {
  assert.deepEqual(
    findMatches(/\btext-(?:success|warning|danger|info)-foreground\b/g, (path) => path.startsWith("src/components/ui/")),
    [],
  )
})

test("primary text is never faded below AA", () => {
  assert.deepEqual(findMatches(/\btext-primary\/\d+\b/g), [])
})

test("nothing imports the removed status pill", () => {
  assert.deepEqual(findMatches(/components\/ui\/status-pill/g), [])
})

test("no browser confirm dialogs", () => {
  assert.deepEqual(findMatches(/window\.confirm\(/g), [])
})

test("navigation guards ask with the in-app confirm and let new-tab clicks through", () => {
  for (const path of [
    "src/components/disposal/disposal-bulk-approval.tsx",
    "src/components/disposal/disposal-bulk-execution.tsx",
    "src/components/master-data/supplier-form.tsx",
  ]) {
    const source = sources.find((file) => file.path === path)?.source ?? ""
    assert.match(source, /shouldGuardLinkClick\(/, path)
    assert.match(source, /confirm\(\{/, path)
  }
})

test("finding review actions use the shared accessible dialog", () => {
  const source = sources.find((file) => file.path === "src/components/audit/audit-finding-review-actions.tsx")?.source ?? ""
  assert.match(source, /<AccessibleDialog/)
  assert.doesNotMatch(source, /function Modal\(|fixed inset-0/)
})

test("no hand-rolled overlay backdrops outside shared ui components", () => {
  assert.deepEqual(
    findMatches(/\bfixed inset-0\b/g, (path) => path.startsWith("src/components/ui/") || path === "src/components/layout/dashboard-shell.tsx"),
    [],
  )
})

test("no global listeners for closing overlays", () => {
  assert.deepEqual(findMatches(/(?:document|window)\.addEventListener\("(?:keydown|mousedown|pointerdown)"/g), [])
})

test("no portals or manual positioning for menus", () => {
  assert.deepEqual(findMatches(/createPortal\(/g), [])
})

test("no dark-mode classes", () => {
  assert.deepEqual(findMatches(/\bdark:/g), [])
})
