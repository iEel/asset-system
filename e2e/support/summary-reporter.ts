// Collects every test's summary row (the e2e-summary attachment of measure.ts) into one file, e2e-results/summary.json
// (spec §8 "The report": the file the controller turns into the Thai report), and prints one line per project.
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import type { FullResult, Reporter, TestCase, TestResult } from "@playwright/test/reporter"
import { buildRunSummary, SUMMARY_ATTACHMENT, type TestSummary } from "./measure-core.ts"
import { fromRoot, RUN_FILE, SUMMARY_FILE } from "./paths.ts"
import { readRunState } from "./state.ts"

export default class SummaryReporter implements Reporter {
  readonly startedAt = new Date().toISOString()
  readonly tests: TestSummary[] = []

  onTestEnd(test: TestCase, result: TestResult) {
    const attachment = result.attachments.find((item) => item.name === SUMMARY_ATTACHMENT && item.body)
    const measured = attachment?.body ? (JSON.parse(attachment.body.toString("utf8")) as Partial<TestSummary>) : {}
    const project = test.parent.project()?.name ?? ""
    this.tests.push({
      title: measured.title ?? test.titlePath().slice(3).join(" › "),
      file: path.relative(process.cwd(), test.location.file),
      project,
      device: measured.device ?? "",
      theme: measured.theme ?? "",
      browser: measured.browser ?? "",
      user: measured.user ?? null,
      status: result.status,
      expectedStatus: test.expectedStatus,
      durationMs: result.duration,
      pages: measured.pages ?? [],
      timings: measured.timings ?? [],
      allowed: measured.allowed ?? [],
      expected: measured.expected ?? [],
      problems: measured.problems ?? [],
      screenshots: (measured.screenshots ?? []).map((file) => path.relative(process.cwd(), file)),
      errors: result.errors.map((error) => (error.message ?? String(error.value ?? "")).split("\n")[0].slice(0, 500)),
    })
  }

  onEnd(result: FullResult) {
    // A listing (--list) or a run stopped before any test leaves the last summary as it was.
    if (this.tests.length === 0) return
    const runId = existsSync(fromRoot(RUN_FILE)) ? readRunState().runId : null
    const summary = buildRunSummary(runId, this.startedAt, result.status, this.tests)
    const file = fromRoot(SUMMARY_FILE)
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, `${JSON.stringify(summary, null, 2)}\n`)
    for (const [project, counts] of Object.entries(summary.projects)) {
      console.log(`E2E ${project}: ${counts.passed} passed, ${counts.failed} failed, ${counts.expectedFailures} expected to fail, ${counts.skipped} skipped`)
    }
    console.log(`E2E summary (run ${runId ?? "none"}): ${SUMMARY_FILE}`)
  }

  printsToStdio() {
    return false
  }
}
