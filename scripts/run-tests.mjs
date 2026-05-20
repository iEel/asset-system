import { readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { spawnSync } from "node:child_process"

const testFiles = collectTestFiles("tests")

if (testFiles.length === 0) {
  console.error("No test files found.")
  process.exit(1)
}

const result = spawnSync(process.execPath, ["--test", ...testFiles], {
  stdio: "inherit",
})

process.exit(result.status ?? 1)

function collectTestFiles(directory) {
  const entries = readdirSync(directory)
  const files = []

  for (const entry of entries) {
    const path = join(directory, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) {
      files.push(...collectTestFiles(path))
    } else if (/\.test\.(?:mjs|js|ts)$/.test(entry)) {
      files.push(path)
    }
  }

  return files.sort((left, right) => left.localeCompare(right))
}
