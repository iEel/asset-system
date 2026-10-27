import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { auditScanRowFromRecordedFind } from "../src/components/audit/audit-scan-helpers.ts"
import type { AuditLookupAsset, AuditLookupRecordedFind } from "../src/components/audit/audit-scan-types.ts"

// Group 2 plan 3 final review, minor items 1, 2, 4-7 (item 3 is pinned in audit-scan-out-of-scope-rescan.test.ts and
// audit-item-review-state.test.ts). The walk needs a browser, so its behaviour is pinned in the source, read with LF.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const A = "src/components/audit/"
const between = (source: string, start: string, end: string) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)))

test("minor 1: dismissing a recorded find's sheet clears the search it opened through, as a save does", () => {
  const workspace = read(`${A}audit-scan-workspace.tsx`)
  const closeTarget = between(workspace, "function closeTarget", "function openOutOfScope")
  assert.match(closeTarget, /if \(target\?\.kind === "out_of_scope" && target\.recorded\) \{\n\s+setDraft\(""\)\n\s+changeTerm\(""\)\n\s+setOutOfScopeHint\(false\)\n\s+\}\n\s+setTarget\(null\)/)
  // The list, the camera and the deep link all reach the recorded find through the search, so each closes through here.
  assert.match(workspace, /onDismiss=\{closeTarget\}/)
  assert.match(workspace, /if \(!open\) closeTarget\(\)/)
})

test("minor 2: a recorded find not in state opens from the lookup's own answer, with its snapshot and what was recorded", () => {
  const item: AuditLookupRecordedFind = {
    id: "item-x1", assetId: "asset-x1", auditStatus: "reviewed", auditResult: "out_of_scope",
    expectedLocationId: "loc-1", expectedCustodianId: null, expectedDepartmentId: "dept-1", expectedConditionId: "good",
    actualLocationId: "loc-2", actualCustodianId: "emp-1", actualDepartmentId: "dept-2", actualConditionId: "fair",
  }
  const asset = {
    id: "asset-x1", assetTag: "GRL-COM-26-0099", title: "GRL-COM-26-0099", subtitle: "Notebook", serialNumber: "SN-1",
    currentLocationId: "loc-9", custodianId: "emp-9", departmentId: "dept-9", conditionId: "good", ownershipType: "personal",
    meta: { location: "", custodian: null }, components: [], installedIn: [],
  } as AuditLookupAsset
  const row = auditScanRowFromRecordedFind(item, asset)
  assert.equal(row.itemId, "item-x1")
  assert.deepEqual([row.assetId, row.assetTag, row.name, row.serialNumber, row.ownershipType], ["asset-x1", "GRL-COM-26-0099", "Notebook", "SN-1", "personal"])
  assert.deepEqual(
    [row.expectedLocationId, row.expectedCustodianId, row.expectedDepartmentId, row.expectedConditionId],
    ["loc-1", null, "dept-1", "good"],
    "the snapshot the first scan compared against, never the master",
  )
  assert.deepEqual([row.actualLocationId, row.actualCustodianId, row.actualDepartmentId, row.actualConditionId], ["loc-2", "emp-1", "dept-2", "fair"])
  assert.deepEqual([row.auditStatus, row.auditResult], ["reviewed", "out_of_scope"])
})

test("minor 4: a component's ไม่พบ can be pressed only while the component is pending (mark-not-found takes pending items only)", () => {
  const panels = read(`${A}audit-scan-panels.tsx`)
  assert.match(panels, /disabled=\{rowDisabled \|\| !isAuditComponentPending\(component\)\} onClick=\{\(\) => onMarkMissing\(component\)\}/)
})

test("minor 5: with the out-of-scope hint on, Enter opens an own item only on an exact code; otherwise it runs the register lookup", () => {
  const workspace = read(`${A}audit-scan-workspace.tsx`)
  const submit = between(workspace, "function submitSearch", "function pickRegisterMatch")
  assert.match(submit, /if \(outOfScopeHint && search\.matches\[0\]\?\.tier !== 0\) \{\n\s+void searchRegister\(\)\n\s+return\n\s+\}/)
  assert.ok(submit.indexOf("outOfScopeHint") < submit.indexOf("openItem(search.matches[0].item, true)"), "the hint is checked before the first match opens")
})

test("minor 6: a room or department not in the options reads ไม่อยู่ในรายการ on the room button, the picker, the rows and the results", () => {
  const session = read("src/lib/audit-scan-session.ts")
  const options = between(session, "export function buildRoomOptions", "export type AuditRoomProgress")
  assert.match(options, /label: locationLabels\.get\(locationId\) \?\? notInListLabel,/)
  assert.match(options, /label: departmentLabels\.get\(departmentId\) \?\? notInListLabel,/)
  assert.doesNotMatch(options, /\?\? (?:locationId|departmentId)\b/)
  assert.match(read(`${A}audit-scan-workspace.tsx`), /buildRoomOptions\(items, options\.locations, options\.departments, notInList\)/)
  assert.match(read(`${A}audit-scan-room-list.tsx`), /locationLabels\.get\(item\.expectedLocationId\) \?\? t\("valueNotInList"\) : null/)
  assert.match(read(`${A}audit-scan-search.tsx`), /locationLabels\.get\(match\.item\.expectedLocationId\) \?\? t\("valueNotInList"\)/)
  for (const file of ["audit-scan-room-list.tsx", "audit-scan-search.tsx"]) {
    assert.doesNotMatch(read(`${A}${file}`), /\?\? (?:match\.)?item\.expectedLocationId/, file)
  }
})

test("minor 7: the sheet title line's Serial is a message, th and en", () => {
  const workspace = read(`${A}audit-scan-workspace.tsx`)
  assert.match(workspace, /<> · \{t\("sheetSerial"\)\} <span className="tag whitespace-normal break-all">\{targetSerial\}<\/span><\/>/)
  assert.doesNotMatch(workspace, /· Serial </)
  for (const locale of ["th", "en"]) {
    assert.equal(JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).auditScan.sheetSerial, "Serial", locale)
  }
})
