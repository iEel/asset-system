import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  REPORT_EXPORT_KEYS,
  logReportExport,
  readLastReportExports,
  reportExportKeyFor,
} from "../src/lib/report-export-log.ts"

// Group 10 plan 1 Task 3 (spec §6.1): each export route writes one SystemLog entry (module report, action export, the
// report key, the user) when it serves a file; the catalog reads the latest entry per key. No migration.
// Sources are read with CRLF folded to LF, so the pins hold on a Windows checkout.

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const params = (query: string) => new URLSearchParams(query)

test("keys per route and params", () => {
  assert.deepEqual([...REPORT_EXPORT_KEYS], [
    "assets-overview",
    "assets-register",
    "cross-scope",
    "maintenance",
    "disposal",
    "audit-findings",
    "audit-findings-pending",
    "audit-findings-pdf",
    "role-audit",
  ])
  assert.equal(reportExportKeyFor("assets-overview", params("crossScope=all")), "assets-overview")
  assert.equal(reportExportKeyFor("assets", params("")), "assets-register")
  assert.equal(reportExportKeyFor("assets", params("statusId=x&crossScope=")), "assets-register")
  assert.equal(reportExportKeyFor("assets", params("crossScope=bogus")), "assets-register")
  assert.equal(reportExportKeyFor("assets", params("crossScope=all")), "cross-scope")
  assert.equal(reportExportKeyFor("assets", params("crossScope=custodian_branch")), "cross-scope")
  assert.equal(reportExportKeyFor("maintenance", params("status=closed")), "maintenance")
  assert.equal(reportExportKeyFor("disposal", params("")), "disposal")
  assert.equal(reportExportKeyFor("audit-findings", params("status=pending")), "audit-findings-pending")
  // The route serves the pending file when no (or an unknown) status is given, so it is the same file and key.
  assert.equal(reportExportKeyFor("audit-findings", params("")), "audit-findings-pending")
  assert.equal(reportExportKeyFor("audit-findings", params("status=all")), "audit-findings")
  assert.equal(reportExportKeyFor("audit-findings", params("status=closed")), "audit-findings")
  assert.equal(reportExportKeyFor("audit-findings", params("status=bogus")), "audit-findings-pending")
  assert.equal(reportExportKeyFor("audit-findings-pdf", params("status=pending")), "audit-findings-pdf")
  assert.equal(reportExportKeyFor("role-audit", params("")), "role-audit")
})

test("a failed log never blocks the file", async () => {
  const written: unknown[] = []
  await logReportExport("user-1", "maintenance", async (entry) => {
    written.push(entry)
  })
  assert.deepEqual(written, [{ userId: "user-1", module: "report", action: "export", recordId: "maintenance" }])
  const originalError = console.error
  console.error = () => {}
  try {
    await assert.doesNotReject(logReportExport("user-1", "disposal", async () => {
      throw new Error("database down")
    }))
  } finally {
    console.error = originalError
  }
})

test("readLastReportExports takes the latest per key", async () => {
  const calls: unknown[] = []
  const older = new Date("2026-11-01T03:00:00Z")
  const newer = new Date("2026-11-06T09:30:00Z")
  const fake = {
    systemLog: {
      async groupBy(args: object) {
        calls.push(args)
        return [
          { recordId: "maintenance", _max: { createdAt: older } },
          { recordId: "maintenance", _max: { createdAt: newer } },
          { recordId: "role-audit", _max: { createdAt: older } },
          { recordId: "not-a-key", _max: { createdAt: newer } },
          { recordId: null, _max: { createdAt: newer } },
          { recordId: "disposal", _max: { createdAt: null } },
        ]
      },
    },
  }
  const result = await readLastReportExports(fake)
  assert.deepEqual(result, { maintenance: newer, "role-audit": older })
  assert.deepEqual(calls, [{
    by: ["recordId"],
    where: { module: "report", action: "export", recordId: { in: [...REPORT_EXPORT_KEYS] } },
    _max: { createdAt: true },
  }])
})

const routes: Record<string, { file: string; call: RegExp }> = {
  "assets-overview": {
    file: "src/app/api/reports/assets-overview/export/route.ts",
    call: /await logReportExport\(user\.id, reportExportKeyFor\("assets-overview", request\.nextUrl\.searchParams\)\)/,
  },
  assets: {
    file: "src/app/api/assets/export/route.ts",
    call: /await logReportExport\(user\.id, reportExportKeyFor\("assets", request\.nextUrl\.searchParams\)\)/,
  },
  maintenance: {
    file: "src/app/api/maintenance-tickets/export/route.ts",
    call: /await logReportExport\(user\.id, reportExportKeyFor\("maintenance", request\.nextUrl\.searchParams\)\)/,
  },
  disposal: {
    file: "src/app/api/disposal-requests/export/route.ts",
    call: /await logReportExport\(user\.id, reportExportKeyFor\("disposal", request\.nextUrl\.searchParams\)\)/,
  },
  "audit-findings": {
    file: "src/app/api/audit-findings/export/route.ts",
    call: /await logReportExport\(user\.id, reportExportKeyFor\("audit-findings", request\.nextUrl\.searchParams\)\)/,
  },
  "audit-findings-pdf": {
    file: "src/app/api/audit-findings/export-pdf/route.ts",
    call: /await logReportExport\(user\.id, reportExportKeyFor\("audit-findings-pdf", request\.nextUrl\.searchParams\)\)/,
  },
  "role-audit": {
    file: "src/app/api/admin/roles/export/route.ts",
    call: /await logReportExport\(user\.id, "role-audit"\)/,
  },
}

test("each export route logs once, after the file is built and right before the file response", () => {
  for (const [route, { file, call }] of Object.entries(routes)) {
    const source = read(file)
    assert.match(source, /import \{ logReportExport(, reportExportKeyFor)? \} from "@\/lib\/report-export-log"/, `${route}: import`)
    assert.equal(source.match(/logReportExport\(/g)?.length, 1, `${route}: one call`)
    const match = source.match(call)
    assert.ok(match, `${route}: the call`)
    const at = match.index ?? -1
    // After the buffer is written, and the next statement returns the file (never a 4xx).
    assert.ok(source.lastIndexOf("const buffer = ", at) !== -1, `${route}: after the file is built`)
    const after = source.slice(at + match[0].length)
    assert.match(after, /^\n\s+return (workbookResponse|pdfResponse)\(buffer, /, `${route}: then the file response`)
    // The helper swallows its own errors; the call sits inside the route's try, before the catch's errorResponse.
    assert.ok(source.indexOf("return errorResponse(error)") > at, `${route}: inside the try`)
  }
  const helper = read("src/lib/report-export-log.ts")
  assert.match(helper, /try \{[\s\S]*?await write\(\{ userId, module: "report", action: "export", recordId: key \}\)[\s\S]*?\} catch \(error\) \{/)
})
