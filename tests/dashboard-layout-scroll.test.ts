import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("dashboard shell is fixed to the viewport so the page and main content do not both scroll", () => {
  const layoutSource = readFileSync("src/app/[locale]/(dashboard)/layout.tsx", "utf8")
  const shellSource = readFileSync("src/components/layout/dashboard-shell.tsx", "utf8")

  assert.match(layoutSource, /<DashboardShell user=\{user\}>/)
  assert.match(shellSource, /className="[^"]*\bfixed\b[^"]*\binset-0\b[^"]*\bflex\b[^"]*\boverflow-hidden\b/)
  assert.doesNotMatch(shellSource, /className="flex h-dvh max-h-dvh/)
  assert.match(shellSource, /<main[^>]*className="[^"]*overflow-y-auto/)
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
