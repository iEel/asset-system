import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { findJsxElements, findJsxTags } from "./helpers/source-files.ts"

// Plan 2D-1 (spec 2D §3.1, §1): guard GB2 of tests/form-migration-guards.test.ts reads only the 2C files until 2D-5
// widens it to all of src. These four files hold the six spinners it would fail; this test applies GB2's own rule to them.
const FILES = [
  "src/components/audit/audit-scan-camera.tsx",
  "src/components/audit/audit-scan-lookup-card.tsx",
  "src/components/layout/global-search.tsx",
  "src/components/ui/scanner-text-input.tsx",
]

test("a spinner outside a button stops for users who reduce motion, in the files GB2 does not read yet (spec 2D §3.1)", () => {
  const problems: string[] = []
  for (const path of FILES) {
    const source = readFileSync(path, "utf8").replace(/\r\n/g, "\n")
    const buttons = [...findJsxElements(source, "Button"), ...findJsxElements(source, "button")].filter((button) => button.children !== null)
    for (const loader of findJsxTags(source, ["Loader2"])) {
      const inButton = buttons.some((button) => loader.start >= button.end && loader.start < button.closeEnd)
      if (!inButton && !/\bmotion-reduce:animate-none\b/.test(loader.text)) problems.push(`${path}:${loader.line}`)
    }
  }
  assert.deepEqual(problems, [], "add motion-reduce:animate-none")
})
