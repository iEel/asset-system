import test from "node:test"
import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import {
  ASSET_MOVEMENT_DOCUMENT_PERMISSION,
  ASSET_MOVEMENT_LABELLED_TYPES,
  ASSET_MOVEMENT_MIRROR_TYPES,
  assetMovementLabelKey,
  assetMovementReferenceLookup,
  buildAssetMovementDocumentHref,
} from "../src/lib/asset-movement-labels.ts"

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, out)
    else if (/\.tsx?$/.test(entry.name)) out.push(path.replaceAll("\\", "/"))
  }
  return out
}

const sources = walk("src").map((path) => ({ path, source: readFileSync(path, "utf8") }))
const movementTypes = (locale: "th" | "en") =>
  JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).asset.movementTypes as Record<string, string>

// Every file that writes AssetMovement rows. A new writer joins this list once its movement types have labels.
const WRITERS = [
  "src/app/api/assets/[id]/checkin/route.ts",
  "src/app/api/assets/[id]/checkout/route.ts",
  "src/app/api/assets/[id]/components/[componentId]/route.ts",
  "src/app/api/assets/[id]/components/route.ts",
  "src/app/api/assets/[id]/legacy-checkout/route.ts",
  "src/app/api/assets/[id]/route.ts",
  "src/app/api/assets/[id]/status-correction/route.ts",
  "src/app/api/assets/[id]/transfer/route.ts",
  "src/app/api/assets/batch/route.ts",
  "src/app/api/assets/bulk-move/route.ts",
  "src/app/api/assets/bulk-update/route.ts",
  "src/app/api/assets/import-confirm/route.ts",
  "src/app/api/assets/route.ts",
  "src/app/api/audit-findings/[id]/review/route.ts",
  "src/app/api/audit-rounds/[id]/scan/route.ts",
  "src/app/api/disposal-batches/route.ts",
  "src/app/api/disposal-requests/[id]/route.ts",
  "src/app/api/disposal-requests/route.ts",
  "src/lib/asset-component-sync.ts",
  "src/lib/asset-state-review-service.ts",
  "src/lib/asset-transaction-cancellation-prisma.ts",
  "src/lib/disposal-approval-service.ts",
  "src/lib/disposal-execution-service.ts",
  "src/lib/repair-record-service.ts",
]

// The types src can write: literals at a write or a component-sync call, the union types of the repair and cancel
// services, the audit corrections' map and its fallback, and the register edit's candidates.
function writtenMovementTypes(): Map<string, string[]> {
  const found = new Map<string, string[]>()
  const add = (type: string, path: string) => found.set(type, [...(found.get(type) ?? []), path])
  for (const { path, source } of sources) {
    for (const match of source.matchAll(/movementType:\s*"([a-z_]+)"/g)) add(match[1], path)
    for (const match of source.matchAll(/movementType:\s*((?:"[a-z_]+"\s*\|\s*)+"[a-z_]+")/g)) {
      for (const type of match[1].match(/[a-z_]+/g) ?? []) add(type, path)
    }
    for (const match of source.matchAll(/movementTypeByFindingType\[[^\]]+\]\s*\?\?\s*"([a-z_]+)"/g)) add(match[1], path)
    const map = source.match(/const movementTypeByFindingType[^=]*=\s*\{([^}]*)\}/)
    for (const match of map?.[1].matchAll(/:\s*"([a-z_]+)"/g) ?? []) add(match[1], path)
    for (const match of source.matchAll(/\[\s*"([a-z_]+_change)",/g)) add(match[1], path)
    for (const match of source.matchAll(/buildNullableMovementCandidate\("([a-z_]+)"/g)) add(match[1], path)
  }
  return found
}

