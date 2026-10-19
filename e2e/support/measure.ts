// The measurements of one test, collected in the browser (spec §3.3, §8 "Per step"): console errors and page errors,
// responses with an error status and requests that failed, axe on every page the test visits, the page load time, a
// screenshot at the end, and the test's summary row. The rules live in measure-core.ts; the fixture in fixtures.ts
// starts a Measure before the test and finishes it after, so every test is measured.
import AxeBuilder from "@axe-core/playwright"
import type { Page, Request, Response, TestInfo } from "@playwright/test"
import { ALLOW_LIST } from "./allow-list.ts"
import {
  AXE_TAGS,
  axeCounts,
  classify,
  measurementProblems,
  splitOfflineRecords,
  type Classified,
  type ConsoleRecord,
  type ExpectedRefusal,
  type FailureRecord,
  type PageRecord,
  type ResponseRecord,
  type TestSummary,
  SUMMARY_ATTACHMENT,
} from "./measure-core.ts"

export class Measure {
  readonly page: Page
  readonly testInfo: TestInfo
  readonly context: { device: string; theme: string; browser: string; user: string | null }
  readonly consoleRecords: ConsoleRecord[] = []
  readonly responses: ResponseRecord[] = []
  readonly failures: FailureRecord[] = []
  readonly pages: PageRecord[] = []
  readonly timings: { label: string; ms: number }[] = []
  readonly refusals: ExpectedRefusal[] = []
  readonly screenshots: string[] = []
  readonly offlineAllowed: Classified["allowed"] = []

  constructor(page: Page, testInfo: TestInfo, context: Measure["context"]) {
    this.page = page
    this.testInfo = testInfo
    this.context = context
  }

  start() {
    this.page.on("console", (message) => {
      if (message.type() !== "error") return
      this.consoleRecords.push({ kind: "console", text: message.text(), url: message.location().url || undefined, pageUrl: this.page.url() })
    })
    this.page.on("pageerror", (error) => {
      this.consoleRecords.push({ kind: "pageerror", text: `${error.name}: ${error.message}`, pageUrl: this.page.url() })
    })
    this.page.on("response", (response: Response) => {
      if (response.status() < 400) return
      const request = response.request()
      this.responses.push({ method: request.method(), url: response.url(), status: response.status(), resourceType: request.resourceType(), pageUrl: this.page.url() })
    })
    this.page.on("requestfailed", (request: Request) => {
      this.failures.push({
        method: request.method(),
        url: request.url(),
        errorText: request.failure()?.errorText ?? "unknown",
        resourceType: request.resourceType(),
        pageUrl: this.page.url(),
      })
    })
  }

  // A refusal the test itself asserts (spec §3.3: "other than the expected refusals"): call it before the step.
  expectRefusal(refusal: ExpectedRefusal) {
    this.refusals.push(refusal)
  }

  // The test takes the browser offline itself for the steps of step (spec §6.2.3, the audit walk's offline queue), and
  // the browser is back online when step ends. A request that fails meanwhile with the browser's offline error, and its
  // console line, are the test's own, as an expected refusal is: listed as allowed ("offline-by-the-test"). Any other
  // record, and any record after the window, still counts.
  async whileOffline<T>(step: () => Promise<T>): Promise<T> {
    const from = { console: this.consoleRecords.length, failures: this.failures.length }
    await this.page.context().setOffline(true)
    try {
      return await step()
    } finally {
      await this.page.context().setOffline(false)
      const split = splitOfflineRecords({ console: this.consoleRecords, failures: this.failures }, from)
      this.consoleRecords.splice(0, this.consoleRecords.length, ...split.console)
      this.failures.splice(0, this.failures.length, ...split.failures)
      this.offlineAllowed.push(...split.allowed)
    }
  }

  // Open a page as a person does: navigate, wait for it to load, record its load time, and run axe on it.
  async visit(path: string, label = path): Promise<PageRecord> {
    await this.page.goto(path, { waitUntil: "load" })
    return this.recordPage(label)
  }

  // Record the page on screen now (after a client-side navigation or with a dialog open): timing when it is a fresh
  // document, and axe. A page reached by a client-side navigation keeps the first document's navigation entry, so its
  // path differs from the entry's: it records no load time (null), never the first document's again (suite note SN2).
  async recordPage(label: string): Promise<PageRecord> {
    const timing = await this.page.evaluate(() => {
      const [navigation] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[]
      if (!navigation || navigation.loadEventEnd === 0 || new URL(navigation.name).pathname !== location.pathname) return null
      return { loadMs: Math.round(navigation.loadEventEnd - navigation.startTime), domContentLoadedMs: Math.round(navigation.domContentLoadedEventEnd - navigation.startTime) }
    })
    const record: PageRecord = { label, url: this.page.url(), loadMs: timing?.loadMs ?? null, domContentLoadedMs: timing?.domContentLoadedMs ?? null, axe: null }
    const results = await new AxeBuilder({ page: this.page }).withTags([...AXE_TAGS]).analyze()
    record.axe = axeCounts(results.violations)
    this.pages.push(record)
    return record
  }

  // Time a step that is not a page load (a client-side navigation, a save): recorded, never asserted (spec §8).
  async timed<T>(label: string, step: () => Promise<T>): Promise<T> {
    const started = Date.now()
    const result = await step()
    this.timings.push({ label, ms: Date.now() - started })
    return result
  }

  async screenshot(name: string) {
    const file = this.testInfo.outputPath(`${name}.png`)
    await this.page.screenshot({ path: file, fullPage: true })
    this.screenshots.push(file)
    await this.testInfo.attach(name, { path: file, contentType: "image/png" })
  }

  // After the test: the end screenshot (spec §8: at each workflow's end and on any failure), the summary row, then the
  // measurements' verdict. A problem fails the test, with every problem listed.
  async finish() {
    if (!this.page.isClosed()) await this.screenshot("end").catch(() => undefined)
    const classified = classify({ console: this.consoleRecords, responses: this.responses, failures: this.failures }, ALLOW_LIST, this.refusals)
    const problems = measurementProblems(classified, this.pages)
    const summary: Omit<TestSummary, "status" | "expectedStatus" | "durationMs" | "errors"> = {
      title: this.testInfo.titlePath.slice(1).join(" › "),
      file: this.testInfo.file,
      project: this.testInfo.project.name,
      device: this.context.device,
      theme: this.context.theme,
      browser: this.context.browser,
      user: this.context.user,
      pages: this.pages,
      timings: this.timings,
      allowed: [...classified.allowed, ...this.offlineAllowed],
      expected: classified.expected,
      problems,
      screenshots: this.screenshots,
    }
    await this.testInfo.attach(SUMMARY_ATTACHMENT, { body: JSON.stringify(summary), contentType: "application/json" })
    if (problems.length > 0) throw new Error(`Measurements failed (${problems.length}):\n- ${problems.join("\n- ")}`)
  }
}
