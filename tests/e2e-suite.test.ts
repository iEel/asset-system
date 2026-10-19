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
