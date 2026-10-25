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

test("status foreground tokens only appear inside shared ui components and on the bell's count dot", () => {
  const statusInk = /\btext-(?:success|warning|danger|info)-foreground\b/g
  assert.deepEqual(
    findMatches(statusInk, (path) => path.startsWith("src/components/ui/") || path === "src/components/layout/notification-bell.tsx"),
    [],
  )
  // The bell's unread count is the one solid status fill outside src/components/ui (dark mode P-R7). Its ink is the
  // danger foreground, not white: the dark danger fill is light, and the contrast suite checks the pair in both sets.
  assert.deepEqual(
    findMatches(statusInk).filter((match) => match.startsWith("src/components/layout/notification-bell.tsx: ")),
    ["src/components/layout/notification-bell.tsx: text-danger-foreground"],
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

const GLOBAL_KEY_LISTENERS = [
  // the / shortcut opens the search and closes nothing (menu B shell task 8)
  'src/components/layout/global-search.tsx: window.addEventListener("keydown"',
  // the session's activity listeners extend the session and close nothing (menu B shell task 12a)
  "src/components/layout/session-keeper.tsx: window.addEventListener(type,",
]

test("no global listeners for closing overlays", () => {
  // A listener in a loop (`type`) cannot be read by event name, so every one is listed here.
  assert.deepEqual(findMatches(/(?:document|window)\.addEventListener\((?:"(?:keydown|mousedown|pointerdown)"|type,)/g), GLOBAL_KEY_LISTENERS)
})

test("no portals or manual positioning for menus", () => {
  assert.deepEqual(findMatches(/createPortal\(/g), [])
})

test("no dark-mode classes", () => {
  assert.deepEqual(findMatches(/\bdark:/g), [])
})
