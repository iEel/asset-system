import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import {
  assetComponentHistoryColumn,
  buildAssetComponentHistory,
  type AssetComponentLinkRow,
} from "../src/lib/asset-component-history-rules.ts"

const at = (iso: string) => new Date(iso)
const asset = (id: string, assetTag: string, name: string, isActive = true) => ({ id, assetTag, name, isActive })
const A = asset("A", "GRL-COM-26-0017", "Notebook")
const C1 = asset("C1", "GRL-COM-26-0017-03", "RAM 8GB DDR5")
const C2 = asset("C2", "GRL-COM-26-0017-02", "Mouse ไร้สาย", false)
const P = asset("P", "GRL-NVR-26-0001", "NVR")
const P2 = asset("P2", "GRL-NVR-25-0004", "NVR เดิม")
const link = (row: Partial<AssetComponentLinkRow> & Pick<AssetComponentLinkRow, "id" | "parentAsset" | "componentAsset" | "installedAt">): AssetComponentLinkRow => ({
  parentAssetId: row.parentAsset.id,
  componentAssetId: row.componentAsset.id,
  removedAt: null,
  reason: null,
  referenceType: null,
  referenceId: null,
  ...row,
})
const repair = { kind: "repair" as const, id: "t1", code: "MT-20260802-0001" }
const documentOf = ({ referenceType, referenceId }: { referenceType: string | null; referenceId: string | null }) =>
  referenceType === "maintenance" && referenceId === "t1" ? repair : null

const rows = [
  link({ id: "l2", parentAsset: A, componentAsset: C2, installedAt: at("2026-01-10T03:00:00Z") }),
  link({ id: "l1", parentAsset: A, componentAsset: C1, installedAt: at("2026-01-10T03:00:00Z"), removedAt: at("2026-08-02T04:00:00Z"), reason: "ระหว่างงานซ่อม", referenceType: "maintenance", referenceId: "t1" }),
  link({ id: "l3", parentAsset: P, componentAsset: A, installedAt: at("2026-03-01T02:00:00Z"), reason: "ติดตั้งตอนสร้างทรัพย์สิน", referenceType: "asset_component", referenceId: "l3" }),
  link({ id: "l4", parentAsset: P2, componentAsset: A, installedAt: at("2025-05-01T02:00:00Z"), removedAt: at("2025-12-01T02:00:00Z"), reason: "ย้ายไปเครื่องใหม่" }),
  link({ id: "stray", parentAsset: P, componentAsset: C1, installedAt: at("2026-02-01T02:00:00Z") }),
]

test("install and remove events from both sides, newest first; a row's one reason and reference belong to its latest event (spec §7.7)", () => {
  assert.deepEqual(buildAssetComponentHistory(rows, "A", documentOf), [
    { id: "l1:remove", at: at("2026-08-02T04:00:00Z"), kind: "component_remove", other: C1, reason: "ระหว่างงานซ่อม", document: repair },
    { id: "l3:install", at: at("2026-03-01T02:00:00Z"), kind: "installed_in_parent", other: P, reason: "ติดตั้งตอนสร้างทรัพย์สิน", document: null },
    { id: "l1:install", at: at("2026-01-10T03:00:00Z"), kind: "component_install", other: C1, reason: null, document: null },
    { id: "l2:install", at: at("2026-01-10T03:00:00Z"), kind: "component_install", other: C2, reason: null, document: null },
    { id: "l4:remove", at: at("2025-12-01T02:00:00Z"), kind: "removed_from_parent", other: P2, reason: "ย้ายไปเครื่องใหม่", document: null },
    { id: "l4:install", at: at("2025-05-01T02:00:00Z"), kind: "installed_in_parent", other: P2, reason: null, document: null },
  ])
  const same = link({ id: "l5", parentAsset: A, componentAsset: C1, installedAt: at("2026-04-01T02:00:00Z"), removedAt: at("2026-04-01T02:00:00Z") })
  assert.deepEqual(buildAssetComponentHistory([same], "A", documentOf).map((event) => event.id), ["l5:remove", "l5:install"], "at one instant the removal reads first")
  assert.deepEqual(buildAssetComponentHistory([], "A", documentOf), [])
})

test("the third column names what the rows hold: components, a parent, or both (spec §7.7)", () => {
  assert.equal(assetComponentHistoryColumn([{ kind: "component_install" }, { kind: "component_remove" }]), "component")
  assert.equal(assetComponentHistoryColumn([{ kind: "installed_in_parent" }, { kind: "removed_from_parent" }]), "parent")
  assert.equal(assetComponentHistoryColumn([{ kind: "component_install" }, { kind: "installed_in_parent" }]), "related")
  assert.equal(assetComponentHistoryColumn([]), "component")
})

test("the component history rules are pure", () => {
  const source = readFileSync("src/lib/asset-component-history-rules.ts", "utf8")
  assert.doesNotMatch(source, /from "@\//)
  assert.doesNotMatch(source, /\bprisma\./)
})
