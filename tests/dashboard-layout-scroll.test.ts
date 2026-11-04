import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("dashboard shell is fixed to the viewport so the page and main content do not both scroll", () => {
  const layoutSource = readFileSync("src/app/[locale]/(dashboard)/layout.tsx", "utf8")
  const shellSource = readFileSync("src/components/layout/dashboard-shell.tsx", "utf8")

  assert.match(layoutSource, /<DashboardShell user=\{user\} account=\{account\} initialSidebar=\{initialSidebar\} sessionClock=\{shell\.clock\}>/)
  assert.match(shellSource, /className="[^"]*\bfixed\b[^"]*\binset-0\b[^"]*\bflex\b[^"]*\boverflow-hidden\b/)
  assert.doesNotMatch(shellSource, /className="flex h-dvh max-h-dvh/)
  assert.match(shellSource, /<main[^>]*className=\{cn\("[^"]*overflow-y-auto/)
})

test("dashboard shell resets accidental outer scroll caused by hash anchors", () => {
  const shellSource = readFileSync("src/components/layout/dashboard-shell.tsx", "utf8")

  assert.match(shellSource, /const shellRef = useRef<HTMLDivElement>\(null\)/)
  assert.match(shellSource, /const mainRef = useRef<HTMLElement>\(null\)/)
  assert.match(shellSource, /const scrollMainToHash = useCallback/)
  assert.match(shellSource, /main\.scrollTo\(\{/)
  assert.match(shellSource, /shell\.scrollTop = 0/)
  assert.match(shellSource, /window\.addEventListener\("hashchange", resetAfterAnchorScroll\)/)
  assert.match(shellSource, /<div ref=\{shellRef\} onScroll=\{resetShellScroll\}/)
  assert.match(shellSource, /<main ref=\{mainRef\}/)
})

// A fresh load or reload of /th/maintenance?stuck=all#stuck mounts the shell under loading.tsx's skeleton, so the hash's
// target is not in main yet (measured 2026-11-04: section#stuck stayed at top 523/358, main.scrollTop 0). The shell
// waits for it to stream in, lands once, and stops (src/lib/hash-target-landing.ts).
test("dashboard shell waits for a hash target that streams in after the loading skeleton", () => {
  const shellSource = readFileSync("src/components/layout/dashboard-shell.tsx", "utf8")

  assert.match(shellSource, /import \{ landOnHashTarget \} from "@\/lib\/hash-target-landing"/)
  // scrollMainToHash says whether it landed, the target is still missing, or there is nothing to land on.
  assert.match(shellSource, /const scrollMainToHash = useCallback\(\(\): HashLandResult =>/)
  // A target still in React's hidden streaming holder (outside main) is not in place yet: the shell waits for it.
  assert.match(shellSource, /if \(target === main\) return "none"/)
  assert.match(shellSource, /if \(!target \|\| !main\.contains\(target\)\) return "missing"/)
  // The gap under main's top is the target's own scroll-margin-top (scroll-mt-*), the one a client-side <Link> lands
  // with through Next's scrollIntoView, so a fresh load, a reload and a click land alike (was a fixed 96px).
  assert.match(shellSource, /const anchorOffset = Number\.parseFloat\(window\.getComputedStyle\(target\)\.scrollMarginTop\) \|\| 0/)
  assert.doesNotMatch(shellSource, /const anchorOffset = 96/)
  assert.match(shellSource, /top: main\.scrollTop \+ targetRect\.top - mainRect\.top - anchorOffset/)
  // It watches main's subtree for the streamed content, and the reader's own scroll or keys end the wait.
  assert.match(shellSource, /new MutationObserver\(retry\)/)
  assert.match(shellSource, /observer\.observe\(main, \{ childList: true, subtree: true \}\)/)
  for (const event of ["wheel", "touchstart", "keydown", "pointerdown"]) {
    assert.match(shellSource, new RegExp(`"${event}"`))
  }
  // A new hash or leaving the shell stops the previous wait.
  assert.match(shellSource, /stopWaiting\(\)\s*\n\s*window\.cancelAnimationFrame\(frame\)\s*\n\s*frame = window\.requestAnimationFrame/)
  assert.match(shellSource, /window\.removeEventListener\("hashchange", resetAfterAnchorScroll\)\s*\n\s*window\.cancelAnimationFrame\(frame\)\s*\n\s*stopWaiting\(\)/)
  // The skip link still moves focus itself, so #main never reaches the hash logic (spec §6.9).
  assert.match(shellSource, /event\.preventDefault\(\)\s*\n\s*mainRef\.current\?\.focus\(\{ preventScroll: true \}\)/)
})
