import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const routeGroups = ["asset-checkouts", "asset-checkins", "asset-transfers"]

test("cancellation preview and commit routes enforce asset edit permission", () => {
  for (const group of routeGroups) {
    const preview = readFileSync(`src/app/api/${group}/[id]/cancel-preview/route.ts`, "utf8")
    const cancel = readFileSync(`src/app/api/${group}/[id]/cancel/route.ts`, "utf8")
    assert.match(preview, /requirePermission\(user, "asset", "edit"\)/, group)
    assert.match(cancel, /requirePermission\(user, "asset", "edit"\)/, group)
    assert.match(preview, /previewAssetTransactionCancellation/, group)
    assert.match(cancel, /cancelAssetTransaction/, group)
    assert.match(cancel, /expectedUpdatedAt/, group)
    assert.match(cancel, /reason/, group)
  }
})

test("open checkout queries exclude void transaction documents", () => {
  const paths = [
    "src/app/api/assets/bulk-move/route.ts",
    "src/app/api/assets/[id]/legacy-checkout/route.ts",
    "src/app/api/employees/[id]/route.ts",
    "src/app/[locale]/(dashboard)/assets/page.tsx",
    "src/lib/asset-operation-options.ts",
    "src/lib/asset-state-review-service.ts",
    "src/lib/disposal-readiness.ts",
    "src/lib/notification-summary.ts",
  ]

  for (const path of paths) {
    const source = readFileSync(path, "utf8")
    assert.match(
      source,
      /isReturned:\s*false[\s\S]{0,180}transactionStatus:\s*"active"|transactionStatus:\s*"active"[\s\S]{0,180}isReturned:\s*false/,
      path
    )
  }
})
