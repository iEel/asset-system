// The guard (spec §5 "A guard runs before any test", §11): runs once per `npm run test:e2e`, after next start is up and
// before the setup project. playwright.config.ts has already checked the env files when it loaded; this checks them
// again, prints the names it checked (never a value), signs the seed admin in once, reads the approval settings with a
// GET and asserts the defaults, and writes the run id to e2e/.state/run.json.
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs"
import path from "node:path"
import { chromium, type FullConfig } from "@playwright/test"
import { parse } from "dotenv"
import { guardAppEnv } from "./support/app-env.ts"
import { checkApprovalPolicy, nextRunId } from "./support/env-guard.ts"
import { ADMIN_STATE_FILE, e2eBaseUrl, fromRoot, RUN_FILE, SEED_LOGIN_FILE } from "./support/paths.ts"
import { signInOnce } from "./support/sign-in.ts"
import { writeRunState } from "./support/state.ts"

function readSeedLogin(root: string) {
  const file = path.resolve(root, SEED_LOGIN_FILE)
  if (!existsSync(file)) throw new Error(`E2E guard stopped the run: ${SEED_LOGIN_FILE} is missing (E2E_SEED_USERNAME and E2E_SEED_PASSWORD, the seed admin's sign-in).`)
  const values = parse(readFileSync(file))
  const username = values.E2E_SEED_USERNAME?.trim()
  const password = values.E2E_SEED_PASSWORD
  if (!username || !password) throw new Error(`E2E guard stopped the run: ${SEED_LOGIN_FILE} needs E2E_SEED_USERNAME and E2E_SEED_PASSWORD.`)
  return { username, password }
}

export default async function globalSetup(config: FullConfig) {
  const root = config.configFile ? path.dirname(config.configFile) : process.cwd()
  // A run that stops before the run id is written leaves no run id behind for the reporter or a later step.
  rmSync(fromRoot(RUN_FILE, root), { force: true })
  const target = guardAppEnv(root)
  console.log(`E2E guard: database ${target.database}, login ${target.login}, uploads ${target.uploads.setting} (inside the project)`)
  const seed = readSeedLogin(root)
  const baseURL = e2eBaseUrl()

  const browser = await chromium.launch()
  try {
    const context = await browser.newContext({ baseURL, locale: "th-TH", timezoneId: "Asia/Bangkok" })
    const page = await context.newPage()
    await signInOnce(page, seed.username, seed.password)
    mkdirSync(path.dirname(fromRoot(ADMIN_STATE_FILE, root)), { recursive: true })
    await context.storageState({ path: fromRoot(ADMIN_STATE_FILE, root) })

    // The approval settings (spec §11): a GET, never a save.
    const settingsResponse = await context.request.get("/api/admin/settings")
    if (!settingsResponse.ok()) throw new Error(`E2E guard stopped the run: GET /api/admin/settings answered ${settingsResponse.status()}`)
    const approval = checkApprovalPolicy((await settingsResponse.json()) as { key: string; value: string; id?: string }[])
    console.log(
      `E2E guard: approval settings ${approval.storedKeys.length === 0 ? "not stored, the defaults apply" : `stored (${approval.storedKeys.join(", ")})`}; segregation ${approval.policy.segregationRequired ? "on" : "off"}`
    )

    // The run id: the letter after the last run of the day, found in the E2E departments and usernames.
    const now = new Date()
    const day = `E2E-${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
    const departments = await context.request.get(`/api/departments?search=${encodeURIComponent(day)}`)
    const users = await context.request.get("/api/admin/users")
    if (!departments.ok() || !users.ok()) throw new Error(`E2E guard stopped the run: the run id lookup answered ${departments.status()} and ${users.status()}`)
    const codes = ((await departments.json()) as { code: string }[]).map((department) => department.code)
    const usernames = ((await users.json()) as { data: { username: string }[] }).data.map((user) => user.username)
    const runId = nextRunId(now, [...codes, ...usernames])
    writeRunState({
      runId,
      startedAt: now.toISOString(),
      baseURL,
      database: target.database,
      login: target.login,
      approval,
    })
    console.log(`E2E run ${runId}`)
  } finally {
    await browser.close()
  }
}
