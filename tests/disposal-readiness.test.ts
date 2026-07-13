import assert from "node:assert/strict"
import test from "node:test"

import { getDisposalReadinessBlockers } from "../src/lib/disposal-readiness.ts"

test("allows a disposal request when no operational work is open", () => {
  assert.deepEqual(getDisposalReadinessBlockers({}), [])
})

test("reports every operational blocker instead of silently accepting the asset", () => {
  assert.deepEqual(
    getDisposalReadinessBlockers({
      openCheckoutCount: 1,
      activeMaintenanceCount: 2,
      operationalAuditItemCount: 1,
      unresolvedAuditFindingCount: 3,
      installedChildComponentCount: 2,
      installedInParentCount: 1,
      assignedLicenseCount: 4,
      hasLicenseAssignment: true,
    }),
    [
      "open_checkout",
      "active_maintenance",
      "operational_audit",
      "unresolved_audit_finding",
      "installed_child_components",
      "installed_in_parent",
      "assigned_licenses",
      "license_assignment",
    ],
  )
})

test("normalizes missing and negative readiness counts as clear", () => {
  assert.deepEqual(
    getDisposalReadinessBlockers({
      openCheckoutCount: -1,
      activeMaintenanceCount: 0,
      hasLicenseAssignment: false,
    }),
    [],
  )
})
