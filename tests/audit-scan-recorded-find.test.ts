import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 2 plan 3 Task 4 (P3-R3, P3-R4): a find recorded out of scope stays out of scope on the phone. It opens through the
// register lookup as the out-of-scope form, from a typed tag, a decoded code, a register pick or the round page's
// "แก้ไขผลตรวจ", and saves through submitOutOfScope (evidence first, online only). Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const WORKSPACE = "src/components/audit/audit-scan-workspace.tsx"
const FORM = "src/components/audit/audit-scan-check-form.tsx"
const ROUND_PAGE = "src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx"

test("a lookup that finds a recorded find opens its out-of-scope form on that record, before the first-record card (P3-R3)", () => {
  const workspace = read(WORKSPACE)
  const branch = workspace.slice(workspace.indexOf('if (payload.status === "out_of_scope" && payload.item) {'), workspace.indexOf('if (payload.status === "out_of_scope") {'))
  assert.ok(branch.length > 0, "the recorded branch comes before the first-record branch")
  assert.match(branch, /const recordedId = payload\.item\.id/)
  // A record not in state yet opens from the lookup's own answer, never a sync that can come back empty (final review minor 2).
  assert.match(branch, /const recorded = items\.find\(\(row\) => row\.itemId === recordedId\) \?\? auditScanRowFromRecordedFind\(payload\.item, payload\.asset\)\n\s+setLookup\(\{ status: "idle" \}\)\n\s+openOutOfScope\(payload\.asset, recorded\)\n\s+return/)
  assert.doesNotMatch(branch, /syncNow|status: "error"/)
  assert.doesNotMatch(branch, /openItem\(/, "never as a round item")
  assert.match(workspace, /function openOutOfScope\(asset: AuditLookupAsset, recorded: AuditScanItemRow \| null = null\) \{[\s\S]*?setTarget\(\{ kind: "out_of_scope", asset, recorded \}\)/)
})

test("in_round and the saved banner's แก้ open own items only (P3-R1, P3-R3)", () => {
  const workspace = read(WORKSPACE)
  assert.match(workspace, /const item = findAuditScanOwnItem\(items, payload\.asset\.id\) \?\? findAuditScanOwnItem\(await syncNow\(\), payload\.asset\.id\)/)
  assert.match(workspace, /const item = findAuditScanOwnItem\(items, saved\.assetId\)/)
  assert.doesNotMatch(workspace, /An out-of-scope record saved by someone else becomes a round item/)
  assert.doesNotMatch(workspace, /items\.find\(\(row\) => row\.assetId === (?:payload\.asset\.id|saved\.assetId)\)/)
})

test("the deep link to a recorded find types its tag and runs the lookup once, never opening it as a round item (P3-R4)", () => {
  const workspace = read(WORKSPACE)
  assert.match(workspace, /initialAssetId \? initialItems\.find\(\(row\) => row\.assetId === initialAssetId\)/)
  assert.match(workspace, /return item && isAuditRoundOwnItem\(item\) \? \{ kind: "item", item, openedMode: getCheckMode\(item\) \} : null/)
  assert.match(workspace, /return item && !isAuditRoundOwnItem\(item\) \? item\.assetTag : null/)
  assert.match(workspace, /const \[draft, setDraft\] = useState\(initialRecordedTag \?\? ""\)\n\s+const \[term, setTerm\] = useState\(initialRecordedTag \?\? ""\)/)
  assert.ok(workspace.indexOf("const initialRecordedTag = useMemo") < workspace.indexOf("const [draft, setDraft]"), "declared before the search state it fills")
  assert.match(workspace, /const \[roomPickerDismissed, setRoomPickerDismissed\] = useState\(initialTarget !== null \|\| initialRecordedTag !== null\)/)
  assert.match(workspace, /const lookUpInitialRecordedFind = useEffectEvent\(\(\) => \{\n\s+if \(initialRecordedTag\) void searchRegister\(initialRecordedTag\)\n\s+\}\)/)
  const mount = workspace.slice(workspace.indexOf("const timer = window.setTimeout(() => {"), workspace.indexOf("}, [initialTarget, loadComponents, refreshQueue])"))
  assert.match(mount, /void refreshQueue\(\)\n\s+if \(initialTarget\?\.kind === "item"\) void loadComponents\(initialTarget\.item\.assetId\)\n\s+lookUpInitialRecordedFind\(\)/)
  assert.match(workspace, /^import \{ isAuditRoundOwnItem \} from "@\/lib\/audit-round-counts-rules"$/m)
})

test("the out-of-scope save stays online only and uploads its evidence first, for a record and an edit alike (P3-R3)", () => {
  const workspace = read(WORKSPACE)
  const outOfScope = workspace.slice(workspace.indexOf("async function submitOutOfScope"), workspace.indexOf("async function confirmComponent"))
  assert.ok(outOfScope.indexOf("evidenceAttachmentIds.push") < outOfScope.indexOf("/scan`"))
  assert.doesNotMatch(outOfScope, /queueOffline|upsertQueuedAuditScanAsync|resultCorrection/, "never queued; the server decides a re-scan from the item")
})

test("the form compares a recorded find with the first scan's snapshot and starts from what was recorded (P3-R3)", () => {
  const form = read(FORM)
  assert.match(form, /\| \{ kind: "out_of_scope"; asset: AuditLookupAsset; recorded: AuditScanItemRow \| null \}/)
  assert.match(form, /const expected = target\.kind === "item"\n\s+\? expectedCheckValues\(target\.item\)\n\s+: target\.recorded \? expectedCheckValues\(target\.recorded\) : masterCheckValues\(lookupMasterValues\(target\.asset\)\)/)
  assert.match(form, /: target\.recorded\n\s+\? buildCheckDefaults\(\{ mode: "edit", item: target\.recorded, room \}\)\n\s+: buildCheckDefaults\(\{ mode: "out_of_scope", master: lookupMasterValues\(target\.asset\), room \}\)/)
  assert.match(form, /if \(target\.kind === "out_of_scope"\) return target\.recorded \? t\("sheetStatusOutOfScopeRecorded"\) : t\("sheetStatusOutOfScope"\)/)
  // The mode stays out_of_scope: the save label is the out-of-scope one.
  assert.match(form, /const mode: AuditCheckMode = target\.kind === "out_of_scope" \? "out_of_scope" : target\.openedMode/)
  // P3-R18: a recorded find asks a photo only for a differing field this save changes, the scan route's own rule.
  assert.match(form, /^import \{ auditOutOfScopeRescanEvidenceFields \} from "@\/lib\/audit-out-of-scope-rescan"$/m)
  assert.match(form, /const recordedValues = target\.kind === "out_of_scope" && target\.recorded \? buildCheckDefaults\(\{ mode: "edit", item: target\.recorded, room \}\) : null\n\s+const photoDiff = recordedValues \? auditOutOfScopeRescanEvidenceFields\(diff, values, recordedValues\) : diff\n\s+const photoRequired = requiresCheckPhoto\(mode, photoDiff\)/)
})

test("the round page offers แก้ไขผลตรวจ on an out-of-scope row again, for audit:edit on an open round and a checked item (P3-R4)", () => {
  const page = read(ROUND_PAGE)
  assert.match(page, /const editHref = canScan && !isRoundReadOnly && item\.auditStatus !== "pending" \? buildAuditRoundScanEditHref\(\{ locale, roundId: round\.id, assetId: item\.asset\.id, returnTo: listHref \}\) : null/)
  assert.doesNotMatch(page, /auditResult !== "out_of_scope" \? buildAuditRoundScanEditHref|until plan 3/)
})

test("the recorded-find line, Thai and English", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).auditScan
  const en = JSON.parse(readFileSync("messages/en.json", "utf8")).auditScan
  assert.equal(th.sheetStatusOutOfScopeRecorded, "บันทึกนอกขอบเขตไว้แล้ว · บันทึกตอนนี้จะเป็นการแก้")
  assert.equal(en.sheetStatusOutOfScopeRecorded, "Already recorded out of scope · saving now edits it")
  assert.equal(th.sheetStatusOutOfScope, "นอกขอบเขตรอบนี้", "a first record keeps its line")
})
