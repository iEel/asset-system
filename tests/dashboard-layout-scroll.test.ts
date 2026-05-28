import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("dashboard shell is fixed to the viewport so the page and main content do not both scroll", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/layout.tsx", "utf8")

  assert.match(source, /className="[^"]*\bfixed\b[^"]*\binset-0\b[^"]*\bflex\b[^"]*\boverflow-hidden\b/)
  assert.doesNotMatch(source, /className="flex h-dvh max-h-dvh/)
  assert.match(source, /<main className="[^"]*overflow-y-auto/)
})
