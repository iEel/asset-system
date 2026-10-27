# Page Group 2 (Audit) Plan 3: The Phone Walk and the Record Sheet — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the phone walk (AU-Scan-Phone) and the record sheet (AU-Scan-Record-Phone) to the approved group 2 design: own-item counts that match the round page, a room-first search with true totals, category chips on the phone, a record sheet with "ตรง / ไม่ตรง" per compared field, and an out-of-scope find that stays out of scope when it is scanned again.

**Architecture:** The server stays the authority: the scan route gains a re-scan branch for out-of-scope finds and the register lookup reports them as recorded finds (Task 1). The walk's rules stay pure in `audit-scan-session.ts` and reuse plans 1-2's own-item helpers and result fold (Task 2), so the phone, the round page and the dashboard count alike. The UI tasks (3-5) only render those rules; the record sheet's per-field state lives in a pure reducer file beside the unchanged `diffCheckValues`. No schema change and no migration.

**Tech Stack:** Next.js 16.4 App Router (read `node_modules/next/dist/docs/` before Next code), React 19, next-intl (Thai first), Prisma 7 on SQL Server, Tailwind 4 tokens, shadcn/Radix parts, `node --test` source and rule tests, Playwright E2E (4 projects: desktop/phone × light/dark; the phone walk runs on WebKit).

**Spec:** `docs/superpowers/specs/2026-10-26-page-group-2-audit-design.md` (§5 phone rules and counts, §11, §12, §13 bugs 20-23, §15, §16 phone walk and record sheet, Appendix A §11/§12). Plans 1-2 (merged, master `0a7bb9ee`): `docs/superpowers/plans/2026-10-26-group2-audit-rounds.md`, `docs/superpowers/plans/2026-10-27-group2-audit-round-page.md`; their rulings stand unless one here replaces it.

**Base:** master `0a7bb9ee`. **Branch:** `feat/group2-audit-phone-walk`. **Dry run:** none (no migration; the audit E2E walks these pages on WebKit).

**Execution:** subagent-driven. Implementers are the `opus-medium-implementer` agent type; the main session reviews each task itself. Tasks run in order 1 → 6; line numbers are master's, and a task names each block by content where an earlier task moved it.

**E2E (the user's cadence):** after Task 6, one targeted run of `e2e/audit e2e/smoke e2e/cross-cutting/roles.spec.ts e2e/cross-cutting/field-errors.spec.ts` on the dev DB from a clean build. The whole suite runs once after plan 4.

## Global Constraints

- Words follow `docs/19_THAI_GLOSSARY.md` ("ไม่ตรง", "รายการไม่ตรง", "พบตรง", "หมวดหมู่", "Serial"). Messages change only through `node scripts/messages-edit.mjs <change file>`, th and en together; change files live in the session scratchpad. No raw code reaches the screen.
- Shared parts and tokens only (DESIGN.md): no hex or rgba in tsx, no `dark:`, no `/NN` tints; both themes. A changed shared part keeps its DESIGN.md section true.
- Permissions: `audit:view` reads; `audit:edit` scans, records not-found and edits a result; nobody else sees a scan or record control. The server checks every save.
- **Own items and one fold:** every phone count, room option, tab, chip, search and camera match reads the round's own items (`isAuditRoundOwnItem`), and the header's results fold with `foldAuditRoundResultCounts`, so the phone, the round page and the dashboard agree. Full items are kept only to merge saved results.
- **The server decides what a save means.** The record sheet's per-field ตรง / ไม่ตรง is UI state; `diffCheckValues` and the scan route's comparison stay as they are, except Task 1's out-of-scope branch.
- Phone use: 44px targets, the sticky search, no horizontal page scroll (the chip row scrolls inside itself), the main actions within one-hand reach.
- SQL Server takes about 2,100 parameters: id lists that grow with a round are chunked or bounded.
- No schema change and no migration. Pure rules files use relative `.ts` imports and `import type` only.
- Every task runs `npm test`, `npx tsc --noEmit` and `npm run lint` before its commit. A pin that fails outside the task's list is rewritten in the same commit and named in the report.
- Secrets: never read or print `.env`, `.env.prod-admin` or `.env.e2e`. Nothing writes to Production; E2E runs on the dev DB only and never runs LDAP sync, the settings save, Excel import, a failed login or a delete.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **An out-of-scope find scanned again** (from the search, the camera, the lookup, a row or the round page's edit link, online or from the offline queue): it stays นอกขอบเขต, the round's own totals do not move, and no master asset changes. Task 1's route and lookup tests and Task 6's second-scan step (the lookup path) pin it; Task 4's source tests pin the round page's edit link and its deep link (the tag typed and looked up once, no room sheet by itself), which no E2E step opens and the UAT checklist (Task 6, docs/07 items) checks by hand.
2. **Editing a result already recorded:** the sheet opens each field as the saved result had it (a field saved ไม่ตรง opens ไม่ตรง with its saved value), and saving keeps the server's diff rule. Task 5's reducer tests pin it (P3-R21).
3. **Typing in the search** with matches in this room and others, and an exact code typed for an item in another room: the exact code opens with Enter, the line's counts are the true totals, "แสดงเพิ่ม" reveals the rest. Task 2's search tests pin it (P3-R17), and Task 6's `walk-search.spec.ts` shows ten then eleven on the phone (P3-R15).
4. **A room change from any path** (the picker, "ไม่เลือกห้อง", a deep link, another tab) clears the category chip and recounts the chips within the new room and tab. Task 2 and Task 3 pin it.
5. **A field the server never compares** (custodian of a shared asset, location of a licence): it is not offered, and changing the custodian of a shared asset never creates a department finding. Task 5 pins it.

---

### Task 1: The server keeps an out-of-scope find out of scope (the scan route's re-scan branch and the lookup answer)

Today a second save of a recorded out-of-scope find goes down the in-round path of the scan route (`scan/route.ts:423-642`). It does five things wrong:
- it overwrites `auditResult` (`:430`, `:455`) and `auditStatus` (`:454`), so the find becomes an own item of the round and joins its totals;
- it creates field findings with no evidence (`:513-526`), bypassing the first scan's rule (`:118-142`);
- an approver with segregation off and the tick on updates the master asset (`:536-620`);
- the component confirm path (`:268-421`) overwrites the result with `confirmed_with_parent`;
- the lookup answers `in_round` for the find (`scan-lookup/route.ts:171-175`), so the walk opens it as a round item.

This task makes the server the authority (P3-R3). The server covers the offline queue, old tabs and the deep link as well as the walk's lookup:
- **The re-scan branch.** It runs for an existing item with `auditResult: "out_of_scope"`, after the first-scan branch and before the component confirm.
  - It keeps the result and the status.
  - It compares against the first scan's snapshot (`expected*`).
  - It needs evidence only for a field that differs from the snapshot and whose found value changes in this save (P3-R18). A remark-only edit, or a save that repeats what was recorded, needs no new photo.
  - It creates, updates and closes the field findings, and refreshes the pending `out_of_scope` finding.
  - It never touches the master. It writes a history row and a `scan_result_corrected` log.
- **The component confirm** on such an item is refused. So is a confirm whose parent is an out-of-scope find.
- **The lookup** answers `out_of_scope` with the item for a recorded find. Partial candidates and related components or parents count own items only.

There is no schema change, no migration and no word change.

**Files:**
- Create: `src/lib/audit-out-of-scope-rescan.ts` (pure, no imports). It decides which fields of a re-scan need evidence (P3-R18) and what a re-scan does to the find's field findings. Task 4's form imports the same evidence rule.
- Modify: `src/app/api/audit-rounds/[id]/scan/route.ts`:
  - `:1-16` (two imports);
  - a new branch between `:266` (the `}` that closes `if (!item) {`) and `:268` (`if (input.confirmedWithParentAssetId) {`). The first `if (!item)` (`:88`) and the first `const actual = {` (`:109`) stay where they are;
  - `:833-839` (the parent read in `assertComponentInstalledUnderParent` refuses an out-of-scope parent);
  - a new `findOutOfScopeEvidence` after `optionalActualValue` (`:774-776`).
- Modify: `src/lib/validations/audit.ts:57` (`evidenceAttachmentIds` capped at 20).
- Modify: `src/app/api/audit-rounds/[id]/scan-lookup/route.ts`:
  - `:1-7` (import);
  - `:125-129` (partial candidates count own items only);
  - `:145-153` (the item's select gains `expected*` / `actual*`);
  - `:159-164` (related items count own items only);
  - `:171-175` (a recorded find answers `out_of_scope` with its item).
- Modify: `src/components/audit/audit-scan-types.ts`:
  - `:20-25` (new `AuditLookupRecordedFind` after `AuditLookupAuditItem`);
  - `:52` (the `out_of_scope` variant gains `item?`).
- Modify: `src/lib/audit-round-counts-rules.ts:4-6` (the comment no longer says a re-scan turns the find into an own item).
- Test:
  - `tests/audit-out-of-scope-rescan.test.ts` (new, pure rules by value);
  - `tests/audit-scan-out-of-scope-rescan.test.ts` (new). It imports the route behind module mocks and copies the harness of `tests/audit-scan-edit-findings.test.ts:1-97`;
  - `tests/audit-scan-lookup-recorded-find.test.ts` (new). It imports the lookup route behind mocks and copies the harness of `tests/audit-scan-lookup-partial.test.ts:1-60`;
  - `tests/audit-scan-lookup-partial.test.ts:7`, `:31`, `:75` and one new case;
  - `tests/audit-out-of-scope-actual-field.test.ts:88` (a re-scan slice is added after it);
  - `tests/audit-round-counts.test.ts:64`, `:69`.

**Interfaces:**
- Consumes (plan 1): `isAuditRoundOwnItem(item: { auditResult: string | null }): boolean` (`src/lib/audit-round-counts-rules.ts:11-13`).
- Consumes (the scan route itself, unchanged):
  - `buildOutOfScopeFieldFindings(asset, actual)` (`:727-772`): the same skip rules as the first scan (no location for a licence, custodian only for `personal`);
  - `optionalActualValue` (`:774-776`);
  - `auditCorrectableFindingTypes` (`:43`);
  - `staleFindingReviewRemark` (`:44`, "ยกเลิกเพราะแก้ผลตรวจ"). A closing with this remark is no person's decision (`auditPersonDecidedFindingWhere`, pin `tests/audit-round-page-rules.test.ts:30-35`).
- Produces, in `src/lib/audit-out-of-scope-rescan.ts`:
  - `type AuditOutOfScopeFieldFinding = { type: string; expectedValue: string | null; actualValue: string | null }` (the shape `buildOutOfScopeFieldFindings` returns);
  - `type AuditOutOfScopeKnownFinding = { id: string; findingType: string; actualValue: string | null; reviewStatus: string }`;
  - `type AuditOutOfScopeRescanPlan = { create: AuditOutOfScopeFieldFinding[]; update: Array<{ findingId: string; finding: AuditOutOfScopeFieldFinding }>; reject: string[] }`;
  - `planAuditOutOfScopeRescanFindings(known: readonly AuditOutOfScopeKnownFinding[], fieldFindings: readonly AuditOutOfScopeFieldFinding[], changing: readonly string[]): AuditOutOfScopeRescanPlan`. `changing` is the differing types whose value this save changes from the recorded one, which is the route's `evidenceFieldTypes`. A finding is created only for a type in `changing`. A field this save leaves as recorded already has its finding (pending, approved, rejected or exception), and a decided one is not filed again;
  - `auditOutOfScopeRescanEvidenceFields<Field extends string>(differing: readonly Field[], saving: Readonly<Record<NoInfer<Field>, string | null>>, recorded: Readonly<Record<NoInfer<Field>, string | null>>): Field[]` (P3-R18): the fields of `differing` (each already differs from the snapshot) whose value in this save is not the recorded one; `""` and `null` are both "none". The route calls it keyed by finding type, Task 4's form keyed by `AuditCheckField`.
- Produces, the scan route's re-scan answer: **200** `{ status: "out_of_scope", auditResult: "out_of_scope", item, scannedByName: string | null }` (P3-R24; the first record keeps its 202).
  - `item` is the updated `AuditItem` row. Its `auditResult` stays `"out_of_scope"` and its `auditStatus` stays what it was, with the new `actual*`, `lastScanAt` and `scanCount + 1`.
  - `applyScanResult` (`src/lib/audit-scan-session.ts:325-344`) and both client callers accept it. `submitCheck` reads `result.item` / `result.scannedByName`. `submitOutOfScope` accepts any `response.ok` (`audit-scan-workspace.tsx:590`).
  - Refusals, all 400 with today's catalogued words (`src/lib/api-error-catalog.ts:77-78,123-124`):
    - "Evidence attachment is required for changed out-of-scope actual fields" (a field that differs from the snapshot and changes in this save, with no photo; P3-R18);
    - "Evidence attachment is invalid for this asset";
    - "Component is not included in this audit round" (a component confirm on the find; P3-R24);
    - "Component parent is not included in this audit round" (a component confirm whose parent is an out-of-scope find: the parent guard in `assertComponentInstalledUnderParent`; P3-R24);
    - more than 20 `evidenceAttachmentIds` gives `{ error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors }` before any read.
- Produces, the lookup answers (`POST /api/audit-rounds/[id]/scan-lookup`):
  - no item: `{ status: "out_of_scope", candidates, asset }`, as today;
  - **a recorded out-of-scope find:** `{ status: "out_of_scope", candidates, asset, item: AuditLookupRecordedFind }`;
  - an own item: `{ status: "in_round", candidates, asset, item }`. The item now also carries `expected*` / `actual*`;
  - partial candidates: `inRound` is true only for own items;
  - `asset.components[].auditItem` and `asset.installedIn[].auditItem` are `null` for an out-of-scope find, so `normalizeAuditLookupComponents` reads it as `"out_of_round"` (`audit-scan-helpers.ts:17-19`).
- Produces, in `src/components/audit/audit-scan-types.ts`:

  ```ts
  /** A recorded out-of-scope find, as the lookup answers it: the snapshot its first scan compared against (expected*)
   * and what was found (actual*). Saving the find again edits it, against that snapshot (group 2 plan 3, P3-R3). */
  export type AuditLookupRecordedFind = AuditLookupAuditItem & {
    expectedLocationId: string
    expectedCustodianId: string | null
    expectedDepartmentId: string | null
    expectedConditionId: string | null
    actualLocationId: string | null
    actualCustodianId: string | null
    actualDepartmentId: string | null
    actualConditionId: string | null
  }
  ```
  The variant becomes `| { status: "out_of_scope"; asset: AuditLookupAsset; item?: AuditLookupRecordedFind }`. The `in_round` variant stays `item?: { assetId: string }`.
- Produces, in `src/lib/validations/audit.ts`: `evidenceAttachmentIds: z.array(z.string().trim().min(1)).max(20).default([])`.
- For later tasks:
  - **Task 2's own-item search makes the walk reach the lookup.** Its search and camera match read own items only, so a typed tag or serial of a recorded find falls through to `searchRegister`.
  - **Task 4 opens the out-of-scope form from `payload.item`:**
    - the defaults come from `item.actual*`;
    - **the compared values come from `item.expected*`, not from the master `asset.*`**. The server compares against the snapshot. A form that compares against the master would skip the photo the server then requires, wherever a reviewer has approved a field since the first scan (the review route updates the master, `api/audit-findings/[id]/review/route.ts:194-205`);
    - the photo rule is `auditOutOfScopeRescanEvidenceFields(diff, values, recordedValues)`, the server's rule (P3-R18), so the form asks for a photo exactly when the route would refuse without one;
    - the save goes through `submitOutOfScope`, so evidence is uploaded first.
    - Task 4 also rewrites the `in_round` comment at `audit-scan-workspace.tsx:429`. It says an out-of-scope record "becomes a round item", which is no longer true.
  - **Task 4's round page edit link** can come back on out-of-scope rows: the server now keeps them out of scope. The round page's correction history (`audit-round-page-data.ts:162`, `summarizeAuditCorrectionLog`) lists these re-scans, because they log `scan_result_corrected`.
  - **Task 6:**
    - `docs/06_WORKFLOWS.md:119`: the lookup now answers out-of-scope for a recorded find too;
    - the E2E step: a second scan of X1 stays นอกขอบเขต;
    - the changelog lines.

- [ ] **Step 1: The words**

No message changes. The branch's refusals reuse the four error texts the catalog already maps (`src/lib/api-error-catalog.ts:77-78,123-124`, th e.g. "ต้องแนบหลักฐานเมื่อแก้ข้อมูลจริงที่อยู่นอกขอบเขต"), and the 20-photo cap is a validation refusal ("Invalid request data", already mapped). `tests/api-error-catalog.test.ts:66-77` passes with no new entry, because no new English literal enters `src/app/api` or `src/lib`.

- [ ] **Step 2: Write the failing tests**

`tests/audit-out-of-scope-rescan.test.ts` (new):

```ts
import assert from "node:assert/strict"
import test from "node:test"

import { auditOutOfScopeRescanEvidenceFields, planAuditOutOfScopeRescanFindings } from "../src/lib/audit-out-of-scope-rescan.ts"

test("a re-scan needs evidence only for a field that differs from the snapshot and changes in this save; a remark-only edit needs none (P3-R18)", () => {
  const recorded = { wrong_location: "loc-2", wrong_custodian: null, wrong_department: "dept-1", wrong_condition: "condition-poor" }
  // The location still differs from the snapshot but repeats what was recorded; the condition moves on to a new value.
  assert.deepEqual(
    auditOutOfScopeRescanEvidenceFields(["wrong_location", "wrong_condition"], { wrong_location: "loc-2", wrong_condition: "condition-broken" }, recorded),
    ["wrong_condition"],
  )
  assert.deepEqual(auditOutOfScopeRescanEvidenceFields(["wrong_location", "wrong_condition"], { wrong_location: "loc-2", wrong_condition: "condition-poor" }, recorded), [], "the same values again, a remark only")
  assert.deepEqual(auditOutOfScopeRescanEvidenceFields([], {}, recorded), [])
  // "" and null are both "none": the form's empty value equals the server's null.
  assert.deepEqual(auditOutOfScopeRescanEvidenceFields(["custodian"], { custodian: "" }, { custodian: null }), [])
  assert.deepEqual(auditOutOfScopeRescanEvidenceFields(["custodian"], { custodian: "emp-9" }, { custodian: "" }), ["custodian"])
})

const pending = (id: string, findingType: string, actualValue: string | null) => ({ id, findingType, actualValue, reviewStatus: "pending" })

test("a re-scan reports a new differing field, moves a pending finding to the new value, leaves an unchanged one, and closes one that now matches (P3-R3)", () => {
  const plan = planAuditOutOfScopeRescanFindings(
    [pending("f-loc", "wrong_location", "loc-2"), pending("f-dept", "wrong_department", "dept-2"), pending("f-cond", "wrong_condition", "condition-poor")],
    [
      { type: "wrong_location", expectedValue: "loc-1", actualValue: "loc-3" },
      { type: "wrong_condition", expectedValue: "condition-good", actualValue: "condition-poor" },
      { type: "wrong_custodian", expectedValue: "emp-5", actualValue: "emp-9" },
    ],
    ["wrong_location", "wrong_custodian"],
  )
  assert.deepEqual(plan, {
    create: [{ type: "wrong_custodian", expectedValue: "emp-5", actualValue: "emp-9" }],
    update: [{ findingId: "f-loc", finding: { type: "wrong_location", expectedValue: "loc-1", actualValue: "loc-3" } }],
    reject: ["f-dept"],
  })
})

test("a value a reviewer already approved is not reported again; a new value after it is", () => {
  const approved = [{ id: "f-a", findingType: "wrong_location", actualValue: "loc-2", reviewStatus: "approved" }]
  assert.deepEqual(planAuditOutOfScopeRescanFindings(approved, [{ type: "wrong_location", expectedValue: "loc-1", actualValue: "loc-2" }], ["wrong_location"]), { create: [], update: [], reject: [] })
  assert.deepEqual(planAuditOutOfScopeRescanFindings(approved, [{ type: "wrong_location", expectedValue: "loc-1", actualValue: "loc-3" }], ["wrong_location"]), {
    create: [{ type: "wrong_location", expectedValue: "loc-1", actualValue: "loc-3" }],
    update: [],
    reject: [],
  })
})

test("decided findings are never reopened or closed; a save that leaves a rejected or exception value unchanged files nothing, and a save that changes to it again is a new claim (P3-R18: it then needs evidence)", () => {
  const decided = [
    { id: "f-a", findingType: "wrong_location", actualValue: "loc-2", reviewStatus: "approved" },
    { id: "f-r", findingType: "wrong_condition", actualValue: "condition-poor", reviewStatus: "rejected" },
    { id: "f-e", findingType: "wrong_department", actualValue: "dept-2", reviewStatus: "exception" },
  ]
  assert.deepEqual(planAuditOutOfScopeRescanFindings(decided, [], []), { create: [], update: [], reject: [] })
  assert.deepEqual(
    planAuditOutOfScopeRescanFindings(
      decided,
      [
        { type: "wrong_condition", expectedValue: "condition-good", actualValue: "condition-poor" },
        { type: "wrong_department", expectedValue: "dept-1", actualValue: "dept-2" },
      ],
      [],
    ),
    { create: [], update: [], reject: [] },
  )
  assert.deepEqual(planAuditOutOfScopeRescanFindings(decided, [{ type: "wrong_condition", expectedValue: "condition-good", actualValue: "condition-poor" }], ["wrong_condition"]), {
    create: [{ type: "wrong_condition", expectedValue: "condition-good", actualValue: "condition-poor" }],
    update: [],
    reject: [],
  })
})

test("a second pending finding of one field is closed and the first kept; a cleared value (null) equals null", () => {
  assert.deepEqual(
    planAuditOutOfScopeRescanFindings([pending("f-1", "wrong_location", "loc-2"), pending("f-2", "wrong_location", "loc-2")], [{ type: "wrong_location", expectedValue: "loc-1", actualValue: "loc-2" }], []),
    { create: [], update: [], reject: ["f-2"] },
  )
  assert.deepEqual(
    planAuditOutOfScopeRescanFindings([pending("f-c", "wrong_custodian", null)], [{ type: "wrong_custodian", expectedValue: "emp-5", actualValue: null }], []),
    { create: [], update: [], reject: [] },
  )
})
```

`tests/audit-scan-out-of-scope-rescan.test.ts` (new). The harness is `tests/audit-scan-edit-findings.test.ts:1-97` with its own state and these differences:
- the user's permissions come from the state;
- `logAudit` and `syncInstalledComponentsWithParent` record what they are called with;
- the db answers `findUnique` by the asset key, findings by type and review status, attachments by id, and the pending count from the state.

```ts
import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

type Finding = { id: string; findingType: string; actualValue: string | null; reviewStatus: string }
type Call = { call: string; args: Record<string, unknown> }
type State = {
  item: Record<string, unknown>
  parentItem: Record<string, unknown> | null
  permissions: string[]
  findings: Finding[]
  outOfScopeFindingId: string | null
  attachmentIds: string[]
  pendingCount: number
  calls: Call[]
  logs: Array<Record<string, unknown>>
}

// The out-of-scope find X1 as its first scan left it: the master's snapshot loc-1 / no custodian / dept-1 / good, found
// in loc-2. The master has moved since (loc-9), so a comparison with the master would read differently.
function recordedFind(): Record<string, unknown> {
  return {
    id: "item-x1", auditRoundId: "round-1", assetId: "asset-x1",
    expectedLocationId: "loc-1", expectedCustodianId: null, expectedDepartmentId: "dept-1", expectedConditionId: "condition-good",
    actualLocationId: "loc-2", actualCustodianId: null, actualDepartmentId: "dept-1", actualConditionId: "condition-good",
    auditStatus: "reviewed", auditResult: "out_of_scope", findingRequired: true, reconcileStatus: "pending", scanCount: 1,
    scannedAt: new Date("2026-10-27T02:00:00Z"), scannedBy: "auditor-1", lastScanAt: new Date("2026-10-27T02:00:00Z"), remark: null,
    asset: { id: "asset-x1", assetTag: "GRL-COM-26-0099", name: "Notebook", ownershipType: "shared", currentLocationId: "loc-9", custodianId: null },
  }
}

const state: State = { item: recordedFind(), parentItem: null, permissions: ["audit:edit"], findings: [], outOfScopeFindingId: "finding-oos", attachmentIds: ["att-1"], pendingCount: 1, calls: [], logs: [] }
Object.assign(globalThis, { __outOfScopeRescanState: state })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    export async function requireAuth() {
      return { id: "auditor-1", roles: ["auditor"], permissions: globalThis.__outOfScopeRescanState.permissions, employeeId: "emp-1" }
    }
    export function hasRole(user, role) { return user.roles.includes(role) }
    export function hasPermission(user, module, action) { return user.permissions.includes(module + ":" + action) }
    export function requirePermission(user, module, action) {
      if (!user.permissions.includes(module + ":" + action)) throw new Error("Forbidden: insufficient permissions")
    }
  `],
  ["@/lib/audit-log", `export async function logAudit(entry) { globalThis.__outOfScopeRescanState.logs.push(entry) }`],
  ["@/lib/asset-component-sync", `
    export async function syncInstalledComponentsWithParent(_tx, args) {
      globalThis.__outOfScopeRescanState.calls.push({ call: "syncInstalledComponentsWithParent", args })
      return { updated: 0, skipped: 0, movements: 0, componentSnapshots: [] }
    }
  `],
  ["@/lib/db", `
    const state = () => globalThis.__outOfScopeRescanState
    const attachment = (id) => ({ fileName: id + ".jpg", originalName: id + ".jpg", fileType: "image/jpeg", fileSize: 1000, filePath: "audit/" + id + ".jpg" })
    function answer(name, method, args) {
      if (name === "auditRound" && method === "findFirst") return { id: "round-1", status: "open" }
      if (name === "auditItem" && method === "findUnique") {
        return args.where.auditRoundId_assetId.assetId === state().item.assetId ? state().item : state().parentItem
      }
      if (name === "auditItem" && method === "update") return { ...state().item, ...args.data, scanCount: state().item.scanCount + 1 }
      if (name === "user" && method === "findUnique") return { displayName: "ผู้ตรวจ 1" }
      if (name === "auditFinding" && method === "findMany") {
        const types = args.where?.findingType?.in ?? []
        const status = args.where?.reviewStatus
        const statuses = typeof status === "string" ? [status] : status?.in ?? []
        return state().findings.filter((finding) => types.includes(finding.findingType) && statuses.includes(finding.reviewStatus))
      }
      if (name === "auditFinding" && method === "findFirst") {
        return args.where?.findingType === "out_of_scope" && state().outOfScopeFindingId ? { id: state().outOfScopeFindingId } : null
      }
      if (name === "auditFinding" && method === "count") return state().pendingCount
      if (name === "auditFinding" && method === "create") return { id: "created-" + args.data.findingType, ...args.data }
      if (name === "attachment" && method === "findMany") return args.where.id.in.filter((id) => state().attachmentIds.includes(id)).map(attachment)
      if (name === "assetComponent" && method === "findFirst") return { parentAssetId: "asset-p1", parentAsset: { assetTag: "GRL-COM-26-0100", name: "Desktop" } }
      if (method === "updateMany") return { count: 0 }
      if (method === "count") return 0
      if (method === "findMany") return []
      if (method === "findFirst" || method === "findUnique") return null
      return { id: name + "-new", ...(args.data ?? {}) }
    }
    function model(name) {
      return new Proxy({}, {
        get(_target, method) {
          return async (args = {}) => {
            state().calls.push({ call: name + "." + String(method), args })
            return answer(name, String(method), args)
          }
        },
      })
    }
    const client = new Proxy({}, {
      get(_target, key) {
        if (key === "$transaction") return async (callback) => callback(client)
        return model(String(key))
      },
    })
    export const prisma = client
  `],
])

const registerHooks = (nodeModule as unknown as {
  registerHooks(options: {
    resolve(specifier: string, context: unknown, nextResolve: (specifier: string, context: unknown) => unknown): unknown
  }): void
}).registerHooks

registerHooks({
  resolve(specifier, context, nextResolve) {
    const source = mockedModuleSources.get(specifier)
    if (source !== undefined) {
      return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`, shortCircuit: true }
    }
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})

const route = await import(pathToFileURL("src/app/api/audit-rounds/[id]/scan/route.ts").href) as {
  POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response>
}

function scan(body: Record<string, unknown>) {
  return route.POST(
    new Request("http://localhost/api/audit-rounds/round-1/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: "asset-x1", ...body }),
    }),
    { params: Promise.resolve({ id: "round-1" }) },
  )
}

const callsTo = (call: string) => state.calls.filter((entry) => entry.call === call).map((entry) => entry.args)
const dataOf = (args: Record<string, unknown>) => args.data as Record<string, unknown>
const sameAsFirstScan = { actualLocationId: "loc-2", actualCustodianId: null, actualDepartmentId: "dept-1", actualConditionId: "condition-good" }
type RescanPayload = { status?: string; auditResult?: string; item: { auditResult: string; auditStatus: string; scanCount: number }; scannedByName: string | null; error?: string; code?: string; mismatches?: unknown; appliedCorrections?: unknown }

beforeEach(() => {
  state.item = recordedFind()
  state.parentItem = null
  state.permissions = ["audit:edit"]
  state.findings = []
  state.outOfScopeFindingId = "finding-oos"
  state.attachmentIds = ["att-1"]
  state.pendingCount = 1
  state.calls = []
  state.logs = []
})

test("a re-scan of an out-of-scope find stays out of scope: result and status kept, the found values saved, scanCount + 1, answered as out_of_scope (P3-R3)", async () => {
  state.findings = [{ id: "finding-loc", findingType: "wrong_location", actualValue: "loc-2", reviewStatus: "pending" }]
  state.pendingCount = 2

  const response = await scan({ ...sameAsFirstScan, evidenceAttachmentIds: ["att-1"], remark: "ยังอยู่ห้อง 2" })
  assert.equal(response.status, 200)
  const payload = await response.json() as RescanPayload
  assert.equal(payload.status, "out_of_scope")
  assert.equal(payload.auditResult, "out_of_scope")
  assert.equal(payload.item.auditResult, "out_of_scope")
  assert.equal(payload.item.auditStatus, "reviewed")
  assert.equal(payload.item.scanCount, 2)
  assert.equal(payload.scannedByName, "ผู้ตรวจ 1")

  const updates = callsTo("auditItem.update")
  assert.equal(updates.length, 1)
  assert.deepEqual(updates[0].where, { id: "item-x1" })
  const data = dataOf(updates[0])
  assert.ok(data.lastScanAt instanceof Date)
  assert.deepEqual({ ...data, lastScanAt: "now" }, {
    actualDepartmentId: "dept-1",
    actualLocationId: "loc-2",
    actualCustodianId: null,
    actualConditionId: "condition-good",
    lastScanAt: "now",
    scanCount: { increment: 1 },
    remark: "ยังอยู่ห้อง 2",
    findingRequired: true,
    reconcileStatus: "pending",
  }, "no auditResult, no auditStatus, no scannedAt / scannedBy: the first scan's stay")
  assert.deepEqual(callsTo("auditFinding.create"), [], "the unchanged wrong_location finding is left as it is")
})

test("the find is compared with its first scan's snapshot, never the master: matching the snapshot closes the pending field finding", async () => {
  state.findings = [{ id: "finding-loc", findingType: "wrong_location", actualValue: "loc-2", reviewStatus: "pending" }]
  state.pendingCount = 1

  const response = await scan({ actualLocationId: "loc-1", actualCustodianId: null, actualDepartmentId: "dept-1", actualConditionId: "condition-good" })
  assert.equal(response.status, 200)
  assert.deepEqual(callsTo("asset.findFirst"), [], "the master is not read")
  assert.deepEqual(callsTo("attachment.findMany"), [], "nothing differs, so no evidence is needed or read")
  const closed = callsTo("auditFinding.updateMany").filter((args) => dataOf(args).reviewRemark === "ยกเลิกเพราะแก้ผลตรวจ")
  assert.equal(closed.length, 1)
  assert.deepEqual(closed[0].where, { id: { in: ["finding-loc"] }, reviewStatus: "pending" })
  assert.equal(dataOf(closed[0]).reviewStatus, "rejected")
  assert.equal(dataOf(closed[0]).reviewedBy, "auditor-1")
  assert.deepEqual(callsTo("auditFinding.create"), [])
})

test("a field that differs from the snapshot and changes in this save needs evidence, as the first out-of-scope scan does; nothing is written without it (P3-R18)", async () => {
  const response = await scan({ actualLocationId: "loc-3" })
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { error: "Evidence attachment is required for changed out-of-scope actual fields" })
  assert.deepEqual(callsTo("auditItem.update"), [])
  assert.deepEqual(callsTo("auditScanHistory.create"), [])
})

test("a remark-only edit needs no new photo: the location still differs from the snapshot but repeats what was recorded (P3-R18)", async () => {
  state.findings = [{ id: "finding-loc", findingType: "wrong_location", actualValue: "loc-2", reviewStatus: "pending" }]

  const response = await scan({ ...sameAsFirstScan, remark: "ยังอยู่ห้อง 2 ป้ายหลุด" })
  assert.equal(response.status, 200)
  assert.equal((await response.json() as RescanPayload).item.auditResult, "out_of_scope")
  assert.deepEqual(callsTo("attachment.findMany"), [], "no evidence asked or read")
  assert.deepEqual(callsTo("attachment.createMany"), [])
  assert.deepEqual(callsTo("auditFinding.create"), [], "the unchanged wrong_location finding is left as it is")
  assert.equal(dataOf(callsTo("auditItem.update")[0]).remark, "ยังอยู่ห้อง 2 ป้ายหลุด")
})

test("a remark-only edit after the reviewer rejected the location files nothing again (P3-R18)", async () => {
  // The mock's findMany filters by the statuses the route asks for, so the rejected row is never returned; the route
  // still must not create a finding, because this save leaves the location as recorded.
  state.findings = [{ id: "finding-loc", findingType: "wrong_location", actualValue: "loc-2", reviewStatus: "rejected" }]
  state.pendingCount = 0

  const response = await scan({ ...sameAsFirstScan, remark: "ป้ายหลุด" })
  assert.equal(response.status, 200)
  assert.deepEqual(callsTo("auditFinding.create"), [])
  assert.deepEqual(callsTo("attachment.findMany"), [])
  assert.equal("reconcileStatus" in dataOf(callsTo("auditItem.update")[0]), false, "the reviewer's decision is not undone")
})

test("the evidence must be the scanner's own active photos of this asset", async () => {
  const response = await scan({ actualLocationId: "loc-3", evidenceAttachmentIds: ["att-other"] })
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { error: "Evidence attachment is invalid for this asset" })
  assert.deepEqual(callsTo("attachment.findMany")[0].where, { id: { in: ["att-other"] }, assetId: "asset-x1", module: "asset", isActive: true, uploadedBy: "auditor-1" })
  assert.deepEqual(callsTo("auditItem.update"), [])
})

test("a new differing field becomes a reviewable finding, a changed one takes the new value, the pending out_of_scope finding takes the found values, and the evidence goes on each", async () => {
  state.findings = [{ id: "finding-loc", findingType: "wrong_location", actualValue: "loc-2", reviewStatus: "pending" }]
  const remark = "ย้ายไปห้อง 3 จอแตก"

  const response = await scan({ actualLocationId: "loc-3", actualConditionId: "condition-poor", evidenceAttachmentIds: ["att-1"], remark })
  assert.equal(response.status, 200)

  assert.deepEqual(callsTo("auditFinding.create").map(dataOf), [{
    auditRoundId: "round-1",
    auditItemId: "item-x1",
    assetId: "asset-x1",
    findingType: "wrong_condition",
    expectedValue: "condition-good",
    actualValue: "condition-poor",
    reportedBy: "auditor-1",
    reviewStatus: "pending",
    remark,
    actionTaken: "out_of_scope_actual_field_reported",
  }])
  const updates = callsTo("auditFinding.update")
  assert.deepEqual(updates.map((args) => args.where), [{ id: "finding-oos" }, { id: "finding-loc" }])
  assert.deepEqual(JSON.parse(dataOf(updates[0]).actualValue as string), {
    assetTag: "GRL-COM-26-0099", assetName: "Notebook", locationId: "loc-3", custodianId: null, departmentId: "dept-1", conditionId: "condition-poor",
  })
  assert.deepEqual(dataOf(updates[1]), { actualValue: "loc-3", remark })

  const copies = dataOf(callsTo("attachment.createMany")[0]) as unknown as Array<Record<string, unknown>>
  assert.deepEqual(copies.map((copy) => copy.referenceId), ["finding-oos", "created-wrong_condition", "finding-loc"])
  assert.deepEqual(copies[0], {
    assetId: "asset-x1", module: "audit_finding", referenceId: "finding-oos",
    fileName: "att-1.jpg", originalName: "att-1.jpg", fileType: "image/jpeg", fileSize: 1000, filePath: "audit/att-1.jpg", uploadedBy: "auditor-1",
  })
})

test("never the master: an approver with the correction tick and segregation off moves no asset, writes no movement and syncs no component", async () => {
  state.permissions = ["audit:edit", "audit:approve"]

  const response = await scan({ actualLocationId: "loc-3", applyCorrections: true, evidenceAttachmentIds: ["att-1"] })
  assert.equal(response.status, 200)
  const payload = await response.json() as RescanPayload
  assert.equal("appliedCorrections" in payload, false)
  for (const call of ["asset.update", "assetMovement.create", "systemSetting.findMany", "asset.findFirst", "syncInstalledComponentsWithParent"]) {
    assert.deepEqual(callsTo(call), [], call)
  }
})

test("a component confirm on an out-of-scope find is refused: the find is not in the round", async () => {
  const response = await scan({ confirmedWithParentAssetId: "asset-p1", componentConfirmationReason: "อยู่ในเครื่องหลัก" })
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { error: "Component is not included in this audit round" })
  assert.deepEqual(callsTo("auditItem.update"), [])
  assert.deepEqual(callsTo("assetComponent.findFirst"), [])
})

test("a component of the round cannot be confirmed with a parent that is an out-of-scope find", async () => {
  state.item = {
    ...recordedFind(), id: "item-c1", assetId: "asset-c1", auditStatus: "pending", auditResult: null, scanCount: 0, scannedAt: null, scannedBy: null,
    asset: { id: "asset-c1", assetTag: "GRL-COM-26-0101", name: "RAM", ownershipType: "component", currentLocationId: "loc-1", custodianId: null },
  }
  state.parentItem = { id: "item-p1", auditResult: "out_of_scope" }

  const response = await scan({ assetId: "asset-c1", confirmedWithParentAssetId: "asset-p1", componentConfirmationReason: "อยู่ในเครื่องหลัก" })
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { error: "Component parent is not included in this audit round" })
  const parentRead = callsTo("auditItem.findUnique").find((args) => (args.where as { auditRoundId_assetId: { assetId: string } }).auditRoundId_assetId.assetId === "asset-p1")
  assert.deepEqual(parentRead?.select, { id: true, auditResult: true })
  assert.deepEqual(callsTo("auditScanHistory.create"), [])
})

test("the history row names the item and marks the re-scan; the log is a correction that keeps the result", async () => {
  await scan({ ...sameAsFirstScan, evidenceAttachmentIds: ["att-1"] })

  const [history] = callsTo("auditScanHistory.create").map(dataOf)
  assert.equal(history.auditItemId, "item-x1")
  assert.equal(history.scanLocationId, "loc-2")
  const raw = JSON.parse(history.rawPayload as string) as Record<string, unknown>
  assert.equal(raw.outOfScope, true)
  assert.equal(raw.rescan, true)
  assert.deepEqual(raw.actual, { departmentId: "dept-1", locationId: "loc-2", custodianId: null, conditionId: "condition-good" })

  assert.equal(state.logs.length, 1)
  const log = state.logs[0] as { action: string; recordId: string; oldValue: Record<string, unknown>; newValue: Record<string, unknown> }
  assert.equal(log.action, "scan_result_corrected")
  assert.equal(log.recordId, "item-x1")
  assert.equal(log.oldValue.auditResult, "out_of_scope")
  assert.equal(log.newValue.auditResult, "out_of_scope")
  assert.equal(log.newValue.outOfScope, true)
  assert.deepEqual(log.newValue.fieldFindingTypes, ["wrong_location"])
})

test("an own item still goes through the in-round path, which writes its result", async () => {
  state.item = { ...recordedFind(), auditStatus: "scanned", auditResult: "found" }

  const payload = await (await scan({ actualLocationId: "loc-1", actualCustodianId: null, actualDepartmentId: "dept-1", actualConditionId: "condition-good" })).json() as RescanPayload
  assert.equal(payload.status, undefined)
  assert.deepEqual(payload.mismatches, [])
  assert.equal(dataOf(callsTo("auditItem.update")[0]).auditResult, "found")
})

test("a save carries at most 20 evidence photos, refused before any read", async () => {
  const ids = Array.from({ length: 21 }, (_, index) => `att-${index + 1}`)
  const refused = await scan({ actualLocationId: "loc-3", evidenceAttachmentIds: ids })
  assert.equal(refused.status, 400)
  assert.equal((await refused.json() as RescanPayload).code, "VALIDATION_FAILED")
  assert.deepEqual(state.calls, [])

  state.attachmentIds = ids.slice(0, 20)
  const accepted = await scan({ actualLocationId: "loc-3", evidenceAttachmentIds: ids.slice(0, 20) })
  assert.equal(accepted.status, 200)
})
```

`tests/audit-scan-lookup-recorded-find.test.ts` (new). The harness is `tests/audit-scan-lookup-partial.test.ts:1-60`, with an exact asset, the item and the related items in the state:

```ts
import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

type Related = { id: string; assetId: string; auditStatus: string; auditResult: string | null }
type State = { asset: Record<string, unknown>; item: Record<string, unknown> | null; related: Related[]; itemSelects: unknown[] }

function notebook(): Record<string, unknown> {
  return {
    id: "asset-x1", assetTag: "GRL-COM-26-0099", name: "Notebook", serialNumber: "SN-0099", fixedAssetCode: null,
    currentLocationId: "loc-9", custodianId: null, departmentId: "dept-1", conditionId: "condition-good", ownershipType: "shared",
    category: { code: "NB", name: "Notebook" }, custodian: null, currentLocation: { code: "R9", name: "ห้อง 9" },
    status: { name: "active", nameTh: "ใช้งาน", colorCode: null },
    parentComponents: [], installedInLinks: [],
  }
}

const recordedFind = {
  id: "item-x1", assetId: "asset-x1", auditStatus: "reviewed", auditResult: "out_of_scope",
  expectedLocationId: "loc-1", expectedCustodianId: null, expectedDepartmentId: "dept-1", expectedConditionId: "condition-good",
  actualLocationId: "loc-2", actualCustodianId: null, actualDepartmentId: "dept-1", actualConditionId: "condition-good",
}

const state: State = { asset: notebook(), item: null, related: [], itemSelects: [] }
Object.assign(globalThis, { __lookupRecordedFindState: state })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    export async function requireAuth() { return { id: "user-1", roles: [], permissions: ["audit:edit"] } }
    export function requirePermission() {}
  `],
  ["@/lib/db", `
    const state = () => globalThis.__lookupRecordedFindState
    export const prisma = {
      auditRound: { findFirst: async () => ({ id: "round-1", status: "open" }) },
      asset: { findFirst: async () => state().asset, findMany: async () => [] },
      auditItem: {
        findUnique: async (args) => { state().itemSelects.push(args.select); return state().item },
        findMany: async () => state().related,
      },
    }
  `],
])

// registerHooks block and route import: as tests/audit-scan-lookup-partial.test.ts:37-60.

function lookup(rawValue: string) { /* as tests/audit-scan-lookup-partial.test.ts:62-71 */ }

type LookupPayload = {
  status: string
  item?: Record<string, unknown>
  asset: { components: Array<{ assetId: string; auditItem: { id: string } | null }>; installedIn: Array<{ parentAssetId: string; auditItem: { id: string } | null }> }
}

beforeEach(() => {
  state.asset = notebook()
  state.item = null
  state.related = []
  state.itemSelects = []
})

test("an asset with no item in the round is out of scope and carries no item", async () => {
  const payload = await (await lookup("GRL-COM-26-0099")).json() as LookupPayload
  assert.equal(payload.status, "out_of_scope")
  assert.equal("item" in payload, false)
})

test("a recorded out-of-scope find answers out_of_scope with its item: the snapshot it was compared with and what was found (P3-R3)", async () => {
  state.item = recordedFind
  const payload = await (await lookup("GRL-COM-26-0099")).json() as LookupPayload
  assert.equal(payload.status, "out_of_scope")
  assert.deepEqual(payload.item, recordedFind)
  assert.deepEqual(state.itemSelects[0], {
    id: true, assetId: true, auditStatus: true, auditResult: true,
    expectedLocationId: true, expectedCustodianId: true, expectedDepartmentId: true, expectedConditionId: true,
    actualLocationId: true, actualCustodianId: true, actualDepartmentId: true, actualConditionId: true,
  })
})

test("an own item of the round still answers in_round", async () => {
  state.item = { ...recordedFind, auditStatus: "scanned", auditResult: "found" }
  const payload = await (await lookup("GRL-COM-26-0099")).json() as LookupPayload
  assert.equal(payload.status, "in_round")
  assert.equal(payload.item?.id, "item-x1")
})

test("a component or parent that is an out-of-scope find reads as not in the round", async () => {
  state.asset = {
    ...notebook(),
    parentComponents: [
      { componentRole: "ram", slotNo: "1", componentAsset: { id: "asset-c1", assetTag: "GRL-COM-26-0101", name: "RAM" } },
      { componentRole: "ssd", slotNo: null, componentAsset: { id: "asset-c2", assetTag: "GRL-COM-26-0102", name: "SSD" } },
    ],
    installedInLinks: [{ componentRole: "dock", slotNo: null, parentAsset: { id: "asset-p1", assetTag: "GRL-COM-26-0100", name: "Desktop" } }],
  }
  state.item = { ...recordedFind, auditStatus: "pending", auditResult: null }
  state.related = [
    { id: "item-c1", assetId: "asset-c1", auditStatus: "pending", auditResult: null },
    { id: "item-c2", assetId: "asset-c2", auditStatus: "reviewed", auditResult: "out_of_scope" },
    { id: "item-p1", assetId: "asset-p1", auditStatus: "reviewed", auditResult: "out_of_scope" },
  ]
  const payload = await (await lookup("GRL-COM-26-0099")).json() as LookupPayload
  assert.deepEqual(payload.asset.components.map((component) => [component.assetId, component.auditItem?.id ?? null]), [["asset-c1", "item-c1"], ["asset-c2", null]])
  assert.deepEqual(payload.asset.installedIn.map((parent) => [parent.parentAssetId, parent.auditItem?.id ?? null]), [["asset-p1", null]])
})
```
(The drafter writes out the registerHooks block and `lookup` in full. They are verbatim copies of the partial test's `:37-71`, with this file's state name.)

`tests/audit-scan-lookup-partial.test.ts`:
- `:7` becomes `const state: { partial: Array<{ id: string; assetTag: string; name: string }>; inRound: string[]; outOfScope: string[]; calls: string[] } = { partial: [], inRound: [], outOfScope: [], calls: [] }`;
- `:31` becomes `findMany: async () => [...state().inRound.map((assetId) => ({ assetId, auditResult: "found" })), ...state().outOfScope.map((assetId) => ({ assetId, auditResult: "out_of_scope" }))],`;
- add `state.outOfScope = []` after `:75`;
- after `:90`:

```ts
test("a partial match that is a recorded out-of-scope find reads as not in the round (P3-R3)", async () => {
  state.partial = [
    { id: "asset-1", assetTag: "GRL-COM-26-0036", name: "RAM" },
    { id: "asset-2", assetTag: "GRL-COM-26-0037", name: "RAM" },
  ]
  state.inRound = ["asset-1"]
  state.outOfScope = ["asset-2"]

  const payload = await (await lookup("26-003")).json() as { status: string; matches: Array<{ assetId: string; inRound: boolean }> }

  assert.deepEqual(payload.matches.map((match) => [match.assetId, match.inRound]), [["asset-1", true], ["asset-2", false]])
})
```

`tests/audit-out-of-scope-actual-field.test.ts`, after `:88`. The first slice stays: it still runs from the first `if (!item)` to the first `const actual = {` (`:63-67`). A second slice covers the new branch:

```ts
  const rescanStart = route.indexOf("if (!isAuditRoundOwnItem(item)) {")
  const componentConfirmStart = route.indexOf("const parentAssetId = input.confirmedWithParentAssetId")
  assert.ok(rescanStart > outOfScopeStart && rescanStart < componentConfirmStart, "the re-scan branch sits after the first out-of-scope scan and before the component confirm")
  const rescanBlock = route.slice(rescanStart, componentConfirmStart)
  assert.match(rescanBlock, /buildOutOfScopeFieldFindings\(snapshot, actual\)/)
  assert.match(rescanBlock, /const evidenceFieldTypes = auditOutOfScopeRescanEvidenceFields\(fieldFindingTypes, savingByType, recordedByType\)/)
  assert.match(rescanBlock, /evidenceFieldTypes\.length > 0 && evidenceAttachmentIds\.length === 0/)
  assert.match(rescanBlock, /planAuditOutOfScopeRescanFindings\(/)
  assert.doesNotMatch(rescanBlock, /tx\.asset\.update|tx\.assetMovement\.create|syncInstalledComponentsWithParent|canApplyAuditScanCorrections|applyCorrections|auditResult: auditResult/)
```

`tests/audit-round-counts.test.ts`:
- `:64`: the title becomes `"the count rules are pure and client-safe, and say that a re-scan keeps an out-of-scope find out of scope"`;
- `:69` becomes `assert.match(source, /A re-scan of an out-of-scope find keeps that result/)`.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test tests/audit-out-of-scope-rescan.test.ts tests/audit-scan-out-of-scope-rescan.test.ts tests/audit-scan-lookup-recorded-find.test.ts tests/audit-scan-lookup-partial.test.ts tests/audit-out-of-scope-actual-field.test.ts tests/audit-round-counts.test.ts`

Expected: FAIL.
- `audit-out-of-scope-rescan`: `ERR_MODULE_NOT_FOUND` for `src/lib/audit-out-of-scope-rescan.ts`.
- `audit-scan-out-of-scope-rescan`: the item goes down the in-round path.
  - Its `auditItem.update` writes `auditResult: "wrong_location"` and `auditStatus: "scanned"`, and the answer has no `status`.
  - The 400 cases answer 200, because the in-round path asks for no evidence.
  - The confirm on the find answers "Component parent is not included in this audit round", because the mock's parent item is null.
  - The confirm with an out-of-scope parent answers 200.
  - The 21-photo save answers 200.
  - Only "an own item still goes through the in-round path" passes.
- `audit-scan-lookup-recorded-find`:
  - the recorded find answers `in_round`;
  - the select lacks `expected*` / `actual*`;
  - c2 and p1 carry their item.
- `audit-scan-lookup-partial`: the new case reads asset-2 as `true`.
- `audit-out-of-scope-actual-field`: `rescanStart` is -1.
- `audit-round-counts`: the comment still says "goes through the in-round path".

- [ ] **Step 4: Implement**

**`src/lib/audit-out-of-scope-rescan.ts`** (new):

```ts
// A re-scan of a recorded out-of-scope find (group 2 plan 3, P3-R3): what it does to the find's field findings. The scan
// route compares the found values with the snapshot the first scan took (the item's expected*), the same way the first
// scan compared them with the master; this file decides, per differing field, whether to report it, move a pending
// finding to the new value or leave it, and which pending findings no longer hold. Decided findings are never reopened
// or closed. A value a reviewer already approved is not reported again: the master holds it by then. Pure, no imports,
// so Task 4's record sheet imports the evidence rule too (P3-R18: the form and the server ask for a photo alike).

export type AuditOutOfScopeFieldFinding = { type: string; expectedValue: string | null; actualValue: string | null }

/**
 * P3-R18: a re-scan needs evidence only for a field that differs from the snapshot (`differing`) and whose value in this
 * save is not the one recorded, so a remark-only edit needs no new photo. "" and null are both "none" (the form holds
 * "", the server null).
 */
export function auditOutOfScopeRescanEvidenceFields<Field extends string>(
  differing: readonly Field[],
  saving: Readonly<Record<NoInfer<Field>, string | null>>,
  recorded: Readonly<Record<NoInfer<Field>, string | null>>,
): Field[] {
  return differing.filter((field) => (saving[field] || null) !== (recorded[field] || null))
}

export type AuditOutOfScopeKnownFinding = { id: string; findingType: string; actualValue: string | null; reviewStatus: string }

export type AuditOutOfScopeRescanPlan = {
  create: AuditOutOfScopeFieldFinding[]
  update: Array<{ findingId: string; finding: AuditOutOfScopeFieldFinding }>
  reject: string[]
}

export function planAuditOutOfScopeRescanFindings(
  known: readonly AuditOutOfScopeKnownFinding[],
  fieldFindings: readonly AuditOutOfScopeFieldFinding[],
  // The differing types whose value this save changes from the recorded one (the route's evidenceFieldTypes). Only
  // these are filed new: a field the save leaves as recorded already has its finding, and a decided one stays decided.
  changing: readonly string[],
): AuditOutOfScopeRescanPlan {
  const differing = new Map(fieldFindings.map((finding) => [finding.type, finding]))
  const keptPendingByType = new Map<string, AuditOutOfScopeKnownFinding>()
  const reject: string[] = []
  for (const finding of known) {
    if (finding.reviewStatus !== "pending") continue
    if (differing.has(finding.findingType) && !keptPendingByType.has(finding.findingType)) keptPendingByType.set(finding.findingType, finding)
    else reject.push(finding.id)
  }

  const create: AuditOutOfScopeFieldFinding[] = []
  const update: AuditOutOfScopeRescanPlan["update"] = []
  for (const finding of differing.values()) {
    const pending = keptPendingByType.get(finding.type)
    if (pending) {
      if ((pending.actualValue ?? null) !== (finding.actualValue ?? null)) update.push({ findingId: pending.id, finding })
      continue
    }
    const approvedAlready = known.some(
      (entry) => entry.reviewStatus === "approved" && entry.findingType === finding.type && (entry.actualValue ?? null) === (finding.actualValue ?? null),
    )
    if (!approvedAlready && changing.includes(finding.type)) create.push(finding)
  }
  return { create, update, reject }
}
```

**`src/lib/validations/audit.ts:57`:**
`evidenceAttachmentIds: z.array(z.string().trim().min(1)).max(20).default([]),`

It feeds `attachment.findMany id in` (`scan/route.ts:121-126`) and `attachment.createMany` (findings × photos, `:227-241`), so the cap keeps both small (recon-api §7). No client caps photos today (`audit-scan-workspace.tsx:575-577`).

**`src/app/api/audit-rounds/[id]/scan/route.ts`:**
- Imports, after `:16`:

  ```ts
  import { isAuditRoundOwnItem } from "@/lib/audit-round-counts-rules"
  import { auditOutOfScopeRescanEvidenceFields, planAuditOutOfScopeRescanFindings } from "@/lib/audit-out-of-scope-rescan"
  ```
- The new branch, between `:266` and `:268`:

  ```ts
    // A re-scan of a recorded out-of-scope find (group 2 plan 3, P3-R3). The find stays out of scope: its result and
    // status stay, the found values are compared with the snapshot its first scan took (expected*), a differing field
    // whose found value changes in this save needs the scanner's own photo as evidence (P3-R18: a remark-only edit needs
    // none), and the master asset never changes here, whoever saves. Without this branch the in-round path below would
    // overwrite the result and make the find an own item.
    if (!isAuditRoundOwnItem(item)) {
      if (input.confirmedWithParentAssetId) {
        return NextResponse.json({ error: "Component is not included in this audit round" }, { status: 400 })
      }
      // A value the request leaves out stays as the last scan found it.
      const actual: ActualValues = {
        departmentId: optionalActualValue(input.actualDepartmentId, item.actualDepartmentId),
        locationId: input.actualLocationId ?? item.actualLocationId ?? item.expectedLocationId,
        custodianId: optionalActualValue(input.actualCustodianId, item.actualCustodianId),
        conditionId: optionalActualValue(input.actualConditionId, item.actualConditionId),
      }
      const snapshot = {
        departmentId: item.expectedDepartmentId,
        currentLocationId: item.expectedLocationId,
        custodianId: item.expectedCustodianId,
        conditionId: item.expectedConditionId,
        ownershipType: item.asset.ownershipType,
      }
      const fieldFindings = buildOutOfScopeFieldFindings(snapshot, actual)
      const fieldFindingTypes = fieldFindings.map((finding) => finding.type)
      // P3-R18: evidence only for a differing field whose found value this save changes from the recorded one.
      const recordedByType: Record<string, string | null> = {
        wrong_location: item.actualLocationId ?? item.expectedLocationId,
        wrong_custodian: item.actualCustodianId,
        wrong_department: item.actualDepartmentId,
        wrong_condition: item.actualConditionId,
      }
      const savingByType = Object.fromEntries(fieldFindings.map((finding) => [finding.type, finding.actualValue]))
      const evidenceFieldTypes = auditOutOfScopeRescanEvidenceFields(fieldFindingTypes, savingByType, recordedByType)
      const evidenceAttachmentIds = Array.from(new Set(input.evidenceAttachmentIds))
      if (evidenceFieldTypes.length > 0 && evidenceAttachmentIds.length === 0) {
        return NextResponse.json({ error: "Evidence attachment is required for changed out-of-scope actual fields" }, { status: 400 })
      }
      const evidenceAttachments = await findOutOfScopeEvidence(item.assetId, user.id, evidenceAttachmentIds)
      if (evidenceAttachments.length !== evidenceAttachmentIds.length) {
        return NextResponse.json({ error: "Evidence attachment is invalid for this asset" }, { status: 400 })
      }
      const scannedAt = new Date()
      const rescan = await prisma.$transaction(async (tx) => {
        await tx.auditScanHistory.create({
          data: {
            auditRoundId: id,
            auditItemId: item.id,
            assetId: item.assetId,
            scannedBy: user.id,
            scannedAt,
            scanLocationId: actual.locationId,
            scanSource: input.scanSource,
            rawPayload: JSON.stringify({ ...input, actual, outOfScope: true, rescan: true }),
            remark: input.remark,
          },
        })

        const knownFindings = await tx.auditFinding.findMany({
          where: { auditItemId: item.id, findingType: { in: [...auditCorrectableFindingTypes] }, reviewStatus: { in: ["pending", "approved"] } },
          select: { id: true, findingType: true, actualValue: true, reviewStatus: true },
        })
        const plan = planAuditOutOfScopeRescanFindings(knownFindings, fieldFindings, evidenceFieldTypes)
        const evidenceFindingIds: string[] = []

        // The pending out_of_scope finding shows what was found; a decided one is left as the reviewer left it.
        const outOfScopeFinding = await tx.auditFinding.findFirst({
          where: { auditItemId: item.id, findingType: "out_of_scope", reviewStatus: "pending" },
          select: { id: true },
        })
        if (outOfScopeFinding) {
          await tx.auditFinding.update({
            where: { id: outOfScopeFinding.id },
            data: {
              actualValue: JSON.stringify({
                assetTag: item.asset.assetTag,
                assetName: item.asset.name,
                locationId: actual.locationId,
                custodianId: actual.custodianId,
                departmentId: actual.departmentId,
                conditionId: actual.conditionId,
              }),
              remark: input.remark,
            },
          })
          evidenceFindingIds.push(outOfScopeFinding.id)
        }

        for (const fieldFinding of plan.create) {
          const created = await tx.auditFinding.create({
            data: {
              auditRoundId: id,
              auditItemId: item.id,
              assetId: item.assetId,
              findingType: fieldFinding.type,
              expectedValue: fieldFinding.expectedValue,
              actualValue: fieldFinding.actualValue,
              reportedBy: user.id,
              reviewStatus: "pending",
              remark: input.remark,
              actionTaken: "out_of_scope_actual_field_reported",
            },
          })
          evidenceFindingIds.push(created.id)
        }
        for (const { findingId, finding } of plan.update) {
          await tx.auditFinding.update({ where: { id: findingId }, data: { actualValue: finding.actualValue, remark: input.remark } })
          evidenceFindingIds.push(findingId)
        }
        if (plan.reject.length > 0) {
          await tx.auditFinding.updateMany({
            where: { id: { in: plan.reject }, reviewStatus: "pending" },
            data: { reviewStatus: "rejected", reviewRemark: staleFindingReviewRemark, reviewedBy: user.id, reviewedAt: scannedAt },
          })
        }

        if (evidenceAttachments.length > 0 && evidenceFindingIds.length > 0) {
          await tx.attachment.createMany({
            data: evidenceFindingIds.flatMap((findingId) =>
              evidenceAttachments.map((attachment) => ({
                assetId: item.assetId,
                module: "audit_finding",
                referenceId: findingId,
                fileName: attachment.fileName,
                originalName: attachment.originalName,
                fileType: attachment.fileType,
                fileSize: attachment.fileSize,
                filePath: attachment.filePath,
                uploadedBy: user.id,
              }))
            ),
          })
        }

        const pendingFindingCount = await tx.auditFinding.count({ where: { auditItemId: item.id, reviewStatus: "pending" } })
        return tx.auditItem.update({
          where: { id: item.id },
          data: {
            actualDepartmentId: actual.departmentId,
            actualLocationId: actual.locationId,
            actualCustodianId: actual.custodianId,
            actualConditionId: actual.conditionId,
            lastScanAt: scannedAt,
            scanCount: { increment: 1 },
            remark: input.remark,
            ...(pendingFindingCount > 0 ? { findingRequired: true, reconcileStatus: "pending" } : {}),
          },
        })
      })

      await logAudit({
        userId: user.id,
        action: "scan_result_corrected",
        module: "audit",
        recordId: item.id,
        oldValue: {
          auditStatus: item.auditStatus,
          auditResult: item.auditResult,
          scanCount: item.scanCount,
          actualDepartmentId: item.actualDepartmentId,
          actualLocationId: item.actualLocationId,
          actualCustodianId: item.actualCustodianId,
          actualConditionId: item.actualConditionId,
          remark: item.remark,
        },
        newValue: {
          auditRoundId: id,
          auditItemId: item.id,
          assetId: item.assetId,
          auditStatus: rescan.auditStatus,
          auditResult: rescan.auditResult,
          scanCount: rescan.scanCount,
          actualDepartmentId: rescan.actualDepartmentId,
          actualLocationId: rescan.actualLocationId,
          actualCustodianId: rescan.actualCustodianId,
          actualConditionId: rescan.actualConditionId,
          remark: rescan.remark,
          outOfScope: true,
          fieldFindingTypes,
        },
        remark: input.remark ?? undefined,
      })

      const rescannedBy = rescan.scannedBy
        ? await prisma.user.findUnique({ where: { id: rescan.scannedBy }, select: { displayName: true } })
        : null

      return NextResponse.json({
        status: "out_of_scope",
        auditResult: "out_of_scope",
        item: rescan,
        scannedByName: rescannedBy?.displayName ?? null,
      })
    }
  ```
  - The block must not contain the words `applyCorrections`, `tx.asset.update`, `tx.assetMovement.create`, `syncInstalledComponentsWithParent` or `canApplyAuditScanCorrections`, even in a comment (Step 2's slice pin).
  - The first branch (`:88-266`) is unchanged, so its `if (!item)` and its `const actual = {` stay the first of each (pin `:63-67`).
- `assertComponentInstalledUnderParent`, `:833-839`:

  ```ts
    // An out-of-scope find is not in the round, so it cannot vouch for a component either (P3-R3).
    const parentAuditItem = await tx.auditItem.findUnique({
      where: { auditRoundId_assetId: { auditRoundId, assetId: parentAssetId } },
      select: { id: true, auditResult: true },
    })
    if (!parentAuditItem || !isAuditRoundOwnItem(parentAuditItem)) {
      throw new Error("Component parent is not included in this audit round")
    }
  ```
  The pin `tests/audit-component-scan-api.test.ts:58-61` still finds `auditRoundId_assetId: { auditRoundId, assetId: parentAssetId }` and the message.
- After `optionalActualValue` (`:774-776`):

  ```ts
  // The evidence of an out-of-scope re-scan: the scanner's own active photos of this asset, read the way the first
  // out-of-scope scan reads them (above, inline). No ids, no query.
  async function findOutOfScopeEvidence(assetId: string, userId: string, attachmentIds: readonly string[]) {
    if (attachmentIds.length === 0) return []
    return prisma.attachment.findMany({
      where: { id: { in: [...attachmentIds] }, assetId, module: "asset", isActive: true, uploadedBy: userId },
      select: { fileName: true, originalName: true, fileType: true, fileSize: true, filePath: true },
    })
  }
  ```

**`src/app/api/audit-rounds/[id]/scan-lookup/route.ts`:**
- Import after `:7`: `import { isAuditRoundOwnItem } from "@/lib/audit-round-counts-rules"`.
- `:125-129`:

  ```ts
          // A recorded out-of-scope find is an item of the round but not in it (P3-R3).
          const inRoundItems = await prisma.auditItem.findMany({
            where: { auditRoundId: id, assetId: { in: partialMatches.map((match) => match.id) } },
            select: { assetId: true, auditResult: true },
          })
          const inRoundAssetIds = new Set(inRoundItems.filter(isAuditRoundOwnItem).map((roundItem) => roundItem.assetId))
  ```
- `:147-152`: the select becomes:

  ```ts
      select: {
        id: true,
        assetId: true,
        auditStatus: true,
        auditResult: true,
        expectedLocationId: true,
        expectedCustodianId: true,
        expectedDepartmentId: true,
        expectedConditionId: true,
        actualLocationId: true,
        actualCustodianId: true,
        actualDepartmentId: true,
        actualConditionId: true,
      },
  ```
- `:159-164`:

  ```ts
    // A related component or parent that is an out-of-scope find reads as not in the round, so the walk never confirms
    // it with its parent or marks it (P3-R3).
    const relatedAuditItems = relatedAssetIds.length
      ? (
          await prisma.auditItem.findMany({
            where: { auditRoundId: id, assetId: { in: relatedAssetIds } },
            select: { id: true, assetId: true, auditStatus: true, auditResult: true },
          })
        ).filter(isAuditRoundOwnItem)
      : []
  ```
- `:171-175`:

  ```ts
    // A recorded out-of-scope find answers out of scope with its item: the walk edits it through the out-of-scope form,
    // against the snapshot of its first scan, and the scan route keeps it out of scope (P3-R3).
    if (!item || !isAuditRoundOwnItem(item)) {
      return NextResponse.json({ status: "out_of_scope", ...payload, ...(item ? { item } : {}) })
    }

    return NextResponse.json({ status: "in_round", ...payload, item })
  ```
  The pins `tests/audit-scan-lookup.test.ts:29-31` (`auditRoundId_assetId`, `status: "out_of_scope"`, `status: "unknown_asset"`) and `tests/audit-component-scan-api.test.ts:12-21` (`relatedAuditItems`, `components:`, `installedIn:`) still hold.

**`src/components/audit/audit-scan-types.ts`:** add `AuditLookupRecordedFind` (Interfaces) after `:25`. `:52` becomes `| { status: "out_of_scope"; asset: AuditLookupAsset; item?: AuditLookupRecordedFind }`. The pins `tests/audit-scan-result-semantics.test.ts:12-15` still find each `status: "…"`.

**`src/lib/audit-round-counts-rules.ts:4-6`** become:

```ts
// out-of-scope finds are counted apart, from the same rows. A re-scan of an out-of-scope find keeps that result: the
// scan route's re-scan branch compares it with its first scan's snapshot and never makes it an own item (group 2 plan 3,
// P3-R3). Pure and client-safe: `import type` only, so node --test and the phone walk import it.
```

**No change:**
- the first out-of-scope scan (`:88-266`): its 202 answer, its history with `auditItemId: null`, its findings;
- the in-round path (`:423-691`);
- `buildOutOfScopeFieldFindings` and `getMismatches`;
- the walk (`audit-scan-workspace.tsx`).

**Before Tasks 2 and 4 land, the walk still opens a recorded find from its local search as a round item** (`audit-scan-workspace.tsx:455-458`) and posts the in-round payload. The server now routes that payload to this branch:
- no field that differs from the snapshot and changes in this save: it saves, out of scope (P3-R18);
- such a field with no photo: it is refused with "ต้องแนบหลักฐานเมื่อแก้ข้อมูลจริงที่อยู่นอกขอบเขต". A queued offline edit is marked failed in the queue (`:275-279`), with no silent conversion.

**E2E:** no step changes. X1 is recorded once, through the lookup and the first-scan branch (`e2e/audit/field-audit.spec.ts:244-256`), and no step scans it twice (recon tests-e2e row "Carry-over"). Task 6 adds the second scan.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test tests/audit-out-of-scope-rescan.test.ts tests/audit-scan-out-of-scope-rescan.test.ts tests/audit-scan-lookup-recorded-find.test.ts tests/audit-scan-lookup-partial.test.ts tests/audit-scan-lookup.test.ts tests/audit-out-of-scope-actual-field.test.ts tests/audit-round-counts.test.ts tests/audit-scan-edit-findings.test.ts tests/audit-scan-correction-approval.test.ts tests/audit-component-scan-api.test.ts tests/audit-scan-result-semantics.test.ts tests/audit-scan-search-ui.test.ts tests/audit-round-result-drilldown.test.ts tests/audit-round-page-rules.test.ts tests/api-error-catalog.test.ts tests/asset-movement-labels.test.ts tests/audit-round-cancellation.test.ts && npx tsc --noEmit`

Expected: PASS. Pins that hold untouched, checked against master:
- `audit-scan-edit-findings` and `audit-scan-correction-approval`: their items are own items (`auditResult: "wrong_location"` `:37` and `null` `:58`), so they stay on the in-round path.
- `audit-out-of-scope-actual-field.test.ts:76-81`: all six `optionalActualValue(…)` lines are still in the route.
- `audit-scan-search-ui.test.ts:188-189`: the in-round log line.
- `audit-round-result-drilldown.test.ts:204-207`: `actualLocationId: item.actualLocationId` and `auditItemId: item.id`.
- `audit-round-page-rules.test.ts:30-35`: no new system decision action. The re-scan closes with `staleFindingReviewRemark`.
- `api-error-catalog.test.ts:66-77`: no new literal.
- `asset-movement-labels.test.ts:43`: no new movement type.

Then run: `npm test && npm run lint`

Expected: PASS. A pin that fails outside this list is rewritten in this commit and named in the report.

- [ ] **Step 6: Commit**

```bash
git add src/lib/audit-out-of-scope-rescan.ts "src/app/api/audit-rounds/[id]/scan/route.ts" "src/app/api/audit-rounds/[id]/scan-lookup/route.ts" src/lib/validations/audit.ts src/components/audit/audit-scan-types.ts src/lib/audit-round-counts-rules.ts tests/audit-out-of-scope-rescan.test.ts tests/audit-scan-out-of-scope-rescan.test.ts tests/audit-scan-lookup-recorded-find.test.ts tests/audit-scan-lookup-partial.test.ts tests/audit-out-of-scope-actual-field.test.ts tests/audit-round-counts.test.ts
git commit -m "fix(audit-scan): a re-scan of an out-of-scope find stays out of scope: the scan route keeps its result and status, compares it with its first scan's snapshot, asks evidence for each differing field this save changes (a remark-only edit needs none), creates, moves and closes its field findings, refreshes the pending out_of_scope finding and never updates the master, whoever saves; a component confirm on it, or with it as the parent, is refused; the lookup answers a recorded find as out of scope with its item, and partial and related matches count own items only; at most 20 evidence photos per save (group 2 plan 3 task 1, P3-R3)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The walk's rules (pure): own items, one fold, search with true totals and room first, rooms within the department, the third tab's scope, category chips

The phone walk folds its numbers client-side from `items` (`AuditScanItemRow[]`, every AuditItem of the round, `src/lib/audit-scan-data.ts:37-41`). Today no phone count reads own items (recon-walk §0.1, §2). An out-of-scope find (`auditStatus: "reviewed"`, `auditResult: "out_of_scope"`, scan route :145-169) raises the header's total and checked, a room's total, the tab counts and the search. It can also open as a round item from a search hit, a camera match, a row or a component (recon-walk §0.2 a, b, d). The header's ไม่ตรง reads a checked item with a null result as "found" (`src/lib/audit-scan-session.ts:60`), while the round page counts it as ไม่ตรง (`src/lib/audit-round-result-filters.ts:244-248`, P2-R2).

This task rewrites the rules in `src/lib/audit-scan-session.ts`, which stays pure (relative `.ts` imports only, nothing from `@/`, pinned by `tests/audit-scan-refactor-boundaries.test.ts:54-61`):

1. **Own items (P3-R1).** Every count, room option, tab, chip, search and camera or asset match reads only the round's own items (`isAuditRoundOwnItem`). Each rule filters on its own, so no caller can forget. `applyScanResult` and `mergeStatusUpdates` keep every item.
2. **One fold (P3-R2).** `summarizeProgress` counts through `foldAuditRoundResultCounts` (plan 2), so the phone's "ไม่ตรง N" equals the round page's ไม่ตรง. `getAuditItemBadge` reads a checked item with no result as `mismatch` too, so the row badges add up to the header.
3. **Search (bug 20, P3-R5, P3-R17).** `searchAuditItems(items, term, custodianLabels, room)` returns `{ matches, total, inRoom, otherRooms }`. An exact code (today's tier 0: the tag, the serial or the fixed asset code typed whole) comes first wherever its room is; then the chosen room's matches, then the other rooms', each group in today's relevance order. Enter opens the first. The rule has no cap; the UI shows `auditScanSearchPageSize` (10) at a time.
4. **Rooms within the department (bug 21, P3-R13).** Each room option's departments carry `pending` as well as `total`. `selectAuditRoomProgress(rooms, room)` gives the room button's checked / total / pending within the chosen department.
5. **The third tab (P3-R7) and the footer (P3-R14).** `auditScanListScope(room)` is `"room"` with a room and `"round"` without, so one rule picks "ทั้งห้อง" / "ทั้งรอบ", the search line's wording and the footer's wording (Task 3 holds the words). `countAuditScanPendingForLink(items, room)` counts the room's pending own items, ignoring the department, as the pending list does.
6. **Category chips (decision 3, P3-R6).** `foldAuditScanCategoryChips(items, { room, tab, names })` gives `{ id, count }[]` within the room and tab. The order is count desc, then name; a category with no name comes last. It returns `[]` at one category or none. `resolveAuditScanCategory(chips, categoryId)` drops a chosen category that is no longer on the row. `buildRoomList` narrows its rows by the resolved category.
7. **Recorded out-of-scope finds, apart (P3-R25).** `listAuditScanRecordedOutOfScope(items, { roomId })` lists the round's recorded out-of-scope finds where they were found (`actualLocationId`, else the snapshot's `expectedLocationId`) in the chosen room, or round-wide with no room (`roomId: ""`), most recent first. No count, tab, chip or search reads it; Task 3 shows it as its own section under the ตรวจแล้ว tab.

The workspace gets only the edits that keep tsc green and close the camera and component entry points. Task 3 rebuilds the UI on these rules.

**Files:**
- Modify: `src/lib/audit-scan-session.ts`:
  - `:1-2` (imports: three relative imports added);
  - `:5` (`auditScanSearchLimit` → `auditScanSearchPageSize`);
  - `:50` (`foundResults` removed: `isSuccessfulAuditResult` replaces it);
  - `:56-62` (`getAuditItemBadge`: a checked null result reads `mismatch`);
  - `:64-73` (`summarizeProgress` through the fold);
  - `:79-109` (`buildRoomList`: own items, an optional `categoryId`, the tab test shared with the chips);
  - `:111-149` (`AuditRoomOption`: departments with `pending`; `buildRoomOptions` on own items);
  - after `:149`: `selectAuditRoomProgress`, `countAuditScanPendingForLink`, `auditScanListScope`;
  - `:151-200` (`AuditSearchMatch.elsewhere`, `AuditSearchResult`, `searchAuditItems` with the room and no cap);
  - after `:200`: `foldAuditScanCategoryChips`, `resolveAuditScanCategory`, `findAuditScanOwnItem`, `findAuditScanItemByCodes`, `listAuditScanRecordedOutOfScope` (P3-R25).
- Modify: `src/components/audit/audit-scan-workspace.tsx`:
  - `:38-55` (import: `auditScanSearchPageSize`, `findAuditScanItemByCodes`, `findAuditScanOwnItem` added);
  - `:151` (the search memo takes the room; `matches` becomes its first page);
  - `:464` (`pickRegisterMatch`), `:472-476` (`handleDecoded`), `:664` (`scanComponent`): own-item finds.
- Test:
  - `tests/audit-scan-session-walk.test.ts` (new, by value, plus two source pins);
  - `tests/audit-scan-session-list.test.ts:4-14` (import), `:94-116` (search pins rewritten, table in Step 2).

**Interfaces:**
- Consumes:
  - `isAuditRoundOwnItem(item: { auditResult: string | null }): boolean` (`src/lib/audit-round-counts-rules.ts:11-13`; plan 1, pure, `import type` only);
  - `foldAuditRoundResultCounts(rows: readonly AuditRoundResultCountRow[]): AuditRoundResultCounts`, with rows `{ auditStatus, auditResult, count }` and the result `{ all, pending, found, mismatch, notFound, outOfScope }` (`src/lib/audit-round-result-filters.ts:237-251`; plan 2, pure). Its imports are `./audit-result-summary.ts`, `./audit-round-counts-rules.ts` and `./audit-pending-list-rules.ts` (→ `./operational-return-navigation.ts`, no imports), all pure and relative, so the session stays client-safe;
  - `isSuccessfulAuditResult(result)` (`src/lib/audit-result-summary.ts:3-5`: `found` and `confirmed_with_parent`);
  - `filterAuditItemsByContext(items, context)` (`src/lib/audit-scan-context.ts:25-31`: location, then department);
  - `extractAssetLookupCandidatesFromScanValue(value): string[]` (`src/lib/asset-qr.ts:85-98`; already lowercased; the workspace already imports it at `:25`).
- Produces, all in `src/lib/audit-scan-session.ts` (names the UI reads today are kept: `summarizeProgress`, `buildRoomList`, `buildRoomOptions`, `searchAuditItems`, `getAuditItemBadge`, `AuditRoomOption`, `AuditSearchMatch`, `AuditScanListTab`):
  - `auditScanSearchPageSize = 10` (replaces `auditScanSearchLimit`, which only the session read).
  - `getAuditItemBadge(item: Pick<AuditScanItemRow, "auditStatus" | "auditResult">): AuditItemBadge | null`: `null` while pending; `not_found`; `out_of_scope`; `found` for `isSuccessfulAuditResult` (Task 3's `badgeFound` reads it "พบตรง", P3-R19); otherwise `mismatch`, a checked null result included (P2-R2).
  - `type AuditScanProgress = { total: number; checked: number; mismatched: number }` and `summarizeProgress(items: readonly AuditScanItemRow[]): AuditScanProgress`: from `foldAuditRoundResultCounts`, `total = all`, `checked = all - pending`, `mismatched = mismatch`. The header's prop type (`audit-scan-header.tsx:21`) is unchanged.
  - `buildRoomList({ items, room, tab, limit, locationLabels, categoryId }: { items: readonly AuditScanItemRow[]; room: AuditScanRoom; tab: AuditScanListTab; limit: number; locationLabels: ReadonlyMap<string, string>; categoryId?: string | null }): { rows: AuditScanItemRow[]; total: number; counts: Record<AuditScanListTab, number> }`:
    - own items in the room (location and department);
    - `counts` within the room, **not** the category, so each tab's count equals the chip row's "ทุกหมวดหมู่" (Drafter's notes 6, P3-R16);
    - `rows` and `total` within the room, the tab and `categoryId` when one is given;
    - the orders are today's (pending and all by place then tag, checked by most recent).
  - `type AuditRoomDepartmentOption = { departmentId: string; label: string; pending: number; total: number }`; `type AuditRoomOption = { locationId: string; label: string; pending: number; total: number; departments: AuditRoomDepartmentOption[] }`; `buildRoomOptions(items, locations, departments): AuditRoomOption[]` (signature kept, own items only).
  - `type AuditRoomProgress = { checked: number; total: number; pending: number }`; `selectAuditRoomProgress(rooms: readonly AuditRoomOption[], room: AuditScanRoom): AuditRoomProgress | null`:
    - `null` with no room, or a room that is not in `rooms`;
    - the department's numbers when `room.departmentId` is set (zeros when that department has no items in the room);
    - otherwise the room's numbers.
  - `countAuditScanPendingForLink(items: readonly AuditScanItemRow[], room: AuditScanRoom): number`: own pending items whose `expectedLocationId` is the room's, ignoring the department, the category and the tab; round-wide without a room.
  - `type AuditScanListScope = "room" | "round"`; `auditScanListScope(room: AuditScanRoom): AuditScanListScope`.
  - `type AuditSearchMatch = { item: AuditScanItemRow; field: AuditSearchField; value: string; tier: 0 | 1 | 2; elsewhere: boolean }`. `elsewhere` is true when a room is chosen and the item's expected location is another room: today's search-row expression (`audit-scan-search.tsx:141`) as a rule.
  - `type AuditSearchResult = { matches: AuditSearchMatch[]; total: number; inRoom: number; otherRooms: number }`; `searchAuditItems(items: readonly AuditScanItemRow[], term: string, custodianLabels: ReadonlyMap<string, string>, room: AuditScanRoom): AuditSearchResult`:
    - fewer than 2 characters → `{ matches: [], total: 0, inRoom: 0, otherRooms: 0 }`;
    - every own match, sorted by: an exact code (tier 0) first wherever its room is (P3-R17), then not elsewhere first, then tier, then pending first, then tag;
    - `total = matches.length`; `otherRooms` = the `elsewhere` matches; `inRoom = total - otherRooms` with a room, `0` without one.
  - `type AuditScanCategoryChip = { id: string; count: number }`; `type AuditScanCategoryNames = ReadonlyMap<string, { code: string; name: string }>`; `foldAuditScanCategoryChips(items: readonly AuditScanItemRow[], { room, tab, names }: { room: AuditScanRoom; tab: AuditScanListTab; names: AuditScanCategoryNames }): AuditScanCategoryChip[]`:
    - own items in the room and tab, grouped by `categoryId`;
    - sorted by count desc, then named before unnamed, then name (`localeCompare` "th"), then code, then id;
    - `[]` when one category or none (hidden, P3-R6).
  - `resolveAuditScanCategory(chips: readonly AuditScanCategoryChip[], categoryId: string | null): string | null`: the id while it is on the row, else `null`.
  - `findAuditScanOwnItem(items: readonly AuditScanItemRow[], assetId: string): AuditScanItemRow | null`.
  - `findAuditScanItemByCodes(items: readonly AuditScanItemRow[], candidates: readonly string[]): AuditScanItemRow | null`: an own item whose asset id, tag or serial equals a candidate, case-insensitive (today's camera fields, `audit-scan-workspace.tsx:473-476`).
  - `listAuditScanRecordedOutOfScope(items: readonly AuditScanItemRow[], { roomId }: { roomId: string }): AuditScanItemRow[]` (P3-R25): the items that are not own items (`!isAuditRoundOwnItem`), whose place (`actualLocationId ?? expectedLocationId`) is `roomId`, or all of them when `roomId` is `""`; most recent `lastScanAt` first, then tag. The department does not narrow it, as the footer's count does not.
- For later tasks:
  - Task 3 (walk UI):
    - the header keeps `progress={progress}`;
    - the room button reads `selectAuditRoomProgress(roomOptions, room)`;
    - the switch labels read `auditScanListScope(room)`: `tabAllRoom` / `tabAllRound` are new keys in Task 3, and the room-ui key pin `:124` is Task 3's;
    - the search line reads `search.total` / `search.inRoom` / `search.otherRooms` with `auditScanListScope(room)`;
    - the result rows read `match.elsewhere`;
    - "แสดงเพิ่ม" slices `search.matches` by `auditScanSearchPageSize`, resetting on a term change;
    - the chips read `foldAuditScanCategoryChips(items, { room, tab, names })`, with `names` from the new `categories` prop, and the list reads `buildRoomList({ …, categoryId: resolveAuditScanCategory(chips, chosen) })`;
    - the footer reads `countAuditScanPendingForLink(items, room)`;
    - the ตรวจแล้ว tab's "บันทึกนอกขอบเขตแล้ว N" section reads `listAuditScanRecordedOutOfScope(items, { roomId: room.locationId })` (P3-R25).
  - Task 4 (out-of-scope on the client): the `in_round` branch (`:428-438`) and the deep link (`initialTarget`, `:107-110`) are left for it (Drafter's notes 11).

- [ ] **Step 1: Write the failing test**

`tests/audit-scan-session-walk.test.ts` (new):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  auditScanListScope,
  auditScanSearchPageSize,
  buildRoomList,
  buildRoomOptions,
  countAuditScanPendingForLink,
  findAuditScanItemByCodes,
  findAuditScanOwnItem,
  foldAuditScanCategoryChips,
  getAuditItemBadge,
  listAuditScanRecordedOutOfScope,
  resolveAuditScanCategory,
  searchAuditItems,
  selectAuditRoomProgress,
  summarizeProgress,
  type AuditScanItemRow,
} from "../src/lib/audit-scan-session.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

function row(overrides: Partial<AuditScanItemRow> & Pick<AuditScanItemRow, "itemId" | "assetTag">): AuditScanItemRow {
  return {
    assetId: `asset-${overrides.itemId}`,
    name: "",
    serialNumber: null,
    fixedAssetCode: null,
    categoryId: "cat-pc",
    ownershipType: "shared",
    expectedLocationId: "loc-a",
    expectedCustodianId: null,
    expectedDepartmentId: "dept-1",
    expectedConditionId: "cond-good",
    actualLocationId: null,
    actualCustodianId: null,
    actualDepartmentId: null,
    actualConditionId: null,
    auditStatus: "pending",
    auditResult: null,
    lastScanAt: null,
    scannedByName: null,
    currentLocationId: "loc-a",
    currentCustodianId: null,
    currentDepartmentId: "dept-1",
    componentCount: 0,
    ...overrides,
  }
}

// Room A: w1-w4 (+ the out-of-scope find x1). Room B: w5-w7. x2 is a find whose master room is not in the round.
const walk: AuditScanItemRow[] = [
  row({ itemId: "w1", assetTag: "T-001", serialNumber: "SN-001", name: "โน้ตบุ๊ก Dell Latitude" }),
  row({ itemId: "w2", assetTag: "T-002", serialNumber: "SN-002", name: "โน้ตบุ๊ก Dell Vostro", auditStatus: "scanned", auditResult: "found", lastScanAt: "2026-10-07T03:00:00.000Z" }),
  row({ itemId: "w3", assetTag: "T-003", serialNumber: "SN-003", name: "ตู้เอกสาร A", categoryId: "cat-cab", expectedDepartmentId: "dept-2" }),
  // The review route sets the status only, so a checked item can have no result: it reads ไม่ตรง (P2-R2).
  row({ itemId: "w4", assetTag: "T-004", serialNumber: "SN-004", name: "จอ Dell P2422H", categoryId: "cat-mon", auditStatus: "reviewed", auditResult: null, lastScanAt: "2026-10-07T04:00:00.000Z" }),
  row({ itemId: "w5", assetTag: "T-005", serialNumber: "SN-005", name: "โน้ตบุ๊ก HP ProBook", expectedLocationId: "loc-b" }),
  row({ itemId: "w6", assetTag: "T-006", serialNumber: "SN-006", name: "ตู้เอกสาร B", categoryId: "cat-cab", expectedLocationId: "loc-b", auditStatus: "scanned", auditResult: "wrong_department", lastScanAt: "2026-10-07T05:00:00.000Z" }),
  row({ itemId: "w7", assetTag: "T-007", serialNumber: "SN-007", name: "โน้ตบุ๊ก Asus", expectedLocationId: "loc-b", expectedDepartmentId: "dept-2", auditStatus: "reviewed", auditResult: "not_found", lastScanAt: "2026-10-07T06:00:00.000Z" }),
  // Out-of-scope finds (scan route :145-169): AuditItems of the round, never its own items (spec §5, P3-R1).
  row({ itemId: "x1", assetTag: "X-001", serialNumber: "SN-X1", name: "โน้ตบุ๊ก Lenovo", auditStatus: "reviewed", auditResult: "out_of_scope", lastScanAt: "2026-10-07T07:00:00.000Z" }),
  row({ itemId: "x2", assetTag: "X-002", serialNumber: "SN-X2", name: "จอ Samsung", categoryId: "cat-mon", expectedLocationId: "loc-c", expectedDepartmentId: "dept-2", auditStatus: "reviewed", auditResult: "out_of_scope", lastScanAt: "2026-10-07T08:00:00.000Z" }),
]
const locations = [{ id: "loc-a", label: "A01 - ห้อง IT" }, { id: "loc-b", label: "B01 - บัญชี" }, { id: "loc-c", label: "C01 - คลัง" }]
const departments = [{ id: "dept-1", label: "D01 - ไอที" }, { id: "dept-2", label: "D02 - บัญชี" }]
const locationLabels = new Map(locations.map((option) => [option.id, option.label]))
const names = new Map([["cat-pc", { code: "PC", name: "คอมพิวเตอร์" }], ["cat-mon", { code: "MO", name: "จอภาพ" }], ["cat-cab", { code: "CB", name: "ตู้เอกสาร" }]])
const noRoom = { locationId: "", departmentId: "" }
const roomA = { locationId: "loc-a", departmentId: "" }
const roomB = { locationId: "loc-b", departmentId: "" }
const ids = (rows: readonly AuditScanItemRow[]) => rows.map((item) => item.itemId)

test("the header counts the round's own items through the round page's fold: ไม่ตรง includes a checked item with no result (spec §5, P3-R1, P3-R2)", () => {
  // Own: w1-w7. Pending w1, w3, w5; found w2; not found w7; ไม่ตรง w6 (wrong_department) and w4 (checked, no result).
  assert.deepEqual(summarizeProgress(walk), { total: 7, checked: 4, mismatched: 2 })
  assert.deepEqual(summarizeProgress([]), { total: 0, checked: 0, mismatched: 0 })
  // The row badge agrees with the count.
  assert.equal(getAuditItemBadge(walk[3]), "mismatch")
  assert.equal(getAuditItemBadge(walk[1]), "found")
  assert.equal(getAuditItemBadge(walk[0]), null)
  assert.equal(getAuditItemBadge(walk[7]), "out_of_scope")
})

test("the room list and its tabs read own items; a category narrows the rows but not the tab counts (P3-R1, P3-R6)", () => {
  const pending = buildRoomList({ items: walk, room: roomA, tab: "pending", limit: 50, locationLabels })
  assert.deepEqual(ids(pending.rows), ["w1", "w3"])
  assert.deepEqual(pending.counts, { pending: 2, checked: 2, all: 4 }, "x1 is in neither checked nor all")

  const checked = buildRoomList({ items: walk, room: roomA, tab: "checked", limit: 50, locationLabels })
  assert.deepEqual(ids(checked.rows), ["w4", "w2"], "most recent first; the find saved at 07:00 is not listed")

  const cabinets = buildRoomList({ items: walk, room: roomA, tab: "pending", limit: 50, locationLabels, categoryId: "cat-cab" })
  assert.deepEqual(ids(cabinets.rows), ["w3"])
  assert.equal(cabinets.total, 1)
  assert.deepEqual(cabinets.counts, { pending: 2, checked: 2, all: 4 }, "the tabs count the room, as the chip row's ทุกหมวดหมู่ does")

  const computers = buildRoomList({ items: walk, room: roomA, tab: "all", limit: 50, locationLabels, categoryId: "cat-pc" })
  assert.deepEqual(ids(computers.rows), ["w1", "w2"])

  const round = buildRoomList({ items: walk, room: noRoom, tab: "all", limit: 50, locationLabels, categoryId: null })
  assert.deepEqual(ids(round.rows), ["w1", "w2", "w3", "w4", "w5", "w6", "w7"], "by place, then tag")
  assert.deepEqual(round.counts, { pending: 3, checked: 4, all: 7 })
})

test("room options count own items, each department with its pending; the room button follows the chosen department (bug 21, P3-R13)", () => {
  const rooms = buildRoomOptions(walk, locations, departments)
  assert.deepEqual(rooms.map((option) => [option.locationId, option.pending, option.total]), [["loc-a", 2, 4], ["loc-b", 1, 3]], "x1 leaves room A at 4; x2 adds no room C")
  assert.deepEqual(rooms[0].departments.map((entry) => [entry.departmentId, entry.label, entry.pending, entry.total]), [["dept-1", "D01 - ไอที", 1, 3], ["dept-2", "D02 - บัญชี", 1, 1]])
  assert.deepEqual(rooms[1].departments.map((entry) => [entry.departmentId, entry.pending, entry.total]), [["dept-1", 1, 2], ["dept-2", 0, 1]])

  assert.deepEqual(selectAuditRoomProgress(rooms, roomA), { checked: 2, total: 4, pending: 2 })
  assert.deepEqual(selectAuditRoomProgress(rooms, { locationId: "loc-a", departmentId: "dept-1" }), { checked: 2, total: 3, pending: 1 })
  assert.deepEqual(selectAuditRoomProgress(rooms, { locationId: "loc-b", departmentId: "dept-2" }), { checked: 1, total: 1, pending: 0 })
  assert.deepEqual(selectAuditRoomProgress(rooms, { locationId: "loc-a", departmentId: "dept-9" }), { checked: 0, total: 0, pending: 0 }, "a stored department with no items in the room: the list is empty too")
  assert.equal(selectAuditRoomProgress(rooms, noRoom), null)
  assert.equal(selectAuditRoomProgress(rooms, { locationId: "loc-c", departmentId: "" }), null)
})

test("the footer counts the room's pending own items, department ignored, as the pending list it opens (P3-R14); one scope picks the room or round wording (P3-R7)", () => {
  assert.equal(countAuditScanPendingForLink(walk, { locationId: "loc-a", departmentId: "dept-1" }), 2)
  assert.equal(countAuditScanPendingForLink(walk, roomB), 1)
  assert.equal(countAuditScanPendingForLink(walk, noRoom), 3)
  assert.equal(auditScanListScope(roomA), "room")
  assert.equal(auditScanListScope({ locationId: "loc-a", departmentId: "dept-1" }), "room")
  assert.equal(auditScanListScope(noRoom), "round")
})

test("search: own items only, the chosen room first, the true total split in room and other rooms, no cap (bug 20, P3-R5)", () => {
  const custodians = new Map<string, string>()
  const inB = searchAuditItems(walk, "โน้ตบุ๊ก", custodians, roomB)
  assert.deepEqual(inB.matches.map((match) => [match.item.itemId, match.elsewhere]), [["w5", false], ["w7", false], ["w1", true], ["w2", true]], "room B first, then the rest; pending first within each")
  assert.deepEqual({ total: inB.total, inRoom: inB.inRoom, otherRooms: inB.otherRooms }, { total: 4, inRoom: 2, otherRooms: 2 })

  const round = searchAuditItems(walk, "โน้ตบุ๊ก", custodians, noRoom)
  assert.deepEqual(round.matches.map((match) => [match.item.itemId, match.elsewhere]), [["w1", false], ["w5", false], ["w2", false], ["w7", false]])
  assert.deepEqual({ total: round.total, inRoom: round.inRoom, otherRooms: round.otherRooms }, { total: 4, inRoom: 0, otherRooms: 0 })

  // The room is the place: a chosen department does not push the room's other items to "ห้องอื่น".
  const department = searchAuditItems(walk, "โน้ตบุ๊ก", custodians, { locationId: "loc-a", departmentId: "dept-2" })
  assert.deepEqual(department.matches.map((match) => match.item.itemId), ["w1", "w2", "w5", "w7"])
  assert.equal(department.inRoom, 2)

  // A recorded out-of-scope find is not a round item: no local match, so Enter goes to the register lookup.
  assert.deepEqual(searchAuditItems(walk, "X-001", custodians, roomA), { matches: [], total: 0, inRoom: 0, otherRooms: 0 })
  assert.deepEqual(searchAuditItems(walk, "โ", custodians, roomA), { matches: [], total: 0, inRoom: 0, otherRooms: 0 })

  const many = Array.from({ length: 30 }, (_, index) => row({ itemId: `m${index}`, assetTag: `ROOM-${String(index).padStart(2, "0")}` }))
  const all = searchAuditItems(many, "ROOM", custodians, noRoom)
  assert.equal(all.total, 30)
  assert.equal(all.matches.length, 30, "the UI pages them, the rule never caps")
  assert.equal(auditScanSearchPageSize, 10)
})

test("search: an exact code comes first wherever its room is, then the chosen room's matches, then the other rooms' (P3-R17)", () => {
  const custodians = new Map<string, string>()
  const codes = [
    row({ itemId: "c1", assetTag: "ROOM-1", expectedLocationId: "loc-b" }),
    row({ itemId: "c10", assetTag: "ROOM-10" }),
    row({ itemId: "c11", assetTag: "ROOM-11", auditStatus: "scanned", auditResult: "found" }),
    row({ itemId: "c12", assetTag: "ROOM-12", expectedLocationId: "loc-b" }),
  ]
  // "room-1" is c1's whole tag (tier 0) in room B, and the start of the other three: Enter opens c1 from room A.
  const exact = searchAuditItems(codes, "room-1", custodians, roomA)
  assert.deepEqual(exact.matches.map((match) => [match.item.itemId, match.tier, match.elsewhere]), [["c1", 0, true], ["c10", 1, false], ["c11", 1, false], ["c12", 1, true]])
  assert.deepEqual({ total: exact.total, inRoom: exact.inRoom, otherRooms: exact.otherRooms }, { total: 4, inRoom: 2, otherRooms: 2 }, "the line still counts by room")
  // A whole serial typed for an item of another room opens it too.
  assert.deepEqual(searchAuditItems(walk, "sn-005", custodians, roomA).matches.map((match) => [match.item.itemId, match.field, match.tier]), [["w5", "serialNumber", 0]])
  // A whole fixed asset code is tier 0 too: it opens from room A ahead of room A's prefix match.
  assert.deepEqual(searchAuditItems([row({ itemId: "f1", assetTag: "T-900", fixedAssetCode: "FA-9", expectedLocationId: "loc-b" }), row({ itemId: "f2", assetTag: "FA-90" })], "fa-9", custodians, roomA).matches.map((match) => [match.item.itemId, match.tier]), [["f1", 0], ["f2", 1]])
})

test("category chips count within the room and tab, largest first then by name, hidden at one category or none (decision 3, P3-R6)", () => {
  const chips = (room: { locationId: string; departmentId: string }, tab: "pending" | "checked" | "all", categoryNames = names) =>
    foldAuditScanCategoryChips(walk, { room, tab, names: categoryNames })
  assert.deepEqual(chips(roomA, "pending"), [{ id: "cat-pc", count: 1 }, { id: "cat-cab", count: 1 }], "equal counts by name: คอมพิวเตอร์, ตู้เอกสาร")
  assert.deepEqual(chips(roomA, "checked"), [{ id: "cat-pc", count: 1 }, { id: "cat-mon", count: 1 }], "x1 (cat-pc) adds nothing")
  assert.deepEqual(chips(roomA, "all"), [{ id: "cat-pc", count: 2 }, { id: "cat-mon", count: 1 }, { id: "cat-cab", count: 1 }])
  assert.deepEqual(chips(roomB, "pending"), [], "one category: hidden")
  assert.deepEqual(chips(roomB, "checked"), [{ id: "cat-pc", count: 1 }, { id: "cat-cab", count: 1 }])
  assert.deepEqual(chips({ locationId: "loc-a", departmentId: "dept-1" }, "all"), [{ id: "cat-pc", count: 2 }, { id: "cat-mon", count: 1 }])
  assert.deepEqual(chips({ locationId: "loc-a", departmentId: "dept-1" }, "pending"), [])
  assert.deepEqual(chips(noRoom, "all"), [{ id: "cat-pc", count: 4 }, { id: "cat-cab", count: 2 }, { id: "cat-mon", count: 1 }], "x1 and x2 leave cat-pc at 4 and cat-mon at 1")
  // A category the page has no name for (a later poll) sorts after the named ones at an equal count.
  const withoutMonitor = new Map([...names].filter(([id]) => id !== "cat-mon"))
  assert.deepEqual(chips(roomA, "all", withoutMonitor), [{ id: "cat-pc", count: 2 }, { id: "cat-cab", count: 1 }, { id: "cat-mon", count: 1 }])

  // A chosen category that left the row (its last pending item saved, or another tab) no longer narrows the list.
  const pendingA = chips(roomA, "pending")
  assert.equal(resolveAuditScanCategory(pendingA, "cat-cab"), "cat-cab")
  assert.equal(resolveAuditScanCategory(pendingA, "cat-mon"), null)
  assert.equal(resolveAuditScanCategory([], "cat-pc"), null)
  assert.equal(resolveAuditScanCategory(pendingA, null), null)
})

test("a camera code, a component and a register pick open own items only (P3-R1, recon-walk §0.2 b)", () => {
  assert.equal(findAuditScanItemByCodes(walk, ["x-001"]), null, "the find goes to the register lookup")
  assert.equal(findAuditScanItemByCodes(walk, ["t-005"])?.itemId, "w5")
  assert.equal(findAuditScanItemByCodes(walk, ["T-002"])?.itemId, "w2")
  assert.equal(findAuditScanItemByCodes(walk, ["nothing", "sn-006"])?.itemId, "w6")
  assert.equal(findAuditScanItemByCodes(walk, ["asset-w7"])?.itemId, "w7")
  assert.equal(findAuditScanItemByCodes(walk, []), null)
  assert.equal(findAuditScanOwnItem(walk, "asset-x1"), null)
  assert.equal(findAuditScanOwnItem(walk, "asset-w3")?.itemId, "w3")
})

test("recorded out-of-scope finds are listed apart, where they were found, most recent first; no own item among them (P3-R25)", () => {
  assert.deepEqual(ids(listAuditScanRecordedOutOfScope(walk, { roomId: "loc-a" })), ["x1"], "x1 has no found place, so its snapshot's room A")
  assert.deepEqual(ids(listAuditScanRecordedOutOfScope(walk, { roomId: "loc-b" })), [])
  assert.deepEqual(ids(listAuditScanRecordedOutOfScope(walk, { roomId: "" })), ["x2", "x1"], "no room: the round's, the 08:00 find first")
  // Found in room B, its master room C: listed under room B, where the walker recorded it.
  const foundInB = row({ itemId: "x3", assetTag: "X-003", expectedLocationId: "loc-c", actualLocationId: "loc-b", auditStatus: "reviewed", auditResult: "out_of_scope", lastScanAt: "2026-10-07T09:00:00.000Z" })
  assert.deepEqual(ids(listAuditScanRecordedOutOfScope([...walk, foundInB], { roomId: "loc-b" })), ["x3"])
  assert.deepEqual(ids(listAuditScanRecordedOutOfScope([...walk, foundInB], { roomId: "loc-c" })), ["x2"])
  // The tabs still count own items only: the list is apart from them.
  assert.deepEqual(buildRoomList({ items: walk, room: roomA, tab: "checked", limit: 50, locationLabels }).counts, { pending: 2, checked: 2, all: 4 })
})

test("the session stays pure and reads the shared own-item rule and fold; the workspace matches through it (P3-R1)", () => {
  const session = read("src/lib/audit-scan-session.ts")
  assert.match(session, /^import \{ isAuditRoundOwnItem \} from "\.\/audit-round-counts-rules\.ts"$/m)
  assert.match(session, /^import \{ foldAuditRoundResultCounts \} from "\.\/audit-round-result-filters\.ts"$/m)
  assert.doesNotMatch(session, /from "@\/|auditScanSearchLimit|foundResults/)

  const workspace = read("src/components/audit/audit-scan-workspace.tsx")
  assert.match(workspace, /const search = useMemo\(\(\) => searchAuditItems\(items, term, custodianLabels, room\), \[items, term, custodianLabels, room\]\)/)
  assert.match(workspace, /const item = findAuditScanItemByCodes\(items, extractAssetLookupCandidatesFromScanValue\(text\)\)/)
  assert.match(workspace, /const item = findAuditScanOwnItem\(items, component\.assetId\)/)
  assert.match(workspace, /const item = match\.inRound \? findAuditScanOwnItem\(items, match\.assetId\) : null/)
  assert.doesNotMatch(workspace, /candidates\.has\(/)
})
```

- [ ] **Step 2: Rewrite these pins** (`tests/audit-scan-session-list.test.ts`)

Add `const noRoom = { locationId: "", departmentId: "" }` after `labels` (`:53`). In the import (`:4-14`), add `auditScanSearchPageSize`.

| Line | Old | New |
|---|---|---|
| `:98` | `assert.deepEqual(searchAuditItems(items, "5", custodians), [])` | `assert.deepEqual(searchAuditItems(items, "5", custodians, noRoom), { matches: [], total: 0, inRoom: 0, otherRooms: 0 })` |
| `:100` | `const serial = searchAuditItems(items, "5CD1", custodians)` | `const serial = searchAuditItems(items, "5CD1", custodians, noRoom).matches` (`:101` stays) |
| `:103` | `const exact = searchAuditItems(items, "sni-equ-22-0310", custodians)` | `const exact = searchAuditItems(items, "sni-equ-22-0310", custodians, noRoom).matches` (`:104` stays) |
| `:106` | `const byName = searchAuditItems(items, "สมชาย", custodians)` | `const byName = searchAuditItems(items, "สมชาย", custodians, noRoom).matches` (`:107` stays) |
| `:109` | `const ranking = searchAuditItems(items, "SNI-EQU", custodians)` | `const ranking = searchAuditItems(items, "SNI-EQU", custodians, noRoom).matches` (`:110` stays: `["i1", "i3", "i2", "i5"]`) |
| after `:110` | — | `const inRoom = searchAuditItems(items, "SNI-EQU", custodians, { locationId: "loc-2", departmentId: "" })` then `assert.deepEqual(inRoom.matches.map((match) => match.item.itemId), ["i3", "i5", "i1", "i2"], "the chosen room first")` and `assert.deepEqual([inRoom.total, inRoom.inRoom, inRoom.otherRooms], [4, 2, 2])` |
| `:113-116` | `test("search returns at most ten results", …)` asserting `.length, 10` | `test("search returns every match with its true total; the screen pages them by ten (bug 20)", () => { const many = …(unchanged); const result = searchAuditItems(many, "ROOM", new Map(), noRoom); assert.equal(result.total, 30); assert.equal(result.matches.length, 30); assert.equal(auditScanSearchPageSize, 10) })` |

These stay as they are:
- `:55-63`: no fixture row is checked with a null result or out of scope, so the badges and `{ total: 5, checked: 3, mismatched: 1 }` (`:62`) hold through the fold.
- `:65-92`: `buildRoomList` and `buildRoomOptions` keep their call shapes. `counts` keeps its three keys (`:68`). `:91` maps only `departmentId` and `total`.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test tests/audit-scan-session-walk.test.ts tests/audit-scan-session-list.test.ts`
Expected: FAIL.
- Both files stop at the import: `audit-scan-session.ts` does not export `auditScanSearchPageSize` (nor `auditScanListScope`, `countAuditScanPendingForLink`, `findAuditScanItemByCodes`, `findAuditScanOwnItem`, `foldAuditScanCategoryChips`, `listAuditScanRecordedOutOfScope`, `resolveAuditScanCategory`, `selectAuditRoomProgress`).

- [ ] **Step 4: Implement `src/lib/audit-scan-session.ts`**

- **Imports (`:1-2`):**

  ```ts
  import { filterAuditItemsByContext, type AuditScanContext } from "./audit-scan-context.ts"
  import { normalizeAssetOwnershipType, requiresCustodian } from "./asset-ownership.ts"
  import { isSuccessfulAuditResult } from "./audit-result-summary.ts"
  import { isAuditRoundOwnItem } from "./audit-round-counts-rules.ts"
  import { foldAuditRoundResultCounts } from "./audit-round-result-filters.ts"
  ```
  (Two separate lines for the last two, as the source pin reads them.)
- **`:5`:** `/** The search shows this many matches at a time, and "แสดงเพิ่ม" adds as many again (bug 20, P3-R5). The rule returns them all. */ export const auditScanSearchPageSize = 10`.
- **Own items (new, after the types, before `isAuditItemChecked`):**

  ```ts
  // The round's own items (group 2 spec §5, P3-R1). An out-of-scope find is an AuditItem of the round (scan route), but
  // no phone count, room, tab, chip, search or match reads it. Each rule filters here, so a caller cannot forget;
  // applyScanResult and mergeStatusUpdates keep every item, so a saved find stays in state for the next poll.
  function ownItems<T extends { auditResult: string | null }>(items: readonly T[]): T[] {
    return items.filter(isAuditRoundOwnItem)
  }

  function isInAuditScanTab(item: Pick<AuditScanItemRow, "auditStatus">, tab: AuditScanListTab) {
    return tab === "all" || (tab === "checked") === isAuditItemChecked(item)
  }
  ```
- **`:50`, `:56-62`:** `foundResults` goes. `getAuditItemBadge` keeps its first three lines. Its last two become `return isSuccessfulAuditResult(item.auditResult) ? "found" : "mismatch"`, with the comment "P2-R2: a checked item with no result reads ไม่ตรง, as the header and the round page count it."
- **`:64-73`:**

  ```ts
  export type AuditScanProgress = { total: number; checked: number; mismatched: number }

  /** The header (spec §11, P3-R2): the round page's fold over the same rows, so "ไม่ตรง N" is the round page's ไม่ตรง. */
  export function summarizeProgress(items: readonly AuditScanItemRow[]): AuditScanProgress {
    const counts = foldAuditRoundResultCounts(items.map((item) => ({ auditStatus: item.auditStatus, auditResult: item.auditResult, count: 1 })))
    return { total: counts.all, checked: counts.all - counts.pending, mismatched: counts.mismatch }
  }
  ```
  The fold already leaves out the out-of-scope finds.
- **`buildRoomList` (`:79-109`):**
  - The input type gains `categoryId?: string | null`, with the default `categoryId = null` in the destructuring.
  - `inRoom = filterAuditItemsByContext(ownItems(items), room)`.
  - `pending` and `checked` keep their filters.
  - `byPlace` and `byRecent` are unchanged.
  - The source:

    ```ts
    const inTab = inRoom.filter((item) => isInAuditScanTab(item, tab) && (!categoryId || item.categoryId === categoryId))
    const source = inTab.sort(tab === "checked" ? byRecent : byPlace)
    ```
  - `counts` stays `{ pending: pending.length, checked: checked.length, all: inRoom.length }`, with the comment "Within the room, not the category: each tab's count is its chip row's ทุกหมวดหมู่ (P3-R6, P3-R16)."
- **Rooms (`:111-149`):**
  - Export `AuditRoomDepartmentOption`; `AuditRoomOption.departments` becomes `AuditRoomDepartmentOption[]`.
  - `buildRoomOptions` loops over `ownItems(items)`. The per-location entry's `departments` becomes `Map<string, { pending: number; total: number }>`: each department adds 1 to `total`, and 1 to `pending` while the item is pending.
  - The map to options writes `{ departmentId, label, pending, total }`. The sorts are unchanged.
- **After `buildRoomOptions` (new):**

  ```ts
  export type AuditRoomProgress = { checked: number; total: number; pending: number }

  /** The room button (spec §11, bug 21, P3-R13): the chosen room, within the chosen department when there is one, as the list counts it. */
  export function selectAuditRoomProgress(rooms: readonly AuditRoomOption[], room: AuditScanRoom): AuditRoomProgress | null {
    const option = room.locationId ? rooms.find((entry) => entry.locationId === room.locationId) : undefined
    if (!option) return null
    const scope = room.departmentId
      ? option.departments.find((entry) => entry.departmentId === room.departmentId) ?? { pending: 0, total: 0 }
      : option
    return { checked: scope.total - scope.pending, total: scope.total, pending: scope.pending }
  }

  /** The footer link (P3-R14): the pending list it opens filters by room only, so the department, category and tab do not narrow it. */
  export function countAuditScanPendingForLink(items: readonly AuditScanItemRow[], room: AuditScanRoom): number {
    return ownItems(items).filter((item) => !isAuditItemChecked(item) && (!room.locationId || item.expectedLocationId === room.locationId)).length
  }

  export type AuditScanListScope = "room" | "round"

  /** One rule for the words that follow the room (P3-R7): the third tab, the search line and the footer. */
  export function auditScanListScope(room: AuditScanRoom): AuditScanListScope {
    return room.locationId ? "room" : "round"
  }
  ```
- **Search (`:151-200`):**
  - `AuditSearchMatch` gains `elsewhere: boolean`. Add `export type AuditSearchResult = { matches: AuditSearchMatch[]; total: number; inRoom: number; otherRooms: number }`.
  - The new signature is `searchAuditItems(items, term, custodianLabels, room: AuditScanRoom): AuditSearchResult`, and the `limit` parameter goes.
  - Not ready → `return { matches: [], total: 0, inRoom: 0, otherRooms: 0 }`.
  - The loop runs over `ownItems(items)`. Per item, `const elsewhere = Boolean(room.locationId) && item.expectedLocationId !== room.locationId`, and `best` is built as `{ item, field, value: raw, tier, elsewhere }`. The tier logic is unchanged.
  - The sort:

    ```ts
    // An exact code first wherever its room is, so Enter opens what was typed whole (P3-R17); then the chosen room
    // (spec §11: a moved asset is what the audit must find, so the rest follow), then today's relevance in each group.
    // The rule keeps every match; the screen shows auditScanSearchPageSize at a time (bug 20).
    matches.sort((left, right) =>
      Number(left.tier !== 0) - Number(right.tier !== 0)
      || Number(left.elsewhere) - Number(right.elsewhere)
      || left.tier - right.tier
      || Number(isAuditItemChecked(left.item)) - Number(isAuditItemChecked(right.item))
      || compareText(left.item.assetTag, right.item.assetTag))
    const otherRooms = matches.filter((match) => match.elsewhere).length
    return { matches, total: matches.length, inRoom: room.locationId ? matches.length - otherRooms : 0, otherRooms }
    ```
- **After `splitSearchHighlight` (`:202`, new):**

  ```ts
  export type AuditScanCategoryChip = { id: string; count: number }
  export type AuditScanCategoryNames = ReadonlyMap<string, { code: string; name: string }>

  /** The category chips (decision 3, P3-R6): within the room and tab, largest first, then by name; hidden at one or none. */
  export function foldAuditScanCategoryChips(
    items: readonly AuditScanItemRow[],
    { room, tab, names }: { room: AuditScanRoom; tab: AuditScanListTab; names: AuditScanCategoryNames },
  ): AuditScanCategoryChip[] {
    const counts = new Map<string, number>()
    for (const item of filterAuditItemsByContext(ownItems(items), room)) {
      if (isInAuditScanTab(item, tab)) counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1)
    }
    if (counts.size <= 1) return []
    return [...counts.entries()]
      .map(([id, count]) => ({ id, count }))
      .sort((left, right) =>
        right.count - left.count
        || Number(!names.has(left.id)) - Number(!names.has(right.id))
        || compareText(names.get(left.id)?.name ?? "", names.get(right.id)?.name ?? "")
        || compareText(names.get(left.id)?.code ?? "", names.get(right.id)?.code ?? "")
        || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))
  }

  /** A chosen category narrows the list only while it is on the row, so a saved last item never leaves an empty list with no chip to clear. */
  export function resolveAuditScanCategory(chips: readonly AuditScanCategoryChip[], categoryId: string | null): string | null {
    return categoryId && chips.some((chip) => chip.id === categoryId) ? categoryId : null
  }

  /** An asset's own item, for a component, a register pick or a lookup (P3-R1). */
  export function findAuditScanOwnItem(items: readonly AuditScanItemRow[], assetId: string): AuditScanItemRow | null {
    return items.find((item) => item.assetId === assetId && isAuditRoundOwnItem(item)) ?? null
  }

  /** The camera's match (P3-R1): an own item by asset id, tag or serial; anything else goes to the register lookup. */
  export function findAuditScanItemByCodes(items: readonly AuditScanItemRow[], candidates: readonly string[]): AuditScanItemRow | null {
    const codes = new Set(candidates.map((value) => value.toLocaleLowerCase()))
    if (codes.size === 0) return null
    return ownItems(items).find((item) =>
      codes.has(item.assetId.toLocaleLowerCase())
      || codes.has(item.assetTag.toLocaleLowerCase())
      || (item.serialNumber ? codes.has(item.serialNumber.toLocaleLowerCase()) : false)) ?? null
  }

  /**
   * The round's recorded out-of-scope finds, apart from every count (P3-R25: spec §5 counts = lists, so they are no row
   * of a tab): where each was found (the snapshot's room when no place was recorded), in the chosen room or the whole
   * round, most recent first. The ตรวจแล้ว tab shows them as their own section, each opening its out-of-scope form.
   */
  export function listAuditScanRecordedOutOfScope(items: readonly AuditScanItemRow[], { roomId }: { roomId: string }): AuditScanItemRow[] {
    return items
      .filter((item) => !isAuditRoundOwnItem(item) && (!roomId || (item.actualLocationId ?? item.expectedLocationId) === roomId))
      .sort((left, right) => (right.lastScanAt ?? "").localeCompare(left.lastScanAt ?? "") || compareText(left.assetTag, right.assetTag))
  }
  ```
  `compareText` (`:75-77`) is declared above these functions, so they can call it. The time key is `buildRoomList`'s `byRecent` (`:99-100`).

- [ ] **Step 5: The workspace's edits (`src/components/audit/audit-scan-workspace.tsx`)**

The screen does not change yet; Task 3 rebuilds it on these rules.
- **Import (`:38-55`):** add `auditScanSearchPageSize`, `findAuditScanItemByCodes` and `findAuditScanOwnItem` in alphabetical order (after `auditScanPollIntervalMs`, and after `buildRoomOptions`).
- **`:151`:**

  ```ts
  const search = useMemo(() => searchAuditItems(items, term, custodianLabels, room), [items, term, custodianLabels, room])
  // The first page of the room-first matches until Task 3's "แสดงเพิ่ม" (bug 20).
  const matches = useMemo(() => search.matches.slice(0, auditScanSearchPageSize), [search])
  ```
  `submitSearch` (`:455-461`) and `matches={matches}` (`:736`) are unchanged. Enter now opens the first match: an exact code wherever its room is, else the chosen room's first (P3-R17).
- **`:464`:** `const item = match.inRoom ? findAuditScanOwnItem(items, match.assetId) : null`. The two lines after it are unchanged.
- **`:472-476`:** the `candidates` set and the `items.find(…)` give way to one line:

  ```ts
  const item = findAuditScanItemByCodes(items, extractAssetLookupCandidatesFromScanValue(text))
  ```
  `setCameraOpen(false)` stays the first line (`tests/audit-scan-search-ui.test.ts:108`). A decoded out-of-scope find now reaches `searchRegister(text)`, Task 1's lookup.
- **`:664`:** `const item = findAuditScanOwnItem(items, component.assetId)`. An out-of-scope component gets today's toast `componentOutOfRound` "ส่วนควบนี้ไม่มีรายการตรวจในรอบนี้".
- **No other workspace change:**
  - `summarizeProgress(items)` (`:147`), `buildRoomOptions(items, …)` (`:146`) and `buildRoomList({ items, room, tab, limit, locationLabels })` (`:150`) keep their text; the rules filter inside;
  - the `in_round` branch (`:428-438`) and `initialTarget` (`:107-110`) are Task 4's;
  - the header, the picker, the room list and the search results compile unchanged: the progress shape is kept, a department option only gains `pending`, and a match only gains `elsewhere`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `node --test tests/audit-scan-session-walk.test.ts tests/audit-scan-session-list.test.ts tests/audit-scan-session-check.test.ts tests/audit-scan-refactor-boundaries.test.ts tests/audit-scan-search-ui.test.ts tests/audit-scan-room-ui.test.ts tests/audit-scan-readable-result.test.ts tests/audit-component-scan-ui.test.ts tests/audit-out-of-scope-actual-field.test.ts tests/audit-scan-workspace-ui.test.ts tests/audit-round-list-filters.test.ts tests/audit-round-counts.test.ts && npx tsc --noEmit`
Expected: PASS.
- `audit-scan-refactor-boundaries.test.ts:59` still finds no `from "@/` in the session.
- `audit-scan-search-ui.test.ts:108` still finds `setCameraOpen(false)` first in `handleDecoded`.
- `audit-component-scan-ui.test.ts:34` still finds `onScanComponent={scanComponent}`.
- `audit-out-of-scope-actual-field.test.ts:46-49` still finds the four `values.x || null` lines.
- tsc: `AuditScanSearchResults` takes `matches: AuditSearchMatch[]` (`audit-scan-search.tsx:103`), and the extra `elsewhere` field fits. The picker reads `department.total` (`audit-scan-room-picker.tsx:105`), which is kept.

Then run: `npm test && npm run lint`
Expected: PASS. A pin that fails outside this list is rewritten in this commit and named in the report.

**Messages:** none. `auditScanListScope` returns a scope, not a key; Task 3 adds the words for it.

- [ ] **Step 7: Commit**

```bash
git add src/lib/audit-scan-session.ts src/components/audit/audit-scan-workspace.tsx tests/audit-scan-session-walk.test.ts tests/audit-scan-session-list.test.ts
git commit -m "feat(audit-scan): the walk's rules count the round's own items: the header folds as the round page does (a checked item with no result reads ไม่ตรง), the search keeps every match with its true total and the chosen room first, the room button follows the department, one scope for the room or round wording, category chips within the room and tab (hidden at one), the recorded out-of-scope finds listed apart (P3-R25), and the camera, a component and a register pick open own items only (group 2 plan 3 task 2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The walk UI (§11): the header, the room button, the room-first search with "แสดงเพิ่ม", the switch that names its scope, the category chips, the rows, the out-of-scope box and the footer link

The phone walk (AU-Scan-Phone) is rebuilt to spec §11 on Task 2's rules. Task 2 filters own items inside every rule, so the workspace passes `items` and never builds an own list itself (draft Task 2, Drafter's notes 1).

1. **Header.** Line 1 is the round code and line 2 the round's name, small. On the right, "x / y" sits above "ไม่ตรง N", which uses the round page's fold (P3-R2). The back button is named "กลับไปหน้ารอบ". The hand-made progress bar moves onto `PaceBar` (DESIGN.md:294 names plan 3 for this).
2. **Room button.** It reads "ห้องนี้ตรวจแล้ว x / y · เหลือ z" within the chosen department (bug 21, P3-R13), then "เปลี่ยนห้อง". The picker's rows read "ตรวจแล้ว x / y · เหลือ z". A department option reads "<department> · เหลือ p / t".
3. **Search.** The sticky xl `SearchField` is unchanged. The line reads `ผลค้นหา "q": ในห้องนี้ N · ห้องอื่น M` with a room, or `ผลค้นหา "q": N รายการ` without one. Results show 10 at a time, and "แสดงเพิ่ม" adds 10 (bug 20, P3-R5). An exact code comes first wherever its room is, then the room's matches (P3-R17). The switch stays above the results. Pressing a tab leaves the search for that tab's list. Enter opens the first match.
4. **Switch.** The tabs are ยังไม่ตรวจ / ตรวจแล้ว / ทั้งห้อง (with a room) or ทั้งรอบ (without one), each with a count (P3-R7).
5. **Category chips.** A shared `Segmented` (not `fill`) sits in its own `overflow-x-auto` row under the switch: "ทุกหมวดหมู่" (the round page's word for the same filter, P3-R16) and then each category of the room and tab. The chips are hidden at one category or none. A room change clears the chosen category, whichever way the room changed. While searching, the chips are not shown (P3-R6).
6. **Rows.** The name is bold, the code (mono) sits under it, then the custodian and "ส่วนควบ N" (`componentCount`). The badges and "ตรวจโดย … เวลา" stay; the found badge reads "พบตรง", spec §5's word for the result, in the rows and the search results alike (P3-R19).
7. **Out-of-scope box.** "เจอของที่ไม่อยู่ในรายการ?" with the button "บันทึกนอกขอบเขต" is always shown. Tapping it focuses the search and shows the hint "พิมพ์รหัสหรือ Serial ของที่เจอ แล้วกดค้นทะเบียน" under the box. The record still goes through the register lookup. While the hint is up, the lookup card also shows under the matches, so "ค้นในทะเบียนทั้งหมด" is there even when the typed code also matches round items.
8. **Footer link.** It reads "ของในห้องนี้ที่ยังหาไม่เจอ N รายการ →", or "ของในรอบนี้ที่ยังหาไม่เจอ N รายการ →" without a room. N is the room's pending own items by place (P3-R14). The link opens the pending list with that room, and the scan page is its returnTo, as today.
9. **The page** passes the round's name and `categories: { id, code, name }[]`, read through the relation with no `isActive` filter. An id with no name reads "หมวดหมู่อื่น" (P3-R6).
10. **Recorded out-of-scope finds (P3-R25).** The ตรวจแล้ว tab ends with a small section "บันทึกนอกขอบเขตแล้ว N": the round's recorded out-of-scope finds in the chosen room, or in the round with no room (Task 2's `listAuditScanRecordedOutOfScope`). Each row shows the name, the code, "ตรวจโดย … เวลา" and the "นอกขอบเขต" badge. They are counted apart: the section's N equals its rows, while the tabs, the chips and the header still count own items only (spec §5). Tapping one opens its out-of-scope form the way the deep link does: its tag fills the search and the register lookup runs, which Task 4 turns into the out-of-scope form at once. Not shown while searching, and not rendered at N = 0.

What stays (Appendix A §11, as a checklist):
- the offline bar and queue (send now, remove, other people's held checks);
- the "บันทึกแล้ว" banner with "แก้" and the photo resend;
- the closed-round notice with its back link;
- the lookup card and all its states;
- the sticky search;
- "แสดงเพิ่ม" past 50 in the list;
- the room picker's department choice and its clear;
- the row badges (พบตรง / ไม่ตรง / หาไม่พบ / รอส่ง on the own-item rows; "นอกขอบเขต" on the ตรวจแล้ว tab's recorded finds, P3-R25) and "ตรวจโดย … เวลา";
- the wide-screen side-by-side layout.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/audit/rounds/[id]/scan/page.tsx`:
  - `:6` (import);
  - `:39-50` (the fourth load);
  - `:74` (`roundName`);
  - after `:87` (the `categories` prop).
- Modify: `src/lib/audit-scan-data.ts`: after `:67`, add `loadAuditScanCategories`, plus its type import.
- Modify: `src/lib/audit-scan-session.ts`: after `:16` (`AuditScanOptions`), add `export type AuditScanCategory`. This is a type only; Task 2 owns the rules.
- Modify: `src/components/audit/audit-scan-header.tsx`: `:1-61`, rewritten.
- Modify: `src/components/audit/audit-scan-room-picker.tsx`:
  - `:3-13` (imports);
  - `:33-38` (`selectAuditRoomProgress`);
  - `:59-69` (the trigger's counts);
  - `:105` (the department option);
  - `:128-130` (the row counts).
- Modify: `src/components/audit/audit-scan-room-list.tsx`: `:1-150`. The props, the tab words, the chips, the rows, the footer and the searching mode are rewritten.
- Modify: `src/components/audit/audit-scan-search.tsx`:
  - `:3` (`useId`);
  - `:19-91` (the `hint` prop and its line);
  - `:93-177` (the result line, the page of 10, "แสดงเพิ่ม", `match.elsewhere`, and the lookup after matches).
- Modify: `src/components/audit/audit-scan-lookup-card.tsx`: `:24-39` (the optional `title` prop).
- Modify: `src/components/audit/audit-scan-workspace.tsx`. On master the block lines are listed below; Task 2 has edited `:38-55`, `:151`, `:464`, `:472-476` and `:664`, so each block is named by its content:
  - the imports (`:3-58`);
  - the props (`:68-95`);
  - the state (`:105-106`);
  - the derived values (`:144-161`, plus Task 2's `search` / `matches` lines);
  - `changeRoom` / `changeTerm` / `clearSearch` (`:392-408`) and the new `changeTab`, `changeCategory`, `startOutOfScopeFind` and `openRecordedOutOfScope` (P3-R25);
  - `submitSearch` (`:455-461`);
  - `finishSave` (`:486-500`);
  - the search field (`:699-708`);
  - the list area (`:732-770`), plus the box after it.
- Modify: `DESIGN.md`:
  - `:294` (the scan header is on `PaceBar` now);
  - `:653-654` (the field-work pattern: the switch, the chips, the room-first search and the out-of-scope box).
- Modify: `messages/th.json`, `messages/en.json` (through `node scripts/messages-edit.mjs`).
- Modify (so `npm test` stays green, read by `tests/e2e-audit.test.ts:178`):
  - `e2e/audit/field-audit.spec.ts:302` (the footer link's new name);
  - `tests/e2e-audit.test.ts:178`.
- Test:
  - `tests/audit-scan-walk-ui.test.ts` (new: source pins plus the messages by value);
  - pins rewritten:
    - `tests/audit-scan-room-ui.test.ts:16-22`, `:24-39`, `:41-47`, `:75-83`, `:85-93` (`:89`), `:123-129`;
    - `tests/audit-scan-sweep-ui.test.ts:92-101`, `:103-115`, `:117-127`;
    - `tests/audit-scan-search-ui.test.ts:29-35`, `:49-53`, `:83-88`;
    - `tests/list-frame-guards.test.ts:143`, `:149` (the `why` text only; the counts stay 1);
    - `tests/visual-foundation-guards.test.ts:379` (the room list's raw buttons: 1 becomes 2, the recorded finds' row, P3-R25);
    - `tests/audit-rounds-ux.test.ts:186-192` (the DESIGN.md Data Bars Rule's scan-header sentence).

**Interfaces:**
- Consumes:
  - Task 2 (`src/lib/audit-scan-session.ts`, draft Task 2 "Produces"):
    - `summarizeProgress(items): { total: number; checked: number; mismatched: number }`: own items through `foldAuditRoundResultCounts`;
    - `buildRoomList({ items, room, tab, limit, locationLabels, categoryId }): { rows; total; counts: Record<AuditScanListTab, number> }`: `counts` is within the room, not the category; `rows` and `total` are within the category;
    - `buildRoomOptions(items, locations, departments): AuditRoomOption[]`, with `departments: { departmentId; label; pending; total }[]`;
    - `selectAuditRoomProgress(rooms, room): { checked; total; pending } | null`;
    - `countAuditScanPendingForLink(items, room): number`;
    - `type AuditScanListScope = "room" | "round"` and `auditScanListScope(room)`;
    - `type AuditSearchResult = { matches: AuditSearchMatch[]; total; inRoom; otherRooms }` and `searchAuditItems(items, term, custodianLabels, room): AuditSearchResult`;
    - `AuditSearchMatch.elsewhere: boolean`;
    - `auditScanSearchPageSize = 10`;
    - `type AuditScanCategoryChip = { id: string; count: number }`, `type AuditScanCategoryNames = ReadonlyMap<string, { code: string; name: string }>` and `foldAuditScanCategoryChips(items, { room, tab, names }): AuditScanCategoryChip[]`, which returns `[]` at one category or none;
    - `resolveAuditScanCategory(chips, categoryId: string | null): string | null`;
    - `listAuditScanRecordedOutOfScope(items, { roomId }): AuditScanItemRow[]` (P3-R25).
  - Task 2's workspace lines kept as they are:
    - `const search = useMemo(() => searchAuditItems(items, term, custodianLabels, room), [items, term, custodianLabels, room])`;
    - the camera, component and register-pick lines (pinned by `tests/audit-scan-session-walk.test.ts`).
  - Task 2's temporary `const matches = useMemo(() => search.matches.slice(0, auditScanSearchPageSize), [search])` is removed here. Task 2's pins do not read it.
  - Shared parts, with their real props:
    - `Segmented({ "aria-label", value, options: { value, label: ReactNode }[], onValueChange, size?: "sm" | "md", fill?, showCheck?, className? })` (`src/components/ui/segmented.tsx:7-21`). It renders `role="group"` with `aria-pressed` buttons, `inline-flex` and `whitespace-nowrap px-3` when not `fill`;
    - `PaceBar({ value, pace, label, behind })` (`pace-bar.tsx:12`): `role="img"` named by `label`;
    - `SearchField` (input props plus `type`, `fieldSize`, `trailing`, `onClear` + `clearLabel`; `search-field.tsx:7-13`);
    - `ContentPanel({ title?, description?, actions?, children, className? })` (`content-panel.tsx:5-11`);
    - `Button({ variant, size, onClick, className })`;
    - `StatusBadge`, `EmptyNote`, `linkVariants`, `buttonVariants`, `formatCount`.
  - `getAuditRoundOptions` is unchanged. Its categories are active only (`audit-options.ts:27`), so the page does not use them.
- Produces:
  - `src/lib/audit-scan-session.ts`: `export type AuditScanCategory = { id: string; code: string; name: string }`.
  - `src/lib/audit-scan-data.ts`: `loadAuditScanCategories(roundId: string): Promise<AuditScanCategory[]>`. It reads every category of the round's items through the relation (`assets.some.auditItems.some.auditRoundId`), with no id list and no `isActive` filter, ordered by name then id.
  - `AuditScanWorkspace` gains the prop `categories: AuditScanCategory[]`. `roundName` is now the round's name only.
  - `AuditScanRoomList` props: `rows`, `total`, `counts`, `tab`, `scope: AuditScanListScope`, `searching: boolean`, `onTabChange`, `categories: AuditScanCategoryRow | null`, `categoryId: string | null`, `onCategoryChange: (categoryId: string | null) => void`, `onShowMore`, `onOpen`, `queuedAssetIds`, `custodianLabels`, `locationLabels`, `showLocation`, `pendingHref`, `pendingCount: number`, `recordedOutOfScope: AuditScanItemRow[]`, `onOpenRecorded: (item: AuditScanItemRow) => void` (P3-R25) and `activeItemId?`. The type is `export type AuditScanCategoryRow = { all: number; chips: Array<{ id: string; label: string; count: number }> }`.
  - `AuditScanSearchField` gains `hint: string | null`.
  - `AuditScanSearchResults` props: `term`, `search: AuditSearchResult`, `limit: number`, `scope: AuditScanListScope`, `onShowMore`, `locationLabels`, `queuedAssetIds`, `onOpen`, `lookup`, `lookupAfterMatches: boolean`. The `matches` and `room` props go.
  - `AuditScanLookupCard` gains `title?: string`: the first line, which defaults to "ไม่พบในรอบนี้".
  - The markup Task 6's E2E stands on (th):
    - **Header** `[data-audit-scan-header]`:
      - the link "กลับไปหน้ารอบ" (`getByRole("link", { name: "กลับไปหน้ารอบ" })`);
      - one `h1` holding the round code, then the round's name;
      - at the right, `[data-audit-scan-progress]`: "x / y" over "ไม่ตรง N" (Task 6's `scan.progress`);
      - `getByRole("img", { name: "ตรวจแล้ว x / y" })` (the `PaceBar`).
      - Every number counts own items only. ไม่ตรง equals the round page's ไม่ตรง chip.
    - **Room button** `[data-audit-scan-room]`: the room "<code> - <name>" (with " · <department>" when one is chosen), then "ห้องนี้ตรวจแล้ว x / y · เหลือ z", then "เปลี่ยนห้อง". With no room it reads "เลือกห้องที่กำลังตรวจ".
    - **Picker** `getByRole("dialog", { name: "ห้องที่กำลังตรวจ" })`:
      - each room is a button whose name starts with "<code> - <name>" and goes on "ตรวจแล้ว x / y · เหลือ z";
      - the department select's options read "<department> · เหลือ p / t";
      - the footer button is "ไม่เลือกห้อง".
    - **Switch** `[data-audit-scan-room-list]` → `getByRole("group", { name: "สถานะรายการ" })`. Three buttons: `^ยังไม่ตรวจ\s*N$`, `^ตรวจแล้ว\s*N$`, and `^ทั้งห้อง\s*N$` with a room or `^ทั้งรอบ\s*N$` without one. The pressed one has `aria-pressed="true"`. The switch is shown while searching too.
    - **Chips** `[data-audit-scan-categories]` → `getByRole("group", { name: "หมวดหมู่" })`:
      - buttons `^ทุกหมวดหมู่\s*N$` (N = the tab's count, P3-R16) first, then `^<category name>\s*N$`, by count desc then name;
      - a category with no name reads "หมวดหมู่อื่น";
      - absent (count 0) when the room and tab hold one category or none, and while searching;
      - choosing one narrows the rows and leaves the tab counts as they are;
      - after any room change, "ทุกหมวดหมู่" is pressed again.
    - **Rows** `[data-audit-scan-row]` buttons. Each name holds, in order:
      - the asset name;
      - the tag;
      - the room (no room chosen only);
      - "<custodian label>" and/or "ส่วนควบ N" joined by " · ";
      - "ตรวจโดย <name> · <HH:MM>" once checked;
      - the badge ("พบตรง", "ไม่ตรง", "หาไม่พบ" or "รอส่ง"; P3-R19), or nothing while pending. A recorded out-of-scope find is never one of these rows (P3-R1); it is listed apart, below.
    - **Recorded finds** `[data-audit-scan-recorded-out-of-scope]` (ตรวจแล้ว tab only, not while searching, absent at 0; P3-R25), after the rows inside `[data-audit-scan-room-list]`:
      - the heading "บันทึกนอกขอบเขตแล้ว N", N = its rows: the round's recorded out-of-scope finds in the chosen room, or all of them with no room;
      - each row is a button `[data-audit-scan-recorded-row]` (not `data-audit-scan-row`, so `scan.roomRows` never counts it) whose name holds the asset name, the tag, "ตรวจโดย <name> · <HH:MM>" and the badge "นอกขอบเขต";
      - the tab counts, the chips and the header do not count them;
      - a tap fills the search with the tag and runs the register lookup, which opens the out-of-scope form with "บันทึกนอกขอบเขตไว้แล้ว · บันทึกตอนนี้จะเป็นการแก้" (Task 4).
    - **Search** `[data-audit-scan-results]`:
      - the `status` (sr-only) and the visible line read `ผลค้นหา "<typed>": ในห้องนี้ N · ห้องอื่น M` with a room, or `ผลค้นหา "<typed>": N รายการ` without one;
      - with no match the status is "ไม่พบในรอบนี้" and the lookup card shows;
      - an exact code comes first wherever its room is, then the chosen room's items (P3-R17);
      - the 10th row is the last until "แสดงเพิ่ม" (`getByRole("button", { name: "แสดงเพิ่ม" })`).
    - **Out-of-scope box** `[data-audit-scan-out-of-scope]`: the text "เจอของที่ไม่อยู่ในรายการ?" and `getByRole("button", { name: "บันทึกนอกขอบเขต", exact: true })`. The check form's save button has the same name, so scope to the box. A tap focuses the search box (named "ค้นหาทรัพย์สินในรอบนี้"), whose description is "พิมพ์รหัสหรือ Serial ของที่เจอ แล้วกดค้นทะเบียน". That text shows under the box until a save or a clear.
    - **Footer** (ยังไม่ตรวจ tab only, N > 0): `getByRole("link", { name: "ของในห้องนี้ที่ยังหาไม่เจอ N รายการ →" })`, or "ของในรอบนี้ที่ยังหาไม่เจอ N รายการ →" with no room. N is the room's pending own items. The department, the category and the tab do not narrow it.

- [ ] **Step 1: Write the failing test**

`tests/audit-scan-walk-ui.test.ts` (new):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 2 plan 3 Task 3 (spec §11, bugs 20 and 21, P3-R1, P3-R2, P3-R5 to P3-R7, P3-R13, P3-R14, P3-R25): the phone walk on
// Task 2's rules. The rules are tested by value in tests/audit-scan-session-walk.test.ts; these pin the wiring and the
// markup Task 6's E2E reads. Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const A = "src/components/audit/"
const PAGE = "src/app/[locale]/(dashboard)/audit/rounds/[id]/scan/page.tsx"
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).auditScan

test("the page passes the round's name and every category of its items, closed ones included, read through the relation (spec §11, P3-R6)", () => {
  const page = read(PAGE)
  assert.match(page, /^import \{ loadAuditScanCategories, loadAuditScanRows \} from "@\/lib\/audit-scan-data"$/m)
  assert.match(page, /const \[round, options, rows, categories\] = await withPerformanceTiming\(/)
  assert.match(page, /loadAuditScanRows\(id\),\n\s+loadAuditScanCategories\(id\),\n\s+\]\),/)
  assert.match(page, /roundName=\{round\.name\}/)
  assert.match(page, /roundCode=\{round\.auditNo\}/)
  assert.match(page, /categories=\{categories\}/)
  assert.doesNotMatch(page, /roundName=\{`/, "line 2 is the name alone; line 1 is the code")
  const data = read("src/lib/audit-scan-data.ts")
  const loader = data.slice(data.indexOf("export async function loadAuditScanCategories"))
  assert.match(loader, /^export async function loadAuditScanCategories\(roundId: string\): Promise<AuditScanCategory\[\]> \{/)
  assert.match(loader, /where: \{ assets: \{ some: \{ auditItems: \{ some: \{ auditRoundId: roundId \} \} \} \} \},/)
  assert.match(loader, /select: \{ id: true, code: true, name: true \},/)
  assert.match(loader, /orderBy: \[\{ name: "asc" \}, \{ id: "asc" \}\],/)
  assert.doesNotMatch(loader, /isActive|\bin: /, "no active filter (a closed category keeps its name) and no id list (SQL Server's 2,100 parameters)")
  assert.match(read("src/lib/audit-scan-session.ts"), /^export type AuditScanCategory = \{ id: string; code: string; name: string \}$/m)
})

test("the header: back named กลับไปหน้ารอบ, the code over the name, x / y over ไม่ตรง N, then the round's PaceBar (spec §11, DESIGN.md Data Bars)", () => {
  const source = read(`${A}audit-scan-header.tsx`)
  assert.match(source, /<Link href=\{backHref\} aria-label=\{t\("backToRound"\)\} className=\{buttonVariants\(\{ variant: "ghost", size: "icon" \}\)\}>\s*<ArrowLeft className="size-5" aria-hidden="true" \/>/)
  const h1 = source.slice(source.indexOf("<h1"), source.indexOf("</h1>"))
  assert.match(h1, /<h1 className="min-w-0 flex-1 text-foreground">/)
  assert.match(h1, /<span className="block truncate text-base font-semibold md:text-xl">\{roundCode\}<\/span>\s*<span className="block truncate text-meta text-muted-foreground">\{roundName\}<\/span>/)
  assert.match(source, /<\/h1>\s*<p data-audit-scan-progress className="shrink-0 pr-1 text-right text-meta num text-muted-foreground">\s*<span className="block font-medium text-foreground">\{t\("progressCount", \{ checked, total \}\)\}<\/span>\s*<span className=\{cn\("block", progress\.mismatched > 0 && "font-medium text-warning"\)\}>\{t\("progressMismatch", \{ count: formatCount\(progress\.mismatched\) \}\)\}<\/span>\s*<\/p>/)
  assert.match(source, /const checked = formatCount\(progress\.checked\)\n\s+const total = formatCount\(progress\.total\)/)
  assert.match(source, /<PaceBar value=\{progress\.total === 0 \? 0 : progress\.checked \/ progress\.total\} pace=\{null\} label=\{t\("progressChecked", \{ checked, total \}\)\} behind=\{false\} \/>/)
  assert.doesNotMatch(source, /role="progressbar"|bg-success|md:hidden|sr-only|tCommon|useLocale/)
})

test("the room button reads ห้องนี้ตรวจแล้ว x / y · เหลือ z within the chosen department; the rows and the department options count the same way (bug 21, P3-R13)", () => {
  const source = read(`${A}audit-scan-room-picker.tsx`)
  assert.match(source, /const progress = selectAuditRoomProgress\(rooms, room\)/)
  const trigger = source.slice(source.indexOf("<SheetTrigger"), source.indexOf("</SheetTrigger>"))
  assert.match(trigger, /\{selected && progress \? \(/)
  assert.match(trigger, /<span className="block text-meta font-normal num">\s*\{t\("roomCheckedOfTotal", \{ checked: formatCount\(progress\.checked\), total: formatCount\(progress\.total\), pending: formatCount\(progress\.pending\) \}\)\}/)
  assert.match(trigger, /t\("roomChange"\)/)
  assert.match(trigger, /t\("roomPick"\)/)
  assert.match(source, /<span className="shrink-0 text-meta num text-muted-foreground">\s*\{t\("roomOptionCounts", \{ checked: formatCount\(option\.total - option\.pending\), total: formatCount\(option\.total\), pending: formatCount\(option\.pending\) \}\)\}/)
  assert.match(source, /\{t\("roomDepartmentOption", \{ department: department\.label, pending: formatCount\(department\.pending\), total: formatCount\(department\.total\) \}\)\}/)
  assert.doesNotMatch(source, /roomPendingOfTotal|\(\{department\.total\}\)/)
})

test("the switch names its scope, the chips are a shared Segmented in their own sideways row, and searching keeps only the switch (spec §11, decision 3, P3-R6, P3-R7)", () => {
  const source = read(`${A}audit-scan-room-list.tsx`)
  assert.match(source, /room: \{ pending: "tabPending", checked: "tabChecked", all: "tabAllRoom" \},\n\s+round: \{ pending: "tabPending", checked: "tabChecked", all: "tabAllRound" \},/)
  assert.match(source, /room: \{ pending: "emptyPending", checked: "emptyChecked", all: "emptyAll" \},\n\s+round: \{ pending: "emptyPending", checked: "emptyChecked", all: "emptyAllRound" \},/)
  assert.match(source, /\{t\(tabLabelKey\[scope\]\[key\]\)\}\n\s+<span className="num">\{formatCount\(counts\[key\]\)\}<\/span>/)
  // While a search runs, the switch stays above the results and nothing else of the list renders.
  const afterSwitch = source.slice(source.indexOf("{searching ? null : ("))
  assert.ok(source.indexOf('aria-label={t("roomListTabs")}') < source.indexOf("{searching ? null : ("), "the switch comes first")
  for (const part of ["data-audit-scan-categories", "data-audit-scan-row", 't("showMore")', "href={pendingHref}"]) assert.ok(afterSwitch.includes(part), part)
  // The chips: state, not a URL, so Segmented (TabNav is for links); not fill, so it scrolls inside its own row.
  assert.match(source, /<div data-audit-scan-categories className="mt-2 overflow-x-auto overscroll-x-contain">\s*<Segmented\s+aria-label=\{t\("categoryChipsLabel"\)\}\s+value=\{categoryId \?\? ""\}\s+onValueChange=\{\(next\) => onCategoryChange\(next \|\| null\)\}\s+size="md"\s+options=\{\[/)
  assert.match(source, /\{ value: "", label: <>\{t\("categoryAll"\)\}<span className="num">\{formatCount\(categories\.all\)\}<\/span><\/> \},/)
  assert.match(source, /\.\.\.categories\.chips\.map\(\(chip\) => \(\{ value: chip\.id, label: <>\{chip\.label\}<span className="num">\{formatCount\(chip\.count\)\}<\/span><\/> \}\)\),/)
  assert.equal(source.match(/<Segmented\b/g)?.length, 2, "the switch and the chips")
  assert.doesNotMatch(source, /aria-pressed|<TabNav|<ChoiceChip|<Chip\b/)
})

test("rows: the name in bold, the code under it, then the custodian and ส่วนควบ N, the checker's line and the badge kept (spec §11)", () => {
  const source = read(`${A}audit-scan-room-list.tsx`)
  assert.match(source, /<span className="block break-words text-sm font-semibold text-foreground">\{item\.name\}<\/span>\n\s+<span className="block text-meta text-muted-foreground"><span className="tag whitespace-normal break-all">\{item\.assetTag\}<\/span><\/span>/)
  assert.match(source, /const custodian = item\.expectedCustodianId \? custodianLabels\.get\(item\.expectedCustodianId\) \?\? null : null/)
  assert.match(source, /const components = item\.componentCount > 0 \? t\("rowComponents", \{ count: formatCount\(item\.componentCount\) \}\) : null/)
  assert.match(source, /return \[custodian, components\]\.filter\(Boolean\)\.join\(" · "\) \|\| null/)
  assert.match(source, /\{detail \? <span className="block truncate text-meta text-muted-foreground">\{detail\}<\/span> : null\}\n\s+\{checked \? <span className="block truncate text-meta text-muted-foreground">\{checked\}<\/span> : null\}/)
  assert.match(source, /<StatusBadge label=\{t\(badgeLabelKey\[badge\]\)\} tone=\{badgeTone\[badge\]\} className="shrink-0" \/>/)
})

test("the footer link counts the room's pending own items by place and names the room or the round (P3-R14)", () => {
  const source = read(`${A}audit-scan-room-list.tsx`)
  assert.match(source, /const pendingLinkKey = \{ room: "pendingLinkRoom", round: "pendingLinkRound" \} as const/)
  assert.match(source, /\{tab === "pending" && pendingHref && pendingCount > 0 \? \(\s*<Link\s+href=\{pendingHref\}\s+className=\{cn\(linkVariants\(\), "mt-3 inline-flex min-h-11 items-center md:min-h-0"\)\}\s*>\s*\{t\(pendingLinkKey\[scope\], \{ count: formatCount\(pendingCount\) \}\)\}/)
  const workspace = read(`${A}audit-scan-workspace.tsx`)
  assert.match(workspace, /const pendingLinkCount = useMemo\(\(\) => countAuditScanPendingForLink\(items, room\), \[items, room\]\)/)
  assert.match(workspace, /pendingHref=\{roomPendingHref\}\n\s+pendingCount=\{pendingLinkCount\}/)
})

test("the ตรวจแล้ว tab lists the recorded out-of-scope finds apart, with their badge, and a tap opens one through the lookup (P3-R25)", () => {
  const source = read(`${A}audit-scan-room-list.tsx`)
  assert.match(source, /\{tab === "checked" && recordedOutOfScope\.length > 0 \? \(\s*<section data-audit-scan-recorded-out-of-scope /)
  assert.match(source, /t\("recordedOutOfScopeTitle", \{ count: formatCount\(recordedOutOfScope\.length\) \}\)/)
  assert.match(source, /data-audit-scan-recorded-row\n\s+onClick=\{\(\) => onOpenRecorded\(item\)\}/)
  assert.match(source, /<StatusBadge label=\{t\(badgeLabelKey\.out_of_scope\)\} tone=\{badgeTone\.out_of_scope\} className="shrink-0" \/>/)
  const afterSwitch = source.slice(source.indexOf("{searching ? null : ("))
  assert.ok(afterSwitch.includes("data-audit-scan-recorded-out-of-scope"), "not while searching")
  const workspace = read(`${A}audit-scan-workspace.tsx`)
  assert.match(workspace, /const recordedOutOfScope = useMemo\(\(\) => listAuditScanRecordedOutOfScope\(items, \{ roomId: room\.locationId \}\), \[items, room\.locationId\]\)/)
  assert.match(workspace, /function openRecordedOutOfScope\(item: AuditScanItemRow\) \{\n\s+setDraft\(item\.assetTag\)\n\s+changeTerm\(item\.assetTag\)\n\s+void searchRegister\(item\.assetTag\)\n\s+\}/)
  assert.match(workspace, /recordedOutOfScope=\{recordedOutOfScope\}\n\s+onOpenRecorded=\{openRecordedOutOfScope\}/)
  // Counted apart: the tabs and the chips read buildRoomList and foldAuditScanCategoryChips, which take own items only.
  assert.doesNotMatch(workspace, /recordedOutOfScope\.length \+|\+ recordedOutOfScope\.length/)
})

test("search: the true total split by room, 10 at a time with แสดงเพิ่ม, the other-room line from the rule, and the lookup under the matches after the out-of-scope box (bug 20, P3-R5)", () => {
  const source = read(`${A}audit-scan-search.tsx`)
  assert.match(source, /const resultLine = scope === "room"\n\s+\? t\("searchResultInRoom", \{ term: term\.trim\(\), inRoom: formatCount\(search\.inRoom\), otherRooms: formatCount\(search\.otherRooms\) \}\)\n\s+: t\("searchResultInRound", \{ term: term\.trim\(\), count: formatCount\(search\.total\) \}\)/)
  assert.match(source, /const shown = matches\.slice\(0, limit\)/)
  assert.match(source, /\{shown\.map\(\(match\) => \{/)
  assert.match(source, /\{matches\.length > shown\.length \? \(\s*<Button variant="outline" onClick=\{onShowMore\} className="mt-2 w-full">\s*\{t\("showMore"\)\}/)
  assert.match(source, /const elsewhere = match\.elsewhere/)
  assert.match(source, /\{lookupAfterMatches \? <div className="mt-2">\{lookup\}<\/div> : null\}/)
  assert.match(source, /<section data-audit-scan-results className="mt-2">/)
  assert.doesNotMatch(source, /searchResultCount|room\.locationId|room: AuditScanRoom/)
  const workspace = read(`${A}audit-scan-workspace.tsx`)
  assert.match(workspace, /const \[searchLimit, setSearchLimit\] = useState\(auditScanSearchPageSize\)/)
  assert.match(workspace, /function changeTerm\(next: string\) \{\n\s+setTerm\(next\)\n\s+setSearchLimit\(auditScanSearchPageSize\)\n\s+setLookup\(\{ status: "idle" \}\)\n\s+\}/)
  assert.match(workspace, /onShowMore=\{\(\) => setSearchLimit\(\(current\) => current \+ auditScanSearchPageSize\)\}/)
  assert.match(workspace, /if \(search\.matches\.length > 0\) \{\n\s+openItem\(search\.matches\[0\]\.item, true\)/, "Enter opens the first match: an exact code wherever its room is, else the chosen room's first (P3-R17)")
  assert.doesNotMatch(workspace, /const matches = useMemo/)
  // The switch stays above the results: the list renders in search mode, the results under it.
  assert.match(workspace, /searching=\{searching\}\n\s+onTabChange=\{changeTab\}/)
  assert.match(workspace, /function changeTab\(next: AuditScanListTab\) \{\n\s+setTab\(next\)\n\s+setLimit\(auditScanListPageSize\)\n(?:\s+\/\/[^\n]*\n)*\s+if \(isAuditSearchReady\(term\)\) \{\n\s+setDraft\(""\)\n\s+changeTerm\(""\)\n\s+\}\n\s+\}/)
  assert.ok(workspace.indexOf("<AuditScanRoomList") < workspace.indexOf("<AuditScanSearchResults"), "the switch, then the results")
  assert.match(workspace, /title=\{search\.total > 0 \? t\("lookupNotListed"\) : undefined\}/)
  assert.match(read(`${A}audit-scan-lookup-card.tsx`), /<p className="text-sm font-medium text-foreground">\{title \?\? t\("searchNoResult"\)\}<\/p>/)
})

test("category chips: named from the categories prop, cleared on any room change, dropped when they leave the row (decision 3, P3-R6)", () => {
  const workspace = read(`${A}audit-scan-workspace.tsx`)
  assert.match(workspace, /const categoryNames = useMemo\(\(\) => new Map\(categories\.map\(\(category\) => \[category\.id, \{ code: category\.code, name: category\.name \}\]\)\), \[categories\]\)/)
  assert.match(workspace, /const categoryChips = useMemo\(\(\) => foldAuditScanCategoryChips\(items, \{ room, tab, names: categoryNames \}\), \[items, room, tab, categoryNames\]\)/)
  assert.match(workspace, /const roomKey = `\$\{room\.locationId\}\|\$\{room\.departmentId\}`/)
  assert.match(workspace, /if \(categoryChoice\.roomKey !== roomKey && categoryChoice\.categoryId !== null\) setCategoryChoice\(\{ roomKey, categoryId: null \}\)/, "a room change from another tab clears the choice, so a return to the first room starts at ทุกหมวดหมู่ (P3-R6)")
  assert.match(workspace, /const categoryId = resolveAuditScanCategory\(categoryChips, categoryChoice\.roomKey === roomKey \? categoryChoice\.categoryId : null\)/)
  assert.match(workspace, /const list = useMemo\(\(\) => buildRoomList\(\{ items, room, tab, limit, locationLabels, categoryId \}\), \[items, room, tab, limit, locationLabels, categoryId\]\)/)
  assert.match(workspace, /label: categoryNames\.get\(chip\.id\)\?\.name \?\? t\("categoryUnknown"\)/)
  assert.match(workspace, /\? \{ all: list\.counts\[tab\], chips: categoryChips\.map\(/, "ทุกหมวดหมู่ is the tab's count, which the chips add up to")
  const changeRoom = workspace.slice(workspace.indexOf("function changeRoom("), workspace.indexOf("function changeTab("))
  assert.match(changeRoom, /setCategoryChoice\(\{ roomKey: "", categoryId: null \}\)/)
  assert.match(workspace, /function changeCategory\(next: string \| null\) \{\n\s+setCategoryChoice\(\{ roomKey, categoryId: next \}\)\n\s+setLimit\(auditScanListPageSize\)\n\s+\}/)
  assert.match(workspace, /categories=\{categoryRow\}\n\s+categoryId=\{categoryId\}\n\s+onCategoryChange=\{changeCategory\}/)
})

test("the out-of-scope box is always shown and starts at the search with its hint (spec §11)", () => {
  const workspace = read(`${A}audit-scan-workspace.tsx`)
  assert.match(workspace, /<ContentPanel>\s*<div data-audit-scan-out-of-scope className="flex flex-wrap items-center justify-between gap-2">\s*<p className="text-sm text-foreground">\{t\("outOfScopeBoxTitle"\)\}<\/p>\s*<Button variant="outline" size="md" onClick=\{startOutOfScopeFind\}>\s*\{t\("outOfScopeBoxAction"\)\}/)
  assert.ok(workspace.indexOf("data-audit-scan-out-of-scope") > workspace.indexOf("<div ref={listAreaRef}>"), "under the list and the results")
  assert.match(workspace, /function startOutOfScopeFind\(\) \{\n\s+setOutOfScopeHint\(true\)\n\s+inputRef\.current\?\.focus\(\)\n\s+\}/)
  assert.match(workspace, /hint=\{outOfScopeHint \? t\("outOfScopeHint"\) : null\}/)
  assert.match(workspace, /lookupAfterMatches=\{outOfScopeHint\}/)
  for (const name of ["function clearSearch", "function finishSave"]) {
    const start = workspace.indexOf(name)
    assert.match(workspace.slice(start, workspace.indexOf("\n  }\n", start)), /setOutOfScopeHint\(false\)/, name)
  }
  const search = read(`${A}audit-scan-search.tsx`)
  assert.match(search, /aria-describedby=\{hint \? hintId : undefined\}/)
  assert.match(search, /\{hint \? <p id=\{hintId\} className="mt-1 px-1 text-meta text-muted-foreground">\{hint\}<\/p> : null\}/)
})

test("the walk's words, Thai and English (glossary: ห้อง, หมวดหมู่, ส่วนควบ, นอกขอบเขต, พบตรง, Serial)", () => {
  const expected: Record<string, [string, string]> = {
    backToRound: ["กลับไปหน้ารอบ", "Back to the round"],
    progressCount: ["{checked} / {total}", "{checked} / {total}"],
    progressChecked: ["ตรวจแล้ว {checked} / {total}", "Checked {checked} / {total}"],
    roomCheckedOfTotal: ["ห้องนี้ตรวจแล้ว {checked} / {total} · เหลือ {pending}", "This room: {checked} / {total} checked · {pending} left"],
    roomOptionCounts: ["ตรวจแล้ว {checked} / {total} · เหลือ {pending}", "{checked} / {total} checked · {pending} left"],
    roomDepartmentOption: ["{department} · เหลือ {pending} / {total}", "{department} · {pending} of {total} left"],
    roomChange: ["เปลี่ยนห้อง", "Change room"],
    searchResultInRoom: ["ผลค้นหา \"{term}\": ในห้องนี้ {inRoom} · ห้องอื่น {otherRooms}", "Results for \"{term}\": {inRoom} in this room · {otherRooms} in other rooms"],
    searchResultInRound: ["ผลค้นหา \"{term}\": {count} รายการ", "Results for \"{term}\": {count}"],
    lookupNotListed: ["ไม่ใช่รายการข้างบน", "Not one of the above"],
    tabAllRoom: ["ทั้งห้อง", "Whole room"],
    tabAllRound: ["ทั้งรอบ", "Whole round"],
    emptyAllRound: ["ไม่มีรายการในรอบนี้", "No items in this round"],
    categoryChipsLabel: ["หมวดหมู่", "Category"],
    // P3-R16: the round page's word for the same filter (auditRound.categoryAll).
    categoryAll: ["ทุกหมวดหมู่", "All categories"],
    // P3-R19: spec §5's one word for the result, as the round page's chip (auditRound.found reads "Matched" in en).
    badgeFound: ["พบตรง", "Matched"],
    categoryUnknown: ["หมวดหมู่อื่น", "Other category"],
    rowComponents: ["ส่วนควบ {count}", "{count} components"],
    outOfScopeBoxTitle: ["เจอของที่ไม่อยู่ในรายการ?", "Found something that is not on the list?"],
    outOfScopeBoxAction: ["บันทึกนอกขอบเขต", "Record out of scope"],
    outOfScopeHint: ["พิมพ์รหัสหรือ Serial ของที่เจอ แล้วกดค้นทะเบียน", "Type the tag or serial of what you found, then search the register"],
    // P3-R25: the ตรวจแล้ว tab's section of recorded out-of-scope finds, counted apart.
    recordedOutOfScopeTitle: ["บันทึกนอกขอบเขตแล้ว {count}", "Recorded out of scope {count}"],
    pendingLinkRoom: ["ของในห้องนี้ที่ยังหาไม่เจอ {count} รายการ →", "{count} items in this room not found yet →"],
    pendingLinkRound: ["ของในรอบนี้ที่ยังหาไม่เจอ {count} รายการ →", "{count} items in this round not found yet →"],
  }
  const th = messages("th")
  const en = messages("en")
  for (const [key, [thText, enText]] of Object.entries(expected)) {
    assert.equal(th[key], thText, `th ${key}`)
    assert.equal(en[key], enText, `en ${key}`)
  }
  for (const key of ["progress", "roomPendingOfTotal", "searchResultCount", "tabAll", "pendingLink"]) {
    assert.equal(th[key], undefined, `th ${key} is gone`)
    assert.equal(en[key], undefined, `en ${key} is gone`)
  }
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/audit-scan-walk-ui.test.ts`
Expected: FAIL in every test:
- the page has no `loadAuditScanCategories` and `roundName` is the template literal;
- the header has `role="progressbar"`;
- the picker reads `roomPendingOfTotal`;
- the list has one `<Segmented`, no `scope` and no `searching`;
- the search reads `searchResultCount`;
- the workspace has no `categoryChips` and no box;
- `th.backToRound` is "กลับหน้ารอบ", `th.badgeFound` is "ตรวจแล้ว", and `tabAllRoom` is undefined.

- [ ] **Step 3: Add and change the words**

Write the change file in the session scratchpad (for example `<scratchpad>/g2p3-task3-messages.json`, an absolute path), run `node scripts/messages-edit.mjs <file>` from the repo root, then delete it. All keys are in the `auditScan` namespace:

| Key | th | en |
|---|---|---|
| `backToRound` (changed th) | กลับไปหน้ารอบ | Back to the round (unchanged) |
| `progressCount` (new) | {checked} / {total} | {checked} / {total} |
| `roomCheckedOfTotal` (new) | ห้องนี้ตรวจแล้ว {checked} / {total} · เหลือ {pending} | This room: {checked} / {total} checked · {pending} left |
| `roomOptionCounts` (new) | ตรวจแล้ว {checked} / {total} · เหลือ {pending} | {checked} / {total} checked · {pending} left |
| `roomDepartmentOption` (new) | {department} · เหลือ {pending} / {total} | {department} · {pending} of {total} left |
| `roomChange` (changed) | เปลี่ยนห้อง | Change room |
| `searchResultInRoom` (new) | ผลค้นหา "{term}": ในห้องนี้ {inRoom} · ห้องอื่น {otherRooms} | Results for "{term}": {inRoom} in this room · {otherRooms} in other rooms |
| `searchResultInRound` (new) | ผลค้นหา "{term}": {count} รายการ | Results for "{term}": {count} |
| `lookupNotListed` (new) | ไม่ใช่รายการข้างบน | Not one of the above |
| `tabAllRoom` (new) | ทั้งห้อง | Whole room |
| `tabAllRound` (new) | ทั้งรอบ | Whole round |
| `emptyAllRound` (new) | ไม่มีรายการในรอบนี้ | No items in this round |
| `categoryChipsLabel` (new) | หมวดหมู่ | Category |
| `categoryAll` (new) | ทุกหมวดหมู่ | All categories |
| `badgeFound` (changed) | พบตรง | Matched |
| `categoryUnknown` (new) | หมวดหมู่อื่น | Other category |
| `rowComponents` (new) | ส่วนควบ {count} | {count} components |
| `outOfScopeBoxTitle` (new) | เจอของที่ไม่อยู่ในรายการ? | Found something that is not on the list? |
| `outOfScopeBoxAction` (new) | บันทึกนอกขอบเขต | Record out of scope |
| `outOfScopeHint` (new) | พิมพ์รหัสหรือ Serial ของที่เจอ แล้วกดค้นทะเบียน | Type the tag or serial of what you found, then search the register |
| `recordedOutOfScopeTitle` (new, P3-R25) | บันทึกนอกขอบเขตแล้ว {count} | Recorded out of scope {count} |
| `pendingLinkRoom` (new) | ของในห้องนี้ที่ยังหาไม่เจอ {count} รายการ → | {count} items in this room not found yet → |
| `pendingLinkRound` (new) | ของในรอบนี้ที่ยังหาไม่เจอ {count} รายการ → | {count} items in this round not found yet → |

Delete (nothing reads them after this task): `auditScan.progress`, `auditScan.roomPendingOfTotal`, `auditScan.searchResultCount`, `auditScan.tabAll`, `auditScan.pendingLink`. Check first: once Step 4 is in, `rg -n 't\("(progress|roomPendingOfTotal|searchResultCount|tabAll|pendingLink)"' src` should print only `src/app/[locale]/(dashboard)/audit/rounds/page.tsx:403` and `:423`. Those are `auditRound.progress`, which stays. Any hit under `src/components/audit` is an `auditScan` reader still left. `auditRound.progress` (the rounds list column, `audit/rounds/page.tsx:403,423`) is another namespace and stays.

Kept and reused: `progressChecked` (now the `PaceBar`'s name), `progressMismatch`, `roomPick`, `roomClear`, `roomDepartment`, `roomAllDepartments`, `roomListLabel`, `roomListTabs` "สถานะรายการ", `tabPending`, `tabChecked`, `emptyPending`, `emptyChecked`, `emptyAll` "ไม่มีรายการในห้องนี้" (the room scope), `showMore` "แสดงเพิ่ม", `checkedBy`, the other `badge*` (`badgeOutOfScope` "นอกขอบเขต" now on the recorded finds' rows, P3-R25), `searchNoResult`, `searchRegister`, `inLocation`, `matched*`.

`categoryAll` is the round page's word for the same filter (`auditRound.categoryAll` "ทุกหมวดหมู่" / "All categories", P3-R16). `badgeFound` takes the word the round page's chip and the result values use (`auditRound.found`, `value_auditResult_found`: "พบตรง" / "Matched", P3-R19); the row badges and the search results read it through `getAuditItemBadge`.

Glossary (`docs/19_THAI_GLOSSARY.md`):
- "พบตรง" is the glossary's result word (Global Constraints);
- "หมวดหมู่" is row 21 ("หมวดหมู่อื่น", not "หมวดอื่น"; the guard `หมวด(?!หมู่)`);
- "นอกขอบเขต" is row 17;
- "Serial" is in the list of words kept in English (:38);
- "ส่วนควบ" and "ห้อง" are as the scan screen already writes them.

ICU: the double quotes in `searchResultInRoom` / `searchResultInRound` are plain characters in ICU. No apostrophe is used. `tests/messages-parity.test.ts` needs the same placeholders in th and en, and each pair above has them.

- [ ] **Step 4: Implement**

Line numbers are master `0a7bb9ee`. Task 2 has already changed the workspace's imports, `:151`, `:464`, `:472-476` and `:664`. Blocks are named by their content.

- **`src/lib/audit-scan-session.ts`**: after `AuditScanOptions` (`:11-16`), add:

  ```ts
  /** A category of the round's items, closed ones included, for the chips' names (spec §11, P3-R6). */
  export type AuditScanCategory = { id: string; code: string; name: string }
  ```

- **`src/lib/audit-scan-data.ts`**: add `import type { AuditScanCategory } from "@/lib/audit-scan-session"` under `:3`, and after `loadAuditScanRows`:

  ```ts
  /**
   * Every category of the round's items, for the walk's chips (spec §11, P3-R6). A category closed after the round opened
   * keeps its name, so there is no isActive filter (the round page's names do the same). Through the relation, never an
   * id list, so a large round cannot reach SQL Server's 2,100 parameters.
   */
  export async function loadAuditScanCategories(roundId: string): Promise<AuditScanCategory[]> {
    return prisma.assetCategory.findMany({
      where: { assets: { some: { auditItems: { some: { auditRoundId: roundId } } } } },
      select: { id: true, code: true, name: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    })
  }
  ```
  (`Asset.auditItems` is at `prisma/schema.prisma:312` and `AssetCategory.assets` at `:173`. The out-of-scope finds' categories come in too; the chips never count them, Task 2.)

- **`scan/page.tsx`**:
  - `:6` becomes `import { loadAuditScanCategories, loadAuditScanRows } from "@/lib/audit-scan-data"`.
  - `:39` becomes `const [round, options, rows, categories] = await withPerformanceTiming(`.
  - After `loadAuditScanRows(id),` (`:47`) comes `loadAuditScanCategories(id),`.
  - `:74` becomes `roundName={round.name}`.
  - After `canApplyCorrections={canApplyCorrections}` (`:87`) comes `categories={categories}`.
  - The `audit-scan.initial-data` timing now covers four loads. `audit-scan.checklist-data` is unchanged (`tests/performance-route-instrumentation.test.ts:44-45`, `tests/audit-scan-page.test.ts:16-22`).

- **`src/components/audit/audit-scan-header.tsx`** (whole file):

  ```tsx
  "use client"

  import Link from "next/link"
  import { ArrowLeft } from "lucide-react"
  import { useTranslations } from "next-intl"
  import { buttonVariants } from "@/components/ui/button-variants"
  import { PaceBar } from "@/components/ui/pace-bar"
  import { formatCount } from "@/lib/display-format"
  import { cn } from "@/lib/utils"

  // The field scan's own two-line header (spec §11; LFG LH1 and LB1 keep its h1 and back link): the round's code over its
  // name, "x / y" over "ไม่ตรง N" (data-audit-scan-progress, which the E2E reads), then the round's PaceBar (The Data
  // Bars Rule; the words beside it carry the same).
  export function AuditScanHeader({
    roundName,
    roundCode,
    backHref,
    progress,
  }: {
    /** The round's name, the small second line. */
    roundName: string
    /** The round's number, the first line. */
    roundCode: string
    backHref: string
    /** The round's own items (P3-R1); ไม่ตรง as the round page folds it (P3-R2). */
    progress: { total: number; checked: number; mismatched: number }
  }) {
    const t = useTranslations("auditScan")
    const checked = formatCount(progress.checked)
    const total = formatCount(progress.total)

    return (
      <header data-audit-scan-header className="mb-1 space-y-1.5">
        <div className="flex min-w-0 items-center gap-1">
          <Link href={backHref} aria-label={t("backToRound")} className={buttonVariants({ variant: "ghost", size: "icon" })}>
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
          <h1 className="min-w-0 flex-1 text-foreground">
            <span className="block truncate text-base font-semibold md:text-xl">{roundCode}</span>
            <span className="block truncate text-meta text-muted-foreground">{roundName}</span>
          </h1>
          <p data-audit-scan-progress className="shrink-0 pr-1 text-right text-meta num text-muted-foreground">
            <span className="block font-medium text-foreground">{t("progressCount", { checked, total })}</span>
            <span className={cn("block", progress.mismatched > 0 && "font-medium text-warning")}>{t("progressMismatch", { count: formatCount(progress.mismatched) })}</span>
          </p>
        </div>
        <PaceBar value={progress.total === 0 ? 0 : progress.checked / progress.total} pace={null} label={t("progressChecked", { checked, total })} behind={false} />
      </header>
    )
  }
  ```

- **`src/components/audit/audit-scan-room-picker.tsx`**:
  - The import at `:11` becomes `import { selectAuditRoomProgress, type AuditRoomOption, type AuditScanRoom } from "@/lib/audit-scan-session"`, plus `import { formatCount } from "@/lib/display-format"`.
  - After `selectedDepartment` (`:34`): `const progress = selectAuditRoomProgress(rooms, room)`.
  - In the trigger (`:59`), `{selected ? (` becomes `{selected && progress ? (`. Its count line (`:62-64`) becomes:

    ```tsx
    <span className="block text-meta font-normal num">
      {t("roomCheckedOfTotal", { checked: formatCount(progress.checked), total: formatCount(progress.total), pending: formatCount(progress.pending) })}
    </span>
    ```
  - `:69` (the `roomChange` span) is unchanged; the word changes in Step 3.
  - The department option (`:105`): `{t("roomDepartmentOption", { department: department.label, pending: formatCount(department.pending), total: formatCount(department.total) })}`.
  - The room row (`:128-130`):

    ```tsx
    <span className="shrink-0 text-meta num text-muted-foreground">
      {t("roomOptionCounts", { checked: formatCount(option.total - option.pending), total: formatCount(option.total), pending: formatCount(option.pending) })}
    </span>
    ```
  - Nothing else changes: the two raw buttons and their comments, the room search `<input>`, the footer and the focus on open.

- **`src/components/audit/audit-scan-room-list.tsx`** (whole file; the badge maps `:16-29` and the row button's classes are master's):

  ```tsx
  "use client"

  import Link from "next/link"
  import { useId } from "react"
  import { ChevronRight } from "lucide-react"
  import { useLocale, useTranslations } from "next-intl"
  import { Button } from "@/components/ui/button"
  import { linkVariants } from "@/components/ui/button-variants"
  import { EmptyNote } from "@/components/ui/empty-note"
  import { Segmented } from "@/components/ui/segmented"
  import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"
  import { getAuditItemBadge, type AuditItemBadge, type AuditScanItemRow, type AuditScanListScope, type AuditScanListTab } from "@/lib/audit-scan-session"
  import { getPanelClasses } from "@/lib/design-system"
  import { formatCount } from "@/lib/display-format"
  import { cn } from "@/lib/utils"

  const badgeTone: Record<AuditItemBadge | "queued", StatusTone> = { /* master :16-22 */ }
  const badgeLabelKey = { /* master :23-29 */ } as const
  // The third tab names what it lists: the chosen room, or the whole round with none (spec §11, P3-R7).
  const tabLabelKey = {
    room: { pending: "tabPending", checked: "tabChecked", all: "tabAllRoom" },
    round: { pending: "tabPending", checked: "tabChecked", all: "tabAllRound" },
  } as const
  const emptyLabelKey = {
    room: { pending: "emptyPending", checked: "emptyChecked", all: "emptyAll" },
    round: { pending: "emptyPending", checked: "emptyChecked", all: "emptyAllRound" },
  } as const
  const pendingLinkKey = { room: "pendingLinkRoom", round: "pendingLinkRound" } as const

  /** The chip row: "ทุกหมวดหมู่" (the tab's count, P3-R16) and each category of the room in the tab, named (decision 3, P3-R6). */
  export type AuditScanCategoryRow = { all: number; chips: Array<{ id: string; label: string; count: number }> }

  export function AuditScanRoomList({
    rows,
    total,
    counts,
    tab,
    scope,
    searching,
    onTabChange,
    categories,
    categoryId,
    onCategoryChange,
    onShowMore,
    onOpen,
    queuedAssetIds,
    custodianLabels,
    locationLabels,
    showLocation,
    pendingHref,
    pendingCount,
    recordedOutOfScope,
    onOpenRecorded,
    activeItemId = null,
  }: {
    rows: AuditScanItemRow[]
    total: number
    counts: Record<AuditScanListTab, number>
    tab: AuditScanListTab
    scope: AuditScanListScope
    /** A search is running: only the switch shows, and the results sit under it (spec §11). */
    searching: boolean
    onTabChange: (tab: AuditScanListTab) => void
    /** null when the room and tab hold one category or none (hidden, P3-R6). */
    categories: AuditScanCategoryRow | null
    /** The chosen category; null is every category. */
    categoryId: string | null
    onCategoryChange: (categoryId: string | null) => void
    onShowMore: () => void
    onOpen: (item: AuditScanItemRow) => void
    queuedAssetIds: ReadonlySet<string>
    custodianLabels: ReadonlyMap<string, string>
    locationLabels: ReadonlyMap<string, string>
    showLocation: boolean
    pendingHref: string | null
    /** The room's pending own items by place, or the round's (P3-R14): the rows the pending list opens with. */
    pendingCount: number
    /** The round's recorded out-of-scope finds in the room (or the round), counted apart from the tabs (P3-R25). */
    recordedOutOfScope: AuditScanItemRow[]
    /** Opens a recorded find's out-of-scope form through the register lookup (Task 4). */
    onOpenRecorded: (item: AuditScanItemRow) => void
    /** The row whose check panel is open beside the list (wide screens). */
    activeItemId?: string | null
  }) {
    const t = useTranslations("auditScan")
    const locale = useLocale()
    const timeFormat = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", { hour: "2-digit", minute: "2-digit" })
    const recordedHeadingId = useId()

    /** The custodian and the installed components (spec §11). */
    function detailLine(item: AuditScanItemRow) {
      const custodian = item.expectedCustodianId ? custodianLabels.get(item.expectedCustodianId) ?? null : null
      const components = item.componentCount > 0 ? t("rowComponents", { count: formatCount(item.componentCount) }) : null
      return [custodian, components].filter(Boolean).join(" · ") || null
    }

    /** Who checked it and when (spec §11: kept for checked items). */
    function checkedLine(item: AuditScanItemRow) {
      return item.scannedByName && item.lastScanAt ? t("checkedBy", { name: item.scannedByName, time: timeFormat.format(new Date(item.lastScanAt)) }) : null
    }

    return (
      <section data-audit-scan-room-list aria-label={t("roomListLabel")}>
        <Segmented
          aria-label={t("roomListTabs")}
          value={tab}
          onValueChange={onTabChange}
          size="md"
          fill
          options={(["pending", "checked", "all"] as const).map((key) => ({
            value: key,
            label: (
              <>
                {t(tabLabelKey[scope][key])}
                <span className="num">{formatCount(counts[key])}</span>
              </>
            ),
          }))}
        />

        {searching ? null : (
          <>
            {categories ? (
              // The room's categories in the tab, sideways inside their own row so the page never scrolls sideways
              // (spec §11, decision 3). State, not a URL, so Segmented (TabNav's rule: links only).
              <div data-audit-scan-categories className="mt-2 overflow-x-auto overscroll-x-contain">
                <Segmented
                  aria-label={t("categoryChipsLabel")}
                  value={categoryId ?? ""}
                  onValueChange={(next) => onCategoryChange(next || null)}
                  size="md"
                  options={[
                    { value: "", label: <>{t("categoryAll")}<span className="num">{formatCount(categories.all)}</span></> },
                    ...categories.chips.map((chip) => ({ value: chip.id, label: <>{chip.label}<span className="num">{formatCount(chip.count)}</span></> })),
                  ]}
                />
              </div>
            ) : null}

            {rows.length === 0 ? (
              <EmptyNote tone={tab === "pending" ? "clear" : "empty"} className="justify-center px-2 py-6">{t(emptyLabelKey[scope][tab])}</EmptyNote>
            ) : (
              <ul className={cn(getPanelClasses(), "mt-2 divide-y divide-border overflow-hidden")}>
                {rows.map((item) => {
                  const badge = queuedAssetIds.has(item.assetId) ? "queued" : getAuditItemBadge(item)
                  const active = item.itemId === activeItemId
                  const place = showLocation ? locationLabels.get(item.expectedLocationId) ?? item.expectedLocationId : null
                  const detail = detailLine(item)
                  const checked = checkedLine(item)
                  return (
                    <li key={item.itemId}>
                      {/* A raw button on purpose: the whole row of two to five lines opens the check sheet (2D-5 lists it). */}
                      <button
                        type="button"
                        data-audit-scan-row
                        aria-current={active ? "true" : undefined}
                        onClick={() => onOpen(item)}
                        className={cn(
                          "flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                          active && "bg-accent",
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-sm font-semibold text-foreground">{item.name}</span>
                          <span className="block text-meta text-muted-foreground"><span className="tag whitespace-normal break-all">{item.assetTag}</span></span>
                          {place ? <span data-audit-scan-row-room className="block break-words text-meta text-muted-foreground">{place}</span> : null}
                          {detail ? <span className="block truncate text-meta text-muted-foreground">{detail}</span> : null}
                          {checked ? <span className="block truncate text-meta text-muted-foreground">{checked}</span> : null}
                        </span>
                        {badge ? (
                          <StatusBadge label={t(badgeLabelKey[badge])} tone={badgeTone[badge]} className="shrink-0" />
                        ) : (
                          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            {total > rows.length ? (
              <Button variant="outline" onClick={onShowMore} className="mt-2 w-full">
                {t("showMore")}
              </Button>
            ) : null}

            {tab === "checked" && recordedOutOfScope.length > 0 ? (
              <section data-audit-scan-recorded-out-of-scope className="mt-3" aria-labelledby={recordedHeadingId}>
                {/* P3-R25: the round's recorded out-of-scope finds, apart from every count (spec §5: the tabs count own
                    items), so the นอกขอบเขต badge of Appendix A §11 stays on the phone. */}
                <h2 id={recordedHeadingId} className="px-1 text-meta font-medium text-muted-foreground">
                  {t("recordedOutOfScopeTitle", { count: formatCount(recordedOutOfScope.length) })}
                </h2>
                <ul className={cn(getPanelClasses(), "mt-1 divide-y divide-border overflow-hidden")}>
                  {recordedOutOfScope.map((item) => {
                    const checked = checkedLine(item)
                    return (
                      <li key={item.itemId}>
                        {/* A raw button on purpose: the whole row opens the find's out-of-scope form (P3-R25). */}
                        <button
                          type="button"
                          data-audit-scan-recorded-row
                          onClick={() => onOpenRecorded(item)}
                          className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block break-words text-sm font-semibold text-foreground">{item.name}</span>
                            <span className="block text-meta text-muted-foreground"><span className="tag whitespace-normal break-all">{item.assetTag}</span></span>
                            {checked ? <span className="block truncate text-meta text-muted-foreground">{checked}</span> : null}
                          </span>
                          <StatusBadge label={t(badgeLabelKey.out_of_scope)} tone={badgeTone.out_of_scope} className="shrink-0" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ) : null}

            {tab === "pending" && pendingHref && pendingCount > 0 ? (
              <Link
                href={pendingHref}
                className={cn(linkVariants(), "mt-3 inline-flex min-h-11 items-center md:min-h-0")}
              >
                {t(pendingLinkKey[scope], { count: formatCount(pendingCount) })}
              </Link>
            ) : null}
          </>
        )}
      </section>
    )
  }
  ```
  The row's long code wraps inside the row, as on the round page's phone card (`rounds/[id]/page.tsx:531`, commit `cba81df4`). The code is a `tag` at its own weight under a sized wrapper (DESIGN.md `tag`). The recorded finds' row is the file's second raw button, so its N3 exemption count goes from 1 to 2 (Step 6).

- **`src/components/audit/audit-scan-search.tsx`**:
  - `:3` becomes `import { useId, useRef, type ReactNode, type RefObject } from "react"`.
  - The session import becomes `getAuditItemBadge, splitSearchHighlight, type AuditScanItemRow, type AuditScanListScope, type AuditSearchMatch, type AuditSearchResult`; `type AuditScanRoom` goes.
  - Add `import { formatCount } from "@/lib/display-format"`.
  - `AuditScanSearchField`:
    - the prop `hint: string | null` after `value`, with the doc "The out-of-scope box's hint (spec §11), tied to the box as its description; null when not asked for";
    - `const hintId = useId()` after `composingRef`;
    - in `<SearchField`, after `placeholder={t("searchItemsPlaceholder")}`, the line `aria-describedby={hint ? hintId : undefined}`;
    - after `</SearchField>` (`:88`, the `/>`), inside the `<form>`: `{hint ? <p id={hintId} className="mt-1 px-1 text-meta text-muted-foreground">{hint}</p> : null}`.
  - `AuditScanSearchResults` (`:93-177`):

    ```tsx
    export function AuditScanSearchResults({
      term,
      search,
      limit,
      scope,
      onShowMore,
      locationLabels,
      queuedAssetIds,
      onOpen,
      lookup,
      lookupAfterMatches,
    }: {
      term: string
      /** Every own match, an exact code first, then the chosen room's, with the true total (bug 20, P3-R5, P3-R17). */
      search: AuditSearchResult
      /** How many rows show: auditScanSearchPageSize, plus as many again per "แสดงเพิ่ม". */
      limit: number
      scope: AuditScanListScope
      onShowMore: () => void
      locationLabels: ReadonlyMap<string, string>
      queuedAssetIds: ReadonlySet<string>
      onOpen: (item: AuditScanItemRow) => void
      lookup: ReactNode
      /** After the out-of-scope box the find is not among the matches, so the register lookup stays under them. */
      lookupAfterMatches: boolean
    }) {
      const t = useTranslations("auditScan")
      const matches = search.matches
      const shown = matches.slice(0, limit)
      const resultLine = scope === "room"
        ? t("searchResultInRoom", { term: term.trim(), inRoom: formatCount(search.inRoom), otherRooms: formatCount(search.otherRooms) })
        : t("searchResultInRound", { term: term.trim(), count: formatCount(search.total) })

      // detail() and highlight() as master :112-129

      return (
        <section data-audit-scan-results className="mt-2">
          <p role="status" className="sr-only">{matches.length > 0 ? resultLine : t("searchNoResult")}</p>
          {matches.length === 0 ? lookup : (
            <>
              <p className="px-1 pb-1 text-meta text-muted-foreground">{resultLine}</p>
              <ul className={cn(getPanelClasses(), "divide-y divide-border overflow-hidden")}>
                {shown.map((match) => {
                  const line = detail(match)
                  const badge = queuedAssetIds.has(match.item.assetId) ? "queued" : getAuditItemBadge(match.item)
                  const elsewhere = match.elsewhere
                  const place = locationLabels.get(match.item.expectedLocationId) ?? match.item.expectedLocationId
                  return (
                    // the <li> and the row button as master :144-169, unchanged
                  )
                })}
              </ul>
              {matches.length > shown.length ? (
                <Button variant="outline" onClick={onShowMore} className="mt-2 w-full">
                  {t("showMore")}
                </Button>
              ) : null}
              {lookupAfterMatches ? <div className="mt-2">{lookup}</div> : null}
            </>
          )}
        </section>
      )
    }
    ```
    The room line (`:159`) keeps `elsewhere` as a local name, so `tests/audit-scan-search-ui.test.ts:37-47` stands.

- **`src/components/audit/audit-scan-lookup-card.tsx`**:
  - the prop `title?: string` (doc: "The first line: "ไม่พบในรอบนี้" by default; "ไม่ใช่รายการข้างบน" under matches") after `state`;
  - `:39` becomes `<p className="text-sm font-medium text-foreground">{title ?? t("searchNoResult")}</p>`.
  - The single raw button and every state stay (`tests/audit-scan-sweep-ui.test.ts:141-152`).

- **`src/components/audit/audit-scan-workspace.tsx`**:
  - **Imports:**
    - add `import { Button } from "@/components/ui/button"` and `import { ContentPanel } from "@/components/ui/content-panel"`;
    - in the session import, add `auditScanListScope`, `countAuditScanPendingForLink`, `foldAuditScanCategoryChips`, `listAuditScanRecordedOutOfScope`, `resolveAuditScanCategory` and `type AuditScanCategory`, alphabetically. Task 2 brought `auditScanSearchPageSize`. `isAuditSearchReady` is already imported.
  - **Props:** `categories: AuditScanCategory[]` after `photoChecklistByCategory`, with the doc "The round's categories, for the chips' names (spec §11, P3-R6)".
  - **State:** after `const [limit, setLimit] = useState(auditScanListPageSize)` (`:106`):

    ```ts
    const [searchLimit, setSearchLimit] = useState(auditScanSearchPageSize)
    // The chosen category with the room it was chosen in (categoryId below).
    const [categoryChoice, setCategoryChoice] = useState<{ roomKey: string; categoryId: string | null }>({ roomKey: "", categoryId: null })
    const [outOfScopeHint, setOutOfScopeHint] = useState(false)
    ```
  - **Derived values:**
    - `roomOptions` (`:146`), `progress` (`:147`) and `roomPickerOpen` (`:149`) keep their text; the rules filter own items (Task 2).
    - `:150` (`list`) gives way to:

      ```ts
      const categoryNames = useMemo(() => new Map(categories.map((category) => [category.id, { code: category.code, name: category.name }])), [categories])
      const categoryChips = useMemo(() => foldAuditScanCategoryChips(items, { room, tab, names: categoryNames }), [items, room, tab, categoryNames])
      // A room change clears the chosen category whichever way it came (the picker, its department, another tab through the
      // storage event; spec §11, decision 3, P3-R6), and one that left the row stops narrowing the list.
      const roomKey = `${room.locationId}|${room.departmentId}`
      if (categoryChoice.roomKey !== roomKey && categoryChoice.categoryId !== null) setCategoryChoice({ roomKey, categoryId: null })
      const categoryId = resolveAuditScanCategory(categoryChips, categoryChoice.roomKey === roomKey ? categoryChoice.categoryId : null)
      const list = useMemo(() => buildRoomList({ items, room, tab, limit, locationLabels, categoryId }), [items, room, tab, limit, locationLabels, categoryId])
      ```
      The guarded `setCategoryChoice` during render is React's "adjust state when a prop changes" pattern and does not loop: after the reset `categoryId` is null, and `changeRoom`'s reset `{ roomKey: "", categoryId: null }` fails the `!== null` guard. It is what clears a choice when another tab moves the room away and back, since `changeRoom` never runs then (P3-R6); the `categoryId` line still guards the render that triggers the reset.
    - Task 2's `search` line stays. Task 2's `const matches = useMemo(…)` line goes.
    - After `liveItem` (`:155`):

      ```ts
      const scope = auditScanListScope(room)
      const pendingLinkCount = useMemo(() => countAuditScanPendingForLink(items, room), [items, room])
      // P3-R25: the recorded out-of-scope finds, listed apart on the ตรวจแล้ว tab; no count reads them.
      const recordedOutOfScope = useMemo(() => listAuditScanRecordedOutOfScope(items, { roomId: room.locationId }), [items, room.locationId])
      const categoryRow = categoryChips.length > 0
        ? { all: list.counts[tab], chips: categoryChips.map((chip) => ({ id: chip.id, label: categoryNames.get(chip.id)?.name ?? t("categoryUnknown"), count: chip.count })) }
        : null
      ```
      `list.counts[tab]` is the room's count in the tab (Task 2: counts ignore the category), which the chips add up to.
  - **Handlers:**
    - `changeRoom` (`:392-397`) gains `setCategoryChoice({ roomKey: "", categoryId: null })` after `setLimit(…)`. A return to the same room then starts with ทุกหมวดหมู่ too.
    - After `changeRoom`, add:

      ```ts
      function changeTab(next: AuditScanListTab) {
        setTab(next)
        setLimit(auditScanListPageSize)
        // The switch stays above the search results (spec §11): a tab press leaves the search for that tab's list.
        if (isAuditSearchReady(term)) {
          setDraft("")
          changeTerm("")
        }
      }

      function changeCategory(next: string | null) {
        setCategoryChoice({ roomKey, categoryId: next })
        setLimit(auditScanListPageSize)
      }
      ```
    - `changeTerm` (`:399-402`) gains `setSearchLimit(auditScanSearchPageSize)` between `setTerm(next)` and `setLookup(…)`.
    - `clearSearch` (`:404-408`) gains `setOutOfScopeHint(false)` after `changeTerm("")`.
    - After `clearSearch`:

      ```ts
      /** The out-of-scope box (spec §11): a record goes through the register lookup, so it starts at the search. */
      function startOutOfScopeFind() {
        setOutOfScopeHint(true)
        inputRef.current?.focus()
      }

      /** A recorded out-of-scope find (P3-R25) opens as the deep link opens one: its tag in the search, then the register
       * lookup, which answers out_of_scope with the item and opens its out-of-scope form (Task 4). */
      function openRecordedOutOfScope(item: AuditScanItemRow) {
        setDraft(item.assetTag)
        changeTerm(item.assetTag)
        void searchRegister(item.assetTag)
      }
      ```
      Until Task 4 lands, the lookup's answer shows today's out-of-scope card; Task 4's recorded branch then opens the form at once.
    - `submitSearch` (`:455-461`): `if (search.matches.length > 0) {` / `openItem(search.matches[0].item, true)`.
    - `finishSave` (`:486-500`) gains `setOutOfScopeHint(false)` after `setScanSource("manual")`.
  - **Render:**
    - `<AuditScanSearchField` (`:699`) gains `hint={outOfScopeHint ? t("outOfScopeHint") : null}` after `value={draft}`.
    - The list area (`:732-770`) becomes:

      ```tsx
      <div ref={listAreaRef}>
        <AuditScanRoomList
          rows={list.rows}
          total={list.total}
          counts={list.counts}
          tab={tab}
          scope={scope}
          searching={searching}
          onTabChange={changeTab}
          categories={categoryRow}
          categoryId={categoryId}
          onCategoryChange={changeCategory}
          onShowMore={() => setLimit((current) => current + auditScanListPageSize)}
          onOpen={(item) => openItem(item, false)}
          queuedAssetIds={queuedAssetIds}
          custodianLabels={custodianLabels}
          locationLabels={locationLabels}
          showLocation={!room.locationId}
          pendingHref={roomPendingHref}
          pendingCount={pendingLinkCount}
          recordedOutOfScope={recordedOutOfScope}
          onOpenRecorded={openRecordedOutOfScope}
          activeItemId={isWide && target?.kind === "item" ? target.item.itemId : null}
        />
        {searching ? (
          <AuditScanSearchResults
            term={term}
            search={search}
            limit={searchLimit}
            scope={scope}
            onShowMore={() => setSearchLimit((current) => current + auditScanSearchPageSize)}
            locationLabels={locationLabels}
            queuedAssetIds={queuedAssetIds}
            onOpen={(item) => openItem(item, true)}
            lookupAfterMatches={outOfScopeHint}
            lookup={
              <AuditScanLookupCard
                title={search.total > 0 ? t("lookupNotListed") : undefined}
                state={lookup}
                onSearchRegister={() => void searchRegister()}
                onRecordOutOfScope={openOutOfScope}
                onPickMatch={pickRegisterMatch}
              />
            }
          />
        ) : null}
      </div>
      <ContentPanel>
        <div data-audit-scan-out-of-scope className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-foreground">{t("outOfScopeBoxTitle")}</p>
          <Button variant="outline" size="md" onClick={startOutOfScopeFind}>
            {t("outOfScopeBoxAction")}
          </Button>
        </div>
      </ContentPanel>
      ```
      The column's `space-y-2` (`:683`) spaces the box. `focusListAfterClose` still finds the rows in `listAreaRef`, or the pressed tab while searching.
  - Kept as they are, pinned by `tests/audit-scan-room-ui.test.ts:60-73` and `tests/audit-scan-workspace-ui.test.ts`:
    - the `<AuditScanHeader …>` line;
    - the `<AuditScanRoomPicker … onRoomChange={changeRoom} />` line;
    - `roomPickerOpen`;
    - the offline bar, the saved banner and the closed notice.

- **`DESIGN.md`**:
  - At `:294`, the sentence "The audit scan header's bar is an older progress bar; it keeps its own markup until group 2 plan 3 moves it onto `PaceBar`." becomes "The audit scan header's bar is a `PaceBar` under "x / y" and "ไม่ตรง N" (group 2 plan 3)." It keeps the phrase "The audit scan header's bar" that `tests/data-bars.test.ts:91` looks for in the Data Bars Rule, so that test needs no edit; `tests/audit-rounds-ux.test.ts:189` pins the old sentence and is rewritten in Step 6.
  - In the field-work pattern, the **Context first** bullet (`:653`) gains at its end: "The room button reads "ห้องนี้ตรวจแล้ว x / y · เหลือ z" within the chosen department. Under the ยังไม่ตรวจ / ตรวจแล้ว / ทั้งห้อง (ทั้งรอบ with no room) switch, the room's categories in the tab are a `Segmented` (not `fill`) in their own `overflow-x-auto` row: "ทุกหมวดหมู่" first, then by count; hidden with one category or none, and cleared by any room change (group 2 plan 3). Every count reads the round's own items, never the out-of-scope finds."
  - The **Search** bullet (`:654`) gains: "The search is round-wide: an exact code first wherever its room is, then the chosen room's items, and its line says both ("ผลค้นหา "…": ในห้องนี้ N · ห้องอื่น M"). It shows 10 at a time with "แสดงเพิ่ม", and the switch stays above it. An always-shown box "เจอของที่ไม่อยู่ในรายการ?" starts an out-of-scope record at the search, which goes through the register lookup."

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test tests/audit-scan-walk-ui.test.ts tests/audit-scan-session-walk.test.ts tests/audit-scan-page.test.ts tests/performance-route-instrumentation.test.ts tests/audit-scan-workspace-ui.test.ts tests/audit-scan-feedback-transition.test.ts tests/audit-scan-offline-ux.test.ts tests/audit-scan-lookup.test.ts tests/visual-foundation-guards.test.ts tests/field-primitives.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts tests/data-bars.test.ts tests/audit-rounds-ux.test.ts && npx tsc --noEmit`

Expected: PASS once Step 6's rewrites of `tests/visual-foundation-guards.test.ts:379` and `tests/audit-rounds-ux.test.ts:186-192` are in (run it again after Step 6). These pins hold:
- `data-bars.test.ts:91` still finds "The audit scan header's bar" in the Data Bars Rule.
- `visual-foundation-guards.test.ts`:
  - `:286-287`: the room list still holds `<Segmented` and no `aria-pressed`;
  - `:377-381`: the raw-button counts are unchanged (picker 2, search 1, lookup card 1) except the room list's, 2 after Step 6 (P3-R25);
  - `:125`: the sticky search classes are unchanged.
- `field-primitives.test.ts:150`: the first `<Segmented` (the switch) has `size="md"` and `fill`.
- `audit-scan-session-walk.test.ts` (Task 2): the `const search = useMemo(…)` line and the camera, component and pick lines are unchanged.

- [ ] **Step 6: Rewrite the pins this task breaks**

- **`tests/audit-scan-room-ui.test.ts`:**
  - `:16-22` becomes:

    ```ts
    test("the header is compact: the code and name truncate, the round's PaceBar under the counts, nothing sticky", () => {
      const source = read("src/components/audit/audit-scan-header.tsx")
      assert.match(source, /truncate/)
      assert.match(source, /<PaceBar value=\{progress\.total === 0 \? 0 : progress\.checked \/ progress\.total\}/)
      assert.match(source, /t\("progressChecked", \{/)
      assert.doesNotMatch(source, /sticky/)
    })
    ```
  - `:24-39` becomes:

    ```ts
    test("the header: the round code on line 1 and its name small on line 2, then x / y over ไม่ตรง N (spec §11)", () => {
      const source = read("src/components/audit/audit-scan-header.tsx")
      assert.match(source, /roundCode: string/)
      const h1 = source.slice(source.indexOf("<h1"), source.indexOf("</h1>"))
      assert.match(h1, /\{roundCode\}<\/span>\s*<span className="block truncate text-meta text-muted-foreground">\{roundName\}<\/span>/)
      const row = source.slice(source.indexOf("<Link"), source.indexOf("<PaceBar"))
      assert.match(row, /<\/h1>\s*<p[^>]*shrink-0[^>]*>[\s\S]*t\("progressCount", \{[\s\S]*t\("progressMismatch", \{/)
      const workspace = read("src/components/audit/audit-scan-workspace.tsx")
      assert.match(workspace, /<AuditScanHeader roundName=\{roundName\} roundCode=\{roundCode\} backHref=\{backHref\} progress=\{progress\} \/>/)
      assert.match(read("src/app/[locale]/(dashboard)/audit/rounds/[id]/scan/page.tsx"), /roundCode=\{round\.auditNo\}/)
    })
    ```
  - In `:41-47`, the title becomes "the room button shows the chosen room, ห้องนี้ตรวจแล้ว x / y · เหลือ z and a change cue (bug 21)" and `:44` becomes `assert.match(trigger, /t\("roomCheckedOfTotal", \{ checked: formatCount\(progress\.checked\), total: formatCount\(progress\.total\), pending: formatCount\(progress\.pending\) \}\)/)`. `:45-46` stay.
  - `:78-79` become:

    ```ts
      assert.match(source, /<span className="block break-words text-sm font-semibold text-foreground">\{item\.name\}<\/span>/)
      assert.match(source, /<span className="block text-meta text-muted-foreground"><span className="tag whitespace-normal break-all">\{item\.assetTag\}<\/span><\/span>/)
    ```
    The title becomes "room list rows show the name, the code under it and the full room on its own line (D6; group 2 spec §11)". `:77`, `:80-82` stay.
  - `:89` becomes `assert.match(source, /t\("roomOptionCounts", \{ checked: formatCount\(option\.total - option\.pending\), total: formatCount\(option\.total\), pending: formatCount\(option\.pending\) \}\)/)`.
  - `:124` (the key list) becomes:

    ```ts
      const keys = ["progressChecked", "progressCount", "progressMismatch", "roomPick", "roomChange", "roomSheetTitle", "roomSheetHelp", "roomSheetSearch", "roomCheckedOfTotal", "roomOptionCounts", "roomDepartmentOption", "roomDepartment", "roomAllDepartments", "roomClear", "roomListLabel", "roomListTabs", "tabPending", "tabChecked", "tabAllRoom", "tabAllRound", "showMore", "checkedBy", "badgeFound", "badgeMismatch", "badgeNotFound", "badgeOutOfScope", "badgeQueued", "emptyPending", "emptyChecked", "emptyAll", "emptyAllRound", "pendingLinkRoom", "pendingLinkRound", "categoryChipsLabel", "categoryAll", "categoryUnknown", "rowComponents"]
    ```
  - These stay: `:8-14`, `:49-73`, `:95-104` (`href={pendingHref}` is still in the list), `:106-121`, `:131-159`.
- **`tests/audit-scan-sweep-ui.test.ts`:**
  - `:92-101` becomes:

    ```ts
    test("scan header: the back link is a ghost icon link from buttonVariants named กลับไปหน้ารอบ, and the counts go through formatCount (spec 2D D2, M29; group 2 spec §11; DESIGN.md Numbers)", () => {
      const source = read(`${A}audit-scan-header.tsx`)
      assert.match(source, /<Link href=\{backHref\} aria-label=\{t\("backToRound"\)\} className=\{buttonVariants\(\{ variant: "ghost", size: "icon" \}\)\}>\s*<ArrowLeft className="size-5" aria-hidden="true" \/>/)
      assert.match(source, /<p data-audit-scan-progress className="shrink-0 pr-1 text-right text-meta num text-muted-foreground">/)
      assert.match(source, /const checked = formatCount\(progress\.checked\)/)
      assert.match(source, /t\("progressMismatch", \{ count: formatCount\(progress\.mismatched\) \}\)/)
      assert.doesNotMatch(source, /toLocaleString|useLocale|\btext-xs\b|size-11|hover:bg-accent/)
    })
    ```
  - `:106` becomes `assert.match(source, /<EmptyNote tone=\{tab === "pending" \? "clear" : "empty"\} className="justify-center px-2 py-6">\{t\(emptyLabelKey\[scope\]\[tab\]\)\}<\/EmptyNote>/)`.
  - `:108` becomes `assert.match(source, /<span className="block text-meta text-muted-foreground"><span className="tag whitespace-normal break-all">\{item\.assetTag\}<\/span><\/span>/)`.
  - `:114` becomes `assert.doesNotMatch(source, /\btext-xs\b|tabular-nums|hover:underline|text-primary|rounded-md border border-border bg-surface/)`, with the comment above it: "The name is bold since group 2 spec §11 (font-semibold, as the pending list's names); the code is a tag at its own weight."
  - `:120` becomes `assert.match(source, /<span className="block text-meta font-normal num">\s*\{t\("roomCheckedOfTotal", \{ checked: formatCount\(progress\.checked\)/)`.
  - `:122` becomes `assert.match(source, /<span className="shrink-0 text-meta num text-muted-foreground">\s*\{t\("roomOptionCounts", \{ checked: formatCount\(option\.total - option\.pending\)/)`.
  - These stay: `:105`, `:107`, `:109-113`, `:119`, `:121`, `:123-126`, `:129-152` (the search: one raw button, no `<input`; the lookup card: one raw button).
- **`tests/audit-scan-search-ui.test.ts`:**
  - `:33` becomes `assert.match(source, /const elsewhere = match\.elsewhere/)`. The title becomes "results highlight the match, warn about another room (the rule's elsewhere), and fall back to the register card".
  - `:52` becomes `assert.match(source, /<p role="status" className="sr-only">\{matches\.length > 0 \? resultLine : t\("searchNoResult"\)\}<\/p>/)`.
  - In `:84` (the key list), `"searchResultCount"` becomes `"searchResultInRoom", "searchResultInRound", "lookupNotListed", "outOfScopeHint"`.
- **`tests/list-frame-guards.test.ts:143`, `:149`:** the `why` texts become "the field scan header, its own two-line variant (group 2 spec §11)" and "the field scan header's back link to the round page, its own two-line variant (group 2 spec §11)". The counts stay 1.
- **`tests/visual-foundation-guards.test.ts:379`** becomes `"src/components/audit/audit-scan-room-list.tsx": { count: 2, kind: "permanent", why: "the whole row of two to four lines opens the check sheet; a recorded out-of-scope find's row opens its out-of-scope form", ruling: "2D-4 R5; group 2 plan 3 P3-R25" },`.
- **`tests/audit-rounds-ux.test.ts`:**
  - The `:186` title becomes "DESIGN.md: the rounds list, the round page and the scan header draw their bars with the shared parts (group 2 plans 1-3)".
  - `:189` and one new line after it become:

    ```ts
      assert.ok(rule.includes("The audit scan header's bar is a `PaceBar` under \"x / y\" and \"ไม่ตรง N\" (group 2 plan 3)."))
      assert.ok(!rule.includes("older progress bar"))
    ```
  - `:190-191` stay.
- **The footer link's name:** the guard `tests/e2e-audit.test.ts:178` reads the spec's text, so both change in this commit. Task 6 owns the rest of the E2E.
  - `e2e/audit/field-audit.spec.ts:302` becomes `await page.getByRole("link", { name: "ของในห้องนี้ที่ยังหาไม่เจอ 1 รายการ →" }).click()`. Room B then holds A4 pending and A5 checked, so N = 1.
  - In `tests/e2e-audit.test.ts:178`, `room.includes(words.pendingLink)` becomes `room.includes(words.pendingLinkRoom.replace("{count}", "1"))`.
  - These two lines are this task's. Task 6 keeps the spec's link line word for word (it only puts its settle step before it) and adds its own assertion after `:178`, so neither is edited twice.

- [ ] **Step 7: Run everything**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS. A pin that fails outside the lists above is rewritten in this commit and named in the report.

E2E is not run in this task. These steps break until Task 6:
- `e2e/audit/scan-steps.ts:40` (the search line);
- `scan-steps.ts:47-49` (Task 5's sheet title);
- `e2e/audit/field-audit.spec.ts:298` (the offline row's badge now reads "พบตรง", P3-R19; Task 6 rewrites `:297-303` around this task's `:302`).

- [ ] **Step 8: Commit**

```bash
git add "src/app/[locale]/(dashboard)/audit/rounds/[id]/scan/page.tsx" src/lib/audit-scan-data.ts src/lib/audit-scan-session.ts src/components/audit/audit-scan-header.tsx src/components/audit/audit-scan-room-picker.tsx src/components/audit/audit-scan-room-list.tsx src/components/audit/audit-scan-search.tsx src/components/audit/audit-scan-lookup-card.tsx src/components/audit/audit-scan-workspace.tsx DESIGN.md messages/th.json messages/en.json e2e/audit/field-audit.spec.ts tests/audit-scan-walk-ui.test.ts tests/audit-scan-room-ui.test.ts tests/audit-scan-sweep-ui.test.ts tests/audit-scan-search-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/audit-rounds-ux.test.ts tests/e2e-audit.test.ts
git commit -m "feat(audit-scan): the phone walk reads its round: the code over the name with x / y over ไม่ตรง N and a PaceBar, the room button counts what is checked and left in the chosen department, the search puts an exact code first, then the room, with its true total and shows ten at a time, the third tab says ทั้งห้อง or ทั้งรอบ, category chips (ทุกหมวดหมู่ first) scroll under the switch and clear on a room change, rows lead with the name and the found badge reads พบตรง, the ตรวจแล้ว tab lists the recorded out-of-scope finds apart with their นอกขอบเขต badge, and an always-shown box starts an out-of-scope record at the search (group 2 plan 3 task 3)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The out-of-scope find on the client: a recorded find opens its out-of-scope form through the lookup, the deep link does the same, and the round page offers "แก้ไขผลตรวจ" on it again

After Tasks 1 and 2, a typed, decoded or picked out-of-scope find no longer matches a round item. It reaches the register lookup, and Task 1's lookup answers `out_of_scope` with the recorded `item`. This task completes the client side of P3-R3 and P3-R4:

1. **A recorded find opens as the out-of-scope form.** When the lookup's `out_of_scope` answer carries `item`, the workspace finds that row in its full `items`, or after one sync when another phone saved it. It opens the out-of-scope form straight away, without the "ไม่อยู่ในขอบเขต" card step.
   - The form compares against the row's `expected*`, which is the first scan's snapshot of the master (P3-R3), and starts from what was recorded (`actual*`).
   - The status line reads "บันทึกนอกขอบเขตไว้แล้ว · บันทึกตอนนี้จะเป็นการแก้".
   - The save is today's `submitOutOfScope`: photos upload first as evidence, the ids are sent, it works online only and is never queued. The save label stays "บันทึกนอกขอบเขต". The photo rule is the server's re-scan rule (P3-R18): a photo only for a field that differs from the snapshot and whose value this save changes from the recorded one, so a remark-only edit needs none. A first record keeps today's rule (any differing field).
2. **The `in_round` branch** finds own items only (`findAuditScanOwnItem`). Its comment no longer describes the carry-over.
3. **The saved banner's "แก้"** finds own items only.
4. **The deep link** `?assetId=` of an out-of-scope find no longer opens a round item:
   - the row's tag fills the search;
   - the room picker does not open by itself;
   - the register lookup runs once on mount, which opens the form as in item 1.
5. **The round page** offers "แก้ไขผลตรวจ" on out-of-scope rows again (`rounds/[id]/page.tsx:279`, P3-R4). It is still for `audit:edit` only, on an open round and a checked item. Out-of-scope rows are `reviewed`, so they count as checked.

**Files:**
- Modify: `src/components/audit/audit-scan-workspace.tsx`. On master the block lines are below; Tasks 2 and 3 have edited others, and each block is named by its content:
  - the React import (`:4`);
  - the `isAuditRoundOwnItem` import;
  - `draft` / `term` (`:103-104`, moved below the initial target);
  - `initialTarget` and `roomPickerDismissed` (`:107-114`);
  - the mount effect (`:300-306`);
  - `openOutOfScope` (`:377-385`);
  - `searchRegister`'s `in_round` branch (`:428-438`) and the new recorded branch before `:440`;
  - the saved banner's `onEdit` (`:723-726`).
- Modify: `src/components/audit/audit-scan-check-form.tsx`:
  - `:19-37` (one import);
  - `:39-41` (the target type);
  - `:129` (`expected`);
  - `:131-135` (the starting values);
  - `:155-156` (the photo rule of a recorded find, P3-R18);
  - `:274` (the status line).
- Modify: `src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx`:
  - `:279` (`editHref`);
  - `:303-304` (the ⋯ comment).
- Modify: `messages/th.json`, `messages/en.json` (through `node scripts/messages-edit.mjs`).
- Test:
  - `tests/audit-scan-recorded-find.test.ts` (new, source pins plus the message by value);
  - pins rewritten:
    - `tests/audit-round-page-ui.test.ts:165`, `:170`;
    - `tests/audit-round-exports.test.ts:119`, `:125`;
    - `tests/audit-component-scan-ui.test.ts:52`;
    - `tests/audit-scan-room-ui.test.ts:68`;
    - `tests/audit-scan-check-ui.test.ts:14`.

**Interfaces:**
- Consumes:
  - Task 1:
    - `AuditScanLookupResponse`'s `out_of_scope` variant gains `item?: AuditLookupRecordedFind` (`AuditLookupAuditItem`'s `{ id, assetId, auditStatus, auditResult }` plus the four `expected*` and four `actual*` ids, `src/components/audit/audit-scan-types.ts`) for a find already recorded in the round. This task reads only `payload.item.id`; the form reads the snapshot and the found values from the walk's own row (`recorded`), which carries the same fields;
    - `in_round` and `candidates[].inRound` are for own items only;
    - the scan route's re-scan branch keeps the result `out_of_scope`, compares against `item.expected*`, needs evidence only for a differing field whose found value changes in this save (P3-R18), refuses a component confirm and never updates the master;
    - `auditOutOfScopeRescanEvidenceFields(differing, saving, recorded)` (`src/lib/audit-out-of-scope-rescan.ts`, pure, no imports): the form's photo rule for a recorded find, the same as the route's;
    - its response is `{ status: "out_of_scope", auditResult: "out_of_scope", item, scannedByName }` with **200** (P3-R24); a first record still answers 202. `submitOutOfScope` accepts any `response.ok` (`ws:590`).
  - Task 2: `findAuditScanOwnItem(items, assetId): AuditScanItemRow | null`. The workspace's `pickRegisterMatch`, `handleDecoded` and `scanComponent` already use own items (Task 2).
  - Task 3: `searchRegister`'s callers and the lookup card's `title` are unchanged here. The out-of-scope box's hint is cleared by `finishSave`.
  - `isAuditRoundOwnItem(item)` (`src/lib/audit-round-counts-rules.ts:11-13`, client-safe).
  - `buildCheckDefaults({ mode: "edit", item, room })` (`src/lib/audit-scan-session.ts:246-252`): `actual*`, with the location falling back to `expected`. `expectedCheckValues(item)` (`:219-226`).
  - React 19.2's `useEffectEvent` (`node_modules/@types/react/index.d.ts:1791`; `eslint-plugin-react-hooks` 7.1.1 knows it).
- Produces:
  - `AuditCheckTarget` (`audit-scan-check-form.tsx`) becomes `{ kind: "item"; item: AuditScanItemRow; openedMode: "scan" | "edit" } | { kind: "out_of_scope"; asset: AuditLookupAsset; recorded: AuditScanItemRow | null }`. `recorded` is the find's own row when it was already recorded out of scope.
  - `openOutOfScope(asset: AuditLookupAsset, recorded: AuditScanItemRow | null = null)` in the workspace.
  - The message `auditScan.sheetStatusOutOfScopeRecorded`.
  - For Task 5, the record sheet must keep these:
    - the `recorded` branch of `expected` and of the starting values (Task 5 wraps the starting values in `startAuditCheckRecord(…)` and keeps the three-way expression as it is);
    - `recordedValues`, `photoDiff` and `photoRequired = requiresCheckPhoto(mode, photoDiff)` right after the `diff` line (P3-R18);
    - the status line's `target.recorded ? t("sheetStatusOutOfScopeRecorded") : t("sheetStatusOutOfScope")`;
    - its per-field state (P3-R8, P3-R21), which starts from these values: a field whose recorded value differs from the snapshot opens as ไม่ตรง with that value chosen.
  - The markup Task 6's E2E stands on (th):
    - **Second scan of X1** (field-audit, room A, after the first record):
      - `scan.typeSearch(page, X1)`. The results' `status` reads "ไม่พบในรอบนี้", since X1 is not an own item.
      - Click `getByRole("button", { name: "ค้นในทะเบียนทั้งหมด" })`. The check opens at once, with no "… ไม่อยู่ในขอบเขตรอบนี้" card.
      - The form holds `checkForm(page).getByText("บันทึกนอกขอบเขตไว้แล้ว · บันทึกตอนนี้จะเป็นการแก้")` and the save "บันทึกนอกขอบเขต". Each row opens as recorded (P3-R21): X1 was recorded in room A, its master room, so no row is `data-mismatch="true"`.
      - Nothing changes from what was recorded, so no photo is needed (P3-R18). The save answers 200 (P3-R24), and the banner reads "<X1> บันทึกเป็นนอกขอบเขตแล้ว".
      - The round page then still counts นอกขอบเขต 1, and its ทั้งหมด does not grow (8 once Task 6 adds A3, P3-R23; field-audit.spec.ts:345).
  - The markup Task 4's source tests and the UAT item stand on (no E2E step opens it, spec §16):
    - **Round page "แก้ไขผลตรวจ" on X1** (IT staff, `audit:edit`):
      - desktop: the row's ⋯ `getByRole("button", { name: "การดำเนินการของ <X1>" })`, then `getByRole("menuitem", { name: "แก้ไขผลตรวจ" })`;
      - phone: the card's link `getByRole("link", { name: "แก้ไขผลตรวจ" })`;
      - both open `/th/audit/rounds/<id>/scan?assetId=<X1 id>&mode=edit&returnTo=…`;
      - the search box holds X1's tag, the room sheet does not open by itself, and the out-of-scope form opens with the line above;
      - the viewer sees neither control.
- E2E is not run in this task.

- [ ] **Step 1: Write the failing test**

`tests/audit-scan-recorded-find.test.ts` (new):

```ts
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
  assert.match(branch, /const recorded = items\.find\(\(row\) => row\.itemId === recordedId\) \?\? \(await syncNow\(\)\)\.find\(\(row\) => row\.itemId === recordedId\)/)
  assert.match(branch, /if \(recorded\) \{\n\s+setLookup\(\{ status: "idle" \}\)\n\s+openOutOfScope\(payload\.asset, recorded\)\n\s+\} else \{\n\s+setLookup\(\{ status: "error", message: tCommon\("error"\) \}\)\n\s+\}\n\s+return/)
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/audit-scan-recorded-find.test.ts`
Expected: FAIL:
- the workspace has no recorded branch and no `initialRecordedTag`, and `in_round` uses `items.find`;
- the form's target has no `recorded`, and its photo rule has no `photoDiff`;
- the round page still hides the link on `out_of_scope`;
- `sheetStatusOutOfScopeRecorded` is undefined.

- [ ] **Step 3: Add the word**

The change file goes in the session scratchpad, is run with `node scripts/messages-edit.mjs <file>`, then deleted. Namespace `auditScan`:

| Key | th | en |
|---|---|---|
| `sheetStatusOutOfScopeRecorded` (new) | บันทึกนอกขอบเขตไว้แล้ว · บันทึกตอนนี้จะเป็นการแก้ | Already recorded out of scope · saving now edits it |

Glossary: "นอกขอบเขต" is row 17. The phrase follows `sheetStatusJustChecked` "…· บันทึกตอนนี้จะเป็นการแก้ผล" (Appendix A §12), which uses the same wording. Kept: `sheetStatusOutOfScope` "นอกขอบเขตรอบนี้", `saveOutOfScope`, `savedOutOfScope`, `lookupOutOfScope` and `recordOutOfScope`.

- [ ] **Step 4: Implement**

- **`src/components/audit/audit-scan-check-form.tsx`:**
  - `:39-41`:

    ```ts
    export type AuditCheckTarget =
      | { kind: "item"; item: AuditScanItemRow; openedMode: "scan" | "edit" }
      // recorded: the find's own row when it was already recorded out of scope (P3-R3). The form then compares against the
      // first scan's snapshot (its expected values) and starts from what was recorded; null for a first record.
      | { kind: "out_of_scope"; asset: AuditLookupAsset; recorded: AuditScanItemRow | null }
    ```
  - `:129`:

    ```ts
    const expected = target.kind === "item"
      ? expectedCheckValues(target.item)
      : target.recorded ? expectedCheckValues(target.recorded) : masterCheckValues(lookupMasterValues(target.asset))
    ```
  - `:131-135`:

    ```ts
    const [values, setValues] = useState<AuditCheckValues>(() =>
      target.kind === "item"
        ? buildCheckDefaults({ mode: target.openedMode, item: target.item, room })
        : target.recorded
          ? buildCheckDefaults({ mode: "edit", item: target.recorded, room })
          : buildCheckDefaults({ mode: "out_of_scope", master: lookupMasterValues(target.asset), room }),
    )
    ```
    An edit starts from what was saved and never applies the walked room (`tests/audit-scan-session-check.test.ts:46`). The scan route's re-scan compares against the same `expected*` (Task 1), so the save label's count equals the findings the server writes.
  - `:19-37`: add `import { auditOutOfScopeRescanEvidenceFields } from "@/lib/audit-out-of-scope-rescan"` (Task 1's pure file).
  - `:155-156` (the `diff` line stays; the photo rule under it):

    ```ts
    const diff = diffCheckValues(values, expected, ownershipType)
    // A recorded find (P3-R18): a photo only for a field that differs from the snapshot and that this save changes from
    // what was recorded, the scan route's own rule, so a remark-only edit needs none. A first record and an own item keep
    // their rules (any differing field out of scope; N-AU1 in scope).
    const recordedValues = target.kind === "out_of_scope" && target.recorded ? buildCheckDefaults({ mode: "edit", item: target.recorded, room }) : null
    const photoDiff = recordedValues ? auditOutOfScopeRescanEvidenceFields(diff, values, recordedValues) : diff
    const photoRequired = requiresCheckPhoto(mode, photoDiff)
    ```
    `missingPhoto` (`:157`) reads `photoRequired` as before. The reason Notice (`:444`, `checkPhotoReasonKey(mode, diff)`) keeps `diff`: out of scope it is the one key either way.
  - `:274`: `if (target.kind === "out_of_scope") return target.recorded ? t("sheetStatusOutOfScopeRecorded") : t("sheetStatusOutOfScope")`.
  - Unchanged:
    - `mode` (`:128`), so the save label is "บันทึกนอกขอบเขต" and a first record's photo rule is `diff.length > 0`;
    - `ownershipType` (`:130`, the lookup's master type; the snapshot has no type of its own);
    - `extrasOpen` starts open for both;
    - `notes` (none for out-of-scope).
- **`src/components/audit/audit-scan-workspace.tsx`:**
  - `:4` gains `useEffectEvent`: `import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState, type ReactNode } from "react"`.
  - Add `import { isAuditRoundOwnItem } from "@/lib/audit-round-counts-rules"` after the `@/lib/audit-offline-queue` import block.
  - `findAuditScanOwnItem` is in the session import already (Task 2).
  - **The initial target** (`:103-114`): the two search states move below the initial target, and the block reads:

    ```ts
    const [tab, setTab] = useState<AuditScanListTab>("pending")
    const [limit, setLimit] = useState(auditScanListPageSize)
    // Task 3's searchLimit, categoryChoice and outOfScopeHint states stay here.
    const initialTarget = useMemo<AuditCheckTarget | null>(() => {
      const item = initialAssetId ? initialItems.find((row) => row.assetId === initialAssetId) : undefined
      // A find recorded out of scope opens through the lookup (initialRecordedTag), never as a round item (P3-R3).
      return item && isAuditRoundOwnItem(item) ? { kind: "item", item, openedMode: getCheckMode(item) } : null
    }, [initialAssetId, initialItems])
    /** The round page's "แก้ไขผลตรวจ" on an out-of-scope find (P3-R4): its tag fills the search and is looked up once. */
    const initialRecordedTag = useMemo(() => {
      const item = initialAssetId ? initialItems.find((row) => row.assetId === initialAssetId) : undefined
      return item && !isAuditRoundOwnItem(item) ? item.assetTag : null
    }, [initialAssetId, initialItems])
    const [draft, setDraft] = useState(initialRecordedTag ?? "")
    const [term, setTerm] = useState(initialRecordedTag ?? "")
    const [target, setTarget] = useState<AuditCheckTarget | null>(initialTarget)
    const [roomPickerRequested, setRoomPickerRequested] = useState(false)
    // Closing the picker, or a visit that starts on an asset's check sheet or on a recorded find, ends the first-visit
    // auto-open (D7).
    const [roomPickerDismissed, setRoomPickerDismissed] = useState(initialTarget !== null || initialRecordedTag !== null)
    ```
    Every reader of `draft` and `term` is below this block (the derived values from `:144`, the handlers from `:392`), so moving the two lines changes no order of use.
  - **Mount effect** (`:300-306`):

    ```ts
    // The deep link to a recorded find runs the register lookup once the page is up, as a typed tag would (P3-R4).
    const lookUpInitialRecordedFind = useEffectEvent(() => {
      if (initialRecordedTag) void searchRegister(initialRecordedTag)
    })

    useEffect(() => {
      const timer = window.setTimeout(() => {
        void refreshQueue()
        if (initialTarget?.kind === "item") void loadComponents(initialTarget.item.assetId)
        lookUpInitialRecordedFind()
      }, 0)
      return () => window.clearTimeout(timer)
    }, [initialTarget, loadComponents, refreshQueue])
    ```
    `searchRegister` is a function declaration in the component body, so the effect event can call it. Its dependency list is unchanged; an effect event is never listed. The double run in development clears the first timer, so the lookup runs once.
  - **`openOutOfScope`** (`:377-385`):

    ```ts
    function openOutOfScope(asset: AuditLookupAsset, recorded: AuditScanItemRow | null = null) {
      returnFocusRef.current = inputRef.current
      setTarget({ kind: "out_of_scope", asset, recorded })
      // the rest as master :380-384
    }
    ```
    `onRecordOutOfScope={openOutOfScope}` (the lookup card) still passes one argument, which makes a first record.
  - **`searchRegister`** (`:428-439`):

    ```ts
    if (payload.status === "in_round") {
      // A round item missing here (the page loaded before it came in) arrives with a sync. Only own items answer in_round
      // (Task 1): a find recorded out of scope answers out_of_scope with its item, below.
      const item = findAuditScanOwnItem(items, payload.asset.id) ?? findAuditScanOwnItem(await syncNow(), payload.asset.id)
      // the if (item) / else as master :432-437
      return
    }
    if (payload.status === "out_of_scope" && payload.item) {
      // Already recorded out of scope: the form opens on that record and saving edits it (P3-R3). The record is a row of
      // the round, here or after a sync when another phone saved it.
      const recordedId = payload.item.id
      const recorded = items.find((row) => row.itemId === recordedId) ?? (await syncNow()).find((row) => row.itemId === recordedId)
      if (recorded) {
        setLookup({ status: "idle" })
        openOutOfScope(payload.asset, recorded)
      } else {
        setLookup({ status: "error", message: tCommon("error") })
      }
      return
    }
    if (payload.status === "out_of_scope") {
      // master :441-446 unchanged (tests/audit-scan-workspace-ui.test.ts:106-116 reads this branch)
    ```
    The recorded branch reads the full `items`. The record is not an own item, which is why it is opened here and never through `openItem`.
  - **The saved banner's `onEdit`** (`:723-726`): `const item = findAuditScanOwnItem(items, saved.assetId)`. The banner offers "แก้" on no out-of-scope notice (`audit-scan-saved-banner.tsx:53-57`); this keeps the open own-only anyway.
  - `submitOutOfScope` (`:571-603`) is unchanged.
    - After a re-scan, `syncNow()` (`:596`) pulls the record's new `actual*`, `scanCount` and `lastScanAt`. The phone counts none of them, since the record is not an own item.
    - Offline, the catch toasts `lookupOffline` (`:598`) and nothing is queued.
- **`src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx`:**
  - `:279`: `const editHref = canScan && !isRoundReadOnly && item.auditStatus !== "pending" ? buildAuditRoundScanEditHref({ locale, roundId: round.id, assetId: item.asset.id, returnTo: listHref }) : null`.
  - `:303-304`: the comment becomes "⋯: "แก้ไขผลตรวจ" for audit:edit on an open round, on a checked item only (a pending one has no result to edit). On an out-of-scope find, it opens that record's out-of-scope form through the walk's lookup (P3-R4). Then "ดู"."
  - The phone card's button (`:561-567`) reads the same `editHref`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test tests/audit-scan-recorded-find.test.ts tests/audit-scan-workspace-ui.test.ts tests/audit-scan-feedback-transition.test.ts tests/audit-scan-result-semantics.test.ts tests/audit-scan-search-ui.test.ts tests/audit-scan-check-ui.test.ts tests/audit-out-of-scope-actual-field.test.ts tests/audit-scan-session-walk.test.ts tests/audit-round-result-drilldown.test.ts && npx tsc --noEmit`

Expected: PASS. These pins hold:
- `audit-scan-workspace-ui.test.ts:106-116`: the first `if (payload.status === "out_of_scope") {` (the exact literal) is still the first-record branch, with `setDraft` / `setTerm` before `setLookup` and no `changeTerm(`.
- `audit-scan-feedback-transition.test.ts:15-18`: `openOutOfScope` still holds `setSaved(null)`.
- `audit-scan-result-semantics.test.ts:16`: `setLookup({ status: "out_of_scope", asset: payload.asset })` is still there.
- `audit-scan-search-ui.test.ts:184-185`: `initialAssetId ? initialItems.find((row) => row.assetId === initialAssetId)` and `openedMode: getCheckMode(item)` are still there.
- `audit-scan-check-ui.test.ts:9-13` and `audit-out-of-scope-actual-field.test.ts:41-42`: the three `buildCheckDefaults(…)` calls, `const diff = diffCheckValues(values, expected, ownershipType)` and `masterCheckValues(lookupMasterValues(target.asset))` are still there. (`:14` is rewritten in Step 6.)
- `audit-round-result-drilldown.test.ts:115-131`: the href builder is unchanged.

- [ ] **Step 6: Rewrite the pins this task breaks**

- **`tests/audit-round-page-ui.test.ts:165`:** the title becomes "the table: ผล / ทรัพย์สิน / สิ่งที่ต่าง / ตรวจโดย / รูป / พิจารณา, then ⋯ with แก้ไขผลตรวจ for audit:edit only, on a checked item only, an out-of-scope find included (spec §8, P2-R7, P2-R17, P3-R4)".
- **`tests/audit-round-page-ui.test.ts:170`** becomes `assert.match(page, /const editHref = canScan && !isRoundReadOnly && item\.auditStatus !== "pending" \? buildAuditRoundScanEditHref\(\{ locale, roundId: round\.id, assetId: item\.asset\.id, returnTo: listHref \}\) : null/)`.
- **`tests/audit-round-exports.test.ts:119`:** the title becomes "the round page lists the out-of-scope finds as items under every filter, counts them from the items, and offers แก้ไขผลตรวจ on them, which opens their out-of-scope form (P2-R5, P3-R4)".
- **`tests/audit-round-exports.test.ts:125`** becomes `assert.match(page, /const editHref = canScan && !isRoundReadOnly && item\.auditStatus !== "pending" \? buildAuditRoundScanEditHref\(/)`. `:126` (`{item.editHref ? (` once) stays.
- **`tests/audit-component-scan-ui.test.ts:52`** becomes `assert.match(workspace, /function openOutOfScope\(asset: AuditLookupAsset, recorded: AuditScanItemRow \| null = null\)[\s\S]*?components: normalizeAuditLookupComponents\(asset\.components\), installedIn: normalizeAuditLookupInstalledIn\(asset\.installedIn\)/)`.
- **`tests/audit-scan-room-ui.test.ts:68`** (about `:63` after Task 3's rewrite of `:24-39`) becomes `assert.match(workspace, /const \[roomPickerDismissed, setRoomPickerDismissed\] = useState\(initialTarget !== null \|\| initialRecordedTag !== null\)/)`. Its comment becomes "A visit that starts on an asset's check sheet, or on a recorded find's lookup, does not stack the picker on top of it."
- **`tests/audit-scan-check-ui.test.ts:14`** becomes `assert.match(source, /const photoRequired = requiresCheckPhoto\(mode, photoDiff\)/)`, with the comment "P3-R18: the diff, or for a recorded out-of-scope find the fields this save changes."
- These stay as they are:
  - `tests/audit-scan-session-check.test.ts:38`: `getCheckMode` of `reviewed/out_of_scope` is still "edit". The rule is unchanged, and no path now reaches it with an out-of-scope row.
  - `tests/audit-round-counts.test.ts:64-69`: the carry-over comment in `audit-round-counts-rules.ts:4-6` belongs to Task 1, whose fix it describes.

- [ ] **Step 7: Run everything**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS. A pin that fails outside the lists above is rewritten in this commit and named in the report.

- [ ] **Step 8: Commit**

```bash
git add src/components/audit/audit-scan-workspace.tsx src/components/audit/audit-scan-check-form.tsx "src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx" messages/th.json messages/en.json tests/audit-scan-recorded-find.test.ts tests/audit-round-page-ui.test.ts tests/audit-round-exports.test.ts tests/audit-component-scan-ui.test.ts tests/audit-scan-room-ui.test.ts tests/audit-scan-check-ui.test.ts
git commit -m "feat(audit-scan): a find recorded out of scope stays out of scope on the phone: the register lookup opens its out-of-scope form on the record (compared with the first scan's snapshot, starting from what was recorded, a photo only for a field this save changes as the server asks, saved with evidence first and online only), the deep link types its tag and looks it up, in_round and the saved banner open own items only, and the round page offers แก้ไขผลตรวจ on out-of-scope rows again (group 2 plan 3 task 4)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The record sheet (§12): the name as the title, one row per compared field with ตรง / ไม่ตรง and "ที่พบ", the department that follows a new custodian, "ไม่พบ" beside "พบ", and "ถ่ายรูป / เพิ่มหมายเหตุ"

The record sheet (AU-Scan-Record-Phone) is rebuilt to spec §12. What a save means does not change: the form still sends its values, the diff is still `diffCheckValues` and the scan route is untouched here (P3-R8, global constraint "the server stays the authority").
1. **Title (bug 23, P3-R12):** the sheet's title (the phone `SheetTitle`, the wide panel's `h2` and its `aria-label`) is the asset's name, wrapping. Line 2 is the asset code, then " · Serial <serial>", each a `.tag` that may wrap inside the line (`whitespace-normal break-all`, as `cba81df4`). The out-of-scope sheet gets its serial from `AuditLookupAsset.serialNumber` (the lookup already returns it, `src/app/api/audit-rounds/[id]/scan-lookup/route.ts:195`; the type gains the field). Nothing on line 2 is cut any more.
2. **One row per field:** the field name, the expected value (struck through on ไม่ตรง) and the shared `Segmented` "ตรง / ไม่ตรง" (`showCheck`, `size="md"`: 44px below `md`, 36px in the wide panel). "ไม่ตรง" opens "ที่พบ" as a `SearchableSelect`. The mismatched row keeps today's soft warning box (`border-warning-border bg-warning-soft`); the pressed segment keeps Segmented's own selected look (primary-soft), never a solid orange.
3. **Per-field state beside the values (P3-R8):** one `AuditCheckRecord` in the form holds `values`, `fields: Record<field, { mode: "match" | "mismatch"; chosen: boolean }>`, `departmentTouched` and `departmentFollowsCustodian`. Every change goes through a pure reducer in a new rules file, so the rules are tested by value. The invariant: a shown field is `{ mismatch, chosen }` exactly when `diffCheckValues` names it, and a row still to choose keeps the expected value.
   - "ไม่ตรง" with nothing chosen: save shows "เลือกค่าที่พบ" under that row's picker and focus moves to the picker.
   - Choosing the expected value turns the row back to ตรง. Tapping ตรง resets the value, and on the custodian it also takes back a department that followed the custodian.
   - **Editing a recorded result (P3-R21):** the record starts from the saved result (`buildCheckDefaults` in edit mode, or Task 4's recorded find). A field whose saved value differs from the expected one opens as ไม่ตรง with that value chosen; the others open as ตรง. The walked room never applies to an edit.
4. **"ไม่มี / ไม่ระบุ" (P3-R9, P3-R20):** a choosable option at the top of the custodian, department and condition lists, never the location's. The condition can be cleared today, so it keeps that choice (P3-R20). It stands for "" through a sentinel id, because the picker cannot hold "" as a choice (it shows its placeholder for "").
5. **Custodian options (P3-R10):** "code - name · <department code - name>", so the department is also searchable. The expected value of a row still reads the plain employee label.
6. **Location:** a walked room that is not the expected room opens the row as ไม่ตรง with the walked room chosen. That is today's `buildCheckDefaults` (new scans only), now shown; the person can tap ตรง.
7. **Department (P3-R11, N-AU1):** a new custodian of a personal asset sets the department row to that person's department, as ไม่ตรง with the line "ตามแผนกของผู้ถือครองที่พบ", unless the person set the department themselves. "Set" means they pressed ตรง or ไม่ตรง on it, chose one, or it already differed when the sheet opened.
   - A custodian of the expected department, or one with no department, or ไม่มี / ไม่ระบุ, leaves or puts the department back at ตรง.
   - Only where the custodian is compared: for any other asset the custodian row is hidden and never moves the department (bug 22's knock-on).
8. **Hidden fields (bug 22, P3-R11):** the custodian is hidden for every asset that is not personal, and the location for a licence (`auditCheckShownFields`, the scan route's own skip rules). A hidden field's value is set to the expected value when the sheet opens, so the payload sends the expected value.
9. **Status lines:** the first-scan line "ยังไม่ตรวจ" becomes the hint "ตรงกับของจริงไหม แตะ ไม่ตรง เฉพาะเรื่องที่ต่าง". Every other line stays: "เพิ่งถูกตรวจโดย …", "เคยบันทึกว่าหาไม่พบ…", "นอกขอบเขตรอบนี้", "ตรวจแล้ว … · กำลังแก้ผล", Task 4's recorded-find line, "ข้อมูลล่าสุด: …" and the installed-in notice.
10. **Save label (P3-R22):** it keeps the field names ("บันทึก · ไม่ตรง 1 ข้อ (ผู้ถือครอง)"). It counts the rows marked ไม่ตรง (the diff plus a row still to choose, in field order), so a pressed ไม่ตรง never reads "ตรงทุกข้อ", even before a value is chosen. The photo rule (Task 4's `photoDiff`, which is the diff except for a recorded out-of-scope find), the approver tick and the submission still read the diff. The edit and out-of-scope labels stay. An expected id the options do not hold reads "ไม่อยู่ในรายการ", never the raw id (P3-R22).
11. **Components:** "พบ" and a new outline "ไม่พบ" sit side by side (each with the code as sr-only text). "ไม่พบ" opens today's missing dialog. ⋯ keeps only "สแกน QR ส่วนควบ", so its focus guard (`openingDialogRef`) goes. The code, the badge, the role/slot line, "ตรวจแล้ว x / y", "พบครบทุกชิ้น" and the unfinished-components confirm stay.
12. **"ถ่ายรูป / เพิ่มหมายเหตุ":** the note-and-photo toggle gets this label and a camera icon (same key `addNotePhoto`, new value).
13. **Segmented `disabled` (shared part):** a new optional prop turns every option off in the Buttons disabled look (`background` fill, faint text, not-allowed cursor, never opacity). The rows pass `saving || disabled` as the selects do today.

What stays (Appendix A §12, as a checklist): the status lines above; "บันทึกการแก้ไข · …" and "บันทึกนอกขอบเขต" with its photo section open first; "ข้อมูลล่าสุด: …"; the approver's "อัปเดตที่ตั้ง/ผู้ถือครองตามที่พบจริง" when segregation is off; the "ประเภทรูป" select; the "…ต้องแนบรูปก่อนบันทึก" Notice tied to save; the pending thumbnails with delete; the installed-in Notice; in component rows the code, the badge, the role/slot line and "สแกน QR ส่วนควบ" (in ⋯); the components loading line, "ส่วนควบตรวจแล้ว x / y" in the bar and the unfinished-components confirm; the desktop side panel with the same form.

**Files:**
- Create: `src/lib/audit-check-record-rules.ts` (pure: relative `.ts` imports only; the record's per-field state and its reducers)
- Modify: `src/components/ui/segmented.tsx` (`:7-21` the props: `disabled?`; `:30` one new class constant after it; `:50-64` the option `button`)
- Modify: `src/components/audit/audit-scan-check-field.tsx` (master `:1-64`, rewritten: the row)
- Modify: `src/components/audit/audit-scan-check-form.tsx`:
  - `:4` (lucide `Camera`) and `:19-37` (imports);
  - `:65-82` (`FIELD_IDS`, `FIELD_KEY`, `CHOOSE_FOUND`, `validate`);
  - `:129-136` (the record replaces `values` and `departmentTouched`);
  - `:147-160` (`fieldError`, `shown`, `marked`);
  - `:190-211` (labels with no raw id, the "ที่พบ" lists, `changeMode` / `chooseFound` replace `changeCustodian` / `changeDepartment`);
  - `:260` (validate's call);
  - the status block (master `:273-285`; Task 4 adds its recorded-find branch there, so the block is named by content): only the first-scan return changes;
  - `:287-308` (label from `marked`, `fieldConfig` goes);
  - `:316-334` (the rows);
  - `:366-376` (the toggle's camera);
  - `:456` (the save variant).
- Modify: `src/components/audit/audit-scan-check-panel.tsx` (`:23` the description's doc comment, `:46` and `:73`: line 2 no longer truncated; the new `focusKey` prop and `:37`, the focus effect's dependencies)
- Modify: `src/components/audit/audit-scan-panels.tsx` (`:3-4` imports, `:17-19` the comment, `:43` and `:49-52` the menu guard goes, `:87-126` "ไม่พบ" beside "พบ", ⋯ with QR only)
- Modify: `src/components/audit/audit-scan-workspace.tsx` (the `targetTitle` / `targetDescription` block, master `:675-679`, named by content because Task 3 and Task 4 edit this file first)
- Modify: `src/components/audit/audit-scan-types.ts` (`AuditLookupAsset`, master `:35-48`: `serialNumber`; Task 1 edits the response type under it)
- Modify: `DESIGN.md:414` (the `Segmented` bullet: `disabled`)
- Modify: `DESIGN.md:655` (the field-work **Check sheet** bullet: the rows, the title, "ไม่พบ")
- Modify: `messages/th.json`, `messages/en.json` (through `node scripts/messages-edit.mjs`)
- Modify (E2E literals only, so `npm test` stays green; the run waits for Task 6): `e2e/audit/field-audit.spec.ts:155`, `:187`
- Test:
  - `tests/audit-check-record-rules.test.ts` (new, by value)
  - `tests/audit-scan-record-sheet-ui.test.ts` (new, source)
  - pins rewritten:
    - `tests/audit-scan-check-ui.test.ts:26`, `:36-40`, `:81-87`, `:99`, `:113`, `:124-134`, `:139-140`;
    - `tests/audit-scan-sweep-ui.test.ts:60-67`, `:86-87`;
    - `tests/v-track2-u.test.ts:203-209`, `:211`;
    - `tests/v-track2-x.test.ts:209`;
    - `tests/audit-scan-result-semantics.test.ts:38`;
    - `tests/audit-component-scan-ui.test.ts:79-102`, `:169`;
    - `tests/e2e-fixes.test.ts:279`;
    - `tests/e2e-audit.test.ts:130`.

**Interfaces:**
- Consumes:
  - `src/lib/audit-scan-session.ts` (unchanged by this task; Task 2 keeps these names):
    - types: `AuditCheckField`, `AuditCheckValues`, `AuditCheckMode`, `AuditScanOption`, `AuditScanEmployeeOption`;
    - functions: `buildCheckDefaults`, `expectedCheckValues`, `masterCheckValues`, `diffCheckValues(values, expected, ownershipType)`, `requiresCheckPhoto`, `checkPhotoReasonKey`, `suggestDepartmentForCustodian(employees, custodianId)` (`:237-290`), `getLatestValueNotes`, `isAuditItemChecked`.
  - `normalizeAssetOwnershipType`, `requiresCustodian` (`src/lib/asset-ownership.ts:9-17`).
  - Shared parts, with their real props:
    - `Segmented<T extends string>({ "aria-label", value, options: readonly { value: T; label: ReactNode }[], onValueChange, size?: "sm" | "md", fill?, showCheck?, className? })` (`src/components/ui/segmented.tsx:7-21`). It has no `disabled`, `id` or ref today; this task adds `disabled?: boolean`.
    - `SearchableSelect({ id?, label, value, options: { id; label; disabled? }[], required?, disabled?, placeholder, searchPlaceholder, emptyLabel, clearLabel?, hint?, error?, fieldSize?, onSearchChange?, onChange })` (`src/components/ui/searchable-select.tsx:31-63`). `required` hides the clear button and shows the star (aria-hidden). The trigger is a `button` named by `aria-labelledby` = label + value. "" shows the placeholder.
  - `useFieldErrors` returns `{ errors, setErrors, clear, message, focusFirst }` (`src/components/ui/use-field-errors.ts:123`). `message(code)` reads `common.validation` and then `apiErrors`. `common.validation` is pinned exact by `tests/v-track-f.test.ts:69-89`, so "เลือกค่าที่พบ" is read from `auditScan` by the form itself.
  - `fieldLabelClasses` (`src/components/ui/field-variants.ts:50`).
  - Task 1: the `AuditScanLookupResponse` out-of-scope variant gains `item?` (same file as `AuditLookupAsset`; this task only adds a field to `AuditLookupAsset`).
  - Task 3: rewrites the workspace's header, room, search and list parts. It does not touch the `targetTitle` / `targetDescription` block or the `AuditScanCheckPanel` / `AuditScanCheckForm` props.
  - Task 4:
    - The form's status block gains a first branch for a recorded out-of-scope find ("บันทึกนอกขอบเขตไว้แล้ว · บันทึกตอนนี้จะเป็นการแก้"). This task keeps that branch.
    - The out-of-scope target is `{ kind: "out_of_scope"; asset: AuditLookupAsset; recorded: AuditScanItemRow | null }` (name in `asset.subtitle`, code in `asset.assetTag`). `expected` reads `target.recorded` when there is one, and the starting values are the three-way expression (`target.item` / `target.recorded` in edit mode / the master); the record starts from that expression unchanged (P3-R21).
    - `recordedValues`, `photoDiff` and `photoRequired = requiresCheckPhoto(mode, photoDiff)` sit right after the `diff` line (P3-R18). This task keeps them there.
- Produces, in `src/lib/audit-check-record-rules.ts`:
  - `AUDIT_CHECK_FIELD_ORDER: readonly AuditCheckField[]` = `["location", "custodian", "department", "condition"]`
  - `AUDIT_CHECK_NONE_OPTION_ID = "__none__"`
  - `type AuditCheckFieldMode = "match" | "mismatch"`
  - `type AuditCheckFieldState = { mode: AuditCheckFieldMode; chosen: boolean }`
  - `type AuditCheckRecord = { values: AuditCheckValues; fields: Record<AuditCheckField, AuditCheckFieldState>; departmentTouched: boolean; departmentFollowsCustodian: boolean }`
  - `type AuditCheckRecordContext = { expected: AuditCheckValues; ownershipType: string | null; employees: readonly AuditScanEmployeeOption[] }`
  - `auditCheckShownFields(ownershipType: string | null): AuditCheckField[]`
  - `startAuditCheckRecord(values: AuditCheckValues, context: Pick<AuditCheckRecordContext, "expected" | "ownershipType">): AuditCheckRecord`
  - `pressAuditCheckMatch(record: AuditCheckRecord, field: AuditCheckField, context: AuditCheckRecordContext): AuditCheckRecord`
  - `pressAuditCheckMismatch(record: AuditCheckRecord, field: AuditCheckField): AuditCheckRecord` (returns the same object when already ไม่ตรง)
  - `chooseAuditCheckValue(record: AuditCheckRecord, field: AuditCheckField, value: string, context: AuditCheckRecordContext): AuditCheckRecord`
  - `auditCheckUnchosenFields(record: AuditCheckRecord, ownershipType: string | null): AuditCheckField[]`
  - `auditCheckMarkedFields(record: AuditCheckRecord, ownershipType: string | null): AuditCheckField[]`
  - `auditCheckFoundValue(record: AuditCheckRecord, field: AuditCheckField): string` ("" while not chosen, the none id for "")
  - `auditCheckValueFromFound(id: string): string`
  - `auditCheckFoundOptions(field: AuditCheckField, options: readonly AuditScanOption[], noneLabel: string): AuditScanOption[]`
  - `auditCheckCustodianOptions(employees: readonly AuditScanEmployeeOption[], departments: readonly AuditScanOption[]): AuditScanOption[]`
- Produces, in `src/components/audit/audit-scan-check-field.tsx`: `AuditScanCheckField({ id?, field, label, state, value, options, expectedValue, latestValue?, followsCustodian?, disabled?, labelFor, error?, onModeChange, onChange })`. `id?: string` and `error?: React.ReactNode` keep `tests/v-track-f.test.ts:227-232`. The `required?` and `mismatch` props go: the picker is always `required`, and the row reads `state.mode`.
- Produces: `Segmented`'s `disabled?: boolean`; `AuditLookupAsset.serialNumber: string | null`.
- Produces (the markup Task 6's E2E stands on; th words):
  - **Title:**
    - Phone: the sheet is `getByRole("dialog", { name: <asset name> })` and its title is `getByRole("heading", { name: <asset name>, exact: true })`.
    - Wide (≥ 64rem): the `h2` is the same heading, inside `aside[data-audit-check-panel]` labelled by the name.
    - Line 2 is `<code>` in `.tag`, then " · Serial " and the serial in `.tag` when the asset has one. The out-of-scope sheet reads the same, from the lookup.
    - So `checkHeading(page, x)` must be given the asset's name (the walk's names are unique per run: `"{runId} {code} จอภาพ"`, `e2e/audit/audit-plan.ts:32-50`).
  - **A row:** `[data-audit-check-field="location" | "custodian" | "department" | "condition"]` (inside `[data-audit-check-form]`), with `data-mismatch="true"` while ไม่ตรง is pressed (chosen or not).
    - Inside it, `getByRole("group", { name: "ที่ตั้ง" | "ผู้ถือครอง" | "แผนก" | "สภาพ" })` holds the buttons "ตรง" and "ไม่ตรง". Each has `aria-pressed`. Use `exact: true`, because "ไม่ตรง" contains "ตรง".
    - Rows the asset does not compare are absent. A shared asset (every walk asset today, `e2e/audit/audit-data.ts:93`) has no `[data-audit-check-field="custodian"]`.
  - **"ที่พบ" picker:** only while ไม่ตรง, a button with id `audit-check-location` / `audit-check-custodian` / `audit-check-department` / `audit-check-condition`. Its name is "ที่พบ " + the chosen label, or "ที่พบ เลือกจากรายการ" while nothing is chosen.
    - Opening it shows the combobox "ค้นหา" (`exact: true`, as today) and the options.
    - The custodian, department and condition lists start with "ไม่มี / ไม่ระบุ".
    - A custodian option reads "E002 - <name> · <dept code> - <dept name>", so `^E002 - ` still matches.
  - **"ไม่ตรง" without a value:** a tap on save (with no photo waiting) leaves the sheet open. The row's `[data-slot="field-error"]` reads "เลือกค่าที่พบ", and `#audit-check-<field>` is focused. The save label already names that field.
  - **A wrong room:** the item of room B, opened while room A is chosen, has `[data-audit-check-field="location"][data-mismatch="true"]`, its picker named "ที่พบ <room A code> - <room A name>", and save "บันทึก · ไม่ตรง 1 ข้อ (ที่ตั้ง)" waiting for "แผนกหรือที่ตั้งไม่ตรง ต้องแนบรูปก่อนบันทึก".
  - **A new custodian (personal asset):** pressing ไม่ตรง in "ผู้ถือครอง" and choosing an employee of another department turns `[data-audit-check-field="department"]` to `data-mismatch="true"`. That row shows "ตามแผนกของผู้ถือครองที่พบ" and its picker names the new department. Save reads "บันทึก · ไม่ตรง 2 ข้อ (ผู้ถือครอง, แผนก)" and waits for "แผนกหรือที่ตั้งไม่ตรง ต้องแนบรูปก่อนบันทึก".
  - **Hint:** a first scan of a pending item shows "ตรงกับของจริงไหม แตะ ไม่ตรง เฉพาะเรื่องที่ต่าง" and no "ยังไม่ตรวจ".
  - **Toggle:** the note-and-photo button is named "ถ่ายรูป / เพิ่มหมายเหตุ" (camera icon, `aria-expanded`).
  - **Component row:** `[data-audit-component-row]` holds the buttons "พบ <tag>" and "ไม่พบ <tag>". "ไม่พบ <tag>" opens `dialog "บันทึกส่วนควบที่ไม่พบ"`. Use `exact: true` on "พบ <tag>", because "ไม่พบ <tag>" contains it. ⋯ "การดำเนินการของ <tag>" holds only menuitem "สแกน QR ส่วนควบ".
- For Task 6:
  - `e2e/audit/scan-steps.ts:47-49` `checkHeading` takes the name.
  - `:53-61` `chooseInCheckField` becomes: the row by `[data-audit-check-field="<key>"]` → the group's "ไม่ตรง" (exact) → `#audit-check-<key>` → the combobox → the option → `data-mismatch="true"`.
  - `field-audit.spec.ts:205` needs `exact: true`. `:221-222` becomes the row's "ไม่พบ <tag>" button.
  - The custodian step needs one `personal` asset with a custodian and a second employee in another department (P3-R15).
  - E2E is not run in this task, and the walk breaks at the headings until Task 6.

- [ ] **Step 1: Write the failing tests**

`tests/audit-check-record-rules.test.ts` (new):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  AUDIT_CHECK_FIELD_ORDER,
  AUDIT_CHECK_NONE_OPTION_ID,
  auditCheckCustodianOptions,
  auditCheckFoundOptions,
  auditCheckFoundValue,
  auditCheckMarkedFields,
  auditCheckShownFields,
  auditCheckUnchosenFields,
  auditCheckValueFromFound,
  chooseAuditCheckValue,
  pressAuditCheckMatch,
  pressAuditCheckMismatch,
  startAuditCheckRecord,
  type AuditCheckRecord,
} from "../src/lib/audit-check-record-rules.ts"
import { buildCheckDefaults, checkPhotoReasonKey, diffCheckValues, requiresCheckPhoto, type AuditScanItemRow } from "../src/lib/audit-scan-session.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const expected = { location: "L1", custodian: "E1", department: "D1", condition: "C1" }
const employees = [
  { id: "E1", label: "E001 - สมชาย ใจดี", departmentId: "D1" },
  { id: "E2", label: "E002 - สมหญิง รักงาน", departmentId: "D2" },
  { id: "E3", label: "E003 - สมศักดิ์ มั่นคง", departmentId: null },
  { id: "E4", label: "E004 - สมใจ ตั้งใจ", departmentId: "D1" },
]
const personal = { expected, ownershipType: "personal", employees }
const shared = { expected, ownershipType: "shared", employees }
const licence = { expected, ownershipType: "software_license", employees }
const MATCH = { mode: "match", chosen: false } as const
const CHOSEN = { mode: "mismatch", chosen: true } as const
const UNCHOSEN = { mode: "mismatch", chosen: false } as const
const allMatch = { location: MATCH, custodian: MATCH, department: MATCH, condition: MATCH }
const start = (values = expected) => startAuditCheckRecord(values, personal)

test("only the fields the scan route compares are shown: no custodian for a non-personal asset, no location for a licence (bug 22, P3-R11)", () => {
  assert.deepEqual(AUDIT_CHECK_FIELD_ORDER, ["location", "custodian", "department", "condition"])
  assert.deepEqual(auditCheckShownFields("personal"), ["location", "custodian", "department", "condition"])
  for (const type of ["shared", "stock", "component"]) assert.deepEqual(auditCheckShownFields(type), ["location", "department", "condition"], type)
  assert.deepEqual(auditCheckShownFields("software_license"), ["department", "condition"])
  // A missing or unknown type reads as personal, as the server's normalize does.
  assert.deepEqual(auditCheckShownFields(null), ["location", "custodian", "department", "condition"])
  assert.deepEqual(auditCheckShownFields("legacy"), ["location", "custodian", "department", "condition"])
})

test("the sheet opens ตรง where the value is the expected one, ไม่ตรง and chosen where it differs (the walked room, a saved result), and a hidden field sends the expected value", () => {
  assert.deepEqual(start(), { values: expected, fields: allMatch, departmentTouched: false, departmentFollowsCustodian: false })
  // A wrong room (spec §12, my call): the location opens as ไม่ตรง with the walked room chosen.
  const wrongRoom = start({ ...expected, location: "L9" })
  assert.deepEqual(wrongRoom.fields, { ...allMatch, location: CHOSEN })
  assert.equal(wrongRoom.values.location, "L9")
  assert.deepEqual(diffCheckValues(wrongRoom.values, expected, "personal"), ["location"])
  // A saved department that differs is the person's own: a new custodian will not move it.
  assert.deepEqual(start({ ...expected, department: "D3" }), {
    values: { ...expected, department: "D3" },
    fields: { ...allMatch, department: CHOSEN },
    departmentTouched: true,
    departmentFollowsCustodian: false,
  })
  // A shared asset's custodian and a licence's walked room are never compared: hidden, and sent as expected.
  assert.deepEqual(startAuditCheckRecord({ ...expected, custodian: "E2" }, shared), { values: expected, fields: allMatch, departmentTouched: false, departmentFollowsCustodian: false })
  assert.deepEqual(startAuditCheckRecord({ ...expected, location: "L9" }, licence).values, expected)
  // "" is a real value (ไม่มี / ไม่ระบุ): a saved empty custodian opens as ไม่ตรง, chosen.
  assert.deepEqual(start({ ...expected, custodian: "" }).fields.custodian, CHOSEN)
})

test("editing a recorded result opens each field as it was saved: a saved difference is ไม่ตรง with that value chosen, the rest ตรง, and the walked room never applies (P3-R21)", () => {
  // The fields buildCheckDefaults reads in edit mode: the saved actual* values, the location falling back to the expected one.
  const saved = { expectedLocationId: "L1", actualLocationId: "L2", actualCustodianId: "E1", actualDepartmentId: "D1", actualConditionId: "C2" } as AuditScanItemRow
  const edit = startAuditCheckRecord(buildCheckDefaults({ mode: "edit", item: saved, room: { locationId: "L9", departmentId: "" } }), personal)
  assert.deepEqual(edit.values, { location: "L2", custodian: "E1", department: "D1", condition: "C2" })
  assert.deepEqual(edit.fields, { ...allMatch, location: CHOSEN, condition: CHOSEN })
  assert.equal(auditCheckFoundValue(edit, "location"), "L2", "the saved room is the chosen ที่พบ")
  assert.deepEqual(auditCheckMarkedFields(edit, "personal"), ["location", "condition"])
  assert.deepEqual(diffCheckValues(edit.values, expected, "personal"), ["location", "condition"], "saving unchanged sends the saved result again")
  // A result saved as matched opens all ตรง, whatever room the walk is in.
  const matched = { ...saved, actualLocationId: "L1", actualConditionId: "C1" } as AuditScanItemRow
  assert.deepEqual(startAuditCheckRecord(buildCheckDefaults({ mode: "edit", item: matched, room: { locationId: "L9", departmentId: "" } }), personal).fields, allMatch)
})

test("ไม่ตรง opens ที่พบ with nothing chosen; a choice makes the row differ; the expected value or ตรง turns it back (spec §12, P3-R8)", () => {
  const pressed = pressAuditCheckMismatch(start(), "condition")
  assert.deepEqual(pressed.fields, { ...allMatch, condition: UNCHOSEN })
  assert.deepEqual(pressed.values, expected, "the value waits for a choice")
  assert.equal(pressAuditCheckMismatch(pressed, "condition"), pressed, "pressed again: nothing changes")
  assert.deepEqual(auditCheckUnchosenFields(pressed, "personal"), ["condition"])
  assert.deepEqual(auditCheckMarkedFields(pressed, "personal"), ["condition"])
  assert.deepEqual(diffCheckValues(pressed.values, expected, "personal"), [], "the saved diff stays the chosen values")
  assert.equal(auditCheckFoundValue(pressed, "condition"), "", "the picker shows its placeholder")
  const chosen = chooseAuditCheckValue(pressed, "condition", "C2", personal)
  assert.deepEqual(chosen.fields, { ...allMatch, condition: CHOSEN })
  assert.equal(chosen.values.condition, "C2")
  assert.deepEqual(auditCheckUnchosenFields(chosen, "personal"), [])
  assert.deepEqual(diffCheckValues(chosen.values, expected, "personal"), ["condition"])
  assert.equal(auditCheckFoundValue(chosen, "condition"), "C2")
  assert.deepEqual(chooseAuditCheckValue(chosen, "condition", "C1", personal), start(), "choosing the expected value is ตรง")
  assert.deepEqual(pressAuditCheckMatch(chosen, "condition", personal), start(), "ตรง resets the value")
  assert.deepEqual(pressAuditCheckMatch(start({ ...expected, location: "L9" }), "location", personal), start(), "ตรง on a wrong room takes the expected room")
})

test("ไม่มี / ไม่ระบุ is a choosable option for every field but the location, the condition included, and stands for an empty value (P3-R9, P3-R20)", () => {
  const options = [{ id: "X1", label: "X1 - ตัวเลือก" }]
  assert.equal(AUDIT_CHECK_NONE_OPTION_ID, "__none__")
  assert.deepEqual(auditCheckFoundOptions("location", options, "ไม่มี / ไม่ระบุ"), options)
  for (const field of ["custodian", "department", "condition"] as const) {
    assert.deepEqual(auditCheckFoundOptions(field, options, "ไม่มี / ไม่ระบุ"), [{ id: "__none__", label: "ไม่มี / ไม่ระบุ" }, ...options], field)
  }
  assert.equal(auditCheckValueFromFound("__none__"), "")
  assert.equal(auditCheckValueFromFound("E2"), "E2")
  const none = chooseAuditCheckValue(pressAuditCheckMismatch(start(), "custodian"), "custodian", auditCheckValueFromFound("__none__"), personal)
  assert.equal(none.values.custodian, "")
  assert.deepEqual(none.fields.custodian, CHOSEN)
  assert.equal(auditCheckFoundValue(none, "custodian"), "__none__")
  assert.deepEqual(diffCheckValues(none.values, expected, "personal"), ["custodian"])
  // Nobody holds it: no department to follow, so the department stays as expected.
  assert.deepEqual(none.fields.department, MATCH)
  assert.equal(none.values.department, "D1")
})

test("a new custodian of a personal asset brings that person's department, visibly, unless the person set the department; ตรง takes it back (N-AU1, spec §12, P3-R11)", () => {
  const found = chooseAuditCheckValue(start(), "custodian", "E2", personal)
  assert.deepEqual(found, {
    values: { ...expected, custodian: "E2", department: "D2" },
    fields: { ...allMatch, custodian: CHOSEN, department: CHOSEN },
    departmentTouched: false,
    departmentFollowsCustodian: true,
  })
  const diff = diffCheckValues(found.values, expected, "personal")
  assert.deepEqual(diff, ["custodian", "department"])
  assert.equal(requiresCheckPhoto("scan", diff), true, "the department's photo rule stays visible")
  assert.equal(checkPhotoReasonKey("scan", diff), "photoRequiredPlacement")
  // ตรง on the custodian, or the expected custodian chosen again, takes the followed department back.
  assert.deepEqual(pressAuditCheckMatch(found, "custodian", personal), start())
  assert.deepEqual(chooseAuditCheckValue(found, "custodian", "E1", personal), start())
  // A custodian of the expected department: the department is ตรง again.
  assert.deepEqual(chooseAuditCheckValue(found, "custodian", "E4", personal), {
    values: { ...expected, custodian: "E4" },
    fields: { ...allMatch, custodian: CHOSEN },
    departmentTouched: false,
    departmentFollowsCustodian: false,
  })
  // A custodian with no department: nothing to follow, so the followed department goes back.
  assert.deepEqual(chooseAuditCheckValue(found, "custodian", "E3", personal), {
    values: { ...expected, custodian: "E3" },
    fields: { ...allMatch, custodian: CHOSEN },
    departmentTouched: false,
    departmentFollowsCustodian: false,
  })
  // The person's own department wins: chosen, pressed ไม่ตรง (still to choose), or pressed ตรง.
  const ownDepartment = chooseAuditCheckValue(chooseAuditCheckValue(start(), "department", "D3", personal), "custodian", "E2", personal)
  assert.deepEqual(ownDepartment.values, { ...expected, custodian: "E2", department: "D3" })
  assert.equal(ownDepartment.departmentFollowsCustodian, false)
  const waiting = chooseAuditCheckValue(pressAuditCheckMismatch(start(), "department"), "custodian", "E2", personal)
  assert.deepEqual(waiting.fields.department, UNCHOSEN)
  assert.equal(waiting.values.department, "D1")
  assert.deepEqual(auditCheckUnchosenFields(waiting, "personal"), ["department"])
  const keptDepartment = chooseAuditCheckValue(pressAuditCheckMatch(start(), "department", personal), "custodian", "E2", personal)
  assert.deepEqual(keptDepartment.fields.department, MATCH)
  assert.equal(keptDepartment.values.department, "D1")
  // A department saved earlier counts as set.
  assert.equal(chooseAuditCheckValue(start({ ...expected, department: "D3" }), "custodian", "E2", personal).values.department, "D3")
  // Only where the custodian is compared: a shared asset's custodian never moves its department (bug 22's knock-on).
  assert.equal(chooseAuditCheckValue(startAuditCheckRecord(expected, shared), "custodian", "E2", shared).values.department, "D1")
})

test("one rule: a shown field is ไม่ตรง with a value exactly when the server's diff names it, and a row still to choose keeps the expected value (P3-R8)", () => {
  const steps: Array<(record: AuditCheckRecord) => AuditCheckRecord> = [
    (record) => record,
    (record) => pressAuditCheckMismatch(record, "location"),
    (record) => chooseAuditCheckValue(record, "location", "L2", personal),
    (record) => chooseAuditCheckValue(record, "custodian", "E2", personal),
    (record) => pressAuditCheckMismatch(record, "condition"),
    (record) => chooseAuditCheckValue(record, "custodian", "", personal),
    (record) => chooseAuditCheckValue(record, "condition", "", personal),
    (record) => pressAuditCheckMatch(record, "location", personal),
    (record) => chooseAuditCheckValue(record, "department", "D1", personal),
    (record) => chooseAuditCheckValue(record, "custodian", "E2", personal),
  ]
  const order = (fields: readonly string[]) => [...fields].sort((a, b) => AUDIT_CHECK_FIELD_ORDER.indexOf(a as never) - AUDIT_CHECK_FIELD_ORDER.indexOf(b as never))
  let record = start({ ...expected, location: "L9" })
  steps.forEach((step, index) => {
    record = step(record)
    const diff = diffCheckValues(record.values, expected, "personal")
    for (const field of auditCheckShownFields("personal")) {
      const state = record.fields[field]
      assert.equal(state.mode === "mismatch" && state.chosen, diff.includes(field), `step ${index}: ${field}`)
      if (state.mode === "mismatch" && !state.chosen) assert.equal(record.values[field], expected[field], `step ${index}: ${field} waits`)
    }
    // The save label's fields: the diff plus the rows still to choose, in field order.
    assert.deepEqual(auditCheckMarkedFields(record, "personal"), order([...new Set([...diff, ...auditCheckUnchosenFields(record, "personal")])]), `step ${index}`)
  })
})

test("custodian options read code - name · department, so the department is searchable too (P3-R10)", () => {
  const departments = [{ id: "D1", label: "D01 - ฝ่ายบัญชี" }, { id: "D2", label: "D02 - ฝ่ายขาย" }]
  assert.deepEqual(auditCheckCustodianOptions([...employees, { id: "E5", label: "E005 - สมพร ย้ายแผนก", departmentId: "D9" }], departments), [
    { id: "E1", label: "E001 - สมชาย ใจดี · D01 - ฝ่ายบัญชี" },
    { id: "E2", label: "E002 - สมหญิง รักงาน · D02 - ฝ่ายขาย" },
    { id: "E3", label: "E003 - สมศักดิ์ มั่นคง" },
    { id: "E4", label: "E004 - สมใจ ตั้งใจ · D01 - ฝ่ายบัญชี" },
    { id: "E5", label: "E005 - สมพร ย้ายแผนก" },
  ])
})

test("the record rules are pure: node --test imports them", () => {
  const source = read("src/lib/audit-check-record-rules.ts")
  assert.doesNotMatch(source, /from "@\//)
  assert.doesNotMatch(source, /^import (?!type )[^\n]*from "@prisma\/client"/m)
  assert.doesNotMatch(source, /"use client"|\buse(?:State|Effect|Memo)\b/)
})
```

`tests/audit-scan-record-sheet-ui.test.ts` (new):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const A = "src/components/audit/"
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).auditScan

test("a record row: the field name, the expected value struck through on ไม่ตรง, the shared Segmented ตรง / ไม่ตรง and, under ไม่ตรง, the ที่พบ picker (group 2 spec §12, P3-R8)", () => {
  const field = read(`${A}audit-scan-check-field.tsx`)
  assert.match(field, /^import \{ Segmented \} from "@\/components\/ui\/segmented"$/m)
  assert.match(field, /data-audit-check-field=\{field\}\n\s+data-mismatch=\{mismatch \? "true" : undefined\}/)
  assert.match(field, /const mismatch = state\.mode === "mismatch"/)
  assert.match(field, /<p className=\{fieldLabelClasses\}>\{label\}<\/p>/)
  assert.match(field, /<p className=\{cn\("break-words text-sm", mismatch \? "text-muted-foreground line-through" : "text-foreground"\)\}>\{labelFor\(expectedValue\)\}<\/p>/)
  assert.match(field, /<Segmented\n\s+aria-label=\{label\}\n\s+value=\{state\.mode\}\n\s+options=\{\[\n\s+\{ value: "match", label: t\("fieldMatch"\) \},\n\s+\{ value: "mismatch", label: t\("fieldMismatch"\) \},\n\s+\]\}\n\s+onValueChange=\{onModeChange\}\n\s+size="md"\n\s+showCheck\n\s+disabled=\{disabled\}/)
  assert.match(field, /\{mismatch \? \(\n\s+<div className="mt-2">\n\s+<SearchableSelect\n\s+id=\{id\}\n\s+label=\{t\("foundValue"\)\}\n\s+value=\{value\}\n\s+options=\{options\}\n\s+required\n/)
  assert.match(field, /placeholder=\{t\("foundPlaceholder"\)\}/)
  assert.match(field, /\{followsCustodian \? <p className="mt-1 text-meta text-muted-foreground">\{t\("departmentFollowsCustodian"\)\}<\/p> : null\}/)
  // The pressed segment keeps Segmented's own selected look: no solid warning fill (DESIGN.md colour rule); no raw button.
  assert.doesNotMatch(field, /bg-warning(?!-)|text-warning|clearLabel|t\("inSystem"|<button\b/)
})

test("the form keeps one record of values and per-field state, starts it from the shared defaults and still saves the server's diff (P3-R8)", () => {
  const form = read(`${A}audit-scan-check-form.tsx`)
  assert.match(form, /const \[record, setRecord\] = useState<AuditCheckRecord>\(\(\) =>\n\s+startAuditCheckRecord\(/)
  assert.match(form, /const values = record\.values/)
  assert.match(form, /const shown = auditCheckShownFields\(ownershipType\)/)
  assert.match(form, /const diff = diffCheckValues\(values, expected, ownershipType\)/)
  assert.match(form, /const marked = auditCheckMarkedFields\(record, ownershipType\)/)
  assert.match(form, /\{shown\.map\(\(field\) => \(\n\s+<AuditScanCheckField\n\s+key=\{field\}\n\s+id=\{FIELD_IDS\[FIELD_KEY\[field\]\]\}\n\s+field=\{field\}/)
  assert.match(form, /mode === "match" \? pressAuditCheckMatch\(current, field, recordContext\) : pressAuditCheckMismatch\(current, field\)/)
  assert.match(form, /chooseAuditCheckValue\(current, field, auditCheckValueFromFound\(id\), recordContext\)/)
  assert.match(form, /followsCustodian=\{field === "department" && record\.departmentFollowsCustodian\}/)
  assert.match(form, /custodian: auditCheckFoundOptions\("custodian", auditCheckCustodianOptions\(options\.employees, options\.departments\), t\("none"\)\)/)
  assert.match(form, /return \(id: string\) => \(id \? labels\[field\]\.get\(id\) \?\? t\("valueNotInList"\) : t\("none"\)\)/)
  assert.doesNotMatch(form, /suggestDepartmentForCustodian|setDepartmentTouched|fieldConfig|setValues/)
  assert.match(form, /onSubmit\(\{ values, remark, photos, applyCorrections, diff, mode \}\)/)
})

test("ไม่ตรง with nothing chosen: save shows เลือกค่าที่พบ under that row and moves focus to its ที่พบ picker (spec §12)", () => {
  const form = read(`${A}audit-scan-check-form.tsx`)
  assert.match(form, /const FIELD_IDS = \{\n  actualLocationId: "audit-check-location",\n  actualCustodianId: "audit-check-custodian",\n  actualDepartmentId: "audit-check-department",\n  actualConditionId: "audit-check-condition",\n\} as const/)
  const start = form.indexOf("function validate(")
  const validate = form.slice(start, form.indexOf("\n}\n", start))
  for (const line of [
    'check("actualLocationId", required(values.location) ?? chosen("location"))',
    'check("actualCustodianId", chosen("custodian"))',
    'check("actualDepartmentId", chosen("department"))',
    'check("actualConditionId", chosen("condition"))',
  ]) assert.ok(validate.includes(line), line)
  assert.match(form, /fieldErrors\.setErrors\(validate\(values, auditCheckUnchosenFields\(record, ownershipType\)\)\)\n\s+if \(focusFirstError\(\)\) return/)
  assert.match(form, /const fieldError = \(key: CheckField\) => \(fieldErrors\.errors\[key\] === CHOOSE_FOUND \? t\("chooseFoundValue"\) : fieldErrors\.message\(key\)\)/)
  assert.match(form, /error=\{fieldError\(FIELD_KEY\[field\]\)\}/)
})

test("the first scan's hint, the save label from the rows marked ไม่ตรง, and ถ่ายรูป / เพิ่มหมายเหตุ with a camera (spec §12)", () => {
  const form = read(`${A}audit-scan-check-form.tsx`)
  assert.match(form, /target\.item\.auditResult === "not_found" \? t\("sheetStatusNotFound"\) : t\("sheetHintFirstScan"\)/)
  assert.doesNotMatch(form, /sheetStatusPending/)
  assert.match(form, /const fields = marked\.map\(\(field\) => t\(fieldLabelKey\[field\]\)\)\.join\(", "\)/)
  assert.match(form, /marked\.length === 0 \? t\("saveAllMatch"\) : t\("saveMismatch", \{ count: marked\.length, fields \}\)/)
  assert.match(form, /variant=\{marked\.length === 0 \? "default" : "warning"\}/)
  assert.match(form, /<span className="inline-flex items-center gap-1\.5">\n\s+<Camera aria-hidden="true" \/>\n\s+\{t\("addNotePhoto"\)\}\n\s+<\/span>\n\s+<ChevronDown aria-hidden="true" \/>/)
})

test("the title is the asset's name; line 2 is its code and serial as tags that wrap, the out-of-scope sheet's too (bug 23, P3-R12)", () => {
  const workspace = read(`${A}audit-scan-workspace.tsx`)
  assert.match(workspace, /const targetTitle = target\?\.kind === "item" \? target\.item\.name : target\?\.asset\.subtitle \?\? ""/)
  assert.match(workspace, /const targetCode = target\?\.kind === "item" \? target\.item\.assetTag : target\?\.asset\.assetTag \?\? ""/)
  assert.match(workspace, /const targetSerial = target\?\.kind === "item" \? target\.item\.serialNumber : target\?\.asset\.serialNumber \?\? null/)
  assert.match(workspace, /<span className="tag whitespace-normal break-all">\{targetCode\}<\/span>/)
  assert.match(workspace, /\{targetSerial \? <> · Serial <span className="tag whitespace-normal break-all">\{targetSerial\}<\/span><\/> : null\}/)
  assert.match(read(`${A}audit-scan-types.ts`), /export type AuditLookupAsset = \{[\s\S]*?\n  subtitle: string\n  serialNumber: string \| null\n/)
  const panel = read(`${A}audit-scan-check-panel.tsx`)
  assert.match(panel, /<SheetHeader>\n\s+<SheetTitle>\{title\}<\/SheetTitle>\n\s+<SheetDescription>\{description\}<\/SheetDescription>\n\s+<\/SheetHeader>/)
  assert.match(panel, /<p className="text-sm text-muted-foreground">\{description\}<\/p>/)
  assert.doesNotMatch(panel, /truncate/)
})

test("a component row: พบ and ไม่พบ side by side, ไม่พบ opens the missing dialog, ⋯ keeps only the QR scan (spec §12)", () => {
  const panels = read(`${A}audit-scan-panels.tsx`)
  const panel = panels.slice(panels.indexOf("export function AuditComponentPanel"), panels.indexOf("export function AuditQrScannerOverlay"))
  assert.match(panel, /<Button variant="outline" size="sm" className="min-w-16" disabled=\{rowDisabled\} onClick=\{\(\) => onMarkMissing\(component\)\}>\n\s+\{t\("componentMarkMissing"\)\}\n\s+<span className="sr-only"> \{component\.assetTag\}<\/span>/)
  assert.ok(panel.indexOf('t("componentFound")') < panel.indexOf('t("componentMarkMissing")'), "พบ comes first")
  assert.ok(panel.indexOf('t("componentMarkMissing")') < panel.indexOf("<DropdownMenu>"), "ไม่พบ sits before ⋯, outside it")
  assert.equal(panel.match(/<DropdownMenuItem\b/g)?.length, 1, "⋯ holds the QR scan only")
  assert.doesNotMatch(panel, /openingDialogRef|onCloseAutoFocus|openMissing|AlertTriangle/)
})

test("Segmented turns every option off on disabled, in the shared disabled look (never opacity)", () => {
  const source = read("src/components/ui/segmented.tsx")
  assert.match(source, /\n  disabled\?: boolean\n/)
  assert.match(source, /const segmentedDisabledClasses = "disabled:cursor-not-allowed disabled:bg-background disabled:text-faint-foreground"/)
  assert.match(source, /aria-pressed=\{pressed\}\n\s+disabled=\{disabled\}\n/)
  assert.match(source, /pressed \? segmentedPressedClasses : segmentedIdleClasses,\n\s+segmentedDisabledClasses,/)
  assert.doesNotMatch(source, /opacity-/)
})

test("record sheet words in Thai and English, with the glossary's ไม่ตรง (spec §5, §12)", () => {
  const th = messages("th")
  const en = messages("en")
  assert.equal(th.fieldMatch, "ตรง")
  assert.equal(th.fieldMismatch, "ไม่ตรง")
  assert.equal(th.foundValue, "ที่พบ")
  assert.equal(th.foundPlaceholder, "เลือกจากรายการ")
  assert.equal(th.chooseFoundValue, "เลือกค่าที่พบ")
  assert.equal(th.departmentFollowsCustodian, "ตามแผนกของผู้ถือครองที่พบ")
  assert.equal(th.sheetHintFirstScan, "ตรงกับของจริงไหม แตะ ไม่ตรง เฉพาะเรื่องที่ต่าง")
  assert.equal(th.valueNotInList, "ไม่อยู่ในรายการ")
  assert.equal(th.addNotePhoto, "ถ่ายรูป / เพิ่มหมายเหตุ")
  assert.equal(th.componentMarkMissing, "ไม่พบ")
  assert.equal(en.fieldMatch, "Match")
  assert.equal(en.fieldMismatch, "Mismatch")
  assert.equal(en.chooseFoundValue, "Choose what you found")
  for (const gone of ["inSystem", "clearValue", "sheetStatusPending"]) {
    assert.equal(th[gone], undefined, gone)
    assert.equal(en[gone], undefined, gone)
  }
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/audit-check-record-rules.test.ts tests/audit-scan-record-sheet-ui.test.ts`
Expected: FAIL.
- `audit-check-record-rules.test.ts`: `src/lib/audit-check-record-rules.ts` does not exist (import error).
- `audit-scan-record-sheet-ui.test.ts`:
  - the field has no `Segmented` and no `data-audit-check-field={field}`;
  - the form has no `record`;
  - `FIELD_IDS` holds only the location;
  - the title is `assetTag`;
  - `SheetDescription` is `truncate`;
  - ⋯ holds two items;
  - Segmented has no `disabled`;
  - `auditScan.fieldMatch` is undefined.

- [ ] **Step 3: Implement**

Line numbers are master `0a7bb9ee`. Tasks 1-4 edit `audit-scan-types.ts` (the lookup response type, under `AuditLookupAsset`), `audit-scan-workspace.tsx` (Task 3 throughout, Task 4 the lookup and the out-of-scope opening) and the form's status block (Task 4). Each block those tasks touch is named here by its content. `audit-scan-check-field.tsx`, `audit-scan-check-panel.tsx`, `audit-scan-panels.tsx` and `segmented.tsx` are untouched before this task.

- **`src/lib/audit-check-record-rules.ts`** (new), with the header comment "The record sheet's per-field state (group 2 spec §12, plan 3 P3-R8 to P3-R11). ตรง / ไม่ตรง is UI state beside the values; what a save means stays the chosen value, which diffCheckValues compares as the scan route does. Pure: relative `.ts` imports only, so node --test imports it.":

  ```ts
  import { normalizeAssetOwnershipType, requiresCustodian } from "./asset-ownership.ts"
  import {
    suggestDepartmentForCustodian,
    type AuditCheckField,
    type AuditCheckValues,
    type AuditScanEmployeeOption,
    type AuditScanOption,
  } from "./audit-scan-session.ts"

  export const AUDIT_CHECK_FIELD_ORDER: readonly AuditCheckField[] = ["location", "custodian", "department", "condition"]
  // "ไม่มี / ไม่ระบุ" as a choosable option (P3-R9). It stands for "" (no value), which the picker shows as its placeholder.
  export const AUDIT_CHECK_NONE_OPTION_ID = "__none__"

  export type AuditCheckFieldMode = "match" | "mismatch"
  export type AuditCheckFieldState = { mode: AuditCheckFieldMode; chosen: boolean }
  export type AuditCheckRecord = {
    values: AuditCheckValues
    fields: Record<AuditCheckField, AuditCheckFieldState>
    // The person set the department (ตรง, ไม่ตรง or a choice), or it already differed when the sheet opened.
    departmentTouched: boolean
    // The department came from the found custodian and differs from the expected one ("ตามแผนกของผู้ถือครองที่พบ").
    departmentFollowsCustodian: boolean
  }
  export type AuditCheckRecordContext = {
    expected: AuditCheckValues
    ownershipType: string | null
    employees: readonly AuditScanEmployeeOption[]
  }

  const MATCH: AuditCheckFieldState = { mode: "match", chosen: false }
  const CHOSEN: AuditCheckFieldState = { mode: "mismatch", chosen: true }
  const UNCHOSEN: AuditCheckFieldState = { mode: "mismatch", chosen: false }

  /** The fields the scan route compares for this asset (bug 22, P3-R11): no location for a licence, the custodian only for a personal asset. */
  export function auditCheckShownFields(ownershipType: string | null): AuditCheckField[] {
    const type = normalizeAssetOwnershipType(ownershipType)
    return AUDIT_CHECK_FIELD_ORDER.filter((field) => {
      if (field === "location") return type !== "software_license"
      if (field === "custodian") return requiresCustodian(type)
      return true
    })
  }

  /** The sheet as it opens: a hidden field takes the expected value; a shown field that differs (the walked room, a saved result) opens ไม่ตรง and chosen. */
  export function startAuditCheckRecord(values: AuditCheckValues, context: Pick<AuditCheckRecordContext, "expected" | "ownershipType">): AuditCheckRecord {
    const shown = auditCheckShownFields(context.ownershipType)
    const next = { ...values }
    for (const field of AUDIT_CHECK_FIELD_ORDER) if (!shown.includes(field)) next[field] = context.expected[field]
    const state = (field: AuditCheckField) => (next[field] === context.expected[field] ? MATCH : CHOSEN)
    const fields = { location: state("location"), custodian: state("custodian"), department: state("department"), condition: state("condition") }
    return { values: next, fields, departmentTouched: fields.department.mode === "mismatch", departmentFollowsCustodian: false }
  }

  /** ตรง: the expected value again; on the custodian it also takes back a department that followed the found custodian. */
  export function pressAuditCheckMatch(record: AuditCheckRecord, field: AuditCheckField, context: AuditCheckRecordContext): AuditCheckRecord {
    const values = { ...record.values, [field]: context.expected[field] }
    const fields = { ...record.fields, [field]: MATCH }
    if (field === "department") return { values, fields, departmentTouched: true, departmentFollowsCustodian: false }
    if (field === "custodian" && record.departmentFollowsCustodian) {
      return {
        values: { ...values, department: context.expected.department },
        fields: { ...fields, department: MATCH },
        departmentTouched: record.departmentTouched,
        departmentFollowsCustodian: false,
      }
    }
    return { ...record, values, fields }
  }

  /** ไม่ตรง: "ที่พบ" opens with nothing chosen, and the value stays the expected one until a choice (P3-R8). */
  export function pressAuditCheckMismatch(record: AuditCheckRecord, field: AuditCheckField): AuditCheckRecord {
    if (record.fields[field].mode === "mismatch") return record
    const fields = { ...record.fields, [field]: UNCHOSEN }
    if (field === "department") return { ...record, fields, departmentTouched: true, departmentFollowsCustodian: false }
    return { ...record, fields }
  }

  /**
   * A choice in "ที่พบ" ("" is ไม่มี / ไม่ระบุ). The expected value turns the row back to ตรง. A new custodian of a personal
   * asset brings that person's department (N-AU1) unless the person set the department; a custodian with none takes back
   * a department that followed the last one (P3-R11).
   */
  export function chooseAuditCheckValue(record: AuditCheckRecord, field: AuditCheckField, value: string, context: AuditCheckRecordContext): AuditCheckRecord {
    if (value === context.expected[field]) return pressAuditCheckMatch(record, field, context)
    const next: AuditCheckRecord = { ...record, values: { ...record.values, [field]: value }, fields: { ...record.fields, [field]: CHOSEN } }
    if (field === "department") return { ...next, departmentTouched: true, departmentFollowsCustodian: false }
    if (field !== "custodian" || !requiresCustodian(context.ownershipType) || record.departmentTouched) return next
    const suggested = suggestDepartmentForCustodian(context.employees, value)
    if (suggested === null) {
      return record.departmentFollowsCustodian
        ? { ...next, values: { ...next.values, department: context.expected.department }, fields: { ...next.fields, department: MATCH }, departmentFollowsCustodian: false }
        : next
    }
    const follows = suggested !== context.expected.department
    return { ...next, values: { ...next.values, department: suggested }, fields: { ...next.fields, department: follows ? CHOSEN : MATCH }, departmentFollowsCustodian: follows }
  }

  /** Rows marked ไม่ตรง with nothing chosen yet: save asks for each ("เลือกค่าที่พบ"). */
  export function auditCheckUnchosenFields(record: AuditCheckRecord, ownershipType: string | null): AuditCheckField[] {
    return auditCheckShownFields(ownershipType).filter((field) => record.fields[field].mode === "mismatch" && !record.fields[field].chosen)
  }

  /** Rows marked ไม่ตรง, chosen or not, in field order: the save label names them. */
  export function auditCheckMarkedFields(record: AuditCheckRecord, ownershipType: string | null): AuditCheckField[] {
    return auditCheckShownFields(ownershipType).filter((field) => record.fields[field].mode === "mismatch")
  }

  /** The "ที่พบ" picker's value: "" while nothing is chosen (its placeholder), the none option for "". */
  export function auditCheckFoundValue(record: AuditCheckRecord, field: AuditCheckField): string {
    if (!record.fields[field].chosen) return ""
    return record.values[field] === "" ? AUDIT_CHECK_NONE_OPTION_ID : record.values[field]
  }

  export function auditCheckValueFromFound(id: string): string {
    return id === AUDIT_CHECK_NONE_OPTION_ID ? "" : id
  }

  /** "ที่พบ" lists: ไม่มี / ไม่ระบุ first (custodian, department and condition), except for the location, which the server requires (P3-R9, P3-R20). */
  export function auditCheckFoundOptions(field: AuditCheckField, options: readonly AuditScanOption[], noneLabel: string): AuditScanOption[] {
    return field === "location" ? [...options] : [{ id: AUDIT_CHECK_NONE_OPTION_ID, label: noneLabel }, ...options]
  }

  /** A custodian reads "code - name · department" (P3-R10); one with no known department keeps its own label. */
  export function auditCheckCustodianOptions(employees: readonly AuditScanEmployeeOption[], departments: readonly AuditScanOption[]): AuditScanOption[] {
    const departmentLabels = new Map(departments.map((department) => [department.id, department.label]))
    return employees.map((employee) => {
      const department = employee.departmentId ? departmentLabels.get(employee.departmentId) : undefined
      return { id: employee.id, label: department ? `${employee.label} · ${department}` : employee.label }
    })
  }
  ```

- **`src/components/ui/segmented.tsx`:**
  - In `SegmentedProps` after `showCheck?: boolean` (`:18`), add:

    ```ts
      // Every option off (while a record saves, or on a closed round), in the Buttons disabled look: never opacity.
      disabled?: boolean
    ```
  - After `segmentedIdleClasses` (`:30`), add `const segmentedDisabledClasses = "disabled:cursor-not-allowed disabled:bg-background disabled:text-faint-foreground"`.
  - Destructure `disabled` in the function.
  - In the option `button` (`:50-54`, one attribute per line), add the line `disabled={disabled}` straight after the line `aria-pressed={pressed}` and before `onClick={() => onValueChange(option.value)}`, at the same indent. Its `cn(...)` gains the line `segmentedDisabledClasses,` as its last argument (trailing comma, as the list is written), after `pressed ? segmentedPressedClasses : segmentedIdleClasses,`.
  - Tailwind writes `disabled:` after `hover:`, so the disabled look wins over the idle hover. The pinned constants (`tests/visual-foundation-guards.test.ts:280-284`, `tests/field-primitives.test.ts:139-149`) are untouched.
  - `DESIGN.md:414`: after "Values are strings, and every option is its own Tab stop.", add "`disabled` turns every option off in the Buttons disabled look (`background` fill, faint text, not-allowed cursor, never opacity); the audit record sheet passes it while it saves or when the round is closed."
  - `DESIGN.md:655` (the field-work **Check sheet** bullet): replace "Each field shows the value that will be saved; a mismatch gets the warning tone (`bg-warning-soft`, `border-warning-border`) with an "ในระบบ: …" line; a field that matches has no box." with "The title is the asset's name, wrapping; line 2 is its code and serial as tags. Each compared field is one row: its name, the expected value and a `Segmented` ตรง / ไม่ตรง (`showCheck`, `size="md"`). ไม่ตรง strikes the expected value, gets the warning tone (`bg-warning-soft`, `border-warning-border`) and opens "ที่พบ" (a required `SearchableSelect`); a new custodian of a personal asset moves แผนก to ไม่ตรง ("ตามแผนกของผู้ถือครองที่พบ") unless the person set it. A field the server does not compare is not shown (group 2 plan 3)." In the same bullet, replace "(tag, `StatusBadge`, "พบ", ⋯)" with "(tag, `StatusBadge`, "พบ", an outline "ไม่พบ", ⋯ with only the QR scan)". Task 5's `git add` already stages `DESIGN.md`.
- **`src/components/audit/audit-scan-check-field.tsx`** (rewritten):

  ```tsx
  "use client"

  import { useTranslations } from "next-intl"
  import { fieldLabelClasses } from "@/components/ui/field-variants"
  import { Segmented } from "@/components/ui/segmented"
  import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select"
  import type { AuditCheckFieldMode, AuditCheckFieldState } from "@/lib/audit-check-record-rules"
  import type { AuditCheckField } from "@/lib/audit-scan-session"
  import { cn } from "@/lib/utils"

  // One row of the record sheet (group 2 spec §12): the field's name and the value the system expects, ตรง / ไม่ตรง, and
  // under ไม่ตรง the "ที่พบ" picker. The state is the form's (P3-R8); what a save means stays the chosen value.
  export function AuditScanCheckField({
    id,
    field,
    label,
    state,
    value,
    options,
    expectedValue,
    latestValue,
    followsCustodian,
    disabled,
    labelFor,
    error,
    onModeChange,
    onChange,
  }: {
    // The "ที่พบ" picker's trigger id, so the check form's focusFirst can reach it; the error shows under the picker.
    id?: string
    field: AuditCheckField
    label: string
    state: AuditCheckFieldState
    // The picker's value: "" while nothing is chosen, the none option's id for "ไม่มี / ไม่ระบุ".
    value: string
    options: SearchableSelectOption[]
    expectedValue: string
    latestValue?: string
    followsCustodian?: boolean
    disabled?: boolean
    labelFor: (id: string) => string
    error?: React.ReactNode
    onModeChange: (mode: AuditCheckFieldMode) => void
    onChange: (value: string) => void
  }) {
    const t = useTranslations("auditScan")
    const tCommon = useTranslations("common")
    const mismatch = state.mode === "mismatch"

    return (
      <div
        data-audit-check-field={field}
        data-mismatch={mismatch ? "true" : undefined}
        // A matching field is a plain row, so four of them fit a phone sheet; only a mismatch gets the soft warning box.
        className={mismatch ? "rounded-md border border-warning-border bg-warning-soft p-2.5" : undefined}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className={fieldLabelClasses}>{label}</p>
            {/* The value the system expects, struck through once the person says it differs. */}
            <p className={cn("break-words text-sm", mismatch ? "text-muted-foreground line-through" : "text-foreground")}>{labelFor(expectedValue)}</p>
          </div>
          <Segmented
            aria-label={label}
            value={state.mode}
            options={[
              { value: "match", label: t("fieldMatch") },
              { value: "mismatch", label: t("fieldMismatch") },
            ]}
            onValueChange={onModeChange}
            size="md"
            showCheck
            disabled={disabled}
            className="shrink-0"
          />
        </div>
        {mismatch ? (
          <div className="mt-2">
            <SearchableSelect
              id={id}
              label={t("foundValue")}
              value={value}
              options={options}
              required
              disabled={disabled}
              placeholder={t("foundPlaceholder")}
              searchPlaceholder={tCommon("search")}
              emptyLabel={t("noOptionMatch")}
              error={error}
              onChange={onChange}
            />
          </div>
        ) : null}
        {followsCustodian ? <p className="mt-1 text-meta text-muted-foreground">{t("departmentFollowsCustodian")}</p> : null}
        {latestValue !== undefined ? (
          <p className="mt-0.5 text-meta text-muted-foreground">{t("latestValue", { value: labelFor(latestValue) })}</p>
        ) : null}
      </div>
    )
  }
  ```
  `required` hides the picker's clear button: "ไม่มี / ไม่ระบุ" is an option now, so clearing would mean nothing. The star is aria-hidden and has its rule ("เลือกค่าที่พบ"); `tests/validation-guards.test.ts`' star-only check is met because the picker has `error=`.
- **`src/components/audit/audit-scan-check-form.tsx`:**
  - `:4` → `import { Camera, ChevronDown, ImagePlus, Loader2, X } from "lucide-react"`.
  - `:19-36`: drop `suggestDepartmentForCustodian` from the session import, and add:

    ```ts
    import {
      auditCheckCustodianOptions,
      auditCheckFoundOptions,
      auditCheckFoundValue,
      auditCheckMarkedFields,
      auditCheckShownFields,
      auditCheckUnchosenFields,
      auditCheckValueFromFound,
      chooseAuditCheckValue,
      pressAuditCheckMatch,
      pressAuditCheckMismatch,
      startAuditCheckRecord,
      type AuditCheckFieldMode,
      type AuditCheckRecord,
      type AuditCheckRecordContext,
    } from "@/lib/audit-check-record-rules"
    ```
  - `:65-82` become:

    ```ts
    // The fields in visual order, keyed like the scan body's actual… ids, with the id of each row's "ที่พบ" picker, where
    // focus moves (v-track M-R1). The location keeps its rule; any row marked ไม่ตรง must name what was found (spec §12).
    const FIELD_IDS = {
      actualLocationId: "audit-check-location",
      actualCustodianId: "audit-check-custodian",
      actualDepartmentId: "audit-check-department",
      actualConditionId: "audit-check-condition",
    } as const
    type CheckField = keyof typeof FIELD_IDS
    const FIELD_ORDER = Object.keys(FIELD_IDS) as CheckField[]
    const FIELD_KEY: Record<AuditCheckField, CheckField> = {
      location: "actualLocationId",
      custodian: "actualCustodianId",
      department: "actualDepartmentId",
      condition: "actualConditionId",
    }
    // The code validate() gives a ไม่ตรง row with nothing chosen; the form shows auditScan.chooseFoundValue for it.
    const CHOOSE_FOUND = "chooseFoundValue"

    // The check is not a form element (it is a panel of rows, photos and component actions), so nothing checks it but this:
    // the location keeps its rule (v-track M-R2, U-R11), and a row marked ไม่ตรง needs its "ที่พบ" (spec §12).
    function validate(values: AuditCheckValues, unchosen: readonly AuditCheckField[]): Partial<Record<CheckField, string>> {
      const errors: Partial<Record<CheckField, string>> = {}
      const check = (key: CheckField, code: string | null) => {
        if (code) errors[key] = code
      }
      const chosen = (field: AuditCheckField) => (unchosen.includes(field) ? CHOOSE_FOUND : null)
      check("actualLocationId", required(values.location) ?? chosen("location"))
      check("actualCustodianId", chosen("custodian"))
      check("actualDepartmentId", chosen("department"))
      check("actualConditionId", chosen("condition"))
      return errors
    }
    ```
  - `:129-136`: `expected` and `ownershipType` stay. The `values` state and `departmentTouched` become:

    ```ts
      const recordContext: AuditCheckRecordContext = { expected, ownershipType, employees: options.employees }
      // One record: the values the save sends, and beside them each row's ตรง / ไม่ตรง and whether "ที่พบ" is chosen (P3-R8).
      // An edit, or a recorded out-of-scope find, starts from the saved result: a saved difference opens ไม่ตรง with
      // that value chosen, the rest ตรง (P3-R21).
      const [record, setRecord] = useState<AuditCheckRecord>(() =>
        startAuditCheckRecord(
          target.kind === "item"
            ? buildCheckDefaults({ mode: target.openedMode, item: target.item, room })
            : target.recorded
              ? buildCheckDefaults({ mode: "edit", item: target.recorded, room })
              : buildCheckDefaults({ mode: "out_of_scope", master: lookupMasterValues(target.asset), room }),
          recordContext,
        ),
      )
      const values = record.values
    ```
    The three-way expression is Task 4's, unchanged (its pin `tests/audit-scan-recorded-find.test.ts` reads the `: target.recorded` lines); only the `startAuditCheckRecord(…)` wrapper is new.
  - After `focusFirstError` (`:150-154`), the diff line and the new reads:

    ```ts
      // "เลือกค่าที่พบ" is the record sheet's own sentence (auditScan), not a common.validation code.
      const fieldError = (key: CheckField) => (fieldErrors.errors[key] === CHOOSE_FOUND ? t("chooseFoundValue") : fieldErrors.message(key))
      const shown = auditCheckShownFields(ownershipType)
      const diff = diffCheckValues(values, expected, ownershipType)
      // Task 4's recordedValues, photoDiff and photoRequired lines (P3-R18) stay here, unchanged.
      const marked = auditCheckMarkedFields(record, ownershipType)
    ```
    Task 4's `recordedValues`, `photoDiff` and `photoRequired` lines stay right after the `diff` line (P3-R18; `tests/audit-scan-recorded-find.test.ts` pins them as three consecutive lines). `missingPhoto`, `notes` and the component counts stay as they are.
  - `:197-199` `labelFor` → `return (id: string) => (id ? labels[field].get(id) ?? t("valueNotInList") : t("none"))`. An expected id the options do not hold reads "ไม่อยู่ในรายการ" and an inactive master's id never reaches the screen (spec §5, P3-R22); the options load active rows only (`src/lib/audit-options.ts:16-45`).
  - After `labelFor`, add:

    ```ts
      // "ที่พบ" lists: ไม่มี / ไม่ระบุ first except for the location (P3-R9, P3-R20); a custodian reads "code - name · department" (P3-R10).
      const foundOptions = useMemo(() => ({
        location: auditCheckFoundOptions("location", options.locations, t("none")),
        custodian: auditCheckFoundOptions("custodian", auditCheckCustodianOptions(options.employees, options.departments), t("none")),
        department: auditCheckFoundOptions("department", options.departments, t("none")),
        condition: auditCheckFoundOptions("condition", options.conditions, t("none")),
      }), [options, t])
    ```
  - `changeCustodian` and `changeDepartment` (`:201-211`) become:

    ```ts
      // ตรง resets the value (and a department that followed a found custodian); ไม่ตรง opens "ที่พบ" with nothing chosen.
      function changeMode(field: AuditCheckField, mode: AuditCheckFieldMode) {
        setRecord((current) => (mode === "match" ? pressAuditCheckMatch(current, field, recordContext) : pressAuditCheckMismatch(current, field)))
        fieldErrors.clear(FIELD_KEY[field])
      }

      // Choosing the expected value turns the row back to ตรง; a new custodian brings that person's department (N-AU1)
      // unless the person set the department (spec §12, P3-R11).
      function chooseFound(field: AuditCheckField, id: string) {
        setRecord((current) => chooseAuditCheckValue(current, field, auditCheckValueFromFound(id), recordContext))
        fieldErrors.clear(FIELD_KEY[field])
      }
    ```
  - `save()` (`:260`): `fieldErrors.setErrors(validate(values))` → `fieldErrors.setErrors(validate(values, auditCheckUnchosenFields(record, ownershipType)))`. The photo gate still returns first (U-R11). The `focusFirstError()` line, the components confirm and `onSubmit({ values, remark, photos, applyCorrections, diff, mode })` stay.
  - The status block (master `:278-280`, the `if (target.openedMode === "scan") {` branch): `: t("sheetStatusPending")` → `: t("sheetHintFirstScan")`. Every other branch stays, Task 4's first branch included.
  - `:287-292` become:

    ```ts
      // The rows marked ไม่ตรง, in field order: the diff, plus a row still waiting for its "ที่พบ" (P3-R8).
      const fields = marked.map((field) => t(fieldLabelKey[field])).join(", ")
      const saveLabel = mode === "out_of_scope"
        ? t("saveOutOfScope")
        : mode === "edit"
          ? marked.length === 0 ? t("saveEditAllMatch") : t("saveEditMismatch", { count: marked.length, fields })
          : marked.length === 0 ? t("saveAllMatch") : t("saveMismatch", { count: marked.length, fields })
    ```
    `fieldConfig` (`:294-308`) goes.
  - `:316-334` (the rows) become:

    ```tsx
            {/* Only the fields the server compares for this asset (bug 22, P3-R11); a hidden one sends the expected value. */}
            <div className="space-y-3">
              {shown.map((field) => (
                <AuditScanCheckField
                  key={field}
                  id={FIELD_IDS[FIELD_KEY[field]]}
                  field={field}
                  label={t(fieldLabelKey[field])}
                  state={record.fields[field]}
                  value={auditCheckFoundValue(record, field)}
                  options={foundOptions[field]}
                  expectedValue={expected[field]}
                  latestValue={field === "condition" ? undefined : notes[field]}
                  followsCustodian={field === "department" && record.departmentFollowsCustodian}
                  disabled={saving || disabled}
                  labelFor={labelFor(field)}
                  error={fieldError(FIELD_KEY[field])}
                  onModeChange={(next) => changeMode(field, next)}
                  onChange={(id) => chooseFound(field, id)}
                />
              ))}
            </div>
    ```
  - `:374-375` (the toggle's children) become:

    ```tsx
                <span className="inline-flex items-center gap-1.5">
                  <Camera aria-hidden="true" />
                  {t("addNotePhoto")}
                </span>
                <ChevronDown aria-hidden="true" />
    ```
    The `<Button variant="outline" aria-expanded=… className="w-full justify-between">` line stays (`tests/audit-scan-sweep-ui.test.ts:50`).
  - `:456` → `variant={marked.length === 0 ? "default" : "warning"}`. The approver's tick (`:470`) keeps `diff`.
- **`src/components/audit/audit-scan-check-panel.tsx`:**
  - `:23` → `/** The asset's code and serial, each a tag (group 2 spec §12). */`.
  - `:46` → `<p className="text-sm text-muted-foreground">{description}</p>`.
  - `:73` → `<SheetDescription>{description}</SheetDescription>`.
  - The title already wraps (no `truncate` on `SheetTitle` or the `h2`), and its pinned classes stay (`tests/visual-foundation-guards.test.ts:33`).
  - Props: after `title: string`, add `/** Changes each time an item opens (the workspace's targetKey), so the wide panel's heading takes focus even when two assets share a name. */ focusKey: number`; destructure `focusKey` after `title`. `:37` → `}, [isWide, open, focusKey])`. The title is now the asset's name, which repeats across assets, so it can no longer key the focus effect.
- **`src/components/audit/audit-scan-workspace.tsx`:**
  - In `<AuditScanCheckPanel` (master `:773-776`), after `title={targetTitle}`, add `focusKey={targetKey}`.
  - The block that begins `const targetTitle = target?.kind === "item" ? target.item.assetTag` (master `:675-679`) becomes:

  ```tsx
    // The sheet's title is the asset's name, wrapping (bug 23); line 2 its code and serial, each a tag that may wrap inside
    // the line (group 2 spec §12, P3-R12). An out-of-scope find's name is the lookup's subtitle.
    const targetTitle = target?.kind === "item" ? target.item.name : target?.asset.subtitle ?? ""
    const targetCode = target?.kind === "item" ? target.item.assetTag : target?.asset.assetTag ?? ""
    const targetSerial = target?.kind === "item" ? target.item.serialNumber : target?.asset.serialNumber ?? null
    const targetDescription: ReactNode = target ? (
      <>
        <span className="tag whitespace-normal break-all">{targetCode}</span>
        {targetSerial ? <> · Serial <span className="tag whitespace-normal break-all">{targetSerial}</span></> : null}
      </>
    ) : ""
  ```
- **`src/components/audit/audit-scan-types.ts`:** in `AuditLookupAsset`, after `subtitle: string`, add `serialNumber: string | null`. The lookup returns it (`scan-lookup/route.ts:195`).
- **`src/components/audit/audit-scan-panels.tsx`:**
  - `:3` → `import { useId } from "react"`; `:4` drops `AlertTriangle`.
  - The comment `:17-19` ends "…on the right "พบ" (a check mark once it is confirmed with the parent), "ไม่พบ" (the missing dialog) and ⋯ with the QR scan (group 2 spec §12)."
  - `openingDialogRef` and `openMissing` (`:43`, `:49-52`) go.
  - After the `isConfirmedWithParent` block (`:86-102`), before `<DropdownMenu>`, add:

    ```tsx
                <Button variant="outline" size="sm" className="min-w-16" disabled={rowDisabled} onClick={() => onMarkMissing(component)}>
                  {t("componentMarkMissing")}
                  <span className="sr-only"> {component.assetTag}</span>
                </Button>
    ```
  - `<DropdownMenuContent>` (`:109-116`) becomes `<DropdownMenuContent align="end">`, with only the QR item (`:117-120`). The "ไม่พบส่วนควบนี้" item (`:121-124`) goes.
- **E2E literals** (the run waits for Task 6): `e2e/audit/field-audit.spec.ts:155` and `:187` `{ name: "หมายเหตุ / รูป" }` → `{ name: "ถ่ายรูป / เพิ่มหมายเหตุ" }`. `tests/e2e-audit.test.ts:108` reads `words.addNotePhoto` in the walk, so the walk must hold the new value. The addNotePhoto pins are this task's (`tests/e2e-audit.test.ts:130`, `tests/e2e-fixes.test.ts:279`, Step 6); Task 6 keeps the literal in its rewritten block 2 and does not edit them again.

- [ ] **Step 4: Add and change the words**

Write the change file in the session scratchpad (an absolute path, for example `<scratchpad>/g2p3-task5-messages.json`), run `node scripts/messages-edit.mjs <file>` from the repo root, then delete it. Namespace `auditScan`:

| Key | th | en |
|---|---|---|
| `fieldMatch` (new) | ตรง | Match |
| `fieldMismatch` (new) | ไม่ตรง | Mismatch |
| `foundValue` (new) | ที่พบ | Found |
| `foundPlaceholder` (new) | เลือกจากรายการ | Choose from the list |
| `chooseFoundValue` (new) | เลือกค่าที่พบ | Choose what you found |
| `departmentFollowsCustodian` (new) | ตามแผนกของผู้ถือครองที่พบ | From the found custodian's department |
| `sheetHintFirstScan` (new) | ตรงกับของจริงไหม แตะ ไม่ตรง เฉพาะเรื่องที่ต่าง | Does it match what you see? Tap Mismatch only where it differs. |
| `valueNotInList` (new) | ไม่อยู่ในรายการ | Not in the list |
| `addNotePhoto` (changed) | ถ่ายรูป / เพิ่มหมายเหตุ | Photo / note |
| `componentMarkMissing` (changed) | ไม่พบ | Missing |

Delete (nothing reads them after this task): `auditScan.inSystem`, `auditScan.clearValue`, `auditScan.sheetStatusPending`. Check first: `rg -n 't\("(inSystem|clearValue|sheetStatusPending)"' src` prints nothing.

The change file:

```json
{
  "set": {
    "th": {
      "auditScan.fieldMatch": "ตรง",
      "auditScan.fieldMismatch": "ไม่ตรง",
      "auditScan.foundValue": "ที่พบ",
      "auditScan.foundPlaceholder": "เลือกจากรายการ",
      "auditScan.chooseFoundValue": "เลือกค่าที่พบ",
      "auditScan.departmentFollowsCustodian": "ตามแผนกของผู้ถือครองที่พบ",
      "auditScan.sheetHintFirstScan": "ตรงกับของจริงไหม แตะ ไม่ตรง เฉพาะเรื่องที่ต่าง",
      "auditScan.valueNotInList": "ไม่อยู่ในรายการ",
      "auditScan.addNotePhoto": "ถ่ายรูป / เพิ่มหมายเหตุ",
      "auditScan.componentMarkMissing": "ไม่พบ"
    },
    "en": {
      "auditScan.fieldMatch": "Match",
      "auditScan.fieldMismatch": "Mismatch",
      "auditScan.foundValue": "Found",
      "auditScan.foundPlaceholder": "Choose from the list",
      "auditScan.chooseFoundValue": "Choose what you found",
      "auditScan.departmentFollowsCustodian": "From the found custodian's department",
      "auditScan.sheetHintFirstScan": "Does it match what you see? Tap Mismatch only where it differs.",
      "auditScan.valueNotInList": "Not in the list",
      "auditScan.addNotePhoto": "Photo / note",
      "auditScan.componentMarkMissing": "Missing"
    }
  },
  "delete": ["auditScan.inSystem", "auditScan.clearValue", "auditScan.sheetStatusPending"]
}
```

Glossary (`docs/19_THAI_GLOSSARY.md`):
- "ไม่ตรง" is the short chip word (spec §5); "ผู้ถือครอง" and "แผนก" are unchanged.
- "Serial" stays as the employees' word (§2.3, P3-R12), as today's line 2 at `audit-scan-workspace.tsx:679`.
- en keeps "Mismatch" as `badgeMismatch` does.
- None of the new Thai texts holds a retired word (`tests/thai-glossary.test.ts`).

Kept and reused: `none` ("ไม่มี / ไม่ระบุ", now also the option's label), `noOptionMatch`, `latestValue`, `expectedLocation` / `expectedCustodian` / `expectedDepartment` / `expectedCondition` (the row names and the save label's field names), `componentFound`, `componentScanQr`, `sheetStatus*` other than Pending, `save*`, `photoRequired*`, `common.search`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test tests/audit-check-record-rules.test.ts tests/audit-scan-record-sheet-ui.test.ts tests/audit-scan-session-check.test.ts tests/audit-out-of-scope-actual-field.test.ts tests/v-track-f.test.ts tests/validation-guards.test.ts tests/field-primitives.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/thai-glossary.test.ts tests/e2e-audit.test.ts && npx tsc --noEmit`
Expected: PASS.
- `audit-scan-session-check.test.ts`: the session is unchanged; `suggestDepartmentForCustodian` keeps its value tests.
- `audit-out-of-scope-actual-field.test.ts:28-58`: both `buildCheckDefaults(…)` calls, `masterCheckValues(lookupMasterValues(target.asset))`, `const diff = diffCheckValues(values, expected, ownershipType)` and `AuditLookupAsset`'s fields stay.
- `v-track-f.test.ts:227-232`: the field keeps `id?: string`, `error?: React.ReactNode`, `<SearchableSelect\n id={id}` and `error={error}`.
- `validation-guards.test.ts`: the check form is still one formless submit (V_SCOPE `:36`); its picker is required with an `error=`.
- `field-primitives.test.ts:139-149` and `visual-foundation-guards.test.ts:280-285`: the Segmented constants and the `<button key type aria-pressed` order stay.
- `visual-foundation-guards.test.ts:33`: the panel's `h2` classes stay.
- `visual-foundation-guards.test.ts:261`: the form keeps its one `shadow-sm`.
- `visual-foundation-guards.test.ts:338`: panels keep 5 raw colours.
- The form keeps its one `Loader2` (`form-migration-guards.test.ts:136`) and three `"-"` literals (`list-frame-guards.test.ts:170`).
- `e2e-audit.test.ts:108`: the walk holds "ถ่ายรูป / เพิ่มหมายเหตุ" and "ไม่พบ".

- [ ] **Step 6: Rewrite these pins**

- `tests/audit-scan-check-ui.test.ts`:
  - `:26` → `assert.match(source, /variant=\{marked\.length === 0 \? "default" : "warning"\}/)`.
  - `:113` → `assert.match(source, /useEffect\(\(\) => \{\s*\n\s*if \(isWide && open\) headingRef\.current\?\.focus\(\)\s*\n\s*\}, \[isWide, open, focusKey\]\)/)`, and the same test also gains `assert.match(read("src/components/audit/audit-scan-workspace.tsx"), /focusKey=\{targetKey\}/)`.
  - `:36-40` become:

    ```ts
    test("choosing a custodian fills that person's department unless the department was set by hand; the rule is the record rules' (group 2 plan 3 P3-R11)", () => {
      const source = form()
      assert.match(source, /chooseAuditCheckValue\(current, field, auditCheckValueFromFound\(id\), recordContext\)/)
      const rules = read("src/lib/audit-check-record-rules.ts")
      assert.match(rules, /const suggested = suggestDepartmentForCustodian\(context\.employees, value\)/)
      assert.match(rules, /if \(field !== "custodian" \|\| !requiresCustodian\(context\.ownershipType\) \|\| record\.departmentTouched\) return next/)
    })
    ```
  - `:81-87` become:

    ```ts
    test("a field shows the expected value in its row, struck through on ไม่ตรง, and the latest register value when it moved (group 2 spec §12)", () => {
      const source = read("src/components/audit/audit-scan-check-field.tsx")
      assert.match(source, /<SearchableSelect/)
      assert.match(source, /\{labelFor\(expectedValue\)\}<\/p>/)
      assert.match(source, /t\("latestValue", \{ value: labelFor\(latestValue\) \}\)/)
      assert.match(source, /border-warning-border bg-warning-soft/)
      assert.doesNotMatch(source, /t\("inSystem"/)
    })
    ```
  - `:99` → `assert.match(source, /const fields = marked\.map\(\(field\) => t\(fieldLabelKey\[field\]\)\)\.join\(", "\)/)`.
  - `:125` → `const keys = ["sheetHintFirstScan", "sheetStatusEdit", "sheetStatusNotFound", "sheetStatusOutOfScope", "sheetStatusJustChecked", "fieldMatch", "fieldMismatch", "foundValue", "foundPlaceholder", "chooseFoundValue", "departmentFollowsCustodian", "valueNotInList", "latestValue", "noOptionMatch", "addNotePhoto", "photoType", "photoRequiredCondition", "photoRequiredPlacement", "photoRequiredMismatch", "componentsSection", "saveAllMatch", "saveMismatch", "saveEditAllMatch", "saveEditMismatch", "saveOutOfScope", "notThisOne", "checkPanelEmpty"]`. `:129-133` (the exact `saveMismatch` and photo texts) stay.
  - `:140` → `assert.match(source, /<SheetHeader>\n\s+<SheetTitle>\{title\}<\/SheetTitle>\n\s+<SheetDescription>\{description\}<\/SheetDescription>\n\s+<\/SheetHeader>/)`. `:139` stays.
  - `:9-15` (with Task 4's `:14`, `requiresCheckPhoto(mode, photoDiff)`), `:17-25`, `:27`, `:30-34`, `:42-65`, `:67-79`, `:89-95`, `:104-122` stay. `:13` holds; `:75-79` holds, because the row keeps its exact warning-box className and has no `border-border bg-surface`.
- `tests/audit-scan-sweep-ui.test.ts`:
  - `:60-67` becomes:

    ```ts
    test("check field: the expected value is a line in the row, struck through on ไม่ตรง, and the latest register value a meta line (DESIGN.md Typography: hints are text-meta; group 2 spec §12)", () => {
      const source = read(`${A}audit-scan-check-field.tsx`)
      assert.match(source, /<p className=\{cn\("break-words text-sm", mismatch \? "text-muted-foreground line-through" : "text-foreground"\)\}>\{labelFor\(expectedValue\)\}<\/p>/)
      assert.match(source, /<p className="mt-0\.5 text-meta text-muted-foreground">\{t\("latestValue", \{ value: labelFor\(latestValue\) \}\)\}<\/p>/)
      // Only a mismatch keeps its warning box (audit mobile fix D1).
      assert.match(source, /className=\{mismatch \? "rounded-md border border-warning-border bg-warning-soft p-2\.5" : undefined\}/)
      assert.doesNotMatch(source, /\btext-xs\b/)
    })
    ```
  - `:86-87` become:

    ```ts
      assert.match(workspace, /const targetDescription: ReactNode = target \? \(/)
      assert.match(workspace, /\{targetSerial \? <> · Serial <span className="tag whitespace-normal break-all">\{targetSerial\}<\/span><\/> : null\}/)
    ```
    `:88-89` (the closed-round Notice and the ban list, `` `Serial \${` `` included) stay.
- `tests/v-track2-u.test.ts`:
  - `:203` → `assert.match(source, /const FIELD_IDS = \{\n  actualLocationId: "audit-check-location",\n  actualCustodianId: "audit-check-custodian",\n  actualDepartmentId: "audit-check-department",\n  actualConditionId: "audit-check-condition",\n\} as const/)`
  - `:204` → `assert.ok(validateBody(source).includes('check("actualLocationId", required(values.location) ?? chosen("location"))'))`
  - `:205-207` become:

    ```ts
      // Each row's "ที่พบ" picker gets the table's id and its error; a row marked ไม่ตรง with nothing chosen is one (group 2 spec §12).
      assert.ok(validateBody(source).includes('check("actualDepartmentId", chosen("department"))'))
      assert.match(source, /<AuditScanCheckField\n\s+key=\{field\}\n\s+id=\{FIELD_IDS\[FIELD_KEY\[field\]\]\}\n/)
    ```
  - `:208` → `assert.match(source, /\n\s+error=\{fieldError\(FIELD_KEY\[field\]\)\}\n/)`
  - `:209` → `assert.match(source, /setRecord\(\(current\) => chooseAuditCheckValue\(current, field, auditCheckValueFromFound\(id\), recordContext\)\)\n\s+fieldErrors\.clear\(FIELD_KEY\[field\]\)/)`
  - `:211` → `assert.match(source, /async function save\(\) \{\n\s+if \(missingPhoto\) \{\n\s+setExtrasOpen\(true\)\n\s+return\n\s+\}\n\s+fieldErrors\.setErrors\(validate\(values, auditCheckUnchosenFields\(record, ownershipType\)\)\)\n\s+if \(focusFirstError\(\)\) return\n/)`
  - The test name (`:198`) becomes "scan check: the location's rule and each ไม่ตรง row's ที่พบ have their errors, focus stays inside the sheet, and a missing photo keeps save focusable with its reason (v-track U6; group 2 spec §12)".
  - `:212-221` stay.
- `tests/v-track2-x.test.ts:209` → `assert.match(source, /async function save\(\) \{\n\s+if \(missingPhoto\) \{\n\s+setExtrasOpen\(true\)\n\s+return\n\s+\}\n\s+fieldErrors\.setErrors\(validate\(values, auditCheckUnchosenFields\(record, ownershipType\)\)\)\n/)`.
- `tests/audit-scan-result-semantics.test.ts:38` → `assert.match(form, /t\("saveMismatch", \{ count: marked\.length, fields \}\)/)`.
- `tests/audit-component-scan-ui.test.ts`:
  - `:79` (the name) → "each component is one compact row: tag, StatusBadge, name · role · slot, พบ and ไม่พบ Buttons and a ⋯ menu with the QR scan (D2; group 2 spec §12)".
  - `:92-97` become:

    ```ts
      // ไม่พบ sits beside พบ and opens the missing dialog itself (group 2 spec §12); ⋯ keeps the QR scan only, so no menu
      // closes into a dialog and the focus guard is gone.
      assert.match(panel, /<Button variant="outline" size="sm" className="min-w-16" disabled=\{rowDisabled\} onClick=\{\(\) => onMarkMissing\(component\)\}>[\s\S]*?t\("componentMarkMissing"\)/)
      assert.match(panel, /<DropdownMenuTrigger asChild>\s*<Button variant="ghost" size="icon-sm" aria-label=\{tCommon\("moreActionsFor", \{ code: component\.assetTag \}\)\}/)
      assert.match(panel, /<DropdownMenuItem disabled=\{saving \|\| confirmingAll\} onSelect=\{\(\) => onScanComponent\(component\)\}>[\s\S]*?t\("componentScanQr"\)/)
      assert.equal(panel.match(/<DropdownMenuItem\b/g)?.length, 1)
      assert.doesNotMatch(panel, /openingDialogRef|onCloseAutoFocus/)
    ```
  - `:169` → `assert.equal(th.componentMarkMissing, "ไม่พบ")`.
  - `:80-91`, `:98-102` and `:160-168`, `:170-177` stay.
- `tests/e2e-fixes.test.ts:279`: in the regex, `name: "หมายเหตุ \/ รูป"` → `name: "ถ่ายรูป \/ เพิ่มหมายเหตุ"`. The rest of the line stays.
- `tests/e2e-audit.test.ts:130` becomes (the name is the message's, so the guard follows the word):

  ```ts
    assert.ok(!mismatch.includes(`getByRole("button", { name: "${words.addNotePhoto}" }).click()`), "the walk does not open the section itself")
  ```

- [ ] **Step 7: Run the whole suite and lint**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS. A pin that fails outside the lists above is rewritten in this commit and named in the report.

- [ ] **Step 8: Commit**

```bash
git add src/lib/audit-check-record-rules.ts src/components/ui/segmented.tsx src/components/audit/audit-scan-check-field.tsx src/components/audit/audit-scan-check-form.tsx src/components/audit/audit-scan-check-panel.tsx src/components/audit/audit-scan-panels.tsx src/components/audit/audit-scan-workspace.tsx src/components/audit/audit-scan-types.ts DESIGN.md messages/th.json messages/en.json e2e/audit/field-audit.spec.ts tests/audit-check-record-rules.test.ts tests/audit-scan-record-sheet-ui.test.ts tests/audit-scan-check-ui.test.ts tests/audit-scan-sweep-ui.test.ts tests/v-track2-u.test.ts tests/v-track2-x.test.ts tests/audit-scan-result-semantics.test.ts tests/audit-component-scan-ui.test.ts tests/e2e-fixes.test.ts tests/e2e-audit.test.ts
git commit -m "feat(audit-scan): the record sheet is titled by the asset's name with its code and serial under it, shows one row per field the server compares (custodian only for a personal asset, no location for a licence) with the expected value and ตรง / ไม่ตรง, asks for ที่พบ under ไม่ตรง (ไม่มี / ไม่ระบุ choosable, custodians with their department), turns the department to ไม่ตรง after a new custodian unless it was set by hand, puts ไม่พบ beside พบ on component rows and names the note toggle ถ่ายรูป / เพิ่มหมายเหตุ (group 2 plan 3 task 5)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: E2E steps on the new walk and record sheet, and the plan's docs

The audit E2E steps follow the new phone walk (§11) and record sheet (§12), and the steps of spec §16 are added:
- The walk data gains one `personal` asset, A3 "โน้ตบุ๊ก", held by the run's first receiver (P3-R15). The round then has 8 items, and every count the chain pins is re-derived (below).
- In room A, before any save:
  - the header names the way back ("กลับไปหน้ารอบ") and counts 0 / 8;
  - the room button reads "ห้องนี้ตรวจแล้ว 0 / 6 · เหลือ 6" with "เปลี่ยนห้อง" (bug 21);
  - the switch reads ยังไม่ตรวจ 6 / ตรวจแล้ว 0 / ทั้งห้อง 6, and with no room ทั้งรอบ 8 (P3-R7);
  - the category chips count within the room and the tab ("ทุกหมวดหมู่ 6", 4, 2; no room "ทุกหมวดหมู่ 8", 6, 2; P3-R16). They hide in room B (one category) and clear on every room change, through the picker and through the clear (P3-R6);
  - the search on the run's prefix reads "ในห้องนี้ 6 · ห้องอื่น 2", room A's six first, all eight shown, and the switch stays above the results (bug 20, P3-R5). The prefix is no whole code, so no exact match goes first (P3-R17); room B's tag typed whole opens that item from room A.
- "แสดงเพิ่ม" past 10 (spec §16, P3-R15) runs in its own phone spec, `e2e/audit/walk-search.spec.ts` (phone projects only, WebKit as the walk), because the walk stays at 8 items (P3-R23). It makes its own room of 11 assets whose tags share one search word, opens a round on that room through the API as IT staff, searches the word on the walk, expects 10 results and "แสดงเพิ่ม", presses it and expects 11, and the IT head cancels the round by PATCH (`cancelAsItHead`) whatever happens. Dev data grows by 11 assets, 1 room and 1 cancelled round per phone project.
- The record sheet:
  - its title is the asset's name;
  - a shared asset has no ผู้ถือครอง row (bug 22) and shows the first-scan hint;
  - "ไม่ตรง" with nothing chosen asks "เลือกค่าที่พบ" and sends nothing;
  - a new custodian turns แผนก to ไม่ตรง "ตามแผนกของผู้ถือครองที่พบ", and ตรง on the custodian undoes both (P3-R8, P3-R11);
  - a room-B asset opened in room A opens ที่ตั้ง as ไม่ตรง with room A found;
  - a component's "ไม่พบ" sits beside "พบ".
- The out-of-scope find X1 is recorded a second time and stays out of scope (P3-R3). The search finds no round item for it (P3-R1); the register lookup opens its sheet at once, every row as recorded (P3-R21); the save answers 200 (P3-R24); and the round page's นอกขอบเขต 1 / ทั้งหมด 8 in block 4 prove the round did not take it in (P3-R23). On room A's ตรวจแล้ว tab, X1 is listed apart under "บันทึกนอกขอบเขตแล้ว 1" with its "นอกขอบเขต" badge, and is none of the room's rows (P3-R25).
- In room B, after a reload, the header reads 6 / 8 with "ไม่ตรง 1": the find is not counted (P3-R1, P3-R2). The offline item's row reads "พบตรง" (P3-R19). The footer link reads "ของในห้องนี้ที่ยังหาไม่เจอ 1 รายการ →". On WebKit the page settles its requests before that navigation.

The docs record the plan.

**Files:**
- Create:
  - `e2e/audit/scan-words.ts` (plain data, no imports: the words the walk's new steps read, each a `messages/th.json` value)
  - `e2e/audit/walk-search.spec.ts` (the phone walk's "แสดงเพิ่ม" past 10 on its own round of 11, spec §16, P3-R15)
- Modify. Line numbers are master `0a7bb9ee`. Tasks 1-5 change these files only here, so re-check those lines before editing and leave them as those tasks left them:
  - Task 3: `e2e/audit/field-audit.spec.ts:302` (the footer link "ของในห้องนี้ที่ยังหาไม่เจอ 1 รายการ →") and `tests/e2e-audit.test.ts:178` (`words.pendingLinkRoom`);
  - Task 5: `e2e/audit/field-audit.spec.ts:155`, `:187` ("ถ่ายรูป / เพิ่มหมายเหตุ"), `tests/e2e-audit.test.ts:130` (`words.addNotePhoto`) and `tests/e2e-fixes.test.ts:279`.

  This task's edits:
  - `e2e/audit/scan-steps.ts`: the whole file, 95 lines.
  - `e2e/audit/audit-plan.ts`:
    - `:14`: the key type;
    - `:16-24`: the plan type;
    - `:26-28`: the comment;
    - `:32-40`: the `asset` helper's defaults;
    - one asset after `:43`.
  - `e2e/audit/audit-data.ts`: `:93`, the ownership and the custodian.
  - `e2e/audit/field-audit.spec.ts`:
    - `:7-11`: the header list, items 2-3;
    - one import after `:35`;
    - `:130-258`: block 2, rewritten whole;
    - `:270-273`, `:283`, `:297-303`: block 3;
    - `:341-352`: block 4's counts.
  - `tests/e2e-audit.test.ts`:
    - `:2`: the import;
    - two helpers after `:12`;
    - `:41-54`, `:114-115`, `:117`, `:257-260`;
    - one assertion after `:178` (Task 3's line stays);
    - two new tests after `:272` (the walk's words and markup; the search spec of P3-R15).
  - `docs/99_CHANGELOG.md`: a new `### …` entry under `## 2026-10-27` (`:7`), above `:9`.
  - `docs/07_UAT_CHECKLIST.md`:
    - `:115` rewritten;
    - one item after `:141`;
    - a new `## Audit Phone Walk B UAT (2026-10-27)` section between `:426` and `## Sign-Off` (`:428`).
  - `docs/06_WORKFLOWS.md`:
    - `:111`, `:114`, `:119` rewritten;
    - one bullet after `:101`;
    - one bullet after `:121`.
    - Edit from the bottom up, so the numbers hold.
  - `DEVELOPER_HANDOFF.md`: one bullet after `:64`, one after `:1226`.
  - `docs/11_FEATURE_LIST.md`: `:194`, `:195`, the second cells.
  - `docs/18_AUDIT_SCAN_GUIDE_TH.md` (the staff guide): `:7-11` (§1), `:16-17` (§2), `:22-28` (§3), `:35` (§4), `:41` (§5), `:45` (§6). Edit from the bottom up, so the numbers hold.
- Unchanged and still passing:
  - `tests/e2e-audit-rounds.test.ts`, whole file. It reads:
    - `round-page-steps.ts`, `pending-steps.ts`, `round-steps.ts` and `rounds-list.spec.ts`, none of which changes;
    - in the field-audit spec, only the round-page block's `settlePageRequests` / click / `page.goto(roundHref)` lines (`:138-143`). Those stay word for word; only the comment and the `expectChips` / `expectChip` counts in that block change.
    - `:135` still counts 2 `page.goto(` in `round-page-steps.ts`.
  - `tests/e2e-audit.test.ts`:
    - `:22-40`: every new tag and name keeps the prefix and the limits;
    - `:55-90`: block 1 is untouched. Its sample loop (`:104` of the spec) sees all 8 round assets, because the preview's sample is `slice(0, 8)` (`src/app/api/audit-rounds/preview/route.ts:28`);
    - `:93-113`, `:118-135`: the helper keeps the literals "ค้นหาทรัพย์สินในรอบนี้" and "ห้องที่กำลังตรวจ", and the mismatch block keeps its shape. `:108`'s key list stays: the rewritten walk still holds "ถ่ายรูป / เพิ่มหมายเหตุ" (`words.addNotePhoto`) and "ไม่พบ" (`words.componentMarkMissing`), and `:130` is Task 5's;
    - `:178`: Task 3's `words.pendingLinkRoom` pin holds, because block 3 keeps Task 3's link line word for word;
    - `:137-177`, `:179-190`, `:192-248`: blocks 3 (offline window, savedQueued, banners), 5, 6 and 8 keep their lines, and the five findings stay five;
    - `:262-271`: block 4's other pins.
  - `tests/e2e-fixes.test.ts`:
    - `:279` (Task 5's "ถ่ายรูป \/ เพิ่มหมายเหตุ"): the rewritten mismatch block keeps that line;
    - `:243` (`recordSettled(page, measure, "check of the mismatch with its photo")`);
    - `:344` (the exact `const searchInput = page.getByRole("combobox", { name: "ค้นหา", exact: true })` line, kept in the rewritten helper);
    - `:360-362`, `:376-378`: the listbox / settle / forced-tap lines stay word for word.
  - `tests/e2e-review.test.ts:88-112`: no hazard and no DELETE in the new or changed files. `tests/e2e-suite.test.ts:327`: the spec still imports from `../support/fixtures.ts`.
  - The docs pins: `tests/e2e-docs.test.ts` and `tests/shell-docs.test.ts` see no template marker; the changelog keeps `### ชุดทดสอบ E2E …` under `## 2026-10-21`.
  - `e2e/shell/shell-steps.ts:13` still re-exports `shellBanner` from `scan-steps.ts`.
- No message changes. Every word the steps read is a `messages/th.json` value that Tasks 3-5 put there or that exists already. Step 1's guard test checks each one.

**Interfaces:**
- Consumes. This is the contract of Tasks 1-5 that the steps stand on. A reviewer checks each landed task against it.
  - **Scan page, Task 3 (spec §11):**
    - **Header:**
      - a link named exactly "กลับไปหน้ารอบ", whose href is `/<locale>/audit/rounds/<id>` (a query may follow);
      - an element `[data-audit-scan-progress]` (Task 3's header `<p>`) whose text holds `"{checked} / {total}"` (formatCount, own items) and "ไม่ตรง {count}" (`auditScan.progressMismatch`, folded by `foldAuditRoundResultCounts`, P3-R2).
    - **Room button** `[data-audit-scan-room]`, which stays:
      - with a room: its text holds the room's "<code> - <name>", "ห้องนี้ตรวจแล้ว {checked} / {total} · เหลือ {pending}" (own items, within the chosen department, P3-R13) and "เปลี่ยนห้อง";
      - with none: it holds "เลือกห้องที่กำลังตรวจ".
    - **Room sheet:**
      - The button opens the dialog "ห้องที่กำลังตรวจ".
      - A room is a button whose name starts "<code> - <name>". Choosing it closes the sheet.
      - The footer button "ไม่เลือกห้อง" clears the room and closes the sheet. The sheet stays closed afterwards, as today: the empty choice is stored, so `hasStoredRoom` is true.
    - **The switch** is a `Segmented`: `role="group"`, named exactly "สถานะรายการ". It holds three buttons, in order:
      - "ยังไม่ตรวจ" + count;
      - "ตรวจแล้ว" + count;
      - "ทั้งห้อง" + count with a room, "ทั้งรอบ" + count without one.
      - Each count is the last text of its button.
      - The switch is visible while a search shows results, and it sits above them.
    - **Category chips:**
      - One element with `role="group"`, named exactly "หมวดหมู่", with one `aria-pressed` button per chip.
      - The first chip is "ทุกหมวดหมู่" + the room-and-tab total (P3-R16). Then one chip per category, label + count, ordered by count desc, then label (P3-R6).
      - Each chip's text ends with its count.
      - The group is not rendered at ≤ 1 category.
      - "ทุกหมวดหมู่" is pressed after every room change, through the picker and through the clear.
      - A chip narrows the rows.
      - No chip is a link.
    - **Rows** are `[data-audit-scan-room-list] [data-audit-scan-row]`, one per own item of the room, tab and category (up to 50). A row's text holds:
      - the name and the tag;
      - with a room chosen, the expected custodian's label when there is one;
      - "ส่วนควบ {count}" when `componentCount > 0`;
      - the badge once checked: a found item reads "พบตรง" (P3-R19).
    - **Recorded finds** (P3-R25): on the ตรวจแล้ว tab, `[data-audit-scan-room-list] [data-audit-scan-recorded-out-of-scope]` holds one heading "บันทึกนอกขอบเขตแล้ว {count}" and one button `[data-audit-scan-recorded-row]` per recorded out-of-scope find of the room, whose name contains the tag and whose text holds "นอกขอบเขต". These buttons are not `[data-audit-scan-row]`, so `scan.roomRows` never counts them.
    - **Search results** are `[data-audit-scan-results]`:
      - It holds exactly one `role="status"` element (sr-only is fine). With a room chosen and at least one own match, its text is exactly `ผลค้นหา "{term}": ในห้องนี้ {inRoom} · ห้องอื่น {otherRooms}`.
      - The results are the `listitem`s of its one list, each one button whose name contains the tag. An exact code (a tag, serial or fixed asset code typed whole) comes first wherever its room is, then the room's items (P3-R17).
      - At most 10 are shown. A button "แสดงเพิ่ม" sits inside the section only when more remain.
      - With no own match there is no `listitem`, and the register lookup card offers "ค้นในทะเบียนทั้งหมด", as today.
    - **Footer:** on the ยังไม่ตรวจ tab with a room, a link named exactly "ของในห้องนี้ที่ยังหาไม่เจอ {count} รายการ →" (the arrow is part of the message, as in today's `pendingLink`). The count is the room's own pending items. It opens `/<locale>/audit/rounds/<id>/pending` with `locationId=<room>` (P3-R14).
  - **Record sheet, Task 5 (spec §12):**
    - **The title:** the phone `SheetTitle` and the desktop panel's `h2` are both exactly the asset's name, for an in-round item and for an out-of-scope find.
    - **Fields:** each applicable field is one `[data-audit-check-field="<field>"]` inside `[data-audit-check-form]`, where `<field>` is `location`, `custodian`, `department` or `condition`. The attribute gets a value; today it is bare.
      - A field that does not apply is not rendered: `custodian` for an ownership other than `personal`, and `location` for `software_license` (P3-R11).
    - **Inside a field:**
      - a `Segmented` with two buttons named exactly "ตรง" and "ไม่ตรง" (`aria-pressed`);
      - on "ไม่ตรง", a `SearchableSelect` labelled "ที่พบ". Its trigger's accessible name starts with "ที่พบ" and holds the chosen option's label. Tapping "ไม่ตรง" shows the select closed; it does not open its popover.
      - `data-mismatch="true"` while its "ไม่ตรง" is pressed, a value chosen or not (Task 5);
      - the expected value's label is in the field's text.
    - **"ไม่ตรง" with nothing chosen:** the save sends no request. "เลือกค่าที่พบ" shows inside that field (the select's error), and focus is on that field's "ที่พบ" trigger. Tapping "ตรง" removes the error.
    - **Custodian options** read "<code> - <fullNameTh> · <department>", where `<department>` contains the department's name (P3-R10).
    - **A new custodian, department untouched:**
      - the department's "ไม่ตรง" is pressed, with `data-mismatch="true"`;
      - the department field holds "ตามแผนกของผู้ถือครองที่พบ";
      - its "ที่พบ" shows the person's department as "<code> - <name>".
      - Tapping "ตรง" on the custodian:
        - returns the custodian to the expected one;
        - presses "ตรง" on the department again;
        - removes that line.
    - **A walked room that is not the expected room (first scan):**
      - location's "ไม่ตรง" is pressed, with `data-mismatch="true"`;
      - its "ที่พบ" shows the walked room's "<code> - <name>";
      - the field's text holds the expected room's label.
    - **The hint** "ตรงกับของจริงไหม แตะ ไม่ตรง เฉพาะเรื่องที่ต่าง" shows in the form on a first scan.
    - **Kept as today:**
      - the save button in `[data-audit-check-actions]`, named from "บันทึก…", with today's labels: "บันทึก · ตรงทุกข้อ", "บันทึก · ไม่ตรง {count} ข้อ ({fields})" over the rows marked ไม่ตรง, a value chosen or not, in field order (P3-R22), and "บันทึกนอกขอบเขต";
      - its `aria-disabled` and the photo reasons, "แผนกหรือที่ตั้งไม่ตรง ต้องแนบรูปก่อนบันทึก" for department or location alone;
      - "ไม่ใช่ชิ้นนี้", which closes with no request.
    - **The note-and-photo toggle** is named exactly "ถ่ายรูป / เพิ่มหมายเหตุ" (the camera icon `aria-hidden`), with `aria-expanded`. A tap on the waiting save opens it, as today (DX5).
    - **A component row** is `[data-audit-component-row]` with:
      - "พบ", a button named exactly "พบ <tag>" (today's sr-only tag);
      - beside it, "ไม่พบ", a button named exactly "ไม่พบ <tag>", which opens the dialog "บันทึกส่วนควบที่ไม่พบ" as today;
      - the heading "ส่วนควบ {count} ชิ้น" and the hint "ส่วนควบตรวจแล้ว {checked} / {total}", which stay.
  - **The out-of-scope find, Tasks 1 and 4 (P3-R1, P3-R3):**
    - **After the first save:** a local search of the find's tag shows no `listitem` (own items), and "ค้นในทะเบียนทั้งหมด" is offered.
    - **The lookup** ("ค้นในทะเบียนทั้งหมด") answers `out_of_scope` with the item, and the workspace opens the out-of-scope sheet at once (Task 4): no "{tag} ไม่อยู่ในขอบเขตรอบนี้" card and no "บันทึกเป็นนอกขอบเขต" step, which stay for a first find only. The sheet has:
      - the name as its title;
      - the status line "บันทึกนอกขอบเขตไว้แล้ว · บันทึกตอนนี้จะเป็นการแก้";
      - each row as recorded (P3-R21): X1 was recorded in its master room, so no `[data-mismatch="true"]`;
      - the save "บันทึกนอกขอบเขต", with no photo asked, since nothing changes from what was recorded (P3-R18).
    - **The save:**
      - `POST /api/audit-rounds/<id>/scan` answers **200** (P3-R24) with a JSON body holding `status: "out_of_scope"`, `auditResult: "out_of_scope"` and the item;
      - the banner reads "{tag} บันทึกเป็นนอกขอบเขตแล้ว";
      - the page then runs today's `syncNow` (a `GET …/scan-status`), as after any out-of-scope save.
    - The first out-of-scope save still answers 202 (`scan/route.ts:264`).
  - **Counts on the chain's data (Tasks 2-3, own items, P3-R1):**
    - Room A holds A1, A2, A3, P1, C1, C2: four desktops and two components. Room B holds A4 and A5, both desktops. X1 is not a round item until recorded, and never an own item.
    - **Before any save, in room A:**
      - the switch reads 6 / 0 / 6, with "ทั้งห้อง";
      - the chips read ทุกหมวดหมู่ 6, 4, 2;
      - the component chip shows 2 rows.
    - **Room B:** 2 / 0 / 2 and no chips.
    - **No room:** the switch reads 8 / 0 / 8, with "ทั้งรอบ"; the chips read 8, 6, 2.
    - **The prefix search in room A:** 6 in the room and 2 elsewhere.
    - **After block 2, in room A:**
      - the ตรวจแล้ว tab reads 0 / 6 / 6, with chips 6, 4, 2, and ends with "บันทึกนอกขอบเขตแล้ว 1": X1 with its "นอกขอบเขต" badge (P3-R25);
      - the ยังไม่ตรวจ tab has no chips.
    - **At block 3, after a reload:**
      - the header reads "6 / 8" and "ไม่ตรง 1": A2 is checked with `need_review`, and X1 is not counted;
      - room B reads "ห้องนี้ตรวจแล้ว 0 / 2 · เหลือ 2".
    - **The round page after the walk** (Tasks 1-5 change none of its rules):
      - ทั้งหมด 8, รอตรวจ 0, พบตรง 5 (A1, A3, P1, C1, A5), ไม่ตรง 1, ไม่พบ 2, นอกขอบเขต 1, รอพิจารณา 4;
      - the categories read Desktop 6 and Component 2 under ทั้งหมด, and 1 and 1 under ไม่พบ;
      - the findings are still five: A3 saves as matched, and X1's second save changes no field.
    - The IT head's own round (room B) keeps its 2 items.
  - **Existing helpers:**
    - `recordSettled` and `settleToasts` (`e2e/audit/settle.ts`);
    - `settlePageRequests` (`e2e/audit/round-page-steps.ts:69`);
    - `fillTemplate` (`e2e/shell/shell-words.ts:24`);
    - `readRunData` and `readRunState` (`e2e/support/state.ts`), with `RunData.employees.receiver1` and `.receiver2` (`{ id; code; fullNameTh }`, both in the run's department, `e2e/setup/run-data.setup.ts:89-102`);
    - `runRecords(runId).department` (`{ code; name }`, `e2e/support/run-plan.ts:83`);
    - for the search spec, as `e2e/audit/rounds-list.spec.ts` uses them: `createRoom(code, name): Promise<string>`, `readAssetChoices(page, measure)`, `createAssets(page, choices, roomId, tags): Promise<{ id; assetTag; name }[]>` and `recordPrefix(testInfo, workflow)` (`e2e/disposal/disposal-support.ts:25`, `:53`, `:71`, `:89`), `bangkokDate(offsetDays?)` (`e2e/transactions/tx-plan.ts`), and `cancelAsItHead(api, baseURL, roundId, reason)` (`e2e/audit/round-steps.ts:71`: a PATCH `{ action: "cancel", reason }` from the IT head's saved session).
- Produces:
  - `e2e/audit/scan-words.ts`: `SCAN_WORDS` (below).
  - `e2e/audit/audit-plan.ts`:
    - `AuditAssetKey` gains `"personal"`;
    - `AuditAssetPlan` gains `ownership: "shared" | "personal"` and `custodian: "receiver1" | null`;
    - the walk's A3 is `{ key: "personal", tag: "<prefix>-A3", name: "<runId> <code> โน้ตบุ๊ก", room: "roomA", department: "round", category: "desktop", ownership: "personal", custodian: "receiver1" }`.
  - `e2e/audit/scan-steps.ts`. Kept, unchanged:
    - `checkForm`, `savedBanner`, `offlineBar`, `shellBanner`, `searchBox`, `saveButton` (consts);
    - `pickRoom(page: Page, room: { code: string; name: string }): Promise<void>`;
    - `typeSearch(page: Page, text: string): Promise<void>`;
    - `addPhoto(page: Page, file: string): Promise<void>`;
    - `slowNetwork`, `SLOW_4G_ROUND_TRIP_MS`, `isSlowedOnThePhone`, `KEYBOARD_OPEN_VIEWPORT`, `escapeRegExp`, `tagPattern`.
  - `e2e/audit/scan-steps.ts`. Changed or new:
    - `type CheckFieldKey = "location" | "custodian" | "department" | "condition"`;
    - `roomButton(page: Page): Locator`;
    - `clearRoom(page: Page): Promise<void>`;
    - `progress(page: Page): Locator`;
    - `tabs(page: Page): Locator`;
    - `expectTabs(page: Page, expected: readonly (readonly [string, number])[]): Promise<void>`;
    - `categoryChips(page: Page): Locator`;
    - `expectCategoryChips(page: Page, all: number, counts: readonly number[]): Promise<void>`;
    - `roomRows(page: Page): Locator`;
    - `recordedFinds(page: Page): Locator` (P3-R25);
    - `searchResults(page: Page): Locator`;
    - `searchRows(page: Page): Locator`;
    - `expectSearchLine(page: Page, term: string, inRoom: number, otherRooms: number): Promise<void>`;
    - `findAndOpen(page: Page, typed: string, asset: { tag: string; name: string }, found?: { inRoom: number; otherRooms: number }): Promise<void>` (was `(page, typed, tag: string)`);
    - `checkHeading(page: Page, asset: { name: string }): Locator` (was `(page, tag: string)`);
    - `checkField(page: Page, field: CheckFieldKey): Locator`;
    - `fieldAnswer(page: Page, field: CheckFieldKey, answer: "match" | "mismatch"): Locator`;
    - `foundSelect(page: Page, field: CheckFieldKey): Locator`;
    - `chooseInCheckField(page: Page, field: CheckFieldKey, search: string, option: string | RegExp): Promise<void>` (was `(page, label: "ที่ตั้ง" | …, search, optionStart: string)`);
    - `watchScanPosts(page: Page, roundId: string, assetId: string): { posts: string[]; stop: () => void }`;
    - `nextScanSave(page: Page, roundId: string): { saved: Promise<Response>; synced: Promise<Response> }`;
    - `expectAbove(upper: Locator, lower: Locator): Promise<void>`.

- [ ] **Step 1: Write the words file, the walk data and the guard tests, so they fail**

`e2e/audit/scan-words.ts`:

```ts
// The words the phone walk's steps read (group 2 spec §11, §12, §16), each a value of messages/th.json
// (tests/e2e-audit.test.ts checks them). Plain data, no imports, so the node test can load it. The placeholders are the
// steps' own names; the test compares the texts with every placeholder alike.
export const SCAN_WORDS = {
  // The header (spec §11): the way back, and the mismatch count under "x / y".
  backToRound: "กลับไปหน้ารอบ",
  progressMismatch: "ไม่ตรง {count}",
  // The room button (bug 21) and the room sheet.
  roomProgress: "ห้องนี้ตรวจแล้ว {checked} / {total} · เหลือ {pending}",
  roomChange: "เปลี่ยนห้อง",
  roomPick: "เลือกห้องที่กำลังตรวจ",
  roomClear: "ไม่เลือกห้อง",
  // The switch (P3-R7): its name and its tabs; the third reads by the room.
  tabsLabel: "สถานะรายการ",
  tabPending: "ยังไม่ตรวจ",
  tabChecked: "ตรวจแล้ว",
  tabRoom: "ทั้งห้อง",
  tabRound: "ทั้งรอบ",
  // The category chips (decision 3, P3-R6); the first reads as the round page's (P3-R16).
  categoryChipsLabel: "หมวดหมู่",
  categoryAll: "ทุกหมวดหมู่",
  // A row's components (spec §11).
  componentCount: "ส่วนควบ {count}",
  // The search (bug 20, P3-R5).
  searchLine: "ผลค้นหา \"{term}\": ในห้องนี้ {inRoom} · ห้องอื่น {otherRooms}",
  showMore: "แสดงเพิ่ม",
  // A row's found badge (P3-R19).
  badgeFound: "พบตรง",
  // The record sheet (spec §12). (The footer link keeps Task 3's literal in block 3, pinned by tests/e2e-audit.test.ts:178.)
  firstScanHint: "ตรงกับของจริงไหม แตะ ไม่ตรง เฉพาะเรื่องที่ต่าง",
  fieldMatch: "ตรง",
  fieldMismatch: "ไม่ตรง",
  foundValue: "ที่พบ",
  chooseFoundValue: "เลือกค่าที่พบ",
  departmentFollowsCustodian: "ตามแผนกของผู้ถือครองที่พบ",
  notePhoto: "ถ่ายรูป / เพิ่มหมายเหตุ",
  componentNotFound: "ไม่พบ",
  photoRequiredPlacement: "แผนกหรือที่ตั้งไม่ตรง ต้องแนบรูปก่อนบันทึก",
  notThisOne: "ไม่ใช่ชิ้นนี้",
  // A recorded out-of-scope find opened again (P3-R3).
  outOfScopeRecorded: "บันทึกนอกขอบเขตไว้แล้ว · บันทึกตอนนี้จะเป็นการแก้",
  // The ตรวจแล้ว tab's recorded finds, apart from the counts, each with its badge (P3-R25).
  recordedOutOfScope: "บันทึกนอกขอบเขตแล้ว {count}",
  badgeOutOfScope: "นอกขอบเขต",
} as const
```

`e2e/audit/audit-plan.ts`:
- `:14` becomes:

```ts
export type AuditAssetKey = "matched" | "mismatch" | "personal" | "parent" | "component1" | "component2" | "notFound" | "offline" | "outOfScope"
```

- `:16-24`: after `category: "desktop" | "component"` (`:23`) add:

```ts
  // Who answers for it (group 2 plan 3, P3-R15): the department (shared, no custodian), or one of the run's employees
  // (personal), so the record sheet compares a custodian.
  ownership: "shared" | "personal"
  custodian: "receiver1" | null
```

- `:26-28` (the comment) becomes:

```ts
// The walk (spec §6.2.2–3): in room A one matched, one mismatch (another department and the condition, with the photo),
// one personal asset held by the run's first receiver (group 2 spec §12, P3-R15: the custodian and the department), a
// parent with two installed components; in room B one not found and one saved offline; and one asset of the run's
// department in room A, outside the round's scope.
```

- `:37-38`: after `category: "desktop",` add `ownership: "shared",` and `custodian: null,`. The `...extra` stays last.
- After `:43` (`asset("mismatch", …)`) add:

```ts
    asset("personal", "A3", "โน้ตบุ๊ก", "roomA", { ownership: "personal", custodian: "receiver1" }),
```

`e2e/audit/audit-data.ts:93` (`ownershipType: "shared",`, in the POST /api/assets body of `createAuditAssets`) becomes:

```ts
      ownershipType: plan.ownership,
      custodianId: plan.custodian ? run.employees[plan.custodian].id : null,
```

`tests/e2e-audit.test.ts`:
- `:2` becomes `import { readdirSync, readFileSync } from "node:fs"`.
- After `:12` (the `thai` helper) add:

```ts
// Every text of a messages tree, and a text with its placeholders alike (a step's template and a th.json value are the
// same words whatever their placeholders are named).
const values = (node: unknown): string[] => (typeof node === "string" ? [node] : node && typeof node === "object" ? Object.values(node).flatMap(values) : [])
const shape = (text: string) => text.replace(/\{\w+\}/g, "{}")
```

- `:41-54` become:

```ts
    // Room A: matched, mismatch, the personal asset, the parent and its two components; room B: not found and offline;
    // the outsider is the run's department in room A.
    const where = Object.fromEntries(records.assets.map((asset) => [asset.key, `${asset.room}/${asset.department}`]))
    assert.deepEqual(where, {
      matched: "roomA/round",
      mismatch: "roomA/round",
      personal: "roomA/round",
      parent: "roomA/round",
      component1: "roomA/round",
      component2: "roomA/round",
      notFound: "roomB/round",
      offline: "roomB/round",
      outOfScope: "roomA/run",
    })
    assert.deepEqual(records.components.map((component) => component.key), ["component1", "component2"])
    // Group 2 plan 3 (P3-R15): one personal asset, held by the run's first receiver, for the custodian step; the rest
    // are shared, with no custodian. Eight round items: the round form's sample shows eight rows
    // (src/app/api/audit-rounds/preview/route.ts), so block 1 sees each of them.
    assert.deepEqual(records.assets.filter((asset) => asset.ownership === "personal").map((asset) => [asset.key, asset.custodian]), [["personal", "receiver1"]])
    assert.ok(records.assets.filter((asset) => asset.ownership === "shared").every((asset) => asset.custodian === null))
    assert.equal(records.assets.filter((asset) => asset.department === "round").length, 8)
```

- After `:62` (the "no direct database access" line) add:

```ts
  assert.ok(data.includes("ownershipType: plan.ownership,") && data.includes("custodianId: plan.custodian ? run.employees[plan.custodian].id : null,"))
```

- `:108` stays (the walk still holds `words.addNotePhoto` and `words.componentMarkMissing`; the addNotePhoto pins are Task 5's).
- `:114-115` become:

```ts
  assert.ok(walk.includes("scan.findAndOpen(page, assets.matched.tag, assets.matched)"))
  assert.ok(walk.includes(`scan.findAndOpen(page, "เครื่องพิมพ์", assets.mismatch)`))
```

- `:117`: `{ count: 7 }` becomes `{ count: 8 }`.
- `:130` stays as Task 5 left it (`words.addNotePhoto`).
- `:178` stays as Task 3 left it (`room.includes(words.pendingLinkRoom.replace("{count}", "1"))`). After it add:

```ts
  // Group 2 plan 3 (P3-R14): WebKit's page settles before the footer link leaves it; the link's words are Task 3's pin above.
  assert.match(room, /await roundPage\.settlePageRequests\(page\)\n\s*await page\.getByRole\("link", \{ name: "ของในห้องนี้ที่ยังหาไม่เจอ 1 รายการ →" \}\)\.click\(\)/)
```

- `:257-260` become (`:261`, the loop's body, stays):

```ts
  // The walk's counts (spec §8, P2-R2, P2-R3; group 2 plan 3 adds the personal asset, saved as matched): 8 = 5 + 1 + 2 + 0,
  // the out-of-scope find apart even after its second save (P3-R3), four items waiting.
  assert.ok(after.includes("await roundPage.expectChips(results, [[W.resultAll, 8], [W.resultPending, 0], [W.resultFound, 5], [W.resultMismatch, 1], [W.resultNotFound, 2], [W.resultOutOfScope, 1], [W.resultPendingReview, 4]])"))
  assert.equal((after.match(/await roundPage\.expectChipsMatchRows\(page, (?:results|categories), rows\)/g) ?? []).length, 3)
  for (const [category, count] of [["categoryDesktop", 6], ["categoryComponent", 2], ["categoryDesktop", 1], ["categoryComponent", 1]] as const) {
```

- After `:272`, a new test:

```ts
test("the phone walk reads the app's own words and the walk's markup: the switch and the category chips, a room-first search, the record sheet's ตรง / ไม่ตรง, a personal asset, a wrong room and a second out-of-scope find (group 2 plan 3 task 6)", async () => {
  const { SCAN_WORDS: S } = await import("../e2e/audit/scan-words.ts")
  const th = JSON.parse(read("messages/th.json"))
  const shapes = new Set(values(th).map(shape))
  for (const [name, text] of Object.entries(S)) assert.ok(shapes.has(shape(text)), `${name}: "${text}" is a value of messages/th.json`)
  // The words that stay, by their keys.
  const words = th.auditScan as Record<string, string>
  for (const [name, key] of [["tabsLabel", "roomListTabs"], ["tabPending", "tabPending"], ["tabChecked", "tabChecked"], ["roomClear", "roomClear"], ["roomPick", "roomPick"], ["showMore", "showMore"], ["notThisOne", "notThisOne"], ["photoRequiredPlacement", "photoRequiredPlacement"], ["progressMismatch", "progressMismatch"], ["recordedOutOfScope", "recordedOutOfScopeTitle"], ["badgeOutOfScope", "badgeOutOfScope"]] as const) {
    assert.equal(S[name], words[key], name)
  }
  // Bugs 20, 21 and spec §11-§12: the old wordings left the walk.
  for (const old of ["ยังไม่ตรวจ {pending} / {total}", "พบ {count} รายการในรอบนี้ · Enter = เปิดรายการแรก", "ของที่หาไม่เจอ → รายการค้าง", "หมายเหตุ / รูป"]) assert.ok(!values(words).includes(old), old)

  // The steps: a field by its key, then ไม่ตรง, then "ที่พบ" (spec §12), never the first button in it.
  const steps = read("e2e/audit/scan-steps.ts")
  for (const name of ["roomButton", "pickRoom", "clearRoom", "progress", "tabs", "expectTabs", "categoryChips", "expectCategoryChips", "roomRows", "recordedFinds", "typeSearch", "searchResults", "searchRows", "expectSearchLine", "findAndOpen", "checkHeading", "checkField", "fieldAnswer", "foundSelect", "chooseInCheckField", "addPhoto", "watchScanPosts", "nextScanSave", "expectAbove"]) {
    assert.match(steps, new RegExp(`^export (?:async )?function ${name}\\(`, "m"), name)
  }
  assert.ok(steps.includes("return checkForm(page).locator(`[data-audit-check-field=\"${field}\"]`)"))
  assert.ok(!steps.includes('getByRole("button").first()'), "not the first button of a field")
  assert.ok(steps.includes("return page.getByRole(\"heading\", { name: asset.name, exact: true })"), "the sheet's title is the asset's name (bug 23)")
  // The markup the steps read (Tasks 3 and 5).
  const audit = readdirSync("src/components/audit").map((file) => read(`src/components/audit/${file}`)).join("\n")
  for (const hook of ["data-audit-scan-progress", "data-audit-scan-room", "data-audit-scan-room-list", "data-audit-scan-row", "data-audit-scan-results", "data-audit-component-row", "data-audit-scan-recorded-out-of-scope", "data-audit-scan-recorded-row"]) assert.ok(audit.includes(hook), hook)
  assert.match(audit, /data-audit-check-field=\{/, "each field carries its key")

  // Block 2: the walk in room A.
  const walk = block(read(SPEC), "IT staff walk room A")
  assert.ok(walk.includes("test.setTimeout(420_000)"))
  assert.ok(walk.includes("await expect(scan.roomButton(page)).toContainText(fillTemplate(S.roomProgress, { checked: 0, total: 6, pending: 6 }))"))
  // The switch and the chips (P3-R6, P3-R7): within the room and the tab, cleared on a room change, the third tab by the room.
  for (const line of [
    "await scan.expectTabs(page, [[S.tabPending, 6], [S.tabChecked, 0], [S.tabRoom, 6]])",
    "await scan.expectCategoryChips(page, 6, [4, 2])",
    "await scan.pickRoom(page, records.rooms.roomB)",
    "await scan.expectTabs(page, [[S.tabPending, 8], [S.tabChecked, 0], [S.tabRound, 8]])",
    "await scan.expectCategoryChips(page, 8, [6, 2])",
    "await scan.expectTabs(page, [[S.tabPending, 0], [S.tabChecked, 6], [S.tabRoom, 6]])",
  ]) assert.ok(walk.includes(line), line)
  assert.equal((walk.match(/await expect\(scan\.categoryChips\(page\)\)\.toHaveCount\(0\)/g) ?? []).length, 2, "no chips in room B, nor on an empty tab")
  // The room-first search (bug 20, P3-R5).
  assert.ok(walk.includes("await scan.expectSearchLine(page, runTags, 6, 2)"))
  assert.ok(walk.includes(`expect(order.slice(0, 6).sort(), "room A's items first").toEqual([...roomATags].sort())`))
  assert.ok(walk.includes("await scan.expectAbove(scan.tabs(page), found.first())"))
  // The record sheet (spec §12): a shared asset has no custodian row; the personal asset's steps; a wrong room.
  assert.ok(walk.includes(`await expect(scan.checkField(page, "custodian")).toHaveCount(0)`))
  assert.ok(walk.includes(`await scan.findAndOpen(page, "โน้ตบุ๊ก", assets.personal)`))
  assert.ok(walk.includes(`await expect(scan.foundSelect(page, "condition")).toBeFocused()`))
  assert.ok(walk.includes(`expect(personalPosts.posts, "a ไม่ตรง with nothing found sends nothing").toEqual([])`))
  assert.ok(walk.includes(`await expect(department.getByText(S.departmentFollowsCustodian, { exact: true })).toBeVisible()`))
  assert.ok(walk.includes(`await expect(scan.saveButton(page)).toHaveText("บันทึก · ไม่ตรง 2 ข้อ (ผู้ถือครอง, แผนก)")`))
  assert.ok(walk.includes(`await scan.fieldAnswer(page, "custodian", "match").click()`))
  assert.ok(walk.includes(`await scan.findAndOpen(page, assets.notFound.tag, assets.notFound, { inRoom: 0, otherRooms: 1 })`))
  assert.ok(walk.includes(`expect(roomBPosts.posts, "nothing is sent for the other room's asset").toEqual([])`))
  // The components side by side: "พบ <tag>" exactly (it is a part of "ไม่พบ <tag>"), "ไม่พบ" beside it, no ⋯.
  assert.ok(walk.includes("getByRole(\"button\", { name: `พบ ${assets.component1.tag}`, exact: true })"))
  assert.ok(walk.includes("getByRole(\"button\", { name: `${S.componentNotFound} ${assets.component2.tag}`, exact: true })"))
  assert.ok(!walk.includes("การดำเนินการของ"), "the missing component is not behind ⋯")
  // The second out-of-scope save stays out of scope (P3-R3), and the walk's counts never take the find in (P3-R1).
  assert.ok(walk.includes("await expect(scan.checkForm(page).getByText(S.outOfScopeRecorded)).toBeVisible()"))
  assert.ok(walk.includes(`await expect(scan.checkForm(page).locator('[data-mismatch="true"]')).toHaveCount(0)`), "it opens as recorded (P3-R21)")
  assert.ok(walk.includes(`expect(response.status(), "the second save answers 200 with the item (P3-R24)").toBe(200)`))
  assert.ok(walk.includes(`expect(await response.json(), "it stays out of scope (P3-R3)").toMatchObject({ status: "out_of_scope", auditResult: "out_of_scope" })`))
  assert.ok(walk.includes("await expect(scan.roomRows(page).filter({ hasText: assets.outOfScope.tag })).toHaveCount(0)"))
  // The recorded find listed apart on the ตรวจแล้ว tab, with its badge (P3-R25).
  assert.ok(walk.includes("await expect(scan.recordedFinds(page).getByRole(\"heading\")).toHaveText(fillTemplate(S.recordedOutOfScope, { count: 1 }))"))
  assert.ok(walk.includes("await expect(scan.recordedFinds(page).getByRole(\"button\", { name: scan.tagPattern(assets.outOfScope.tag) })).toContainText(S.badgeOutOfScope)"))

  // Block 3: after a reload the header counts the round's own items only (P3-R1, P3-R2).
  const room = block(read(SPEC), "IT staff in room B, offline, and not found")
  assert.ok(room.includes(`await expect(scan.progress(page)).toContainText("6 / 8")`))
  assert.ok(room.includes("await expect(scan.progress(page)).toContainText(fillTemplate(S.progressMismatch, { count: 1 }))"))
  assert.ok(room.includes("await expect(scan.checkHeading(page, assets.offline)).toBeVisible()"))
  assert.ok(room.includes("toContainText(S.badgeFound)"), "the found badge reads พบตรง (P3-R19)")
})

test("the walk's search spec opens its own round of eleven on its own room, on the phone only, shows แสดงเพิ่ม past ten, and the IT head cancels it whatever happens (group 2 plan 3 task 6, spec §16, P3-R15)", () => {
  const spec = read("e2e/audit/walk-search.spec.ts")
  assert.ok(spec.includes(`from "../support/fixtures.ts"`) && !spec.includes(`from "@playwright/test"`))
  assert.ok(spec.split("\n").includes("runPhoneOnWebKit()"), "the phone on WebKit, as the field audit's walk")
  assert.ok(spec.includes(`asUser("itStaff")`))
  assert.ok(spec.includes(`test.skip(e2eDevice !== "phone", `), "phone projects only (spec §16)")
  // Its own records: a room, eleven assets that share the search word, a round on that room (spec §16).
  assert.ok(spec.includes(`recordPrefix(testInfo, "AUW")`))
  assert.ok(spec.includes("const roomId = await createRoom(roomCode, roomName)"))
  assert.ok(spec.includes("const tags = Array.from({ length: 11 }, "))
  assert.ok(spec.includes(`expect(round.generatedItems, "the room's eleven assets").toBe(11)`))
  assert.doesNotMatch(spec, /\bstatus: "/, "the round's body sends no status (spec §7)")
  // Ten, then แสดงเพิ่ม, then eleven.
  assert.ok(spec.includes("await scan.expectSearchLine(page, term, 11, 0)"))
  assert.ok(spec.includes("await expect(scan.searchRows(page)).toHaveCount(10)"))
  assert.ok(spec.includes("const more = scan.searchResults(page).getByRole(\"button\", { name: S.showMore, exact: true })"))
  assert.ok(spec.includes("await more.click()"))
  assert.ok(spec.includes("await expect(scan.searchRows(page)).toHaveCount(11)"))
  // Cancelled whatever happens, by the IT head through the round route (never a DELETE).
  assert.match(spec, /\} finally \{\n\s+await rounds\.cancelAsItHead\(playwright\.request, baseURL, round\.id, /)
})
```

`tests/e2e-fixes.test.ts` is not edited here: Task 5 rewrote `:279` for "ถ่ายรูป / เพิ่มหมายเหตุ", and the rewritten mismatch block keeps that line.

- [ ] **Step 2: Run the guard tests to see them fail**

Run: `node --test tests/e2e-audit.test.ts tests/e2e-fixes.test.ts`
Expected: FAIL.
- The first test passes once `audit-plan.ts` and `audit-data.ts` hold Step 1's lines.
- EA2 fails:
  - the spec still calls `findAndOpen(page, assets.matched.tag, assets.matched.tag)`;
  - it reads "เดินตรวจต่อ (7)".
- EA3 has no settled footer link.
- Block 4 still pins 7 and 5.
- The new test fails: `scan-steps.ts` exports none of the new helpers, and the walk has none of the new steps.
- The search spec's test fails: `e2e/audit/walk-search.spec.ts` does not exist yet (Step 4 writes it).
- `e2e-fixes` passes already (Task 5's `:279`).

- [ ] **Step 3: Rewrite the walk's helpers**

`e2e/audit/scan-steps.ts`. The whole file becomes:

```ts
// The steps a person takes on the audit scan page (/th/audit/rounds/<id>/scan, group 2 spec §11, §12), with the words on
// screen (messages/th.json auditScan; the walk's new words in ./scan-words.ts): pick or clear the room, read the switch
// and the category chips, type a name or a tag, open the check, answer ตรง or ไม่ตรง per field and choose what was
// found, add a photo, save, and read the banner. On a phone the check is a bottom sheet, on the desktop a panel beside
// the list; both hold the same form ([data-audit-check-form]).
import type { Locator, Page, Request, Response } from "@playwright/test"
import { expect } from "../support/fixtures.ts"
import { fillTemplate } from "../shell/shell-words.ts"
import { SCAN_WORDS } from "./scan-words.ts"

export const checkForm = (page: Page): Locator => page.locator("[data-audit-check-form]")
export const savedBanner = (page: Page): Locator => page.locator("[data-audit-scan-saved]")
export const offlineBar = (page: Page): Locator => page.locator("[data-audit-scan-offline]")
export const shellBanner = (page: Page): Locator => page.locator("[data-shell-banner]")
export const searchBox = (page: Page): Locator => page.getByLabel("ค้นหาทรัพย์สินในรอบนี้", { exact: true })

const formatted = (count: number) => count.toLocaleString("en-US")

// The room button: the chosen room's "<code> - <name>" with "ห้องนี้ตรวจแล้ว x / y · เหลือ z" and "เปลี่ยนห้อง" (bug 21),
// or "เลือกห้องที่กำลังตรวจ" with none.
export function roomButton(page: Page): Locator {
  return page.locator("[data-audit-scan-room]")
}

// The room sheet: opened by itself on the first visit of a round with several rooms, or from the room button. A room
// reads "<code> - <name>" (the round options of src/lib/audit-options.ts).
export async function pickRoom(page: Page, room: { code: string; name: string }) {
  const roomName = `${room.code} - ${room.name}`
  const sheet = page.getByRole("dialog", { name: "ห้องที่กำลังตรวจ" })
  if (!(await sheet.isVisible())) await roomButton(page).click()
  await expect(sheet).toBeVisible()
  await sheet.getByRole("button", { name: new RegExp(`^${escapeRegExp(roomName)}`) }).click()
  await expect(sheet).toBeHidden()
  await expect(roomButton(page)).toContainText(roomName)
}

// "ไม่เลือกห้อง": the walk reads the whole round. The empty choice is stored, so the sheet does not open by itself again.
export async function clearRoom(page: Page) {
  const sheet = page.getByRole("dialog", { name: "ห้องที่กำลังตรวจ" })
  await roomButton(page).click()
  await expect(sheet).toBeVisible()
  await sheet.getByRole("button", { name: SCAN_WORDS.roomClear, exact: true }).click()
  await expect(sheet).toBeHidden()
  await expect(roomButton(page)).toContainText(SCAN_WORDS.roomPick)
}

// The header's counts (spec §11): "x / y" over "ไม่ตรง N", of the round's own items (P3-R1, P3-R2).
export function progress(page: Page): Locator {
  return page.locator("[data-audit-scan-progress]")
}

// The switch: ยังไม่ตรวจ / ตรวจแล้ว / ทั้งห้อง (ทั้งรอบ with no room), each with its count (P3-R7). It stays above the
// search results.
export function tabs(page: Page): Locator {
  return page.getByRole("group", { name: SCAN_WORDS.tabsLabel, exact: true })
}

// Exactly these tabs in this order, each label with its count.
export async function expectTabs(page: Page, expected: readonly (readonly [string, number])[]) {
  await expect(tabs(page).getByRole("button")).toHaveText(expected.map(([label, count]) => new RegExp(`^${escapeRegExp(label)}\\s*${formatted(count)}$`)))
}

// The category chips under the switch (decision 3, P3-R6): toggle buttons, "ทุกหมวดหมู่" first (P3-R16), absent at one category.
export function categoryChips(page: Page): Locator {
  return page.getByRole("group", { name: SCAN_WORDS.categoryChipsLabel, exact: true })
}

// "ทุกหมวดหมู่ <all>", chosen, then one chip per category with these counts in this order (by count, P3-R6). The
// categories are the dev data's own, so a chip is read by its count and its place, never by its name.
export async function expectCategoryChips(page: Page, all: number, counts: readonly number[]) {
  const chips = categoryChips(page).getByRole("button")
  await expect(chips).toHaveText([new RegExp(`^${escapeRegExp(SCAN_WORDS.categoryAll)}\\s*${formatted(all)}$`), ...counts.map((count) => new RegExp(`\\D\\s*${formatted(count)}$`))])
  await expect(chips.first()).toHaveAttribute("aria-pressed", "true")
}

// The room list's rows: the round's own items of the room, the tab and the category.
export function roomRows(page: Page): Locator {
  return page.locator("[data-audit-scan-room-list] [data-audit-scan-row]")
}

// The ตรวจแล้ว tab's recorded out-of-scope finds, apart from the rows and the counts: a heading "บันทึกนอกขอบเขตแล้ว N"
// and one button per find with its "นอกขอบเขต" badge (P3-R25).
export function recordedFinds(page: Page): Locator {
  return page.locator("[data-audit-scan-room-list] [data-audit-scan-recorded-out-of-scope]")
}

// Type into the round's search once the last check has closed. On the phone the check is a modal sheet whose focus trap
// holds focus until its exit animation ends: text typed before that went nowhere in the rehearsal (phone-dark, note
// N-AU7), so the sheet must be gone first, and the box must hold the text.
export async function typeSearch(page: Page, text: string) {
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await searchBox(page).fill(text)
  await expect(searchBox(page)).toHaveValue(text)
}

// The search's results: one status line, then one list item per match shown.
export function searchResults(page: Page): Locator {
  return page.locator("[data-audit-scan-results]")
}

export function searchRows(page: Page): Locator {
  return searchResults(page).getByRole("listitem")
}

// The line names the words typed and counts every match, the chosen room's and the others' (bug 20, P3-R5).
export async function expectSearchLine(page: Page, term: string, inRoom: number, otherRooms: number) {
  await expect(searchResults(page).getByRole("status")).toHaveText(fillTemplate(SCAN_WORDS.searchLine, { term, inRoom: formatted(inRoom), otherRooms: formatted(otherRooms) }))
}

// Type a name or a tag as a person does, then open the result for the asset. The round holds one asset for each word the
// walk types (its own records): in the chosen room unless found says where. A tag typed whole is an exact code, so its
// item is the first result wherever its room is (P3-R17).
export async function findAndOpen(page: Page, typed: string, asset: { tag: string; name: string }, found = { inRoom: 1, otherRooms: 0 }) {
  await typeSearch(page, typed)
  await expectSearchLine(page, typed, found.inRoom, found.otherRooms)
  await searchRows(page).getByRole("button", { name: tagPattern(asset.tag) }).click()
  await expect(checkForm(page)).toBeVisible()
  await expect(checkHeading(page, asset)).toBeVisible()
}

// The check's heading, the asset's name (bug 23): the sheet's title on a phone, the panel's heading on the desktop.
export function checkHeading(page: Page, asset: { name: string }): Locator {
  return page.getByRole("heading", { name: asset.name, exact: true })
}

// The check's fields, as the scan route compares them; a field the asset's ownership does not compare is not shown
// (bug 22: custodian for a non-personal asset, location for a licence).
export type CheckFieldKey = "location" | "custodian" | "department" | "condition"

export function checkField(page: Page, field: CheckFieldKey): Locator {
  return checkForm(page).locator(`[data-audit-check-field="${field}"]`)
}

// The field's ตรง / ไม่ตรง (spec §12). Exact: "ตรง" is a part of "ไม่ตรง".
export function fieldAnswer(page: Page, field: CheckFieldKey, answer: "match" | "mismatch"): Locator {
  return checkField(page, field).getByRole("button", { name: answer === "match" ? SCAN_WORDS.fieldMatch : SCAN_WORDS.fieldMismatch, exact: true })
}

// "ที่พบ": the searchable select ไม่ตรง opens; its name is the label, then the chosen value.
export function foundSelect(page: Page, field: CheckFieldKey): Locator {
  return checkField(page, field).getByRole("button", { name: new RegExp(`^${escapeRegExp(SCAN_WORDS.foundValue)}`) })
}

// ไม่ตรง, then "ที่พบ": types the search and picks the option whose label starts with the text, or matches the pattern.
export async function chooseInCheckField(page: Page, field: CheckFieldKey, search: string, option: string | RegExp) {
  await fieldAnswer(page, field, "mismatch").click()
  await expect(fieldAnswer(page, field, "mismatch")).toHaveAttribute("aria-pressed", "true")
  await foundSelect(page, field).click()
  // Exact: the popover is not modal (decision DX4), so the top bar's "ค้นหาทั่วระบบ" stays reachable beside it.
  const searchInput = page.getByRole("combobox", { name: "ค้นหา", exact: true })
  await searchInput.fill(search)
  await page.getByRole("option", { name: typeof option === "string" ? new RegExp(`^${escapeRegExp(option)}`) : option }).click()
  await expect(checkField(page, field)).toHaveAttribute("data-mismatch", "true")
}

// The save button of the check names what it saves (saveAllMatch, saveMismatch, saveOutOfScope).
export const saveButton = (page: Page): Locator => checkForm(page).locator("[data-audit-check-actions]").getByRole("button", { name: /^บันทึก/ })

export async function addPhoto(page: Page, file: string) {
  await checkForm(page).locator('input[type="file"]').setInputFiles(file)
  await expect(checkForm(page).getByRole("list", { name: "รูปที่รออัปโหลด 1 รูป" })).toBeVisible()
}

// The check's saves of one asset (a POST of the scan route whose body names it), so a step can show it sent nothing.
export function watchScanPosts(page: Page, roundId: string, assetId: string): { posts: string[]; stop: () => void } {
  const posts: string[] = []
  const watch = (request: Request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === `/api/audit-rounds/${roundId}/scan` && request.postData()?.includes(`"assetId":"${assetId}"`)) posts.push(request.url())
  }
  page.on("request", watch)
  return { posts, stop: () => page.off("request", watch) }
}

// The next save's answer, then the status sync the page runs after an out-of-scope save (scan-status), so the next step
// reads the rows the server now holds, the find among them. The sync is awaited only once the save has answered, so an
// earlier poll never stands in for it.
export function nextScanSave(page: Page, roundId: string): { saved: Promise<Response>; synced: Promise<Response> } {
  const saved = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === `/api/audit-rounds/${roundId}/scan`)
  const synced = saved.then(() => page.waitForResponse((response) => new URL(response.url()).pathname === `/api/audit-rounds/${roundId}/scan-status`))
  return { saved, synced }
}

// Spec §11: the switch stays above the search results.
export async function expectAbove(upper: Locator, lower: Locator) {
  const [top, bottom] = await Promise.all([upper.boundingBox(), lower.boundingBox()])
  if (!top || !bottom) throw new Error("the switch or the results are not on screen")
  expect(top.y + top.height, "the upper one ends above the lower one").toBeLessThanOrEqual(bottom.y + 1)
}

// Spec §8: slow 4G on the phone's walk. WebKit has no network or CPU emulation, so each request of the page for a
// document, an RSC payload, a script, a style, a font or an image waits the round trip of a slow 4G link before it goes
// (latency only; the bandwidth is the machine's). The app's own API calls are left alone: WebKit cannot resend an
// intercepted request body when it retries on a fresh connection ("Send failed since rewinding of the data stream
// failed", rehearsal note N-AU8), and the app then queues the save as if offline. The CPU throttle of spec §8 is
// Chromium's (CDP) and is not applied on WebKit (ruling EA-R4).
export const SLOW_4G_ROUND_TRIP_MS = 150
export const isSlowedOnThePhone = (url: URL): boolean => !url.pathname.startsWith("/api/")
export async function slowNetwork(page: Page) {
  await page.route(isSlowedOnThePhone, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, SLOW_4G_ROUND_TRIP_MS))
    await route.fallback()
  })
}

// The phone keyboard covers the lower half of the screen (spec §8 "the keyboard-open height"): 390×360 is what is left
// above it. The check's pinned save bar must stay on screen with the focused field above it.
export const KEYBOARD_OPEN_VIEWPORT = { width: 390, height: 360 }

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// A row or a result that names this tag.
export const tagPattern = (tag: string): RegExp => new RegExp(escapeRegExp(tag))
```

- [ ] **Step 4: Rewrite the walk's steps in the field audit**

`e2e/audit/field-audit.spec.ts`:
- `:7-11` (items 2 and 3 of the header list) become:

```ts
// 2. IT staff walk room A by typing names and tags, from the round page's "เดินตรวจต่อ" (group 2 spec §8): the switch
//    and the category chips within the room and the tab, cleared on a room change, and a search with the room's items
//    first (group 2 spec §11); one matched, one mismatch (another department and the condition, with the photo the
//    condition asks for), a personal asset whose new custodian turns the department to ไม่ตรง, an asset of the other
//    room opened as a wrong room, a parent whose components are not all checked, an unknown and an out-of-scope
//    search, the find recorded again and still out of scope (spec §6.2.2, group 2 spec §12, §16);
// 3. in room B the header counts the round's own items only; the phone goes offline, saves a check, comes back and
//    sends it; one asset is marked not found from the pending list, whose room chips count its rows and whose dialog
//    names the asset (spec §6.2.2–3, group 2 spec §9, §11);
```

- After `:35` (the last import) add:

```ts
import { SCAN_WORDS as S } from "./scan-words.ts"
```

- `:130-258` (block 2, "IT staff walk room A") becomes the block below. The matched step, the mismatch block (the forced tap, the listbox and toast waits, the photo) and the parent keep their lines except where noted. Pinned at `tests/e2e-fixes.test.ts:243`, `:279`, `:377` and `tests/e2e-audit.test.ts:120-134`.

```ts
test.describe("IT staff walk room A", () => {
  asUser("itStaff")

  test("IT staff walk room A by typing: the switch and the category chips, a room-first search, matched, mismatch with its photo, a personal asset's custodian, a wrong room, a parent with components, an unknown, and an out-of-scope find recorded twice", async ({ page, measure, e2eDevice }, testInfo) => {
    test.setTimeout(420_000)
    const chain = readChain(testInfo.project.name)
    const { records, assets } = chain
    if (e2eDevice === "phone") await scan.slowNetwork(page)

    await measure.visit(`/th/audit/rounds/${chain.roundId}`, "round page")
    // Group 2 spec §8: the walk starts from the next-step card's main button; none of the round's eight items is checked yet.
    await roundPage.nextStepCard(page).getByRole("link", { name: fillTemplate(W.continueScan, { count: 8 }), exact: true }).click()
    await page.waitForURL(`**/th/audit/rounds/${chain.roundId}/scan**`)
    // Two rooms and none chosen yet: the room sheet opens by itself.
    await expect(page.getByRole("dialog", { name: "ห้องที่กำลังตรวจ" })).toBeVisible()
    await measure.recordPage("scan page with the room sheet")
    await scan.pickRoom(page, records.rooms.roomA)
    await measure.recordPage("scan page in room A")

    // Group 2 spec §11: the header names the way back and counts the round's eight; the room button reads what is done
    // in the room and what is left (bug 21); the switch counts room A's six waiting items, its third tab "ทั้งห้อง"
    // (P3-R7). A row shows the name and the code, the custodian, and the components.
    const runTags = `${readRunState().runId}-${records.code}-`
    await expect(page.getByRole("link", { name: S.backToRound, exact: true })).toHaveAttribute("href", new RegExp(`^/th/audit/rounds/${chain.roundId}(?:[?#]|$)`))
    await expect(scan.progress(page)).toContainText("0 / 8")
    await expect(scan.roomButton(page)).toContainText(fillTemplate(S.roomProgress, { checked: 0, total: 6, pending: 6 }))
    await expect(scan.roomButton(page)).toContainText(S.roomChange)
    await scan.expectTabs(page, [[S.tabPending, 6], [S.tabChecked, 0], [S.tabRoom, 6]])
    await expect(scan.roomRows(page)).toHaveCount(6)
    await expect(scan.roomRows(page).filter({ hasText: assets.parent.tag })).toContainText(fillTemplate(S.componentCount, { count: 2 }))
    await expect(scan.roomRows(page).filter({ hasText: assets.personal.tag })).toContainText(readRunData().employees.receiver1.fullNameTh)

    // The category chips (decision 3, P3-R6): "ทุกหมวดหมู่" first, then the room's categories by count (four desktops, two
    // components). The component chip narrows the rows to the two components. Any room change clears it: room B
    // holds one category, so it shows no chips, and all of its rows; with no room the switch reads "ทั้งรอบ" over the
    // round's eight and the chips count them; back in room A the chips start from "ทุกหมวดหมู่" again.
    await scan.expectCategoryChips(page, 6, [4, 2])
    await recordSettled(page, measure, "scan page in room A with its category chips")
    await scan.categoryChips(page).getByRole("button").nth(2).click()
    await expect(scan.roomRows(page)).toHaveCount(2)
    for (const asset of [assets.component1, assets.component2]) await expect(scan.roomRows(page).filter({ hasText: asset.tag })).toHaveCount(1)
    await scan.pickRoom(page, records.rooms.roomB)
    await expect(scan.categoryChips(page)).toHaveCount(0)
    await scan.expectTabs(page, [[S.tabPending, 2], [S.tabChecked, 0], [S.tabRoom, 2]])
    await expect(scan.roomRows(page)).toHaveCount(2)
    await scan.clearRoom(page)
    await scan.expectTabs(page, [[S.tabPending, 8], [S.tabChecked, 0], [S.tabRound, 8]])
    await scan.expectCategoryChips(page, 8, [6, 2])
    await expect(scan.roomRows(page)).toHaveCount(8)
    await scan.categoryChips(page).getByRole("button").nth(2).click()
    await expect(scan.roomRows(page)).toHaveCount(2)
    await scan.pickRoom(page, records.rooms.roomA)
    await scan.expectCategoryChips(page, 6, [4, 2])
    await scan.expectTabs(page, [[S.tabPending, 6], [S.tabChecked, 0], [S.tabRoom, 6]])
    await expect(scan.roomRows(page)).toHaveCount(6)

    // The search (spec §11, bug 20, P3-R5): the project's own prefix finds the round's eight; room A's six come first,
    // then room B's two, the line counts both, all eight show (no "แสดงเพิ่ม" below eleven), and the switch stays
    // above the results.
    await scan.typeSearch(page, runTags)
    await scan.expectSearchLine(page, runTags, 6, 2)
    const found = scan.searchRows(page)
    await expect(found).toHaveCount(8)
    const roomATags = [assets.matched, assets.mismatch, assets.personal, assets.parent, assets.component1, assets.component2].map((asset) => asset.tag)
    const roomBTags = [assets.notFound, assets.offline].map((asset) => asset.tag)
    const order = (await found.allTextContents()).map((text) => [...roomATags, ...roomBTags].find((tag) => text.includes(tag)) ?? text)
    expect(order.slice(0, 6).sort(), "room A's items first").toEqual([...roomATags].sort())
    expect(order.slice(6).sort(), "then the other room's").toEqual([...roomBTags].sort())
    await expect(scan.searchResults(page).getByRole("button", { name: S.showMore, exact: true })).toHaveCount(0)
    await scan.expectAbove(scan.tabs(page), found.first())
    await recordSettled(page, measure, "search in room A, the room's items first")

    // Matched: found by its tag, every field as the system has it. A first scan asks one question, and a shared asset's
    // custodian is never compared, so its row is not shown (spec §12, bug 22).
    await scan.findAndOpen(page, assets.matched.tag, assets.matched)
    await expect(scan.saveButton(page)).toHaveText("บันทึก · ตรงทุกข้อ")
    await expect(scan.checkForm(page).getByText(S.firstScanHint, { exact: true })).toBeVisible()
    for (const field of ["location", "department", "condition"] as const) await expect(scan.checkField(page, field)).toHaveCount(1)
    await expect(scan.checkField(page, "custodian")).toHaveCount(0)
    await measure.recordPage("check of the matched asset")
    if (e2eDevice === "phone") {
      // The keyboard opens over the sheet for the note: the note stays above the pinned save bar, and the bar on screen.
      await scan.checkForm(page).getByRole("button", { name: "ถ่ายรูป / เพิ่มหมายเหตุ" }).click()
      const note = scan.checkForm(page).getByLabel("หมายเหตุผู้ตรวจ")
      await note.click()
      await page.setViewportSize(scan.KEYBOARD_OPEN_VIEWPORT)
      await expect(note).toBeFocused()
      await expect(note).toBeInViewport()
      await expect(scan.saveButton(page)).toBeInViewport({ ratio: 1 })
      await measure.recordPage("check of the matched asset, keyboard open")
      await page.setViewportSize(PHONE.viewport)
    }
    await measure.timed("save matched", async () => {
      await scan.saveButton(page).click()
      await expect(scan.savedBanner(page)).toContainText(`${assets.matched.tag} บันทึกแล้ว · ตรงทุกข้อ`)
    })

    // Mismatch: found by a word of its name; it stands in another department and its condition is worse, so the save
    // waits for a photo and its reason names both (N-AU1: a department or location mismatch needs a photo too). A tap
    // on the waiting save opens the note-and-photo section (finding AU2, decided DX5 (ก)), and the person adds it there.
    await scan.findAndOpen(page, "เครื่องพิมพ์", assets.mismatch)
    const runDepartment = runRecords(readRunState().runId).department.code
    await scan.chooseInCheckField(page, "department", runDepartment, `${runDepartment} - `)
    await scan.chooseInCheckField(page, "condition", "พอใช้", "พอใช้")
    await expect(scan.saveButton(page)).toHaveText("บันทึก · ไม่ตรง 2 ข้อ (แผนก, สภาพ)")
    await expect(scan.saveButton(page)).toHaveAttribute("aria-disabled", "true")
    await expect(scan.checkForm(page).getByText("ข้อมูลไม่ตรง ต้องแนบรูปก่อนบันทึก")).toBeVisible()
    // Playwright waits for an aria-disabled button to be enabled, so the tap is forced; it is still a real pointer
    // event at the button's centre, which pointer-events: none would hand to whatever lies under it. A forced tap skips
    // the check that nothing covers the button, so it waits until the condition's list has closed: in Task 51's third
    // run the tap landed on the closing list's "ดี" and changed the condition instead.
    await expect(page.getByRole("listbox")).toHaveCount(0)
    await settleToasts(page)
    await scan.saveButton(page).click({ force: true })
    await expect(scan.checkForm(page).getByRole("button", { name: "ถ่ายรูป / เพิ่มหมายเหตุ" })).toHaveAttribute("aria-expanded", "true")
    await scan.addPhoto(page, fromRoot("e2e/fixtures/photo.png"))
    await expect(scan.saveButton(page)).not.toHaveAttribute("aria-disabled", "true")
    await recordSettled(page, measure, "check of the mismatch with its photo")
    const photoUploaded = page.waitForResponse((response) => response.url().endsWith(`/api/assets/${assets.mismatch.id}/attachments`) && response.request().method() === "POST")
    await measure.timed("save the mismatch with its photo", async () => {
      await scan.saveButton(page).click()
      await expect(scan.savedBanner(page)).toContainText(`${assets.mismatch.tag} บันทึกแล้ว · ไม่ตรง: แผนก, สภาพ`)
      expect((await photoUploaded).status(), "the photo is uploaded after the save").toBe(201)
    })

    // A personal asset (P3-R15): its custodian is compared, so all four fields show. "ไม่ตรง" with nothing found chosen
    // asks for it under the field and moves focus there, sending nothing (spec §12); the save label already counts the
    // pressed row (P3-R22). A new custodian turns the department to ไม่ตรง, that person's department (N-AU1), and the
    // save then waits for a photo. Tapping ตรง on the custodian undoes both (P3-R8), and the asset saves as matched, so
    // the walk's findings stay the five of block 6.
    const personalPosts = scan.watchScanPosts(page, chain.roundId, assets.personal.id)
    await scan.findAndOpen(page, "โน้ตบุ๊ก", assets.personal)
    for (const field of ["location", "custodian", "department", "condition"] as const) await expect(scan.checkField(page, field)).toHaveCount(1)
    await scan.fieldAnswer(page, "condition", "mismatch").click()
    await expect(scan.saveButton(page)).toHaveText("บันทึก · ไม่ตรง 1 ข้อ (สภาพ)")
    await scan.saveButton(page).click()
    await expect(scan.checkField(page, "condition").getByText(S.chooseFoundValue, { exact: true })).toBeVisible()
    await expect(scan.foundSelect(page, "condition")).toBeFocused()
    expect(personalPosts.posts, "a ไม่ตรง with nothing found sends nothing").toEqual([])
    await scan.fieldAnswer(page, "condition", "match").click()
    await expect(scan.checkField(page, "condition").getByText(S.chooseFoundValue, { exact: true })).toHaveCount(0)
    const receiver = readRunData().employees.receiver2
    const runDepartmentPlace = runRecords(readRunState().runId).department
    // The custodian's options read the department after the name (P3-R10).
    await scan.chooseInCheckField(page, "custodian", receiver.code, new RegExp(`^${scan.escapeRegExp(`${receiver.code} - ${receiver.fullNameTh} · `)}.*${scan.escapeRegExp(runDepartmentPlace.name)}`))
    const department = scan.checkField(page, "department")
    await expect(scan.fieldAnswer(page, "department", "mismatch")).toHaveAttribute("aria-pressed", "true")
    await expect(department).toHaveAttribute("data-mismatch", "true")
    await expect(department.getByText(S.departmentFollowsCustodian, { exact: true })).toBeVisible()
    await expect(scan.foundSelect(page, "department")).toContainText(`${runDepartmentPlace.code} - ${runDepartmentPlace.name}`)
    await expect(scan.saveButton(page)).toHaveText("บันทึก · ไม่ตรง 2 ข้อ (ผู้ถือครอง, แผนก)")
    await expect(scan.saveButton(page)).toHaveAttribute("aria-disabled", "true")
    await expect(scan.checkForm(page).getByText(S.photoRequiredPlacement)).toBeVisible()
    await recordSettled(page, measure, "check of the personal asset, the department following the new custodian")
    await scan.fieldAnswer(page, "custodian", "match").click()
    await expect(scan.fieldAnswer(page, "department", "match")).toHaveAttribute("aria-pressed", "true")
    await expect(department.getByText(S.departmentFollowsCustodian, { exact: true })).toHaveCount(0)
    await expect(scan.saveButton(page)).toHaveText("บันทึก · ตรงทุกข้อ")
    await expect(scan.saveButton(page)).not.toHaveAttribute("aria-disabled", "true")
    await measure.timed("save the personal asset", async () => {
      await scan.saveButton(page).click()
      await expect(scan.savedBanner(page)).toContainText(`${assets.personal.tag} บันทึกแล้ว · ตรงทุกข้อ`)
    })
    personalPosts.stop()
    expect(personalPosts.posts, "saved once, as matched").toHaveLength(1)

    // A room-B asset opened from room A (spec §12): the walked room is not where the system has it, so the location opens
    // as ไม่ตรง with room A found and room B as the system's, and the save names it. Closed with "ไม่ใช่ชิ้นนี้", it
    // sends nothing; block 3 marks it not found.
    const roomBPosts = scan.watchScanPosts(page, chain.roundId, assets.notFound.id)
    await scan.findAndOpen(page, assets.notFound.tag, assets.notFound, { inRoom: 0, otherRooms: 1 })
    const location = scan.checkField(page, "location")
    await expect(scan.fieldAnswer(page, "location", "mismatch")).toHaveAttribute("aria-pressed", "true")
    await expect(location).toHaveAttribute("data-mismatch", "true")
    await expect(scan.foundSelect(page, "location")).toContainText(`${records.rooms.roomA.code} - ${records.rooms.roomA.name}`)
    await expect(location).toContainText(`${records.rooms.roomB.code} - ${records.rooms.roomB.name}`)
    await expect(scan.saveButton(page)).toHaveText("บันทึก · ไม่ตรง 1 ข้อ (ที่ตั้ง)")
    await recordSettled(page, measure, "check of an asset of the other room")
    await scan.checkForm(page).getByRole("button", { name: S.notThisOne, exact: true }).click()
    await expect(scan.checkForm(page)).toHaveCount(0)
    roomBPosts.stop()
    expect(roomBPosts.posts, "nothing is sent for the other room's asset").toEqual([])

    // A parent with two installed components: one confirmed with the parent; saving the parent asks first while the
    // other is unchecked, and cancelling sends nothing; the other is then marked missing from its own "ไม่พบ" beside
    // "พบ" (spec §12), and the parent saves. "พบ <tag>" is exact: it is a part of "ไม่พบ <tag>".
    await scan.findAndOpen(page, assets.parent.tag, assets.parent)
    const components = scan.checkForm(page).locator("[data-audit-component-row]")
    await expect(scan.checkForm(page).getByRole("heading", { name: "ส่วนควบ 2 ชิ้น" })).toBeVisible()
    await expect(components).toHaveCount(2)
    await measure.recordPage("check of the parent with its components")
    await components.filter({ hasText: assets.component1.tag }).getByRole("button", { name: `พบ ${assets.component1.tag}`, exact: true }).click()
    await expect(page.getByText("ยืนยันส่วนควบกับทรัพย์สินหลักแล้ว")).toBeVisible()
    await expect(components.filter({ hasText: assets.component1.tag })).toContainText("ยืนยันกับทรัพย์สินหลัก")
    await expect(scan.checkForm(page).getByText("ส่วนควบตรวจแล้ว 1 / 2")).toBeVisible()
    const parentScans: string[] = []
    const watchParent = (request: { url(): string; method(): string; postData(): string | null }) => {
      if (request.method() === "POST" && request.url().endsWith(`/api/audit-rounds/${chain.roundId}/scan`) && request.postData()?.includes(`"assetId":"${assets.parent.id}"`)) parentScans.push(request.url())
    }
    page.on("request", watchParent)
    await scan.saveButton(page).click()
    const ask = page.getByRole("alertdialog", { name: "ส่วนควบยังตรวจไม่ครบ 1 ชิ้น" })
    await expect(ask).toBeVisible()
    await recordSettled(page, measure, "the parent's save asks about the unchecked component")
    await ask.getByRole("button", { name: "ยกเลิก" }).click()
    await expect(ask).toBeHidden()
    expect(parentScans, "cancelling the question sends nothing").toEqual([])
    await components.filter({ hasText: assets.component2.tag }).getByRole("button", { name: `${S.componentNotFound} ${assets.component2.tag}`, exact: true }).click()
    const missing = page.getByRole("dialog", { name: "บันทึกส่วนควบที่ไม่พบ" })
    await expect(missing).toBeVisible()
    await recordSettled(page, measure, "component missing dialog")
    await missing.getByRole("button", { name: "ยืนยันว่าไม่พบส่วนควบ" }).click()
    await expect(page.getByText("บันทึกว่าไม่พบส่วนควบแล้ว")).toBeVisible()
    await expect(missing).toBeHidden()
    await expect(scan.checkForm(page).getByText("ส่วนควบตรวจแล้ว 1 / 2")).toHaveCount(0)
    await measure.timed("save the parent", async () => {
      await scan.saveButton(page).click()
      await expect(scan.savedBanner(page)).toContainText(`${assets.parent.tag} บันทึกแล้ว · ตรงทุกข้อ`)
    })
    await expect(ask).toBeHidden()
    page.off("request", watchParent)
    expect(parentScans, "the parent is saved once, with no question").toHaveLength(1)

    // An unknown tag: not in the round, not in the register.
    await scan.typeSearch(page, records.unknownTag)
    await page.getByRole("button", { name: "ค้นในทะเบียนทั้งหมด" }).click()
    await expect(page.getByText("ไม่พบรหัสนี้ในทะเบียน · ตรวจตัวสะกดหรือพิมพ์ Serial")).toBeVisible()
    await recordSettled(page, measure, "unknown tag")

    // An asset of the run's department standing in room A: outside the round's scope, recorded as such. The page then
    // syncs its rows, the find among them.
    await scan.typeSearch(page, assets.outOfScope.tag)
    await page.getByRole("button", { name: "ค้นในทะเบียนทั้งหมด" }).click()
    await expect(page.getByText(`${assets.outOfScope.tag} ไม่อยู่ในขอบเขตรอบนี้`)).toBeVisible()
    await page.getByRole("button", { name: "บันทึกเป็นนอกขอบเขต" }).click()
    await expect(scan.checkHeading(page, assets.outOfScope)).toBeVisible()
    await expect(scan.checkForm(page).getByText("นอกขอบเขตรอบนี้")).toBeVisible()
    await expect(scan.saveButton(page)).toHaveText("บันทึกนอกขอบเขต")
    await recordSettled(page, measure, "check of the out-of-scope asset")
    const first = scan.nextScanSave(page, chain.roundId)
    await measure.timed("save out of scope", async () => {
      await scan.saveButton(page).click()
      await expect(scan.savedBanner(page)).toContainText(`${assets.outOfScope.tag} บันทึกเป็นนอกขอบเขตแล้ว`)
    })
    expect((await first.saved).status(), "the first out-of-scope save").toBe(202)
    await first.synced

    // The find again (P3-R3, P3-R1): the round's own items hold no out-of-scope find, so the search finds nothing in the
    // round, and the register answers that it was recorded out of scope: its sheet opens at once, with no first-record
    // card (Task 4), every row as recorded (P3-R21: room A, its master room, so nothing reads ไม่ตรง), and nothing
    // changes, so no photo is asked (P3-R18). The save keeps it out of scope (block 4 reads นอกขอบเขต 1 and ทั้งหมด 8
    // on the round page, P3-R23).
    await scan.typeSearch(page, assets.outOfScope.tag)
    await expect(scan.searchRows(page)).toHaveCount(0)
    await page.getByRole("button", { name: "ค้นในทะเบียนทั้งหมด" }).click()
    await expect(scan.checkHeading(page, assets.outOfScope)).toBeVisible()
    await expect(page.getByRole("button", { name: "บันทึกเป็นนอกขอบเขต" })).toHaveCount(0)
    await expect(scan.checkForm(page).getByText(S.outOfScopeRecorded)).toBeVisible()
    await expect(scan.checkForm(page).locator('[data-mismatch="true"]')).toHaveCount(0)
    await expect(scan.saveButton(page)).toHaveText("บันทึกนอกขอบเขต")
    await expect(scan.saveButton(page)).not.toHaveAttribute("aria-disabled", "true")
    await recordSettled(page, measure, "check of the out-of-scope find, recorded before")
    const again = scan.nextScanSave(page, chain.roundId)
    await measure.timed("save the out-of-scope find again", async () => {
      await scan.saveButton(page).click()
      await expect(scan.savedBanner(page)).toContainText(`${assets.outOfScope.tag} บันทึกเป็นนอกขอบเขตแล้ว`)
    })
    const response = await again.saved
    expect(response.status(), "the second save answers 200 with the item (P3-R24)").toBe(200)
    expect(await response.json(), "it stays out of scope (P3-R3)").toMatchObject({ status: "out_of_scope", auditResult: "out_of_scope" })
    await again.synced

    // Every own item of room A is checked, the find synced in: the switch and the chips count the ตรวจแล้ว tab (four
    // desktops, two components; the find is none of the room's rows), and the empty ยังไม่ตรวจ tab shows no chips (P3-R6).
    // The find is listed apart at the end of the ตรวจแล้ว tab, with its นอกขอบเขต badge, counted in none of the tabs (P3-R25).
    await scan.typeSearch(page, "")
    await scan.tabs(page).getByRole("button", { name: new RegExp(`^${S.tabChecked}`) }).click()
    await scan.expectTabs(page, [[S.tabPending, 0], [S.tabChecked, 6], [S.tabRoom, 6]])
    await scan.expectCategoryChips(page, 6, [4, 2])
    await expect(scan.roomRows(page)).toHaveCount(6)
    await expect(scan.roomRows(page).filter({ hasText: assets.outOfScope.tag })).toHaveCount(0)
    await expect(scan.recordedFinds(page).getByRole("heading")).toHaveText(fillTemplate(S.recordedOutOfScope, { count: 1 }))
    await expect(scan.recordedFinds(page).getByRole("button", { name: scan.tagPattern(assets.outOfScope.tag) })).toContainText(S.badgeOutOfScope)
    await recordSettled(page, measure, "room A, every item checked")
    await scan.tabs(page).getByRole("button", { name: new RegExp(`^${S.tabPending}`) }).click()
    await expect(scan.categoryChips(page)).toHaveCount(0)
  })
})
```

- Block 3:
  - `:270-273` become:

```ts
    await measure.visit(`/th/audit/rounds/${chain.roundId}/scan`, "scan page")
    await scan.pickRoom(page, records.rooms.roomB)
    // Own items only (P3-R1, P3-R2): the out-of-scope find is an item of the round but not one of its own, so after a
    // fresh load the header reads the walk's 6 of 8 with its one mismatch, room B's button its two waiting, and room
    // B's one category shows no chips.
    await expect(scan.progress(page)).toContainText("6 / 8")
    await expect(scan.progress(page)).toContainText(fillTemplate(S.progressMismatch, { count: 1 }))
    await expect(scan.roomButton(page)).toContainText(fillTemplate(S.roomProgress, { checked: 0, total: 2, pending: 2 }))
    await expect(scan.categoryChips(page)).toHaveCount(0)
    const list = page.locator("[data-audit-scan-room-list]")
    const offlineRow = list.getByRole("button", { name: scan.tagPattern(assets.offline.tag) })
```

  - `:283`: `scan.checkHeading(page, assets.offline.tag)` becomes `scan.checkHeading(page, assets.offline)`.
  - `:297-303` become:

```ts
    await scan.tabs(page).getByRole("button", { name: /^ตรวจแล้ว/ }).click()
    // The offline item saved as matched: its badge reads พบตรง, the round page's word (P3-R19).
    await expect(list.getByRole("button", { name: scan.tagPattern(assets.offline.tag) })).toContainText(S.badgeFound)

    // Not found: from the room's pending list, the in-app dialog, no remark needed. The footer counts room B's own
    // item still waiting and opens the list with the room (P3-R14); the page finishes its requests first, so WebKit
    // raises no page error for one the navigation cancels (E2E-1027C). The link line is Task 3's, word for word.
    await scan.tabs(page).getByRole("button", { name: /^ยังไม่ตรวจ/ }).click()
    await roundPage.settlePageRequests(page)
    await page.getByRole("link", { name: "ของในห้องนี้ที่ยังหาไม่เจอ 1 รายการ →" }).click()
    await page.waitForURL(`**/th/audit/rounds/${chain.roundId}/pending**`)
```

The rest of block 3 (`:304-326`) stays.

- Block 4:
  - `:341-345` become:

```ts
    // The result chips (group 2 spec §8, P2-R2, P2-R3): the round's 8 items are พบตรง 5 (A1, A3, P1, C1, A5) + ไม่ตรง 1
    // (A2) + ไม่พบ 2 (A4, C2) + รอตรวจ 0; the out-of-scope find X1 apart, still after its second save (P3-R3); รอพิจารณา
    // counts the 4 items with a finding still waiting (A2, C2, A4, X1). Each chip opens rows of its count.
    const results = roundPage.resultChips(page)
    await roundPage.expectChips(results, [[W.resultAll, 8], [W.resultPending, 0], [W.resultFound, 5], [W.resultMismatch, 1], [W.resultNotFound, 2], [W.resultOutOfScope, 1], [W.resultPendingReview, 4]])
```

  - `:348-351` become:

```ts
    // The category chips count within the result in use (decision 2): six desktops and two components in all, one of
    // each among the not-founds (A4, C2). Each chip opens rows of its count.
    const categories = roundPage.categoryChips(page)
    await roundPage.expectChip(categories, `categoryId=${masters.categoryDesktop}`, 6)
```

`:352-406` stay. Step 2's "รอ 5" holds: A3 makes no finding.

`e2e/audit/walk-search.spec.ts` (new; spec §16 "Phone walk": the search offers "แสดงเพิ่ม" past 10, P3-R15). The walk's chain stays at 8 items (P3-R23), so this runs on its own round, the way `e2e/audit/rounds-list.spec.ts` does:

```ts
// The phone walk's search past ten (group 2 spec §16, "Phone walk (phone projects)": the search offers "แสดงเพิ่ม" past
// 10; P3-R15). Phone projects only, the phone on WebKit as the field audit's walk. The walk's own round has 8 items
// (P3-R23), so the test opens its own round on its own room of eleven assets whose tags share one search word, and the
// IT head cancels the round whatever happens (spec §16: never on a first page or a global count).
import { asUser, expect, runPhoneOnWebKit, test } from "../support/fixtures.ts"
import { createAssets, createRoom, readAssetChoices, recordPrefix } from "../disposal/disposal-support.ts"
import { bangkokDate } from "../transactions/tx-plan.ts"
import * as rounds from "./round-steps.ts"
import * as scan from "./scan-steps.ts"
import { SCAN_WORDS as S } from "./scan-words.ts"

runPhoneOnWebKit()
asUser("itStaff")

test("the phone walk's search shows ten matches with แสดงเพิ่ม, and the press shows the eleventh (group 2 spec §16, P3-R15)", async ({ page, measure, e2eDevice, playwright, baseURL }, testInfo) => {
  test.skip(e2eDevice !== "phone", "the phone walk's search (spec §16: phone projects)")
  test.setTimeout(240_000)
  const prefix = recordPrefix(testInfo, "AUW")
  const roomCode = `${prefix}-R`
  const roomName = `${prefix} ห้องทดสอบค้นหาเดินตรวจ`
  const roomId = await createRoom(roomCode, roomName)
  const choices = await readAssetChoices(page, measure)
  // Eleven tags that share the search word "<prefix>-W"; none is the word whole, so no exact code goes first (P3-R17).
  const tags = Array.from({ length: 11 }, (_, index) => `${prefix}-W${String(index + 1).padStart(2, "0")}`)
  const assets = await createAssets(page, choices, roomId, tags)
  // The body the form sends (spec §7: no status).
  const opened = await page.request.post("/api/audit-rounds", {
    data: {
      name: `${prefix} รอบทดสอบค้นหาเดินตรวจ`,
      auditYear: Number(bangkokDate().slice(0, 4)),
      scopeLocationId: roomId,
      includeClosedAssets: false,
      riskPreset: "all",
      sampleRate: 100,
      startDate: bangkokDate(),
      endDate: bangkokDate(10),
    },
  })
  expect(opened.status(), await opened.text()).toBe(201)
  const round = (await opened.json()) as { id: string; auditNo: string; generatedItems: number }
  expect(round.generatedItems, "the room's eleven assets").toBe(11)
  const term = `${prefix}-W`
  try {
    await measure.visit(`/th/audit/rounds/${round.id}/scan`, "scan page, a round of eleven")
    await scan.pickRoom(page, { code: roomCode, name: roomName })
    await scan.typeSearch(page, term)
    await scan.expectSearchLine(page, term, 11, 0)
    const more = scan.searchResults(page).getByRole("button", { name: S.showMore, exact: true })
    await expect(scan.searchRows(page)).toHaveCount(10)
    await expect(more).toBeVisible()
    await measure.recordPage("search of eleven, ten shown with แสดงเพิ่ม")
    await more.click()
    await expect(scan.searchRows(page)).toHaveCount(11)
    await expect(more).toHaveCount(0)
    for (const asset of assets) await expect(scan.searchRows(page).filter({ hasText: asset.assetTag })).toHaveCount(1)
  } finally {
    await rounds.cancelAsItHead(playwright.request, baseURL, round.id, `${prefix} ยกเลิกรอบทดสอบค้นหาเดินตรวจ`)
  }
})
```
With one room in the round the room sheet does not open by itself (`roomOptions.length > 1`), so `pickRoom` opens it from the room button. The cancel goes through the round route as the IT head; nothing is deleted.

- [ ] **Step 5: Run the guard tests to see them pass**

Run: `node --test tests/e2e-audit.test.ts tests/e2e-fixes.test.ts tests/e2e-audit-rounds.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: no errors. tsconfig `include` covers `e2e/` and `tests/`. `AuditWalkData.assets` now has the `personal` key, and the chain JSON is written by block 1.

- [ ] **Step 6: Rewrite these pins**

Each is written in Step 1. These are the rewritten ones; the rest are additions:
- `tests/e2e-audit.test.ts`:
  - `:44-53`: the `where` map gains `personal: "roomA/round"`.
  - `:114-115`: `findAndOpen` takes the asset: `scan.findAndOpen(page, assets.matched.tag, assets.matched)` and `scan.findAndOpen(page, "เครื่องพิมพ์", assets.mismatch)`.
  - `:117`: "เดินตรวจต่อ (8)".
  - after `:178`: the settled footer link (an addition; Task 3's `:178` stays).
  - `:258`: the chips are `[W.resultAll, 8] … [W.resultFound, 5] …`.
  - `:260`: `["categoryDesktop", 6]`.
- Not rewritten here: `tests/e2e-audit.test.ts:108`, `:130` and `:178`, and `tests/e2e-fixes.test.ts:279` (Tasks 3 and 5 own them).

No `messages/*.json` change and no change file for `node scripts/messages-edit.mjs`. Tasks 3-5 add every word the steps read, and the Step 1 test checks them.

- [ ] **Step 7: Write the docs**

`docs/99_CHANGELOG.md`: under `## 2026-10-27` (`:7`), above `### หน้ารอบตรวจและรายการรอตรวจ (กลุ่มหน้า 2 แผน 2)` (`:9`), add this entry. If the commit date is later than 2026-10-27, put it under a new date heading above `:7` instead.

```md
### เดินสแกนบนมือถือและแผ่นบันทึกผลตรวจ (กลุ่มหน้า 2 แผน 3)

Branch `feat/group2-audit-phone-walk` (จาก `master` `0a7bb9ee`) · spec `docs/superpowers/specs/2026-10-26-page-group-2-audit-design.md` (§5, §11, §12, §13 ข้อ 20-23, §15, §16) · plan `docs/superpowers/plans/2026-10-27-group2-audit-phone-walk.md`

- **เดินสแกน:**
  - หัวหน้าจอ:
    - รหัสรอบอยู่บรรทัดแรก ชื่อรอบตัวเล็กอยู่บรรทัดที่สอง
    - ด้านขวามี "x / y" เหนือ "ไม่ตรง N"
    - ปุ่มกลับชื่อ "กลับไปหน้ารอบ"
  - ทุกจำนวนบนมือถือนับเฉพาะรายการของรอบ ไม่นับของนอกขอบเขต
  - "ไม่ตรง" นับแบบเดียวกับหน้ารอบ รายการที่ตรวจแล้วแต่ยังไม่มีผลนับเป็นไม่ตรง หน้ารอบ มือถือ และแดชบอร์ดจึงได้เลขเดียวกัน
  - ปุ่มห้อง:
    - อ่านว่า "ห้องนี้ตรวจแล้ว x / y · เหลือ z" และ "เปลี่ยนห้อง"
    - นับตามแผนกที่เลือกด้วย
  - ค้นหา:
    - ค้นทั้งรอบ รหัส Serial หรือรหัสบัญชีที่พิมพ์ครบขึ้นก่อนไม่ว่าอยู่ห้องไหน แล้วตามด้วยของในห้องที่เลือก
    - บรรทัด `ผลค้นหา "…": ในห้องนี้ N · ห้องอื่น M` บอกจำนวนจริง
    - แสดงทีละ 10 รายการ พร้อม "แสดงเพิ่ม"
    - แถบสถานะยังอยู่เหนือผลค้นหา
  - แถบสถานะ ยังไม่ตรวจ / ตรวจแล้ว / ทั้งห้อง (เป็น "ทั้งรอบ" เมื่อไม่ได้เลือกห้อง) มีจำนวนทุกแท็บ
  - ชิปหมวดหมู่ใต้แถบสถานะ:
    - "ทุกหมวดหมู่" ขึ้นก่อน (คำเดียวกับหน้ารอบ) ตามด้วยหมวดหมู่เรียงตามจำนวน
    - เลื่อนด้านข้างได้ และนับตามห้องและแท็บ
    - ล้างเมื่อเปลี่ยนห้อง ซ่อนเมื่อมีหมวดหมู่เดียว
    - ชื่อหมวดหมู่ที่ไม่รู้จักขึ้นว่า "หมวดหมู่อื่น"
  - แถวมีชื่อตัวหนา รหัสอยู่ใต้ชื่อ แล้วตามด้วยผู้ถือครองและ "ส่วนควบ N"
  - ป้ายผลของรายการที่พบอ่านว่า "พบตรง" เหมือนหน้ารอบ (เดิม "ตรวจแล้ว")
  - ท้ายแท็บตรวจแล้วมีส่วน "บันทึกนอกขอบเขตแล้ว N" แสดงของนอกขอบเขตที่บันทึกในห้องนั้น (หรือทั้งรอบเมื่อไม่ได้เลือกห้อง) พร้อมป้าย "นอกขอบเขต" และ "ตรวจโดย … เวลา" ไม่นับรวมในแท็บ แตะแล้วเปิดแผ่นบันทึกนอกขอบเขตของชิ้นนั้น (P3-R25)
  - กล่อง "เจอของที่ไม่อยู่ในรายการ? บันทึกนอกขอบเขต" พาไปช่องค้นหา พร้อมคำแนะนำ "พิมพ์รหัสหรือ Serial ของที่เจอ แล้วกดค้นทะเบียน"
  - ลิงก์ท้ายรายการ "ของในห้องนี้ที่ยังหาไม่เจอ N รายการ →" เปิดรายการรอตรวจของห้องนั้น
- **แผ่นบันทึกผลตรวจ:**
  - หัวข้อ:
    - เป็นชื่อทรัพย์สิน และขึ้นบรรทัดใหม่ได้
    - บรรทัดที่สองเป็น "รหัส · Serial …"
    - ของนอกขอบเขตก็มี Serial
  - แต่ละเรื่องมีค่าตามระบบกับปุ่ม ตรง / ไม่ตรง
    - กด "ไม่ตรง" แล้วจะมีช่อง "ที่พบ"
    - ค่าตามระบบถูกขีดฆ่าเมื่อไม่ตรง
  - กด "ไม่ตรง" แล้วยังไม่เลือกค่า:
    - บันทึกไม่ได้ ขึ้น "เลือกค่าที่พบ" ใต้ช่อง และพาไปที่ช่องนั้น
    - เลือกค่าเดียวกับระบบจะกลับเป็นตรง
    - กด "ตรง" จะคืนค่าตามระบบ
  - "ไม่มี / ไม่ระบุ" เลือกได้สำหรับผู้ถือครอง แผนก และสภาพ (ไม่มีสำหรับที่ตั้ง)
  - แก้ผลที่บันทึกแล้ว แต่ละเรื่องเปิดตามผลที่บันทึกไว้ เรื่องที่เคยบันทึกว่าต่างเปิดเป็น "ไม่ตรง" พร้อมค่าที่บันทึก
  - ปุ่มบันทึกนับเรื่องที่กด "ไม่ตรง" แม้ยังไม่เลือกค่า และค่าตามระบบที่ไม่อยู่ในรายการขึ้นว่า "ไม่อยู่ในรายการ" ไม่ขึ้นรหัส
  - รายชื่อผู้ถือครองบอกแผนกต่อท้ายชื่อ
  - ห้องที่เดินอยู่ไม่ใช่ห้องตามระบบ ที่ตั้งจะเปิดเป็น "ไม่ตรง"
  - ผู้ถือครองใหม่ทำให้แผนกเป็น "ไม่ตรง" พร้อมบรรทัด "ตามแผนกของผู้ถือครองที่พบ" เว้นแต่ตั้งแผนกเอง
  - ไม่แสดงเรื่องที่ไม่ได้เทียบ:
    - ผู้ถือครอง ของทรัพย์สินที่ไม่ใช่ประเภทบุคคล
    - ที่ตั้ง ของซอฟต์แวร์/License
  - คำแนะนำ "ตรงกับของจริงไหม แตะ ไม่ตรง เฉพาะเรื่องที่ต่าง" ขึ้นเฉพาะการตรวจครั้งแรก
  - ส่วนควบ:
    - มีปุ่ม "พบ" และ "ไม่พบ" คู่กัน
    - สแกน QR ย้ายไปไว้ในเมนู ⋯
  - ปุ่ม "ถ่ายรูป / เพิ่มหมายเหตุ" มีไอคอนกล้อง
  - ปุ่มบันทึกยังบอกชื่อเรื่องที่ไม่ตรง
  - ผลที่บันทึกยังเทียบที่เซิร์ฟเวอร์ตามกฎเดิม
- **นอกขอบเขต:**
  - สแกนของนอกขอบเขตที่บันทึกไว้แล้วซ้ำ ยังเป็นนอกขอบเขต ไม่กลายเป็นรายการของรอบ:
    - เทียบกับค่าตามระบบตอนบันทึกครั้งแรก
    - ต้องแนบรูปเฉพาะเรื่องที่ต่างจากค่าตามระบบและเปลี่ยนในการบันทึกครั้งนี้ แก้หมายเหตุอย่างเดียวไม่ต้องแนบรูปใหม่
    - การค้นในทะเบียนเปิดแผ่นบันทึกนอกขอบเขตทันที ไม่ผ่านการ์ด "ไม่อยู่ในขอบเขตรอบนี้" และตอบ 200 พร้อมรายการ
    - ยืนยันส่วนควบกับของนอกขอบเขต หรือกับเครื่องหลักที่เป็นของนอกขอบเขต ถูกปฏิเสธ
    - ไม่แก้ทะเบียน
    - บันทึกได้เฉพาะตอนออนไลน์
  - การค้นในทะเบียนตอบว่านอกขอบเขต พร้อมรายการเดิม แผ่นบันทึกบอก "บันทึกนอกขอบเขตไว้แล้ว · บันทึกตอนนี้จะเป็นการแก้"
  - หน้ารอบมี "แก้ไขผลตรวจ" ในแถวนอกขอบเขตอีกครั้ง ลิงก์เปิดแผ่นบันทึกนอกขอบเขต
- **ที่แก้:**
  - ผลค้นหาบนมือถือตัดที่ 10 รายการ แต่บรรทัดบอกว่าพบเท่านั้น
  - ปุ่มห้องอ่านกลับด้าน ("ยังไม่ตรวจ 4 / 18")
  - แก้ผู้ถือครองหรือที่ตั้งได้ในเรื่องที่ไม่เคยถูกเทียบ ผู้ถือครองที่แก้ยังพาแผนกเปลี่ยนตามจนเกิดรายการไม่ตรงเรื่องแผนก
  - หัวข้อแผ่นบันทึกถูกตัดเหลือบรรทัดเดียว
  - ของนอกขอบเขตที่สแกนซ้ำกลายเป็นรายการของรอบ และนับรวมในทุกตัวเลข
  - หัวหน้าจอมือถือนับของนอกขอบเขตเป็นรายการของรอบ
  - "ไม่ตรง" บนมือถือไม่ตรงกับหน้ารอบ
- **E2E:**
  - `e2e/audit/field-audit.spec.ts`:
    - ข้อมูลเดินตรวจมีทรัพย์สินประเภทบุคคลเพิ่ม 1 ชิ้น (A3 ผู้ถือครองคือผู้รับมอบ 1) รอบจึงมี 8 รายการ:
      - "เดินตรวจต่อ (8)"
      - หน้ารอบหลังเดินตรวจ ทั้งหมด 8 = พบตรง 5 + ไม่ตรง 1 + ไม่พบ 2 + รอตรวจ 0 · นอกขอบเขต 1 · รอพิจารณา 4
      - หมวดหมู่ 6 และ 2
    - ห้อง A:
      - ปุ่มกลับ ปุ่มห้อง และแถบสถานะ "ทั้งห้อง" / "ทั้งรอบ"
      - ชิปหมวดหมู่นับตามห้องและแท็บ และล้างเมื่อเปลี่ยนห้องทั้งจากแผ่นเลือกห้องและจาก "ไม่เลือกห้อง"
      - ค้นหาขึ้นของในห้องก่อน และนับทั้งสองกลุ่ม
    - แผ่นบันทึก:
      - ทรัพย์สินส่วนกลางไม่มีแถวผู้ถือครอง
      - "ไม่ตรง" ที่ยังไม่เลือกค่าขึ้น "เลือกค่าที่พบ" และไม่ส่งอะไร
      - ผู้ถือครองใหม่ทำให้แผนกไม่ตรง และ "ตรง" คืนทั้งสองอย่าง
      - เปิดของห้อง B ขณะอยู่ห้อง A ที่ตั้งขึ้นเป็นไม่ตรง
      - ส่วนควบใช้ปุ่ม "ไม่พบ" ข้างปุ่ม "พบ"
    - บันทึกของนอกขอบเขตซ้ำ แผ่นบันทึกเปิดทันทีตามที่บันทึกไว้ ตอบ 200 ยังเป็นนอกขอบเขต และไม่อยู่ในแถวหรือจำนวนของห้อง
    - ป้ายของรายการที่บันทึกตอนออฟไลน์อ่านว่า "พบตรง"
    - ห้อง B:
      - หลังโหลดหน้าใหม่ หัวหน้าจอนับ 6 / 8 และ "ไม่ตรง 1"
      - ลิงก์ "ของในห้องนี้ที่ยังหาไม่เจอ 1 รายการ →" รอให้คำขอของหน้าเงียบก่อนเปลี่ยนหน้า (WebKit)
  - `e2e/audit/walk-search.spec.ts` (มือถือเท่านั้น บน WebKit): สร้างห้องของตัวเองกับทรัพย์สิน 11 ชิ้นที่ค้นด้วยคำเดียวกัน เปิดรอบบนห้องนั้น ค้นแล้วขึ้น 10 รายการพร้อม "แสดงเพิ่ม" กดแล้วขึ้นครบ 11 จากนั้นหัวหน้า IT ยกเลิกรอบเสมอ (spec §16) · ข้อมูล dev เพิ่มรอบละ 11 ชิ้นต่อโปรเจกต์มือถือ
    - แท็บตรวจแล้วของห้อง A มี X1 ใต้ "บันทึกนอกขอบเขตแล้ว 1" พร้อมป้าย "นอกขอบเขต" และไม่อยู่ในแถวของห้อง
- **เรื่องที่ผู้ใช้ควรตรวจ (แผน 3):**
  - P3-R17: รหัส Serial หรือรหัสบัญชีที่พิมพ์ครบขึ้นก่อนแม้อยู่ห้องอื่น (spec §11 เขียนว่าของในห้องที่เลือกขึ้นก่อน) เพื่อให้ Enter เปิดชิ้นที่พิมพ์
  - P3-R25: ของนอกขอบเขตที่บันทึกแล้วไม่อยู่ในแท็บหรือผลค้นหา (spec §5 จำนวนเท่ากับรายการ) จึงย้ายไปเป็นส่วน "บันทึกนอกขอบเขตแล้ว N" ท้ายแท็บตรวจแล้ว พร้อมป้าย "นอกขอบเขต" ไม่นับรวมในแท็บ (Appendix A §11)
- **deploy:**
  - ยังไม่ deploy · ไม่มี migration
```

The controller adds the "ผล E2E" bullet after the targeted run (Step 10), between "E2E" and "deploy". Do not write a placeholder.

`docs/07_UAT_CHECKLIST.md` (each stays a `- [ ] ` item):
- `:115` becomes: "- [ ] After selecting an audit asset, confirm the sheet is titled with the asset's name (wrapping on a long name) with "รหัส · Serial …" under it, and shows one row per compared field with the system's value and ตรง / ไม่ตรง: ที่ตั้ง (none for a software licence), ผู้ถือครอง (personal assets only), แผนก and สภาพ."
- After `:141` add: "- [ ] Scan the same out-of-scope asset again (and open it from the round page's "แก้ไขผลตรวจ"): confirm the out-of-scope sheet opens with "บันทึกนอกขอบเขตไว้แล้ว · บันทึกตอนนี้จะเป็นการแก้", the save keeps it out of scope (the round page's นอกขอบเขต number is unchanged and ทั้งหมด does not grow), a field changed in this save asks for a photo and creates or updates its finding, a remark-only edit saves with no new photo, and the asset's master data does not change."
- A new section after Audit Round B UAT (`:426`), before `## Sign-Off` (`:428`):

```md
## Audit Phone Walk B UAT (2026-10-27)

The automated suite covers the phone walk and the record sheet in all four projects, the phone on WebKit (`e2e/audit/field-audit.spec.ts`), and "แสดงเพิ่ม" past ten on the phone projects (`e2e/audit/walk-search.spec.ts`). It checks:
- the switch's counts and its third tab;
- the category chips within the room and the tab, cleared on a room change;
- the room-first search, and ten results with "แสดงเพิ่ม" on a round of eleven;
- the recorded out-of-scope find listed apart on the ตรวจแล้ว tab with its "นอกขอบเขต" badge;
- the header and the room button counting the round's own items;
- a personal asset's custodian and department;
- a wrong room, and "ไม่ตรง" without a value;
- the components' "พบ" / "ไม่พบ";
- a second scan of an out-of-scope find.

A person still checks:

- [ ] On iPhone Safari and Android Chrome, one-handed, in both themes:
  - the sticky search;
  - the switch, and the chip row scrolling sideways inside itself, while the page never scrolls sideways;
  - ตรง / ไม่ตรง at 44px;
  - the sheet's title wrapping on a long asset name;
  - line 2 "รหัส · Serial …" on a long tag.
- [ ] A round where a search matches more than ten items:
  - the line counts every match, "ในห้องนี้ N · ห้องอื่น M";
  - ten show;
  - "แสดงเพิ่ม" adds ten more, the room's items first (a tag, serial or fixed asset code typed whole comes before them, wherever its room is).
- [ ] A room with several departments:
  - "ห้องนี้ตรวจแล้ว x / y · เหลือ z" follows the chosen department;
  - the footer "ของในห้องนี้ที่ยังหาไม่เจอ N รายการ →" equals the pending list it opens for that room.
- [ ] The category names:
  - a round whose category was made inactive after it opened shows that chip by its name, never an id;
  - a find another person records in a category the page did not load reads "หมวดหมู่อื่น".
- [ ] Tap "เจอของที่ไม่อยู่ในรายการ? บันทึกนอกขอบเขต":
  - the search takes focus, with "พิมพ์รหัสหรือ Serial ของที่เจอ แล้วกดค้นทะเบียน";
  - the find is recorded through "ค้นในทะเบียนทั้งหมด".
- [ ] A software licence has no ที่ตั้ง row, and a shared asset has no ผู้ถือครอง row. Neither save creates a finding for those fields.
- [ ] Editing a saved result opens each field as it was saved: a field saved ไม่ตรง opens ไม่ตรง with its saved value.
- [ ] The found badge reads "พบตรง" in the list and in the search results, and the first category chip reads "ทุกหมวดหมู่".
- [ ] Custodian:
  - "ไม่มี / ไม่ระบุ" can be chosen (on แผนก and สภาพ too, never on ที่ตั้ง);
  - each person's department shows after the name;
  - choosing a person moves แผนก with "ตามแผนกของผู้ถือครองที่พบ";
  - setting แผนก first keeps it.
- [ ] On the ตรวจแล้ว tab, "บันทึกนอกขอบเขตแล้ว N" lists the room's recorded out-of-scope finds (the round's with no room) with the "นอกขอบเขต" badge, the tab counts do not include them, and a tap opens the find's out-of-scope sheet.
- [ ] An out-of-scope find opened from the round page's ⋯ "แก้ไขผลตรวจ" opens its out-of-scope sheet. Change its condition (the save asks for a photo) and save. Confirm:
  - the round page still counts it under นอกขอบเขต;
  - the condition finding waits for review;
  - the register is unchanged.
- [ ] Offline:
  - a check saved offline is kept while the room changes and is sent when back;
  - an out-of-scope save offline is refused with "ค้นนอกรอบต้องใช้อินเทอร์เน็ต".
- [ ] At 1280 and 1440, the list and the side panel: the chips, and the ตรง / ไม่ตรง rows in the panel.
- [ ] NVDA and VoiceOver:
  - the switch and the chips read their counts and their pressed state;
  - each field's ตรง / ไม่ตรง reads with the field's name;
  - "เลือกค่าที่พบ" is read as focus moves to the field.
- [ ] An English pass of the new messages.
```

`docs/06_WORKFLOWS.md`, "Audit Counting". Edit bottom up:
- After `:121` add:

  - Scanning a recorded out-of-scope find again (page group 2 plan 3) opens the same out-of-scope sheet, reading "บันทึกนอกขอบเขตไว้แล้ว · บันทึกตอนนี้จะเป็นการแก้". It opens either from the register lookup or from the round page's "แก้ไขผลตรวจ". The save:
    - keeps the item out of scope;
    - compares against the first scan's system snapshot;
    - needs evidence only for a field that differs from that snapshot and changes in this save (a remark-only edit needs no new photo);
    - answers 200 with the item;
    - creates, updates or rejects the pending field findings;
    - never writes the master asset;
    - is refused for a component confirmation on that item, and works online only.

- `:119` becomes:

  - When a scanned value is not in the current round, the client calls `POST /api/audit-rounds/{id}/scan-lookup` instead of Global Search.
    - The lookup requires `audit:edit`. It resolves printed `/q/a/{assetId}` labels and legacy identifiers by `Asset.id`, `assetTag`, `serialNumber`, or `fixedAssetCode`.
    - It returns `Out-of-scope` when the asset exists in the system but has no own `audit_item` in the round: no item at all, or the out-of-scope item a first scan recorded. That answer carries the item (page group 2 plan 3).
    - Unknown asset messaging is reserved for values that do not resolve to an active asset.
    - The lookup does not write audit records. The scan save action records the out-of-scope finding and scan history after the user confirms.

- `:114` becomes:

  - The record sheet (page group 2 plan 3) is titled with the asset's name, with "รหัส · Serial …" under it.
    - It shows one row per field the round compares: ที่ตั้ง (not for a software licence), ผู้ถือครอง (personal assets only), แผนก and สภาพ. Each row shows the system's value and ตรง / ไม่ตรง; ไม่ตรง opens "ที่พบ", where ผู้ถือครอง, แผนก and สภาพ also offer "ไม่มี / ไม่ระบุ".
    - Editing a saved result opens each row as saved: a field saved ไม่ตรง opens ไม่ตรง with its saved value.
    - The save label counts the rows marked ไม่ตรง, a value chosen or not.
    - A row on ไม่ตรง with nothing chosen asks "เลือกค่าที่พบ" before the save. Choosing the system's value turns the row back to ตรง.
    - A walked room that is not the expected room opens ที่ตั้ง as ไม่ตรง.
    - A new custodian turns แผนก to ไม่ตรง ("ตามแผนกของผู้ถือครองที่พบ"), unless the auditor set it.
    - The saved result is the same server comparison as before (`diffCheckValues` on the client, the scan route on the server).

- `:111` becomes:

  - Typing at least two characters searches the round's own items by Asset Tag, Serial Number, fixed asset code, name or expected custodian (page group 2 plan 3).
    - An exact Asset Tag, Serial Number or fixed asset code comes first wherever its room is; then the items in the chosen room, then the rest.
    - The line `ผลค้นหา "…": ในห้องนี้ N · ห้องอื่น M` counts every match. Ten show at a time with "แสดงเพิ่ม", and Enter opens the first.
    - No match offers "ค้นในทะเบียนทั้งหมด", the register lookup.

- After `:101` add:

  - The phone walk (`/audit/rounds/{id}/scan`, page group 2 plan 3):
    - **Counts:**
      - every count reads the round's own items (`isAuditRoundOwnItem`), so out-of-scope finds are never counted, listed or searched as round items;
      - the header's "x / y" and "ไม่ตรง N" fold like the round page (`foldAuditRoundResultCounts`).
    - **The room button:** "ห้องนี้ตรวจแล้ว x / y · เหลือ z" within the chosen department, and "เปลี่ยนห้อง".
    - **The switch:** ยังไม่ตรวจ / ตรวจแล้ว / ทั้งห้อง (ทั้งรอบ with no room), always with counts.
    - **The category chips** under the switch: "ทุกหมวดหมู่", then the categories by count.
      - They count within the room and the tab.
      - They hide at one category and clear on every room change.
    - **The rows:** the name, the code, the expected custodian and "ส่วนควบ N"; a found item's badge reads "พบตรง".
    - **Recorded out-of-scope finds:** the ตรวจแล้ว tab ends with "บันทึกนอกขอบเขตแล้ว N", the room's recorded finds (the round's with no room) with the "นอกขอบเขต" badge, counted in no tab; a tap opens the find's out-of-scope sheet through the register lookup.
    - **The footer:** "ของในห้องนี้ที่ยังหาไม่เจอ N รายการ →" opens the pending list of that room.
    - **Out of scope:** "เจอของที่ไม่อยู่ในรายการ? บันทึกนอกขอบเขต" focuses the search. Recording still goes through the register lookup.

`DEVELOPER_HANDOFF.md`:
- After `:64` (the last sub-bullet of "Audit round page and pending list (page group 2 plan 2)") add:

  - Audit phone walk and record sheet (page group 2 plan 3):
    - The walk counts the round's own items only (`isAuditRoundOwnItem`). It folds results with `foldAuditRoundResultCounts`, so the phone, the round page and the dashboard agree. The full rows stay only for merging saves and polls.
    - The walk's rules stay pure in `src/lib/audit-scan-session.ts`: the room-first search with its true total, the room options within the chosen department, the third tab, and the category chips.
    - The record sheet's ตรง / ไม่ตรง is UI state per field (`src/lib/audit-check-record-rules.ts`), opened from the saved result on an edit. The saved diff stays `diffCheckValues`, and the scan route compares as before.
    - A second scan of an out-of-scope find stays out of scope. The lookup answers `out_of_scope` with its item, and the scan route updates that item against its first snapshot, never the register.

- After `:1226` (the end of the plan 2 bullet), one bullet. Write the commit date where it says so:

  - Page group 2, plan 3: the phone walk and the record sheet.
    - The commit date, branch `feat/group2-audit-phone-walk`. Not deployed, no migration. Plan `docs/superpowers/plans/2026-10-27-group2-audit-phone-walk.md`.
    - Canvas B for `/audit/rounds/{id}/scan` (spec §11, §12; bugs 20-23).
    - **Own items:** every phone count, room, tab, search and camera match reads `items.filter(isAuditRoundOwnItem)`.
    - **Out-of-scope re-scan:** the lookup and the scan route keep a recorded find out of scope (no master write, evidence only for a differing field the save changes through `auditOutOfScopeRescanEvidenceFields`, shared with the form; 200 with the item; component confirm refused). The round page offers "แก้ไขผลตรวจ" on its row again.
    - **Record sheet:** fields that are not compared are hidden. The department follows a new custodian only where the custodian is compared.
    - **E2E:**
      - the walk's helpers rewritten for the new markup in `e2e/audit/scan-steps.ts`, with the words in `e2e/audit/scan-words.ts`;
      - one personal asset (A3) in the walk data, so the chain's round has 8 items;
      - the new steps in `e2e/audit/field-audit.spec.ts`;
      - `e2e/audit/walk-search.spec.ts`: "แสดงเพิ่ม" past 10 on its own room and round of 11 (phone projects only, cancelled by the IT head; P3-R15).
    - **Calls for the user to check:**
      - P3-R17: an exact tag, serial or fixed asset code typed whole opens first even when it is in another room (spec §11 says the chosen room comes first), so Enter opens what was typed.
      - P3-R25: recorded out-of-scope finds leave the walk's tabs and search (spec §5, counts equal lists); the ตรวจแล้ว tab lists them apart under "บันทึกนอกขอบเขตแล้ว N" with the นอกขอบเขต badge Appendix A §11 keeps.

`docs/11_FEATURE_LIST.md`:
- `:194` second cell becomes "`POST /api/audit-rounds/{id}/scan-lookup` resolves printed QR asset IDs, Asset Tags, Serial Numbers, and fixed asset codes under `audit:edit` before the UI decides whether a scanned value is in-round, out-of-scope, or unknown. An out-of-scope find already recorded in the round answers out-of-scope again, with its item."
- `:195` second cell becomes "Field auditors can record actual location, custodian, department, and condition for out-of-scope assets; changed values become reviewable field findings before master data updates. Scanning the find again edits that record and keeps it out of scope, against the first scan's snapshot."

Staff guide (`docs/18_AUDIT_SCAN_GUIDE_TH.md`), in the guide's own plain Thai, with the message values Tasks 3-5 add. Edit from the bottom up:
- §6 (`:45`): the link becomes **ของในห้องนี้ที่ยังหาไม่เจอ N รายการ →** at the end of the **ยังไม่ตรวจ** tab when a room is chosen (**ของในรอบนี้ที่ยังหาไม่เจอ N รายการ →** with no room); it opens the pending list of that room.
- §5 (`:41`):
  - add the box **เจอของที่ไม่อยู่ในรายการ?** with the button **บันทึกนอกขอบเขต**: a tap puts the cursor in the search with "พิมพ์รหัสหรือ Serial ของที่เจอ แล้วกดค้นทะเบียน", then **ค้นในทะเบียนทั้งหมด** as today;
  - "**บันทึกเป็นนอก Scope**" becomes "**บันทึกเป็นนอกขอบเขต**" (the button's word);
  - add: a find already recorded and scanned again opens its out-of-scope sheet as recorded, with **บันทึกนอกขอบเขตไว้แล้ว · บันทึกตอนนี้จะเป็นการแก้**, and stays นอกขอบเขต; a photo is needed only for a field this save changes;
  - add: the recorded finds of the room are listed at the end of the **ตรวจแล้ว** tab under **บันทึกนอกขอบเขตแล้ว N**, each with the **นอกขอบเขต** badge, not counted in the tabs; tap one to edit it (P3-R25).
- §4 (`:35`): unchanged in meaning; the **ตรวจแล้ว** tab now also ends with the recorded out-of-scope finds (see §5).
- §3 (`:22-28`):
  - the sheet's title is the asset's name, with "รหัส · Serial …" under it;
  - each compared field shows the system's value with **ตรง / ไม่ตรง**; **ไม่ตรง** asks for **ที่พบ** (**เลือกค่าที่พบ** until one is chosen) and strikes the system's value;
  - a new custodian turns แผนก to ไม่ตรง "**ตามแผนกของผู้ถือครองที่พบ**", and **ตรง** on the custodian undoes both;
  - a shared asset has no ผู้ถือครอง row, and a software licence no ที่ตั้ง row;
  - a component has **ไม่พบ** beside **พบ**;
  - "**หมายเหตุ / รูป**" becomes "**ถ่ายรูป / เพิ่มหมายเหตุ**";
  - replace "สภาพไม่ตรงต้องแนบรูป … ข้อไม่ตรงอื่นไม่บังคับรูป" with: a photo is needed when สภาพ, แผนก or ที่ตั้ง is ไม่ตรง (master's rule, `src/lib/audit-scan-session.ts:283-284`; the old line was already stale on master).
- §2 (`:16-17`): the line reads `ผลค้นหา "…": ในห้องนี้ N · ห้องอื่น M`; the results show 10 at a time and **แสดงเพิ่ม** adds more; a code or Serial typed whole comes first, then the room's items.
- §1 (`:7-11`): the room button reads **ห้องนี้ตรวจแล้ว x / y · เหลือ z** with **เปลี่ยนห้อง**; the tabs are **ยังไม่ตรวจ / ตรวจแล้ว / ทั้งห้อง** (**ทั้งรอบ** when no room is chosen), each with a count; one line on the **หมวดหมู่** chips under the tabs, which clear when the room changes.

- [ ] **Step 8: Run the whole unit suite, the types and the lint**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS. This includes:
- the guard files `tests/e2e-audit.test.ts`, `tests/e2e-fixes.test.ts` and `tests/e2e-audit-rounds.test.ts`;
- the docs pins: no template marker, and each changelog entry keeps its date heading;
- `tests/e2e-review.test.ts`: no DELETE and no hazard in the new e2e files (`scan-words.ts`, `walk-search.spec.ts`);
- `tests/e2e-suite.test.ts:327`: the new spec takes `test` from `../support/fixtures.ts`;
- `tests/thai-glossary.test.ts`. No message changed here.

- [ ] **Step 9: Commit**

```bash
git add e2e/audit/scan-words.ts e2e/audit/scan-steps.ts e2e/audit/audit-plan.ts e2e/audit/audit-data.ts e2e/audit/field-audit.spec.ts e2e/audit/walk-search.spec.ts tests/e2e-audit.test.ts docs/99_CHANGELOG.md docs/07_UAT_CHECKLIST.md docs/06_WORKFLOWS.md DEVELOPER_HANDOFF.md docs/11_FEATURE_LIST.md docs/18_AUDIT_SCAN_GUIDE_TH.md
git commit -m "test(e2e): the audit walk reads the new phone walk (the switch and the category chips within room and tab, cleared on a room change; the room-first search, and แสดงเพิ่ม past ten on its own round of eleven; own items in the header and the room button; the recorded find listed apart with its นอกขอบเขต badge) and record sheet (ตรง / ไม่ตรง with ที่พบ, เลือกค่าที่พบ, a personal asset's custodian and department, a wrong room, ไม่พบ beside พบ), a second out-of-scope find stays out of scope, and the docs record the plan (group 2 plan 3 task 6)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 10 (the controller, not the implementer): the plan's targeted E2E run**

The run needs the VPN, `scratchpad/stay-awake.ps1` and a clean build. Before it, the controller probes the database (`scratchpad/e2e-plan/tools/select-e2e-counts.cjs`) and runs `rm -rf .next && npm run build`.

Run: `npx playwright test e2e/audit e2e/smoke e2e/cross-cutting/roles.spec.ts e2e/cross-cutting/field-errors.spec.ts`

Expected: every test passes in all four projects (the setup project runs first). Why each one is in the run:
- `e2e/audit`: the walk, the record sheet, the round page's counts after the walk, the rounds list's way into the scan page, and the walk's "แสดงเพิ่ม" past 10 on its own round (`walk-search.spec.ts`, the two phone projects; skipped on the desktop ones).
- `e2e/smoke`: the cadence.
- `roles`: the viewer's lists.
- `field-errors`: it lands on the round page after a create.

The whole suite runs once after plan 4 (spec §16, §17).

Afterwards, in one commit on `feat/group2-audit-phone-walk`, the controller adds:
- the "ผล E2E" bullet to the changelog entry (run id, passed / failed per project);
- the run id to the handoff bullet.

It then updates the AssetSystem wiki (`ams-status`, `ams-log`): the phone walk counts own items, and the out-of-scope re-scan is closed.

---

## Appendix: Rulings

Rulings bind the tasks. Where a task and a ruling disagree, the ruling wins; where a ruling and the spec disagree, the spec wins and the controller rules again. Plans 1-2's rulings stand unless replaced here. Where two rulings here disagree, the later one wins.

- P3-R1: Own items for every phone count, room, tab, search and camera match; full items only for merging results.
- P3-R2: The phone header's ไม่ตรง uses the round page's fold (a checked item with no result counts as ไม่ตรง).
- P3-R3: A re-scan of an out-of-scope find stays out of scope: compared against the first scan's expected snapshot, evidence only as P3-R18 rules (a differing field this save changes), never a master update, component confirm refused, online only, edited through the out-of-scope form opened from the lookup.
- P3-R4: The round page offers "แก้ไขผลตรวจ" on out-of-scope rows again, and its deep link opens the out-of-scope form.
- P3-R5: Search returns the true total; the UI shows 10 at a time with "แสดงเพิ่ม"; room items first.
- P3-R6: Category chips list every category of the room and tab (count desc, then label), with a "ทุกหมวดหมู่" chip first (P3-R16), scrolling sideways; hidden at ≤ 1; cleared on any room change; names loaded without an isActive filter; an unknown id reads "หมวดหมู่อื่น".
- P3-R7: The third tab reads "ทั้งห้อง" with a room, "ทั้งรอบ" without, always with a count.
- P3-R8: The record sheet's ตรง/ไม่ตรง is UI state per field; the saved diff stays `diffCheckValues`.
- P3-R9: "ไม่มี / ไม่ระบุ" is an option for custodian and department, not location.
- P3-R10: Custodian options show the department after the name in the label.
- P3-R11: Non-applicable fields are hidden; the department follows a new custodian only where the custodian is compared.
- P3-R12: The sheet title is the name; line 2 is "รหัส · Serial …" (glossary).
- P3-R13: The room button's counts follow the chosen department.
- P3-R14: The footer link counts the room's pending own items (round-wide without a room) and opens the pending list with that room.
- P3-R15: The E2E walk gains one `personal` asset for the custodian step (the walk then has 8 items and its counts are pinned, P3-R23). Spec §16's phone-walk step "offers แสดงเพิ่ม past 10" runs in its own phone spec, `e2e/audit/walk-search.spec.ts` (phone projects only, WebKit as the field audit): its own room with 11 assets whose tags share one search word, a round on that room opened through the API as IT staff, the word searched on the walk (10 results and "แสดงเพิ่ม", then 11 after the press), and the round cancelled by the IT head by PATCH (`cancelAsItHead`) whatever happens. Task 2's search unit test and Task 3's source pin cover the rule and the wiring too.
- P3-R16: The category chip row's first chip reads "ทุกหมวดหมู่" (the round page's word for the same filter), not "ทั้งหมด".
- P3-R17: Search order: an exact code (the tag, the serial or the fixed asset code typed whole: today's tier 0) first wherever its room is, then the chosen room's matches, then other rooms', each in today's relevance order; Enter opens the first. This refines spec §11 ("Items in the chosen room come first") for a code typed whole only, keeping today's tier-0 lead (`audit-scan-session.ts:195-199`, tier first) so Enter opens what was typed. It binds the tasks over the "spec wins" line above. It is a controller call for the user to check: the changelog entry and the handoff list it.
- P3-R18: A re-scan of an out-of-scope find needs evidence only for a field whose found value changes in this save and differs from the expected snapshot; a remark-only edit needs no new photo. The form and the server use the same rule.
- P3-R19: The found badge on the phone reads "พบตรง" (spec §5's one word for the result), not "ตรวจแล้ว".
- P3-R20: "ไม่มี / ไม่ระบุ" is also offered on the condition, which can be cleared today (keeps a choice; widens P3-R9).
- P3-R21: Editing a recorded result opens each field from the saved result: a field whose saved value differs from the expected opens as ไม่ตรง with that value chosen; others open as ตรง.
- P3-R22: The save label counts rows marked ไม่ตรง even before a value is chosen; an unknown expected id reads "ไม่อยู่ในรายการ", never the raw id.
- P3-R23: The E2E walk adds one personal asset (A3) and stays at 8 items (the create form's sample shows 8 rows); the counts in the specs and guards follow (8 = พบตรง 5 + ไม่ตรง 1 + ไม่พบ 2 + รอตรวจ 0, นอกขอบเขต 1).
- P3-R24: The re-scan answers 200 with the item; a component confirm on an out-of-scope item, or on a component whose parent is an out-of-scope find, is refused 400 with the existing message.
- P3-R25: Recorded out-of-scope finds leave the walk's tabs, chips and search as well as its counts (spec §5: counts equal lists). So that Appendix A §11's "นอกขอบเขต" row badge is not lost, the ตรวจแล้ว tab ends with a small section "บันทึกนอกขอบเขตแล้ว N" listing the round's recorded out-of-scope finds in the chosen room (where each was found, else its snapshot's room), or in the round with no room, each with the "นอกขอบเขต" badge and "ตรวจโดย … เวลา". It is counted apart: the section's N equals its rows, while the tabs, the chips and the header stay own items. Tapping one opens its out-of-scope form through Task 4's flow (its tag in the search, then the register lookup). Task 2 owns the pure rule (`listAuditScanRecordedOutOfScope(items, { roomId })`), Task 3 the section and its words, Task 6 the E2E (X1 listed there with its badge after the out-of-scope save). It is a controller call for the user to check, listed in the changelog and the handoff.
