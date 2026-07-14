import assert from "node:assert/strict"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import test from "node:test"

test("maintenance warning and success copy uses foreground tokens", async () => {
  const componentDir = "src/components/maintenance"
  const componentFiles = (await readdir(componentDir)).filter((file) => file.endsWith(".tsx")).map((file) => path.join(componentDir, file))
  const files = [
    ...componentFiles,
    "src/app/[locale]/(dashboard)/maintenance/page.tsx",
    "src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx",
  ]
  const source = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n")
  assert.doesNotMatch(source, /text-warning(?:\s|\")/)
  assert.doesNotMatch(source, /text-success(?:\s|\")/)
  assert.match(source, /text-warning-foreground/)
  assert.match(source, /text-success-foreground/)
})

