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
  // A run whose database dropped mid-run stops after 90 minutes instead of hanging (the dry run's open issue 1).
  assert.match(config, /globalTimeout: 90 \* 60 \* 1000,/)

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

test("the setup creates the spec's users with exactly the spec's permissions, marked with the run id, and the fixtures are small (e2e foundation task 3, EF3)", async () => {
  const plan = await import("../e2e/support/run-plan.ts")
  // Spec §7, the users table.
  const itStaff = [
    "asset:view", "asset:create", "asset:edit", "audit:view", "audit:create", "audit:edit",
    "maintenance:view", "maintenance:create", "maintenance:edit", "disposal:view", "disposal:create", "disposal:edit",
    "report:view", "report:export",
  ]
  assert.deepEqual(plan.E2E_ROLE_PERMISSIONS.itStaff, itStaff)
  // The IT head also holds the three module exports (decision DX6 (ก), spec §7) and the work center (user decision
  // 2026-10-25).
  assert.deepEqual(plan.E2E_ROLE_PERMISSIONS.itHead, [...itStaff, "audit:approve", "disposal:approve", "audit:export", "maintenance:export", "disposal:export", "dashboard:view"])
  assert.deepEqual(plan.E2E_ROLE_PERMISSIONS.viewer, ["asset:view", "audit:view", "maintenance:view", "disposal:view", "report:view"])
  assert.deepEqual(plan.E2E_ROLE_PERMISSIONS.employee, [])
  assert.ok(!plan.E2E_ROLE_PERMISSIONS.itStaff.some((permission) => permission.endsWith(":approve")), "IT staff hold no approve")
  // Every permission is one the role form offers (prisma/seed.ts: 25 modules × 6 actions).
  const roleForm = read("src/app/[locale]/(dashboard)/admin/roles/page.tsx")
  for (const permission of Object.values(plan.E2E_ROLE_PERMISSIONS).flat()) {
    const [moduleName, action] = permission.split(":")
    assert.match(roleForm, new RegExp(`"${moduleName}",`), moduleName)
    assert.match(roleForm, new RegExp(`"${action}"`), action)
  }
  // Linked to an employee as §7 says, the viewer not (finding A1 fixed by decision DX1); the landing pages of default-home.ts.
  assert.deepEqual(plan.E2E_USER_KEYS, ["itStaff", "itHead", "viewer", "employee"])
  assert.deepEqual(plan.E2E_USER_KEYS.map((key) => plan.E2E_USER_PLANS[key].linked), [true, true, false, true])
  assert.deepEqual(plan.E2E_USER_KEYS.map((key) => plan.E2E_USER_PLANS[key].landingPath), ["/th/dashboard", "/th/dashboard", "/th/dashboard", "/th/my-assets"])
  // The run id on every username, role, code and name (spec §5), within the schemas' limits.
  assert.equal(plan.usernameFor("itStaff", "E2E-1019A"), "e2e.it-staff-1019a")
  assert.equal(plan.roleNameFor("itHead", "E2E-1019A"), "e2e_it_head_1019a")
  assert.match(plan.roleNameFor("employee", "E2E-1019T1432"), /^[a-z][a-z0-9_]{1,49}$/)
  assert.deepEqual(plan.roleDisplayFor("viewer", "E2E-1019A"), { displayName: "E2E-1019A Viewer", displayNameTh: "E2E-1019A ผู้ดูอย่างเดียว" })
  for (const runId of ["E2E-1019A", "E2E-1019T1432"]) {
    const records = plan.runRecords(runId)
    assert.ok(records.department.code.startsWith(runId) && records.department.code.length <= 20, records.department.code)
    assert.ok(records.location.code.startsWith(runId) && records.location.code.length <= 50, records.location.code)
    assert.deepEqual(records.employees.map((employee) => employee.key), ["itStaff", "itHead", "employee", "receiver1", "receiver2"])
    for (const employee of records.employees) {
      assert.ok(employee.code.startsWith(`${runId}-`) && employee.code.length <= 20, employee.code)
      assert.ok(employee.fullNameTh.startsWith(runId), employee.fullNameTh)
    }
  }
  // Generated passwords: long, from the bytes given, never the same twice for different bytes.
  const first = plan.passwordFrom(new Uint8Array(24).fill(7))
  assert.equal(first.length, 28)
  assert.notEqual(first, plan.passwordFrom(new Uint8Array(24).fill(8)))
  assert.throws(() => plan.passwordFrom(new Uint8Array(8)), /24 random bytes/)

  // The setup signs in as the seed admin's saved session, creates the roles on the role form and reads them back, and
  // runs finding A1's test as a plain test (decision DX1).
  const setup = read("e2e/setup/run-data.setup.ts")
  assert.match(setup, /setup\.use\(\{ storageState: fromRoot\(ADMIN_STATE_FILE\) \}\)/)
  assert.match(setup, /await page\.goto\("\/th\/admin\/roles\/new"\)/)
  assert.match(setup, /await page\.goto\(`\/th\/admin\/roles\/\$\{role\.id\}\/edit`\)/)
  assert.doesNotMatch(setup, /setup\.fail\(true, "A1: /)
  assert.doesNotMatch(setup, /console\.log/, "the setup prints nothing")

  // The fixtures: a small PNG photo and a small PDF, both binary (git never converts their line ends).
  const photo = readFileSync("e2e/fixtures/photo.png")
  const pdf = readFileSync("e2e/fixtures/evidence.pdf")
  assert.deepEqual([...photo.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  assert.equal(pdf.subarray(0, 8).toString("latin1"), "%PDF-1.4")
  assert.match(pdf.toString("latin1"), /startxref\n\d+\n%%EOF\n$/)
  for (const file of [photo, pdf]) {
    assert.ok(file.length < 2048, "a fixture stays under 2 KB")
    assert.ok(file.includes(0), "a fixture holds a NUL byte, so git treats it as binary")
  }
})

test("every test is measured: console errors, failed requests, axe serious and critical, load times, screenshots, one summary (e2e foundation task 4, EF4)", async () => {
  const core = await import("../e2e/support/measure-core.ts")
  const { ALLOW_LIST } = await import("../e2e/support/allow-list.ts")
  const page = "http://localhost:3100/th/dashboard"
  const refusal = { method: "POST", url: /\/api\/assets\/[^/]+\/checkout$/, status: 409, reason: "a second handover of the same asset" }
  const records = {
    console: [
      { kind: "console" as const, text: "Failed to load resource: the server responded with a status of 409 (Conflict)", url: "http://localhost:3100/api/assets/a1/checkout", pageUrl: page },
      { kind: "console" as const, text: "Failed to load resource: the server responded with a status of 500 (Internal Server Error)", url: "http://localhost:3100/api/reports", pageUrl: page },
      { kind: "pageerror" as const, text: "TypeError: x is undefined", pageUrl: page },
    ],
    responses: [
      { method: "POST", url: "http://localhost:3100/api/assets/a1/checkout", status: 409, resourceType: "fetch", pageUrl: page },
      { method: "GET", url: "http://localhost:3100/api/reports", status: 500, resourceType: "fetch", pageUrl: page },
    ],
    failures: [
      { method: "GET", url: "http://localhost:3100/th/assets?_rsc=abc", errorText: "net::ERR_ABORTED", resourceType: "fetch", pageUrl: page },
      { method: "GET", url: "http://localhost:3100/api/assets", errorText: "net::ERR_ABORTED", resourceType: "fetch", pageUrl: page },
      { method: "GET", url: "http://localhost:3100/th/assets?_rsc=abc", errorText: "net::ERR_CONNECTION_REFUSED", resourceType: "fetch", pageUrl: page },
    ],
  }
  const unmet = { url: /\/api\/disposal-requests$/, status: 403, reason: "the viewer may not request a disposal" }
  const classified = core.classify(records, ALLOW_LIST, [refusal, unmet])
  // The refused handover and its console line are the test's own; the 500 and its console line, the page error, the
  // aborted API call and the refused connection are not; the cancelled prefetch is on the reviewed list.
  assert.deepEqual(classified.expected, [{ reason: refusal.reason, method: "POST", url: "http://localhost:3100/api/assets/a1/checkout", status: 409 }])
  assert.deepEqual(classified.unexpectedResponses.map((response) => response.status), [500])
  assert.deepEqual(classified.unexpectedConsole.map((message) => message.kind), ["console", "pageerror"])
  assert.deepEqual(classified.unexpectedFailures.map((failure) => `${failure.url} ${failure.errorText}`), [
    "http://localhost:3100/api/assets net::ERR_ABORTED",
    "http://localhost:3100/th/assets?_rsc=abc net::ERR_CONNECTION_REFUSED",
  ])
  assert.deepEqual(classified.allowed, [{ id: "next-prefetch-cancelled", kind: "requestfailed", url: "http://localhost:3100/th/assets?_rsc=abc" }])
  assert.deepEqual(classified.unmetRefusals.map((item) => item.reason), [unmet.reason])

  // axe: serious and critical fail the test, moderate and minor are counted only.
  const node = (target: string) => ({ target: [target] })
  const axe = core.axeCounts([
    { id: "color-contrast", impact: "serious", help: "Elements must meet minimum color contrast", helpUrl: "", nodes: [node(".a"), node(".b")] },
    { id: "button-name", impact: "critical", help: "Buttons must have discernible text", helpUrl: "", nodes: [node("#x")] },
    { id: "region", impact: "moderate", help: "All page content should be contained by landmarks", helpUrl: "", nodes: [node("div")] },
  ])
  assert.deepEqual([axe.serious, axe.critical, axe.moderate, axe.minor], [1, 1, 1, 0])
  assert.deepEqual(axe.failing.map((violation) => `${violation.impact} ${violation.id} ${violation.targets.join(",")}`), ["serious color-contrast .a,.b", "critical button-name #x"])
  assert.deepEqual(core.AXE_TAGS, ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
  const problems = core.measurementProblems(classified, [{ label: "landing", url: page, loadMs: 300, domContentLoadedMs: 200, axe }])
  assert.equal(problems.length, 2 + 1 + 2 + 1 + 2)
  assert.ok(problems.some((problem) => problem.startsWith("axe serious color-contrast on landing")))
  assert.ok(problems.some((problem) => problem.startsWith("expected refusal not seen: any")))

  // The run summary: per project, an expected failure is its own count, never a pass or a failure.
  const summaryRow = { title: "t", file: "f", device: "phone", theme: "dark", browser: "webkit", user: null, durationMs: 1, pages: [], timings: [], allowed: [], expected: [], problems: [], screenshots: [], errors: [] }
  const row = (project: string, status: string, expectedStatus = "passed") => ({ ...summaryRow, project, status, expectedStatus })
  const summary = core.buildRunSummary("E2E-1019A", "2026-10-19T00:00:00.000Z", "passed", [row("phone-dark", "passed"), row("phone-dark", "failed"), row("setup", "failed", "failed"), row("setup", "skipped")])
  assert.deepEqual(summary.projects, { "phone-dark": { passed: 1, failed: 1, skipped: 0, expectedFailures: 0 }, setup: { passed: 0, failed: 0, skipped: 1, expectedFailures: 1 } })

  // Every allow-list entry is reviewed and says why; there are few of them.
  assert.ok(ALLOW_LIST.length <= 5, "the allow-list stays short")
  for (const entry of ALLOW_LIST) {
    assert.match(entry.reviewed, /^\d{4}-\d{2}-\d{2}$/, entry.id)
    assert.ok(entry.reason.length >= 40, `${entry.id} says why`)
  }
  // Every test gets the measurements (an auto fixture), the end screenshot, and the reporter collects the rows.
  const fixtures = read("e2e/support/fixtures.ts")
  assert.match(fixtures, /measure: \[\n[\s\S]*?\{ auto: true \},\n  \],/)
  assert.match(read("e2e/support/measure.ts"), /await this\.screenshot\("end"\)/)
  // The login page smoke runs the measurements with no one signed in.
  const loginSmoke = read("e2e/smoke/login-page.spec.ts")
  assert.ok(loginSmoke.includes(`import { expect, test } from "../support/fixtures.ts"`), "the login page smoke uses the suite's fixtures")
  assert.ok(loginSmoke.includes(`await measure.visit("/th/login", "login page")`), "the login page is a measured visit")
  const config = read("playwright.config.ts")
  assert.match(config, /\["\.\/e2e\/support\/summary-reporter\.ts"\]/)
  assert.match(config, /trace: "retain-on-failure",\n    screenshot: "only-on-failure",/)
  // The report's trace viewer is bundled JS: ESLint leaves the report and the results alone.
  const eslint = read("eslint.config.mjs")
  for (const folder of [`"e2e-report/**",`, `"e2e-results/**",`]) assert.ok(eslint.includes(folder), `eslint ignores ${folder}`)
})

test("one smoke spec per E2E user lands on its page with the run's session, through the suite's fixtures (e2e foundation task 5, EF5)", async () => {
  const { E2E_USER_KEYS } = await import("../e2e/support/run-plan.ts")
  const specs = filesUnder("e2e").filter((file) => file.endsWith(".spec.ts"))
  const smoke = specs.filter((file) => file.startsWith("e2e/smoke/") && file !== "e2e/smoke/login-page.spec.ts").sort()
  assert.deepEqual(smoke, ["e2e/smoke/employee.spec.ts", "e2e/smoke/it-head.spec.ts", "e2e/smoke/it-staff.spec.ts", "e2e/smoke/viewer.spec.ts"])
  const slugs: Record<string, string> = { itStaff: "it-staff", itHead: "it-head", viewer: "viewer", employee: "employee" }
  for (const key of E2E_USER_KEYS) {
    const source = read(`e2e/smoke/${slugs[key]}.spec.ts`)
    assert.ok(source.split("\n").includes(`asUser("${key}")`), `${key}: asUser`)
    assert.ok(source.includes(`await expectLanding(page, measure, "${key}", e2eTheme)`), `${key}: expectLanding`)
  }
  // Spec §8: IT staff walk the audit and deliver at the desk, so their phone runs are WebKit; the others stay Chromium.
  assert.deepEqual(smoke.filter((file) => read(file).split("\n").includes("runPhoneOnWebKit()")), ["e2e/smoke/it-staff.spec.ts"])
  // Every spec takes test from the suite's fixtures, so every test is measured, themed and signed in.
  for (const file of specs) assert.ok(!read(file).includes(`from "@playwright/test"`), file)
  const landing = read("e2e/support/landing.ts")
  assert.ok(landing.includes(`await measure.visit("/th", `), "the landing is a measured visit")
  assert.ok(landing.includes(`toHaveAttribute("data-theme", theme)`), "the landing carries the project's theme")
  assert.ok(landing.includes(`page.request.get("/api/auth/session")`), "the session is the user's")
})
