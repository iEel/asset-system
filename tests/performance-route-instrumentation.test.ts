import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const routeFiles = [
  {
    file: "src/app/[locale]/(dashboard)/dashboard/page.tsx",
    labels: [
      "dashboard.initial-data",
      "dashboard.kpi-counts",
      "dashboard.recent-activity",
      "dashboard.urgent-work",
      "dashboard.approval-inbox",
      "dashboard.cross-scope",
      "dashboard.monthly-trends",
    ],
  },
  {
    file: "src/app/[locale]/(dashboard)/assets/page.tsx",
    labels: ["assets.initial-data", "assets.model-photos"],
  },
  {
    file: "src/app/[locale]/(dashboard)/assets/[id]/page.tsx",
    labels: [
      "asset-detail.initial-data",
      "asset-detail.relationship-data",
      "asset-detail.evidence-data",
      "asset-detail.operation-data",
    ],
  },
  {
    file: "src/app/[locale]/(dashboard)/reports/page.tsx",
    labels: ["reports.initial-data", "reports.lookup-data", "reports.dimension-labels"],
  },
  {
    file: "src/app/[locale]/(dashboard)/audit/rounds/page.tsx",
    labels: ["audit-rounds.initial-data", "audit-rounds.progress-data"],
  },
  {
    file: "src/app/[locale]/(dashboard)/audit/rounds/[id]/scan/page.tsx",
    labels: ["audit-scan.initial-data", "audit-scan.checklist-data"],
  },
]

test("high-latency dashboard routes include performance timing labels", () => {
  for (const { file, labels } of routeFiles) {
    const source = readFileSync(file, "utf8")

    assert.match(source, /withPerformanceTiming/)
    for (const label of labels) {
      assert.ok(source.includes(label), `${file} should include timing label ${label}`)
    }
  }
})
