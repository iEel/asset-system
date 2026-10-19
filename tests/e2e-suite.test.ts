import assert from "node:assert/strict"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import test from "node:test"
import { browserFor, E2E_PROJECTS, phoneUserAgent, PHONE_USER_AGENTS } from "../e2e/support/matrix.ts"

// The E2E workflow suite's foundation (spec docs/superpowers/specs/2026-10-19-e2e-workflow-suite-design.md §5, §7, §8;
// the foundation tasks EF1–EF5). One test per task, appended in order. The suite itself runs with `npm run test:e2e`
// against a running app; these pin what can be checked without one. The working tree is CRLF on Windows: every read
// strips \r.
const read = (file: string) => readFileSync(file, "utf8").replace(/\r/g, "")

function filesUnder(directory: string): string[] {
  if (!existsSync(directory)) return []
  return readdirSync(directory).flatMap((entry) => {
    const full = path.join(directory, entry)
    return statSync(full).isDirectory() ? filesUnder(full) : [full.replaceAll("\\", "/")]
  })
}

test("the E2E suite is its own Playwright project: four device × theme runs, the browser cache's version, out of npm test (e2e foundation task 1, EF1)", () => {
  // Spec §6: every workflow runs four times; §8: the desktop 1440×900, the phone 390×664 with touch, DPR 3 and a mobile
  // user agent.
  assert.deepEqual(E2E_PROJECTS.map((project) => project.name), ["desktop-light", "desktop-dark", "phone-light", "phone-dark"])
  for (const project of E2E_PROJECTS) {
    assert.equal(project.theme, project.name.endsWith("dark") ? "dark" : "light", project.name)
    if (project.device === "desktop") {
      assert.deepEqual([project.viewport, project.deviceScaleFactor, project.isMobile, project.hasTouch], [{ width: 1440, height: 900 }, 1, false, false], project.name)
    } else {
      assert.deepEqual([project.viewport, project.deviceScaleFactor, project.isMobile, project.hasTouch], [{ width: 390, height: 664 }, 3, true, true], project.name)
    }
  }
  // Spec §8: WebKit on the phone only for a file that asks (the audit walk, the desk delivery); the desktop on Chromium.
  assert.equal(browserFor("phone", true), "webkit")
  assert.equal(browserFor("phone", false), "chromium")
  assert.equal(browserFor("desktop", true), "chromium")
  assert.equal(phoneUserAgent("desktop", "chromium"), undefined)
  assert.match(phoneUserAgent("phone", "webkit") ?? "", /iPhone.*Mobile.*Safari/)
  assert.match(PHONE_USER_AGENTS.chromium, /Android.*Mobile Safari/)

  // The config builds its projects from the matrix, finds only *.spec.ts and the setup file, never retries.
  const config = read("playwright.config.ts")
  assert.match(config, /testDir: "e2e"/)
  assert.match(config, /\.\.\.E2E_PROJECTS\.map\(\(project\) => \(\{/)
  assert.match(config, /testMatch: \/\\\.spec\\\.ts\$\//)
  assert.match(config, /retries: 0,/)

  // The pinned versions; Playwright 1.61.1's browsers are the builds in the machine's cache (chromium-1228,
  // chromium_headless_shell-1228, webkit-2311), so nothing is downloaded.
  const pkg = JSON.parse(read("package.json"))
  assert.equal(pkg.scripts["test:e2e"], "playwright test")
  assert.equal(pkg.devDependencies["@playwright/test"], "1.61.1")
  assert.equal(pkg.devDependencies["@axe-core/playwright"], "4.13.0")
  const browsers = JSON.parse(read("node_modules/playwright-core/browsers.json")).browsers as { name: string; revision: string }[]
  const revision = (name: string) => browsers.find((browser) => browser.name === name)?.revision
  assert.deepEqual([revision("chromium"), revision("chromium-headless-shell"), revision("webkit")], ["1228", "1228", "2311"])

  // npm test sweeps tests/ for *.test.*; the suite's files are *.spec.ts and *.setup.ts under e2e/, never *.test.*.
  const runner = read("scripts/run-tests.mjs")
  assert.match(runner, /const testFiles = collectTestFiles\("tests"\)/)
  assert.equal((runner.match(/collectTestFiles\("/g) ?? []).length, 1, "run-tests.mjs collects from one folder")
  assert.deepEqual(filesUnder("e2e").filter((file) => /\.test\.(?:mjs|js|ts)$/.test(file)), [])

  // The report, the artifacts, the run state and the seed sign-in are git-ignored.
  const ignored = read(".gitignore").split("\n").map((line) => line.trim())
  for (const entry of ["/e2e-report/", "/e2e-results/", "/e2e/.state/", ".env*"]) assert.ok(ignored.includes(entry), `.gitignore has ${entry}`)
})

test("the guard stops on any database but asset_management_dev, on an upload folder outside the project, on changed approval settings, and makes the run id (e2e foundation task 2, EF2)", async () => {
  const guard = await import("../e2e/support/env-guard.ts")
  const secret = "s3cret-Value!"
  const env = (database: string, login = "asset_dev") => ({
    DATABASE_URL: `sqlserver://db.example:1433;database=${database};user=${login};password=${secret};encrypt=true`,
    DB_SERVER: "db.example",
    DB_USER: login,
    DB_PASSWORD: secret,
  })
  assert.deepEqual(guard.assertDevDatabase(env("asset_management_dev")), { database: "asset_management_dev", login: "asset_dev" })
  // As src/lib/db-config.ts reads them: trimmed, the quotes of a quoted value dropped.
  assert.deepEqual(guard.assertDevDatabase({ ...env("asset_management_dev"), DB_USER: ' "asset_dev" ' }), { database: "asset_management_dev", login: "asset_dev" })
  const refusals: [Record<string, string | undefined>, RegExp][] = [
    [env("asset_management"), /the database is asset_management, the Production database/],
    [env("ASSET_MANAGEMENT"), /the Production database/],
    [env("asset_management_uat"), /the database is asset_management_uat, not asset_management_dev/],
    [env("asset_management_dev", "sa"), /the login is sa, not asset_dev/],
    [{ ...env("asset_management_dev"), DATABASE_URL: "sqlserver://db.example:1433;encrypt=true" }, /DATABASE_URL names no database/],
    [{ ...env("asset_management_dev"), DB_PASSWORD: "" }, /DB_PASSWORD is empty/],
  ]
  for (const [candidate, message] of refusals) {
    assert.throws(() => guard.assertDevDatabase(candidate), (error: Error) => {
      assert.equal(error.name, "E2eGuardError")
      assert.match(error.message, message)
      assert.ok(!error.message.includes(secret), "no message holds the password")
      return true
    })
  }

  // The upload folder is a folder inside the project (spec §11).
  const root = path.resolve("C:/work/asset-system")
  assert.equal(guard.assertLocalUploadDir({}, root).resolved, path.join(root, "uploads"))
  assert.equal(guard.assertLocalUploadDir({ UPLOAD_DIR: "./uploads" }, root).setting, "./uploads")
  assert.equal(guard.assertLocalUploadDir({ UPLOAD_DIR: "data/files" }, root).resolved, path.join(root, "data", "files"))
  for (const outside of ["/var/www/asset-system/uploads", "\\\\fileserver\\share\\uploads", "//fileserver/share", "../uploads", "."]) {
    assert.throws(() => guard.assertLocalUploadDir({ UPLOAD_DIR: outside }, root), /E2E guard stopped the run: UPLOAD_DIR/, outside)
  }

  // The approval settings: the defaults pass, stored or not; any difference stops the run with what differs. The
  // settings route answers a default the database does not hold with its key as its id: that one is not stored.
  const defaults = [
    { key: "workflow_approval_disposal_required", value: "true" },
    { key: "workflow_approval_audit_close_required", value: "true" },
    { key: "workflow_approval_min_approvers", value: "1" },
    { key: "workflow_approval_segregation_required", value: "true" },
    { key: "workflow_approval_sla_days", value: "3" },
  ]
  assert.deepEqual(guard.checkApprovalPolicy([]).storedKeys, [])
  assert.deepEqual(guard.checkApprovalPolicy(defaults.map((setting) => ({ ...setting, id: setting.key }))).storedKeys, [])
  const rows = defaults.map((setting, index) => ({ ...setting, id: `0000000${index}-row` }))
  assert.equal(guard.checkApprovalPolicy([...rows, { key: "company_name", value: "x", id: "row-x" }]).storedKeys.length, 5)
  assert.equal(guard.checkApprovalPolicy(defaults).policy.segregationRequired, true)
  assert.throws(
    () => guard.checkApprovalPolicy([{ key: "workflow_approval_segregation_required", value: "false" }, { key: "workflow_approval_min_approvers", value: "2" }]),
    /minApprovers is 2 \(the default is 1\); segregationRequired is false \(the default is true\)\. The suite never changes them/
  )

  // The run id: E2E-, month and day, the letter after the day's last run (from codes and usernames), then the time.
  const day = new Date(2026, 9, 19, 14, 32)
  assert.equal(guard.nextRunId(day, []), "E2E-1019A")
  assert.equal(guard.nextRunId(day, ["E2E-1019A-D", "SNI-EQU-10-0001", "E2E-1018F-D"]), "E2E-1019B")
  assert.equal(guard.nextRunId(day, ["e2e.it-staff-1019c", "admin", "E2E-1019A-D"]), "E2E-1019D")
  assert.equal(guard.nextRunId(day, ["E2E-1019Z-D"]), "E2E-1019T1432")
  assert.deepEqual(guard.runIdsIn(["E2E-1019T1432-E1", "e2e.viewer-1019t1432", "E2E-1019AB"]), ["E2E-1019T1432"])
  assert.equal(guard.runSuffix("E2E-1019B"), "1019b")
  // The guard runs first in the config, before the web server starts, and again in the global setup.
  const config = read("playwright.config.ts")
  assert.ok(config.indexOf("guardAppEnv(process.cwd())") < config.indexOf("export default defineConfig"), "the config runs the guard when it loads")
  assert.match(config, /globalSetup: "\.\/e2e\/global-setup\.ts"/)
  assert.match(config, /reuseExistingServer: false/)
  assert.match(read("e2e/global-setup.ts"), /guardAppEnv\(root\)/)
})
