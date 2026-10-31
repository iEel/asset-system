# Page Group 3 (Transactions), Plan 2: รับคืน, the Outstanding Component and its Late Return — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The รับคืน page is rebuilt to the TX-Checkin boards (three numbered sections, a component checklist, a "สรุปก่อนบันทึก" card, a sticky footer, a condensed phone layout). A return writes the return department (setting `checkin_department_code`, default `IT`). A component that did not come back stays outstanding with ผู้คืน and can be returned late on its own panel. The RT- page links the repair record and lists the missing and late-returned components. ส่งมอบ warns about an outstanding component. The register gets the ข้อมูลเก่า filter `noHandover`.

**Architecture:**
- **Pure rules hold every decision**, and the routes and the page call the same function:
  - the department after a return or a late return (`asset-department-rule.ts`);
  - the outstanding link (`asset-component-outstanding.ts`);
  - the late-return outcome (`component-late-return.ts`);
  - the date bounds (`checkin-route-rules.ts`);
  - the form (`checkin-form-rules.ts`).
- **The outstanding state is an `AssetComponent` link** with status `outstanding`. Every installed-only read keeps excluding it. The RT- snapshots carry it, so cancelling the RT- restores it.
- **The late return is a new route.** It re-attaches the component when the parent is in IT stock and otherwise stands it alone.
- **The form** is rebuilt on plan 1's shared frame, summary card and condition choice.
- **No schema change and no migration.**

**Tech Stack:**
- Next.js 16.4 App Router (read `node_modules/next/dist/docs/` before Next-specific code) and React 19.
- next-intl (Thai first).
- Prisma 7 on SQL Server, zod 4.
- Tailwind 4 tokens, shadcn/Radix parts.
- `node --test` (`npm test`).
- Playwright E2E in 4 projects: desktop and phone × light and dark (the phone runs on WebKit).

**Spec:** `docs/superpowers/specs/2026-10-30-page-group-3-transactions-design.md`, with its addendum §19 (2026-10-31). This plan covers:
- §5: the รับคืน parts and permissions;
- §6: the รับคืน and late-return rows;
- §7.1/§7.3: the outstanding warning on ส่งมอบ;
- §8;
- §12;
- §13: the checkin keys;
- §17: checkin;
- §19.2: รับคืน conditions;
- Appendix A, รับคืน.

Plans 3 and 4 cover โอนย้าย and ย้ายที่ตั้งหลายรายการ.

**Base:** `feat/group3-tx-checkout` at `452b72d7`, which holds plan 1 and its addendum and is not merged.
**Branch:** `feat/group3-tx-checkin`.
**Dry run:** none. There is no migration and no data change; the controller recommended none on 2026-10-31 and the user said "ทำแผน 2 ต่อเลย".

**Execution:**
- Subagent-driven: implementers are the `opus-medium-implementer` agent type, and the main session reviews each task itself.
- Tasks run in order 1 → 12. Task 12 (the asset pages) runs after Task 11 and appends to its E2E spec and docs.
- Line numbers are those of `452b72d7`. A task names each block by its content where an earlier task moved it.

**E2E:** after Task 12 the controller runs `e2e/transactions e2e/cross-cutting e2e/asset-detail e2e/repair e2e/disposal e2e/smoke` from a clean build, in all four projects. The whole suite runs once at the end of page group 3 (after plan 4).

## Global Constraints

**Words and messages**
- Words follow `docs/19_THAI_GLOSSARY.md`. "ตรวจทาน" is a dropped word: the footer says "ตรวจสอบและบันทึก". Conditions use the master names (no "ชำรุด"). Rooms and employees read "code - name". No raw code or id reaches the screen.
- Messages change only through `node scripts/messages-edit.mjs <change file>`, th and en together. Change files live in the session scratchpad folder `tx-group/msg/`, whatever folder a task's text names (the task's file name stands). `common.save` does not change.

**Design**
- Shared parts and tokens only (DESIGN.md): no hex or rgba in tsx, no `dark:`, no `/NN` tints. Both themes.

**One rule, one function**

| Decision | Where it lives |
|---|---|
| The department after a return or a late return | `getCheckinNextDepartmentId` and `getLateReturnDepartmentId` in `src/lib/asset-department-rule.ts` |
| The return department | the server reader `readCheckinDepartment` |
| Whether a link is outstanding | one predicate and one Prisma where (Task 3) |
| The legacy-return where | `legacyReturnCountWhere` (Task 4) |
| The handover day and the legacy mark | `checkinHandoverDay` / `isLegacyBackfilledHandover` (Task 2) |
| The checkin next-status choices | `checkinNextStatusOptions` |
| The late-return date bound | `getLateReturnDateError` (Task 5), read by the route and the panel |
| The outstanding line "ค้างคืน · อยู่กับ <holder> · <RT->" | `formatOutstandingComponentLine` (Task 12), read by the component manager and the asset pages |

- **ส่วนกลาง assets keep their responsible department on every return, including a late return that stands alone.** A component that re-attaches follows its parent (spec §6).

**Installed-only reads and snapshots**
- Every installed-only read keeps pairing `status: "installed"` with `removedAt: null`, so an outstanding link is "not installed" wherever the code means installed. Only the places named in Tasks 4, 5 and 12 change.
- The component snapshots keep their exact key order (`asset-component-sync.ts:186-213`). New keys go only on **before** entries.

**Permissions**
- The รับคืน page, the checkin route and the late-return route need `asset:edit`.
- The checkin route asks `maintenance:create` only when it creates a repair record.

**Bounded reads**
- The search answers ≤20 rows and one total.
- The by-id detail reads one asset, its installed and outstanding links, their open handovers, the outstanding links' RT- numbers, and, for an outstanding component's own row, its parent (`take: 1`).

**V-form rules**
- Errors appear under the field, and focus goes to the first error.
- Toasts are only for what has no field.
- A 409 for a field that is not on screen is a toast with a re-read, never a hidden field error.

**Code shape**
- No schema change and no migration. `AssetComponent.status` is free text and gains the value `outstanding`.
- Pure rule files use relative `.ts` imports and `import type` only.
- Production is read only.

**Checks and commits**
- Every task runs `npm test`, `npx tsc --noEmit` and `npm run lint` (0 errors) before its commit.
- A pin that fails outside the task's list is rewritten in the same commit and named in the report.
- Implementers run no build, no E2E and no database command; the controller does.
- Commit with the message each task gives (its `git commit -m … -m "Co-Authored-By: …"` form is fine; `git commit -F <file>` with the same text is too). Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Where a task cites a controller ruling by id (X1-X32), the ruling is in the appendix at the end of this plan; the task text already states what it means.

**Secrets and E2E**
- Never read or print `.env`, `.env.prod-admin` or `.env.e2e`.
- E2E runs on the dev DB only. It never runs LDAP sync, the settings save, Excel import, a failed login or a delete.
- E2E never saves settings, so the return department in E2E is the default `IT`.

## Review Focus

1. **A return with every component ticked behaves exactly as today:** no outstanding rows, no `missingComponents` in the answer. The API helpers that send no `missingComponentIds` keep working. Task 3's route tests pin it.
2. **A component with two installed links under one parent, left out:** every link is marked, one snapshot entry is written, and the RT- can still be cancelled, which restores both links. Task 3's route and cancellation tests pin it.
3. **A late return after the parent was handed over again:**
   - the component stands alone, and the panel said so before saving;
   - a panel opened before the parent changed gets 409 `ASSET_CHANGED_DURING_OPERATION`, not a field error for a room field that is not on screen.

   Task 5's route tests and Task 9's panel rules pin it.
4. **Someone without `maintenance:create`:**
   - returning into an open repair is allowed;
   - a new ส่งซ่อม is not offered, and the auto-pick never chooses it.

   Task 2's route tests and Task 8's next-status tests pin it.
5. **A legacy row whose backfill would then be refused by the return-department check:** the page refuses the legacy confirm first, so no HO- is created for a return that cannot be saved. Task 8's page order pin covers it.

## Rulings

These are the controller's calls on the spec. Each task copies the ones it carries.

- **P2-R1 (request field):** the request field is `missingComponentIds`, holding **component asset ids**: what the checklist holds.
  - **Format:** multipart sends `formData.getAll("missingComponentIds")`; JSON sends an array. At most 100 ids, deduplicated.
  - **Refusal:** an id that is not a travelling component of this parent is refused with 400 under `missingComponentIds` (field id `checkin-components`).
  - **Marking:** the server marks **every** installed link of each id under this parent as outstanding, and writes **one** snapshot entry per component.
  - **Empty:** an absent key or an empty list means everything came back.
- **P2-R2 (movement types):**
  - **On the component:** `component_outstanding`, written at the RT- with `referenceType: "checkin"` and `referenceId` = the RT-. From/to is `{ custodianId, departmentId }`, written even when unchanged.
  - **At the late return:** `component_late_return`, with the same reference. Its `toValue` carries `{ receivedByName, returnDate, outcome }`. The component also gets the existing `location_change` and `custodian_change` lines when its room or holder changes, and `department_change` / `condition_change` as usual.
  - **On the parent:** the late return reuses `component_install` (re-attach) or `component_remove` (stand alone), with the same reference.
  - **The count pin** goes 47 → 48 (Task 3) → 49 (Task 5). Each new type needs labels, the history category `checkin`, `knownMovementTypeKeys` and the WRITERS list.
- **P2-R3 (late-return route):** the route is `POST /api/assets/[id]/component-return`, where `[id]` is the component.
  - **Body:** `{ componentLinkId, checkinId, expectedOutcome: "reattached" | "standalone", returnDate, receiveBy, receiveByEmployeeId?, conditionId?, nextLocationId?, remark? }`.
  - **Answer:** 201 `{ checkinId, documentNo, outcome }`.
  - **Permission:** `asset:edit`.
  - **Link claim:** `updateMany` where `id`, `status: "outstanding"` and `referenceId: checkinId`. Count 1, else 409 `ASSET_CHANGED_DURING_OPERATION`.
  - **Parent claim:** on re-attach, the parent is claimed too.
  - **Outcome mismatch:** when the server's outcome differs from `expectedOutcome`, the route answers 409 `ASSET_CHANGED_DURING_OPERATION`.
- **P2-R4 (the late-return panel):** the panel is a branch of `checkin-form.tsx`, with one `<form>` and one frame submit. Sections 2 and 3 are not rendered for it, and its ids are `checkin-late-*`.
  - **Row data:** the search row of an outstanding link carries `lateReturn: { linkId, checkinId, checkinNo, checkinDate, parent: { id, assetTag, name }, parentInStock: boolean }`.
  - **Eligibility fact:** the fact passed to the eligibility rules is only `{ linkId, checkinId }`.
  - **Room picker:** shown only when `parentInStock` is false, with the notice that the component will stand alone in IT stock.
  - **After saving:** it opens the RT- page.
- **P2-R5 (the RT- page):**
  - **The repair link:** the RT- after-snapshot gets an optional `repair: { id, repairNo, joined }`, and the checkin answer carries `repair`.
  - **What the RT- page shows:**
    - the missing components;
    - the late-return lines;
    - "เปิดใบซ่อม <no.>" / "ต่อใบซ่อม <no.>". The repair number links only with `maintenance:view`.
  - **A VOID RT-** still shows these lines.
  - **The `lines` slot:** `OperationDocumentPrint` gets a `lines` slot, so the HO- and TR- pages are unchanged.
- **P2-R6 (the before entry and the cancel):** the before snapshot entry of an outstanding component carries the before-only keys `relationshipReferenceType` / `relationshipReferenceId`.
  - **The cancel:** `applyCancellation` restores the link to `installed` with those references. It is a guarded `updateMany`: count 1, else `TRANSACTION_STALE`.
- **P2-R7 (the department):**
  - **After a return:** the department comes from `getCheckinNextDepartmentId`. A `shared`, `component` or `software_license` asset keeps its department; any other ownership gets the return department.
  - **An outstanding component whose holder becomes ผู้คืน** gets ผู้คืน's department, unless it is `shared`.
  - **A re-attached late return** takes the parent's room and department, and its holder is cleared.
  - **A late return that stands alone** takes the chosen room and the return department, unless it is `shared`, which keeps its department; its holder is cleared.
- **P2-R8 (the setting):** the setting is `checkin_department_code`, default `IT`, upper-cased on save and on read.
  - It is set on the Organization tab.
  - The settings PUT checks that the department exists only when the value changed.
  - `readCheckinDepartment` throws a 409 `ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE` when it does not resolve. Every return and late return asks it.
- **P2-R9 (the form):**
  - **Next status:** the next-status control keeps `#checkin-next-status`, with the label "หลังรับคืนให้เป็น".
  - **No legacy prefill:** the legacy prefill of condition and room is dropped, and the condition starts empty.
  - **The "still missing" list:** ทรัพย์สิน, ผู้คืน, ผู้รับคืน, สภาพตอนคืน, หลังรับคืนให้เป็น and เก็บไว้ที่.
  - **Held days:** "ถือมา N วัน" counts Bangkok days to the chosen return date; a legacy-backfilled HO- reads ข้อมูลเก่า.
  - **Signature pads:** they get a `key` from ผู้คืน / ผู้รับคืน.
- **P2-R10 (photo types):** the photo types are ภาพรวม and จุดเสียหาย. Old labels stay readable.
- **P2-R11 (field ids):** FIELD_IDS follow the visual order. The new ids are `checkin-components` and `checkin-late-*`.
- **P2-R12 (the frame):** `OperationFormFrame` gets `summaryOnPhone?: boolean` and an `actions?: ReactNode` header slot.
  - **The legacy link** is a server node built by the page (Task 7). It is hidden when N is 0 and opens the register at `dataQuality=noHandover&exact=1`.
- **P2-R13 (return date):** the return date is ≤ today and ≥ the handover's checkout day, in Bangkok days.
  - A legacy-backfilled HO- is exempt from the lower bound.
  - A late return must be ≥ the RT-'s return date.
- **P2-R14 (ส่งซ่อม choice):** `checkinNextStatusOptions` hides ส่งซ่อม from someone without `maintenance:create`, except on a row locked by an open repair. The route re-checks inside the transaction.
- **P2-R15 (the checkin route):**
  - The return claims its handover (`updateMany` on `{ id, isReturned: false, transactionStatus: "active" }`) before the RT- number is taken.
  - The room is read (active) before and inside the transaction.
  - The cheap checks run before any evidence file is saved.
  - Inside the transaction the reads run in this order: department, room, claim, missing plan, then `generateCheckinDocumentNo`.
- **P2-R16 (the auto-pick):** this one is for the user to confirm at UAT.
  - **Broken, no next status chosen:** when the chosen condition is เสียหาย or ใช้งานไม่ได้ and no next status is chosen yet, the form picks ส่งซ่อม, only for someone who may create a record.
  - **ซาก:** picks รอตัดจำหน่าย.
  - **พร้อมใช้งาน with a broken condition:** shows a warning line, with no refusal.
- **P2-R17 (outstanding elsewhere):**
  - **The held count** includes an outstanding component.
  - **The `componentReturn` verdict comes first** for an outstanding component. It refuses inactive, Disposed, Retired or Lost, the component's own open handover and an open repair. Missing (หาไม่พบ) is allowed: a component brought back has been found.
  - **Checkout, transfer and bulk-move** refuse an outstanding component with "ส่วนควบค้างคืน รับคืนก่อน", in their verdicts and their routes.
  - **The legacy count, the legacy verdict and the legacy-checkout route** leave it out.
  - **Disposal readiness** blocks a parent with an outstanding link and the outstanding component itself.
  - **IT stock** means `isActive`, Ready, no `custodianId`, no open handover and no open repair.
  - **`?assetId=` on รับคืน** chooses the outstanding row.
  - **ถอดออก on an outstanding link** is a guarded `updateMany`.
  - **The picker rows** gain a badge. The outstanding row's line reads "ส่วนควบค้างคืน ของ <parent tag> · <RT->".
- **P2-R18 (ผู้คืน):** when any component is missing, ผู้คืน must be an employee.
  - On the client, a form rule enforces it.
  - On the server, a zod refine under `returnBy` enforces it (Task 2).
- **P2-R19 (ส่งมอบ):**
  - **The warning:** ส่งมอบ shows an outstanding component of the chosen asset in a warning Notice in section 1 (phone step 1 too).
  - **The summary row:** the ส่วนควบ row adds "ค้างคืน M". It is drawn when any component is installed or outstanding.
- **P2-R20 (the register filter):** the new register filter is `dataQuality=noHandover`, built on the legacy count's shared where. It is labelled on the register filter sheet and on the reports page.
- **P2-R21 (outside the plan):** the docs task covers the repo docs. The wiki and the Production SELECT that checks `IT` is active go to the controller's round notes.
- **P2-R22 (recorded in the docs only):**
  - a late return makes later documents on the parent downstream;
  - after ถอดออก, a ส่วนควบ that stands alone keeps its holder;
  - an outstanding component is refused in an audit round that is open across the RT-;
  - the summary's department is not re-sent.

---

### Task 1: The return department: the rule, the setting and the return's write (spec §6, §12; P2-R7 first bullet, P2-R8)

A return puts a บุคคล or Stock asset, and the components that travel with it, into the return department; ส่วนกลาง, ส่วนควบ and License keep theirs (decisions 2 and 10). The return department is a new system setting on the Organization tab, `checkin_department_code` (default `IT`), read at every save: a missing or inactive department refuses the return before anything is written. A real change gets a `department_change` line, and cancelling the RT- puts the old department back from the snapshots, as it already does. This is the plan's first task, so every line number below is HEAD `452b72d7`'s.

The rulings this task carries:
- **P2-R7 (first bullet):** the department after a return comes from `getCheckinNextDepartmentId({ ownership, returnDepartmentId, currentDepartmentId })`. A `shared`, `component` or `software_license` asset keeps its department; any other ownership gets the return department. (The outstanding-component and late-return bullets are Tasks 3 and 5.)
- **P2-R8:** the setting is `checkin_department_code`, default `IT`, upper-cased on save and on read. The Organization tab is reached through an exception above the `checkin_*` → documents rule (`settings-search.ts:18`). The settings PUT checks that the department exists only when the value changed. `readCheckinDepartment(db)` returns `{ id, code, name }` or throws, answered as 409 `ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE` (catalogued, with words that tell an admin what to fix). Every return asks it, ส่วนกลาง included. (The late return asks it in Task 5; the page reads it for the summary in Task 8.)

**Files:**
- Create: `src/lib/checkin-department.ts`
- Create: `tests/checkin-department.test.ts`
- Modify: `src/lib/asset-department-rule.ts`: the header comment `:1-3`; append the rule after `getCheckoutNextDepartmentId` (`:6-21`)
- Modify: `src/lib/asset-operation-claim.ts:2`: the `code` union gains one value
- Modify: `src/lib/system-setting-defaults.ts`: one import after `:6` (`seedCompanyName`); one entry after `{ key: "default_currency", … }` (`:118`)
- Modify: `src/lib/settings-search.ts`: one line above `:18`
- Modify: `src/app/api/admin/settings/route.ts`: imports (`:1-15`); `submittedSettings` (`:62-65`); one check after the restricted-change refusal (`:83-85`), before `prisma.$transaction` (`:87`)
- Modify: `src/components/admin/system-settings-form.tsx`: one import after `:46` (`assetQrPublicBaseUrlKey`); the labels type after `defaultCurrency: string` (`:259`); `friendlySettingKeys` after `"default_currency",` (`:475`); `SETTING_FIELD_IDS` after `default_currency: "default-currency",` (`:517`); the Organization panel after the `#default-currency` Field (`:1517-1523`)
- Modify: `src/app/[locale]/(dashboard)/admin/settings/page.tsx`: after `defaultCurrency: t("defaultCurrency"),` (`:195`)
- Modify: `src/app/api/assets/[id]/checkin/route.ts`: imports (`:1-24`); after the open-repair pre-check (`:87-90`); the transaction's destructure (`:92`); after `if (handoverStatusError) …` (`:122`); after `if (!beforeAsset) …` (`:137`); the asset update (`:194-200`); after the `checkin` movement (`:213-225`); the sync's `changes` (`:229-232`); the transaction's return (`:301`); the log (`:310`); the catch (`:314`)
- Modify: `src/lib/api-error-catalog.ts`: one entry before `"ASSET_CHECKIN_REPAIR_STATUS_REQUIRED"` (`:30`), one after `"Category not found"` (`:78`)
- Modify: `messages/th.json`, `messages/en.json` through `node scripts/messages-edit.mjs` only
- Test: `tests/asset-department-rule.test.ts` (import `:4`; tests appended)
- Test: `tests/checkin-maintenance-ticket-route.test.ts` (harness `:4`, `:7-15`, `:30`, `:33-37`, `:46-55`, `:61-62`, before `:74`, after `:135`; tests appended)
- Test: `tests/system-settings-route-secrets.test.ts` (state `:7-25`, prisma stand-in `:56-71`; tests appended)
- Test: `tests/settings-search.test.ts` (one test appended)
- Test: `tests/v-track3.test.ts:205-206` (one row)
- Test: `tests/api-error-catalog.test.ts` (one test appended)
- Test: `tests/asset-transaction-cancellation-service.test.ts` (imports `:1-13`; one test appended)

**Existing pins this task breaks, rewritten in this commit:**
- `tests/v-track3.test.ts:191-235` `settingFields()`: the ST3 test (`:244-247`) compares the form's `SETTING_FIELD_IDS` rows with it, so it gains the new row (Step 1).
- `tests/checkin-maintenance-ticket-route.test.ts:44-89`: its fake DB answers `null` to any unlisted `findFirst`/`findUnique` (`:76`), so once the route reads the return department every 201 case would turn into a 409. The harness learns the setting and the department master (Step 1).
- `tests/asset-department-rule.test.ts:4`: the import line names the new export.

These stay green with no edit, and the implementation below is placed so that they do (name it in the report if one does not):
- `tests/v-track2-x.test.ts:66-110` stubs prisma with no `systemSetting` or `department` and expects the condition and status refusals. That is why the pre-read goes after the open-repair pre-check, the last pre-check.
- `tests/asset-component-sync-routes.test.ts:36-41` (the log's `newValue: { … componentSync … }` on one line) and `:97-104` (no status or condition key in the checkin sync call).
- `tests/asset-handover-checkin.test.ts:9-18` (the transaction re-reads the handover before `tx.assetCheckin.create`).
- `tests/asset-movement-labels.test.ts:80-82` still counts 47 written types: the register edit and checkout already write `department_change`.
- `tests/asset-operation-claim.test.ts`, the existing tests of `tests/system-settings-route-secrets.test.ts`, and `tests/v-track-s.test.ts:196-214` (the settings route).

**Interfaces:**
- Consumes:
  - `type AssetOwnershipType` (`src/lib/asset-ownership.ts:5`) and `normalizeAssetOwnershipType(value?: string | null): AssetOwnershipType` (`:9`).
  - `AssetOperationConflictError` (`src/lib/asset-operation-claim.ts:1-9`). Every route that catches it answers `409 { code: error.code, error: error.message }` (`checkout/route.ts:296-298`, `transfer/route.ts:188-190`, `legacy-checkout/route.ts:133-135`, `bulk-move/route.ts:133-135`).
  - `fieldErrorResponse({ status, error, code?, fieldErrors })` (`src/lib/field-error-response.ts:8-11`).
  - The sync takes `changes.departmentId` (`src/lib/asset-component-sync.ts:8`), as checkout passes it (`checkout/route.ts:232-238`).
  - The `department_change` row of checkout (`checkout/route.ts:203-216`) and its log keys `departmentId` / `previousDepartmentId` (`:289`).
  - The cancel restore: `buildAssetCancellationRestorePlan` copies `departmentId` from the before snapshot (`asset-transaction-cancellation-service.ts:89-106`); `applyCancellation` writes it to the asset (`asset-transaction-cancellation-prisma.ts:151-158`) and to each component (`:163-176`). The cancel's downstream check leaves out movements that reference the RT- itself (`:106-113`), so the new `department_change` line never blocks the RT-'s cancel.
  - The settings form shows a refusal keyed `settings.<key>` under the field and opens its tab (`system-settings-form.tsx:835-840`, `:928`); a code resolves through `common.validation`, then `apiErrors`.
- Produces:
  ```ts
  // src/lib/checkin-department.ts: `import type` from "@prisma/client" and relative ./x.ts imports only, so node --test,
  // the routes, the page and the client settings form can all load it. No database import: callers pass prisma or tx.
  export const CHECKIN_DEPARTMENT_SETTING_KEY = "checkin_department_code"
  export const DEFAULT_CHECKIN_DEPARTMENT_CODE = "IT"
  export function normalizeCheckinDepartmentCode(value: string | null | undefined): string // trim, upper-case; "" stays ""
  export class CheckinDepartmentUnavailableError extends AssetOperationConflictError      // code and message: "ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE"
  export async function readCheckinDepartment(
    db: Pick<Prisma.TransactionClient, "systemSetting" | "department">,
  ): Promise<{ id: string; code: string; name: string }>

  // src/lib/asset-department-rule.ts (pure, beside getCheckoutNextDepartmentId)
  export function getCheckinNextDepartmentId(input: {
    ownership: AssetOwnershipType
    returnDepartmentId: string
    currentDepartmentId: string | null
  }): string | null
  ```
  - `readCheckinDepartment`: the setting row's value, normalized; an absent row or an empty value reads `IT`. Then the department with that code and `isActive: true`. None → it throws `CheckinDepartmentUnavailableError`. A saved code that names no department does **not** fall back to `IT`.
  - `getCheckinNextDepartmentId`: `shared`, `component`, `software_license` → `currentDepartmentId`; `personal`, `stock` → `returnDepartmentId`.
  - The checkin route answers `409 { code: "ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE", error: "ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE" }`, with no `fieldErrors`. The form already toasts any non-field refusal through the catalog (`checkin-form.tsx:331-347`), so no form change.
  - The settings PUT answers `400 { error: "CHECKIN_DEPARTMENT_CODE_UNKNOWN", code: "CHECKIN_DEPARTMENT_CODE_UNKNOWN", fieldErrors: { "settings.checkin_department_code": "checkinDepartmentCodeUnknown" } }`.
  - Because the error is an `AssetOperationConflictError`, a route that already answers that class (Task 5's late-return route, for its link claim) answers this refusal correctly with no extra catch. Task 5 calls `readCheckinDepartment(prisma)` before its transaction and `readCheckinDepartment(tx)` inside it. Task 8's page calls it inside a try/catch for the summary.

- [ ] **Step 1: Write the failing tests.**
  - Create `tests/checkin-department.test.ts`:
```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { AssetOperationConflictError } from "../src/lib/asset-operation-claim.ts"
import {
  CHECKIN_DEPARTMENT_SETTING_KEY,
  CheckinDepartmentUnavailableError,
  DEFAULT_CHECKIN_DEPARTMENT_CODE,
  normalizeCheckinDepartmentCode,
  readCheckinDepartment,
} from "../src/lib/checkin-department.ts"

type Department = { id: string; code: string; name: string; isActive: boolean }
const it: Department = { id: "dept-it", code: "IT", name: "Information Technology", isActive: true }
const fin: Department = { id: "dept-fin", code: "FIN", name: "Finance", isActive: true }
// A stand-in for prisma or tx: the setting row (null: no row) and the department master, with every read it answers.
function fakeDb(setting: string | null, departments: Department[]) {
  const reads: unknown[] = []
  const db = {
    systemSetting: {
      findUnique: async (args: { where: { key: string } }) => {
        reads.push(["systemSetting.findUnique", args])
        return setting === null ? null : { value: setting }
      },
    },
    department: {
      findFirst: async (args: { where: { code: string; isActive: boolean } }) => {
        reads.push(["department.findFirst", args])
        const found = departments.find((department) => department.code === args.where.code && department.isActive === args.where.isActive)
        return found ? { id: found.id, code: found.code, name: found.name } : null
      },
    },
  }
  return { db: db as unknown as Parameters<typeof readCheckinDepartment>[0], reads }
}
const unavailable = (error: unknown) =>
  error instanceof CheckinDepartmentUnavailableError && error instanceof AssetOperationConflictError
  && error.code === "ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE" && error.message === "ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE"

test("the return department setting's key and default, and its code upper-cased (group 3 spec §12, P2-R8)", () => {
  assert.equal(CHECKIN_DEPARTMENT_SETTING_KEY, "checkin_department_code")
  assert.equal(DEFAULT_CHECKIN_DEPARTMENT_CODE, "IT")
  assert.deepEqual([" it ", "Fin", "", null, undefined].map((value) => normalizeCheckinDepartmentCode(value)), ["IT", "FIN", "", "", ""])
})

test("no saved row or an empty one reads IT, and a lower-case or padded code is upper-cased before the department is read (P2-R8)", async () => {
  for (const [setting, code] of [[null, "IT"], ["", "IT"], ["  it ", "IT"], ["fin", "FIN"]] as const) {
    const { db, reads } = fakeDb(setting, [it, fin])
    assert.equal((await readCheckinDepartment(db)).code, code, String(setting))
    assert.deepEqual(reads, [
      ["systemSetting.findUnique", { where: { key: "checkin_department_code" }, select: { value: true } }],
      ["department.findFirst", { where: { code, isActive: true }, select: { id: true, code: true, name: true } }],
    ], String(setting))
  }
  assert.deepEqual(await readCheckinDepartment(fakeDb(null, [it]).db), { id: "dept-it", code: "IT", name: "Information Technology" })
})

test("a missing or inactive return department throws the 409 refusal, and a saved code never falls back to IT (P2-R8)", async () => {
  for (const departments of [[], [{ ...it, isActive: false }]]) await assert.rejects(readCheckinDepartment(fakeDb(null, departments).db), unavailable)
  await assert.rejects(readCheckinDepartment(fakeDb("GONE", [it]).db), unavailable)
})

test("the module loads under node --test and in client code: import type from @prisma/client, relative .ts imports, no database", () => {
  const source = readFileSync("src/lib/checkin-department.ts", "utf8")
  assert.doesNotMatch(source, /from "@\/|\bprisma\./)
  for (const line of source.split(/\r?\n/).filter((line) => line.startsWith("import "))) {
    assert.match(line, /^import type \{[^}]+\} from "@prisma\/client"$|^import \{[^}]+\} from "\.\/[\w-]+\.ts"$/, line)
  }
})

test("the Organization tab edits the return department upper-cased, under the spec's name, and the page passes its words (spec §12)", () => {
  const form = readFileSync("src/components/admin/system-settings-form.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.ok(form.includes('import { CHECKIN_DEPARTMENT_SETTING_KEY } from "@/lib/checkin-department"\n'))
  assert.ok(form.includes('  "default_currency",\n  CHECKIN_DEPARTMENT_SETTING_KEY,\n'), "kept out of the advanced list")
  assert.match(form, /<Field label=\{labels\.checkinDepartmentCode\} hint=\{labels\.checkinDepartmentCodeHint\} error=\{settingError\(CHECKIN_DEPARTMENT_SETTING_KEY\)\}>\n\s+<Input\n\s+id="checkin-department-code"\n\s+value=\{getValue\(CHECKIN_DEPARTMENT_SETTING_KEY\)\}\n\s+onChange=\{\(event\) => setValue\(CHECKIN_DEPARTMENT_SETTING_KEY, event\.target\.value\.toUpperCase\(\)\)\}\n\s+className="uppercase"\n\s+\/>\n\s+<\/Field>/)
  const page = readFileSync("src/app/[locale]/(dashboard)/admin/settings/page.tsx", "utf8")
  assert.match(page, /checkinDepartmentCode: t\("checkinDepartmentCode"\),\s+checkinDepartmentCodeHint: t\("checkinDepartmentCodeHint"\),/)
  const words = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).systemSettingsPage
  assert.deepEqual([words("th").checkinDepartmentCode, words("en").checkinDepartmentCode], ["แผนกที่รับคืนเข้าคลัง", "Return department"])
  assert.deepEqual([words("th").checkinDepartmentCodeHint, words("en").checkinDepartmentCodeHint], [
    "รหัสแผนก เช่น IT ทรัพย์สินบุคคลและ Stock/สำรองที่รับคืนจะกลับเข้าแผนกนี้ ส่วนทรัพย์สินส่วนกลางคงแผนกเดิม",
    "A department code, such as IT. Returned Personal and Stock/Spare assets go back to this department; Shared assets keep theirs.",
  ])
})
```
  - `tests/asset-department-rule.test.ts`: the import (`:4`) becomes `import { getCheckinNextDepartmentId, getCheckoutNextDepartmentId } from "../src/lib/asset-department-rule.ts"`. Append:
```ts
const ownerships: AssetOwnershipType[] = ["personal", "stock", "shared", "component", "software_license"]
const back = (ownership: AssetOwnershipType, currentDepartmentId: string | null = "dept-now") =>
  getCheckinNextDepartmentId({ ownership, returnDepartmentId: "dept-it", currentDepartmentId })

test("รับคืน: บุคคล and Stock go to the return department; ส่วนกลาง, ส่วนควบ and License keep theirs (group 3 spec §6, §12, decisions 2 and 10, P2-R7)", () => {
  assert.deepEqual(ownerships.map((ownership) => back(ownership)), ["dept-it", "dept-it", "dept-now", "dept-now", "dept-now"])
  assert.deepEqual(ownerships.map((ownership) => back(ownership, null)), ["dept-it", "dept-it", null, null, null], "no department yet")
  assert.deepEqual(ownerships.map((ownership) => back(ownership, "dept-it")), ["dept-it", "dept-it", "dept-it", "dept-it", "dept-it"], "already there")
})
```
  - `tests/checkin-maintenance-ticket-route.test.ts`, the harness:
    - `:4` becomes `import { beforeEach, test } from "node:test"`.
    - Above `CheckinState` add `type Department = { id: string; code: string; name: string; isActive: boolean }`. `CheckinState` (`:7-13`) gains these fields:
      - `assetOverrides: Record<string, unknown>`: the asset's own fields a test changes (`ownershipType`, `departmentId`);
      - `checkinDepartmentSetting: string | null`: the saved `checkin_department_code` (null: no row);
      - `departments: Department[]`: the department master;
      - `departmentAnswers: Array<{ id: string; code: string; name: string } | null>`: one-off answers to `department.findFirst`;
      - `syncChanges: Array<Record<string, unknown>>`;
      - `audits: Array<{ action: string; newValue: Record<string, unknown> }>`.
    - Add `const itDepartment: Department = { id: "dept-it", code: "IT", name: "Information Technology", isActive: true }`. The initial state (`:14`) also sets `assetOverrides: {}, checkinDepartmentSetting: null, departments: [{ ...itDepartment }], departmentAnswers: [], syncChanges: [], audits: []`.
    - The audit-log stand-in (`:30`) becomes `export async function logAudit(entry) { globalThis.__checkinTicketState.audits.push(entry) }`.
    - The sync stand-in (`:33-37`) becomes `export async function syncInstalledComponentsWithParent(_tx, args) { globalThis.__checkinTicketState.syncChanges.push(args.changes); return { updated: 0, skipped: 0, movements: 0, componentSnapshots: [] } }`.
    - In the `@/lib/db` source:
      - the `asset` constant (`:46-55`) is renamed `baseAsset` and gains `ownershipType: "personal"`;
      - add `const asset = () => ({ ...baseAsset, ...state().assetOverrides })`;
      - `:61` returns `asset()`, and `:62` returns `{ ...asset(), ...(args?.data ?? {}), updatedAt: new Date("2026-10-07T03:00:00Z") }`.
    - Before `if (method === "count") return 0` (`:74`) add:
      - `systemSetting.findUnique`: return `{ value }` when `args?.where?.key === "checkin_department_code"` and the state's `checkinDepartmentSetting` (`value`) is not null; otherwise null.
      - `department.findFirst`: while `departmentAnswers` is not empty, return `departmentAnswers.shift()`. Otherwise return the `departments` entry whose `code` equals `args?.where?.code` and whose `isActive` equals `args?.where?.isActive`, as `{ id, code, name }`, or null.
    - After the `context` constant (`:135`) add `beforeEach(() => { Object.assign(state, { assetOverrides: {}, checkinDepartmentSetting: null, departments: [{ ...itDepartment }], departmentAnswers: [], syncChanges: [], audits: [] }) })`. The existing tests keep their own `calls` / `openRecords` / `checkout` resets.

    Then append:
```ts
const written = (call: string) => state.calls.filter((entry) => entry.call === call).map((entry) => entry.args.data as Record<string, unknown>)
const departmentLines = () => written("assetMovement.create").filter((row) => row.movementType === "department_change")
const departmentUnavailable = { code: "ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE", error: "ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE" }

test("a return gives a บุคคล or Stock asset and its components the return department, with a department_change line and both departments in the log (group 3 spec §6, §12, P2-R7)", async () => {
  for (const ownershipType of ["personal", "stock"]) {
    state.calls = []
    state.syncChanges = []
    state.audits = []
    state.assetOverrides = { ownershipType }
    const response = await route.POST(checkinRequest("status:Ready"), context)
    assert.equal(response.status, 201, await response.clone().text())
    assert.equal(written("asset.update")[0].departmentId, "dept-it", ownershipType)
    assert.equal(state.syncChanges[0].departmentId, "dept-it", ownershipType)
    assert.deepEqual(departmentLines(), [{
      assetId: "asset-1", movementType: "department_change", fromValue: "dept-1", toValue: "dept-it", reason: "Asset checkin",
      referenceType: "checkin", referenceId: "assetCheckin-new", performedBy: "user-1",
    }], ownershipType)
    assert.deepEqual([state.audits[0].action, state.audits[0].newValue.departmentId, state.audits[0].newValue.previousDepartmentId], ["checkin", "dept-it", "dept-1"], ownershipType)
  }
})

test("ส่วนกลาง, ส่วนควบ and License keep their department, and an asset already in the return department changes nothing: no department_change line (spec §6, decision 10, P2-R7)", async () => {
  const cases: Array<{ ownershipType: string; departmentId?: string }> = [
    { ownershipType: "shared" }, { ownershipType: "component" }, { ownershipType: "software_license" }, { ownershipType: "personal", departmentId: "dept-it" },
  ]
  for (const overrides of cases) {
    state.calls = []
    state.syncChanges = []
    state.audits = []
    state.assetOverrides = overrides
    const kept = overrides.departmentId ?? "dept-1"
    assert.equal((await route.POST(checkinRequest("status:Ready"), context)).status, 201, JSON.stringify(overrides))
    assert.equal(written("asset.update")[0].departmentId, kept, JSON.stringify(overrides))
    assert.equal(state.syncChanges[0].departmentId, kept, JSON.stringify(overrides))
    assert.deepEqual(departmentLines(), [], JSON.stringify(overrides))
    assert.deepEqual([state.audits[0].newValue.departmentId, state.audits[0].newValue.previousDepartmentId], [kept, kept], JSON.stringify(overrides))
  }
})

test("the return department is the one the setting names, upper-cased, and the RT- snapshots carry the department before and after (spec §12, P2-R8)", async () => {
  state.calls = []
  state.checkinDepartmentSetting = " fin "
  state.departments = [{ ...itDepartment }, { id: "dept-fin", code: "FIN", name: "Finance", isActive: true }]
  assert.equal((await route.POST(checkinRequest("status:Ready"), context)).status, 201)
  assert.equal(written("asset.update")[0].departmentId, "dept-fin")
  const finalized = written("assetCheckin.update")[0]
  assert.deepEqual(
    [JSON.parse(String(finalized.beforeSnapshotJson)).departmentId, JSON.parse(String(finalized.afterSnapshotJson)).departmentId],
    ["dept-1", "dept-fin"],
  )
})

test("a missing or inactive return department refuses every return, ส่วนกลาง included, before anything is written (spec §6, §12, P2-R8)", async () => {
  const cases: Array<[Department[], string]> = [[[], "personal"], [[{ ...itDepartment, isActive: false }], "personal"], [[], "shared"]]
  for (const [departments, ownershipType] of cases) {
    state.calls = []
    state.departments = departments
    state.assetOverrides = { ownershipType }
    const response = await route.POST(checkinRequest("status:Ready"), context)
    assert.deepEqual([response.status, await response.json()], [409, departmentUnavailable], ownershipType)
    assert.deepEqual(state.calls.filter(({ call }) => /\.(create|update|updateMany)$/.test(call)), [], ownershipType)
  }
})

test("a return department closed while the return is saved is refused inside the transaction, before the RT- record (spec §12, P2-R8)", async () => {
  state.calls = []
  state.departmentAnswers = [{ id: "dept-it", code: "IT", name: "Information Technology" }, null]
  const response = await route.POST(checkinRequest("status:Ready"), context)
  assert.deepEqual([response.status, await response.json()], [409, departmentUnavailable])
  const calls = state.calls.map(({ call }) => call)
  const reads = calls.flatMap((call, index) => (call === "department.findFirst" ? [index] : []))
  assert.equal(reads.length, 2)
  assert.ok(reads[1] > calls.lastIndexOf("assetCheckout.findFirst"), "read again inside the transaction")
  assert.equal(calls.includes("assetCheckin.create"), false)
  assert.equal(calls.includes("asset.update"), false)
})
```
  - `tests/system-settings-route-secrets.test.ts`, the harness:
    - `SettingsRouteState` (`:7-13`) gains `departments: Array<{ code: string; isActive: boolean }>` and `departmentReads: Array<Record<string, unknown>>`.
    - `createState()` (`:17-25`) sets `departments: [{ code: "IT", isActive: true }]` and `departmentReads: []`.
    - The prisma stand-in (`:58-70`) gains, before `$transaction`:
      ```js
      department: {
        findFirst: async (args) => {
          state().departmentReads.push(args)
          return state().departments.some((department) => department.code === args.where.code && department.isActive === args.where.isActive) ? { id: "dept-" + args.where.code } : null
        },
      },
      ```
    Then append:
```ts
const putSettings = (settings: Array<{ key: string; value: string }>) =>
  settingsRoute.PUT(jsonRequest("http://localhost/api/admin/settings", "PUT", { settings }))
const unknownCode = {
  error: "CHECKIN_DEPARTMENT_CODE_UNKNOWN",
  code: "CHECKIN_DEPARTMENT_CODE_UNKNOWN",
  fieldErrors: { "settings.checkin_department_code": "checkinDepartmentCodeUnknown" },
}

test("the return department reads IT until someone saves it (group 3 spec §12, P2-R8)", async () => {
  const settings = await (await settingsRoute.GET()).json() as Array<{ key: string; value: string }>
  assert.equal(settings.find((setting) => setting.key === "checkin_department_code")?.value, "IT")
})

test("a return department code is saved upper-cased once an active department has it (spec §12, P2-R8)", async () => {
  state.departments = [{ code: "IT", isActive: true }, { code: "FIN", isActive: true }]
  const response = await putSettings([{ key: "checkin_department_code", value: " fin " }])
  assert.equal(response.status, 200)
  assert.deepEqual(state.upserts, [{ key: "checkin_department_code", value: "FIN" }])
  assert.deepEqual(state.departmentReads, [{ where: { code: "FIN", isActive: true }, select: { id: true } }])
})

test("a code no active department has is refused under its field and nothing is saved, an empty one included (spec §12, P2-R8)", async () => {
  state.departments = [{ code: "IT", isActive: true }, { code: "OLD", isActive: false }]
  for (const value of ["zz", "old", ""]) {
    state.upserts = []
    const response = await putSettings([{ key: "company_name", value: "Sonic Logistics" }, { key: "checkin_department_code", value }])
    assert.deepEqual([response.status, await response.json()], [400, unknownCode], value)
    assert.deepEqual(state.upserts, [], value)
  }
})

test("an unchanged code is not checked, so a department closed later never blocks saving other settings (spec §12, P2-R8)", async () => {
  state.departments = [{ code: "IT", isActive: false }]
  const response = await putSettings([{ key: "company_name", value: "Sonic Logistics" }, { key: "checkin_department_code", value: "it" }])
  assert.equal(response.status, 200)
  assert.deepEqual(state.upserts, [{ key: "company_name", value: "Sonic Logistics" }])
  // A saved row counts the same way as the default.
  state.stored.push(storedSetting("checkin_department_code", "FIN"))
  state.upserts = []
  assert.equal((await putSettings([{ key: "checkin_department_code", value: "fin" }])).status, 200)
  assert.deepEqual([state.upserts, state.departmentReads], [[], []])
})
```
  - `tests/settings-search.test.ts`, append:
```ts
test("the return department is edited on the organization tab, ahead of the checkin_ documents rule (group 3 spec §12, P2-R8)", () => {
  assert.equal(getSystemSettingsTabForKey("checkin_department_code"), "organization")
  assert.equal(getSystemSettingsTabForKey("checkin_document_template"), "documents")
})
```
  - `tests/v-track3.test.ts`: in `settingFields()`, between the `default_currency` row (`:205`) and the `accounting_depreciation_policy` row (`:206`), add `    ["checkin_department_code", "checkin-department-code", "CHECKIN_DEPARTMENT_SETTING_KEY", false],`. The ST3 test then pins the row's place, its tab (organization, so the tab order still never goes back), its id once and `error={settingError(CHECKIN_DEPARTMENT_SETTING_KEY)}` once with no live error.
  - `tests/api-error-catalog.test.ts`, append:
```ts
test("a broken return department reads words that tell an admin what to fix, and a settings save with an unknown code reads its own (group 3 spec §12, P2-R8)", () => {
  assert.equal(getApiErrorKey("ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE"), "checkinDepartmentUnavailable")
  assert.equal(getApiErrorKey("CHECKIN_DEPARTMENT_CODE_UNKNOWN"), "checkinDepartmentCodeUnknown")
  const words = (locale: "th" | "en", key: string) => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).apiErrors[key]
  assert.deepEqual([words("th", "checkinDepartmentUnavailable"), words("en", "checkinDepartmentUnavailable")], [
    "บันทึกรับคืนไม่ได้ เพราะแผนกที่รับคืนเข้าคลังไม่มีในระบบหรือถูกปิดใช้งาน ให้ผู้ดูแลระบบแก้ที่ ตั้งค่าระบบ > องค์กร",
    "The return cannot be saved: the return department is missing or inactive. An administrator can fix it in System Settings > Organization.",
  ])
  assert.deepEqual([words("th", "checkinDepartmentCodeUnknown"), words("en", "checkinDepartmentCodeUnknown")], [
    "ไม่มีแผนกที่ใช้งานอยู่ซึ่งใช้รหัสนี้ ตรวจรหัสที่ ข้อมูลหลัก > แผนก",
    "No active department has this code. Check the code in Master Data > Department.",
  ])
})
```
  - `tests/asset-transaction-cancellation-service.test.ts`: add `import { readFileSync } from "node:fs"`, and add `type AssetCancellationRestorePlan,` to the service import (`:4-12`). Append:
```ts
test("cancelling an RT- that moved the asset and its components to the return department puts their old department back (group 3 spec §6, P2-R7)", async () => {
  const component = {
    componentLinkId: "link-1", componentAssetId: "mouse-1", parentAssetId: "asset-1", relationshipStatus: "installed",
    relationshipUpdatedAt: "2026-08-01T00:00:00.000Z", assetUpdatedAt: "2026-08-27T08:00:00.000Z", statusId: "ready", conditionId: "good",
    branchId: "branch-1", currentLocationId: "desk-1", custodianId: "employee-1", departmentId: "department-1",
  }
  const before: AssetTransactionSnapshotV1 = { ...beforeSnapshot, components: [component] }
  const after: AssetTransactionSnapshotV1 = {
    ...afterSnapshot,
    departmentId: "department-it",
    components: [{ ...component, assetUpdatedAt: "2026-08-27T09:00:00.000Z", currentLocationId: "store-1", custodianId: null, departmentId: "department-it" }],
  }
  const context = structuredClone(eligibleContext)
  context.document.beforeSnapshotJson = JSON.stringify(before)
  context.document.afterSnapshotJson = JSON.stringify(after)
  context.currentSnapshot = structuredClone(after)
  const repository = new MemoryCancellationRepository()
  repository.context = context
  const plans: AssetCancellationRestorePlan[] = []
  const apply = repository.applyCancellation.bind(repository)
  repository.applyCancellation = async (input) => {
    plans.push(input.restorePlan)
    return apply(input)
  }

  const result = await cancelAssetTransaction(
    { type: "checkin", transactionId: "checkin-1", userId: "user-1", reason: "รับคืนผิดเครื่อง", expectedUpdatedAt: "2026-08-27T09:00:01.000Z" },
    repository,
  )

  assert.equal(result.status, "cancelled")
  assert.equal(plans[0].asset.departmentId, "department-1")
  assert.deepEqual(plans[0].components.map(({ componentAssetId, departmentId }) => [componentAssetId, departmentId]), [["mouse-1", "department-1"]])
  const movement = buildCancellationMovementValues(after, before)
  assert.deepEqual([JSON.parse(movement.fromValue).departmentId, JSON.parse(movement.toValue).departmentId], ["department-it", "department-1"])
  // The Prisma repository writes both: the asset from the plan, and each component's department from its before entry.
  const source = readFileSync("src/lib/asset-transaction-cancellation-prisma.ts", "utf8")
  assert.match(source, /data: \{ \.\.\.input\.restorePlan\.asset, updatedBy: input\.userId \}/)
  assert.match(source, /departmentId: component\.departmentId,/)
})
```

- [ ] **Step 2: Run them and see them fail.** Run `node --test tests/checkin-department.test.ts tests/asset-department-rule.test.ts tests/checkin-maintenance-ticket-route.test.ts tests/system-settings-route-secrets.test.ts tests/settings-search.test.ts tests/v-track3.test.ts tests/api-error-catalog.test.ts tests/asset-transaction-cancellation-service.test.ts`. Expected:
  - `checkin-department`: `ERR_MODULE_NOT_FOUND`.
  - `asset-department-rule`: the file fails to load (no export named `getCheckinNextDepartmentId`).
  - The checkin route:
    - the department and keep tests: `undefined !== 'dept-it'` and `undefined !== 'dept-1'` (the route writes no department today);
    - the setting test: `undefined !== 'dept-fin'`;
    - the two refusal tests: `[201, …]` instead of `[409, …]`.
    - The nine existing tests still pass with the new harness.
  - The settings route:
    - GET: `undefined !== 'IT'`;
    - the three PUT tests: 400 `Unknown settings: checkin_department_code`.
  - `settings-search`: `'documents' !== 'organization'`.
  - `v-track3` ST3: the rows differ (the form has no `checkin_department_code` row).
  - `api-error-catalog`: `null !== 'checkinDepartmentUnavailable'`.
  - The cancellation test **passes already**: it pins what an RT- cancel does today (the snapshots carry `departmentId`, P2-R7 "prove it"). Keep it.

- [ ] **Step 3: Implement.**
  - **3a. The reader.** Create `src/lib/checkin-department.ts` with the Produces exports. Its only imports are `import type { Prisma } from "@prisma/client"` and `import { AssetOperationConflictError } from "./asset-operation-claim.ts"`.
    - Its header comment: the return department (group 3 spec §6, §12, P2-R8). It is read at every return and late return and never cached; an absent row reads `IT`, as `getOperationDocumentSettings` defaults its keys (`operation-document-number.ts:92-93`), because Production has no row until someone saves one. The refusal is an `AssetOperationConflictError`, so every route answers it as `409 { code, error }`.
    - `readCheckinDepartment` makes exactly the two reads the test pins: `db.systemSetting.findUnique({ where: { key: CHECKIN_DEPARTMENT_SETTING_KEY }, select: { value: true } })`, then `db.department.findFirst({ where: { code, isActive: true }, select: { id: true, code: true, name: true } })`, where `code` is `normalizeCheckinDepartmentCode(row?.value) || DEFAULT_CHECKIN_DEPARTMENT_CODE`.
    - `CheckinDepartmentUnavailableError` has a constructor with no parameters. It calls `super("ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE", "ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE")` and sets `this.name = "CheckinDepartmentUnavailableError"`. Do not use a constructor parameter property (`node --test` strips types only).
    - In `src/lib/asset-operation-claim.ts:2`, the union becomes `"ASSET_CHANGED_DURING_OPERATION" | "ASSET_ACTIVE_CHECKOUT_EXISTS" | "ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE"`.
  - **3b. The rule.** In `src/lib/asset-department-rule.ts`, add `getCheckinNextDepartmentId` with the Produces signature. Move the ownership test of `getCheckoutNextDepartmentId` (`:14`) into a private `function keepsOwnDepartment(ownership: AssetOwnershipType): boolean` (shared, component, software_license) that both rules call. The checkout rule's behaviour does not change: its tests stay as they are. The header (`:1-3`) now says that the checkout route and the checkout summary call `getCheckoutNextDepartmentId`, and that the checkin route (and, in Task 8, the รับคืน summary) call `getCheckinNextDepartmentId`. Its last line becomes `// Plans 2-3 add the late component return and transfer rules here.` (Task 5 adds `getLateReturnDepartmentId` to this file and then shortens that line; do not add it here). Keep `import type` only.
  - **3c. The setting.**
    - `src/lib/system-setting-defaults.ts`: add `import { CHECKIN_DEPARTMENT_SETTING_KEY, DEFAULT_CHECKIN_DEPARTMENT_CODE } from "@/lib/checkin-department"`. After the `default_currency` entry (`:118`), add `{ key: CHECKIN_DEPARTMENT_SETTING_KEY, value: DEFAULT_CHECKIN_DEPARTMENT_CODE, description: "รหัสแผนกที่ทรัพย์สินบุคคลและ Stock/สำรองกลับเข้าเมื่อรับคืน (ค่าเริ่มต้น IT)" }`. That entry alone makes the key known to the PUT (`knownSystemSettingKeys`, `:209`), merges `IT` into the GET and the page for a missing row, and seeds it on a fresh database (`prisma/seed.ts:69`).
    - `src/lib/settings-search.ts`: above `:18` add `if (key === "checkin_department_code") return "organization"`, with the comment that the return department (group 3 spec §12) is edited on the organization tab, ahead of the `checkin_` documents rule. Write the key literal, not an import of the constant, so the module keeps its one type-only import (`:1`).
    - `src/app/api/admin/settings/route.ts`:
      - Imports: `import { CHECKIN_DEPARTMENT_SETTING_KEY, normalizeCheckinDepartmentCode } from "@/lib/checkin-department"` and `import { fieldErrorResponse } from "@/lib/field-error-response"`.
      - `submittedSettings` (`:62-65`): append `.map((setting) => (setting.key === CHECKIN_DEPARTMENT_SETTING_KEY ? { ...setting, value: normalizeCheckinDepartmentCode(setting.value) } : setting))`. The upper-cased value is then the one compared, saved and logged, so `it` against a stored or default `IT` is no change.
      - After the restricted-change refusal (`:83-85`), add a check. When `changedSettings` holds the key, read `prisma.department.findFirst({ where: { code: <its value>, isActive: true }, select: { id: true } })`. When there is none, return `fieldErrorResponse({ status: 400, error: "CHECKIN_DEPARTMENT_CODE_UNKNOWN", code: "CHECKIN_DEPARTMENT_CODE_UNKNOWN", fieldErrors: { [`settings.${CHECKIN_DEPARTMENT_SETTING_KEY}`]: "checkinDepartmentCodeUnknown" } })`. An empty value names no department, so it is refused by the same check. The comment says why it reads only a changed value: a department closed later must not block saving unrelated settings, and the return itself refuses then.
      - No zod rule and no client rule are added (no 1-20 character rule either): the existence check bounds the code, because `Department.code` is NVarChar(20) (`prisma/schema.prisma:64`). So `tests/v-track3.test.ts`'s parity map (`:56-79`) does not change.
    - `src/components/admin/system-settings-form.tsx`:
      - After `:46` add `import { CHECKIN_DEPARTMENT_SETTING_KEY } from "@/lib/checkin-department"`.
      - In the labels type, after `defaultCurrency: string` (`:259`), add `checkinDepartmentCode: string` and `checkinDepartmentCodeHint: string`.
      - In `friendlySettingKeys`, after `"default_currency",` (`:475`), add `  CHECKIN_DEPARTMENT_SETTING_KEY,`.
      - In `SETTING_FIELD_IDS`, after `:517`, add the literal row `  checkin_department_code: "checkin-department-code",` (the v-track3 row reader matches `^ {2}\w+: "[\w-]+",$`, so write the key, not the constant).
      - In the Organization panel, after the `#default-currency` Field (`:1517-1523`) and before the depreciation builder's `<div className="md:col-span-2">`, add the following. There is no `maxLength`: the form-migration constraint floors would ask for a rule, and the PUT's existence check bounds the code.
```tsx
          <Field label={labels.checkinDepartmentCode} hint={labels.checkinDepartmentCodeHint} error={settingError(CHECKIN_DEPARTMENT_SETTING_KEY)}>
            <Input
              id="checkin-department-code"
              value={getValue(CHECKIN_DEPARTMENT_SETTING_KEY)}
              onChange={(event) => setValue(CHECKIN_DEPARTMENT_SETTING_KEY, event.target.value.toUpperCase())}
              className="uppercase"
            />
          </Field>
```
    - `src/app/[locale]/(dashboard)/admin/settings/page.tsx`: after `defaultCurrency: t("defaultCurrency"),` (`:195`) add `checkinDepartmentCode: t("checkinDepartmentCode"),` and `checkinDepartmentCodeHint: t("checkinDepartmentCodeHint"),`.
  - **3d. The return route** (`src/app/api/assets/[id]/checkin/route.ts`):
    - Imports:
      - `import { AssetOperationConflictError } from "@/lib/asset-operation-claim"`;
      - `import { getCheckinNextDepartmentId } from "@/lib/asset-department-rule"`;
      - `import { normalizeAssetOwnershipType } from "@/lib/asset-ownership"`;
      - `import { readCheckinDepartment } from "@/lib/checkin-department"`.
    - After the open-repair pre-check (`:87-90`), add `await readCheckinDepartment(prisma)`, commented: the return department (spec §12) must resolve before anything is written, ส่วนกลาง included, and the transaction reads it again. Do not move it earlier, because of `tests/v-track2-x.test.ts:66-110`. Task 2 moves the evidence files after these checks (P2-R15).
    - `:92` destructures `const { record: checkin, componentSync, departmentId, previousDepartmentId } = await prisma.$transaction(…)`.
    - Inside the transaction:
      - After `if (handoverStatusError) throw new Error(handoverStatusError)` (`:122`): `const returnDepartment = await readCheckinDepartment(tx)`. It is the first read after the handover check. The in-transaction order the later tasks keep is: this department read, then Task 2's room re-read and handover claim, then Task 3's missing-component plan, then `generateCheckinDocumentNo` (`:139`).
      - After `if (!beforeAsset) throw new Error("Asset not found")` (`:137`): `const nextDepartmentId = getCheckinNextDepartmentId({ ownership: normalizeAssetOwnershipType(asset.ownershipType), returnDepartmentId: returnDepartment.id, currentDepartmentId: beforeAsset.departmentId })`.
      - The asset update's `data` (`:194-200`) gains `departmentId: nextDepartmentId,` after `custodianId: null,`.
      - After the `checkin` movement (`:213-225`): when `nextDepartmentId !== beforeAsset.departmentId`, call `tx.assetMovement.create({ data })` with exactly `{ assetId: id, movementType: "department_change", fromValue: beforeAsset.departmentId, toValue: nextDepartmentId, reason: "Asset checkin", referenceType: "checkin", referenceId: record.id, performedBy: user.id }`. Add no `remark`, because the test compares the whole row.
        - The history chip follows the movement type, so this line counts under แก้ไขข้อมูล, as checkout's does (plan 1 Task 2). It links its RT- through `referenceType: "checkin"`.
        - The cancel's downstream check leaves it out, because it references the RT- itself.
      - The sync's `changes` (`:229-232`) gain `departmentId: nextDepartmentId,`.
        - The components that travel take the parent's new department, or its kept one for a ส่วนกลาง parent, as checkout does (`checkout/route.ts:237`).
        - The sync snapshots each changed component's department, so the cancel restores it.
      - The transaction's return (`:301`) becomes `return { record: finalizedRecord, componentSync: componentSyncSummary, departmentId: nextDepartmentId, previousDepartmentId: beforeAsset.departmentId }`.
    - The log (`:310`), on one line: `newValue: { ...input, checkinId: checkin.id, componentSync, departmentId, previousDepartmentId },`.
    - The catch (`:314`) first: `if (error instanceof AssetOperationConflictError) return NextResponse.json({ code: error.code, error: error.message }, { status: 409 })`. This answers the department refusal from either read. Task 2's handover claim (`ASSET_CHANGED_DURING_OPERATION`) uses the same line: Task 2 keeps this import and this catch line and adds only its own branches, so add them exactly once here.
    - The answer (`:313`, the raw RT- row) does not change.
  - **3e. The catalog and the words.**
    - In `src/lib/api-error-catalog.ts`:
      - directly before `"ASSET_CHECKIN_REPAIR_STATUS_REQUIRED": "checkinRepairStatusRequired",` (`:30`), add `"ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE": "checkinDepartmentUnavailable",`;
      - directly after `"Category not found": "categoryNotFound",` (`:78`), add `"CHECKIN_DEPARTMENT_CODE_UNKNOWN": "checkinDepartmentCodeUnknown",`.
    - Save `<scratchpad>/p2-t1-messages.json` and run `node scripts/messages-edit.mjs <scratchpad>/p2-t1-messages.json`. Expected output: `messages updated: 4 th, 4 en, 0 deleted`.
```json
{ "set": {
  "th": {
    "systemSettingsPage.checkinDepartmentCode": "แผนกที่รับคืนเข้าคลัง",
    "systemSettingsPage.checkinDepartmentCodeHint": "รหัสแผนก เช่น IT ทรัพย์สินบุคคลและ Stock/สำรองที่รับคืนจะกลับเข้าแผนกนี้ ส่วนทรัพย์สินส่วนกลางคงแผนกเดิม",
    "apiErrors.checkinDepartmentUnavailable": "บันทึกรับคืนไม่ได้ เพราะแผนกที่รับคืนเข้าคลังไม่มีในระบบหรือถูกปิดใช้งาน ให้ผู้ดูแลระบบแก้ที่ ตั้งค่าระบบ > องค์กร",
    "apiErrors.checkinDepartmentCodeUnknown": "ไม่มีแผนกที่ใช้งานอยู่ซึ่งใช้รหัสนี้ ตรวจรหัสที่ ข้อมูลหลัก > แผนก"
  },
  "en": {
    "systemSettingsPage.checkinDepartmentCode": "Return department",
    "systemSettingsPage.checkinDepartmentCodeHint": "A department code, such as IT. Returned Personal and Stock/Spare assets go back to this department; Shared assets keep theirs.",
    "apiErrors.checkinDepartmentUnavailable": "The return cannot be saved: the return department is missing or inactive. An administrator can fix it in System Settings > Organization.",
    "apiErrors.checkinDepartmentCodeUnknown": "No active department has this code. Check the code in Master Data > Department."
  }
} }
```

- [ ] **Step 4: Run the tests and the checks.**
  - Re-run the Step 2 command; every test passes.
  - Then run the neighbours: `node --test tests/v-track2-x.test.ts tests/v-track-s.test.ts tests/asset-component-sync-routes.test.ts tests/asset-handover-checkin.test.ts tests/asset-movement-labels.test.ts tests/asset-operation-claim.test.ts tests/asset-transaction-snapshot-routes.test.ts tests/thai-glossary.test.ts tests/thai-page-english-copy.test.ts`. Every test passes.
    - `asset-movement-labels` still counts 47.
    - The catalog scanner (`api-error-catalog.test.ts:69-80`) finds the new `error: "CHECKIN_DEPARTMENT_CODE_UNKNOWN"` literal catalogued.
  - Then run `npm test`, `npx tsc --noEmit` and `npm run lint`: no failures and 0 lint errors. If a pin outside this task's list fails, rewrite it in this commit and name it in the report.
  - E2E is not run here. E2E never saves settings, so it runs with the default `IT`, which is active on dev (spec §2, decision 2).
  - No docs change here: Task 11 writes the docs for the return department.

- [ ] **Step 5: Commit.**
```
git add src/lib/checkin-department.ts src/lib/asset-operation-claim.ts src/lib/asset-department-rule.ts src/lib/system-setting-defaults.ts src/lib/settings-search.ts src/app/api/admin/settings/route.ts src/components/admin/system-settings-form.tsx "src/app/[locale]/(dashboard)/admin/settings/page.tsx" "src/app/api/assets/[id]/checkin/route.ts" src/lib/api-error-catalog.ts messages/th.json messages/en.json tests/checkin-department.test.ts tests/asset-department-rule.test.ts tests/checkin-maintenance-ticket-route.test.ts tests/system-settings-route-secrets.test.ts tests/settings-search.test.ts tests/v-track3.test.ts tests/api-error-catalog.test.ts tests/asset-transaction-cancellation-service.test.ts
git commit -m "feat(checkin): a return puts a บุคคล or Stock asset and its components in the return department (setting checkin_department_code, default IT, on the Organization tab) with a department_change line, and a missing or inactive return department refuses the return (group 3 spec §6, §12, P2-R7, P2-R8)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The return route's guards: the return date, the room, the handover claim, ส่งซ่อม only for a new record, files after the checks (spec §5, §8.3, §8.5; P2-R13, P2-R14, P2-R15, P2-R18)

The checkin route refuses what it writes today without checking. A return date later than today or earlier than the handover's day is refused, but a legacy-backfilled HO- has no lower bound. An unknown or closed room is refused. A second save of the same HO- gets a catalogued 409 instead of the unique index's 500 (GP W1). A return that joins an open repair needs only `asset:edit`. ผู้คืน must be an employee when a component did not come back. Every one of these checks runs before an evidence file is saved. This task changes the server only: today's form already shows `fieldErrors` under `returnDate`, `returnBy` and `nextLocationId` (`checkin-form.tsx:64-72`, `:380`, `:434`, `:480`), and Task 8 adds the client bounds. Line numbers are HEAD's (`452b72d7`). Task 1 has edited the route and its test harness first, so every block below is also named by its content.

**Rulings this task carries (from the skeleton):**
- **P2-R13 (server):** วันที่คืน is ≤ today and ≥ the handover's checkout day, in Bangkok days. A legacy-backfilled HO- has no lower bound. Each bound has one catalogued code under `returnDate`. The late return's bound (≥ the RT-'s day) is Task 5's.
- **P2-R14 (server):** the route asks `maintenance:create` only when it creates a repair record, and checks again inside the transaction which case applies.
- **P2-R15:**
  - The return claims its handover with `assetCheckout.updateMany`; a count other than 1 answers 409 `ASSET_CHANGED_DURING_OPERATION` before the RT- number is taken.
  - `nextLocationId` is read (active) before and inside the transaction, and refused 409 under `nextLocationId` (`ASSET_CHECKIN_LOCATION_INACTIVE`).
  - The cheap checks (zod refines, the setting read, the room read) run before any evidence file is saved.
- **P2-R18 (server: this task):** when any component is missing, ผู้คืน must be an employee: a zod refine under `returnBy`. This task owns the field, the refine, the multipart `getAll`, the catalog row `CHECKIN_MISSING_COMPONENT_RETURNER_REQUIRED` and its words. Task 3 adds none of them again.
- **P2-R1 (the request shape only):** `missingComponentIds` holds component asset ids. Multipart sends it with `formData.getAll("missingComponentIds")`, JSON as an array. At most 100 ids, deduplicated. An absent key or an empty list means everything came back. Task 3 checks the ids against the parent and acts on them.

**Decisions:**
- The date bound runs in the route, not in zod: the lower bound needs the handover row, and P2-R13 wants one function for both bounds. It answers 400 (an input error). The room answers 409 (P2-R15), as checkout's inactive destination does.
- The claim's `where` is `{ id, assetId, isReturned: false, transactionStatus: "active" }`, the same filter as the transaction's handover re-read. The asset row itself is not claimed; neither the spec nor P2-R15 asks for it.
- Between this commit and Task 3's, the route accepts `missingComponentIds` and ignores it. No client sends the list before Task 8.
- A room closed or a claim lost **inside** the transaction still leaves the saved evidence files behind. That is a rare race, and P2-R15 moves only the cheap checks ahead of the save; do not try to delete files here. Task 11 records it with G16 in the docs.
- In-transaction order, fixed for plan 2: after `if (handoverStatusError) throw …`, Task 1's `readCheckinDepartment(tx)`, then this task's room re-read, then this task's handover claim, then Task 3's missing-component plan, then `generateCheckinDocumentNo`. A refused room or a lost claim takes no RT- number.

**Files:**
- Create: `src/lib/checkin-route-rules.ts` (pure)
- Create: `tests/checkin-route-rules.test.ts`
- Modify: `src/lib/validations/asset-operations.ts:53-68` (`assetCheckinSchema`): one field and a `superRefine`
- Modify: `src/app/api/assets/[id]/checkin/route.ts`:
  - imports `:1-24`;
  - the parse call `:41`;
  - the pre-checks `:62-90` (after the return-status refusal, the ส่งซ่อม block, the open-repair pre-count);
  - in the transaction: after the open-repair re-count (`:111-114`), directly after Task 1's `const returnDepartment = await readCheckinDepartment(tx)` (which follows `if (handoverStatusError) throw …`, `:122`), the handover close (`:186-190`) and the repair block's guard (`:242`);
  - the catch `:314-323`, directly after Task 1's first line;
  - helpers after `repairStatusRequiredResponse` (`:326-335`);
  - `parseCheckinRequest` (`:337-383`) is split in two.
- Modify: `src/lib/api-error-catalog.ts`: four entries, each after Task 1's row that precedes it alphabetically (`ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE`, `CHECKIN_DEPARTMENT_CODE_UNKNOWN`)
- Modify: `messages/th.json`, `messages/en.json`, through `node scripts/messages-edit.mjs` only
- Test: `tests/checkin-maintenance-ticket-route.test.ts`. The harness changes (`:4`, `:7-14`, `:24-29`, `:32`, `:38-43`, `:63-66`, `:72`, `:76`, after `:135` and Task 1's `beforeEach`), the pin at `:197-198` is rewritten, and new tests are appended at the end.
- Test: `tests/api-error-catalog.test.ts`: one test appended after `:158`

**Pins this task breaks (rewritten in the same commit):**
- `tests/checkin-maintenance-ticket-route.test.ts:197-198` looks for `assetCheckout.update`. The close becomes the `assetCheckout.updateMany` claim.
- The same file's harness, without the Step 1 changes:
  - every 201 case would answer 409, because `location.findFirst` falls to the generic `null` at `:76`;
  - or 500, because the checkout answer at `:63-66` has no `checkoutDate`.
- `tests/v-track2-x.test.ts:67-110` stays green **only if** the new checks come after the condition and return-status refusals. Its stub answers `assetCheckout.findFirst` with `{ id }` alone and has no `location`. Do not move the new checks earlier.

**Interfaces:**
- Consumes:
  - **Task 1, already in the route and the harness; keep all of it.**
    - The route imports `AssetOperationConflictError` from `@/lib/asset-operation-claim`, and the catch's first line is `if (error instanceof AssetOperationConflictError) return NextResponse.json({ code: error.code, error: error.message }, { status: 409 })`. This task's handover claim throws that class and is answered by that line. Keep Task 1's import and that line as they are; do not import the class again and do not add a second branch for it. This task's catch adds only its own two branches.
    - The route calls `await readCheckinDepartment(prisma)` directly after the open-repair pre-check (HEAD `:87-90`), and `const returnDepartment = await readCheckinDepartment(tx)` directly after `if (handoverStatusError) throw new Error(handoverStatusError)` (HEAD `:122`). Its refusal, 409 `ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE`, is a subclass of `AssetOperationConflictError` and goes through the same catch line.
    - The department write and the `department_change` movement.
    - The route does not import `Prisma` (only `src/lib/checkin-department.ts` does), so this task adds `import type { Prisma } from "@prisma/client"`.
    - In `tests/checkin-maintenance-ticket-route.test.ts`: `:4` reads `import { beforeEach, test } from "node:test"`; a `beforeEach(…)` after `const context` resets Task 1's state members; the fake DB answers `systemSetting.findUnique` and `department.findFirst` itself (there is no `@/lib/checkin-department` stand-in), so both reads are recorded in `state.calls`, before the transaction and again inside it. Task 1's appended helpers are `written`, `departmentLines` and `departmentUnavailable`; this task's helper names do not collide with them.
    - This task moves no call of Task 1's. Its pre-transaction read runs after the parse, so it already comes before `saveCheckinEvidence`, which this task places directly before `prisma.$transaction`.
  - `AssetOperationConflictError(code: "ASSET_CHANGED_DURING_OPERATION" | "ASSET_ACTIVE_CHECKOUT_EXISTS" | "ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE", message: string)` (`src/lib/asset-operation-claim.ts:1-9`; Task 1 widened the union by its last value). The message `"Asset status changed while this request was being saved. Reload the asset and try again."` is catalogued (`api-error-catalog.ts:20`).
  - `getBangkokDateKey(date: Date): string` (`src/lib/preventive-maintenance.ts:50`). A pure module imports it relatively, as `src/lib/waiting-work-rules.ts:7` does.
  - `requirePermission(user, module, action)` throws `Error("Forbidden: insufficient permissions")` (`src/lib/auth-utils.ts:66-74`), and `errorResponse` answers that with 403 (`src/lib/api-response.ts:16-21`).
  - A zod issue whose message is a catalogued code reaches the form as that key (`issueToFieldErrorCode`, `src/lib/field-errors.ts:49-51`; the ZodError body is `validationFailedBody`, `src/lib/api-error-exposure.ts:35-38`).
  - The legacy marker. `legacy-checkout/route.ts:17` defines `const legacyReturnBackfillRemark = "legacy_return_backfill: Created from current custodian before check-in"` and writes it as the HO-'s `remark` (`:84`), dated `new Date()` (`:68`). `AssetCheckout` has no source column (`prisma/schema.prisma`, model `AssetCheckout`), so the remark is the only mark.
  - The search row's handover carries `checkoutDate: string` and `remark: string | null` (`src/lib/asset-operation-search-rules.ts:259-262`), so Task 8 can call `checkinHandoverDay(row.checkout)` on the client.
- Produces:
  ```ts
  // src/lib/checkin-route-rules.ts (pure, client-safe; the only import is `import { getBangkokDateKey } from "./preventive-maintenance.ts"`)
  export type CheckinReturnDateErrorCode = "CHECKIN_RETURN_DATE_IN_FUTURE" | "CHECKIN_RETURN_DATE_BEFORE_HANDOVER"
  export function checkinReturnDateError(input: { returnDay: string; todayDay: string; handoverDay: string | null }): CheckinReturnDateErrorCode | null
  export function isLegacyBackfilledHandover(remark: string | null | undefined): boolean
  export function checkinHandoverDay(checkout: { checkoutDate: Date | string; remark: string | null }): string | null
  export const CHECKIN_RETURN_DATE_ERROR_KEYS: Record<CheckinReturnDateErrorCode, string>
  //   = { CHECKIN_RETURN_DATE_IN_FUTURE: "checkinReturnDateInFuture", CHECKIN_RETURN_DATE_BEFORE_HANDOVER: "checkinReturnDateBeforeHandover" }
  ```
  - `checkinReturnDateError`: days are Bangkok `"YYYY-MM-DD"` strings, compared as strings. `returnDay > todayDay` gives `IN_FUTURE`, which is checked first. Otherwise a non-null `handoverDay` with `returnDay < handoverDay` gives `BEFORE_HANDOVER`. A null `handoverDay` is a legacy backfill and is exempt.
  - `isLegacyBackfilledHandover` is true when `remark` starts with `legacy_return_backfill`.
  - `checkinHandoverDay` returns null for a legacy-backfilled remark. Otherwise it returns the Bangkok day of `checkoutDate`, which may be a `Date` or an ISO string. Its parameter is not nullable: a caller with no handover passes nothing and uses null itself.
  - Who uses them later:
    - Task 8 (the รับคืน page) imports `isLegacyBackfilledHandover` and `checkinHandoverDay` from this module and defines neither itself, for the date field's `min` and for "ถือมา N วัน" → ข้อมูลเก่า. It calls `selectedCheckout ? checkinHandoverDay(selectedCheckout) : null`, so the parameter stays non-null. The picker row's handover already carries `checkoutDate` (ISO) and `remark`. Task 8 also imports `checkinReturnDateError` and maps its codes through `CHECKIN_RETURN_DATE_ERROR_KEYS`.
    - Tasks 5 and 9 import `checkinReturnDateError` and `CHECKIN_RETURN_DATE_ERROR_KEYS`. Task 5's late return gets its own lower-bound code; do not add it here.
  - `AssetCheckinInput` gains `missingComponentIds: string[]` (trimmed, deduplicated, `[]` when absent). This task owns the field, its `returnBy` refine, the multipart `getAll`, the catalog row `CHECKIN_MISSING_COMPONENT_RETURNER_REQUIRED` and its words. Task 3 reads `input.missingComponentIds` and adds none of them again. Task 3's route refusal of a ผู้คืน id it does not accept reuses this task's code `CHECKIN_MISSING_COMPONENT_RETURNER_REQUIRED` and key `checkinMissingComponentReturnerRequired`.
  - The route's new answers:
    - 400 `{ code: "CHECKIN_RETURN_DATE_IN_FUTURE" | "CHECKIN_RETURN_DATE_BEFORE_HANDOVER", error: <same code>, fieldErrors: { returnDate: "checkinReturnDateInFuture" | "checkinReturnDateBeforeHandover" } }`.
    - 409 `{ code: "ASSET_CHECKIN_LOCATION_INACTIVE", error: "ASSET_CHECKIN_LOCATION_INACTIVE", fieldErrors: { nextLocationId: "checkinLocationInactive" } }`.
    - 409 `{ code: "ASSET_CHANGED_DURING_OPERATION", error: "Asset status changed while this request was being saved. Reload the asset and try again." }`.
    - 400 `{ error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { returnBy: "checkinMissingComponentReturnerRequired" } }`.
    - `403 { error: "Forbidden: insufficient permissions" }` and 400 `{ code: "MAINTENANCE_REPORTER_REQUIRED", error: "Select who is recording this repair" }` now come **only** for a return that creates a repair record.
  - Message keys: `apiErrors.checkinReturnDateInFuture`, `apiErrors.checkinReturnDateBeforeHandover`, `apiErrors.checkinLocationInactive`, `apiErrors.checkinMissingComponentReturnerRequired`.

- [ ] **Step 1: Write the failing tests.**
  - Create `tests/checkin-route-rules.test.ts`:
```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { CHECKIN_RETURN_DATE_ERROR_KEYS, checkinHandoverDay, checkinReturnDateError, isLegacyBackfilledHandover } from "../src/lib/checkin-route-rules.ts"
import { issuesToFieldErrors } from "../src/lib/field-errors.ts"
import { assetCheckinSchema } from "../src/lib/validations/asset-operations.ts"

const at = (returnDay: string, handoverDay: string | null = "2026-10-01") => checkinReturnDateError({ returnDay, todayDay: "2026-10-31", handoverDay })

test("วันที่คืน is no later than today and no earlier than the handover's day, in Bangkok days (group 3 spec §8.3, P2-R13)", () => {
  assert.deepEqual(["2026-11-01", "2026-10-31", "2026-10-15", "2026-10-01", "2026-09-30"].map((day) => at(day)),
    ["CHECKIN_RETURN_DATE_IN_FUTURE", null, null, null, "CHECKIN_RETURN_DATE_BEFORE_HANDOVER"])
})

test("a legacy-backfilled handover (no handover day) has no lower bound, and the upper bound stays (P2-R13)", () => {
  assert.deepEqual(["2020-01-01", "2026-10-31", "2026-11-01"].map((day) => at(day, null)), [null, null, "CHECKIN_RETURN_DATE_IN_FUTURE"])
})

test("a day after today and before a future-dated handover reads the future refusal first", () => {
  assert.equal(at("2026-11-02", "2026-11-05"), "CHECKIN_RETURN_DATE_IN_FUTURE")
})

test("each bound reads its own catalog key under วันที่คืน", () => {
  assert.deepEqual(CHECKIN_RETURN_DATE_ERROR_KEYS, { CHECKIN_RETURN_DATE_IN_FUTURE: "checkinReturnDateInFuture", CHECKIN_RETURN_DATE_BEFORE_HANDOVER: "checkinReturnDateBeforeHandover" })
})

test("the handover's day is its Bangkok day, from a Date or an ISO string; a legacy backfill has none (P2-R13)", () => {
  assert.equal(checkinHandoverDay({ checkoutDate: new Date("2026-10-01T16:59:59Z"), remark: null }), "2026-10-01")
  assert.equal(checkinHandoverDay({ checkoutDate: new Date("2026-10-01T17:00:00Z"), remark: "ส่งมอบให้ฝ่ายบัญชี" }), "2026-10-02")
  assert.equal(checkinHandoverDay({ checkoutDate: "2026-10-01T17:00:00.000Z", remark: null }), "2026-10-02", "the picker row's ISO string")
  assert.equal(checkinHandoverDay({ checkoutDate: new Date("2026-10-31T02:00:00Z"), remark: "legacy_return_backfill: Created from current custodian before check-in" }), null)
})

test("the legacy mark is the remark the legacy-checkout route writes", () => {
  const remark = readFileSync("src/app/api/assets/[id]/legacy-checkout/route.ts", "utf8").match(/const legacyReturnBackfillRemark = "([^"]+)"/)?.[1]
  assert.ok(remark, "the legacy route keeps its remark constant")
  assert.equal(isLegacyBackfilledHandover(remark), true)
  for (const other of [null, undefined, "", "ส่งมอบให้ฝ่ายบัญชี", "legacy return"]) assert.equal(isLegacyBackfilledHandover(other), false, String(other))
})

test("the rules stay pure: relative .ts imports only, no database", () => {
  const source = readFileSync("src/lib/checkin-route-rules.ts", "utf8")
  assert.doesNotMatch(source, /from "@\/|@prisma\/client|\bprisma\./)
  for (const line of source.split(/\r?\n/).filter((line) => line.startsWith("import "))) assert.match(line, /from "\.\/[\w-]+\.ts"$/, line)
})

const body = { checkoutId: "co-1", returnDate: "2026-10-07", returnBy: "สมชาย", receiveBy: "สมหญิง", conditionAfter: "c-1", nextStatusId: "s-1", nextLocationId: "l-1" }

test("missingComponentIds: absent or empty means everything came back; ids are trimmed and deduplicated (P2-R1)", () => {
  assert.deepEqual(assetCheckinSchema.parse(body).missingComponentIds, [])
  assert.deepEqual(assetCheckinSchema.parse({ ...body, missingComponentIds: [] }).missingComponentIds, [])
  assert.deepEqual(assetCheckinSchema.parse({ ...body, returnByEmployeeId: "emp-5", missingComponentIds: ["comp-1", " comp-2 ", "comp-1"] }).missingComponentIds, ["comp-1", "comp-2"])
})

test("missingComponentIds refuses more than 100 ids, a blank id and a value that is not a list (P2-R1)", () => {
  const fieldErrors = (missingComponentIds: unknown) =>
    issuesToFieldErrors(assetCheckinSchema.safeParse({ ...body, returnByEmployeeId: "emp-5", missingComponentIds }).error?.issues ?? [])
  assert.deepEqual(fieldErrors(Array.from({ length: 101 }, (_, index) => `comp-${index}`)), { missingComponentIds: "outOfRange" })
  assert.deepEqual(fieldErrors(["comp-1", " "]), { "missingComponentIds.1": "required" })
  assert.deepEqual(fieldErrors("comp-1"), { missingComponentIds: "required" })
})

test("ผู้คืน must be an employee when a component did not come back; the refusal lands under returnBy (spec §8.5, P2-R18)", () => {
  const refused = assetCheckinSchema.safeParse({ ...body, returnByEmployeeId: "", missingComponentIds: ["comp-1"] })
  assert.deepEqual(issuesToFieldErrors(refused.error?.issues ?? []), { returnBy: "checkinMissingComponentReturnerRequired" })
  assert.equal(assetCheckinSchema.safeParse({ ...body, returnByEmployeeId: "emp-5", missingComponentIds: ["comp-1"] }).success, true)
  assert.equal(assetCheckinSchema.safeParse({ ...body, returnBy: "หัวหน้าแผนก" }).success, true, "with everything back, a typed name still returns")
})
```
  - `tests/checkin-maintenance-ticket-route.test.ts`, harness. Keep everything Task 1 added, including its `beforeEach(…)` call.
    - `:4` (Task 1's `import { beforeEach, test } from "node:test"`) becomes `import { afterEach, beforeEach, test } from "node:test"`.
    - `CheckinState` (`:7-13`) gains six members:
      - `denied: string[]`: the `"module:action"` pairs the signed-in user lacks;
      - `employeeId: string | null`: the signed-in user's employee;
      - `handover: { checkoutDate: Date; remark: string | null }`;
      - `inactiveLocationIds: string[]`;
      - `locationAnswers: Array<{ id: string } | null>`: `location.findFirst` answers in call order while the queue is not empty;
      - `closeCount: number`: what claiming the handover answers.

      The literal at `:14` gains `denied: [], employeeId: "emp-1", handover: { checkoutDate: new Date("2026-10-01T03:00:00Z"), remark: null }, inactiveLocationIds: [], locationAnswers: [], closeCount: 1`.
    - The `@/lib/auth-utils` stand-in (`:24-29`) becomes:
```js
    const state = () => globalThis.__checkinTicketState
    export async function requireAuth() { return { id: "user-1", roles: ["system_admin"], permissions: [], employeeId: state().employeeId } }
    export function hasRole(user, role) { return user.roles.includes(role) }
    export function hasPermission(_user, module, action) { return !state().denied.includes(module + ":" + action) }
    export function requirePermission(user, module, action) { if (!hasPermission(user, module, action)) throw new Error("Forbidden: insufficient permissions") }
```
    - The `@/lib/operation-document-number` stand-in (`:32`) records the number being taken: `export async function generateCheckinDocumentNo() { globalThis.__checkinTicketState.calls.push({ call: "documentNo", args: {} }); return "RT-202610-0001" }`.
    - The `@/lib/asset-operation-evidence` stand-in (`:38-43`) becomes:
```js
    export function optionalFormFile(formData, name) { const value = formData.get(name); return value instanceof File && value.size > 0 ? value : null }
    export function optionalFormText(formData, name) { const value = formData.get(name); return typeof value === "string" && value.trim() ? value.trim() : null }
    export function requiredFormText(formData, name) { const value = formData.get(name); return typeof value === "string" ? value : "" }
    export async function saveOperationEvidenceFile(file) {
      globalThis.__checkinTicketState.calls.push({ call: "evidence.save", args: { name: file.name } })
      return { fileName: "saved-" + file.name, originalName: file.name, fileType: file.type, fileSize: file.size, filePath: "uploads/" + file.name }
    }
```
    - In the fake DB:
      - The `assetCheckout.findFirst` answer (`:63-66`) adds `checkoutDate: state().handover.checkoutDate, remark: state().handover.remark`.
      - Directly above `if (method === "updateMany") return { count: 1 }` (`:72`), add `if (name === "assetCheckout" && method === "updateMany") return { count: state().closeCount }`.
      - Directly above the generic `findFirst`/`findUnique → null` line (`:76`), add `if (name === "location" && method === "findFirst") { if (state().locationAnswers.length > 0) return state().locationAnswers.shift(); return args?.where?.isActive === true && !state().inactiveLocationIds.includes(args?.where?.id) ? { id: args.where.id } : null }`.
    - After Task 1's `beforeEach(…)` call, which follows `const context = …` (`:135`):
```ts
function resetReturnState(overrides: Partial<CheckinState> = {}) {
  Object.assign(state, {
    calls: [], openRecords: 0, openRecordCounts: [], checkout: null, denied: [], employeeId: "emp-1",
    handover: { checkoutDate: new Date("2026-10-01T03:00:00Z"), remark: null }, inactiveLocationIds: [], locationAnswers: [], closeCount: 1,
  }, overrides)
}
// Later tests (and later tasks' tests) start from the defaults whatever the previous one set.
afterEach(() => resetReturnState())
```
    - The pin at `:197-198` becomes:
```ts
  const closed = state.calls.find(({ call }) => call === "assetCheckout.updateMany")?.args as { where: Record<string, unknown>; data: Record<string, unknown> }
  assert.deepEqual([closed.where, closed.data], [{ id: "co-1", assetId: "asset-1", isReturned: false, transactionStatus: "active" }, { isReturned: true }])
```
  - Append to `tests/checkin-maintenance-ticket-route.test.ts`:
```ts
// Group 3 plan 2 Task 2: the return route's guards (P2-R13, P2-R14, P2-R15, P2-R18).
const statusAndBody = async (response: Response) => [response.status, await response.json()]
const wasCalled = (name: string) => state.calls.some(({ call }) => call === name)
const positionsOf = (name: string) => state.calls.flatMap(({ call }, index) => (call === name ? [index] : []))
const writeCalls = () => state.calls.map(({ call }) => call).filter((call) => /\.(create|update|updateMany)$/.test(call))
const parentUpdate = () => state.calls.find(({ call, args }) => call === "asset.update" && (args.where as { id?: string })?.id === "asset-1")?.args.data as Record<string, unknown>
// Bangkok's day `offset` days from now, as the form's date field sends it.
const bangkokDayFromToday = (offset: number) => new Date(Date.now() + 7 * 3_600_000 + offset * 86_400_000).toISOString().slice(0, 10)
const photoFile = (name = "front.jpg", type = "image/jpeg") => new File(["evidence"], name, { type })
function returnForm(fields: Record<string, string | string[]> = {}, files: Record<string, File> = { photoAfterFiles: photoFile() }) {
  const form = new FormData()
  const all = { checkoutId: "co-1", returnDate: bangkokDayFromToday(0), returnBy: "สมชาย", returnByEmployeeId: "emp-5", receiveBy: "สมหญิง", conditionAfter: "condition-damaged", nextStatusId: "status:Ready", nextLocationId: "loc-1", ...fields }
  for (const [key, value] of Object.entries(all)) for (const item of [value].flat()) form.append(key, item)
  for (const [key, file] of Object.entries(files)) form.append(key, file)
  return new Request("http://localhost/api/assets/asset-1/checkin", { method: "POST", body: form })
}
const returnDateRefusal = (code: string, key: string) => ({ code, error: code, fieldErrors: { returnDate: key } })
const roomInactive = { code: "ASSET_CHECKIN_LOCATION_INACTIVE", error: "ASSET_CHECKIN_LOCATION_INACTIVE", fieldErrors: { nextLocationId: "checkinLocationInactive" } }
const changedMeanwhile = { code: "ASSET_CHANGED_DURING_OPERATION", error: "Asset status changed while this request was being saved. Reload the asset and try again." }
const forbidden = { error: "Forbidden: insufficient permissions" }
const reporterRequired = { code: "MAINTENANCE_REPORTER_REQUIRED", error: "Select who is recording this repair" }
const returnerRequired = { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { returnBy: "checkinMissingComponentReturnerRequired" } }

test("a return date later than today in Bangkok is refused under วันที่คืน before any file is saved or anything is written (group 3 spec §8.3, P2-R13, P2-R15)", async () => {
  resetReturnState()
  assert.deepEqual(await statusAndBody(await route.POST(returnForm({ returnDate: bangkokDayFromToday(2) }), context)),
    [400, returnDateRefusal("CHECKIN_RETURN_DATE_IN_FUTURE", "checkinReturnDateInFuture")])
  assert.equal(wasCalled("evidence.save"), false)
  assert.deepEqual(writeCalls(), [])
  // The form's "YYYY-MM-DD" and the API helpers' full ISO (e2e/cross-cutting/support/records.ts:114) both pass for today.
  for (const returnDate of [bangkokDayFromToday(0), new Date().toISOString()]) {
    resetReturnState()
    const response = await route.POST(checkinRequest("status:Ready", { returnDate }), context)
    assert.equal(response.status, 201, `${returnDate}: ${await response.clone().text()}`)
  }
})

test("a return date before the handover's Bangkok day is refused, the handover's own day passes, and a legacy-backfilled handover has no lower bound (P2-R13)", async () => {
  // 18:00 UTC on 1 October is 01:00 on 2 October in Bangkok: 1 October is before the handover although the UTC day says otherwise.
  resetReturnState({ handover: { checkoutDate: new Date("2026-10-01T18:00:00Z"), remark: "ส่งมอบให้ฝ่ายบัญชี" } })
  assert.deepEqual(await statusAndBody(await route.POST(checkinRequest("status:Ready", { returnDate: "2026-10-01" }), context)),
    [400, returnDateRefusal("CHECKIN_RETURN_DATE_BEFORE_HANDOVER", "checkinReturnDateBeforeHandover")])
  assert.deepEqual(writeCalls(), [])
  resetReturnState({ handover: { checkoutDate: new Date("2026-10-01T18:00:00Z"), remark: null } })
  assert.equal((await route.POST(checkinRequest("status:Ready", { returnDate: "2026-10-02" }), context)).status, 201)
  // The backfill dates its HO- the moment it is made, so an older return entered late still saves.
  resetReturnState({ handover: { checkoutDate: new Date(), remark: "legacy_return_backfill: Created from current custodian before check-in" } })
  assert.equal((await route.POST(checkinRequest("status:Ready", { returnDate: "2026-09-15" }), context)).status, 201)
})

test("an unknown or closed room is refused under เก็บไว้ที่ before any file is saved or anything is written (spec §8.3, P2-R15)", async () => {
  resetReturnState({ inactiveLocationIds: ["loc-closed"] })
  assert.deepEqual(await statusAndBody(await route.POST(returnForm({ nextLocationId: "loc-closed" }), context)), [409, roomInactive])
  assert.deepEqual(state.calls.find(({ call }) => call === "location.findFirst")?.args, { where: { id: "loc-closed", isActive: true }, select: { id: true } })
  assert.equal(wasCalled("evidence.save"), false)
  assert.deepEqual(writeCalls(), [])
})

test("a room closed while the return is saved is refused inside the transaction, before the handover is claimed (P2-R15)", async () => {
  resetReturnState({ locationAnswers: [{ id: "loc-1" }, null] })
  assert.deepEqual(await statusAndBody(await route.POST(checkinRequest("status:Ready"), context)), [409, roomInactive])
  const reads = positionsOf("location.findFirst")
  assert.equal(reads.length, 2)
  assert.ok(reads[1] > positionsOf("assetCheckout.findFirst")[1], "read again after the transaction's handover re-read")
  assert.deepEqual(writeCalls(), [])
})

test("a handover another desk returned meanwhile is refused 409 before the RT- number is taken (P2-R15, GP W1)", async () => {
  resetReturnState({ closeCount: 0 })
  assert.deepEqual(await statusAndBody(await route.POST(checkinRequest("status:Ready"), context)), [409, changedMeanwhile])
  assert.deepEqual(state.calls.find(({ call }) => call === "assetCheckout.updateMany")?.args, {
    where: { id: "co-1", assetId: "asset-1", isReturned: false, transactionStatus: "active" },
    data: { isReturned: true },
  })
  assert.equal(wasCalled("documentNo"), false)
  assert.deepEqual(writeCalls(), ["assetCheckout.updateMany"])
})

test("a return claims its handover once, after the transaction's re-read and before the RT- number, and the snapshots still record the close (P2-R15)", async () => {
  resetReturnState()
  assert.equal((await route.POST(checkinRequest("status:Ready"), context)).status, 201)
  const [claim] = positionsOf("assetCheckout.updateMany")
  assert.ok(claim > positionsOf("assetCheckout.findFirst")[1])
  assert.ok(claim < positionsOf("documentNo")[0])
  // In the transaction: Task 1's department read, then the room, then the claim.
  const [, departmentInTransaction] = positionsOf("department.findFirst")
  const [, roomInTransaction] = positionsOf("location.findFirst")
  assert.ok(departmentInTransaction < roomInTransaction && roomInTransaction < claim, `${departmentInTransaction} < ${roomInTransaction} < ${claim}`)
  assert.equal(wasCalled("assetCheckout.update"), false, "the handover is not written a second time")
  const finalized = state.calls.find(({ call }) => call === "assetCheckin.update")?.args.data as Record<string, string>
  assert.deepEqual([JSON.parse(finalized.beforeSnapshotJson).checkout, JSON.parse(finalized.afterSnapshotJson).checkout],
    [{ id: "co-1", isReturned: false }, { id: "co-1", isReturned: true }])
})

test("joining an open repair needs only asset:edit: without maintenance:create and without a reporter, the return goes into ส่งซ่อม under it (spec §5, call 3; P2-R14)", async () => {
  resetReturnState({ openRecords: 1, denied: ["maintenance:create"], employeeId: null })
  const response = await route.POST(checkinRequest("status:Under Maintenance"), context)
  assert.equal(response.status, 201, await response.clone().text())
  assert.equal(parentUpdate().statusId, "status:Under Maintenance")
  assert.equal(wasCalled("maintenanceTicket.create"), false)
})

test("a new ส่งซ่อม still needs maintenance:create and a reporter, refused before any file is saved or anything is written (spec §5; P2-R14)", async () => {
  resetReturnState({ denied: ["maintenance:create"] })
  assert.deepEqual(await statusAndBody(await route.POST(returnForm({ nextStatusId: "status:Under Maintenance" }), context)), [403, forbidden])
  assert.equal(wasCalled("evidence.save"), false)
  assert.deepEqual(writeCalls(), [])
  resetReturnState({ employeeId: null })
  assert.deepEqual(await statusAndBody(await route.POST(checkinRequest("status:Under Maintenance"), context)), [400, reporterRequired])
  assert.deepEqual(writeCalls(), [])
})

test("a repair that closed while the return was saved turns the join into a new record: the permission and the reporter are asked again inside the transaction (P2-R14, GP X9)", async () => {
  resetReturnState({ openRecordCounts: [1, 0], denied: ["maintenance:create"] })
  assert.deepEqual(await statusAndBody(await route.POST(checkinRequest("status:Under Maintenance"), context)), [403, forbidden])
  assert.equal(positionsOf("assetCheckout.findFirst").length, 2, "refused inside the transaction, not by the pre-check")
  assert.deepEqual(writeCalls(), [])
  resetReturnState({ openRecordCounts: [1, 0], employeeId: null })
  assert.deepEqual(await statusAndBody(await route.POST(checkinRequest("status:Under Maintenance"), context)), [400, reporterRequired])
  assert.equal(positionsOf("assetCheckout.findFirst").length, 2)
  assert.deepEqual(writeCalls(), [])
  resetReturnState({ openRecordCounts: [1, 0] })
  assert.equal((await route.POST(checkinRequest("status:Under Maintenance"), context)).status, 201)
  assert.equal(wasCalled("maintenanceTicket.create"), true, "with the right and a reporter, the record is created")
})

test("ผู้คืน must be an employee when a component did not come back: refused under ผู้คืน before the asset is read or a file is saved (spec §8.5, P2-R18)", async () => {
  resetReturnState()
  assert.deepEqual(await statusAndBody(await route.POST(checkinRequest("status:Ready", { missingComponentIds: ["comp-1"] }), context)), [400, returnerRequired])
  assert.equal(wasCalled("asset.findFirst"), false)
  resetReturnState()
  assert.deepEqual(await statusAndBody(await route.POST(returnForm({ returnByEmployeeId: "", missingComponentIds: ["comp-1", "comp-2"] }), context)), [400, returnerRequired])
  assert.equal(wasCalled("asset.findFirst"), false)
  assert.equal(wasCalled("evidence.save"), false)
})

test("the evidence files are saved once every check has passed, before the transaction, and are attached to the RT- (P2-R15, GP G16)", async () => {
  resetReturnState()
  const response = await route.POST(returnForm({}, {
    photoAfterFiles: photoFile(),
    returnSignatureFile: photoFile("return.png", "image/png"),
    receiveSignatureFile: photoFile("receive.png", "image/png"),
  }), context)
  assert.equal(response.status, 201, await response.clone().text())
  const saves = positionsOf("evidence.save")
  assert.equal(saves.length, 3)
  const [departmentRead] = positionsOf("department.findFirst")
  assert.ok(departmentRead !== undefined, "the return department is read before the transaction (Task 1)")
  for (const check of [positionsOf("location.findFirst")[0], positionsOf("maintenanceTicket.count")[0], departmentRead]) assert.ok(saves[0] > check, `save after call ${check}`)
  assert.ok(saves[2] < positionsOf("assetCheckout.findFirst")[1], "before the transaction")
  assert.deepEqual(state.calls.filter(({ call }) => call === "attachment.create").map(({ args }) => (args.data as Record<string, unknown>).filePath),
    ["uploads/front.jpg", "uploads/return.png", "uploads/receive.png"])
})
```
  - `tests/api-error-catalog.test.ts`, append:
```ts
test("the return's date, room and returner refusals read their own words under their fields (group 3 spec §8.3, §8.5; P2-R13, P2-R15, P2-R18)", () => {
  const words = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).apiErrors
  for (const [code, key, th, en] of [
    ["CHECKIN_RETURN_DATE_IN_FUTURE", "checkinReturnDateInFuture", "วันที่คืนต้องไม่เกินวันนี้", "The return date cannot be later than today."],
    ["CHECKIN_RETURN_DATE_BEFORE_HANDOVER", "checkinReturnDateBeforeHandover", "วันที่คืนต้องไม่ก่อนวันที่ส่งมอบ", "The return date cannot be before the handover date."],
    ["ASSET_CHECKIN_LOCATION_INACTIVE", "checkinLocationInactive", "ที่ตั้งนี้ไม่มีในระบบหรือถูกปิดใช้งานแล้ว เลือกที่ตั้งอื่น", "This location is missing or inactive. Choose another."],
    ["CHECKIN_MISSING_COMPONENT_RETURNER_REQUIRED", "checkinMissingComponentReturnerRequired", "ส่วนควบที่ยังไม่ได้คืนจะอยู่กับผู้คืน เลือกผู้คืนจากรายชื่อพนักงาน", "A component that has not come back stays with the person returning. Choose that person from the employee list."],
  ]) {
    assert.equal(getApiErrorKey(code), key, code)
    assert.deepEqual([words("th")[key], words("en")[key]], [th, en], key)
  }
  // A second save of the same HO- reads the existing words (P2-R15).
  assert.equal(getApiErrorKey("ASSET_CHANGED_DURING_OPERATION"), "assetChangedDuringOperation")
})
```

- [ ] **Step 2: Run them and see them fail.** Run `node --test tests/checkin-route-rules.test.ts tests/checkin-maintenance-ticket-route.test.ts tests/api-error-catalog.test.ts`. Expected failures:
  - `checkin-route-rules`: `ERR_MODULE_NOT_FOUND` for `src/lib/checkin-route-rules.ts`.
  - `checkin-maintenance-ticket-route`:
    - the S-R48 test: `closed` is undefined, a TypeError;
    - the future-date, before-handover and room tests: `201` instead of `400`/`409`;
    - the in-transaction room test: one `location.findFirst`, not two;
    - the claim test: `201`, because today's `assetCheckout.update` ignores `closeCount`;
    - the claim-order test: no `assetCheckout.updateMany` call;
    - the join test: `403`, because today the route asks `maintenance:create` for every ส่งซ่อม;
    - the new-ส่งซ่อม test: `evidence.save` was called, because today the files are saved before any check;
    - the closed-repair test: one `assetCheckout.findFirst`, because the pre-check refused;
    - the returner test: `201`, because the schema has no `missingComponentIds`;
    - the evidence-order test: the saves come before the room read.
  - `api-error-catalog`: `null !== 'checkinReturnDateInFuture'`.

  The other existing tests in these files still pass.

- [ ] **Step 3: Implement.**
  - **The rules.** Create `src/lib/checkin-route-rules.ts` with the Produces signatures and rules. Its only import is `import { getBangkokDateKey } from "./preventive-maintenance.ts"`. Its header comment says:
    - the return route's date bound (group 3 spec §8.3, P2-R13);
    - pure and client-safe; the route calls it now, and the รับคืน page uses it for the date field's `min`/`max` (Task 8);
    - a legacy-backfilled HO- is dated the moment the backfill runs (`legacy-checkout/route.ts`), so it has no lower bound.
  - **The schema** (`assetCheckinSchema`, `src/lib/validations/asset-operations.ts:53-68`):
    - Add `missingComponentIds: z.array(z.string().trim().min(1).max(100)).max(100).default([]).transform((ids) => [...new Set(ids)])` after `maintenanceProblem`.
    - Close the object with `.superRefine((input, context) => { … })`. It adds `{ code: "custom", path: ["returnBy"], message: "CHECKIN_MISSING_COMPONENT_RETURNER_REQUIRED" }` when `input.missingComponentIds.length > 0 && !input.returnByEmployeeId`. `optionalText` already turns `""` into null.
    - Its comment: a component left out stays with ผู้คืน (spec §8.5), so ผู้คืน must be an employee (P2-R18); Task 3 checks the ids against the parent.
  - **The route, the parse split.**
    - Replace `parseCheckinRequest` (`:337-383`) with two functions. Neither is exported: a route file exports its handlers only.
      - `type CheckinEvidenceFiles = { photos: Array<{ file: File; label: string | null }>; returnSignature: File | null; receiveSignature: File | null }`.
      - `async function readCheckinRequest(request: NextRequest): Promise<{ input: AssetCheckinInput; evidence: CheckinEvidenceFiles }>`. It saves nothing.
        - JSON: `assetCheckinSchema.parse(await request.json())` with empty evidence.
        - Multipart: the files and the labels are read as today. `photoAfterFiles` come before `photoAfter`, and each photo takes `parseStringList(optionalFormText(formData, "photoAfterLabels"))[index] ?? null`.
        - The schema gets today's fields plus `missingComponentIds: formData.getAll("missingComponentIds")`. Pass the raw list, so a file or a blank value is refused by zod and never dropped. `parseStringList` stays for the photo labels only.
      - `async function saveCheckinEvidence(evidence: CheckinEvidenceFiles): Promise<{ photosAfter: EvidenceWithLabel[]; returnSignature: SavedOperationEvidence | null; receiveSignature: SavedOperationEvidence | null }>`. It holds today's `Promise.all` (`:356-360`), and each label rides with its photo.
    - Imports: `import type { Prisma } from "@prisma/client"`, `import { getBangkokDateKey } from "@/lib/preventive-maintenance"`, `import { CHECKIN_RETURN_DATE_ERROR_KEYS, checkinHandoverDay, checkinReturnDateError, type CheckinReturnDateErrorCode } from "@/lib/checkin-route-rules"`, and `type AssetCheckinInput` beside `assetCheckinSchema`. `AssetOperationConflictError` is already imported by Task 1; do not import it again (a duplicate binding fails `tsc`).
  - **The route, the pre-checks.** `:41` becomes `const { input, evidence } = await readCheckinRequest(request)`. The checks before the transaction then run in this order, each answering before anything is saved:
    1. The asset (404), the open handover (404), the return condition (400) and the return status (400), as today.
    2. **The date bound** goes right after the return-status refusal. Compute `checkinReturnDateError({ returnDay: getBangkokDateKey(input.returnDate), todayDay: getBangkokDateKey(new Date()), handoverDay: checkinHandoverDay(checkout) })`, where `checkout` is the pre-read at `:45-47`, whose row has `checkoutDate` and `remark`. A code returns `returnDateResponse(code)`.
    3. **The room:** `if (!(await readActiveCheckinLocation(prisma, input.nextLocationId))) return locationInactiveResponse()`.
    4. **The repair.** `returnStatus`, `sendsToRepair` and `repairReporterId` are computed as today (`:68-77`). Then:
       - Move the open-repair pre-count, its comment and its `repairStatusRequiredResponse()` refusal (`:85-90`) **above** the permission block. Task 1's `await readCheckinDepartment(prisma)` and its comment stay where they are, so they now sit directly below the permission block.
       - The permission block (`:78-83`) runs only `if (sendsToRepair && !hasOpenRepairBefore)`. Its reporter refusal becomes `return reporterRequiredResponse()`.
    5. Task 1's `await readCheckinDepartment(prisma)`, unmoved.
    6. `const { photosAfter, returnSignature, receiveSignature } = await saveCheckinEvidence(evidence)` goes directly before `prisma.$transaction(`. Nothing else is placed between them (Task 3 later adds its own pre-check directly above this line).
  - **The route, inside the transaction.**
    1. The handover re-read (`:93-110`) stays first; `tests/asset-handover-checkin.test.ts:9-18` pins it.
    2. Right after the open-repair re-count refusal (`:111-114`), add the decision and the second permission check:
       ```ts
       // A repair that closed since the pre-check turns the join into a new record: ask again (group 3 spec §5, P2-R14).
       const createsRepair = sendsToRepair && !hasOpenRepair
       if (createsRepair) {
         requirePermission(user, "maintenance", "create")
         if (!repairReporterId) throw new Error("MAINTENANCE_REPORTER_REQUIRED")
       }
       ```
    3. Directly after Task 1's `const returnDepartment = await readCheckinDepartment(tx)` (which follows `if (handoverStatusError) throw new Error(handoverStatusError)`, `:122`), and before `const beforeAsset`:
       - read the room again: `if (!(await readActiveCheckinLocation(tx, input.nextLocationId))) throw new CheckinLocationInactiveError()`;
       - then claim the handover: `const claimed = await tx.assetCheckout.updateMany({ where: { id: activeCheckout.id, assetId: id, isReturned: false, transactionStatus: "active" }, data: { isReturned: true } })`. When `claimed.count !== 1`, throw `new AssetOperationConflictError("ASSET_CHANGED_DURING_OPERATION", "Asset status changed while this request was being saved. Reload the asset and try again.")`.

       The order is department (Task 1), room, claim; Task 3 later puts its missing-component plan directly after the claim, and `generateCheckinDocumentNo` comes after all of them, so a refused room or a lost claim takes no number. The claim-order test pins department < room < claim.
    4. The close `const returnedCheckout = await tx.assetCheckout.update({ … })` (`:186-190`) becomes `const returnedCheckout = { id: activeCheckout.id, isReturned: true }`. The after snapshot keeps reading it.
    5. The repair block's guard `if (sendsToRepair && repairReporterId) {` (`:242`) becomes `if (createsRepair && repairReporterId) {`. The inner `openRecords === 0` re-count stays.
  - **The route, the helpers** after `repairStatusRequiredResponse`:
    - `async function readActiveCheckinLocation(db: Pick<Prisma.TransactionClient, "location">, locationId: string)` calls `db.location.findFirst({ where: { id: locationId, isActive: true }, select: { id: true } })`.
    - `class CheckinLocationInactiveError extends Error`. Its constructor calls `super("ASSET_CHECKIN_LOCATION_INACTIVE")` and sets `this.name = "CheckinLocationInactiveError"`. Use no parameter properties: `node --test` strips types only.
    - `function locationInactiveResponse()` returns the Produces 409.
    - `function returnDateResponse(code: CheckinReturnDateErrorCode)` returns `NextResponse.json({ code, error: code, fieldErrors: { returnDate: CHECKIN_RETURN_DATE_ERROR_KEYS[code] } }, { status: 400 })`.
    - `function reporterRequiredResponse()` returns `NextResponse.json({ code: "MAINTENANCE_REPORTER_REQUIRED", error: "Select who is recording this repair" }, { status: 400 })`. It replaces the inline body at `:81`.
  - **The route, the catch.** Task 1's first line (`if (error instanceof AssetOperationConflictError) return NextResponse.json({ code: error.code, error: error.message }, { status: 409 })`) stays first and answers the lost claim. Directly after it, add only this task's two branches:
    ```ts
    if (error instanceof CheckinLocationInactiveError) return locationInactiveResponse()
    if (error instanceof Error && error.message === "MAINTENANCE_REPORTER_REQUIRED") return reporterRequiredResponse()
    ```
    The existing HEAD branches follow unchanged. A ZodError and the in-transaction 403 go on to `errorResponse(error, 400)` as today.
  - **The catalog and the words.**
    - In `src/lib/api-error-catalog.ts`, add `"ASSET_CHECKIN_LOCATION_INACTIVE": "checkinLocationInactive",` directly after Task 1's `"ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE": "checkinDepartmentUnavailable",` (so still above `"ASSET_CHECKIN_REPAIR_STATUS_REQUIRED"`, HEAD `:30`). Task 3 later anchors its row after this one.
    - Directly after Task 1's `"CHECKIN_DEPARTMENT_CODE_UNKNOWN": "checkinDepartmentCodeUnknown",` (which follows `"Category not found"`, HEAD `:78`), add, in this order, `"CHECKIN_MISSING_COMPONENT_RETURNER_REQUIRED": "checkinMissingComponentReturnerRequired",`, `"CHECKIN_RETURN_DATE_BEFORE_HANDOVER": "checkinReturnDateBeforeHandover",` and `"CHECKIN_RETURN_DATE_IN_FUTURE": "checkinReturnDateInFuture",`. This is the only place the returner row is added in plan 2; Task 3 does not add it.
    - Save `<scratchpad>/p2-t2-messages.json` and run `node scripts/messages-edit.mjs <scratchpad>/p2-t2-messages.json`. Expected: `messages updated: 4 th, 4 en, 0 deleted`.
```json
{ "set": {
  "th": {
    "apiErrors.checkinReturnDateInFuture": "วันที่คืนต้องไม่เกินวันนี้",
    "apiErrors.checkinReturnDateBeforeHandover": "วันที่คืนต้องไม่ก่อนวันที่ส่งมอบ",
    "apiErrors.checkinLocationInactive": "ที่ตั้งนี้ไม่มีในระบบหรือถูกปิดใช้งานแล้ว เลือกที่ตั้งอื่น",
    "apiErrors.checkinMissingComponentReturnerRequired": "ส่วนควบที่ยังไม่ได้คืนจะอยู่กับผู้คืน เลือกผู้คืนจากรายชื่อพนักงาน"
  },
  "en": {
    "apiErrors.checkinReturnDateInFuture": "The return date cannot be later than today.",
    "apiErrors.checkinReturnDateBeforeHandover": "The return date cannot be before the handover date.",
    "apiErrors.checkinLocationInactive": "This location is missing or inactive. Choose another.",
    "apiErrors.checkinMissingComponentReturnerRequired": "A component that has not come back stays with the person returning. Choose that person from the employee list."
  }
} }
```

- [ ] **Step 4: Run the focused tests, then the full checks.**
  - Run `node --test tests/checkin-route-rules.test.ts tests/checkin-maintenance-ticket-route.test.ts tests/api-error-catalog.test.ts tests/v-track2-x.test.ts tests/asset-handover-checkin.test.ts tests/asset-transaction-snapshot-routes.test.ts tests/asset-component-sync-routes.test.ts tests/legacy-checkin-flow.test.ts tests/thai-glossary.test.ts`. Expected: all pass.
    - `v-track2-x` still refuses at the condition and the status, before the new checks.
    - The snapshot pin still finds `isReturned: false … transactionStatus: "active"` in the handover reads.
    - The catalog scanner (`api-error-catalog.test.ts:69-80`) finds the new `error:`/`message:` literals catalogued.
  - Then run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: no failures and 0 lint errors. If a pin outside this task's list fails, rewrite it in this commit and name it in the report.

- [ ] **Step 5: Commit.**
```
git add src/lib/checkin-route-rules.ts src/lib/validations/asset-operations.ts "src/app/api/assets/[id]/checkin/route.ts" src/lib/api-error-catalog.ts messages/th.json messages/en.json tests/checkin-route-rules.test.ts tests/checkin-maintenance-ticket-route.test.ts tests/api-error-catalog.test.ts
git commit -m "fix(checkin): the return claims its handover, refuses a return date out of bounds and a closed room before any file is saved, asks maintenance:create only when it opens a repair record, and needs an employee as ผู้คืน when a component is missing (group 3 spec §5, §8.3, §8.5; P2-R13 to P2-R15, P2-R18)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The outstanding component on the return, and its cancel (spec §8.5 save and cancel, §8.3 repair text; P2-R1, P2-R2 `component_outstanding`, P2-R6, P2-R7 middle bullet; P2-R18's route check of the id, on T2's code)

A component that is not ticked as returned stays with ผู้คืน, in its own room (decisions 7, 11). Its link to the parent keeps its row, its status becomes `outstanding`, and the link's `referenceType`/`referenceId` point at the RT-. The sync then moves only the components that came back. Each missing component gets one `component_outstanding` line and one entry in the RT-'s snapshots. Cancelling the RT- puts every outstanding link back to `installed` with the link's own reference. A request with no missing ids (the field absent or empty) behaves exactly as today.

T2 owns the request shape: the `missingComponentIds` field, its `returnBy` refine, the multipart `getAll`, the catalog row `CHECKIN_MISSING_COMPONENT_RETURNER_REQUIRED` and its words. This task only reads `input.missingComponentIds` and acts on it; it does not touch `src/lib/validations/asset-operations.ts`.

Not in this task: the asset pages' "ค้างคืน · อยู่กับ <holder> · <RT->" line and the component history wording (Task 12), the late return (Task 5).

Line numbers are HEAD's (`452b72d7`). T1 and T2 changed `checkin/route.ts` before this task, so each block of the route below is named by its content:
- T1: the return department and the sync's `departmentId`.
- T2: the `readCheckinRequest` / `saveCheckinEvidence` split, the handover claim, the room check, the date bounds, the permission split and the evidence save after the checks.

**Files:**
- Create: `src/lib/asset-component-outstanding.ts`
- Create: `tests/asset-component-outstanding.test.ts`
- Create: `tests/checkin-outstanding-components-route.test.ts`
- Create: `tests/asset-transaction-cancellation-prisma.test.ts` (the first unit test of `applyCancellation`)
- Modify: `src/app/api/assets/[id]/checkin/route.ts`:
  - the imports;
  - the last pre-transaction check;
  - inside the transaction, after T2's handover claim and before `generateCheckinDocumentNo` (HEAD `:139`), and above `syncInstalledComponentsWithParent(tx, {` (HEAD `:227`);
  - the repair problem (HEAD `:245`);
  - the snapshots (HEAD `:277-294`);
  - the transaction's return (HEAD `:301`);
  - the answer (HEAD `:313`);
  - the catch (HEAD `:314-323`);
  - `buildMaintenanceProblem` (HEAD `:401-411`);
  - new helpers after `repairStatusRequiredResponse` (HEAD `:326-335`).
- Modify: `src/lib/asset-department-rule.ts` (append one function)
- Modify: `src/lib/asset-transaction-snapshot.ts`: the types `:4-17` and `:54-67`, `isComponentSnapshot` `:81-98`, and one helper after `createComponentTransactionSnapshot` `:150-158`
- Modify: `src/lib/asset-transaction-cancellation-prisma.ts`: the imports `:1-18`, the constructor `:39-42`, the component restore loop `:163-179`
- Modify: `src/lib/asset-movement-labels.ts:4` (the comment) and `:33` (the list)
- Modify: `src/lib/asset-history-rules.ts:45` (the `checkin` chip)
- Modify: `src/app/[locale]/(dashboard)/disposal/[id]/page.tsx:459` (`knownMovementTypeKeys`)
- Modify: `src/lib/api-error-catalog.ts` (one entry, after T2's `ASSET_CHECKIN_LOCATION_INACTIVE`, above `ASSET_CHECKIN_REPAIR_STATUS_REQUIRED`, HEAD `:30`)
- Modify: `messages/th.json`, `messages/en.json`, through `node scripts/messages-edit.mjs` only
- Test (append): `tests/asset-department-rule.test.ts`, `tests/asset-transaction-snapshot-routes.test.ts`, `tests/api-error-catalog.test.ts`
- Test (pins rewritten in this commit):
  - `tests/asset-movement-labels.test.ts:81`: the written-type count goes from `47` to `48`. Also add two label asserts after `:107`.
  - `tests/asset-history-rules.test.ts:49`: the expected `checkin` chip list gains `"component_outstanding"`.

  Nothing else should break. A request with no missing ids (T2 parses an absent field as `[]`) makes no new read, so these keep passing unchanged:
  - `tests/checkin-maintenance-ticket-route.test.ts`;
  - `tests/v-track2-x.test.ts:62-100`, whose stub prisma throws on any unnamed call;
  - `tests/asset-handover-checkin.test.ts:9-18`;
  - `tests/asset-component-sync-routes.test.ts:36-41` (the one-line `newValue`) and `:97-104`.

**Interfaces:**
- Consumes:
  - **T1:**
    - the route reads `readCheckinDepartment(db)` (`src/lib/checkin-department.ts`) before and inside the transaction;
    - the sync call passes the return department as `departmentId`, so the returned components go to IT stock with it.
  - **T2:**
    - `AssetCheckinInput.missingComponentIds: string[]`: component **asset** ids, trimmed, deduplicated, at most 100, `[]` when absent. Multipart sends one `missingComponentIds` entry per id (`formData.getAll` in T2's `readCheckinRequest`), JSON an array;
    - the schema's `superRefine`: a non-empty list with no `returnByEmployeeId` answers `400 { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { returnBy: "checkinMissingComponentReturnerRequired" } }`;
    - the catalog row `"CHECKIN_MISSING_COMPONENT_RETURNER_REQUIRED": "checkinMissingComponentReturnerRequired"` and its words (th "ส่วนควบที่ยังไม่ได้คืนจะอยู่กับผู้คืน เลือกผู้คืนจากรายชื่อพนักงาน"). This task's route refusal for an unknown or inactive employee as ผู้คืน reuses that code and key;
    - the catalog row `"ASSET_CHECKIN_LOCATION_INACTIVE"`, which this task's row goes after;
    - inside the transaction, after `if (handoverStatusError) throw …`: T1's `readCheckinDepartment(tx)`, then T2's room re-read, then T2's handover claim (`tx.assetCheckout.updateMany` on `{ id, assetId, isReturned: false, transactionStatus: "active" }`), all before `generateCheckinDocumentNo`;
    - the cheap checks run before the evidence files are saved (`saveCheckinEvidence` directly before `prisma.$transaction(`);
    - the pre-read handover stays `checkout` (HEAD `:45-47`, the full row), so `checkout.custodianId` is there before the transaction.
  - **T1 and T2 together:** T1 adds the `AssetOperationConflictError` import and the catch line that answers it as `409 { code: error.code, error: error.message }` (as `checkout/route.ts:296-298` does); T2 keeps both and adds `import type { Prisma } from "@prisma/client"` unless T1 did.
  - **Existing:**
    - `buildAssetOperationComponentLinkWhere(parentAssetId)`: `{ parentAssetId, status: "installed", removedAt: null, componentAsset: { isActive: true } }` (`src/lib/asset-operation-search-rules.ts:206-208`, the sync's filter);
    - `AssetOperationConflictError` (`src/lib/asset-operation-claim.ts:1-9`);
    - the form offers ผู้คืน from the active employees plus, once, the handover's holder when they have left, as "(พ้นสภาพ)" (`checkin-choice.ts:15-26`, `checkin-form.tsx:157-160`, S-R46). That holder is the handover's `custodianId` (`getCheckinHolder`, `asset-operation-search-rules.ts:380`);
    - `normalizeAssetOwnershipType` and `type AssetOwnershipType` (`src/lib/asset-ownership.ts:5,9`);
    - `createComponentTransactionSnapshot` (`src/lib/asset-transaction-snapshot.ts:150-158`, which spreads its input, so key order = caller order);
    - the sync's snapshot key order (`src/lib/asset-component-sync.ts:186-213`) and `loadContext`'s (`src/lib/asset-transaction-cancellation-prisma.ts:122-135`). Both stay as they are.
- Produces:
  ```ts
  // src/lib/asset-component-outstanding.ts: pure, no imports at all (client-safe; T4, T5, T6, T8 import it)
  export const COMPONENT_LINK_OUTSTANDING = "outstanding"   // the link status; not T4's refusal code "ASSET_COMPONENT_OUTSTANDING"
  export const outstandingLinkWhere: { status: string; removedAt: null }                       // { status: "outstanding", removedAt: null }
  export const installedOrOutstandingLinkWhere: { status: { in: string[] }; removedAt: null }  // { status: { in: ["installed", "outstanding"] }, removedAt: null }
  export function isOutstandingLink(link: { status: string; removedAt?: Date | string | null }): boolean

  // src/lib/asset-department-rule.ts (P2-R7 middle bullet)
  export function getOutstandingComponentCustody(input: {
    ownership: AssetOwnershipType
    custodianId: string | null
    departmentId: string | null
    returner: { id: string; departmentId: string }
  }): { custodianId: string; departmentId: string | null }

  // src/lib/asset-transaction-snapshot.ts
  // AssetComponentTransactionSnapshotV1 and AssetComponentTransactionSnapshotInput gain, on BEFORE entries only (P2-R6):
  //   relationshipReferenceType?: string | null
  //   relationshipReferenceId?: string | null
  export function createComponentLinkTransactionSnapshot(
    link: { id: string; componentAssetId: string; parentAssetId: string; status: string; updatedAt: Date | string },
    asset: { updatedAt: Date | string; statusId: string; conditionId: string; branchId: string; currentLocationId: string; custodianId: string | null; departmentId: string | null },
    restore?: { referenceType: string | null; referenceId: string | null },
  ): AssetComponentTransactionSnapshotV1
  ```
  - **The functions:**
    - `isOutstandingLink` is true only for `status === "outstanding"` with no `removedAt`.
    - `getOutstandingComponentCustody`:
      - `custodianId === returner.id` gives the input back unchanged (D23);
      - otherwise, `custodianId: returner.id`, plus `departmentId` = the current one for `shared` and `returner.departmentId` for every other ownership.
    - `createComponentLinkTransactionSnapshot` returns the sync's twelve keys in the sync's order. It appends `relationshipReferenceType` and `relationshipReferenceId` only when `restore` is given.
  - **The request:** unchanged by this task (T2's `missingComponentIds`).
  - **The route answer:** `201 { ...AssetCheckin, missingComponents: { assetTag: string; name: string }[] }`, one entry per component, sorted by `assetTag`. T6 adds `repair` beside it.
  - **The refusals** (all 400):
    - T2's zod refusal when something is missing and `returnByEmployeeId` is not given (Consumes);
    - `{ code: "CHECKIN_MISSING_COMPONENT_RETURNER_REQUIRED", error: "CHECKIN_MISSING_COMPONENT_RETURNER_REQUIRED", fieldErrors: { returnBy: "checkinMissingComponentReturnerRequired" } }`: the id names no employee, or an inactive employee other than the handover's holder (T2's code and key). The holder who has left is **not** refused: the form offers them as "(พ้นสภาพ)" and they may return (spec §8.3, S-R46), so what stays out stays with them;
    - `{ code: "ASSET_CHECKIN_MISSING_COMPONENT_INVALID", error: "ASSET_CHECKIN_MISSING_COMPONENT_INVALID", fieldErrors: { missingComponentIds: "checkinMissingComponentInvalid" } }`: an id is not a travelling component of this parent.

    A link taken between the check and the write answers `409 { code: "ASSET_CHANGED_DURING_OPERATION", error: "Asset status changed while this request was being saved. Reload the asset and try again." }`.
  - **The data written:**
    - the movement type `component_outstanding` on the component: history chip `checkin`, th "ส่วนควบค้างคืน", en "Component not returned";
    - the RT-'s after snapshot holds one entry per missing component with `relationshipStatus: "outstanding"`. That is T6's missing list.

- [ ] **Step 1: Write the failing tests.**
  - Create `tests/asset-component-outstanding.test.ts`:
```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  COMPONENT_LINK_OUTSTANDING,
  installedOrOutstandingLinkWhere,
  isOutstandingLink,
  outstandingLinkWhere,
} from "../src/lib/asset-component-outstanding.ts"

test("an outstanding link: the status, the two wheres and the predicate (group 3 spec §8.5, P2-R1)", () => {
  assert.equal(COMPONENT_LINK_OUTSTANDING, "outstanding")
  assert.ok(COMPONENT_LINK_OUTSTANDING.length <= 20, "fits AssetComponent.status NVarChar(20): no migration")
  assert.deepEqual(outstandingLinkWhere, { status: "outstanding", removedAt: null })
  assert.deepEqual(installedOrOutstandingLinkWhere, { status: { in: ["installed", "outstanding"] }, removedAt: null })
  assert.equal(isOutstandingLink({ status: "outstanding", removedAt: null }), true)
  assert.equal(isOutstandingLink({ status: "outstanding" }), true)
  for (const link of [{ status: "installed", removedAt: null }, { status: "removed", removedAt: new Date() }, { status: "outstanding", removedAt: new Date() }]) {
    assert.equal(isOutstandingLink(link), false, JSON.stringify(link))
  }
})

test("the module stays pure: no import at all, so pages, routes and node --test all load it", () => {
  assert.doesNotMatch(readFileSync("src/lib/asset-component-outstanding.ts", "utf8"), /^import /m)
})
```
  - Append to `tests/asset-department-rule.test.ts`:
    - add `getOutstandingComponentCustody` to the import from `../src/lib/asset-department-rule.ts`;
    - turn the `import type { AssetOwnershipType }` line into `import { assetOwnershipTypes, type AssetOwnershipType } from "../src/lib/asset-ownership.ts"`;
    - then append:
```ts
test("a component that did not come back: ผู้คืน becomes its holder with ผู้คืน's department, a ส่วนกลาง one keeps its department, and ผู้คืน who already holds it changes nothing (group 3 spec §8.5, call 13, P2-R7)", () => {
  const returner = { id: "emp-returner", departmentId: "dept-returner" }
  const custody = (ownership: AssetOwnershipType, custodianId: string | null) =>
    getOutstandingComponentCustody({ ownership, custodianId, departmentId: "dept-now", returner })
  for (const ownership of ["personal", "stock", "component", "software_license"] as const) {
    assert.deepEqual(custody(ownership, "emp-holder"), { custodianId: "emp-returner", departmentId: "dept-returner" }, ownership)
    assert.deepEqual(custody(ownership, null), { custodianId: "emp-returner", departmentId: "dept-returner" }, `${ownership}, handed to a department or a room`)
  }
  assert.deepEqual(custody("shared", "emp-holder"), { custodianId: "emp-returner", departmentId: "dept-now" })
  assert.deepEqual(custody("shared", null), { custodianId: "emp-returner", departmentId: "dept-now" })
  for (const ownership of assetOwnershipTypes) {
    assert.deepEqual(custody(ownership, "emp-returner"), { custodianId: "emp-returner", departmentId: "dept-now" }, `${ownership}, ผู้คืน already holds it`)
  }
})
```
  - Append to `tests/asset-transaction-snapshot-routes.test.ts`. Add `createComponentLinkTransactionSnapshot`, `parseAssetTransactionSnapshot` and `serializeAssetTransactionSnapshot` to its import from `../src/lib/asset-transaction-snapshot.ts`, then:
```ts
const componentLink = { id: "link-1", componentAssetId: "component-1", parentAssetId: "asset-1", status: "installed", updatedAt: new Date("2026-10-20T03:00:00.000Z") }
const componentAsset = {
  updatedAt: "2026-10-20T04:00:00.000Z", statusId: "status-ready", conditionId: "condition-good", branchId: "branch-1",
  currentLocationId: "location-1", custodianId: "employee-1", departmentId: null,
}
// asset-component-sync.ts:186-213 and asset-transaction-cancellation-prisma.ts:122-135 build exactly these, in this order.
const syncKeys = [
  "componentLinkId", "componentAssetId", "parentAssetId", "relationshipStatus", "relationshipUpdatedAt", "assetUpdatedAt",
  "statusId", "conditionId", "branchId", "currentLocationId", "custodianId", "departmentId",
]

test("a link's component snapshot has the sync's keys in the sync's order; a before entry adds the link's own reference last (group 3 spec §8.5, P2-R6)", () => {
  const after = createComponentLinkTransactionSnapshot(componentLink, componentAsset)
  assert.deepEqual(Object.keys(after), syncKeys)
  assert.deepEqual([after.relationshipUpdatedAt, after.assetUpdatedAt], ["2026-10-20T03:00:00.000Z", "2026-10-20T04:00:00.000Z"])
  const before = createComponentLinkTransactionSnapshot(componentLink, componentAsset, { referenceType: "purchase", referenceId: "PO-7" })
  assert.deepEqual(Object.keys(before), [...syncKeys, "relationshipReferenceType", "relationshipReferenceId"])
  assert.deepEqual([before.relationshipReferenceType, before.relationshipReferenceId], ["purchase", "PO-7"])
})

test("a before entry's link reference survives the round trip, null included; an empty or non-text one is refused; old snapshots still parse", () => {
  const asset = { id: "asset-1", updatedAt: "2026-10-20T04:00:00.000Z", statusId: "s", conditionId: "c", branchId: "b", currentLocationId: "l", custodianId: null, departmentId: null }
  const withReference = (reference: { referenceType: string | null; referenceId: string | null }) =>
    createAssetTransactionSnapshot({ asset, components: [createComponentLinkTransactionSnapshot(componentLink, componentAsset, reference)] })
  for (const reference of [{ referenceType: "purchase", referenceId: "PO-7" }, { referenceType: null, referenceId: null }]) {
    const json = serializeAssetTransactionSnapshot(withReference(reference))
    assert.equal(parseAssetTransactionSnapshot(json)?.components[0].relationshipReferenceId, reference.referenceId)
  }
  const old = JSON.stringify(createAssetTransactionSnapshot({ asset, components: [createComponentLinkTransactionSnapshot(componentLink, componentAsset)] }))
  assert.equal(parseAssetTransactionSnapshot(old)?.components.length, 1)
  for (const bad of ["", 7]) {
    const json = JSON.stringify({ ...JSON.parse(old), components: [{ ...JSON.parse(old).components[0], relationshipReferenceType: bad }] })
    assert.equal(parseAssetTransactionSnapshot(json), null, String(bad))
  }
})
```
  - Create `tests/asset-transaction-cancellation-prisma.test.ts`. It drives the real repository and the real service through a fake db that has only the calls the repository makes, so a new query fails loudly:
```ts
import assert from "node:assert/strict"
import test from "node:test"
import { createPrismaAssetTransactionCancellationRepository } from "../src/lib/asset-transaction-cancellation-prisma.ts"
import { cancelAssetTransaction } from "../src/lib/asset-transaction-cancellation-service.ts"
import {
  createAssetTransactionSnapshot,
  createComponentLinkTransactionSnapshot,
  serializeAssetTransactionSnapshot,
} from "../src/lib/asset-transaction-snapshot.ts"

// The RT- of group 3 spec §8.5 as the checkin route writes it: dock-1 came back (a sync entry), mouse-1 did not (its
// link outstanding, its holder moved to the manager who returned), bag-1 did not either and has two installed links
// under the laptop (GP X1: both turn outstanding, one snapshot entry).
const BEFORE = new Date("2026-10-20T03:00:00.000Z")
const SAVED = new Date("2026-10-25T03:00:00.500Z")
const LATER = new Date("2026-10-28T03:00:00.000Z")
const RT_CREATED = new Date("2026-10-25T03:00:00.000Z")
const RT_UPDATED = new Date("2026-10-25T03:00:01.000Z")

type LinkRow = {
  id: string; parentAssetId: string; componentAssetId: string; status: string; removedAt: Date | null
  referenceType: string | null; referenceId: string | null; updatedAt: Date; updatedBy?: string
}
type AssetRow = {
  id: string; updatedAt: Date; statusId: string; conditionId: string; branchId: string; currentLocationId: string
  custodianId: string | null; departmentId: string | null
}
type World = {
  assets: Record<string, AssetRow>
  links: LinkRow[]
  checkoutReturned: boolean
  rtStatus: string
  movements: Array<{ assetId: string; movementType: string; referenceType: string | null; referenceId: string | null; performedAt: Date }>
  calls: string[]
  linkWrites: Array<{ where: Record<string, unknown>; data: Record<string, unknown> }>
  failLinkRestore: boolean
  document: { beforeSnapshotJson: string; afterSnapshotJson: string }
}

const asset = (id: string, fields: Partial<AssetRow>): AssetRow => ({
  id, updatedAt: SAVED, statusId: "status-ready", conditionId: "cond-good", branchId: "branch-1", currentLocationId: "loc-it",
  custodianId: null, departmentId: "dept-it", ...fields,
})
const link = (id: string, componentAssetId: string, fields: Partial<LinkRow> = {}): LinkRow => ({
  id, parentAssetId: "laptop-1", componentAssetId, status: "outstanding", removedAt: null, referenceType: "checkin", referenceId: "rt-1",
  updatedAt: SAVED, ...fields,
})
const held = { currentLocationId: "loc-desk", custodianId: "emp-holder", departmentId: "dept-sales", updatedAt: BEFORE }

function savedWorld(options: { outstanding: boolean } = { outstanding: true }): World {
  const before = {
    laptop: asset("laptop-1", { ...held, statusId: "status-checked-out" }),
    dock: asset("dock-1", held),
    mouse: asset("mouse-1", held),
    bag: asset("bag-1", held),
  }
  const after = {
    laptop: asset("laptop-1", {}),
    dock: asset("dock-1", {}),
    mouse: asset("mouse-1", { currentLocationId: "loc-desk", custodianId: "emp-manager", departmentId: "dept-hr" }),
    bag: asset("bag-1", { currentLocationId: "loc-desk", custodianId: "emp-manager", departmentId: "dept-hr" }),
  }
  const dockLink = link("link-dock", "dock-1", { status: "installed", referenceType: null, referenceId: null, updatedAt: BEFORE })
  const installed = { status: "installed", updatedAt: BEFORE }
  const components = options.outstanding
    ? {
        before: [
          createComponentLinkTransactionSnapshot(dockLink, before.dock),
          createComponentLinkTransactionSnapshot(link("link-mouse", "mouse-1", installed), before.mouse, { referenceType: "purchase", referenceId: "PO-7" }),
          createComponentLinkTransactionSnapshot(link("link-bag-a", "bag-1", installed), before.bag, { referenceType: null, referenceId: null }),
        ],
        after: [
          createComponentLinkTransactionSnapshot(dockLink, after.dock),
          createComponentLinkTransactionSnapshot(link("link-mouse", "mouse-1"), after.mouse),
          createComponentLinkTransactionSnapshot(link("link-bag-a", "bag-1"), after.bag),
        ],
      }
    : { before: [createComponentLinkTransactionSnapshot(dockLink, before.dock)], after: [createComponentLinkTransactionSnapshot(dockLink, after.dock)] }
  return {
    assets: options.outstanding
      ? { "laptop-1": after.laptop, "dock-1": after.dock, "mouse-1": after.mouse, "bag-1": after.bag }
      : { "laptop-1": after.laptop, "dock-1": after.dock },
    links: options.outstanding
      ? [dockLink, link("link-mouse", "mouse-1"), link("link-bag-a", "bag-1"), link("link-bag-b", "bag-1")]
      : [dockLink],
    checkoutReturned: true,
    rtStatus: "active",
    movements: [],
    calls: [],
    linkWrites: [],
    failLinkRestore: false,
    document: {
      beforeSnapshotJson: serializeAssetTransactionSnapshot(createAssetTransactionSnapshot({
        asset: before.laptop, checkout: { id: "co-1", isReturned: false }, components: components.before,
      })),
      afterSnapshotJson: serializeAssetTransactionSnapshot(createAssetTransactionSnapshot({
        asset: after.laptop, checkout: { id: "co-1", isReturned: true }, components: components.after,
      })),
    },
  }
}

// Each where key is an equality, a Date, { in } or { not }.
function matches(row: Record<string, unknown>, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, condition]) => {
    const value = row[key]
    if (condition instanceof Date) return value instanceof Date && value.getTime() === condition.getTime()
    if (condition && typeof condition === "object") {
      if ("in" in condition) return (condition.in as unknown[]).includes(value)
      if ("not" in condition) return value !== condition.not
    }
    return value === condition
  })
}

// Only the calls the repository makes; anything else is undefined and throws, so a new query shows up here.
function fakeDb(world: World) {
  const later = (date: Date) => new Date(date.getTime() + 60_000)
  const db = {
    $transaction: async (work: (tx: unknown) => Promise<unknown>) => work(db),
    assetCheckin: {
      findUnique: async () => ({
        id: "rt-1", assetId: "laptop-1", transactionStatus: world.rtStatus, createdAt: RT_CREATED, updatedAt: RT_UPDATED,
        voidedAt: null, checkoutId: "co-1", ...world.document,
      }),
      count: async () => 0,
      updateMany: async () => {
        world.calls.push("assetCheckin.updateMany")
        world.rtStatus = "void"
        return { count: 1 }
      },
    },
    asset: {
      findUnique: async ({ where }: { where: { id: string } }) => world.assets[where.id] ?? null,
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        world.calls.push("asset.updateMany")
        const row = world.assets[where.id as string]
        if (!row || !matches(row, where)) return { count: 0 }
        const fields = { ...data }
        delete fields.updatedBy
        Object.assign(row, fields, { updatedAt: later(row.updatedAt) })
        return { count: 1 }
      },
    },
    assetComponent: {
      findMany: async ({ where }: { where: Record<string, unknown> }) =>
        world.links.filter((row) => matches(row, where)).map((row) => ({ ...row, componentAsset: world.assets[row.componentAssetId] })),
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        world.calls.push("assetComponent.updateMany")
        world.linkWrites.push({ where, data })
        if (world.failLinkRestore) return { count: 0 }
        const rows = world.links.filter((row) => matches(row, where))
        for (const row of rows) Object.assign(row, data, { updatedAt: later(row.updatedAt) })
        return { count: rows.length }
      },
    },
    assetCheckout: {
      findUnique: async () => ({ id: "co-1", isReturned: world.checkoutReturned }),
      count: async () => 0,
      updateMany: async () => {
        world.checkoutReturned = false
        return { count: 1 }
      },
    },
    assetTransfer: { count: async () => 0 },
    assetMovement: {
      findMany: async ({ where }: { where: { assetId: string; performedAt: { gt: Date }; NOT: { referenceType: string; referenceId: string } } }) =>
        world.movements.filter((row) => row.assetId === where.assetId && row.performedAt > where.performedAt.gt
          && !(row.referenceType === where.NOT.referenceType && row.referenceId === where.NOT.referenceId)),
      create: async () => ({ id: "movement-cancel" }),
    },
    systemLog: { create: async () => ({}) },
    assetStateReview: {
      findFirst: async () => null,
      create: async () => ({ id: "review-1" }),
    },
  }
  return db
}

const cancel = (world: World) => cancelAssetTransaction(
  { type: "checkin", transactionId: "rt-1", userId: "user-9", reason: "บันทึกผิดคน", expectedUpdatedAt: RT_UPDATED.toISOString() },
  createPrismaAssetTransactionCancellationRepository(fakeDb(world) as never),
)
const linkState = (world: World, id: string) => {
  const row = world.links.find((candidate) => candidate.id === id)!
  return { status: row.status, referenceType: row.referenceType, referenceId: row.referenceId, updatedBy: row.updatedBy ?? null }
}
const holder = (world: World, id: string) => {
  const row = world.assets[id]
  return [row.currentLocationId, row.custodianId, row.departmentId]
}

test("cancelling an RT- puts every outstanding link back to installed with its own reference, both duplicate links included, and the components back with their holder (group 3 spec §8.5, P2-R6, GP X1)", async () => {
  const world = savedWorld()
  const result = await cancel(world)

  assert.equal(result.status, "cancelled", JSON.stringify(result))
  const restored = { status: "installed", referenceType: "purchase", referenceId: "PO-7", updatedBy: "user-9" }
  assert.deepEqual(world.linkWrites.slice(0, 2), [
    { where: { id: "link-mouse", status: "outstanding", referenceType: "checkin", referenceId: "rt-1", removedAt: null, updatedAt: SAVED }, data: restored },
    { where: { id: { not: "link-mouse" }, parentAssetId: "laptop-1", componentAssetId: "mouse-1", status: "outstanding", referenceType: "checkin", referenceId: "rt-1", removedAt: null }, data: restored },
  ], "the snapshot link behind the after entry's updatedAt, then its duplicates")
  assert.deepEqual(linkState(world, "link-mouse"), { status: "installed", referenceType: "purchase", referenceId: "PO-7", updatedBy: "user-9" })
  assert.deepEqual(linkState(world, "link-bag-a"), { status: "installed", referenceType: null, referenceId: null, updatedBy: "user-9" })
  assert.deepEqual(linkState(world, "link-bag-b"), { status: "installed", referenceType: null, referenceId: null, updatedBy: "user-9" })
  assert.deepEqual(linkState(world, "link-dock"), { status: "installed", referenceType: null, referenceId: null, updatedBy: null }, "a returned component's link is not written")
  for (const id of ["dock-1", "mouse-1", "bag-1", "laptop-1"]) assert.deepEqual(holder(world, id), ["loc-desk", "emp-holder", "dept-sales"], id)
  assert.equal(world.checkoutReturned, false)
  assert.equal(world.rtStatus, "void")
})

test("an RT- whose components all came back cancels as before and writes no link", async () => {
  const world = savedWorld({ outstanding: false })
  assert.equal((await cancel(world)).status, "cancelled")
  assert.equal(world.calls.includes("assetComponent.updateMany"), false)
})

test("a link that changed after the check refuses the cancel as stale, before the RT- is voided (P2-R6)", async () => {
  const world = savedWorld()
  world.failLinkRestore = true
  await assert.rejects(cancel(world), { code: "TRANSACTION_STALE" })
  assert.equal(world.calls.includes("assetCheckin.updateMany"), false)
})

test("after a late return the RT- cannot be cancelled: its link changed (components_changed), and the late return's lines on the parent are not downstream work (GP X2)", async () => {
  // Stand alone (a fake of T5's route): the link ends, the component goes to IT stock, the parent gets component_remove referencing the RT-.
  const standalone = savedWorld()
  Object.assign(standalone.links.find((row) => row.id === "link-mouse")!, { status: "removed", removedAt: LATER, updatedAt: LATER })
  Object.assign(standalone.assets["mouse-1"], { currentLocationId: "loc-it", custodianId: null, departmentId: "dept-it", updatedAt: LATER })
  standalone.movements.push({ assetId: "laptop-1", movementType: "component_remove", referenceType: "checkin", referenceId: "rt-1", performedAt: LATER })
  assert.deepEqual(await cancel(standalone), { status: "blocked", reviewId: "review-1", reasons: ["components_changed"] })

  // Re-attached (a fake of T5's route): the link is installed again and the parent row was claimed.
  const reattached = savedWorld()
  Object.assign(reattached.links.find((row) => row.id === "link-mouse")!, { status: "installed", updatedAt: LATER })
  Object.assign(reattached.assets["mouse-1"], { currentLocationId: "loc-it", custodianId: null, departmentId: "dept-it", updatedAt: LATER })
  reattached.assets["laptop-1"].updatedAt = LATER
  reattached.movements.push({ assetId: "laptop-1", movementType: "component_install", referenceType: "checkin", referenceId: "rt-1", performedAt: LATER })
  const blocked = await cancel(reattached)
  assert.equal(blocked.status, "blocked")
  assert.ok("reasons" in blocked && blocked.reasons.includes("components_changed"))
  assert.ok("reasons" in blocked && !blocked.reasons.includes("downstream_work"))

  for (const world of [standalone, reattached]) {
    assert.equal(world.calls.includes("assetComponent.updateMany"), false)
    assert.equal(world.rtStatus, "active")
  }
})
```
  - Create `tests/checkin-outstanding-components-route.test.ts`.
    - It runs the real route, the real `syncInstalledComponentsWithParent` and T1's real `src/lib/checkin-department.ts`, on a stateful fake db. Do not mock `@/lib/checkin-department`: a mock that misses one of its exports fails the import, and the fake db answers its reads anyway.
    - The mocked modules are those of `tests/checkin-maintenance-ticket-route.test.ts`: `next/server`, `auth-utils`, `audit-log`, `asset-status-flow`, `operation-document-number` and `asset-operation-evidence`. Here the evidence helpers read the form for real, and the save is counted.
    - The fake answers the reads T1 and T2 added the way that file answers them after T2:
      - `systemSetting`: none, so the code is `IT`;
      - `department`: the active `IT` row;
      - `location`: an active room;
      - `assetCheckout.updateMany`: `{ count: 1 }`;
      - `maintenanceTicket.findFirst`: none.
    - The multipart refusal test ("saves no evidence file") relies on T2 having moved the evidence save after the pre-transaction checks (P2-R15); this task's pre-check goes above that save.

      If T1 or T2 added a read or a mocked export that this list misses, copy its answer from that file.
```ts
import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

type AssetRow = {
  id: string; assetTag: string; name: string; ownershipType: string; isActive: boolean; statusId: string; conditionId: string
  branchId: string; currentLocationId: string; custodianId: string | null; departmentId: string | null; updatedAt: Date
}
type LinkRow = {
  id: string; parentAssetId: string; componentAssetId: string; status: string; removedAt: Date | null
  referenceType: string | null; referenceId: string | null; updatedAt: Date
}
type World = {
  assets: Record<string, AssetRow>
  links: LinkRow[]
  employees: Record<string, { id: string; departmentId: string; isActive: boolean }>
  holderId: string
  ownHandovers: string[]
  calls: Array<{ call: string; args: Record<string, unknown> }>
  checkin: Record<string, unknown> | null
  saves: number
  failLinkMark: boolean
  clock: number
}

const BEFORE = new Date("2026-10-20T03:00:00.000Z")
const held = { isActive: true, statusId: "status:Ready", conditionId: "cond-good", branchId: "branch-1", currentLocationId: "loc-desk", custodianId: "emp-holder", departmentId: "dept-sales", updatedAt: BEFORE }
const row = (id: string, assetTag: string, name: string, ownershipType: string, fields: Partial<AssetRow> = {}): AssetRow => ({ id, assetTag, name, ownershipType, ...held, ...fields })
const link = (id: string, componentAssetId: string, fields: Partial<LinkRow> = {}): LinkRow => ({
  id, parentAssetId: "laptop-1", componentAssetId, status: "installed", removedAt: null, referenceType: null, referenceId: null, updatedAt: BEFORE, ...fields,
})

function freshWorld(): World {
  return {
    assets: Object.fromEntries([
      row("laptop-1", "NB-0001", "Notebook", "personal", { statusId: "status:Checked Out" }),
      row("dock-1", "DK-0001", "Dock", "component"),
      row("mouse-1", "MS-0001", "Mouse", "component"),
      row("hub-1", "HB-0001", "USB hub", "shared"),
      row("bag-1", "BG-0001", "Laptop bag", "component"),
      row("keyboard-1", "KB-0001", "Keyboard", "personal"),
      row("pen-1", "PN-0001", "Stylus", "component"),
    ].map((asset) => [asset.id, asset])),
    // Sorted by id, the order the route reads them in. bag-1 has two installed links (GP X1); pen-1 belongs to another laptop.
    links: [
      link("link-bag-a", "bag-1"),
      link("link-bag-b", "bag-1"),
      link("link-dock", "dock-1"),
      link("link-hub", "hub-1"),
      link("link-kb", "keyboard-1"),
      link("link-mouse", "mouse-1", { referenceType: "purchase", referenceId: "PO-7" }),
      link("link-pen", "pen-1", { parentAssetId: "laptop-2" }),
    ],
    employees: {
      "emp-holder": { id: "emp-holder", departmentId: "dept-sales", isActive: true },
      "emp-manager": { id: "emp-manager", departmentId: "dept-hr", isActive: true },
      "emp-left": { id: "emp-left", departmentId: "dept-old", isActive: false },
    },
    // The handover's holder (its custodianId), the one former employee the form offers as ผู้คืน (S-R46).
    holderId: "emp-holder",
    // keyboard-1 has its own open HO-, so it does not travel (asset-component-sync.ts:146-162).
    ownHandovers: ["keyboard-1"],
    calls: [],
    checkin: null,
    saves: 0,
    failLinkMark: false,
    clock: Date.parse("2026-10-31T03:00:00.000Z"),
  }
}
let world = freshWorld()
Object.assign(globalThis, { __checkinOutstandingWorld: () => world })
beforeEach(() => { world = freshWorld() })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    export async function requireAuth() { return { id: "user-1", roles: ["system_admin"], permissions: [], employeeId: "emp-it" } }
    export function hasRole() { return true }
    export function hasPermission() { return true }
    export function requirePermission() {}
  `],
  ["@/lib/audit-log", `export async function logAudit() {}`],
  ["@/lib/asset-status-flow", `export async function isValidCheckinReturnStatus() { return true }`],
  ["@/lib/operation-document-number", `export async function generateCheckinDocumentNo() { return "RT-202610-0001" }`],
  ["@/lib/asset-operation-evidence", `
    const world = () => globalThis.__checkinOutstandingWorld()
    export function requiredFormText(formData, name) { return String(formData.get(name) ?? "") }
    export function optionalFormText(formData, name) { const value = formData.get(name); return typeof value === "string" && value.trim() ? value : null }
    export function optionalFormFile() { return null }
    export async function saveOperationEvidenceFile(file) {
      world().saves += 1
      return { fileName: file.name, originalName: file.name, fileType: file.type, fileSize: file.size, filePath: "/uploads/" + file.name }
    }
  `],
  ["@/lib/db", `
    const world = () => globalThis.__checkinOutstandingWorld()
    const tick = () => { world().clock += 1000; return new Date(world().clock) }
    // Each where key: an equality, null, { in }, or componentAsset: { isActive }.
    const matches = (row, where = {}) => Object.entries(where).every(([key, condition]) => {
      if (key === "componentAsset") return world().assets[row.componentAssetId]?.isActive === condition.isActive
      if (condition && typeof condition === "object" && "in" in condition) return condition.in.includes(row[key])
      return row[key] === condition
    })
    const withoutUpdatedBy = (data) => { const { updatedBy, ...rest } = data; return rest }
    const handover = () => ({ id: "co-1", assetId: "laptop-1", handoverMode: "temporary_loan", isReturned: false, transactionStatus: "active",
      checkoutDate: new Date("2026-10-01T03:00:00.000Z"), remark: null, custodianId: world().holderId, asset: { status: { name: "Checked Out" } } })
    function model(name) {
      return new Proxy({}, {
        get(_target, method) {
          return async (args = {}) => {
            world().calls.push({ call: name + "." + String(method), args })
            const where = args.where ?? {}
            if (name === "asset") {
              const asset = world().assets[where.id]
              if (method === "findFirst") return asset && (where.isActive === undefined || asset.isActive === where.isActive) ? { ...asset } : null
              if (method === "findUnique") return asset ? { ...asset } : null
              if (method === "update") { Object.assign(asset, withoutUpdatedBy(args.data), { updatedAt: tick() }); return { ...asset } }
            }
            if (name === "assetComponent") {
              const rows = world().links.filter((row) => matches(row, where))
              if (method === "findMany") return rows.map((row) => ({ ...row, componentAsset: { ...world().assets[row.componentAssetId] } }))
              if (method === "updateMany") {
                if (world().failLinkMark) return { count: 0 }
                for (const row of rows) Object.assign(row, withoutUpdatedBy(args.data), { updatedAt: tick() })
                return { count: rows.length }
              }
            }
            if (name === "assetCheckout") {
              if (method === "findFirst" || method === "findUnique") return handover()
              if (method === "findMany") return world().ownHandovers.filter((id) => where.assetId?.in?.includes(id)).map((assetId) => ({ assetId }))
              if (method === "update") return { id: "co-1", isReturned: true }
            }
            if (name === "assetCheckin" && method === "create") { world().checkin = { id: "rt-1", ...args.data }; return world().checkin }
            if (name === "assetCheckin" && method === "update") { Object.assign(world().checkin, args.data); return world().checkin }
            if (name === "assetCondition") return { name: "Good", isActive: true }
            if (name === "assetStatus") return { id: where.id, name: String(where.id).replace("status:", "") }
            if (name === "employee" && (method === "findUnique" || method === "findFirst")) {
              const employee = world().employees[where.id]
              return employee && (where.isActive === undefined || employee.isActive === where.isActive) ? employee : null
            }
            if (name === "location" && (method === "findUnique" || method === "findFirst")) return { id: where.id, code: "IT-01", name: "คลัง IT", isActive: true }
            if (name === "department" && (method === "findFirst" || method === "findUnique")) return { id: "dept-it", code: "IT", name: "Information Technology", isActive: true }
            if (method === "updateMany") return { count: 1 }
            if (method === "count") return 0
            if (method === "findMany") return []
            if (method === "findFirst" || method === "findUnique") return null
            return { id: name + "-new", ...(args.data ?? {}) }
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

;(nodeModule as unknown as { registerHooks(hooks: { resolve(specifier: string, context: unknown, next: (specifier: string, context: unknown) => unknown): unknown }): void }).registerHooks({
  resolve(specifier, context, nextResolve) {
    const source = mockedModuleSources.get(specifier)
    if (source !== undefined) return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`, shortCircuit: true }
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})

const route = await import(pathToFileURL("src/app/api/assets/[id]/checkin/route.ts").href) as {
  POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response>
}
const context = { params: Promise.resolve({ id: "laptop-1" }) }
const returnBody = (extra: Record<string, unknown> = {}) => ({
  checkoutId: "co-1", returnDate: "2026-10-30", returnByEmployeeId: "emp-holder", returnBy: "E001 - สมชาย ใจดี", receiveBy: "สมหญิง",
  conditionAfter: "cond-good", nextStatusId: "status:Ready", nextLocationId: "loc-it", ...extra,
})
const post = (body: Record<string, unknown>) => route.POST(new Request("http://localhost/api/assets/laptop-1/checkin", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
}), context)
const postForm = (form: FormData) => route.POST(new Request("http://localhost/api/assets/laptop-1/checkin", { method: "POST", body: form }), context)
const returnForm = (missingComponentIds: string[]) => {
  const form = new FormData()
  for (const [key, value] of Object.entries(returnBody())) form.append(key, String(value))
  for (const id of missingComponentIds) form.append("missingComponentIds", id)
  return form
}
const answer = async (response: Response) => [response.status, await response.json()] as const
type Snapshot = { components: Array<Record<string, unknown>> }
const snapshots = () => ({
  before: JSON.parse(String(world.checkin?.beforeSnapshotJson)) as Snapshot,
  after: JSON.parse(String(world.checkin?.afterSnapshotJson)) as Snapshot,
})
const entry = (snapshot: Snapshot, componentAssetId: string) => snapshot.components.filter((component) => component.componentAssetId === componentAssetId)
// The room, the holder and the department of a component that stays out (this task's rule).
const place = (id: string) => [world.assets[id].currentLocationId, world.assets[id].custodianId, world.assets[id].departmentId]
// A returned component's room and holder; its department is T1's (the return department through the sync).
const stock = (id: string) => [world.assets[id].currentLocationId, world.assets[id].custodianId]
const linkStatus = (id: string) => {
  const found = world.links.find((candidate) => candidate.id === id)!
  return [found.status, found.referenceType, found.referenceId, found.removedAt]
}
const written = (call: string) => world.calls.filter((entry) => entry.call === call).map((entry) => entry.args.data as Record<string, unknown>)
const outstandingMovements = () => [...written("assetMovement.create"), ...written("assetMovement.createMany").flat()].filter((row) => row.movementType === "component_outstanding")
const IT_STOCK = ["loc-it", null]
const AT_DESK = ["loc-desk", "emp-holder", "dept-sales"]

test("a return with every component ticked behaves as today: no link changes, every travelling component goes to IT stock (group 3 spec §8.5, Review Focus 1)", async () => {
  for (const extra of [{}, { missingComponentIds: [] }, { missingComponentIds: [], returnByEmployeeId: undefined }]) {
    world = freshWorld()
    const [status, body] = await answer(await post(returnBody(extra)))
    assert.equal(status, 201, JSON.stringify(body))
    assert.deepEqual([body.id, body.documentNo, body.missingComponents], ["rt-1", "RT-202610-0001", []], JSON.stringify(extra))
    assert.equal(world.calls.some(({ call }) => call === "assetComponent.updateMany"), false)
    assert.deepEqual(outstandingMovements(), [])
    assert.deepEqual(world.links.map((candidate) => candidate.status), Array(7).fill("installed"))
    for (const id of ["dock-1", "mouse-1", "hub-1", "bag-1"]) assert.deepEqual(stock(id), IT_STOCK, id)
    assert.deepEqual(place("keyboard-1"), AT_DESK, "a component with its own handover stays, as today")
    const { before, after } = snapshots()
    assert.deepEqual(after.components.map((component) => component.relationshipStatus), ["installed", "installed", "installed", "installed"])
    assert.equal(before.components.some((component) => "relationshipReferenceType" in component), false)
  }
})

test("a component left out stays with ผู้คืน in its room: its link turns outstanding under the RT-, and the others go to IT stock (spec §8.5, decision 7, P2-R1, P2-R2)", async () => {
  const [status, body] = await answer(await post(returnBody({ missingComponentIds: ["mouse-1"] })))

  assert.equal(status, 201, JSON.stringify(body))
  assert.deepEqual(body.missingComponents, [{ assetTag: "MS-0001", name: "Mouse" }])
  assert.deepEqual(linkStatus("link-mouse"), ["outstanding", "checkin", "rt-1", null])
  assert.deepEqual(place("mouse-1"), AT_DESK, "ผู้คืน is already its holder: nothing changes")
  for (const id of ["dock-1", "hub-1", "bag-1"]) assert.deepEqual(stock(id), IT_STOCK, id)
  assert.deepEqual(outstandingMovements(), [{
    assetId: "mouse-1", movementType: "component_outstanding",
    fromValue: JSON.stringify({ custodianId: "emp-holder", departmentId: "dept-sales" }),
    toValue: JSON.stringify({ custodianId: "emp-holder", departmentId: "dept-sales" }),
    reason: "Not returned with its parent asset", referenceType: "checkin", referenceId: "rt-1", performedBy: "user-1", remark: null,
  }])
  assert.equal(written("assetMovement.createMany").flat().some((row) => row.assetId === "mouse-1"), false, "the sync skips it")

  const { before, after } = snapshots()
  const [mouseBefore] = entry(before, "mouse-1")
  const [mouseAfter] = entry(after, "mouse-1")
  const [dockAfter] = entry(after, "dock-1")
  assert.deepEqual(Object.keys(mouseAfter), Object.keys(dockAfter), "the after entry has the sync's keys in the sync's order")
  assert.deepEqual(Object.keys(mouseBefore), [...Object.keys(dockAfter), "relationshipReferenceType", "relationshipReferenceId"])
  assert.deepEqual([mouseBefore.relationshipStatus, mouseBefore.relationshipReferenceType, mouseBefore.relationshipReferenceId], ["installed", "purchase", "PO-7"])
  assert.deepEqual([mouseAfter.componentLinkId, mouseAfter.relationshipStatus, mouseAfter.custodianId], ["link-mouse", "outstanding", "emp-holder"])
  assert.notEqual(mouseAfter.assetUpdatedAt, mouseBefore.assetUpdatedAt, "the component's row is written even when nothing changes")
  assert.notEqual(mouseAfter.relationshipUpdatedAt, mouseBefore.relationshipUpdatedAt)
  assert.equal(JSON.parse(String(world.checkin?.componentSnapshotJson)).changes.length, 4)
})

test("when ผู้คืน is not the holder, a missing component's holder becomes ผู้คืน with ผู้คืน's department, a ส่วนกลาง one keeps its department, and the room never changes; the holder who has left may still be ผู้คืน (spec §8.5, §8.3, call 13, P2-R7, S-R46)", async () => {
  const [status, body] = await answer(await post(returnBody({ missingComponentIds: ["mouse-1", "hub-1"], returnByEmployeeId: "emp-manager", returnBy: "E002 - ผู้จัดการ" })))

  assert.equal(status, 201, JSON.stringify(body))
  assert.deepEqual(body.missingComponents, [{ assetTag: "HB-0001", name: "USB hub" }, { assetTag: "MS-0001", name: "Mouse" }])
  assert.deepEqual(place("mouse-1"), ["loc-desk", "emp-manager", "dept-hr"])
  assert.deepEqual(place("hub-1"), ["loc-desk", "emp-manager", "dept-sales"])
  assert.deepEqual(outstandingMovements().map((row) => [row.assetId, row.toValue]), [
    ["hub-1", JSON.stringify({ custodianId: "emp-manager", departmentId: "dept-sales" })],
    ["mouse-1", JSON.stringify({ custodianId: "emp-manager", departmentId: "dept-hr" })],
  ])

  // The handover's holder has left: the form offers them as "(พ้นสภาพ)", they can still return (S-R46), and the component stays with them.
  world = freshWorld()
  world.holderId = "emp-left"
  assert.equal((await post(returnBody({ missingComponentIds: ["mouse-1"], returnByEmployeeId: "emp-left", returnBy: "E009 - (พ้นสภาพ)" }))).status, 201)
  assert.deepEqual(place("mouse-1"), ["loc-desk", "emp-left", "dept-old"])
})

test("a component with two installed links under the parent: both turn outstanding, with one snapshot entry and one movement (GP X1, Review Focus 2)", async () => {
  const [status, body] = await answer(await post(returnBody({ missingComponentIds: ["bag-1", "bag-1"] })))

  assert.equal(status, 201, JSON.stringify(body))
  assert.deepEqual(body.missingComponents, [{ assetTag: "BG-0001", name: "Laptop bag" }])
  assert.deepEqual([linkStatus("link-bag-a")[0], linkStatus("link-bag-b")[0]], ["outstanding", "outstanding"])
  const { before, after } = snapshots()
  assert.deepEqual(entry(before, "bag-1").map((component) => component.componentLinkId), ["link-bag-a"])
  assert.deepEqual(entry(after, "bag-1").map((component) => component.componentLinkId), ["link-bag-a"])
  assert.equal(outstandingMovements().length, 1)
  assert.deepEqual(place("bag-1"), AT_DESK)
})

test("a multipart return sends one missingComponentIds entry per id (P2-R1)", async () => {
  const response = await postForm(returnForm(["mouse-1", "dock-1"]))

  assert.equal(response.status, 201, await response.clone().text())
  assert.deepEqual([linkStatus("link-mouse")[0], linkStatus("link-dock")[0], linkStatus("link-hub")[0]], ["outstanding", "outstanding", "installed"])
})

const invalidComponent = { code: "ASSET_CHECKIN_MISSING_COMPONENT_INVALID", error: "ASSET_CHECKIN_MISSING_COMPONENT_INVALID", fieldErrors: { missingComponentIds: "checkinMissingComponentInvalid" } }
const returnerRefused = { code: "CHECKIN_MISSING_COMPONENT_RETURNER_REQUIRED", error: "CHECKIN_MISSING_COMPONENT_RETURNER_REQUIRED", fieldErrors: { returnBy: "checkinMissingComponentReturnerRequired" } }

test("a list the server cannot honour, or ผู้คืน who cannot keep what stays out, is refused under its field before anything is written (P2-R1, P2-R18)", async () => {
  const cases: Array<[Record<string, unknown>, number, Record<string, unknown>]> = [
    [{ missingComponentIds: ["mouse-1"], returnByEmployeeId: undefined }, 400, { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { returnBy: "checkinMissingComponentReturnerRequired" } }],
    [{ missingComponentIds: ["mouse-1"], returnByEmployeeId: "emp-gone" }, 400, returnerRefused],
    // emp-left has left and is not this handover's holder (emp-holder), so the form never offers them.
    [{ missingComponentIds: ["mouse-1"], returnByEmployeeId: "emp-left" }, 400, returnerRefused],
    [{ missingComponentIds: ["ghost-1"] }, 400, invalidComponent],
    [{ missingComponentIds: ["pen-1"] }, 400, invalidComponent],
    [{ missingComponentIds: ["keyboard-1"] }, 400, invalidComponent],
    [{ missingComponentIds: ["mouse-1", "ghost-1"] }, 400, invalidComponent],
    [{ missingComponentIds: "mouse-1" }, 400, { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { missingComponentIds: "required" } }],
    [{ missingComponentIds: Array.from({ length: 101 }, (_, index) => `c-${index}`) }, 400, { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { missingComponentIds: "outOfRange" } }],
  ]
  for (const [extra, status, body] of cases) {
    world = freshWorld()
    assert.deepEqual(await answer(await post(returnBody(extra))), [status, body], JSON.stringify(extra).slice(0, 80))
    for (const call of ["assetCheckin.create", "assetComponent.updateMany", "asset.update"]) {
      assert.equal(world.calls.some((entry) => entry.call === call), false, `${call} after ${JSON.stringify(extra).slice(0, 60)}`)
    }
  }
})

test("a multipart return refused for its list saves no evidence file (P2-R15)", async () => {
  const form = returnForm(["ghost-1"])
  form.append("photoAfterFiles", new File(["png"], "front.png", { type: "image/png" }))
  assert.deepEqual(await answer(await postForm(form)), [400, invalidComponent])
  assert.equal(world.saves, 0)
})

test("a link taken between the check and the write answers 409, so the page reloads instead of saving half a return (P2-R1)", async () => {
  world.failLinkMark = true
  assert.deepEqual(await answer(await post(returnBody({ missingComponentIds: ["mouse-1"] }))), [409, {
    code: "ASSET_CHANGED_DURING_OPERATION", error: "Asset status changed while this request was being saved. Reload the asset and try again.",
  }])
})

test("ส่งซ่อม with a component left out: the repair problem text names it (spec §8.3)", async () => {
  const [status] = await answer(await post(returnBody({ missingComponentIds: ["mouse-1"], nextStatusId: "status:Under Maintenance", conditionAfter: "cond-damaged", damageNote: "จอแตก" })))
  assert.equal(status, 201)
  assert.equal(written("maintenanceTicket.create")[0].problem, "ความเสียหาย: จอแตก\nส่วนควบที่ยังไม่ได้คืน: MS-0001 - Mouse")
})
```
  - In `tests/asset-movement-labels.test.ts`:
    - change `:81` to `assert.equal(written.size, 48, …)` (the message argument stays);
    - after `:107`, add `assert.equal(th.component_outstanding, "ส่วนควบค้างคืน")` and `assert.equal(movementTypes("en").component_outstanding, "Component not returned")`.
  - In `tests/asset-history-rules.test.ts:49`, make the expected chip `checkin: ["checkin", "checkin_cancel", "parent_checkin_sync", "component_outstanding"],`.
  - Append to `tests/api-error-catalog.test.ts` (it already imports `getApiErrorKey` and `readFileSync`; T2's test pins the returner refusal's words):
```ts
test("a missing-components list the server cannot honour reads its own words under its field (group 3 spec §8.5, P2-R1)", () => {
  assert.equal(getApiErrorKey("ASSET_CHECKIN_MISSING_COMPONENT_INVALID"), "checkinMissingComponentInvalid")
  const words = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).apiErrors
  assert.deepEqual([words("th").checkinMissingComponentInvalid, words("en").checkinMissingComponentInvalid], [
    "ส่วนควบบางชิ้นในรายการไม่ได้ติดอยู่กับทรัพย์สินนี้แล้ว โหลดหน้าใหม่แล้วลองอีกครั้ง",
    "A component in the list is no longer installed in this asset. Reload the page and try again.",
  ])
})
```

- [ ] **Step 2: Run them and see them fail.**
  - Run `node --test tests/asset-component-outstanding.test.ts tests/asset-department-rule.test.ts tests/asset-transaction-snapshot-routes.test.ts tests/asset-transaction-cancellation-prisma.test.ts tests/checkin-outstanding-components-route.test.ts tests/asset-movement-labels.test.ts tests/asset-history-rules.test.ts tests/api-error-catalog.test.ts`.
  - Expected failures:
    - `asset-component-outstanding`: `ERR_MODULE_NOT_FOUND`.
    - `asset-department-rule` and `asset-transaction-snapshot-routes`: the import fails (no export named `getOutstandingComponentCustody` / `createComponentLinkTransactionSnapshot`).
    - `asset-transaction-cancellation-prisma`: `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` ("TypeScript parameter property is not supported in strip-only mode"). The repository's constructor uses parameter properties (checked 2026-10-31).
    - `checkin-outstanding-components-route`: every test fails, on the route's half. After T2 the field parses, so:
      - the validation cases already answer as expected: no `returnByEmployeeId` (T2's refine), a string, and 101 ids;
      - the route still ignores the list. It answers 201 without `missingComponents` (`undefined` where `[]` or a list is expected), marks no link (`installed` where `outstanding` is expected), writes no `component_outstanding` line, and leaves the repair problem without the missing line;
      - the refusal test fails at its first route case, `emp-gone` (201 where 400 is expected). The multipart refusal answers 201 and saves the photo, and the 409 test answers 201.
    - `asset-movement-labels`: `47 !== 48`, and the label is `undefined`.
    - `asset-history-rules`: the labelled types lack `component_outstanding`.
    - `api-error-catalog`: `null !== 'checkinMissingComponentInvalid'`.

- [ ] **Step 3: Implement.**
  - **a. The pure module.** Create `src/lib/asset-component-outstanding.ts` with the Produces names and values and no import.
    - Header comment: "A component link that did not come back on a return (group 3 spec §8.5): still linked to its parent, not installed. Every installed-only read keeps pairing `status: "installed"` with `removedAt: null`, so an outstanding link drops out of them. Spread a where into a query; never mutate it."
    - `isOutstandingLink` per the test.
  - **b. The custody rule.** Append `getOutstandingComponentCustody` (Produces) to `src/lib/asset-department-rule.ts`. Add no import (the module's purity test). Comment: "A component that did not come back stays with ผู้คืน (spec §8.5, decision 11, call 13): ผู้คืน's department, except a ส่วนกลาง one, which keeps its department (decision 10). ผู้คืน who already holds it changes nothing (D23). The room never changes."
  - **c. The snapshot module** (`src/lib/asset-transaction-snapshot.ts`).
    - Add `relationshipReferenceType?: string | null` and `relationshipReferenceId?: string | null` as the last members of `AssetComponentTransactionSnapshotV1` (`:4-17`) and of `AssetComponentTransactionSnapshotInput` (`:54-67`). Comment on the V1 type: "Before entries only (P2-R6): the link's own reference, which cancelling the RT- puts back. Never on an after entry, and never in `loadContext`'s rebuild: the cancel compares after entries as JSON (asset-transaction-cancellation-service.ts:143-145), so an extra key there would block every past document."
    - Add `function isOptionalNullableString(value: unknown): value is string | null | undefined` (undefined, or `isNullableString`).
    - Append `&& isOptionalNullableString(value.relationshipReferenceType) && isOptionalNullableString(value.relationshipReferenceId)` to `isComponentSnapshot`.
    - After `createComponentTransactionSnapshot`, add `createComponentLinkTransactionSnapshot` (Produces). It calls `createComponentTransactionSnapshot` with an object literal in exactly the sync's order (`asset-component-sync.ts:186-213`):
      - `componentLinkId: link.id`, `componentAssetId`, `parentAssetId`, `relationshipStatus: link.status`, `relationshipUpdatedAt: link.updatedAt`;
      - `assetUpdatedAt: asset.updatedAt`, then `statusId`, `conditionId`, `branchId`, `currentLocationId`, `custodianId`, `departmentId`;
      - then `...(restore ? { relationshipReferenceType: restore.referenceType, relationshipReferenceId: restore.referenceId } : {})`.

      Leave the sync and `loadContext` on their own literals. The route test pins the helper against the sync, and the cancel test pins it against `loadContext`.
  - **d. The cancellation repository** (`src/lib/asset-transaction-cancellation-prisma.ts`).
    - Replace the constructor's parameter properties (`:39-42`) with two fields in the class body, `private readonly db: CancellationDb` and `private readonly rootDb: PrismaClient`, assigned in a plain `constructor(db: CancellationDb, rootDb: PrismaClient)`. Nothing else changes, and `node --test` can then load the module.
    - Import `COMPONENT_LINK_OUTSTANDING` from `./asset-component-outstanding.ts`.
    - In `applyCancellation`'s component loop, after `if (componentUpdate.count !== 1) throw …` (`:178`): when `current.relationshipStatus === COMPONENT_LINK_OUTSTANDING` and `component.relationshipStatus !== COMPONENT_LINK_OUTSTANDING`, write the link back. Use `data = { status: component.relationshipStatus, referenceType: component.relationshipReferenceType ?? null, referenceId: component.relationshipReferenceId ?? null, updatedBy: input.userId }`:
      1. Run `this.db.assetComponent.updateMany({ where: { id: component.componentLinkId, status: COMPONENT_LINK_OUTSTANDING, referenceType: input.document.type, referenceId: input.document.id, removedAt: null, updatedAt: new Date(current.relationshipUpdatedAt) }, data })`.
         - `current` equals the after entry here (the cancel is eligible only when they match), so this is the after snapshot's `relationshipUpdatedAt` (P2-R6).
         - A count other than 1 throws `new AssetTransactionCancellationServiceError("TRANSACTION_STALE")`.
      2. Run `this.db.assetComponent.updateMany({ where: { id: { not: component.componentLinkId }, parentAssetId: component.parentAssetId, componentAssetId: component.componentAssetId, status: COMPONENT_LINK_OUTSTANDING, referenceType: input.document.type, referenceId: input.document.id, removedAt: null }, data })`, with no count check. These are the duplicate links the RT- turned outstanding with this one (GP X1). They take the snapshot link's reference.

      A component whose link stayed installed writes no link.
  - **e. The request.** Nothing to add. The route reads `input.missingComponentIds` (T2's field: `string[]`, deduplicated, `[]` when absent), and T2's refine has already refused a non-empty list with no `returnByEmployeeId`. Do not edit `src/lib/validations/asset-operations.ts` or the multipart parse.
  - **f. The route** (`src/app/api/assets/[id]/checkin/route.ts`).
    - **Imports** (merge with what T1 and T2 already import; T1 brings `AssetOperationConflictError` and `normalizeAssetOwnershipType`, T2 or T1 brings `import type { Prisma } from "@prisma/client"`, so do not add them twice):
      - `import type { Prisma } from "@prisma/client"`;
      - `COMPONENT_LINK_OUTSTANDING` from `@/lib/asset-component-outstanding`;
      - `getOutstandingComponentCustody` from `@/lib/asset-department-rule`;
      - `normalizeAssetOwnershipType` from `@/lib/asset-ownership`;
      - `AssetOperationConflictError` from `@/lib/asset-operation-claim`;
      - `buildAssetOperationComponentLinkWhere` from `@/lib/asset-operation-search-rules`;
      - `createComponentLinkTransactionSnapshot` and `type AssetComponentTransactionSnapshotChangeV1` from `@/lib/asset-transaction-snapshot`.
    - **Helpers**, after `repairStatusRequiredResponse` and not exported (a route file exports its handlers only):
```ts
// The refusals of the missing-components list (group 3 spec §8.5, P2-R1, P2-R18), keyed by their catalogued codes; each
// lands under its field. The returner code and key are Task 2's.
const MISSING_COMPONENT_REFUSALS = {
  CHECKIN_MISSING_COMPONENT_RETURNER_REQUIRED: { field: "returnBy", key: "checkinMissingComponentReturnerRequired" },
  ASSET_CHECKIN_MISSING_COMPONENT_INVALID: { field: "missingComponentIds", key: "checkinMissingComponentInvalid" },
} as const
type MissingComponentRefusalCode = keyof typeof MISSING_COMPONENT_REFUSALS

const missingComponentLinkSelect = {
  id: true, parentAssetId: true, componentAssetId: true, status: true, updatedAt: true, referenceType: true, referenceId: true,
  componentAsset: {
    select: {
      assetTag: true, name: true, ownershipType: true, updatedAt: true, statusId: true, conditionId: true,
      branchId: true, currentLocationId: true, custodianId: true, departmentId: true,
    },
  },
} satisfies Prisma.AssetComponentSelect
type MissingComponentLink = Prisma.AssetComponentGetPayload<{ select: typeof missingComponentLinkSelect }>
type MissingComponentPlan = { returner: { id: string; departmentId: string } | null; links: MissingComponentLink[] }
```
      - **`class CheckinMissingComponentRefusalError extends Error`:**
        - `constructor(code: MissingComponentRefusalCode)` calls `super(code)`, then sets `this.name = "CheckinMissingComponentRefusalError"` and `readonly code: MissingComponentRefusalCode` in the body (no parameter property: `node --test` strips types only);
        - always construct it with the code as a string literal, `new CheckinMissingComponentRefusalError("CHECKIN_MISSING_COMPONENT_RETURNER_REQUIRED")` or `new CheckinMissingComponentRefusalError("ASSET_CHECKIN_MISSING_COMPONENT_INVALID")`, never through a variable. The catalog scanner (`tests/api-error-catalog.test.ts:69-79`) reads every `new …Error("…")` literal and needs it catalogued;
        - `function missingComponentRefusalResponse(code: MissingComponentRefusalCode)` answers `400 { code, error: code, fieldErrors: { [MISSING_COMPONENT_REFUSALS[code].field]: MISSING_COMPONENT_REFUSALS[code].key } }`.
      - **`async function readMissingComponentPlan(db: Pick<Prisma.TransactionClient, "employee" | "assetComponent" | "assetCheckout">, parentAssetId: string, input: { missingComponentIds: string[]; returnByEmployeeId?: string | null }, holderEmployeeId: string | null): Promise<MissingComponentPlan>`**, in this order:
        1. An empty list returns `{ returner: null, links: [] }` and reads nothing. Every caller that sends no ids makes no new query.
        2. ผู้คืน: `db.employee.findUnique({ where: { id: input.returnByEmployeeId }, select: { id: true, departmentId: true, isActive: true } })`, with **no** `isActive` filter in the where. A missing id, no row, or `!employee.isActive && employee.id !== holderEmployeeId` throws `new CheckinMissingComponentRefusalError("CHECKIN_MISSING_COMPONENT_RETURNER_REQUIRED")` (T2's code and key). Comment: what stays out stays with ผู้คืน, so ผู้คืน must be an employee who can hold it; the handover's holder who has left is the one inactive employee the form offers, and may return (spec §8.3, S-R46). The plan keeps `returner: { id, departmentId }`.
        3. The links: `db.assetComponent.findMany({ where: { ...buildAssetOperationComponentLinkWhere(parentAssetId), componentAssetId: { in: input.missingComponentIds } }, select: missingComponentLinkSelect, orderBy: { id: "asc" } })`.
        4. When any link was found, read the components' own open handovers: `db.assetCheckout.findMany({ where: { assetId: { in: <their component ids> }, isReturned: false, transactionStatus: "active" }, select: { assetId: true } })`. This is the sync's skip, `asset-component-sync.ts:146-152`.
        5. Drop the links of handed-over components. Every requested id must keep at least one link; otherwise throw `new CheckinMissingComponentRefusalError("ASSET_CHECKIN_MISSING_COMPONENT_INVALID")`.
        6. Return `{ returner, links }`. The links are every travelling link of each id, duplicates included.
      - **`async function markComponentsOutstanding(tx: Prisma.TransactionClient, input: { plan: MissingComponentPlan; checkinId: string; userId: string; remark: string | null }): Promise<{ changes: AssetComponentTransactionSnapshotChangeV1[]; missingComponents: { assetTag: string; name: string }[] }>`**, in this order:
        1. With no returner or no links, return `{ changes: [], missingComponents: [] }` and write nothing.
        2. Run `tx.assetComponent.updateMany({ where: { id: { in: linkIds }, status: "installed", removedAt: null }, data: { status: COMPONENT_LINK_OUTSTANDING, referenceType: "checkin", referenceId: input.checkinId, updatedBy: input.userId } })`. A count other than `linkIds.length` throws `new AssetOperationConflictError("ASSET_CHANGED_DURING_OPERATION", "Asset status changed while this request was being saved. Reload the asset and try again.")`.
        3. Re-read `tx.assetComponent.findMany({ where: { id: { in: linkIds } }, select: { id: true, status: true, updatedAt: true } })` for the after entries.
        4. For each component, take its first link in `plan.links` order (the snapshot link, GP X1):
           1. Compute `custody = getOutstandingComponentCustody({ ownership: normalizeAssetOwnershipType(componentAsset.ownershipType), custodianId, departmentId, returner })`.
           2. Run `tx.asset.update({ where: { id: componentAssetId }, data: { custodianId: custody.custodianId, departmentId: custody.departmentId, updatedBy: input.userId }, select: { updatedAt: true, statusId: true, conditionId: true, branchId: true, currentLocationId: true, custodianId: true, departmentId: true } })`. Run it **always**, even when nothing changes:
              - the write takes the component's row lock, so a checkout, transfer or bulk-move that claims the component waits for this RT- (T4 re-reads the link after its claim; CO R4);
              - it gives the after entry its `assetUpdatedAt`.

              The room is not in `data` (spec §8.5).
           3. Run `tx.assetMovement.create({ data })` with exactly these keys: `{ assetId: componentAssetId, movementType: "component_outstanding", fromValue: JSON.stringify({ custodianId: <before>, departmentId: <before> }), toValue: JSON.stringify({ custodianId: <after>, departmentId: <after> }), reason: "Not returned with its parent asset", referenceType: "checkin", referenceId: input.checkinId, performedBy: input.userId, remark: input.remark }`.
           4. Push `{ before: createComponentLinkTransactionSnapshot(link, link.componentAsset, { referenceType: link.referenceType || null, referenceId: link.referenceId || null }), after: createComponentLinkTransactionSnapshot({ ...link, status: <re-read status>, updatedAt: <re-read updatedAt> }, <updated asset>) }`. The `|| null` turns an empty string into null, which the snapshot validator refuses as text.
        5. `missingComponents` holds one `{ assetTag, name }` per component, sorted by `assetTag` with `localeCompare`.
    - **The pre-check.** Add `await readMissingComponentPlan(prisma, id, input, checkout.custodianId)` as the last of the pre-transaction checks, after T1's department read and T2's room and date checks. It goes directly **above** T2's `saveCheckinEvidence(evidence)` line, so a refused list saves no file (P2-R15). The result is discarded; a refusal throws.
    - **Inside the transaction:**
      - The order after `if (handoverStatusError) throw …` is fixed: T1's `readCheckinDepartment(tx)`, T2's room re-read, T2's handover claim, **this task's missing plan**, then `generateCheckinDocumentNo(tx, input.returnDate)`. So, directly after T2's claim (its `claimed.count !== 1` throw) and before `generateCheckinDocumentNo`, add `const missingPlan = await readMissingComponentPlan(tx, id, input, checkout.custodianId)`. `checkout` is the pre-read handover; the claimed row is the same handover, so its holder has not changed. A component taken since the pre-check is refused before the RT- number is taken.
      - Directly above `const componentSync = await syncInstalledComponentsWithParent(tx, {`, add `const outstanding = await markComponentsOutstanding(tx, { plan: missingPlan, checkinId: record.id, userId: user.id, remark: input.remark ?? null })`.
        - It must run **before** the sync: the sync's status filter (`asset-component-sync.ts:118`) then skips the outstanding links, so only the returned components follow the parent (spec §8.5 "Save").
        - Leave the sync call itself unchanged. `tests/asset-component-sync-routes.test.ts:97-104` reads it.
    - **The repair problem.** `buildMaintenanceProblem(input, missingComponents: { assetTag: string; name: string }[])`, called as `buildMaintenanceProblem(input, outstanding.missingComponents)`. Its new line goes between `อุปกรณ์ไม่ครบ` and `หมายเหตุตอนรับคืน`: `` missingComponents.length > 0 ? `ส่วนควบที่ยังไม่ได้คืน: ${missingComponents.map((component) => `${component.assetTag} - ${component.name}`).join(", ")}` : null ``.
    - **The snapshots.** Use `const componentChanges = [...componentSync.componentSnapshots, ...outstanding.changes]`:
      - `beforeSnapshot.components` = `componentChanges.map((change) => change.before)`;
      - `afterSnapshot.components` = `componentChanges.map((change) => change.after)`;
      - `componentSnapshotJson` = `serializeAssetComponentTransactionSnapshots(componentChanges)`.
    - **The answer.**
      - The transaction also returns `missingComponents: outstanding.missingComponents`; destructure it beside `record: checkin` and `componentSync`.
      - Answer `NextResponse.json({ ...checkin, missingComponents }, { status: 201 })`. T6 adds `repair` beside it.
      - `logAudit` stays as it is: `...input` already carries `missingComponentIds`, and `newValue` stays on one line.
    - **The catch.** First, add `if (error instanceof CheckinMissingComponentRefusalError) return missingComponentRefusalResponse(error.code)`. T1's branch already answers `AssetOperationConflictError` as `409 { code: error.code, error: error.message }` (T2 kept it); keep it and T2's branches as they are.
  - **g. The new movement type.**
    - In `src/lib/asset-movement-labels.ts`, add `"component_outstanding",` after `"removed_from_parent",` (`:33`) in `ASSET_MOVEMENT_LABELLED_TYPES`, and make the comment at `:4` say "The 48 types". It is not a mirror type: no parent row records it. Add only this type: labelling `component_late_return` before anything writes it fails `tests/asset-movement-labels.test.ts:88-92` (labels = written types + 2). Task 5 adds it and takes the count to 49.
    - In `src/lib/asset-history-rules.ts:45`, make the chip `checkin: ["checkin", "checkin_cancel", "parent_checkin_sync", "component_outstanding"],`. Do not add the type to `ASSET_HISTORY_REASON_TYPES`: its reason is a fixed English sentence. The history reads the holder change from the `{ custodianId, departmentId }` values.
    - In `src/app/[locale]/(dashboard)/disposal/[id]/page.tsx`, add `"component_outstanding",` to `knownMovementTypeKeys` after `"removed_from_parent",` (`:459`).
  - **h. Catalog and words.**
    - In `src/lib/api-error-catalog.ts`, add one row: `"ASSET_CHECKIN_MISSING_COMPONENT_INVALID": "checkinMissingComponentInvalid",` directly after T2's `"ASSET_CHECKIN_LOCATION_INACTIVE": "checkinLocationInactive",` (so above `"ASSET_CHECKIN_REPAIR_STATUS_REQUIRED"`, HEAD `:30`). Do not add `CHECKIN_MISSING_COMPONENT_RETURNER_REQUIRED`: T2 catalogued it, and a second copy is a duplicate key (TS1117).
    - Save `<scratchpad>/p2-t3-messages.json` and run `node scripts/messages-edit.mjs <scratchpad>/p2-t3-messages.json`. Expected: `messages updated: 2 th, 2 en, 0 deleted`. Leave `apiErrors.checkinMissingComponentReturnerRequired` as T2 set it.
```json
{ "set": {
  "th": {
    "apiErrors.checkinMissingComponentInvalid": "ส่วนควบบางชิ้นในรายการไม่ได้ติดอยู่กับทรัพย์สินนี้แล้ว โหลดหน้าใหม่แล้วลองอีกครั้ง",
    "asset.movementTypes.component_outstanding": "ส่วนควบค้างคืน"
  },
  "en": {
    "apiErrors.checkinMissingComponentInvalid": "A component in the list is no longer installed in this asset. Reload the page and try again.",
    "asset.movementTypes.component_outstanding": "Component not returned"
  }
} }
```

- [ ] **Step 4: Run them and see them pass, then the full checks.**
  - Re-run the Step 2 command, plus the regressions: `node --test tests/checkin-maintenance-ticket-route.test.ts tests/v-track2-x.test.ts tests/asset-handover-checkin.test.ts tests/asset-component-sync.test.ts tests/asset-component-sync-routes.test.ts tests/asset-transaction-cancellation-service.test.ts tests/asset-transaction-cancellation-policy.test.ts tests/api-error-exposure.test.ts tests/thai-glossary.test.ts`.
  - Expected: all pass.
    - The catalog scanner (`tests/api-error-catalog.test.ts:69-79`) finds every new literal catalogued: `new CheckinMissingComponentRefusalError("CHECKIN_MISSING_COMPONENT_RETURNER_REQUIRED")` (T2's row), `new CheckinMissingComponentRefusalError("ASSET_CHECKIN_MISSING_COMPONENT_INVALID")` (this task's row) and `new AssetOperationConflictError("ASSET_CHANGED_DURING_OPERATION", …)`. The movement's `reason:` sentence is not a scanned key.
    - `asset-movement-labels` counts 48 written types.
  - Then run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: no failures and 0 lint errors.
  - If a pin outside this task's list fails, rewrite it in this commit and name it in the report.

- [ ] **Step 5: Commit.**
```
git add src/lib/asset-component-outstanding.ts src/lib/asset-department-rule.ts src/lib/asset-transaction-snapshot.ts src/lib/asset-transaction-cancellation-prisma.ts "src/app/api/assets/[id]/checkin/route.ts" src/lib/asset-movement-labels.ts src/lib/asset-history-rules.ts "src/app/[locale]/(dashboard)/disposal/[id]/page.tsx" src/lib/api-error-catalog.ts messages/th.json messages/en.json tests/asset-component-outstanding.test.ts tests/checkin-outstanding-components-route.test.ts tests/asset-transaction-cancellation-prisma.test.ts tests/asset-department-rule.test.ts tests/asset-transaction-snapshot-routes.test.ts tests/asset-movement-labels.test.ts tests/asset-history-rules.test.ts tests/api-error-catalog.test.ts
git commit -m "feat(checkin): a component not ticked as returned stays with ผู้คืน as an outstanding link under the RT-, with a ส่วนควบค้างคืน line and one snapshot entry, and cancelling the RT- puts every link back with its own reference (group 3 spec §8.5, P2-R1, P2-R2, P2-R6, P2-R7)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: An outstanding component is not installed elsewhere (group 3 spec §8.5 "Everywhere else", §8.6 eligibility, §8.2 row badges, §7.2 held count; P2-R4 row shape, P2-R17)

An outstanding component (T3 made its link `status: "outstanding"`) is held by ผู้คืน and sits on its own. รับคืน takes it on a new verdict path, `componentReturn`, which comes before every other checkin rule. ส่งมอบ, โอนย้าย, the bulk move and the legacy backfill refuse it, in their verdicts and in their routes (with a re-read after the claim). The legacy count leaves it out, the held count counts it, the search row carries what the late-return panel needs (T9), and `?assetId=` on รับคืน starts with that row. No installed-only read changes (Global Constraints), so the audit counts an outstanding component as an asset on its own; Step 1 pins its reads. The component paths, ถอดออก, disposal and the late-return route are Task 5's. The §8.5 "Asset pages" lines (the parent's components tab, the component's own "ค้างคืน · อยู่กับ …" line) are Task 12's; this task gives the component's page only its รับคืน action and the frame fact `outstanding` that Task 12 reads.

**Decisions (beyond the skeleton):**
- **The fact is `{ linkId, checkinId }`** (`AssetOperationOutstandingFact`). The full late-return shape (P2-R4) is the search row's `lateReturn`, built from the same read. The verdicts read only whether the link exists; a full fact would make the register (a page of rows), the asset page and the four routes read the RT- and the parent's handover and repair just to refuse. Task 5's route passes `outstanding: { linkId: linkRow.id, checkinId: checkinNow.id }`.
- **A fourth `componentReturn` refusal:** a link that names no RT- → `asset.transactionReasonNoReturnRecord`. Task 3 always writes the reference, so this only covers a link written outside the app; without it such a row would be eligible with no `lateReturn`, and the panel would have nothing to post.
- **A new reason for "has its own open handover":** `asset.transactionReasonComponentOwnHandover`, "ส่วนควบนี้มีใบส่งมอบของตัวเองค้างอยู่ ถอดออกจากเครื่องหลักก่อน". P2-R17 names the refusal without words, and the existing open-handover reasons point to โอนย้าย or ส่งมอบ. Because `componentReturn` comes first, the handover path never returns such a component; ถอดออก (Task 5) ends the link, after which the handover path applies, so the words point there.
- **Status Missing (หาไม่พบ) is not refused:** only Disposed, Retired and Lost are. Missing means "not found, being traced", and a component brought back is found. Lost (สูญหาย, confirmed) stays refused.
- **`ASSET_COMPONENT_OUTSTANDING` is the API code string**, catalogued as `apiErrors.componentOutstanding`; Task 5's install refusal reuses the code and key. Task 3's link-status constant is `COMPONENT_LINK_OUTSTANDING` (value `"outstanding"`); this task does not import it, and reads the status only through `outstandingLinkWhere`.
- **Duplicate outstanding links of one component (GP X1):** the search, the register and the frame keep the newest (`updatedAt desc, id asc`), so `lateReturn.linkId` names one of them. Task 5's route ends every outstanding link of that component under that parent and RT-.
- **The re-read after the claim** (ส่งมอบ, โอนย้าย, the legacy backfill, the bulk move) closes the race with a concurrent RT-: Task 3's RT- always writes the outstanding component's asset row, so the claim waits for it, and the re-read then sees the link.

**Files:**
- Create:
  - `src/lib/component-late-return.ts` (`LateReturnParent`, `getLateReturnOutcome`, the IT-stock rule). Task 5 modifies it, never re-creates it: it appends its outcome constant and the late-return date rule beside this task's import, and keeps `LateReturnParent` and the normalised `"ready"` compare. `getLateReturnDepartmentId` lives in `src/lib/asset-department-rule.ts` (Task 5), not here.
  - `src/lib/legacy-return-rule.ts` (the legacy where, moved out of `checkin-page-data.ts` so the pure `asset-list-query.ts` can import it in Task 7)
  - `tests/component-late-return.test.ts` (Task 5 appends its date and `parentInStock` tests to it)
  - `tests/component-outstanding-audit-reads.test.ts` (a source pin: the audit's component reads stay installed-only, spec §8.5)
- Modify:
  - `src/lib/asset-operation-eligibility.ts`: imports `:1-7`; `AssetOperationFacts` `:18-28`; `AssetCheckinPath` `:31`; `AssetOperationRefusalCode` `:41`; `assetOperationRefusalReasonKeys` `:44-50`; `getCheckoutVerdict` `:77-85`; `getCheckinVerdict` `:87-109`; `getTransferVerdict` `:113-121`; `getBulkMoveVerdict` `:123-130`
  - `src/lib/asset-operation-claim.ts` (append the outstanding guard after `claimAssetForCustodyChange`, `:30-52`)
  - `src/lib/asset-actions.ts`: `AssetActionInput` `:47-65`; after `firstIdByAssetId` `:74-81`; `factsOf` `:108-117`; the table in `getAssetActions` `:177-179`
  - `src/lib/asset-operation-search-rules.ts`: imports `:1-14`; after `buildAssetOperationComponentLinkWhere` `:205-208`; `AssetOperationSearchRow` `:265-296`; `buildAssetOperationSearchRow` `:388-447`
  - `src/lib/asset-operation-search.ts`: imports `:1-24`; the read-budget comment `:26-29`; `AssetOperationSearchDb` `:32-40`; `searchAssetOperationOptions` `:131-157`
  - `src/lib/asset-operation-picker-rules.ts` `:80-90`; `src/components/ui/asset-operation-picker.tsx` `RowDetail` `:422-428`
  - `src/lib/checkin-page-data.ts` `:1-27`, `:45-72`
  - `src/lib/asset-operation-options.ts` `:66-73` (the held-count groupBy)
  - `src/lib/asset-detail-frame.ts` `:1-72`
  - `src/app/[locale]/(dashboard)/assets/page.tsx`: import `:28`; the second `Promise.all` `:168-206`; after `:220`; the `getAssetActions({` call `:301-314`
  - `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`: `actionInput` `:327-342`
  - `src/app/api/assets/[id]/checkout/route.ts` `:9`, `:52-53`, `:91`, `:293-298`
  - `src/app/api/assets/[id]/transfer/route.ts` `:7`, `:42-43`, `:63`, `:187-190`
  - `src/app/api/assets/[id]/legacy-checkout/route.ts` `:6`, `:39-40`, `:72`, `:132-135`
  - `src/app/api/assets/bulk-move/route.ts` `:8`, `:31-35`, `:79-80`, `:132-135`
  - `src/lib/api-error-catalog.ts` (after `:34`)
  - `messages/th.json`, `messages/en.json`, only through `node scripts/messages-edit.mjs`
- Test (modify): `tests/asset-operation-eligibility.test.ts`, `tests/asset-actions.test.ts`, `tests/asset-operation-search-rules.test.ts`, `tests/asset-operation-search.test.ts`, `tests/asset-operation-picker-rules.test.ts`, `tests/asset-operation-picker-ui.test.ts`, `tests/checkin-page-data.test.ts`, `tests/asset-operation-master-options.test.ts`, `tests/asset-operation-claim.test.ts`, `tests/asset-custody-route-claims.test.ts`, `tests/asset-bulk-custody-routes.test.ts`, `tests/api-error-catalog.test.ts`, `tests/open-repair-filter.test.ts`, `tests/asset-transaction-cancellation-routes.test.ts`, `tests/v-track-s.test.ts`, `tests/asset-detail-frame.test.ts`, `tests/asset-register-transactions.test.ts`
- **Do not touch:**
  - any `status: "installed", removedAt: null` read (CO §0, §2). Step 1 pins the audit's: `src/lib/audit-round.ts:40-46`, `src/lib/audit-scan-data.ts:50-55`, `src/app/api/audit-rounds/[id]/scan/route.ts:1029-1035` and `:1062-1063`;
  - Task 5's files: `asset-components.ts`, `component-candidates/route.ts`, `asset-ownership.ts`, `disposal-readiness.ts`, `components/[componentId]/route.ts`;
  - `checkin-form.tsx` (Tasks 8-9) and the docs (Task 11).

**Pins this task breaks (each is rewritten in this commit, Step 1):**
- `tests/asset-operation-eligibility.test.ts`:
  - `:11-13` (the `facts` helper: `outstanding` is a required fact);
  - `:38-44` (the `assetOperationRefusalReasonKeys` deep-equal);
  - `:135-143` (`base: AssetActionInput` and `const f: AssetOperationFacts`);
  - `:177-183` (the closed reason-key set).
- `tests/asset-actions.test.ts:16-28` (`base: AssetActionInput`).
- `tests/asset-operation-search-rules.test.ts:189-198` (the `AssetOperationFacts[]` list).
- `tests/asset-operation-search.test.ts`:
  - `:42-80` (the fake: `assetComponent.findMany` answers every read with the detail links, and there is no `assetCheckin`);
  - `:209` (the component reads of `detail=1`);
  - `:218` (no `assetComponent.findMany` without `detail=1`).
- `tests/checkin-page-data.test.ts:109-116` (the legacy where deep-equal), `:122` (the facts helper).
- `tests/asset-operation-master-options.test.ts:99-103` (the held-count groupBy deep-equal).
- `tests/api-error-catalog.test.ts:109-113` (the refusal code → catalog key deep-equal).
- `tests/open-repair-filter.test.ts:9`: `openRepairRecordWhere` moves from `checkin-page-data.ts` to `legacy-return-rule.ts`.
- `tests/v-track-s.test.ts:434-438`: the checkout stub has no `assetComponent`. The outstanding pre-check runs first, so without it the stubbed route throws before the condition refusal the test expects.

**Interfaces:**
- Consumes:
  - **Task 3:** `outstandingLinkWhere` from `src/lib/asset-component-outstanding.ts`. Read here as a constant where fragment, `{ status: "outstanding", removedAt: null }`, spread into a Prisma `AssetComponentWhereInput`.
    - Task 3 writes `status: "outstanding"`, `referenceType: "checkin"` and `referenceId: <RT- id>` in one update, so every outstanding link names its RT-.
    - A component can have more than one outstanding link under one parent (P2-R1, GP X1).
  - `normalizeAssetStateName(value)` (`src/lib/asset-lifecycle-policy.ts:322`): trims and lower-cases.
  - `openCheckoutWhere` (`asset-operation-search-rules.ts:102`) and `openRepairRecordWhere` (`src/lib/repair-record-policy.ts:12`).
  - `buildAssetRegisterTransactionHref(locale, assetId, "checkin", returnTo, checkoutId)` (`src/lib/asset-operation-policy.ts:24-40`). With no `checkoutId` it gives `…/checkin?assetId=<id>&returnTo=…`.
  - `claimAssetForCustodyChange(tx, …)` (`asset-operation-claim.ts:30`). It is unchanged.
  - **Inactive assets:** every facts builder reads active assets only, so an inactive component never reaches a verdict, and the facts carry no `isActive`. The reads are:
    - the search (`{ isActive: true }`, `asset-operation-search-rules.ts:151`, `:169`);
    - the register (`asset-list-query.ts:87`);
    - the asset page (`assets/[id]/page.tsx:92`);
    - each route's own asset read (404).
- Produces:
  ```ts
  // src/lib/asset-operation-eligibility.ts
  export type AssetOperationOutstandingFact = { linkId: string; checkinId: string | null }   // checkinId: the link's referenceId (the RT- id)
  export type AssetOperationFacts = { /* today's six */ outstanding: AssetOperationOutstandingFact | null }   // required
  export type AssetCheckinPath = "handover" | "legacy" | "componentReturn" | null
  export type AssetOperationRefusalCode = AssetOperationOwnershipRefusalCode | "ASSET_COMPONENT_OUTSTANDING"
  // assetOperationRefusalReasonKeys.ASSET_COMPONENT_OUTSTANDING === "asset.transactionReasonComponentOutstanding"

  // src/lib/component-late-return.ts (pure; made here because the search row needs it before Task 5, which appends to this file)
  export type LateReturnParent = { isActive: boolean; statusName: string; custodianId: string | null; hasOpenCheckout: boolean; hasOpenRepair: boolean }
  export function getLateReturnOutcome(parent: LateReturnParent): "reattached" | "standalone"

  // src/lib/asset-operation-search-rules.ts
  export type AssetOperationLateReturn = {
    linkId: string; checkinId: string; checkinNo: string | null; checkinDate: string | null   // the RT-'s returnDate, ISO
    parent: { id: string; assetTag: string; name: string }; parentInStock: boolean
  }
  export type AssetOperationRowBadge = "handover" | "legacy" | "outstanding"
  // AssetOperationSearchRow gains (รับคืน only): lateReturn?: AssetOperationLateReturn; badge?: AssetOperationRowBadge
  export const assetOperationOutstandingLinkSelect   // Step 1 pins its value
  export type AssetOperationOutstandingLinkRecord = Prisma.AssetComponentGetPayload<{ select: typeof assetOperationOutstandingLinkSelect }>
  export const assetOperationOutstandingCheckinSelect = { id: true, documentNo: true, returnDate: true } satisfies Prisma.AssetCheckinSelect
  export type AssetOperationOutstandingRead = { link: AssetOperationOutstandingLinkRecord; checkin: { id: string; documentNo: string | null; returnDate: Date } | null }
  // buildAssetOperationSearchRow's context gains `outstanding?: AssetOperationOutstandingRead | null`

  // src/lib/asset-operation-search.ts: AssetOperationSearchDb gains assetCheckin: { findMany(args: object): Promise<unknown[]> }
  // src/lib/asset-operation-picker-rules.ts: AssetOperationRowDetail gains { kind: "outstanding"; parentTag: string; documentNo: string | null }

  // src/lib/asset-actions.ts
  // AssetActionInput gains `outstanding: AssetOperationOutstandingFact | null` (required)
  export function outstandingFactByAssetId(rows: ReadonlyArray<{ id: string; componentAssetId: string; referenceId: string | null }>): Map<string, AssetOperationOutstandingFact>
  // src/lib/asset-detail-frame.ts: AssetDetailFrame gains `outstanding: AssetOperationOutstandingFact | null`

  // src/lib/asset-operation-claim.ts (pure)
  export class AssetComponentOutstandingError extends Error {   // message and code "ASSET_COMPONENT_OUTSTANDING"
    readonly code: "ASSET_COMPONENT_OUTSTANDING"
    readonly blocked: Array<{ assetId: string; assetTag: string }>
  }
  export async function assertNoOutstandingComponentLinks(db: OutstandingLinkReader, assetIds: readonly string[]): Promise<void>

  // src/lib/legacy-return-rule.ts (pure): legacyReturnOwnershipTypes, legacyReturnStatusNames, legacyReturnCountWhere
  //   (moved, same names; re-exported from checkin-page-data.ts). Task 7 imports legacyReturnCountWhere from here.
  ```
  - **The route answers** (code catalogued as `apiErrors.componentOutstanding`):
    - ส่งมอบ and โอนย้าย: `409 { code: "ASSET_COMPONENT_OUTSTANDING", error: "ASSET_COMPONENT_OUTSTANDING", fieldErrors: { assetId: "componentOutstanding" } }`. Both forms have `assetId` in `FIELD_IDS` (`checkout-form.tsx:89`, `transfer-form.tsx:48`).
    - The legacy backfill: `409 { code, error }`, like its ownership refusal.
    - The bulk move: `409 { code, error, blocked: [{ assetId, assetTag, code }] }`, like its License refusal (`bulk-move/route.ts:36-42`).
  - **Words:** `asset.transactionReasonComponentOutstanding` and `apiErrors.componentOutstanding` are both "ส่วนควบค้างคืน รับคืนก่อน" (P2-R17). Task 5's install refusal reuses this code and key.

- [ ] **Step 1: Write the failing tests, and rewrite the pins above.**

`tests/component-late-return.test.ts` (new):
```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { getLateReturnOutcome } from "../src/lib/component-late-return.ts"

const stock = { isActive: true, statusName: "Ready", custodianId: null, hasOpenCheckout: false, hasOpenRepair: false }

test("a late return re-attaches only to a parent in IT stock: active, พร้อมใช้งาน, no holder, no open handover, no open repair (group 3 spec §8.6, P2-R17)", () => {
  assert.equal(getLateReturnOutcome(stock), "reattached")
  assert.equal(getLateReturnOutcome({ ...stock, statusName: " ready " }), "reattached")
  for (const [why, parent] of [
    ["inactive", { ...stock, isActive: false }], ["In Use", { ...stock, statusName: "In Use" }], ["Checked Out", { ...stock, statusName: "Checked Out" }],
    ["Under Maintenance", { ...stock, statusName: "Under Maintenance" }], ["Disposed", { ...stock, statusName: "Disposed" }],
    ["a holder", { ...stock, custodianId: "emp-1" }], ["an open handover", { ...stock, hasOpenCheckout: true }], ["an open repair", { ...stock, hasOpenRepair: true }],
  ] as const) assert.equal(getLateReturnOutcome(parent), "standalone", why)
})

test("the rule stays pure: relative .ts imports, no database", () => {
  const source = readFileSync("src/lib/component-late-return.ts", "utf8")
  assert.doesNotMatch(source, /from "@\/|@prisma\/client|\bprisma\./)
  for (const [, path] of source.matchAll(/from "([^"]+)"/g)) assert.match(path, /^\.\/[\w-]+\.ts$/, path)
})
```

`tests/component-outstanding-audit-reads.test.ts` (new). It passes before and after this task: it guards reads this task leaves alone.
```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("the audit reads installed links only, so an outstanding component is audited as an asset on its own, in the room where it is (group 3 spec §8.5)", () => {
  const round = readFileSync("src/lib/audit-round.ts", "utf8")
  const scanData = readFileSync("src/lib/audit-scan-data.ts", "utf8")
  const scan = readFileSync("src/app/api/audit-rounds/[id]/scan/route.ts", "utf8")
  // The round's component candidates, the scan list's component counts, the scan's "still installed under this parent" check and its confirmed components.
  assert.match(round, /prisma\.assetComponent\.findMany\(\{\s*where: \{\s*parentAsset: buildAuditAssetWhere\(input\),\s*status: "installed",\s*removedAt: null,/)
  assert.match(scanData, /prisma\.assetComponent\.groupBy\(\{\s*by: \["parentAssetId"\],\s*where: \{\s*status: "installed",\s*removedAt: null,/)
  assert.match(scan, /tx\.assetComponent\.findFirst\(\{\s*where: \{\s*parentAssetId,\s*componentAssetId,\s*status: "installed",\s*removedAt: null,\s*\}/)
  assert.match(scan, /tx\.assetComponent\.findMany\(\{\s*where: \{ parentAssetId, status: "installed", removedAt: null \}/)
  for (const [name, source] of [["audit-round", round], ["audit-scan-data", scanData], ["scan route", scan]]) {
    assert.doesNotMatch(source, /outstandingLinkWhere|"outstanding"/, name)
  }
})
```

`tests/asset-operation-eligibility.test.ts`:
- `:11-13`: the helper's base gains `outstanding: null` (after `conditionName: null`). Below it, add `const outstanding = { linkId: "link-1", checkinId: "rt-1" }`.
- `:38-44`: the deep-equal gains `ASSET_COMPONENT_OUTSTANDING: "asset.transactionReasonComponentOutstanding",`.
- `:135-138`: `base` gains `outstanding: null,` (after `conditionName: null,`).
- `:140`: the loop gains `for (const outstanding of [null, { linkId: "l-1", checkinId: "rt-1" }])` as its innermost level.
  - The `getAssetActions` call passes `outstanding`.
  - `:143` becomes `const f: AssetOperationFacts = { statusName, ownership, custodianId, openCheckout, hasOpenRepair, conditionName, outstanding }`.
  - `where` appends `${outstanding?.linkId}`.
  - After the `:152` href check, add `if (ownership === "component") assert.equal(list.some((item) => item.key === "checkin"), outstanding !== null, where)`.
  - The `:152` href check stays as it is: a `componentReturn` action opens `?assetId=`, never `checkoutId=`.
- `:177`: the loop gains `for (const outstanding of [null, { linkId: "l-1", checkinId: "rt-1" }, { linkId: "l-1", checkinId: null }])`, passed to `facts`.
- `:183` becomes `["ActiveMaintenance", "ComponentCheckin", "ComponentCheckout", "ComponentOutstanding", "ComponentOwnHandover", "ConditionDamaged", "ConditionNonFunctional", "ConditionSalvage", "HandoverModeMissing", "HandoverStatusMismatch", "LicenseCheckin", "LicenseCheckout", "LicenseMove", "NoReturnRecord", "OpenCheckout", "OpenCheckoutHandover", "StatusNotReady", "StatusNotReturnable", "StatusNotTransferable", "WrittenOff"]`.
- In the words test (`:160-175`), after the condition block (`:171`), add:
```ts
  // The outstanding component (group 3 spec §8.5, §8.6, P2-R17).
  assert.deepEqual(["ComponentOutstanding", "ComponentOwnHandover"].map((name) => [th.asset[`transactionReason${name}`], en.asset[`transactionReason${name}`]]), [
    ["ส่วนควบค้างคืน รับคืนก่อน", "An outstanding component: return it first"],
    ["ส่วนควบนี้มีใบส่งมอบของตัวเองค้างอยู่ ถอดออกจากเครื่องหลักก่อน", "This component has its own open handover. Remove it from its parent asset first."],
  ])
```
- Insert before the asset-page test (`:134`):
```ts
test("ส่งมอบ, โอนย้าย and the bulk move refuse an outstanding component before any other rule (group 3 spec §8.5, P2-R17)", () => {
  const why = no("asset.transactionReasonComponentOutstanding")
  for (const ownership of owners) for (const statusName of ["Ready", "In Use", "Disposed"]) {
    const f = facts({ ownership, statusName, custodianId: "e-1", outstanding })
    for (const verdict of [getCheckoutVerdict(f), getTransferVerdict(f, { assignCustodian: true }), getTransferVerdict(f, { assignCustodian: false }), getBulkMoveVerdict(f)]) {
      assert.deepEqual(verdict, why, `${ownership} ${statusName}`)
    }
  }
  assert.deepEqual(getCheckoutVerdict(facts({ openCheckout: handover("temporary_loan"), conditionName: "Salvage", outstanding })), why, "before the open handover and the condition")
})

test("รับคืน takes an outstanding component on the componentReturn path, before the handover, legacy and ownership rules (group 3 spec §8.6, P2-R17)", () => {
  const back = (overrides: Partial<AssetOperationFacts>) => getCheckinVerdict(facts({ custodianId: "e-1", outstanding, ...overrides }))
  const path = "componentReturn"
  for (const ownership of owners) for (const custodianId of [null, "e-1"]) assert.deepEqual(back({ ownership, custodianId }), { ...yes, path }, `${ownership} ${custodianId}`)
  // Missing (หาไม่พบ, being traced) is returned: a component brought back is found. Lost (สูญหาย, confirmed) is refused below.
  for (const statusName of ["Ready", "In Use", "Under Maintenance", "Pending Repair", "Pending Disposal", "Missing"]) assert.deepEqual(back({ statusName }), { ...yes, path }, statusName)
  for (const statusName of ["Disposed", "Retired", "Lost"]) assert.deepEqual(back({ statusName }), { ...no("asset.transactionReasonStatusNotReturnable"), path }, statusName)
  assert.deepEqual(back({ statusName: "In Use", openCheckout: handover("permanent_assignment") }), { ...no("asset.transactionReasonComponentOwnHandover"), path })
  assert.deepEqual(back({ hasOpenRepair: true }), { ...no("asset.transactionReasonActiveMaintenance"), path })
  assert.deepEqual(back({ outstanding: { linkId: "link-1", checkinId: null } }), { ...no("asset.transactionReasonNoReturnRecord"), path }, "a link that names no RT-")
  // In this order: the status, its own handover, an open repair, the RT- reference.
  assert.deepEqual(back({ statusName: "Lost", openCheckout: handover("temporary_loan"), hasOpenRepair: true }), { ...no("asset.transactionReasonStatusNotReturnable"), path })
  assert.deepEqual(back({ openCheckout: handover("temporary_loan"), hasOpenRepair: true, outstanding: { linkId: "link-1", checkinId: null } }), { ...no("asset.transactionReasonComponentOwnHandover"), path })
  assert.deepEqual(back({ hasOpenRepair: true, outstanding: { linkId: "link-1", checkinId: null } }), { ...no("asset.transactionReasonActiveMaintenance"), path })
  // Without the link the same asset takes today's paths.
  assert.deepEqual(getCheckinVerdict(facts({ ownership: "component", custodianId: "e-1" })), { ...no("asset.transactionReasonComponentCheckin"), path: "legacy" })
  assert.deepEqual(getCheckinVerdict(facts({ statusName: "In Use", custodianId: "e-1" })), { ...yes, path: "legacy" })
})
```

`tests/asset-actions.test.ts`:
- `:16-28`: `base` gains `outstanding: null,` after `openDisposalId: null,`. Add `outstandingFactByAssetId` to the import (`:5-13`).
- Append:
```ts
test("an outstanding component gets รับคืน, which opens its late return by ?assetId=; its handover and transfer say why not (group 3 spec §8.5, §8.6, P2-R17)", () => {
  const rt = `returnTo=${encodeURIComponent(base.returnTo)}`
  const outstanding = { linkId: "link-1", checkinId: "rt-1" }
  const component = actions({ ownership: "component", custodianId: "e-1", outstanding })
  assert.deepEqual(brief(component.primary), ["checkin", "asset.rowActionCheckin", true, null])
  assert.equal(component.primary?.href, `/th/asset-management/checkin?assetId=a-1&${rt}`)
  assert.deepEqual(component.transactions.map(brief), [["manageComponents", "asset.manageComponents", true, null], ["transfer", "asset.quickMoveComponent", false, "asset.transactionReasonComponentOutstanding"]])
  // Without the link a ส่วนควบ has no รับคืน (the legacy path refuses it, so it would sit disabled on every component).
  assert.equal(all({ ownership: "component", custodianId: "e-1" }).some((action) => action.key === "checkin"), false)
  const personal = actions({ custodianId: "e-1", outstanding })
  assert.equal(personal.primary?.href, `/th/asset-management/checkin?assetId=a-1&${rt}`)
  assert.deepEqual(personal.transactions.map(brief), [["checkout", "asset.rowActionCheckout", false, "asset.transactionReasonComponentOutstanding"], ["transfer", "asset.rowActionTransfer", false, "asset.transactionReasonComponentOutstanding"]])
})

test("the register's outstanding facts: the first link per component wins (callers order newest first)", () => {
  assert.deepEqual([...outstandingFactByAssetId([
    { id: "l-2", componentAssetId: "a-1", referenceId: "rt-2" }, { id: "l-1", componentAssetId: "a-1", referenceId: "rt-1" }, { id: "l-3", componentAssetId: "a-2", referenceId: null },
  ])], [["a-1", { linkId: "l-2", checkinId: "rt-2" }], ["a-2", { linkId: "l-3", checkinId: null }]])
})
```

`tests/asset-operation-search-rules.test.ts`:
- `:189-198`: each of the eight facts gains `outstanding: null`. Append a ninth: `{ statusName: "Ready", ownership: "personal", custodianId: "emp-1", openCheckout: null, hasOpenRepair: false, conditionName: null, outstanding: { linkId: "link-1", checkinId: "rt-1" } }`.
- After `:210` (the last "by value" line), add:
```ts
  // An outstanding component (group 3 spec §8.5, §8.6): refused by ส่งมอบ, taken by รับคืน.
  assert.deepEqual(verdict("mode=checkout&q=ab", facts[8]), { eligible: false, reasonKey: "asset.transactionReasonComponentOutstanding" })
  assert.deepEqual(verdict("mode=checkin&q=ab", facts[8]), { eligible: true, reasonKey: null })
```
- Add `assetOperationOutstandingLinkSelect`, `type AssetOperationOutstandingLinkRecord` and `type AssetOperationOutstandingRead` to the import (`:11-18`). Append:
```ts
const parentStock: AssetOperationOutstandingLinkRecord["parentAsset"] = {
  id: "asset-p", assetTag: "NB-0017", name: "โน้ตบุ๊ก Dell", isActive: true, custodianId: null, status: { name: "Ready" }, _count: { checkouts: 0, maintenanceTickets: 0 },
}
const outLink = (overrides: Partial<AssetOperationOutstandingLinkRecord> = {}): AssetOperationOutstandingLinkRecord =>
  ({ id: "link-1", componentAssetId: "asset-1", referenceId: "rt-1", parentAsset: parentStock, ...overrides })
const rt1 = { id: "rt-1", documentNo: "RT-202610-0004", returnDate: new Date("2026-10-20T00:00:00.000Z") }
const outRead = (link = outLink(), checkin: AssetOperationOutstandingRead["checkin"] = rt1): AssetOperationOutstandingRead => ({ link, checkin })
const late = (outstanding: AssetOperationOutstandingRead) => buildAssetOperationSearchRow(input("mode=checkin&q=0228"), held, { ...ctx(null), outstanding })

test("the outstanding link read: the link, its RT- reference, and its parent's IT-stock facts (group 3 spec §8.6, P2-R17)", () => {
  assert.deepEqual(assetOperationOutstandingLinkSelect, {
    id: true, componentAssetId: true, referenceId: true,
    parentAsset: { select: {
      id: true, assetTag: true, name: true, isActive: true, custodianId: true, status: { select: { name: true } },
      _count: { select: {
        checkouts: { where: { isReturned: false, transactionStatus: "active" } },
        maintenanceTickets: { where: { isActive: true, repairStatus: { notIn: ["closed", "cancelled"] } } },
      } },
    } },
  })
})

test("รับคืน: an outstanding component is a row of its own with its late return, its badge, and never ข้อมูลเก่า (group 3 spec §8.6, P2-R4, P2-R17)", () => {
  const row = late(outRead())
  assert.deepEqual(row.lateReturn, {
    linkId: "link-1", checkinId: "rt-1", checkinNo: "RT-202610-0004", checkinDate: "2026-10-20T00:00:00.000Z",
    parent: { id: "asset-p", assetTag: "NB-0017", name: "โน้ตบุ๊ก Dell" }, parentInStock: true,
  })
  assert.deepEqual([row.eligible, row.reasonKey, row.badge, "legacy" in row, "checkout" in row, row.holderKey, row.holderEmployeeId],
    [true, null, "outstanding", false, false, "employee:emp-1", "emp-1"])
  // The parent anywhere else: the panel says the component stands alone (P2-R4).
  for (const parentAsset of [{ ...parentStock, custodianId: "emp-2" }, { ...parentStock, status: { name: "In Use" } }, { ...parentStock, isActive: false },
    { ...parentStock, _count: { checkouts: 1, maintenanceTickets: 0 } }, { ...parentStock, _count: { checkouts: 0, maintenanceTickets: 1 } }]) {
    assert.equal(late(outRead(outLink({ parentAsset }))).lateReturn?.parentInStock, false, JSON.stringify(parentAsset))
  }
  // An RT- that cannot be read keeps its id; its number and date read null.
  assert.deepEqual([late(outRead(outLink(), null)).lateReturn?.checkinId, late(outRead(outLink(), null)).lateReturn?.checkinNo, late(outRead(outLink(), null)).lateReturn?.checkinDate], ["rt-1", null, null])
  // A link that names no RT- is refused, with no late return.
  const unlinked = late(outRead(outLink({ referenceId: null }), null))
  assert.deepEqual([unlinked.eligible, unlinked.reasonKey, "lateReturn" in unlinked, unlinked.badge], [false, "asset.transactionReasonNoReturnRecord", false, "outstanding"])
})

test("the other modes refuse an outstanding component and carry no รับคืน keys; the รับคืน badge follows the row (P2-R17)", () => {
  for (const mode of ["checkout", "transfer", "bulkMove"]) {
    const row = buildAssetOperationSearchRow(input(`mode=${mode}&q=0228`), asset, { openCheckout: null, hasOpenRepair: false, outstanding: outRead() })
    assert.deepEqual([row.eligible, row.reasonKey, "lateReturn" in row, "badge" in row], [false, "asset.transactionReasonComponentOutstanding", false, false], mode)
  }
  assert.equal(buildAssetOperationSearchRow(input("mode=checkin&q=0228"), held, ctx(handover)).badge, "handover")
  assert.equal(buildAssetOperationSearchRow(input("mode=checkin&q=0228"), held, ctx(null)).badge, "legacy")
  assert.equal("badge" in buildAssetOperationSearchRow(input("mode=checkin&q=0228"), asset, ctx(null)), false)
})
```

`tests/asset-operation-search.test.ts`:
- **Imports:** add `assetOperationOutstandingLinkSelect` and `type AssetOperationOutstandingLinkRecord` to the import (`:5-9`). Add `import { outstandingLinkWhere } from "../src/lib/asset-component-outstanding.ts"`.
- **The fake (`:42-80`):**
  - `Where` gains `componentAssetId?: { in: string[] }`.
  - The data parameter gains `outstanding?: AssetOperationOutstandingLinkRecord[]` and `checkins?: Array<{ id: string; documentNo: string | null; returnDate: Date }>`.
  - `assetComponent.findMany` becomes: push the call, then `if (args.where.componentAssetId) return (data.outstanding ?? []).filter((row) => args.where.componentAssetId!.in.includes(row.componentAssetId))`, else `return data.links ?? []`.
  - Add `assetCheckin: { async findMany(args: Args) { calls.push({ call: "assetCheckin.findMany", args }); return (data.checkins ?? []).filter((row) => (args.where.id as { in: string[] }).in.includes(row.id)) } }`.
- **The "nothing found" test (`:119-124`):** after `:122`, add `assert.equal(calls.some((call) => call.call === "assetComponent.findMany"), false)`.
- **`:209` becomes:**
  ```ts
  assert.deepEqual(calls.filter((call) => call.call === "assetComponent.findMany").map((call) => call.args.where), [{ componentAssetId: { in: ["asset-1"] }, ...outstandingLinkWhere }, { parentAssetId: "asset-1", status: "installed", removedAt: null, componentAsset: { isActive: true } }])
  ```
- **`:213` and `:218`:**
  - In the title, "reads nothing more" becomes "reads no installed links".
  - `:218` becomes `assert.deepEqual(plain.calls.filter((call) => call.call === "assetComponent.findMany").map((call) => call.args.where), [{ componentAssetId: { in: ["asset-1"] }, ...outstandingLinkWhere }], "only the outstanding-link fact read")`.
- **Append:**
```ts
const parentInStock = { id: "asset-p", assetTag: "NB-0017", name: "โน้ตบุ๊ก Dell", isActive: true, custodianId: null, status: { name: "Ready" }, _count: { checkouts: 0, maintenanceTickets: 0 } }
const outstandingLink = (id: string, componentAssetId: string): AssetOperationOutstandingLinkRecord => ({ id, componentAssetId, referenceId: "rt-1", parentAsset: parentInStock })

test("every mode reads the found ids' outstanding links once, newest first; รับคืน reads their RT- and lists the late return; the other modes refuse it (group 3 spec §8.5, §8.6, P2-R17)", async () => {
  const mouse = asset("NB-0017-02", { id: "c-2", custodianId: "emp-1", custodian: somchai })
  const data = {
    contains: [mouse, asset("A-9", { id: "a9" })], total: 2,
    outstanding: [outstandingLink("link-2", "c-2"), outstandingLink("link-1", "c-2")],   // two links of one component (GP X1): the first wins
    checkins: [{ id: "rt-1", documentNo: "RT-202610-0004", returnDate: new Date("2026-10-20T00:00:00.000Z") }],
  }
  const checkin = fakeDb(data)
  const row = (await searchAssetOperationOptions(checkin.db, input("mode=checkin&q=0017"))).rows.find((candidate) => candidate.id === "c-2")
  assert.deepEqual(row?.lateReturn, {
    linkId: "link-2", checkinId: "rt-1", checkinNo: "RT-202610-0004", checkinDate: "2026-10-20T00:00:00.000Z",
    parent: { id: "asset-p", assetTag: "NB-0017", name: "โน้ตบุ๊ก Dell" }, parentInStock: true,
  })
  assert.deepEqual([row?.eligible, row?.badge, row?.holderKey], [true, "outstanding", "employee:emp-1"])
  assert.deepEqual(checkin.calls.filter((call) => call.call === "assetComponent.findMany").map((call) => [call.args.where, call.args.select, call.args.orderBy]),
    [[{ componentAssetId: { in: ["c-2", "a9"] }, ...outstandingLinkWhere }, assetOperationOutstandingLinkSelect, [{ updatedAt: "desc" }, { id: "asc" }]]])
  assert.deepEqual(checkin.calls.filter((call) => call.call === "assetCheckin.findMany").map((call) => [call.args.where, call.args.select]),
    [[{ id: { in: ["rt-1"] } }, { id: true, documentNo: true, returnDate: true }]])
  for (const mode of ["checkout", "transfer", "bulkMove"]) {
    const other = fakeDb(data)
    const refused = (await searchAssetOperationOptions(other.db, input(`mode=${mode}&q=0017`))).rows.find((candidate) => candidate.id === "c-2")
    assert.deepEqual([refused?.eligible, refused?.reasonKey, refused && "lateReturn" in refused], [false, "asset.transactionReasonComponentOutstanding", false], mode)
    assert.equal(other.calls.filter((call) => call.call === "assetComponent.findMany").length, 1, mode)
    assert.equal(other.calls.some((call) => call.call === "assetCheckin.findMany"), false, `${mode}: no RT- read`)
  }
  const plain = fakeDb({ contains: [asset("A-9", { id: "a9" })], total: 1 })
  await searchAssetOperationOptions(plain.db, input("mode=checkin&q=A-9"))
  assert.equal(plain.calls.some((call) => call.call === "assetCheckin.findMany"), false, "no outstanding link, no RT- read")
})
```

`tests/asset-operation-picker-rules.test.ts`: in the second-line test (`:73-80`), add the clause ", an outstanding component reads its parent and its RT- (group 3 spec §8.6, P2-R17)" to the title, and add:
```ts
  const lateReturn = { linkId: "link-1", checkinId: "rt-1", checkinNo: "RT-202610-0004", checkinDate: "2026-10-20T00:00:00.000Z", parent: { id: "asset-p", assetTag: "NB-0017", name: "โน้ตบุ๊ก Dell" }, parentInStock: true }
  assert.deepEqual(getAssetOperationRowDetail(row({ lateReturn, badge: "outstanding" })), { kind: "outstanding", parentTag: "NB-0017", documentNo: "RT-202610-0004" })
  assert.deepEqual(getAssetOperationRowDetail(row({ lateReturn: { ...lateReturn, checkinNo: null } })), { kind: "outstanding", parentTag: "NB-0017", documentNo: null })
```

`tests/asset-operation-picker-ui.test.ts`:
- `:86`: add `'t("outstandingLine", { parentTag: detail.parentTag })'` to the list.
- After `:158`: add `outstandingLine: ["ส่วนควบค้างคืน ของ {parentTag}", "Outstanding component of {parentTag}"],`.

`tests/checkin-page-data.test.ts`:
- `:2` becomes `import { existsSync, readFileSync } from "node:fs"`. Add `import { outstandingLinkWhere } from "../src/lib/asset-component-outstanding.ts"`.
- `:109-116`: the expected where gains `installedInLinks: { none: outstandingLinkWhere },` after `maintenanceTickets`.
- `:122`: the facts gain `outstanding: null`.
- Append:
```ts
test("the legacy count, the legacy verdict and the legacy backfill leave an outstanding component out: one where, in a pure module (group 3 spec §8.5, P2-R17, P2-R20)", () => {
  assert.deepEqual(data.legacyReturnCountWhere.installedInLinks, { none: outstandingLinkWhere })
  const outstanding = { linkId: "link-1", checkinId: "rt-1" }
  for (const ownership of data.legacyReturnOwnershipTypes) for (const statusName of data.legacyReturnStatusNames) {
    const verdict = getCheckinVerdict({ statusName, ownership, custodianId: "emp-1", openCheckout: null, hasOpenRepair: false, conditionName: null, outstanding })
    assert.equal(verdict.path, "componentReturn", `${ownership} ${statusName}`)
  }
  const rule = readFileSync("src/lib/legacy-return-rule.ts", "utf8")
  assert.doesNotMatch(rule, /from "@\/|\bprisma\./)
  for (const line of rule.split(/\r?\n/).filter((line) => line.startsWith("import ") && !line.startsWith("import type "))) assert.match(line, /from "\.\/[\w-]+\.ts"$/, line)
  // The backfill route's guard reads the same where, before and after the claim.
  assert.match(readFileSync("src/lib/asset-operation-claim.ts", "utf8"), /\.\.\.outstandingLinkWhere/)
  const route = readFileSync("src/app/api/assets/[id]/legacy-checkout/route.ts", "utf8")
  assert.match(route, /assertNoOutstandingComponentLinks\(prisma, \[id\]\)/)
  assert.match(route, /assertNoOutstandingComponentLinks\(tx, \[id\]\)/)
})

test("?assetId= of an outstanding component starts with its late-return row, chosen or chosen-but-blocked (group 3 spec §8.6, P2-R17)", async () => {
  const lateRow = {
    id: "c-2", assetTag: "NB-0017-02", eligible: true, reasonKey: null, badge: "outstanding",
    lateReturn: { linkId: "link-1", checkinId: "rt-1", checkinNo: "RT-202610-0004", checkinDate: "2026-10-20T00:00:00.000Z", parent: { id: "asset-p", assetTag: "NB-0017", name: "โน้ตบุ๊ก Dell" }, parentInStock: true },
  }
  state.answer = { mode: "checkin", total: 1, rows: [lateRow] }
  assert.deepEqual(await data.getCheckinPreselect({ assetId: "c-2" }), { row: lateRow, query: "" })
  assert.deepEqual(state.calls.at(-1), { call: "search", args: { input: { mode: "checkin", q: "", id: "c-2", assignCustodian: false } } })
  const blocked = { ...lateRow, eligible: false, reasonKey: "asset.transactionReasonActiveMaintenance" }
  state.answer = { mode: "checkin", total: 1, rows: [blocked] }
  assert.deepEqual(await data.getCheckinPreselect({ assetId: "c-2" }), { row: blocked, query: "" })
})
```
The existing `?assetId=` test (`:94-106`) keeps its expectations. A legacy row still only fills the search.

`tests/asset-operation-master-options.test.ts`:
- Import `outstandingLinkWhere` from `../src/lib/asset-component-outstanding.ts`.
- Replace the comment at `:98` and the `where` line at `:101` with:
```ts
  // An installed component carries its parent's holder through the sync, whatever its ownership, so it would count twice. An outstanding
  // component is held by ผู้คืน on its own, so it counts, a ส่วนควบ included (group 3 spec §8.5, P2-R17).
  …
    where: {
      isActive: true,
      custodianId: { not: null },
      OR: [
        { ownershipType: { not: "component" }, installedInLinks: { none: { status: "installed", removedAt: null } } },
        { installedInLinks: { some: outstandingLinkWhere } },
      ],
    },
```

`tests/asset-operation-claim.test.ts`:
- Import `AssetComponentOutstandingError` and `assertNoOutstandingComponentLinks` with the existing names.
- Add `import { outstandingLinkWhere } from "../src/lib/asset-component-outstanding.ts"`.
- Append:
```ts
test("an outstanding component refuses a custody save: one read of the given ids' outstanding links, each named once in the order given (group 3 spec §8.5, P2-R17)", async () => {
  const calls: unknown[] = []
  const db = { assetComponent: { findMany: async (args: unknown) => {
    calls.push(args)
    return [{ componentAssetId: "a-2", componentAsset: { assetTag: "TAG-2" } }, { componentAssetId: "a-2", componentAsset: { assetTag: "TAG-2" } }, { componentAssetId: "a-1", componentAsset: { assetTag: "TAG-1" } }]
  } } }
  await assert.rejects(assertNoOutstandingComponentLinks(db, ["a-1", "a-2", "a-3"]), (error) =>
    error instanceof AssetComponentOutstandingError && error.code === "ASSET_COMPONENT_OUTSTANDING" && error.message === "ASSET_COMPONENT_OUTSTANDING"
    && JSON.stringify(error.blocked) === JSON.stringify([{ assetId: "a-1", assetTag: "TAG-1" }, { assetId: "a-2", assetTag: "TAG-2" }]))
  assert.deepEqual(calls, [{ where: { componentAssetId: { in: ["a-1", "a-2", "a-3"] }, ...outstandingLinkWhere }, select: { componentAssetId: true, componentAsset: { select: { assetTag: true } } } }])
  await assertNoOutstandingComponentLinks({ assetComponent: { findMany: async () => [] } }, ["a-1"])
})
```

`tests/asset-custody-route-claims.test.ts`:
- **Harness:**
  - `CustodyRouteState` (`:7-27`) gains `outstandingAssetIds: string[]` and `outstandingAnswers: string[][]`. Document them as "component asset ids with an outstanding link; each `assetComponent.findMany` takes the next of `outstandingAnswers` first, if any".
  - The initial state (`:29-46`) and `beforeEach` (`:178-195`) set both to `[]`.
  - In `model()`, before the generic `findFirst`/`findUnique → null` line (`:113`), add:
```js
            if (name === "assetComponent" && method === "findMany") {
              const out = state().outstandingAnswers.length > 0 ? state().outstandingAnswers.shift() : state().outstandingAssetIds
              return out.filter((id) => (args?.where?.componentAssetId?.in ?? []).includes(id)).map((componentAssetId) => ({ componentAssetId, componentAsset: { assetTag: "GRL-COM-26-0036" } }))
            }
```
- **Append:**
```ts
const outstandingAtAsset = [409, { code: "ASSET_COMPONENT_OUTSTANDING", error: "ASSET_COMPONENT_OUTSTANDING", fieldErrors: { assetId: "componentOutstanding" } }]

test("ส่งมอบ and โอนย้าย refuse an outstanding component under the asset field, before the ownership rule and any write (group 3 spec §8.5, P2-R17)", async () => {
  state.outstandingAssetIds = ["asset-1"]
  for (const [name, route, body] of [["checkout", checkoutRoute, checkoutBody], ["transfer", transferRoute, moveBody]] as const) {
    for (const ownership of ["personal", "component", "software_license"]) {
      state.assetOwnershipType = ownership
      state.calls = []
      assert.deepEqual(await refusal(await post(route, body)), outstandingAtAsset, `${name} ${ownership}`)
      assert.equal(state.calls.includes("asset.updateMany"), false, `${name} ${ownership}`)
    }
  }
})

test("the legacy backfill refuses an outstanding component before its ownership rule, with no field (group 3 spec §8.5, P2-R17)", async () => {
  state.assetStatusName = "In Use"
  state.outstandingAssetIds = ["asset-1"]
  for (const ownership of ["personal", "component"]) {
    state.assetOwnershipType = ownership
    state.calls = []
    assert.deepEqual(await refusal(await post(legacyCheckoutRoute, {})), [409, { code: "ASSET_COMPONENT_OUTSTANDING", error: "ASSET_COMPONENT_OUTSTANDING" }], ownership)
    assert.equal(state.calls.includes("assetCheckout.create"), false, ownership)
  }
})

test("a link turned outstanding while ส่งมอบ, โอนย้าย or the legacy backfill is saved is refused by the re-read after the claim, before any record (P2-R17)", async () => {
  for (const [name, route, body, statusName, record] of [
    ["checkout", checkoutRoute, checkoutBody, "Ready", "assetCheckout.create"],
    ["transfer", transferRoute, moveBody, "Ready", "assetTransfer.create"],
    ["legacy", legacyCheckoutRoute, {}, "In Use", "assetCheckout.create"],
  ] as const) {
    state.assetStatusName = statusName
    state.outstandingAnswers = [[], ["asset-1"]]
    state.calls = []
    const [status, answer] = await refusal(await post(route, body))
    assert.deepEqual([status, answer.code], [409, "ASSET_COMPONENT_OUTSTANDING"], name)
    const reads = state.calls.flatMap((call, index) => (call === "assetComponent.findMany" ? [index] : []))
    assert.equal(reads.length, 2, name)
    assert.ok(reads[1] > state.calls.indexOf("asset.updateMany"), `${name}: read again after the claim`)
    assert.equal(state.calls.includes(record), false, name)
  }
})
```

`tests/asset-bulk-custody-routes.test.ts`:
- **Harness:**
  - `BulkCustodyState` (`:16-20`) gains `outstandingAssetIds: string[]` and `outstandingAnswers: string[][]`.
  - The initial state (`:22`) and `beforeEach` (`:146-156`) set both to `[]`.
  - In `model()`, before the `assetStatus` line (`:89`), add:
```js
            if (name === "assetComponent" && method === "findMany") {
              const out = state().outstandingAnswers.length > 0 ? state().outstandingAnswers.shift() : state().outstandingAssetIds
              return out.filter((id) => (args?.where?.componentAssetId?.in ?? []).includes(id)).map((componentAssetId) => ({ componentAssetId, componentAsset: { assetTag: componentAssetId.toUpperCase() } }))
            }
```
- **Append:**
```ts
const outstandingBlocked = (assetId: string) => ({ assetId, assetTag: assetId.toUpperCase(), code: "ASSET_COMPONENT_OUTSTANDING" })

test("bulk move refuses an outstanding component first, named per asset (group 3 spec §8.5, §10.2, P2-R17)", async () => {
  state.outstandingAssetIds = ["component-1"]
  const response = await bulkMoveRoute.POST(jsonRequest("POST", { assetIds: ["ready-1", "component-1", "license-1"], toLocationId: "loc-2", reason: "ย้ายคลัง" }))
  assert.equal(response.status, 409)
  assert.deepEqual(await response.json(), { code: "ASSET_COMPONENT_OUTSTANDING", error: "ASSET_COMPONENT_OUTSTANDING", blocked: [outstandingBlocked("component-1")] })
  assert.deepEqual(assetWrites(), [])
})

test("a link turned outstanding while the bulk move is saved is refused by the re-read after the claims, before any movement (P2-R17)", async () => {
  state.outstandingAnswers = [[], ["ready-1"]]
  const response = await bulkMoveRoute.POST(jsonRequest("POST", { assetIds: ["ready-1"], toLocationId: "loc-2", reason: "ย้ายคลัง" }))
  assert.equal(response.status, 409)
  assert.deepEqual((await response.json() as { blocked: unknown }).blocked, [outstandingBlocked("ready-1")])
  const calls = state.calls.map(({ call }) => call)
  assert.ok(calls.lastIndexOf("assetComponent.findMany") > calls.indexOf("asset.updateMany"), "read again after the claims")
  assert.equal(calls.includes("assetMovement.createMany"), false)
})
```

`tests/api-error-catalog.test.ts:109-113`: the deep-equal gains `ASSET_COMPONENT_OUTSTANDING: "componentOutstanding",`. Its loop at `:129-134` then pins `apiErrors.componentOutstanding` to `asset.transactionReasonComponentOutstanding` in both languages.

`tests/open-repair-filter.test.ts:9`: `"src/lib/checkin-page-data.ts"` becomes `"src/lib/legacy-return-rule.ts"`.

`tests/asset-transaction-cancellation-routes.test.ts:27`: add `"src/lib/legacy-return-rule.ts",` after `"src/lib/checkin-page-data.ts",`. Both files keep an `isReturned: false … transactionStatus: "active"` where.

`tests/v-track-s.test.ts:437`: add `assetComponent: { findMany: () => [] },` after `assetCondition: { findUnique: () => null },`.

`tests/asset-detail-frame.test.ts`: in the frame test (`:185-199`), before the `doesNotMatch` line, add:
```ts
  // An outstanding link holding this asset (group 3 spec §8.5): the action rule's fact, one row.
  assert.match(source, /prisma\.assetComponent\.findFirst\(\{\s*where: \{ componentAssetId: assetId, \.\.\.outstandingLinkWhere \},\s*orderBy: \[\{ updatedAt: "desc" \}, \{ id: "asc" \}\],\s*select: \{ id: true, referenceId: true \},?\s*\}\)/)
  assert.match(source, /outstanding: outstandingLink \? \{ linkId: outstandingLink\.id, checkinId: outstandingLink\.referenceId \} : null/)
```

`tests/asset-register-transactions.test.ts`:
- In the asset-page test (`:67-72`), add `assert.match(source, /openDisposalId: frame\.openDisposalId,\n\s+outstanding: frame\.outstanding,/)`.
- In the register test (`:84-97`), add:
```ts
  assert.match(register, /prisma\.assetComponent\.findMany\(\{\s*where: \{ componentAssetId: \{ in: assetIds \}, \.\.\.outstandingLinkWhere \},\s*select: \{ id: true, componentAssetId: true, referenceId: true \},\s*orderBy: \[\{ updatedAt: "desc" \}, \{ id: "asc" \}\],?\s*\}\)/)
  assert.match(register, /conditionName: asset\.condition\.name,\n\s+outstanding: outstandingByAssetId\.get\(asset\.id\) \?\? null,\n\s+returnTo: registerReturnHref,/)
```

- [ ] **Step 2: Run them and see them fail.**

Command:
```
node --test tests/component-late-return.test.ts tests/component-outstanding-audit-reads.test.ts tests/asset-operation-eligibility.test.ts tests/asset-actions.test.ts tests/asset-operation-search-rules.test.ts tests/asset-operation-search.test.ts tests/asset-operation-picker-rules.test.ts tests/asset-operation-picker-ui.test.ts tests/checkin-page-data.test.ts tests/asset-operation-master-options.test.ts tests/asset-operation-claim.test.ts tests/asset-custody-route-claims.test.ts tests/asset-bulk-custody-routes.test.ts tests/api-error-catalog.test.ts tests/open-repair-filter.test.ts tests/asset-transaction-cancellation-routes.test.ts tests/v-track-s.test.ts tests/asset-detail-frame.test.ts tests/asset-register-transactions.test.ts
```

Expected failures:
- `component-late-return` and `legacy-return-rule`: `ERR_MODULE_NOT_FOUND`.
- The verdicts ignore `outstanding`, so the eligibility, search-rules and asset-actions tests fail. For example, ส่งมอบ answers `yes` where `asset.transactionReasonComponentOutstanding` is expected, and the checkin path reads `"legacy"`, not `"componentReturn"`.
- The search reads no outstanding links and has no `lateReturn` or `badge`.
- The claim test cannot import `assertNoOutstandingComponentLinks`.
- The routes answer 201 instead of 409.
- The legacy and held wheres lack the outstanding branch.
- The catalog maps `ASSET_COMPONENT_OUTSTANDING` to `null`.
- The words are undefined.
- The source pins miss the new reads.

`open-repair-filter`, `cancellation-routes` and `v-track-s` pass or fail only on the moved file, which does not exist yet.
`component-outstanding-audit-reads` already passes: it guards reads this task leaves alone.

- [ ] **Step 3: Implement.**

**3a. The verdicts** (`asset-operation-eligibility.ts`). Do this first: the required fact is what makes `tsc` find every builder. Import `normalizeAssetStateName` from `./asset-lifecycle-policy.ts`. Make the types as Produces. Document `outstanding` as: "The outstanding link (group 3 spec §8.5) that holds this asset as a component, from a dedicated query; null when there is none."
- `getCheckoutVerdict`, `getTransferVerdict` and `getBulkMoveVerdict` each start with `if (facts.outstanding) return no(assetOperationRefusalReasonKeys.ASSET_COMPONENT_OUTSTANDING)`. It goes before the ownership rule, so a ส่วนควบ reads the more useful reason.
- `getCheckinVerdict` starts with the `componentReturn` block. Every answer in it carries `path: "componentReturn"`. In order:
  1. a status of Disposed, Retired or Lost (compared through `normalizeAssetStateName`) → `asset.transactionReasonStatusNotReturnable`. Missing is not in the list (Decisions);
  2. `facts.openCheckout` (its own open handover) → `asset.transactionReasonComponentOwnHandover`;
  3. `facts.hasOpenRepair` → `asset.transactionReasonActiveMaintenance`;
  4. `!facts.outstanding.checkinId` → `asset.transactionReasonNoReturnRecord`;
  5. else eligible.

  The handover, legacy and ownership rules below it are unchanged.
- The header comment of `getCheckinVerdict` gains one line: "An outstanding component is returned on its own (group 3 spec §8.6): componentReturn comes first, before the handover, legacy and ownership rules."

**3b. The IT-stock rule** (`src/lib/component-late-return.ts`, create). It holds the Produces signature and imports `normalizeAssetStateName` from `./asset-lifecycle-policy.ts`.
- It answers `"reattached"` only for `isActive && normalizeAssetStateName(statusName) === "ready" && custodianId === null && !hasOpenCheckout && !hasOpenRepair`, and `"standalone"` otherwise.
- Header comment: the late return of an outstanding component (group 3 spec §8.6, P2-R17). It is pure and client-safe. The รับคืน search row (`parentInStock`) and the late-return route (Task 5) ask this one rule.
- Its only import is `normalizeAssetStateName`. Task 5 later adds its own relative import beside it; Step 1's purity test accepts any `./<name>.ts` import.

**3c. The custody guard** (`asset-operation-claim.ts`, append). Add `import type { Prisma } from "@prisma/client"` and `import { outstandingLinkWhere } from "./asset-component-outstanding.ts"`.
- `type OutstandingLinkReader = { assetComponent: { findMany(args: { where: Prisma.AssetComponentWhereInput; select: { componentAssetId: true; componentAsset: { select: { assetTag: true } } } }): Promise<Array<{ componentAssetId: string; componentAsset: { assetTag: string } }>> } }`. The type is structural, as `ClaimTransaction` is, so the Prisma client, a transaction and the test fakes all fit.
- `AssetComponentOutstandingError` as Produces. Set `name`, `code` and `blocked` in the constructor body (`constructor(blocked: Array<{ assetId: string; assetTag: string }>)`, `super("ASSET_COMPONENT_OUTSTANDING")`). Do not use a parameter property: `node --test` strips types only.
- `assertNoOutstandingComponentLinks(db, assetIds)`:
  - one `findMany` with exactly `{ where: { componentAssetId: { in: [...assetIds] }, ...outstandingLinkWhere }, select: { componentAssetId: true, componentAsset: { select: { assetTag: true } } } }`;
  - it throws when any comes back, with each asset once, in `assetIds` order.
- Comment: "An outstanding component (group 3 spec §8.5) is not handed over, transferred, moved or backfilled on its own. The routes call this before the transaction and again after the claim."

**3d. The four routes.** Import `AssetComponentOutstandingError` and `assertNoOutstandingComponentLinks` from `@/lib/asset-operation-claim`, beside today's import.
- **ส่งมอบ** (`checkout/route.ts`):
  - right after `if (!asset) return … 404` (`:52`) and before the ownership refusal: `await assertNoOutstandingComponentLinks(prisma, [id])`;
  - inside the transaction, right after `claimAssetForCustodyChange(…)` (`:91`): `await assertNoOutstandingComponentLinks(tx, [id])`;
  - in the catch, first: `if (error instanceof AssetComponentOutstandingError) return NextResponse.json({ code: error.code, error: error.code, fieldErrors: { assetId: "componentOutstanding" } }, { status: 409 })`.
- **โอนย้าย** (`transfer/route.ts`): the same three edits, after `:42`, after the claim at `:63`, and first in the catch at `:187`.
- **The legacy backfill** (`legacy-checkout/route.ts`):
  - after `:39`, and after the claim at `:72`, before `generateCheckoutDocumentNo`;
  - its catch answers `NextResponse.json({ code: error.code, error: error.code }, { status: 409 })`, with no field. The รับคืน form only toasts this route's refusals, and after this task the picker never offers it an outstanding component.
- **The bulk move** (`bulk-move/route.ts`):
  - after the 404 check (`:31-33`), before the License refusal: `await assertNoOutstandingComponentLinks(prisma, uniqueAssetIds)`;
  - inside the transaction, after the claim loop (`:65-79`), before `assetMovement.createMany`: `await assertNoOutstandingComponentLinks(tx, assets.map((asset) => asset.id))`;
  - in the catch, first: `if (error instanceof AssetComponentOutstandingError) return NextResponse.json({ code: error.code, error: error.code, blocked: error.blocked.map((row) => ({ ...row, code: error.code })) }, { status: 409 })`.

  The bulk move reads with `findMany`, never `findFirst`: that test fake answers any `findFirst` with a truthy row (`tests/asset-bulk-custody-routes.test.ts:91`).
- The outstanding check comes first in every route, so a route refuses in its verdict's order. `tests/v-track-s.test.ts:437` gets the stub for this reason (Step 1).

**3e. The catalog and the words.**
- In `src/lib/api-error-catalog.ts`, after `"ASSET_COMPONENT_CHECKOUT_NOT_ALLOWED": "componentCheckoutNotAllowed",` (`:34`), add `"ASSET_COMPONENT_OUTSTANDING": "componentOutstanding",`.
- Save `<scratchpad>/p2-t4-messages.json` and run `node scripts/messages-edit.mjs <scratchpad>/p2-t4-messages.json`. Expected output: `messages updated: 4 th, 4 en, 0 deleted`.
```json
{ "set": {
  "th": {
    "asset.transactionReasonComponentOutstanding": "ส่วนควบค้างคืน รับคืนก่อน",
    "asset.transactionReasonComponentOwnHandover": "ส่วนควบนี้มีใบส่งมอบของตัวเองค้างอยู่ ถอดออกจากเครื่องหลักก่อน",
    "apiErrors.componentOutstanding": "ส่วนควบค้างคืน รับคืนก่อน",
    "assetOperation.outstandingLine": "ส่วนควบค้างคืน ของ {parentTag}"
  },
  "en": {
    "asset.transactionReasonComponentOutstanding": "An outstanding component: return it first",
    "asset.transactionReasonComponentOwnHandover": "This component has its own open handover. Remove it from its parent asset first.",
    "apiErrors.componentOutstanding": "An outstanding component: return it first",
    "assetOperation.outstandingLine": "Outstanding component of {parentTag}"
  }
} }
```

**3f. The search** (`asset-operation-search-rules.ts`, `asset-operation-search.ts`).
- **Rules file:**
  - Import `openRepairRecordWhere` from `./repair-record-policy.ts`, `getLateReturnOutcome` from `./component-late-return.ts`, and `type AssetOperationOutstandingFact`.
  - After `buildAssetOperationComponentLinkWhere`, add the outstanding select, the checkin select and the types as Produces. The select's value is Step 1's pin: `checkouts: { where: openCheckoutWhere }`, `maintenanceTickets: { where: openRepairRecordWhere }`, `satisfies Prisma.AssetComponentSelect`.
  - The row type gains `lateReturn?` and `badge?` under "รับคืน only". `legacy?` reads "A holder and no handover, and not an outstanding component: ข้อมูลเก่า".
- **`buildAssetOperationSearchRow`:**
  - The context gains `outstanding?: AssetOperationOutstandingRead | null`.
  - `facts.outstanding` is `{ linkId: link.id, checkinId: link.referenceId }` when given, else `null`. The verdict reads it in every mode.
  - In รับคืน, an outstanding read sets `badge: "outstanding"`. When `link.referenceId` is set, it also sets `lateReturn`:
    - `checkinNo` is `checkin?.documentNo ?? null`;
    - `checkinDate` is `checkin?.returnDate.toISOString() ?? null`;
    - `parent` is the parent's id, tag and name;
    - `parentInStock` is `getLateReturnOutcome({ isActive, statusName: status.name, custodianId, hasOpenCheckout: _count.checkouts > 0, hasOpenRepair: _count.maintenanceTickets > 0 }) === "reattached"`.

    Such a row takes neither `checkout` nor `legacy`. Otherwise today's branches stand, with `badge: "handover"` beside `checkout` and `badge: "legacy"` beside `legacy`. The holder and the group are unchanged: the component's holder groups it, so a search by the person finds it (§8.6).
- **Loader** (`asset-operation-search.ts`):
  - `AssetOperationSearchDb` gains `assetCheckin`. Import `outstandingLinkWhere` from `./asset-component-outstanding.ts`.
  - The facts round (`:132-143`) gains a fourth read: `db.assetComponent.findMany({ where: { componentAssetId: { in: ids }, ...outstandingLinkWhere }, select: assetOperationOutstandingLinkSelect, orderBy: [{ updatedAt: "desc" }, { id: "asc" }] })`.
  - Keep the first link per component, as `openCheckoutByAssetId` does.
  - Only in รับคืน, and only when a kept link names an RT-, read `db.assetCheckin.findMany({ where: { id: { in: <distinct referenceIds> } }, select: assetOperationOutstandingCheckinSelect })`. Run it in one `Promise.all` with `readDestinationLabels`.
  - Each row gets `outstanding: { link, checkin: <its RT- or null> }`, or null.
  - The read-budget comment (`:26-29`) becomes: "at most 5 asset reads, 1 count, 3 fact reads (open handovers, open repairs, outstanding links), 2 photo reads, 2 label reads and, on รับคืน when an outstanding link is found, 1 RT- read per answer".

**3g. The picker's line.**
- `AssetOperationRowDetail` gains the `outstanding` kind. `getAssetOperationRowDetail` returns it first when `row.lateReturn` is set: `parentTag` is `lateReturn.parent.assetTag`, and `documentNo` is `lateReturn.checkinNo`.
- `RowDetail` (`asset-operation-picker.tsx:423`) adds, before the handover line: `if (detail.kind === "outstanding") return <>{[t("outstandingLine", { parentTag: detail.parentTag }), detail.documentNo].filter(Boolean).join(" · ")}</>`.
- The row reads "ส่วนควบค้างคืน ของ NB-0017 · RT-202610-0004" (P2-R17).
- The badge itself is Task 8's slot. This task only sets `row.badge`.

**3h. The legacy where** (`src/lib/legacy-return-rule.ts`, create). Move `legacyReturnOwnershipTypes`, `legacyReturnStatusNames` and `legacyReturnCountWhere` from `checkin-page-data.ts:11-23`, unchanged, and add `installedInLinks: { none: outstandingLinkWhere }` to the where.
- Imports: `import type { Prisma } from "@prisma/client"`, `outstandingLinkWhere` from `./asset-component-outstanding.ts` and `openRepairRecordWhere` from `./repair-record-policy.ts`.
- Header: "The legacy return rule (server search spec 6.3, group 3 spec §8.1, §8.5): who is offered ข้อมูลเก่า on รับคืน. It is pure, so the รับคืน page's count and the register's noHandover filter (Task 7) read one where. An outstanding component is returned late (§8.6), never backfilled."
- `checkin-page-data.ts`:
  - re-exports the three names (`export { … } from "@/lib/legacy-return-rule"`) and imports `legacyReturnCountWhere` for `countLegacyReturns`;
  - drops its `Prisma` and `openRepairRecordWhere` imports;
  - `getCheckinPreselect`'s `?assetId=` branch returns `{ row, query: "" }` when `row?.badge === "outstanding"`, and today's `{ row: null, query: row?.assetTag ?? "" }` otherwise;
  - its comment (`:45-47`) gains "An outstanding component's ?assetId= starts with its late-return row, chosen or chosen-but-blocked (group 3 spec §8.6)".

**3i. The held count** (`asset-operation-options.ts:66-72`). Import `outstandingLinkWhere` from `@/lib/asset-component-outstanding`. The groupBy where becomes Step 1's. Its comment: "Leaves out ส่วนควบ (spec §7.2): an asset owned as ส่วนควบ, and one installed in another (it carries its parent's holder). An outstanding component counts: ผู้คืน holds it on its own (group 3 spec §8.5, P2-R17)."

**3j. The asset actions and their callers.**
- **`asset-actions.ts`:**
  - `AssetActionInput` gains `outstanding` as Produces. Document it as "The outstanding link holding this asset as a component (group 3 spec §8.5), from a dedicated query".
  - `factsOf` passes it.
  - Add `outstandingFactByAssetId` after `firstIdByAssetId`.
  - The table in `getAssetActions` reads the ownership's list, plus `["checkin", "asset.rowActionCheckin"]` appended for a `component` with `input.outstanding`. Comment: "An outstanding ส่วนควบ is returned on its own: รับคืน joins its actions only while the link is out, or it would sit disabled on every component."
  - The checkin href is unchanged: a `componentReturn` verdict has no `checkoutId`, so it opens `?assetId=` (P2-R17).
- **`asset-detail-frame.ts`:**
  - Import `outstandingLinkWhere` from `@/lib/asset-component-outstanding` and `type AssetOperationOutstandingFact` from `@/lib/asset-operation-eligibility`.
  - Add an eighth read to the one `Promise.all`: `prisma.assetComponent.findFirst({ where: { componentAssetId: assetId, ...outstandingLinkWhere }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], select: { id: true, referenceId: true } })`, destructured as `outstandingLink`.
  - Return `outstanding: outstandingLink ? { linkId: outstandingLink.id, checkinId: outstandingLink.referenceId } : null`. In the header comment, "seven" becomes "eight".
- **`assets/[id]/page.tsx`:** `actionInput` gains `outstanding: frame.outstanding,` after `openDisposalId: frame.openDisposalId,`.
- **`assets/page.tsx`:**
  - Import `outstandingFactByAssetId` beside `firstIdByAssetId` (`:28`), and `outstandingLinkWhere` from `@/lib/asset-component-outstanding`.
  - The second `Promise.all` (`:168`) gains a fifth read, destructured as `outstandingLinks`: `assetIds.length ? prisma.assetComponent.findMany({ where: { componentAssetId: { in: assetIds }, ...outstandingLinkWhere }, select: { id: true, componentAssetId: true, referenceId: true }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }] }) : Promise.resolve([])`.
  - After `:220`: `const outstandingByAssetId = outstandingFactByAssetId(outstandingLinks)`.
  - The `getAssetActions({` call gains `outstanding: outstandingByAssetId.get(asset.id) ?? null,` between `conditionName` and `returnTo`. The line `returnTo: registerReturnHref,\n can: actionPermissions,` stays together (`tests/asset-register-transactions.test.ts:87`).

- [ ] **Step 4: Run the checks.**
  - Re-run the Step 2 command, plus `node --test tests/thai-glossary.test.ts tests/asset-component-sync-routes.test.ts tests/asset-handover-checkout.test.ts tests/legacy-checkin-flow.test.ts tests/asset-detail-page.test.ts tests/asset-detail-ux.test.ts`. Expected: all pass.
  - Then run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: no failures and 0 lint errors.
  - `tsc` is the check that every `AssetOperationFacts` and `AssetActionInput` builder passes `outstanding`.
  - If a pin outside this task's list fails, rewrite it in this commit and name it in the report.

- [ ] **Step 5: Commit.**
```
git add src/lib/asset-operation-eligibility.ts src/lib/component-late-return.ts src/lib/asset-operation-claim.ts src/lib/asset-actions.ts src/lib/asset-operation-search-rules.ts src/lib/asset-operation-search.ts src/lib/asset-operation-picker-rules.ts src/components/ui/asset-operation-picker.tsx src/lib/legacy-return-rule.ts src/lib/checkin-page-data.ts src/lib/asset-operation-options.ts src/lib/asset-detail-frame.ts "src/app/[locale]/(dashboard)/assets/page.tsx" "src/app/[locale]/(dashboard)/assets/[id]/page.tsx" "src/app/api/assets/[id]/checkout/route.ts" "src/app/api/assets/[id]/transfer/route.ts" "src/app/api/assets/[id]/legacy-checkout/route.ts" src/app/api/assets/bulk-move/route.ts src/lib/api-error-catalog.ts messages/th.json messages/en.json tests/component-late-return.test.ts tests/component-outstanding-audit-reads.test.ts tests/asset-operation-eligibility.test.ts tests/asset-actions.test.ts tests/asset-operation-search-rules.test.ts tests/asset-operation-search.test.ts tests/asset-operation-picker-rules.test.ts tests/asset-operation-picker-ui.test.ts tests/checkin-page-data.test.ts tests/asset-operation-master-options.test.ts tests/asset-operation-claim.test.ts tests/asset-custody-route-claims.test.ts tests/asset-bulk-custody-routes.test.ts tests/api-error-catalog.test.ts tests/open-repair-filter.test.ts tests/asset-transaction-cancellation-routes.test.ts tests/v-track-s.test.ts tests/asset-detail-frame.test.ts tests/asset-register-transactions.test.ts
git commit -m "feat(checkin): an outstanding component is returned on its own (componentReturn, before every other checkin rule); ส่งมอบ, โอนย้าย, the bulk move and the legacy backfill refuse it before and after the claim; the legacy count leaves it out, the held count counts it, and the รับคืน row carries its late return (group 3 spec §8.5, §8.6, P2-R17)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Component paths and the late-return route (spec §8.5 "everywhere else" for components, §8.6 server, §6 late row; P2-R2, P2-R3, P2-R7, P2-R13, P2-R17)

T3 left a component that did not come back as an `outstanding` link. This task does two things.
- The component paths count that link as still linked: installing elsewhere is refused, its slot stays taken, the candidate list leaves it out, the responsibility rule counts it as held, disposal is blocked on both sides, and ถอดออก ends it with a guarded write.
- The new route `POST /api/assets/[id]/component-return` brings the component back late. It is re-attached when the parent is in IT stock and stands alone in the chosen room otherwise. The RT- is the reference, and there is no new document number.

T9 builds the panel that calls the route.

**Rulings this task applies (copied from the skeleton):**
- **P2-R2 (late return):**
  - On the component, `component_late_return` is written at the late return, with `referenceType: "checkin"` and `referenceId`: the RT-. Its `toValue` carries `{ receivedByName, returnDate, outcome }`.
  - On the parent, the late return reuses `component_install` (re-attach) or `component_remove` (stand alone), with the same reference.
  - The pin goes to 49: T3 left it at 48. The new type needs labels, the history category `checkin`, `knownMovementTypeKeys` and the WRITERS list.
- **P2-R3:**
  - Body `{ componentLinkId, checkinId, expectedOutcome: "reattached" | "standalone", returnDate, receiveBy, receiveByEmployeeId?, conditionId?, nextLocationId?, remark? }`. Answer 201 `{ checkinId, documentNo, outcome }`.
  - The route needs `asset:edit`.
  - It claims the link: `updateMany` where `id`, `status: "outstanding"` and `referenceId: checkinId`; a count other than 1 answers 409 `ASSET_CHANGED_DURING_OPERATION`.
  - It claims the parent on re-attach.
  - When the server's outcome differs from `expectedOutcome`, it answers 409 `ASSET_CHANGED_DURING_OPERATION`. It never answers a field error for a field that is not on screen.
- **P2-R7 (late bullets):**
  - A re-attached late return takes the parent's room and the parent's department, and its holder is cleared.
  - A standalone late return takes the chosen room and the return department, and its holder is cleared, except a ส่วนกลาง one, which keeps its department (this bullet is amended so; see Decisions).
- **P2-R13 (late bound):** a late return is ≥ the RT-'s return date and ≤ today, in Bangkok days. Each bound is one catalogued code under `returnDate`.
- **P2-R17:**
  - Disposal readiness blocks a parent with an outstanding link, with a named blocker that carries the tag, and blocks an outstanding component itself.
  - IT stock = `isActive` && Ready && no `custodianId` && no open handover && no open repair.
  - ถอดออก on an outstanding link: `updateMany` where `{ id, status in [installed, outstanding], removedAt: null }`; a count other than 1 answers 409.

**Decisions:**
- **A ส่วนกลาง component that stands alone keeps its department.** Spec §6 says ส่วนกลาง (shared) assets keep their responsible department "on checkout, return and transfer", and a late component return is a return. So spec §6's late row ("the return department") applies to บุคคล and Stock/สำรอง, as its table does. Re-attached, every ownership follows the parent (spec §6 "A component follows its parent"). `getLateReturnDepartmentId` therefore answers `parentDepartmentId` on re-attach. Standing alone, it answers `currentDepartmentId` for `shared` and `returnDepartmentId` for every other ownership, `component` and `software_license` included. Do not reuse Task 1's private `keepsOwnDepartment` here: it keeps the department for `component` and `software_license` too. Task 9's summary calls this same function with the same five fields.
- **`src/lib/component-late-return.ts` and `tests/component-late-return.test.ts` are Task 4's.** Task 4 created `LateReturnParent` and `getLateReturnOutcome` (it compares `normalizeAssetStateName(statusName) === "ready"`), set the รับคืน row's `parentInStock` through it, and tested both the outcome table and the file's purity. This task modifies both files and never re-creates them: it appends the outcome list, the date rule, one import and their tests. It keeps Task 4's code, the type name `LateReturnParent` and the normalised compare, and it adds no second outcome table or purity test.
- **`getLateReturnDepartmentId` lives in `src/lib/asset-department-rule.ts`**, beside Task 1's checkin rule (Global Constraints: one home for department rules).
- **Every stale case answers the one 409 `ASSET_CHANGED_DURING_OPERATION`**, with no per-reason codes: the link is gone, the RT- is void, the component is no longer eligible by Task 4's verdict, the outcome differs, the parent claim lost or the parent changed after it. The panel opens only for an eligible row, and P2-R3 asks for exactly this on a mismatch. The route asks Task 4's `getCheckinVerdict` instead of restating the component's refusals.
- **A new date code, `COMPONENT_RETURN_DATE_BEFORE_CHECKIN`, answered 400 under `returnDate`.** Task 2's `CHECKIN_RETURN_DATE_BEFORE_HANDOVER` words name the handover day, which is the wrong date here. The future bound reuses Task 2's code through Task 2's function.
- **The parent's component manager page is in this task** (`assets/[id]/components/page.tsx`, `asset-component-manager.tsx`). Without it an outstanding link lands under ประวัติส่วนควบ with no ถอดออก (`page.tsx:79-80`), so spec §8.5 "ถอดออก also works on an outstanding link" cannot be reached. The asset page's own lines (the components tab, the overview and the component's own page) are Task 12's; this task keeps those panels installed-only (3i).

**Files:**
- Create:
  - `src/app/api/assets/[id]/component-return/route.ts`: `[id]` is the component.
  - `tests/component-late-return-route.test.ts`
  - `tests/component-outstanding-paths.test.ts`
- Modify:
  - `src/lib/component-late-return.ts` (Task 4's, pure): append the outcome list and the date rule, and one import.
  - `src/lib/asset-department-rule.ts`: add `getLateReturnDepartmentId`.
  - `src/lib/validations/asset-operations.ts`: add `assetComponentReturnSchema` after `assetComponentRemoveSchema` (`:123-128` at HEAD), and its type after `export type AssetComponentRemoveInput` (`:136` at HEAD). Task 2's checkin-schema field moves both lines down, so find them by name.
  - `src/lib/asset-components.ts:11-20` (the link and slot reads), `:26-28` (the refusal) and `:47-50` (the cycle walk).
  - `src/app/api/assets/component-candidates/route.ts:20-25`
  - `src/app/api/assets/[id]/components/[componentId]/route.ts:20-31` (the read), `:38-49` (the write) and `:113-115` (the catch)
  - `src/app/[locale]/(dashboard)/assets/[id]/components/page.tsx:33-50` (the select) and `:71-80` (records, current and history)
  - `src/components/assets/asset-component-manager.tsx:41-53` (`ComponentRecord`) and `:571-591` (`ComponentRow`)
  - `src/lib/asset-ownership.ts:37`
  - `src/app/[locale]/(dashboard)/work-center/page.tsx:218`
  - `src/app/[locale]/(dashboard)/reports/page.tsx:470`
  - `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`: `:129-131` (the `installedInLinks` include), `:301` (`installedInLinksForPanel`) and `:409` (the disposal reason)
  - `src/lib/disposal-readiness.ts` (whole file, 92 lines), `src/lib/asset-detail-frame.ts:7-11, 14-22, 70`, `src/app/api/disposal-assets/route.ts:6-9, 53-63` and `src/components/disposal/disposal-asset-picker.tsx:13-19, 74`
  - `src/lib/asset-movement-labels.ts:4` (the count in the comment) and `:6-56` (`ASSET_MOVEMENT_LABELLED_TYPES`)
  - `src/lib/asset-history-rules.ts:45` (the `checkin:` row of `categoryTypes`)
  - `src/app/[locale]/(dashboard)/disposal/[id]/page.tsx:438-463` (`knownMovementTypeKeys`)
  - `src/lib/api-error-catalog.ts`: one row
  - `messages/th.json` and `messages/en.json`, only through `node scripts/messages-edit.mjs`
  - `e2e/cross-cutting/support/refusals.ts:51-56`
- Test (append): `tests/component-late-return.test.ts` (Task 4's), `tests/asset-department-rule.test.ts`, `tests/disposal-readiness.test.ts`, `tests/api-error-catalog.test.ts`
- Test (pins this task breaks, rewritten in this commit):
  - `tests/disposal-readiness.test.ts:10-33`: the blocker order gains two keys.
  - `tests/asset-detail-page.test.ts:34`: the disposal reason now passes `tags`.
  - `tests/asset-movement-labels.test.ts:28-53` (WRITERS gains the new route) and `:81` (`written.size` 48 → 49).
  - `tests/asset-history-rules.test.ts:49`: the `checkin` chip list gains `component_late_return`.
- **Pins checked and not broken:**
  - `tests/asset-detail-frame.test.ts:197`: the `disposalBlockers` line stays as it is.
  - `tests/disposal-pending-source-route.test.ts:34` and `tests/disposal-batch-pending-source-route.test.ts:29`: the fakes answer `_count` only, and the new relation fields read as empty.
  - `tests/asset-component-manager.test.ts:13-17`: the `< 2` guard stays.
  - `tests/assets-sweep-ui.test.ts:98-108`: one tag span per row, and no `"-"` in the manager.
  - `tests/asset-detail-ux.test.ts:60-61`: `installedInLinksForPanel[0]` keeps its name.
  - `tests/e2e-cross-cutting.test.ts:132-138` checks the new refusal entry: the permission comes before any `prisma.`, and the path matches the file.
  - `tests/list-frame-guards.test.ts` LV2: no new `"-"` literal is added anywhere.

**Interfaces:**
- Consumes:
  - **T3** (`src/lib/asset-component-outstanding.ts`, pure):
    - `COMPONENT_LINK_OUTSTANDING = "outstanding"` (the link status). This task does not use it: the install refusal throws Task 4's code string `"ASSET_COMPONENT_OUTSTANDING"`, a different thing;
    - `isOutstandingLink(link: { status: string; removedAt?: Date | string | null }): boolean`, called here with `{ status: string; removedAt: Date | null }`;
    - `outstandingLinkWhere` (= `{ status: "outstanding", removedAt: null }`);
    - `installedOrOutstandingLinkWhere` (= `{ status: { in: ["installed", "outstanding"] }, removedAt: null }`).

    Both where objects must be assignable to `Prisma.AssetComponentWhereInput`, with a mutable `in` array (as `openRepairRecordWhere` is typed, `src/lib/repair-record-policy.ts:9-15`).
  - **T1:**
    - `readCheckinDepartment(db): Promise<{ id: string; code: string; name: string }>` (`src/lib/checkin-department.ts`). Missing or inactive, it throws `CheckinDepartmentUnavailableError`, a subclass of `AssetOperationConflictError` whose code and message are both `"ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE"`.
    - So the catch's `AssetOperationConflictError` branch (branch 1) answers it as Task 1's checkin route does: 409 `{ code: "ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE", error: "ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE" }`. This task does not import the subclass and adds no branch of its own for it.
  - **T2:**
    - `checkinReturnDateError(input: { returnDay: string; todayDay: string; handoverDay: string | null }): CheckinReturnDateErrorCode | null`, where `CheckinReturnDateErrorCode = "CHECKIN_RETURN_DATE_IN_FUTURE" | "CHECKIN_RETURN_DATE_BEFORE_HANDOVER"`, from `src/lib/checkin-route-rules.ts` (pure; its only import is `./preventive-maintenance.ts`).
    - The catalogued codes `CHECKIN_RETURN_DATE_IN_FUTURE` and `ASSET_CHECKIN_LOCATION_INACTIVE`. Their catalog keys are read here through `getApiErrorKey(code)`, so T5 never copies T2's key names.
  - **T4:**
    - `getCheckinVerdict(facts: AssetOperationFacts): AssetCheckinVerdict` (`src/lib/asset-operation-eligibility.ts`), with the path `"componentReturn"`. The required fact is `outstanding: AssetOperationOutstandingFact | null`, where `AssetOperationOutstandingFact = { linkId: string; checkinId: string | null }`. This route passes `outstanding: { linkId: linkRow.id, checkinId: checkinNow.id }` and nothing more: any other key is an excess property under `tsc`. The full late-return shape is the search row's `lateReturn`, which this route does not read.
    - `type LateReturnParent = { isActive: boolean; statusName: string; custodianId: string | null; hasOpenCheckout: boolean; hasOpenRepair: boolean }` and `getLateReturnOutcome(parent: LateReturnParent): "reattached" | "standalone"`, in `src/lib/component-late-return.ts`. It answers `"reattached"` only for `isActive && normalizeAssetStateName(statusName) === "ready" && custodianId === null && !hasOpenCheckout && !hasOpenRepair`.
    - The รับคืน row's `parentInStock` in `src/lib/asset-operation-search-rules.ts`, set to `getLateReturnOutcome({ … }) === "reattached"`. This task pins it and does not change it.
    - T4's catalogued refusal code for an outstanding component, `ASSET_COMPONENT_OUTSTANDING`. Its words are those of `asset.transactionReasonComponentOutstanding`: "ส่วนควบค้างคืน รับคืนก่อน".
  - **Existing code:**
    - `claimAssetForCustodyChange(tx, { assetId, expectedStatusId, updatedBy })` and `AssetOperationConflictError` (`src/lib/asset-operation-claim.ts:1-52`).
    - `getAssetOperationConditionError("checkin", condition)` (`src/lib/asset-lifecycle-policy.ts`).
    - `openRepairRecordWhere` (`src/lib/repair-record-policy.ts:12`).
    - `getBangkokDateKey(date)` (`src/lib/preventive-maintenance.ts:50`).
    - `normalizeAssetOwnershipType` (`src/lib/asset-ownership.ts:9`).
    - `getApiErrorKey` (`src/lib/api-error-catalog.ts`).
    - `errorResponse` (`src/lib/api-response.ts:6`). A ZodError becomes `400 { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors }`, and a catalogued refine message becomes its key: "Location is required" → `locationRequired` (catalog `:199`).
    - `logAudit`.
- Produces:
  ```ts
  // src/lib/component-late-return.ts (Task 4's file, appended here; pure, client-safe: relative .ts imports only)
  // Task 4's LateReturnParent and getLateReturnOutcome stay as they are.
  export const componentLateReturnOutcomes = ["reattached", "standalone"] as const
  export type ComponentLateReturnOutcome = (typeof componentLateReturnOutcomes)[number]
  export type LateReturnDateError = "CHECKIN_RETURN_DATE_IN_FUTURE" | "COMPONENT_RETURN_DATE_BEFORE_CHECKIN"
  export function getLateReturnDateError(input: { returnDay: string; todayDay: string; checkinDay: string }): LateReturnDateError | null
  // src/lib/asset-department-rule.ts
  export function getLateReturnDepartmentId(input: {
    outcome: ComponentLateReturnOutcome
    ownership: AssetOwnershipType
    parentDepartmentId: string | null
    returnDepartmentId: string
    currentDepartmentId: string | null
  }): string | null
  // src/lib/validations/asset-operations.ts
  export const assetComponentReturnSchema // fields of P2-R3; refine: standalone needs nextLocationId
  export type AssetComponentReturnInput = z.infer<typeof assetComponentReturnSchema>
  // src/lib/disposal-readiness.ts
  export const disposalReadinessBlockers // + "outstanding_child_components" after "installed_child_components", + "outstanding_in_parent" after "installed_in_parent"
  export type DisposalReadinessFacts      // + outstandingChildComponentTags?: string[]; outstandingInParentCount?: number
  export function getDisposalOutstandingComponentTags(asset: DisposalReadinessAsset): string[]
  // src/lib/asset-detail-frame.ts
  export type AssetDetailFrame            // + disposalOutstandingComponentTags: string[]
  // src/components/disposal/disposal-asset-picker.tsx
  export type DisposalAssetOption         // + outstandingComponentTags?: string[]
  ```
  - **The rules:**
    - `getLateReturnOutcome` is Task 4's (Consumes), with its normalised `"ready"` compare. Its return type, `"reattached" | "standalone"`, is the same union as `ComponentLateReturnOutcome`; leave its signature as Task 4 wrote it.
    - `getLateReturnDateError`:
      - first `checkinReturnDateError({ returnDay, todayDay, handoverDay: null })`, which can only answer `CHECKIN_RETURN_DATE_IN_FUTURE` or null;
      - then `returnDay < checkinDay` → `"COMPONENT_RETURN_DATE_BEFORE_CHECKIN"`;
      - else null.
    - `getLateReturnDepartmentId`:
      - `reattached` → `parentDepartmentId`;
      - `standalone` → `currentDepartmentId` for `shared`, and `returnDepartmentId` for any other ownership.
  - **The route `POST /api/assets/[id]/component-return`.** It reads JSON only. Its answers:
    - `201 { checkinId, documentNo, outcome }`. `documentNo` is `string | null`, the RT-'s.
    - `403`: no `asset:edit`. It is checked before the body or any read.
    - `400 VALIDATION_FAILED`, with zod `fieldErrors`. With `expectedOutcome: "standalone"` and no room, `fieldErrors` is `{ nextLocationId: "locationRequired" }`.
    - `404 { error: "Asset not found" }`: the component is missing or inactive.
    - `400 { code, error: code, fieldErrors: { returnDate: getApiErrorKey(code) } }`, where `code` is a `LateReturnDateError`.
    - `400 { code: <the condition error>, error: "Invalid return condition for check-in", fieldErrors: { conditionId: "invalidReturnCondition" } }`.
    - `409`, T1's department answer.
    - `409 { code: "ASSET_CHECKIN_LOCATION_INACTIVE", error: "ASSET_CHECKIN_LOCATION_INACTIVE", fieldErrors: { nextLocationId: getApiErrorKey("ASSET_CHECKIN_LOCATION_INACTIVE") } }`. It is answered only for a standalone return, whose room is on screen.
    - `409 { code: "ASSET_CHANGED_DURING_OPERATION", error: "Asset status changed while this request was being saved. Reload the asset and try again." }`. This answer covers:
      - the link is no longer outstanding under this RT-, or the claim lost;
      - the RT- is void;
      - the component is no longer eligible (T4's verdict);
      - the outcome differs from `expectedOutcome`;
      - the parent claim was lost, or the parent changed after it.

      There is no `fieldErrors` key.
  - The movement type `component_late_return`, under the history chip `checkin`.
  - The catalog code `COMPONENT_RETURN_DATE_BEFORE_CHECKIN` → `componentReturnDateBeforeCheckin`.

- [ ] **Step 1: Write the failing tests.**

  **1a. Append to `tests/component-late-return.test.ts` (Task 4's file).** Task 4's outcome table (with `" ready "`) and its purity test stay as they are and cover `getLateReturnOutcome` and the new import; do not add a second of either.
  - Change Task 4's imports to:
```ts
import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"
import { componentLateReturnOutcomes, getLateReturnDateError, getLateReturnOutcome } from "../src/lib/component-late-return.ts"
```
  - Append, after Task 4's tests:
```ts
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, out)
    else if (/\.tsx?$/.test(entry.name)) out.push(path.replaceAll("\\", "/"))
  }
  return out
}

test("a late return has two outcomes, re-attached and standing alone, in that order (spec §8.6, P2-R3)", () => {
  assert.deepEqual([...componentLateReturnOutcomes], ["reattached", "standalone"])
})

test("a late return is dated no later than today and no earlier than its RT-'s return day, in Bangkok days (P2-R13)", () => {
  const error = (returnDay: string) => getLateReturnDateError({ returnDay, todayDay: "2026-10-31", checkinDay: "2026-10-20" })
  assert.deepEqual(["2026-10-20", "2026-10-31", "2026-11-01", "2026-10-19"].map(error), [null, null, "CHECKIN_RETURN_DATE_IN_FUTURE", "COMPONENT_RETURN_DATE_BEFORE_CHECKIN"])
})

test("every parentInStock the app sets is the IT-stock rule, so the panel and the save agree (P2-R4, P2-R17)", () => {
  // Matches `parentInStock: <value>` and `parentInStock = <value>`; skips the type (`: boolean`, `?: boolean`), comparisons (`==`) and a JSX prop (`={`).
  const assignments = walk("src").flatMap((path) =>
    [...readFileSync(path, "utf8").matchAll(/\bparentInStock\s*(?::|=(?![={]))\s*(?!\s|boolean\b)([^\n]+)/g)].map((match) => ({ path, value: match[1] })))
  assert.ok(assignments.length > 0, "Task 4 sets parentInStock")
  for (const { path, value } of assignments) assert.match(value, /getLateReturnOutcome\(/, path)
})
```
  The route passes no `parentInStock` (it gives `getCheckinVerdict` only `{ linkId, checkinId }`), so the walk needs no exception for it.

  **1b. Create `tests/component-late-return-route.test.ts`.**
  - The harness has the same shape as `tests/asset-custody-route-claims.test.ts:1-167`: a `registerHooks` resolver (`:137-152`) that serves mocked modules as `data:` URLs and maps `@/` to `src/`.
  - The `@/lib/db` mock is a generic recorder. Every other `@/` module is real, including T1's `checkin-department`, T2's date module, T3's module and T4's eligibility, so the test proves the wiring.

```ts
import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"
import { outstandingLinkWhere } from "../src/lib/asset-component-outstanding.ts"
import { getApiErrorKey } from "../src/lib/api-error-catalog.ts"

type Row = Record<string, unknown>
type Args = { where?: Record<string, unknown>; data?: unknown }
type World = {
  permissions: string[]; link: Row | null; linkClaimCount: number; checkin: Row | null; component: Row; parent: Row
  /** Overrides for each parent read in turn (the read before the claim, then the one after it). */
  parentReads: Row[]
  parentOpenCheckout: boolean; parentOpenRepair: boolean; componentOpenRepair: boolean; parentClaimCount: number
  department: Row | null
  /** Each room read takes the next answer; when empty the room is active. */
  locationAnswers: boolean[]
  conditions: Record<string, { name: string; isActive: boolean }>; audits: Row[]
}
const db: { calls: Array<{ call: string; args: Args }>; answers: Record<string, unknown> } = { calls: [], answers: {} }
const world = {} as World
Object.assign(globalThis, { __fakeDb: db, __lateReturnWorld: world })

const FAKE_DB = `
  const db = () => globalThis.__fakeDb
  function model(name) {
    return new Proxy({}, { get(_target, method) { return async (args) => {
      const call = name + "." + String(method)
      db().calls.push({ call, args })
      const answer = db().answers[call]
      if (typeof answer === "function") return answer(args)
      if (answer !== undefined) return answer
      if (method === "findMany") return []
      if (method === "count") return 0
      if (method === "updateMany" || method === "createMany") return { count: 1 }
      if (method === "findFirst" || method === "findUnique") return null
      return { id: name + "-new", ...(args?.data ?? {}) }
    } } })
  }
  const client = new Proxy({}, { get(_target, key) { return key === "$transaction" ? async (callback) => callback(client) : model(String(key)) } })
  export const prisma = client
`
const mocks = new Map<string, string>([
  ["next/server", `export class NextRequest extends Request {}
    export class NextResponse extends Response { static json(body, init) { return Response.json(body, init) } }`],
  ["@/lib/auth-utils", `const world = () => globalThis.__lateReturnWorld
    export async function requireAuth() { return { id: "user-1", roles: [], permissions: [], employeeId: "emp-1" } }
    export function hasRole() { return false }
    export function hasPermission(_user, module, action) { return world().permissions.includes(module + ":" + action) }
    export function requirePermission(_user, module, action) { if (!world().permissions.includes(module + ":" + action)) throw new Error("Forbidden: insufficient permissions") }`],
  ["@/lib/audit-log", `export async function logAudit(entry) { globalThis.__lateReturnWorld.audits.push(entry) }`],
  ["@/lib/db", FAKE_DB],
])
const registerHooks = (nodeModule as unknown as { registerHooks(options: { resolve(specifier: string, context: unknown, nextResolve: (specifier: string, context: unknown) => unknown): unknown }): void }).registerHooks
registerHooks({
  resolve(specifier, context, nextResolve) {
    const source = mocks.get(specifier)
    if (source !== undefined) return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`, shortCircuit: true }
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})
const route = await import(pathToFileURL("src/app/api/assets/[id]/component-return/route.ts").href) as { POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> }

const COMPONENT = { id: "comp-1", assetTag: "GRL-RAM-26-0001", isActive: true, ownershipType: "component", statusId: "status-ready", status: { name: "Ready" }, conditionId: "cond-good", condition: { name: "Good" }, currentLocationId: "loc-desk", custodianId: "emp-2", departmentId: "dept-sales", updatedAt: new Date("2026-10-20T03:00:00Z") }
const PARENT = { id: "parent-1", assetTag: "GRL-COM-26-0100", name: "Notebook", isActive: true, statusId: "status-ready", status: { name: "Ready" }, custodianId: null, currentLocationId: "loc-it", departmentId: "dept-parent" }
const HANDED_OVER = { custodianId: "emp-9", statusId: "status-in-use", status: { name: "In Use" } }
const CHANGED = { code: "ASSET_CHANGED_DURING_OPERATION", error: "Asset status changed while this request was being saved. Reload the asset and try again." }
const linkWhere = { id: "link-1", componentAssetId: "comp-1", referenceType: "checkin", referenceId: "checkin-1", ...outstandingLinkWhere }
const siblingsWhere = { parentAssetId: "parent-1", componentAssetId: "comp-1", referenceType: "checkin", referenceId: "checkin-1", ...outstandingLinkWhere }
const linkValue = JSON.stringify({ componentAssetId: "comp-1", componentAssetTag: "GRL-RAM-26-0001", componentRole: "RAM", slotNo: null })
const moved = { reason: "Component late return", referenceType: "checkin", referenceId: "checkin-1", performedBy: "user-1" }

const body = (overrides: Row = {}) => ({ componentLinkId: "link-1", checkinId: "checkin-1", expectedOutcome: "reattached", returnDate: "2026-10-25", receiveBy: "E001 - สมชาย ใจดี", receiveByEmployeeId: "emp-1", ...overrides })
const post = (payload: unknown) => route.POST(
  new Request("http://localhost/api/assets/comp-1/component-return", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  { params: Promise.resolve({ id: "comp-1" }) },
)
const args = (call: string) => db.calls.filter((entry) => entry.call === call).map((entry) => entry.args)
const dataOf = (call: string, index = 0) => args(call)[index].data as Row
const movements = () => args("assetMovement.createMany").flatMap((entry) => entry.data as Row[])
const answer = async (response: Response) => [response.status, await response.json()]

beforeEach(() => {
  Object.assign(world, {
    permissions: ["asset:edit"], link: { id: "link-1", parentAssetId: "parent-1", componentRole: "RAM", slotNo: null }, linkClaimCount: 1,
    checkin: { id: "checkin-1", documentNo: "RT-202610-0001", returnDate: new Date("2026-10-20T00:00:00Z") },
    component: { ...COMPONENT }, parent: { ...PARENT }, parentReads: [], parentOpenCheckout: false, parentOpenRepair: false, componentOpenRepair: false,
    parentClaimCount: 1, department: { id: "dept-it", code: "IT", name: "Information Technology", isActive: true }, locationAnswers: [],
    conditions: { "cond-good": { name: "Good", isActive: true }, "cond-fair": { name: "Fair", isActive: true }, "cond-na": { name: "Not Assessed", isActive: true } }, audits: [],
  })
  db.calls = []
  db.answers = {
    "asset.findFirst": (a: Args) => (a.where?.id === "comp-1" && world.component.isActive ? { id: "comp-1" } : null),
    "asset.findUnique": (a: Args) => (a.where?.id === "comp-1" ? world.component : { ...world.parent, ...(world.parentReads.shift() ?? {}) }),
    "asset.updateMany": () => ({ count: world.parentClaimCount }),
    "asset.update": (a: Args) => ({ ...world.component, ...(a.data as Row) }),
    "assetComponent.findFirst": () => world.link,
    "assetComponent.findUnique": () => world.link,
    "assetComponent.updateMany": (a: Args) => ({ count: a.where && "id" in a.where ? world.linkClaimCount : 1 }),
    "assetCheckin.findFirst": () => world.checkin,
    "assetCheckout.findFirst": (a: Args) => (a.where?.assetId === "parent-1" && world.parentOpenCheckout ? { id: "checkout-9", handoverMode: "permanent_assignment" } : null),
    "maintenanceTicket.count": (a: Args) => ((a.where?.assetId === "parent-1" ? world.parentOpenRepair : world.componentOpenRepair) ? 1 : 0),
    "department.findFirst": () => world.department,
    "department.findUnique": () => world.department,
    "location.findFirst": (a: Args) => ((world.locationAnswers.length > 0 ? world.locationAnswers.shift() : true) && a.where?.isActive === true ? { id: a.where?.id } : null),
    "assetCondition.findUnique": (a: Args) => world.conditions[String(a.where?.id)] ?? null,
  }
})

test("the parent in IT stock: the link is installed again, the component takes the parent's room and department, its holder is cleared, and the RT- is the reference (spec §8.6, P2-R3, P2-R7)", async () => {
  assert.deepEqual(await answer(await post(body())), [201, { checkinId: "checkin-1", documentNo: "RT-202610-0001", outcome: "reattached" }])
  const [claim, write, ...rest] = args("assetComponent.updateMany")
  assert.deepEqual(claim, { where: linkWhere, data: { updatedBy: "user-1" } })
  assert.deepEqual(write, { where: siblingsWhere, data: { status: "installed", updatedBy: "user-1" } }, "every outstanding link of this component under this RT- (GP X1)")
  assert.equal(rest.length, 0)
  assert.deepEqual(args("asset.updateMany")[0].where, { id: "parent-1", isActive: true, statusId: "status-ready" }, "the parent is claimed")
  assert.deepEqual(args("asset.update"), [{ where: { id: "comp-1" }, data: { currentLocationId: "loc-it", custodianId: null, departmentId: "dept-parent", updatedBy: "user-1" } }])
  assert.deepEqual(movements(), [
    { assetId: "parent-1", movementType: "component_install", toValue: linkValue, reason: null, referenceType: "checkin", referenceId: "checkin-1", performedBy: "user-1" },
    { assetId: "comp-1", movementType: "component_late_return", toValue: JSON.stringify({ receivedByName: "E001 - สมชาย ใจดี", returnDate: "2026-10-25", outcome: "reattached" }), ...moved, remark: null },
    { assetId: "comp-1", movementType: "location_change", fromValue: "loc-desk", toValue: "loc-it", ...moved },
    { assetId: "comp-1", movementType: "custodian_change", fromValue: "emp-2", toValue: null, ...moved },
    { assetId: "comp-1", movementType: "department_change", fromValue: "dept-sales", toValue: "dept-parent", ...moved },
  ])
  assert.deepEqual([world.audits[0].action, world.audits[0].module, world.audits[0].recordId], ["component_late_return", "asset", "comp-1"])
})

test("the parent handed over again: the link ends, the component stands alone in the chosen room with the return department, and the parent is not claimed (spec §8.6, P2-R7)", async () => {
  Object.assign(world.parent, HANDED_OVER); world.parentOpenCheckout = true
  assert.deepEqual(await answer(await post(body({ expectedOutcome: "standalone", nextLocationId: "loc-store", remark: "คืนที่โต๊ะ IT" }))), [201, { checkinId: "checkin-1", documentNo: "RT-202610-0001", outcome: "standalone" }])
  assert.deepEqual(args("assetComponent.updateMany")[1], { where: siblingsWhere, data: { status: "removed", removedAt: new Date("2026-10-25"), updatedBy: "user-1" } })
  assert.equal(args("asset.updateMany").length, 0)
  assert.deepEqual(args("asset.update")[0].data, { currentLocationId: "loc-store", custodianId: null, departmentId: "dept-it", updatedBy: "user-1" })
  assert.deepEqual(movements().slice(0, 2), [
    { assetId: "parent-1", movementType: "component_remove", fromValue: linkValue, reason: null, referenceType: "checkin", referenceId: "checkin-1", performedBy: "user-1" },
    { assetId: "comp-1", movementType: "component_late_return", toValue: JSON.stringify({ receivedByName: "E001 - สมชาย ใจดี", returnDate: "2026-10-25", outcome: "standalone" }), ...moved, remark: "คืนที่โต๊ะ IT" },
  ])
})

test("a ส่วนกลาง component standing alone keeps its department, with no department_change line (spec §6, decision 10)", async () => {
  world.component = { ...COMPONENT, ownershipType: "shared" }; Object.assign(world.parent, HANDED_OVER)
  assert.equal((await post(body({ expectedOutcome: "standalone", nextLocationId: "loc-store" }))).status, 201)
  assert.equal(dataOf("asset.update").departmentId, "dept-sales")
  assert.deepEqual(movements().map((row: Row) => row.movementType), ["component_remove", "component_late_return", "location_change", "custodian_change"])
})

test("a panel that no longer matches the parent is refused as changed, never as a field the panel did not show (P2-R3, Review Focus 3)", async () => {
  Object.assign(world.parent, HANDED_OVER)
  assert.deepEqual(await answer(await post(body())), [409, CHANGED], "re-attach expected, no room sent, the parent is out")
  assert.deepEqual([args("assetComponent.updateMany").length, args("asset.update").length, movements().length], [1, 0, 0], "only the claim, which the transaction rolls back")
  world.parent = { ...PARENT }; db.calls = []
  assert.deepEqual(await answer(await post(body({ expectedOutcome: "standalone", nextLocationId: "loc-store" }))), [409, CHANGED], "stand-alone expected, the parent is back in stock")
  assert.equal(movements().length, 0)
})

test("a link already returned, ended or claimed by another save, or an RT- made void, is refused as changed (P2-R3)", async () => {
  world.link = null
  assert.deepEqual(await answer(await post(body())), [409, CHANGED])
  assert.equal(args("assetComponent.updateMany").length, 0, "refused before the transaction")
  world.link = { id: "link-1", parentAssetId: "parent-1", componentRole: "RAM", slotNo: null }; world.linkClaimCount = 0; db.calls = []
  assert.deepEqual(await answer(await post(body())), [409, CHANGED])
  assert.deepEqual([args("assetComponent.updateMany").length, args("asset.update").length, movements().length], [1, 0, 0])
  world.linkClaimCount = 1; world.checkin = null; db.calls = []
  assert.deepEqual(await answer(await post(body())), [409, CHANGED])
})

test("re-attach: a parent claim that loses, or a parent that took a holder before the claim, is refused as changed with nothing written (P2-R3)", async () => {
  world.parentClaimCount = 0
  assert.deepEqual(await answer(await post(body())), [409, CHANGED])
  world.parentClaimCount = 1; world.parentReads = [{}, { custodianId: "emp-9" }]; db.calls = []
  assert.deepEqual(await answer(await post(body())), [409, CHANGED])
  assert.deepEqual([args("assetComponent.updateMany").length, args("asset.update").length, movements().length], [1, 0, 0])
})

test("stand alone needs a room; a closed room is refused under it, before and inside the transaction (P2-R3, P2-R15)", async () => {
  Object.assign(world.parent, HANDED_OVER)
  assert.deepEqual(await answer(await post(body({ expectedOutcome: "standalone" }))), [400, { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { nextLocationId: "locationRequired" } }])
  assert.deepEqual(db.calls, [], "refused before any read")
  const inactive = [409, { code: "ASSET_CHECKIN_LOCATION_INACTIVE", error: "ASSET_CHECKIN_LOCATION_INACTIVE", fieldErrors: { nextLocationId: getApiErrorKey("ASSET_CHECKIN_LOCATION_INACTIVE") } }]
  assert.notEqual(getApiErrorKey("ASSET_CHECKIN_LOCATION_INACTIVE"), null, "T2 catalogued it")
  world.locationAnswers = [false]
  assert.deepEqual(await answer(await post(body({ expectedOutcome: "standalone", nextLocationId: "loc-closed" }))), inactive)
  assert.equal(args("assetComponent.updateMany").length, 0)
  world.locationAnswers = [true, false]; db.calls = []
  assert.deepEqual(await answer(await post(body({ expectedOutcome: "standalone", nextLocationId: "loc-store" }))), inactive)
  assert.deepEqual([args("asset.update").length, movements().length], [0, 0])
})

test("the return department is asked on every late return; a missing or inactive one refuses before any write (spec §12, P2-R8)", async () => {
  world.department = null
  const response = await post(body())
  assert.equal(response.status, 409)
  assert.equal((await response.json()).code, "ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE")
  assert.equal(args("assetComponent.updateMany").length, 0)
})

test("the late return's date: not before the RT-'s day and not after today, each under วันที่คืน (P2-R13)", async () => {
  assert.deepEqual(await answer(await post(body({ returnDate: "2026-10-19" }))), [400, { code: "COMPONENT_RETURN_DATE_BEFORE_CHECKIN", error: "COMPONENT_RETURN_DATE_BEFORE_CHECKIN", fieldErrors: { returnDate: "componentReturnDateBeforeCheckin" } }])
  assert.notEqual(getApiErrorKey("CHECKIN_RETURN_DATE_IN_FUTURE"), null, "T2 catalogued it")
  assert.deepEqual(await answer(await post(body({ returnDate: "2999-01-01" }))), [400, { code: "CHECKIN_RETURN_DATE_IN_FUTURE", error: "CHECKIN_RETURN_DATE_IN_FUTURE", fieldErrors: { returnDate: getApiErrorKey("CHECKIN_RETURN_DATE_IN_FUTURE") } }])
  assert.equal(args("assetComponent.updateMany").length, 0)
  assert.equal((await post(body({ returnDate: "2026-10-20" }))).status, 201, "the RT-'s own day is allowed")
})

test("an optional condition: ยังไม่ประเมิน is refused under it; a new one is written with its line; the same one changes nothing (spec §8.6, §19.2)", async () => {
  assert.deepEqual(await answer(await post(body({ conditionId: "cond-na" }))), [400, { code: "ASSET_CONDITION_NOT_SELECTABLE", error: "Invalid return condition for check-in", fieldErrors: { conditionId: "invalidReturnCondition" } }])
  db.calls = []
  assert.equal((await post(body({ conditionId: "cond-fair" }))).status, 201)
  assert.equal(dataOf("asset.update").conditionId, "cond-fair")
  assert.deepEqual(movements().at(-1), { assetId: "comp-1", movementType: "condition_change", fromValue: "cond-good", toValue: "cond-fair", ...moved })
  db.calls = []
  assert.equal((await post(body({ conditionId: "cond-good" }))).status, 201)
  assert.equal("conditionId" in dataOf("asset.update"), false)
  assert.equal(movements().some((row: Row) => row.movementType === "condition_change"), false)
})

test("a component no longer eligible (an open repair since the panel opened) is refused as changed; an inactive one is not found; a viewer is refused first (P2-R17)", async () => {
  world.componentOpenRepair = true
  assert.deepEqual(await answer(await post(body())), [409, CHANGED])
  assert.deepEqual([args("asset.update").length, movements().length], [0, 0])
  world.componentOpenRepair = false; world.component = { ...COMPONENT, isActive: false }
  assert.deepEqual(await answer(await post(body())), [404, { error: "Asset not found" }])
  world.component = { ...COMPONENT }; world.permissions = []; db.calls = []
  assert.equal((await post(body())).status, 403)
  assert.deepEqual(db.calls, [])
})
```

  **1c. Create `tests/component-outstanding-paths.test.ts`.**
  - It uses the same `registerHooks` resolver and the same `FAKE_DB` source as 1b, copied into this file.
  - The mocks:
    - `next/server` and `@/lib/db`, as in 1b;
    - `@/lib/auth-utils`: `requireAuth` answers `{ id: "user-1", roles: [], permissions: [], employeeId: "emp-1" }`, `hasPermission` answers true, and `requirePermission` and `hasRole` do nothing;
    - `@/lib/audit-log`: `logAudit` does nothing;
    - `@/lib/asset-component-evidence`: `optionalFormFile` and `optionalFormText` answer null, and `saveComponentEvidenceFile` answers null.
  - It keeps the `Row` and `Args` types, the `db` recorder (on `globalThis.__fakeDb`) and the `args(call)` helper, as in 1b. It has no `world`. The test code has no `any`: `@typescript-eslint/no-explicit-any` is an error in the recommended set that `eslint-config-next/typescript` loads, and `npm run lint` covers `tests/`.

  Then:
```ts
import { installedOrOutstandingLinkWhere } from "../src/lib/asset-component-outstanding.ts"
import { assetMissingResponsibilityWhere } from "../src/lib/asset-ownership.ts"
const { assertCanInstallComponent } = await import(pathToFileURL("src/lib/asset-components.ts").href)
const candidates = await import(pathToFileURL("src/app/api/assets/component-candidates/route.ts").href)
const removal = await import(pathToFileURL("src/app/api/assets/[id]/components/[componentId]/route.ts").href)
const read = (file: string) => readFileSync(file, "utf8")
const link = (status: string) => ({ id: "link-1", parentAssetId: "parent-1", componentAssetId: "comp-1", status, removedAt: null, reason: null, referenceType: "checkin", referenceId: "checkin-1", componentRole: "RAM", slotNo: null, parentAsset: { assetTag: "GRL-COM-26-0100", name: "Notebook" }, componentAsset: { id: "comp-1", assetTag: "GRL-RAM-26-0001", name: "RAM 16GB" } })
const remove = () => removal.DELETE(
  new Request("http://localhost/api/assets/parent-1/components/link-1", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: "ไม่ได้คืน" }) }),
  { params: Promise.resolve({ id: "parent-1", componentId: "link-1" }) },
)
beforeEach(() => { db.calls = []; db.answers = { "asset.findFirst": { id: "found" } } })

test("installing an outstanding component anywhere is refused with its own words; an installed one keeps today's refusal (spec §8.5)", async () => {
  db.answers["assetComponent.findFirst"] = (a: Args) => (a.where?.componentAssetId ? { id: "link-9", status: "outstanding", removedAt: null, parentAsset: { assetTag: "GRL-COM-26-0100" } } : null)
  await assert.rejects(assertCanInstallComponent("parent-2", "comp-1", null), { message: "ASSET_COMPONENT_OUTSTANDING" })
  assert.deepEqual(args("assetComponent.findFirst")[0].where, { componentAssetId: "comp-1", ...installedOrOutstandingLinkWhere })
  assert.deepEqual(args("assetComponent.findMany")[0].where, { parentAssetId: "comp-1", ...installedOrOutstandingLinkWhere }, "the cycle walk counts an outstanding child, so a re-attach cannot close a cycle")
  assert.notEqual(getApiErrorKey("ASSET_COMPONENT_OUTSTANDING"), null, "T4 catalogued it")
  db.answers["assetComponent.findFirst"] = (a: Args) => (a.where?.componentAssetId ? { id: "link-8", status: "installed", removedAt: null, parentAsset: { assetTag: "GRL-COM-26-0100" } } : null)
  await assert.rejects(assertCanInstallComponent("parent-2", "comp-1", null), { message: "Component is already installed in GRL-COM-26-0100" })
})

test("the slot an outstanding component left stays taken (spec §8.5)", async () => {
  db.answers["assetComponent.findFirst"] = (a: Args) => (a.where?.slotNo ? { id: "link-9" } : null)
  await assert.rejects(assertCanInstallComponent("parent-1", "comp-2", " A1 "), { message: "This parent asset already has a component in the same slot" })
  assert.deepEqual(args("assetComponent.findFirst").find((a) => a.where?.slotNo)?.where, { parentAssetId: "parent-1", slotNo: "A1", ...installedOrOutstandingLinkWhere })
})

test("the candidate list leaves an outstanding component out (spec §8.5)", async () => {
  const url = "http://localhost/api/assets/component-candidates?parentAssetId=parent-1&search=RAM"
  assert.equal((await candidates.GET(Object.assign(new Request(url), { nextUrl: new URL(url) }))).status, 200)
  assert.deepEqual(args("asset.findMany")[0].where?.installedInLinks, { none: installedOrOutstandingLinkWhere })
})

test("ถอดออก ends an outstanding link with a guarded write, and the RT- stays the link's reference (spec §8.5, P2-R17, GP G15)", async () => {
  db.answers["assetComponent.findFirst"] = link("outstanding")
  db.answers["assetComponent.findUnique"] = { ...link("removed"), removedAt: new Date() }
  assert.equal((await remove()).status, 200)
  assert.deepEqual(args("assetComponent.findFirst")[0].where, { id: "link-1", parentAssetId: "parent-1", ...installedOrOutstandingLinkWhere })
  const [write] = args("assetComponent.updateMany")
  assert.deepEqual(write.where, { id: "link-1", parentAssetId: "parent-1", ...installedOrOutstandingLinkWhere })
  const written = write.data as Row
  assert.ok(written.removedAt instanceof Date)
  assert.deepEqual([written.status, written.reason, written.referenceType, written.referenceId, written.updatedBy], ["removed", "ไม่ได้คืน", "checkin", "checkin-1", "user-1"])
  assert.equal(args("assetComponent.update").length, 0, "no unguarded write")
  assert.deepEqual((args("assetMovement.createMany")[0].data as Row[]).map((row) => row.movementType), ["component_remove", "removed_from_parent"])
})

test("a link that changed between the read and the write (a late return, another ถอดออก) is refused 409 with nothing recorded; an ended one reads 404 (GP G15)", async () => {
  db.answers["assetComponent.findFirst"] = link("outstanding")
  db.answers["assetComponent.updateMany"] = { count: 0 }
  const response = await remove()
  assert.deepEqual([response.status, await response.json()], [409, { code: "ASSET_CHANGED_DURING_OPERATION", error: "Asset status changed while this request was being saved. Reload the asset and try again." }])
  assert.deepEqual([args("assetMovement.createMany").length, args("attachment.create").length], [0, 0])
  db.answers["assetComponent.findFirst"] = null
  const gone = await remove()
  assert.deepEqual([gone.status, await gone.json()], [404, { error: "Installed component not found" }])
})

test("the responsibility rule and the pages that feed it count an outstanding component as held (spec §8.5, P2-R17)", () => {
  const branch = (assetMissingResponsibilityWhere.OR as Array<Record<string, unknown>>).find((entry) => entry.ownershipType === "component")
  assert.deepEqual(branch, { ownershipType: "component", OR: [{ departmentId: null }, { installedInLinks: { none: installedOrOutstandingLinkWhere } }] })
  for (const file of ["src/app/[locale]/(dashboard)/work-center/page.tsx", "src/app/[locale]/(dashboard)/reports/page.tsx"]) {
    assert.match(read(file), /installedInLinks: \{ where: installedOrOutstandingLinkWhere, select: \{ id: true \}, take: 1 \}/, file)
    assert.doesNotMatch(read(file), /installedInLinks: \{ where: \{ status: "installed"/, file)
  }
  const page = read("src/app/[locale]/(dashboard)/assets/[id]/page.tsx")
  assert.match(page, /installedInLinks: \{\s+where: installedOrOutstandingLinkWhere,/)
  assert.match(page, /const installedInLinksForPanel = asset\.installedInLinks\.filter\(\(link\) => !isOutstandingLink\(link\)\)\.map\(/, "the panels still show installed parents only")
})

test("the parent's component manager keeps an outstanding link among the current ones, with its line, so ถอดออก reaches it (spec §8.5)", () => {
  const page = read("src/app/[locale]/(dashboard)/assets/[id]/components/page.tsx")
  const manager = read("src/components/assets/asset-component-manager.tsx")
  assert.match(page, /referenceType: true,\s+referenceId: true,/)
  assert.match(page, /custodian: \{ select: \{ code: true, fullNameTh: true \} \}/)
  assert.match(page, /const isCurrentLink = \(component: \{ status: string; removedAt: Date \| null \}\) => !component\.removedAt && \(component\.status === "installed" \|\| isOutstandingLink\(component\)\)/)
  assert.match(page, /prisma\.assetCheckin\.findMany\(\{ where: \{ id: \{ in: outstandingCheckinIds \} \}, select: \{ id: true, documentNo: true \} \}\)/)
  assert.match(page, /\[t\("componentOutstanding"\), holder \? t\("componentOutstandingWith", \{ holder \}\) : null, documentNo\]\.filter\(Boolean\)\.join\(" · "\)/)
  assert.doesNotMatch(page, /component\.status !== "installed" \|\| component\.removedAt/)
  assert.match(manager, /outstandingLine\?: string \| null/)
  assert.match(manager, /\{component\.outstandingLine \? <div className="mt-1 text-meta font-medium text-warning">\{component\.outstandingLine\}<\/div> : null\}/)
  for (const [locale, words] of [["th", ["ค้างคืน", "อยู่กับ {holder}"]], ["en", ["Outstanding", "With {holder}"]]] as const) {
    const asset = JSON.parse(read(`messages/${locale}.json`)).asset
    assert.deepEqual([asset.componentOutstanding, asset.componentOutstandingWith], words, locale)
  }
})
```
  Add `readFileSync` (from `node:fs`, beside `existsSync`) and `getApiErrorKey` (from `../src/lib/api-error-catalog.ts`) to this file's imports.

  **1d. Append to `tests/asset-department-rule.test.ts`.** Add `getLateReturnDepartmentId` to the import from `../src/lib/asset-department-rule.ts`:
```ts
test("a late return re-attached follows its parent's department; one standing alone takes the return department, a ส่วนกลาง one keeps its own (P2-R7, spec §6)", () => {
  const late = (outcome: "reattached" | "standalone", ownership: AssetOwnershipType, overrides: { parentDepartmentId?: string | null; currentDepartmentId?: string | null } = {}) =>
    getLateReturnDepartmentId({ outcome, ownership, parentDepartmentId: "dept-parent", returnDepartmentId: "dept-it", currentDepartmentId: "dept-returner", ...overrides })
  for (const ownership of ["personal", "stock", "shared", "component", "software_license"] as const) {
    assert.equal(late("reattached", ownership), "dept-parent", ownership)
    assert.equal(late("reattached", ownership, { parentDepartmentId: null }), null, `${ownership}, a parent without a department`)
  }
  for (const ownership of ["personal", "stock", "component", "software_license"] as const) assert.equal(late("standalone", ownership), "dept-it", ownership)
  assert.deepEqual([late("standalone", "shared"), late("standalone", "shared", { currentDepartmentId: null })], ["dept-returner", null])
})
```

  **1e. `tests/disposal-readiness.test.ts`.**
  - Import `readFileSync` from `node:fs`. Import `disposalReadinessAssetSelect`, `disposalReadinessBlockers`, `getDisposalOutstandingComponentTags` and `getDisposalReadinessBlockersForAsset` beside `getDisposalReadinessBlockers`. Import `outstandingLinkWhere` from `../src/lib/asset-component-outstanding.ts`.
  - **Rewrite `:10-33`.** The input gains `outstandingChildComponentTags: ["GRL-RAM-26-0001"]` after `installedChildComponentCount: 2`, and `outstandingInParentCount: 1` after `installedInParentCount: 1`. The expected list gains `"outstanding_child_components"` after `"installed_child_components"`, and `"outstanding_in_parent"` after `"installed_in_parent"`.
  - Append:
```ts
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
  assert.match(readFileSync("src/app/api/disposal-assets/route.ts", "utf8"), /outstandingComponentTags: getDisposalOutstandingComponentTags\(asset\),/)
})
```

  **1f. `tests/api-error-catalog.test.ts`, append:**
```ts
test("a late component return dated before its RT- reads its own words under the date (P2-R13)", () => {
  assert.equal(getApiErrorKey("COMPONENT_RETURN_DATE_BEFORE_CHECKIN"), "componentReturnDateBeforeCheckin")
  const words = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).apiErrors.componentReturnDateBeforeCheckin
  assert.deepEqual([words("th"), words("en")], ["วันที่คืนต้องไม่ก่อนวันที่รับคืนเครื่องหลัก", "The return date cannot be before the day the parent asset was returned."])
})
```

  **1g. Rewrite the pins this task breaks.**
  - `tests/asset-detail-page.test.ts:34` becomes:
```ts
  assert.match(source, /reason: disposalOffer\.blocker \? tDisposal\(`readinessBlockers\.\$\{disposalOffer\.blocker\}`, \{ tags: frame\.disposalOutstandingComponentTags\.join\(", "\) \}\) : null/)
```
  - `tests/asset-movement-labels.test.ts`:
    - WRITERS (`:28-53`) gains `"src/app/api/assets/[id]/component-return/route.ts",` after `"src/app/api/assets/[id]/checkout/route.ts",`.
    - `:81` becomes `assert.equal(written.size, 49, [...written.keys()].sort().join(", "))`. T3 left it at 48.
  - `tests/asset-history-rules.test.ts:49`: the `checkin` list ends with `"component_late_return"`, after T3's `"component_outstanding"`.

- [ ] **Step 2: Run them and see them fail.** Run:
  ```
  node --test tests/component-late-return.test.ts tests/component-late-return-route.test.ts tests/component-outstanding-paths.test.ts tests/asset-department-rule.test.ts tests/disposal-readiness.test.ts tests/api-error-catalog.test.ts tests/asset-detail-page.test.ts tests/asset-movement-labels.test.ts tests/asset-history-rules.test.ts
  ```
  Expected failures:
  - `tests/component-late-return.test.ts` does not load: Task 4's `component-late-return.ts` does not provide an export named `componentLateReturnOutcomes`. Task 4's own tests in that file pass again once 3a lands.
  - `ERR_MODULE_NOT_FOUND` for the route, which takes `tests/component-late-return-route.test.ts` down.
  - The install refusal reads "Component is already installed in …" where "ASSET_COMPONENT_OUTSTANDING" is expected.
  - The wheres lack `outstanding`.
  - ถอดออก's `assetComponent.updateMany` is never called.
  - The responsibility branch still says `status: "installed"`.
  - The manager pins fail.
  - `getLateReturnDepartmentId` is not exported.
  - The blocker order and select pins fail, and `getDisposalOutstandingComponentTags` is not exported.
  - `componentReturnDateBeforeCheckin` is missing.
  - The asset page pin, the 49 count, the WRITERS list and the checkin chip list fail.

- [ ] **Step 3: Implement.**

  **3a. `src/lib/component-late-return.ts` (Task 4's file; modify, never re-create).**
  - Keep Task 4's header, its `normalizeAssetStateName` import, `LateReturnParent` and `getLateReturnOutcome` exactly as they are.
  - Add `import { checkinReturnDateError } from "./checkin-route-rules.ts"` beside Task 4's `import { normalizeAssetStateName } from "./asset-lifecycle-policy.ts"`. It is relative and ends in `.ts`, so Task 4's purity test passes. `checkin-route-rules.ts` imports only `./preventive-maintenance.ts`, whose one import is `import type`, so the file stays client-safe, and `validations/asset-operations.ts` (3d) can import it with no cycle.
  - Append, after `getLateReturnOutcome`, under one comment line ("The outcome list and the late date bound (group 3 spec §8.6, P2-R3, P2-R13): the route and Task 9's panel read them."): `componentLateReturnOutcomes`, `ComponentLateReturnOutcome`, `LateReturnDateError` and `getLateReturnDateError`, as in Produces, and nothing else.
  - Task 4 already set the รับคืน row's `parentInStock` through `getLateReturnOutcome`; the 1a walk pins it. Do not touch the search files.

  **3b. `src/lib/asset-department-rule.ts`.**
  - Add `import type { ComponentLateReturnOutcome } from "./component-late-return.ts"`. It is `import type`, so the file's purity pin (`tests/asset-department-rule.test.ts:33-36`) still passes.
  - Add `getLateReturnDepartmentId` (Produces) after Task 1's `getCheckinNextDepartmentId`. It does not call Task 1's private `keepsOwnDepartment` (see Decisions). Its comments:
    - re-attached, a component follows its parent (spec §6 "A component follows its parent", P2-R7);
    - standing alone, it sits in IT stock and takes the return department;
    - ส่วนกลาง keeps its responsible department "on checkout, return and transfer" (spec §6), and a late return is a return.
  - Task 1 left the header's last line as `// Plans 2-3 add the late component return and transfer rules here.` Change it to `// Plan 3 adds the transfer rule here.`, and add the late-return route and Task 9's late summary to the header's list of callers.

  **3d. `assetComponentReturnSchema`,** after `assetComponentRemoveSchema` in `src/lib/validations/asset-operations.ts`:
  - Add `import { componentLateReturnOutcomes } from "../component-late-return.ts"` beside the `../asset-handover-mode.ts` import.
  - The fields:
    - `componentLinkId: z.string().trim().min(1).max(100)`
    - `checkinId: z.string().trim().min(1).max(100)`
    - `expectedOutcome: z.enum(componentLateReturnOutcomes)`
    - `returnDate: z.coerce.date()`
    - `receiveByEmployeeId: optionalText`
    - `receiveBy: z.string().trim().min(1).max(100)`
    - `conditionId: optionalText`
    - `nextLocationId: optionalText`
    - `remark: optionalText`
  - Then `.superRefine`: when `expectedOutcome === "standalone" && !nextLocationId`, `context.addIssue({ code: "custom", path: ["nextLocationId"], message: "Location is required" })`. That message is catalogued (`locationRequired`).
  - Add `export type AssetComponentReturnInput = z.infer<typeof assetComponentReturnSchema>` after `:136`.

  **3e. The route `src/app/api/assets/[id]/component-return/route.ts`.**
  - It exports `POST` only. The helpers below it are not exported.
  - `type ComponentReturnContext = { params: Promise<{ id: string }> }`.
  - Its late-return imports: `getLateReturnDateError`, `getLateReturnOutcome`, `type LateReturnDateError` and `type LateReturnParent` from `@/lib/component-late-return`; `getLateReturnDepartmentId` from `@/lib/asset-department-rule`; `getCheckinVerdict` from `@/lib/asset-operation-eligibility`; `outstandingLinkWhere` from `@/lib/asset-component-outstanding`; `readCheckinDepartment` from `@/lib/checkin-department`.
  - **Module-level helpers:**
    - `CHANGED_MESSAGE = "Asset status changed while this request was being saved. Reload the asset and try again."` and `changedDuringOperation()`, which returns `new AssetOperationConflictError("ASSET_CHANGED_DURING_OPERATION", CHANGED_MESSAGE)`.
    - `lateReturnLinkWhere(componentAssetId, input)` returns `{ id: input.componentLinkId, componentAssetId, referenceType: "checkin", referenceId: input.checkinId, ...outstandingLinkWhere }`.
    - `isActiveLocation(db: Pick<Prisma.TransactionClient, "location">, id: string)` runs `findFirst({ where: { id, isActive: true }, select: { id: true } })`.
    - `readLateReturnParent(db: Pick<Prisma.TransactionClient, "asset" | "assetCheckout" | "maintenanceTicket">, parentAssetId: string)`:
      - it returns `{ parent, facts: LateReturnParent }` (Task 4's type), or null when the row is gone;
      - the parent is `asset.findUnique({ where: { id }, select: { id, assetTag, name, isActive, statusId, status: { select: { name } }, custodianId, currentLocationId, departmentId } })`, with no `isActive` filter: a disposed parent is a fact;
      - `hasOpenCheckout` = `assetCheckout.findFirst({ where: { assetId, isReturned: false, transactionStatus: "active" }, select: { id: true } }) !== null`;
      - `hasOpenRepair` = `maintenanceTicket.count({ where: { ...openRepairRecordWhere, assetId } }) > 0`.
    - `class LateReturnLocationInactiveError extends Error`, with `super("ASSET_CHECKIN_LOCATION_INACTIVE")`. It has no parameter properties: node's strip-only mode refuses them.
    - `locationInactiveResponse()` and `returnDateRefusal(code: LateReturnDateError)`. Each returns the Produces body.
  - **`POST`, in this order** (the cheap checks before the transaction; no files are involved):
    1. `const user = await requireAuth()` and `requirePermission(user, "asset", "edit")`. They come before any `prisma.`: `tests/e2e-cross-cutting.test.ts:136` pins it.
    2. `const input = assetComponentReturnSchema.parse(await request.json().catch(() => ({})))`. A ZodError reaches `errorResponse` and becomes 400.
    3. `prisma.asset.findFirst({ where: { id, isActive: true }, select: { id: true } })`. When null, answer `404 { error: "Asset not found" }`.
    4. `prisma.assetComponent.findFirst({ where: lateReturnLinkWhere(id, input), select: { id: true, parentAssetId: true } })`. When null, `throw changedDuringOperation()`.
    5. `prisma.assetCheckin.findFirst({ where: { id: input.checkinId, assetId: link.parentAssetId, transactionStatus: "active" }, select: { id: true, documentNo: true, returnDate: true } })`. When null, throw changed.
    6. The date check: `getLateReturnDateError({ returnDay: getBangkokDateKey(input.returnDate), todayDay: getBangkokDateKey(new Date()), checkinDay: getBangkokDateKey(checkin.returnDate) })`. An error returns `returnDateRefusal(error)`.
    7. When `input.conditionId` is given:
       - read `prisma.assetCondition.findUnique({ where: { id }, select: { name: true, isActive: true } })`;
       - `getAssetOperationConditionError("checkin", condition)` → answer `400 { code, error: "Invalid return condition for check-in", fieldErrors: { conditionId: "invalidReturnCondition" } }`.
    8. `await readCheckinDepartment(prisma)`. It throws when the department is unavailable.
    9. When `input.expectedOutcome === "standalone"` and `!(await isActiveLocation(prisma, input.nextLocationId!))`, return `locationInactiveResponse()`. A re-attach never reads the room, even if a client sends one.
    10. `prisma.$transaction(async (tx) => …)`:
        1. Claim: `tx.assetComponent.updateMany({ where: lateReturnLinkWhere(id, input), data: { updatedBy: user.id } })`. A count other than 1 throws changed.
        2. `const linkRow = await tx.assetComponent.findUnique({ where: { id: input.componentLinkId }, select: { id: true, parentAssetId: true, componentRole: true, slotNo: true } })`, and `const checkinNow =` the RT- read of step 5 again with `tx`. Either null throws changed.
        3. `const before = await tx.asset.findUnique({ where: { id }, select: { id, assetTag, isActive, updatedAt, ownershipType, statusId, status: { select: { name } }, conditionId, condition: { select: { name } }, currentLocationId, custodianId, departmentId } })`. Null or inactive throws changed.
        4. `const read = await readLateReturnParent(tx, linkRow.parentAssetId)`. Null throws changed. Then `const outcome = getLateReturnOutcome(read.facts)`.
        5. The component's own facts:
           - `const openCheckout = await tx.assetCheckout.findFirst({ where: { assetId: id, isReturned: false, transactionStatus: "active" }, select: { id: true, handoverMode: true } })`;
           - `const hasOpenRepair = (await tx.maintenanceTicket.count({ where: { ...openRepairRecordWhere, assetId: id } })) > 0`.
        6. T4's rule:
           - `getCheckinVerdict({ statusName: before.status.name, ownership: normalizeAssetOwnershipType(before.ownershipType), custodianId: before.custodianId, openCheckout, hasOpenRepair, conditionName: before.condition?.name ?? null, outstanding: { linkId: linkRow.id, checkinId: checkinNow.id } })`.
           - `outstanding` is Task 4's `AssetOperationOutstandingFact`, exactly these two keys. The RT- number, date, parent and outcome are not part of it; the route already holds them.
           - Not eligible, or `path !== "componentReturn"`, throws changed. The panel opens only for an eligible row, so a refusal here is a stale row.
        7. `outcome !== input.expectedOutcome` throws changed (P2-R3).
        8. `const returnDepartment = await readCheckinDepartment(tx)`.
        9. Re-attach:
           - `await claimAssetForCustodyChange(tx, { assetId: read.parent.id, expectedStatusId: read.parent.statusId, updatedBy: user.id })`;
           - then `readLateReturnParent(tx, read.parent.id)` again;
           - anything but `"reattached"` from `getLateReturnOutcome` throws changed. This catches a holder or a repair set without a status change.

           Stand alone: `!(await isActiveLocation(tx, input.nextLocationId!))` throws `LateReturnLocationInactiveError`.
        10. `nextDepartmentId = getLateReturnDepartmentId({ outcome, ownership, parentDepartmentId: read.parent.departmentId, returnDepartmentId: returnDepartment.id, currentDepartmentId: before.departmentId })`.

            `conditionChanged = Boolean(input.conditionId) && input.conditionId !== before.conditionId`.
        11. The links: `tx.assetComponent.updateMany({ where: { parentAssetId: read.parent.id, componentAssetId: id, referenceType: "checkin", referenceId: input.checkinId, ...outstandingLinkWhere }, data })`:
            - re-attach: `data` is `{ status: "installed", updatedBy: user.id }`;
            - stand alone: `data` is `{ status: "removed", removedAt: input.returnDate, updatedBy: user.id }`.

            Every duplicate link of the component that T3 marked (P2-R1) ends the same way. The link keeps its `referenceType`/`referenceId` (the RT-).
        12. The component: `tx.asset.update({ where: { id }, data: { currentLocationId, custodianId: null, departmentId: nextDepartmentId, ...(conditionChanged ? { conditionId: input.conditionId } : {}), updatedBy: user.id } })`, with no `select`. `currentLocationId` is `read.parent.currentLocationId` on re-attach and `input.nextLocationId!` otherwise (the schema's refine guarantees it for a standalone return). The status is not touched: syncs never write a component's status.
        13. One `tx.assetMovement.createMany({ data: rows })`, with the rows in this order and these exact keys (the test compares whole rows):
            - the parent row: `{ assetId: read.parent.id, movementType: parentMovementType, toValue | fromValue: linkValue, reason: null, referenceType: "checkin", referenceId: input.checkinId, performedBy: user.id }`.
              - `const parentMovementType = outcome === "reattached" ? "component_install" : "component_remove"`.
              - Re-attach carries `toValue`, stand alone `fromValue`. `linkValue` = `JSON.stringify({ componentAssetId: id, componentAssetTag: before.assetTag, componentRole: linkRow.componentRole, slotNo: linkRow.slotNo })`: the shape of the install and remove routes, which the history reads.
              - `reason` is null: `component_install`/`component_remove` show their reason as typed words (`ASSET_HISTORY_REASON_TYPES`).
            - `{ assetId: id, movementType: "component_late_return", toValue: JSON.stringify({ receivedByName: input.receiveBy, returnDate: getBangkokDateKey(input.returnDate), outcome }), reason: "Component late return", referenceType: "checkin", referenceId: input.checkinId, performedBy: user.id, remark: input.remark ?? null }`.
              - The `toValue` key order is P2-R2's. T6's RT- line reads it.
              - Write the type as this literal, so `tests/asset-movement-labels.test.ts` counts it.
            - When `currentLocationId !== before.currentLocationId`: `{ assetId: id, movementType: "location_change", fromValue: before.currentLocationId, toValue: currentLocationId, reason: "Component late return", referenceType: "checkin", referenceId: input.checkinId, performedBy: user.id }`, so the component's history shows the room it went to, as the regular return records its room move.
            - When `before.custodianId !== null`: `{ assetId: id, movementType: "custodian_change", fromValue: before.custodianId, toValue: null, reason: "Component late return", referenceType: "checkin", referenceId: input.checkinId, performedBy: user.id }`, so the history shows the holder cleared. Both types are already labelled and written elsewhere, so the movement-type count does not change.
            - When `nextDepartmentId !== before.departmentId`: `{ assetId: id, movementType: "department_change", fromValue: before.departmentId, toValue: nextDepartmentId, reason: "Component late return", referenceType: "checkin", referenceId: input.checkinId, performedBy: user.id }` (spec §6, history).
            - When `conditionChanged`: `{ assetId: id, movementType: "condition_change", fromValue: before.conditionId, toValue: input.conditionId, reason: "Component late return", referenceType: "checkin", referenceId: input.checkinId, performedBy: user.id }`.
        14. Return `{ outcome, parentAssetId: read.parent.id, departmentId: nextDepartmentId, previousDepartmentId: before.departmentId, before }`.
    11. `logAudit({ userId: user.id, action: "component_late_return", module: "asset", recordId: id, oldValue: before, newValue: { ...input, checkinId: checkin.id, documentNo: checkin.documentNo, outcome, parentAssetId, departmentId, previousDepartmentId } })`.
    12. `return NextResponse.json({ checkinId: checkin.id, documentNo: checkin.documentNo, outcome }, { status: 201 })`.
  - **The catch, in this order:**
    1. `AssetOperationConflictError` → `409 { code: error.code, error: error.message }`. Comment on it: "Branch 1 also answers Task 1's department refusal: `CheckinDepartmentUnavailableError` is an `AssetOperationConflictError` whose code and message are `ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE`."
    2. `LateReturnLocationInactiveError` → `locationInactiveResponse()`.
    3. `errorResponse(error, 400)`.

    There is no separate branch for the department error: it would never be reached.
  - **Not done here:**
    - No snapshot is written: there is no new document.
    - The RT-'s cancel is already blocked once the link's status or `updatedAt` changed (T3, `components_changed`).
    - The parent's `updatedAt` moves on re-attach. The RT- reads `asset_changed` too, which is accepted (GP W9).
    - The parent rows reference the RT-, so they are downstream of any later document on the parent (P2-R22, the docs task).
    - An open audit round across the RT- refusing the component with its parent (P2-R22) needs no code here; Task 11's docs state it.

  **3f. Install, slot, cycle and candidates** (spec §8.5):
  - `src/lib/asset-components.ts`:
    - The component link read (`:11-14`) becomes `where: { componentAssetId, ...installedOrOutstandingLinkWhere }, select: { id: true, status: true, removedAt: true, parentAsset: { select: { assetTag: true } } }`.
    - The slot read (`:17`) becomes `where: { parentAssetId, slotNo: slotNo.trim(), ...installedOrOutstandingLinkWhere }`.
    - The cycle walk (`:48`) becomes `where: { parentAssetId: current, ...installedOrOutstandingLinkWhere }`.
    - The refusal at `:26`: when `isOutstandingLink(activeComponentLink)`, `throw new Error("ASSET_COMPONENT_OUTSTANDING")` (T4's code and words, "ส่วนควบค้างคืน รับคืนก่อน"). Otherwise keep today's dynamic message.
    - Import `installedOrOutstandingLinkWhere` and `isOutstandingLink` from `@/lib/asset-component-outstanding`. Do not import `COMPONENT_LINK_OUTSTANDING` here: it is the link status `"outstanding"`, not the refusal code, and the code is the string literal above.
    - Counting outstanding links in the cycle walk means a later re-attach cannot close a cycle.
  - `component-candidates/route.ts:20-25` becomes `installedInLinks: { none: installedOrOutstandingLinkWhere },`.

  **3g. ถอดออก** (`src/app/api/assets/[id]/components/[componentId]/route.ts`):
  - The read (`:20-31`) becomes `where: { id: componentId, parentAssetId, ...installedOrOutstandingLinkWhere }`. Its 404 stays.
  - In the transaction, replace `tx.assetComponent.update({ where: { id: componentId }, data })` (`:39-49`) with a guarded write:
    - `const ended = await tx.assetComponent.updateMany({ where: { id: componentId, parentAssetId, ...installedOrOutstandingLinkWhere }, data: <the same data object as today> })`;
    - when `ended.count !== 1`, throw `new AssetOperationConflictError("ASSET_CHANGED_DURING_OPERATION", "Asset status changed while this request was being saved. Reload the asset and try again.")`;
    - `const record = await tx.assetComponent.findUnique({ where: { id: componentId } })`, and when null throw the same error.
  - The evidence, movements, audit and answer are unchanged. The component asset is not moved: after ถอดออก a standalone ส่วนควบ keeps its holder (P2-R22).
  - The catch (`:113-115`) gets, first: `if (error instanceof AssetOperationConflictError) return NextResponse.json({ code: error.code, error: error.message }, { status: 409 })`.
  - Import `AssetOperationConflictError` from `@/lib/asset-operation-claim`.

  **3h. The component manager** (spec §8.5 "the existing ถอดออก on the parent's component list also works on an outstanding link"):
  - `assets/[id]/components/page.tsx`:
    - The link select (`:36-49`) gains `referenceType: true, referenceId: true,` after `reason: true,`, and `componentAsset.select` gains `custodian: { select: { code: true, fullNameTh: true } }`.
    - After `if (!asset) notFound()`:
      - `const isCurrentLink = (component: { status: string; removedAt: Date | null }) => !component.removedAt && (component.status === "installed" || isOutstandingLink(component))`;
      - `outstandingCheckinIds`: the distinct `referenceId`s of outstanding links whose `referenceType === "checkin"`;
      - when there are any, `prisma.assetCheckin.findMany({ where: { id: { in: outstandingCheckinIds } }, select: { id: true, documentNo: true } })`, and a `Map` from id to `documentNo`.
    - Each record (`:71-78`) gains `current: isCurrentLink(component)` and an `outstandingLine` (null unless `isOutstandingLink(component)`):
      - `holder` = the custodian as `` `${code} - ${fullNameTh}` ``, or null without one;
      - `documentNo` = the map's value, or null;
      - the line is `[t("componentOutstanding"), holder ? t("componentOutstandingWith", { holder }) : null, documentNo].filter(Boolean).join(" · ")`.

      There is no `"-"` fallback (LV2).
    - `currentComponents = records.filter((component) => component.current)` and `componentHistory = records.filter((component) => !component.current)`. They replace `:79-80`.
  - `asset-component-manager.tsx`:
    - `ComponentRecord` gains `outstandingLine?: string | null`.
    - In `ComponentRow`, after the role/slot/date line (`:579-582`), add `{component.outstandingLine ? <div className="mt-1 text-meta font-medium text-warning">{component.outstandingLine}</div> : null}`.
    - The current list already gives every current row `onRemove`, so ถอดออก appears on it.
  - The asset page's own lines are Task 12's, not this task's: the components tab, the overview, and the component's page.

  **3i. Responsibility** (spec §8.5 "counts it as held"):
  - `src/lib/asset-ownership.ts:37` becomes `{ installedInLinks: { none: installedOrOutstandingLinkWhere } },`, with `import { installedOrOutstandingLinkWhere } from "./asset-component-outstanding.ts"`. Use a relative `.ts` import: `asset-list-query.ts` and `node --test` load this file.
  - `work-center/page.tsx:218` and `reports/page.tsx:470` both become `installedInLinks: { where: installedOrOutstandingLinkWhere, select: { id: true }, take: 1 },`, importing from `@/lib/asset-component-outstanding`.
  - `assets/[id]/page.tsx`:
    - the include at `:129-131` becomes `where: installedOrOutstandingLinkWhere,`;
    - `:301` becomes `const installedInLinksForPanel = asset.installedInLinks.filter((link) => !isOutstandingLink(link)).map((component) => ({`.

    `hasAssetResponsibility(asset)` (`:351`) then sees the outstanding link. If T4 already widened this include for its `outstanding` fact, keep T4's include and make only the `:301` change.

  **3j. Disposal readiness** (P2-R17):
  - `src/lib/disposal-readiness.ts`:
    - `disposalReadinessBlockers`: insert `"outstanding_child_components"` after `"installed_child_components"`, and `"outstanding_in_parent"` after `"installed_in_parent"`.
    - `DisposalReadinessFacts` gains `outstandingChildComponentTags?: string[]` and `outstandingInParentCount?: number`.
    - `disposalReadinessAssetSelect` gains two keys after `licenseAssignedAssetId: true,`. They are exactly the 1e pins: `parentComponents: { where: outstandingLinkWhere, orderBy: { installedAt: "asc" }, take: 10, select: { componentAsset: { select: { assetTag: true } } } }` and `installedInLinks: { where: outstandingLinkWhere, take: 1, select: { id: true } }`. Add a comment: a relation cannot be counted twice in `_count`, and the parent's blocker names the tags. `_count` is unchanged.
    - `DisposalReadinessAsset` gains `parentComponents?: { componentAsset: { assetTag: string } }[]` and `installedInLinks?: { id: string }[]`.
    - `getDisposalReadinessFacts` adds `outstandingChildComponentTags: (asset.parentComponents ?? []).map((link) => link.componentAsset.assetTag)` and `outstandingInParentCount: asset.installedInLinks?.length`.
    - `getDisposalReadinessBlockers` pushes the two keys when the tags are not empty and when the count is above 0, each right after its installed twin.
    - `export function getDisposalOutstandingComponentTags(asset: DisposalReadinessAsset): string[]` returns the facts' tags, or `[]`.
    - Import `outstandingLinkWhere` from `./asset-component-outstanding.ts`.
  - `src/lib/asset-detail-frame.ts`:
    - import `getDisposalOutstandingComponentTags`;
    - `AssetDetailFrame` gains `disposalOutstandingComponentTags: string[]`;
    - after `:70`, add `disposalOutstandingComponentTags: readiness ? getDisposalOutstandingComponentTags(readiness) : [],`.
  - `assets/[id]/page.tsx:409` becomes:
```tsx
          reason: disposalOffer.blocker ? tDisposal(`readinessBlockers.${disposalOffer.blocker}`, { tags: frame.disposalOutstandingComponentTags.join(", ") }) : null,
```
  - `src/app/api/disposal-assets/route.ts`: import `getDisposalOutstandingComponentTags`, and add `outstandingComponentTags: getDisposalOutstandingComponentTags(asset),` after `blockers,` (`:63`).
  - `disposal-asset-picker.tsx`:
    - `DisposalAssetOption` gains `outstandingComponentTags?: string[]`;
    - at `:74`, the blocker words become:
```tsx
option.blockers.map((blocker) => t(`readinessBlockers.${blocker}`, { tags: (option.outstandingComponentTags ?? []).join(", ") })).join(" · ")
```
  - Both renderers pass `tags` to every blocker. A message without `{tags}` (every other blocker, and `outstanding_in_parent`) ignores it; a message with `{tags}` and no value would throw next-intl's FORMATTING_ERROR, which is why 1e pins both calls.
  - `disposal-requests/route.ts` and `disposal-batches/route.ts` are unchanged. They refuse on any blocker and join the keys into their English detail.

  **3k. The movement type** (P2-R2):
  - `src/lib/asset-movement-labels.ts`:
    - `ASSET_MOVEMENT_LABELLED_TYPES` gains `"component_late_return",` after T3's `"component_outstanding",`;
    - the comment at `:4` reads "The 49 types src writes";
    - it is not a mirror type: it is the component's own event;
    - add no system-log label for it: `component_install` and `component_remove` have none either.
  - `src/lib/asset-history-rules.ts`: the `checkin:` row of `categoryTypes` (`:45`) ends with `"component_late_return"`.
  - `disposal/[id]/page.tsx` `knownMovementTypeKeys`: add `"component_late_return",` after T3's `"component_outstanding",`.

  **3l. The catalog and the words.**
  - In `src/lib/api-error-catalog.ts`, add `"COMPONENT_RETURN_DATE_BEFORE_CHECKIN": "componentReturnDateBeforeCheckin",`, in its case-insensitive place, after the `"Component parent is not included in this audit round"` row (`:87`).
  - Save `<scratchpad>/p2-t5-messages.json` and run `node scripts/messages-edit.mjs <scratchpad>/p2-t5-messages.json`. Expected output: `messages updated: 6 th, 6 en, 0 deleted`.
```json
{ "set": {
  "th": {
    "asset.movementTypes.component_late_return": "รับคืนส่วนควบค้างคืน",
    "asset.componentOutstanding": "ค้างคืน",
    "asset.componentOutstandingWith": "อยู่กับ {holder}",
    "apiErrors.componentReturnDateBeforeCheckin": "วันที่คืนต้องไม่ก่อนวันที่รับคืนเครื่องหลัก",
    "disposalPage.readinessBlockers.outstanding_child_components": "ยังมีส่วนควบค้างคืน: {tags}",
    "disposalPage.readinessBlockers.outstanding_in_parent": "เป็นส่วนควบค้างคืน รับคืนหรือถอดส่วนควบก่อน"
  },
  "en": {
    "asset.movementTypes.component_late_return": "Outstanding component returned",
    "asset.componentOutstanding": "Outstanding",
    "asset.componentOutstandingWith": "With {holder}",
    "apiErrors.componentReturnDateBeforeCheckin": "The return date cannot be before the day the parent asset was returned.",
    "disposalPage.readinessBlockers.outstanding_child_components": "Outstanding components not returned yet: {tags}",
    "disposalPage.readinessBlockers.outstanding_in_parent": "This component is outstanding. Return it or remove it from its parent first."
  }
} }
```

  **3m. The viewer refusal list.** In `e2e/cross-cutting/support/refusals.ts`, after the transfer entry (`:55`), add:
```ts
  { method: "POST", path: `/api/assets/${NO_RECORD}/component-return`, file: "assets/[id]/component-return/route.ts", permission: "asset:edit", body: {} },
```

- [ ] **Step 4: Run them and see them pass, then the repo checks.**
  1. Re-run the Step 2 command, plus:
     ```
     node --test tests/asset-detail-frame.test.ts tests/asset-detail-ux.test.ts tests/e2e-cross-cutting.test.ts tests/asset-component-manager.test.ts tests/assets-sweep-ui.test.ts tests/asset-forms-ui.test.ts tests/disposal-route-structure.test.ts tests/disposal-pending-source-route.test.ts tests/disposal-batch-pending-source-route.test.ts tests/list-frame-guards.test.ts tests/thai-glossary.test.ts tests/asset-operation-eligibility.test.ts tests/asset-operation-search.test.ts tests/asset-operation-search-rules.test.ts
     ```
     Expected: all pass. The last three are T4's; this task does not change their files, and they must still pass.
  2. Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: no failures and 0 lint errors. If a pin outside this task's list fails, rewrite it in this commit and name it in the report.

- [ ] **Step 5: Commit.**
```
git add src/lib/component-late-return.ts "src/app/api/assets/[id]/component-return/route.ts" src/lib/asset-department-rule.ts src/lib/validations/asset-operations.ts src/lib/asset-components.ts src/app/api/assets/component-candidates/route.ts "src/app/api/assets/[id]/components/[componentId]/route.ts" "src/app/[locale]/(dashboard)/assets/[id]/components/page.tsx" src/components/assets/asset-component-manager.tsx src/lib/asset-ownership.ts "src/app/[locale]/(dashboard)/work-center/page.tsx" "src/app/[locale]/(dashboard)/reports/page.tsx" "src/app/[locale]/(dashboard)/assets/[id]/page.tsx" src/lib/disposal-readiness.ts src/lib/asset-detail-frame.ts src/app/api/disposal-assets/route.ts src/components/disposal/disposal-asset-picker.tsx src/lib/asset-movement-labels.ts src/lib/asset-history-rules.ts "src/app/[locale]/(dashboard)/disposal/[id]/page.tsx" src/lib/api-error-catalog.ts messages/th.json messages/en.json e2e/cross-cutting/support/refusals.ts tests/component-late-return.test.ts tests/component-late-return-route.test.ts tests/component-outstanding-paths.test.ts tests/asset-department-rule.test.ts tests/disposal-readiness.test.ts tests/api-error-catalog.test.ts tests/asset-detail-page.test.ts tests/asset-movement-labels.test.ts tests/asset-history-rules.test.ts
git commit -m "feat(checkin): a component left out comes back on its own route, re-attached to a parent in IT stock or alone in the chosen room, and an outstanding link counts as linked for install, slot, candidates, responsibility, disposal and ถอดออก (group 3 spec §8.5, §8.6)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The RT- page: the components left out, their late returns and the repair record (spec §8.5 RT- list, §8.6 RT- line, §8.7; P2-R5, P2-R2, P2-R1)

The RT- (ใบรับคืนทรัพย์สิน) prints what a return left behind and what happened to it afterwards. It lists each component the return left out, with who holds it and where. Under each one it prints its late return, "<tag> คืนแล้ว <date> · รับโดย <name>". It also names the repair record the return opened or joined, "เปิดใบซ่อม MT-…" / "ต่อใบซ่อม MT-…". That line is a link for someone with `maintenance:view`.
- The repair link needs no new column. The return writes it into the RT-'s after snapshot, and the checkin answer carries it too.
- The shared A4 component gets a `lines` slot. The HO- and TR- pages pass nothing and do not change.
- A VOID RT- still shows the lines, below its void banner. It prints its missing list from the after snapshot even though the cancel put those links back to installed (T3); the banner says the whole document is void. A VOID RT- that joined a repair still reads "ต่อใบซ่อม …". An RT- that created a record cannot be cancelled: its `maintenance_create` movement counts as downstream.
- The late line's day reads "31 ต.ค. 2569" / "31 Oct 2026" (`formatCheckoutDay`, the Bangkok short form that E2E's `thaiDay` in `e2e/transactions/tx-plan.ts:70` expects). The RT-'s existing fields keep `formatDate` ("31/10/2569"). The page then shows both forms; do not unify them in this task.
- Out of scope: the RT- page still has no แผนก row. P2-R5 does not ask for one; do not add it.

Line numbers are HEAD's (`452b72d7`). T1 to T3 have already changed `checkin/route.ts` (the department, the date bounds and claim, the create/join split, the outstanding links) and `asset-transaction-snapshot.ts` (T3's before-only keys). So every block below is also named by its content.

**Files:**
- Create: `src/lib/checkin-document-lines.ts`
- Create: `tests/checkin-document-lines.test.ts`
- Modify: `src/lib/asset-transaction-snapshot.ts`:
  - the type `AssetTransactionSnapshotV1` (`:19-31`);
  - `isAssetTransactionSnapshotV1` (`:108-124`);
  - `createAssetTransactionSnapshot` (`:160-181`).
- Modify: `src/app/api/assets/[id]/checkin/route.ts`:
  - the snapshot import block (`:13-17`);
  - the transaction's destructuring (`:92`, `const { record: checkin, componentSync } = await prisma.$transaction(`);
  - the repair-record block (`:242-275`, `if (sendsToRepair && repairReporterId) {`, with `select: { id: true }` at `:258`);
  - the after snapshot (`:282-286`, `const afterSnapshot = createAssetTransactionSnapshot({`);
  - the transaction's return (`:301`);
  - the answer (`:313`).
- Modify: `src/components/asset-operations/operation-document-print.tsx`:
  - the props type (`:19-32`) and its destructuring (`:34-44`);
  - one line between the fields grid's closing `</div>` (`:117`) and the signatures `<section` (`:119`).
  - The file has CRLF endings; keep them.
- Modify: `src/app/[locale]/(print)/asset-management/checkins/[id]/page.tsx`:
  - imports (`:1-11`);
  - the reads (`:66-95`);
  - a `lines` prop between `sections={[…]}` (ends `:172`) and `signatures={[` (`:173`);
  - a render helper above `function formatSnapshotState(` (`:182`).
- Modify: `messages/th.json`, `messages/en.json`, only through `node scripts/messages-edit.mjs`.
- Test: `tests/asset-transaction-snapshot-routes.test.ts`: two tests appended. The import is not changed: T3 already added `parseAssetTransactionSnapshot` and `serializeAssetTransactionSnapshot` to it.
- Test: `tests/asset-transaction-cancellation-service.test.ts`: one test appended. It uses the file's own `MemoryCancellationRepository`, `beforeSnapshot` and `afterSnapshot`.
- Test: `tests/checkin-maintenance-ticket-route.test.ts`, on top of T1's and T2's harness changes:
  - the state type and value (`:7-15`);
  - one line in the `@/lib/db` fake, before `if (name === "maintenanceTicket" && method === "count")` (`:73`);
  - three tests appended.

**Interfaces:**
- Consumes:
  - **T3:**
    - `COMPONENT_LINK_OUTSTANDING = "outstanding"`, exported by `src/lib/asset-component-outstanding.ts`. That module is pure (no imports), so `node --test` loads it. (Not the refusal code string `"ASSET_COMPONENT_OUTSTANDING"`, which is a different thing.)
    - The RT-'s after snapshot. Each outstanding component has one entry in the sync's key order with `relationshipStatus: "outstanding"`. Its `custodianId` is the holder after the RT- (ผู้คืน, or unchanged), and its `currentLocationId` is its unchanged room (P2-R1, P2-R7).
    - The checkin answer `{ ...record, missingComponents }`.
  - **T5:** the movement `component_late_return`, written on the **component** (`assetId` = the component) with `referenceType: "checkin"` and `referenceId: <the RT- id>`. Its `toValue` is JSON `{ receivedByName, returnDate, outcome }` (P2-R2). `returnDate` is a `"YYYY-MM-DD"` day or an ISO date-time; this task reads both.
  - **T2:** the in-transaction decision whether this ส่งซ่อม return creates a repair record or joins the open one: `const createsRepair = sendsToRepair && !hasOpenRepair`, and the repair block's guard `if (createsRepair && repairReporterId) {` (HEAD `:242`). `maintenance:create` is needed only to create one. T2 reads the open record only with `maintenanceTicket.count` (before and inside the transaction). This task adds the `repairNo` to the create's `select` and one `findFirst` after the block, and changes neither the decision nor T2's `count` reads.
  - **Existing:**
    - `openRepairRecordWhere` (`src/lib/repair-record-policy.ts:12`);
    - `buildAssetMovementDocumentHref(locale, { kind: "repair", id, code })` → `/${locale}/maintenance/${id}` (`src/lib/asset-movement-labels.ts:104-118`);
    - `ASSET_MOVEMENT_DOCUMENT_PERMISSION.repair` = `{ module: "maintenance", action: "view" }` (`:121-128`);
    - `formatCheckoutDay(day: string, locale: string): string`, which formats a Bangkok day as "31 ต.ค. 2569" / "31 Oct 2026", or answers `""` for a day that is not real (`src/lib/checkout-phone-steps.ts:39`);
    - `buildReferenceLabelMap(ids)`, whose employees read "code - fullNameTh" and rooms "code - name" (`src/lib/asset-operation-document.ts:3-42`);
    - `linkVariants` (`src/components/ui/button-variants.ts:51`);
    - `hasPermission(user, module, action)` (`src/lib/auth-utils.ts:56`).
- Produces:
  ```ts
  // src/lib/asset-transaction-snapshot.ts
  export type CheckinRepairLink = { id: string; repairNo: string; joined: boolean }
  // AssetTransactionSnapshotV1 gains, after components:
  //   repair?: CheckinRepairLink          (only an RT- after snapshot; omitted when there is none)
  export function createAssetTransactionSnapshot(input: {
    asset: AssetTransactionSnapshotAssetInput
    checkout?: { id: string; isReturned: boolean } | null
    components: AssetComponentTransactionSnapshotV1[]
    repair?: CheckinRepairLink | null     // copied as { id, repairNo, joined } when given; null/undefined → no key
  }): AssetTransactionSnapshotV1

  // src/lib/checkin-document-lines.ts (pure; relative .ts imports; no database)
  export type CheckinDocumentLateReturnRow = { assetId: string; toValue: string | null }
  export type CheckinDocumentComponentLine =
    | { kind: "missing"; componentAssetId: string; component: string; holder: string | null; location: string }
    | { kind: "returned"; componentAssetId: string; tag: string; day: string; receivedBy: string }
  export type CheckinDocumentRepairLine = { key: "documentRepairOpened" | "documentRepairJoined"; repairNo: string; href: string | null }
  export type CheckinDocumentLines = { components: CheckinDocumentComponentLine[]; repair: CheckinDocumentRepairLine | null }
  export function checkinDocumentReadIds(
    afterSnapshot: AssetTransactionSnapshotV1 | null,
    lateReturns: readonly CheckinDocumentLateReturnRow[],
  ): { componentIds: string[]; labelIds: string[] }
  export function buildCheckinDocumentLines(input: {
    afterSnapshot: AssetTransactionSnapshotV1 | null
    lateReturns: readonly CheckinDocumentLateReturnRow[]   // this RT-'s component_late_return rows, oldest first
    components: ReadonlyMap<string, { assetTag: string; name: string }>
    labels: ReadonlyMap<string, string>                    // buildReferenceLabelMap: holders and rooms
    locale: string
    canViewRepair: boolean
  }): CheckinDocumentLines
  ```
  - The checkin answer gains `repair: CheckinRepairLink | null`. The key is always there, and it is `null` when the return opened or joined no record.
  - `OperationDocumentPrint` gains `lines?: React.ReactNode`. It prints inside `<div data-document-lines className="mt-5 grid grid-cols-1 gap-5">`, below the fields and above the signatures.
  - The RT- page's E2E hooks, which T11 uses:
    - `[data-document-lines]`;
    - `[data-document-line="missing"|"returned"|"repair"]`;
    - the repair line's whole text is the link's name ("เปิดใบซ่อม <repairNo>" / "ต่อใบซ่อม <repairNo>"), with `href="/th/maintenance/<id>"`;
    - the late line reads "<tag> คืนแล้ว <thaiDay> · รับโดย <name>".
  - Messages: the seven `checkin.document*` keys of Step 3e.

- [ ] **Step 1: Write the failing tests.**
  - Create `tests/checkin-document-lines.test.ts`:
```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { buildCheckinDocumentLines, checkinDocumentReadIds, type CheckinDocumentLateReturnRow } from "../src/lib/checkin-document-lines.ts"
import type { AssetComponentTransactionSnapshotV1, AssetTransactionSnapshotV1, CheckinRepairLink } from "../src/lib/asset-transaction-snapshot.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

const entry = (componentAssetId: string, relationshipStatus: string, custodianId: string | null, currentLocationId: string): AssetComponentTransactionSnapshotV1 => ({
  componentLinkId: `link-${componentAssetId}`,
  componentAssetId,
  parentAssetId: "parent-1",
  relationshipStatus,
  relationshipUpdatedAt: "2026-10-31T03:00:00.000Z",
  assetUpdatedAt: "2026-10-31T03:00:00.000Z",
  statusId: "status-ready",
  conditionId: "condition-good",
  branchId: "branch-1",
  currentLocationId,
  custodianId,
  departmentId: "dept-1",
})
const after = (components: AssetComponentTransactionSnapshotV1[], repair?: CheckinRepairLink): AssetTransactionSnapshotV1 => ({
  version: 1,
  assetId: "parent-1",
  assetUpdatedAt: "2026-10-31T03:00:00.000Z",
  statusId: "status-ready",
  conditionId: "condition-good",
  branchId: "branch-1",
  currentLocationId: "loc-store",
  custodianId: null,
  departmentId: "dept-it",
  checkout: { id: "co-1", isReturned: true },
  components,
  ...(repair ? { repair } : {}),
})
const late = (assetId: string, value: unknown): CheckinDocumentLateReturnRow => ({ assetId, toValue: typeof value === "string" ? value : JSON.stringify(value) })
const components = new Map([
  ["c-1", { assetTag: "MS-0001", name: "Mouse" }],
  ["c-2", { assetTag: "KB-0002", name: "Keyboard" }],
  ["c-3", { assetTag: "AD-0003", name: "Adapter" }],
])
const labels = new Map([
  ["emp-5", "E005 - สมชาย ใจดี"],
  ["loc-desk", "L-201 - ห้องบัญชี"],
])
const lines = (afterSnapshot: AssetTransactionSnapshotV1 | null, lateReturns: CheckinDocumentLateReturnRow[] = [], overrides: { locale?: string; canViewRepair?: boolean } = {}) =>
  buildCheckinDocumentLines({ afterSnapshot, lateReturns, components, labels, locale: overrides.locale ?? "th", canViewRepair: overrides.canViewRepair ?? true })
// c-1 came back (installed), c-2 stays with E005, c-3 has no holder (the handover was to a room)
const missingTwo = after([entry("c-1", "installed", null, "loc-store"), entry("c-2", "outstanding", "emp-5", "loc-desk"), entry("c-3", "outstanding", null, "loc-desk")])
const missingC2 = { kind: "missing", componentAssetId: "c-2", component: "KB-0002 - Keyboard", holder: "E005 - สมชาย ใจดี", location: "L-201 - ห้องบัญชี" }
const missingC3 = { kind: "missing", componentAssetId: "c-3", component: "AD-0003 - Adapter", holder: null, location: "L-201 - ห้องบัญชี" }

test("the RT- lists the components the return left out, from its after snapshot, with their holder and room; returned ones are not listed (group 3 spec §8.5, P2-R5)", () => {
  assert.deepEqual(lines(missingTwo), { components: [missingC2, missingC3], repair: null })
})

test("each late return follows its component, as '<tag> คืนแล้ว <Bangkok day> · รับโดย <name>' (spec §8.6, P2-R2)", () => {
  const lateReturns = [
    late("c-3", { receivedByName: "สมหญิง รักงาน", returnDate: "2026-11-01T17:00:00.000Z", outcome: "standalone" }),
    late("c-2", { receivedByName: "สมหญิง รักงาน", returnDate: "2026-10-31", outcome: "reattached" }),
  ]
  assert.deepEqual(lines(missingTwo, lateReturns).components, [
    missingC2,
    { kind: "returned", componentAssetId: "c-2", tag: "KB-0002", day: "31 ต.ค. 2569", receivedBy: "สมหญิง รักงาน" },
    missingC3,
    { kind: "returned", componentAssetId: "c-3", tag: "AD-0003", day: "2 พ.ย. 2569", receivedBy: "สมหญิง รักงาน" },
  ])
  const englishDays = lines(missingTwo, lateReturns, { locale: "en" }).components.flatMap((line) => (line.kind === "returned" ? [line.day] : []))
  assert.deepEqual(englishDays, ["31 Oct 2026", "2 Nov 2026"])
})

test("a late return of a component the list does not hold still prints after the list; a value that does not read is left out (P2-R5)", () => {
  const result = lines(after([entry("c-2", "outstanding", "emp-5", "loc-desk")]), [
    late("c-9", { receivedByName: "สมหญิง รักงาน", returnDate: "2026-10-31", outcome: "standalone" }),
    late("c-2", "not json"),
    late("c-2", "[]"),
    late("c-2", { receivedByName: "", returnDate: "2026-10-31" }),
    late("c-2", { receivedByName: "สมหญิง รักงาน" }),
    late("c-2", { receivedByName: "สมหญิง รักงาน", returnDate: "31/10/2026" }),
    late("c-2", { receivedByName: "สมหญิง รักงาน", returnDate: "2026-02-30" }),
    { assetId: "c-2", toValue: null },
  ])
  assert.deepEqual(result.components, [
    missingC2,
    { kind: "returned", componentAssetId: "c-9", tag: "c-9", day: "31 ต.ค. 2569", receivedBy: "สมหญิง รักงาน" },
  ])
})

test("the repair line: เปิดใบซ่อม for a record the return opened, ต่อใบซ่อม for one it joined, a link only with maintenance:view (spec §8.7, P2-R5)", () => {
  assert.deepEqual(lines(after([], { id: "mt-1", repairNo: "MT-20261031-0001", joined: false })).repair, { key: "documentRepairOpened", repairNo: "MT-20261031-0001", href: "/th/maintenance/mt-1" })
  assert.deepEqual(lines(after([], { id: "mt-2", repairNo: "MT-20261001-0003", joined: true }), [], { locale: "en", canViewRepair: false }).repair, { key: "documentRepairJoined", repairNo: "MT-20261001-0003", href: null })
  assert.equal(lines(after([])).repair, null)
})

test("an RT- with nothing left out and no repair, or an old RT- with no after snapshot, has no lines", () => {
  assert.deepEqual(lines(null), { components: [], repair: null })
  assert.deepEqual(lines(after([entry("c-1", "installed", null, "loc-store")])), { components: [], repair: null })
})

test("the page reads each listed component once and labels each holder and room once", () => {
  const value = { receivedByName: "สมหญิง รักงาน", returnDate: "2026-10-31", outcome: "reattached" }
  assert.deepEqual(checkinDocumentReadIds(missingTwo, [late("c-2", value), late("c-9", value)]), { componentIds: ["c-2", "c-3", "c-9"], labelIds: ["emp-5", "loc-desk"] })
  assert.deepEqual(checkinDocumentReadIds(null, []), { componentIds: [], labelIds: [] })
})

test("the line builder stays pure: relative .ts imports, no database", () => {
  const source = read("src/lib/checkin-document-lines.ts")
  assert.doesNotMatch(source, /from "@\/|@prisma\/client|\bprisma\./)
  for (const line of source.split("\n").filter((line) => line.startsWith("import "))) assert.match(line, /^import (?:type )?\{[^}]+\} from "\.\/[\w-]+\.ts"$/, line)
})

test("OperationDocumentPrint prints a lines slot below the fields and above the signatures, and the HO- and TR- pages pass none (P2-R5)", () => {
  const print = read("src/components/asset-operations/operation-document-print.tsx")
  assert.match(print, /\n  lines\?: React\.ReactNode\n\}/)
  const fields = print.indexOf("{sections.map((section) => (")
  const slot = print.indexOf('{lines ? <div data-document-lines className="mt-5 grid grid-cols-1 gap-5">{lines}</div> : null}')
  const signatures = print.indexOf("{signatures.map((signature) => (")
  assert.ok(fields > 0 && slot > fields && signatures > slot, `${fields} < ${slot} < ${signatures}`)
  for (const page of ["checkouts", "transfers"]) {
    assert.doesNotMatch(read(`src/app/[locale]/(print)/asset-management/${page}/[id]/page.tsx`), /\blines=/, page)
  }
})

test("the RT- page builds its lines from the after snapshot and this RT-'s late returns, for an active and a VOID RT- alike (P2-R5)", () => {
  const page = read("src/app/[locale]/(print)/asset-management/checkins/[id]/page.tsx")
  assert.match(page, /prisma\.assetMovement\.findMany\(\{\n\s+where: \{ referenceType: "checkin", referenceId: checkin\.id, movementType: "component_late_return" \},\n\s+orderBy: \{ performedAt: "asc" \},\n\s+select: \{ assetId: true, toValue: true \},\n\s+\}\)/)
  assert.match(page, /const documentLines = buildCheckinDocumentLines\(\{/)
  assert.match(page, /canViewRepair: hasPermission\(user, ASSET_MOVEMENT_DOCUMENT_PERMISSION\.repair\.module, "view"\),/)
  const linesProp = page.slice(page.indexOf("      lines={"), page.indexOf("      signatures={"))
  assert.match(linesProp, /^      lines=\{documentLines\.components\.length > 0 \|\| documentLines\.repair \? renderCheckinDocumentLines\(documentLines, t\) : null\}\n$/)
  assert.doesNotMatch(linesProp, /transactionStatus/, "a VOID RT- shows its lines under the void banner")
  // The whole repair line is the link, so its name is "เปิดใบซ่อม MT-…" (E2E RT2).
  assert.match(page, /<Link href=\{lines\.repair\.href\} className=\{linkVariants\(\{ size: "inherit" \}\)\}>\n\s+\{t\(lines\.repair\.key, \{ repairNo: lines\.repair\.repairNo \}\)\}\n\s+<\/Link>/)
})
```
  - `tests/asset-transaction-snapshot-routes.test.ts`: add nothing to the import. T3 already added `parseAssetTransactionSnapshot` and `serializeAssetTransactionSnapshot` to it, and a second copy would be a duplicate binding. Append:
```ts
const returnedAsset = {
  id: "asset-1",
  updatedAt: new Date("2026-10-31T03:00:00.000Z"),
  statusId: "status-under-maintenance",
  conditionId: "condition-damaged",
  branchId: "branch-1",
  currentLocationId: "location-1",
  custodianId: null,
  departmentId: "department-it",
}

test("an RT- after snapshot carries the repair record the return opened or joined, copied as { id, repairNo, joined }, and leaves the key out when there is none (group 3 spec §8.7, P2-R5)", () => {
  const repair = { id: "mt-1", repairNo: "MT-20261031-0001", joined: false }
  const snapshot = createAssetTransactionSnapshot({ asset: returnedAsset, checkout: { id: "checkout-1", isReturned: true }, components: [], repair })
  assert.deepEqual(snapshot.repair, repair)
  assert.deepEqual(parseAssetTransactionSnapshot(serializeAssetTransactionSnapshot(snapshot)), snapshot)
  const copied = createAssetTransactionSnapshot({ asset: returnedAsset, components: [], repair: { ...repair, joined: true, note: "extra" } as never })
  assert.deepEqual(copied.repair, { id: "mt-1", repairNo: "MT-20261031-0001", joined: true })
  for (const none of [undefined, null]) {
    assert.equal("repair" in createAssetTransactionSnapshot({ asset: returnedAsset, checkout: null, components: [], repair: none }), false, String(none))
  }
})

test("a repair link that is not { id, repairNo, joined } makes the snapshot unreadable, so cancel reports it instead of guessing (P2-R5)", () => {
  const base = createAssetTransactionSnapshot({ asset: returnedAsset, checkout: null, components: [] })
  for (const repair of [null, {}, { id: "mt-1", repairNo: "MT-20261031-0001" }, { id: "", repairNo: "MT-20261031-0001", joined: true }, { id: "mt-1", repairNo: "MT-20261031-0001", joined: "yes" }]) {
    assert.equal(parseAssetTransactionSnapshot(JSON.stringify({ ...base, repair })), null, JSON.stringify(repair))
    assert.throws(() => serializeAssetTransactionSnapshot({ ...base, repair } as never), /Invalid asset transaction snapshot/, JSON.stringify(repair))
  }
})
```
  - `tests/asset-transaction-cancellation-service.test.ts`, append:
```ts
test("an RT- whose after snapshot carries its repair link still cancels; a malformed link reads as an unsupported snapshot (group 3 spec §8.7, §18; P2-R5)", async () => {
  const repository = new MemoryCancellationRepository()
  repository.context!.document.afterSnapshotJson = JSON.stringify({ ...afterSnapshot, repair: { id: "mt-1", repairNo: "MT-20261031-0001", joined: true } })
  assert.deepEqual(await previewAssetTransactionCancellation({ type: "checkin", transactionId: "checkin-1" }, repository), { eligible: true })
  const result = await cancelAssetTransaction({ type: "checkin", transactionId: "checkin-1", userId: "user-1", reason: "บันทึกรับคืนผิดรายการ", expectedUpdatedAt: "2026-08-27T09:00:01.000Z" }, repository)
  assert.deepEqual(result, { status: "cancelled", movementId: "movement-1", voidedAt: "2026-08-27T10:00:00.000Z" })
  assert.deepEqual(repository.asset, beforeSnapshot)
  assert.equal(repository.checkoutReturned, false)

  const malformed = new MemoryCancellationRepository()
  malformed.context!.document.afterSnapshotJson = JSON.stringify({ ...afterSnapshot, repair: { id: "mt-1", joined: true } })
  assert.deepEqual(await previewAssetTransactionCancellation({ type: "checkin", transactionId: "checkin-1" }, malformed), { eligible: false, reasons: ["unsupported_snapshot"] })
})
```
  - `tests/checkin-maintenance-ticket-route.test.ts`:
    - `CheckinState` gains `openRepair: { id: string; repairNo: string }`, and the state value gains `openRepair: { id: "mt-open", repairNo: "MT-20261001-0003" }`.
    - In the `@/lib/db` fake, add this line before the `maintenanceTicket` `count` line: `if (name === "maintenanceTicket" && method === "findFirst") return state().openRecords > 0 ? state().openRepair : null`.
    - T1 and T2 answer `maintenanceTicket` only through that `count` line, so this is its only `findFirst` answer. Keep the `count` line as it is: T2's permission tests drive the join/create split through `openRecords` / `openRecordCounts`.
    - T2's `resetReturnState` and its `afterEach` do not touch `openRepair`; the value set in the state literal stays for every test.
    - Then append:
```ts
type CheckinAnswer = { repair?: unknown; beforeSnapshotJson: string; afterSnapshotJson: string }
async function repairLinks(response: Response) {
  const answer = (await response.json()) as CheckinAnswer
  return {
    answer: answer.repair,
    after: JSON.parse(answer.afterSnapshotJson) as Record<string, unknown>,
    before: JSON.parse(answer.beforeSnapshotJson) as Record<string, unknown>,
  }
}

test("a ส่งซ่อม return that opens a repair record answers it and keeps it on the RT- after snapshot (group 3 spec §8.7, P2-R5)", async () => {
  state.calls = []
  state.openRecords = 0
  const response = await route.POST(checkinRequest("status:Under Maintenance"), context)

  assert.equal(response.status, 201, await response.clone().text())
  const create = state.calls.find(({ call }) => call === "maintenanceTicket.create")?.args as { data: Record<string, unknown>; select: Record<string, unknown> }
  assert.deepEqual(create.select, { id: true, repairNo: true })
  const expected = { id: "maintenanceTicket-new", repairNo: create.data.repairNo, joined: false }
  const { answer, after, before } = await repairLinks(response)
  assert.deepEqual(answer, expected)
  assert.deepEqual(after.repair, expected)
  assert.equal("repair" in before, false, "the before snapshot drives the cancel's restore and never carries it")
})

test("a ส่งซ่อม return into the open repair record answers that record as joined and creates none (S-R43, P2-R5)", async () => {
  state.calls = []
  state.openRecords = 1
  const response = await route.POST(checkinRequest("status:Under Maintenance"), context)

  assert.equal(response.status, 201, await response.clone().text())
  assert.equal(state.calls.some(({ call }) => call === "maintenanceTicket.create"), false)
  const read = state.calls.filter(({ call }) => call === "maintenanceTicket.findFirst").at(-1)?.args as { where: Record<string, unknown>; select: Record<string, unknown> }
  assert.deepEqual(read.where, { isActive: true, repairStatus: { notIn: ["closed", "cancelled"] }, assetId: "asset-1" })
  assert.deepEqual(read.select, { id: true, repairNo: true })
  const expected = { id: "mt-open", repairNo: "MT-20261001-0003", joined: true }
  const { answer, after } = await repairLinks(response)
  assert.deepEqual(answer, expected)
  assert.deepEqual(after.repair, expected)
  state.openRecords = 0
})

test("a return to พร้อมใช้งาน answers repair null and its RT- snapshot has no repair key (P2-R5)", async () => {
  state.calls = []
  state.openRecords = 0
  const response = await route.POST(checkinRequest("status:Ready"), context)

  assert.equal(response.status, 201, await response.clone().text())
  const { answer, after } = await repairLinks(response)
  assert.equal(answer, null)
  assert.equal("repair" in after, false)
})
```

- [ ] **Step 2: Run them and see them fail.** Run `node --test tests/checkin-document-lines.test.ts tests/asset-transaction-snapshot-routes.test.ts tests/asset-transaction-cancellation-service.test.ts tests/checkin-maintenance-ticket-route.test.ts`.
  - Expected failures:
    - `checkin-document-lines`: `ERR_MODULE_NOT_FOUND` for `src/lib/checkin-document-lines.ts`, so the whole file fails;
    - the snapshot tests: `snapshot.repair` is `undefined`, and the malformed links parse instead of reading null;
    - the cancel test: the malformed preview answers `{ eligible: true }`;
    - the route tests: `create.select` is `{ id: true }`; the join test finds no `maintenanceTicket.findFirst` call; `answer` is `undefined`.
  - Every existing test in these files still passes, the ticket route harness's new `findFirst` answer included.

- [ ] **Step 3: Implement.**
  - **3a. The snapshot** (`src/lib/asset-transaction-snapshot.ts`):
    - Above `AssetTransactionSnapshotV1`, add `export type CheckinRepairLink` (Produces). Its comment: the repair record a return opened or joined (group 3 spec §8.7, P2-R5); only an RT- after snapshot carries it.
    - Add `repair?: CheckinRepairLink` to the type after `components`.
    - Add a private `isCheckinRepairLink(value: unknown): value is CheckinRepairLink`: `isRecord(value) && isString(value.id) && isString(value.repairNo) && typeof value.joined === "boolean"`.
    - `isAssetTransactionSnapshotV1` adds `&& (value.repair === undefined || isCheckinRepairLink(value.repair))` after the components check.
    - `createAssetTransactionSnapshot`'s input gains `repair?: CheckinRepairLink | null`. After `components: input.components,` it spreads `...(input.repair ? { repair: { id: input.repair.id, repairNo: input.repair.repairNo, joined: input.repair.joined } } : {})`.
    - Leave T3's component keys and every other line as they are.
  - **3b. The checkin route** (`src/app/api/assets/[id]/checkin/route.ts`):
    - Import `type CheckinRepairLink` in the `@/lib/asset-transaction-snapshot` block (`:13-17`).
    - Inside the transaction, just before the repair-record block (T2's `if (createsRepair && repairReporterId) {`, HEAD `:242`), declare `let repair: CheckinRepairLink | null = null`.
    - In the create branch:
      - the `tx.maintenanceTicket.create` selects `{ id: true, repairNo: true }` (HEAD `:258`);
      - after its `maintenance_create` movement, set `repair = { id: ticket.id, repairNo: ticket.repairNo, joined: false }`.
    - Directly after the whole block, and before the snapshots are built, add the join read below. It runs for every ส่งซ่อม return that created no record, whatever T2's reporter rule is. It is the only read that names the open record; do not replace T2's `count` reads with it.
```ts
      if (sendsToRepair && !repair) {
        const openRecord = await tx.maintenanceTicket.findFirst({
          where: { ...openRepairRecordWhere, assetId: id },
          orderBy: { createdAt: "desc" },
          select: { id: true, repairNo: true },
        })
        if (openRecord) repair = { id: openRecord.id, repairNo: openRecord.repairNo, joined: true }
      }
```
    - The after snapshot passes `repair` (HEAD `:282-286`: add `repair,` after the `components` line). The before snapshot and the provisional one in `assetCheckin.create` do not pass it.
    - The transaction returns `repair` beside what it returns now (HEAD `:301`). The destructuring at `:92` takes it.
    - The answer becomes `NextResponse.json({ ...checkin, <T3's missingComponents>, repair }, { status: 201 })`. Keep every key T3 added, and keep `id` and `documentNo`, which E2E reads.
    - Do not touch `logAudit`: `tests/asset-component-sync-routes.test.ts` pins its `newValue` on one line.
  - **3c. The line builder.** Create `src/lib/checkin-document-lines.ts` with the Produces signatures.
    - Header comment: the RT- document's extra lines (group 3 spec §8.5, §8.6, §8.7; P2-R5). It lists the components the return left out (the after snapshot's outstanding entries), each followed by its late returns, and the repair record the return opened or joined. Pure: relative imports, so `node --test` loads it. The RT- page reads the rows.
    - Imports, all relative with `.ts`:
      - `COMPONENT_LINK_OUTSTANDING` from `./asset-component-outstanding.ts`. A snapshot entry is not a link row (it has `relationshipStatus`, no `status` or `removedAt`), so compare with the constant rather than calling T3's `isOutstandingLink`;
      - `buildAssetMovementDocumentHref` from `./asset-movement-labels.ts`;
      - `import type { AssetTransactionSnapshotV1 }` from `./asset-transaction-snapshot.ts`;
      - `formatCheckoutDay` from `./checkout-phone-steps.ts`, the one Bangkok-day display the handover pages already use.
    - Do not write a `"-"` after `||`, `??` or `:`; `tests/list-frame-guards.test.ts` LV2 counts them.
    - The rules (the tests pin each one):
      - The outstanding entries are `afterSnapshot.components` whose `relationshipStatus === COMPONENT_LINK_OUTSTANDING`, in snapshot order. A null snapshot has none.
      - **A missing line:**
        - `component` is `"<assetTag> - <name>"` from `components`, or the id when it is not there.
        - `holder` is `labels.get(custodianId) ?? custodianId`, or null when `custodianId` is null.
        - `location` is `labels.get(currentLocationId) ?? currentLocationId`, the same fallback as `labelOrDash`.
      - **A late line:**
        - It reads `toValue` as a JSON object with a non-empty string `receivedByName` and a string `returnDate`. Any other value (null, not JSON, an array, a missing or empty key) leaves the line out. `outcome` and any extra key are ignored.
        - The day comes from `returnDate`. A `"YYYY-MM-DD"` value is the day itself. Any other value goes through `Date.parse`: when that is finite, the day is the Bangkok day `new Date(time + 7 * 60 * 60 * 1000).toISOString().slice(0, 10)`.
        - `day = formatCheckoutDay(dayKey, locale)`. An empty result (not a real day, such as `2026-02-30`) leaves the line out.
        - `tag` is the component's `assetTag`, or the movement's `assetId` when it is not in `components`.
      - **Order:** each missing line, then its late lines in the given (oldest-first) order. After the list come the late lines of components that are not in it, in the given order.
      - **The repair line:**
        - It comes from `afterSnapshot.repair`, or is null.
        - `key` is `joined ? "documentRepairJoined" : "documentRepairOpened"`.
        - `href` is `canViewRepair ? buildAssetMovementDocumentHref(locale, { kind: "repair", id, code: repairNo }) : null`.
      - **`checkinDocumentReadIds`:**
        - `componentIds` = the outstanding entries' `componentAssetId`, then the late rows' `assetId`.
        - `labelIds` = each outstanding entry's `custodianId` (when not null) and `currentLocationId`.
        - Each list is deduplicated, keeping its first order.
  - **3d. The print slot** (`operation-document-print.tsx`):
    - Add `lines?: React.ReactNode` as the last prop of `OperationDocumentPrintProps`. Its comment above: document lines below the fields (group 3 plan 2 P2-R5); the RT- lists its missing components, their late returns and its repair record; they print; the HO- and TR- pages pass none.
    - Destructure it after `toolbarActions`.
    - Between the fields grid's closing `</div>` (`:117`) and `<section className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">` (`:119`), add one line, with a blank line on each side: `{lines ? <div data-document-lines className="mt-5 grid grid-cols-1 gap-5">{lines}</div> : null}`.
    - Add no color class, `<img>`, `<h1>` or `next/link` here: `tests/visual-foundation-guards.test.ts` (N1 count 19), `tests/dark-mode-p.test.ts`, `tests/list-frame-guards.test.ts` and `tests/operations-sweep-ui.test.ts:57` pin this file.
  - **3e. Messages.** Save `<scratchpad>/p2-t6-messages.json` and run `node scripts/messages-edit.mjs <scratchpad>/p2-t6-messages.json`. Expected output: `messages updated: 7 th, 7 en, 0 deleted`.
    - The spec gives no words for these; use exactly these. The heading says "ขาดตอนรับคืน", not "ยังไม่ได้คืน", so it still reads right after a late return. A missing line with no holder reads "· ที่ <room>". The English "repair ticket" follows `asset.timelineMaintenanceTicket`.
```json
{ "set": {
  "th": {
    "checkin.documentMissingComponents": "ส่วนควบที่ขาดตอนรับคืน",
    "checkin.documentMissingComponentHeld": "{component} · อยู่กับ {holder} ที่ {location}",
    "checkin.documentMissingComponentPlace": "{component} · ที่ {location}",
    "checkin.documentComponentReturned": "{tag} คืนแล้ว {date} · รับโดย {name}",
    "checkin.documentRepair": "ใบซ่อม",
    "checkin.documentRepairOpened": "เปิดใบซ่อม {repairNo}",
    "checkin.documentRepairJoined": "ต่อใบซ่อม {repairNo}"
  },
  "en": {
    "checkin.documentMissingComponents": "Components missing at return",
    "checkin.documentMissingComponentHeld": "{component} · with {holder} at {location}",
    "checkin.documentMissingComponentPlace": "{component} · at {location}",
    "checkin.documentComponentReturned": "{tag} returned {date} · received by {name}",
    "checkin.documentRepair": "Repair ticket",
    "checkin.documentRepairOpened": "Opened repair ticket {repairNo}",
    "checkin.documentRepairJoined": "Joined repair ticket {repairNo}"
  }
} }
```
  - **3f. The RT- page** (`checkins/[id]/page.tsx`):
    - Imports:
      - `import Link from "next/link"` (first line);
      - `import { linkVariants } from "@/components/ui/button-variants"`;
      - `import { ASSET_MOVEMENT_DOCUMENT_PERMISSION } from "@/lib/asset-movement-labels"`;
      - `import { buildCheckinDocumentLines, checkinDocumentReadIds, type CheckinDocumentLines } from "@/lib/checkin-document-lines"`.
    - Add a fourth read, `lateReturns`, to the `Promise.all` of `:66-82`. Its comment: the late returns of the components this RT- left out (group 3 spec §8.6, P2-R2), one line each under its component. Write it in exactly this shape (the test matches it):
```tsx
    prisma.assetMovement.findMany({
      where: { referenceType: "checkin", referenceId: checkin.id, movementType: "component_late_return" },
      orderBy: { performedAt: "asc" },
      select: { assetId: true, toValue: true },
    }),
```
    - Then:
      - `const lineReadIds = checkinDocumentReadIds(afterSnapshot, lateReturns)`.
      - `const labels = await buildReferenceLabelMap([…])` (`:84-95`) becomes `const [labels, lineComponents] = await Promise.all([buildReferenceLabelMap([…today's ids…, ...lineReadIds.labelIds]), prisma.asset.findMany({ where: { id: { in: lineReadIds.componentIds } }, select: { id: true, assetTag: true, name: true } })])`.
      - Then build the lines:
```tsx
  const documentLines = buildCheckinDocumentLines({
    afterSnapshot,
    lateReturns,
    components: new Map(lineComponents.map((component) => [component.id, { assetTag: component.assetTag, name: component.name }])),
    labels,
    locale,
    canViewRepair: hasPermission(user, ASSET_MOVEMENT_DOCUMENT_PERMISSION.repair.module, "view"),
  })
```
    - Between `sections={[…]}` and `signatures={[`, add the line `      lines={documentLines.components.length > 0 || documentLines.repair ? renderCheckinDocumentLines(documentLines, t) : null}`. Do not make it depend on `transactionStatus`: a VOID RT- shows its lines under its void banner (P2-R5).
    - Above `function formatSnapshotState(`, add the render helper below. Use tokens only: the paper is a forced-light scope (dark mode P-R2), so `border-border` stays light on a dark page. Add no palette color, no `"-"` and no `<h1>`.
    - The repair line:
      - The whole line is the link, so its accessible name is "เปิดใบซ่อม <repairNo>" / "ต่อใบซ่อม <repairNo>", which T11's E2E locator uses.
      - Without `maintenance:view` it is plain text that still shows the number (P2-R5). The components tab (R12) hides both link and number without the permission; do not copy that rule here.
      - It is document content and prints: no `print:hidden` or screen-only class.
```tsx
// The RT-'s lines (P2-R5) on the A4 paper; a VOID RT- shows them too, under its void banner.
function renderCheckinDocumentLines(lines: CheckinDocumentLines, t: Awaited<ReturnType<typeof getTranslations>>) {
  return (
    <>
      {lines.components.length > 0 ? (
        <section className="break-inside-avoid">
          <h2 className="mb-2 text-sm font-bold">{t("documentMissingComponents")}</h2>
          <ul className="border border-border text-sm">
            {lines.components.map((line, index) => (
              <li
                key={`${line.kind}-${line.componentAssetId}-${index}`}
                data-document-line={line.kind}
                className={line.kind === "returned" ? "border-b border-border py-2 pl-6 pr-3 last:border-b-0" : "border-b border-border px-3 py-2 last:border-b-0"}
              >
                {line.kind === "returned"
                  ? t("documentComponentReturned", { tag: line.tag, date: line.day, name: line.receivedBy })
                  : line.holder
                    ? t("documentMissingComponentHeld", { component: line.component, holder: line.holder, location: line.location })
                    : t("documentMissingComponentPlace", { component: line.component, location: line.location })}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {lines.repair ? (
        <section className="break-inside-avoid">
          <h2 className="mb-2 text-sm font-bold">{t("documentRepair")}</h2>
          <p data-document-line="repair" className="border border-border px-3 py-2 text-sm">
            {lines.repair.href ? (
              <Link href={lines.repair.href} className={linkVariants({ size: "inherit" })}>
                {t(lines.repair.key, { repairNo: lines.repair.repairNo })}
              </Link>
            ) : (
              t(lines.repair.key, { repairNo: lines.repair.repairNo })
            )}
          </p>
        </section>
      ) : null}
    </>
  )
}
```
    - Keep the rest of the page as it is: the fields, the cancel dialog (its `componentCount` now counts the outstanding entries too, which cancel restores), `formatSnapshotState` and `getCheckoutDestination`.

- [ ] **Step 4: Run the tests.**
  - Re-run the Step 2 command. Expected: everything passes.
  - Then run the pins this task must keep green: `node --test tests/operations-sweep-ui.test.ts tests/e2e-fixes.test.ts tests/dark-mode-p.test.ts tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts tests/asset-transaction-cancellation-ui.test.ts tests/asset-handover-presentation.test.ts tests/asset-component-sync-routes.test.ts tests/asset-movement-labels.test.ts tests/thai-glossary.test.ts`. Expected: all pass with no row changed.
    - `list-frame-guards` LV2 still counts 2 for the RT- page and 1 for the print component.
    - `visual-foundation-guards` N1 still counts 19 for the print component and nothing for the page.
    - `dark-mode-p` still counts 15 images and 1 light scope.
    - `asset-movement-labels` still counts 49 written types. The page's `movementType: "component_late_return"` literal is a read, but the scanner also counts it as written; the type is already in the set (T5), so the count does not change. `WRITERS` does not change, because the page creates no movement.
  - Then run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: no failures and 0 lint errors. If a pin outside this list fails, rewrite it in this commit and name it in the report.

- [ ] **Step 5: Commit.**
```
git add src/lib/checkin-document-lines.ts src/lib/asset-transaction-snapshot.ts "src/app/api/assets/[id]/checkin/route.ts" src/components/asset-operations/operation-document-print.tsx "src/app/[locale]/(print)/asset-management/checkins/[id]/page.tsx" messages/th.json messages/en.json tests/checkin-document-lines.test.ts tests/asset-transaction-snapshot-routes.test.ts tests/asset-transaction-cancellation-service.test.ts tests/checkin-maintenance-ticket-route.test.ts
git commit -m "feat(checkin): the RT- lists the components the return left out and their late returns, and links the repair record it opened or joined, kept on its after snapshot (group 3 spec §8.5-§8.7, P2-R5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Existing pins this task touches:**
- No existing assertion changes.
- `tests/checkin-maintenance-ticket-route.test.ts` gains state and one fake line (Step 1). Its nine tests keep passing.
- These guards pin the two print files, and the task is written so their counts stay as they are (Step 4):
  - `tests/operations-sweep-ui.test.ts:54-74`;
  - `tests/e2e-fixes.test.ts:32-35`;
  - `tests/dark-mode-p.test.ts:58-73, 99-143`;
  - `tests/visual-foundation-guards.test.ts:152, 263, 334`;
  - `tests/list-frame-guards.test.ts:141, 164, 167`;
  - `tests/asset-transaction-cancellation-ui.test.ts:17-41`;
  - `tests/asset-handover-presentation.test.ts:6-15`.

---

### Task 7: The register's ข้อมูลเก่า filter and รับคืน's header link (spec §8.1, §14 call 9; P2-R20, P2-R12 the link)

รับคืน's header gets a link line on the right: "ข้อมูลเก่าที่ยังไม่มีใบส่งมอบ N รายการ · ดูรายการ". It opens the register filtered by a new data-quality value, `noHandover` ("มีผู้ถือครองแต่ไม่มีใบส่งมอบ"). The filter is the legacy count's own where object, which Task 4 moved into a pure module. So N on รับคืน and the total on the register are one count. The value is named wherever the register and the reports show a data-quality chip, and the register's filter sheet offers it. A label map that misses a value is a type error from now on.

Line numbers are HEAD's (`452b72d7`). Task 4 has already changed `checkin-page-data.ts`, `tests/checkin-page-data.test.ts` and parts of `assets/page.tsx`, so each block below is also named by its content.

**Rulings this task carries (from the skeleton and the controller's rulings X5, X27):**
- **P2-R20:** the new register filter is `dataQuality=noHandover`, built on the same shared where as the legacy count. It is labelled on the register filter sheet and on the reports page.
- **P2-R12 (the link only, as reworded by X27):** the page passes the legacy link as a server node, "ข้อมูลเก่าที่ยังไม่มีใบส่งมอบ N รายการ · ดูรายการ". It is hidden when N is 0 and opens the register at `/[locale]/assets?dataQuality=noHandover&exact=1`.
  - In this task, the node goes into the form's `PageHeader` `actions`.
  - Task 8 moves it into `OperationFormFrame`'s `actions` slot.
- **X5:** this task owns the link: the page node, the words (`checkin.legacyReturnLink`), the class and the prop name `legacyLink`. Task 8 consumes them unchanged and does not build the node again.
- **Global Constraints, one rule:** the legacy where exists once, as `legacyReturnCountWhere` in `src/lib/legacy-return-rule.ts` (Task 4). The count and the register both read that object. This task does not copy it, rebuild it or wrap it in a second where.

**Decisions:**
- **The link is an exact link.** It is built with `buildExactAssetRegisterHref`, which adds `&exact=1`, as the work center's and the bell's count links are.
  - With `exact=1`, the register neither restores nor overwrites the viewer's saved view, so it opens with this filter alone and its total is N.
  - Without it, the click would replace the viewer's saved register view with this filter.
- **The page builds the node; the form draws it.** The form is a client file that imports no `next/link` (`tests/operations-sweep-ui.test.ts:100`). So the page builds the `<Link>`, passes it as `legacyLink: React.ReactNode`, and the form puts it in its existing `PageHeader` `actions` (on the right from `md`, as §8.1 asks).
- **Both label maps get `satisfies Record<AssetDataQualityFilter, string>`.** Today a missing label prints the raw code (GP G9); from now on it is a type error.
  - On the reports page the `: Record<string, string>` annotation stays, because the chip line indexes the map with `""`.
- **The filter sheet offers `noHandover`,** as P2-R20's "labelled on the register filter sheet" asks. `licenseExpiry` and `returnDue` stay link-only (the pin at `asset-register-filter-ui.test.ts:187` is unchanged).
- **The old hint goes.** `checkin.legacyReturnCount` said "ค้นหาได้ด้วยรหัสทรัพย์สินหรือชื่อผู้ถือครอง". §8.1 replaces the line with the link, and Appendix A รับคืน does not list the hint, so the key is deleted, not kept.

**Files:**
- Modify: `src/lib/asset-data-quality-filter.ts:1`: one value, appended.
- Modify: `src/lib/asset-list-query.ts`:
  - imports `:1-14`: one import;
  - `buildAssetDataQualityWhere` `:184-214`: one branch, before the final `return null`.
- Modify: `src/components/assets/asset-register-filter-sheet.tsx:26-33` (`dataQualityOptions`): one row.
- Modify: `src/app/[locale]/(dashboard)/assets/page.tsx`:
  - the import block: one type import, after `import { formatCount } from "@/lib/display-format"` (`:24`);
  - the `dataQuality: {` label map inside the `buildAssetRegisterChips({ … labels: { … } })` call (`:279-288`): one key and a `satisfies`.
- Modify: `src/app/[locale]/(dashboard)/reports/page.tsx`:
  - the import block `:1-30`: one type import, after `:8` (`… from "@/lib/asset-list-query"`);
  - `const dataQualityFilterLabels` `:146-155`: one key and a `satisfies`.
- Modify: `src/app/[locale]/(dashboard)/asset-management/checkin/page.tsx` (34 lines): imports, the translator, the link node and one prop.
- Modify: `src/components/asset-operations/checkin-form.tsx`:
  - the `formatCount` import `:34`;
  - the props `:104` and `:115`;
  - `<PageHeader` `:355`;
  - the count line `:375-377`.

  Nothing else in this file changes. Task 8 rebuilds it.
- Modify: `messages/th.json`, `messages/en.json`, only through `node scripts/messages-edit.mjs`.
- Test (modify):
  - `tests/asset-data-quality-filter.test.ts`;
  - `tests/asset-list-query.test.ts`;
  - `tests/checkin-page-data.test.ts`;
  - `tests/asset-register-filter-ui.test.ts`;
  - `tests/reports-adaptive-ui.test.ts`;
  - `tests/legacy-checkin-flow.test.ts`;
  - `tests/operations-sweep-ui.test.ts`;
  - `tests/form-frames-ui.test.ts`.
- **Do not touch:**
  - `src/lib/legacy-return-rule.ts`, `legacyReturnCountWhere` and `countLegacyReturns` (Task 4's; the count stays `prisma.asset.count({ where: legacyReturnCountWhere })`);
  - the work center, the dashboard, the admin data-quality page and the notifications: they link other values;
  - the docs (Task 11).

**Pins this task breaks (each is rewritten in this commit, Step 1):**
- `tests/asset-data-quality-filter.test.ts:20`: the deep-equal of `assetDataQualityFilters` (the order pin).
- `tests/legacy-checkin-flow.test.ts`:
  - `:18`: `/legacyReturnCount=\{legacyReturnCount\}/` (the page now passes `legacyLink`);
  - `:58`: `"legacyReturnCount"` in the present-keys list (the key is deleted).
- `tests/operations-sweep-ui.test.ts`:
  - `:90`: the test title names "the legacy count line";
  - `:92`: `<PageHeader title=\{t\("title"\)\} className="mb-6" \/>` (the header gains `actions`);
  - `:94`: `source.includes('t("legacyReturnCount", { count: formatCount(legacyReturnCount) })')`.
- `tests/form-frames-ui.test.ts:90`: `/<div className="mx-auto max-w-5xl">\n\s+<PageHeader title=\{t\("title"\)\} className="mb-6" \/>\n/` (the header gains `actions`).
- Kept as they are, and they must stay green:
  - `tests/warranty-filter-counts.test.ts:27` (the reports' `licenseExpiry` / `returnDue` lines; `returnDue` keeps its trailing comma);
  - `tests/asset-register-filter-ui.test.ts:34` (the register's `warranty` / `licenseExpiry` / `returnDue` lines) and `:187` (the sheet offers no `licenseExpiry`, `returnDue`, `custodianState` or `locationId`);
  - `tests/reports-adaptive-ui.test.ts:35-49`;
  - `tests/operations-sweep-ui.test.ts:100` (the form imports no `next/link`, which is why the page builds the link).

**Interfaces:**
- Consumes:
  - **Task 4:** `legacyReturnCountWhere: Prisma.AssetWhereInput`, exported from the pure `src/lib/legacy-return-rule.ts`.
    - That module's imports are relative `.ts` paths and `import type { Prisma }`. Task 4's own test pins this, so the pure `asset-list-query.ts` can import it, and so can the client files that import `asset-list-query.ts` (`asset-register-navigation.tsx`, `asset-register-search-field.tsx`, `asset-register-table.tsx`, `report-view-tabs.tsx`).
    - What it imports is pure all the way down: `./asset-component-outstanding.ts` (Task 3, no imports) and `./repair-record-policy.ts` → `./asset-lifecycle-policy.ts` → `./asset-handover-mode.ts` (no imports). No server module reaches a client bundle.
    - The where holds `isActive: true` and already leaves out an outstanding component (`installedInLinks: { none: outstandingLinkWhere }`).
    - `src/lib/checkin-page-data.ts` re-exports it, and its `countLegacyReturns()` is `prisma.asset.count({ where: legacyReturnCountWhere })`, unchanged.
  - `buildAssetWhere(filters, options?)` (`asset-list-query.ts:82`): it returns `{ isActive: true, …, AND: [dataQualityPart, …] }` and puts `AND` only when a part exists (`:106-113`).
  - `buildExactAssetRegisterHref(locale: string, params: Record<string, string> = {}): string` (`src/lib/asset-register-view-memory.ts:28-32`) answers `/${locale}/assets?<params>&exact=1`.
    - An exact link neither restores nor overwrites the viewer's saved register view (`src/components/assets/asset-register-view-memory.tsx:25`).
    - So the register opens with this filter and no other, and its total is N.
    - The work center and the bell use it for their counts too (`work-center/page.tsx:275`, `waiting-work-rules.ts:176-178`).
  - `linkVariants` (`src/components/ui/button-variants.ts`), `cn` (`@/lib/utils`), `formatCount(value: number): string` (`@/lib/display-format:15`) and `getTranslations` (`next-intl/server`).
    - The link's class is the stand-alone meta link of `audit/rounds/page.tsx:673`: `cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center text-meta md:min-h-0")`.
    - `size: "inherit"`, not `meta`, because `meta` adds `whitespace-nowrap` and the Thai line must wrap at 375px.
  - The chips print a value with no label as its raw code:
    - the register at `src/lib/asset-register-chips.ts:53`: `labels.dataQuality[filters.dataQuality] ?? filters.dataQuality`;
    - the reports in `buildReportActiveFilters` (`src/lib/report-active-filters.ts`): `input.values?.[key] ?? String(input.filters[key])`.

    Both label maps are typed `Record<string, string>` today, so a missing key is not a type error (GP G9). This task adds `satisfies Record<AssetDataQualityFilter, string>` to both.
  - `PageHeader` has an `actions?: ReactNode` slot (`src/components/ui/page-header.tsx:14`), drawn on the right from `md` and under the title below it.
- Produces:
  - `assetDataQualityFilters` = `["responsibility", "serial", "photo", "department", "purchase", "warranty", "licenseExpiry", "returnDue", "noHandover"]`. `AssetDataQualityFilter` therefore includes `"noHandover"`.
  - `buildAssetWhere(parseAssetListParams({ dataQuality: "noHandover" }))` deep-equals `{ isActive: true, AND: [legacyReturnCountWhere] }`, and `AND[0]` **is** `legacyReturnCountWhere` (the same object). `assetFiltersUseWaitingWorkRules` stays false for it.
  - Message keys:
    - `asset.dataQualityNoHandover`: th "มีผู้ถือครองแต่ไม่มีใบส่งมอบ", en "Has a holder but no handover document";
    - `checkin.legacyReturnLink`: th "ข้อมูลเก่าที่ยังไม่มีใบส่งมอบ {count} รายการ · ดูรายการ", en "{count} legacy records without a handover document · View list". It is the whole line, so there is no separate `checkin.legacyReturnView` key.
    - `checkin.legacyReturnCount` is **deleted** (pinned: it is in `legacy-checkin-flow.test.ts`'s `removed` list, and `operations-sweep-ui.test.ts:94` is `doesNotMatch(/legacyReturnCount/)`).
  - The node, in `src/app/[locale]/(dashboard)/asset-management/checkin/page.tsx` (Step 3g):
    - `const t = await getTranslations("checkin")`;
    - `const legacyLink = legacyReturnCount > 0 ? (<Link …>…</Link>) : null`: one `next/link` `<Link>`, nothing around it;
    - its `href` is `buildExactAssetRegisterHref(locale, { dataQuality: "noHandover" })`, e.g. `/th/assets?dataQuality=noHandover&exact=1`;
    - its `className` is `cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center text-meta md:min-h-0")`;
    - its text is `t("legacyReturnLink", { count: formatCount(legacyReturnCount) })`, so its accessible name is the whole line;
    - the page passes it as `legacyLink={legacyLink}`.
  - `CheckinForm` props: **`legacyLink: React.ReactNode`** replaces `legacyReturnCount: number`. This task draws it as `<PageHeader title={t("title")} actions={legacyLink} className="mb-6" />`.
  - **Task 8 consumes all of this unchanged (X5):**
    - it keeps the node, the words, the class and the prop name `legacyLink`, and passes `actions={legacyLink}` to `OperationFormFrame`;
    - it keeps this task's `legacy-checkin-flow.test.ts` pins and `operations-sweep-ui.test.ts:94`;
    - it rewrites this task's two `PageHeader` pins (`form-frames-ui.test.ts:90`, `operations-sweep-ui.test.ts:92`) from this task's versions into its frame pins.
  - For Task 11: the E2E can click the link (role `link`, name containing "ดูรายการ") and expect the register's chip "มีผู้ถือครองแต่ไม่มีใบส่งมอบ" with a total equal to the N in the link text. It runs on the dev DB and saves no register view. `docs/11_FEATURE_LIST.md` can name the new register filter.

- [ ] **Step 1: Write the failing tests and rewrite the pins.**

  `tests/asset-data-quality-filter.test.ts`:
  - `:1-4`: add `import { readFileSync } from "node:fs"`.
  - `:20` becomes `assert.deepEqual([...assetDataQualityFilters], ["responsibility", "serial", "photo", "department", "purchase", "warranty", "licenseExpiry", "returnDue", "noHandover"])`.
  - Append:
```ts
test("noHandover (มีผู้ถือครองแต่ไม่มีใบส่งมอบ) is a register filter, and every value has a chip label on the register and on the reports page (group 3 spec §8.1, P2-R20)", () => {
  assert.equal(normalizeAssetDataQualityFilter("noHandover"), "noHandover")
  const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
  const block = (source: string, start: string, end: string) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)))
  const register = block(read("src/app/[locale]/(dashboard)/assets/page.tsx"), "dataQuality: {\n", "crossScope: {\n")
  const reports = block(read("src/app/[locale]/(dashboard)/reports/page.tsx"), "const dataQualityFilterLabels", "const crossScopeFilterLabels")
  for (const value of assetDataQualityFilters) {
    assert.match(register, new RegExp(`\\n\\s+${value}: t\\("dataQuality\\w+"\\),\\n`), `register chip: ${value}`)
    assert.match(reports, new RegExp(`\\n\\s+${value}: t(?:Asset)?\\("\\w+"\\),\\n`), `reports chip: ${value}`)
  }
  // A value without a label prints its raw code (asset-register-chips.ts:53, report-active-filters.ts): both maps are checked by tsc.
  assert.match(register, /\} satisfies Record<AssetDataQualityFilter, string>,\s*$/)
  assert.match(reports, /\} satisfies Record<AssetDataQualityFilter, string>\s*$/)
})
```

  `tests/asset-list-query.test.ts`:
  - After the `waiting-work-rules.ts` import (`:14-21`), add `import { legacyReturnCountWhere } from "../src/lib/legacy-return-rule.ts"`.
  - `:148`: the list becomes `["", "serial", "photo", "responsibility", "department", "purchase", "noHandover"]`.
  - Append:
```ts
test("dataQuality=noHandover lists what รับคืน's legacy count counts: the legacy where itself, not a copy (group 3 spec §8.1, P2-R20)", () => {
  // The rule holds isActive: true, so the register's { isActive: true, AND: [rule] } lists exactly the rule's assets.
  assert.equal(legacyReturnCountWhere.isActive, true)
  const filters = parseAssetListParams({ dataQuality: "noHandover" })
  assert.equal(filters.dataQuality, "noHandover")
  const where = buildAssetWhere(filters)
  assert.deepEqual(where, { isActive: true, AND: [legacyReturnCountWhere] })
  assert.equal((where.AND as unknown[])[0], legacyReturnCountWhere, "one object")
  assert.match(buildAssetQueryString(filters), /(^|&)dataQuality=noHandover(&|$)/)
})
```

  `tests/checkin-page-data.test.ts`, append at the end (after Task 4's tests):
```ts
test("the register's noHandover filter is the count's own where, so N on รับคืน is the register's total (group 3 spec §8.1, P2-R20)", async () => {
  const query = await import(pathToFileURL("src/lib/asset-list-query.ts").href) as typeof import("../src/lib/asset-list-query.ts")
  const where = query.buildAssetWhere(query.parseAssetListParams({ dataQuality: "noHandover" }))
  assert.equal((where.AND as unknown[] | undefined)?.[0], data.legacyReturnCountWhere, "the register reads the re-exported object")
  assert.equal(await data.countLegacyReturns(), 42)
  const counted = state.calls.at(-1)
  assert.equal(counted?.call, "asset.count")
  assert.equal(counted?.args.where, data.legacyReturnCountWhere, "the count reads the same object")
})
```
  The test resolves `asset-list-query.ts`'s relative `./legacy-return-rule.ts` and `checkin-page-data.ts`'s `@/lib/legacy-return-rule` (through the file's resolve hook) to the same file URL. Both therefore get one module instance and one object. This was checked with a probe of the same hook (2026-10-31).

  `tests/asset-register-filter-ui.test.ts`, append:
```ts
test("the register names noHandover on its chip and offers it last in the filter sheet (group 3 spec §8.1, P2-R20)", () => {
  assert.match(page(), /department: t\("dataQualityDepartment"\),\n\s+noHandover: t\("dataQualityNoHandover"\),\n\s+\} satisfies Record<AssetDataQualityFilter, string>,\n\s+crossScope: \{/)
  assert.match(page(), /^import type \{ AssetDataQualityFilter \} from "@\/lib\/asset-data-quality-filter"$/m)
  assert.match(sheet(), /\["department", "dataQualityDepartment"\],\n\s+\["noHandover", "dataQualityNoHandover"\],\n\] as const satisfies ReadonlyArray<readonly \[AssetDataQualityFilter, string\]>/)
  assert.equal(messages("th").dataQualityNoHandover, "มีผู้ถือครองแต่ไม่มีใบส่งมอบ")
  assert.equal(messages("en").dataQualityNoHandover, "Has a holder but no handover document")
})
```

  `tests/reports-adaptive-ui.test.ts`, append. The file reads the page with CRLF, so this test normalises it:
```ts
test("report chips name noHandover, and the label map is checked against every register value (group 3 spec §8.1, P2-R20)", () => {
  const source = page.replace(/\r\n/g, "\n")
  assert.match(source, /returnDue: tAsset\("dataQualityReturnDue"\),\n\s+noHandover: tAsset\("dataQualityNoHandover"\),\n\s+\} satisfies Record<AssetDataQualityFilter, string>\n/)
  assert.match(source, /^import type \{ AssetDataQualityFilter \} from "@\/lib\/asset-data-quality-filter"$/m)
})
```

  `tests/legacy-checkin-flow.test.ts`:
  - `:1-3`: add `import { normalizeAssetDataQualityFilter } from "../src/lib/asset-data-quality-filter.ts"` and `import { buildExactAssetRegisterHref } from "../src/lib/asset-register-view-memory.ts"`.
  - The test at `:10-20` is renamed "check-in page loads the master lists, the preselect and the legacy count, never the register; the count is the header's link to the register's noHandover list (group 3 spec §8.1, P2-R12)". Its `:18` is replaced by the lines below. The source is CRLF, so every regex stays on one line:
```ts
  assert.match(source, /legacyLink=\{legacyLink\}/)
  assert.doesNotMatch(source, /legacyReturnCount=/)
  assert.match(source, /const t = await getTranslations\("checkin"\)/)
  assert.match(source, /const legacyLink = legacyReturnCount > 0 \? \(/)
  assert.match(source, /<Link href=\{buildExactAssetRegisterHref\(locale, \{ dataQuality: "noHandover" \}\)\} className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center text-meta md:min-h-0"\)\}>/)
  assert.match(source, /\{t\("legacyReturnLink", \{ count: formatCount\(legacyReturnCount\) \}\)\}/)
  assert.match(source, /\) : null/)
  const href = buildExactAssetRegisterHref("th", { dataQuality: "noHandover" })
  assert.equal(href, "/th/assets?dataQuality=noHandover&exact=1")
  assert.equal(normalizeAssetDataQualityFilter(new URL(href, "http://localhost").searchParams.get("dataQuality")), "noHandover", "the link's value is one the register reads")
```
  - The messages test (`:54-89`):
    - `:58` `"legacyReturnCount",` becomes `"legacyReturnLink",`;
    - `"legacyReturnCount",` is appended to `removed` after `"legacyReturnNoResults",` (`:78`);
    - after `:88`, add `assert.equal(checkinMessages("th").legacyReturnLink, "ข้อมูลเก่าที่ยังไม่มีใบส่งมอบ {count} รายการ · ดูรายการ")` and `assert.equal(checkinMessages("en").legacyReturnLink, "{count} legacy records without a handover document · View list")`.

  `tests/operations-sweep-ui.test.ts`, the test at `:90-101`:
  - The title becomes "check-in form: a ContentPanel, the shared asset picker, the legacy link in the header, KeyValueList with Nil, and no box around the dropzone (spec 2D D7, D9, D19, M21, M22, M33; server search Task 6; group 3 plan 2 Task 7)".
  - `:92` becomes `assert.match(source, /<PageHeader title=\{t\("title"\)\} actions=\{legacyLink\} className="mb-6" \/>\n\s+<ContentPanel>\n\s+<form onSubmit=\{handleSubmit\} noValidate /)`.
  - `:94` becomes `assert.doesNotMatch(source, /legacyReturnCount/, "the count is the page's header link (group 3 spec §8.1)")`.
  - `:95-100` stay as they are.

  `tests/form-frames-ui.test.ts:90` becomes `assert.match(source, /<div className="mx-auto max-w-5xl">\n\s+<PageHeader title=\{t\("title"\)\} actions=\{legacyLink\} className="mb-6" \/>\n/)`.

- [ ] **Step 2: Run them and see them fail.**
  - Run `node --test tests/asset-data-quality-filter.test.ts tests/asset-list-query.test.ts tests/checkin-page-data.test.ts tests/asset-register-filter-ui.test.ts tests/reports-adaptive-ui.test.ts tests/legacy-checkin-flow.test.ts tests/operations-sweep-ui.test.ts tests/form-frames-ui.test.ts`.
  - Expected failures:
    - `asset-data-quality-filter`:
      - the order pin (no `'noHandover'`);
      - the new test, at `'' !== 'noHandover'`.
    - `asset-list-query`: `{ isActive: true }` against `{ isActive: true, AND: [ … ] }`. The waiting-work list still passes, because an unknown value normalises to `""`.
    - `checkin-page-data`: `undefined !== { isActive: true, … }` on the register line.
    - `asset-register-filter-ui`, `reports-adaptive-ui`, `operations-sweep-ui` and `form-frames-ui`: "The input did not match the regular expression".
    - `legacy-checkin-flow`:
      - the page test, at `/legacyLink=\{legacyLink\}/`;
      - the messages test, at the missing `legacyReturnLink` (`legacyReturnCount` is still present).
  - Every other existing test in these files passes.

- [ ] **Step 3: Implement.**
  - **3a. The value.** In `src/lib/asset-data-quality-filter.ts:1`, append `"noHandover"` as the last element of `assetDataQualityFilters`. Nothing else in the file changes.
  - **3b. The where.**
    - In `src/lib/asset-list-query.ts`, add `import { legacyReturnCountWhere } from "./legacy-return-rule.ts"` after the `./asset-ownership.ts` import (`:6`).
    - In `buildAssetDataQualityWhere`, after the `returnDue` line and before `return null`, add:
      ```ts
      // รับคืน's legacy count, the same object, so the header's N is this list's total (group 3 spec §8.1, P2-R20).
      if (dataQuality === "noHandover") return legacyReturnCountWhere
      ```
    - Return the imported object itself: no spread and no `{ AND: [...] }` around it (the identity tests in Step 1 fail on a copy).
    - `assetFiltersUseWaitingWorkRules` does not change.
  - **3c. The filter sheet.** In `dataQualityOptions` (`asset-register-filter-sheet.tsx:26-33`), add `["noHandover", "dataQualityNoHandover"],` as the last row, after `["department", "dataQualityDepartment"],`. Nothing else changes.
  - **3d. The register's chip.** In `src/app/[locale]/(dashboard)/assets/page.tsx`:
    - add `import type { AssetDataQualityFilter } from "@/lib/asset-data-quality-filter"` on its own line after `import { formatCount } from "@/lib/display-format"`;
    - in the `dataQuality: {` map (`:279-288`), add `noHandover: t("dataQualityNoHandover"),` after `department: t("dataQualityDepartment"),`;
    - change the map's closing `},` to `} satisfies Record<AssetDataQualityFilter, string>,`.
  - **3e. The reports' chip.** In `src/app/[locale]/(dashboard)/reports/page.tsx`:
    - add `import type { AssetDataQualityFilter } from "@/lib/asset-data-quality-filter"` on its own line after the `@/lib/asset-list-query` import (`:8`);
    - in `const dataQualityFilterLabels: Record<string, string> = {` (`:146-155`), add `noHandover: tAsset("dataQualityNoHandover"),` after `returnDue: tAsset("dataQualityReturnDue"),`;
    - change the closing `}` to `} satisfies Record<AssetDataQualityFilter, string>`.
    - Keep the `: Record<string, string>` annotation: `dataQualityFilterLabels[filters.dataQuality]` (`:193`, pinned by `reports-adaptive-ui.test.ts:47`) indexes it with `"" | AssetDataQualityFilter`.
  - **3f. The words.**
    - Save `<scratchpad>/p2-t7-messages.json` with the content below.
    - Run `node scripts/messages-edit.mjs <scratchpad>/p2-t7-messages.json`.
    - Expected output: `messages updated: 2 th, 2 en, 1 deleted`.
    - `checkin.legacyReturnCount` has no other reader (only `checkin-form.tsx:376`).
```json
{
  "set": {
    "th": {
      "asset.dataQualityNoHandover": "มีผู้ถือครองแต่ไม่มีใบส่งมอบ",
      "checkin.legacyReturnLink": "ข้อมูลเก่าที่ยังไม่มีใบส่งมอบ {count} รายการ · ดูรายการ"
    },
    "en": {
      "asset.dataQualityNoHandover": "Has a holder but no handover document",
      "checkin.legacyReturnLink": "{count} legacy records without a handover document · View list"
    }
  },
  "delete": ["checkin.legacyReturnCount"]
}
```
  - **3g. The page's link** (`src/app/[locale]/(dashboard)/asset-management/checkin/page.tsx`).
    - Add these imports:
      - `import Link from "next/link"`;
      - `import { getTranslations } from "next-intl/server"`;
      - `import { linkVariants } from "@/components/ui/button-variants"`;
      - `import { buildExactAssetRegisterHref } from "@/lib/asset-register-view-memory"`;
      - `import { formatCount } from "@/lib/display-format"`;
      - `import { cn } from "@/lib/utils"`.
    - After `await requirePagePermission(locale, "asset", "edit")`, add `const t = await getTranslations("checkin")`.
    - After the `Promise.all`, add the block below.
    - In `<CheckinForm`, `legacyReturnCount={legacyReturnCount}` becomes `legacyLink={legacyLink}`.
    - Every other line stays, including the `Promise.all` with `countLegacyReturns()` (pinned by `legacy-checkin-flow.test.ts:15`).
    - This is a plain server page with `next/link`, as `audit/rounds/page.tsx` is. No new Next API is used.
```tsx
  // The header link (group 3 spec §8.1): N opens the register's noHandover list, the count's own where, as an exact
  // link that leaves the viewer's saved register view alone. Nothing when N is 0. Built here because the form is a
  // client file that imports no next/link (tests/operations-sweep-ui.test.ts).
  const legacyLink = legacyReturnCount > 0 ? (
    <Link href={buildExactAssetRegisterHref(locale, { dataQuality: "noHandover" })} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center text-meta md:min-h-0")}>
      {t("legacyReturnLink", { count: formatCount(legacyReturnCount) })}
    </Link>
  ) : null
```
  - **3h. The form** (`src/components/asset-operations/checkin-form.tsx`):
    - In the destructuring, `legacyReturnCount,` (`:104`) becomes `legacyLink,`.
    - In the prop type, `legacyReturnCount: number` (`:115`) becomes:
      ```ts
      /** รับคืน's header link to the register's ข้อมูลเก่า list (group 3 spec §8.1), built by the page; null when there is none. */
      legacyLink: React.ReactNode
      ```
      The file already uses the global `React.ReactNode` at `:606`.
    - `<PageHeader title={t("title")} className="mb-6" />` (`:355`) becomes `<PageHeader title={t("title")} actions={legacyLink} className="mb-6" />`.
    - Delete the three lines `{legacyReturnCount > 0 ? (` … `) : null}` (`:375-377`). The picker's wrapper `<div className="md:col-span-2 grid gap-1.5">` stays, holding the picker alone.
    - Delete `import { formatCount } from "@/lib/display-format"` (`:34`). Its only reader was `:376`, and an unused import fails lint.

- [ ] **Step 4: Run them and see them pass, then the full checks.**
  - Re-run the Step 2 command, plus `node --test tests/warranty-filter-counts.test.ts tests/asset-register-view-model.test.ts tests/asset-register-filters.test.ts tests/asset-register-view-memory.test.ts tests/data-quality-drilldown.test.ts tests/report-active-filters.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts tests/open-repair-filter.test.ts`. Expected: all pass.
  - Then run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: no failures and 0 lint errors.
    - `tsc` now proves that each label map holds every value and no other value.
    - If a pin outside this task's list fails, rewrite it in this commit and name it in the report.

- [ ] **Step 5: Commit.**
```
git add src/lib/asset-data-quality-filter.ts src/lib/asset-list-query.ts src/components/assets/asset-register-filter-sheet.tsx "src/app/[locale]/(dashboard)/assets/page.tsx" "src/app/[locale]/(dashboard)/reports/page.tsx" "src/app/[locale]/(dashboard)/asset-management/checkin/page.tsx" src/components/asset-operations/checkin-form.tsx messages/th.json messages/en.json tests/asset-data-quality-filter.test.ts tests/asset-list-query.test.ts tests/checkin-page-data.test.ts tests/asset-register-filter-ui.test.ts tests/reports-adaptive-ui.test.ts tests/legacy-checkin-flow.test.ts tests/operations-sweep-ui.test.ts tests/form-frames-ui.test.ts
git commit -m "feat(checkin): the register's มีผู้ถือครองแต่ไม่มีใบส่งมอบ filter is the legacy count's own where, named on the register, its filter sheet and the reports, and รับคืน's header links its count to it (group 3 spec §8.1, P2-R20, P2-R12)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: รับคืน on the desktop: three sections, the summary card, the components checklist and the footer (spec §8.1-§8.4, §5, Appendix A รับคืน; P2-R9, P2-R10, P2-R11, P2-R12, P2-R14 client, P2-R16, P2-R17 badges, P2-R18 client)

The checkin form is rebuilt on plan 1's frame, summary card and condition chips, the way plan 1 Task 6 rebuilt checkout. Its summary reads T1's department rule, so the card and the route call the same function. The chosen row's `detail` is read once per pick and gives the components checklist, whose unticked ids go to `missingComponentIds` (T2's field, T3's route). The picker rows gain รับคืน's badge (T4's `row.badge`); T4 already draws the outstanding row's line. T7's header link moves into the frame's `actions` slot unchanged. The late-return panel (T9) and the phone layout (T10) come later, on the same DOM.

**Rulings this task follows (copied from the skeleton):**
- **P2-R7 (first bullet):** the department after a return comes from `getCheckinNextDepartmentId({ ownership, returnDepartmentId, currentDepartmentId })`. A `shared`, `component` or `software_license` asset keeps its department; any other ownership gets the return department.
- **P2-R8 (page part):** the page reads `readCheckinDepartment` for the summary, and refuses the legacy confirm when it does not resolve (GP X8).
- **P2-R9:**
  - keep the `NativeSelect` `#checkin-next-status`, with the new label "หลังรับคืนให้เป็น";
  - the legacy prefill of condition and room is dropped (spec §8.3, decision 12); this overrides the addendum's `operationConditionDefault` on รับคืน, so the condition always starts empty;
  - the "still missing" list: ทรัพย์สิน, ผู้คืน, ผู้รับคืน, สภาพตอนคืน, หลังรับคืนให้เป็น and เก็บไว้ที่, with the two signatures shown as optional;
  - the summary's status row shows the status name (อยู่ระหว่างซ่อม for ส่งซ่อม);
  - the review dialog adds the condition, the date and "ได้คืน X · ขาด Y";
  - "ถือมา N วัน" counts to the chosen return date in Bangkok days, and a legacy-backfilled HO- reads ข้อมูลเก่า instead;
  - the signature pads get a `key` from ผู้คืน / ผู้รับคืน.
- **P2-R10:** the photo types are ภาพรวม and จุดเสียหาย. Old labels stay readable (the stored label is free text).
- **P2-R11:** FIELD_IDS follow the spec's visual order, and `tests/v-track2-o.test.ts` is re-pinned in this commit. New id: `checkin-components` (the checklist group, one checkbox per component tag).
- **P2-R12:** `OperationFormFrame` gets `summaryOnPhone?: boolean` (default `true`; checkin passes `false`) and an `actions?: ReactNode` header slot. The legacy link is a server node from the page ("ข้อมูลเก่าที่ยังไม่มีใบส่งมอบ N รายการ · ดูรายการ"), hidden when N is 0, and it opens the register at `dataQuality=noHandover&exact=1`. T7 builds it; this task passes it on (X5).
- **P2-R13 (client part):** the return date is ≤ today and ≥ the handover's checkout day, in Bangkok days. A legacy-backfilled HO- is exempt from the lower bound. Both bounds are checked on the client (`max`/`min` and `validate()`), with T2's codes.
- **P2-R14 (client part):** `checkinNextStatusOptions({ statuses, repairLocked, canCreateRepair })` hides ส่งซ่อม for someone without `maintenance:create`, except on a locked row (an open repair). The damage auto-pick and the condition auto-pick never pick ส่งซ่อม for someone who cannot create a record.
- **P2-R16:** when the chosen condition is เสียหาย or ใช้งานไม่ได้ and no next status is chosen yet, the form picks ส่งซ่อม (only for someone who may create a record), as the damage text does today. ซาก picks รอตัดจำหน่าย the same way. With พร้อมใช้งาน and a broken condition, the summary shows a warning line: "สภาพนี้ส่งมอบต่อไม่ได้จนกว่าจะส่งซ่อม" (for ซาก, "ซากรอตัดจำหน่าย ส่งมอบต่อไม่ได้"). Nothing is refused.
- **P2-R17 (picker part):** the picker rows keep their line and gain a badge: "มีใบส่งมอบ HO-…", "ข้อมูลเก่า ไม่มีใบส่งมอบ" or "ส่วนควบค้างคืน". The outstanding row's line ("ส่วนควบค้างคืน ของ <parent tag> · <RT->") is T4's and is not touched here (X6).
- **P2-R18 (client part):** when any component is missing, ผู้คืน must be an employee: a rule under `returnBy`.

**Controller rulings this task follows:**
- **X5:** T7 owns the legacy link: the page node, the words (`checkin.legacyReturnLink`), its class and the `CheckinForm` prop `legacyLink`. This task keeps all of them, passes `actions={legacyLink}` to `OperationFormFrame`, adds no legacy-link words, and leaves T7's pins in `tests/legacy-checkin-flow.test.ts` and `tests/operations-sweep-ui.test.ts:94` as T7 wrote them. Its rewrites of `tests/form-frames-ui.test.ts:90` and `tests/operations-sweep-ui.test.ts:92` start from T7's versions.
- **X6:** T4 owns the outstanding row's line (`RowDetail`'s `outstanding` kind and `assetOperation.outstandingLine`). This task adds only the badge: `getAssetOperationRowBadge`, the type `AssetOperationRowBadgeView`, `RowBadge` and the three `badge*` words.
- **X7:** the handover day and the legacy mark are T2's `checkinHandoverDay` and `isLegacyBackfilledHandover` in `src/lib/checkin-route-rules.ts`. This task defines neither, and calls `selectedCheckout ? checkinHandoverDay(selectedCheckout) : null` (T2's parameter is not nullable).
- **X17:** HEAD's `conditionLabelById` (`checkin-form.tsx:161`) is deleted; the `conditionLabels` prop replaces it (T9 reads `conditionLabels[id]`).
- **X20:** `checkinTodayDay` and `checkinBangkokDay` call `getBangkokDateKey` (the same function as T2's route bound), and `validate()` maps a date code through T2's `CHECKIN_RETURN_DATE_ERROR_KEYS`.
- **X23:** `selectedReceiver`, `selectedReturnBy`, `chooseRow`, `setEmployeeField`, `submitCheckin` and `leaveReview` keep their names (T9 and T10 call them).

**Files:**
- Create:
  - `src/lib/checkin-form-rules.ts` (pure);
  - `tests/checkin-form-rules.test.ts`.
- Rewrite:
  - `src/components/asset-operations/checkin-form.tsx` (all of it; HEAD has 642 lines; start from T7's version, which already has the `legacyLink` prop and no `formatCount`).
- Modify:
  - `src/app/[locale]/(dashboard)/asset-management/checkin/page.tsx`, from T7's version: the user, the `Promise.all`, the imports and the `CheckinForm` props. T7's `const t = await getTranslations("checkin")`, its `legacyLink` block, its imports and `legacyLink={legacyLink}` stay verbatim;
  - `src/components/asset-operations/operation-form-frame.tsx` (the props type, the signature, `PageHeader`, the summary column);
  - `src/components/ui/asset-operation-picker.tsx` (`renderRow`, a new local `RowBadge`, two imports; `RowDetail`, with T4's outstanding branch, is not touched);
  - `src/lib/asset-operation-picker-rules.ts` (a new `AssetOperationRowBadgeView` and `getAssetOperationRowBadge`; `AssetOperationRowDetail` and `getAssetOperationRowDetail` are T4's and stay);
  - `src/lib/asset-operation-search-rules.ts` (`assetOperationComponentLinkSelect`, `AssetOperationChosenComponent`, `buildAssetOperationRowDetail`, `AssetOperationSearchRow`, `buildAssetOperationSearchRow`'s context);
  - `src/lib/asset-operation-search.ts` (the open-repair read, near `db.maintenanceTicket.findMany`);
  - `src/lib/checkin-page-data.ts` (`searchById` reads the detail; a new `readConditionLabels`);
  - `DESIGN.md` (the frame sub-bullet, `:550`);
  - `messages/th.json` and `messages/en.json`, only through `node scripts/messages-edit.mjs`.
- Test (new tests): `tests/checkin-form-rules.test.ts`, `tests/asset-operation-picker-rules.test.ts`, `tests/asset-operation-picker-ui.test.ts`, `tests/checkin-page-data.test.ts`, `tests/asset-operation-search.test.ts`.
- Test (pins this task breaks, rewritten in this commit; each is listed in Step 3):
  - `tests/operation-form-parts-ui.test.ts:32,35,38` (the frame);
  - `tests/asset-handover-checkin.test.ts:55-56`;
  - `tests/asset-operation-picker-forms.test.ts:81`;
  - `tests/form-frames-ui.test.ts:87-92` (T7's version of `:90`);
  - `tests/operations-sweep-ui.test.ts:90-101` (T7's version of `:90`, `:92`; T7's `:94` stays);
  - `tests/v-track2-o.test.ts:165-213` (the checkin test);
  - `tests/v-track2-x.test.ts:115`;
  - `tests/checkin-send-to-repair-ui.test.ts:9,18-31`;
  - `tests/checkout-form-rules.test.ts:81` (a fixture) and `:236-240`;
  - `tests/legacy-checkin-flow.test.ts:13` and `:22-36` (T7's lines in the page test and its messages test stay);
  - `tests/e2e-transactions.test.ts:137`;
  - `tests/form-migration-guards.test.ts:60-61,90`;
  - `tests/api-error-catalog.test.ts:119-121`;
  - `tests/asset-operation-search-rules.test.ts:85-90`;
  - `tests/asset-operation-search.test.ts:31,69,206`;
  - `tests/checkin-page-data.test.ts:78,97,100` (the `search` call inputs), and the `state.calls.at(-1)` assert in Task 4’s test "?assetId= of an outstanding component …": it gains `detail: true`.
- Checked and not broken (keep them green):
  - `tests/checkin-choice.test.ts:27-40`: keep the `returnByOptions` expression, both `options=` lines, the two `applyChoice` lines, the `returnBy:` initializer and `selectedReturnBy` verbatim.
  - `tests/e2e-cross-cutting.test.ts:229,246`: keep `check("receiveBy", required(values.receiveBy) ?? maxLength(values.receiveBy, 100))` and the four ids as quoted strings.
  - `tests/file-evidence-ui.test.ts:120-135`: keep the `FileDropzone` props (no `hint=`) and the `<FileQueueList` block verbatim.
  - `tests/asset-operation-confirmation-ui.test.ts:5-17,47-49`, `tests/validation-guards.test.ts` (one form; V4: every required `SearchableSelect` has `id` and `error`) and `tests/e2e-transactions.test.ts:313-321` (`<AssetOperationPicker` with `id="checkin-checkout"` first).
  - `tests/asset-handover-checkin.test.ts:20-25,32-48,52-54`: keep `t("currentCustody")`, `permanentAssignmentShort` / `temporaryLoanShort`, no `<input|<select|<textarea`, and the return date `Input` on one line ending ` required />`.
- **E2E:** not changed here. T11 rewrites `e2e/transactions/return.spec.ts`, the return tests of `e2e/cross-cutting/field-errors.spec.ts` and `fillReturn` in `e2e/cross-cutting/support/forms.ts`. Until then they are stale: they press "บันทึก", call `selectOption` on `#checkin-condition-after` and `#checkin-next-location`, expect `#checkin-receive-by` empty, and read the old `sendToRepairHelp` text. No E2E runs before T11 (header facts).

**Interfaces:**
- Consumes:
  - **T1:**
    - `getCheckinNextDepartmentId(input: { ownership: AssetOwnershipType; returnDepartmentId: string; currentDepartmentId: string | null }): string | null` (`src/lib/asset-department-rule.ts`);
    - `readCheckinDepartment(db): Promise<{ id: string; code: string; name: string }>` (`src/lib/checkin-department.ts`), which throws when the setting does not resolve;
    - the catalogued code `ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE`.
  - **T2**, all from the pure, client-safe `src/lib/checkin-route-rules.ts` (its only import is `getBangkokDateKey`):
    - `checkinReturnDateError(input: { returnDay: string; todayDay: string; handoverDay: string | null }): CheckinReturnDateErrorCode | null`, where `CheckinReturnDateErrorCode = "CHECKIN_RETURN_DATE_IN_FUTURE" | "CHECKIN_RETURN_DATE_BEFORE_HANDOVER"`, both catalogued;
    - `CHECKIN_RETURN_DATE_ERROR_KEYS: Record<CheckinReturnDateErrorCode, string>` = `{ CHECKIN_RETURN_DATE_IN_FUTURE: "checkinReturnDateInFuture", CHECKIN_RETURN_DATE_BEFORE_HANDOVER: "checkinReturnDateBeforeHandover" }`;
    - `isLegacyBackfilledHandover(remark: string | null | undefined): boolean` (true when the remark starts with `legacy_return_backfill`);
    - `checkinHandoverDay(checkout: { checkoutDate: Date | string; remark: string | null }): string | null`: `null` for a legacy backfill, else the Bangkok day of `checkoutDate`. Its parameter is not nullable; `AssetOperationSearchCheckout` (`checkoutDate: string`, `remark: string | null`) fits it.
    - The zod field `missingComponentIds` (deduplicated, `[]` when absent), parsed from `formData.getAll("missingComponentIds")` (component asset ids), and the refusal of a missing component without an employee as ผู้คืน, under `returnBy` (code `CHECKIN_MISSING_COMPONENT_RETURNER_REQUIRED`).
  - `getBangkokDateKey(date: Date): string` (`src/lib/preventive-maintenance.ts:50`; that module has only a type import, so it is client-safe).
  - **T3:** the checkin route refuses a bad component id under `missingComponentIds`, and an unknown or inactive employee as ผู้คืน under `returnBy` (T2's code).
  - **T4:**
    - `AssetOperationSearchRow.badge?: AssetOperationRowBadge`, where T4's `AssetOperationRowBadge = "handover" | "legacy" | "outstanding"` (`src/lib/asset-operation-search-rules.ts`);
    - `RowDetail`'s `outstanding` branch and `assetOperation.outstandingLine`, which draw the outstanding row's line (this task leaves them as they are);
    - `getCheckinPreselect` (its `?assetId=` branch) and `countLegacyReturns(): Promise<number>`, which reads T4's shared where.
  - **T7** (consumed unchanged, X5): on the page, `const t = await getTranslations("checkin")` and `const legacyLink = legacyReturnCount > 0 ? (<Link href={buildExactAssetRegisterHref(locale, { dataQuality: "noHandover" })} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center text-meta md:min-h-0")}>{t("legacyReturnLink", { count: formatCount(legacyReturnCount) })}</Link>) : null`, passed as `legacyLink={legacyLink}`; the `CheckinForm` prop `legacyLink: React.ReactNode`; the word `checkin.legacyReturnLink`. `checkin.legacyReturnCount` is deleted.
  - **Plan 1:**
    - `OperationFormFrame`, `OperationSummaryCard({ title, nowLabel, nextLabel, rows, checklist?, warnings?, footnote?, photo?, assetLabel? })`;
    - `AssetConditionChoice({ id, legend, options, value, onChange, error, required, disabled? })`;
    - `getOperationCancelHref(locale, returnTo)`;
    - `checkoutComponents(row)`, `withCheckoutAssetDetail(current, answered)` and `type CheckoutDetailState` (`src/lib/checkout-form-rules.ts`);
    - `formatCheckoutDay(day, locale)` (`src/lib/checkout-phone-steps.ts`);
    - `getCheckoutConditionBlock(conditionName)` (`src/lib/asset-lifecycle-policy.ts`);
    - `getApiErrorKey(raw)` (`src/lib/api-error-catalog.ts`).
- Produces:
  ```ts
  // src/lib/checkin-form-rules.ts. Values only from ./asset-department-rule.ts, ./asset-lifecycle-policy.ts,
  // ./checkout-form-rules.ts and ./preventive-maintenance.ts (getBangkokDateKey); everything else is `import type`, relative .ts paths.
  // The handover day and the legacy mark are T2's (./checkin-route-rules.ts); this module does not define them (X7).
  export type CheckinStatusOption = AssetOperationNamedOption          // { id, label: nameTh, name }
  export type CheckinReturnDepartment = { id: string; code: string; name: string }
  export type CheckinFormChoice = {
    row: AssetOperationSearchRow | null
    returnDepartment: CheckinReturnDepartment | null
    status: CheckinStatusOption | null
    location: AssetOperationNamedOption | null
    condition: AssetOperationNamedOption | null
    conditionLabels: Readonly<Record<string, string>>
    unticked: ReadonlySet<string>
  }
  export type CheckinSummaryWords = { holder: string; department: string; status: string; location: string; condition: string; components: string
    none: string; notChosen: string; count: (count: number) => string; componentsBack: (returned: number, missing: number) => string }
  export type CheckinSummaryRow = { key: "holder" | "department" | "status" | "location" | "condition" | "components"; label: string; now: string; next: string; changed: boolean }
  export type CheckinCheckWords = { asset: string; returnBy: string; receiveBy: string; condition: string; nextStatus: string; location: string
    returnSignature: string; receiveSignature: string; signatureMissing: string }
  export type CheckinCheck = { key: "asset" | "returnBy" | "receiveBy" | "condition" | "nextStatus" | "location" | "returnSignature" | "receiveSignature"; label: string; done: boolean; note?: string }
  export type CheckinWarningWords = { departmentUnavailable: string; missing: (input: { component: string; returner: string; room: string }) => string
    repairOpens: string; repairJoins: (repairNo: string) => string; brokenReady: string; salvageReady: string }
  export function checkinTodayDay(now?: Date): string                                        // getBangkokDateKey(now), "YYYY-MM-DD"
  export function checkinBangkokDay(iso: string | null | undefined): string                  // "" when null or not a date
  export function checkinHeldDays(input: { handoverDay: string | null; returnDay: string }): number | null
  export function checkinComponents(row: AssetOperationSearchRow | null, unticked: ReadonlySet<string>): { travelling: AssetOperationChosenComponent[]; missing: AssetOperationChosenComponent[] }
  export function checkinNextStatusOptions(input: { statuses: readonly CheckinStatusOption[]; repairLocked: boolean; canCreateRepair: boolean }): CheckinStatusOption[]
  export function checkinAutoNextStatus(input: { nextStatusId: string; conditionName: string | null; damageNote: string; options: readonly CheckinStatusOption[] }): string
  export function buildCheckinSummaryRows(choice: CheckinFormChoice, words: CheckinSummaryWords): CheckinSummaryRow[]
  export function buildCheckinChecklist(input: { row: AssetOperationSearchRow | null; returnBy: string; receiveBy: string; conditionAfter: string
    nextStatusId: string; nextLocationId: string; returnSigned: boolean; receiveSigned: boolean }, words: CheckinCheckWords): CheckinCheck[]
  export function checkinWarningLines(input: { row: AssetOperationSearchRow | null; returnDepartment: CheckinReturnDepartment | null; unticked: ReadonlySet<string>
    returnerLabel: string; status: CheckinStatusOption | null; conditionName: string | null; repairLocked: boolean }, words: CheckinWarningWords): string[]

  // src/lib/asset-operation-search-rules.ts
  export type AssetOperationChosenComponent = { id: string; assetTag: string; name: string; travels: boolean; locationLabel: string }   // the component's own room, "code - name"
  // AssetOperationSearchRow gains, รับคืน only, beside openRepair:
  openRepairNo?: string        // the open repair's number, set with openRepair when it was read
  // buildAssetOperationSearchRow's context gains `openRepairNo?: string | null`

  // src/lib/asset-operation-picker-rules.ts (AssetOperationRowDetail and getAssetOperationRowDetail are T4's and unchanged)
  /** What the picker row's badge shows; T4's AssetOperationRowBadge is the row's raw "handover" | "legacy" | "outstanding". */
  export type AssetOperationRowBadgeView = { kind: "handover"; documentNo: string } | { kind: "legacy" } | { kind: "outstanding" }
  export function getAssetOperationRowBadge(row: Pick<AssetOperationSearchRow, "badge" | "checkout">): AssetOperationRowBadgeView | null

  // src/components/asset-operations/operation-form-frame.tsx
  export type OperationFormFrameProps = { title: string; description: ReactNode
    /** The header's right side (PageHeader actions): รับคืน's legacy link, a server node from its page. */
    actions?: ReactNode
    summary: ReactNode; footer: OperationFormFooter
    phoneSteps?: boolean
    /** false: below lg the summary column is hidden and the bar stays (รับคืน, spec §8.8). */
    summaryOnPhone?: boolean
    children: ReactNode }
  export function OperationFormFrame({ title, description, actions, summary, footer, phoneSteps = false, summaryOnPhone = true, children }: OperationFormFrameProps)

  // src/lib/checkin-page-data.ts
  export async function readConditionLabels(): Promise<Record<string, string>>   // every condition's nameTh by id, inactive ones too

  // src/components/asset-operations/checkin-form.tsx
  export function CheckinForm(props: {
    employees: AssetOperationEmployeePlainOption[]; locations: AssetOperationNamedOption[]; statuses: AssetOperationNamedOption[]; conditions: AssetOperationNamedOption[]
    conditionLabels: Record<string, string>
    initialRow: AssetOperationSearchRow | null; initialQuery: string
    returnDepartment: CheckinReturnDepartment | null
    currentEmployeeId: string | null
    canCreateRepair: boolean
    /** รับคืน's header link to the register's ข้อมูลเก่า list (group 3 spec §8.1), built by the page; null when there is none. */
    legacyLink: React.ReactNode          // T7's prop and comment, unchanged (X5)
    returnTo?: string
  })
  ```
  - **Named values for T9 and T10**, held near the top of the component, after the state:
    - `const CHECKIN_FORM_ID = "checkin-form"` (module level);
    - `const cancelHref = getOperationCancelHref(locale, returnTo)`;
    - `const todayDay = checkinTodayDay()`;
    - `const handoverDay = selectedCheckout ? checkinHandoverDay(selectedCheckout) : null` (T2's function, X7);
    - `const { travelling, missing: missingComponents } = checkinComponents(chosen, unticked)`;
    - `const nextStatusOptions = checkinNextStatusOptions({ statuses, repairLocked, canCreateRepair })`;
    - the state `rowDetail` (`CheckoutDetailState`) with `rowIdRef`, and `loadRowDetail(assetId)`;
    - kept from HEAD under the same names (X23): `selectedReturnBy`, `selectedReceiver`, `chooseRow`, `setEmployeeField`, `setField`, `submitCheckin` and `leaveReview`.
  - **DOM hooks:**
    - `fieldset#checkin-components`, whose checkboxes have `value` = the component's asset id and an accessible name that starts with its tag;
    - `[data-summary-row]` keys `holder`, `department`, `status`, `location`, `condition`, `components` (inside plan 1's `[data-slot="operation-summary-card"]`);
    - the badge is a `[data-slot="status-badge"]` inside the row's `[data-asset-option]`.

Decisions:
- **Summary rows** (`buildCheckinSummaryRows`, spec §8.4), in this order. With no row or no `row.detail` it returns `[]`.
  - **ผู้ถือครอง:**
    - now = `detail.holderName ?? none`;
    - next = `none`;
    - `changed` when `detail.holderName !== null`. A return always clears the holder.
  - **แผนก:**
    - now = `detail.departmentName ?? none`.
    - With `returnDepartment`, the id is `getCheckinNextDepartmentId({ ownership: detail.ownership, returnDepartmentId: returnDepartment.id, currentDepartmentId: detail.departmentId })`:
      - the current id → the now text;
      - `returnDepartment.id` → `returnDepartment.name`;
      - `changed` when the id differs from `detail.departmentId`.
    - Without `returnDepartment`, next = the now text and `changed: false` (the warning line says the save is refused).
  - **สถานะ:**
    - now = `row.statusLabel`;
    - next = `status.label` (the Thai status name, so ส่งซ่อม reads อยู่ระหว่างซ่อม), or `notChosen`;
    - `changed` when a status is chosen and its label differs.
  - **ที่ตั้ง:**
    - now = `row.locationLabel`;
    - next = `location.label`, or `notChosen`;
    - `changed` when a room is chosen and its id differs from `row.currentLocationId`.
  - **สภาพ:**
    - now = `conditionLabels[row.conditionId] ?? none` (never the raw id; this fixes the GUID that ยังไม่ประเมิน showed);
    - next = `condition.label`, or `notChosen`;
    - `changed` when a condition is chosen and its id differs from `row.conditionId`.
  - **ส่วนควบ:**
    - only when `checkinComponents(row, unticked).travelling` is not empty;
    - now = `count(travelling.length)`;
    - next = `componentsBack(travelling.length - missing.length, missing.length)`;
    - `changed: true`.
- **Checklist** (`buildCheckinChecklist`), in this order:
  - asset: `row?.eligible === true && row.checkout !== undefined`;
  - returnBy, receiveBy, condition (`conditionAfter`), nextStatus, location (`nextLocationId`): the value is not `""`;
  - returnSignature and receiveSignature: done when signed, else `note: signatureMissing`.
- **Warning lines** (`checkinWarningLines`), in this order:
  1. `departmentUnavailable` when `returnDepartment` is null.
  2. One `missing({ component: "<tag> <name>", returner: returnerLabel, room: component.locationLabel })` per missing component.
  3. When `status?.name === "Under Maintenance"`:
     - on a locked row, `repairJoins(row.openRepairNo)`, and nothing when the number is absent (the open-repair notice says it);
     - otherwise `repairOpens`.
  4. When `status?.name === "Ready"`: `getCheckoutConditionBlock(conditionName)` gives `brokenReady` for `damaged` or `nonFunctional`, and `salvageReady` for `salvage`.
- **Next-status options:**
  - a locked row gives the `Under Maintenance` status alone (whatever `canCreateRepair` is);
  - otherwise, without `canCreateRepair`, every status except `Under Maintenance`;
  - else all, in the page's order.
- **The auto-pick** (`checkinAutoNextStatus`):
  - a chosen `nextStatusId` is returned unchanged;
  - else `Salvage` gives the option named `Pending Disposal`;
  - else `damaged` / `nonFunctional`, or damage text that is not blank, give the option named `Under Maintenance`;
  - a name not among `options` gives `""`, so a person without `maintenance:create` (whose options lack it) is never given ส่งซ่อม.
- **Days** (X20: the same `getBangkokDateKey` as T2's route bound, so the client `max` and the server agree):
  - `checkinTodayDay(now = new Date())` is `getBangkokDateKey(now)`;
  - `checkinBangkokDay(iso)` is `""` for null, `""` or an invalid date (check `Number.isNaN(date.getTime())` first: `getBangkokDateKey` throws a `RangeError` on an invalid `Date`), else `getBangkokDateKey(new Date(iso))`;
  - the handover day is T2's `checkinHandoverDay`, called in the form as `selectedCheckout ? checkinHandoverDay(selectedCheckout) : null` (X7); a legacy backfill gives `null`, which also drops the date's lower bound;
  - `checkinHeldDays` is the whole-day difference of two `YYYY-MM-DD` days, and `null` when the handover day is null, either day is not a day, or the return is before the handover.
- **Components** (`checkinComponents`): `travelling` is `checkoutComponents(row).travelling` (plan 1: the detail's components with `travels: true`); `missing` is the travelling ones whose id is in `unticked`. A component with its own open handover (`travels: false`) is not listed on รับคืน (the spec is silent; it is not the returner's to bring back). An id in `unticked` that is not travelling is ignored.
- **The search additions** (not in the skeleton; both feed words the spec gives):
  - **The component's room** (§8.4's warning names "<room>" for each missing component; the parent's room would be wrong for a component that sits elsewhere, anti-goal §4):
    - `assetOperationComponentLinkSelect.componentAsset.select` gains `currentLocation: { select: { code: true, name: true } }`;
    - `buildAssetOperationRowDetail` sets `locationLabel: placeCodeLabel(link.componentAsset.currentLocation)`.
  - **The open repair's number** (§8.3's hint and §8.4's "ต่อใบซ่อม <no.>" name the record a locked row joins; the row had only `openRepair: true`, and the read's pins check only its `where`):
    - the open-repair read in `searchAssetOperationOptions` selects `{ assetId: true, repairNo: true }`;
    - the first number per asset goes to the row context as `openRepairNo`;
    - `buildAssetOperationSearchRow` sets `row.openRepairNo` beside `row.openRepair = true`, only when the context has one.
- **The picker's badge** (X6: the badge only; T4's `RowDetail` draws the outstanding row's line and is not touched):
  - `getAssetOperationRowBadge` returns an `AssetOperationRowBadgeView`:
    - `{ kind: "handover", documentNo }` for `badge === "handover"` with a `checkout.documentNo` (a handover without a number has none, S-R22);
    - `{ kind: "legacy" }` for `"legacy"`;
    - `{ kind: "outstanding" }` for `"outstanding"`;
    - else `null`.
  - `renderRow` takes `const badge = getAssetOperationRowBadge(row)` and renders `{badge ? <RowBadge badge={badge} /> : null}` between the tag · name line and the `<RowDetail row={row} />` line.
  - `RowBadge` is a local function, `function RowBadge({ badge }: { badge: AssetOperationRowBadgeView })`, with `const t = useTranslations("assetOperation")` as `RowDetail` has. It renders a `StatusBadge` with `className="self-start"`:
    - tone `info` with `t("badgeHandover", { documentNo: badge.documentNo })`;
    - tone `warning` with `t("badgeLegacy")`;
    - tone `warning` with `t("badgeOutstanding")`.
- **The page** (start from T7's version; X5):
  - `await requirePagePermission(locale, "asset", "edit")` becomes `const user = await requirePagePermission(locale, "asset", "edit")`. T7's `const t = await getTranslations("checkin")` stays on the next line, outside the `Promise.all` (T7 pins it).
  - The `Promise.all` becomes `const [options, preselect, legacyReturnCount, conditionLabels, returnDepartment] = await Promise.all([…])`, reading:
    - `getAssetOperationMasterOptions({ conditionsFor: "checkin" })`;
    - `getCheckinPreselect({ checkoutId: filters.checkoutId, assetId: filters.assetId })`;
    - `countLegacyReturns()`;
    - `readConditionLabels()`;
    - `readCheckinDepartment(prisma).catch(() => null)`. Any error gives `null`: the summary then shows the department warning, and the route refuses the save (T1). A database outage still fails the page's other reads.
  - T7's `const legacyLink = legacyReturnCount > 0 ? (…) : null` block stays verbatim.
  - Imports added: `readConditionLabels` beside `countLegacyReturns` in the `@/lib/checkin-page-data` import, `import { readCheckinDepartment } from "@/lib/checkin-department"`, `import { prisma } from "@/lib/db"` and `import { hasPermission } from "@/lib/auth-utils"`. T7's imports stay.
  - It renders `<CheckinForm>` with:
    - `employees={options.employees} locations={options.locations} statuses={options.statuses} conditions={options.conditions}`;
    - `conditionLabels={conditionLabels}`;
    - `initialRow={preselect.row} initialQuery={preselect.query}`;
    - `returnDepartment={returnDepartment}`;
    - `currentEmployeeId={user.employeeId ?? null}`;
    - `canCreateRepair={hasPermission(user, "maintenance", "create")}`;
    - T7's `legacyLink={legacyLink}`;
    - the existing `returnTo`.
  - `next/link` stays out of the form (`tests/operations-sweep-ui.test.ts` bans it there).
- **Layout of the form:**
  - The form imports `import { CHECKIN_RETURN_DATE_ERROR_KEYS, checkinHandoverDay, checkinReturnDateError, isLegacyBackfilledHandover } from "@/lib/checkin-route-rules"` (T2) beside the `@/lib/checkin-form-rules` import.
  - `<form onSubmit={handleSubmit} noValidate id={CHECKIN_FORM_ID}>` (onSubmit first) wraps `<OperationFormFrame>`, its props one per line in this order, as checkout's are: `title={t("title")}`, `description={t("description")}`, `actions={legacyLink}`, `summaryOnPhone={false}`, `summary={…}`, `footer={…}`.
  - With `summaryOnPhone={false}`, the summary is hidden below `lg` from this commit until T10 adds the phone's footer line.
  - `OperationReviewDialog` follows `</form>` in a fragment.
  - The frame's children are three FormSections.
  - **Section 1:** `<FormSection number={1} title={t("sectionAsset")}>`, holding a `grid gap-4` with:
    - the arrival banner, without its old `md:col-span-2` div;
    - `<AssetOperationPicker`, with props in the order `id="checkin-checkout"`, `label={t("asset")}`, `mode="checkin"`, `value={chosen}`, `required`, `initialQuery={initialQuery}`, `error={blockedReason ?? fieldErrors.message("checkoutId")}`, `onChange={chooseRow}` and `pickedBody={(row) => <CheckinAssetCard row={row} />}`;
    - the holding strip, when `selectedCheckout && chosen`: `<p className="text-sm font-semibold text-foreground">{t("currentCustody")}</p>`, then one `KeyValueList` (see below);
    - the components checklist, when `travelling.length > 0`: `<FieldGroup legend={t("componentsLegend")} id="checkin-components" hint={t("componentsNote")} error={fieldErrors.message("missingComponentIds")}>` around a `grid gap-2` of `ChoiceCard`s, one per travelling component, each with:
      - `key={component.id}`, `type="checkbox"`, `value={component.id}`;
      - `checked={!unticked.has(component.id)}`, `disabled={saving}`;
      - `label={<><span className="tag">{component.assetTag}</span> {component.name}{unticked.has(component.id) ? ` · ${t("componentNotReturned")}` : null}</>}`;
      - `onChange={(event) => toggleComponent(component.id, event.target.checked)}`.
    - `CheckinAssetCard` is a local function shaped like `CheckoutAssetCard`:
      - `AssetThumbnail` size 44;
      - the tag and `<StatusBadge label={row.statusLabel} tone={getAssetStateTone(row.detail?.statusName)} />`;
      - the name;
      - when there is a serial, `{t("serialNumber")} <span className="tag">{row.serialNumber}</span>` as a `text-meta text-muted-foreground` line.
  - **The holding strip's items:**
    - the handover document: `{ key: "documentNo", label: t("handoverDocumentNo"), value: selectedCheckout.documentNo ? <span className="tag">{selectedCheckout.documentNo}</span> : null }`;
    - `{ key: "handedOverAt", label: t("handedOverAt"), value: … }`, where the value is:
      - `t("heldLegacy")` when `isLegacyBackfilledHandover(selectedCheckout.remark)`;
      - else `t("heldFor", { date: formatCheckoutDay(handoverDay, locale), days })`, where `days` is `checkinHeldDays({ handoverDay, returnDay: values.returnDate })`;
      - else the formatted day alone, when `days` is null;
    - custodyType (`t("permanentAssignmentShort")` / `t("temporaryLoanShort")`, as today);
    - checkoutType and checkoutTo, as today;
    - expectedReturnDate (a loan only): `formatCheckoutDay(checkinBangkokDay(selectedCheckout.expectedReturnDate), locale) || null`;
    - `{ key: "conditionBefore", label: t("conditionBefore"), value: conditionLabels[selectedCheckout.conditionBefore] ?? null }`;
    - checkoutRemark: `null` when `isLegacyBackfilledHandover(selectedCheckout.remark)` (the remark is the route's internal English text); else the remark.
  - **Section 2:** `<FormSection number={2} title={t("sectionReturn")}>`, a `grid gap-4 md:grid-cols-2`, in this order:
    1. ผู้คืน: today's `SearchableSelect id="checkin-return-by"`, plus `hint={returnByEmployeeId && returnByEmployeeId === choice.returnByEmployeeId ? t("returnByHolder") : undefined}`.
    2. ผู้รับคืน: today's `SearchableSelect id="checkin-receive-by"` (`options={employees}`), plus `hint={receiveByEmployeeId && receiveByEmployeeId === currentEmployeeId ? t("receiveByYou") : undefined}`.
    3. `<div className="md:col-span-2">` around `<AssetConditionChoice`, with props in the order `id="checkin-condition-after"`, `legend={t("conditionAfter")}`, `options={conditions}`, `value={values.conditionAfter}`, `required`, `error={fieldErrors.message("conditionAfter")}` and `onChange={setCondition}`.
    4. วันที่คืน: `<Field label={t("returnDate")} id="checkin-return-date" required error={fieldErrors.message("returnDate")}>`, with this child on one line: `<Input type="date" value={values.returnDate} min={handoverDay ?? undefined} max={todayDay} onChange={(event) => setField("returnDate", event.target.value)} required />`.
    5. หลังรับคืนให้เป็น: `<Field label={t("nextStatusAfterReturn")} id="checkin-next-status" required hint={nextStatusHint} error={fieldErrors.message("nextStatusId")}>`.
       - The child is `<NativeSelect value={values.nextStatusId} required onChange={(event) => setField("nextStatusId", event.target.value)}>`.
       - The options: `{repairLocked ? null : <option value="">{t("selectStatus")}</option>}`, then `{nextStatusOptions.map((status) => …)}`. Each reads `t("sendToRepairOption")` for `Under Maintenance`, else `status.label`.
       - `const nextStatusHint = repairLocked ? (chosen?.openRepairNo ? t("nextStatusJoinsRepair", { repairNo: chosen.openRepairNo }) : undefined) : sendsToRepair ? t("sendToRepairHelp") : undefined`.
    6. เก็บไว้ที่: `<SearchableSelect`, with props in the order `id="checkin-next-location"`, `label={t("nextLocation")}`, `value={values.nextLocationId}`, `required`, `options={locations}`, `placeholder={t("selectLocation")}`, `searchPlaceholder={tCommon("searchSelectPlaceholder")}`, `emptyLabel={tCommon("searchSelectNoResults")}`, `error={fieldErrors.message("nextLocationId")}` and `onChange={(value) => setField("nextLocationId", value)}`. No default.
    7. อุปกรณ์ที่ขาด, as today.
    8. รายละเอียดความเสียหาย (`md:col-span-2`), with `onChange` calling `handleDamageNoteChange`.
    9. When `repairLocked`: today's open-repair `Notice` (`md:col-span-2`).
    10. When `sendsToRepair && !repairLocked`: the รายละเอียดปัญหาในใบซ่อม `Field` (`md:col-span-2`). Today's `sendToRepairHelp` `Notice` goes; its words are now the next-status hint.
    11. หมายเหตุ (`md:col-span-2`).
  - **Section 3:** `<FormSection number={3} title={<>{t("sectionEvidence")} <span className="font-normal text-muted-foreground">{t("sectionEvidenceOptional")}</span></>}>`, holding:
    - `<FieldGroup legend={t("photoType")}>` around a `flex flex-wrap gap-2` of two radio `ChoiceChip`s:
      - `name="checkin-photo-type"`, `value={type.id}`, `checked={photoType === type.id}`, `onChange={() => setPhotoType(type.id)}`;
      - `photoTypes` = `overview` (`t("photoTypeOverview")`) and `damage` (`t("photoTypeDamage")`).
    - the `FileDropzone` and `FileQueueList`, unchanged;
    - the two `SignaturePad`s in a `grid gap-4 md:grid-cols-2`, with `key={`return:${returnByEmployeeId}`}` and `key={`receive:${receiveByEmployeeId}`}`.
  - **Frame props:**
    - `summary={<OperationSummaryCard … />}`, with:
      - `title`, `nowLabel`, `nextLabel` from `tOperation("summaryTitle" | "summaryNow" | "summaryNext")`;
      - `rows={summaryRows}`, `checklist={checklist}`;
      - `warnings={[...warningLines, ...(detailFailedNotice ? [detailFailedNotice] : [])]}`;
      - `footnote={t("summaryFootnote")}`;
      - `photo={chosen ? <AssetThumbnail photo={chosen.photo} assetTag={chosen.assetTag} assetName={chosen.name} size={64} /> : undefined}`;
      - `assetLabel={chosen ? assetOperationRowLabel(chosen) : undefined}`.
    - `footer`:
      - `description: chosen && values.returnBy ? t("footerDescription", { tag: chosen.assetTag, returner: values.returnBy }) : t("footerIncomplete")`;
      - `cancelHref`;
      - `cancelLabel: tCommon("cancel")`;
      - `submitLabel: tOperation("reviewAndSave")`;
      - `busy: saving || readingForSubmit`;
      - `formId: CHECKIN_FORM_ID`.
  - **The summary's inputs:**
    - `summaryRows`:
      - it is `buildCheckinSummaryRows({ row: chosen, returnDepartment, status: selectedStatus ?? null, location: selectedLocation ?? null, condition: selectedCondition ?? null, conditionLabels, unticked }, …)`;
      - its words are `tOperation("summaryHolder" | "summaryDepartment" | "summaryStatus" | "summaryLocation" | "summaryCondition" | "summaryComponents" | "summaryNone" | "summaryNotChosen")`, `count: (count) => tOperation("summaryCount", { count })` and `componentsBack: (returned, missing) => t("summaryComponentsBack", { returned, missing })`.
    - `checklist`:
      - it is `buildCheckinChecklist({ row: chosen, returnBy: values.returnBy, receiveBy: values.receiveBy, conditionAfter: values.conditionAfter, nextStatusId: values.nextStatusId, nextLocationId: values.nextLocationId, returnSigned: returnSignatureDataUrl !== null, receiveSigned: receiveSignatureDataUrl !== null }, …)`;
      - its words are `t("asset" | "returnBy" | "receiveBy" | "conditionAfter" | "nextStatusAfterReturn" | "nextLocation" | "returnSignature" | "receiveSignature" | "signatureMissing")`.
    - `warningLines`:
      - it is `checkinWarningLines({ row: chosen, returnDepartment, unticked, returnerLabel: values.returnBy || t("returnBy"), status: selectedStatus ?? null, conditionName: selectedCondition?.name ?? null, repairLocked }, …)`;
      - its words are `departmentUnavailable: apiError.describe("ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE").message`, `missing: (input) => t("warningComponentMissing", input)`, `repairOpens: t("warningRepairOpens")`, `repairJoins: (repairNo) => t("warningRepairJoins", { repairNo })`, `brokenReady: t("warningBrokenReady")` and `salvageReady: t("warningSalvageReady")`.
    - `detailFailedNotice`: checkout's, with `t("detailReadFailed")`, `tCommon("tryAgain")` and `loadRowDetail(chosen.id)`.
  - **Removed:** `ContentPanel`, `PageHeader` (T7's `actions={legacyLink}` moves to the frame), the local `Select` and `formatDate`, the inline Save `Button` and the `Save` icon, the `operationConditionDefault` import, `toLocalDateInputValue`, and HEAD's `conditionLabelById` (`:161`, X17; the `conditionLabels` prop replaces it, and `useMemo` stays for `employeeIds`). T7 already removed `legacyReturnCount` and `formatCount`.
- **FIELD_IDS**, in visual order (P2-R11):
  ```ts
  const FIELD_IDS = {
    checkoutId: "checkin-checkout",
    missingComponentIds: "checkin-components",
    returnBy: "checkin-return-by",
    receiveBy: "checkin-receive-by",
    conditionAfter: "checkin-condition-after",
    returnDate: "checkin-return-date",
    nextStatusId: "checkin-next-status",
    nextLocationId: "checkin-next-location",
  } as const
  ```
- **`validate(values, { repairLocked, sendsToRepair, returnByEmployeeId, missingCount, todayDay, handoverDay })`.**
  - The context is destructured in the signature, so the pinned nextStatusId rule keeps its text.
  - `const dateError = values.returnDate ? checkinReturnDateError({ returnDay: values.returnDate, todayDay, handoverDay }) : null`.
  - The rules, in this order:
    ```ts
    check("checkoutId", required(values.checkoutId))
    check("returnBy", required(values.returnBy) ?? maxLength(values.returnBy, 100) ?? (missingCount > 0 ? required(returnByEmployeeId) : null))
    check("receiveBy", required(values.receiveBy) ?? maxLength(values.receiveBy, 100))
    check("conditionAfter", required(values.conditionAfter))
    check("returnDate", required(values.returnDate) ?? (dateError ? CHECKIN_RETURN_DATE_ERROR_KEYS[dateError] : null))
    check("nextStatusId", required(values.nextStatusId) ?? (repairLocked && !sendsToRepair ? "checkinRepairStatusRequired" : null))
    check("nextLocationId", required(values.nextLocationId))
    ```
  - The date code maps through T2's `CHECKIN_RETURN_DATE_ERROR_KEYS` (X20), the same keys the route answers under `fieldErrors.returnDate`.
  - The returner rule reads `required(returnByEmployeeId)`, not T2's code: the `SearchableSelect` always yields an employee id, so the rule only stops a value that is not an employee, and reads "required" under ผู้คืน. The server's catalogued refusal still lands under `returnBy`.
  - `missingComponentIds` has no client rule; the server's refusal lands on the group.
- **State and handlers.** Kept verbatim unless named here: `leaveReview`, `focusFirstError`, `setField`, `confirmLegacyReturn`, `submitCheckin`'s error handling and redirect, `dataUrlToFile`, `repairStatus`, `repairLocked`, `returnByOptions`, `selectedReturnBy`, `selectedReceiver`.
  - **Names that stay (X23):** `selectedReceiver`, `selectedReturnBy`, `chooseRow`, `setEmployeeField`, `submitCheckin` and `leaveReview` keep these names and their signatures (`setEmployeeField(field, employeeId, formerLabel?)`), because T9 and T10 call them. Only the changes named below touch them.
  - **New derived value:** `const selectedCondition = conditions.find((condition) => condition.id === values.conditionAfter)`, beside `selectedStatus`.
  - **Initial values:**
    - `returnDate: checkinTodayDay()`;
    - `receiveBy` = the label of `initialReceiverId`. `initialReceiverId` is `currentEmployeeId` when `employeeIds` has it, else `""`. `useState(initialReceiverId)` holds `receiveByEmployeeId`;
    - `conditionAfter: ""`;
    - `nextStatusId` as today;
    - `const [unticked, setUnticked] = useState<ReadonlySet<string>>(new Set())`;
    - `const [rowDetail, setRowDetail] = useState<CheckoutDetailState>(initialRow && !initialRow.detail ? "failed" : "ready")`;
    - `const rowIdRef = useRef(initialRow?.id ?? null)`;
    - `const [readingForSubmit, setReadingForSubmit] = useState(false)`;
    - `photoType` starts `"overview"`.
  - **`loadRowDetail(assetId)`** is checkout's `loadAssetDetail`, with these changes:
    - it reads `buildAssetOperationSearchHref({ mode: "checkin", id: assetId, detail: true })`;
    - it updates `rowIdRef` / `setRowDetail`;
    - it ends with `setChosen((current) => withCheckoutAssetDetail(current, answered))`;
    - it returns the answered row or `null`.
  - **`applyChoice(row)`** keeps today's lines and adds, after `setChosen(row)`:
    - `rowIdRef.current = row?.id ?? null`;
    - `setRowDetail(row && !row.detail ? "loading" : "ready")`;
    - `if (row && !row.detail) void loadRowDetail(row.id)`;
    - `setUnticked(new Set())`;
    - `fieldErrors.clear("missingComponentIds")`. A new pick starts with every component ticked (spec §8.2).
  - **`chooseRow(row)`:**
    - inside `if (row?.legacy) {`, before `void confirmLegacyReturn(row)`, add `if (!returnDepartment) { fieldErrors.setErrors({ checkoutId: getApiErrorKey("ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE") ?? "invalid" }); focusFirstError(); return }`;
    - with no return department, the backfill would leave its HO- behind when the return is then refused (P2-R8, GP X8, Review Focus 5).
  - **`handleCreateLegacyCheckout`:**
    - drop the `setValues` prefill (P2-R9);
    - the clear line becomes `fieldErrors.clear("checkoutId", "returnBy")`;
    - `fetchCheckinRow` reads `buildAssetOperationSearchHref({ mode: "checkin", id: assetId, detail: true })`.
  - **`setEmployeeField`:** a person who differs from the current one clears that side's signature (`setReturnSignatureDataUrl(null)` / `setReceiveSignatureDataUrl(null)`) before the id is set. The pad's `key` remounts it.
  - **`setCondition(conditionId)`** and **`handleDamageNoteChange(value)`:**
    - each computes `const picked = checkinAutoNextStatus({ nextStatusId: values.nextStatusId, conditionName: …, damageNote: …, options: nextStatusOptions })` with the new value in its own slot;
    - then `if (picked && !values.nextStatusId) fieldErrors.clear("nextStatusId")`;
    - then `setValues((current) => ({ ...current, <field>: value, nextStatusId: current.nextStatusId || picked }))`;
    - `setCondition` also clears `"conditionAfter"`.
    - P2-R16's condition auto-pick waits on the user's confirmation. Keep it to this one call in `setCondition`, so that dropping it later is that call plus its test.
  - **`toggleComponent(componentId, returned)`:** adds the id to `unticked` (or removes it) in a new `Set`, then `fieldErrors.clear("missingComponentIds")`.
  - **`handleSubmit`:**
    1. `fieldErrors.setErrors(validate(values, { repairLocked, sendsToRepair, returnByEmployeeId, missingCount: missingComponents.length, todayDay, handoverDay }))`, and `if (focusFirstError()) return`.
    2. When `chosen` and `rowDetail !== "ready"`, it reads the detail again under `readingForSubmit`:
       - a failed read returns, and the warning with ลองอีกครั้ง shows;
       - an answered row that is no longer eligible sets `{ checkoutId: "invalid" }`, focuses and returns.
    3. `setReviewOpen(true)`.
    - T9 adds its branch at the top.
  - **`submitCheckin`:** after today's body lines, add `for (const component of missingComponents) body.append("missingComponentIds", component.id)`. When everything came back, no key is sent (T3 then behaves as today).
  - **Review items:**
    - `labels.nextStatus` = `t("nextStatusAfterReturn")`;
    - `details`, in this order:
      - the location (as today);
      - `{ label: t("conditionAfter"), value: selectedCondition?.label ?? "" }`;
      - `{ label: t("returnDate"), value: formatCheckoutDay(values.returnDate, locale) }`;
      - when `travelling.length > 0`, `{ label: tOperation("summaryComponents"), value: t("summaryComponentsBack", { returned: travelling.length - missingComponents.length, missing: missingComponents.length }) }`;
    - the evidence line as today.

- [ ] **Step 1: Write the failing tests.**

Create `tests/checkin-form-rules.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  buildCheckinChecklist, buildCheckinSummaryRows, checkinAutoNextStatus, checkinBangkokDay, checkinComponents,
  checkinHeldDays, checkinNextStatusOptions, checkinTodayDay, checkinWarningLines,
  type CheckinFormChoice, type CheckinSummaryRow, type CheckinSummaryWords, type CheckinWarningWords,
} from "../src/lib/checkin-form-rules.ts"
import type { AssetOperationChosenDetail, AssetOperationSearchRow } from "../src/lib/asset-operation-search-rules.ts"

// รับคืน's pure rules (group 3 plan 2 Task 8, spec §8.1-8.4): the สรุปก่อนบันทึก rows and checklist, the components that
// come back, หลังรับคืนให้เป็น and its auto-pick, the days held and the warning lines; then the form's and the page's
// source and the words. The handover day and the legacy mark are T2's (tests/checkin-route-rules.test.ts).
const read = (file: string) => readFileSync(file, "utf8").replace(/\r\n/g, "\n")
const handover = { id: "co-1", documentNo: "HO-202610-0012", checkoutType: "user", handoverMode: "permanent_assignment", checkoutDate: "2026-10-01T02:00:00.000Z",
  expectedReturnDate: null, conditionBefore: "c-good", remark: null, destinationLabel: "E001 - สมชาย ใจดี" }
const adapter = { id: "k1", assetTag: "NB-0017-01", name: "Adapter 65W", travels: true, locationLabel: "HQ-01 - คลัง IT" }
const mouse = { id: "k2", assetTag: "NB-0017-02", name: "Mouse ไร้สาย", travels: true, locationLabel: "HQ-01 - คลัง IT" }
const dock = { id: "k3", assetTag: "NB-0017-03", name: "Dock", travels: false, locationLabel: "BR-02 - ห้อง 2" }
function row(o: Partial<AssetOperationSearchRow> = {}, d: Partial<AssetOperationChosenDetail> = {}): AssetOperationSearchRow {
  return {
    id: "a1", assetTag: "NB-0017", name: "Notebook", serialNumber: "SN-1", statusLabel: "ใช้งานอยู่", placeLabel: "E001 - สมชาย ใจดี",
    locationLabel: "HQ-01 - คลัง IT", currentLocationId: "l1", conditionId: "c-na", eligible: true, reasonKey: null, photo: null,
    checkout: handover, holderKey: "e1", holderLabel: "E001 - สมชาย ใจดี", holderEmployeeId: "e1",
    detail: { ownership: "personal", statusName: "In Use", departmentId: "d-acc", departmentLabel: "ACC - บัญชี", departmentName: "บัญชี",
      holderLabel: "E001 - สมชาย ใจดี", holderName: "สมชาย ใจดี", ownerBranchLabel: "สำนักงานใหญ่", locationBranchLabel: "สำนักงานใหญ่", components: [], ...d },
    ...o,
  }
}
const statuses = [{ id: "s-ready", label: "พร้อมใช้งาน", name: "Ready" }, { id: "s-um", label: "อยู่ระหว่างซ่อม", name: "Under Maintenance" }, { id: "s-pd", label: "รอตัดจำหน่าย", name: "Pending Disposal" }]
const [ready, repair, disposal] = statuses
const itDept = { id: "d-it", code: "IT", name: "Information Technology" }
const room = { id: "l2", label: "BR-02 - ห้อง 2", name: "ห้อง 2" }
const good = { id: "c-good", label: "ดี", name: "Good" }
const conditionLabels = { "c-na": "ยังไม่ประเมิน", "c-good": "ดี" }
const choose = (o: Partial<CheckinFormChoice> = {}): CheckinFormChoice =>
  ({ row: row(), returnDepartment: itDept, status: null, location: null, condition: null, conditionLabels, unticked: new Set(), ...o })
const words: CheckinSummaryWords = { holder: "ผู้ถือครอง", department: "แผนก", status: "สถานะ", location: "ที่ตั้ง", condition: "สภาพ", components: "ส่วนควบ",
  none: "ไม่มี", notChosen: "ยังไม่ได้เลือก", count: (n) => `${n} รายการ`, componentsBack: (r, m) => `ได้คืน ${r} · ขาด ${m}` }
const pick = (rows: CheckinSummaryRow[]) => rows.map(({ key, now, next, changed }) => [key, now, next, changed])

test("บุคคล: the holder goes, the return department, the chosen status, room and condition, and the components back and missing (spec §8.4, §6)", () => {
  const rows = buildCheckinSummaryRows(choose({ row: row({}, { components: [adapter, mouse, dock] }), status: ready, location: room, condition: good, unticked: new Set(["k2", "k3"]) }), words)
  assert.deepEqual(rows.map((r) => r.label), ["ผู้ถือครอง", "แผนก", "สถานะ", "ที่ตั้ง", "สภาพ", "ส่วนควบ"])
  assert.deepEqual(pick(rows), [["holder", "สมชาย ใจดี", "ไม่มี", true], ["department", "บัญชี", "Information Technology", true],
    ["status", "ใช้งานอยู่", "พร้อมใช้งาน", true], ["location", "HQ-01 - คลัง IT", "BR-02 - ห้อง 2", true],
    ["condition", "ยังไม่ประเมิน", "ดี", true], ["components", "2 รายการ", "ได้คืน 1 · ขาด 1", true]])
})
test("ส่วนกลาง, ส่วนควบ and License keep their department; an IT asset stays plain; no return department promises nothing; ส่งซ่อม reads the status name (P2-R7, P2-R8, P2-R9)", () => {
  for (const ownership of ["shared", "component", "software_license"] as const)
    assert.deepEqual(pick(buildCheckinSummaryRows(choose({ row: row({}, { ownership }) }), words))[1], ["department", "บัญชี", "บัญชี", false], ownership)
  assert.deepEqual(pick(buildCheckinSummaryRows(choose({ row: row({}, { departmentId: "d-it", departmentName: "Information Technology" }) }), words))[1],
    ["department", "Information Technology", "Information Technology", false])
  assert.deepEqual(pick(buildCheckinSummaryRows(choose({ returnDepartment: null }), words))[1], ["department", "บัญชี", "บัญชี", false])
  assert.deepEqual(pick(buildCheckinSummaryRows(choose({ status: repair }), words))[2], ["status", "ใช้งานอยู่", "อยู่ระหว่างซ่อม", true])
})
test("nothing promised before it is chosen, no components row when none travel, never a condition id, no rows without the detail (spec §4 anti-goal)", () => {
  assert.deepEqual(pick(buildCheckinSummaryRows(choose({ row: row({}, { holderLabel: null, holderName: null, components: [dock] }) }), words)), [
    ["holder", "ไม่มี", "ไม่มี", false], ["department", "บัญชี", "Information Technology", true], ["status", "ใช้งานอยู่", "ยังไม่ได้เลือก", false],
    ["location", "HQ-01 - คลัง IT", "ยังไม่ได้เลือก", false], ["condition", "ยังไม่ประเมิน", "ยังไม่ได้เลือก", false]])
  assert.deepEqual(pick(buildCheckinSummaryRows(choose({ row: row({ conditionId: "c-gone" }) }), words))[4], ["condition", "ไม่มี", "ยังไม่ได้เลือก", false])
  assert.deepEqual(buildCheckinSummaryRows(choose({ row: row({ detail: undefined }) }), words), [])
  assert.deepEqual(buildCheckinSummaryRows(choose({ row: null }), words), [])
})
test("หลังรับคืนให้เป็น: ส่งซ่อม only for someone who may open a repair, and alone on a row with an open repair, whoever returns it (spec §5, §8.3, P2-R14)", () => {
  const ids = (input: Parameters<typeof checkinNextStatusOptions>[0]) => checkinNextStatusOptions(input).map((status) => status.id)
  assert.deepEqual(ids({ statuses, repairLocked: false, canCreateRepair: true }), ["s-ready", "s-um", "s-pd"])
  assert.deepEqual(ids({ statuses, repairLocked: false, canCreateRepair: false }), ["s-ready", "s-pd"])
  assert.deepEqual(ids({ statuses, repairLocked: true, canCreateRepair: false }), ["s-um"], "joining an open repair needs only asset:edit")
  assert.deepEqual(ids({ statuses, repairLocked: true, canCreateRepair: true }), ["s-um"])
})
test("the auto-pick fills an empty choice only: damage text, เสียหาย or ใช้งานไม่ได้ pick ส่งซ่อม, ซาก picks รอตัดจำหน่าย, never a status not offered (spec §8.3, P2-R16, P2-R14)", () => {
  const auto = (o: Partial<Parameters<typeof checkinAutoNextStatus>[0]>) =>
    checkinAutoNextStatus({ nextStatusId: "", conditionName: null, damageNote: "", options: statuses, ...o })
  assert.equal(auto({ damageNote: "จอแตก" }), "s-um")
  assert.equal(auto({ damageNote: "   " }), "")
  assert.equal(auto({ conditionName: "Damaged" }), "s-um")
  assert.equal(auto({ conditionName: "Non-functional" }), "s-um")
  assert.equal(auto({ conditionName: "Salvage" }), "s-pd")
  assert.equal(auto({ conditionName: "Salvage", damageNote: "จอแตก" }), "s-pd", "a salvage asset is not repaired")
  assert.equal(auto({ conditionName: "Good" }), "")
  assert.equal(auto({ conditionName: "Damaged", nextStatusId: "s-ready" }), "s-ready", "a choice already made stays")
  const withoutRepair = checkinNextStatusOptions({ statuses, repairLocked: false, canCreateRepair: false })
  assert.equal(auto({ conditionName: "Damaged", options: withoutRepair }), "")
  assert.equal(auto({ damageNote: "จอแตก", options: withoutRepair }), "")
  assert.equal(auto({ conditionName: "Salvage", options: [ready, repair] }), "", "รอตัดจำหน่าย not offered")
})
test("days: Bangkok days, as the route's bound counts them; the days held run to the chosen return date; no handover day (a legacy backfill) and a return before it read none (spec §5, §8.2, P2-R9, P2-R13)", () => {
  assert.equal(checkinTodayDay(new Date("2026-10-31T17:30:00.000Z")), "2026-11-01", "00:30 in Bangkok is the next day")
  assert.equal(checkinTodayDay(new Date("2026-10-31T16:59:59.000Z")), "2026-10-31")
  assert.equal(checkinBangkokDay("2026-10-30T18:30:00.000Z"), "2026-10-31")
  assert.equal(checkinBangkokDay(null), "")
  assert.equal(checkinBangkokDay(""), "")
  assert.equal(checkinBangkokDay("not a date"), "", "no RangeError from getBangkokDateKey")
  assert.equal(checkinHeldDays({ handoverDay: "2026-10-01", returnDay: "2026-10-31" }), 30)
  assert.equal(checkinHeldDays({ handoverDay: "2025-12-31", returnDay: "2026-01-02" }), 2)
  assert.equal(checkinHeldDays({ handoverDay: "2026-10-31", returnDay: "2026-10-31" }), 0)
  assert.equal(checkinHeldDays({ handoverDay: "2026-10-31", returnDay: "2026-10-30" }), null)
  assert.equal(checkinHeldDays({ handoverDay: null, returnDay: "2026-10-31" }), null)
  assert.equal(checkinHeldDays({ handoverDay: "2026-10-01", returnDay: "" }), null)
})
test("the components that travel, and which did not come back; one with its own handover is not listed (spec §8.2, P2-R1)", () => {
  assert.deepEqual(checkinComponents(row({}, { components: [adapter, mouse, dock] }), new Set(["k2", "k3", "gone"])), { travelling: [adapter, mouse], missing: [mouse] })
  assert.deepEqual(checkinComponents(row({ detail: undefined }), new Set(["k1"])), { travelling: [], missing: [] })
  assert.deepEqual(checkinComponents(null, new Set()), { travelling: [], missing: [] })
})
test("still missing: the asset, both people, the condition, หลังรับคืนให้เป็น and the room; the two signatures optional (spec §8.4, P2-R9)", () => {
  const checkWords = { asset: "ทรัพย์สิน", returnBy: "ผู้คืน", receiveBy: "ผู้รับคืน", condition: "สภาพตอนคืน", nextStatus: "หลังรับคืนให้เป็น", location: "เก็บไว้ที่",
    returnSignature: "ลายเซ็นผู้คืน", receiveSignature: "ลายเซ็นผู้รับคืน", signatureMissing: "ยังไม่มี (ไม่บังคับ)" }
  const empty = { row: null, returnBy: "", receiveBy: "", conditionAfter: "", nextStatusId: "", nextLocationId: "", returnSigned: false, receiveSigned: false }
  assert.deepEqual(buildCheckinChecklist(empty, checkWords), [
    { key: "asset", label: "ทรัพย์สิน", done: false }, { key: "returnBy", label: "ผู้คืน", done: false }, { key: "receiveBy", label: "ผู้รับคืน", done: false },
    { key: "condition", label: "สภาพตอนคืน", done: false }, { key: "nextStatus", label: "หลังรับคืนให้เป็น", done: false }, { key: "location", label: "เก็บไว้ที่", done: false },
    { key: "returnSignature", label: "ลายเซ็นผู้คืน", done: false, note: "ยังไม่มี (ไม่บังคับ)" },
    { key: "receiveSignature", label: "ลายเซ็นผู้รับคืน", done: false, note: "ยังไม่มี (ไม่บังคับ)" }])
  const filled = { row: row(), returnBy: "E001 - สมชาย ใจดี", receiveBy: "E002 - ใจดี มาก", conditionAfter: "c-good", nextStatusId: "s-ready", nextLocationId: "l2", returnSigned: true, receiveSigned: true }
  assert.deepEqual(buildCheckinChecklist(filled, checkWords).map((check) => check.done), [true, true, true, true, true, true, true, true])
  assert.equal(buildCheckinChecklist({ ...filled, row: row({ eligible: false, reasonKey: "asset.transactionReasonActiveMaintenance" }) }, checkWords)[0].done, false)
  assert.equal(buildCheckinChecklist({ ...filled, row: row({ checkout: undefined, legacy: true }) }, checkWords)[0].done, false, "a ข้อมูลเก่า row before its backfill")
})
test("warning lines: no return department, each component not back and where it stays, ส่งซ่อม opens or joins a record, a broken asset made พร้อมใช้งาน (spec §8.4, §12, P2-R16)", () => {
  const warn: CheckinWarningWords = { departmentUnavailable: "ยังไม่ได้ตั้งแผนกที่รับคืน",
    missing: (input) => `${input.component} ยังไม่ได้คืน จะอยู่กับ ${input.returner} ที่ ${input.room} และบันทึกเป็นอุปกรณ์ที่ขาดในใบรับคืน`,
    repairOpens: "จะเปิดใบซ่อมให้", repairJoins: (repairNo) => `ต่อใบซ่อม ${repairNo}`,
    brokenReady: "สภาพนี้ส่งมอบต่อไม่ได้จนกว่าจะส่งซ่อม", salvageReady: "ซากรอตัดจำหน่าย ส่งมอบต่อไม่ได้" }
  const lines = (o: Partial<Parameters<typeof checkinWarningLines>[0]>) => checkinWarningLines({ row: row({}, { components: [adapter, mouse] }), returnDepartment: itDept,
    unticked: new Set(), returnerLabel: "E001 - สมชาย ใจดี", status: null, conditionName: null, repairLocked: false, ...o }, warn)
  assert.deepEqual(lines({}), [])
  assert.deepEqual(lines({ returnDepartment: null, unticked: new Set(["k2"]), status: repair }), [
    "ยังไม่ได้ตั้งแผนกที่รับคืน",
    "NB-0017-02 Mouse ไร้สาย ยังไม่ได้คืน จะอยู่กับ E001 - สมชาย ใจดี ที่ HQ-01 - คลัง IT และบันทึกเป็นอุปกรณ์ที่ขาดในใบรับคืน",
    "จะเปิดใบซ่อมให้"])
  assert.deepEqual(lines({ row: row({ openRepair: true, openRepairNo: "RP-202610-0042" }), status: repair, repairLocked: true }), ["ต่อใบซ่อม RP-202610-0042"])
  assert.deepEqual(lines({ row: row({ openRepair: true }), status: repair, repairLocked: true }), [], "without its number the open-repair notice says it")
  assert.deepEqual(lines({ status: ready, conditionName: "Damaged" }), ["สภาพนี้ส่งมอบต่อไม่ได้จนกว่าจะส่งซ่อม"])
  assert.deepEqual(lines({ status: ready, conditionName: "Non-functional" }), ["สภาพนี้ส่งมอบต่อไม่ได้จนกว่าจะส่งซ่อม"])
  assert.deepEqual(lines({ status: ready, conditionName: "Salvage" }), ["ซากรอตัดจำหน่าย ส่งมอบต่อไม่ได้"])
  assert.deepEqual(lines({ status: repair, conditionName: "Damaged" }), ["จะเปิดใบซ่อมให้"])
  assert.deepEqual(lines({ status: disposal, conditionName: "Salvage" }), [])
  assert.deepEqual(lines({ row: null, returnDepartment: null }), ["ยังไม่ได้ตั้งแผนกที่รับคืน"])
})
```

Three more tests in the same file, on the form's source, the page's source and the words:

```ts
test("the form: the form wraps the frame with the legacy link and no summary on the phone; three sections, the card, the holding strip, the checklist, the fields in the spec's order, the summary and the footer (spec §8.1-8.4, P2-R9-R12)", () => {
  const form = read("src/components/asset-operations/checkin-form.tsx")
  for (const part of [
    'const CHECKIN_FORM_ID = "checkin-form"', "<form onSubmit={handleSubmit} noValidate id={CHECKIN_FORM_ID}>",
    "actions={legacyLink}", "summaryOnPhone={false}", "legacyLink: React.ReactNode",
    'import { CHECKIN_RETURN_DATE_ERROR_KEYS, checkinHandoverDay, checkinReturnDateError, isLegacyBackfilledHandover } from "@/lib/checkin-route-rules"',
    "const handoverDay = selectedCheckout ? checkinHandoverDay(selectedCheckout) : null", "isLegacyBackfilledHandover(selectedCheckout.remark)",
    "(dateError ? CHECKIN_RETURN_DATE_ERROR_KEYS[dateError] : null)",
    "const selectedReturnBy = ", "const selectedReceiver = ", "function chooseRow(", "function setEmployeeField(", "async function submitCheckin(", "async function leaveReview(",
    '<FormSection number={1} title={t("sectionAsset")}>', '<FormSection number={2} title={t("sectionReturn")}>', "<FormSection number={3} title=",
    "pickedBody={(row) => <CheckinAssetCard row={row} />}", "<StatusBadge label={row.statusLabel} tone={getAssetStateTone(row.detail?.statusName)} />",
    'buildAssetOperationSearchHref({ mode: "checkin", id: assetId, detail: true })', "withCheckoutAssetDetail(current, answered)",
    'label: t("handedOverAt")', 't("heldFor", {', 't("heldLegacy")', "conditionLabels[selectedCheckout.conditionBefore] ?? null",
    '<FieldGroup legend={t("componentsLegend")} id="checkin-components" hint={t("componentsNote")} error={fieldErrors.message("missingComponentIds")}>',
    'type="checkbox"', "checked={!unticked.has(component.id)}", 'body.append("missingComponentIds", component.id)', "setUnticked(new Set())",
    't("returnByHolder")', 't("receiveByYou")', "onChange={setCondition}", "max={todayDay}", "min={handoverDay ?? undefined}",
    "const nextStatusOptions = checkinNextStatusOptions({ statuses, repairLocked, canCreateRepair })", "nextStatusOptions.map(",
    'label={t("nextStatusAfterReturn")}', 't("nextStatusJoinsRepair", { repairNo: chosen.openRepairNo })', 'sendsToRepair ? t("sendToRepairHelp") : undefined',
    "nextStatusId: current.nextStatusId || picked", 'name="checkin-photo-type"',
    "key={`return:${returnByEmployeeId}`}", "key={`receive:${receiveByEmployeeId}`}",
    'apiError.describe("ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE").message', 'getApiErrorKey("ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE")',
    "summary={<OperationSummaryCard", "rows={summaryRows}", "checklist={checklist}", 'footnote={t("summaryFootnote")}',
    't("footerDescription", { tag: chosen.assetTag, returner: values.returnBy })', 'submitLabel: tOperation("reviewAndSave")', "formId: CHECKIN_FORM_ID",
    'label: t("conditionAfter"), value: selectedCondition?.label ?? ""', 'label: t("returnDate"), value: formatCheckoutDay(values.returnDate, locale)',
  ]) assert.ok(form.includes(part), part)
  assert.equal(form.split("nextStatusId: current.nextStatusId || picked").length - 1, 2, "the damage text and the condition")
  const at = (text: string) => form.indexOf(text)
  assert.ok(at("<form onSubmit=") < at("<OperationFormFrame") && at("</OperationFormFrame>") < at("</form>") && at("</form>") < at("<OperationReviewDialog"),
    "the form wraps the frame; the review follows the form")
  assert.ok(at('id="checkin-components"') < at('id="checkin-return-by"') && at('id="checkin-condition-after"') < at('id="checkin-return-date"')
    && at('id="checkin-return-date"') < at('id="checkin-next-status"') && at('id="checkin-next-status"') < at('id="checkin-next-location"'), "the spec's order (P2-R11)")
  const chooseRow = form.slice(at("function chooseRow("), at("async function confirmLegacyReturn("))
  assert.ok(chooseRow.indexOf("if (!returnDepartment) {") >= 0 && chooseRow.indexOf("if (!returnDepartment) {") < chooseRow.indexOf("void confirmLegacyReturn(row)"),
    "no return department: the confirm is refused before any backfill (P2-R8)")
  assert.equal(form.match(/<KeyValueList\b/g)?.length, 1, "one holding strip")
  assert.doesNotMatch(form, /data-slot=|function Select\(|function formatDate\b|operationConditionDefault|from "next\/link"|<ContentPanel\b|<PageHeader\b|photoTypeAssetTag|photoTypeSerial|photoTypeAccessories|returnPhotoChecklist|legacyReturnCount|conditionLabelById|toLocalDateInputValue|getApiErrorKey\(dateError\)/)
})
test("the page: the signed-in person's employee, maintenance:create, the return department, the condition names, and T7's legacy link passed on unchanged (spec §8.1, §8.3, §12, P2-R8, P2-R12, X5)", () => {
  const page = read("src/app/[locale]/(dashboard)/asset-management/checkin/page.tsx")
  for (const part of [
    'const user = await requirePagePermission(locale, "asset", "edit")', 'const t = await getTranslations("checkin")',
    'getAssetOperationMasterOptions({ conditionsFor: "checkin" })',
    "getCheckinPreselect({ checkoutId: filters.checkoutId, assetId: filters.assetId })", "countLegacyReturns()", "readConditionLabels()",
    "readCheckinDepartment(prisma).catch(() => null)", "const legacyLink = legacyReturnCount > 0 ? (",
    't("legacyReturnLink", { count: formatCount(legacyReturnCount) })', "legacyLink={legacyLink}",
    "currentEmployeeId={user.employeeId ?? null}", 'canCreateRepair={hasPermission(user, "maintenance", "create")}',
    "returnDepartment={returnDepartment}", "conditionLabels={conditionLabels}",
    "initialRow={preselect.row}", "initialQuery={preselect.query}",
  ]) assert.ok(page.includes(part), part)
  assert.doesNotMatch(page, /legacyReturnCount=|headerActions|legacyReturnView/)
})
test("the words of รับคืน, Thai and English; the three dropped photo types and the old photo heading have no reader left; the legacy link's words are T7's and the outstanding line's T4's (spec §8.1-8.4, §13, P2-R10)", () => {
  const messages = { th: JSON.parse(read("messages/th.json")), en: JSON.parse(read("messages/en.json")) }
  const word = (locale: "th" | "en", key: string): unknown =>
    key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages[locale])
  const words: Record<string, [string, string]> = {
    "checkin.description": ["บันทึกการรับทรัพย์สินคืน เมื่อบันทึกแล้วระบบจะออกเลขใบรับคืนให้", "Record an asset's return. The return number is issued when you save."],
    "checkin.sectionAsset": ["ทรัพย์สินที่รับคืน", "Asset to return"], "checkin.sectionReturn": ["รายละเอียดการคืน", "Return details"],
    "checkin.sectionEvidence": ["หลักฐาน", "Evidence"], "checkin.sectionEvidenceOptional": ["ไม่บังคับ แต่แนะนำ", "Optional, but recommended"],
    "checkin.handedOverAt": ["ส่งมอบเมื่อ", "Handed over"], "checkin.heldFor": ["{date} · ถือมา {days} วัน", "{date} · held for {days} days"],
    "checkin.heldLegacy": ["ข้อมูลเก่า (ใบส่งมอบย้อนหลัง)", "Legacy record (backdated handover)"],
    "checkin.permanentAssignmentShort": ["มอบหมายใช้งานประจำ", "Permanent assignment"], "checkin.temporaryLoanShort": ["ยืมใช้ชั่วคราว", "Temporary loan"],
    "checkin.componentsLegend": ["ส่วนควบที่ต้องได้คืน · ติ๊กชิ้นที่ได้คืนแล้ว", "Components to get back · tick each one returned"],
    "checkin.componentsNote": ["ชิ้นที่ไม่ได้ติ๊กจะยังอยู่กับผู้คืน และบันทึกเป็นอุปกรณ์ที่ขาดในใบรับคืน", "An unticked component stays with the returner and is recorded as missing on the return."],
    "checkin.componentNotReturned": ["ยังไม่ได้คืน", "not returned"],
    "checkin.returnByHolder": ["ผู้ถือครองตอนนี้", "Current holder"], "checkin.receiveByYou": ["คุณ", "You"],
    "checkin.nextStatusAfterReturn": ["หลังรับคืนให้เป็น", "After the return"],
    "checkin.sendToRepairHelp": ["บันทึกแล้วระบบจะเปิดใบซ่อมให้อัตโนมัติ", "On saving, a repair record opens automatically."],
    "checkin.nextStatusJoinsRepair": ["ต่อใบซ่อม {repairNo} ที่ยังไม่ปิด", "Joins the open repair record {repairNo}."],
    "checkin.photoTypeOverview": ["ภาพรวม", "Overview"], "checkin.photoTypeDamage": ["จุดเสียหาย", "Damage"],
    "checkin.signatureMissing": ["ยังไม่มี (ไม่บังคับ)", "Not yet (optional)"],
    "checkin.summaryComponentsBack": ["ได้คืน {returned} · ขาด {missing}", "{returned} back · {missing} missing"],
    "checkin.summaryFootnote": ["เลขใบรับคืนออกให้หลังบันทึก แล้วเปิดใบรับคืนให้พิมพ์ทันที", "The return number is issued on saving, and the return document opens for printing."],
    "checkin.footerDescription": ["รับคืน {tag} จาก {returner}", "Return {tag} from {returner}"],
    "checkin.footerIncomplete": ["เลือกทรัพย์สินและผู้คืน", "Choose the asset and the returner"],
    "checkin.detailReadFailed": ["อ่านข้อมูลสรุปไม่สำเร็จ", "Could not read the summary"],
    "checkin.warningComponentMissing": ["{component} ยังไม่ได้คืน จะอยู่กับ {returner} ที่ {room} และบันทึกเป็นอุปกรณ์ที่ขาดในใบรับคืน",
      "{component} is not back: it stays with {returner} at {room} and is recorded as missing on the return."],
    "checkin.warningRepairOpens": ["จะเปิดใบซ่อมให้", "A repair record will be opened."],
    "checkin.warningRepairJoins": ["ต่อใบซ่อม {repairNo}", "Joins repair record {repairNo}."],
    "checkin.warningBrokenReady": ["สภาพนี้ส่งมอบต่อไม่ได้จนกว่าจะส่งซ่อม", "In this condition it cannot be handed over until it is repaired."],
    "checkin.warningSalvageReady": ["ซากรอตัดจำหน่าย ส่งมอบต่อไม่ได้", "Salvage awaiting disposal cannot be handed over."],
    "assetOperation.summaryCondition": ["สภาพ", "Condition"],
    "assetOperation.badgeHandover": ["มีใบส่งมอบ {documentNo}", "Handover {documentNo}"],
    "assetOperation.badgeLegacy": ["ข้อมูลเก่า ไม่มีใบส่งมอบ", "Legacy record, no handover"],
    "assetOperation.badgeOutstanding": ["ส่วนควบค้างคืน", "Outstanding component"],
    "apiErrors.checkinRepairStatusRequired": ["มีงานซ่อมที่ยังไม่ปิด หลังรับคืนต้องเป็น ส่งซ่อม", "This asset has an open repair. After the return it must go to Send for repair."],
  }
  assert.equal(Object.keys(words).length, 36, "Step 4's keys")
  for (const [key, pair] of Object.entries(words)) assert.deepEqual([word("th", key), word("en", key)], pair, key)
  for (const key of ["checkin.selectCondition", "checkin.photoTypeAssetTag", "checkin.photoTypeSerial", "checkin.photoTypeAccessories", "checkin.returnPhotoChecklist", "checkin.returnPhotoChecklistHelp"])
    for (const locale of ["th", "en"] as const) assert.equal(word(locale, key), undefined, `${locale} ${key}`)
})
```

**Add to `tests/asset-operation-picker-rules.test.ts`.** Its import from `../src/lib/asset-operation-picker-rules.ts` gains `getAssetOperationRowBadge` and `type AssetOperationRowBadgeView`. T4's outstanding-line asserts in this file stay as T4 wrote them.

```ts
test("รับคืน's row badge: the handover's number, ข้อมูลเก่า or ส่วนควบค้างคืน; T4's line below it is not the badge's (group 3 spec §8.2, §8.6, P2-R17)", () => {
  const handover = { id: "co-1", documentNo: "HO-202610-0012", checkoutType: "user", handoverMode: "permanent_assignment", checkoutDate: "2026-10-01T02:00:00.000Z",
    expectedReturnDate: null, conditionBefore: "cond-1", remark: null, destinationLabel: "E001 - สมชาย ใจดี" }
  const handoverBadge: AssetOperationRowBadgeView = { kind: "handover", documentNo: "HO-202610-0012" }
  assert.deepEqual(getAssetOperationRowBadge(row({ badge: "handover", checkout: handover })), handoverBadge)
  assert.equal(getAssetOperationRowBadge(row({ badge: "handover", checkout: { ...handover, documentNo: null } })), null, "a handover without a number has no badge (S-R22)")
  assert.deepEqual(getAssetOperationRowBadge(row({ badge: "legacy", legacy: true })), { kind: "legacy" })
  assert.deepEqual(getAssetOperationRowBadge(row({ badge: "outstanding" })), { kind: "outstanding" })
  assert.equal(getAssetOperationRowBadge(row()), null, "the other modes carry none")
})
```

**Add to `tests/asset-operation-picker-ui.test.ts`** (T4's `outstandingLine` asserts in this file stay):

```ts
test("รับคืน's rows keep their line and gain a badge between the tag line and that line (group 3 spec §8.2, P2-R17)", () => {
  const source = read(PART)
  for (const part of [
    'import { StatusBadge } from "@/components/ui/status-badge"', "const badge = getAssetOperationRowBadge(row)", "{badge ? <RowBadge badge={badge} /> : null}",
    "function RowBadge({ badge }: { badge: AssetOperationRowBadgeView })",
    't("badgeHandover", { documentNo: badge.documentNo })', 't("badgeLegacy")', 't("badgeOutstanding")', 'className="self-start"',
  ]) assert.ok(source.includes(part), part)
  assert.ok(source.indexOf("{badge ? <RowBadge badge={badge} /> : null}") < source.indexOf("<RowDetail row={row} />"), "the badge sits between the tag line and the row's line")
})
```

**Rewrite the frame test in `tests/operation-form-parts-ui.test.ts`:**
- `:32` becomes `/^export function OperationFormFrame\(\{ title, description, actions, summary, footer, phoneSteps = false, summaryOnPhone = true, children \}: OperationFormFrameProps\) \{$/m`.
- The parts list:
  - `:35`'s `'<PageHeader title={title} meta={description} className="mb-6" />'` becomes `'<PageHeader title={title} meta={description} actions={actions} className="mb-6" />'`;
  - `:38`'s summary div becomes `'<div className={cn("min-w-0", (phoneSteps || !summaryOnPhone) && "max-lg:hidden")}>{summary}</div>'`;
  - add `"actions?: ReactNode"` and `"summaryOnPhone?: boolean"`;
  - the `StickyFormFooter` line (`:37`) stays.
- The DESIGN.md test's phrase list (`:79-80`) gains "`summaryOnPhone={false}`" and "`actions`".

**`tests/checkin-page-data.test.ts`:**
- Every `{ call: "search", args: { input: { mode: "checkin", q: "", id: …, assignCustodian: false } } }` gains `detail: true`: `:78`, `:97` and `:100` at HEAD, and Task 4’s assert in its test "?assetId= of an outstanding component starts with its late-return row …" (`state.calls.at(-1)` after the chosen preselect).
- The `@/lib/db` mock gains:
  ```js
  assetCondition: { async findMany(args) { state().calls.push({ call: "assetCondition.findMany", args }); return [{ id: "c-na", nameTh: "ยังไม่ประเมิน" }, { id: "c-good", nameTh: "ดี" }] } },
  ```
- Add this test:
  ```ts
  test("the condition names by id, inactive ones and ยังไม่ประเมิน included: the handover's condition and the asset's read a name, never an id (group 3 spec §8.2, §19.2)", async () => {
    assert.deepEqual(await data.readConditionLabels(), { "c-na": "ยังไม่ประเมิน", "c-good": "ดี" })
    assert.deepEqual(state.calls.at(-1), { call: "assetCondition.findMany", args: { select: { id: true, nameTh: true } } })
  })
  ```

**`tests/asset-operation-search.test.ts`:**
- The fake at `:69` answers `({ assetId, repairNo: \`RP-${assetId}\` })`.
- The `link` helper at `:31` gives `componentAsset: { assetTag, name, currentLocation: { code: "RY-01", name: "ห้องบัญชี" } }`.
- The expected components at `:206` gain `locationLabel: "RY-01 - ห้องบัญชี"`.
- In the open-repair test (`:98-109`), add:
  ```ts
  assert.equal(returning.openRepairNo, "RP-asset-2")
  assert.deepEqual(repaired.calls.find((call) => call.call === "maintenanceTicket.findMany")?.args.select, { assetId: true, repairNo: true })
  ```

**`tests/asset-operation-search-rules.test.ts:85-90`:**
- The `link` helper gives `componentAsset: { assetTag, name, currentLocation: { code: "RY-01", name: "ห้องบัญชี" } }`.
- Both expected components gain `locationLabel: "RY-01 - ห้องบัญชี"`.

- [ ] **Step 2: Run them and see them fail.**
  - Run: `node --test tests/checkin-form-rules.test.ts tests/asset-operation-picker-rules.test.ts tests/asset-operation-picker-ui.test.ts tests/operation-form-parts-ui.test.ts tests/checkin-page-data.test.ts tests/asset-operation-search.test.ts tests/asset-operation-search-rules.test.ts`.
  - Expected:
    - `ERR_MODULE_NOT_FOUND` for `src/lib/checkin-form-rules.ts`;
    - `SyntaxError: The requested module '../src/lib/asset-operation-picker-rules.ts' does not provide an export named 'getAssetOperationRowBadge'`;
    - the frame and picker parts fail;
    - `readConditionLabels is not a function`;
    - the search tests fail on `locationLabel` and `openRepairNo`.

- [ ] **Step 3: Rewrite the pins this task breaks** (lines are HEAD's; find each by its content where an earlier task moved it):
  - **`tests/asset-handover-checkin.test.ts`:**
    - `:55` becomes `assert.match(source, /<NativeSelect value=\{values\.nextStatusId\} required onChange=/)`.
    - `:56` becomes `assert.ok(source.includes("busy: saving || readingForSubmit"))` plus `assert.doesNotMatch(source, /<Button type="submit" busy=\{saving\} className="w-full sm:w-auto">/)`.
    - `:52-54` stay.
  - **`tests/asset-operation-picker-forms.test.ts:81`** becomes `/\{initialRow\?\.eligible && chosen\?\.id === initialRow\.id \? \(\n\s+<FormContextBanner label=\{t\("asset"\)\} value=\{`\$\{initialRow\.assetTag\} - \$\{initialRow\.name\}`\} \/>/`.
  - **`tests/form-frames-ui.test.ts:87-92`** (T7's version):
    - retitle it "the check-in form is the operation frame, with T7's legacy link in its header (group 3 plan 2 Task 8)";
    - `:89`'s PageHeader import assert becomes `source.includes('import { OperationFormFrame } from "@/components/asset-operations/operation-form-frame"')`;
    - T7's `:90` (`<PageHeader title=\{t\("title"\)\} actions=\{legacyLink\} className="mb-6" \/>`) becomes `assert.match(source, /<OperationFormFrame\n\s+title=\{t\("title"\)\}\n\s+description=\{t\("description"\)\}\n\s+actions=\{legacyLink\}\n/)`;
    - keep `doesNotMatch(/<h1\b|PageBackLink/)`.
  - **`tests/operations-sweep-ui.test.ts:90-101`** (T7's version):
    - T7's title becomes "check-in form: the shared asset picker in section 1, the legacy link in the frame's header, the holding strip as one KeyValueList with Nil, and no box around the dropzone (spec 2D D7, D9, D19, M21, M22, M33; server search Task 6; group 3 plan 2 Tasks 7 and 8)".
    - T7's `:92` (`<PageHeader title=\{t\("title"\)\} actions=\{legacyLink\} className="mb-6" \/>\n\s+<ContentPanel>\n\s+<form onSubmit=…`) becomes `assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate id=\{CHECKIN_FORM_ID\}>\n\s+<OperationFormFrame\n[\s\S]*?actions=\{legacyLink\}/)` plus `assert.match(source, /<FormSection number=\{1\} title=\{t\("sectionAsset"\)\}>/)`.
    - `:93` (the picker's prop order) stays.
    - T7's `:94` (`doesNotMatch(source, /legacyReturnCount/, …)`) stays as T7 wrote it.
    - `:96` becomes `1, "the holding strip"`.
    - `:97` stays.
    - `:98` becomes `assert.ok(source.includes("formatCheckoutDay("))` plus `assert.doesNotMatch(source, /function formatDate\b/)`.
    - `:99` becomes `assert.doesNotMatch(source, /\{t\("sendToRepairHelp"\)\}\n\s+<\/Notice>/)`.
    - `:95` and `:100` (the banned list) stay.
  - **`tests/v-track2-o.test.ts:165-213`** (checkin; the date regex is `:192`):
    - `ids` = this task's FIELD_IDS.
    - The rules are this task's seven `check(...)` lines, verbatim from Decisions.
    - Keep the `error={fieldErrors.message("${key}")}` loop (it now covers `missingComponentIds`) and the `blockedReason` line.
    - The date regex becomes `/<Field label=\{t\("returnDate"\)\} id="checkin-return-date" required error=\{fieldErrors\.message\("returnDate"\)\}>\n\s+<Input type="date" value=\{values\.returnDate\} min=\{handoverDay \?\? undefined\} max=\{todayDay\} onChange=\{\(event\) => setField\("returnDate", event\.target\.value\)\} required \/>/`.
    - The SearchableSelect loop adds `"checkin-next-location"`.
    - Add `assert.match(source, /<AssetConditionChoice\n\s+id="checkin-condition-after"\n/)`.
    - `:205` becomes `source.includes('fieldErrors.clear("checkoutId", "returnBy")')` plus `!source.includes('fieldErrors.clear("checkoutId", "returnBy", "conditionAfter", "nextLocationId")')`.
    - `:206` becomes `source.split('if (picked && !values.nextStatusId) fieldErrors.clear("nextStatusId")').length - 1 === 2`.
    - The rest stays.
  - **`tests/v-track2-x.test.ts:115`** becomes `/\n  conditionAfter: "checkin-condition-after",\n  returnDate: "checkin-return-date",\n  nextStatusId: "checkin-next-status",\n/`.
  - **`tests/checkin-send-to-repair-ui.test.ts`:**
    - `:9` becomes `assert.match(form, /returnDate: checkinTodayDay\(\)/)`; the other lines of that test stay.
    - `:25` becomes `assert.ok(form.includes("const nextStatusOptions = checkinNextStatusOptions({ statuses, repairLocked, canCreateRepair })"))` plus `assert.match(form, /nextStatusOptions\.map\(/)`.
    - Retitle `:18` "a row with an open repair returns into ส่งซ่อม only, whoever returns it: the status is set and locked, the notice stays and the hint names the record (S-R43, group 3 spec §8.3)".
    - Add `assert.ok(form.includes('t("nextStatusJoinsRepair", { repairNo: chosen.openRepairNo })'))`.
    - The other lines stay (the nextStatusId rule's text is unchanged).
  - **`tests/checkout-form-rules.test.ts`:**
    - `:81`'s two components gain `locationLabel: "HQ-01 - คลัง IT"`.
    - `:236-240` becomes:
      ```ts
      assert.doesNotMatch(form, /operationConditionDefault|conditionAfter: current\.conditionAfter \|\||nextLocationId: current\.nextLocationId \|\|/)
      assert.ok(form.includes('conditionAfter: "",'), "รับคืน's condition starts empty, the legacy backfill included (spec §8.3, P2-R9)")
      ```
    - Retitle `:226` "the shared condition default skips a condition the operation does not offer; รับคืน starts with none, the legacy backfill included (group 3 spec §19.2, §8.3)".
  - **`tests/legacy-checkin-flow.test.ts`** (T7's version; the page source is CRLF, so each regex stays on one line):
    - the page test (`:10-20`, T7's title):
      - `:13` becomes `/getAssetOperationMasterOptions\(\{ conditionsFor: "checkin" \}\)/`;
      - add `/readConditionLabels\(\)/` and `/readCheckinDepartment\(prisma\)\.catch\(\(\) => null\)/`;
      - T7's lines that replaced `:18` (`legacyLink={legacyLink}`, the `getTranslations` line, the `<Link` regex, `legacyReturnLink`, the href asserts) stay as T7 wrote them; the rest stays.
    - T7's messages test (`:54-89`) stays; no key it lists is deleted here.
    - `:22-36`:
      - retitle it "a legacy row asks once, then backfills the handover and continues the normal return with no condition or room filled in; with no return department the confirm is refused (spec 6.3, group 3 spec §8.3, P2-R8)";
      - the snippet `'buildAssetOperationSearchHref({ mode: "checkin", id: assetId })'` becomes `…, detail: true })`;
      - `'fieldErrors.clear("checkoutId", "returnBy", "conditionAfter", "nextLocationId")'` becomes `'fieldErrors.clear("checkoutId", "returnBy")'`;
      - add `'if (!returnDepartment) {'`.
  - **`tests/e2e-transactions.test.ts:137`:** the loop becomes `["transfer", "bulk-move"]`. Add `assert.match(read("src/app/[locale]/(dashboard)/asset-management/checkin/page.tsx"), /getAssetOperationMasterOptions\(\{ conditionsFor: "checkin" \}\)/, "รับคืน names its conditions (group 3 plan 2 Task 8)")`.
  - **`tests/form-migration-guards.test.ts`:**
    - `:60-61`: the comment becomes `// Group 3: the frame of ส่งมอบ, รับคืน and โอนย้าย; plan 2 added /th/asset-management/checkin, plan 3 adds /transfer when its form moves onto it.`, and the row becomes `["/th/asset-management/checkout", "/th/asset-management/checkin"]`.
    - `:90` becomes `[2, 0, 0]`, with the comment `// Group 3 plan 2 Task 8: the three local Selects go (the room is a SearchableSelect, the condition the chips); the return date's Input and the next status's NativeSelect keep theirs.`
  - **`tests/api-error-catalog.test.ts:119-121`:** the expected words become `"มีงานซ่อมที่ยังไม่ปิด หลังรับคืนต้องเป็น ส่งซ่อม"` and `"This asset has an open repair. After the return it must go to Send for repair."`

- [ ] **Step 4: Messages.**
  - Write `C:/Users/Eltross/AppData/Local/Temp/claude/D--Antigravity-asset-system/f250ea8d-3040-422b-ad7a-15dd9aed94b9/scratchpad/tx-group/plan2/t8-messages.json` with `"set"` (th, en) and `"delete": ["checkin.selectCondition", "checkin.photoTypeAssetTag", "checkin.photoTypeSerial", "checkin.photoTypeAccessories", "checkin.returnPhotoChecklist", "checkin.returnPhotoChecklistHelp"]` (no reader is left).
  - Run `node scripts/messages-edit.mjs <that file>`. Expected: `messages updated: 36 th, 36 en, 6 deleted`.
  - The legacy link's words are T7's (`checkin.legacyReturnLink`; `checkin.legacyReturnCount` stays deleted), and `assetOperation.outstandingLine` is T4's. Neither is set here (X5, X6).
  - The keys, as th / en:
  - **Page and sections:**
    - `checkin.description`: "บันทึกการรับทรัพย์สินคืน เมื่อบันทึกแล้วระบบจะออกเลขใบรับคืนให้" / "Record an asset's return. The return number is issued when you save."
    - `checkin.sectionAsset`: "ทรัพย์สินที่รับคืน" / "Asset to return"
    - `checkin.sectionReturn`: "รายละเอียดการคืน" / "Return details"
    - `checkin.sectionEvidence`: "หลักฐาน" / "Evidence"
    - `checkin.sectionEvidenceOptional`: "ไม่บังคับ แต่แนะนำ" / "Optional, but recommended"
  - **The holding strip:**
    - `checkin.handedOverAt`: "ส่งมอบเมื่อ" / "Handed over"
    - `checkin.heldFor`: "{date} · ถือมา {days} วัน" / "{date} · held for {days} days"
    - `checkin.heldLegacy`: "ข้อมูลเก่า (ใบส่งมอบย้อนหลัง)" / "Legacy record (backdated handover)"
    - `checkin.permanentAssignmentShort` (changed, decision 5; the RT- page reads it too): "มอบหมายใช้งานประจำ" / "Permanent assignment"
    - `checkin.temporaryLoanShort` (changed, decision 5): "ยืมใช้ชั่วคราว" / "Temporary loan"
  - **The checklist:**
    - `checkin.componentsLegend`: "ส่วนควบที่ต้องได้คืน · ติ๊กชิ้นที่ได้คืนแล้ว" / "Components to get back · tick each one returned"
    - `checkin.componentsNote`: "ชิ้นที่ไม่ได้ติ๊กจะยังอยู่กับผู้คืน และบันทึกเป็นอุปกรณ์ที่ขาดในใบรับคืน" / "An unticked component stays with the returner and is recorded as missing on the return."
    - `checkin.componentNotReturned`: "ยังไม่ได้คืน" / "not returned"
  - **Section 2:**
    - `checkin.returnByHolder`: "ผู้ถือครองตอนนี้" / "Current holder"
    - `checkin.receiveByYou`: "คุณ" / "You"
    - `checkin.nextStatusAfterReturn`: "หลังรับคืนให้เป็น" / "After the return"
    - `checkin.sendToRepairHelp` (changed, decision 4; now the hint): "บันทึกแล้วระบบจะเปิดใบซ่อมให้อัตโนมัติ" / "On saving, a repair record opens automatically."
    - `checkin.nextStatusJoinsRepair`: "ต่อใบซ่อม {repairNo} ที่ยังไม่ปิด" / "Joins the open repair record {repairNo}."
  - **Section 3 (P2-R10):**
    - `checkin.photoTypeOverview` (changed): "ภาพรวม" / "Overview"
    - `checkin.photoTypeDamage` (changed): "จุดเสียหาย" / "Damage"
    - `checkin.signatureMissing`: "ยังไม่มี (ไม่บังคับ)" / "Not yet (optional)"
  - **The summary, the footer and the warnings:**
    - `checkin.summaryComponentsBack`: "ได้คืน {returned} · ขาด {missing}" / "{returned} back · {missing} missing"
    - `checkin.summaryFootnote`: "เลขใบรับคืนออกให้หลังบันทึก แล้วเปิดใบรับคืนให้พิมพ์ทันที" / "The return number is issued on saving, and the return document opens for printing."
    - `checkin.footerDescription`: "รับคืน {tag} จาก {returner}" / "Return {tag} from {returner}"
    - `checkin.footerIncomplete`: "เลือกทรัพย์สินและผู้คืน" / "Choose the asset and the returner"
    - `checkin.detailReadFailed`: "อ่านข้อมูลสรุปไม่สำเร็จ" / "Could not read the summary"
    - `checkin.warningComponentMissing`: "{component} ยังไม่ได้คืน จะอยู่กับ {returner} ที่ {room} และบันทึกเป็นอุปกรณ์ที่ขาดในใบรับคืน" / "{component} is not back: it stays with {returner} at {room} and is recorded as missing on the return."
    - `checkin.warningRepairOpens`: "จะเปิดใบซ่อมให้" / "A repair record will be opened."
    - `checkin.warningRepairJoins`: "ต่อใบซ่อม {repairNo}" / "Joins repair record {repairNo}."
    - `checkin.warningBrokenReady`: "สภาพนี้ส่งมอบต่อไม่ได้จนกว่าจะส่งซ่อม" / "In this condition it cannot be handed over until it is repaired."
    - `checkin.warningSalvageReady`: "ซากรอตัดจำหน่าย ส่งมอบต่อไม่ได้" / "Salvage awaiting disposal cannot be handed over."
  - **Shared and picker:**
    - `assetOperation.summaryCondition`: "สภาพ" / "Condition"
    - `assetOperation.badgeHandover`: "มีใบส่งมอบ {documentNo}" / "Handover {documentNo}"
    - `assetOperation.badgeLegacy`: "ข้อมูลเก่า ไม่มีใบส่งมอบ" / "Legacy record, no handover"
    - `assetOperation.badgeOutstanding`: "ส่วนควบค้างคืน" / "Outstanding component"
  - **The field's new name (D10):** `apiErrors.checkinRepairStatusRequired` (changed): "มีงานซ่อมที่ยังไม่ปิด หลังรับคืนต้องเป็น ส่งซ่อม" / "This asset has an open repair. After the return it must go to Send for repair."
  - Then run `node --test tests/thai-glossary.test.ts tests/messages-parity.test.ts`. Expected: PASS.

- [ ] **Step 5: Implement**, in this order:
  1. `checkin-form-rules.ts`, to the Decisions. It imports `getBangkokDateKey` from `./preventive-maintenance.ts` and nothing from `./checkin-route-rules.ts`.
  2. The search additions: the select, `AssetOperationChosenComponent`, `buildAssetOperationRowDetail`, the row's `openRepairNo`, and the open-repair read.
  3. The picker rules and `asset-operation-picker.tsx`. Add `AssetOperationRowBadgeView` and `getAssetOperationRowBadge` below T4's `getAssetOperationRowDetail`. In the picker, import `getAssetOperationRowBadge` and `type AssetOperationRowBadgeView` beside the existing picker-rules imports; `StatusBadge` comes from `@/components/ui/status-badge`. `RowDetail` is not touched.
  4. The frame.
  5. `checkin-page-data.ts`:
     - `searchById` passes `detail: true`;
     - add `readConditionLabels`, which reads `prisma.assetCondition.findMany({ select: { id: true, nameTh: true } })` (no `where`) into `Object.fromEntries`.
  6. The page, from T7's version (T7's `t`, `legacyLink` block, imports and `legacyLink={legacyLink}` stay).
  7. The form, from T7's version (the `legacyLink` prop and its comment stay; it moves from `PageHeader` to the frame's `actions`).
  8. DESIGN.md: at the end of the "The frame:" sub-bullet (`:550`), add: "`actions` fills the header's right side (รับคืน's legacy link, a server node from its page), and `summaryOnPhone={false}` hides the summary column below `lg` while the bar stays (รับคืน, spec §8.8); `phoneSteps` hides both (ส่งมอบ's own steps)."
  - Run `node --test tests/checkin-form-rules.test.ts`. Expected: PASS.

- [ ] **Step 6: Run the task's tests, then the gates.**
  - The focused run:
    ```
    node --test tests/checkin-form-rules.test.ts tests/asset-operation-picker-rules.test.ts tests/asset-operation-picker-ui.test.ts tests/operation-form-parts-ui.test.ts tests/checkin-page-data.test.ts tests/asset-operation-search.test.ts tests/asset-operation-search-rules.test.ts tests/asset-handover-checkin.test.ts tests/asset-operation-picker-forms.test.ts tests/form-frames-ui.test.ts tests/operations-sweep-ui.test.ts tests/v-track2-o.test.ts tests/v-track2-x.test.ts tests/checkin-send-to-repair-ui.test.ts tests/checkout-form-rules.test.ts tests/legacy-checkin-flow.test.ts tests/e2e-transactions.test.ts tests/e2e-cross-cutting.test.ts tests/form-migration-guards.test.ts tests/api-error-catalog.test.ts tests/checkin-choice.test.ts tests/file-evidence-ui.test.ts tests/asset-operation-confirmation-ui.test.ts tests/validation-guards.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/thai-glossary.test.ts
    ```
    Expected: PASS.
  - Then `npm test`, `npx tsc --noEmit` and `npm run lint` (0 errors). A pin that fails outside Step 3's list is rewritten in this commit and named in the report.

- [ ] **Step 7: Commit.**
```bash
git add src/lib/checkin-form-rules.ts src/components/asset-operations/checkin-form.tsx "src/app/[locale]/(dashboard)/asset-management/checkin/page.tsx" src/components/asset-operations/operation-form-frame.tsx src/components/ui/asset-operation-picker.tsx src/lib/asset-operation-picker-rules.ts src/lib/asset-operation-search-rules.ts src/lib/asset-operation-search.ts src/lib/checkin-page-data.ts DESIGN.md messages/th.json messages/en.json tests/checkin-form-rules.test.ts tests/asset-operation-picker-rules.test.ts tests/asset-operation-picker-ui.test.ts tests/operation-form-parts-ui.test.ts tests/checkin-page-data.test.ts tests/asset-operation-search.test.ts tests/asset-operation-search-rules.test.ts tests/asset-handover-checkin.test.ts tests/asset-operation-picker-forms.test.ts tests/form-frames-ui.test.ts tests/operations-sweep-ui.test.ts tests/v-track2-o.test.ts tests/v-track2-x.test.ts tests/checkin-send-to-repair-ui.test.ts tests/checkout-form-rules.test.ts tests/legacy-checkin-flow.test.ts tests/e2e-transactions.test.ts tests/form-migration-guards.test.ts tests/api-error-catalog.test.ts
git commit -F - <<'EOF'
feat(checkin): รับคืน in three sections with the สรุปก่อนบันทึก card (holder, the return department by the shared rule, status, room, condition, components back and missing), the components checklist, ผู้รับคืน as you, condition chips with no default, the room search, the date bounds, ส่งซ่อม only with maintenance:create, the row badges, and the legacy link in the frame's header (group 3 plan 2 Task 8)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

**Review Focus this task pins:**
- 4 (without `maintenance:create`: a locked row keeps ส่งซ่อม, an unlocked row never offers or auto-picks it): the next-status and auto-pick tests.
- 5 (a legacy row is refused before its backfill when the return department does not resolve): the `chooseRow` order pin.
- 1 (a return with every component ticked sends no `missingComponentIds` key): the `body.append` loop runs over `missingComponents` only.

---

### Task 9: The late-return panel on รับคืน and the ส่งมอบ outstanding warning (group 3 spec §8.6 page, §7.1 last bullet, §7.3 ส่วนควบ row; P2-R4, P2-R19, with P2-R3's body, P2-R7's late bullets, P2-R8 and P2-R13's late bound)

Choosing an outstanding component on รับคืน shows a short panel in place of sections 2 and 3. The panel lives in the same `<form>` and the same review dialog. It saves to Task 5's `component-return` route and then opens the RT- page. On ส่งมอบ, a parent with a component still outstanding lists that component in a warning Notice in section 1, which is phone step 1 too. The summary's ส่วนควบ row adds "ค้างคืน M". Both pages read the by-id detail (`detail=1`), which gains the parent's outstanding components and, for an outstanding component's own row, its parent's room and department.

Line numbers are HEAD's (`452b72d7`). Tasks 1-8 edit several of these files first, so each block is also named by its content. `checkin-form.tsx` is Task 8's rebuild: this task adds a branch to it and leaves Task 8's sections, checks and words as they are.

**Rulings this task applies (copied from the plan's rulings):**
- **P2-R4:** the late-return panel is a branch of `checkin-form.tsx`: one `<form>` and one frame submit.
  - `handleSubmit` switches on the row kind. Sections 2 and 3 are not rendered for the late row (a conditional render, so ids stay unique).
  - The panel's ids are `checkin-late-*`.
  - Its outcome comes with the row: `lateReturn: { linkId, checkinId, checkinNo, checkinDate, parent: { id, assetTag, name }, parentInStock }`.
  - It shows the room picker only when `parentInStock` is false, together with the notice that the component will stand alone in IT stock.
  - After the save, it opens the RT- page.
- **P2-R19:** ส่งมอบ shows an outstanding component of the chosen asset in a warning Notice in section 1, which is phone step 1 too.
  - The summary's ส่วนควบ row adds "ค้างคืน M".
  - The detail answer gains `outstandingComponents: { assetTag, name, holderName, checkinNo }[]`.
  - The ส่วนควบ row is drawn when any component is installed (travelling or staying) or outstanding; Step 3b says why.
- **P2-R3 (the body this task sends):**
  - `POST /api/assets/[id]/component-return`, where `[id]` is the component.
  - Body: `{ componentLinkId, checkinId, expectedOutcome: "reattached" | "standalone", returnDate, receiveBy, receiveByEmployeeId?, conditionId?, nextLocationId?, remark? }`.
  - Answer: 201 `{ checkinId, documentNo, outcome }`.
  - A claim that fails, or an outcome that differs from `expectedOutcome`, answers 409 `ASSET_CHANGED_DURING_OPERATION`. It never answers a field error for a field that is not on screen.
- **P2-R7 (late bullets):**
  - A re-attached late return takes the parent's room and the parent's department, and its holder is cleared.
  - A standalone late return takes the chosen room and the return department, and its holder is cleared. A ส่วนกลาง component standing alone keeps its own department (spec §6: ส่วนกลาง keeps its responsible department "on checkout, return and transfer"; a late return is a return).
- **P2-R8:** every late return asks for the return department. The page reads it for the summary. When it does not resolve, the save is refused with 409 `ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE`.
- **P2-R13 (late bound):** a late return's date is no earlier than the RT-'s return date and no later than today, in Bangkok days. It is checked on the client (`min`/`max` and `validate`) and on the server.

**Files:**
- Create:
  - `src/lib/checkin-late-return-rules.ts`: pure, relative `.ts` imports only.
  - `tests/checkin-late-return-rules.test.ts`.
- Modify:
  - `src/lib/asset-operation-search-rules.ts`:
    - after `assetOperationComponentLinkSelect` / `AssetOperationComponentLink` (`:199-203`), add the two new selects and their types;
    - `AssetOperationChosenDetail` (`:212-228`);
    - `buildAssetOperationRowDetail` (`:449-480`), and add the two new builders after it.
  - `src/lib/asset-operation-search.ts`:
    - the imports (`:1-24`);
    - the read-budget comment (`:26-29`, in Task 4's wording);
    - `readChosenDetail` (`:107-121`);
    - the `if (input.detail)` line (`:158`).
  - `src/lib/checkout-form-rules.ts`: the imports (`:8`), `CheckoutSummaryWords` (`:23-36`), after `checkoutComponents` (`:52-56`), and the ส่วนควบ row of `buildCheckoutSummaryRows` (`:149-158`) with its doc comment (`:85-88`).
  - `src/components/asset-operations/checkout-form.tsx`:
    - the `checkout-form-rules` import (`:37-53`);
    - the summary words (`:216-229`);
    - after `const { travelling, staying } = checkoutComponents(values.asset)` (`:240`);
    - section 1, after the `staying` Notice (`:533-537`).
  - `src/components/asset-operations/checkin-form.tsx`, Task 8's version:
    - imports;
    - a module-level `LATE_FIELD_IDS`;
    - state;
    - the picker's `onChange` handler;
    - `handleSubmit`;
    - a new `submitLateReturn`;
    - the frame's `summary` and `footer`;
    - sections 2-3 (the branch);
    - the review dialog's props.
  - `messages/th.json`, `messages/en.json`, only through `node scripts/messages-edit.mjs`.
- Test (modify):
  - `tests/checkout-form-rules.test.ts`;
  - `tests/asset-operation-search-rules.test.ts`;
  - `tests/asset-operation-search.test.ts`;
  - Task 8's `tests/checkin-form-rules.test.ts`: its `row()` helper's detail and three frame-prop pins (see the pins below).
- **Do not touch:**
  - `src/lib/component-late-return.ts` (Tasks 4 and 5);
  - `src/lib/asset-department-rule.ts` (Tasks 1 and 5; this task only calls `getLateReturnDepartmentId`);
  - the `component-return` route (Task 5);
  - `buildAssetOperationComponentLinkWhere` (pinned exactly, `tests/asset-operation-search-rules.test.ts:96-98`);
  - the E2E specs and helpers (Task 11);
  - the phone layout of รับคืน (Task 10).

**Pins this task breaks (each is rewritten in this commit, Step 1):**
- `tests/asset-operation-search-rules.test.ts:87-93`: `buildAssetOperationRowDetail` takes a fourth argument, and the expected detail gains `outstandingComponents: []`.
- `tests/asset-operation-search.test.ts`:
  - the fake `:44-80` (Task 4's version): `assetComponent.findMany` needs a branch for the parent's outstanding read;
  - `:204-207`: the detail deep-equal gains `outstandingComponents: []`;
  - `:209` (Task 4's version): the list of `assetComponent.findMany` wheres gains a third entry.
- `tests/checkout-form-rules.test.ts`:
  - `:37-49`: the `row()` helper's detail gains `outstandingComponents: []` (tsc: the field is required);
  - `:64-77`: `words` gains `componentsOutstanding` (tsc: the key is required).
- Task 8's `tests/checkin-form-rules.test.ts`:
  - the `row()` helper's detail (`… locationBranchLabel: "สำนักงานใหญ่", components: [], ...d }`): add `outstandingComponents: [],` after `components: [],` (tsc: the field is required);
  - the form-source test's part list, on its `"summary={<OperationSummaryCard"` line, holds `"rows={summaryRows}", "checklist={checklist}", 'footnote={t("summaryFootnote")}'`. This task turns those three frame props into ternaries (Step 3d), so the three strings become `"rows={lateReturn ? lateSummaryRows : summaryRows}"`, `"checklist={lateReturn ? lateChecklist : checklist}"` and `'footnote={lateReturn ? lateFootnote : t("summaryFootnote")}'`.
- Any other `AssetOperationChosenDetail` literal that `npx tsc --noEmit` names gains `outstandingComponents: []`. At HEAD the literals are in the three test files above; Task 8's helper is the fourth.
- Any Task 8 source pin on `checkin-form.tsx` that counts what this branch adds gains the late branch in its count. Examples: a count of `<SearchableSelect`, `<FormSection` or `<AssetConditionChoice`. Name each such pin in the report.

**Interfaces:**
- Consumes:
  - **Task 3:** `outstandingLinkWhere` from `src/lib/asset-component-outstanding.ts`. It is a constant where fragment, `{ status: "outstanding", removedAt: null }`, spread into a Prisma `AssetComponentWhereInput`, as Task 4 reads it. The same module's link-status constant is `COMPONENT_LINK_OUTSTANDING`; this task does not need it (the test fake compares the literal `"outstanding"`), and it is not Task 4's refusal code `"ASSET_COMPONENT_OUTSTANDING"`.
  - **Task 4:** `type AssetOperationLateReturn = { linkId: string; checkinId: string; checkinNo: string | null; checkinDate: string | null; parent: { id: string; assetTag: string; name: string }; parentInStock: boolean }` and `AssetOperationSearchRow.lateReturn?` / `.badge?` (`src/lib/asset-operation-search-rules.ts`).
    - In รับคืน an outstanding component's row is eligible on the `componentReturn` path and carries `lateReturn` (`checkinDate` is the RT-'s `returnDate` as ISO). `parentInStock` is `getLateReturnOutcome(...) === "reattached"`.
    - `AssetOperationSearchDb.assetCheckin: { findMany(args: object): Promise<unknown[]> }`. The search test's fake gains `outstanding`/`checkins` data and the fixture `outstandingLink(id, componentAssetId)`, whose parent is `asset-p` in IT stock.
    - The detail read happens after Task 4's facts round. In it, `assetComponent.findMany` with `componentAssetId: { in: ids }` is the first component read.
  - **Task 5:**
    - The route as in P2-R3. Its `fieldErrors` keys are `receiveBy`, `returnDate`, `conditionId` and `nextLocationId` (P2-R3's body names). A stand-alone body without a room answers `{ nextLocationId: "locationRequired" }`; an inactive room answers `ASSET_CHECKIN_LOCATION_INACTIVE` under `nextLocationId`, only for a stand-alone return.
    - The late lower bound refuses with code `COMPONENT_RETURN_DATE_BEFORE_CHECKIN`, catalog key `componentReturnDateBeforeCheckin`, under `returnDate`; its words are Task 5's ("วันที่คืนต้องไม่ก่อนวันที่รับคืนเครื่องหลัก"). The future bound reuses Task 2's code (`CHECKIN_RETURN_DATE_IN_FUTURE` → `checkinReturnDateInFuture`).
    - The schema's `remark` is `optionalText` (`src/lib/validations/shared.ts:3`), which has no length cap, so the panel sets no limit on it and `LATE_FIELD_IDS` has no `remark` key.
    - `type ComponentLateReturnOutcome = "reattached" | "standalone"` (from `componentLateReturnOutcomes`), in `src/lib/component-late-return.ts`. This task uses it as its outcome type and declares no union of its own.
    - `getLateReturnDepartmentId(input: { outcome: ComponentLateReturnOutcome; ownership: AssetOwnershipType; parentDepartmentId: string | null; returnDepartmentId: string; currentDepartmentId: string | null }): string | null`, in `src/lib/asset-department-rule.ts` (pure, `import type` only). Re-attached, it returns `parentDepartmentId` for every ownership. Standing alone, it returns `currentDepartmentId` for `shared` (ส่วนกลาง keeps its department, P2-R7) and `returnDepartmentId` for every other ownership. The route calls it with the same five fields, so the summary and the save agree.
  - **Task 2:** `checkinReturnDateError(input: { returnDay: string; todayDay: string; handoverDay: string | null })` and `CHECKIN_RETURN_DATE_ERROR_KEYS` from `src/lib/checkin-route-rules.ts` (pure). Their code is `"CHECKIN_RETURN_DATE_IN_FUTURE" | "CHECKIN_RETURN_DATE_BEFORE_HANDOVER" | null`, and the keys map `CHECKIN_RETURN_DATE_IN_FUTURE` to `"checkinReturnDateInFuture"`.
  - **Task 1:** the code `ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE` and its message `apiErrors.checkinDepartmentUnavailable` (the full sentence telling an admin what to fix), read through `apiError.describe`.
  - **Task 8**, the names in its `checkin-form.tsx` (Task 8 states it keeps `chooseRow`, `setEmployeeField`, `setField`, `leaveReview` and `submitCheckin`; if its committed code names one differently, use that name and adjust the matching source pin):
    - The props `employees`, `locations` (`{ id, label }`, "code - name"), `conditions` (รับคืน's six, `{ id, label }`), `currentEmployeeId` and `returnTo`.
    - The prop `conditionLabels: Record<string, string>`: every condition's Thai name by id, ยังไม่ประเมิน and inactive ones included (the page's `readConditionLabels()`). Task 8 deletes HEAD's checkin-only `conditionLabelById`.
    - The prop `returnDepartment: CheckinReturnDepartment | null` (`{ id: string; code: string; name: string }`): the page's `readCheckinDepartment`, null when it does not resolve.
    - The state `chosen` / `setChosen`, `values` (with `returnDate` and `receiveBy`), `receiveByEmployeeId`, `saving` / `setSaving` and `reviewOpen` / `setReviewOpen`.
    - The functions:
      - `setField(field, value)`;
      - `setEmployeeField("receiveBy", employeeId)`;
      - `leaveReview()`;
      - the picker's `onChange` handler `chooseRow(row)`;
      - `submitCheckin()`;
      - `loadRowDetail(assetId)`, the by-id detail read that Task 8's pick calls. It fetches `buildAssetOperationSearchHref({ mode: "checkin", id: assetId, detail: true })`, ends with `setChosen((current) => withCheckoutAssetDetail(current, answered))` (the answered row replaces `chosen`, `lateReturn` included, only while it is still the chosen one) and returns the answered row or `null`.
    - The named value `detailFailedNotice` (the summary warning with ลองอีกครั้ง when the detail read failed).
    - The "คุณ" tag on `#checkin-receive-by`: `hint={receiveByEmployeeId && receiveByEmployeeId === currentEmployeeId ? t("receiveByYou") : undefined}`.
    - The translators `t` (`checkin`), `tOperation` (`assetOperation`) and `tCommon`, and `apiError` (`useApiError()`); Task 8 reads the department words as `apiError.describe("ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE").message`.
    - The frame `OperationFormFrame` with its `summary`, `footer` and `summaryOnPhone={false}`; the summary props `rows={summaryRows}`, `checklist={checklist}`, `warnings={[...warningLines, ...(detailFailedNotice ? [detailFailedNotice] : [])]}` and `footnote={t("summaryFootnote")}`; the footer's `description: chosen && values.returnBy ? t("footerDescription", …) : t("footerIncomplete")`.
    - `OperationSummaryCard({ rows, checklist, warnings, footnote, … })` and the one `OperationReviewDialog`.
  - Master:
    - `getBangkokDateKey(date: Date): string` (`src/lib/preventive-maintenance.ts:50`; its only import is `import type`);
    - `required`, `maxLength` (`src/lib/validation-rules.ts:23,36`: codes `"required"`, `"tooLong"`);
    - `formatCheckoutDay(day, locale)` (`src/lib/checkout-phone-steps.ts:39`);
    - `assetOperationRowLabel(row)` (`src/lib/asset-operation-form-rules.ts:7`: `"<tag> - <name>"`);
    - `buildOperationReviewSummary` (`src/lib/asset-operation-review.ts:8`);
    - `AssetConditionChoice` (`condition-choice.tsx`: an empty `value` chooses none; option ids are radio values);
    - `Notice` (`notice.tsx`: it passes `data-*` and `role` to its div; `title` gives a boxed warning a title line).
- Produces:
  ```ts
  // src/lib/asset-operation-search-rules.ts
  export const assetOperationParentOutstandingLinkSelect = {
    componentAssetId: true, referenceId: true,
    componentAsset: { select: { assetTag: true, name: true, custodian: { select: { fullNameTh: true } } } },
  } satisfies Prisma.AssetComponentSelect
  export type AssetOperationParentOutstandingLink = Prisma.AssetComponentGetPayload<{ select: typeof assetOperationParentOutstandingLinkSelect }>
  /** A component of the chosen asset that did not come back (group 3 spec §7.1, §8.5): listed apart, it does not travel. */
  export type AssetOperationOutstandingComponent = { assetTag: string; name: string; holderName: string | null; checkinNo: string | null }
  export function buildAssetOperationOutstandingComponents(
    links: readonly AssetOperationParentOutstandingLink[], checkinNoById: ReadonlyMap<string, string | null>,
  ): AssetOperationOutstandingComponent[]
  export const assetOperationLateReturnParentSelect = {
    id: true, currentLocationId: true, currentLocation: { select: { code: true, name: true } }, departmentId: true, department: { select: { name: true } },
  } satisfies Prisma.AssetSelect
  export type AssetOperationLateReturnParentRecord = Prisma.AssetGetPayload<{ select: typeof assetOperationLateReturnParentSelect }>
  /** Where a re-attached component goes (spec §8.6, P2-R7): its parent's room and department. */
  export type AssetOperationLateReturnParent = { locationId: string; locationLabel: string; departmentId: string | null; departmentName: string | null }
  export function buildAssetOperationLateReturnParent(parent: AssetOperationLateReturnParentRecord): AssetOperationLateReturnParent
  // AssetOperationChosenDetail gains:
  //   outstandingComponents: AssetOperationOutstandingComponent[]          (required; [] when none)
  //   lateReturnParent?: AssetOperationLateReturnParent                     (only on an outstanding component's own row)
  export function buildAssetOperationRowDetail(asset, links, handedOverComponentIds, outstandingComponents: AssetOperationOutstandingComponent[]): AssetOperationChosenDetail

  // src/lib/checkout-form-rules.ts
  // CheckoutSummaryWords gains componentsOutstanding: (count: number) => string
  export type CheckoutOutstandingWords = { with: (holder: string) => string; since: (documentNo: string) => string }
  export function checkoutOutstandingComponents(row: AssetOperationSearchRow | null): AssetOperationOutstandingComponent[]
  export function checkoutOutstandingLines(row: AssetOperationSearchRow | null, words: CheckoutOutstandingWords): string[]

  // src/lib/checkin-late-return-rules.ts
  // The outcome type is Task 5's ComponentLateReturnOutcome ("reattached" | "standalone"), imported as a type from ./component-late-return.ts.
  export type LateReturnField = "receiveBy" | "returnDate" | "conditionId" | "nextLocationId"
  export type LateReturnDraft = { conditionId: string; nextLocationId: string; remark: string }
  export const EMPTY_LATE_RETURN_DRAFT: LateReturnDraft          // { conditionId: "", nextLocationId: "", remark: "" }
  export type LateReturnRequestBody = {
    componentLinkId: string; checkinId: string; expectedOutcome: ComponentLateReturnOutcome; returnDate: string; receiveBy: string
    receiveByEmployeeId?: string; conditionId?: string; nextLocationId?: string; remark?: string
  }
  export function lateReturnOf(row: AssetOperationSearchRow | null): AssetOperationLateReturn | null
  export function lateReturnOutcome(lateReturn: AssetOperationLateReturn): ComponentLateReturnOutcome
  export function lateReturnDays(lateReturn: AssetOperationLateReturn | null, now: Date): { todayDay: string; checkinDay: string | null }
  export function validateLateReturn(
    values: LateReturnDraft & { receiveBy: string; returnDate: string },
    context: { outcome: ComponentLateReturnOutcome; todayDay: string; checkinDay: string | null },
  ): Partial<Record<LateReturnField, string>>
  export function buildLateReturnBody(
    lateReturn: AssetOperationLateReturn, values: LateReturnDraft & { receiveBy: string; receiveByEmployeeId: string; returnDate: string },
  ): LateReturnRequestBody
  export type LateReturnSummaryWords = {
    parent: string; holder: string; location: string; department: string; condition: string; none: string; notChosen: string
    kept: (value: string) => string; outstandingOf: (parentTag: string) => string; departmentUnavailable: string
  }
  export type LateReturnSummaryRow = { key: "parent" | "holder" | "location" | "department" | "condition"; label: string; now: string; next: string; changed: boolean }
  export function buildLateReturnSummaryRows(input: {
    row: AssetOperationSearchRow; lateReturn: AssetOperationLateReturn; draft: LateReturnDraft
    conditions: readonly { id: string; label: string }[]; locations: readonly { id: string; label: string }[]
    currentConditionLabel: string | null; returnDepartment: { id: string; name: string } | null
  }, words: LateReturnSummaryWords): LateReturnSummaryRow[]
  export function buildLateReturnChecklist(
    input: { eligible: boolean; receiveBy: string; outcome: ComponentLateReturnOutcome; nextLocationId: string },
    words: { asset: string; receiver: string; location: string },
  ): Array<{ key: "asset" | "receiver" | "location"; label: string; done: boolean }>
  ```
  - `LateReturnSummaryRow` and the checklist items can be assigned to `OperationSummaryRow` and `OperationSummaryCheck`.
  - **Hooks for Task 11:**
    - the panel root `[data-checkin-late-panel]`;
    - the ids `#checkin-late-receive-by`, `#checkin-late-return-date`, `#checkin-late-condition` (a radio group, with "คงเดิม" first), `#checkin-late-location` (stand-alone only) and `#checkin-late-remark`;
    - the checkout Notice `[data-checkout-outstanding]`, which reads "ยังค้างคืน 1 รายการ: <tag> <name> · อยู่กับ <holder name> · ตั้งแต่ <RT->"; `[data-summary-row="components"]` then contains "ค้างคืน 1 รายการ";
    - the late save posts JSON to `/api/assets/<component id>/component-return` (201) and lands on `/<locale>/asset-management/checkins/<RT- id>`, the original RT-, not a new one;
    - `#checkin-next-status` and `#checkin-next-location` are absent while the panel shows, and the late branch replaces sections 2 and 3 on every width (Task 10's people line and phone footer counts do not apply to it).
  - **The words, for Task 11's `TX_WORDS`:**
    - `checkin.lateFooter` "รับคืน {tag} จาก {holder}";
    - `checkin.lateSectionTitle`;
    - `checkin.lateReattachNotice` / `lateStandaloneNotice`;
    - `checkout.componentsOutstanding` "ยังค้างคืน {count} รายการ: {list}";
    - `checkout.summaryComponentsOutstanding` "ค้างคืน {count} รายการ".
  - **Every late-return save is refused when the return department does not resolve (P2-R8).** In that case the summary's department row reads `checkin.lateDepartmentUnavailable`, and the card shows `apiErrors.checkinDepartmentUnavailable` as a warning. Both are below.

- [ ] **Step 1: Write the failing tests, and rewrite the pins above.**

`tests/checkin-late-return-rules.test.ts` (new):
```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  EMPTY_LATE_RETURN_DRAFT, buildLateReturnBody, buildLateReturnChecklist, buildLateReturnSummaryRows, lateReturnDays, lateReturnOf, lateReturnOutcome,
  validateLateReturn, type LateReturnSummaryRow, type LateReturnSummaryWords,
} from "../src/lib/checkin-late-return-rules.ts"
import type { AssetOperationChosenDetail, AssetOperationLateReturn, AssetOperationSearchRow } from "../src/lib/asset-operation-search-rules.ts"

// The late return of an outstanding component on รับคืน (group 3 spec §8.6, P2-R4): which row, its outcome, its checks,
// its request, its summary and checklist; then the form's source and the words of this task.
const read = (file: string) => readFileSync(file, "utf8").replace(/\r\n/g, "\n")
const lateReturn = (o: Partial<AssetOperationLateReturn> = {}): AssetOperationLateReturn => ({
  linkId: "link-1", checkinId: "rt-1", checkinNo: "RT-202610-0004", checkinDate: "2026-10-19T18:00:00.000Z",
  parent: { id: "asset-p", assetTag: "NB-0017", name: "โน้ตบุ๊ก Dell" }, parentInStock: true, ...o,
})
function row(o: Partial<AssetOperationSearchRow> = {}, d: Partial<AssetOperationChosenDetail> = {}): AssetOperationSearchRow {
  return {
    id: "c-2", assetTag: "NB-0017-02", name: "Mouse ไร้สาย", serialNumber: null, statusLabel: "พร้อมใช้งาน", placeLabel: "EMP-0412 - สมชาย ใจดี",
    locationLabel: "AC-01 - ห้องบัญชี", currentLocationId: "loc-acc", conditionId: "c-good", eligible: true, reasonKey: null, photo: null,
    holderKey: "employee:emp-1", holderLabel: "EMP-0412 - สมชาย ใจดี", holderEmployeeId: "emp-1", badge: "outstanding", lateReturn: lateReturn(),
    detail: {
      ownership: "component", statusName: "Ready", departmentId: "dep-acc", departmentLabel: "ACC - บัญชี", departmentName: "บัญชี",
      holderLabel: "EMP-0412 - สมชาย ใจดี", holderName: "สมชาย ใจดี", ownerBranchLabel: "สำนักงานใหญ่", locationBranchLabel: "สำนักงานใหญ่",
      components: [], outstandingComponents: [],
      // A ส่วนกลาง parent in IT stock keeps its own department, so a re-attach shows it apart from the return department.
      lateReturnParent: { locationId: "loc-it", locationLabel: "IT-2 - ห้อง IT ชั้น 2", departmentId: "dep-adm", departmentName: "ธุรการ" },
      ...d,
    },
    ...o,
  }
}
const words: LateReturnSummaryWords = {
  parent: "ส่วนควบของ", holder: "ผู้ถือครอง", location: "ที่ตั้ง", department: "แผนก", condition: "สภาพตอนคืน", none: "ไม่มี", notChosen: "ยังไม่ได้เลือก",
  kept: (v) => `${v} (คงเดิม)`, outstandingOf: (tag) => `${tag} (ค้างคืน)`, departmentUnavailable: "ยังไม่ได้ตั้งค่า",
}
const conditions = [{ id: "c-good", label: "ดี" }, { id: "c-fair", label: "พอใช้" }]
const locations = [{ id: "loc-store", label: "IT-9 - คลัง IT" }, { id: "loc-acc", label: "AC-01 - ห้องบัญชี" }]
const returnDepartment = { id: "dep-it", name: "Information Technology" }
const summary = (r: AssetOperationSearchRow, draft: Partial<typeof EMPTY_LATE_RETURN_DRAFT> = {}, o: Partial<Parameters<typeof buildLateReturnSummaryRows>[0]> = {}) =>
  buildLateReturnSummaryRows({ row: r, lateReturn: r.lateReturn!, draft: { ...EMPTY_LATE_RETURN_DRAFT, ...draft }, conditions, locations, currentConditionLabel: "ดี", returnDepartment, ...o }, words)
const pick = (rows: LateReturnSummaryRow[]) => rows.map(({ key, now, next, changed }) => [key, now, next, changed])
const standalone = () => row({ lateReturn: lateReturn({ parentInStock: false }) })

test("which rows are late returns, and the outcome the row brings (P2-R4)", () => {
  assert.equal(lateReturnOf(row())?.linkId, "link-1")
  assert.equal(lateReturnOf(row({ eligible: false, reasonKey: "asset.transactionReasonActiveMaintenance" })), null, "a blocked row reads its reason; no panel")
  assert.equal(lateReturnOf(row({ lateReturn: undefined, badge: "handover" })), null)
  assert.equal(lateReturnOf(null), null)
  assert.deepEqual([lateReturnOutcome(lateReturn()), lateReturnOutcome(lateReturn({ parentInStock: false }))], ["reattached", "standalone"])
  assert.deepEqual(EMPTY_LATE_RETURN_DRAFT, { conditionId: "", nextLocationId: "", remark: "" })
})

test("today and the RT-'s return date as Bangkok days (spec §5 dates, P2-R13)", () => {
  assert.deepEqual(lateReturnDays(lateReturn(), new Date("2026-10-31T17:30:00.000Z")), { todayDay: "2026-11-01", checkinDay: "2026-10-20" })
  assert.deepEqual(lateReturnDays(lateReturn({ checkinDate: null }), new Date("2026-10-31T01:00:00.000Z")), { todayDay: "2026-10-31", checkinDay: null })
  assert.deepEqual(lateReturnDays(null, new Date("2026-10-31T01:00:00.000Z")), { todayDay: "2026-10-31", checkinDay: null })
})

test("the panel's checks: ผู้รับคืน, วันที่คืน from the RT-'s day to today, the room only when it stands alone; the condition is never required (spec §8.6, P2-R4, P2-R13)", () => {
  const days = { todayDay: "2026-10-31", checkinDay: "2026-10-20" }
  const valid = { ...EMPTY_LATE_RETURN_DRAFT, receiveBy: "EMP-0007 - สมหญิง รักงาน", returnDate: "2026-10-31" }
  const at = (values: typeof valid, outcome: "reattached" | "standalone" = "reattached", context = days) => validateLateReturn(values, { outcome, ...context })
  assert.deepEqual(at(valid), {})
  assert.deepEqual(at({ ...valid, receiveBy: "", returnDate: "" }), { receiveBy: "required", returnDate: "required" })
  assert.deepEqual(at({ ...valid, receiveBy: "x".repeat(101) }), { receiveBy: "tooLong" })
  assert.deepEqual(at({ ...valid, returnDate: "2026-11-01" }), { returnDate: "checkinReturnDateInFuture" })
  assert.deepEqual(at({ ...valid, returnDate: "2026-10-19" }), { returnDate: "componentReturnDateBeforeCheckin" })
  assert.deepEqual(at({ ...valid, returnDate: "2026-10-20" }), {}, "the RT-'s own day")
  assert.deepEqual(at({ ...valid, returnDate: "2020-01-01" }, "reattached", { todayDay: "2026-10-31", checkinDay: null }), {}, "an RT- date that was not read sets no lower bound")
  assert.deepEqual(at(valid, "standalone"), { nextLocationId: "required" })
  assert.deepEqual(at({ ...valid, nextLocationId: "loc-store" }, "standalone"), {})
})

test("the request: the link and its RT- as the stale guard, the outcome the panel showed, and only the values given; a re-attach never sends a room (P2-R3, Review Focus 3)", () => {
  const values = { ...EMPTY_LATE_RETURN_DRAFT, receiveBy: "EMP-0007 - สมหญิง รักงาน", receiveByEmployeeId: "emp-7", returnDate: "2026-10-31", nextLocationId: "loc-store" }
  assert.deepEqual(buildLateReturnBody(lateReturn(), values),
    { componentLinkId: "link-1", checkinId: "rt-1", expectedOutcome: "reattached", returnDate: "2026-10-31", receiveBy: "EMP-0007 - สมหญิง รักงาน", receiveByEmployeeId: "emp-7" })
  assert.deepEqual(buildLateReturnBody(lateReturn({ parentInStock: false }), { ...values, receiveByEmployeeId: "", conditionId: "c-fair", remark: "  คืนที่โต๊ะ IT  " }), {
    componentLinkId: "link-1", checkinId: "rt-1", expectedOutcome: "standalone", returnDate: "2026-10-31", receiveBy: "EMP-0007 - สมหญิง รักงาน",
    conditionId: "c-fair", nextLocationId: "loc-store", remark: "คืนที่โต๊ะ IT",
  })
  assert.equal("remark" in buildLateReturnBody(lateReturn(), { ...values, remark: "   " }), false)
})

test("re-attach: back into the parent, no holder, the parent's room and the parent's department; the condition kept unless chosen (spec §8.6, P2-R7)", () => {
  assert.deepEqual(pick(summary(row())), [
    ["parent", "NB-0017 (ค้างคืน)", "NB-0017", true],
    ["holder", "สมชาย ใจดี", "ไม่มี", true],
    ["location", "AC-01 - ห้องบัญชี", "IT-2 - ห้อง IT ชั้น 2", true],
    ["department", "บัญชี", "ธุรการ", true],
    ["condition", "ดี", "ดี (คงเดิม)", false],
  ])
  assert.deepEqual(summary(row()).map((r) => r.label), ["ส่วนควบของ", "ผู้ถือครอง", "ที่ตั้ง", "แผนก", "สภาพตอนคืน"])
  assert.deepEqual(pick(summary(row(), { conditionId: "c-fair" }))[4], ["condition", "ดี", "พอใช้", true])
  assert.deepEqual(pick(summary(row(), { conditionId: "c-good" }))[4], ["condition", "ดี", "ดี", false], "chosen and the same")
  assert.deepEqual(pick(summary(row(), { nextLocationId: "loc-store" }))[2], ["location", "AC-01 - ห้องบัญชี", "IT-2 - ห้อง IT ชั้น 2", true], "a room left over from a stand-alone panel is not used")
})

test("stand alone: no parent, the room chosen on the panel (none until chosen) and the return department; a ส่วนกลาง one keeps its own (spec §6, §8.6, P2-R7, P2-R8)", () => {
  assert.deepEqual(pick(summary(standalone())), [
    ["parent", "NB-0017 (ค้างคืน)", "ไม่มี", true],
    ["holder", "สมชาย ใจดี", "ไม่มี", true],
    ["location", "AC-01 - ห้องบัญชี", "ยังไม่ได้เลือก", false],
    ["department", "บัญชี", "Information Technology", true],
    ["condition", "ดี", "ดี (คงเดิม)", false],
  ])
  assert.deepEqual(pick(summary(standalone(), { nextLocationId: "loc-store" }))[2], ["location", "AC-01 - ห้องบัญชี", "IT-9 - คลัง IT", true])
  assert.deepEqual(pick(summary(standalone(), { nextLocationId: "loc-acc" }))[2], ["location", "AC-01 - ห้องบัญชี", "AC-01 - ห้องบัญชี", false], "the room it is in already")
  // ส่วนกลาง keeps its responsible department on a return, as the route writes it; re-attached, it follows the parent (spec §6, P2-R7).
  assert.deepEqual(pick(summary(row({ lateReturn: lateReturn({ parentInStock: false }) }, { ownership: "shared" })))[3], ["department", "บัญชี", "บัญชี", false])
  assert.deepEqual(pick(summary(row({}, { ownership: "shared" })))[3], ["department", "บัญชี", "ธุรการ", true])
  // The return department does not resolve: nothing is promised, and the save is refused (P2-R8).
  for (const r of [row(), standalone()]) assert.deepEqual(pick(summary(r, {}, { returnDepartment: null }))[3], ["department", "บัญชี", "ยังไม่ได้ตั้งค่า", false])
})

test("nothing promised without the detail: no rows, none for a re-attach whose parent was not read; a component with no holder (spec §4 anti-goal)", () => {
  assert.deepEqual(summary(row({ detail: undefined })), [])
  assert.deepEqual(summary(row({}, { lateReturnParent: undefined })), [])
  assert.equal(summary(row({ lateReturn: lateReturn({ parentInStock: false }) }, { lateReturnParent: undefined })).length, 5, "a stand-alone return needs no parent")
  assert.deepEqual(pick(summary(row({}, { holderLabel: null, holderName: null })))[1], ["holder", "ไม่มี", "ไม่มี", false])
})

test("the still-missing list: the asset, ผู้รับคืน, and เก็บไว้ที่ only when it stands alone (spec §5)", () => {
  const w = { asset: "ทรัพย์สิน", receiver: "ผู้รับคืน", location: "เก็บไว้ที่" }
  assert.deepEqual(buildLateReturnChecklist({ eligible: true, receiveBy: "", outcome: "reattached", nextLocationId: "" }, w),
    [{ key: "asset", label: "ทรัพย์สิน", done: true }, { key: "receiver", label: "ผู้รับคืน", done: false }])
  assert.deepEqual(buildLateReturnChecklist({ eligible: true, receiveBy: "x", outcome: "standalone", nextLocationId: "" }, w).map((c) => [c.key, c.done]),
    [["asset", true], ["receiver", true], ["location", false]])
  assert.equal(buildLateReturnChecklist({ eligible: false, receiveBy: "x", outcome: "standalone", nextLocationId: "loc-store" }, w)[0].done, false)
})

test("the rules stay pure: relative .ts imports, no database", () => {
  const source = read("src/lib/checkin-late-return-rules.ts")
  assert.doesNotMatch(source, /from "@\/|@prisma\/client"|\bprisma\./)
  for (const [, path] of source.matchAll(/from "([^"]+)"/g)) assert.match(path, /^\.\/[\w-]+\.ts$/, path)
})

test("the รับคืน form: the late return is a branch of the one form, its panel stands where sections 2 and 3 do, with its own ids, checks and errors, the save to component-return and the RT- after (spec §8.6, P2-R4)", () => {
  const form = read("src/components/asset-operations/checkin-form.tsx")
  for (const part of [
    'const LATE_FIELD_IDS = {\n  receiveBy: "checkin-late-receive-by",\n  returnDate: "checkin-late-return-date",\n  conditionId: "checkin-late-condition",\n  nextLocationId: "checkin-late-location",\n} as const satisfies Record<LateReturnField, string>',
    "const LATE_FIELD_ORDER = Object.keys(LATE_FIELD_IDS) as LateReturnField[]",
    "const lateErrors = useFieldErrors<LateReturnField>()",
    "useState<LateReturnDraft>(EMPTY_LATE_RETURN_DRAFT)",
    "const lateReturn = lateReturnOf(chosen)",
    "const lateOutcome = lateReturn ? lateReturnOutcome(lateReturn) : null",
    "const lateDays = lateReturnDays(lateReturn, new Date())",
    "if (lateReturn) return openLateReview()",
    "lateErrors.setErrors(validateLateReturn(",
    "const focusLateError = () => lateErrors.focusFirst(LATE_FIELD_ORDER, { idFor: (key) => LATE_FIELD_IDS[key], reveal: leaveReview })",
    "fetch(`/api/assets/${chosen.id}/component-return`, {",
    'headers: { "Content-Type": "application/json" },',
    "body: JSON.stringify(buildLateReturnBody(lateReturn, {",
    "if (lateErrors.applyServer(payload) && focusLateError()) return",
    'if (payload?.code === "ASSET_CHANGED_DURING_OPERATION") {',
    "const documentHref = `/${locale}/asset-management/checkins/${payload.checkinId}`",
    't("lateSuccess")',
    "<div data-checkin-late-panel>",
    '<FormSection number={2} title={t("lateSectionTitle")}>',
    'options={[{ id: "", label: t("lateConditionUnchanged") }, ...conditions]}',
    'lateOutcome === "standalone" ? (',
    "max={lateDays.todayDay}",
    "min={lateDays.checkinDay ?? undefined}",
    'description={lateReturn ? t("lateReviewDescription") : t("reviewDescription")}',
    "onConfirm={() => void (lateReturn ? submitLateReturn() : submitCheckin())}",
    "setLate(EMPTY_LATE_RETURN_DRAFT)",
    "lateErrors.setErrors({})",
    "warnings={lateReturn ? lateWarnings :",
    "rows={lateReturn ? lateSummaryRows :",
    "checklist={lateReturn ? lateChecklist :",
    "description: lateReturn ? lateFooter :",
  ]) assert.ok(form.includes(part), part)
  for (const id of ["checkin-late-receive-by", "checkin-late-return-date", "checkin-late-condition", "checkin-late-location", "checkin-late-remark"]) {
    assert.equal(form.match(new RegExp(`\\bid="${id}"`, "g"))?.length, 1, id)
  }
  assert.equal(form.match(/<form\b/g)?.length, 1, "one form, one frame submit")
  assert.equal(form.match(/<OperationReviewDialog\b/g)?.length, 1, "one review dialog")
  assert.match(form, /\{lateReturn \? \(\n\s+<div data-checkin-late-panel>/, "the panel stands where sections 2 and 3 do")
  const at = (text: string) => form.indexOf(text)
  assert.ok(at("if (lateReturn) return openLateReview()") < at("fieldErrors.setErrors(validate("), "the late branch comes before the return's own checks")
  assert.ok(at("{lateReturn ? (") < at("<FormSection number={3}"), "section 3 is in the other branch")
  const stale = at('if (payload?.code === "ASSET_CHANGED_DURING_OPERATION") {')
  const reread = form.indexOf("await loadRowDetail(chosen.id)", stale)
  assert.ok(reread > stale && form.indexOf('throw new Error(payload?.code ?? payload?.error ?? tCommon("error"))', reread) > reread,
    "a stale panel reads the row again before the toast (Review Focus 3)")
  assert.doesNotMatch(form, /"-"|text-warning|from "next\/link"/)
})

test("the words of the late return and of ส่งมอบ's outstanding warning, Thai and English (spec §7.1, §7.3, §8.6)", () => {
  const messages = { th: JSON.parse(read("messages/th.json")), en: JSON.parse(read("messages/en.json")) }
  const word = (locale: "th" | "en", key: string): unknown =>
    key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages[locale])
  const expected: Record<string, [string, string]> = {
    "checkin.lateSectionTitle": ["รับคืนส่วนควบที่ค้างคืน", "Return an outstanding component"],
    "checkin.lateParent": ["ส่วนควบของ {tag} {name}", "A component of {tag} {name}"],
    "checkin.lateSince": ["ค้างคืนตั้งแต่ {documentNo} · {date}", "Outstanding since {documentNo} · {date}"],
    "checkin.lateReattachNotice": ["บันทึกแล้วส่วนควบจะกลับเข้าเครื่องหลัก {parentTag} ซึ่งอยู่ในคลัง IT โดยใช้ที่ตั้งและแผนกตามเครื่องหลัก", "On saving, the component goes back into {parentTag}, which is in IT stock, and takes its location and department."],
    "checkin.lateStandaloneNotice": ["เครื่องหลัก {parentTag} ไม่ได้อยู่ในคลัง IT แล้ว บันทึกแล้วส่วนควบจะแยกเป็นทรัพย์สินเดี่ยวในคลัง IT ไม่กลับเข้าเครื่องหลัก เลือกที่ตั้งที่จะเก็บไว้ด้านล่าง", "{parentTag} is no longer in IT stock. On saving, the component stands alone in IT stock instead of going back into it. Choose where to store it below."],
    "checkin.lateCondition": ["สภาพตอนคืน (ไม่บังคับ)", "Condition on return (optional)"],
    "checkin.lateConditionUnchanged": ["คงเดิม", "Unchanged"],
    "checkin.lateFooter": ["รับคืน {tag} จาก {holder}", "Return {tag} from {holder}"],
    "checkin.lateFooterNoHolder": ["รับคืน {tag}", "Return {tag}"],
    "checkin.lateSummaryParent": ["ส่วนควบของ", "Component of"],
    "checkin.lateSummaryOutstanding": ["{parentTag} (ค้างคืน)", "{parentTag} (outstanding)"],
    "checkin.lateDepartmentUnavailable": ["ยังไม่ได้ตั้งค่า", "Not set up"],
    "checkin.lateSummaryFootnote": ["ไม่ออกเลขเอกสารใหม่ บันทึกเป็นบรรทัดในใบรับคืน {documentNo} แล้วเปิดใบรับคืนให้พิมพ์", "No new document number: the return is a line on {documentNo}, which then opens for printing."],
    "checkin.lateReviewDescription": ["ยืนยันผู้รับคืน วันที่คืน และปลายทางของส่วนควบก่อนบันทึก", "Confirm the receiver, the return date and where the component goes before saving."],
    "checkin.lateReviewSince": ["ค้างคืนตั้งแต่", "Outstanding since"],
    "checkin.lateResultReattach": ["กลับเข้าเครื่องหลัก {parentTag}", "Back into {parentTag}"],
    "checkin.lateResultStandalone": ["แยกเป็นทรัพย์สินเดี่ยว เก็บไว้ที่ {location}", "Stands alone, stored at {location}"],
    "checkin.lateSuccess": ["รับคืนส่วนควบสำเร็จ", "Component returned"],
    "checkout.componentsOutstanding": ["ยังค้างคืน {count} รายการ: {list}", "{count, plural, one {# component is still outstanding: {list}} other {# components are still outstanding: {list}}}"],
    "checkout.componentsOutstandingNote": ["ชิ้นที่ค้างคืนไม่ไปกับการส่งมอบนี้ เมื่อได้คืนแล้วให้รับคืนที่หน้ารับคืนทรัพย์สิน", "An outstanding component does not go with this handover. When it comes back, return it on the Check-in Asset page."],
    "checkout.outstandingWith": ["อยู่กับ {holder}", "with {holder}"],
    "checkout.outstandingSince": ["ตั้งแต่ {documentNo}", "since {documentNo}"],
    "checkout.summaryComponentsOutstanding": ["ค้างคืน {count} รายการ", "{count} outstanding"],
  }
  assert.equal(Object.keys(expected).length, 23, "Step 3e's keys")
  for (const [key, pair] of Object.entries(expected)) assert.deepEqual([word("th", key), word("en", key)], pair, key)
})
```

`tests/checkout-form-rules.test.ts`:
- **Import (`:4-16`):** add `checkoutOutstandingComponents` and `checkoutOutstandingLines`.
- **The `row()` helper (`:37-49`):** after `components: [],` add `outstandingComponents: [],`.
- **`words` (`:64-77`):** after `componentsGo`, add `componentsOutstanding: (n) => \`ค้างคืน ${n} รายการ\`,`.
- **Append:**
```ts
test("ส่งมอบ with a component still outstanding: the ส่วนควบ row adds ค้างคืน M, and each outstanding component reads its holder and its RT- (group 3 spec §7.1, §7.3, P2-R19)", () => {
  const travelling = { id: "k1", assetTag: "NB-0017-01", name: "Adapter 65W", travels: true, locationLabel: "HQ-01 - คลัง IT" }
  const outstanding = [{ assetTag: "NB-0017-02", name: "Mouse ไร้สาย", holderName: "สมชาย ใจดี", checkinNo: "RT-202610-0004" }]
  const both = buildCheckoutSummaryRows(choose({ asset: row({}, { components: [travelling], outstandingComponents: outstanding }), employee }), words)
  assert.deepEqual(pick(both).at(-1), ["components", "2 รายการ", "ไปด้วย 1 รายการ · ค้างคืน 1 รายการ", true])
  const onlyOutstanding = buildCheckoutSummaryRows(choose({ asset: row({}, { outstandingComponents: outstanding }), employee }), words)
  assert.deepEqual(pick(onlyOutstanding).at(-1), ["components", "1 รายการ", "ไปด้วย 0 รายการ · ค้างคืน 1 รายการ", false], "drawn for an outstanding component alone")
  const staying = { ...travelling, id: "k3", travels: false }
  assert.deepEqual(pick(buildCheckoutSummaryRows(choose({ asset: row({}, { components: [staying] }), employee }), words)).at(-1),
    ["components", "1 รายการ", "ไปด้วย 0 รายการ", false], "a component with its own handover keeps today's row")
  assert.equal(pick(buildCheckoutSummaryRows(choose({ employee }), words)).some(([key]) => key === "components"), false, "no components, no row")
  assert.deepEqual(checkoutComponents(row({}, { components: [travelling], outstandingComponents: outstanding })).travelling, [travelling], "an outstanding component never travels")
  const lineWords = { with: (holder: string) => `อยู่กับ ${holder}`, since: (no: string) => `ตั้งแต่ ${no}` }
  assert.deepEqual(checkoutOutstandingLines(row({}, { outstandingComponents: [...outstanding, { assetTag: "NB-0017-03", name: "Dock", holderName: null, checkinNo: null }] }), lineWords),
    ["NB-0017-02 Mouse ไร้สาย · อยู่กับ สมชาย ใจดี · ตั้งแต่ RT-202610-0004", "NB-0017-03 Dock"])
  assert.deepEqual([checkoutOutstandingComponents(row({ detail: undefined })), checkoutOutstandingComponents(null), checkoutOutstandingLines(null, lineWords)], [[], [], []])
})

test("ส่งมอบ's form: the outstanding warning sits in section 1 after the components that go and stay, so the phone shows it on step 1; the summary words (P2-R19)", () => {
  const form = read("src/components/asset-operations/checkout-form.tsx")
  for (const part of [
    "const outstanding = checkoutOutstandingComponents(values.asset)",
    'const outstandingLines = checkoutOutstandingLines(values.asset, { with: (holder) => t("outstandingWith", { holder }), since: (documentNo) => t("outstandingSince", { documentNo }) })',
    '<Notice tone="warning" role="status" data-checkout-outstanding title={t("componentsOutstanding", { count: outstanding.length, list: outstandingLines.join(", ") })}>',
    't("componentsOutstandingNote")',
    'componentsOutstanding: (count) => t("summaryComponentsOutstanding", { count }),',
  ]) assert.ok(form.includes(part), part)
  const at = (text: string) => form.indexOf(text)
  assert.ok(at('data-checkout-part="asset"') < at("data-checkout-outstanding") && at("data-checkout-outstanding") < at('data-checkout-part="receiver"'), "section 1: phone step 1")
  assert.ok(at("{staying.length > 0 ? (") < at("data-checkout-outstanding"), "after the components that stay")
})
```

`tests/asset-operation-search-rules.test.ts`:
- **Import (`:11-18`, in Task 4's version):** add `assetOperationLateReturnParentSelect`, `assetOperationParentOutstandingLinkSelect`, `buildAssetOperationLateReturnParent`, `buildAssetOperationOutstandingComponents` and `type AssetOperationParentOutstandingLink`.
- **`:87-92`:**
  - `expected` gains `outstandingComponents: [],` after its `components`;
  - the call becomes `buildAssetOperationRowDetail(chosen, links, new Set(["c-2"]), [])`.
- **`:93`:** the `bare` call gains `, []` as its fourth argument.
- **Append:**
```ts
test("the chosen asset's outstanding components: each once (the first link; callers read newest first), by tag, with its holder and the RT- that left it out (group 3 spec §7.1, P2-R19)", () => {
  assert.deepEqual(assetOperationParentOutstandingLinkSelect, {
    componentAssetId: true, referenceId: true,
    componentAsset: { select: { assetTag: true, name: true, custodian: { select: { fullNameTh: true } } } },
  })
  const out = (componentAssetId: string, assetTag: string, name: string, holder: string | null, referenceId: string | null): AssetOperationParentOutstandingLink =>
    ({ componentAssetId, referenceId, componentAsset: { assetTag, name, custodian: holder ? { fullNameTh: holder } : null } })
  const links = [out("c-3", "NB-0017-03", "Dock", "สมชาย ใจดี", "rt-2"), out("c-2", "NB-0017-02", "Mouse ไร้สาย", null, "rt-1"), out("c-3", "NB-0017-03", "Dock", "สมชาย ใจดี", "rt-1"), out("c-4", "NB-0017-04", "Pen", "สมหญิง รักงาน", null)]
  assert.deepEqual(buildAssetOperationOutstandingComponents(links, new Map([["rt-1", "RT-202610-0004"], ["rt-2", "RT-202610-0009"]])), [
    { assetTag: "NB-0017-02", name: "Mouse ไร้สาย", holderName: null, checkinNo: "RT-202610-0004" },
    { assetTag: "NB-0017-03", name: "Dock", holderName: "สมชาย ใจดี", checkinNo: "RT-202610-0009" },
    { assetTag: "NB-0017-04", name: "Pen", holderName: "สมหญิง รักงาน", checkinNo: null },
  ])
  assert.deepEqual(buildAssetOperationOutstandingComponents([out("c-2", "NB-0017-02", "Mouse ไร้สาย", null, "rt-9")], new Map()), [{ assetTag: "NB-0017-02", name: "Mouse ไร้สาย", holderName: null, checkinNo: null }], "an RT- that was not read")
})

test("a late return's parent: its room as 'code - name' and its department, for the re-attach summary (group 3 spec §8.6, P2-R7)", () => {
  assert.deepEqual(assetOperationLateReturnParentSelect, {
    id: true, currentLocationId: true, currentLocation: { select: { code: true, name: true } }, departmentId: true, department: { select: { name: true } },
  })
  const parent = { id: "asset-p", currentLocationId: "loc-it", currentLocation: { code: "IT-2", name: "ห้อง IT ชั้น 2" }, departmentId: "dep-adm", department: { name: "ธุรการ" } }
  assert.deepEqual(buildAssetOperationLateReturnParent(parent), { locationId: "loc-it", locationLabel: "IT-2 - ห้อง IT ชั้น 2", departmentId: "dep-adm", departmentName: "ธุรการ" })
  assert.deepEqual(buildAssetOperationLateReturnParent({ ...parent, departmentId: null, department: null }), { locationId: "loc-it", locationLabel: "IT-2 - ห้อง IT ชั้น 2", departmentId: null, departmentName: null })
})
```

`tests/asset-operation-search.test.ts`:
- **Import (`:5-9`, in Task 4's version):** add `assetOperationLateReturnParentSelect`, `assetOperationParentOutstandingLinkSelect` and `type AssetOperationParentOutstandingLink`. Task 4 already imports `outstandingLinkWhere`.
- **The fake (`:44-80`, in Task 4's version):**
  - the data parameter gains `parentOutstanding?: AssetOperationParentOutstandingLink[]`;
  - in `assetComponent.findMany`, after Task 4's `componentAssetId` branch and before `return data.links ?? []`, add `if (args.where.parentAssetId && args.where.status === "outstanding") return data.parentOutstanding ?? []`.
- **`:204-207`:** after `components: [...]`, add `outstandingComponents: [],`.
- **`:209`, as Task 4 left it:** the expected list gains a third where, so it reads `[{ componentAssetId: { in: ["asset-1"] }, ...outstandingLinkWhere }, { parentAssetId: "asset-1", status: "installed", removedAt: null, componentAsset: { isActive: true } }, { parentAssetId: "asset-1", ...outstandingLinkWhere }]`.
- **Append** (after Task 4's appended test, which defines `parentInStock` and `outstandingLink`):
```ts
test("by id with detail=1: the asset's outstanding links, newest first, then their RT- numbers in one read; none travels (group 3 spec §7.1, P2-R19)", async () => {
  const out = (componentAssetId: string, assetTag: string, name: string, referenceId: string): AssetOperationParentOutstandingLink =>
    ({ componentAssetId, referenceId, componentAsset: { assetTag, name, custodian: { fullNameTh: "สมชาย ใจดี" } } })
  const { db, calls } = fakeDb({
    contains: [detailAsset("NB-0017", { id: "asset-1" })], links: [link("c-1", "NB-0017-01", "Adapter 65W")],
    parentOutstanding: [out("c-2", "NB-0017-02", "Mouse ไร้สาย", "rt-1")],
    checkins: [{ id: "rt-1", documentNo: "RT-202610-0004", returnDate: new Date("2026-10-20T00:00:00.000Z") }],
  })
  const [row] = (await searchAssetOperationOptions(db, input("mode=checkout&id=asset-1&detail=1"))).rows
  assert.deepEqual(row.detail?.outstandingComponents, [{ assetTag: "NB-0017-02", name: "Mouse ไร้สาย", holderName: "สมชาย ใจดี", checkinNo: "RT-202610-0004" }])
  assert.deepEqual(row.detail?.components.map((component) => component.id), ["c-1"])
  const parentRead = calls.filter((call) => call.call === "assetComponent.findMany").at(-1)
  assert.deepEqual([parentRead?.args.where, parentRead?.args.select, parentRead?.args.orderBy],
    [{ parentAssetId: "asset-1", ...outstandingLinkWhere }, assetOperationParentOutstandingLinkSelect, [{ updatedAt: "desc" }, { id: "asc" }]])
  assert.deepEqual(calls.filter((call) => call.call === "assetCheckin.findMany").map((call) => [call.args.where, call.args.select]),
    [[{ id: { in: ["rt-1"] } }, { id: true, documentNo: true }]])
  assert.equal(row.detail && "lateReturnParent" in row.detail, false, "a parent's own row reads no late-return parent")
  const none = fakeDb({ contains: [detailAsset("NB-0017", { id: "asset-1" })] })
  await searchAssetOperationOptions(none.db, input("mode=checkout&id=asset-1&detail=1"))
  assert.equal(none.calls.some((call) => call.call === "assetCheckin.findMany"), false, "no outstanding link, no RT- read")
})

test("an outstanding component's own row with detail=1 reads its parent's room and department, once (group 3 spec §8.6, P2-R7)", async () => {
  const mouse = detailAsset("NB-0017-02", { id: "c-2", ownershipType: "component", custodianId: "emp-1", custodian: somchai })
  const parent = detailAsset("NB-0017", { id: "asset-p", currentLocationId: "loc-it", currentLocation: { code: "IT-2", name: "ห้อง IT ชั้น 2", branch: { name: "สำนักงานใหญ่" } },
    departmentId: "dep-adm", department: { code: "ADM", name: "ธุรการ" } })
  const { db, calls } = fakeDb({ contains: [mouse, parent], outstanding: [outstandingLink("link-1", "c-2")],
    checkins: [{ id: "rt-1", documentNo: "RT-202610-0004", returnDate: new Date("2026-10-20T00:00:00.000Z") }] })
  const [row] = (await searchAssetOperationOptions(db, input("mode=checkin&id=c-2&detail=1"))).rows
  assert.equal(row.lateReturn?.parent.id, "asset-p")
  assert.deepEqual(row.detail?.lateReturnParent, { locationId: "loc-it", locationLabel: "IT-2 - ห้อง IT ชั้น 2", departmentId: "dep-adm", departmentName: "ธุรการ" })
  assert.deepEqual(calls.filter((call) => call.call === "asset.findMany").map((call) => [call.args.where, call.args.select]),
    [[{ isActive: true, id: "c-2" }, assetOperationSearchDetailAssetSelect], [{ id: "asset-p" }, assetOperationLateReturnParentSelect]])
})
```

Task 8's `tests/checkin-form-rules.test.ts`:
- **The `row()` helper:** in its detail, after `components: [],` add `outstandingComponents: [],`.
- **The form-source test's part list:** replace `"rows={summaryRows}", "checklist={checklist}", 'footnote={t("summaryFootnote")}'` with `"rows={lateReturn ? lateSummaryRows : summaryRows}", "checklist={lateReturn ? lateChecklist : checklist}", 'footnote={lateReturn ? lateFootnote : t("summaryFootnote")}'`. Leave the rest of the line (`"summary={<OperationSummaryCard"`) as it is.

- [ ] **Step 2: Run them and see them fail.** Run:
```
node --test tests/checkin-late-return-rules.test.ts tests/checkout-form-rules.test.ts tests/asset-operation-search-rules.test.ts tests/asset-operation-search.test.ts tests/checkin-form-rules.test.ts
```
Expected failures:
- `checkin-late-return-rules`: `ERR_MODULE_NOT_FOUND` for `src/lib/checkin-late-return-rules.ts`.
- `checkout-form-rules` and `asset-operation-search-rules`: the new named imports do not exist (a SyntaxError on the import), so every test of the file fails.
- `asset-operation-search`: the detail has no `outstandingComponents` and no `lateReturnParent`. The third component read and the parent read are missing.
- `checkin-form-rules`: only the form-source test fails, on the three rewritten frame props (the form still has Task 8's). Its other tests pass.

- [ ] **Step 3: Implement.**

**3a. The detail** (`asset-operation-search-rules.ts`, `asset-operation-search.ts`).
- **Why the detail gains `lateReturnParent`:** P2-R7 has a re-attach take the parent's room and department, but the row's `lateReturn` (Task 4) carries only the parent's id, tag and name. Without the parent's room and department the summary would promise a value it cannot name (spec §4 anti-goal). It costs one bounded `asset.findMany` (by id, `take: 1`), only for an outstanding component's own row read with `detail=1`.
- **The outstanding links are read in every mode** (with `detail=1` only): one extra read per pick and per review. Only ส่งมอบ shows them; รับคืน's checklist keeps reading `components`, which holds installed links only.
- **Rules file:**
  - Add the two selects, their types, the two result types and the two builders as Produces, after `AssetOperationComponentLink` (`:203`).
  - `buildAssetOperationOutstandingComponents`:
    - keeps the first link per `componentAssetId` and sorts by `assetTag.localeCompare`, as `buildAssetOperationRowDetail` does with its components;
    - `holderName` is `componentAsset.custodian?.fullNameTh ?? null`;
    - `checkinNo` is `checkinNoById.get(referenceId) ?? null` when `referenceId` is set, else `null`.
  - `buildAssetOperationLateReturnParent` gives:
    - `locationId: currentLocationId`;
    - `locationLabel: placeCodeLabel(currentLocation)`, the file's own helper (`:359`);
    - `departmentId`;
    - `departmentName: department?.name ?? null`.
  - `AssetOperationChosenDetail` gains the two fields as Produces, with the doc comments shown there.
  - `buildAssetOperationRowDetail` takes `outstandingComponents` as its fourth parameter and returns it after `components`. Its doc comment gains: "the asset's outstanding components are listed apart (group 3 spec §7.1, §8.5); they never travel".
- **Loader (`asset-operation-search.ts`):**
  - Import the new selects, types and builders, and `outstandingLinkWhere` from `./asset-component-outstanding.ts` (Task 4 may already import it).
  - `readChosenDetail(db, asset, lateReturnParentId: string | null)` makes these reads:
    1. In one `Promise.all`, in this order:
       - today's installed-link read;
       - `db.assetComponent.findMany({ where: { parentAssetId: asset.id, ...outstandingLinkWhere }, select: assetOperationParentOutstandingLinkSelect, orderBy: [{ updatedAt: "desc" }, { id: "asc" }] })`;
       - when `lateReturnParentId` is set, `db.asset.findMany({ where: { id: lateReturnParentId }, select: assetOperationLateReturnParentSelect, take: 1 })`, else `[]`.
    2. Then, in a second `Promise.all`:
       - today's handover read of the installed components;
       - when the outstanding links name any `referenceId`, `db.assetCheckin.findMany({ where: { id: { in: <the distinct non-null referenceIds, in read order> } }, select: { id: true, documentNo: true } })`, else `[]`.
    3. It returns `buildAssetOperationRowDetail(asset, links, handedOver, buildAssetOperationOutstandingComponents(outstandingLinks, new Map(checkins.map((checkin) => [checkin.id, checkin.documentNo]))))`, plus `lateReturnParent: buildAssetOperationLateReturnParent(parents[0])` when the parent read found one. Otherwise the key is absent.
  - `:158` becomes `if (input.detail) rows[0].detail = await readChosenDetail(db, assets[0] as AssetOperationSearchDetailAsset, rows[0].lateReturn?.parent.id ?? null)`. `lateReturn` exists only on รับคืน rows (Task 4).
  - The read-budget comment's detail clause becomes: "with detail=1 (by id only): one read each of the asset's installed and outstanding links, then one of the installed components' open handovers and one of the outstanding links' RT- numbers; an outstanding component's own row (รับคืน) also reads its parent's room and department (group 3 spec §7.1, §8.6)".

**3b. ส่งมอบ** (`checkout-form-rules.ts`, `checkout-form.tsx`).
- **Rules:**
  - Import `type AssetOperationOutstandingComponent` beside today's types.
  - `CheckoutSummaryWords` gains `componentsOutstanding: (count: number) => string`.
  - After `checkoutComponents`, add `checkoutOutstandingComponents`, which returns `row?.detail?.outstandingComponents ?? []`.
  - Add `checkoutOutstandingLines`: one line per component, `"<tag> <name>"`, then `" · " + words.with(holderName)` when there is a holder, then `" · " + words.since(checkinNo)` when there is an RT-.
  - **The ส่วนควบ row** of `buildCheckoutSummaryRows` is drawn when `detail.components.length + outstanding.length > 0`. This keeps today's row for a parent whose only component has its own handover ("1 รายการ → ไปด้วย 0 รายการ", `checkout-form-rules.ts:149`), as spec §7.3 counts every component; Step 1 pins that case. In the row:
    - `now` is `words.count(detail.components.length + outstanding.length)`;
    - `next` is `words.componentsGo(travelling.length)`, followed by `" · " + words.componentsOutstanding(outstanding.length)` when any is outstanding;
    - `changed` stays `travelling.length > 0`.
  - The function's doc comment gains "an outstanding component counts in ส่วนควบ, does not travel, and reads ค้างคืน M (spec §7.3, P2-R19)".
- **Form:**
  - Import the two functions.
  - The summary words gain `componentsOutstanding: (count) => t("summaryComponentsOutstanding", { count }),` after `componentsGo`.
  - After `const { travelling, staying } = checkoutComponents(values.asset)`, add the two named values exactly as Step 1's source test reads them (`outstanding`, `outstandingLines`).
  - In section 1, directly after the `staying` Notice's `) : null}`, add:
    ```tsx
    {outstanding.length > 0 ? (
      <Notice tone="warning" role="status" data-checkout-outstanding title={t("componentsOutstanding", { count: outstanding.length, list: outstandingLines.join(", ") })}>
        {t("componentsOutstandingNote")}
      </Notice>
    ) : null}
    ```
  - Nothing else on ส่งมอบ changes:
    - the travelling list, the read-back and the step 3 statement count travelling components only;
    - the outstanding component is not sent with the save, because the route's sync skips it (Task 3).

**3c. The late-return rules** (`src/lib/checkin-late-return-rules.ts`, create).
- **Header comment:** "The late return of an outstanding component on รับคืน (group 3 spec §8.6, P2-R4): which row, its outcome, its checks, its request, and its สรุปก่อนบันทึก rows. Pure and client-safe. The department row asks the late-return route's rule (getLateReturnDepartmentId), so the card never promises what the save does not write."
- **Imports:**
  - `getBangkokDateKey` from `./preventive-maintenance.ts`;
  - `checkinReturnDateError` and `CHECKIN_RETURN_DATE_ERROR_KEYS` from `./checkin-route-rules.ts`;
  - `getLateReturnDepartmentId` from `./asset-department-rule.ts`;
  - `getLateReturnDateError` and `import type { ComponentLateReturnOutcome }` from `./component-late-return.ts` (Task 5's date bound: one rule for the panel and the route);
  - `maxLength` and `required` from `./validation-rules.ts`;
  - `import type` of the row types from `./asset-operation-search-rules.ts`.

  Every path is relative and ends in `.ts`, which Step 1's purity test reads.
- **`lateReturnOf(row)`:** `row?.eligible && row.lateReturn ? row.lateReturn : null`. A blocked outstanding row keeps its reason under the asset field and gets no panel.
- **`lateReturnOutcome`:** `parentInStock ? "reattached" : "standalone"`. The outcome is the row's: Task 4 computed `parentInStock` from the IT-stock rule.
- **`lateReturnDays`:**
  - `todayDay` is `getBangkokDateKey(now)`;
  - `checkinDay` is `getBangkokDateKey(new Date(checkinDate))` when the late return and its `checkinDate` are present, else `null`.
- **`validateLateReturn`, in this order:**
  1. `receiveBy`: `required(...) ?? maxLength(..., 100)`.
  2. `returnDate`:
     - `required` first;
     - then, when `checkinDay` is set, Task 5's `getLateReturnDateError({ returnDay: returnDate, todayDay, checkinDay })`: `CHECKIN_RETURN_DATE_IN_FUTURE` maps through `CHECKIN_RETURN_DATE_ERROR_KEYS`, and `COMPONENT_RETURN_DATE_BEFORE_CHECKIN` maps to `"componentReturnDateBeforeCheckin"` (Task 5's catalog key);
     - when `checkinDay` is null (the RT- date was not read), `checkinReturnDateError({ returnDay: returnDate, todayDay, handoverDay: null })` mapped through `CHECKIN_RETURN_DATE_ERROR_KEYS`, so only the future bound applies. The panel writes no date comparison of its own.
  3. `nextLocationId`: `required(...)` only for `"standalone"`.
  4. `conditionId`: never refused here. An empty value means unchanged.
  5. `remark`: no rule (Task 5's schema has no cap).
- **`buildLateReturnBody`:** the keys in Produces order.
  - `expectedOutcome` is `lateReturnOutcome(lateReturn)`.
  - `receiveByEmployeeId` and `conditionId` are present only when not empty.
  - `nextLocationId` is present only for `"standalone"` with a value. A re-attach never sends a room, so the server can never answer a field error on a field the panel did not show (P2-R3).
  - `remark` is trimmed and present only when not empty.
- **`buildLateReturnSummaryRows`** builds the rows in this order: parent, holder, location, department, condition.
  - **No rows** without `row.detail`, and none for a re-attach without `detail.lateReturnParent`.
  - **ส่วนควบของ:** now `outstandingOf(parent.assetTag)`. Next is the parent's tag on re-attach, or `none` when it stands alone. Always `changed`.
  - **ผู้ถือครอง:** now `detail.holderName ?? none`, next `none`. `changed` when `detail.holderLabel` is set.
  - **ที่ตั้ง:** now `row.locationLabel`.
    - Re-attach: next is `lateReturnParent.locationLabel`; `changed` when its `locationId` differs from `row.currentLocationId`.
    - Stand-alone: next is the label of the `locations` entry for `draft.nextLocationId`, or `notChosen`; `changed` when one is chosen and it differs from `row.currentLocationId`.
  - **แผนก:** now `detail.departmentName ?? none`.
    - Without `returnDepartment`: next `departmentUnavailable`, not changed.
    - Otherwise `nextId = getLateReturnDepartmentId({ outcome, ownership: detail.ownership, parentDepartmentId: detail.lateReturnParent?.departmentId ?? null, returnDepartmentId: returnDepartment.id, currentDepartmentId: detail.departmentId })`, the five fields the route passes, where `outcome` is `lateReturnOutcome(lateReturn)`. A ส่วนกลาง component standing alone gets its own department back, so its row reads unchanged. Next is:
      - the now text when `nextId === detail.departmentId`;
      - `returnDepartment.name` when it is the return department;
      - `lateReturnParent.departmentName ?? none` when it is the parent's;
      - else `none`.
    - `changed` when `nextId !== detail.departmentId`.
  - **สภาพตอนคืน:** now `currentConditionLabel ?? none`. Next is the chosen condition's label, or `kept(now)` when `draft.conditionId` is empty. `changed` when a condition is chosen and it differs from `row.conditionId`.
- **`buildLateReturnChecklist`:**
  - asset (`eligible`);
  - receiver (`receiveBy` not blank);
  - location (`nextLocationId` not empty), for `"standalone"` only.

**3d. The panel in `checkin-form.tsx`** (Task 8's version).
- **Imports:**
  - the 3c names;
  - `formatCheckoutDay` from `@/lib/checkout-phone-steps`;
  - `assetOperationRowLabel` from `@/lib/asset-operation-form-rules`;
  - `AssetConditionChoice`, `FormSection`, `Notice`, `SearchableSelect`, `Field`, `Input` and `Textarea` where Task 8 does not already import them.
- **Module level,** after Task 8's `FIELD_ORDER`, with this comment: "The late return's fields (group 3 spec §8.6, P2-R4, P2-R11), keyed like the component-return route's fieldErrors, in visual order. A second table, because their keys repeat FIELD_IDS' keys under other ids." It holds `LATE_FIELD_IDS` and `LATE_FIELD_ORDER` exactly as Step 1's source test reads them.
- **State and named values**, after Task 8's:
  - `const lateErrors = useFieldErrors<LateReturnField>()`: a second hook, because the late keys are not the form's keys;
  - `const [late, setLate] = useState<LateReturnDraft>(EMPTY_LATE_RETURN_DRAFT)`;
  - `const lateReturn = lateReturnOf(chosen)`;
  - `const lateOutcome = lateReturn ? lateReturnOutcome(lateReturn) : null`;
  - `const lateDays = lateReturnDays(lateReturn, new Date())`;
  - `const focusLateError = () => lateErrors.focusFirst(LATE_FIELD_ORDER, { idFor: (key) => LATE_FIELD_IDS[key], reveal: leaveReview })`.
  - `lateSummaryRows`: `buildLateReturnSummaryRows` when `chosen && lateReturn`, else `[]`. Its inputs:
    - `draft: late`;
    - `currentConditionLabel: conditionLabels[chosen.conditionId] ?? null` (Task 8's prop, so a component recorded ยังไม่ประเมิน reads its name, not ไม่มี);
    - `returnDepartment`;
    - the words: `parent: t("lateSummaryParent")`, `holder`/`location`/`department` from `tOperation("summaryHolder" | "summaryLocation" | "summaryDepartment")`, `condition: t("conditionAfter")`, `none`/`notChosen` from `tOperation("summaryNone" | "summaryNotChosen")`, `kept: (value) => tOperation("summaryKept", { value })`, `outstandingOf: (parentTag) => t("lateSummaryOutstanding", { parentTag })`, `departmentUnavailable: t("lateDepartmentUnavailable")`.
  - `lateChecklist`: `buildLateReturnChecklist({ eligible: chosen?.eligible === true, receiveBy: values.receiveBy, outcome: lateOutcome, nextLocationId: late.nextLocationId }, { asset: t("asset"), receiver: t("receiveBy"), location: t("nextLocation") })` when `lateOutcome`, else `[]`.
  - `lateWarnings`, after Task 8's `detailFailedNotice`: `[...(returnDepartment ? [] : [apiError.describe("ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE").message]), ...(detailFailedNotice ? [detailFailedNotice] : [])]`. The first is Task 1's full sentence, in the words Task 8's own warning uses. The second keeps the ลองอีกครั้ง retry when the late row's detail read failed (its summary is then empty).
    - No return department (P2-R8): the department row reads `lateDepartmentUnavailable`, not changed, and the card shows the warning. The save is still sent; the server refuses it with the same catalogued words and writes nothing, so there is no client pre-refusal. (The legacy confirm refusal is Task 8's.)
  - `lateFooter`, when `chosen && lateReturn`: `chosen.holderLabel ? t("lateFooter", { tag: chosen.assetTag, holder: chosen.holderLabel }) : t("lateFooterNoHolder", { tag: chosen.assetTag })`; else `null`.
  - `const lateFootnote = lateReturn?.checkinNo ? t("lateSummaryFootnote", { documentNo: lateReturn.checkinNo }) : undefined`.
  - `lateReviewItems`: `buildOperationReviewSummary` when `chosen && lateReturn`, else `[]`. Its inputs:
    - `assetLabel: assetOperationRowLabel(chosen)`;
    - `destinationLabels: [values.receiveBy]`;
    - today's `labels` object;
    - `details`, in this order:
      1. `t("lateSummaryParent")` → `assetOperationRowLabel(lateReturn.parent)`;
      2. `t("lateReviewSince")` → `[lateReturn.checkinNo, lateDays.checkinDay ? formatCheckoutDay(lateDays.checkinDay, locale) : null].filter(Boolean).join(" · ")`;
      3. `t("returnDate")` → `formatCheckoutDay(values.returnDate, locale)`;
      4. `t("conditionAfter")` → the chosen condition's label, else `t("lateConditionUnchanged")`;
      5. `tOperation("summaryNext")` → `t("lateResultStandalone", { location: <the chosen room's label or ""> })` for a stand-alone return, else `t("lateResultReattach", { parentTag: lateReturn.parent.assetTag })`;
      6. `t("remark")` → `late.remark`. An empty value is dropped by the builder.
  - `setLateField(field: keyof LateReturnDraft, value: string)` sets `late` and clears that key from `lateErrors` (for `remark`, there is nothing to clear).
  - `setLateReturnDate(value)` calls `setField("returnDate", value)` and `lateErrors.clear("returnDate")`.
- **The picker's `onChange`** (`chooseRow`): its first two lines become `setLate(EMPTY_LATE_RETURN_DRAFT)` and `lateErrors.setErrors({})`.
  - A pick starts a clean panel.
  - `loadRowDetail` and the 409 re-read do not go through `chooseRow`, so a chosen room or condition survives them.
- **`handleSubmit`:** right after `event.preventDefault()`, add `if (lateReturn) return openLateReview()`. `openLateReview()`:
  1. `lateErrors.setErrors(validateLateReturn({ ...late, receiveBy: values.receiveBy, returnDate: values.returnDate }, { outcome: lateOutcome, ...lateDays }))`. `lateOutcome` is set whenever `lateReturn` is; narrow it with a guard that returns.
  2. `if (focusLateError()) return`.
  3. `setReviewOpen(true)`.

  Task 8's checks below the branch are unchanged.
- **`submitLateReturn()`** follows `submitCheckin`'s shape:
  - `if (!chosen || !lateReturn) return`, then `setSaving(true)`.
  - `fetch(\`/api/assets/${chosen.id}/component-return\`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildLateReturnBody(lateReturn, { ...late, receiveBy: values.receiveBy, receiveByEmployeeId, returnDate: values.returnDate })) })`.
  - On `!response.ok`, in this order:
    1. `if (lateErrors.applyServer(payload) && focusLateError()) return`.
    2. `if (payload?.code === "ASSET_CHANGED_DURING_OPERATION") {` `setReviewOpen(false)`, then `await loadRowDetail(chosen.id)` `}`. The answered row replaces `chosen`, its `lateReturn` included, so the panel shows the parent as it is now: the room picker appears or goes, or the panel goes with the link (Review Focus 3). Then step 3 toasts. This task covers Review Focus 3 by the request rule (a re-attach never sends a room) and by Step 1's source pin on this path; the 409 itself is Task 5's route test.
    3. `throw new Error(payload?.code ?? payload?.error ?? tCommon("error"))`. The catch's `apiError.toast` reads catalogued codes, such as `ASSET_CHANGED_DURING_OPERATION` and `ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE`, in Thai.
  - On success:
    - `toast.success(t("lateSuccess"))`;
    - `const documentHref = \`/${locale}/asset-management/checkins/${payload.checkinId}\``;
    - `router.push(returnTo ? appendReturnTo(documentHref, returnTo) : documentHref)`;
    - `router.refresh()`.
  - `catch`: `apiError.toast(error)`. `finally`: `setSaving(false)`.
- **The frame:**
  - `OperationSummaryCard`'s props become:
    - `rows={lateReturn ? lateSummaryRows : summaryRows}`;
    - `checklist={lateReturn ? lateChecklist : checklist}`;
    - `warnings={lateReturn ? lateWarnings : [...warningLines, ...(detailFailedNotice ? [detailFailedNotice] : [])]}`;
    - `footnote={lateReturn ? lateFootnote : t("summaryFootnote")}`.
  - The footer's `description` becomes `description: lateReturn ? lateFooter : <Task 8's expression>`.
  - Everything else in the frame stays Task 8's. With `summaryOnPhone={false}` the late summary is hidden below `lg`; the panel's outcome Notice carries the message there.
- **Sections 2 and 3:** wrap Task 8's two sections as `{lateReturn ? ( <panel> ) : ( <>…Task 8's sections 2 and 3, unchanged…</> )}`. The panel:
  ```tsx
  <div data-checkin-late-panel>
    <FormSection number={2} title={t("lateSectionTitle")}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-1 text-sm md:col-span-2">
          <p className="min-w-0 break-words text-foreground">{t("lateParent", { tag: lateReturn.parent.assetTag, name: lateReturn.parent.name })}</p>
          {lateReturn.checkinNo && lateDays.checkinDay ? (
            <p className="text-muted-foreground">{t("lateSince", { documentNo: lateReturn.checkinNo, date: formatCheckoutDay(lateDays.checkinDay, locale) })}</p>
          ) : null}
        </div>
        <div className="md:col-span-2">
          {lateOutcome === "standalone"
            ? <Notice tone="warning" role="status">{t("lateStandaloneNotice", { parentTag: lateReturn.parent.assetTag })}</Notice>
            : <Notice tone="info">{t("lateReattachNotice", { parentTag: lateReturn.parent.assetTag })}</Notice>}
        </div>
        <SearchableSelect
          id="checkin-late-receive-by"
          label={t("receiveBy")} value={receiveByEmployeeId} required options={employees}
          placeholder={t("selectReceiveBy")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")}
          hint={receiveByEmployeeId && receiveByEmployeeId === currentEmployeeId ? t("receiveByYou") : undefined}
          error={lateErrors.message("receiveBy")}
          onChange={(value) => { setEmployeeField("receiveBy", value); lateErrors.clear("receiveBy") }}
        />
        <Field label={t("returnDate")} id="checkin-late-return-date" required error={lateErrors.message("returnDate")}>
          <Input type="date" value={values.returnDate} min={lateDays.checkinDay ?? undefined} max={lateDays.todayDay} onChange={(event) => setLateReturnDate(event.target.value)} required />
        </Field>
        <div className="md:col-span-2">
          <AssetConditionChoice
            id="checkin-late-condition"
            legend={t("lateCondition")}
            options={[{ id: "", label: t("lateConditionUnchanged") }, ...conditions]}
            value={late.conditionId} required={false} error={lateErrors.message("conditionId")}
            onChange={(value) => setLateField("conditionId", value)}
          />
        </div>
        {lateOutcome === "standalone" ? (
          <SearchableSelect
            id="checkin-late-location"
            label={t("nextLocation")} value={late.nextLocationId} required options={locations}
            placeholder={t("selectLocation")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")}
            error={lateErrors.message("nextLocationId")}
            onChange={(value) => setLateField("nextLocationId", value)}
          />
        ) : null}
        <div className="md:col-span-2">
          <Field label={t("remark")} id="checkin-late-remark">
            <Textarea value={late.remark} onChange={(event) => setLateField("remark", event.target.value)} rows={3} />
          </Field>
        </div>
      </div>
    </FormSection>
  </div>
  ```
  - The panel shares ผู้รับคืน and วันที่คืน with section 2: the same state, the same "คุณ" prefill and the same today default. The condition, the room and the remark are its own (`late`), so nothing leaks into a return's required, defaultless fields.
  - Keep the `"-"` literal, `text-warning`, `rounded-full`, `<section` and `next/link` out of the file (`tests/operations-sweep-ui.test.ts`'s ban list, in Task 8's version).
- **The review dialog** (the one `OperationReviewDialog`):
  - `items={lateReturn ? lateReviewItems : <Task 8's items>}`;
  - `description={lateReturn ? t("lateReviewDescription") : t("reviewDescription")}`;
  - `onConfirm={() => void (lateReturn ? submitLateReturn() : submitCheckin())}`.

  Its title, confirm and cancel words stay ตรวจสอบก่อนรับคืน / ยืนยันรับคืน / ยกเลิก, which E2E reads.

**3e. The words.** Save `<scratchpad>/p2-t9-messages.json` and run `node scripts/messages-edit.mjs <scratchpad>/p2-t9-messages.json`. Expected output: `messages updated: 23 th, 23 en, 0 deleted`.
- The file's `set.th` and `set.en` hold exactly the 23 keys of Step 1's words test. Each value is the test's Thai and English text verbatim.
- The words obey `docs/19_THAI_GLOSSARY.md`:
  - ผู้ถือครอง, never ผู้ถือ alone;
  - ที่ตั้ง, never พื้นที่;
  - no "ตรวจทาน".

- [ ] **Step 4: Run the checks.**
  - **Focused:**
    - Re-run the Step 2 command.
    - Then run `node --test tests/validation-guards.test.ts tests/form-migration-guards.test.ts tests/v-track2-o.test.ts tests/v-track2-x.test.ts tests/operations-sweep-ui.test.ts tests/asset-operation-confirmation-ui.test.ts tests/checkin-choice.test.ts tests/checkout-phone-steps.test.ts tests/asset-handover-checkout.test.ts tests/e2e-cross-cutting.test.ts tests/e2e-transactions.test.ts tests/thai-glossary.test.ts tests/api-error-catalog.test.ts tests/component-late-return.test.ts`.
    - Also run Task 8's `tests/checkin-form-rules.test.ts`.
    - Expected: all pass.
    - Things to check in that run:
      - V1: still one `<form>` in `checkin-form.tsx`;
      - V4: both new required `SearchableSelect`s have `id` and `error`;
      - GF4: the late date `Field` has the star and native `required`, and the remark `Field` has neither;
      - v-track2-o: `FIELD_IDS` and its ids are untouched, because the late ids are in their own table.
  - **Gates:** `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: no failures and 0 lint errors.
    - `tsc` is the check that finds every `AssetOperationChosenDetail` literal and every `CheckoutSummaryWords` without its new field.
    - A pin outside this task's list that fails is rewritten in this commit and named in the report.

- [ ] **Step 5: Commit.**
```
git add src/lib/checkin-late-return-rules.ts src/lib/asset-operation-search-rules.ts src/lib/asset-operation-search.ts src/lib/checkout-form-rules.ts src/components/asset-operations/checkout-form.tsx src/components/asset-operations/checkin-form.tsx messages/th.json messages/en.json tests/checkin-late-return-rules.test.ts tests/checkout-form-rules.test.ts tests/asset-operation-search-rules.test.ts tests/asset-operation-search.test.ts tests/checkin-form-rules.test.ts
git commit -m "feat(checkin): the late return of an outstanding component on รับคืน, a panel in place of sections 2 and 3 that saves to component-return and opens the RT-; ส่งมอบ lists a component still outstanding in section 1 and reads ค้างคืน M in its summary (group 3 spec §7.1, §7.3, §8.6; P2-R4, P2-R19)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
Add any other pin file that Step 4 rewrote.

---

### Task 10: รับคืน on the phone: one line for ผู้คืน / ผู้รับคืน, the footer's component count, and the card's warnings above the bar (spec §8.8, §5 footer, Appendix A รับคืน; P2-R12, P2-R4, P2-R16, P2-R18)

Below the shell's phone/desktop switch (`lg`, 64rem), รับคืน stays one form with T8's three sections, condensed in three ways:
- ผู้คืน and ผู้รับคืน fold into one line, "ผู้คืน / ผู้รับคืน: <names> · แก้ไข", while both are chosen. แก้ไข, an empty field or an error under either shows both fields.
- The footer's status line reads "ส่วนควบได้คืน X · ขาด Y" over the primary button.
- The summary card's warning lines, which T8's `summaryOnPhone={false}` hides below `lg`, show in a block after section 3.

The two fields stay in the DOM and CSS hides them, so `#checkin-return-by` still reads its text and an error still finds its field. From `lg` nothing changes. Unlike ส่งมอบ, รับคืน has no phone steps (spec §8.8).

Rulings this task applies (copied from the skeleton and the controller's rulings):
- **P2-R12:** `OperationFormFrame` has `summaryOnPhone?: boolean` (default true), and รับคืน passes `false`. Below `lg` the summary column is hidden and the frame's footer stays.
- **P2-R4:** the late-return panel is a branch of `checkin-form.tsx`. When T9's `lateReturn` (`lateReturnOf(chosen)`) is not null, sections 2 and 3 are not rendered, so the people line is not either. The footer keeps T9's line "รับคืน <component tag> จาก <holder>".
- **P2-R16:** the line "สภาพนี้ส่งมอบต่อไม่ได้จนกว่าจะส่งซ่อม" (and the ซาก line) is a summary warning. It is in the card only, so the phone needs the warnings block.
- **P2-R18:** when a component is missing, ผู้คืน must be an employee. That error lands under `returnBy`, which opens the fields.
- **X11:** this task moves the card's warnings and the footer's line into named values, which breaks two of T9's pins in `tests/checkin-late-return-rules.test.ts`. They are rewritten in this commit (Step 3.5), and that file is in the `git add`.
- **X19:** the footer counts use T9's value, `lateReturn: lateReturn !== null`, not `Boolean(chosen?.lateReturn)`. A blocked outstanding row has `row.lateReturn` but `lateReturnOf` gives null: it keeps sections 2 and 3, so it keeps its counts too. Step 1's source pin reads this text.

Line numbers are HEAD's (`452b72d7`). T8 and T9 rebuild `checkin-form.tsx`, so each block below is named by its content.

Decisions:
- **The phone warnings block.** P2-R12 hides the summary card below lg. Without the block, P2-R16's broken-condition lines, the missing-component line ("<c> ยังไม่ได้คืน จะอยู่กับ <ผู้คืน> ที่ <room> …"), the department line and T8's failed-read notice with ลองอีกครั้ง would never reach a phone user. Checkout keeps its failed-read notice on the phone too (`checkout-form.tsx:720`). The block renders only when `!isDesktop`, so the desktop DOM holds each warning once.
- **The line's names.** The line shows the two people as the fields show them ("code - name", with "(พ้นสภาพ)" for a former holder). The board's "คุณ" and T8's "ผู้ถือครองตอนนี้" stay as T8's tags on the fields. The line needs no new prop, and the RT- records the same text.
- **วันที่คืน stays a plain field on the phone.** There is no "วันที่คืน: วันนี้ … · เปลี่ยน" line like checkout's step 1: §8.8 does not condense it, and T11's E2E fills `#checkin-return-date` on every project.
- **Camera capture needs no new code.** The checkin `FileDropzone` has had `capture="environment"` since before plan 1; this task only pins it. It stays one file input, so `form input[type=file]` stays unambiguous.

**Files:**
- Create: `src/lib/checkin-phone.ts` (pure, no imports).
- Create: `tests/checkin-phone.test.ts`.
- Modify: `src/components/asset-operations/checkin-form.tsx`, as T8 and T9 left it:
  - the imports;
  - the state (next to T8's `useState` calls);
  - the derived values, just before the component's `return (`;
  - one handler, `openPhonePeople`, placed after `leaveReview`;
  - the frame's `summary` (`warnings=`) and `footer.description`;
  - section 2's first two cells, the `SearchableSelect`s `#checkin-return-by` and `#checkin-receive-by`;
  - one block as the frame's last child.
- Modify: `tests/checkin-late-return-rules.test.ts` (T9's), two pins only (X11, Step 3.5).
- Modify: `messages/th.json`, `messages/en.json`, only through `node scripts/messages-edit.mjs`.
- Not modified:
  - `operation-form-frame.tsx` (T8 adds `summaryOnPhone`);
  - `sticky-form-footer.tsx` (its `status` already sits above the buttons on phones, `sticky-form-footer.tsx:6,28-30`);
  - the E2E (T11 asserts the phone line, the footer counts and the hooks in Produces).

**Pins this task breaks (each is rewritten in this commit, Step 3.5):**
- `tests/checkin-late-return-rules.test.ts`, T9's form test, two entries of its `for (const part of [...])` list:
  - `"warnings={lateReturn ? lateWarnings :",` becomes `"const summaryWarnings = lateReturn ? lateWarnings :",`;
  - `"description: lateReturn ? lateFooter :",` becomes `"const footerLine = lateReturn ? lateFooter :",`.

**Interfaces:**
- Consumes:
  - **T8** (`checkin-form.tsx` rebuilt on the shared parts):
    - `<form onSubmit={handleSubmit} noValidate id={CHECKIN_FORM_ID}>` wraps `<OperationFormFrame title={t("title")} description={t("description")} actions={…} summaryOnPhone={false} summary={<OperationSummaryCard … warnings={…} />} footer={{ description: …, cancelHref, cancelLabel, submitLabel, busy, formId }}>`.
    - The frame's children are T8's three sections, `<FormSection number={1} title={t("sectionAsset")}>`, `<FormSection number={2} title={t("sectionReturn")}>` and `<FormSection number={3} title=…>` in that source order. T9 wraps sections 2 and 3 as the else branch of `{lateReturn ? ( <panel> ) : ( <>…</> )}`, and its panel has its own `<FormSection number={2} title={t("lateSectionTitle")}>` earlier in the source. Step 1 therefore names section 2 by its title.
    - Section 2's body grid is `grid gap-4 md:grid-cols-2`, the same as checkout's section 2 (`checkout-form.tsx:543`); the line's `md:col-span-2` depends on it. Its first two cells are `<SearchableSelect\n id="checkin-return-by"` (options `returnByOptions`, hint `t("returnByHolder")`) and `<SearchableSelect\n id="checkin-receive-by"` (options `employees`, hint `t("receiveByYou")`), in the spec's order (P2-R11).
    - Section 3 holds the photo `FileDropzone` with `accept="image/*"` and `capture="environment"` (today's `checkin-form.tsx:513-522`).
    - Names in the component, which T8 states it keeps (X23):
      - `chosen`: the chosen row (`:130`);
      - `selectedReturnBy`, `selectedReceiver`: the options the two fields show (`:163-164`). A former holder reads "{name} (พ้นสภาพ)" (S-R46);
      - `fieldErrors` (with `.errors`), `t` (`checkin`) and `tCommon` (`common`);
      - `setEmployeeField(field, employeeId, formerLabel?)` (`:207-212`), which each field's `onChange` calls; `applyChoice` and `leaveReview`;
      - `const { travelling, missing: missingComponents } = checkinComponents(chosen, unticked)`. T8's ส่วนควบ summary row and review line read "ได้คืน X · ขาด Y" with X = `travelling.length - missingComponents.length` (ticked rows) and Y = `missingComponents.length` (unticked, P2-R1);
      - `warningLines` and `detailFailedNotice`. T8's card reads `warnings={[...warningLines, ...(detailFailedNotice ? [detailFailedNotice] : [])]}`. `detailFailedNotice` is a const placed just before `return (`, as checkout's (`checkout-form.tsx:390`);
      - the footer's `description: chosen && values.returnBy ? t("footerDescription", { tag: chosen.assetTag, returner: values.returnBy }) : t("footerIncomplete")`.
    - ผู้รับคืน is prefilled with the signed-in user's employee (P2-R9). On the phone the line is therefore the usual first state once an asset with an employee holder is chosen.
  - **T9** (the late-return branch, `checkin-form.tsx`):
    - `const lateReturn = lateReturnOf(chosen)`: null for a non-late row and for a blocked outstanding row (X19);
    - `lateWarnings` and `lateFooter`, and the frame props in T9's shape: `warnings={lateReturn ? lateWarnings : <T8's>}` and `description: lateReturn ? lateFooter : <T8's>`;
    - the late branch replaces sections 2 and 3 on every width, so the people line and the phone footer counts never apply to it; with `summaryOnPhone={false}` the late summary is hidden below lg, and the panel's outcome Notice carries the message there.
  - If T8 or T9 named any of these differently, use their names in both the code and Step 1's test. The pure module does not change.
  - **Existing:**
    - `useMediaQuery(query)` (`src/components/ui/use-media-query.ts:6`, false on the server);
    - `Button` `variant="ghost" size="sm"` (at least 44px tall below md, `button-variants.ts:7`);
    - `Notice tone="warning"`;
    - `cn` (`src/lib/utils.ts`);
    - `common.edit` "แก้ไข" / "Edit".
- Produces:
  ```ts
  // src/lib/checkin-phone.ts (pure; no imports)
  export const checkinPhoneParts = ["people", "peopleLine"] as const
  export type CheckinPhonePart = (typeof checkinPhoneParts)[number]
  export function checkinPhonePartClass(part: CheckinPhonePart, peopleOpen: boolean): "contents" | "max-lg:hidden lg:contents" | "lg:hidden" | "hidden"
  export function checkinPeopleOpen(input: { opened: boolean; returnBy: string; receiveBy: string; returnByError: boolean; receiveByError: boolean }): boolean
  export function checkinPhoneFooterCounts(input: { lateReturn: boolean; returned: number; missing: number }): { returned: number; missing: number } | null
  ```
  - Messages: `checkin.phonePeople`, `checkin.phonePeopleEdit`, `checkin.phoneFooterComponents`. The words are in Step 1.
  - DOM hooks for T11:
    - `[data-checkin-people-line]`, whose button is named "แก้ไขผู้คืนและผู้รับคืน" and reads "แก้ไข";
    - `[data-checkin-part="people"]`;
    - `[data-checkin-phone-warnings]`, below lg only.
  - What T11 relies on, on the phone (md to lg included, as checkout's steps):
    - once both fields are filled with no error, `#checkin-return-by` and `#checkin-receive-by` stay mounted and are hidden by CSS, so `toContainText` still reads them;
    - picking in either field first needs a tap on the line's "แก้ไขผู้คืนและผู้รับคืน" button;
    - the footer reads "ส่วนควบได้คืน {returned} · ขาด {missing}" while the asset has travelling components;
    - each card warning is in the DOM twice (the hidden card and `[data-checkin-phone-warnings]`), so a phone assert scopes to that block, not an unscoped `getByText`.

- [ ] **Step 1: Write the failing tests.** Create `tests/checkin-phone.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { checkinPeopleOpen, checkinPhoneFooterCounts, checkinPhonePartClass, checkinPhoneParts } from "../src/lib/checkin-phone.ts"

const read = (file: string) => readFileSync(file, "utf8").replace(/\r\n/g, "\n")
const messages = (locale: "th" | "en") => JSON.parse(read(`messages/${locale}.json`)) as Record<string, Record<string, string>>

test("below lg ผู้คืน and ผู้รับคืน fold into one line; แก้ไข, an empty field or an error shows both; from lg both always show (spec §8.8)", () => {
  // [closed, open]. "contents" keeps the two fields cells of section 2's grid, so from lg the layout does not move.
  assert.deepEqual(Object.fromEntries(checkinPhoneParts.map((part) => [part, [checkinPhonePartClass(part, false), checkinPhonePartClass(part, true)]])), {
    people: ["max-lg:hidden lg:contents", "contents"],
    peopleLine: ["lg:hidden", "hidden"],
  })
  const both = { opened: false, returnBy: "E001 - สมชาย ใจดี", receiveBy: "IT01 - สมศรี มีสุข", returnByError: false, receiveByError: false }
  assert.equal(checkinPeopleOpen(both), false, "the holder and you, both chosen: the line")
  assert.equal(checkinPeopleOpen({ ...both, opened: true }), true, "แก้ไข, or a pick in either field")
  assert.equal(checkinPeopleOpen({ ...both, returnBy: "" }), true, "no ผู้คืน: nothing chosen yet, or a handover to a department or a room")
  assert.equal(checkinPeopleOpen({ ...both, receiveBy: "" }), true, "no ผู้รับคืน: the signed-in user has no employee")
  assert.equal(checkinPeopleOpen({ ...both, returnByError: true }), true, "an error under ผู้คืน, P2-R18's included: the focus target shows")
  assert.equal(checkinPeopleOpen({ ...both, receiveByError: true }), true, "a refusal under ผู้รับคืน after the review")
})

test("the phone's footer counts the components back and missing; no components, or a late return, keep the desktop line (spec §8.8, P2-R4)", () => {
  assert.deepEqual(checkinPhoneFooterCounts({ lateReturn: false, returned: 1, missing: 1 }), { returned: 1, missing: 1 })
  assert.deepEqual(checkinPhoneFooterCounts({ lateReturn: false, returned: 2, missing: 0 }), { returned: 2, missing: 0 })
  assert.deepEqual(checkinPhoneFooterCounts({ lateReturn: false, returned: 0, missing: 2 }), { returned: 0, missing: 2 })
  assert.equal(checkinPhoneFooterCounts({ lateReturn: false, returned: 0, missing: 0 }), null, "no components (or none read yet): รับคืน <tag> จาก <ผู้คืน>")
  assert.equal(checkinPhoneFooterCounts({ lateReturn: true, returned: 1, missing: 0 }), null, "the late return keeps รับคืน <component tag> จาก <holder>")
})

test("the phone's words, Thai and English (spec §8.8, board TX-Checkin-Phone)", () => {
  const words: Record<string, [string, string]> = {
    phonePeople: ["ผู้คืน / ผู้รับคืน: {returnBy} / {receiveBy}", "Returned by / received by: {returnBy} / {receiveBy}"],
    phonePeopleEdit: ["แก้ไขผู้คืนและผู้รับคืน", "Edit who returns it and who receives it"],
    phoneFooterComponents: ["ส่วนควบได้คืน {returned} · ขาด {missing}", "Components back: {returned} · missing: {missing}"],
  }
  for (const [key, pair] of Object.entries(words)) assert.deepEqual([messages("th").checkin[key], messages("en").checkin[key]], pair, key)
  // The button's visible word; its accessible name (phonePeopleEdit) starts with it (label in name).
  assert.deepEqual([messages("th").common.edit, messages("en").common.edit], ["แก้ไข", "Edit"])
})

test("the form: one line opens both people fields, the footer's phone line, the card's warnings on the phone, the camera (spec §8.8, P2-R12)", () => {
  const form = read("src/components/asset-operations/checkin-form.tsx")
  for (const part of [
    'import { checkinPeopleOpen, checkinPhoneFooterCounts, checkinPhonePartClass } from "@/lib/checkin-phone"',
    "const [phonePeopleOpen, setPhonePeopleOpen] = useState(false)",
    'const isDesktop = useMediaQuery("(min-width: 64rem)")',
    "summaryOnPhone={false}",
    "warnings={summaryWarnings}",
    // T9's lateReturn (lateReturnOf): a blocked outstanding row keeps sections 2 and 3, and its counts (X19).
    "const phoneFooterCounts = checkinPhoneFooterCounts({ lateReturn: lateReturn !== null, returned: travelling.length - missingComponents.length, missing: missingComponents.length })",
    't("phonePeople", { returnBy: selectedReturnBy?.label ?? "", receiveBy: selectedReceiver?.label ?? "" })',
    '<Button type="button" variant="ghost" size="sm" aria-label={t("phonePeopleEdit")} onClick={openPhonePeople}>',
    'requestAnimationFrame(() => document.getElementById("checkin-return-by")?.focus())',
  ]) assert.ok(form.includes(part), part)
  assert.match(form, /const peopleOpen = checkinPeopleOpen\(\{\n\s+opened: phonePeopleOpen,\n\s+returnBy: selectedReturnBy\?\.label \?\? "",\n\s+receiveBy: selectedReceiver\?\.label \?\? "",\n\s+returnByError: Boolean\(fieldErrors\.errors\.returnBy\),\n\s+receiveByError: Boolean\(fieldErrors\.errors\.receiveBy\),\n\s+\}\)/)
  assert.match(form, /<div data-checkin-people-line className=\{cn\("flex min-w-0 items-center justify-between gap-3 md:col-span-2", checkinPhonePartClass\("peopleLine", peopleOpen\)\)\}>/)
  assert.match(form, /<div data-checkin-part="people" className=\{checkinPhonePartClass\("people", peopleOpen\)\}>\n\s+<SearchableSelect\n\s+id="checkin-return-by"\n[\s\S]*?\/>\n\s+<SearchableSelect\n\s+id="checkin-receive-by"\n[\s\S]*?\/>\n\s+<\/div>/)
  const at = (text: string, from = 0) => {
    const index = form.indexOf(text, from)
    assert.ok(index >= 0, text)
    return index
  }
  // Section 2 by its title: T9's late panel has its own FormSection number={2} earlier in the source.
  const section2 = '<FormSection number={2} title={t("sectionReturn")}>'
  assert.ok(
    at(section2) < at("data-checkin-people-line") && at("data-checkin-people-line") < at('data-checkin-part="people"') &&
      at('data-checkin-part="people"') < at('id="checkin-return-by"') && at('id="checkin-return-by"') < at('id="checkin-receive-by"') &&
      at('id="checkin-receive-by"') < at("<FormSection number={3}"),
    "section 2 opens with the line, then the two fields",
  )
  const people = form.slice(at('<div data-checkin-part="people"'), at("<FormSection number={3}"))
  assert.equal(people.match(/onChange=\{\(value\) => \{\n\s+setPhonePeopleOpen\(true\)\n/g)?.length, 2, "a pick in either field keeps both open, so they never fold under the finger")
  assert.match(form, /description: phoneFooterCounts \? \(\n\s+<>\n\s+<span className="max-lg:hidden">\{footerLine\}<\/span>\n\s+<span className="lg:hidden">\{t\("phoneFooterComponents", phoneFooterCounts\)\}<\/span>\n\s+<\/>\n\s+\) : footerLine,/)
  // The card's warnings, below lg only and as the frame's last child (the card is hidden there, P2-R12). Never rendered
  // on the desktop, so a desktop locator meets each warning once.
  assert.match(form, /\{!isDesktop && summaryWarnings\.length > 0 \? \(\n\s+<div data-checkin-phone-warnings className="grid gap-2 lg:hidden">\n\s+\{summaryWarnings\.map\(\(warning, index\) => \(\n\s+<Notice key=\{index\} tone="warning">[\s\S]*?\) : null\}\n\s+<\/OperationFormFrame>/)
  const dropzone = form.slice(at("<FileDropzone"), at("/>", at("<FileDropzone")))
  assert.ok(dropzone.includes('accept="image/*"') && dropzone.includes('capture="environment"'), "a phone opens the camera for the photos (spec §8.8)")
  assert.equal(form.match(/\bid="checkin-return-by"/g)?.length, 1, "the line takes no id; v-track's once-per-page rule holds")
})
```

- [ ] **Step 2: Run them and see them fail.** Run `node --test tests/checkin-phone.test.ts`. Expected: the file fails to load with `ERR_MODULE_NOT_FOUND` (`Cannot find module …/src/lib/checkin-phone.ts`), so every test in it fails.

- [ ] **Step 3: Implement.**
  1. **`src/lib/checkin-phone.ts`.** Use the Produces signatures; the tests fix the bodies. Header comment: "รับคืน on the phone (group 3 spec §8.8, plan 2 Task 10): one form DOM, no steps. Below lg, ผู้คืน and ผู้รับคืน fold into one line with แก้ไข, and the footer counts the components. Pure and client-safe." Doc comments:
     - `checkinPhonePartClass`: the wrapper of the two fields is `display: contents` wherever it shows, so the fields stay cells of section 2's grid. The line is phone-only.
     - `checkinPeopleOpen`: both fields show in four cases:
       - the user opened them (แก้ไข, or a pick in either);
       - either is empty;
       - either has an error, because a focus target must show (v-track M-R1);
       - from lg, always (that part is CSS).
     - `checkinPhoneFooterCounts`: the counts behind "ส่วนควบได้คืน X · ขาด Y" while the asset has travelling components. It returns null otherwise, and for a late return, and the footer then keeps its desktop line.
  2. **The words.** Write `<scratchpad>/p2-t10-messages.json` as `{ "set": { "th": { "checkin.phonePeople": "…", "checkin.phonePeopleEdit": "…", "checkin.phoneFooterComponents": "…" }, "en": { … } } }`, with the values of Step 1's words test. Run `node scripts/messages-edit.mjs <that file>`. Expected output: `messages updated: 3 th, 3 en, 0 deleted`. Then run `node --test tests/thai-glossary.test.ts tests/messages-parity.test.ts`. Expected: PASS.
  3. **`checkin-form.tsx`, the logic.**
     - **Imports.** Add `checkinPeopleOpen, checkinPhoneFooterCounts, checkinPhonePartClass` from `@/lib/checkin-phone` (the exact import line in Step 1), and `useMediaQuery` from `@/components/ui/use-media-query`. Add `cn` (`@/lib/utils`), `Button` and `Notice` if T8 left any of them out.
     - **State,** next to T8's `useState` calls:
       - `const [phonePeopleOpen, setPhonePeopleOpen] = useState(false)`, with the comment "the phone's people line (spec §8.8): แก้ไข or a pick in either field opens both fields, and they stay open".
       - `const isDesktop = useMediaQuery("(min-width: 64rem)")`, with the comment "the card is hidden below lg (P2-R12); its warnings show after section 3 there".
     - **Derived values,** just before the component's `return (`, after T8's `detailFailedNotice` and T9's late values, so every value they read is declared above them:
       - `const peopleOpen = checkinPeopleOpen({ … })`, multi-line, exactly as Step 1's regex reads it.
       - `const footerLine = lateReturn ? lateFooter : chosen && values.returnBy ? t("footerDescription", { tag: chosen.assetTag, returner: values.returnBy }) : t("footerIncomplete")`. This is the frame's `footer.description` as T8 and T9 left it, moved here unchanged.
       - `const phoneFooterCounts = checkinPhoneFooterCounts({ lateReturn: lateReturn !== null, returned: travelling.length - missingComponents.length, missing: missingComponents.length })`, on one line as Step 1 reads it. `lateReturn` is T9's value (X19); the two counts are the ones T8's ส่วนควบ row shows.
       - `const summaryWarnings = lateReturn ? lateWarnings : [...warningLines, ...(detailFailedNotice ? [detailFailedNotice] : [])]`. This is the card's `warnings` value as T8 and T9 left it, moved here unchanged.
     - **`openPhonePeople()`,** after `leaveReview`, with the comment "แก้ไข on the phone's people line: both fields show, and ผู้คืน takes focus". It calls `setPhonePeopleOpen(true)`, then `requestAnimationFrame(() => document.getElementById("checkin-return-by")?.focus())`, the same as checkout's `openPhoneDate` (`checkout-form.tsx:745-749`).
  4. **`checkin-form.tsx`, the markup.**
     - **The card:** `warnings={summaryWarnings}`.
     - **The footer.** Its `description` becomes the block below; the other footer keys stay. The `status` slot of `StickyFormFooter` is above the buttons on phones, which gives the board's "over the primary button".
       ```tsx
       description: phoneFooterCounts ? (
         <>
           <span className="max-lg:hidden">{footerLine}</span>
           <span className="lg:hidden">{t("phoneFooterComponents", phoneFooterCounts)}</span>
         </>
       ) : footerLine,
       ```
     - **Section 2** (`<FormSection number={2} title={t("sectionReturn")}>`), the first children of its grid:
       ```tsx
       <div data-checkin-people-line className={cn("flex min-w-0 items-center justify-between gap-3 md:col-span-2", checkinPhonePartClass("peopleLine", peopleOpen))}>
         <p className="min-w-0 break-words text-sm text-foreground">
           {t("phonePeople", { returnBy: selectedReturnBy?.label ?? "", receiveBy: selectedReceiver?.label ?? "" })}
         </p>
         <Button type="button" variant="ghost" size="sm" aria-label={t("phonePeopleEdit")} onClick={openPhonePeople}>
           {tCommon("edit")}
         </Button>
       </div>
       <div data-checkin-part="people" className={checkinPhonePartClass("people", peopleOpen)}>
         {/* T8's <SearchableSelect id="checkin-return-by" …/> and <SearchableSelect id="checkin-receive-by" …/>, props unchanged */}
       </div>
       ```
       - Each of the two `onChange` handlers becomes a block whose first statement is `setPhonePeopleOpen(true)`, followed by T8's own call, for example `onChange={(value) => {\n setPhonePeopleOpen(true)\n setEmployeeField("receiveBy", value)\n}}`.
       - The prefill in T8's `applyChoice` calls `setEmployeeField` directly and does **not** open the fields, so a pick of an asset shows the line.
       - The line names the people as the fields show them (Decisions). T9's late panel field `#checkin-late-receive-by` is not touched.
     - **The phone warnings,** as the frame's last child, after section 3. In the source this also comes after T9's branch.
       ```tsx
       {!isDesktop && summaryWarnings.length > 0 ? (
         <div data-checkin-phone-warnings className="grid gap-2 lg:hidden">
           {summaryWarnings.map((warning, index) => (
             <Notice key={index} tone="warning">
               {warning}
             </Notice>
           ))}
         </div>
       ) : null}
       ```
       - This renders each warning the way `OperationSummaryCard` does (`operation-summary-card.tsx:83-87`).
       - If T8 gave the card's warnings a tone of their own, render each warning exactly as the card does. Keep the hooks and the `!isDesktop` / `lg:hidden` guard. In Step 1's regex, change only the `<Notice …>` part.
     - **Unchanged:**
       - the photo `FileDropzone`, whose `capture="environment"` is the phone's camera (spec §8.8 "camera capture"); Step 1 pins it so a later change cannot drop it;
       - วันที่คืน, หมายเหตุ, อุปกรณ์ที่ขาด, the damage and repair fields, the open-repair notice and both pads, which show on the phone as T8 built them (Appendix A รับคืน);
       - the review dialog, which stays the last guard on the phone (spec §5);
       - the frame head and `summaryOnPhone={false}` (T8);
       - T9's late panel.
  5. **Pins this task reshapes.**
     - **T9's two pins (X11).** In `tests/checkin-late-return-rules.test.ts`, T9's form test (`the รับคืน form: the late return is a branch of the one form …`), rewrite two entries of the `for (const part of [...])` list:
       - `"warnings={lateReturn ? lateWarnings :",` → `"const summaryWarnings = lateReturn ? lateWarnings :",`;
       - `"description: lateReturn ? lateFooter :",` → `"const footerLine = lateReturn ? lateFooter :",`.

       The other entries of that list stay, including `rows={lateReturn ? lateSummaryRows :` and `checklist={lateReturn ? lateChecklist :`.
     - **T8's pins.** T8's form test (`tests/checkin-form-rules.test.ts`) quotes `'t("footerDescription", { tag: chosen.assetTag, returner: values.returnBy })'`, which the move keeps. It quotes neither the whole `warnings={[...warningLines, …]}` nor either people `onChange`.
     - **Any other hit.** Search `tests/` for the three old expressions (`description: lateReturn`, `description: chosen && values.returnBy`, `warnings={`, `setEmployeeField("returnBy", value)`, `setEmployeeField("receiveBy", value)`). Rewrite every hit on `checkin-form.tsx` to the new text in this commit and name it in the report. T9's late field `onChange={(value) => { setEmployeeField("receiveBy", value); lateErrors.clear("receiveBy") }}` is not this task's and stays.
  6. **Pins checked and kept** (as T8 and T9 left them):
     - `tests/checkin-choice.test.ts:31-32`: `id="checkin-return-by"[\s\S]*?options=\{returnByOptions\}` and the receive-by twin still match inside the wrapper.
     - `tests/v-track2-o.test.ts`, the checkin test:
       - `assertOperationForm` (`:83-96`) still counts `id="checkin-return-by"` once, because the line takes no id and `getElementById("checkin-return-by")` does not match `\bid="`;
       - `<SearchableSelect\n\s+id="checkin-return-by"\n` (`:195-197`) holds at the deeper indent;
       - the `focusFirst(... reveal: leaveReview })` line is unchanged.
     - `tests/validation-guards.test.ts:27,84`: still one `<form>`. V4 holds, because both fields keep `id=` and `error=`.
     - `tests/form-migration-guards.test.ts`:
       - `STICKY_FOOTER_ROUTES` is unchanged: the form renders no `StickyFormFooter` of its own, and the frame's bar carries the phone line;
       - the checkin `CONSTRAINT_FLOORS` row T8 set is unchanged, because no required control is added.
     - `tests/checkin-form-rules.test.ts` (T8): its `data-slot=` ban holds (the new hooks are `data-checkin-*`), and so do its section titles and the spec-order checks.
     - `tests/checkin-late-return-rules.test.ts` (T9), apart from the two pins above: one `<form>`, one `OperationReviewDialog`, each `checkin-late-*` id once, `{lateReturn ? (\n <div data-checkin-late-panel>`, and its `"-"|text-warning|next/link` ban.
     - `tests/operations-sweep-ui.test.ts` (T8's checkin test), `tests/asset-handover-checkin.test.ts:52` and `tests/legacy-checkin-flow.test.ts` (their bans): the new markup has no `"-"`, `<section`, `text-warning`, `text-xs`, `rounded-full`, `uppercase`, `from "next/link"`, `<input`, `<select`, `<textarea` or `<Chip`.
     - `tests/e2e-cross-cutting.test.ts:246`: the four checkin ids stay.
     - `tests/form-frames-ui.test.ts`: T8's checkin frame-head regex is untouched.

- [ ] **Step 4: Run the tests and the gates.**
  - Run `node --test tests/checkin-phone.test.ts tests/checkin-late-return-rules.test.ts tests/checkin-form-rules.test.ts tests/checkin-choice.test.ts tests/v-track2-o.test.ts tests/validation-guards.test.ts tests/form-migration-guards.test.ts tests/form-frames-ui.test.ts tests/operations-sweep-ui.test.ts tests/asset-handover-checkin.test.ts tests/legacy-checkin-flow.test.ts tests/e2e-cross-cutting.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts`.
  - Expected: all pass.
  - Then run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: no failures and 0 lint errors. A pin outside this task's list that fails is rewritten in this commit and named in the report.

- [ ] **Step 5: Commit.**
```
git add src/lib/checkin-phone.ts src/components/asset-operations/checkin-form.tsx messages/th.json messages/en.json tests/checkin-phone.test.ts tests/checkin-late-return-rules.test.ts
git commit -m "feat(checkin): on the phone ผู้คืน / ผู้รับคืน read as one line with แก้ไข, the footer counts the components back and missing, and the summary's warnings show after section 3 (group 3 spec §8.8)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
Add any other pin file that Step 3.5 or Step 4 rewrote to the `git add` line.

---

### Task 11: E2E of รับคืน (a component left out, its late return, the return department, the repair link) and the docs (spec §17, §6, §8, §12; P2-R21, P2-R22)

The return specs follow the new page, and a new spec walks spec §17's flow:
- a return with one component left out;
- the RT- lists it;
- the parent's next ส่งมอบ warns of it, and is never saved;
- the late return re-attaches it while the parent sits in IT stock, and the RT- prints its line.

`return.spec.ts` reads the return department back from the asset. Its ส่งซ่อม returns open their repair record from the RT-'s link instead of by its address. The asset detail's history test moves to a ส่วนกลาง asset, because a บุคคล asset's return now writes its own เปลี่ยนแผนก line. Then come the docs and the controller's run.

T1 to T10 have changed the files below, so each block is named by its content. Line numbers are HEAD `452b72d7`'s.

**Rulings this task applies (the skeleton's, then the controller's):**
- **Global Constraint, the E2E settings rule:** E2E never saves settings, so the return department in E2E is the default `IT`.
- **P2-R21:** the docs task covers the files GP G7 lists. The wiki and the Production SELECT that checks `IT` is active go to the controller's round notes, not to the plan's code.
- **P2-R22 (recorded only; these go in the docs):**
  - a late return makes later documents on the parent downstream;
  - after ถอดออก, a standalone ส่วนควบ keeps its holder;
  - an outstanding component is refused in an audit round that is open across the RT-;
  - G17: the summary's department is not re-sent.
- **The controller's rulings on the cross-checks** (named by their subject):
  - **ส่วนกลาง late return (amends P2-R7's last bullet):** a late return that stands alone takes the chosen room and the return department, and its holder is cleared, except a ส่วนกลาง component, which keeps its department (spec §6: ส่วนกลาง keeps its department on a return). Re-attached, every ownership follows the parent (spec §6 "A component follows its parent"). The docs state this rule.
  - **Exact words:** `TX_WORDS` copy the exact th.json values Tasks 4, 8 and 9 commit (Step 0's table, Step 3c). ส่งมอบ's warning is matched with `templatePattern(TX_WORDS.checkoutOutstanding, { count: "1" })`.
  - **Task 12, the asset pages:** spec §8.5 "Asset pages" (the parent's components tab, the component's own page) is Task 12's, which runs after this task. Task 12 appends one assert to `return-components.spec.ts` and one docs line. This task does not assert those pages or describe them in the docs.
  - **Missing may come back late:** a component whose status is Missing (หาไม่พบ) may be returned late, since a component brought back is found. Lost (สูญหาย), Disposed and Retired are refused. The docs name this.
  - **Two placements accepted:** the repair link and the department are read in `return.spec.ts`, and AD2 moves to a ส่วนกลาง asset (`asset-detail.spec.ts`, `tests/e2e-asset-detail.test.ts`). See Decisions.

**Files:**
- Create: `e2e/transactions/return-components.spec.ts`
- Modify: `e2e/transactions/return.spec.ts` (all three tests; RT3 keeps its title, which `tests/e2e-transactions.test.ts` reads)
- Modify: `e2e/transactions/tx-plan.ts`: add `RETURN_DEPARTMENT_CODE` after `chooseSecondDepartment` (`:43-48`)
- Modify: `e2e/transactions/tx-support.ts`:
  - the `./tx-plan.ts` import (`:12`);
  - `CreateAssetOptions` (`:55`);
  - new: `installComponentByApi` after `handoverByApi` (`:89-108`), and `readReturnDepartment` after `readSecondDepartment` (`:148-160`);
  - `conditionChip` (`:228-231`);
  - new: `returnChecklistBox` after `conditionChip`, and `SavedReturn`, `saveReturnForm`, `SavedLateReturn`, `saveLateReturn` after `saveHandoverForm` (`:311-326`).
- Modify: `e2e/transactions/tx-words.ts` (17 keys, Step 3c)
- Modify: `e2e/cross-cutting/field-errors.spec.ts`:
  - the `./support/forms.ts` import (`:7`);
  - the return test (`:136-161`);
  - the M9 test (`:181-193`).
- Modify: `e2e/cross-cutting/support/forms.ts`: imports (`:3-9`) and `fillReturn` (`:36-46`)
- Modify, comments only:
  - `e2e/cross-cutting/support/records.ts` `returnAsset` (`:109-110`);
  - `e2e/asset-detail/detail-steps.ts` `returnByApi` (`:174-175`).
- Modify: `e2e/asset-detail/asset-detail.spec.ts:78` (AD2's asset becomes ส่วนกลาง; see Decisions; not in the skeleton's list, accepted by the controller)
- Unchanged, checked only: `e2e/cross-cutting/support/refusals.ts`. Task 5 added the `component-return` entry (its Step 3m), and `tests/e2e-cross-cutting.test.ts:132-138` pins it.
- Test (pins rewritten in the E2E commit):
  - `tests/e2e-transactions.test.ts`:
    - TX2's `conditionChip` signature (`:182`);
    - TX3 (`:192-216`);
    - the S-R48 test (`:218-241`, which becomes `async`);
    - TX7's `readdirSync` list (`:293-295`);
    - the plan-1 department test's `CreateAssetOptions` line (`:337`);
    - a new test at the end.
  - `tests/e2e-cross-cutting.test.ts`:
    - EM3's checkin row (`:229`) and its controls list (`:246`);
    - new asserts at the end of EM3 (before `:275`).
  - `tests/e2e-asset-detail.test.ts`: one assert in the "five steps" test (after `:51`; accepted by the controller).
- Pins that still pass, unchanged:
  - `e2e-transactions.test.ts:146` (return.spec keeps exactly one `toBeVisible({ timeout: TRANSACTION_PAGE_ARRIVAL_MS })`; field-errors keeps four arrival checks);
  - `:313-321` (the new spec reads the picker through `findAssetRow` and `pickedAsset`, never `locator("#checkin-checkout")`);
  - `:323-330` (every TX_WORDS value is a th.json value);
  - `e2e-cross-cutting.test.ts:208-217` (the field-errors dialogs and `save()`);
  - `e2e-review.test.ts:89-104` (no delete request, no settings page, no LDAP, no import);
  - `e2e-suite.test.ts:315-328`;
  - `e2e-asset-detail.test.ts:69` (return.spec keeps `await expect(primary).toHaveAccessibleName("รับคืน")`).
- Assumed done by Task 8: `tests/e2e-transactions.test.ts:136-137` (the checkin page's `getAssetOperationMasterOptions` call). Task 8 changes that call and rewrites the pin.
- Docs:
  - `docs/99_CHANGELOG.md` (above `:7`);
  - `DEVELOPER_HANDOFF.md`: after the plan-1 bullet, which ends before `## Open Go-Live Decisions` (`:1299`), plus one Go-Live line;
  - `docs/05_ASSET_LIFECYCLE.md`: `:59`, after `:83`, `:116-117`, `:119`;
  - `docs/06_WORKFLOWS.md`: `:50`, `:54`, `:56`, `:63`, `:201`;
  - `docs/03_DATABASE.md`: `:16`, `:28`;
  - `docs/07_UAT_CHECKLIST.md`: before `## Sign-Off` (`:580`);
  - `docs/11_FEATURE_LIST.md`: `:146`, `:149`, `:152`, `:335`;
  - `docs/12_HANDOUT.md`: `:46-48`;
  - `docs/17_REPAIR_RECORD_GUIDE_TH.md`: `:21`.

**Interfaces:**
- Consumes (names as T1-T10 produce them; Step 0 checks each one against the code):
  - **T1:** `DEFAULT_CHECKIN_DEPARTMENT_CODE = "IT"` (`src/lib/checkin-department.ts`, loadable by `node --test`). Every return writes the return department on a บุคคล or Stock asset and on the components that come back, with a `department_change` movement (referenceType `checkin`, "เปลี่ยนแผนก" in the history).
  - **T3:**
    - the checkin request's `missingComponentIds` (component asset ids). An absent key means everything came back, so `records.ts` and `detail-steps.ts` keep their bodies.
    - The checkin answer `201 { ...AssetCheckin, missingComponents: { assetTag, name }[] }`, sorted by tag and always present.
    - The component left out keeps its room. It keeps its holder and department when ผู้คืน is already its holder (P2-R7).
  - **T4:**
    - the รับคืน row of an outstanding component is eligible, under its holder's group;
    - its line reads `"ส่วนควบค้างคืน ของ {parentTag}"` + `" · "` + the RT- number (`assetOperation.outstandingLine`, T4 owns it; T8 adds only the row's badge "ส่วนควบค้างคืน");
    - it is never a ข้อมูลเก่า row;
    - a component whose status is Missing (หาไม่พบ) stays eligible; Lost, Disposed and Retired are refused with `asset.transactionReasonStatusNotReturnable` (not driven here).
  - **T5:**
    - `POST /api/assets/[id]/component-return` answers `201 { checkinId, documentNo, outcome }`;
    - the re-attached component takes the parent's room and department, and no holder;
    - standing alone, it takes the chosen room and the return department, and no holder, except a ส่วนกลาง component, which keeps its department (`getLateReturnDepartmentId` in `src/lib/asset-department-rule.ts`; not driven here);
    - the parent's component manager (`/th/assets/<parent>/components`) shows an outstanding link among the current ones, with the line `"ค้างคืน · อยู่กับ <code - name> · <RT->"` (`asset.componentOutstanding`, `asset.componentOutstandingWith`).
  - **T6:**
    - the checkin answer gains `repair: { id, repairNo, joined } | null` (always present);
    - the RT- page prints `[data-document-lines]` only when there are lines, each `[data-document-line="missing"|"returned"|"repair"]`;
    - the missing line is `"{component} · อยู่กับ {holder} ที่ {location}"`, with component `"<tag> - <name>"`, holder `"<code> - <fullNameTh>"` and room `"<code> - <name>"`;
    - the late line is `"{tag} คืนแล้ว {date} · รับโดย {name}"`, with `date` the Bangkok short day that `thaiDay` gives;
    - the repair line's whole text is the link, `"เปิดใบซ่อม {repairNo}"` / `"ต่อใบซ่อม {repairNo}"`, with `href="/th/maintenance/<id>"`.
  - **T8 (the รับคืน page):**
    - `#checkin-receive-by` starts as the signed-in user's employee, and its text holds `"<code> - <fullNameTh>"`;
    - `#checkin-condition-after` is an `AssetConditionChoice` (radios `name="checkin-condition-after"`, `value=<conditionId>`, named by the Thai condition), with no default;
    - `#checkin-next-status` stays a native select with the labels พร้อมใช้งาน / ส่งซ่อม / รอตัดจำหน่าย, and a row with an open repair offers one option, ส่งซ่อม;
    - `#checkin-next-location` is a `SearchableSelect` of `"code - name"`;
    - `#checkin-components` is a FieldGroup with one checkbox per travelling component. The checkbox's accessible name holds the tag, every box starts checked, and an unticked row shows "ยังไม่ได้คืน".
    - The summary card's rows are `data-summary-row="department"` and `"components"`. Its warnings sit inside `[data-slot="operation-summary-card"]`.
    - The footer status reads `"รับคืน {tag} จาก {returner}"`, with the returner as `"<code> - <fullNameTh>"`.
    - The footer button `ตรวจสอบและบันทึก` opens the dialog `ตรวจสอบก่อนรับคืน` (confirm `ยืนยันรับคืน`), which shows `"ได้คืน {returned} · ขาด {missing}"`.
    - There is one `form input[type=file]`.
    - The empty required fields answer `กรุณาระบุข้อมูลนี้`.
  - **T9:**
    - **The late-return panel** of a chosen outstanding row shows the parent's tag and name and the RT- number.
      - `#checkin-late-receive-by` holds `"<code> - <fullNameTh>"` of the signed-in user.
      - `#checkin-late-location` is rendered only when `parentInStock` is false.
      - `#checkin-components`, `#checkin-condition-after`, `#checkin-next-status` and `#checkin-next-location` are not rendered.
      - The same footer and review dialog save it.
      - `receiveBy` is sent as the chosen employee's option label, as the main form's `setEmployeeField` does.
      - After the save the page opens `/th/asset-management/checkins/<checkinId>`.
    - **ส่งมอบ** shows, inside `[data-checkout-part="asset"]` (the phone's step 1), the Notice `[data-checkout-outstanding]`. Its title is `checkout.componentsOutstanding`, `"ยังค้างคืน {count} รายการ: {list}"`, where `list` joins one line per component, `"<tag> <name> · อยู่กับ <holder's fullNameTh> · ตั้งแต่ <RT->"`. The summary's `[data-summary-row="components"]` adds `checkout.summaryComponentsOutstanding`, `"ค้างคืน {count} รายการ"`.
  - **T10:**
    - the phone footer, inside the frame's `[data-slot="sticky-form-footer"]`, reads `"ส่วนควบได้คืน {returned} · ขาด {missing}"`;
    - `#checkin-return-by` and `#checkin-receive-by` stay in the DOM on the phone (shown by แก้ไข, not mounted by it).
  - **Existing:**
    - `fillTemplate(template, values)` and `templatePattern(template, placeholders)` (`e2e/shell/shell-words.ts:24-38`, `fillTemplate` at `:24`, `templatePattern` at `:29`). `templatePattern` with `{}` turns every placeholder into `[^]*?`.
    - `thaiDay` and `bangkokDate` (`tx-plan.ts:64-73`).
    - `primaryAction`, `factCell` (`e2e/asset-detail/detail-steps.ts`).
    - The component install route `POST /api/assets/[parent]/components` answers 201. It checks active, not already installed, a free slot and no cycle, but not the category (`src/lib/asset-components.ts`). The audit's walk posts `{ componentAssetId, componentRole, slotNo, installedAt: null, reason }` (`e2e/audit/audit-data.ts:113-120`).
- Produces:
  ```ts
  // e2e/transactions/tx-plan.ts (pure, no imports)
  export const RETURN_DEPARTMENT_CODE = "IT"
  // e2e/transactions/tx-support.ts
  export type CreateAssetOptions = { ownershipType?: "personal" | "shared" | "component"; departmentId?: string }
  export async function installComponentByApi(page: Page, parentId: string, componentId: string, role: string, slotNo: string): Promise<void>
  export async function readReturnDepartment(): Promise<{ id: string; code: string; name: string }>
  export function conditionChip(page: Page, label: string, groupId = "checkout-condition"): Locator
  export function returnChecklistBox(page: Page, assetTag: string): Locator
  export type SavedReturn = { id: string; documentNo: string; missingComponents: { assetTag: string; name: string }[]; repair: { id: string; repairNo: string; joined: boolean } | null }
  export async function saveReturnForm(page: Page, assetId: string, atReview?: (review: Locator) => Promise<void>): Promise<SavedReturn>
  export type SavedLateReturn = { checkinId: string; documentNo: string | null; outcome: "reattached" | "standalone" }
  export async function saveLateReturn(page: Page, componentId: string, atReview?: (review: Locator) => Promise<void>): Promise<SavedLateReturn>
  // e2e/transactions/tx-words.ts: TX_WORDS gains the 17 keys of Step 3c
  ```

**Decisions:**
- **Placement.** The repair link and the department are read in `return.spec.ts`, not in the new spec.
  - RT2 is the ส่งซ่อม return. Its "open the repair by URL" step is exactly what §8.7's link replaces.
  - RT1 is the plain return, so it reads the department.
  - The new spec also reads the department, for the parent and the component that came back.
  - A second ส่งซ่อม return in the new spec would add a repair record and an asset per project for nothing.
- **The components:**
  - one computer `RCP` (บุคคล);
  - two components `RCM` and `RCK`, owned as ส่วนควบ (`ownershipType: "component"`, the realistic case), installed through the component route, then handed over by API;
  - `RCK` is the one left out. Its label is one Thai word, so "<receiver code> <label>" is a two-word search.
  - Data: +3 assets per project, +12 per run. No department or room is made.
- **The order is binding (EE N3, risk 8).** `ส่งมอบ` is opened on the parent and never saved. A handed-over parent would make the late return stand alone (§8.6).
- **Devices:**
  - **Both devices:** every test runs in all four projects. รับคืน has no phone steps (§8.8), so both devices save through the footer and the review (`saveReturnForm`, `saveLateReturn`).
  - **The summary card** shows from `lg` only (P2-R12), so it is read on the desktop.
  - **The phone** reads the footer's component counts instead.
  - **No signature** is drawn in the new spec (both are optional). `return.spec.ts` keeps its pads.
- **Not driven** (unit tests and UAT cover them; Step 10's UAT section lists each):
  - the late return with the parent out (stand alone), and a ส่วนกลาง component standing alone keeping its department;
  - the late return of a component whose status is Missing (หาไม่พบ), and the refusal of a Lost, Disposed or Retired one;
  - ผู้คืน not the holder;
  - ถอดออก (a delete request, which the suite never makes);
  - a user without `maintenance:create` (every E2E user with `asset:edit` has it);
  - a missing or inactive return department (it needs a settings save or a master change, both banned);
  - the header's legacy link (§17 does not ask for it).
- **AD2 (asset detail) becomes ส่วนกลาง.** After T1, returning a บุคคล asset writes a `department_change` that references the RT-. The overview's latest three would then be the TR-, the RT-'s department line and the RT-, and `asset-detail.spec.ts:97` (`[HO-, RT-, TR-]`) fails. A ส่วนกลาง asset keeps its department on the handover, the return and the transfer (§6, decision 10), so the three documents stay the latest three.
- **Task 12 follows this task.** It adds spec §8.5's asset pages (the parent's components tab, the component's own page). Leave room for it:
  - its assert goes at the end of the first test of `return-components.spec.ts`, after the component manager's check, and reads `runs` as stored there (`parent`, `leftOut`, `checkin.id`, `checkin.documentNo`). Keep that map's shape and the first test's end as written;
  - the docs here describe the component manager (Task 5) only, and say nothing of the asset pages. Task 12 adds one line about them.
- **The component manager page is checked with axe** (`/th/assets/<parent>/components`, twice). It is an existing page; if it fails axe in a theme, the test fails there and the serial late-return test is skipped. That is a finding to report, not a test bug.
- **Words come from `e2e/shell/shell-words.ts`.** The specs use its `fillTemplate` and `templatePattern`, as `detail-steps.ts` does. No new word helper is added.
- **Midnight.** The late line's day is `thaiDay(bangkokDate())`. A run that crosses midnight in Bangkok between the save and the read fails that check; rerun it.

- [ ] **Step 0: Read what T1-T10 committed.**
  - Run `git log --oneline 452b72d7..HEAD`. Ten task commits are expected.
  - Then check each word and hook this task reads. For each one, read the th.json key the table names, or grep `src` for its hook. The values below are the ones Tasks 4-10 commit, placeholder names included: the fill calls in Steps 4 and 5 use these names.

    | `TX_WORDS` key | Expected th value | th.json key (task) |
    |---|---|---|
    | `checkinFooter` | `รับคืน {tag} จาก {returner}` | `checkin.footerDescription` (T8) |
    | `componentNotReturned` | `ยังไม่ได้คืน` | `checkin.componentNotReturned` (T8) |
    | `componentsBack` | `ได้คืน {returned} · ขาด {missing}` | `checkin.summaryComponentsBack` (T8) |
    | `missingWarning` | `{component} ยังไม่ได้คืน จะอยู่กับ {returner} ที่ {room} และบันทึกเป็นอุปกรณ์ที่ขาดในใบรับคืน` | `checkin.warningComponentMissing` (T8) |
    | `sendToRepairHint` | `บันทึกแล้วระบบจะเปิดใบซ่อมให้อัตโนมัติ` (the hint under ส่งซ่อม) | `checkin.sendToRepairHelp`, whose value T8 changes |
    | `openRepairNotice` | `มีงานซ่อมที่ยังไม่ปิดอยู่ หลังรับคืนทรัพย์สินจะเข้าสถานะ ส่งซ่อม ต่อกับงานซ่อมเดิม ไม่สร้างใบซ่อมใหม่` (HEAD's, no placeholder) | `checkin.openRepairReturnNotice` (T8 keeps it and its Notice) |
    | `phoneComponentsFooter` | `ส่วนควบได้คืน {returned} · ขาด {missing}` | `checkin.phoneFooterComponents` (T10) |
    | `componentsTravel` | `ส่วนควบที่จะส่งมอบไปด้วย {count} รายการ` | `checkout.componentsTravel` (HEAD) |
    | `checkoutOutstanding` | `ยังค้างคืน {count} รายการ: {list}` | `checkout.componentsOutstanding` (T9) |
    | `checkoutSummaryOutstanding` | `ค้างคืน {count} รายการ` | `checkout.summaryComponentsOutstanding` (T9) |
    | `outstandingLine` | `ส่วนควบค้างคืน ของ {parentTag}` | `assetOperation.outstandingLine` (T4) |
    | `componentOutstanding`, `componentOutstandingWith` | `ค้างคืน`, `อยู่กับ {holder}` | `asset.componentOutstanding`, `asset.componentOutstandingWith` (T5) |
    | `documentMissingHeld`, `documentComponentReturned`, `repairOpened`, `repairJoined` | `{component} · อยู่กับ {holder} ที่ {location}`, `{tag} คืนแล้ว {date} · รับโดย {name}`, `เปิดใบซ่อม {repairNo}`, `ต่อใบซ่อม {repairNo}` | `checkin.documentMissingComponentHeld`, `checkin.documentComponentReturned`, `checkin.documentRepairOpened`, `checkin.documentRepairJoined` (T6) |
    | hooks | `id="checkin-components"`, `id="checkin-late-receive-by"`, `checkin-late-location`, `data-document-line`, `data-summary-row`; `data-checkout-outstanding` | `src/components/asset-operations/checkin-form.tsx`, the RT- page; `checkout-form.tsx` (T9) |
    | rule | `check("conditionAfter", required(values.conditionAfter))` | `checkin-form.tsx` |
    | answers | `missingComponents`, `repair` in the checkin answer; `{ checkinId, documentNo, outcome }` from `component-return` | the two routes |

  - `TX_WORDS` must equal th.json (`e2e-transactions.test.ts:323-330`). If a committed value still differs from the table, the earlier task drifted from its plan: stop and report it to the controller instead of copying the drift.

- [ ] **Step 1: Write the failing pins.**
  - **`tests/e2e-transactions.test.ts` TX2** (`:182`) becomes:
```ts
  assert.ok(support.includes('export function conditionChip(page: Page, label: string, groupId = "checkout-condition"): Locator {'))
```
  - **TX3** (`:192-216`): replace the test's title and its first block (to the line before `// The run's second room`) with:
```ts
test("a return to the second room prints the RT- document and writes the return department, and a return sent to repair links its repair record from the RT- (e2e transactions task 3, TX3; group 3 plan 2 task 11)", () => {
  const spec = readTxSpec("e2e/transactions/return.spec.ts")
  for (const field of ["checkin-condition-after", "checkin-next-status", "checkin-next-location"]) assert.ok(spec.includes(`"${field}"`), field)
  // ผู้รับคืน starts as the signed-in person (group 3 spec §8.3), so the first wrong field is the condition group, which has no default.
  assert.ok(spec.includes(`await expect(page.locator('input[name="checkin-condition-after"]').first()).toBeFocused()`))
  assert.ok(!spec.includes('await expect(page.locator("#checkin-receive-by")).toBeFocused()'))
  assert.equal(spec.split("await expect(page.locator(\"#checkin-receive-by\")).toContainText(`${staff.code} - ${staff.fullNameTh}`)").length - 1, 3)
  assert.ok(!spec.includes('pickSearchable(page, "checkin-receive-by"'))
  assert.equal(spec.split('await expect(page.locator("#checkin-return-by")).toContainText(`${receiver.code} - ${receiver.fullNameTh}`)').length - 1, 2, "both returns start with the holder")
  assert.ok(!spec.includes('pickSearchable(page, "checkin-return-by"'))
  assert.ok(spec.includes('const listbox = await searchAssets(page, "checkin-checkout", receiver.code)'))
  assert.ok(spec.includes('await pickAsset(page, "checkin-checkout", asset.assetTag, asset.assetTag)'))
  // The chips, the searchable room and the footer's ตรวจสอบและบันทึก (spec §5, §8.3, §17).
  assert.equal(spec.split('await conditionChip(page, "ดี", "checkin-condition-after").check()').length - 1, 1)
  assert.equal(spec.split('await conditionChip(page, "เสียหาย", "checkin-condition-after").check()').length - 1, 2)
  assert.equal(spec.split("await pickSearchable(page, \"checkin-next-location\", room.code, `${room.code} - ${room.name}`)").length - 1, 3)
  for (const old of ['locator("#checkin-condition-after").selectOption', 'locator("#checkin-next-location").selectOption', '{ name: "บันทึก", exact: true }']) assert.ok(!spec.includes(old), old)
  assert.ok(spec.includes("{ name: TX_WORDS.reviewAndSave, exact: true }"))
  assert.equal(spec.split("await saveReturnForm(page, asset.id, ").length - 1, 3)
  assert.match(spec, /await expectPrints\(page, "พิมพ์ใบรับคืน"\)/)
  assert.match(spec, /expect\(after\.currentLocationId\)\.toBe\(room\.id\)/)
  // The return department, read from the asset (spec §6, §12): the setting's default, and its own history line.
  assert.ok(spec.includes("expect(after.departmentId).toBe(returnDepartment.id)"))
  assert.ok(spec.includes("expect(after.department?.code).toBe(RETURN_DEPARTMENT_CODE)"))
  assert.ok(spec.includes('await expect(page.getByRole("main")).toContainText(TX_WORDS.departmentChange)'))
  assert.equal(spec.split('if (e2eDevice === "desktop")').length - 1, 1, "the summary on the desktop only")
  // ส่งซ่อม: the hint, then the RT-'s link to the record it opened or joined (spec §8.3, §8.7).
  assert.match(spec, /selectOption\(\{ label: "ส่งซ่อม" \}\)/)
  assert.ok(spec.includes('await expect(page.getByRole("main")).toContainText(TX_WORDS.sendToRepairHint)'))
  assert.ok(spec.includes("fillTemplate(TX_WORDS.repairOpened, { repairNo: ticket.repairNo })") && spec.includes("fillTemplate(TX_WORDS.repairJoined, { repairNo: repair.repairNo })"))
  assert.ok(spec.includes("expect(checkin.repair).toEqual({ id: ticket.id, repairNo: ticket.repairNo, joined: false })"))
  assert.ok(spec.includes("expect(checkin.repair).toEqual({ id: repair.id, repairNo: repair.repairNo, joined: true })"))
  assert.ok(!spec.includes("await visit(measure, `/th/maintenance/"), "the repair record opens from the RT-'s link, not by its address")
  assert.match(spec, /page\.request\.get\(`\/api\/maintenance-tickets\?assetId=\$\{asset\.id\}`\)/)
  assert.match(spec, /expect\(after\.status\.name\)\.toBe\("Under Maintenance"\)/)
  assert.deepEqual(expectedFailures(spec), [])
```
    Keep the rest of TX3 (the second room's admin lines and the known findings) as it is.
  - **The S-R48 test** (`:218-241`):
    - It becomes `async () => {`.
    - Its line `assert.ok(body.includes(th.checkin.openRepairReturnNotice), "checkin.openRepairReturnNotice")` becomes:
```ts
  // The app's notice, read through TX_WORDS (group 3 spec §8.3); Task 8 keeps its words.
  const { TX_WORDS } = await import("../e2e/transactions/tx-words.ts")
  assert.equal(TX_WORDS.openRepairNotice, th.checkin.openRepairReturnNotice)
  assert.ok(body.includes('await expect(page.getByRole("main")).toContainText(TX_WORDS.openRepairNotice)'), "checkin.openRepairReturnNotice")
```
  - **TX7's list** (`:293-295`) gains `"return-components.spec.ts"` between `"register-asset.spec.ts"` and `"return.spec.ts"`. `-` sorts before `.`.
  - **`:337`** becomes `'export type CreateAssetOptions = { ownershipType?: "personal" | "shared" | "component"; departmentId?: string }',`.
  - **Append:**
```ts
test("รับคืน leaves a component out and lists it on the RT-, ส่งมอบ warns of it unsaved, and its late return re-attaches it to the parent in IT stock (group 3 plan 2 task 11)", async () => {
  const spec = readTxSpec("e2e/transactions/return-components.spec.ts")
  const support = read("e2e/transactions/tx-support.ts")
  const plan = await import("../e2e/transactions/tx-plan.ts")
  // The return department E2E expects is the setting's default (spec §12): E2E never saves the setting.
  assert.equal(plan.RETURN_DEPARTMENT_CODE, (await import("../src/lib/checkin-department.ts")).DEFAULT_CHECKIN_DEPARTMENT_CODE)
  for (const signature of [
    "export async function installComponentByApi(page: Page, parentId: string, componentId: string, role: string, slotNo: string): Promise<void>",
    "export async function readReturnDepartment(): Promise<{ id: string; code: string; name: string }>",
    "export function returnChecklistBox(page: Page, assetTag: string): Locator {",
    "export async function saveReturnForm(page: Page, assetId: string, atReview?: (review: Locator) => Promise<void>): Promise<SavedReturn>",
    "export async function saveLateReturn(page: Page, componentId: string, atReview?: (review: Locator) => Promise<void>): Promise<SavedLateReturn>",
  ]) assert.ok(support.includes(signature), signature)
  // The return department is read by its code with a GET as the seed admin; nothing makes or sets one.
  const readStart = support.indexOf("export async function readReturnDepartment(")
  const readReturn = support.slice(readStart, support.indexOf("\nexport ", readStart + 1))
  assert.ok(readReturn.includes('admin.get("/api/departments")') && readReturn.includes("department.code === RETURN_DEPARTMENT_CODE"))
  for (const [file, source] of [["tx-support.ts", support], ["return-components.spec.ts", spec]]) assert.doesNotMatch(source, /\.post\(\s*["'`]\/api\/departments/, file)
  // Both saves set the wait first, then the footer, the review and its confirm; the RT- opens after.
  for (const [name, route] of [["saveReturnForm", "/checkin`"], ["saveLateReturn", "/component-return`"]]) {
    const start = support.indexOf(`export async function ${name}(`)
    const body = support.slice(start, support.indexOf("\nexport ", start + 1))
    const at = ["TX_WORDS.reviewAndSave", '"ตรวจสอบก่อนรับคืน"', '"ยืนยันรับคืน"'].map((word) => body.indexOf(word))
    assert.ok(at.every((index, i) => index >= 0 && (i === 0 || index > at[i - 1])), `${name}: footer, review, confirm`)
    assert.ok(body.indexOf("page.waitForResponse(") >= 0 && body.indexOf("page.waitForResponse(") < at[0], `${name}: the wait first`)
    assert.ok(body.includes(route) && body.includes("/th/asset-management/checkins/"), name)
  }
  // The flow in its binding order (spec §17): left out, listed, warned of on an unsaved ส่งมอบ, back late and re-attached.
  assert.match(spec, /test\.describe\.configure\(\{ mode: "serial" \}\)/)
  assert.equal(spec.split('{ ownershipType: "component" }').length - 1, 2)
  assert.equal(spec.split("await installComponentByApi(page, parent.id, ").length - 1, 2)
  assert.ok(spec.includes("await returnChecklistBox(page, leftOut.assetTag).uncheck()"))
  assert.ok(spec.includes("expect(checkin.missingComponents).toEqual([{ assetTag: leftOut.assetTag, name: leftOut.name }])"))
  assert.ok(spec.includes(`page.locator('[data-document-line="missing"]')`) && spec.includes(`page.locator('[data-document-line="returned"]')`))
  assert.ok(spec.includes("toEqual([receiver.id, data.locationId, data.departmentId])"), "the component left out stays with the person returning, in its room")
  assert.ok(spec.includes("`/th/asset-management/checkout?assetId=${run.parent.id}`"))
  for (const save of ["saveHandoverForm(", "ยืนยันส่งมอบ", "บันทึกการส่งมอบ"]) assert.ok(!spec.includes(save), `ส่งมอบ is never saved: ${save}`)
  // ส่งมอบ's warning names its count, then the list it fills (checkout.componentsOutstanding, "…: {list}").
  assert.ok(spec.includes(`part.locator("[data-checkout-outstanding]")`))
  assert.ok(spec.includes('templatePattern(TX_WORDS.checkoutOutstanding, { count: "1" })'))
  assert.ok(spec.includes("fillTemplate(TX_WORDS.checkoutSummaryOutstanding, { count: 1 })"))
  assert.ok(spec.includes('await expect(row).not.toContainText("ข้อมูลเก่า")'))
  assert.ok(spec.includes('for (const id of ["checkin-late-location", "checkin-components", "checkin-condition-after", "checkin-next-status", "checkin-next-location"])'))
  assert.ok(spec.includes('expect(late).toEqual({ checkinId: checkin.id, documentNo: checkin.documentNo, outcome: "reattached" })'))
  assert.ok(spec.includes("toEqual([null, room.id, returnDepartment.id])"))
  // The summary card on the desktop (P2-R12); the phone's footer counts instead.
  assert.equal(spec.split('if (e2eDevice === "desktop")').length - 1, 3)
  assert.ok(spec.includes("TX_WORDS.phoneComponentsFooter"))
  for (const banned of ["request.delete", "/api/admin/settings", "ldap", "import-confirm", "isactive: false"]) assert.ok(!spec.toLowerCase().includes(banned), banned)
})
```
  - **`tests/e2e-cross-cutting.test.ts` EM3:**
    - `:229` becomes:
```ts
    ["src/components/asset-operations/checkin-form.tsx", `check("conditionAfter", required(values.conditionAfter))`, "checkin-condition-after"],
```
    - `:246` becomes `"src/components/asset-operations/checkin-form.tsx": ["checkin-return-by", "checkin-receive-by", "checkin-condition-after", "checkin-next-status", "checkin-next-location"],`.
    - Before the line `// The spec: the suite's fixtures, and findings M3, M8 and M9` (`:275`), add:
```ts
  // รับคืน (group 3 plan 2 task 11): ผู้รับคืน starts as the signed-in person, so the wrong entry is the condition group (no
  // default, spec §8.3); the footer is ตรวจสอบและบันทึก; fillReturn reads both people and picks the chip and the room.
  const returnTest = spec.slice(spec.indexOf('test("return: '), spec.indexOf("// Finding M8"))
  assert.ok(returnTest.includes(`await expectFieldError(page, "checkin-condition-after", REQUIRED, { group: true, focus: 'input[name="checkin-condition-after"] >> nth=0' })`))
  assert.equal(returnTest.split("await reviewAndSave(page)").length - 1, 2)
  assert.ok(!returnTest.includes("await save(page)"))
  assert.ok(spec.slice(spec.indexOf("// Finding M9")).includes("await reviewAndSave(page)"))
  const fill = read("e2e/cross-cutting/support/forms.ts").split("export async function fillReturn(")[1] ?? ""
  assert.ok(fill.includes('await expect(page.locator("#checkin-receive-by")).toContainText(run.employees.itStaff.code)'))
  assert.ok(fill.includes('await page.locator(`input[name="checkin-condition-after"][value="${choices.goodConditionId}"]`).check()'))
  assert.ok(fill.includes('await choose(page, "checkin-next-location", room.code, `${room.code} - ${room.name}`)'))
  assert.ok(!fill.includes("selectOption(choices.goodConditionId)") && !fill.includes('choose(page, "checkin-receive-by"'))
```
  - **`tests/e2e-asset-detail.test.ts`**, after `:51` (the latest-3 assert), add:
```ts
  // AD2's asset is ส่วนกลาง (group 3 plan 2 task 11): it keeps its department through the handover and the return (group 3
  // spec §6), so the three documents stay the latest three; a บุคคล asset's return adds its own เปลี่ยนแผนก line.
  assert.ok(spec.includes('await createTxAsset(page, masters, testInfo.project.name, "AD2", "โน้ตบุ๊กประวัติ", { ownershipType: "shared" })'))
```

- [ ] **Step 2: Run the pins and see them fail.** Run `node --test tests/e2e-transactions.test.ts tests/e2e-cross-cutting.test.ts tests/e2e-asset-detail.test.ts`.
  - Expected failures in `e2e-transactions`:
    - TX2 (the signature);
    - TX3;
    - S-R48 (`TX_WORDS.openRepairNotice` is undefined, and RT3 still holds the notice's literal words);
    - TX7 (the list);
    - the plan-1 department test (`CreateAssetOptions`);
    - the new test (ENOENT).
  - Expected failures elsewhere: EM3 (the new asserts), and the asset detail's "five steps" test.
  - The EM3 rule row passes at once when Task 8 kept the rule in `checkin-form.tsx` (Step 0).

- [ ] **Step 3: The helpers and the words.**
  - **3a. `tx-plan.ts`**, after `chooseSecondDepartment`:
```ts
// The return department's code (group 3 spec §12): the default of the setting checkin_department_code. E2E never saves
// settings (plan 2's settings rule), so every return in a run writes the department with this code.
export const RETURN_DEPARTMENT_CODE = "IT"
```
  - **3b. `tx-support.ts`:**
    - **The import:** the `./tx-plan.ts` import adds `RETURN_DEPARTMENT_CODE`.
    - **`CreateAssetOptions`** takes the Produces type. Its comment says "a ส่วนควบ asset for the components of plan 2's return".
    - **`installComponentByApi`**, after `handoverByApi`:
```ts
// A component installed in its parent through the component route (the component manager's own POST), with the keys
// the audit's walk sends (e2e/audit/audit-data.ts). It checks no category, so a run's Notebook can be a component.
export async function installComponentByApi(page: Page, parentId: string, componentId: string, role: string, slotNo: string): Promise<void> {
  const response = await page.request.post(`/api/assets/${parentId}/components`, {
    data: { componentAssetId: componentId, componentRole: role, slotNo, installedAt: null, reason: "E2E component for the return" },
  })
  expect(response.status(), `POST /api/assets/${parentId}/components: ${(await response.text()).slice(0, 300)}`).toBe(201)
}
```
    - **`readReturnDepartment`**, after `readSecondDepartment` and shaped like it:
      - comment: "The return department (group 3 spec §12): the department whose code is RETURN_DEPARTMENT_CODE, the setting's default, read as the seed admin with a GET. E2E never saves the setting and cannot read it, so a dev setting changed by hand makes the department checks name this department and fail";
      - it reads `admin.get("/api/departments")`;
      - it finds `department.code === RETURN_DEPARTMENT_CODE` among the `MasterDepartment[]`;
      - with none, it throws `` `the dev data has no active department ${RETURN_DEPARTMENT_CODE}, the return department (group 3 spec §12): every return refuses without it` ``;
      - it returns `{ id, code, name }`, and disposes of the context in `finally`.
    - **`conditionChip`** becomes:
```ts
// The condition chips of ส่งมอบ (group 3 spec §7.2) and รับคืน (§8.3): one radio per master condition, by its Thai name,
// in the group given (#checkout-condition by default, #checkin-condition-after on รับคืน).
export function conditionChip(page: Page, label: string, groupId = "checkout-condition"): Locator {
  return page.locator(`#${groupId}`).getByRole("radio", { name: label, exact: true })
}
// One row of รับคืน's components checklist (group 3 spec §8.2, P2-R11): the group #checkin-components, one checkbox per
// travelling component, named with its tag.
export function returnChecklistBox(page: Page, assetTag: string): Locator {
  return page.locator("#checkin-components").getByRole("checkbox", { name: assetTag })
}
```
    - **`saveReturnForm` and `saveLateReturn`**, after `saveHandoverForm`, with the Produces types. Each one:
      1. Sets `page.waitForResponse` for the POST first: `` `/api/assets/${assetId}/checkin` `` or `` `/api/assets/${componentId}/component-return` ``, matched with `response.url().endsWith(…)` and `method() === "POST"`.
      2. Clicks `page.getByRole("button", { name: TX_WORDS.reviewAndSave, exact: true })`.
      3. Takes `const review = page.getByRole("dialog", { name: "ตรวจสอบก่อนรับคืน" })` and expects it visible.
      4. Awaits `atReview?.(review)`.
      5. Clicks `review.getByRole("button", { name: "ยืนยันรับคืน" })`.
      6. Expects 201, showing the body's first 300 characters on failure.
      7. Waits for `` `/th/asset-management/checkins/${id}` `` (`checkin.id` or `late.checkinId`) and returns the answer.

      Their shared comment: "Save รับคืน (group 3 spec §5, §8.6): the footer's ตรวจสอบและบันทึก, the review "ตรวจสอบก่อนรับคืน" (read by atReview), then ยืนยันรับคืน. The RT- page then opens. The same on both devices, since รับคืน has no phone steps (§8.8). saveLateReturn is the late return's panel, posting to the component's own route."
  - **3c. `tx-words.ts`**, after `signOnBehalf`, the 17 keys with the values of Step 0's table:
```ts
  // รับคืน (group 3 plan 2): the footer line, the checklist, the components' counts on the summary and the review, the
  // warning for one left out, the phone's footer, the ส่งซ่อม hint and the open-repair notice (checkin.*); ส่งมอบ's list,
  // its warning and its summary count for one still out (checkout.*); the picker's line for it
  // (assetOperation.outstandingLine) and the component manager's (asset.componentOutstanding*); the RT-'s lines
  // (checkin.document*).
  checkinFooter: "รับคืน {tag} จาก {returner}",
  componentNotReturned: "ยังไม่ได้คืน",
  componentsBack: "ได้คืน {returned} · ขาด {missing}",
  missingWarning: "{component} ยังไม่ได้คืน จะอยู่กับ {returner} ที่ {room} และบันทึกเป็นอุปกรณ์ที่ขาดในใบรับคืน",
  phoneComponentsFooter: "ส่วนควบได้คืน {returned} · ขาด {missing}",
  sendToRepairHint: "บันทึกแล้วระบบจะเปิดใบซ่อมให้อัตโนมัติ",
  openRepairNotice: "มีงานซ่อมที่ยังไม่ปิดอยู่ หลังรับคืนทรัพย์สินจะเข้าสถานะ ส่งซ่อม ต่อกับงานซ่อมเดิม ไม่สร้างใบซ่อมใหม่",
  componentsTravel: "ส่วนควบที่จะส่งมอบไปด้วย {count} รายการ",
  checkoutOutstanding: "ยังค้างคืน {count} รายการ: {list}",
  checkoutSummaryOutstanding: "ค้างคืน {count} รายการ",
  outstandingLine: "ส่วนควบค้างคืน ของ {parentTag}",
  componentOutstanding: "ค้างคืน",
  componentOutstandingWith: "อยู่กับ {holder}",
  documentMissingHeld: "{component} · อยู่กับ {holder} ที่ {location}",
  documentComponentReturned: "{tag} คืนแล้ว {date} · รับโดย {name}",
  repairOpened: "เปิดใบซ่อม {repairNo}",
  repairJoined: "ต่อใบซ่อม {repairNo}",
```
    Each value is the th.json value of Step 0's table, placeholder names included. `openRepairNotice` is HEAD's `checkin.openRepairReturnNotice`, which Task 8 does not change. `checkoutOutstanding` keeps `{list}`: the spec matches it with `templatePattern`, and reads the list's parts one by one.

- [ ] **Step 4: Rewrite `e2e/transactions/return.spec.ts`.**
  - **Header comment:** add one sentence. The return writes the return department (group 3 spec §6, §12, the setting's default `IT`, which E2E never saves); the page's people start filled, the condition chips start empty and the room is searchable (§8.3); and a ส่งซ่อม return links its repair record from the RT- (§8.7).
  - **Imports:**
    - `asUser, expect, test` from `../support/fixtures.ts`;
    - `runRecords` from `../support/run-plan.ts`;
    - `readRunData, readRunState` from `../support/state.ts`;
    - `fillTemplate` from `../shell/shell-words.ts`;
    - from `./tx-support.ts`: `conditionChip, createTxAsset, ensureSecondLocation, expectFieldError, expectPrints, handoverByApi, PHOTO_FIXTURE, pickAsset, pickedAsset, pickSearchable, readAsset, readAssetMasters, readReturnDepartment, record, saveReturnForm, searchAssets, signOnPad, visit, visitAssetPage, TRANSACTION_PAGE_ARRIVAL_MS`;
    - `bangkokDate, RETURN_DEPARTMENT_CODE` from `./tx-plan.ts`;
    - `TX_WORDS`;
    - `factCell, primaryAction`;
    - `DETAIL_WORDS`.
  - **RT1** (title: "a return: the RT- document prints, and the asset is Ready in the room it was taken to, with no custodian and the return department"):
```ts
  const data = readRunData()
  const receiver = data.employees.receiver1
  const staff = data.employees.itStaff
  const room = await ensureSecondLocation()
  const returnDepartment = await readReturnDepartment()
  const runDepartment = runRecords(readRunState().runId).department
  const masters = await readAssetMasters(page)
  const asset = await createTxAsset(page, masters, testInfo.project.name, "RT1", "โน้ตบุ๊กรับคืน")
  const handover = await handoverByApi(page, asset.id, receiver.id, masters.goodConditionId)
  // … the asset page's primary รับคืน, the URL, the h1 with TRANSACTION_PAGE_ARRIVAL_MS, pickedAsset and the HO- number, as today (:42-50)
  // The handover's holder returns it, and the signed-in person receives it, tagged คุณ (group 3 spec §8.3).
  await expect(page.locator("#checkin-return-by")).toContainText(`${receiver.code} - ${receiver.fullNameTh}`)
  await expect(page.locator("#checkin-receive-by")).toContainText(`${staff.code} - ${staff.fullNameTh}`)
  await record(measure, "return form", testInfo)

  // A wrong entry first: the condition (no default), the status after the return and the room are empty. Each error shows
  // under its field, and the condition group's first chip takes focus.
  await page.getByRole("button", { name: TX_WORDS.reviewAndSave, exact: true }).click()
  for (const field of ["checkin-condition-after", "checkin-next-status", "checkin-next-location"]) {
    await expectFieldError(page, field, "กรุณาระบุข้อมูลนี้")
  }
  await expect(page.locator('input[name="checkin-condition-after"]').first()).toBeFocused()

  await conditionChip(page, "ดี", "checkin-condition-after").check()
  await page.locator("#checkin-next-status").selectOption({ label: "พร้อมใช้งาน" })
  await pickSearchable(page, "checkin-next-location", room.code, `${room.code} - ${room.name}`)
  // … the photo ("photo.png" in main) and the two pads, as today (:66-69)
  if (e2eDevice === "desktop") {
    // The summary promises the return department (spec §6, §8.4), and the footer names the return (spec §5).
    const department = page.locator('[data-slot="operation-summary-card"] [data-summary-row="department"]')
    await expect(department).toContainText(runDepartment.name)
    await expect(department).toContainText(returnDepartment.name)
    await expect(page.locator('[data-slot="sticky-form-footer"]').filter({ visible: true })).toContainText(fillTemplate(TX_WORDS.checkinFooter, { tag: asset.assetTag, returner: `${receiver.code} - ${receiver.fullNameTh}` }))
    await record(measure, "return summary", testInfo)
  }

  const checkin = await saveReturnForm(page, asset.id, async (review) => {
    // … the five toContainText checks of today (:73-77)
    await record(measure, "return review", testInfo)
  })
  expect(checkin.documentNo).toMatch(/^RT-/)
  expect([checkin.missingComponents, checkin.repair]).toEqual([[], null])
  // … the RT- h1 "ใบรับคืนทรัพย์สิน" and its number, as today (:88-89)
  await expect(page.locator("[data-document-lines]")).toHaveCount(0)
  await record(measure, "RT- document", testInfo)
  await expectPrints(page, "พิมพ์ใบรับคืน")

  const after = await readAsset(page, asset.id)
  // … status Ready, room, custodian null, as today (:94-96)
  // The return department, read from the asset (spec §6, §12): the setting's default; the change is its own history line.
  expect(after.departmentId).toBe(returnDepartment.id)
  expect(after.department?.code).toBe(RETURN_DEPARTMENT_CODE)
  // … the asset page after the return, as today (:97-99)
  await visitAssetPage(measure, asset.id, "asset history after the return", testInfo, "history")
  await expect(page.getByRole("main")).toContainText(TX_WORDS.departmentChange)
```
    Drop today's `pickSearchable(page, "checkin-receive-by", …)`, the two native `selectOption`s, the `"บันทึก"` clicks, the hand-made `waitForResponse` and the `measure.timed("return save", …)`. The field-errors test still times "return save".
  - **RT2** (title "a return sent to repair opens an unfinished repair record, the asset is Under Maintenance, and the RT- links the record"):
    - **Keep:** the search by the holder's code, the group checks, `pickAsset`, the HO- number and the return-by check.
    - **Then:**
      - `await expect(page.locator("#checkin-receive-by")).toContainText(`${staff.code} - ${staff.fullNameTh}`)`;
      - `await conditionChip(page, "เสียหาย", "checkin-condition-after").check()`;
      - `selectOption({ label: "ส่งซ่อม" })` (harmless after Task 8's auto-pick);
      - `pickSearchable` of the room;
      - `await expect(page.getByRole("main")).toContainText(TX_WORDS.sendToRepairHint)`;
      - the problem text and the ผู้คืน pad, as today.
    - **The save:** `const checkin = await saveReturnForm(page, asset.id, async (review) => { await expect(review).toContainText("อยู่ระหว่างซ่อม") })`, then `record(measure, "RT- document (sent to repair)", testInfo)`.
    - **The reads:** keep today's (Under Maintenance, one ticket with the problem, open or in progress). Then `expect(checkin.repair).toEqual({ id: ticket.id, repairNo: ticket.repairNo, joined: false })`.
    - **The link** replaces today's `:150-155`:
```ts
  // The RT- links the record the return opened (spec §8.7): the person goes there from the document.
  const repairLink = page.getByRole("link", { name: fillTemplate(TX_WORDS.repairOpened, { repairNo: ticket.repairNo }), exact: true })
  await expect(repairLink).toHaveAttribute("href", `/th/maintenance/${ticket.id}`)
  await repairLink.click()
  await page.waitForURL((url) => url.pathname === `/th/maintenance/${ticket.id}`)
  await expect(page.getByRole("main")).toContainText(ticket.repairNo)
  await expect(page.getByRole("main")).toContainText(asset.assetTag)
  await record(measure, "the repair record, from the RT- document", testInfo)
  await visitAssetPage(measure, asset.id, "asset sent to repair", testInfo)
  await expect(page.getByTestId("asset-identity-summary")).toContainText("อยู่ระหว่างซ่อม")
```
  - **RT3** (title unchanged):
    - **Keep:** the repair opened by API, `pickAsset`, and the one-option check (`#checkin-next-status option` count 1, text "ส่งซ่อม").
    - **The notice** becomes `await expect(page.getByRole("main")).toContainText(TX_WORDS.openRepairNotice)`, and `getByLabel("รายละเอียดปัญหาในใบซ่อม")` has count 0.
    - **The fields:** the receive-by prefill check replaces `pickSearchable(page, "checkin-receive-by", …)`, then `conditionChip(page, "เสียหาย", "checkin-condition-after").check()`, `pickSearchable` of the room, and the pad.
    - **The save:** `const checkin = await saveReturnForm(page, asset.id, async (review) => { await expect(review).toContainText("อยู่ระหว่างซ่อม") })`. Then `expect(checkin.repair).toEqual({ id: repair.id, repairNo: repair.repairNo, joined: true })` and `record(measure, "RT- document (returned under repair)", testInfo)`.
    - **The link:** `page.getByRole("link", { name: fillTemplate(TX_WORDS.repairJoined, { repairNo: repair.repairNo }), exact: true })` has `href` `` `/th/maintenance/${repair.id}` ``. It is not clicked.
    - **Keep** the rest: Under Maintenance, no custodian, `toEqual([repair.id])`, in progress, "ไม่มีผู้ถือครอง".

- [ ] **Step 5: Create `e2e/transactions/return-components.spec.ts`.**
```ts
// Group 3 spec §8.2, §8.5, §8.6, §7.1 and §17: a return that leaves one component out, the parent's next ส่งมอบ that warns
// of it, and its late return while the parent sits in IT stock. Three serial tests per project on a computer of their
// own and two ส่วนควบ installed through the component route (the run has no computer with components). รับคืน has no
// phone steps (§8.8): both devices save through the footer and the review. The summary card shows from lg only (P2-R12),
// so the phone reads the footer's counts instead. ส่งมอบ is opened and never saved: a handed-over parent would make the
// late return stand alone (§8.6). The other late-return branch, ผู้คืน who is not the holder, ถอดออก and the department
// setting are the units' and UAT's (plan 2 tasks 1-5).
import { asUser, expect, test } from "../support/fixtures.ts"
import { runRecords } from "../support/run-plan.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { fillTemplate, templatePattern } from "../shell/shell-words.ts"
import { bangkokDate, thaiDay } from "./tx-plan.ts"
import {
  type CreatedAsset,
  conditionChip,
  createTxAsset,
  ensureSecondLocation,
  findAssetRow,
  handoverByApi,
  installComponentByApi,
  pickedAsset,
  pickSearchable,
  readAsset,
  readAssetMasters,
  readReturnDepartment,
  record,
  returnChecklistBox,
  saveLateReturn,
  saveReturnForm,
  visit,
} from "./tx-support.ts"
import { TX_WORDS } from "./tx-words.ts"

asUser("itStaff")

// The component left out: one word, so "<holder code> <this word>" is a two-word search that finds it (§8.6, §11).
const LEFT_OUT_LABEL = "อะแดปเตอร์ติดเครื่อง"

type ComponentsRun = { parent: CreatedAsset; kept: CreatedAsset; leftOut: CreatedAsset; checkin: { id: string; documentNo: string } }
const runs = new Map<string, ComponentsRun>()

test.describe("a component left out of a return", () => {
  test.describe.configure({ mode: "serial" })

  test("a return with one component left out: the checklist, the counts, the RT- lists it, and it stays with the person returning (spec §8.2, §8.4, §8.5)", async ({ page, measure, e2eDevice }, testInfo) => {
    const data = readRunData()
    const receiver = data.employees.receiver1
    const { department: runDepartment, location: runRoom } = runRecords(readRunState().runId)
    const room = await ensureSecondLocation()
    const returnDepartment = await readReturnDepartment()
    const masters = await readAssetMasters(page)
    const parent = await createTxAsset(page, masters, testInfo.project.name, "RCP", "โน้ตบุ๊กคืนส่วนควบ")
    const kept = await createTxAsset(page, masters, testInfo.project.name, "RCM", "เมาส์ติดเครื่อง", { ownershipType: "component" })
    const leftOut = await createTxAsset(page, masters, testInfo.project.name, "RCK", LEFT_OUT_LABEL, { ownershipType: "component" })
    await installComponentByApi(page, parent.id, kept.id, "เมาส์", "1")
    await installComponentByApi(page, parent.id, leftOut.id, "อะแดปเตอร์", "2")
    const handover = await handoverByApi(page, parent.id, receiver.id, masters.goodConditionId)
    expect((await readAsset(page, leftOut.id)).custodianId, "the handover took the component along (§7.1)").toBe(receiver.id)

    await visit(measure, `/th/asset-management/checkin?checkoutId=${handover.id}`, "return form, a computer with two components", testInfo)
    await expect(pickedAsset(page, parent.id)).toContainText(parent.assetTag)
    // Every component that travelled is listed and ticked (§8.2, call 10); unticked, it reads ยังไม่ได้คืน.
    const checklist = page.locator("#checkin-components")
    await expect(checklist.getByRole("checkbox")).toHaveCount(2)
    await expect(returnChecklistBox(page, kept.assetTag)).toBeChecked()
    await expect(returnChecklistBox(page, leftOut.assetTag)).toBeChecked()
    await expect(checklist).not.toContainText(TX_WORDS.componentNotReturned)
    await returnChecklistBox(page, leftOut.assetTag).uncheck()
    await expect(returnChecklistBox(page, leftOut.assetTag)).not.toBeChecked()
    await expect(checklist).toContainText(TX_WORDS.componentNotReturned)

    await conditionChip(page, "ดี", "checkin-condition-after").check()
    await page.locator("#checkin-next-status").selectOption({ label: "พร้อมใช้งาน" })
    await pickSearchable(page, "checkin-next-location", room.code, `${room.code} - ${room.name}`)
    const counts = fillTemplate(TX_WORDS.componentsBack, { returned: 1, missing: 1 })
    if (e2eDevice === "desktop") {
      // The summary: ได้คืน 1 · ขาด 1, the return department, and the warning that names the one left out and its holder (§8.4).
      const summary = page.locator('[data-slot="operation-summary-card"]')
      await expect(summary.locator('[data-summary-row="components"]')).toContainText(counts)
      await expect(summary.locator('[data-summary-row="department"]')).toContainText(runDepartment.name)
      await expect(summary.locator('[data-summary-row="department"]')).toContainText(returnDepartment.name)
      await expect(summary).toContainText(templatePattern(TX_WORDS.missingWarning, {}))
      await expect(summary).toContainText(leftOut.assetTag)
      await expect(summary).toContainText(receiver.fullNameTh)
    } else {
      // The phone's footer counts them over the primary button (§8.8).
      await expect(page.locator('[data-slot="sticky-form-footer"]').filter({ visible: true })).toContainText(fillTemplate(TX_WORDS.phoneComponentsFooter, { returned: 1, missing: 1 }))
    }
    await record(measure, "return form, one component left out", testInfo)

    const checkin = await saveReturnForm(page, parent.id, async (review) => {
      await expect(review).toContainText(counts)
      await record(measure, "return review, one component left out", testInfo)
    })
    expect(checkin.missingComponents).toEqual([{ assetTag: leftOut.assetTag, name: leftOut.name }])
    runs.set(testInfo.project.name, { parent, kept, leftOut, checkin: { id: checkin.id, documentNo: checkin.documentNo } })

    // The RT- lists it as missing, with the person and the room it stays with (§8.5); nothing has come back late yet.
    const missing = page.locator('[data-document-line="missing"]')
    await expect(missing).toHaveCount(1)
    await expect(missing).toHaveText(fillTemplate(TX_WORDS.documentMissingHeld, { component: `${leftOut.assetTag} - ${leftOut.name}`, holder: `${receiver.code} - ${receiver.fullNameTh}`, location: `${runRoom.code} - ${runRoom.name}` }))
    await expect(page.locator('[data-document-line="returned"]')).toHaveCount(0)
    await record(measure, "RT- document, a component left out", testInfo)

    // The parent and the component that came back: IT stock in the chosen room, the return department (§6). The one left
    // out keeps ผู้คืน (its holder already), its room and its department (§8.5, P2-R7).
    expect((await readAsset(page, parent.id)).status.name).toBe("Ready")
    for (const [assetId, label] of [[parent.id, "the parent"], [kept.id, "the component that came back"]] as const) {
      const after = await readAsset(page, assetId)
      expect([after.custodianId, after.currentLocationId, after.departmentId], label).toEqual([null, room.id, returnDepartment.id])
    }
    const stays = await readAsset(page, leftOut.id)
    expect([stays.custodianId, stays.currentLocationId, stays.departmentId], "the component left out").toEqual([receiver.id, data.locationId, data.departmentId])

    // The parent's component manager (Task 5) keeps it as ค้างคืน · อยู่กับ <holder> · <RT-> (§8.5).
    await visit(measure, `/th/assets/${parent.id}/components`, "the parent's components, one outstanding", testInfo)
    await expect(page.getByRole("main")).toContainText(`${TX_WORDS.componentOutstanding} · ${fillTemplate(TX_WORDS.componentOutstandingWith, { holder: `${receiver.code} - ${receiver.fullNameTh}` })} · ${checkin.documentNo}`)
  })

  test("the parent's next ส่งมอบ warns that a component is still out and leaves it behind (spec §7.1, §7.3, decision 8)", async ({ page, measure, e2eDevice }, testInfo) => {
    const run = runs.get(testInfo.project.name)
    expect(run, "the return test ran first").toBeTruthy()
    if (!run) return
    const receiver = readRunData().employees.receiver1
    await visit(measure, `/th/asset-management/checkout?assetId=${run.parent.id}`, "handover form, a component still out", testInfo)
    await expect(pickedAsset(page, run.parent.id)).toContainText(run.parent.assetTag)
    // Section 1, the phone's step 1: the warning "ยังค้างคืน 1 รายการ: <tag> <name> · อยู่กับ <holder> · ตั้งแต่ <RT->"
    // (checkout.componentsOutstanding), apart from the one that travels. Its list is read part by part.
    const part = page.locator('[data-checkout-part="asset"]')
    const warning = part.locator("[data-checkout-outstanding]")
    await expect(warning).toBeVisible()
    await expect(warning).toContainText(templatePattern(TX_WORDS.checkoutOutstanding, { count: "1" }))
    for (const text of [run.leftOut.assetTag, run.leftOut.name, receiver.fullNameTh, run.checkin.documentNo]) await expect(warning).toContainText(text)
    await expect(part).toContainText(fillTemplate(TX_WORDS.componentsTravel, { count: 1 }))
    const travelling = part.locator("ul").filter({ has: page.getByText(run.kept.assetTag, { exact: true }) })
    await expect(travelling).toHaveCount(1)
    await expect(travelling).not.toContainText(run.leftOut.assetTag)
    if (e2eDevice === "desktop") {
      await expect(page.locator('[data-slot="operation-summary-card"] [data-summary-row="components"]')).toContainText(fillTemplate(TX_WORDS.checkoutSummaryOutstanding, { count: 1 }))
    }
    await record(measure, "handover form, a component still out", testInfo)
    // Not saved: the late return re-attaches only while the parent sits in IT stock (§8.6).
  })

  test("the late return of the component, its parent in IT stock: found by its tag and by its holder, re-attached, and the RT- line (spec §8.6)", async ({ page, measure, e2eDevice }, testInfo) => {
    const run = runs.get(testInfo.project.name)
    expect(run, "the return test ran first").toBeTruthy()
    if (!run) return
    const { parent, leftOut, checkin } = run
    const data = readRunData()
    const receiver = data.employees.receiver1
    const staff = data.employees.itStaff
    const holder = `${receiver.code} - ${receiver.fullNameTh}`
    const room = await ensureSecondLocation()
    const returnDepartment = await readReturnDepartment()

    await visit(measure, "/th/asset-management/checkin", "return form, empty", testInfo)
    // Its own row, takeable: "ส่วนควบค้างคืน ของ <parent> · <RT->". It is never ข้อมูลเก่า (neither the line nor the badge),
    // although it has a holder and no handover (§8.5).
    const row = await findAssetRow(page, "checkin-checkout", leftOut.assetTag, leftOut.assetTag)
    await expect(row).not.toHaveAttribute("aria-disabled", "true")
    await expect(row).toContainText(`${fillTemplate(TX_WORDS.outstandingLine, { parentTag: parent.assetTag })} · ${checkin.documentNo}`)
    await expect(row).not.toContainText("ข้อมูลเก่า")
    await record(measure, "return picker, a component still out", testInfo)
    // The holder's code and a word of its name find it, under the holder (§8.6, §11).
    const byHolder = await findAssetRow(page, "checkin-checkout", `${receiver.code} ${LEFT_OUT_LABEL}`, leftOut.assetTag)
    await expect(page.locator("#checkin-checkout-listbox [data-asset-option-group]").filter({ has: page.locator(`[data-asset-option="${leftOut.id}"]`) })).toContainText(holder)
    await byHolder.click()
    await expect(pickedAsset(page, leftOut.id)).toContainText(leftOut.assetTag)

    // The short panel (§8.6, P2-R4): the parent, the RT-, ผู้รับคืน = you. No room is asked, since the parent is in IT
    // stock, and the full form's parts are not rendered.
    const main = page.getByRole("main")
    for (const text of [parent.assetTag, parent.name, checkin.documentNo]) await expect(main).toContainText(text)
    await expect(page.locator("#checkin-late-receive-by")).toContainText(`${staff.code} - ${staff.fullNameTh}`)
    for (const id of ["checkin-late-location", "checkin-components", "checkin-condition-after", "checkin-next-status", "checkin-next-location"]) await expect(page.locator(`#${id}`), id).toHaveCount(0)
    if (e2eDevice === "desktop") {
      await expect(page.locator('[data-slot="sticky-form-footer"]').filter({ visible: true })).toContainText(fillTemplate(TX_WORDS.checkinFooter, { tag: leftOut.assetTag, returner: holder }))
    }
    await record(measure, "late return panel, the parent in IT stock", testInfo)

    const late = await saveLateReturn(page, leftOut.id, async (review) => {
      await expect(review).toContainText(leftOut.assetTag)
      await record(measure, "late return review", testInfo)
    })
    expect(late).toEqual({ checkinId: checkin.id, documentNo: checkin.documentNo, outcome: "reattached" })

    // The RT- keeps it in its list, now followed by its late return (§8.6): no new document number.
    await expect(page.locator('[data-document-line="missing"]')).toHaveCount(1)
    await expect(page.locator('[data-document-line="returned"]')).toHaveText(fillTemplate(TX_WORDS.documentComponentReturned, { tag: leftOut.assetTag, date: thaiDay(bangkokDate()), name: `${staff.code} - ${staff.fullNameTh}` }))
    await record(measure, "RT- document, the late return", testInfo)

    // Re-attached: the parent's room and department, no holder (P2-R7); the parent stays in IT stock.
    const back = await readAsset(page, leftOut.id)
    expect([back.custodianId, back.currentLocationId, back.departmentId], "the component back in its parent").toEqual([null, room.id, returnDepartment.id])
    const parentAfter = await readAsset(page, parent.id)
    expect([parentAfter.status.name, parentAfter.custodianId, parentAfter.currentLocationId]).toEqual(["Ready", null, room.id])
    await visit(measure, `/th/assets/${parent.id}/components`, "the parent's components, all installed", testInfo)
    await expect(page.getByRole("main")).toContainText(leftOut.assetTag)
    await expect(page.getByRole("main")).not.toContainText(fillTemplate(TX_WORDS.componentOutstandingWith, { holder }))
  })
})
```

- [ ] **Step 6: The field-error test, `fillReturn`, the API helpers and AD2.**
  - **`field-errors.spec.ts`:**
    - **The import:** the `./support/forms.ts` import adds `reviewAndSave`.
    - **The return test** (`:136-161`) becomes "return: no condition shows its error, and the corrected return saves".
      - Keep its setup and its arrival (`toContainText(asset.assetTag, { timeout: TRANSACTION_PAGE_ARRIVAL_MS })`).
      - Then:
```ts
  await reviewAndSave(page)
  // Return-by starts as the handover's holder and receive-by as the signed-in person (group 3 spec §8.3), so the first
  // wrong field is the condition, which has no default: the group's error, and focus on its first chip.
  await expectFieldError(page, "checkin-condition-after", REQUIRED, { group: true, focus: 'input[name="checkin-condition-after"] >> nth=0' })

  await fillReturn(page, choices)
  await expectNoFieldError(page, "checkin-condition-after")
  await reviewAndSave(page)
```
      - The review dialog, `measure.timed("return save", …)`, the URL, the RT- number and the read-back stay as they are.
    - **M9** (`:190`): `await save(page)` becomes `await reviewAndSave(page)`.
  - **`forms.ts`:**
    - **Imports:** add `runRecords` from `"../../support/run-plan.ts"`. The state import takes `readRunData, readRunState`.
    - **`fillReturn`** becomes:
```ts
// The return form (src/components/asset-operations/checkin-form.tsx) once its asset is chosen (group 3 spec §8.3): the
// handover's holder returns it and the signed-in IT staff receive it (both start filled), Good (the chips start empty),
// back to Ready in the run's room (searchable, "code - name"; the full label, since the run's room code is a prefix of the
// second room's).
export async function fillReturn(page: Page, choices: AssetChoices) {
  const run = readRunData()
  const room = runRecords(readRunState().runId).location
  await expect(page.locator("#checkin-return-by")).toContainText(run.employees.receiver1.code)
  await expect(page.locator("#checkin-receive-by")).toContainText(run.employees.itStaff.code)
  await page.locator(`input[name="checkin-condition-after"][value="${choices.goodConditionId}"]`).check()
  await page.locator("#checkin-next-status").selectOption({ label: "พร้อมใช้งาน" })
  await choose(page, "checkin-next-location", room.code, `${room.code} - ${room.name}`)
}
```
    - **The file header** says "the return form filled correctly once its asset is chosen" instead of naming the old receive-by step.
  - **`records.ts` `returnAsset`** and **`detail-steps.ts` `returnByApi`:** add one comment line above each, and leave the bodies alone. The line: "No missingComponentIds: every component came back (group 3 spec §8.5, P2-R1). The return writes the return department (§12), whose default, IT, must be active on dev."
  - **`asset-detail.spec.ts:78`** becomes `const asset = await createTxAsset(page, masters, testInfo.project.name, "AD2", "โน้ตบุ๊กประวัติ", { ownershipType: "shared" })`, with this comment above it: "ส่วนกลาง, so its department stays through the handover and the return (group 3 spec §6). A บุคคล asset's return writes its own เปลี่ยนแผนก line, and the TR-, that line and the RT- would be the latest three."

- [ ] **Step 7: Run the pins and the repo checks.**
  - Run `node --test tests/e2e-transactions.test.ts tests/e2e-cross-cutting.test.ts tests/e2e-asset-detail.test.ts tests/e2e-review.test.ts tests/e2e-suite.test.ts`. Expected: PASS.
  - Then `npm test && npx tsc --noEmit && npm run lint`. Expected: PASS with 0 lint errors. `tsc` covers `e2e/`.
  - Check that `e2e/cross-cutting/support/refusals.ts` holds Task 5's `component-return` entry: `grep -n "component-return" e2e/cross-cutting/support/refusals.ts` prints one line.

- [ ] **Step 8: Do not run Playwright or a build.** The controller builds and runs `npx playwright test e2e/transactions/return-components.spec.ts --project=desktop-light` while reviewing this task (expected: setup 2 passed, then 3 passed, axe 0), and the four projects after Task 12 (Step 12). Your report names anything in the specs you could not check without a run.

- [ ] **Step 9: Commit the E2E.**
```bash
git add e2e/transactions/return-components.spec.ts e2e/transactions/return.spec.ts e2e/transactions/tx-plan.ts e2e/transactions/tx-support.ts e2e/transactions/tx-words.ts e2e/cross-cutting/field-errors.spec.ts e2e/cross-cutting/support/forms.ts e2e/cross-cutting/support/records.ts e2e/asset-detail/detail-steps.ts e2e/asset-detail/asset-detail.spec.ts tests/e2e-transactions.test.ts tests/e2e-cross-cutting.test.ts tests/e2e-asset-detail.test.ts
git commit -m "test(e2e): รับคืน leaves a component out and lists it on the RT-, ส่งมอบ warns of it unsaved, its late return re-attaches it to the parent in IT stock; the return writes the IT department and links its repair record; the return specs follow the new page (group 3 plan 2 task 11)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 10: The docs.**
  - Name every file, code, key and word as T1-T10 committed them: read `git log --stat 452b72d7..HEAD`, then the files.
  - Leave no template marker. `tests/e2e-docs.test.ts:34`, `shell-docs.test.ts:36`, `phase2d-docs.test.ts:100`, `dark-mode-docs.test.ts:128` and `v-track-docs.test.ts:28` reject `<today>`, `<N>`, `<run id>`, `<commit>` and `<plan file>`.
  - Write the date in.
  - **`docs/99_CHANGELOG.md`:** under the commit date's `## ` heading (above plan 1's `###` when the date is 2026-10-31), add `### กลุ่มหน้า 3 แผน 2: หน้ารับคืน ส่วนควบค้างคืน และการคืนส่วนควบภายหลัง`. In Thai, in plan 1's shape, it covers:
    - the branch (`feat/group3-tx-checkin`, stacked on `feat/group3-tx-checkout`), the spec and the plan `docs/superpowers/plans/2026-10-31-group3-tx-checkin.md`;
    - **แผนกตอนรับคืน:**
      - `getCheckinNextDepartmentId`, and the setting `checkin_department_code` "แผนกที่รับคืนเข้าคลัง" on the Organization tab (default `IT`, upper-cased, checked when it changes);
      - `readCheckinDepartment` at every return and late return, and `ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE`;
      - `department_change` referenceType `checkin`; cancelling the RT- restores it;
    - **route รับคืน:**
      - the handover claim (409 before the RT- number);
      - the room check (`ASSET_CHECKIN_LOCATION_INACTIVE`);
      - the date bounds and their codes (a legacy backfill exempt);
      - `maintenance:create` only for a new record, and joining needs `asset:edit`;
      - files saved after the checks;
    - **ส่วนควบค้างคืน:**
      - `missingComponentIds`, the status `outstanding` (no migration), and `component_outstanding`;
      - the holder ผู้คืน, with the department per P2-R7;
      - the snapshots and the cancel restore;
      - where it counts as not installed: the install, the slot, the candidates, responsibility, the held count, the legacy where, the refusals ("ส่วนควบค้างคืน รับคืนก่อน", `ASSET_COMPONENT_OUTSTANDING`), the disposal blockers and the guarded ถอดออก;
    - **คืนส่วนควบภายหลัง:**
      - `POST /api/assets/[id]/component-return`;
      - the IT-stock rule (`getLateReturnOutcome`);
      - the department (`getLateReturnDepartmentId`): re-attached, the parent's department, whatever the ownership; standing alone, the return department, except a ส่วนกลาง component, which keeps its own (spec §6: ส่วนกลาง keeps its department on a return);
      - the status: a component marked หาไม่พบ (Missing) may be returned late, since one brought back is found; สูญหาย (Lost), Disposed and Retired are refused;
      - `COMPONENT_RETURN_DATE_BEFORE_CHECKIN`;
      - `component_late_return`, with `component_install` / `component_remove` on the parent;
      - 409 on a changed outcome;
    - **ใบ RT-:**
      - the missing list and the late lines;
      - "เปิดใบซ่อม / ต่อใบซ่อม", a link only with `maintenance:view`;
      - the `lines` slot; a VOID RT- still shows them;
    - **ตัวกรองทะเบียน:** `dataQuality=noHandover` "มีผู้ถือครองแต่ไม่มีใบส่งมอบ", and the header link with its count;
    - **หน้ารับคืน, desktop:**
      - the three sections, the summary and the still-missing list;
      - the checklist, ผู้รับคืน "คุณ", the chips with no default, the date bounds;
      - หลังรับคืนให้เป็น, with ส่งซ่อม hidden without `maintenance:create`;
      - the condition auto-pick (P2-R16), เก็บไว้ที่ searchable with no default;
      - the photo types ภาพรวม / จุดเสียหาย, the badges, the late-return panel;
      - the legacy prefill dropped;
    - **หน้ารับคืน, phone:** the condensed parts, the people line with แก้ไข, the camera, and the footer counts;
    - **ส่งมอบ:** the outstanding warning and "ค้างคืน M";
    - **E2E:**
      - `return-components.spec.ts` (3 tests, four projects);
      - the rewritten `return.spec.ts` (department, repair links) and field-errors return test;
      - the helpers `installComponentByApi`, `readReturnDepartment`, `returnChecklistBox`, `saveReturnForm`, `saveLateReturn` and `RETURN_DEPARTMENT_CODE`;
      - AD2 made ส่วนกลาง, and why;
      - +12 assets per run, no department or room made;
      - what is left to units and UAT (Decisions above);
    - **เรื่องที่ผู้ใช้ควรตรวจ:**
      - spec §14 calls 3, 9, 10, 11, 12, 13, 14, 16 and 22;
      - P2-R16 (the auto-pick on a broken condition, the user to confirm);
      - P2-R10 (two photo types);
      - P2-R9 (the legacy prefill dropped, against the addendum's M11);
      - a ส่วนกลาง component returned late and standing alone keeps its department, and re-attached it follows the parent. Spec §6's late-return row names only the return department; the plan reads §6's ส่วนกลาง rule ("on checkout, return and transfer") as covering a late return, which is a return;
      - a หาไม่พบ (Missing) component may be returned late, while สูญหาย (Lost), Disposed and Retired are refused;
    - **บันทึกไว้ (P2-R22):** the four recorded items;
    - "ยังไม่ deploy · ไม่มี migration".

    The controller adds "ผล E2E".
  - **`DEVELOPER_HANDOFF.md`:**
    - After the plan-1 bullet's last sub-bullet (the addendum's E2E line, before `## Open Go-Live Decisions`), add a bullet "Page group 3, plan 2: รับคืน." in plan 1's shape. Its sub-bullets are the date, branch, base, "not deployed, no migration", spec and plan, then **Return department**, **Return route**, **Outstanding component**, **Late return**, **RT- page**, **Legacy filter**, **รับคืน page**, **ส่งมอบ warning**, **E2E**, **Recorded (P2-R22)** and **Calls for the user to check** (the same list as the changelog).
    - Under `## Open Go-Live Decisions`, add: "Before deploying page group 3: confirm on Production (SELECT only, with the full SQL shown to the user) that the department with code `IT` is active, or set "แผนกที่รับคืนเข้าคลัง" (`checkin_department_code`) in Admin > Settings > Organization. Otherwise every return and late component return refuses with `ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE`."
  - **`docs/05_ASSET_LIFECYCLE.md`:**
    - **`:59`:** the trigger becomes "Check-in / return with result "ส่งซ่อม" (send for repair); an unfinished repair record is opened in the same transaction, or the open one is joined, and the RT- links it ("เปิดใบซ่อม" / "ต่อใบซ่อม")".
    - **After `:83`:** a bullet. Cancelling a Check-in puts each component it left out back to `installed`, with the link's earlier reference (the before snapshot's `relationshipReferenceType` / `relationshipReferenceId`). Once one came back late, the RT- reads `components_changed` and is not cancelled automatically. The late return's parent movements reference the RT-, so they are downstream work for any later document on the parent (P2-R22).
    - **`:117`** becomes: the `Under Maintenance` result needs `maintenance:create` (and a recorder employee) only when it opens a new record, and joining the open record needs only `asset:edit`. A person without `maintenance:create` is not offered ส่งซ่อม, except on a row locked to its open repair. The route decides inside the transaction which case applies.
    - **After `:116`, four bullets:**
      - the return department (`getCheckinNextDepartmentId`, `checkin_department_code`, `readCheckinDepartment`, `ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE`, ส่วนกลาง included, components follow, `department_change`, cancel restores);
      - the claim, the room, the date bounds and the evidence order;
      - the components left out (`missingComponentIds`, `outstanding`, `component_outstanding`, the holder and department per P2-R7, ผู้คืน must be an employee, everything back when the field is absent), and where an outstanding component is not installed (each rule, including the two P2-R22 items about ถอดออก and the audit round);
      - the late return:
        - the route and the IT-stock rule;
        - the room: the parent's when re-attached, the chosen one when standing alone;
        - the department `getLateReturnDepartmentId` gives: re-attached, the parent's, for every ownership ("A component follows its parent"); standing alone, the return department, except a ส่วนกลาง component, which keeps its own (spec §6: ส่วนกลาง keeps its department on a return);
        - the holder cleared in both outcomes;
        - the status: หาไม่พบ (Missing) may be returned late, since a component brought back is found; สูญหาย (Lost), Disposed and Retired are refused with `asset.transactionReasonStatusNotReturnable`;
        - the movements, no new number, 409 on a changed outcome, the date code.
    - **`:119`:** add that the legacy backfill also refuses an outstanding component.
  - **`docs/06_WORKFLOWS.md`:**
    - **`:50`** becomes the รับคืน page, in `:48`'s shape:
      - three sections beside "สรุปก่อนบันทึก", and the still-missing list;
      - the checklist "ส่วนควบที่ต้องได้คืน", ผู้รับคืน "คุณ", the chips with no default, the date bounds;
      - หลังรับคืนให้เป็น, เก็บไว้ที่ searchable with no default, the damage and condition auto-picks;
      - the photo types, then "ตรวจสอบและบันทึก" → "ตรวจสอบก่อนรับคืน";
      - the phone's condensed parts;
      - the header link to the register's "มีผู้ถือครองแต่ไม่มีใบส่งมอบ" (`dataQuality=noHandover`).
    - **`:54`:** add one sentence on the outstanding links' restore.
    - **`:56`:** add:
      - the row badges;
      - the outstanding row "ส่วนควบค้างคืน ของ … · RT-…", found by its tag, name or holder;
      - the late-return panel and its two outcomes;
      - `?assetId=` of an outstanding component starting on its row;
      - ส่งมอบ's warning.
    - **`:63`:** the component manager lists an outstanding link with "ค้างคืน · อยู่กับ … · RT-…", and ถอดออก ends it (the component keeps its holder).
    - **`:201`:** readiness also blocks a parent with an outstanding component (naming its tag) and the outstanding component itself.
  - **`docs/03_DATABASE.md`:**
    - **`:16`:** after `AssetComponent`, add "(its free-text `status` gains `outstanding`, a component left out of a return and still linked; no schema change)".
    - **`:28`:** add "An RT-'s after snapshot may carry `repair: { id, repairNo, joined }`, and an outstanding component's before-snapshot entry carries `relationshipReferenceType` / `relationshipReferenceId` for the cancel."
  - **`docs/07_UAT_CHECKLIST.md`:** before `## Sign-Off`, add `## Transactions Group 3 Plan 2 UAT (รับคืน, YYYY-MM-DD)`, with the commit date written in.
    - It opens with what E2E covers: `return.spec.ts`, `return-components.spec.ts`, and the field-errors return test.
    - Then the checks:
      - [ ] Desktop 1440, both themes: the sections; the summary rows (ผู้ถือครอง, แผนก, สถานะ, ที่ตั้ง, สภาพ, ส่วนควบ); the still-missing list; the warning lines; the footer; ยกเลิก. The header link opens the register filtered to "มีผู้ถือครองแต่ไม่มีใบส่งมอบ" with the same count, and is hidden at zero.
      - [ ] Phone (iOS Safari, Android Chrome): the condensed parts; "ผู้คืน / ผู้รับคืน: … · แก้ไข", where an error on either reveals both; the camera for photos; the footer counts.
      - [ ] A late return after the parent was handed over again: the panel says the component stands alone and asks for the room, and it lands there in IT stock with the return department. A ส่วนกลาง component standing alone keeps its own department; re-attached, any component takes the parent's. A panel left open while the parent changes is refused with a toast (409), not a field error.
      - [ ] A component marked หาไม่พบ (Missing) that comes back can be returned late. One marked สูญหาย (Lost), Disposed or Retired is refused with "สถานะปัจจุบันไม่รองรับการรับคืน".
      - [ ] ผู้คืน who is not the holder (a manager for someone who left): the component left out takes ผู้คืน and their department, and a ส่วนกลาง one keeps its department.
      - [ ] Cancelling an RT- that left a component out makes it installed again. After its late return, the RT- cannot be cancelled.
      - [ ] ถอดออก on an outstanding component ends the link, and the component keeps its holder.
      - [ ] Disposal of the parent is blocked with the tag named, and so is disposal of the outstanding component itself.
      - [ ] On dev:
        - someone without `maintenance:create` sees no ส่งซ่อม except on an asset with an open repair (joined, no 403);
        - without `maintenance:view`, the RT- shows the repair number as plain text;
        - the return date: tomorrow is refused, and so is a day before the handover; a backfilled handover takes an earlier day and reads ข้อมูลเก่า for ถือมา;
        - Settings > Organization: an unknown code is refused under the field.
      - [ ] A เสียหาย / ใช้งานไม่ได้ condition picks ส่งซ่อม, and ซาก picks รอตัดจำหน่าย (P2-R16). พร้อมใช้งาน with a broken condition shows the warning line.
      - [ ] NVDA and VoiceOver on the checklist, the chips and the summary; an English pass.
  - **`docs/11_FEATURE_LIST.md`:**
    - **`:146`:** "Return workflow with a components checklist, return/receive parties (receiver defaults to you), condition chips, next status, searchable next location; the department goes to the return department (setting, default IT)".
    - **`:149`:** "Return result "ส่งซ่อม" opens an unfinished repair record, or joins the open one, in the same transaction, and the RT- links it; opening one needs `maintenance:create`".
    - **After `:149`, two rows:** "Outstanding components" (a component not returned stays with the person returning, listed on the RT-, refused elsewhere until returned) and "Late component return" (`component-return`, re-attached in IT stock or standing alone, a line on the RT-).
    - **`:152`:** add that the cancel also restores outstanding links.
    - **`:335`:** add `component-return` to the `api/assets` list.
  - **`docs/12_HANDOUT.md` `:46-48`:**
    - `:46`: "รับคืนพร้อมติ๊กส่วนควบที่ได้คืน บันทึกสภาพ รูปหลังรับคืน ลายเซ็น และสถานะถัดไป แผนกของทรัพย์สินบุคคลและ Stock กลับเป็นแผนกที่รับคืนเข้าคลัง (ค่าเริ่มต้น IT)".
    - Add: "ส่วนควบที่ยังไม่ได้คืนอยู่กับผู้คืน ใบรับคืนบันทึกว่าขาด คืนภายหลังได้จากหน้ารับคืนโดยค้นรหัสหรือชื่อผู้ถือครอง".
    - `:48`: "...และใบรับคืนมีลิงก์ไปที่ใบซ่อม".
  - **`docs/17_REPAIR_RECORD_GUIDE_TH.md` `:21`:** add that the RT- (ใบรับคืน) shows "เปิดใบซ่อม …" linking to the record. An asset with an open repair returns into ส่งซ่อม on that record ("ต่อใบซ่อม …"). Someone who may not record a repair does not see ส่งซ่อม, except to join an open one.

- [ ] **Step 11: Run the checks and commit the docs.** Run `npm test && npx tsc --noEmit && npm run lint`. Expected: PASS. The docs pins still find their text: `e2e-docs`, `shell-docs`, `phase2d-docs`, `dark-mode-docs`, `v-track-docs`, and `audit-round-cancellation` (`:144-157`).
```bash
git add docs/99_CHANGELOG.md DEVELOPER_HANDOFF.md docs/05_ASSET_LIFECYCLE.md docs/06_WORKFLOWS.md docs/03_DATABASE.md docs/07_UAT_CHECKLIST.md docs/11_FEATURE_LIST.md docs/12_HANDOUT.md docs/17_REPAIR_RECORD_GUIDE_TH.md
git commit -m "docs: page group 3 plan 2 (รับคืน, the outstanding component and its late return, the return department, the RT- repair link, the noHandover filter): changelog, handoff, lifecycle rules, database, workflows, UAT, feature list, handout, repair guide (group 3 plan 2 task 11)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 12 (the controller, after Task 12): the run and the round notes.** Task 12 appends an assert to `return-components.spec.ts` and a docs line, so the four-project run waits for its commit.
  - **Before the run:** the VPN, `scratchpad/stay-awake.ps1`, the DB probe, and a clean build (`rm -rf .next && npm run build`).
  - **The run:** `npx playwright test e2e/transactions e2e/cross-cutting e2e/asset-detail e2e/repair e2e/disposal e2e/smoke`, in all four projects.
    - Expected: every test passes, with axe 0.
    - `return-components.spec.ts` runs 3 tests per project.
  - **Docs:** add "ผล E2E" (the run id, and passed / failed / skipped per project) to the changelog entry, and the run id to the handoff bullet, in one commit.
  - **Round notes (P2-R21), not in the repo's code:**
    - the wiki: `ams-status`, `ams-open-questions` (P2-R22: after ถอดออก the component keeps its holder; the legacy leak D19(b), spec §15's other holder paths, and the Production SELECT that `IT` is active on deploy checklist #27), and `ams-log`;
    - then `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` (at `D:\Obsidian\Eltross`);
    - then the vault commit with `ingest:`.

---

### Task 12: The asset pages show an outstanding component (spec §8.5 "Asset pages"; X24)

An outstanding component stays on the asset pages with the line every page reads: "ค้างคืน · อยู่กับ <holder> · <RT->". The parent's ส่วนควบ tab lists it first in the components lane, with the line on its card, and so does the overview's อุปกรณ์ส่วนควบ list. The tab count, the lane count and the summary sentence still count only the components fitted now. On the component's own page, the first fact names its parent, with the same line under it. The overview and the parent lane on that page show the parent with the line too. The line is built by one formatter in Task 3's pure module, from Task 5's words, and Task 5's component manager is switched to the same formatter. The RT- number comes from the outstanding link's `referenceId`, read in one bounded query inside a round of reads the page already makes. Two histories also change. In ประวัติการติดตั้ง / ถอด, an outstanding link no longer passes its RT- off as the installation's document: the RT- gets its own "ส่วนควบค้างคืน" or "รับคืนส่วนควบค้างคืน" event. On the ประวัติ tab, the two new movements read in words.

Line numbers are HEAD's (`452b72d7`). Tasks 3, 4, 5 and 11 have changed several of these files, so each block below is also named by its content. Task 4 changed `assets/[id]/page.tsx` (`actionInput` gains `outstanding: frame.outstanding`). Task 5 changed it too: the `installedInLinks` include reads `installedOrOutstandingLinkWhere`, `installedInLinksForPanel` filters out outstanding links, and the disposal reason passes `tags`. Task 5 also changed `assets/[id]/components/page.tsx`, `asset-movement-labels.ts`, `asset-history-rules.ts:45` and the messages. Task 11 created `return-components.spec.ts` and wrote the docs.

**Rulings this task carries (from the skeleton and the controller's rulings X21, X24):**
- **X24 (this task's scope):** spec §8.5 "Asset pages" covers:
  - the parent's components tab and its overview list (the overview does list components, `asset-overview.tsx:321-358`), each outstanding link with "ค้างคืน · อยู่กับ <holder> · <RT->";
  - the same line on the component's own page (`describeAssetHolder`, the detail frame rules);
  - the RT- from the outstanding link (Task 4's frame fact `outstanding.checkinId`, read as its `documentNo`);
  - the tab count stays installed-only. The controller's call: the count means "fitted now", and the outstanding row is listed under it with its own line;
  - the component history wording for the outstanding and late-return movements reads sensibly;
  - one assert added to Task 11's `return-components.spec.ts`, and one docs line.
- **Global Constraints:**
  - Every installed-only read keeps pairing `status: "installed"` with `removedAt: null`. Here, only the page's lists and the component history rules change: they add the outstanding links beside the installed ones.
  - Messages change only through `node scripts/messages-edit.mjs`, with a change file in the session scratchpad's `tx-group/msg/`.
  - Shared parts and tokens only. DESIGN.md (FactStrip, `:485`; The Where Color Lives Rule, `:290`): a fact's value or sub-line is never colored text. `tests/asset-detail-page.test.ts:78` and `:110` ban the status inks in the strip and the overview, so the line is drawn in neutral ink everywhere on the asset page.
- **P2-R2 (read, not changed):**
  - `component_outstanding` is written on the component, with from/to values `{ custodianId, departmentId }`, even when unchanged.
  - `component_late_return` is written on the component, with `toValue` `{ receivedByName, returnDate, outcome }`.
  - On the parent, the late return writes `component_install` (re-attach) or `component_remove` (stand alone).
  - All of them reference the RT- (`referenceType: "checkin"`).
- **X21:** Task 3's link-status constant is `COMPONENT_LINK_OUTSTANDING`. This task reads the status only through `isOutstandingLink`.

**Decisions:**
- **One formatter, Task 5's words.**
  - `formatOutstandingComponentLine` lives in Task 3's pure, import-free `src/lib/asset-component-outstanding.ts`. It takes the words from its caller, so the module keeps no import.
  - The words are Task 5's `asset.componentOutstanding` ("ค้างคืน") and `asset.componentOutstandingWith` ("อยู่กับ {holder}"), so the line needs no new message.
  - The holder reads "code - name", as in Task 5's manager.
  - Task 5's manager page switches to the formatter (Step 3h). The line then has one builder on every page, and Task 5's pin of its inline join is rewritten.
- **Counted nowhere, listed first.**
  - `assetDetailComponentLinkWhere` is unchanged (`tests/asset-detail-data-boundaries.test.ts:23` stays). So are the tab's serial warning and the lane's count and summary sentence: all three count only the fitted components.
  - The outstanding rows come before the fitted ones, in the lane and in the overview list. They then stay in view above the five-row preview (`splitRelationshipPreview`, `COMPONENT_PREVIEW_LIMIT`).
  - "ดูอีก N รายการ" and "ดูทั้งหมด N รายการ" count the rows shown, outstanding ones included, as they do today.
- **The component's own page.**
  - `describeAssetHolder` checks a new required input `outstanding` before the ownership switch, so it answers the same for a บุคคล component installed in a laptop.
  - Its cell is `{ kind: "outstanding", parent, heldBy, documentNo }`. The strip draws "เป็นส่วนควบของ <parent>", linked through the page's `parentHref`, with the line as the plain sub-line.
  - The page picks this asset's own outstanding link with Task 4's frame fact (`frame.outstanding.linkId`), so it is the same link as the รับคืน action (Task 4: the newest of any duplicates). Its RT- is that link's `referenceId`, which equals `frame.outstanding.checkinId`.
- **The RT- read.**
  - The page makes one `prisma.assetCheckin.findMany({ where: { id: { in: ids } }, select: { id, documentNo } })`, as the fourth read of the round that already reads the photo checklist, the model photos and the licence device (HEAD `:284-298`).
  - The ids are the distinct `referenceId`s of the outstanding links on both sides, taken only where `referenceType === "checkin"`. With no outstanding link, nothing is read.
- **Duplicates (GP X1).** The parent lists each outstanding link. It lists each installed link today, and Task 5's manager does the same.
- **ประวัติการติดตั้ง / ถอด** is built from the link rows (`asset-component-history-rules.ts`):
  - **An outstanding row:** the installation keeps the row's reason with no document. A "ส่วนควบค้างคืน" (`component_outstanding`) event carries the RT- at the link's `updatedAt`, which is when the RT- marked it.
  - **A row re-attached by a late return** (installed, not removed, `referenceType: "checkin"`; Task 5 keeps the RT- reference): the installation has the same shape. A "รับคืนส่วนควบค้างคืน" (`component_late_return`) event carries the RT- at `updatedAt`. The table cannot date when such a link went out; the ประวัติ tab has both movements.
  - **A link ended standing alone:** a removal under the RT-, unchanged. It matches the `component_remove` that Task 5 writes on the parent.
  - The writers' reference is only ever `"checkin"` on these rows: an RT- cancel puts the earlier reference back (Task 3).
- **ประวัติ** (`asset-history-rules.ts`):
  - When ผู้คืน already held the component, `component_outstanding` has no change to show, so it says who holds it ("ผู้ถือครอง: <holder> · แผนก: <dept>"). Otherwise it reads the change as today.
  - `component_late_return` reads "รับโดย <name> · กลับเข้าเครื่องหลัก" or "… · แยกเป็นทรัพย์สินเดี่ยว". An unknown outcome code shows as stored (glossary rule).
  - Three new messages under `asset.history`.
- **The holder is plain text in the line,** not a link. A บุคคล component that is outstanding does not show the strip's custodian link; the line names ผู้คืน instead.

**Files:**
- Modify:
  - `src/lib/asset-component-outstanding.ts` (Task 3's, no imports): append `formatOutstandingComponentLine`.
  - `src/lib/asset-detail-frame-rules.ts`: `AssetHolderCell` `:13-18`, `describeAssetHolder` `:20-50`.
  - `src/components/assets/detail/asset-detail-fact-strip.tsx`:
    - the imports `:8-18`;
    - after `roundCode` `:58-65`;
    - the `parent` branch `:87-107`.
  - `src/components/assets/detail/asset-overview.tsx`:
    - the `components` prop type `:81-86`;
    - the parent row `:329-336`;
    - the child rows `:338-346`.
  - `src/components/assets/detail/asset-components-tab.tsx`:
    - `AssetRelationshipAsset` `:14`;
    - `toLink` `:49-54`;
    - the three counts `:97`, `:120`, `:122-125`.
  - `src/components/assets/detail/asset-relationship-map.tsx`: `RelationshipLink` `:14`, and the card's content `:295-306`.
  - `src/lib/asset-component-history-rules.ts`:
    - the header `:1-4`;
    - `AssetComponentLinkRow` `:8-17`;
    - `AssetComponentHistoryKind` `:20`;
    - the loop `:40-64`.
  - `src/lib/asset-component-history.ts:12-24` (the select).
  - `src/lib/asset-history-rules.ts`:
    - the imports `:3-7`;
    - `AssetHistoryLabels` `:106-113`;
    - `mainParts` `:237-254`;
    - one helper after `repairCloseParts` `:226-235`.
  - `src/lib/asset-history.ts:166-173` (the labels).
  - `src/lib/asset-detail-data.ts:32-33` (comment only).
  - `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`:
    - the import from `@/lib/asset-component-outstanding` (Task 5's);
    - the `parentComponents` include `:121-128`;
    - above `// R59: the checklist only …` `:283`;
    - that round's `Promise.all` `:284-298`;
    - after `const componentMissingSerialCount = …` `:305`;
    - `describeAssetHolder({` `:489-504` and `parentHref=` `:513`;
    - the overview's `components={{` `:567-579`;
    - `<AssetComponentsTab` `parents=` / `components=` `:597-612`.
  - `src/app/[locale]/(dashboard)/assets/[id]/components/page.tsx` (Task 5's `outstandingLine`): the line through the formatter.
  - `messages/th.json`, `messages/en.json`, only through `node scripts/messages-edit.mjs`.
  - `e2e/transactions/return-components.spec.ts` (Task 11's): the `./tx-support.ts` import and the end of the first test.
  - `docs/06_WORKFLOWS.md`: one bullet after the one that begins "- Asset Detail's ส่วนควบ tab keeps the relationship map" (HEAD `:61`).
- Create: `tests/asset-detail-outstanding-ui.test.ts`.
- Test (modify):
  - `tests/asset-component-outstanding.test.ts` (Task 3's);
  - `tests/asset-detail-frame.test.ts`;
  - `tests/asset-component-history-rules.test.ts`;
  - `tests/asset-history-rules.test.ts`;
  - `tests/asset-detail-ux.test.ts`;
  - `tests/asset-components-tab-ui.test.ts`;
  - `tests/component-outstanding-paths.test.ts` (Task 5's);
  - `tests/e2e-transactions.test.ts`.
- **Do not touch:**
  - `assetDetailComponentLinkWhere` and `getAssetDetailCounts` (the tab count stays installed-only);
  - the `currentComponents` filter (HEAD `:299`) and Task 5's `installedInLinksForPanel` filter, include and pins;
  - `getAssetDetailFrame` and Task 4's `actionInput` line;
  - every installed-only read elsewhere (audit, syncs, eligibility);
  - `asset-component-manager.tsx`, whose warning-ink line stays Task 5's;
  - the RT- page, the checkin form and the routes;
  - Task 11's other asserts and docs.

**Pins this task breaks (each is rewritten in this commit, Step 1):**
- `tests/asset-detail-frame.test.ts:25`: `base` gains `outstanding: null`, because `describeAssetHolder` requires it. `tsc` checks tests (`tsconfig.json` includes `**/*.ts`).
  - With that change, `:38-39` (the `component` rows) keep their expected values, unchanged.
- `tests/asset-detail-ux.test.ts:61`: `parentHref=` gains the outstanding parent as its fallback.
- `tests/asset-components-tab-ui.test.ts:14`: `RelationshipLink` gains `note?`.
- `tests/asset-component-history-rules.test.ts:17-25`: the `link()` helper's defaults gain `status` and `updatedAt`, which are now required by `tsc`.
- `tests/asset-history-rules.test.ts:32-39`: `labels` gains `receivedBy` and `lateReturnOutcomes`, which are now required by `tsc`.
- `tests/component-outstanding-paths.test.ts` (Task 5's), in the test "the parent's component manager keeps an outstanding link among the current ones…": the assert of the inline `[t("componentOutstanding"), …].filter(Boolean).join(" · ")`.
- Kept as they are, and they must stay green:
  - `tests/asset-detail-data-boundaries.test.ts:23` (the count's where);
  - `tests/asset-detail-ux.test.ts`:
    - `:60` (`parent: installedInLinksForPanel[0]?.parentAsset ?? null,`);
    - `:68-69` (`parentHref: appendReturnTo(…component.parentAsset.id…)`, `href: link.parentHref`);
    - `:112` (the serial warning from `currentComponentsForPanel`);
  - `tests/asset-components-tab-ui.test.ts:31` and `tests/list-frame-guards.test.ts:169` (exactly two `?? "-"` in the tab);
  - `tests/asset-detail-page.test.ts:78` and `:110` (no status ink in the strip and the overview), and `tests/assets-sweep-ui.test.ts:62-63`;
  - `tests/asset-relationship-map-ui.test.ts:29` (`splitRelationshipPreview(childLinks)`);
  - Task 5's pins on the asset page: the include `where: installedOrOutstandingLinkWhere,` and `const installedInLinksForPanel = asset.installedInLinks.filter((link) => !isOutstandingLink(link)).map(`;
  - Task 4's `openDisposalId: frame.openDisposalId,\n outstanding: frame.outstanding,` (`tests/asset-register-transactions.test.ts`);
  - `tests/asset-history.test.ts:10-17` (the rules stay pure and write no `movementType: "…"` literal);
  - `tests/asset-movement-labels.test.ts` (no new type, no new writer);
  - Task 11's `tests/e2e-transactions.test.ts` test: three `if (e2eDevice === "desktop")`, and its banned list.

**Interfaces:**
- Consumes:
  - **Task 3** (`src/lib/asset-component-outstanding.ts`, pure, no imports; its test pins `doesNotMatch(/^import /m)`):
    - `isOutstandingLink(link: { status: string; removedAt?: Date | string | null }): boolean`;
    - the link it leaves out: `status: "outstanding"`, `referenceType: "checkin"`, `referenceId` = the RT- id, `reason` unchanged, `updatedAt` set by that write;
    - the component's `custodianId` = ผู้คืน;
    - `component_outstanding` (labelled "ส่วนควบค้างคืน", history chip `checkin`), whose from/to are `JSON.stringify({ custodianId, departmentId })`, in that key order.
  - **Task 4:**
    - `AssetDetailFrame.outstanding: AssetOperationOutstandingFact | null`, where `AssetOperationOutstandingFact = { linkId: string; checkinId: string | null }`;
    - it is read as `assetComponent.findFirst({ where: { componentAssetId, ...outstandingLinkWhere }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }] })`, so it names the newest of any duplicates;
    - the component's รับคืน action is Task 4's (`getAssetActions`), and this task leaves it alone.
  - **Task 5:**
    - the messages `asset.componentOutstanding` (th "ค้างคืน", en "Outstanding") and `asset.componentOutstandingWith` (th "อยู่กับ {holder}", en "With {holder}");
    - `asset.movementTypes.component_late_return` (th "รับคืนส่วนควบค้างคืน");
    - `type ComponentLateReturnOutcome = "reattached" | "standalone"` (`src/lib/component-late-return.ts`, pure);
    - on the asset page, `import { installedOrOutstandingLinkWhere, isOutstandingLink } from "@/lib/asset-component-outstanding"`, the include `installedInLinks: { where: installedOrOutstandingLinkWhere, … }` and `installedInLinksForPanel` filtered to installed links;
    - the late return keeps `referenceType`/`referenceId` on the link. It writes `{ status: "installed" }` on re-attach and `{ status: "removed", removedAt: <the return date> }` standing alone;
    - the manager page (`assets/[id]/components/page.tsx`) builds each record's `outstandingLine` from `component.componentAsset.custodian` and a local `documentNo` (the RT-'s number, or null).
  - **Task 11:**
    - the first test of `e2e/transactions/return-components.spec.ts` ends with the component manager's check. In scope there: `parent`, `leftOut`, `receiver`, `checkin` (with `documentNo`), `measure` and `testInfo`;
    - `TX_WORDS.componentOutstanding` / `componentOutstandingWith`, and `fillTemplate`, are imported there.
  - **Existing:**
    - `visitAssetPage(measure, assetId, label, testInfo, view?: "history" | "components" | "files" | "maintenance")` (`e2e/transactions/tx-support.ts:356-358`);
    - `resolveAssetMovementDocuments` (`src/lib/asset-movement-documents.ts:11`), which turns a `"checkin"` reference into `{ kind: "checkin", id, code: documentNo }` (`:65`). The component history loader already passes every link row to it (`asset-component-history.ts:26`);
    - `assetMovementLabelKey` (`asset-movement-labels.ts:75`), which labels `component_outstanding` and `component_late_return` (Tasks 3, 5);
    - `movementChangeText` (`asset-history-rules.ts:175-214`), whose snapshot path prints a field present on one side only as "field: value";
    - `FactStripItem.sub?: React.ReactNode` (`src/components/ui/fact-strip.tsx:4`);
    - `asset.custodian` on the page selects `code` and `fullNameTh` (`page.tsx:100`).
- Produces:
  ```ts
  // src/lib/asset-component-outstanding.ts (still no import)
  export function formatOutstandingComponentLine(
    input: { holder: { code: string; fullNameTh: string } | null; documentNo: string | null },
    words: { outstanding: string; withHolder: (holder: string) => string },
  ): string   // "ค้างคืน · อยู่กับ E001 - สมชาย ใจดี · RT-202610-0001"; a null part is left out

  // src/lib/asset-detail-frame-rules.ts
  export type AssetHolderCell = /* today's five */ | {
    kind: "outstanding"; parent: { id: string; assetTag: string; name: string }; heldBy: { code: string; fullNameTh: string } | null; documentNo: string | null
  }
  // describeAssetHolder's input gains (required):
  //   outstanding: { parent: { id; assetTag; name }; heldBy: { code; fullNameTh } | null; documentNo: string | null } | null

  // src/lib/asset-component-history-rules.ts
  // AssetComponentLinkRow gains `status: string` and `updatedAt: Date`;
  // AssetComponentHistoryKind gains "component_outstanding" | "component_late_return"

  // src/lib/asset-history-rules.ts: AssetHistoryLabels gains
  //   receivedBy: (name: string) => string
  //   lateReturnOutcomes: Readonly<Record<ComponentLateReturnOutcome, string>>

  // the parts
  // RelationshipLink gains `note?: string | null`; AssetRelationshipAsset gains `outstandingLine: string | null`;
  // AssetOverview's components.children[] and components.parent gain `outstandingLine: string | null`
  ```
  - Messages (3 th, 3 en):
    - `asset.history.receivedBy`: th "รับโดย {name}", en "Received by {name}";
    - `asset.history.lateReturnReattached`: th "กลับเข้าเครื่องหลัก", en "Back in its parent asset";
    - `asset.history.lateReturnStandalone`: th "แยกเป็นทรัพย์สินเดี่ยว", en "Stands alone".
  - For the controller's E2E run: the first test of `return-components.spec.ts` visits two more pages in every project, the parent's ส่วนควบ tab and the component's page. Both are axe-checked through `record`.

- [ ] **Step 1: Write the failing tests and rewrite the pins.**

  `tests/asset-component-outstanding.test.ts` (Task 3's): add `formatOutstandingComponentLine,` to the import from `../src/lib/asset-component-outstanding.ts`, after `COMPONENT_LINK_OUTSTANDING,`. Then append:
```ts
test("an outstanding link reads one line on every page: ค้างคืน · อยู่กับ <code - name> · <RT->, leaving out what is not known (group 3 spec §8.5, plan 2 Task 12)", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).asset
  const words = { outstanding: th.componentOutstanding, withHolder: (holder: string) => th.componentOutstandingWith.replace("{holder}", holder) }
  const holder = { code: "E001", fullNameTh: "สมชาย ใจดี" }
  assert.equal(formatOutstandingComponentLine({ holder, documentNo: "RT-202610-0001" }, words), "ค้างคืน · อยู่กับ E001 - สมชาย ใจดี · RT-202610-0001")
  assert.equal(formatOutstandingComponentLine({ holder: null, documentNo: "RT-202610-0001" }, words), "ค้างคืน · RT-202610-0001")
  assert.equal(formatOutstandingComponentLine({ holder, documentNo: null }, words), "ค้างคืน · อยู่กับ E001 - สมชาย ใจดี")
  assert.equal(formatOutstandingComponentLine({ holder: null, documentNo: null }, words), "ค้างคืน")
})
```

  `tests/asset-detail-frame.test.ts`:
  - `:25` becomes `const base = { custodian: null, department: null, parent: null, outstanding: null, seats: { used: null, total: null }, openCheckoutDate: null, now }`. `:26-41` stay as they are.
  - After the first test (after `:42`), add:
```ts
test("an outstanding component names its parent in the first fact, with ค้างคืน · อยู่กับ … · RT-, whatever its ownership (group 3 spec §8.5, plan 2 Task 12)", () => {
  const custodian = { id: "e1", code: "E001", fullNameTh: "สมชาย ใจดี", department: "ACC - ฝ่ายบัญชี" }
  const base = { custodian, department: "IT - ฝ่ายไอที", parent: null, seats: { used: null, total: null }, openCheckoutDate: null, now }
  const parent = { id: "p1", assetTag: "GRL-COM-26-0017", name: "Notebook Lenovo" }
  const outstanding = { parent, heldBy: { code: "E001", fullNameTh: "สมชาย ใจดี" }, documentNo: "RT-202610-0001" }
  for (const ownership of ["component", "personal", "stock", "shared", "software_license"] as const) {
    assert.deepEqual(describeAssetHolder({ ...base, ownership, outstanding }), { kind: "outstanding", ...outstanding }, ownership)
  }
  assert.deepEqual(describeAssetHolder({ ...base, ownership: "component", outstanding: { parent, heldBy: null, documentNo: null } }), { kind: "outstanding", parent, heldBy: null, documentNo: null })
  assert.deepEqual(describeAssetHolder({ ...base, ownership: "component", parent, outstanding: null }), { kind: "parent", parent }, "a fitted component reads as before")
})
```

  `tests/asset-component-history-rules.test.ts`:
  - The `link()` helper (`:17-25`) gains two defaults after `referenceId: null,`: `status: "installed",` and `updatedAt: row.installedAt,`. The rest stays as it is.
  - Append:
```ts
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
  // Links with any other reference read as before.
  assert.equal(buildAssetComponentHistory(rows, "A", documentOf).some((event) => event.kind === "component_outstanding" || event.kind === "component_late_return"), false)
})
```

  `tests/asset-history-rules.test.ts`:
  - `labels` (`:32-39`) gains two members after `repairDays`:
    - `receivedBy: (name) => fill(h.receivedBy, { name }),`
    - `lateReturnOutcomes: { reattached: h.lateReturnReattached, standalone: h.lateReturnStandalone },`
  - Append:
```ts
test("a component left out of a return and its late return read in words: who holds it, who received it and where it went (group 3 spec §8.5, §8.6, plan 2 Task 12)", () => {
  const lookup = new Map([["emp-1", "E001 - สมชาย ใจดี"], ["emp-2", "E002 - สมหญิง รักงาน"], ["dept-acc", "ACC - บัญชี"], ["dept-hr", "HR - บุคคล"]])
  const outstanding = (from: object, to: object) =>
    assetHistoryMovementDetail(movement({ movementType: "component_outstanding", fromValue: JSON.stringify(from), toValue: JSON.stringify(to), reason: "Not returned with its parent asset" }), lookup, labels)
  // ผู้คืน is someone else: the change, as today.
  assert.equal(outstanding({ custodianId: "emp-1", departmentId: "dept-acc" }, { custodianId: "emp-2", departmentId: "dept-hr" }), "ผู้ถือครอง: E001 - สมชาย ใจดี → E002 - สมหญิง รักงาน · แผนก: ACC - บัญชี → HR - บุคคล")
  // ผู้คืน already held it: nothing changed, so the line says who has it.
  const same = { custodianId: "emp-1", departmentId: "dept-acc" }
  assert.equal(outstanding(same, same), "ผู้ถือครอง: E001 - สมชาย ใจดี · แผนก: ACC - บัญชี")
  const late = (outcome: string, receivedByName: string | null = "E009 - ช่าง ไอที") =>
    assetHistoryMovementDetail(movement({ movementType: "component_late_return", toValue: JSON.stringify({ receivedByName, returnDate: "2026-10-25", outcome }), reason: "Component late return" }), noLookup, labels)
  assert.equal(late("reattached"), "รับโดย E009 - ช่าง ไอที · กลับเข้าเครื่องหลัก")
  assert.equal(late("standalone"), "รับโดย E009 - ช่าง ไอที · แยกเป็นทรัพย์สินเดี่ยว")
  assert.equal(late("later", null), "later", "a code without a word shows as stored")
  assert.equal(assetHistoryMovementDetail(movement({ movementType: "component_late_return", toValue: null }), noLookup, labels), null)
})
```

  `tests/asset-detail-ux.test.ts:61` becomes `assert.match(source, /parentHref=\{installedInLinksForPanel\[0\]\?\.parentHref \?\? ownOutstanding\?\.parentHref \?\? null\}/)`.

  `tests/asset-components-tab-ui.test.ts:14` becomes `assert.match(map, /export type RelationshipLink = \{ id: string; href: string; label: string; role: string; note\?: string \| null \}/)`.

  `tests/component-outstanding-paths.test.ts` (Task 5's): in the test "the parent's component manager keeps an outstanding link among the current ones, with its line, so ถอดออก reaches it (spec §8.5)", replace `assert.match(page, /\[t\("componentOutstanding"\), holder \? t\("componentOutstandingWith", \{ holder \}\) : null, documentNo\]\.filter\(Boolean\)\.join\(" · "\)/)` with:
```ts
  // One formatter for the line on every page (Task 12).
  assert.match(page, /const outstandingWords = \{ outstanding: t\("componentOutstanding"\), withHolder: \(holder: string\) => t\("componentOutstandingWith", \{ holder \}\) \}/)
  assert.match(page, /formatOutstandingComponentLine\(\{ holder: component\.componentAsset\.custodian, documentNo/)
  assert.doesNotMatch(page, /\.filter\(Boolean\)\.join\(" · "\)/)
```
  Its words assert (`asset.componentOutstanding`, `componentOutstandingWith`) stays.

  Create `tests/asset-detail-outstanding-ui.test.ts`:
```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 3 spec §8.5 "Asset pages" (plan 2 Task 12): an outstanding link is listed on both sides with Task 5's line and
// counted on neither; the parts draw it in neutral ink (DESIGN.md FactStrip, The Where Color Lives Rule).
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const PAGE = "src/app/[locale]/(dashboard)/assets/[id]/page.tsx"
const DETAIL = "src/components/assets/detail/"

test("the asset page reads each outstanding link's RT- once, in a round it already makes, builds every line with the one formatter and counts none (group 3 spec §8.5)", () => {
  const page = read(PAGE)
  assert.match(page, /import \{[^}]*\bformatOutstandingComponentLine\b[^}]*\} from "@\/lib\/asset-component-outstanding"/)
  // The parent's links carry each component's holder.
  assert.match(page, /parentComponents: \{\n\s+orderBy: \{ installedAt: "desc" \},\n\s+include: \{\n\s+componentAsset: \{\n\s+select: \{ id: true, assetTag: true, name: true, serialNumber: true, custodian: \{ select: \{ code: true, fullNameTh: true \} \} \},/)
  // Both sides: the parent's outstanding links, and this asset's own, the link the frame's action rule reads (Task 4).
  assert.match(page, /const outstandingComponentLinks = asset\.parentComponents\.filter\(\(component\) => isOutstandingLink\(component\)\)/)
  assert.match(page, /const ownOutstandingLink = asset\.installedInLinks\.find\(\(link\) => link\.id === frame\.outstanding\?\.linkId && isOutstandingLink\(link\)\) \?\? null/)
  assert.match(page, /const outstandingCheckinIdOf = \(link: \{ referenceType: string \| null; referenceId: string \| null \}\) => \(link\.referenceType === "checkin" \? link\.referenceId : null\)/)
  assert.match(page, /const outstandingCheckinIds = \[\.\.\.new Set\(outstandingLinks\.flatMap\(\(link\) => outstandingCheckinIdOf\(link\) \?\? \[\]\)\)\]/)
  // The RT- numbers: one bounded read of the ids the links name, beside the photo reads.
  assert.match(page, /const \[photoChecklist, modelPhotos, licenseAssignedAsset, outstandingCheckins\] = await Promise\.all\(\[/)
  assert.match(page, /outstandingCheckinIds\.length > 0\n\s+\? prisma\.assetCheckin\.findMany\(\{ where: \{ id: \{ in: outstandingCheckinIds \} \}, select: \{ id: true, documentNo: true \} \}\)\n\s+: Promise\.resolve\(\[\]\),/)
  assert.equal(page.match(/prisma\.assetCheckin\.findMany\(/g)?.length, 1)
  // One line on every page, in Task 5's words.
  assert.match(page, /const outstandingWords = \{ outstanding: t\("componentOutstanding"\), withHolder: \(holder: string\) => t\("componentOutstandingWith", \{ holder \}\) \}/)
  assert.match(page, /formatOutstandingComponentLine\(\{ holder, documentNo: outstandingDocumentNoOf\(link\) \}, outstandingWords\)/)
  assert.doesNotMatch(page, /\.filter\(Boolean\)\.join\(" · "\)/)
  // Listed first, each with its line; the fitted ones follow. The tab's count and serial warning stay installed-only.
  assert.match(page, /const listedComponentsForPanel = \[\n\s+\.\.\.outstandingComponentLinks\.map\(\(component\) => \(\{ \.\.\.component, outstandingLine: outstandingLineOf\(component, component\.componentAsset\.custodian\) \}\)\),\n\s+\.\.\.currentComponentsForPanel\.map\(\(component\) => \(\{ \.\.\.component, outstandingLine: null \}\)\),\n\s+\]/)
  assert.match(page, /components: \{ count: detailCounts\.components, hasWarning: componentMissingSerialCount > 0 \}/)
  // This asset's own: the strip's first fact, the overview's parent row and the tab's parent lane.
  assert.match(page, /outstanding: ownOutstanding \? \{ parent: ownOutstanding\.parentAsset, heldBy: asset\.custodian, documentNo: ownOutstanding\.documentNo \} : null,/)
  assert.match(page, /const parentLinksForPanel = \[\.\.\.installedInLinksForPanel\.map\(\(link\) => \(\{ \.\.\.link, outstandingLine: null \}\)\), \.\.\.\(ownOutstanding \? \[ownOutstanding\] : \[\]\)\]/)
  assert.match(page, /parent: parentLinksForPanel\[0\]\n\s+\? \{ assetTag: parentLinksForPanel\[0\]\.parentAsset\.assetTag, name: parentLinksForPanel\[0\]\.parentAsset\.name, href: parentLinksForPanel\[0\]\.parentHref, outstandingLine: parentLinksForPanel\[0\]\.outstandingLine \}/)
  assert.match(page, /children: listedComponentsForPanel\.map\(\(component\) => \(\{/)
  assert.match(page, /parents=\{parentLinksForPanel\.map\(\(link\) => \(\{/)
  assert.match(page, /components=\{listedComponentsForPanel\.map\(\(component\) => \(\{/)
  assert.equal(page.match(/outstandingLine: (?:component|link)\.outstandingLine,/g)?.length, 3, "the overview's children, the tab's parents and its components")
})

test("the parts draw the line in neutral ink: the strip's sub-line, a line under the overview's row, a line on the relationship card; the lane's counts stay fitted-only (group 3 spec §8.5)", () => {
  const strip = read(`${DETAIL}asset-detail-fact-strip.tsx`)
  assert.match(strip, /^import \{ formatOutstandingComponentLine \} from "@\/lib\/asset-component-outstanding"$/m)
  assert.match(strip, /value: holder\.parent \? parentValue\(holder\.parent\) : <Nil \/>,/)
  assert.match(strip, /\} else if \(holder\.kind === "outstanding"\) \{/)
  assert.match(strip, /label: t\("componentOf"\),\n\s+value: parentValue\(holder\.parent\),\n\s+sub: formatOutstandingComponentLine\(\{ holder: holder\.heldBy, documentNo: holder\.documentNo \}, \{ outstanding: tAsset\("componentOutstanding"\), withHolder: \(name\) => tAsset\("componentOutstandingWith", \{ holder: name \}\) \}\),/)
  const overview = read(`${DETAIL}asset-overview.tsx`)
  assert.match(overview, /children: \{ id: string; assetTag: string; name: string; href: string; outstandingLine: string \| null \}\[\]/)
  assert.match(overview, /parent: \{ assetTag: string; name: string; href: string; outstandingLine: string \| null \} \| null/)
  assert.match(overview, /\{components\.parent\.outstandingLine \? <span className="block text-meta">\{components\.parent\.outstandingLine\}<\/span> : null\}/)
  assert.match(overview, /\{child\.outstandingLine \? <span className="block text-meta text-muted-foreground">\{child\.outstandingLine\}<\/span> : null\}/)
  const tab = read(`${DETAIL}asset-components-tab.tsx`)
  assert.match(tab, /export type AssetRelationshipAsset = \{ id: string; href: string; assetTag: string; name: string; role: string; slotNo: string \| null; outstandingLine: string \| null \}/)
  assert.match(tab, /note: item\.outstandingLine \?\? null,/)
  assert.match(tab, /const installedCount = components\.filter\(\(item\) => !item\.outstandingLine\)\.length/)
  assert.equal(tab.match(/count: installedCount/g)?.length, 3, "the lane's count and the two summaries")
  assert.match(tab, /moreItemsLabel=\{t\("relationshipMoreItems", \{ count: Math\.max\(components\.length - 5, 0\) \}\)\}/, "the cards past five, outstanding ones included")
  const map = read(`${DETAIL}asset-relationship-map.tsx`)
  assert.match(map, /\{link\?\.note \? <div className="text-meta text-muted-foreground \[overflow-wrap:anywhere\]">\{link\.note\}<\/div> : null\}/)
  for (const source of [strip, overview, tab, map]) assert.doesNotMatch(source, /text-(?:success|warning|danger)\b/)
})

test("the histories: the link rows bring their status and last change, and the ประวัติ words of the late return (group 3 spec §8.5, §8.6)", () => {
  assert.match(read("src/lib/asset-component-history.ts"), /removedAt: true,\n\s+status: true,\n\s+updatedAt: true,\n\s+reason: true,/)
  const loader = read("src/lib/asset-history.ts")
  assert.match(loader, /receivedBy: \(name\) => t\("asset\.history\.receivedBy", \{ name \}\),/)
  assert.match(loader, /lateReturnOutcomes: \{ reattached: t\("asset\.history\.lateReturnReattached"\), standalone: t\("asset\.history\.lateReturnStandalone"\) \},/)
  for (const [locale, words] of [
    ["th", ["ค้างคืน", "อยู่กับ {holder}", "รับโดย {name}", "กลับเข้าเครื่องหลัก", "แยกเป็นทรัพย์สินเดี่ยว"]],
    ["en", ["Outstanding", "With {holder}", "Received by {name}", "Back in its parent asset", "Stands alone"]],
  ] as const) {
    const asset = JSON.parse(read(`messages/${locale}.json`)).asset
    assert.deepEqual([asset.componentOutstanding, asset.componentOutstandingWith, asset.history.receivedBy, asset.history.lateReturnReattached, asset.history.lateReturnStandalone], words, locale)
  }
  assert.ok(read("docs/06_WORKFLOWS.md").includes('"ค้างคืน · อยู่กับ <holder> · <RT->" (`formatOutstandingComponentLine`'))
})
```

  `tests/e2e-transactions.test.ts`, append:
```ts
test("the asset pages read the outstanding line: the parent's components tab and the component's own page (group 3 spec §8.5, plan 2 task 12)", () => {
  const spec = readTxSpec("e2e/transactions/return-components.spec.ts")
  const first = spec.slice(spec.indexOf('test("a return with one component left out'), spec.indexOf('test("the parent\'s next ส่งมอบ'))
  const manager = first.indexOf("`/th/assets/${parent.id}/components`")
  const pages = first.indexOf('[[parent.id, "components", "the parent\'s components tab, one outstanding"], [leftOut.id, undefined, "the outstanding component\'s page"]]')
  assert.ok(manager > 0 && pages > manager, "at the end of the first test, after the component manager's check")
  assert.ok(first.includes("await visitAssetPage(measure, assetId, label, testInfo, view)"))
  assert.match(spec, /^\s+visitAssetPage,$/m)
})
```

- [ ] **Step 2: Run them and see them fail.**
  - Run `node --test tests/asset-component-outstanding.test.ts tests/asset-detail-frame.test.ts tests/asset-component-history-rules.test.ts tests/asset-history-rules.test.ts tests/asset-detail-outstanding-ui.test.ts tests/asset-detail-ux.test.ts tests/asset-components-tab-ui.test.ts tests/component-outstanding-paths.test.ts tests/e2e-transactions.test.ts`.
  - Expected failures:
    - `asset-component-outstanding`: the file does not load ("does not provide an export named 'formatOutstandingComponentLine'"), so Task 3's two tests are reported with it. They pass again after 3a.
    - `asset-detail-frame`: the new test, at `component`: `{ kind: "parent", parent: null }` where the outstanding cell is expected.
    - `asset-component-history-rules`: the new test, at its first deep-equal. Today a single `o1:install` event carries the RT- document.
    - `asset-history-rules`: the new test, at `outstanding(same, same)`: `null`. The change line before it already passes.
    - `asset-detail-outstanding-ui`:
      - the first two tests, at their first match;
      - the third, at the select of `asset-component-history.ts`.
    - `asset-detail-ux`: `:61`.
    - `asset-components-tab-ui`: `:14`.
    - `component-outstanding-paths`: the manager test, at `outstandingWords`.
    - `e2e-transactions`: the new test, at "at the end of the first test".
  - Every other test in these files passes. `npx tsc --noEmit` would also report the missing `outstanding` and `heldBy` names, the link rows' `status` and `updatedAt`, and the labels' two members; it is not run until Step 4.

- [ ] **Step 3: Implement.**
  - **3a. The formatter** (`src/lib/asset-component-outstanding.ts`). Append `formatOutstandingComponentLine` (Produces), with no import:
    - `holder` = `` `${input.holder.code} - ${input.holder.fullNameTh}` `` or null;
    - return `[words.outstanding, holder ? words.withHolder(holder) : null, input.documentNo].filter((part): part is string => Boolean(part)).join(" · ")`.
    - Comment: "The line an outstanding link reads on every page (group 3 spec §8.5): the asset pages and the component manager. The words come from the caller (asset.componentOutstanding, componentOutstandingWith), so this module keeps no import."
  - **3b. The holder cell** (`src/lib/asset-detail-frame-rules.ts`).
    - Add the `outstanding` member to `AssetHolderCell` (Produces), after `seats`.
    - Add the required input `outstanding` after `parent`, with the doc comment "This asset's own outstanding link (group 3 spec §8.5): its parent, who holds it, the RT- that left it out."
    - As the function's first line: `if (input.outstanding) return { kind: "outstanding", ...input.outstanding }`, with the comment "A component a return left out reads its parent and its line whatever its ownership: still linked, not fitted, held by ผู้คืน (group 3 spec §8.5)."
    - The switch is unchanged.
  - **3c. The fact strip** (`asset-detail-fact-strip.tsx`).
    - Import `formatOutstandingComponentLine` from `@/lib/asset-component-outstanding` on its own line, after the `@/lib/asset-detail-frame-rules` import.
    - After `roundCode`, add `const parentValue = (parent: { assetTag: string; name: string }): ReactNode => …`. Move the parent branch's two renderings into it unchanged: the `<Link href={parentHref} className={standaloneLink}>` with its inner `<span>` when `parentHref` is set, else the fragment. Comment: "The parent a component belongs to, linked when the page passes where it opens."
    - The `parent` branch's value becomes `value: holder.parent ? parentValue(holder.parent) : <Nil />,`.
    - Add this branch before the final `else`:
```tsx
  } else if (holder.kind === "outstanding") {
    // Still linked to its parent, not fitted, held by ผู้คืน (group 3 spec §8.5): the parent, then the line every page reads,
    // as the plain sub-line (a fact is never colored text).
    holderItem = {
      key: "holder",
      label: t("componentOf"),
      value: parentValue(holder.parent),
      sub: formatOutstandingComponentLine({ holder: holder.heldBy, documentNo: holder.documentNo }, { outstanding: tAsset("componentOutstanding"), withHolder: (name) => tAsset("componentOutstandingWith", { holder: name }) }),
    }
```
  - **3d. ประวัติการติดตั้ง / ถอด** (`src/lib/asset-component-history-rules.ts` and its loader).
    - Header: say it is "Pure: relative imports only", and that "a link a return left out, or brought back late, adds its RT- event (group 3 spec §8.5, §8.6)".
    - Add `import { isOutstandingLink } from "./asset-component-outstanding.ts"` above the type import. `tests/asset-component-history-rules.test.ts:59-63` still finds no `@/` import and no `prisma.`.
    - `AssetComponentLinkRow` gains `status: string` ("installed, removed or outstanding (group 3 spec §8.5)") and `updatedAt: Date` ("the link's last change: the RT- that left it out, or the late return that put it back"), after `reason`.
    - `AssetComponentHistoryKind` gains `"component_outstanding" | "component_late_return"`. Both are labelled types (Tasks 3, 5), so the tab's `tAll(assetMovementLabelKey(event.kind))` names them.
    - In the loop, after `none`:
```ts
    // The RT- writes its own reference on a link it leaves out, and a late return that re-attaches keeps it (group 3 spec
    // §8.5, §8.6): the installation keeps the row's reason, and the RT- goes with its own event at the link's last change.
    // A link ended standing alone stays a removal under the RT-, as the parent's history reads it.
    const checkinEvent: AssetComponentHistoryKind | null = isOutstandingLink(row)
      ? "component_outstanding"
      : !row.removedAt && row.status === "installed" && row.referenceType === "checkin"
        ? "component_late_return"
        : null
```
      - The install event's spread becomes `...(row.removedAt ? none : checkinEvent ? { reason: row.reason, document: null } : latest)`.
      - After it, add `if (checkinEvent) events.push({ id: `${row.id}:${checkinEvent === "component_outstanding" ? "outstanding" : "return"}`, at: row.updatedAt, kind: checkinEvent, other, reason: null, document: latest.document })`.
      - The removal and the sort are unchanged.
    - `src/lib/asset-component-history.ts`: the select gains `status: true,` and `updatedAt: true,` after `removedAt: true,`, on their own lines. Nothing else changes.
  - **3e. ประวัติ** (`src/lib/asset-history-rules.ts`, `src/lib/asset-history.ts`, the words).
    - Rules:
      - Add `import type { ComponentLateReturnOutcome } from "./component-late-return.ts"`. It is erased, so the rules stay client-safe.
      - `AssetHistoryLabels` gains the two members (Produces), after `repairDays`.
      - After `repairCloseParts`, add `function lateReturnParts(toValue: string | null, labels: AssetHistoryLabels): string[]`. Its logic:
        - `parseSnapshot(toValue)`; with none, `[]`;
        - else `rawText(value.receivedByName)` through `labels.receivedBy`;
        - then `rawText(value.outcome)` through `labels.lateReturnOutcomes` when `Object.hasOwn` has it, else the raw code;
        - nulls dropped.
      - In `mainParts`, before the generic `const change = movementChangeText(…)`, add:
```ts
  // A component a return left out (group 3 spec §8.5): what changed, or, when ผู้คืน already held it, who holds it.
  if (type === "component_outstanding") {
    const change = movementChangeText(input.fromValue, input.toValue, lookup, labels) ?? movementChangeText(null, input.toValue, lookup, labels)
    return change ? [change] : []
  }
  // Its late return (spec §8.6): who received it, and whether it went back into its parent or stands alone.
  if (type === "component_late_return") return lateReturnParts(input.toValue, labels)
```
      - Write no `movementType: "…"` literal (`tests/asset-history.test.ts:17`) and no new reason type.
    - Loader: in `asset-history.ts`'s `labels` (`:166-173`), after `repairDays`, add `receivedBy: (name) => t("asset.history.receivedBy", { name }),` and `lateReturnOutcomes: { reattached: t("asset.history.lateReturnReattached"), standalone: t("asset.history.lateReturnStandalone") },`.
    - Words: save `<scratchpad>/tx-group/msg/p2-t12-messages.json` and run `node scripts/messages-edit.mjs <scratchpad>/tx-group/msg/p2-t12-messages.json`. Expected output: `messages updated: 3 th, 3 en, 0 deleted`.
```json
{ "set": {
  "th": {
    "asset.history.receivedBy": "รับโดย {name}",
    "asset.history.lateReturnReattached": "กลับเข้าเครื่องหลัก",
    "asset.history.lateReturnStandalone": "แยกเป็นทรัพย์สินเดี่ยว"
  },
  "en": {
    "asset.history.receivedBy": "Received by {name}",
    "asset.history.lateReturnReattached": "Back in its parent asset",
    "asset.history.lateReturnStandalone": "Stands alone"
  }
} }
```
  - **3f. The asset page** (`src/app/[locale]/(dashboard)/assets/[id]/page.tsx`).
    - **The import:** add `formatOutstandingComponentLine` to Task 5's `import { … } from "@/lib/asset-component-outstanding"`.
    - **The include:** in `parentComponents.include.componentAsset` (HEAD `:124-126`, the first of the two identical selects), the select becomes `select: { id: true, assetTag: true, name: true, serialNumber: true, custodian: { select: { code: true, fullNameTh: true } } },`, on one line. The `installedInLinks` include is Task 5's and stays.
    - **Above `// R59: the checklist only …`** (HEAD `:283`):
```ts
  // Spec §8.5 "Asset pages" (group 3 plan 2 Task 12): an outstanding link is listed on both sides with
  // "ค้างคืน · อยู่กับ <holder> · <RT->" and counted on neither. This asset's own is the link the frame's action rule reads
  // (Task 4, the newest of any duplicates); the parent's are every outstanding link under it.
  const outstandingComponentLinks = asset.parentComponents.filter((component) => isOutstandingLink(component))
  const ownOutstandingLink = asset.installedInLinks.find((link) => link.id === frame.outstanding?.linkId && isOutstandingLink(link)) ?? null
  const outstandingCheckinIdOf = (link: { referenceType: string | null; referenceId: string | null }) => (link.referenceType === "checkin" ? link.referenceId : null)
  const outstandingLinks = [...outstandingComponentLinks, ...(ownOutstandingLink ? [ownOutstandingLink] : [])]
  const outstandingCheckinIds = [...new Set(outstandingLinks.flatMap((link) => outstandingCheckinIdOf(link) ?? []))]
```
    - **The round:** the `Promise.all` destructuring becomes `const [photoChecklist, modelPhotos, licenseAssignedAsset, outstandingCheckins] = await Promise.all([`. Its fourth entry, after the licence device read:
```ts
    // The RT- numbers of the outstanding lines: one bounded read, of the ids the links name only.
    outstandingCheckinIds.length > 0
      ? prisma.assetCheckin.findMany({ where: { id: { in: outstandingCheckinIds } }, select: { id: true, documentNo: true } })
      : Promise.resolve([]),
```
    - **After `const componentMissingSerialCount = …`** (HEAD `:305`):
```ts
  const outstandingDocumentNos = new Map(outstandingCheckins.map((checkin) => [checkin.id, checkin.documentNo]))
  const outstandingDocumentNoOf = (link: { referenceType: string | null; referenceId: string | null }) => {
    const checkinId = outstandingCheckinIdOf(link)
    return checkinId ? outstandingDocumentNos.get(checkinId) ?? null : null
  }
  const outstandingWords = { outstanding: t("componentOutstanding"), withHolder: (holder: string) => t("componentOutstandingWith", { holder }) }
  const outstandingLineOf = (link: { referenceType: string | null; referenceId: string | null }, holder: { code: string; fullNameTh: string } | null) =>
    formatOutstandingComponentLine({ holder, documentNo: outstandingDocumentNoOf(link) }, outstandingWords)
  // The rows the overview and the components tab list: the outstanding first, each with its line, then the fitted ones.
  const listedComponentsForPanel = [
    ...outstandingComponentLinks.map((component) => ({ ...component, outstandingLine: outstandingLineOf(component, component.componentAsset.custodian) })),
    ...currentComponentsForPanel.map((component) => ({ ...component, outstandingLine: null })),
  ]
  // This asset's parent while it is outstanding: the strip's first fact, the overview's parent row, the tab's parent lane.
  const ownOutstanding = ownOutstandingLink
    ? {
        ...ownOutstandingLink,
        parentHref: appendReturnTo(`/${locale}/assets/${ownOutstandingLink.parentAsset.id}`, currentAssetDetailHref),
        documentNo: outstandingDocumentNoOf(ownOutstandingLink),
        outstandingLine: outstandingLineOf(ownOutstandingLink, asset.custodian),
      }
    : null
  const parentLinksForPanel = [...installedInLinksForPanel.map((link) => ({ ...link, outstandingLine: null })), ...(ownOutstanding ? [ownOutstanding] : [])]
```
    - **The strip:**
      - In `describeAssetHolder({`, after `parent: installedInLinksForPanel[0]?.parentAsset ?? null,` (kept: `asset-detail-ux.test.ts:60`), add `outstanding: ownOutstanding ? { parent: ownOutstanding.parentAsset, heldBy: asset.custodian, documentNo: ownOutstanding.documentNo } : null,`.
      - `parentHref=` becomes `parentHref={installedInLinksForPanel[0]?.parentHref ?? ownOutstanding?.parentHref ?? null}`. A component is never fitted in one parent and outstanding from another (Task 5's install refusal), so at most one side applies.
    - **The overview's `components={{`:**
      - `children:` maps `listedComponentsForPanel` with today's four keys plus `outstandingLine: component.outstandingLine,`.
      - `parent:` becomes:
```tsx
            parent: parentLinksForPanel[0]
              ? { assetTag: parentLinksForPanel[0].parentAsset.assetTag, name: parentLinksForPanel[0].parentAsset.name, href: parentLinksForPanel[0].parentHref, outstandingLine: parentLinksForPanel[0].outstandingLine }
              : null,
```
      - `manageHref` and `allHref` stay.
    - **`<AssetComponentsTab`:**
      - `parents={parentLinksForPanel.map((link) => ({` keeps today's six keys (`href: link.parentHref` stays: `asset-detail-ux.test.ts:69`) plus `outstandingLine: link.outstandingLine,`.
      - `components={listedComponentsForPanel.map((component) => ({` keeps today's six keys plus `outstandingLine: component.outstandingLine,`.
    - Nothing else in the page changes:
      - `currentComponents` (`:299`) and `componentMissingSerialCount` stay installed-only;
      - `indicators.components` still reads `detailCounts.components`;
      - `hasAssetResponsibility(asset)` still sees Task 5's widened include.

      This is a plain server page, and no new Next API is used.
  - **3g. The parts.**
    - `asset-components-tab.tsx`:
      - `AssetRelationshipAsset` gains `outstandingLine: string | null`, on the same line (pin in Step 1).
      - `toLink` gains `note: item.outstandingLine ?? null,` after `role`.
      - After `toLink`, add `const installedCount = components.filter((item) => !item.outstandingLine).length`, with the comment "What is fitted now (group 3 spec §8.5, X24): an outstanding component is listed with its line but not counted, as the tab's own count."
      - `relationshipComponentsCount`, `relationshipSummaryParent` and `relationshipSummaryParentAndComponent` take `count: installedCount`.
      - `relationshipMoreItems` keeps `components.length`, because it counts the cards past five.
      - The two `parents[0]?.assetTag ?? "-"` stay. The outstanding parent is in `parents`, so "อยู่ภายใต้ <parent>" names it.
    - `asset-relationship-map.tsx`:
      - `RelationshipLink` becomes `{ id: string; href: string; label: string; role: string; note?: string | null }`.
      - In `RelationshipAssetCard`'s `content`, after the role/meta block and inside `<div className="space-y-3">`, add `{link?.note ? <div className="text-meta text-muted-foreground [overflow-wrap:anywhere]">{link.note}</div> : null}`.
      - `RelationshipLinkList` ignores `note`.
    - `asset-overview.tsx`:
      - The prop types become `children: { id: string; assetTag: string; name: string; href: string; outstandingLine: string | null }[]` and `parent: { assetTag: string; name: string; href: string; outstandingLine: string | null } | null`.
      - In the parent `<li>`, after its `</Link>`, add `{components.parent.outstandingLine ? <span className="block text-meta">{components.parent.outstandingLine}</span> : null}`. The `<li>` is already `text-muted-foreground`.
      - In each child `<li>`, after its `</Link>`, add `{child.outstandingLine ? <span className="block text-meta text-muted-foreground">{child.outstandingLine}</span> : null}`.
      - No status ink: `tests/asset-detail-page.test.ts:110` bans it.
  - **3h. Task 5's manager** (`src/app/[locale]/(dashboard)/assets/[id]/components/page.tsx`).
    - Add `formatOutstandingComponentLine` to its `@/lib/asset-component-outstanding` import.
    - After `if (!asset) notFound()`, add the same `outstandingWords` line as the asset page.
    - Replace Task 5's inline line, `[t("componentOutstanding"), holder ? t("componentOutstandingWith", { holder }) : null, documentNo].filter(Boolean).join(" · ")`, with `formatOutstandingComponentLine({ holder: component.componentAsset.custodian, documentNo }, outstandingWords)`. `documentNo` is Task 5's local, the RT-'s number or null.
    - Delete Task 5's `holder` string local if nothing else reads it: lint fails on an unused variable.
    - The manager component and its warning-ink line are unchanged.
  - **3i. The count's comment** (`src/lib/asset-detail-data.ts:32-33`). Append to the comment: "An outstanding link (group 3 spec §8.5) is listed with its line but not counted: the count means what is fitted now." The function is unchanged.
  - **3j. The E2E assert** (`e2e/transactions/return-components.spec.ts`).
    - In the `./tx-support.ts` import, add `visitAssetPage,` on its own line after `visit,`.
    - At the end of the first test, after the component manager's `toContainText` (Task 11's last line there) and before its closing `})`, add:
```ts
    // The asset pages read the same line (Task 12, spec §8.5): the parent's components tab lists it apart from its count,
    // and the component's own page names its parent with it in the first fact.
    for (const [assetId, view, label] of [[parent.id, "components", "the parent's components tab, one outstanding"], [leftOut.id, undefined, "the outstanding component's page"]] as const) {
      await visitAssetPage(measure, assetId, label, testInfo, view)
      await expect(page.getByRole("main")).toContainText(`${TX_WORDS.componentOutstanding} · ${fillTemplate(TX_WORDS.componentOutstandingWith, { holder: `${receiver.code} - ${receiver.fullNameTh}` })} · ${checkin.documentNo}`)
    }
```
    - It runs on both devices: the relationship card and the overview's strip show below `md`. The implementer does not run it; the controller does, after this task (Task 11 Step 12).
  - **3k. The docs line** (`docs/06_WORKFLOWS.md`). After the bullet that begins "- Asset Detail's ส่วนควบ tab keeps the relationship map", add one bullet:
```md
- An outstanding ส่วนควบ (a return left it out, group 3 spec §8.5) stays on the asset pages with one line, "ค้างคืน · อยู่กับ <holder> · <RT->" (`formatOutstandingComponentLine`, the Component Manager's words): the parent lists it first in the ส่วนควบ tab's components lane and in the overview's อุปกรณ์ส่วนควบ, and counts it nowhere (the tab count, the lane count and the summary count only what is fitted now); the component's own page names its parent in the first fact (เป็นส่วนควบของ) with the line under it, and in its overview and parent lane. ประวัติการติดตั้ง / ถอด reads "ส่วนควบค้างคืน" and, once it is back in its parent, "รับคืนส่วนควบค้างคืน", each with the RT-; the ประวัติ tab says who holds it and, for the late return, who received it and whether it went back into its parent (กลับเข้าเครื่องหลัก) or stands alone (แยกเป็นทรัพย์สินเดี่ยว).
```

- [ ] **Step 4: Run them and see them pass, then the full checks.**
  - Re-run the Step 2 command, plus `node --test tests/asset-detail-page.test.ts tests/asset-detail-data-boundaries.test.ts tests/asset-relationship-map-ui.test.ts tests/assets-sweep-ui.test.ts tests/list-frame-guards.test.ts tests/asset-history.test.ts tests/asset-history-ui.test.ts tests/asset-movement-labels.test.ts tests/asset-register-transactions.test.ts tests/fact-strip.test.ts tests/e2e-asset-detail.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts`. Expected: all pass.
  - Then run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: no failures and 0 lint errors.
    - `tsc` proves that every `describeAssetHolder`, `AssetComponentLinkRow`, `AssetHistoryLabels`, `AssetRelationshipAsset` and overview caller passes the new members. It also type-checks the E2E tuple, whose `view` is `"components" | undefined`.
    - If a pin outside this task's list fails, rewrite it in this commit and name it in the report.
  - Do not run Playwright or a build.

- [ ] **Step 5: Commit.**
  - Save the message below as `<scratchpad>/tx-group/p2-t12-commit.txt`.
  - Run:
```
git add src/lib/asset-component-outstanding.ts src/lib/asset-detail-frame-rules.ts src/lib/asset-component-history-rules.ts src/lib/asset-component-history.ts src/lib/asset-history-rules.ts src/lib/asset-history.ts src/lib/asset-detail-data.ts "src/app/[locale]/(dashboard)/assets/[id]/page.tsx" "src/app/[locale]/(dashboard)/assets/[id]/components/page.tsx" src/components/assets/detail/asset-detail-fact-strip.tsx src/components/assets/detail/asset-overview.tsx src/components/assets/detail/asset-components-tab.tsx src/components/assets/detail/asset-relationship-map.tsx messages/th.json messages/en.json e2e/transactions/return-components.spec.ts docs/06_WORKFLOWS.md tests/asset-component-outstanding.test.ts tests/asset-detail-frame.test.ts tests/asset-component-history-rules.test.ts tests/asset-history-rules.test.ts tests/asset-detail-outstanding-ui.test.ts tests/asset-detail-ux.test.ts tests/asset-components-tab-ui.test.ts tests/component-outstanding-paths.test.ts tests/e2e-transactions.test.ts
git commit -F <scratchpad>/tx-group/p2-t12-commit.txt
```
  - The message:
```
feat(assets): the asset pages list an outstanding component with "ค้างคืน · อยู่กับ <holder> · <RT->" on the parent and on the component, the counts stay fitted-only, and the two histories read the outstanding and late-return events (group 3 spec §8.5, plan 2 Task 12)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

---

## Appendix: controller rulings on the task drafts (X1-X32)

The controller cross-checked the drafts before execution. These rulings are already folded into the tasks above; tasks cite them by id.

### Ownership rulings (blockers)

- **X1. `missingComponentIds`, the returner refine and its words: T2 owns** (interfaces B1, M2; coverage B1; realism R1). T2 keeps the zod field (`.default([])` + dedupe), the `returnBy` superRefine, the multipart `getAll`, the catalog row `CHECKIN_MISSING_COMPONENT_RETURNER_REQUIRED` and the words, th "ส่วนควบที่ยังไม่ได้คืนจะอยู่กับผู้คืน เลือกผู้คืนจากรายชื่อพนักงาน" (and T2's English). T3 deletes Step 3e's field and refine (keeps "reads `input.missingComponentIds`"), the multipart bullet, the returner catalog row and message, and the returner-words assert; T3's messages become 2 th / 2 en (`ASSET_CHECKIN_MISSING_COMPONENT_INVALID` → `checkinMissingComponentInvalid` + the movement label). T3's route refusal for an unknown or inactive employee as ผู้คืน reuses T2's code and key. T3 removes `src/lib/validations/asset-operations.ts` from its Files and `git add`, and rewrites its Step 2 expectation (after T2: the validation cases pass; the route cases fail on the missing `missingComponents` answer / no link marked). Skeleton P2-R18: "server: T2".
- **X2. T3's refusal error is built from catalogued codes** (realism R2). `new CheckinMissingComponentRefusalError("CHECKIN_MISSING_COMPONENT_RETURNER_REQUIRED")` / `("ASSET_CHECKIN_MISSING_COMPONENT_INVALID")`, with `MISSING_COMPONENT_REFUSALS` keyed by those codes, so the `api-error-catalog` literal scanner finds catalogued strings. Correct T3's Step 4 note.
- **X3. `src/lib/component-late-return.ts` and its test: T4 creates, T5 modifies** (interfaces B2; coverage M1; realism R3). T5 appends `componentLateReturnOutcomes`, `ComponentLateReturnOutcome`, `LateReturnDateError` / `getLateReturnDateError` (importing `checkinReturnDateError` from `./checkin-route-rules.ts`) beside T4's import; keeps T4's `getLateReturnOutcome`, the type name `LateReturnParent` and the normalised `"ready"` compare; appends its date and `parentInStock` tests to T4's test file and drops its duplicate outcome table; drops Step 3c and the `<the file of Step 3c>` placeholder. T4's Files line: `getLateReturnDepartmentId` lives in `asset-department-rule.ts` (T5).
- **X4. ส่วนกลาง late return: T5's exception stands** (interfaces B3; coverage M3, M4; realism R5). Spec §6 says ส่วนกลาง assets keep their responsible department "on checkout, return and transfer"; a late component return is a return, so a ส่วนกลาง component that stands alone keeps its department. Re-attached, it follows the parent (spec §6 "A component follows its parent"). Amend P2-R7's last bullet. T9 imports `getLateReturnDepartmentId` from `./asset-department-rule.ts` with T5's five fields `{ outcome, ownership: detail.ownership, parentDepartmentId: detail.lateReturnParent?.departmentId ?? null, returnDepartmentId: returnDepartment.id, currentDepartmentId: detail.departmentId }` (use the real field names the T4/T9 row carries), adds a summary test row for a ส่วนกลาง stand-alone return (department unchanged, `changed: false`), and rewrites its Consumes and note 3a. T11's docs state the rule.
- **X5. The รับคืน legacy header link: T7 owns, T8 consumes** (interfaces B4; coverage B2; realism R7). T8 keeps T7's page node, words (`checkin.legacyReturnLink`), class and the prop name `legacyLink`, passes `actions={legacyLink}` to `OperationFormFrame`, drops `checkin.legacyReturnCount` / `checkin.legacyReturnView` from its messages and words test (fix the key count), drops its `legacy-checkin-flow:18` and `operations-sweep-ui:94` rewrites (T7's pins stay, including `doesNotMatch(/legacyReturnCount/)`), and starts its other pin rewrites (`form-frames-ui:90`, `operations-sweep-ui:92`) from T7's versions. T8's own page pins assert T7's strings plus the new reads (`readConditionLabels`, `readCheckinDepartment`, `conditionsFor`).
- **X6. The picker's outstanding line: T4 owns; T8 keeps only the badge** (interfaces B5, m10; coverage M5, m3; realism R6). T8 drops the outstanding kind, its `getAssetOperationRowDetail` / `RowDetail` changes, the `assetOperation.outstandingLine` message and those asserts; it keeps `getAssetOperationRowBadge`, `RowBadge` and the three `badge*` messages, and renames its view type `AssetOperationRowBadgeView` (function, prop and test follow). Fix T8's key count.
- **X7. The handover day and the legacy mark: T2's functions** (interfaces B6; coverage M6; realism R8). T8 imports `isLegacyBackfilledHandover` and `checkinHandoverDay` from `./checkin-route-rules.ts`, renames every `isLegacyReturnBackfill`, deletes its own `checkinHandoverDay` and that test, and calls `selectedCheckout ? checkinHandoverDay(selectedCheckout) : null`. T2's signature stays non-null.

### Interface fixes (majors and minors)

- **X8.** T2's harness import line is `import { afterEach, beforeEach, test } from "node:test"` (interfaces M1; coverage m1; realism R10).
- **X9.** T5 passes `outstanding: { linkId: linkRow.id, checkinId: checkinNow.id }` to `getCheckinVerdict` and corrects its Consumes (interfaces M3; coverage M2; realism R4). Skeleton T4 line: the fact is `{ linkId, checkinId }`; the full shape is the row's `lateReturn`.
- **X10.** T9 lists and rewrites T8's three frame-prop pins in `tests/checkin-form-rules.test.ts` (interfaces M4).
- **X11.** T10 lists and rewrites T9's two pins in `tests/checkin-late-return-rules.test.ts` and adds that file to its `git add` (interfaces M5).
- **X12.** T9's checkout fixture carries `locationLabel` (interfaces M6).
- **X13.** T11's `TX_WORDS` use the exact th values T8 and T9 commit: `checkoutOutstanding` = T9's `checkout.componentsOutstanding` "ยังค้างคืน {count} รายการ: {list}" (match with `templatePattern(…, { count: "1" })` or fill `list`), `checkoutSummaryOutstanding` = "ค้างคืน {count} รายการ", `missingWarning` uses `{room}` ("{component} ยังไม่ได้คืน จะอยู่กับ {returner} ที่ {room} และบันทึกเป็นอุปกรณ์ที่ขาดในใบรับคืน" — copy T8's committed value), `outstandingLine` = T4's "ส่วนควบค้างคืน ของ {parentTag}". Step 0's table states them (interfaces M7, m12; coverage M8).
- **X14.** T1 → T2 → T3 in-transaction order: department (T1), room (T2), claim (T2), missing plan (T3), `generateCheckinDocumentNo` (interfaces m2). T2 and T3 say so.
- **X15.** Catalog rows anchor after their alphabetical neighbour; T2's rows after T1's `CHECKIN_DEPARTMENT_CODE_UNKNOWN` (interfaces m3).
- **X16.** T2 keeps T1's `AssetOperationConflictError` import and catch line and adds only its own branches; its Consumes names the widened union (interfaces m1). T5 drops its dead branch 3 and says branch 1 covers the department refusal (interfaces m4).
- **X17.** T9 reads `conditionLabels[chosen.conditionId] ?? null`; T8 deletes the unused `conditionLabelById` (interfaces m5; coverage m4; realism R12).
- **X18.** T9 imports `type ComponentLateReturnOutcome` from `./component-late-return.ts` instead of its own union (interfaces m6).
- **X19.** T10 uses `lateReturn: lateReturn !== null` (T9's value) (interfaces m7).
- **X20.** T8's `checkinTodayDay` / `checkinBangkokDay` call `getBangkokDateKey`; `validate()` maps date codes through `CHECKIN_RETURN_DATE_ERROR_KEYS` (interfaces m8).
- **X21.** T3's constant is renamed `COMPONENT_LINK_OUTSTANDING` in T3, T5, T6 and T9 (interfaces m9; realism R11).
- **X22.** T6 adds nothing to the snapshot-routes test import; T3 already did (interfaces m11).
- **X23.** T8 states it keeps `selectedReceiver`, `selectedReturnBy`, `chooseRow`, `setEmployeeField`, `submitCheckin` and `leaveReview` (realism R12).

### Coverage rulings

- **X24. Spec §8.5 "Asset pages" gets a new Task 12, run after T11** (interfaces M8; coverage M7; realism R9). Numbering stays T1-T11 so the drafts' cross-references hold; Task 12 adds its own E2E assert to T11's `return-components.spec.ts` and one docs line. Scope: the parent's components tab (and its overview list if it shows components) lists outstanding links with "ค้างคืน · อยู่กับ <holder> · <RT->"; the component's own page shows the same line (`describeAssetHolder` / the detail frame); the RT- comes from T4's frame fact `outstanding.checkinId` (read its `documentNo`); the tab count stays installed-only *(controller call: the count means "fitted now"; the outstanding row is listed under it with its own line)*; the component history wording for the outstanding and late-return movements reads sensibly. Re-pin `tests/asset-detail-frame.test.ts:38-39` and `tests/asset-detail-data-boundaries.test.ts:23` as needed.
- **X25.** T4 adds a source pin that the three audit reads (`audit-round.ts`, `audit-scan-data.ts`, `scan/route.ts`) keep `status: "installed", removedAt: null` (coverage m5).
- **X26. A component with status Missing (หาไม่พบ) may be returned late** (coverage m6). Missing means "not found, being traced"; a component brought back is found. Lost (สูญหาย, confirmed) stays refused with Disposed and Retired, per P2-R17. No T4 change; T11's docs name it.
- **X27. Accepted as drafted:** T9's ส่วนควบ row conditions (coverage m7; reword P2-R19); the `&exact=1` link (coverage m8; reword P2-R12); T11's two deviations, with `e2e/asset-detail/asset-detail.spec.ts` and `tests/e2e-asset-detail.test.ts` added to T11's Files (coverage m9); the movement count 47 → 48 (T3) → 49 (T5) (coverage m2; reword P2-R2).

### After the fix pass

- **X28. The late return also writes the room and holder lines.** When the component's room changes it gets a `location_change` line, and when it had a holder it gets a `custodian_change` line (to none). Both types are already labelled, so the movement count does not change. Without them the component's history would not show where it went or that its holder was cleared, which the regular return records (Task 12's call 11). Task 5 owns this.
- **X29. ผู้คืน with missing components:** the route refuses an unknown employee, and any inactive employee other than the handover's holder. The holder who has left stays allowed (Appendix A S-R46 offers them as ผู้คืน), as Task 3 drafted.
- **X30. One word for the parent in the late-return flow:** "เครื่องหลัก", as the transaction words already use it (`componentsTravelNote`, `transactionReasonComponentCheckin`) and Task 9 uses it. Task 12's history word is "กลับเข้าเครื่องหลัก".
- **X31. The late-return date bound on the panel calls Task 5's `getLateReturnDateError`** (after-fix n1); Task 9 writes no comparison of its own.
- **X32. Implementers run no Playwright and no build.** The controller runs Task 11's desktop-light check while reviewing Task 11, and the four projects after Task 12.
