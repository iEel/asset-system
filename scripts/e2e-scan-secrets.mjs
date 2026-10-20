// The E2E suite's secret scan (spec §5 "no secrets printed"): after `npm run test:e2e`, search Playwright's report and
// results for the last run's generated passwords and the seed admin's. Prints counts and the paths of the files with a
// hit, never a value; exits 1 on a hit or when there is nothing to scan for. Run from the repo root:
//   node scripts/e2e-scan-secrets.mjs
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import dotenv from "dotenv"

const RUN_FILE = "e2e/.state/run.json"
if (!existsSync(RUN_FILE)) {
  console.error(`e2e-scan-secrets: ${RUN_FILE} is missing; run the suite first`)
  process.exit(1)
}
const { runId } = JSON.parse(readFileSync(RUN_FILE, "utf8"))
const dataFile = `e2e/.state/${runId}/run-data.json`
const users = existsSync(dataFile) ? Object.values(JSON.parse(readFileSync(dataFile, "utf8")).users ?? {}) : []
const secrets = users.map((user) => user.password).filter((value) => typeof value === "string" && value.length > 0)
if (existsSync(".env.e2e")) {
  const seed = dotenv.parse(readFileSync(".env.e2e")).E2E_SEED_PASSWORD
  if (seed) secrets.push(seed)
}
if (secrets.length === 0) {
  console.error(`e2e-scan-secrets: no password to scan for (run ${runId}); the setup did not finish and .env.e2e is missing`)
  process.exit(1)
}

const walk = (directory) =>
  existsSync(directory)
    ? readdirSync(directory).flatMap((entry) => {
        const full = path.join(directory, entry)
        return statSync(full).isDirectory() ? walk(full) : [full]
      })
    : []

let files = 0
const hits = []
for (const file of [...walk("e2e-report"), ...walk("e2e-results")]) {
  files += 1
  const bytes = readFileSync(file)
  if (secrets.some((value) => bytes.includes(Buffer.from(value)))) hits.push(file)
}
for (const file of hits) console.log(`HIT in ${file}`)
console.log(`scanned ${files} files for ${secrets.length} passwords: ${hits.length} hits`)
process.exit(hits.length === 0 ? 0 : 1)
