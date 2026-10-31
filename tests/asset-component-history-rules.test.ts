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
  status: "installed",
  updatedAt: row.installedAt,
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

test("a link a return left out reads ส่วนควบค้างคืน with its RT-, and one brought back late รับคืนส่วนควบค้างคืน; the installation keeps its own reason (group 3 spec §8.5, §8.6, plan 2 Task 12)", () => {
  const rt = { kind: "checkin" as const, id: "rt-1", code: "RT-202610-0001" }
  const documentOfRt = ({ referenceType, referenceId }: { referenceType: string | null; referenceId: string | null }) =>
    referenceType === "checkin" && referenceId === "rt-1" ? rt : null
  const out = link({ id: "o1", parentAsset: A, componentAsset: C1, installedAt: at("2026-01-10T03:00:00Z"), reason: "ติดตั้งตอนสร้างทรัพย์สิน", status: "outstanding", referenceType: "checkin", referenceId: "rt-1", updatedAt: at("2026-10-20T04:00:00Z") })
  assert.deepEqual(buildAssetComponentHistory([out], "A", documentOfRt), [
    { id: "o1:outstanding", at: at("2026-10-20T04:00:00Z"), kind: "component_outstanding", other: C1, reason: null, document: rt },
    { id: "o1:install", at: at("2026-01-10T03:00:00Z"), kind: "component_install", other: C1, reason: "ติดตั้งตอนสร้างทรัพย์สิน", document: null },
  ])
  // The component's own page reads the same link from its side.
  assert.deepEqual(buildAssetComponentHistory([out], "C1", documentOfRt).map((event) => [event.id, event.kind, event.other.id]), [
    ["o1:outstanding", "component_outstanding", "A"],
    ["o1:install", "installed_in_parent", "A"],
  ])
  // Re-attached by the late return: installed again, still under the RT- (Task 5 keeps the reference).
  const back = { ...out, status: "installed", updatedAt: at("2026-10-25T03:00:00Z") }
  assert.deepEqual(buildAssetComponentHistory([back], "A", documentOfRt).map((event) => [event.id, event.kind, event.reason, event.document?.code ?? null]), [
    ["o1:return", "component_late_return", null, "RT-202610-0001"],
    ["o1:install", "component_install", "ติดตั้งตอนสร้างทรัพย์สิน", null],
  ])
  // Standing alone, the link ended under the RT-: a removal, as Task 5's component_remove on the parent.
  const ended = { ...out, status: "removed", removedAt: at("2026-10-25T00:00:00Z"), updatedAt: at("2026-10-25T03:00:00Z") }
  assert.deepEqual(buildAssetComponentHistory([ended], "A", documentOfRt).map((event) => [event.id, event.kind, event.document?.code ?? null]), [
    ["o1:remove", "component_remove", "RT-202610-0001"],
    ["o1:install", "component_install", null],
  ])
  // ถอดออก of an outstanding or re-attached link writes its own reference (final review journeys-2): a removal, no RT-.
  const removedByHand = { ...out, status: "removed", removedAt: at("2026-10-26T02:00:00Z"), updatedAt: at("2026-10-26T02:00:00Z"), reason: "ไม่ได้คืน", referenceType: "asset_component", referenceId: "o1" }
  assert.deepEqual(buildAssetComponentHistory([removedByHand], "A", documentOfRt).map((event) => [event.id, event.kind, event.reason, event.document?.code ?? null]), [
    ["o1:remove", "component_remove", "ไม่ได้คืน", null],
    ["o1:install", "component_install", null, null],
  ])
  // Links with any other reference read as before.
  assert.equal(buildAssetComponentHistory(rows, "A", documentOf).some((event) => event.kind === "component_outstanding" || event.kind === "component_late_return"), false)
})
