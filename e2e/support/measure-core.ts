// The measurements every workflow records (spec §3.3, §8 "Per step"), as pure rules: which console errors and failed
// requests a test may have (the reviewed allow-list and the refusals the test itself expects), which axe violations
// fail it (serious and critical, WCAG 2.1 AA), and the summary row of a test. tests/e2e-measure.test.ts pins them;
// e2e/support/measure.ts collects the records in the browser.

export type ConsoleRecord = { kind: "console" | "pageerror"; text: string; url?: string; pageUrl: string }
export type ResponseRecord = { method: string; url: string; status: number; resourceType: string; pageUrl: string }
export type FailureRecord = { method: string; url: string; errorText: string; resourceType: string; pageUrl: string }

// A refusal the test asserts itself (a 403 for a role without the permission, a 409 for a double checkout): it is not
// a failed request, and the browser's console line about it is not a console error.
export type ExpectedRefusal = { method?: string; url: RegExp; status: number; reason: string }

// One reviewed allow-list entry (e2e/support/allow-list.ts): what it lets through, and why that is not the app failing.
export type AllowEntry = {
  id: string
  kind: "console" | "response" | "requestfailed"
  text?: RegExp
  url?: RegExp
  status?: readonly number[]
  errorText?: RegExp
  resourceType?: readonly string[]
  // The page error a browser also raises for the same cause, when it raises one (WebKit, for a cancelled fetch): a
  // pageerror record whose text matches is allowed under this entry too. Only pageerror records, never console lines.
  pageerrorText?: RegExp
  reason: string
  reviewed: string
}

export type AxeViolation = { id: string; impact?: string | null; help: string; helpUrl: string; nodes: readonly { target: readonly unknown[] }[] }

export type PageRecord = {
  label: string
  url: string
  loadMs: number | null
  domContentLoadedMs: number | null
  axe: { serious: number; critical: number; moderate: number; minor: number; failing: { id: string; impact: string; help: string; targets: string[] }[] } | null
}

export type Classified = {
  unexpectedConsole: ConsoleRecord[]
  unexpectedResponses: ResponseRecord[]
  unexpectedFailures: FailureRecord[]
  allowed: { id: string; kind: AllowEntry["kind"]; url?: string; text?: string }[]
  expected: { reason: string; method: string; url: string; status: number }[]
  unmetRefusals: { reason: string; method?: string; url: string; status: number }[]
}

// The browser's own console line for a response with an error status (Chromium and WebKit both write one).
const RESOURCE_ERROR = /^Failed to load resource: the server responded with a status of (\d{3})/

export function refusalMatches(refusal: ExpectedRefusal, response: { method: string; url: string; status: number }): boolean {
  return response.status === refusal.status && (!refusal.method || refusal.method === response.method) && refusal.url.test(response.url)
}

function allowFor(entries: readonly AllowEntry[], kind: AllowEntry["kind"], fields: { text?: string; url?: string; status?: number; errorText?: string; resourceType?: string }) {
  return entries.find(
    (entry) =>
      entry.kind === kind &&
      (!entry.text || (fields.text !== undefined && entry.text.test(fields.text))) &&
      (!entry.url || (fields.url !== undefined && entry.url.test(fields.url))) &&
      (!entry.status || (fields.status !== undefined && entry.status.includes(fields.status))) &&
      (!entry.errorText || (fields.errorText !== undefined && entry.errorText.test(fields.errorText))) &&
      (!entry.resourceType || (fields.resourceType !== undefined && entry.resourceType.includes(fields.resourceType)))
  )
}

export function classify(
  records: { console: readonly ConsoleRecord[]; responses: readonly ResponseRecord[]; failures: readonly FailureRecord[] },
  allowList: readonly AllowEntry[],
  refusals: readonly ExpectedRefusal[]
): Classified {
  const result: Classified = { unexpectedConsole: [], unexpectedResponses: [], unexpectedFailures: [], allowed: [], expected: [], unmetRefusals: [] }
  const met = new Set<ExpectedRefusal>()
  const refusedUrls = new Set<string>()
  const allowedUrls = new Set<string>()
  for (const response of records.responses) {
    const refusal = refusals.find((candidate) => refusalMatches(candidate, response))
    if (refusal) {
      met.add(refusal)
      refusedUrls.add(`${response.status} ${response.url}`)
      result.expected.push({ reason: refusal.reason, method: response.method, url: response.url, status: response.status })
      continue
    }
    const entry = allowFor(allowList, "response", { url: response.url, status: response.status, resourceType: response.resourceType })
    if (entry) {
      allowedUrls.add(`${response.status} ${response.url}`)
      result.allowed.push({ id: entry.id, kind: "response", url: response.url })
      continue
    }
    result.unexpectedResponses.push(response)
  }
  for (const failure of records.failures) {
    const entry = allowFor(allowList, "requestfailed", { url: failure.url, errorText: failure.errorText, resourceType: failure.resourceType })
    if (entry) result.allowed.push({ id: entry.id, kind: "requestfailed", url: failure.url })
    else result.unexpectedFailures.push(failure)
  }
  for (const message of records.console) {
    // The console line of a refused or allowed response goes with that response.
    const status = message.text.match(RESOURCE_ERROR)?.[1]
    if (status && message.url && (refusedUrls.has(`${status} ${message.url}`) || allowedUrls.has(`${status} ${message.url}`))) continue
    const pageerrorEntry = message.kind === "pageerror" ? allowList.find((candidate) => candidate.pageerrorText?.test(message.text)) : undefined
    if (pageerrorEntry) {
      result.allowed.push({ id: pageerrorEntry.id, kind: "console", text: message.text })
      continue
    }
    const entry = allowFor(allowList, "console", { text: message.text, url: message.url })
    if (entry) result.allowed.push({ id: entry.id, kind: "console", text: message.text })
    else result.unexpectedConsole.push(message)
  }
  result.unmetRefusals = refusals
    .filter((refusal) => !met.has(refusal))
    .map((refusal) => ({ reason: refusal.reason, method: refusal.method, url: String(refusal.url), status: refusal.status }))
  return result
}