test("the AssetMovement writers are the known ones, so a new writer is labelled before it ships (spec §7.6)", () => {
  const writers = sources.filter(({ source }) => /assetMovement\.create(?:Many)?\(/.test(source)).map(({ path }) => path)
  assert.deepEqual(writers.sort(), [...WRITERS].sort())
})

test("every movement type src writes has a Thai and an English label (spec §4: no English type on screen)", () => {
  const written = writtenMovementTypes()
  assert.equal(written.size, 47, [...written.keys()].sort().join(", "))
  const th = movementTypes("th")
  const en = movementTypes("en")
  for (const [type, paths] of written) {
    assert.equal(assetMovementLabelKey(type), `asset.movementTypes.${type}`, `${type} (${paths.join(", ")}) has no label`)
    assert.ok(th[type] && en[type], `${type} has no message`)
  }
  assert.deepEqual(
    [...ASSET_MOVEMENT_LABELLED_TYPES].sort(),
    [...written.keys(), "maintenance_pm_create", "maintenance_status_update"].sort(),
    "the labels are the written types plus the two older ones",
  )
  assert.deepEqual(Object.keys(th).sort(), [...ASSET_MOVEMENT_LABELLED_TYPES, "other"].sort())
})

test("an unknown type reads as other activity, and the labels use the glossary's words (spec §5)", () => {
  assert.equal(assetMovementLabelKey("something_new"), "asset.movementTypes.other")
  assert.equal(assetMovementLabelKey(""), "asset.movementTypes.other")
  assert.equal(assetMovementLabelKey("maintenance_status_update"), "asset.movementTypes.maintenance_status_update")
  const th = movementTypes("th")
  assert.equal(th.other, "ความเคลื่อนไหวอื่น")
  assert.equal(th.maintenance_create, "บันทึกซ่อม")
  assert.equal(th.maintenance_close, "ซ่อมเสร็จ")
  assert.equal(th.disposal_request, "ขอตัดจำหน่าย")
  assert.equal(th.status_correction, "แก้ไขสถานะ")
  assert.equal(th.checkout, "ส่งมอบทรัพย์สิน")
  assert.equal(movementTypes("en").maintenance_create, "Repair recorded")
})

test("the mirror rows are a component's copy of its parent's event, left out of the dashboard feed (spec §6.8)", () => {
  assert.deepEqual([...ASSET_MOVEMENT_MIRROR_TYPES].sort(), [
    "installed_in_parent",
    "parent_audit_confirmation_sync",
    "parent_audit_finding_sync",
    "parent_bulk_move_sync",
    "parent_bulk_update_sync",
    "parent_checkin_sync",
    "parent_checkout_sync",
    "parent_register_update_sync",
    "parent_transfer_sync",
    "removed_from_parent",
  ])
  const written = writtenMovementTypes()
  for (const type of ASSET_MOVEMENT_MIRROR_TYPES) assert.ok(written.has(type), type)
})

test("a movement's document: the reference type picks the record, which links to its page under its permission (spec §6.8, §7.6)", () => {
  assert.equal(assetMovementReferenceLookup("checkout"), "checkout")
  assert.equal(assetMovementReferenceLookup("checkin"), "checkin")
  assert.equal(assetMovementReferenceLookup("transfer"), "transfer")
  assert.equal(assetMovementReferenceLookup("maintenance"), "repair")
  assert.equal(assetMovementReferenceLookup("disposal"), "disposal")
  assert.equal(assetMovementReferenceLookup("audit_finding"), "auditFinding")
  assert.equal(assetMovementReferenceLookup("audit_scan"), "auditItem")
  for (const none of ["asset", "asset_component", "asset_batch_create", "asset_import", "bulk_move", "bulk_update", "asset_state_review", "", null]) {
    assert.equal(assetMovementReferenceLookup(none), null, String(none))
  }
  assert.equal(buildAssetMovementDocumentHref("th", { kind: "checkout", id: "c1", code: "HO-2026-0001" }), "/th/asset-management/checkouts/c1")
  assert.equal(buildAssetMovementDocumentHref("th", { kind: "checkin", id: "c2", code: "RT-2026-0001" }), "/th/asset-management/checkins/c2")
  assert.equal(buildAssetMovementDocumentHref("en", { kind: "transfer", id: "t1", code: "TR-2026-0001" }), "/en/asset-management/transfers/t1")
  assert.equal(buildAssetMovementDocumentHref("th", { kind: "repair", id: "m1", code: "MT-20261025-0001" }), "/th/maintenance/m1")
  assert.equal(buildAssetMovementDocumentHref("th", { kind: "disposal", id: "d1", code: "DSP-2026-0009" }), "/th/disposal/d1")
  assert.equal(buildAssetMovementDocumentHref("th", { kind: "auditRound", id: "r1", code: "AUD-2026-0003" }), "/th/audit/rounds/r1")
  assert.deepEqual(ASSET_MOVEMENT_DOCUMENT_PERMISSION, {
    checkout: { module: "asset", action: "view" },
    checkin: { module: "asset", action: "view" },
    transfer: { module: "asset", action: "view" },
    repair: { module: "maintenance", action: "view" },
    disposal: { module: "disposal", action: "view" },
    auditRound: { module: "audit", action: "view" },
  })
})
