import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { outstandingLinkWhere } from "../src/lib/asset-component-outstanding.ts"
import {
  disposalReadinessAssetSelect,
  disposalReadinessBlockers,
  getDisposalOutstandingComponentTags,
  getDisposalReadinessBlockers,
  getDisposalReadinessBlockersForAsset,
} from "../src/lib/disposal-readiness.ts"

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
      outstandingChildComponentTags: ["GRL-RAM-26-0001"],
      installedInParentCount: 1,
      outstandingInParentCount: 1,
      assignedLicenseCount: 4,
      hasLicenseAssignment: true,
    }),
    [
      "open_checkout",
      "active_maintenance",
      "operational_audit",
      "unresolved_audit_finding",
      "installed_child_components",
      "outstanding_child_components",
      "installed_in_parent",
      "outstanding_in_parent",
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

test("a parent with an outstanding component is blocked and the check names it; an outstanding component cannot go either (spec §8.5, P2-R17)", () => {
  const counts = { parentComponents: 0, installedInLinks: 0 }
  const parent = { _count: counts, parentComponents: [{ componentAsset: { assetTag: "GRL-RAM-26-0001" } }, { componentAsset: { assetTag: "GRL-MOU-26-0002" } }], installedInLinks: [] }
  assert.deepEqual(getDisposalReadinessBlockersForAsset(parent), ["outstanding_child_components"])
  assert.deepEqual(getDisposalOutstandingComponentTags(parent), ["GRL-RAM-26-0001", "GRL-MOU-26-0002"])
  const component = { _count: counts, parentComponents: [], installedInLinks: [{ id: "link-1" }] }
  assert.deepEqual([getDisposalReadinessBlockersForAsset(component), getDisposalOutstandingComponentTags(component)], [["outstanding_in_parent"], []])
  assert.deepEqual(getDisposalReadinessBlockersForAsset({ _count: {} }), [], "a fake that answers _count only stays clear")
  assert.deepEqual(disposalReadinessAssetSelect.parentComponents, { where: outstandingLinkWhere, orderBy: { installedAt: "asc" }, take: 10, select: { componentAsset: { select: { assetTag: true } } } })
  assert.deepEqual(disposalReadinessAssetSelect.installedInLinks, { where: outstandingLinkWhere, take: 1, select: { id: true } })
  const installedOnly = { where: { status: "installed", removedAt: null } }
  assert.deepEqual([disposalReadinessAssetSelect._count.select.parentComponents, disposalReadinessAssetSelect._count.select.installedInLinks], [installedOnly, installedOnly], "the installed counts stay installed only")
})

test("every blocker has words, and both screens read them with the tags (spec §8.5 'the readiness check names it')", () => {
  const words = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).disposalPage.readinessBlockers
  for (const locale of ["th", "en"] as const) for (const key of [...disposalReadinessBlockers, "lifecycle_status"]) assert.equal(typeof words(locale)[key], "string", `${locale} ${key}`)
  assert.deepEqual([words("th").outstanding_child_components, words("th").outstanding_in_parent], ["ยังมีส่วนควบค้างคืน: {tags}", "เป็นส่วนควบค้างคืน รับคืนหรือถอดส่วนควบก่อน"])
  assert.deepEqual([words("en").outstanding_child_components, words("en").outstanding_in_parent], ["Outstanding components not returned yet: {tags}", "This component is outstanding. Return it or remove it from its parent first."])
  for (const file of ["src/app/[locale]/(dashboard)/assets/[id]/page.tsx", "src/components/disposal/disposal-asset-picker.tsx"]) {
    const calls = [...readFileSync(file, "utf8").matchAll(/\(`readinessBlockers\.\$\{[^}]+\}`([^)]*)\)/g)]
    assert.ok(calls.length > 0, file)
    for (const call of calls) assert.match(call[1], /^, \{ tags: /, file)
  }
  assert.match(readFileSync("src/lib/asset-detail-frame.ts", "utf8"), /disposalOutstandingComponentTags: readiness \? getDisposalOutstandingComponentTags\(readiness\) : \[\]/)
  // The picker's option comes from the shared mapper (inspection-confirm plan 4 task 4).
  assert.match(readFileSync("src/lib/disposal-asset-option.ts", "utf8"), /outstandingComponentTags: getDisposalOutstandingComponentTags\(asset\),/)
})

test("the asset search item carries assetTag, name and the register's Serial (null when none)", () => {
  // The route maps its options with the shared mapper (inspection-confirm plan 4 task 4).
  assert.match(readFileSync("src/app/api/disposal-assets/route.ts", "utf8"), /toDisposalAssetOption\(asset, disposalType\)/)
  const route = readFileSync("src/lib/disposal-asset-option.ts", "utf8")
  assert.match(route, /serialNumber: true,/)
  // \s+ spans CRLF and LF checkouts alike.
  assert.match(route, /assetTag: asset\.assetTag,\s+name: asset\.name,\s+serialNumber: asset\.serialNumber \?\? null,/)
  const picker = readFileSync("src/components/disposal/disposal-asset-picker.tsx", "utf8")
  assert.match(picker, /assetTag\?: string\s+name\?: string\s+serialNumber\?: string \| null/)
})