// Spec §8: no serious or critical violation on any page a workflow visits; moderate and minor are recorded only.
export function axeCounts(violations: readonly AxeViolation[]): NonNullable<PageRecord["axe"]> {
  const count = (impact: string) => violations.filter((violation) => violation.impact === impact).length
  return {
    serious: count("serious"),
    critical: count("critical"),
    moderate: count("moderate"),
    minor: count("minor"),
    failing: violations
      .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
      .map((violation) => ({
        id: violation.id,
        impact: String(violation.impact),
        help: violation.help,
        targets: violation.nodes.slice(0, 5).map((node) => node.target.map(String).join(" ")),
      })),
  }
}

// The browser's own error for a request made while the test has set it offline (context.setOffline, the audit walk's
// offline queue, spec §6.2.3): Chromium's net::ERR_INTERNET_DISCONNECTED; WebKit names every offline failure "WebKit
// encountered an internal error". Only the records made inside the test's offline window are the test's own (as an
// expected refusal is); the same text at any other moment still fails the test.
export const OFFLINE_ERROR_TEXT = /^(?:net::ERR_INTERNET_DISCONNECTED|WebKit encountered an internal error)$/
const OFFLINE_CONSOLE_TEXT = /^Failed to load resource: (?:net::ERR_INTERNET_DISCONNECTED|WebKit encountered an internal error)$/

// Splits the records from the window's first index on: the offline failures and their console lines become allowed
// entries ("offline-by-the-test"), everything else is kept as it was.
export function splitOfflineRecords(
  records: { console: readonly ConsoleRecord[]; failures: readonly FailureRecord[] },
  from: { console: number; failures: number },
): { console: ConsoleRecord[]; failures: FailureRecord[]; allowed: Classified["allowed"] } {
  const result: { console: ConsoleRecord[]; failures: FailureRecord[]; allowed: Classified["allowed"] } = { console: [], failures: [], allowed: [] }
  records.console.forEach((message, index) => {
    if (index >= from.console && OFFLINE_CONSOLE_TEXT.test(message.text)) result.allowed.push({ id: "offline-by-the-test", kind: "console", text: message.text })
    else result.console.push(message)
  })
  records.failures.forEach((failure, index) => {
    if (index >= from.failures && OFFLINE_ERROR_TEXT.test(failure.errorText)) result.allowed.push({ id: "offline-by-the-test", kind: "requestfailed", url: failure.url })
    else result.failures.push(failure)
  })
  return result
}

// The attachment that carries a test's summary row from its fixture to the summary reporter.
export const SUMMARY_ATTACHMENT = "e2e-summary"

// The axe rule set of spec §8: WCAG 2.0 and 2.1, levels A and AA.
export const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] as const

// What fails a test once its steps are done, as one readable list (empty when the measurements pass).
export function measurementProblems(classified: Classified, pages: readonly PageRecord[]): string[] {
  const problems: string[] = []
  for (const message of classified.unexpectedConsole) problems.push(`console ${message.kind}: ${message.text.slice(0, 300)} (on ${message.pageUrl})`)
  for (const response of classified.unexpectedResponses) problems.push(`request ${response.method} ${response.url} answered ${response.status} (on ${response.pageUrl})`)
  for (const failure of classified.unexpectedFailures) problems.push(`request ${failure.method} ${failure.url} failed: ${failure.errorText} (on ${failure.pageUrl})`)
  for (const refusal of classified.unmetRefusals) problems.push(`expected refusal not seen: ${refusal.method ?? "any"} ${refusal.url} ${refusal.status} (${refusal.reason})`)
  for (const page of pages) {
    for (const violation of page.axe?.failing ?? []) problems.push(`axe ${violation.impact} ${violation.id} on ${page.label}: ${violation.help} [${violation.targets.join(" | ")}]`)
  }
  return problems
}

export type TestSummary = {
  title: string
  file: string
  project: string
  device: string
  theme: string
  browser: string
  user: string | null
  status: string
  expectedStatus: string
  durationMs: number
  pages: PageRecord[]
  timings: { label: string; ms: number }[]
  allowed: Classified["allowed"]
  expected: Classified["expected"]
  problems: string[]
  screenshots: string[]
  errors: string[]
}

// The run summary the controller turns into the Thai report: every test with its outcome, and per project the counts.
export function buildRunSummary(runId: string | null, startedAt: string, status: string, tests: readonly TestSummary[]) {
  const projects: Record<string, { passed: number; failed: number; skipped: number; expectedFailures: number }> = {}
  for (const test of tests) {
    const counts = (projects[test.project] ??= { passed: 0, failed: 0, skipped: 0, expectedFailures: 0 })
    if (test.status === "skipped") counts.skipped++
    else if (test.expectedStatus === "failed" && test.status === "failed") counts.expectedFailures++
    else if (test.status === test.expectedStatus) counts.passed++
    else counts.failed++
  }
  return { runId, startedAt, finishedAt: new Date().toISOString(), status, projects, tests }
}
