import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("audit scan helpers keep lookup normalization for components", async () => {
  const helpers = await import("../src/components/audit/audit-scan-helpers.ts").catch(() => null)
  assert.ok(helpers, "audit-scan-helpers.ts must be importable")

  assert.deepEqual(
    helpers.normalizeAuditLookupComponents([
      {
        assetId: "component-1",
        assetTag: "CMP-001",
        name: "RAM",
        componentRole: "memory",
        slotNo: "A1",
        auditItem: null,
      },
    ]),
    [
      {
        assetId: "component-1",
        assetTag: "CMP-001",
        name: "RAM",
        componentRole: "memory",
        slotNo: "A1",
        auditItemId: null,
        auditStatus: "out_of_round",
        auditResult: null,
      },
    ]
  )
})

test("the old scan controller is gone", () => {
  assert.equal(existsSync("src/components/audit/audit-scan-form.tsx"), false)
})

test("audit scan presentation panels stay free of data, storage and camera work", () => {
  assert.ok(existsSync("src/components/audit/audit-scan-panels.tsx"), "audit-scan-panels.tsx must exist")
  const panels = read("src/components/audit/audit-scan-panels.tsx")

  for (const component of ["AuditComponentPanel", "AuditQrScannerOverlay"]) {
    assert.match(panels, new RegExp(`export function ${component}\\b`))
  }
  assert.match(panels, /export type AuditScanTranslator/)
  assert.doesNotMatch(panels, /\bfetch\(/)
  assert.doesNotMatch(panels, /localStorage/)
  assert.doesNotMatch(panels, /startNativeAssetQrScanner/)
})

test("the workspace takes its rules from the pure session module, which depends on nothing in the app", () => {
  const workspace = read("src/components/audit/audit-scan-workspace.tsx")
  const session = read("src/lib/audit-scan-session.ts")

  assert.match(workspace, /from "@\/lib\/audit-scan-session"/)
  assert.doesNotMatch(session, /from "@\//)
  assert.doesNotMatch(session, /src\/components|components\/audit/)
  assert.doesNotMatch(workspace, /^type AuditScanLookupResponse =/m)
})
