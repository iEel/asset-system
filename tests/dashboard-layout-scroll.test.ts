import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("dashboard shell is fixed to the viewport so the page and main content do not both scroll", () => {
  const layoutSource = readFileSync("src/app/[locale]/(dashboard)/layout.tsx", "utf8")
  const shellSource = readFileSync("src/components/layout/dashboard-shell.tsx", "utf8")

  assert.match(layoutSource, /<DashboardShell user=\{user\}>/)
  assert.match(shellSource, /className="[^"]*\bfixed\b[^"]*\binset-0\b[^"]*\bflex\b[^"]*\boverflow-hidden\b/)
  assert.doesNotMatch(shellSource, /className="flex h-dvh max-h-dvh/)
  assert.match(shellSource, /<main className="[^"]*overflow-y-auto/)
})
