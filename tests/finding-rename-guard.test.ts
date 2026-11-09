import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { join, relative, sep } from "node:path"
import test from "node:test"

// inspection-confirm plan 1: the finding is called "รายการไม่ตรงทะเบียน" everywhere. This guard refuses the bare word
// in source, unit tests and E2E files so a new string cannot bring the old term back.
const root = process.cwd()
const roots = ["src", "e2e", "tests"]
const extensions = [".ts", ".tsx", ".mjs"]
const skippedDirs = new Set(["node_modules", join("e2e", ".state")])
const skippedFiles = new Set([
  join("tests", "finding-rename-guard.test.ts"),
  // The glossary test holds the bare word on purpose: its retired-word rule and the asserts that prove the rule fires.
  join("tests", "thai-glossary.test.ts"),
])
const bareWord = /รายการไม่ตรง(?!ทะเบียน)/

function walk(dir: string, out: string[]) {
  for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    const rel = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || skippedDirs.has(rel)) continue
      walk(rel, out)
    } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext)) && !skippedFiles.has(rel)) {
      out.push(rel)
    }
  }
}

test("no source, test or E2E file uses the bare word รายการไม่ตรง (inspection-confirm plan 1)", () => {
  const files: string[] = []
  for (const dir of roots) walk(dir, files)
  const hits: string[] = []
  for (const file of files) {
    const lines = readFileSync(join(root, file), "utf8").replace(/\r\n/g, "\n").split("\n")
    lines.forEach((line, index) => {
      if (bareWord.test(line)) hits.push(`${relative(root, join(root, file)).split(sep).join("/")}:${index + 1}`)
    })
  }
  assert.deepEqual(hits, [])
})
