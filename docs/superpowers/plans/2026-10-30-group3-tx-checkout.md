# Page Group 3 (Transactions), Plan 1: Shared Rules and ส่งมอบ — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The ส่งมอบ page is rebuilt to the TX-Checkout boards (three numbered sections, a "สรุปก่อนบันทึก" card that shows what the save will write, a sticky footer with ยกเลิก, and a three-step desk delivery on the phone), the checkout route writes the department of the person who receives the asset, the "ทรัพย์สินอื่น" checkout type is gone for new saves, and the transaction search finds several words at once.

**Architecture:** One pure rule decides the department after a checkout (`src/lib/asset-department-rule.ts`); the route and the page's summary both call it (Task 2). The search's by-id answer carries the chosen asset's detail (department, holder, branches, components) (Task 4), and shared parts give the three single-asset pages one frame, one summary card and one condition choice (Task 5). The checkout form is rebuilt on them for the desktop (Task 6); the phone shows the same form DOM as three steps (Task 7). No schema change, no migration.

**Tech Stack:** Next.js 16.4 App Router (read `node_modules/next/dist/docs/` before Next-specific code), React 19, next-intl (Thai first), Prisma 7 on SQL Server, zod 4, Tailwind 4 tokens, shadcn/Radix parts, `node --test` (`npm test`), Playwright E2E (4 projects: desktop and phone × light and dark; the phone on WebKit).

**Spec:** `docs/superpowers/specs/2026-10-30-page-group-3-transactions-design.md` (approved 2026-10-30). This plan covers §5, §6 (the checkout rows), §7, §11, §13 (the checkout keys), §17 (checkout) and Appendix A ส่งมอบ. Plans 2-4 cover รับคืน, โอนย้าย and ย้ายที่ตั้งหลายรายการ.

**Base:** master `533521fa` (the spec). **Branch:** `feat/group3-tx-checkout`. **Dry run:** none (no migration, no data change; the user agreed 2026-10-30).

**Execution:** subagent-driven. Implementers are the `opus-medium-implementer` agent type; the main session reviews each task itself. Tasks run in order 1 → 8. Line numbers are master's; a task names each block by its content where an earlier task moved it.

**E2E (the user's cadence):** after Task 8 the controller runs the targeted set `e2e/transactions e2e/cross-cutting/field-errors.spec.ts e2e/asset-detail e2e/smoke` from a clean build. The whole suite runs once at the end of page group 3 (after plan 4).

## Global Constraints

- Words follow `docs/19_THAI_GLOSSARY.md`; "ตรวจทาน" is a dropped word (the footer says "ตรวจสอบและบันทึก"). Conditions use the master names (no "ชำรุด"). Rooms and employees read "code - name". No raw code reaches the screen.
- Messages change only through `node scripts/messages-edit.mjs <change file>`, th and en together; change files live in the session scratchpad. `common.save` does not change.
- Shared parts and tokens only (DESIGN.md): no hex or rgba in tsx, no `dark:`, no `/NN` tints; both themes.
- **One rule, one function:** the department after a checkout comes only from `getCheckoutNextDepartmentId` (Task 2); the route writes it and the summary shows it. A ส่วนกลาง asset keeps its department on every checkout (P1-R2).
- Permissions: the checkout page and the search API need `asset:edit`, as today.
- Bounded reads: the search answers ≤20 rows and one total; the by-id detail reads one asset, its installed links and their open handovers.
- V-form rules: errors under the field, focus to the first error, toasts only for what has no field.
- E2E hooks of spec §5 stay unless a task rewrites the specs that use them in the same commit.
- No schema change and no migration. Pure rule files use relative `.ts` imports and `import type` only. Production is read only.
- Every task runs `npm test`, `npx tsc --noEmit` and `npm run lint` (0 errors) before its commit. A pin that fails outside the task's list is rewritten in the same commit and named in the report.
- Secrets: never read or print `.env`, `.env.prod-admin` or `.env.e2e`. E2E runs on the dev DB only and never runs LDAP sync, the settings save, Excel import, a failed login or a delete.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A ส่วนกลาง asset handed to an employee or to a department** keeps its department, and the summary card does not promise a change (P1-R2). Task 2's route tests pin the write, Task 6's summary rule test pins the card, Task 8's E2E reads both in the browser.
2. **A พร้อมใช้งาน asset that still carries an old holder (ข้อมูลเก่า)**, handed to a department or a room: the old holder stays, and the summary says so instead of "ไม่มี". Task 6's summary rule test pins it.
3. **The chosen asset's detail answers late, fails (VPN) or arrives after another asset was picked:** the card falls back to the room line, and a late answer never lands on another asset. Task 6's `withCheckoutAssetDetail` tests pin it.
4. **An old tab saves to a receiver who has left, or to a department or room closed since:** refused under the field before any write (`ASSET_CHECKOUT_DESTINATION_INACTIVE`). Task 2's route tests pin it.
5. **On the phone, going back from step 3 to change the receiver:** the drawn signature is dropped, so the saved signature is never the previous receiver's. Task 7's SignaturePad test pins it.
6. **A search with extra spaces, repeated words or more than 5 words** keeps the first 5 distinct words in typed order and never errors. Task 3's split tests pin it.

---

### Task 1: Drop "ทรัพย์สินอื่น" for new handovers (spec §7.3 Server, §13, decision 3)

New saves can no longer hand an asset over to another asset. The zod schema refuses `checkoutType: "asset"`, and the `checkoutParent` search mode goes with its verdict and the `handedOverAssetId` parameter. The current form loses the option and its second picker; this is a small edit, because Task 6 rebuilds the form. Old "asset" handovers stay readable everywhere. No schema change and no migration: `AssetCheckout.checkoutType` is free NVarChar(20), and `parentAssetId` stays.

**Files:**
- Modify:
  - `src/lib/validations/asset-operations.ts:10` (`checkoutTypes`), `:19` (`parentAssetId`), `:36-38` (the `asset` block of the superRefine)
  - `src/lib/asset-handover-mode.ts:13` (`CheckoutType`)
  - `src/app/api/assets/[id]/checkout/route.ts:11-12` (imports), `:59-84` (the ทรัพย์สินอื่น check), `:132` (the `parentAssetId` write), `:295` (the `parentAssetId` parse)
  - `src/lib/asset-operation-eligibility.ts:9` (`assetOperationModes`), `:76-83` (`getCheckoutParentVerdict` and its comment)
  - `src/lib/asset-operation-search-rules.ts:7`, `:36-42`, `:50-64`, `:66-81`, `:97-99`, `:109`, `:137-139`, `:250-269`, `:330`
  - `src/lib/asset-operation-picker-rules.ts:18`, `:33`; `src/lib/asset-operation-options.ts:69`; `src/lib/checkin-page-data.ts:42`
  - `src/lib/api-error-catalog.ts:31`
  - `src/components/asset-operations/checkout-form.tsx:36`, `:46-47`, `:54-55`, `:62`, `:70`, `:140`, `:147-157`, `:212-216`, `:233`, `:298`, `:307`, `:309-336`, `:483-501`
  - `messages/th.json` and `messages/en.json`, only through `node scripts/messages-edit.mjs`
- Test (modify): `tests/asset-handover-mode.test.ts`, `tests/asset-handover-checkout.test.ts`, `tests/asset-custody-route-claims.test.ts`, `tests/api-error-catalog.test.ts`, `tests/asset-operation-eligibility.test.ts`, `tests/asset-operation-search-rules.test.ts`, `tests/asset-operation-picker-rules.test.ts`, `tests/asset-operation-master-options.test.ts`, `tests/checkin-page-data.test.ts`, `tests/asset-operation-picker-forms.test.ts`, `tests/v-track2-o.test.ts`
- **Kept on purpose (old records), do not touch:**
  - `checkout.type_asset` and `checkin.type_asset`; the `parentAssetId` column and its field in `assetOperationSearchCheckoutSelect` (`search-rules.ts:169`);
  - `getCheckinHolder`'s `asset` branch (`search-rules.ts:302-304`) and `readDestinationLabels`' asset labels (`asset-operation-search.ts:66-95`);
  - the HO- and RT- print fallbacks (`checkouts/[id]/page.tsx:57,77,183-188`; `checkins/[id]/page.tsx:87,100,202-207`), `asset-history.ts:200-201` and `system-log-presenter.ts:39`.
- **Pins checked and not broken:**
  - `tests/v-track-s.test.ts:265,440` still sends `parentAssetId: ""`, which `z.object` strips.
  - GF5 `[6, 0, 0]` in `tests/form-migration-guards.test.ts:87`: `AssetOperationPicker` and `<option>` are not `CONSTRAINT_TAGS`.
  - `tests/e2e-cross-cutting.test.ts:222,239`.
  - No E2E spec picks ทรัพย์สินอื่น, `checkout-type` or `checkoutParent`.
- **Docs:** `docs/05_ASSET_LIFECYCLE.md:109`, `DEVELOPER_HANDOFF.md:1276-1279` and `docs/99_CHANGELOG.md:36` still describe the destination. They are Task 8's, and no test pins them.

**Interfaces:**
- Consumes:
  - `getCheckoutVerdict(facts: AssetOperationFacts): AssetOperationVerdict` (`src/lib/asset-operation-eligibility.ts:68`), unchanged.
  - `assertHandoverModeFields(input)` (`src/lib/asset-handover-mode.ts:27`), unchanged apart from the narrower `CheckoutType`.
  - `errorResponse(error, 400)` (`src/lib/api-response.ts:6-8`) → `validationFailedBody` (`src/lib/api-error-exposure.ts:35-38`). A ZodError with no `HANDOVER_*` issue (route catch, `checkout/route.ts:260-266`) answers `400 { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors }`.
- Produces:
  ```ts
  // src/lib/validations/asset-operations.ts (assetCheckoutSchema has no parentAssetId; an unknown key is stripped)
  export const checkoutTypes = ["user", "department", "location"] as const
  // src/lib/asset-handover-mode.ts (module-private)
  type CheckoutType = "user" | "department" | "location"
  // src/lib/asset-operation-eligibility.ts (getCheckoutParentVerdict is deleted)
  export const assetOperationModes = ["checkout", "checkin", "transfer", "bulkMove"] as const
  // src/lib/asset-operation-search-rules.ts
  export type AssetOperationSearchInput = { mode: AssetOperationMode; q: string; id: string | null; assignCustodian: boolean }
  export function buildAssetOperationSearchHref(input: { mode: AssetOperationMode; q?: string; id?: string; assignCustodian?: boolean }): string
  export function getAssetOperationSearchVerdict(input: AssetOperationSearchInput, facts: AssetOperationFacts): AssetOperationVerdict // `assetId` param dropped
  // src/lib/asset-operation-picker-rules.ts
  export type AssetOperationPickerContext = { assignCustodian?: boolean }
  ```
  These are gone: the API code `ASSET_CHECKOUT_DESTINATION_NOT_ALLOWED`, and the messages `checkout.toAsset`, `asset.transactionReasonSameAsset` and `apiErrors.checkoutDestinationNotAllowed`. A search with `mode=checkoutParent` answers 400 "Invalid search" (recon r12). An old tab that sends it gets that error, which does no harm.
  The checkout route no longer imports `normalizeAssetOwnershipType` (it is unused once the destination block goes). Task 2 imports it again; no Task 1 pin forbids it.

- [ ] **Step 1: Write the failing tests.**

`tests/asset-handover-mode.test.ts`: add `checkoutTypes` to the import from `../src/lib/validations/asset-operations.ts`, then append:
```ts
test("ทรัพย์สินอื่น is no longer a checkout type: the schema refuses it, and an old client's parentAssetId is dropped (group 3 spec §7.3)", () => {
  assert.deepEqual([...checkoutTypes], ["user", "department", "location"])
  const loan = { handoverMode: "temporary_loan", checkoutDate: "2026-08-31", expectedReturnDate: "2026-09-01", conditionBefore: "good" }
  const toAsset = assetCheckoutSchema.safeParse({ ...loan, checkoutType: "asset", parentAssetId: "asset-2" })
  assert.equal(toAsset.success, false)
  assert.ok(!toAsset.success && toAsset.error.issues.some((issue) => issue.path.join(".") === "checkoutType"))
  assert.equal("parentAssetId" in assetCheckoutSchema.parse({ ...loan, checkoutType: "location", locationId: "loc-1", parentAssetId: "asset-2" }), false)
})
```
`tests/asset-handover-checkout.test.ts`: append:
```ts
test("the route takes no ทรัพย์สินอื่น destination; the words for new saves go, and old records keep theirs (group 3 spec §7.3, §13)", () => {
  assert.doesNotMatch(routeSource, /getCheckoutParentVerdict|ASSET_CHECKOUT_DESTINATION_NOT_ALLOWED|input\.parentAssetId|"parentAssetId"|checkoutType === "asset"/)
  const [th, en] = ["th", "en"].map((locale) => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")))
  assert.equal(th.checkout.nonUserTemporaryHelp, "การส่งมอบให้แผนกหรือที่ตั้งเป็นการยืมใช้ชั่วคราวและต้องระบุกำหนดคืน")
  assert.equal(en.checkout.nonUserTemporaryHelp, "Handovers to a department or location are temporary loans and require a return date.")
  for (const table of [th, en]) {
    assert.deepEqual([table.checkout.toAsset, table.asset.transactionReasonSameAsset, table.apiErrors.checkoutDestinationNotAllowed], [undefined, undefined, undefined])
  }
  assert.deepEqual([th.checkout.type_asset, th.checkin.type_asset, en.checkout.type_asset, en.checkin.type_asset], ["ทรัพย์สินอื่น", "ทรัพย์สินอื่น", "Another Asset", "Another Asset"])
})
```
The route pin names `input.parentAssetId`, `"parentAssetId"` and `checkoutType === "asset"`, not a bare `parentAssetId`: the route keeps `parentAssetId: id,` in its `syncInstalledComponentsWithParent` call (`route.ts:204`), and that line stays. The pin does not name `normalizeAssetOwnershipType`: Step 4 deletes that import because it becomes unused, and Task 2 imports it again for the department rule.

`tests/asset-custody-route-claims.test.ts`: replace `:212-242` (the `toAsset`, `destination` and `destinationRefusal` helpers and both ทรัพย์สินอื่น tests) with:
```ts
test("a handover to ทรัพย์สินอื่น is refused by the schema before any read or write (group 3 spec §7.3)", async () => {
  const response = await post(checkoutRoute, { ...checkoutBody, checkoutType: "asset", custodianId: undefined, parentAssetId: "asset-pc" })
  assert.equal(response.status, 400)
  assert.equal((await response.json()).code, "VALIDATION_FAILED")
  assert.deepEqual(state.calls, [])
})
```
Remove `destinations` from the state type (`:11`), from the initial state (`:16`) and from `beforeEach` (`:144`), and remove its `asset.findFirst` branch (`:70`). Keep `openCheckoutAssetIds` and its branch (`:74`), because it still drives the route's own open-handover check.

`tests/api-error-catalog.test.ts:122-123` (keep `:121`, the S-R43 line that `checkinRepairOpen` stays removed): replace the two S-R39 lines (the "one word of its own (S-R39)" comment and the `getApiErrorKey("ASSET_CHECKOUT_DESTINATION_NOT_ALLOWED")` assertion) with:
```ts
  // The ทรัพย์สินอื่น destination is gone (group 3 spec §7.3), and its word with it.
  assert.equal(getApiErrorKey("ASSET_CHECKOUT_DESTINATION_NOT_ALLOWED"), null)
  for (const locale of ["th", "en"] as const) assert.equal(words(locale).checkoutDestinationNotAllowed, undefined, locale)
```
`tests/asset-operation-eligibility.test.ts:23-25` becomes:
```ts
test("the modes are the four pages' pickers; the ทรัพย์สินอื่น destination is gone (group 3 spec §7.3)", () => {
  assert.deepEqual([...assetOperationModes], ["checkout", "checkin", "transfer", "bulkMove"])
  assert.doesNotMatch(readFileSync("src/lib/asset-operation-eligibility.ts", "utf8"), /getCheckoutParentVerdict|checkoutParent|transactionReasonSameAsset/)
})
```
`tests/asset-operation-search-rules.test.ts`, in the parse test (`:44-56`):
- `base` loses `handedOverAssetId`.
- Delete `:53-54`.
- `:55` loops over `["checkout", "checkin", "transfer", "bulkMove"]`.
- Add:
```ts
  assert.deepEqual(parseAssetOperationSearch(new URLSearchParams("mode=checkoutParent&q=ab")), { error: "Invalid search" })
  assert.deepEqual(input("mode=checkout&q=ab&handedOverAssetId=asset-9"), base)   // a stray parameter is not read
```

- [ ] **Step 2: Rewrite the other pins this task breaks.**
  - `tests/asset-operation-eligibility.test.ts`:
    - `:8`: drop `getCheckoutParentVerdict` from the import, and delete the test at `:55-61`.
    - `:152-155`: drop `"SameAsset"` and its Thai `"เป็นทรัพย์สินที่กำลังส่งมอบ เลือกเป็นปลายทางไม่ได้"`. `:163`: drop the parent verdict. `:167`: drop `"SameAsset"`.
  - `tests/asset-operation-search-rules.test.ts`:
    - `:8`: drop `getCheckoutParentVerdict`. `:70`: the expected parse loses `handedOverAssetId: null`.
    - `:71` becomes `assert.equal(buildAssetOperationSearchHref({ mode: "checkout", id: "asset-2" }), "/api/asset-operations/search?mode=checkout&id=asset-2")`.
    - `:84`: the title ends "…รับคืน adds the open handover". `:101` and `:188` loop over `["checkout", "transfer", "bulkMove"]`.
    - Delete `:106-107`, `:109` and `:146`. `:143` becomes `getAssetOperationSearchVerdict(input(query), row)`.
    - `:193-198` stays: an old "asset" handover still groups under its destination.
  - `tests/asset-operation-picker-rules.test.ts`: delete `:39-40`.
  - `tests/asset-operation-master-options.test.ts:85,88` and `tests/checkin-page-data.test.ts:78,97,100`: each expected `input` loses `handedOverAssetId: null`.
  - `tests/asset-operation-picker-forms.test.ts:40-50`:
    - the title becomes "ส่งมอบ: the asset is the shared picker; an asset that arrived blocked reads its reason under the field (spec 6.3, 6.4)";
    - replace `:44` and `:46` with `assert.doesNotMatch(source, /checkoutParent|handedOverAssetId|parentAsset|value="asset"|t\("toAsset"\)/)`.
  - `tests/v-track2-o.test.ts`:
    - the helper (`:79-91`) loses its `shared` option: the signature becomes `form: { ids: Record<string, string>; noValidate?: false }`, each id is counted once, and the comment's ทรัพย์สินอื่น sentence goes;
    - the checkout test's `ids` loses `parentAssetId: "checkout-destination",` (`:110`), and `shared` (`:116`) goes;
    - `:150` becomes `assert.doesNotMatch(source, /<AssetOperationPicker\n\s+id="checkout-destination"/)`.

- [ ] **Step 3: Run them and see them fail.** Run `node --test tests/asset-handover-mode.test.ts tests/asset-handover-checkout.test.ts tests/asset-custody-route-claims.test.ts tests/api-error-catalog.test.ts tests/asset-operation-eligibility.test.ts tests/asset-operation-search-rules.test.ts tests/asset-operation-picker-rules.test.ts tests/asset-operation-master-options.test.ts tests/checkin-page-data.test.ts tests/asset-operation-picker-forms.test.ts tests/v-track2-o.test.ts`. Expected failures:
  - `checkoutTypes` still has `"asset"`, and the route source still names `getCheckoutParentVerdict`;
  - the custody test gets `201 !== 400`: with `destinations` gone from the harness, the old check finds an eligible asset;
  - the catalog answers `"checkoutDestinationNotAllowed"` where `null` is expected;
  - the modes still include `checkoutParent`, `mode=checkoutParent` still parses, and the inputs still carry `handedOverAssetId: null`;
  - `getAssetOperationSearchVerdict` throws a TypeError, because `facts` is undefined;
  - the form still matches `checkoutParent`, and `FIELD_IDS` still has `parentAssetId`.

- [ ] **Step 4: The schema, the route, the verdicts and the search.**
  - `validations/asset-operations.ts`: `checkoutTypes` as Produces. Delete `parentAssetId: optionalText` and the `asset` block of the superRefine.
  - `asset-handover-mode.ts:13`: `CheckoutType` as Produces.
  - Checkout route:
    - the import becomes `import { getAssetOperationOwnershipRefusal } from "@/lib/asset-operation-eligibility"`;
    - delete the `normalizeAssetOwnershipType` import (`:12`; its one use, `:73`, is inside the block that goes, and lint would flag it), the destination block (`:59-84`), the `parentAssetId:` write (`:132`) and the parse (`:295`);
    - keep `parentAssetId: id,` in the `syncInstalledComponentsWithParent` call (`:204`): it names the parent of the installed components, not a destination;
    - nothing else changes (the department is Task 2's, and Task 2 imports `normalizeAssetOwnershipType` again).
  - Eligibility: `assetOperationModes` as Produces. Delete `getCheckoutParentVerdict` with its comment.
  - Search rules:
    - drop the `getCheckoutParentVerdict` import. `AssetOperationSearchInput` and `buildAssetOperationSearchHref` as Produces; `parseAssetOperationSearch` stops reading `handedOverAssetId`;
    - delete `baseWhere`. `buildAssetOperationSearchWheres` uses `const base = { isActive: true }`, and `buildAssetOperationByIdWhere` returns `{ isActive: true, id: input.id ?? undefined }`, the values the tests at `:85-108` pin;
    - `getAssetOperationSearchVerdict(input, facts)` has no `checkoutParent` case, and `:330` calls it that way.
  - Picker rules: `AssetOperationPickerContext` as Produces, and `:33` (`handedOverAssetId`) goes. `asset-operation-picker.tsx` is unchanged.
  - Delete the `handedOverAssetId: null` line in `asset-operation-options.ts:69` and in `checkin-page-data.ts:42`.
  - Delete the `ASSET_CHECKOUT_DESTINATION_NOT_ALLOWED` row in `api-error-catalog.ts:31`.

- [ ] **Step 5: The current form, a small edit.** In `checkout-form.tsx`:
  - `type CheckoutType = "user" | "department" | "location"`.
  - The `parentAsset` value goes: its type field and comment (`:46-47`), its initial value (`:140`), its reset in the type change (`:298`) and its `body.set("parentAssetId", …)` (`:233`).
  - `FIELD_IDS` loses `parentAssetId` (`:62`), and `DESTINATION_KEYS = ["custodianId", "departmentId", "locationId"] as const`. The comment at `:54-55` reads "custodianId, departmentId or locationId (O-R3)".
  - `destinationOptions`: `"user"` → employees, `"department"` → departments, otherwise locations. `destinationLabel = destinationOptions.find((option) => option.id === destinationValue(values))?.label`. Drop the ทรัพย์สินอื่น comment.
  - `setAsset` becomes `setValues((current) => ({ ...current, asset }))` plus the clear; the same-asset comment goes.
  - Delete `<option value="asset">{t("toAsset")}</option>`. Replace the `values.checkoutType === "asset" ? … : …` block (`:309-336`) with its `SearchableSelect` branch alone, unchanged.
  - `destinationKey` ends with `return "locationId"`. `destinationValue`'s parameter loses `parentAsset` and ends with `return values.locationId`.
  - The `validate` rules, ids, texts and the review stay as they are.

- [ ] **Step 6: The words.** Save this change file in your session scratchpad as `p1-t1-messages.json`, then run `node scripts/messages-edit.mjs <scratchpad>/p1-t1-messages.json`. Expected output: `messages updated: 1 th, 1 en, 3 deleted`.
```json
{ "set": {
  "th": { "checkout.nonUserTemporaryHelp": "การส่งมอบให้แผนกหรือที่ตั้งเป็นการยืมใช้ชั่วคราวและต้องระบุกำหนดคืน" },
  "en": { "checkout.nonUserTemporaryHelp": "Handovers to a department or location are temporary loans and require a return date." }
}, "delete": ["checkout.toAsset", "asset.transactionReasonSameAsset", "apiErrors.checkoutDestinationNotAllowed"] }
```

- [ ] **Step 7: Run the Step 3 command again.** Expected: all pass.

- [ ] **Step 8: Run the repo checks.** Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: no failures and 0 lint errors. If a pin outside this task's list fails, rewrite it in this commit and name it in the report.

- [ ] **Step 9: Commit.**
```
git add src/lib/validations/asset-operations.ts src/lib/asset-handover-mode.ts "src/app/api/assets/[id]/checkout/route.ts" src/lib/asset-operation-eligibility.ts src/lib/asset-operation-search-rules.ts src/lib/asset-operation-picker-rules.ts src/lib/asset-operation-options.ts src/lib/checkin-page-data.ts src/lib/api-error-catalog.ts src/components/asset-operations/checkout-form.tsx messages/th.json messages/en.json tests/asset-handover-mode.test.ts tests/asset-handover-checkout.test.ts tests/asset-custody-route-claims.test.ts tests/api-error-catalog.test.ts tests/asset-operation-eligibility.test.ts tests/asset-operation-search-rules.test.ts tests/asset-operation-picker-rules.test.ts tests/asset-operation-master-options.test.ts tests/checkin-page-data.test.ts tests/asset-operation-picker-forms.test.ts tests/v-track2-o.test.ts
git commit -m "feat(checkout): drop ทรัพย์สินอื่น for new handovers: the schema refuses checkoutType asset, the checkoutParent search mode and its verdict go, the form offers พนักงาน / แผนก / ที่ตั้ง; old asset handovers stay readable (group 3 spec §7.3, §13)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Open issues (Task 1 against the skeleton):**
1. `getAssetOperationSearchVerdict` loses its `assetId` parameter. Only `checkoutParent` read it, and its one caller is `search-rules.ts:330`. The skeleton does not name this signature change.
2. The skeleton lists 5 tests to update. Four more break and are rewritten in Step 2: `asset-operation-picker-forms`, `v-track2-o`, `asset-operation-master-options` and `checkin-page-data`. In addition, `asset-handover-mode` and `asset-handover-checkout` gain the new assertions.

---

### Task 2: The department rule and the checkout route (spec §6, §7.2 last bullet, §5 refusals)

A handover to an employee gives a บุคคล or Stock asset the employee's department (decision 1). A ส่วนกลาง asset keeps its own (decision 10, P1-R2). A real change gets a `department_change` line, and an unknown or inactive destination is refused under its field. One pure function decides the department; this route calls it, and Task 6's summary calls it too. Line numbers are master's (`533521fa`). Task 1 has already removed the route's ทรัพย์สินอื่น block (`:59-84`), `:132`, `:295` and the `normalizeAssetOwnershipType` import (`:12`), which nothing used once that block was gone. So each block below is also named by its content, and this task imports `normalizeAssetOwnershipType` again (Step 4).

**Files:**
- Create: `src/lib/asset-department-rule.ts`
- Create: `tests/asset-department-rule.test.ts`
- Modify: `src/app/api/assets/[id]/checkout/route.ts`: imports `:1-28` (add back the `normalizeAssetOwnershipType` import Task 1 deleted from `:12`); insert after the condition refusal (`:86-96`); delete `:103` (`const nextDepartmentId = …`); inside the transaction, insert after the claim (`:106`) and after `if (!beforeAsset) …` (`:120`); insert after the checkout movement (`:189-201`); in the catch (`:256-259`); add helpers between `POST` and `parseCheckoutRequest` (`:268-270`)
- Modify: `src/lib/api-error-catalog.ts:30-31`: one entry, where Task 1 removed `ASSET_CHECKOUT_DESTINATION_NOT_ALLOWED`
- Modify: `messages/th.json`, `messages/en.json` through `node scripts/messages-edit.mjs` only
- Test: `tests/asset-custody-route-claims.test.ts` (harness `:7-16`, `:39-43`, `:68-75`, `:140-147`; new tests appended)
- Test: `tests/api-error-catalog.test.ts` (one test appended)

**Interfaces:**
- Consumes:
  - `type AssetOwnershipType` (`src/lib/asset-ownership.ts:5`) and `normalizeAssetOwnershipType(value?: string | null): AssetOwnershipType` (`:9`). Task 1 deleted the route's import of it; this task adds it back.
  - Task 1's route pin in `tests/asset-handover-checkout.test.ts`: `assert.doesNotMatch(routeSource, /getCheckoutParentVerdict|ASSET_CHECKOUT_DESTINATION_NOT_ALLOWED|input\.parentAssetId|"parentAssetId"|checkoutType === "asset"/)`. It does not name `normalizeAssetOwnershipType`, so the re-import keeps it passing. The route code this task adds must not contain any of those strings (the sync call's existing `parentAssetId: id,` does not match).
  - Task 1: `assetCheckoutSchema` with `checkoutType: "user" | "department" | "location"` (`src/lib/validations/asset-operations.ts:10`). `custodianId`, `departmentId` and `locationId` are `optionalText`, so each is `string | null`.
  - `claimAssetForCustodyChange(tx, { assetId, expectedStatusId, updatedBy })` (`src/lib/asset-operation-claim.ts:30`). The existing `syncInstalledComponentsWithParent(tx, { changes: { currentLocationId, custodianId, departmentId }, … })` call (route `:203-217`) stays as it is; the components take the department from it.
  - The `department_change` row shape of the register edit (`src/app/api/assets/[id]/route.ts:316-327`)
  - The form already shows `fieldErrors.custodianId | departmentId | locationId` under `#checkout-destination` (`checkout-form.tsx:55-66`). A field-error code resolves through `common.validation`, then through `apiErrors` (`src/components/ui/use-field-errors.ts:36-47`), so the code is also the `apiErrors` key. No form change is needed in this task.
- Produces:
  ```ts
  // src/lib/asset-department-rule.ts (pure, client-safe, `import type` only, relative .ts imports)
  export function getCheckoutNextDepartmentId(input: {
    ownership: AssetOwnershipType
    checkoutType: "user" | "department" | "location"
    currentDepartmentId: string | null
    employeeDepartmentId: string | null
    chosenDepartmentId: string | null
  }): string | null
  ```
  - ownership `shared`, `component` or `software_license` → `currentDepartmentId`
  - otherwise by `checkoutType`: `user` → `employeeDepartmentId ?? currentDepartmentId`; `department` → `chosenDepartmentId ?? currentDepartmentId`; `location` → `currentDepartmentId`

  Route answer: `409 { code: "ASSET_CHECKOUT_DESTINATION_INACTIVE", error: "ASSET_CHECKOUT_DESTINATION_INACTIVE", fieldErrors: { [custodianId|departmentId|locationId]: "checkoutDestinationInactive" } }`. Message key `apiErrors.checkoutDestinationInactive`. A real change writes the movement `department_change` with `referenceType: "checkout"`; the asset history counts it under the chip แก้ไขข้อมูล (the controller accepted this). Plans 2-3 add `getCheckinNextDepartmentId` and `getTransferNextDepartmentId` to the same module.

- [ ] **Step 1: Write the failing tests.**
  - Create `tests/asset-department-rule.test.ts`:
```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { getCheckoutNextDepartmentId } from "../src/lib/asset-department-rule.ts"
import type { AssetOwnershipType } from "../src/lib/asset-ownership.ts"

type Input = Parameters<typeof getCheckoutNextDepartmentId>[0]
const types: Input["checkoutType"][] = ["user", "department", "location"]
const next = (ownership: AssetOwnershipType, checkoutType: Input["checkoutType"], overrides: Partial<Input> = {}) =>
  getCheckoutNextDepartmentId({ ownership, checkoutType, currentDepartmentId: "dept-now", employeeDepartmentId: "dept-employee", chosenDepartmentId: "dept-chosen", ...overrides })

test("บุคคล and Stock: the employee's department, the chosen department, or unchanged for a room (group 3 spec §6, decision 1)", () => {
  for (const ownership of ["personal", "stock"] as const) {
    assert.deepEqual(types.map((type) => next(ownership, type)), ["dept-employee", "dept-chosen", "dept-now"], ownership)
    assert.deepEqual(types.map((type) => next(ownership, type, { currentDepartmentId: null })), ["dept-employee", "dept-chosen", null], `${ownership}, no department yet`)
  }
})

test("ส่วนกลาง keeps its responsible department on every checkout, a department one included (spec §6, decision 10, P1-R2)", () => {
  assert.deepEqual(types.map((type) => next("shared", type)), ["dept-now", "dept-now", "dept-now"])
  assert.deepEqual(types.map((type) => next("shared", type, { currentDepartmentId: null })), [null, null, null])
})

test("ส่วนควบ and License never reach it (the route refuses them first); they keep the current department", () => {
  for (const ownership of ["component", "software_license"] as const) assert.deepEqual(types.map((type) => next(ownership, type)), ["dept-now", "dept-now", "dept-now"], ownership)
})

test("no receiver or department chosen yet keeps the current one (the page's summary before a pick)", () => {
  assert.equal(next("personal", "user", { employeeDepartmentId: null }), "dept-now")
  assert.equal(next("stock", "department", { chosenDepartmentId: null }), "dept-now")
})

test("the rule stays pure: import type only, relative .ts paths, no database", () => {
  const source = readFileSync("src/lib/asset-department-rule.ts", "utf8")
  assert.doesNotMatch(source, /from "@\/|@prisma\/client|\bprisma\./)
  for (const line of source.split(/\r?\n/).filter((line) => line.startsWith("import "))) assert.match(line, /^import type \{[^}]+\} from "\.\/[\w-]+\.ts"$/, line)
})
```
  - `tests/asset-custody-route-claims.test.ts` harness changes. Without them, master's mock answers `employee.findFirst` with null, so the existing handover tests would fail.
    - `CustodyRouteState` (`:7-14`) gains `employees: Record<string, { id: string; departmentId: string }>`, `employeeAnswers: Array<{ id: string; departmentId: string } | null>`, `activeDepartmentIds: string[]`, `activeLocationIds: string[]`, `writes: Array<{ call: string; data: Record<string, unknown> }>` and `syncChanges: Array<Record<string, unknown>>`.
    - The initial state (`:16`) and `beforeEach` (`:140-147`) both set `employees: { "emp-2": { id: "emp-2", departmentId: "dept-2" } }` (a fresh object each time), `employeeAnswers: []`, `activeDepartmentIds: ["dept-3"]`, `activeLocationIds: ["location-2"]`, `writes: []` and `syncChanges: []`. Keep whatever Task 1 left of `destinations`.
    - The sync mock (`:39-43`) becomes `export async function syncInstalledComponentsWithParent(_tx, args) { globalThis.__custodyRouteState.syncChanges.push(args.changes); return { updated: 0, skipped: 0, movements: 0, componentSnapshots: [] } }`.
    - In `model()`, after `state().calls.push(…)` (`:68`), add `if (method === "create" || method === "update") state().writes.push({ call: name + "." + String(method), data: args?.data ?? {} })`.
    - Before the generic `findFirst`/`findUnique → null` line (`:75`), add:
      - `employee.findFirst`: return `employeeAnswers.shift()` while that queue is not empty; otherwise return `employees[where.id] ?? null`, but only when `where.isActive === true` (else null).
      - `department.findFirst` and `location.findFirst`: return `{ id: where.id }` only when `where.isActive === true` and the id is in `activeDepartmentIds` or `activeLocationIds`; otherwise null.

    Then append (`refusal` already exists at `:189`):
```ts
const written = (call: string) => state.writes.filter((write) => write.call === call).map((write) => write.data)
const toDepartment = (departmentId: string) => ({ ...checkoutBody, checkoutType: "department", custodianId: undefined, departmentId })
const toRoom = (locationId: string) => ({ ...checkoutBody, checkoutType: "location", custodianId: undefined, locationId })
const departmentLine = (toValue: string) => ({ assetId: "asset-1", movementType: "department_change", fromValue: "dept-1", toValue, reason: "Asset checkout", referenceType: "checkout", referenceId: "assetCheckout-new", performedBy: "user-1" })
const inactive = (field: string) => [409, { code: "ASSET_CHECKOUT_DESTINATION_INACTIVE", error: "ASSET_CHECKOUT_DESTINATION_INACTIVE", fieldErrors: { [field]: "checkoutDestinationInactive" } }]

test("a handover gives a บุคคล or Stock asset and its components the employee's or the chosen department, with a department_change line (group 3 spec §6)", async () => {
  for (const [ownership, body, departmentId] of [["personal", checkoutBody, "dept-2"], ["stock", checkoutBody, "dept-2"], ["personal", toDepartment("dept-3"), "dept-3"], ["stock", toDepartment("dept-3"), "dept-3"]] as const) {
    state.assetOwnershipType = ownership; state.writes = []; state.syncChanges = []
    assert.equal((await post(checkoutRoute, body)).status, 201, `${ownership} ${body.checkoutType}`)
    assert.equal(written("asset.update")[0].departmentId, departmentId)
    assert.equal(state.syncChanges[0].departmentId, departmentId)
    assert.deepEqual(written("assetMovement.create").filter((row) => row.movementType === "department_change"), [departmentLine(departmentId)])
  }
})

test("a ส่วนกลาง asset keeps its department, a room or the same department changes nothing, and no department_change is written (spec §6, P1-R2)", async () => {
  state.employees["emp-same"] = { id: "emp-same", departmentId: "dept-1" }
  for (const [ownership, body] of [["shared", checkoutBody], ["shared", toDepartment("dept-3")], ["personal", toRoom("location-2")], ["stock", toRoom("location-2")], ["personal", { ...checkoutBody, custodianId: "emp-same" }]] as const) {
    state.assetOwnershipType = ownership; state.writes = []; state.syncChanges = []
    assert.equal((await post(checkoutRoute, body)).status, 201, `${ownership} ${body.checkoutType}`)
    assert.equal(written("asset.update")[0].departmentId, "dept-1")
    assert.equal(state.syncChanges[0].departmentId, "dept-1")
    assert.deepEqual(written("assetMovement.create").map((row) => row.movementType), ["checkout"])
  }
  state.assetOwnershipType = "shared"; state.writes = []
  await post(checkoutRoute, toDepartment("dept-3"))
  assert.equal(written("assetCheckout.create")[0].departmentId, "dept-3", "the HO- still names the department it went to")
})

test("an unknown or inactive employee, department or room is refused under its field, before any write (spec §6, §7.2)", async () => {
  for (const [body, field] of [[{ ...checkoutBody, custodianId: "emp-left" }, "custodianId"], [toDepartment("dept-closed"), "departmentId"], [toRoom("location-closed"), "locationId"]] as const) {
    state.calls = []
    assert.deepEqual(await refusal(await post(checkoutRoute, body)), inactive(field), field)
    assert.equal(state.calls.includes("asset.updateMany"), false, field)
    assert.equal(state.calls.includes("assetCheckout.create"), false, field)
  }
})

test("an employee deactivated while the handover is saved is refused inside the transaction, before the HO- record (spec §6)", async () => {
  state.employeeAnswers = [{ id: "emp-2", departmentId: "dept-2" }, null]
  assert.deepEqual(await refusal(await post(checkoutRoute, checkoutBody)), inactive("custodianId"))
  const reads = state.calls.flatMap((call, index) => (call === "employee.findFirst" ? [index] : []))
  assert.equal(reads.length, 2)
  assert.ok(reads[1] > state.calls.indexOf("asset.updateMany"), "read again after the claim")
  assert.equal(state.calls.includes("assetCheckout.create"), false)
})

test("an active employee whose department is closed still receives the asset, with that department (spec §6, call 5)", async () => {
  state.employees["emp-2"] = { id: "emp-2", departmentId: "dept-closed" }
  assert.equal((await post(checkoutRoute, checkoutBody)).status, 201)
  assert.equal(written("asset.update")[0].departmentId, "dept-closed")
  assert.equal(state.calls.includes("department.findFirst"), false, "the employee's department is not checked")
})
```
  - `tests/api-error-catalog.test.ts`, append:
```ts
test("an inactive checkout destination reads its own words under the field (group 3 spec §6, §7.2)", () => {
  assert.equal(getApiErrorKey("ASSET_CHECKOUT_DESTINATION_INACTIVE"), "checkoutDestinationInactive")
  const words = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).apiErrors.checkoutDestinationInactive
  assert.deepEqual([words("th"), words("en")], ["ปลายทางนี้ไม่มีในระบบหรือถูกปิดใช้งานแล้ว เลือกใหม่", "This destination is missing or inactive. Choose another one."])
})
```

- [ ] **Step 2: Run them and see them fail.** Run `node --test tests/asset-department-rule.test.ts tests/asset-custody-route-claims.test.ts tests/api-error-catalog.test.ts`. Expected failures: the rule file `ERR_MODULE_NOT_FOUND`; the department test `'dept-1' !== 'dept-2'`; the refusal and race tests `[201, …]` instead of `[409, …]`; the closed-department test `'dept-1' !== 'dept-closed'`; the catalog test `null !== 'checkoutDestinationInactive'`; the ส่วนกลาง test on its department case, `'dept-3' !== 'dept-1'` (today a checkout to a department writes the chosen department for any ownership, route `:103`). Every existing test already passes.

- [ ] **Step 3: Create the rule.** Create `src/lib/asset-department-rule.ts` with the Produces signature and rules, and `import type { AssetOwnershipType } from "./asset-ownership.ts"`. Its header comment: the department a transaction save writes (group 3 spec §6, decisions 1, 2, 10). It is pure and client-safe, and the checkout route and the checkout page's summary call it. Plans 2-3 add the checkin and transfer rules here.

- [ ] **Step 4: Change the checkout route.**
  - Imports: `import type { Prisma } from "@prisma/client"`, `import { getCheckoutNextDepartmentId } from "@/lib/asset-department-rule"`, and `import { normalizeAssetOwnershipType } from "@/lib/asset-ownership"`. Task 1 deleted that last import (master `:12`) because nothing used it once the ทรัพย์สินอื่น block was gone; add it back here, because the department rule call below uses it. Task 1's route pin does not name it.
  - Helpers, between `POST` and `parseCheckoutRequest`. Do not export any of them; a route file exports its handlers only.
    - `type CheckoutDestinationField = "custodianId" | "departmentId" | "locationId"`
    - `function checkoutDestinationField(checkoutType: "user" | "department" | "location"): CheckoutDestinationField` returns `user → custodianId`, `department → departmentId`, `location → locationId`.
    - `async function readActiveCheckoutDestination(db: Pick<Prisma.TransactionClient, "employee" | "department" | "location">, input: { checkoutType: "user" | "department" | "location"; custodianId?: string | null; departmentId?: string | null; locationId?: string | null }): Promise<{ employeeDepartmentId: string | null } | null>`. It calls one `findFirst` on the type's model with `where: { id, isActive: true }`. The employee selects `{ departmentId: true }` and answers `{ employeeDepartmentId }`. The department and the location select `{ id: true }` and answer `{ employeeDepartmentId: null }`. A missing id or row answers null. The employee's own department is not read, because an inactive one is written as it is (spec §6, call 5).
    - `class CheckoutDestinationInactiveError extends Error` with a `readonly field: CheckoutDestinationField` field. It is set in the constructor body, after `super("ASSET_CHECKOUT_DESTINATION_INACTIVE")`. Do not use a constructor parameter property: `node --test` strips types only and rejects that syntax (the shape of `AssetOperationConflictError`, `asset-operation-claim.ts:1-9`).
    - `function destinationInactiveResponse(field: CheckoutDestinationField)` returns the Produces 409 body.
  - Pre-check: after the condition refusal block (`:91-96`), add `if (!(await readActiveCheckoutDestination(prisma, input))) return destinationInactiveResponse(checkoutDestinationField(input.checkoutType))`. It goes after the condition check, not before it, because `tests/v-track-s.test.ts:433-442` stubs prisma without `employee` and expects the condition refusal.
  - Delete `:103`. Inside the transaction, right after `claimAssetForCustodyChange(…)` (`:106`), read the destination again with `tx`; if it is gone, `throw new CheckoutDestinationInactiveError(checkoutDestinationField(input.checkoutType))`. After `if (!beforeAsset) …` (`:120`), add `const nextDepartmentId = getCheckoutNextDepartmentId({ ownership: normalizeAssetOwnershipType(asset.ownershipType), checkoutType: input.checkoutType, currentDepartmentId: beforeAsset.departmentId, employeeDepartmentId: destination.employeeDepartmentId, chosenDepartmentId: input.departmentId ?? null })`. The asset update (`:174`) and the sync (`:208`) keep reading `nextDepartmentId`.
  - After the `checkout` movement (`:189-201`): when `nextDepartmentId !== beforeAsset.departmentId`, call `tx.assetMovement.create({ data })` with exactly these keys: `{ assetId: id, movementType: "department_change", fromValue: beforeAsset.departmentId, toValue: nextDepartmentId, reason: "Asset checkout", referenceType: "checkout", referenceId: record.id, performedBy: user.id }`. Add no `remark`; the test compares the whole row. The history chip follows the movement type, so this row counts under แก้ไขข้อมูล (`asset-history-rules.ts` `categoryTypes`; `tests/asset-history-rules.test.ts:55` lists `department_change` under `edit`), not under ส่งมอบ. It still links its HO- through `referenceType: "checkout"`. The controller accepted this: do not move it to the ส่งมอบ chip.
  - In the catch, first: `if (error instanceof CheckoutDestinationInactiveError) return destinationInactiveResponse(error.field)`.

- [ ] **Step 5: Catalog the code and its words.** In `src/lib/api-error-catalog.ts`, directly after `"ASSET_CHECKIN_REPAIR_STATUS_REQUIRED": "checkinRepairStatusRequired",` (`:30`), add `"ASSET_CHECKOUT_DESTINATION_INACTIVE": "checkoutDestinationInactive",`. Save `<scratchpad>/p1-t2-messages.json` and run `node scripts/messages-edit.mjs <scratchpad>/p1-t2-messages.json`. Expected output: `messages updated: 1 th, 1 en, 0 deleted`.
```json
{ "set": {
  "th": { "apiErrors.checkoutDestinationInactive": "ปลายทางนี้ไม่มีในระบบหรือถูกปิดใช้งานแล้ว เลือกใหม่" },
  "en": { "apiErrors.checkoutDestinationInactive": "This destination is missing or inactive. Choose another one." }
} }
```

- [ ] **Step 6: Run them and see them pass.** Re-run the Step 2 command, plus `node --test tests/v-track-s.test.ts tests/asset-movement-labels.test.ts tests/asset-handover-checkout.test.ts tests/asset-transaction-snapshot-routes.test.ts tests/asset-component-sync-routes.test.ts`. Expected: all pass. `asset-movement-labels` still counts 47 written types (the register edit already writes `department_change`), the catalog scanner (`api-error-catalog.test.ts:68-80`) finds the new `error:` literal catalogued, and Task 1's route pin in `asset-handover-checkout` still passes with `normalizeAssetOwnershipType` imported again.

- [ ] **Step 7: Run the full checks.** Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: no failures and 0 lint errors. If a pin outside this task's list fails, rewrite it in this commit and name it in the report.

- [ ] **Step 8: Commit.**
```
git add src/lib/asset-department-rule.ts "src/app/api/assets/[id]/checkout/route.ts" src/lib/api-error-catalog.ts messages/th.json messages/en.json tests/asset-department-rule.test.ts tests/asset-custody-route-claims.test.ts tests/api-error-catalog.test.ts
git commit -m "feat(checkout): a handover to an employee gives a บุคคล or Stock asset the employee's department while ส่วนกลาง keeps its own, the change gets a department_change line, and an unknown or inactive destination is refused under its field (group 3 spec §6, P1-R2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Open issues (Task 2):**
1. The skeleton's rule list mixes ownership with checkout type ("`user` → employeeDepartmentId; `department` → chosen; `location` → current"). This task reads it as: ส่วนกลาง (and ส่วนควบ or License) keep the current department; otherwise the checkout type decides. It also adds one fallback: a null employee or chosen department keeps the current one. The route never passes null (`Employee.departmentId` is required, and zod requires `departmentId`), but Task 6's summary does before a pick.
2. The pre-check runs after the condition check, not with the earlier pre-checks, so that the stub test `v-track-s.test.ts:433-442` keeps passing unchanged.

---

### Task 3: Multi-word search on the transaction pickers (spec §11, P1-R6)

The search splits its text into at most 5 words; every word must match one field (AND over words, OR over fields), and the fields add the asset's and the holder's department name, so "notebook บัญชี" finds the accounting notebooks. The code tiers keep the whole text, and the picker marks each word.

**Files:**
- Modify: `src/lib/asset-operation-search-rules.ts` (today's master): constants `:20-34` (add after `:34`), `assetOperationTextConditions` `:85-95`, `buildAssetOperationSearchWheres` `:101-135`. Task 1 edits `:36-81`, `:97-99`, `:137-139` and `:250-269` of this file first, so find the functions by name.
- Modify: `src/lib/search-highlight.ts` (add after `:8`). `splitSearchHighlight` stays as it is, because `global-search.tsx:521` and `audit-scan-search.tsx:142` call it with one term.
- Modify: `src/components/ui/asset-operation-picker.tsx`: imports `:25-31`, `:221`, `:248`, `:251`, `:357`, `:412-423`.
- Modify: `e2e/transactions/return.spec.ts:112-115` (the repair-return test, `:102`: its comment and its picker search by the holder).
- Test: modify `tests/asset-operation-search-rules.test.ts` (rewrite `:74-82`, add 2 tests), `tests/asset-operation-search.test.ts` (the fake at `:47`, add 1 test), `tests/asset-operation-picker-ui.test.ts:52`, `tests/e2e-transactions.test.ts:170` (TX3's search line); create `tests/search-highlight.test.ts`.
- Not changed: `src/lib/asset-operation-search.ts` (it reads the wheres as given, and the count stays `wheres.text` at `:61`), the route, `messages/*` (no new words). Task 8 adds the multi-word E2E spec.
- E2E: one spec breaks. `e2e/transactions/return.spec.ts:115` searches the รับคืน picker by `receiver.fullNameTh`, which is several words (`${runId} ผู้รับมอบ 2`, `e2e/support/run-plan.ts:80`), and `:117` expects exactly one holder group. Under AND over words, receiver1's held assets match too: the run id is in every run tag, "ผู้รับมอบ" is in both receivers' names, and "2" is in every tag ("E2E-…"). So the spec would find 2 groups. Step 6 moves it to `receiver.code` (`${runId}-R2`, `run-plan.ts:80`): one word that no other run record contains (receiver1 is `-R1`, the rooms `-L` and `-L2` (`run-plan.ts:84`, `e2e/transactions/tx-plan.ts:34`), the tags `${runId}-DL-…` (`tx-plan.ts:21-25`), the run department's name has no `-R2`). Every other picker search in the E2E suite is one word, a tag or part of one (`e2e/transactions/bulk-move.spec.ts:71,76`, `e2e/transactions/return.spec.ts:121,191`, `e2e/transactions/transfer.spec.ts:125`), and the code tiers do not change.
- Pins this task breaks: `tests/asset-operation-search-rules.test.ts:74-82` (the conditions are no longer all the register's), `tests/asset-operation-picker-ui.test.ts:52` (`/splitSearchHighlight\(/`) and `tests/e2e-transactions.test.ts:170` (TX3 pins the search by `receiver.fullNameTh`), rewritten in Step 1. Still passing unchanged: `asset-operation-search-rules.test.ts:84-110` (after Task 1's edits; it builds its expectation from `assetOperationTextConditions` in the order kept below), `asset-operation-search.test.ts:72,154`, `global-search-panel.test.ts:48-50`, `audit-scan-session-list.test.ts:128-129`, `asset-operation-picker-ui.test.ts:47,120`, LV2 in `list-frame-guards.test.ts:176` (add no `"-"` literal), TX3's other lines (`e2e-transactions.test.ts:168`: both returns still start with `${receiver.code} - ${receiver.fullNameTh}`), and the other readers of `return.spec.ts` (`e2e-asset-detail.test.ts:69`, the arrival count at `e2e-transactions.test.ts:126`, the S-R48 test at `e2e-transactions.test.ts:190-213`), which read lines this task does not touch.

**Interfaces:**
- Consumes:
  - Task 1: `AssetOperationSearchInput = { mode: AssetOperationMode; q: string; id: string | null; assignCustodian: boolean }`. `parseAssetOperationSearch` still trims `q` and applies the 2-100 code-point rule to the whole text (`:50-64`). The base where is `{ isActive: true }` (today `baseWhere`, `:97-99`).
  - `openCheckoutWhere` (`:83`); `assetSearchConditions(search)` (`src/lib/asset-list-query.ts:126-148`, the register's list, not changed).
  - `searchAssetOperationOptions` (`src/lib/asset-operation-search.ts:48-63`) reads `exact`, `held`, `prefix`, `text` (take 20 each) and `count({ where: wheres.text })`.
  - Relations: `Asset.department` (optional), `Employee.department` (required), `Department.name` (`prisma/schema.prisma`).
  - E2E run data: `readRunData().employees.receiver2` has `code` = `${runId}-R2` and `fullNameTh` = `${runId} ผู้รับมอบ 2` (`e2e/support/run-plan.ts:80`); the รับคืน picker's holder group reads `${receiver.code} - ${receiver.fullNameTh}` (`e2e/transactions/return.spec.ts:118`).
- Produces:
  ```ts
  // src/lib/asset-operation-search-rules.ts (pure, client-safe)
  export const assetOperationSearchMaxWords = 5
  /** Split on whitespace; duplicates dropped (compared lower-cased, first spelling kept); then the first 5, in typed order. */
  export function splitAssetOperationSearchWords(q: string): string[]
  export function assetOperationTextConditions(word: string): Prisma.AssetWhereInput[]  // 8 entries, see below
  export function buildAssetOperationSearchWheres(input: AssetOperationSearchInput): { text; exact; prefix; held? } // return type unchanged
  // src/lib/search-highlight.ts
  export type SearchHighlightPart = { text: string; marked: boolean }
  export function splitSearchHighlightWords(value: string, words: readonly string[]): SearchHighlightPart[]
  ```
  - `assetOperationTextConditions(word)`: today's 6 entries in today's order, then `{ department: { name: { contains: word } } }` and `{ custodian: { department: { name: { contains: word } } } }`.
  - One clause per word. Every mode except รับคืน uses `{ OR: assetOperationTextConditions(word) }`. รับคืน uses `{ OR: [...assetOperationTextConditions(word), { checkouts: { some: { ...openCheckoutWhere, OR: [documentNo, custodian.code, custodian.fullNameTh contains word] } } }, { currentLocation: { code: { contains: word } } }, { currentLocation: { name: { contains: word } } }] }`, which is today's checkin list, per word.
  - `text`: with one word, `{ ...base, ...clause }`, which is today's shape, so the single-word pins hold. With 2-5 words, `{ ...base, AND: clauses }`. `held` (รับคืน only): `{ ...base, AND: [...clauses, { OR: [{ checkouts: { some: openCheckoutWhere } }, { custodianId: { not: null } }] }] }`. `exact` and `prefix` use the whole `q`, as today.
  - `splitSearchHighlightWords`: trims and lower-cases each word (`toLocaleLowerCase`) and ignores blank ones. It marks every case-insensitive occurrence of each word; overlapping or touching matches become one mark; the parts rebuild `value`, and none is empty (`""` gives `[]`).

- [ ] **Step 1: Write the failing tests.** In `tests/asset-operation-search-rules.test.ts`, add `assetOperationSearchMaxWords, splitAssetOperationSearchWords` to the import. Replace the test at `:74-82` and add two tests after the wheres test:

```ts
test("the text matches 6 of the register's own conditions, then the asset's and the holder's department names (spec 6.2, §11)", () => {
  const conditions = assetOperationTextConditions("0228")
  assert.deepEqual(conditions, [
    { assetTag: { contains: "0228" } }, { name: { contains: "0228" } }, { serialNumber: { contains: "0228" } }, { fixedAssetCode: { contains: "0228" } },
    { custodian: { code: { contains: "0228" } } }, { custodian: { fullNameTh: { contains: "0228" } } },
    { department: { name: { contains: "0228" } } }, { custodian: { department: { name: { contains: "0228" } } } },
  ])
  const register = assetSearchConditions("0228")
  for (const condition of conditions.slice(0, 6)) assert.ok(register.some((entry) => isDeepStrictEqual(entry, condition)), JSON.stringify(condition))
})

test("multi-word: the text splits on whitespace into at most 5 words, duplicates dropped, in typed order (P1-R6)", () => {
  assert.equal(assetOperationSearchMaxWords, 5)
  assert.deepEqual(splitAssetOperationSearchWords("  notebook   บัญชี "), ["notebook", "บัญชี"])
  assert.deepEqual(splitAssetOperationSearchWords("notebook\tบัญชี\n0228"), ["notebook", "บัญชี", "0228"])
  assert.deepEqual(splitAssetOperationSearchWords("Dell dell DELL 5440 dell"), ["Dell", "5440"])
  assert.deepEqual(splitAssetOperationSearchWords("w1 w2 w3 w4 w5 w6 w7"), ["w1", "w2", "w3", "w4", "w5"])
  assert.deepEqual(splitAssetOperationSearchWords("w1 w1 w2 w3 w4 w5 w6"), ["w1", "w2", "w3", "w4", "w5"])   // duplicates go before the cap
  assert.deepEqual(splitAssetOperationSearchWords("SNI-EQU-25-0228"), ["SNI-EQU-25-0228"])
  assert.deepEqual(splitAssetOperationSearchWords("   "), [])
})

test("multi-word: every word must match a field, the code tiers keep the whole text; รับคืน's held tier needs every word too (spec §11)", () => {
  const q = "notebook บัญชี"
  assert.deepEqual(buildAssetOperationSearchWheres(input(`mode=checkout&q=${encodeURIComponent(q)}`)), {
    text: { isActive: true, AND: [{ OR: assetOperationTextConditions("notebook") }, { OR: assetOperationTextConditions("บัญชี") }] },
    exact: { isActive: true, OR: [{ assetTag: q }, { serialNumber: q }, { fixedAssetCode: q }] },
    prefix: { isActive: true, OR: [{ assetTag: { startsWith: q } }, { serialNumber: { startsWith: q } }, { fixedAssetCode: { startsWith: q } }] },
  })
  const checkinWord = (word: string) => ({ OR: [...assetOperationTextConditions(word), { checkouts: { some: { isReturned: false, transactionStatus: "active", OR: [
    { documentNo: { contains: word } }, { custodian: { code: { contains: word } } }, { custodian: { fullNameTh: { contains: word } } },
  ] } } }, { currentLocation: { code: { contains: word } } }, { currentLocation: { name: { contains: word } } }] })
  const checkin = buildAssetOperationSearchWheres(input(`mode=checkin&q=${encodeURIComponent("สมชาย HO-26")}`))
  assert.deepEqual(checkin.text, { isActive: true, AND: [checkinWord("สมชาย"), checkinWord("HO-26")] })
  assert.deepEqual(checkin.held, { isActive: true, AND: [checkinWord("สมชาย"), checkinWord("HO-26"),
    { OR: [{ checkouts: { some: { isReturned: false, transactionStatus: "active" } } }, { custodianId: { not: null } }] }] })
  // One word left after the duplicates go: today's shape.
  assert.deepEqual(buildAssetOperationSearchWheres(input("mode=transfer&q=Dell%20dell")).text, { isActive: true, OR: assetOperationTextConditions("Dell") })
  const six = buildAssetOperationSearchWheres(input("mode=bulkMove&q=w1%20w2%20w3%20w4%20w5%20w6"))
  assert.equal((six.text.AND as unknown[]).length, 5)
  assert.deepEqual(six.exact.OR, [{ assetTag: "w1 w2 w3 w4 w5 w6" }, { serialNumber: "w1 w2 w3 w4 w5 w6" }, { fixedAssetCode: "w1 w2 w3 w4 w5 w6" }])
})
```

In `tests/asset-operation-search.test.ts`, the fake at `:47` would treat a multi-word text where (it has `AND`) as the held tier. Change that line to `if (JSON.stringify(args.where).includes('"custodianId"')) return data.held ?? []   // รับคืน's held tier (S-R45): only it names custodianId`. Then add this test at the end:

```ts
test("multi-word: the contains tier and the count read every word, the code tiers the whole text; รับคืน reads the held tier too (spec §11)", async () => {
  const q = encodeURIComponent("notebook บัญชี")
  const query = input(`mode=checkout&q=${q}`)
  const wheres = buildAssetOperationSearchWheres(query)
  assert.equal((wheres.text.AND as unknown[]).length, 2)
  const { db, calls } = fakeDb({ contains: [asset("SNI-NB-25-0001", { name: "notebook Dell" })], total: 1 })
  const answer = await searchAssetOperationOptions(db, query)
  assert.deepEqual([answer.total, answer.rows.map((row) => row.assetTag)], [1, ["SNI-NB-25-0001"]])
  assert.deepEqual(calls.filter((call) => call.call === "asset.findMany").map((call) => call.args.where), [wheres.exact, wheres.prefix, wheres.text])
  assert.deepEqual(calls.filter((call) => call.call === "asset.count").map((call) => call.args.where), [wheres.text])
  const checkinQuery = input(`mode=checkin&q=${q}`)
  const heldRow = asset("SNI-NB-25-0002", { id: "h1", custodianId: "emp-1", custodian: somchai, status: inUse })
  const checkin = fakeDb({ held: [heldRow], total: 1 })
  assert.deepEqual((await searchAssetOperationOptions(checkin.db, checkinQuery)).rows.map((row) => row.id), ["h1"])
  const checkinWheres = buildAssetOperationSearchWheres(checkinQuery)
  assert.deepEqual(checkin.calls.filter((call) => call.call === "asset.findMany").map((call) => call.args.where),
    [checkinWheres.exact, checkinWheres.held, checkinWheres.prefix, checkinWheres.text])
})
```

Create `tests/search-highlight.test.ts`:

```ts
import assert from "node:assert/strict"
import test from "node:test"

import { splitSearchHighlightWords, type SearchHighlightPart } from "../src/lib/search-highlight.ts"

const view = (parts: SearchHighlightPart[]) => parts.map((part) => (part.marked ? `[${part.text}]` : part.text)).join("")

test("each word is marked wherever it shows, case-insensitive; overlapping or touching words make one mark (spec §11)", () => {
  assert.deepEqual(splitSearchHighlightWords("โน้ตบุ๊ก Dell Latitude 5440", ["dell", "5440"]), [
    { text: "โน้ตบุ๊ก ", marked: false }, { text: "Dell", marked: true }, { text: " Latitude ", marked: false }, { text: "5440", marked: true },
  ])
  assert.equal(view(splitSearchHighlightWords("EMP-0412 - สมชาย ใจดี", ["สมชาย", "ใจดี"])), "EMP-0412 - [สมชาย] [ใจดี]")
  assert.equal(view(splitSearchHighlightWords("IT-2 ห้อง IT ชั้น 2", ["it"])), "[IT]-2 ห้อง [IT] ชั้น 2")
  assert.equal(view(splitSearchHighlightWords("SNI-EQU-26-0001", ["equ", "qu-2"])), "SNI-[EQU-2]6-0001")
  assert.equal(view(splitSearchHighlightWords("SNI-EQU-26-0001", ["sni", "-equ"])), "[SNI-EQU]-26-0001")
})

test("nothing to mark: one plain part; an empty value has no parts", () => {
  for (const words of [["zz"], [], ["  "]]) assert.deepEqual(splitSearchHighlightWords("Printer", words), [{ text: "Printer", marked: false }])
  assert.deepEqual(splitSearchHighlightWords("", ["a"]), [])
})
```

In `tests/asset-operation-picker-ui.test.ts:52`, replace `assert.match(source, /splitSearchHighlight\(/)` with:

```ts
  assert.match(source, /splitSearchHighlightWords\(value, words\)/)
  assert.doesNotMatch(source, /\bsplitSearchHighlight\(/)
  for (const part of [
    "const words = splitAssetOperationSearchWords(query)", "<WordsHighlight value={row.assetTag} words={words} />",
    "<WordsHighlight value={row.name} words={words} />", "<WordsHighlight value={section.group.label} words={words} />",
  ]) assert.ok(source.includes(part), part)
```

In `tests/e2e-transactions.test.ts:170` (TX3), replace `assert.ok(spec.includes('const listbox = await searchAssets(page, "checkin-checkout", receiver.fullNameTh)'))` with:

```ts
  assert.ok(spec.includes('const listbox = await searchAssets(page, "checkin-checkout", receiver.code)'))
```

- [ ] **Step 2: Run them and see them fail.** Run `node --test tests/asset-operation-search-rules.test.ts tests/asset-operation-search.test.ts tests/search-highlight.test.ts tests/asset-operation-picker-ui.test.ts tests/e2e-transactions.test.ts`. Expected: `asset-operation-search-rules` and `search-highlight` fail to load (`does not provide an export named 'assetOperationSearchMaxWords'` / `'splitSearchHighlightWords'`). In `asset-operation-search`, the new test fails at `AND.length` (`undefined`). In `asset-operation-picker-ui`, the `:52` test fails on `/splitSearchHighlightWords\(value, words\)/`. In `e2e-transactions`, only TX3 fails, on the `receiver.code` line (`The expression evaluated to a falsy value`).

- [ ] **Step 3: The rules.** In `src/lib/asset-operation-search-rules.ts`, add `assetOperationSearchMaxWords` and `splitAssetOperationSearchWords` after `isAssetOperationSearchTooLong`. Give `assetOperationTextConditions` its parameter name `word`, the two department entries, and the doc comment "the register's 6 (asset-list-query.ts assetSearchConditions), then the asset's and the holder's department names (group 3 spec §11)". In `buildAssetOperationSearchWheres`, build one clause per word from `splitAssetOperationSearchWords(q)` and assemble `text` and `held` as described under Interfaces. A local `function wordClause(mode, word)` holds the รับคืน extras, in today's order. Keep `exact`/`prefix` on `q`.

- [ ] **Step 4: The highlight.** In `src/lib/search-highlight.ts`, add `SearchHighlightPart` and `splitSearchHighlightWords`. One way: a boolean per UTF-16 unit of `value`; set it for every `indexOf` hit of each lower-cased word on `value.toLocaleLowerCase()`; then cut runs.

- [ ] **Step 5: The picker.** In `asset-operation-picker.tsx`:
  - Add `splitAssetOperationSearchWords` to the `@/lib/asset-operation-search-rules` import (`:25-29`; the pin at test `:120` reads that block). Replace `:31` with `import { splitSearchHighlightWords } from "@/lib/search-highlight"`.
  - `:221` becomes `const words = splitAssetOperationSearchWords(query)`.
  - `:248` and `:357` become `<WordsHighlight value={…} words={words} />`. `:251` `{row.name}` becomes `<WordsHighlight value={row.name} words={words} />`: the name is now marked too, because a multi-word search mostly hits the name and the department (spec §11 "the highlight marks each word"; today only the tag and the รับคืน group label are marked). The row shows no department, so a department word marks nothing.
  - Rename `TagHighlight` (`:412-423`) to `function WordsHighlight({ value, words }: { value: string; words: readonly string[] })`. It maps the parts: a marked part goes in `<mark key={index} className="rounded-sm bg-warning-soft px-0.5 text-foreground">` (the exact class the pin at test `:47` reads), and the rest go in `<Fragment key={index}>`. Update the comment to "Each typed word in a <mark>, as GlobalSearch shows its term."
  - The chosen box (`:283-285`) and the chosen rows (`:386-388`) stay unmarked.

- [ ] **Step 6: The รับคืน spec.** In `e2e/transactions/return.spec.ts`, the repair-return test (`:102`):
  - In the comment at `:112`, "by the holder's name the answer is one group, theirs" becomes "by the holder's code the answer is one group, theirs".
  - `:115` becomes these two lines:
    ```ts
      // by the holder's code: a full name is several words, and each word now matches on its own (group 3 spec §11)
      const listbox = await searchAssets(page, "checkin-checkout", receiver.code)
    ```
  - `:116-118` stay: the answer is still receiver2's one group, and its label still reads `${receiver.code} - ${receiver.fullNameTh}`.
  This task runs no E2E: the spec runs in the controller's targeted run after Task 8.

- [ ] **Step 7: Run the tests and see them pass.** Run the Step 2 command. Expected: all pass.

- [ ] **Step 8: The repo checks.** Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: no failures and 0 lint errors. A pin outside this task's list that fails is rewritten in this commit and named in the report.

- [ ] **Step 9: Commit.**
```
git add src/lib/asset-operation-search-rules.ts src/lib/search-highlight.ts src/components/ui/asset-operation-picker.tsx e2e/transactions/return.spec.ts tests/asset-operation-search-rules.test.ts tests/asset-operation-search.test.ts tests/asset-operation-picker-ui.test.ts tests/search-highlight.test.ts tests/e2e-transactions.test.ts
git commit -m "feat(asset-operations): the transaction search takes up to 5 words, each matching any field including the asset's and the holder's department name, and the picker marks each word (group 3 spec §11, P1-R6)

The รับคืน E2E finds the holder's group by the holder's code: a full name is several words, and each word now matches on its own.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### Open issues (Task 3)
- The picker hints `assetOperation.hint` / `hintCheckin` (pinned at `asset-operation-picker-ui.test.ts:134-135`) mention neither แผนก nor several words. The spec fixes no new wording, so they are unchanged.
- The TX search no longer equals the register's field list (`asset-list-query.ts:123-125`, the user's 2026-10-25 decision covers the register and the global search). Spec §11 (call 21) adds the department names to the TX search only.
- Duplicate words are compared case-insensitively. This is my reading of P1-R6's "duplicates dropped", and it fits the case-insensitive highlight.

---

### Task 4: The checkout page's data: the chosen asset's detail and the receiver's department, branch and held count (spec §7.1, §7.2 hint line, §7.3 summary inputs; P1-R5)

The by-id search answers one more block, `detail`, when asked with `detail=1`: the status's English name (for the badge's tone), the department, the holder, both branches and the components. The employee options carry what the hint line "<แผนก> · <สาขา> · ตอนนี้ถือครองทรัพย์สินอยู่ N รายการ" needs. The page passes both, and the form only widens a prop type (no UI change; Task 6 draws them). Picker list rows do not change (P1-R5).

**Files:**
- Modify `src/lib/asset-operation-search-rules.ts`. Line numbers are master's; Tasks 1 and 3 moved these blocks, so find each one by name:
  - `:36-42` `AssetOperationSearchInput`, `:50-64` `parseAssetOperationSearch`, `:66-81` `buildAssetOperationSearchHref`;
  - after `:154`: the new selects, where and types;
  - `:191-218` `AssetOperationSearchRow`;
  - after `:369`: `buildAssetOperationRowDetail`.
- Modify `src/lib/asset-operation-search.ts`: `:19-30` (header comment, `AssetOperationSearchDb`), `:39-46` (by-id read), `:97-131` (`searchAssetOperationOptions`).
- Modify `src/lib/asset-operation-options.ts`: `:8-16` (types), `:20-53` (`getAssetOperationMasterOptions`), `:58-72` (`getAssetOperationPreselect`).
- Modify `src/app/[locale]/(dashboard)/asset-management/checkout/page.tsx:17` and `src/components/asset-operations/checkout-form.tsx:113-114` (the `employees` prop type, plus one `import type`).
- Test: `tests/asset-operation-search-rules.test.ts`, `tests/asset-operation-search.test.ts`, `tests/asset-operation-master-options.test.ts`.
- Pins this task breaks:
  - `tests/asset-operation-master-options.test.ts:66-77`: the employee shape changes, and the reads gain `asset.groupBy`. Step 1 rewrites it.
  - `tests/asset-operation-search.test.ts:40-58`: the fake db lacks `assetComponent`, so `tsc` fails. Step 1 adds it.
  - `tests/asset-operation-picker-forms.test.ts:33`: the checkout page's preselect call text changes. Step 5 rewrites it.
- Checked and still passing:
  - `tests/checkin-page-data.test.ts:78,97` and `tests/asset-operation-search-rules.test.ts:45-72`, because `detail` is absent, not `false`;
  - `tests/list-frame-guards.test.ts:176`: LV2 still counts 2 `"-"` in the rules file, because missing labels are `null`;
  - `tests/e2e-transactions.test.ts:117-118` (the signature does not change);
  - `tests/asset-operation-search-route.test.ts` (the route does not change; the parse carries `detail`).

**Interfaces:**
- Consumes:
  - **Task 1:** `AssetOperationSearchInput = { mode; q; id; assignCustodian }` (no `handedOverAssetId`), `buildAssetOperationSearchHref({ mode, q?, id?, assignCustodian? })` and `assetOperationModes = ["checkout", "checkin", "transfer", "bulkMove"]`.
  - `normalizeAssetOwnershipType(value?: string | null): AssetOwnershipType` and `type AssetOwnershipType` (`src/lib/asset-ownership.ts:9`, `:5`).
  - `openCheckoutWhere` (`asset-operation-search-rules.ts:83`) and `assetOperationSearchAssetSelect` (`:141-153`, whose `status: { select: { name: true, nameTh: true } }` at `:150` already carries the English name).
  - `searchAssetOperationOptions(db, input)` (`asset-operation-search.ts:97`).
  - The travel filter of `syncInstalledComponentsWithParent` (`src/lib/asset-component-sync.ts:115-122`: `status: "installed"`, `removedAt: null`, `componentAsset: { isActive: true }`; `:146-152`: a component with its own open handover is skipped).
  - The held count's `isActive: true` precedent (`src/app/[locale]/(dashboard)/master-data/employees/[id]/page.tsx:109`).
  - The relation `Asset.installedInLinks` (`prisma/schema.prisma:310`, relation "ComponentAssetLinks"; `AssetComponent.removedAt` `:406`, `status` `:407`) and its "not installed in another" filter `installedInLinks: { none: { status: "installed", removedAt: null } }` (precedent: `src/app/api/assets/component-candidates/route.ts:20-25`).
- Produces (`src/lib/asset-operation-search-rules.ts`, still client-safe, `import type` for Prisma):
  ```ts
  AssetOperationSearchInput.detail?: true                 // by id only; absent otherwise (as row.openRepair?: true)
  buildAssetOperationSearchHref(input: { mode; q?; id?; assignCustodian?; detail?: boolean }): string   // appends detail=1 last
  export const assetOperationSearchDetailAssetSelect      // { ...assetOperationSearchAssetSelect, departmentId: true, department: { select: { code: true, name: true } },
                                                          //   branch: { select: { name: true } }, currentLocation: { select: { code: true, name: true, branch: { select: { name: true } } } } }
  export type AssetOperationSearchDetailAsset = Prisma.AssetGetPayload<{ select: typeof assetOperationSearchDetailAssetSelect }>
  export const assetOperationComponentLinkSelect = { componentAssetId: true, componentAsset: { select: { assetTag: true, name: true } } } satisfies Prisma.AssetComponentSelect
  export type AssetOperationComponentLink = Prisma.AssetComponentGetPayload<{ select: typeof assetOperationComponentLinkSelect }>
  export function buildAssetOperationComponentLinkWhere(parentAssetId: string): Prisma.AssetComponentWhereInput // the sync's filter
  export type AssetOperationChosenComponent = { id: string; assetTag: string; name: string; travels: boolean }
  export type AssetOperationChosenDetail = { ownership: AssetOwnershipType; statusName: string; departmentId: string | null; departmentLabel: string | null; holderLabel: string | null;
    ownerBranchLabel: string; locationBranchLabel: string; components: AssetOperationChosenComponent[] }   // plan 2 adds the outstanding components
  export function buildAssetOperationRowDetail(asset: AssetOperationSearchDetailAsset, links: readonly AssetOperationComponentLink[], handedOverComponentIds: ReadonlySet<string>): AssetOperationChosenDetail
  AssetOperationSearchRow.detail?: AssetOperationChosenDetail // by id with detail=1 only
  ```
  - The names say `Chosen`, not `Row`: `src/lib/asset-operation-picker-rules.ts:75` already exports `type AssetOperationRowDetail` (the picker row's line union, read by `getAssetOperationRowDetail` at `:81`). Import the new types from `@/lib/asset-operation-search-rules` only.
  - `src/lib/asset-operation-search.ts`: `AssetOperationSearchDb` gains `assetComponent: { findMany(args: object): Promise<unknown[]> }`.
  - `src/lib/asset-operation-options.ts`:
    - `export type AssetOperationEmployeeOption = AssetOperationOption & { departmentId: string; departmentLabel: string; branchLabel: string; heldCount: number }`;
    - `AssetOperationMasterOptions.employees: AssetOperationEmployeeOption[]`;
    - `getAssetOperationPreselect(mode: AssetOperationMode, assetId: string | string[] | undefined, options?: { detail?: boolean }): Promise<AssetOperationSearchRow | null>`.
  - The labels: department "code - name" (`departmentLabel`, in both the detail and the employee option, the same as the department picker); holder "code - fullNameTh"; branches by name only. `statusName` is `asset.status.name`, the English name `getAssetStateTone` reads (`src/lib/design-system.ts:15`); the row's `statusLabel` stays the Thai name.
  - `heldCount`: the employee's active assets, leaving out ส่วนควบ: an asset owned as `component`, and any asset installed in another, whatever its ownership (spec §7.2: a laptop with its adapter and mouse counts once; the sync gives an installed component its parent's holder).
  - For Task 6:
    - a row picked in the picker has no `detail`; the form reads it once with `fetch(buildAssetOperationSearchHref({ mode: "checkout", id: row.id, detail: true }))`, which returns `{ data: AssetOperationSearchAnswer }`, and takes `data.rows[0]?.detail`;
    - the `?assetId=` preselect arrives with `detail` already;
    - the chosen card's `StatusBadge` takes its tone from `getAssetStateTone(row.detail.statusName)` once the detail is there (T6.2), and the component lists are `AssetOperationChosenComponent[]`.

- [ ] **Step 1: Write the failing tests.**
  - In `tests/asset-operation-search-rules.test.ts`:
    - add to the parse test (`:44-56`):
      `assert.equal(input("mode=checkout&id=asset-1&detail=1").detail, true)` and `for (const q of ["mode=checkout&id=asset-1", "mode=checkout&id=asset-1&detail=true", "mode=checkout&q=ab&detail=1"]) assert.equal("detail" in input(q), false, q)`;
    - add to the href test (`:67-72`): the href `{ mode: "checkout", id: "asset-1", detail: true }` equals `"/api/asset-operations/search?mode=checkout&id=asset-1&detail=1"`, its parse equals `{ mode: "checkout", q: "", id: "asset-1", assignCustodian: false, detail: true }`, and `detail: false` adds nothing;
    - add this test (import `buildAssetOperationComponentLinkWhere`, `buildAssetOperationRowDetail`, `type AssetOperationChosenDetail` and `type AssetOperationSearchDetailAsset`):
```ts
test("the chosen asset's detail: ownership, the status's English name, department and holder as 'code - name' (null when none), both branches, each installed component once by tag with whether it travels (group 3 plan 1 Task 4, spec §7.1)", () => {
  const chosen: AssetOperationSearchDetailAsset = { ...held, ownershipType: "stock", departmentId: "dep-acc", department: { code: "ACC", name: "บัญชี" },
    branch: { name: "สำนักงานใหญ่" }, currentLocation: { code: "RY-01", name: "ห้องบัญชี", branch: { name: "สาขาระยอง" } } }
  const link = (id: string, assetTag: string, name: string) => ({ componentAssetId: id, componentAsset: { assetTag, name } })
  const links = [link("c-2", "NB-0017-02", "Mouse ไร้สาย"), link("c-1", "NB-0017-01", "Adapter 65W"), link("c-2", "NB-0017-02", "Mouse ไร้สาย")]
  const expected: AssetOperationChosenDetail = {
    ownership: "stock", statusName: "In Use", departmentId: "dep-acc", departmentLabel: "ACC - บัญชี", holderLabel: "EMP-0412 - สมชาย ใจดี",
    ownerBranchLabel: "สำนักงานใหญ่", locationBranchLabel: "สาขาระยอง",
    components: [{ id: "c-1", assetTag: "NB-0017-01", name: "Adapter 65W", travels: true }, { id: "c-2", assetTag: "NB-0017-02", name: "Mouse ไร้สาย", travels: false }],
  }
  assert.deepEqual(buildAssetOperationRowDetail(chosen, links, new Set(["c-2"])), expected)   // the file's `held` fixture has status { name: "In Use", nameTh: "ใช้งานอยู่" }
  const bare = buildAssetOperationRowDetail({ ...chosen, ownershipType: "bogus", departmentId: null, department: null, custodianId: null, custodian: null }, [], new Set())
  assert.deepEqual([bare.ownership, bare.departmentId, bare.departmentLabel, bare.holderLabel, bare.components], ["personal", null, null, null, []])
  // The same links the sync moves with the parent (asset-component-sync.ts:115-122).
  assert.deepEqual(buildAssetOperationComponentLinkWhere("asset-1"), { parentAssetId: "asset-1", status: "installed", removedAt: null, componentAsset: { isActive: true } })
  const sync = readFileSync("src/lib/asset-component-sync.ts", "utf8")
  for (const part of ['status: "installed"', "removedAt: null", "componentAsset: { isActive: true }"]) assert.ok(sync.includes(part), part)
})
```
  - In `tests/asset-operation-search.test.ts`:
    - import `assetOperationSearchAssetSelect`, `assetOperationSearchDetailAssetSelect`, `type AssetOperationComponentLink` and `type AssetOperationSearchDetailAsset`;
    - add `detailAsset(tag, overrides)`: `asset(tag)` plus `departmentId: null, department: null, branch: { name: "สำนักงานใหญ่" }, currentLocation: { code: "IT-2", name: "ห้อง IT ชั้น 2", branch: { name: "สำนักงานใหญ่" } }`, then the overrides;
    - add `link(id, assetTag, name): AssetOperationComponentLink`;
    - give `fakeDb` a `links?: AssetOperationComponentLink[]` input and `assetComponent: { async findMany(args: Args) { calls.push({ call: "assetComponent.findMany", args }); return data.links ?? [] } }`;
    - add:
```ts
test("by id with detail=1: the detail select, one read of the installed links and one of their open handovers; a component with its own handover stays behind (group 3 plan 1 Task 4, P1-R5)", async () => {
  const notebook = detailAsset("NB-0017", { id: "asset-1", custodianId: "emp-1", custodian: somchai, departmentId: "dep-acc", department: { code: "ACC", name: "บัญชี" },
    currentLocation: { code: "RY-01", name: "ห้องบัญชี", branch: { name: "สาขาระยอง" } } })
  const { db, calls } = fakeDb({ contains: [notebook], links: [link("c-1", "NB-0017-01", "Adapter 65W"), link("c-2", "NB-0017-02", "Mouse ไร้สาย")], checkouts: [checkout({ id: "co-9", assetId: "c-2" })] })
  const [row] = (await searchAssetOperationOptions(db, input("mode=checkout&id=asset-1&detail=1"))).rows
  assert.deepEqual(row.detail, {
    ownership: "personal", statusName: "Ready", departmentId: "dep-acc", departmentLabel: "ACC - บัญชี", holderLabel: "EMP-0412 - สมชาย ใจดี", ownerBranchLabel: "สำนักงานใหญ่", locationBranchLabel: "สาขาระยอง",
    components: [{ id: "c-1", assetTag: "NB-0017-01", name: "Adapter 65W", travels: true }, { id: "c-2", assetTag: "NB-0017-02", name: "Mouse ไร้สาย", travels: false }],
  })
  assert.deepEqual(calls.filter((call) => call.call === "asset.findMany").map((call) => call.args.select), [assetOperationSearchDetailAssetSelect])
  assert.deepEqual(calls.filter((call) => call.call === "assetComponent.findMany").map((call) => call.args.where), [{ parentAssetId: "asset-1", status: "installed", removedAt: null, componentAsset: { isActive: true } }])
  assert.deepEqual(calls.filter((call) => call.call === "assetCheckout.findMany").map((call) => call.args.where.assetId?.in).sort(), [["asset-1"], ["c-1", "c-2"]])
})

test("without detail=1 the by-id read keeps the list select and reads nothing more; a parent without components reads no component handovers (P1-R5)", async () => {
  const plain = fakeDb({ contains: [detailAsset("NB-0017", { id: "asset-1" })], links: [link("c-1", "NB-0017-01", "Adapter 65W")] })
  const [row] = (await searchAssetOperationOptions(plain.db, input("mode=checkout&id=asset-1"))).rows
  assert.equal("detail" in row, false)
  assert.deepEqual(plain.calls.filter((call) => call.call === "asset.findMany").map((call) => call.args.select), [assetOperationSearchAssetSelect])
  assert.equal(plain.calls.some((call) => call.call === "assetComponent.findMany"), false)
  const bare = fakeDb({ contains: [detailAsset("CCTV-0001", { id: "asset-2", ownershipType: "shared" })] })
  const [shared] = (await searchAssetOperationOptions(bare.db, input("mode=checkout&id=asset-2&detail=1"))).rows
  assert.deepEqual([shared.detail?.ownership, shared.detail?.departmentLabel, shared.detail?.holderLabel, shared.detail?.components], ["shared", null, null, []])
  assert.equal(bare.calls.filter((call) => call.call === "assetCheckout.findMany").length, 1, "only the asset's own handover read")
})
```
  - In `tests/asset-operation-master-options.test.ts`:
    - the `@/lib/db` mock records each call's argument in a new `state.args[name + "." + method]`;
    - the `employee` fixture becomes two rows: `e1` with `departmentId: "d2", department: { code: "ACC", name: "บัญชี" }, branch: { name: "สำนักงานใหญ่" }`, and `e2` "E002 - สมหญิง รักงาน" with `departmentId: "d1", department: { code: "IT", name: "ไอที" }, branch: { name: "สาขาระยอง" }`;
    - add the fixture `asset: [{ custodianId: "e1", _count: { _all: 2 } }]`;
    - rename the first test to "the master lists read no asset row, handover or repair: each employee carries its department, branch and held count from one groupBy that leaves out ส่วนควบ, both an asset owned as ส่วนควบ and any asset installed in another (group 3 plan 1 Task 4, spec §7.2)", and expect:
      - `employees: [{ id: "e1", label: "E001 - สมชาย ใจดี", departmentId: "d2", departmentLabel: "ACC - บัญชี", branchLabel: "สำนักงานใหญ่", heldCount: 2 }, { id: "e2", label: "E002 - สมหญิง รักงาน", departmentId: "d1", departmentLabel: "IT - ไอที", branchLabel: "สาขาระยอง", heldCount: 0 }]`;
      - the sorted calls with `"asset.groupBy"` first;
      - `state.args["asset.groupBy"]` deep-equal to `{ by: ["custodianId"], where: { isActive: true, custodianId: { not: null }, ownershipType: { not: "component" }, installedInLinks: { none: { status: "installed", removedAt: null } } }, _count: { _all: true } }` (an installed component carries its parent's holder through the sync, whatever its ownership, so it would count twice);
      - `state.args["employee.findMany"].select` deep-equal to `{ id: true, code: true, fullNameTh: true, departmentId: true, department: { select: { code: true, name: true } }, branch: { select: { name: true } } }`.
    - In the preselect test, keep Task 1's inputs, which have no `detail` key, and add `getAssetOperationPreselect("checkout", "a1", { detail: true })`, whose search input is `{ mode: "checkout", q: "", id: "a1", assignCustodian: false, detail: true }`.

- [ ] **Step 2: Run them and see them fail.** Run `node --test tests/asset-operation-search-rules.test.ts tests/asset-operation-search.test.ts tests/asset-operation-master-options.test.ts`. Expected:
  - the first two files fail to load: `does not provide an export named 'buildAssetOperationRowDetail'` and `'assetOperationSearchDetailAssetSelect'`;
  - in the third, the employees `deepEqual` fails because the extra fields are missing.

- [ ] **Step 3: Implement the search.**
  - **Rules:**
    - The parse sets `detail: true` only when `id` is set and `params.get("detail") === "1"`; otherwise the key is absent.
    - `buildAssetOperationRowDetail` returns `AssetOperationChosenDetail`:
      - ownership goes through `normalizeAssetOwnershipType`;
      - `statusName` is `asset.status.name` (the select already reads it);
      - `departmentLabel` and `holderLabel` are `null` when the relation is null; never write `"-"` (LV2);
      - components keep the first link per `componentAssetId`, sorted by `assetTag` ascending, with `travels: !handedOverComponentIds.has(id)`.
  - **`searchAssetOperationOptions`:**
    - the by-id read takes `select: input.detail ? assetOperationSearchDetailAssetSelect : assetOperationSearchAssetSelect` (text searches never take it);
    - when `input.detail` and a row was found:
      - read `db.assetComponent.findMany({ where: buildAssetOperationComponentLinkWhere(asset.id), select: assetOperationComponentLinkSelect })`;
      - only if a component id is found, read `db.assetCheckout.findMany({ where: { assetId: { in: componentIds }, ...openCheckoutWhere }, select: { assetId: true } })`;
      - set `rows[0].detail` before the checkin grouping.
    - Extend the header comment's bound: "with detail=1 (by id only): one read of the parent's installed links and one of their open handovers".

- [ ] **Step 4: Implement the options, the page and the prop.**
  - `getAssetOperationMasterOptions`:
    - reads employees with the select pinned in Step 1;
    - adds to the same `Promise.all`:
      ```ts
      prisma.asset.groupBy({
        by: ["custodianId"],
        // Leaves out ส่วนควบ (spec §7.2): an asset owned as ส่วนควบ, and one installed in another whatever its ownership (it carries its parent's holder).
        where: { isActive: true, custodianId: { not: null }, ownershipType: { not: "component" }, installedInLinks: { none: { status: "installed", removedAt: null } } },
        _count: { _all: true },
      })
      ```
    - sets `heldCount` from `_count._all`, or 0 when the employee has no group;
    - labels as in Produces.
  - `getAssetOperationPreselect` passes `...(options?.detail ? { detail: true as const } : {})`.
  - In `checkout/page.tsx:17`, the call becomes `getAssetOperationPreselect("checkout", filters.assetId, { detail: true })`.
  - In `checkout-form.tsx`, add `import type { AssetOperationEmployeeOption } from "@/lib/asset-operation-options"` and change the prop to `employees: AssetOperationEmployeeOption[]`. If `tsc` rejects the union in `destinationOptions`, type it `const destinationOptions: Option[]`.
  - checkin and transfer keep `Option[]`; they take the wider array as it is.

- [ ] **Step 5: Rewrite the pin.** In `tests/asset-operation-picker-forms.test.ts:30-35`, loop over `[["checkout", 'getAssetOperationPreselect("checkout", filters.assetId, { detail: true })'], ["transfer", 'getAssetOperationPreselect("transfer", filters.assetId)']]` and look up each call text in place of the template at `:33`. The other checks stay.

- [ ] **Step 6: Run the tests and see them pass.** Run `node --test tests/asset-operation-search-rules.test.ts tests/asset-operation-search.test.ts tests/asset-operation-master-options.test.ts tests/asset-operation-picker-forms.test.ts tests/checkin-page-data.test.ts`. Expected: all pass.

- [ ] **Step 7: Run the repo checks.** Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: no failures and 0 lint errors. If a pin outside the list above fails, rewrite it in this commit and name it in the report.

- [ ] **Step 8: Commit.**
```
git add src/lib/asset-operation-search-rules.ts src/lib/asset-operation-search.ts src/lib/asset-operation-options.ts "src/app/[locale]/(dashboard)/asset-management/checkout/page.tsx" src/components/asset-operations/checkout-form.tsx tests/asset-operation-search-rules.test.ts tests/asset-operation-search.test.ts tests/asset-operation-master-options.test.ts tests/asset-operation-picker-forms.test.ts
git commit -m "feat(asset-operations): the checkout page's data: the by-id search with detail=1 answers the asset's status name, department, holder, branches and the components that travel, and each employee carries department, branch and held count without ส่วนควบ (group 3 plan 1 Task 4, spec §7.1-§7.3, P1-R5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### Open issues (Task 4)
1. **`detail` is `detail?: true` on the input, not a boolean.** This follows the row's `legacy?: true` / `openRepair?: true`, so `checkin-page-data.ts` and the deep-equal pins on the parse and the preselect inputs stay unchanged. The skeleton did not fix this shape.
2. **Components are sorted by tag in the pure builder, not by a relation `orderBy`.** The repo has no relation `orderBy` on `assetComponent` yet. Sorting in the builder keeps the order pinned by the unit test.
3. **The held count follows the employee page's `isActive: true`.** A written-off asset that is still active with a holder would count. The disposal service (`src/lib/disposal-execution-service.ts`) has no `custodianId` line, so I could not confirm that a write-off clears the holder; check with a dev SELECT if it matters.
4. **Plan 2's outstanding links and the held count.** The held count leaves out only links with status `"installed"`. A plan 2 outstanding link (spec §8.5, status `"outstanding"`, holder = ผู้คืน) is therefore counted in ผู้คืน's N unless the component is owned as ส่วนควบ. Spec §8.5 counts it as held for the responsibility rule; plan 2 decides whether the hint's N follows.

---

### Task 5: The shared frame, summary card and condition chips of the single-asset pages (spec §5)

ส่งมอบ, รับคืน and โอนย้าย share three parts (spec §5, §14 call 2): a frame (PageHeader, main panel, summary column, sticky footer), the "สรุปก่อนบันทึก" card and the condition chips. This task also adds the ยกเลิก target and the words. No page uses the parts yet: Task 6 is the first.

**Files:**
- Create: `src/components/asset-operations/operation-summary-card.tsx`, `src/components/asset-operations/operation-form-frame.tsx`, `src/components/asset-operations/condition-choice.tsx` (none has a `"use client"` directive, like `Segmented` and `Steps`; only client forms render them)
- Modify: `src/lib/asset-return-navigation.ts` (one export after `:23`); `tests/form-migration-guards.test.ts:56-60` (`STICKY_FOOTER_ROUTES`) and `:89` (`CONSTRAINT_FLOORS`); `messages/th.json` and `messages/en.json`, only through `node scripts/messages-edit.mjs`
- Modify: `DESIGN.md` (a new bullet after `:548`, where the `SignaturePad` bullet ends, before `### Forms: Errors Under the Field`) and `docs/14_UI_UX_DESIGN_SYSTEM.md` (a new row after `:103`, `| A numbered form section |`)
- Test: create `tests/operation-form-parts-ui.test.ts`; add one test to `tests/asset-return-navigation.test.ts` (its import at `:5` gains `getOperationCancelHref`)
- Pins this task breaks: none outside the two guard lists above. GL1 (`form-migration-guards.test.ts:457-471`) needs a row for every file that renders `<StickyFormFooter>`, which is now the frame. GF5 (`:284-298`) needs a floor for every file whose `ChoiceChip` carries `required`. Unchanged: `asset-component-manager.test.ts:6-10`, `e2e-cross-cutting.test.ts:258` (they pin other lines of `asset-return-navigation.ts`), `v-track-final.test.ts:123-126`, `desktop-selection-bar.test.ts:44` and `asset-operation-picker-ui.test.ts` (the DESIGN.md and docs/14 slices they read still hold). `validation-guards.test.ts` V1 is unchanged too, because the frame has no `<form>`. LN2 `UI_NAME` (`list-frame-guards.test.ts:67`) lists only `components/ui` parts, and `SignaturePad` (the `asset-operations` precedent) is not in it, so it stays as it is.

**Interfaces:**
- Consumes:
  - `StickyFormFooter({ status, className, children, ...props })` (`src/components/ui/sticky-form-footer.tsx:18`)
  - `PageHeader({ title, meta, actions, back, breadcrumbs, compactOnMobile, className })` (`src/components/ui/page-header.tsx:29`). It has no `description` prop, so the subtitle goes in `meta`.
  - `Button` (`busy`, plus the rest of the button props, `form` included) and `buttonVariants` (`src/components/ui/button.tsx:32,66`); `Link` (`next/link`); `getPanelClasses()` (`src/lib/design-system.ts:26`); `Notice({ tone, … })` (`src/components/ui/notice.tsx:30`); `ChoiceChip` (`src/components/ui/choice-card.tsx:86`)
  - `FieldGroup({ legend, required, hint, error, id, className, children })` (`src/components/ui/field-group.tsx:21`): `id` goes on the fieldset, which `focusFirst` reaches, and the error is `<id>-error`
  - `normalizeAssetReturnTo(locale, value)` (`src/lib/asset-return-navigation.ts:3`), whose fallback is `/${locale}/assets`. The pattern to follow: `audit-round-form.tsx:348` (the grid), `:487` (the sticky summary), `:561-577` (the footer: outline Link, then submit).
- Produces:
  ```ts
  // operation-summary-card.tsx: useTranslations("assetOperation") only for the two hidden checklist words
  export type OperationSummaryRow = { key: string; label: string; now: ReactNode; next: ReactNode; changed: boolean }
  export type OperationSummaryCheck = { key: string; label: string; done: boolean; note?: string }
  export type OperationSummaryCardProps = { title: string; nowLabel: string; nextLabel: string; rows: OperationSummaryRow[]; checklist?: OperationSummaryCheck[]; warnings?: ReactNode[]; footnote?: ReactNode }
  export function OperationSummaryCard({ title, nowLabel, nextLabel, rows, checklist = [], warnings = [], footnote }: OperationSummaryCardProps)
  // operation-form-frame.tsx: no hooks
  export type OperationFormFooter = { description: ReactNode; cancelHref: string; cancelLabel: string; submitLabel: string; busy: boolean; formId: string }
  export type OperationFormFrameProps = { title: string; description: ReactNode; summary: ReactNode; footer: OperationFormFooter; children: ReactNode }
  export function OperationFormFrame({ title, description, summary, footer, children }: OperationFormFrameProps)
  // condition-choice.tsx
  export type AssetConditionChoiceProps = { id: string; legend: ReactNode; options: readonly { id: string; label: string }[]; value: string; onChange: (conditionId: string) => void; error: ReactNode; required: boolean; disabled?: boolean }
  export function AssetConditionChoice({ id, legend, options, value, onChange, error, required, disabled = false }: AssetConditionChoiceProps)
  // asset-return-navigation.ts
  export function getOperationCancelHref(locale: string, returnTo: string | undefined): string
  ```
  - **Usage contract for Tasks 6-7 and plans 2-3:**
    - The form wraps the frame. The page renders `<form onSubmit={handleSubmit} noValidate id={formId}>` around `<OperationFormFrame …>`, with `onSubmit` first: v-track2-o's `assertOperationForm` (`tests/v-track2-o.test.ts:85`) requires the tag to start `<form onSubmit={handleSubmit} noValidate`, and V2 (`validation-guards.test.ts:191`) wants `noValidate` right after `onSubmit`. The frame's children are the page's `FormSection`s, which the main panel lays out with `gap-8`. The frame's `StickyFormFooter` is therefore inside the form, after every field, so `type="submit"`, Enter and the busy guard keep working (DESIGN.md `StickyFormFooter`: the bar is the form's last child). On ส่งมอบ, Task 7's phone bar follows `</OperationFormFrame>` and is then the form's last child. V1/V2 keep reading the form in the page's own file. The frame's submit keeps `form={formId}` as well; inside the form it is redundant and harmless.
    - `summary` is an `<OperationSummaryCard>` passed directly: in this task the card itself is the grid's second column.
    - Task 7 changes the frame and rewrites this task's frame test: it destructures `phoneSteps = false` before `children` (on `<OperationFormFrame` the prop goes after `description=`), wraps `{summary}` in `<div className={cn("min-w-0", phoneSteps && "max-lg:hidden")}>`, and gives the bar `className={cn("lg:col-span-2", phoneSteps && "max-lg:hidden")}`. Task 5 builds none of this.
    - Routes: GL1 keys `STICKY_FOOTER_ROUTES` by the file that renders `<StickyFormFooter>`, which is the frame, so this task adds the frame's row with `/th/asset-management/checkout`. Task 6 changes no route; Task 7 adds a `checkout-form.tsx` row for the phone bar it renders; plans 2-3 add their routes to the frame's row.
    - The words come from the page: `title={t("summaryTitle")}`, `nowLabel={t("summaryNow")}`, `nextLabel={t("summaryNext")}`, `submitLabel={t("reviewAndSave")}`, `cancelLabel={tCommon("cancel")}` (all from `assetOperation` except the last; the last three are fields of `footer`); `footer.cancelHref` is `getOperationCancelHref(locale, returnTo)`, which Task 6 holds in `const cancelHref` at the top of its component.
  - **DOM hooks:** `[data-slot="operation-form-frame"]` (the root) and `[data-slot="operation-form-main"]` (the main panel), for Task 7 to hide parts below the breakpoint. `[data-slot="operation-summary-card"]` holds `[data-summary-row="<key>"]` rows (`data-changed` set when the value changes) and `[data-summary-check="<key>"]` items (`data-done` set when done). The condition group is `fieldset#<id>`, with radios `name="<id>"` whose value is the condition id; its error is `#<id>-error`.
  - Message keys (Step 4): `assetOperation.reviewAndSave`, `summaryTitle`, `summaryNow`, `summaryNext`, `summaryCheckDone`, `summaryCheckMissing`. The last two go beyond the skeleton's four, so the checklist state does not rest on its icon alone.

- [ ] **Step 1: Write the failing tests.** Create `tests/operation-form-parts-ui.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 3 plan 1 Task 5 (spec §5, P1-R3, P1-R7): the shared parts of ส่งมอบ, รับคืน and โอนย้าย. node --test cannot load .tsx, so these read the source.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const DIR = "src/components/asset-operations/"
const RAW = /\bdark:|#[0-9a-fA-F]{3,8}\b|\brgba?\(|\b(?:bg|text|border|ring)-[a-z-]+\/\d+|\bopacity-|<button\b|<input\b|<table\b|<form\b|"use client"/

test("OperationSummaryCard: ตอนนี้ then หลังบันทึก per row, the new value semibold only when it changes, the checklist, warnings, sticky from lg", () => {
  const source = read(`${DIR}operation-summary-card.tsx`)
  assert.match(source, /^export function OperationSummaryCard\(\{ title, nowLabel, nextLabel, rows, checklist = \[\], warnings = \[\], footnote \}: OperationSummaryCardProps\) \{$/m)
  for (const part of [
    "export type OperationSummaryRow = { key: string; label: string; now: ReactNode; next: ReactNode; changed: boolean }",
    "export type OperationSummaryCheck = { key: string; label: string; done: boolean; note?: string }",
    'data-slot="operation-summary-card"', '"grid content-start gap-4 p-4 sm:p-5 lg:sticky lg:top-4 lg:self-start"',
    '<h2 className="text-base font-semibold text-foreground">{title}</h2>',
    "data-summary-row={row.key}", "data-changed={row.changed || undefined}", 'row.changed && "font-semibold"',
    '<span className="sr-only">{nowLabel}: </span>', '<span className="sr-only">{nextLabel}: </span>',
    "data-summary-check={item.key}", "data-done={item.done || undefined}", 't(item.done ? "summaryCheckDone" : "summaryCheckMissing")',
    '<Notice key={index} tone="warning">',
  ]) assert.ok(source.includes(part), part)
  assert.match(source, /<div aria-hidden="true"[^>]*>\s*<span \/>\s*<span>\{nowLabel\}<\/span>\s*<span>\{nextLabel\}<\/span>/, "the column heads are visual only")
  assert.ok(source.indexOf('<div aria-hidden="true"') < source.indexOf("<dl"), "the heads sit outside the <dl> (axe definition-list)")
  assert.doesNotMatch(source, RAW)
})

test("OperationFormFrame: PageHeader with no breadcrumb (P1-R3), the audit-round grid, the summary column, the bar across both with ยกเลิก before the submit bound to formId", () => {
  const source = read(`${DIR}operation-form-frame.tsx`)
  assert.match(source, /^export function OperationFormFrame\(\{ title, description, summary, footer, children \}: OperationFormFrameProps\) \{$/m)
  for (const part of [
    "export type OperationFormFooter = { description: ReactNode; cancelHref: string; cancelLabel: string; submitLabel: string; busy: boolean; formId: string }",
    'data-slot="operation-form-frame"', 'className="mx-auto max-w-6xl"', '<PageHeader title={title} meta={description} className="mb-6" />',
    '"grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"', 'data-slot="operation-form-main"', '"grid min-w-0 content-start gap-8 p-4 sm:p-5"',
    '<StickyFormFooter className="lg:col-span-2" status={footer.description}>',
    '<Link href={footer.cancelHref} className={buttonVariants({ variant: "outline" })}>', '<Button type="submit" form={footer.formId} busy={footer.busy}>',
  ]) assert.ok(source.includes(part), part)
  assert.ok(source.indexOf("{children}") < source.indexOf("{summary}") && source.indexOf("{summary}") < source.indexOf("<StickyFormFooter"), "main, summary, then the bar")
  assert.doesNotMatch(source, /breadcrumbs=/)
  assert.doesNotMatch(source, RAW)
})

test("AssetConditionChoice: one FieldGroup of radio ChoiceChips that wrap; the field id is the group's and its error <id>-error (spec §7.2)", () => {
  const source = read(`${DIR}condition-choice.tsx`)
  assert.match(source, /^export function AssetConditionChoice\(\{ id, legend, options, value, onChange, error, required, disabled = false \}: AssetConditionChoiceProps\) \{$/m)
  for (const part of [
    "<FieldGroup legend={legend} id={id} required={required} error={error}>", '<div className="flex flex-wrap gap-2">', "<ChoiceChip", 'type="radio"',
    "name={id}", "value={option.id}", "checked={value === option.id}", "required={required}", "disabled={disabled}", "onChange={() => onChange(option.id)}",
  ]) assert.ok(source.includes(part), part)
  assert.doesNotMatch(source, /NativeSelect|ChoiceCard\b/)
  assert.doesNotMatch(source, RAW)
})

test("the words: ตรวจสอบและบันทึก (never ตรวจทาน), สรุปก่อนบันทึก, ตอนนี้, หลังบันทึก and the checklist's hidden states; common.save stays (P1-R7)", () => {
  const th = JSON.parse(read("messages/th.json"))
  const en = JSON.parse(read("messages/en.json"))
  const words: Record<string, [string, string]> = {
    reviewAndSave: ["ตรวจสอบและบันทึก", "Review and save"], summaryTitle: ["สรุปก่อนบันทึก", "Summary before saving"],
    summaryNow: ["ตอนนี้", "Now"], summaryNext: ["หลังบันทึก", "After saving"],
    summaryCheckDone: ["ครบแล้ว", "Done"], summaryCheckMissing: ["ยังไม่ครบ", "Not yet"],
  }
  for (const [key, [thai, english]] of Object.entries(words)) {
    assert.equal(th.assetOperation[key], thai, `th ${key}`)
    assert.equal(en.assetOperation[key], english, `en ${key}`)
  }
  assert.equal(th.common.save, "บันทึก")
})

test("DESIGN.md and docs/14 describe the three parts after SignaturePad and FormSection; the page's form wraps the frame, onSubmit first", () => {
  const design = read("DESIGN.md")
  const end = design.indexOf("\n### Forms: Errors Under the Field\n")
  const start = design.indexOf("- **`OperationFormFrame`**")
  assert.ok(start > design.indexOf("- **`SignaturePad`**") && start < end, "a bullet after SignaturePad")
  const block = design.slice(start, end)
  for (const phrase of [
    "`OperationSummaryCard`", "`AssetConditionChoice`", "`src/components/asset-operations/operation-form-frame.tsx`", "ตอนนี้", "หลังบันทึก",
    "`<form onSubmit={handleSubmit} noValidate id={formId}>` wraps it", "`FormSection`s", "`form={formId}`", "`</OperationFormFrame>`", "`STICKY_FOOTER_ROUTES`", "no breadcrumb",
  ]) assert.ok(block.includes(phrase), phrase)
  const index = read("docs/14_UI_UX_DESIGN_SYSTEM.md")
  const row = index.split("\n").find((line) => line.startsWith("| The frame of ส่งมอบ, รับคืน and โอนย้าย | `OperationFormFrame`"))
  assert.ok(row && index.indexOf(row) > index.indexOf("\n| A numbered form section |"), "a row after FormSection")
  assert.ok(row?.includes("the page's `<form onSubmit={handleSubmit} noValidate id={formId}>` wraps the frame"), "the form wraps the frame")
})
```

Add to `tests/asset-return-navigation.test.ts`, with `getOperationCancelHref` added to the import at `:5`:

```ts
test("ยกเลิก on the transaction pages goes to the normalized returnTo, else the register (group 3 spec §5)", () => {
  assert.equal(getOperationCancelHref("th", undefined), "/th/assets")
  assert.equal(getOperationCancelHref("th", ""), "/th/assets")
  assert.equal(getOperationCancelHref("th", "/th/assets/a-1?view=custody"), "/th/assets/a-1?view=custody")
  assert.equal(getOperationCancelHref("th", "/th/assets?search=nb&page=2"), "/th/assets?search=nb&page=2")
  assert.equal(getOperationCancelHref("th", "/th/asset-management/scan"), "/th/asset-management/scan")
  assert.equal(getOperationCancelHref("th", "/th/assets/a-1/edit"), "/th/assets")
  assert.equal(getOperationCancelHref("en", "https://evil.example/en/assets/a-1"), "/en/assets")
})
```

- [ ] **Step 2: Run them to see them fail.** Run: `node --test tests/operation-form-parts-ui.test.ts tests/asset-return-navigation.test.ts`. Expected: the parts file fails with `ENOENT` for the three `.tsx` files and on the missing words, DESIGN.md bullet and docs/14 row. The navigation file fails with `SyntaxError: The requested module '../src/lib/asset-return-navigation.ts' does not provide an export named 'getOperationCancelHref'`.

- [ ] **Step 3: Write the code** with the Produces signatures. The pins fix the decisions, and the bodies follow `audit-round-form.tsx:348-577`. What the pins leave open:
  - The `RAW` pin reads comments too: write no `<form`, `"use client"` or color value in the three files, not even in a comment.
  - `getOperationCancelHref` returns `normalizeAssetReturnTo(locale, returnTo)`. The pages already pass a normalized `returnTo`, and normalizing it again gives the same value.
  - **Summary card:**
    - One class string, `"grid grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2"`, serves the heads row and every `<dl>` row. `<dt className="text-muted-foreground">`; each `<dd>` is `min-w-0 break-words text-foreground`, and an unchanged row stays at normal weight.
    - The checklist is a `<ul>`. Each item shows a lucide `CheckCircle2` (`text-success`) or `Circle` (`text-faint-foreground`), both `aria-hidden` and `size-4`, then the hidden state word, the label and the `note` (`text-muted-foreground`).
    - Then the warnings, then the footnote as `<p className="text-meta text-muted-foreground">`. An empty list renders nothing.
  - **Condition chips:** each `ChoiceChip` has `key={option.id}` and `label={option.label}`, in the caller's order (the master `sortOrder`). `value=""` means no chip is chosen.

- [ ] **Step 4: Add the words.** Write `C:/Users/Eltross/AppData/Local/Temp/claude/D--Antigravity-asset-system/f250ea8d-3040-422b-ad7a-15dd9aed94b9/scratchpad/tx-group/plan1/t5-messages.json` as `{ "set": { "th": { "assetOperation.reviewAndSave": "ตรวจสอบและบันทึก", … }, "en": { "assetOperation.reviewAndSave": "Review and save", … } } }`, with the six keys and values of the words test in Step 1. Run `node scripts/messages-edit.mjs <that file>`. Expected: `messages updated: 6 th, 6 en, 0 deleted`. Then run `node --test tests/thai-glossary.test.ts tests/messages-parity.test.ts`. Expected: PASS.

- [ ] **Step 5: Register the parts.**
  - `tests/form-migration-guards.test.ts`, one row in each list:
    ```ts
    // STICKY_FOOTER_ROUTES, after the audit-round row (:59):
      // Group 3 plan 1: the frame of ส่งมอบ, รับคืน and โอนย้าย; plans 2 and 3 add /th/asset-management/checkin and /transfer when their forms move onto it.
      [`${C}asset-operations/operation-form-frame.tsx`]: ["/th/asset-management/checkout"],
    // CONSTRAINT_FLOORS, after the bulk-move-form row (:89):
      // Group 3 plan 1 Task 5: the condition chips pass their caller's required to each radio.
      [`${C}asset-operations/condition-choice.tsx`]: [1, 0, 0],
    ```
  - DESIGN.md, the new bullet after `:548`:
    ```markdown
    - **`OperationFormFrame`**, **`OperationSummaryCard`** and **`AssetConditionChoice`** (`src/components/asset-operations/operation-form-frame.tsx`, `operation-summary-card.tsx`, `condition-choice.tsx`; group 3 spec §5): the frame of ส่งมอบ, รับคืน and โอนย้าย.
      - The frame: `PageHeader` with the subtitle in `meta` and no breadcrumb, the main panel and the summary in the grid of `audit-round-form.tsx` (`lg:grid-cols-[minmax(0,1fr)_20rem]`), and a `StickyFormFooter` across both: the one-line description, ยกเลิก (a link) and the "ตรวจสอบและบันทึก" submit, which also carries `form={formId}`. It renders no `<form>`: the page's `<form onSubmit={handleSubmit} noValidate id={formId}>` wraps it (`onSubmit` first, then `noValidate`, as the form checks read it), and the page's `FormSection`s are its children. The bar is therefore inside the form, after every field, and is the form's last child; a page's own phone bar, where it has one, follows `</OperationFormFrame>` and is then the last child. Its row in `STICKY_FOOTER_ROUTES` lists the pages that use it.
      - The summary card "สรุปก่อนบันทึก": one row per field the save writes, ตอนนี้ then หลังบันทึก; a value that changes is semibold, one that does not is plain. Each value names its column for a screen reader, and the column heads are visual only. Then the checklist (a check or an empty circle, with a hidden ครบแล้ว or ยังไม่ครบ), the warning `Notice`s and a footnote. It is sticky in its column from `lg`.
      - The condition chips: a `FieldGroup` of radio `ChoiceChip`s that wrap, built from the selectable master conditions in their order. The group's `id` takes focus and its error is `<id>-error`.
    ```
  - docs/14, the new row after `:103`:
    ```markdown
    | The frame of ส่งมอบ, รับคืน and โอนย้าย | `OperationFormFrame` with `OperationSummaryCard` in `summary`; `AssetConditionChoice` for a condition | the page's `<form onSubmit={handleSubmit} noValidate id={formId}>` wraps the frame, whose children are the `FormSection`s, so its save bar stays inside the form; the submit also carries `form={formId}`; the summary shows only what the save writes; the frame's file holds the routes in `STICKY_FOOTER_ROUTES` |
    ```
  - Run: `node --test tests/operation-form-parts-ui.test.ts tests/asset-return-navigation.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/sticky-form-footer-ui.test.ts tests/phase2d-docs.test.ts tests/dark-mode-docs.test.ts tests/v-track-final.test.ts tests/desktop-selection-bar.test.ts tests/asset-component-manager.test.ts tests/e2e-cross-cutting.test.ts`. Expected: PASS.

- [ ] **Step 6: Run the repo checks.** `npm test`: PASS. `npx tsc --noEmit`: 0 errors. `npm run lint`: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/asset-operations/operation-summary-card.tsx src/components/asset-operations/operation-form-frame.tsx src/components/asset-operations/condition-choice.tsx src/lib/asset-return-navigation.ts tests/operation-form-parts-ui.test.ts tests/asset-return-navigation.test.ts tests/form-migration-guards.test.ts DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md messages/th.json messages/en.json
git commit -F - <<'EOF'
feat(asset-operations): the shared frame, the สรุปก่อนบันทึก card and the condition chips of ส่งมอบ, รับคืน and โอนย้าย, the ยกเลิก target and ตรวจสอบและบันทึก (group 3 plan 1 Task 5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

**Open issues (where the skeleton differs from the code):**
1. For Task 6 (GF5): when `checkout-form.tsx` moves onto these parts, its floor `[6, 0, 0]` (`form-migration-guards.test.ts:87`) drops from 6 to 3. The two `Select`s (`checkout-form.tsx:284`, `:374`) and the local `NativeSelect` inside its `Select` helper (`:531`) go; the `ChoiceCard` (`:345`) and the two date `Input`s (`:390`, `:394`) stay. `AssetConditionChoice` is not a `CONSTRAINT_TAGS` name, so the condition's `required` counts in `condition-choice.tsx`'s row, not in checkout's. Task 6 lowers that row in the same commit.

---

### Task 6: ส่งมอบ on the desktop: three sections, the summary card and the footer (spec §7.1-§7.3, §5, Appendix A ส่งมอบ)

The checkout form is rebuilt on Task 5's frame. Its summary reads Task 2's department rule, so the card and the route call the same function. Task 4's `detail` is read once per chosen asset. The phone steps come in Task 7, on the same DOM (P1-R4).

**Files:**
- Create: `src/lib/checkout-form-rules.ts` (pure), `tests/checkout-form-rules.test.ts`
- Modify (rewrite): `src/components/asset-operations/checkout-form.tsx:1-536`. Line numbers are master's; Tasks 1 and 4 edit the file first.
- Modify: `src/components/ui/asset-operation-picker.tsx:34-46` (props) and `:281-290` (the chosen box's text)
- Modify: `messages/th.json`, `messages/en.json`, through `node scripts/messages-edit.mjs` only
- Modify (E2E): `e2e/transactions/handover.spec.ts:8-216` (the import list `:8-24`, then the four tests), `e2e/transactions/tx-support.ts` (one export after `pickedAsset`, `:190-192`), `e2e/transactions/tx-words.ts:4-10`, `e2e/cross-cutting/support/forms.ts:9-12`, `e2e/cross-cutting/field-errors.spec.ts:7,9-10,100-125`
- Test (rewrite pins): `tests/asset-handover-checkout.test.ts:48-57`, `tests/asset-operation-picker-forms.test.ts:47` (on master; Task 1 moves it up), `tests/form-frames-ui.test.ts:94-102`, `tests/operations-sweep-ui.test.ts:76-78`, `tests/v-track2-o.test.ts:100-152`, `tests/form-migration-guards.test.ts:87`, `tests/e2e-cross-cutting.test.ts:216-217`, `tests/e2e-transactions.test.ts:137-161` (TX2; its `support` read is `:154`)

**Interfaces:**
- Consumes:
  - Task 2: `getCheckoutNextDepartmentId({ ownership, checkoutType, currentDepartmentId, employeeDepartmentId, chosenDepartmentId }): string | null` (`src/lib/asset-department-rule.ts`). Its message `apiErrors.checkoutDestinationInactive` reaches the field through `fieldErrors.message` (`use-field-errors.ts:35-43`, which falls back to the api-error catalog), with no form code.
  - Task 4: `AssetOperationSearchRow.detail?: AssetOperationChosenDetail` (its `statusName: string` is the status's English name, for `StatusBadge`'s tone) and `type AssetOperationChosenComponent` (`asset-operation-search-rules.ts`); `buildAssetOperationSearchHref({ mode, q?, id?, assignCustodian?, detail? })`; `type AssetOperationEmployeeOption = AssetOperationOption & { departmentId; departmentLabel; branchLabel; heldCount }` (`asset-operation-options.ts`). The page already passes `getAssetOperationPreselect("checkout", filters.assetId, { detail: true })` and the employee options, so `page.tsx` does not change here.
  - Task 5: `OperationFormFrame({ title, description, summary, footer: { description, cancelHref, cancelLabel, submitLabel, busy, formId }, children })`; `OperationSummaryCard({ title, nowLabel, nextLabel, rows, checklist?, warnings?, footnote? })`, whose root is `[data-slot="operation-summary-card"]` (Task 8 reads it; this task adds no `data-slot` of its own); `AssetConditionChoice({ id, legend, options, value, onChange, error, required, disabled? })`; `getOperationCancelHref(locale, returnTo)`; the keys `assetOperation.reviewAndSave`, `summaryTitle`, `summaryNow` and `summaryNext`. The usage contract: the page's `<form onSubmit={handleSubmit} noValidate id={formId}>` wraps `<OperationFormFrame>`, so the frame's `StickyFormFooter` is inside the form, as its last child; the frame's submit also carries `form={formId}`.
  - Master: `Segmented` (`src/components/ui/segmented.tsx:38`: role group of `aria-pressed` buttons, no `id` prop), `FieldGroup` (`field-group.tsx:21`), `FormSection` (`form-section.tsx:22`, no `data-*` passthrough), `StatusBadge` (`status-badge.tsx:9`), `getAssetStateTone(value?: string | null)` (`src/lib/design-system.ts:15`: muted when empty), `SearchableSelect`'s `hint` (rendered as `#<id>-hint`), `Notice`.
- Produces:
  - `src/lib/checkout-form-rules.ts`. Values are imported only from `./asset-department-rule.ts`; everything else is `import type`, with relative `.ts` paths.
    ```ts
    export type CheckoutDestinationType = "user" | "department" | "location"
    export type CheckoutPhoneStep = 1 | 2 | 3   // the only export of this type: Task 7's checkout-phone-steps.ts imports it with `import type`
    export type CheckoutChoice = { asset: AssetOperationSearchRow | null; checkoutType: CheckoutDestinationType; handoverMode: "" | AssetHandoverMode
      employee: AssetOperationEmployeeOption | null; department: AssetOperationOption | null; location: AssetOperationOption | null }
    export type CheckoutSummaryWords = { holder: string; department: string; location: string; status: string; components: string; none: string
      notChosen: string; inUse: string; checkedOut: string; kept: (value: string) => string; count: (count: number) => string; componentsGo: (count: number) => string }
    export type CheckoutSummaryRow = { key: "holder" | "department" | "location" | "status" | "components"; label: string; now: string; next: string; changed: boolean }
    export type CheckoutCheckWords = { asset: string; receiver: string; mode: string; signature: string; signatureMissing: string }
    export type CheckoutCheck = { key: "asset" | "receiver" | "mode" | "signature"; label: string; done: boolean; note?: string }
    export function checkoutConditionDefault(row: Pick<AssetOperationSearchRow, "conditionId"> | null, conditions: readonly { id: string }[]): string
    export function withCheckoutAssetDetail(current: AssetOperationSearchRow | null, answered: AssetOperationSearchRow | null): AssetOperationSearchRow | null
    export function checkoutComponents(row: AssetOperationSearchRow | null): { travelling: AssetOperationChosenComponent[]; staying: AssetOperationChosenComponent[] }
    export function checkoutReceiverLabel(choice: CheckoutChoice): string | null
    export function buildCheckoutSummaryRows(choice: CheckoutChoice, words: CheckoutSummaryWords): CheckoutSummaryRow[]
    export function buildCheckoutChecklist(choice: CheckoutChoice & { signed: boolean }, words: CheckoutCheckWords): CheckoutCheck[]
    ```
    `CheckoutSummaryRow` and `CheckoutCheck` can be assigned to Task 5's `OperationSummaryRow` and `OperationSummaryCheck`.
  - A new picker prop: `pickedBody?: (row: AssetOperationSearchRow) => React.ReactNode`. It replaces the text of the chosen box (today's tag · name and row line, `:281-290`); `data-asset-picked` and เปลี่ยน stay.
  - Phone hooks for Task 7 (P1-R4):
    - `const [step] = useState<CheckoutPhoneStep>(1)` with `data-step={step}` on the `<form>`. Task 7 adds the setter.
    - `data-checkout-part` = `"asset"` (section 1's wrapper), `"receiver"` (section 2's), `"evidence"` (section 3's), `"photo"` (the photo Field's wrapper) and `"signature"` (the pad's wrapper). Step 1 pins them; Task 7 adds `className={checkoutPhonePartClass(part, step)}` beside each and keeps the attributes.
    - Two named values at the top of the component: `const cancelHref = getOperationCancelHref(locale, returnTo)` and `const receiverLabel = checkoutReceiverLabel(choice)`. Task 7 reads both.

Decisions:
- **Summary rows** (`buildCheckoutSummaryRows`, spec §7.3), in this order. With no asset or no `asset.detail` it returns `[]`.
  - **ผู้ถือครอง:** now = `holderLabel ?? none`.
    - Type `user`: next is the employee's label, or `notChosen` until one is chosen; `changed` when that label differs from `holderLabel`.
    - Department or location: next is `kept(holderLabel)`, or `none` with no holder; never `changed`.
  - **แผนก:** now = `departmentLabel ?? none`. Next is the label of `getCheckoutNextDepartmentId(...)`'s answer:
    - unchanged → the now text; the employee's department → `employee.departmentLabel`; the chosen department → its option label.
    - `notChosen` only while the answer still waits on a choice: ownership is not `shared`, and type `user`/`department` has no destination yet.
    - `changed` when the id differs from `detail.departmentId`, so a `shared` asset never changes (P1-R2).
  - **ที่ตั้ง:** type `location` only. Now = `locationLabel`; next is the chosen label, or `notChosen`.
  - **สถานะ:** now = `statusLabel`. Next is `inUse` for permanent, `checkedOut` for a loan, `notChosen` with no mode.
  - **ส่วนควบ:** only when `detail.components` is not empty. Now = `count(all)`, next = `componentsGo(travelling)`; `changed` when any travels.
- **Checklist:** asset is `asset?.eligible === true`; receiver is `checkoutReceiverLabel` not null; mode is `handoverMode !== ""`; signature is `signed`, with note `signatureMissing` while missing.
- **The choice and the named values,** at the top of the component, after the state:
  - `selectedEmployee`, `selectedDepartment` and `selectedLocation` are the props' options whose id is `values.custodianId`, `values.departmentId` and `values.locationId`, else `null`.
  - `const choice: CheckoutChoice = { asset: values.asset, checkoutType: values.checkoutType, handoverMode: values.handoverMode, employee: selectedEmployee, department: selectedDepartment, location: selectedLocation }`.
  - `const cancelHref = getOperationCancelHref(locale, returnTo)` and `const receiverLabel = checkoutReceiverLabel(choice)`.
  - `summaryRows` is `buildCheckoutSummaryRows(choice, …)` with the Step 5 words, and `checklist` is `buildCheckoutChecklist({ ...choice, signed: receiverSignatureDataUrl !== null }, …)`.
- **Picking an asset:**
  - `setAsset(row)` sets `asset` and `conditionBefore: checkoutConditionDefault(row, conditions)` (spec §7.2) and clears `"assetId"` and `"conditionBefore"`. When `row` has no `detail`, it calls `void loadAssetDetail(row.id)`.
  - `loadAssetDetail` fetches `buildAssetOperationSearchHref({ mode: "checkout", id: assetId, detail: true })`, then `setValues((current) => ({ ...current, asset: withCheckoutAssetDetail(current.asset, answered) }))`.
  - `withCheckoutAssetDetail` takes the whole answered row only when its `id` matches, so a verdict that changed since the pick shows. A failed read keeps the row: the card shows `locationLabel` alone, and the summary only its checklist.
  - The initial `conditionBefore` is `checkoutConditionDefault(initialAsset, conditions)`.
- **Layout:** `<form onSubmit={handleSubmit} noValidate id={CHECKOUT_FORM_ID} data-step={step}>` (`const CHECKOUT_FORM_ID = "checkout-form"`; onSubmit first, for V2 and v-track2-o's `assertOperationForm`) wraps `<OperationFormFrame title={t("title")} description={t("description")} summary={…} footer={…}>`. The frame's children are the three FormSections, each inside its `data-checkout-part` wrapper; the frame's main panel lays them out with `gap-8`, so the form takes no `className`. The frame's `StickyFormFooter` is thus inside the form, as its last child (DESIGN.md `StickyFormFooter`; Task 5's usage contract). `OperationReviewDialog` follows `</form>` in a fragment, unchanged.
  - **Section 1:** `<FormSection number={1} title={t("sectionAsset")}>`, holding:
    - the banner, without its wrapper div;
    - the picker as master's `:275-283`, plus a last prop `pickedBody={(row) => <CheckoutAssetCard row={row} />}`. The card is a local component: the tag, `<StatusBadge label={row.statusLabel} tone={getAssetStateTone(row.detail?.statusName)} />` (muted until the detail arrives), the name, and the line `row.detail ? t("assetWhere", { location: row.locationLabel, branch: row.detail.locationBranchLabel, holder: row.detail.holderLabel ?? t("noHolder") }) : row.locationLabel`;
    - when any travel: `t("componentsTravel", { count })`, a `<ul>` of `tag name`, and `t("componentsTravelNote")`;
    - when any stay: `<Notice tone="info">{t("componentsStaying", { count, list })}`, with the tags joined by `", "`.
  - **Section 2:** `<FormSection number={2} title={t("sectionReceiver")}>`, laid out as `grid gap-4 md:grid-cols-2`, in this order:
    1. `<FieldGroup legend={t("checkoutTo")} id="checkout-type" required error={errorText("checkoutType")}>` around `<Segmented aria-label={t("checkoutTo")} showCheck>`, with options `toUser`/`toDepartment`/`toLocation`. P1-R8 as corrected: `Segmented` is a group of `aria-pressed` buttons with no `id`, so the id is the FieldGroup's, and E2E presses `getByRole("button", { name: "แผนก" })`. Its `onValueChange` is master's `:290-302` minus `parentAsset`.
    2. `#checkout-destination`, today's `SearchableSelect`. Its label is `receiverEmployee` / `receiverDepartment` / `receiverLocation` by type. With an employee chosen, its hint is `t("receiverHint", { department: selectedEmployee.departmentLabel, branch: selectedEmployee.branchLabel, count: selectedEmployee.heldCount })`.
    3. The mode, master's `:337-373` unchanged.
    4. The due date for a loan (`:392-402`).
    5. `<AssetConditionChoice id="checkout-condition" legend={t("conditionBefore")} options={conditions} value={values.conditionBefore} required error={errorText("conditionBefore")} onChange={(value) => setField("conditionBefore", value)} />`.
    6. The date and the remark, as master.
  - **Section 3:** `<FormSection number={3} title={<>{t("sectionEvidence")} <span className="font-normal text-muted-foreground">{t("sectionEvidenceOptional")}</span></>}>`. It holds the photo (`:409-420`) and the `SignaturePad` with `helper={receiverLabel ? t("receiverSignatureFor", { name: receiverLabel }) : t("receiverSignatureHelp")}`.
  - **Frame props:**
    - `summary={<OperationSummaryCard title={tOperation("summaryTitle")} nowLabel={tOperation("summaryNow")} nextLabel={tOperation("summaryNext")} rows={summaryRows} checklist={checklist} footnote={t("summaryFootnote")} />}`.
    - `footer`'s `description` is `values.asset && receiverLabel ? t("footerDescription", { tag: values.asset.assetTag, receiver: receiverLabel }) : t("footerIncomplete")`. The rest of `footer` is `cancelHref` (the named value), `cancelLabel: tCommon("cancel"), submitLabel: tOperation("reviewAndSave"), busy: saving, formId: CHECKOUT_FORM_ID`.
  - **Removed:** `OperationShell`, the local `Select`, the inline Save button, and the imports of `NativeSelect`, `ContentPanel`, `PageHeader`, `Button` and `Save`.
- **FIELD_IDS**, in visual order: assetId, checkoutType, custodianId, departmentId, locationId, handoverMode, expectedReturnDate, conditionBefore, checkoutDate.
- **Kept verbatim:** `validate`, `HANDOVER_MESSAGE_KEYS`, `errorText`, `leaveReview`, `handleSubmit` (field checks, then the review), `submitCheckout` (to the HO- page with `returnTo`) and `getCheckoutErrorMessage`.
- **Labels (my call):** แผนกผู้รับ and ที่ตั้งปลายทาง.

- [ ] **Step 1: Write the failing test.** Create `tests/checkout-form-rules.test.ts` with these imports and fixtures:
  - `assert` (`node:assert/strict`), `readFileSync` (`node:fs`), `test` (`node:test`) and the six functions from `../src/lib/checkout-form-rules.ts`; `const read = (file: string) => readFileSync(file, "utf8").replace(/\r\n/g, "\n")`.
  - `row(o, d)` returns `{ id: "a1", assetTag: "NB-0017", name: "Notebook", serialNumber: null, statusLabel: "พร้อมใช้งาน", placeLabel: "HQ-01 - คลัง IT", locationLabel: "HQ-01 - คลัง IT", currentLocationId: "l1", conditionId: "c-good", eligible: true, reasonKey: null, detail: { ownership: "personal", statusName: "Ready", departmentId: "d-it", departmentLabel: "IT - Information Technology", holderLabel: null, ownerBranchLabel: "สำนักงานใหญ่", locationBranchLabel: "สำนักงานใหญ่", components: [], ...d }, ...o }`.
  - `employee = { id: "e1", label: "E001 - สมชาย ใจดี", departmentId: "d-acc", departmentLabel: "ACC - บัญชี", branchLabel: "สำนักงานใหญ่", heldCount: 2 }`.
  - `choose(o)` returns `{ asset: row(), checkoutType: "user", handoverMode: "", employee: null, department: null, location: null, ...o }`.
  - `words` = the Thai of Step 5, with `kept: (v) => \`${v} (คงเดิม)\``, `count: (n) => \`${n} รายการ\`` and `componentsGo: (n) => \`ไปด้วย ${n} รายการ\``.
  - `pick = (rows) => rows.map(({ key, now, next, changed }) => [key, now, next, changed])`.

```ts
test("บุคคล to an employee: holder, the employee's department, status and the components that go (spec §7.3, §6)", () => {
  const components = [{ id: "k1", assetTag: "NB-0017-01", name: "Adapter 65W", travels: true }, { id: "k2", assetTag: "NB-0017-02", name: "Mouse ไร้สาย", travels: false }]
  const rows = buildCheckoutSummaryRows(choose({ asset: row({}, { components }), employee, handoverMode: "permanent_assignment" }), words)
  assert.deepEqual(rows.map((r) => r.label), ["ผู้ถือครอง", "แผนก", "สถานะ", "ส่วนควบ"])
  assert.deepEqual(pick(rows), [["holder", "ไม่มี", "E001 - สมชาย ใจดี", true], ["department", "IT - Information Technology", "ACC - บัญชี", true],
    ["status", "พร้อมใช้งาน", "ใช้งานอยู่", true], ["components", "2 รายการ", "ไปด้วย 1 รายการ", true]])
  assert.deepEqual(checkoutComponents(row({}, { components })), { travelling: [components[0]], staying: [components[1]] })
})
test("ส่วนกลาง keeps its department, to an employee and to a department (P1-R2)", () => {
  const shared = row({}, { ownership: "shared" })
  for (const choice of [choose({ asset: shared, employee }), choose({ asset: shared, checkoutType: "department", department: { id: "d-acc", label: "ACC - บัญชี" }, handoverMode: "temporary_loan" })])
    assert.deepEqual(pick(buildCheckoutSummaryRows(choice, words))[1], ["department", "IT - Information Technology", "IT - Information Technology", false])
})
test("to a department an old holder stays and says so; to a room the room changes, the department does not (spec §7.3)", () => {
  const dept = choose({ asset: row({}, { holderLabel: "E009 - คนเดิม" }), checkoutType: "department", department: { id: "d-acc", label: "ACC - บัญชี" }, handoverMode: "temporary_loan" })
  assert.deepEqual(pick(buildCheckoutSummaryRows(dept, words)), [["holder", "E009 - คนเดิม", "E009 - คนเดิม (คงเดิม)", false],
    ["department", "IT - Information Technology", "ACC - บัญชี", true], ["status", "พร้อมใช้งาน", "ถูกยืม", true]])
  const room = choose({ checkoutType: "location", location: { id: "l2", label: "BR-02 - ห้อง 2" }, handoverMode: "temporary_loan" })
  assert.deepEqual(pick(buildCheckoutSummaryRows(room, words)), [["holder", "ไม่มี", "ไม่มี", false],
    ["department", "IT - Information Technology", "IT - Information Technology", false], ["location", "HQ-01 - คลัง IT", "BR-02 - ห้อง 2", true], ["status", "พร้อมใช้งาน", "ถูกยืม", true]])
})
test("nothing promised before it is chosen, and no rows without the detail (spec §4 anti-goal)", () => {
  assert.deepEqual(pick(buildCheckoutSummaryRows(choose(), words)), [["holder", "ไม่มี", "ยังไม่ได้เลือก", false],
    ["department", "IT - Information Technology", "ยังไม่ได้เลือก", false], ["status", "พร้อมใช้งาน", "ยังไม่ได้เลือก", false]])
  assert.deepEqual(buildCheckoutSummaryRows(choose({ asset: row({ detail: undefined }) }), words), [])
})
test("the checklist, the detail answer, the condition default and the receiver (spec §7.2-7.3, P1-R5)", () => {
  const checkWords = { asset: "ทรัพย์สิน", receiver: "ผู้รับ", mode: "ลักษณะการส่งมอบ", signature: "ลายเซ็นผู้รับ", signatureMissing: "ยังไม่มี (ไม่บังคับ)" }
  assert.deepEqual(buildCheckoutChecklist({ ...choose({ asset: null }), signed: false }, checkWords), [{ key: "asset", label: "ทรัพย์สิน", done: false },
    { key: "receiver", label: "ผู้รับ", done: false }, { key: "mode", label: "ลักษณะการส่งมอบ", done: false }, { key: "signature", label: "ลายเซ็นผู้รับ", done: false, note: "ยังไม่มี (ไม่บังคับ)" }])
  assert.deepEqual(buildCheckoutChecklist({ ...choose({ employee, handoverMode: "temporary_loan" }), signed: true }, checkWords).map((c) => c.done), [true, true, true, true])
  assert.equal(buildCheckoutChecklist({ ...choose({ asset: row({ eligible: false, reasonKey: "asset.transactionReasonStatusNotReady" }) }), signed: false }, checkWords)[0].done, false)
  const plain = row({ detail: undefined }); const answered = row()
  assert.equal(withCheckoutAssetDetail(plain, answered), answered)
  assert.equal(withCheckoutAssetDetail(row({ id: "a2", detail: undefined }), answered)?.id, "a2", "another asset chosen since")
  assert.equal(withCheckoutAssetDetail(plain, null), plain, "a failed read keeps the row")
  assert.equal(checkoutConditionDefault(row(), [{ id: "c-good" }]), "c-good")
  assert.equal(checkoutConditionDefault(row({ conditionId: "c-legacy" }), [{ id: "c-good" }]), "")
  assert.equal(checkoutReceiverLabel(choose({ checkoutType: "department", employee })), null)
})
```
  Two more tests, on the form's source and on the words:

```ts
test("the form's source: the form wraps the frame; three sections, the asset card, the receiver, the summary, the footer and the phone hooks (spec §7.1-§7.3, P1-R4)", () => {
  const form = read("src/components/asset-operations/checkout-form.tsx")
  for (const part of [
    'const CHECKOUT_FORM_ID = "checkout-form"', "useState<CheckoutPhoneStep>(1)",
    "<form onSubmit={handleSubmit} noValidate id={CHECKOUT_FORM_ID} data-step={step}>",
    '<FormSection number={1} title={t("sectionAsset")}>', '<FormSection number={2} title={t("sectionReceiver")}>', "<FormSection number={3} title=",
    "pickedBody={(row) => <CheckoutAssetCard row={row} />}",
    "<StatusBadge label={row.statusLabel} tone={getAssetStateTone(row.detail?.statusName)} />",
    'row.detail ? t("assetWhere", { location: row.locationLabel, branch: row.detail.locationBranchLabel, holder: row.detail.holderLabel ?? t("noHolder") }) : row.locationLabel',
    'buildAssetOperationSearchHref({ mode: "checkout", id: assetId, detail: true })', "withCheckoutAssetDetail(current.asset, answered)",
    "checkoutConditionDefault(initialAsset, conditions)", "checkoutConditionDefault(row, conditions)",
    '<FieldGroup legend={t("checkoutTo")} id="checkout-type" required error={errorText("checkoutType")}>',
    "<AssetConditionChoice", 'id="checkout-condition"',
    't("receiverHint", { department: selectedEmployee.departmentLabel, branch: selectedEmployee.branchLabel, count: selectedEmployee.heldCount })',
    "const cancelHref = getOperationCancelHref(locale, returnTo)", "const receiverLabel = checkoutReceiverLabel(choice)",
    "summary={<OperationSummaryCard", 'footnote={t("summaryFootnote")}',
    't("footerDescription", { tag: values.asset.assetTag, receiver: receiverLabel })',
    'submitLabel: tOperation("reviewAndSave")', "formId: CHECKOUT_FORM_ID",
    ...["asset", "receiver", "evidence", "photo", "signature"].map((part) => `data-checkout-part="${part}"`),
  ]) assert.ok(form.includes(part), part)
  const at = (text: string) => form.indexOf(text)
  assert.ok(at("<form onSubmit=") < at("<OperationFormFrame") && at("</OperationFormFrame>") < at("</form>") && at("</form>") < at("<OperationReviewDialog"),
    "the form wraps the frame, so the frame's StickyFormFooter is inside the form; the review dialog follows the form")
  assert.doesNotMatch(form, /data-slot=/, "the slots are the shared parts' own (Task 5's operation-summary-card and operation-form-frame)")
  assert.doesNotMatch(form, /<NativeSelect|function Select\(|function OperationShell|t\("toAsset"\)|t\("selectCondition"\)/)
  const picker = read("src/components/ui/asset-operation-picker.tsx")
  for (const part of ["pickedBody?: (row: AssetOperationSearchRow) => React.ReactNode", "{pickedBody ? pickedBody(value) : ("]) assert.ok(picker.includes(part), part)
})
test("the words of ส่งมอบ, Thai and English; checkout.selectCondition has no reader left (spec §7.1-§7.3, decision 5)", () => {
  const messages = { th: JSON.parse(read("messages/th.json")), en: JSON.parse(read("messages/en.json")) }
  const word = (locale: "th" | "en", key: string): unknown =>
    key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages[locale])
  const words: Record<string, [string, string]> = {
    "checkout.description": ["บันทึกการส่งมอบให้พนักงาน แผนก หรือที่ตั้ง เมื่อบันทึกแล้วระบบจะออกเลขใบส่งมอบให้", "Record a handover to an employee, a department or a location. The handover number is issued when you save."],
    "checkout.sectionAsset": ["ทรัพย์สินที่จะส่งมอบ", "Asset to hand over"], "checkout.sectionReceiver": ["ส่งมอบให้ใคร", "Who receives it"],
    "checkout.sectionEvidence": ["หลักฐาน", "Evidence"], "checkout.sectionEvidenceOptional": ["ไม่บังคับ แต่แนะนำ", "Optional, but recommended"],
    "checkout.assetWhere": ["อยู่ที่ {location} · {branch} · {holder}", "At {location} · {branch} · {holder}"], "checkout.noHolder": ["ยังไม่มีผู้ถือครอง", "No holder yet"],
    "checkout.componentsTravel": ["ส่วนควบที่จะส่งมอบไปด้วย {count} รายการ", "{count} components go with it"],
    "checkout.componentsTravelNote": ["ส่วนควบไปพร้อมเครื่องหลักโดยอัตโนมัติ ถ้าไม่ต้องการส่งชิ้นไหน ให้ถอดออกจากเครื่องก่อน", "Components go with the parent automatically. To keep one back, remove it from the parent first."],
    "checkout.componentsStaying": ["ไม่ไปด้วย {count} รายการ เพราะมีการส่งมอบของตัวเองค้างอยู่: {list}", "{count} not going, each has its own open handover: {list}"],
    "checkout.receiverEmployee": ["พนักงานผู้รับ", "Receiving employee"], "checkout.receiverDepartment": ["แผนกผู้รับ", "Receiving department"],
    "checkout.receiverLocation": ["ที่ตั้งปลายทาง", "Destination location"],
    "checkout.receiverHint": ["{department} · {branch} · ตอนนี้ถือครองทรัพย์สินอยู่ {count} รายการ", "{department} · {branch} · holds {count} assets now"],
    "checkout.receiverSignatureFor": ["ให้ {name} เซ็นในกรอบนี้", "Ask {name} to sign in this box"],
    "checkout.summaryComponentsGo": ["ไปด้วย {count} รายการ", "{count} go with it"], "checkout.checkReceiver": ["ผู้รับ", "Receiver"],
    "checkout.signatureMissing": ["ยังไม่มี (ไม่บังคับ)", "Not yet (optional)"],
    "checkout.summaryFootnote": ["เลขใบส่งมอบออกให้หลังบันทึก แล้วเปิดใบส่งมอบให้พิมพ์ทันที", "The handover number is issued on saving, and the handover document opens for printing."],
    "checkout.footerDescription": ["ส่งมอบ {tag} ให้ {receiver}", "Hand over {tag} to {receiver}"], "checkout.footerIncomplete": ["เลือกทรัพย์สินและผู้รับ", "Choose the asset and the receiver"],
    "checkout.permanentAssignmentHelp": ["ใช้ต่อเนื่อง ไม่มีกำหนดคืน", "Continuous use, no return date"], "checkout.temporaryLoanHelp": ["ต้องคืนตามวันที่กำหนด", "Must be returned by the due date"],
    "assetOperation.summaryHolder": ["ผู้ถือครอง", "Holder"], "assetOperation.summaryDepartment": ["แผนก", "Department"],
    "assetOperation.summaryLocation": ["ที่ตั้ง", "Location"], "assetOperation.summaryStatus": ["สถานะ", "Status"],
    "assetOperation.summaryComponents": ["ส่วนควบ", "Components"], "assetOperation.summaryNone": ["ไม่มี", "None"],
    "assetOperation.summaryNotChosen": ["ยังไม่ได้เลือก", "Not chosen yet"], "assetOperation.summaryKept": ["{value} (คงเดิม)", "{value} (unchanged)"],
    "assetOperation.summaryCount": ["{count} รายการ", "{count}"],
  }
  assert.equal(Object.keys(words).length, 32, "Step 5's keys")
  for (const [key, pair] of Object.entries(words)) assert.deepEqual([word("th", key), word("en", key)], pair, key)
  for (const locale of ["th", "en"] as const) assert.equal(word(locale, "checkout.selectCondition"), undefined, locale)
})
```

- [ ] **Step 2: Run it and see it fail.** `node --test tests/checkout-form-rules.test.ts`. Expected: `ERR_MODULE_NOT_FOUND` for `src/lib/checkout-form-rules.ts`.

- [ ] **Step 3: Rewrite the pins this task breaks:**
  - `asset-handover-checkout.test.ts`: `:51` becomes `doesNotMatch(/<NativeSelect|function Select\(/)` plus `match(/<AssetConditionChoice\n\s+id="checkout-condition"/)`. `:53` becomes `assert.ok(source.includes("busy: saving"))` plus `assert.doesNotMatch(source, /<Button type="submit" busy=\{saving\} className="w-full sm:w-auto">/)`: only the old inline save is pinned out (the submit is now the frame's), so Task 7's phone submit buttons break nothing here. `:50`, `:52`, `:55` and `:56` stay.
  - `asset-operation-picker-forms.test.ts:47` on master (the FormContextBanner regex; Task 1 moves it up): the banner regex loses `<div className="md:col-span-2">\n\s+`.
  - `form-frames-ui.test.ts:94-102`: retitle it "the check-out form is the operation frame (group 3 plan 1 Task 6)". It asserts the import `import { OperationFormFrame } from "@/components/asset-operations/operation-form-frame"` and `/<OperationFormFrame\n\s+title=\{t\("title"\)\}\n\s+description=\{t\("description"\)\}/`. It still checks `doesNotMatch(/<h1\b|PageBackLink/)`.
  - `operations-sweep-ui.test.ts:77-78`: the checkout ContentPanel regex becomes `/<FormSection number=\{1\} title=\{t\("sectionAsset"\)\}>/`. The `<section\b|rounded-lg border|…` check stays.
  - `v-track2-o.test.ts`: the ids block becomes this task's FIELD_IDS (no `shared`); add `match(/<AssetConditionChoice\n\s+id="checkout-condition"\n/)`; the rest stays. Task 1 has already removed the `parentAssetId` and `checkoutParent` lines.
  - `form-migration-guards.test.ts:87` becomes `[3, 0, 0]`: the local `Select`s and their `NativeSelect` go, and the condition's `required` moves to `condition-choice.tsx`'s row; the `ChoiceCard` and the two date `Input`s keep theirs. No `STICKY_FOOTER_ROUTES` change: GL1 keys the file that renders `<StickyFormFooter`, the frame, and Task 5's frame row already lists `/th/asset-management/checkout`.
  - `e2e-cross-cutting.test.ts`, after `:217`: `assert.equal((thai.assetOperation as Record<string, string>).reviewAndSave, "ตรวจสอบและบันทึก")`; `forms.ts` includes `'return page.getByRole("button", { name: "ตรวจสอบและบันทึก", exact: true }).click()'`; the spec includes `"await reviewAndSave(page)"`; `:222` and `:239` stay.
  - `e2e-transactions.test.ts` (TX2): add `assert.ok(spec.includes("{ name: TX_WORDS.reviewAndSave, exact: true }"))`, `assert.ok(!spec.includes('{ name: "บันทึก", exact: true }'))`, `assert.equal(spec.split('test.skip(e2eDevice === "phone", PHONE_STEPS)').length - 1, 4)`, `assert.ok(spec.includes('await expect(conditionChip(page, "ดี")).toBeChecked()'))` and `assert.equal(spec.split(\`page.locator('[data-slot="sticky-form-footer"]').filter({ visible: true })\`).length - 1, 2, "the bar that shows: from Task 7 the page also holds the phone bar")`; after the `support` read (`:154`), `assert.ok(support.includes("export function conditionChip(page: Page, label: string): Locator {"))`. The arrival count at `:125` stays 2. `readTxSpec` (`:15`) still finds no `from "@playwright/test"` in the spec.
  - Checked and not broken: `choice-controls-ui.test.ts:73-80`, `file-evidence-ui.test.ts:137-141` and `asset-operation-confirmation-ui.test.ts`; `e2e-fixes.test.ts:142,234`, `e2e-asset-detail.test.ts:64-68` and `e2e-transactions.test.ts:284`; `e2e-suite.test.ts:323` (no spec imports `@playwright/test`); `validation-guards.test.ts`: V2 still sees `onSubmit={handleSubmit} noValidate` first, and V4 a SearchableSelect with `id` and `error`; `asset-operation-picker-ui.test.ts`.

- [ ] **Step 4: Run them and see them fail.** `node --test tests/checkout-form-rules.test.ts tests/asset-handover-checkout.test.ts tests/form-frames-ui.test.ts tests/operations-sweep-ui.test.ts tests/v-track2-o.test.ts tests/e2e-cross-cutting.test.ts tests/e2e-transactions.test.ts`. Expected: FAIL on the new markup, words and E2E lines. `form-migration-guards` passes both before and after, because a lower floor never fails.

- [ ] **Step 5: Messages.** Write the change file in the session scratchpad and run `node scripts/messages-edit.mjs <file>`, with `"delete": ["checkout.selectCondition"]` (no reader is left). Expected: `messages updated: 32 th, 32 en, 1 deleted`. The keys, as th / en (the same 32 as Step 1's words test):
  - **Page and sections:** `checkout.description`: "บันทึกการส่งมอบให้พนักงาน แผนก หรือที่ตั้ง เมื่อบันทึกแล้วระบบจะออกเลขใบส่งมอบให้" / "Record a handover to an employee, a department or a location. The handover number is issued when you save."; `checkout.sectionAsset`: "ทรัพย์สินที่จะส่งมอบ" / "Asset to hand over"; `checkout.sectionReceiver`: "ส่งมอบให้ใคร" / "Who receives it"; `checkout.sectionEvidence`: "หลักฐาน" / "Evidence"; `checkout.sectionEvidenceOptional`: "ไม่บังคับ แต่แนะนำ" / "Optional, but recommended".
  - **The asset card and its components:** `checkout.assetWhere`: "อยู่ที่ {location} · {branch} · {holder}" / "At {location} · {branch} · {holder}"; `checkout.noHolder`: "ยังไม่มีผู้ถือครอง" / "No holder yet"; `checkout.componentsTravel`: "ส่วนควบที่จะส่งมอบไปด้วย {count} รายการ" / "{count} components go with it"; `checkout.componentsTravelNote`: "ส่วนควบไปพร้อมเครื่องหลักโดยอัตโนมัติ ถ้าไม่ต้องการส่งชิ้นไหน ให้ถอดออกจากเครื่องก่อน" / "Components go with the parent automatically. To keep one back, remove it from the parent first."; `checkout.componentsStaying`: "ไม่ไปด้วย {count} รายการ เพราะมีการส่งมอบของตัวเองค้างอยู่: {list}" / "{count} not going, each has its own open handover: {list}".
  - **The receiver:** `checkout.receiverEmployee`: "พนักงานผู้รับ" / "Receiving employee"; `checkout.receiverDepartment`: "แผนกผู้รับ" / "Receiving department"; `checkout.receiverLocation`: "ที่ตั้งปลายทาง" / "Destination location"; `checkout.receiverHint`: "{department} · {branch} · ตอนนี้ถือครองทรัพย์สินอยู่ {count} รายการ" / "{department} · {branch} · holds {count} assets now"; `checkout.receiverSignatureFor`: "ให้ {name} เซ็นในกรอบนี้" / "Ask {name} to sign in this box".
  - **The summary card:** `checkout.summaryComponentsGo`: "ไปด้วย {count} รายการ" / "{count} go with it"; `checkout.checkReceiver`: "ผู้รับ" / "Receiver"; `checkout.signatureMissing`: "ยังไม่มี (ไม่บังคับ)" / "Not yet (optional)"; `checkout.summaryFootnote`: "เลขใบส่งมอบออกให้หลังบันทึก แล้วเปิดใบส่งมอบให้พิมพ์ทันที" / "The handover number is issued on saving, and the handover document opens for printing."
  - **The footer:** `checkout.footerDescription`: "ส่งมอบ {tag} ให้ {receiver}" / "Hand over {tag} to {receiver}"; `checkout.footerIncomplete`: "เลือกทรัพย์สินและผู้รับ" / "Choose the asset and the receiver".
  - **Changed values** (decision 5): `checkout.permanentAssignmentHelp`: "ใช้ต่อเนื่อง ไม่มีกำหนดคืน" / "Continuous use, no return date"; `checkout.temporaryLoanHelp`: "ต้องคืนตามวันที่กำหนด" / "Must be returned by the due date".
  - **Summary words shared by plans 2-3:** `assetOperation.summaryHolder`: "ผู้ถือครอง" / "Holder"; `assetOperation.summaryDepartment`: "แผนก" / "Department"; `assetOperation.summaryLocation`: "ที่ตั้ง" / "Location"; `assetOperation.summaryStatus`: "สถานะ" / "Status"; `assetOperation.summaryComponents`: "ส่วนควบ" / "Components"; `assetOperation.summaryNone`: "ไม่มี" / "None"; `assetOperation.summaryNotChosen`: "ยังไม่ได้เลือก" / "Not chosen yet"; `assetOperation.summaryKept`: "{value} (คงเดิม)" / "{value} (unchanged)"; `assetOperation.summaryCount`: "{count} รายการ" / "{count}".

- [ ] **Step 6: Implement** `checkout-form-rules.ts` to the Decisions, then the `pickedBody` prop, then `checkout-form.tsx`.

- [ ] **Step 7: Update the E2E.** It is not run here; the controller runs it after Task 8. No spec imports from `@playwright/test` (`readTxSpec`, `tests/e2e-transactions.test.ts:15`; `tests/e2e-suite.test.ts:323`).
  - `tx-words.ts`: add `reviewAndSave: "ตรวจสอบและบันทึก"` and `checkoutFooter: "ส่งมอบ {tag} ให้ {receiver}"`.
  - `tx-support.ts`, after `pickedAsset` (`:190-192`; the file already imports `type Locator, type Page`): `// The condition chips of ส่งมอบ (group 3 spec §7.2): one radio per master condition, by its Thai name.` then `export function conditionChip(page: Page, label: string): Locator { return page.locator("#checkout-condition").getByRole("radio", { name: label, exact: true }) }`.
  - `forms.ts`: add `export function reviewAndSave(page: Page)`, which clicks `getByRole("button", { name: "ตรวจสอบและบันทึก", exact: true })`. The comment says the transaction pages' footer is `assetOperation.reviewAndSave` and the other forms keep `common.save`.
  - `handover.spec.ts`:
    - After `asUser("itStaff")` (`:28`), add `const PHONE_STEPS = "below lg the checkout is the three phone steps (spec §7.4, P1-R4): desk-delivery.spec.ts"`, and put `test.skip(e2eDevice === "phone", PHONE_STEPS)` first in all four tests (the fourth, `:210`, takes `e2eDevice` beside `e2eTheme`).
    - Add `conditionChip` to the `./tx-support.ts` import list (`:8-24`).
    - Every `{ name: "บันทึก", exact: true }` becomes `{ name: TX_WORDS.reviewAndSave, exact: true }`.
    - `:49` becomes `await expect(conditionChip(page, "ดี")).toBeChecked()`: the asset's own condition is preselected. `:54` and `:162` go.
    - After `:52`, add `await expect(page.locator("#checkout-destination-hint")).toContainText(/ตอนนี้ถือครองทรัพย์สินอยู่ \d+ รายการ$/)` and `await expect(page.locator('[data-slot="sticky-form-footer"]').filter({ visible: true })).toContainText(TX_WORDS.checkoutFooter.replace("{tag}", asset.assetTag).replace("{receiver}", \`${receiver.code} - ${receiver.fullNameTh}\`))`.
    - `:113` becomes `await conditionChip(page, "พอใช้").check()`, and the loan review also expects `"พอใช้"`.
    - After `:110`, add `await expect(page.locator('[data-slot="sticky-form-footer"]').filter({ visible: true }).getByRole("link", { name: "ยกเลิก" })).toHaveAttribute("href", "/th/assets")`.
    - Both footer locators take `.filter({ visible: true })`: from Task 7 the page also holds the phone bar, hidden from `lg`, and a bare locator would match two elements (strict mode).
  - `field-errors.spec.ts`: import `reviewAndSave` (`:7`) and `conditionChip` (the `../transactions/tx-support.ts` import at `:10`, whose comment at `:9` gains "and the condition chips"); the handover test takes `e2eDevice` and skips on the phone with the same reason (Task 7 removes this skip when it writes the phone path); `:107` becomes `await expect(conditionChip(page, "ดี")).toBeChecked()`; `save(page)` at `:108` and `:113` becomes `reviewAndSave(page)`.

- [ ] **Step 8: Run the task's tests and see them pass.** Run the Step 4 command plus `tests/form-migration-guards.test.ts tests/asset-operation-picker-forms.test.ts tests/choice-controls-ui.test.ts tests/validation-guards.test.ts tests/e2e-suite.test.ts tests/thai-glossary.test.ts`. Expected: PASS.

- [ ] **Step 9: Run the gates.** `npm test`, `npx tsc --noEmit`, `npm run lint` (0 errors). A pin that fails outside Step 3's list is rewritten in this commit and named in the report.

- [ ] **Step 10: Commit.**
```bash
git add src/lib/checkout-form-rules.ts src/components/asset-operations/checkout-form.tsx src/components/ui/asset-operation-picker.tsx messages/th.json messages/en.json e2e/transactions/handover.spec.ts e2e/transactions/tx-support.ts e2e/transactions/tx-words.ts e2e/cross-cutting/support/forms.ts e2e/cross-cutting/field-errors.spec.ts tests/checkout-form-rules.test.ts tests/asset-handover-checkout.test.ts tests/asset-operation-picker-forms.test.ts tests/form-frames-ui.test.ts tests/operations-sweep-ui.test.ts tests/v-track2-o.test.ts tests/form-migration-guards.test.ts tests/e2e-cross-cutting.test.ts tests/e2e-transactions.test.ts
git commit -m "feat(checkout): ส่งมอบ in three sections with the สรุปก่อนบันทึก card (holder, the department by the shared rule, room, status, components) and the footer ตรวจสอบและบันทึก / ยกเลิก; the asset card, the components that go, the receiver's department and held count, condition chips preselected (group 3 plan 1 Task 6)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Open issues (Task 6):**
1. **Phone E2E until Task 7.** `handover.spec.ts` (all four tests) and the field-errors handover test skip on the phone here, because Task 7 hides the footer below `lg` (P1-R4). `handover.spec.ts` stays desktop-only after Task 7, so the double checkout no longer runs on the phone; Task 7 removes the field-errors skip with its phone path. Until Task 7, `desk-delivery.spec.ts` is stale: it still clicks "บันทึก" and calls `selectOption` on `#checkout-condition`. No E2E runs before Task 8.
2. **A new prop on a shared part.** The shared picker gains `pickedBody`, which the skeleton does not list. It keeps one chosen box (`data-asset-picked` + เปลี่ยน) instead of adding a second card.

---

### Task 7: ส่งมอบ on the phone, three steps in one form (spec §7.4, P1-R4)

Below the shell's phone/desktop switch (`lg`, 64rem: the sidebar and the bottom bar change there), the one checkout form shows its parts step by step: 1 "ทรัพย์สินและผู้รับ", 2 "ให้ผู้รับตรวจ" (the read-back, which replaces the review dialog), 3 "ลงชื่อรับ" (the statement and the pad), and "บันทึกการส่งมอบ" saves and opens the HO- document. From `lg`, the step is ignored and Task 6's desktop page shows unchanged.

**Files:**
- Create: `src/lib/checkout-phone-steps.ts`, `src/lib/signature-pad-size.ts`, `src/components/asset-operations/checkout-phone-steps.tsx`, `tests/checkout-phone-steps.test.ts`
- Modify: `src/components/asset-operations/checkout-form.tsx` (Task 6's rebuild, blocks named by content), `src/components/asset-operations/operation-form-frame.tsx` (Task 5: the `phoneSteps` prop, a wrapper div around `{summary}`, the `StickyFormFooter`'s class)
- Modify: `src/components/asset-operations/signature-pad.tsx:7-19` (props), `:20-54` (refs, resize), `:79-109` (draw, stop, clear); `src/lib/field-focus.ts:81`
- Modify: `src/app/[locale]/(dashboard)/asset-management/checkout/page.tsx:14` and the `<CheckoutForm` props (`:21-28` on master)
- Modify: `messages/th.json`, `messages/en.json` through `node scripts/messages-edit.mjs` only
- Modify (E2E): `e2e/transactions/desk-delivery.spec.ts:1-85` (rewritten), `e2e/transactions/tx-words.ts:4-10`, `e2e/cross-cutting/support/forms.ts:1-12` (its imports, and `handoverForward` after Task 6's `reviewAndSave`), `e2e/cross-cutting/field-errors.spec.ts:7` (the forms import) and its handover test (`:100-126` on master, as Task 6 left it). `e2e/transactions/handover.spec.ts` is not touched: Task 6's four `test.skip(e2eDevice === "phone", PHONE_STEPS)` stay.
- Test: `tests/checkout-phone-steps.test.ts` (new). Rewrite `tests/e2e-transactions.test.ts:254-261` (TX7), `tests/v-track-f.test.ts:144`, Task 5's frame test in `tests/operation-form-parts-ui.test.ts` (its signature regex and its bar literal) and Task 6's field-errors line in `tests/e2e-cross-cutting.test.ts` (after `:217`). `tests/form-migration-guards.test.ts:56-60` (`STICKY_FOOTER_ROUTES`, after Task 5's frame row) gains `` [`${C}asset-operations/checkout-form.tsx`]: ["/th/asset-management/checkout"] ``: the form now renders the phone `StickyFormFooter` (GL1).
- Pins checked and kept:
  - Master: `tests/form-migration-guards.test.ts` GD4 (`:413-425`): the phone bar's outline `phoneFix` precedes its submits in the source (Step 5).
  - Master: `tests/file-evidence-ui.test.ts:139,143-151` (the part classes go on wrapping divs, never on `<Field label={t("photoBefore")}>`; the canvas `className` literal stays), `tests/dark-mode-p.test.ts:109-117` (still two `context.fillStyle = "#ffffff"` and `onChange(canvas.toDataURL("image/png"))`), `tests/v-track2-o.test.ts:153-154` (`leaveReview`'s three dialog lines and the `focusFirst(... reveal: leaveReview })` call stay), `tests/e2e-cross-cutting.test.ts:208-217` (the dialog and confirm literals stay in field-errors.spec.ts for the desktop; `common.save` and forms.ts's `save` stay), `tests/e2e-asset-detail.test.ts:76`, `tests/e2e-transactions.test.ts:128` (still one arrival wait in desk-delivery: the second test and the blocked preselect arrive through `visit`) and the TX2 test (`:137-161`, with Task 6's lines; handover.spec.ts does not change).
  - Task 6: `tests/checkout-form-rules.test.ts` (the five `data-checkout-part` values and `data-step={step}` stay; the part classes go beside them), `tests/asset-handover-checkout.test.ts` (Task 6's `doesNotMatch(/<Button type="submit" busy=\{saving\} className="w-full sm:w-auto">/)` and `includes("busy: saving")`: the phone submits carry no such class, and the frame's `footer` keeps `busy: saving`), `tests/form-frames-ui.test.ts` (Task 6's `<OperationFormFrame\n\s+title=…\n\s+description=…` regex holds with `phoneSteps` after `description=`; checkout-form.tsx still has no `<h1` or `PageBackLink`, because the back link lives in checkout-phone-steps.tsx).
  - `e2e/transactions/handover.spec.ts`: Task 6's two footer locators use `.filter({ visible: true })`, so the phone bar, in the DOM but `lg:hidden` on the desktop, does not make them match two bars.

**Interfaces:**
- Consumes:
  - Task 5: `OperationFormFrame({ title, description, summary, footer, children })`, whose `{summary}` is a direct child of the grid and whose bar is `<StickyFormFooter className="lg:col-span-2" status={footer.description}>`, both pinned in `tests/operation-form-parts-ui.test.ts`; `getOperationCancelHref(locale, returnTo)`.
  - Task 6, in `CheckoutForm`:
    - `<form onSubmit={handleSubmit} noValidate id={CHECKOUT_FORM_ID} data-step={step}>` wraps `<OperationFormFrame title={t("title")} description={t("description")} …>`. The frame's children are the three `FormSection`s, and `OperationReviewDialog` follows `</form>`.
    - `const [step] = useState<CheckoutPhoneStep>(1)`, with `type CheckoutPhoneStep = 1 | 2 | 3` exported only by `src/lib/checkout-form-rules.ts`.
    - The five wrappers' `data-checkout-part`: `asset`, `receiver`, `evidence`, `photo`, `signature`.
    - `handleSubmit`, `leaveReview`, `submitCheckout`; `const cancelHref = getOperationCancelHref(locale, returnTo)` and `const receiverLabel = checkoutReceiverLabel(choice)` (`string | null`) at the top of the component; `checkoutComponents(values.asset).travelling`; `photoBefore`; `#checkout-type`.
  - Task 6, E2E: `reviewAndSave(page)` (`e2e/cross-cutting/support/forms.ts`), `TX_WORDS.reviewAndSave`, the `PHONE_STEPS` skips in `handover.spec.ts`, and the phone skip in field-errors.spec.ts's handover test (removed here).
  - `Steps({ label, steps, className })` (`src/components/ui/steps.tsx:33`), `getLinearStepStates(count, currentIndex)` (`src/lib/step-states.ts:9`), `useMediaQuery(query)` (`src/components/ui/use-media-query.ts:6`), `PageBackLink({ href, label, className? })` (`src/components/ui/page-header.tsx:67`), `StickyFormFooter({ status?, className, children })` (`sticky-form-footer.tsx:18`), `ContentPanel` `divided` (`content-panel.tsx:19`), `KeyValueList({ items })` (`key-value-list.tsx:11`), `getUserDisplayLabel(user)` (`src/lib/user-display.ts:6`), `requirePagePermission` returns the `SessionUser` (`src/lib/page-auth.ts:17-33`), `toLocalDateInputValue()` (`src/lib/local-date.ts:1`), `cn` (`src/lib/utils.ts:17`), `assetOperation.change` "เปลี่ยน", `common.stepOf` "ขั้นที่ {current} จาก {total}".
  - E2E: `signOnPad`, `expectReachable`, `openPhoneKeyboard`, `ensureSecondLocation`, `visit`, `expectFieldError`, `pickedAsset` (`tx-support.ts`), `TX_WORDS.reasonNotReady` (`tx-words.ts:5`), `bangkokDate` (`tx-plan.ts:38`), `primaryAction` (`e2e/asset-detail/detail-steps.ts:27`), `type E2eDevice` (`e2e/support/matrix.ts:5`).
- Produces:
  ```ts
  // src/lib/checkout-phone-steps.ts (pure; its one import is `import type { CheckoutPhoneStep } from "./checkout-form-rules.ts"`)
  export const checkoutPhoneParts = ["asset", "receiver", "evidence", "photo", "dateField", "signature", "stepsBar", "stepsFooter", "dateLine", "readBack", "statement"] as const
  export type CheckoutPhonePart = (typeof checkoutPhoneParts)[number]
  export function checkoutPhonePartClass(part: CheckoutPhonePart, step: CheckoutPhoneStep): "" | "max-lg:hidden" | "lg:hidden" | "hidden"
  export function formatCheckoutDay(day: string, locale: string): string   // "2026-10-30" → "30 ต.ค. 2569" | "30 Oct 2026"; "" unless a real YYYY-MM-DD
  export function getCheckoutSignStatement(input: { checkoutType: "user" | "department" | "location"; travellingCount: number }): { key: "signStatement" | "signStatementNoComponents"; onBehalf: boolean }
  // src/lib/signature-pad-size.ts (pure)
  export function signaturePadHeight(tall: boolean, viewportWidth: number, viewportHeight: number): number // 180; tall below 1024px: half the height, 180-280
  // src/components/asset-operations/checkout-phone-steps.tsx ("use client"; `import type { CheckoutPhoneStep } from "@/lib/checkout-form-rules"`)
  export function CheckoutPhoneBar(props: { step: CheckoutPhoneStep; cancelHref: string; onStep: (step: CheckoutPhoneStep) => void; className: string }): JSX.Element
  export type CheckoutReadBackProps = { receiverLabel: string; assetName: string; assetTag: string; serialNumber: string | null; photoCount: number
    components: ReadonlyArray<{ id: string; assetTag: string; name: string }>; conditionLabel: string; handoverModeLabel: string
    statusAfterLabel: string; checkoutDateLabel: string; dueDateLabel: string | null; remark: string; deliveredByLabel: string; className: string }
  export function CheckoutReadBack(props: CheckoutReadBackProps): JSX.Element
  // changed: SignaturePad gains `tall?: boolean`; OperationFormFrame gains `phoneSteps?: boolean` (destructured `phoneSteps = false` before `children`);
  // CheckoutForm gains `deliveredByLabel: string`, and Task 6's `step` state gains its setter
  // e2e/cross-cutting/support/forms.ts
  export function handoverForward(page: Page, device: E2eDevice): Promise<void>   // the phone: the button TX_WORDS.phoneNext; the desktop: reviewAndSave(page)
  ```
  Part rule: `asset`, `receiver`, `photo`, `dateField` show on step 1, `signature` on 3, `evidence` (section 3) on 1 and 3; such a part gets `""` on its steps and `"max-lg:hidden"` otherwise. Phone-only parts: `stepsBar` and `stepsFooter` on 1-3, `dateLine` on 1, `readBack` on 2, `statement` on 3; they get `"lg:hidden"` on their steps and `"hidden"` otherwise.

- [ ] **Step 1: Write the failing tests.** Create `tests/checkout-phone-steps.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { checkoutPhonePartClass, checkoutPhoneParts, formatCheckoutDay, getCheckoutSignStatement } from "../src/lib/checkout-phone-steps.ts"
import { signaturePadHeight } from "../src/lib/signature-pad-size.ts"

const read = (file: string) => readFileSync(file, "utf8").replace(/\r\n/g, "\n")
const checkout = (locale: "th" | "en") => JSON.parse(read(`messages/${locale}.json`)).checkout as Record<string, string>

test("one form, three phone steps: a part shows below lg only on its steps, a phone-only part never from lg (P1-R4)", () => {
  const H = "max-lg:hidden", P = "lg:hidden"
  assert.deepEqual(Object.fromEntries(checkoutPhoneParts.map((part) => [part, ([1, 2, 3] as const).map((step) => checkoutPhonePartClass(part, step))])), {
    asset: ["", H, H], receiver: ["", H, H], evidence: ["", H, ""], photo: ["", H, H], dateField: ["", H, H], signature: [H, H, ""],
    stepsBar: [P, P, P], stepsFooter: [P, P, P], dateLine: [P, "hidden", "hidden"], readBack: ["hidden", P, "hidden"], statement: ["hidden", "hidden", P],
  })
})

test("dates read as Bangkok days, the Buddhist year in Thai; the statement and the pad's height (spec §5, §7.4)", () => {
  assert.deepEqual([formatCheckoutDay("2026-10-30", "th"), formatCheckoutDay("2026-10-30", "en"), formatCheckoutDay("", "th"), formatCheckoutDay("2026-13-40", "th")], ["30 ต.ค. 2569", "30 Oct 2026", "", ""])
  assert.deepEqual(getCheckoutSignStatement({ checkoutType: "user", travellingCount: 2 }), { key: "signStatement", onBehalf: false })
  assert.deepEqual(getCheckoutSignStatement({ checkoutType: "user", travellingCount: 0 }), { key: "signStatementNoComponents", onBehalf: false })
  assert.deepEqual(getCheckoutSignStatement({ checkoutType: "department", travellingCount: 1 }), { key: "signStatement", onBehalf: true })
  assert.deepEqual(getCheckoutSignStatement({ checkoutType: "location", travellingCount: 0 }), { key: "signStatementNoComponents", onBehalf: true })
  assert.deepEqual([signaturePadHeight(false, 390, 664), signaturePadHeight(true, 390, 664), signaturePadHeight(true, 844, 390), signaturePadHeight(true, 390, 300), signaturePadHeight(true, 1440, 900)], [180, 280, 195, 180, 180])
})

test("the phone steps' words, Thai and English (spec §7.4, board TX-Checkout-Phone-1/2/3)", () => {
  const words: Record<string, [string, string]> = {
    phoneStepsLabel: ["ขั้นตอนการส่งมอบ", "Handover steps"], phoneStep1: ["ทรัพย์สินและผู้รับ", "Asset and receiver"],
    phoneStep2: ["ให้ผู้รับตรวจ", "Receiver checks"], phoneStep3: ["ลงชื่อรับ", "Receiver signs"],
    phoneCancelBack: ["ยกเลิกและกลับ", "Cancel and go back"], phoneBackToEdit: ["ย้อนกลับไปแก้ไข", "Back to edit"],
    phoneBackToCheck: ["ย้อนกลับไปขั้นตรวจ", "Back to the check"], phoneNext: ["ถัดไป: ให้ผู้รับตรวจ", "Next: receiver checks"],
    phoneAccept: ["ถูกต้อง ลงชื่อรับ", "Correct, sign to receive"], phoneFix: ["มีบางอย่างไม่ถูกต้อง กลับไปแก้", "Something is wrong, go back"],
    phoneSave: ["บันทึกการส่งมอบ", "Save the handover"], phoneDateToday: ["วันที่ส่งมอบ: วันนี้ {date}", "Handover date: today, {date}"],
    phoneDateOther: ["วันที่ส่งมอบ: {date}", "Handover date: {date}"], phoneDateChange: ["เปลี่ยนวันที่ส่งมอบ", "Change the handover date"],
    readBackHandOver: ["ยื่นมือถือให้ผู้รับอ่านรายการนี้ก่อนลงชื่อ", "Hand the phone to the receiver to read this before signing."],
    readBackReceiving: ["{receiver} กำลังรับ", "{receiver} is receiving"], readBackTagSerial: ["{tag} · S/N {serial}", "{tag} · S/N {serial}"],
    readBackPhotoCount: ["รูปก่อนส่งมอบ {count} รูป", "Photos before handover: {count}"], readBackNoPhoto: ["ยังไม่มีรูปก่อนส่งมอบ", "No photo before handover"],
    readBackComponents: ["ได้รับพร้อมกัน {count} รายการ", "Received with it: {count}"], readBackCondition: ["สภาพตอนรับ", "Condition on receipt"],
    deliveredBy: ["ผู้ส่งมอบ", "Handed over by"],
    signStatement: ["ข้าพเจ้าได้รับ {tag} พร้อมส่วนควบ {count} รายการ ในสภาพ{condition}", "I have received {tag} with {count} components, in {condition} condition."],
    signStatementNoComponents: ["ข้าพเจ้าได้รับ {tag} ในสภาพ{condition}", "I have received {tag} in {condition} condition."],
    signOnBehalf: ["รับในนามของ {destination}", "Received on behalf of {destination}"],
    signLandscapeHint: ["หมุนมือถือเป็นแนวนอน เพื่อเซ็นได้กว้างขึ้น", "Turn the phone sideways for a wider signing area."],
  }
  for (const [key, pair] of Object.entries(words)) assert.deepEqual([checkout("th")[key], checkout("en")[key]], pair, key)
})

test("the form, the frame, the pad, the focus and the page carry the steps (P1-R4)", () => {
  const form = read("src/components/asset-operations/checkout-form.tsx")
  for (const part of ['const isDesktop = useMediaQuery("(min-width: 64rem)")', "const [step, setStep] = useState<CheckoutPhoneStep>(1)", "if (!isDesktop) return showStepOne()",
    "if (isDesktop) return setReviewOpen(true)", "if (step === 1) return moveToStep(2)", "if (step === 3) void submitCheckout()",
    'checkoutPhonePartClass("readBack", step)', "tall",
    "fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key], reveal: leaveReview })"]) assert.ok(form.includes(part), part)
  // phoneSteps after description=, so Task 6's form-frames-ui regex (title= then description=) still reads the frame.
  assert.match(form, /<OperationFormFrame\n\s+title=\{t\("title"\)\}\n\s+description=\{t\("description"\)\}\n\s+phoneSteps\n/)
  // Task 6's hooks stay; each part's class sits beside its data-checkout-part.
  for (const part of ["asset", "receiver", "evidence", "photo", "signature"]) assert.match(form, new RegExp(`data-checkout-part="${part}" className=\\{(?:cn\\()?checkoutPhonePartClass\\("${part}", step\\)`), part)
  const at = (text: string) => {
    const index = form.indexOf(text)
    assert.ok(index >= 0, text)
    return index
  }
  assert.ok(at("<OperationFormFrame") < at("<CheckoutPhoneBar") && at("<CheckoutPhoneBar") < at("<CheckoutReadBack") && at("<CheckoutReadBack") < at("<FormSection number={1}"), "the bar, then the read-back, open the frame's children")
  assert.match(form, /<\/OperationFormFrame>\n\s+<StickyFormFooter className=\{checkoutPhonePartClass\("stepsFooter", step\)\}>[\s\S]*?<\/StickyFormFooter>\n\s+<\/form>/, "the phone bar follows the frame as the form's last child")
  assert.doesNotMatch(read("src/lib/checkout-phone-steps.ts"), /export type CheckoutPhoneStep\b/, "the step type is checkout-form-rules.ts's alone")
  assert.equal(read("src/components/asset-operations/operation-form-frame.tsx").split('phoneSteps && "max-lg:hidden"').length - 1, 2, "the summary column and the footer")
  const pad = read("src/components/asset-operations/signature-pad.tsx")
  for (const part of ["signaturePadHeight(tall, window.innerWidth, window.innerHeight)", "onChangeRef.current(null)"]) assert.ok(pad.includes(part), part)
  assert.ok(read("src/app/[locale]/(dashboard)/asset-management/checkout/page.tsx").includes("deliveredByLabel={getUserDisplayLabel(user)}"))
})
```

Rewrite `tests/v-track-f.test.ts:144` to `assert.match(focus, /\[\.\.\.main\.querySelectorAll<HTMLElement>\('\[data-slot="sticky-form-footer"\]'\)\]\.find\(\(bar\) => bar\.getClientRects\(\)\.length > 0\)/)`.

In `tests/e2e-transactions.test.ts`, rename the TX7 test to `"the desk delivery on the phone: three steps on one form, the read-back, a finger signature, a loan to a room, the HO- document on the phone (e2e transactions task 7, TX7; group 3 plan 1 task 7)"` and replace `:254-261` with the lines below. The comment and the `readdirSync` list at `:262-266` stay.

```ts
  assert.equal(spec.split('test.skip(e2eDevice !== "phone", "the desk delivery is done on the phone (spec §6.1.8)")').length - 1, 2)
  assert.ok(!spec.split("\n").includes("runPhoneOnWebKit()"), "the desk delivery stays on Chromium")
  for (const part of ["await openPhoneKeyboard(page)", "await expectReachable(next)", "await expectReachable(confirm)", "await expectReachable(save)",
    'await expectFieldError(page, "checkout-handover-mode", "กรุณาเลือกลักษณะการส่งมอบก่อนดำเนินการต่อ")',
    'await expectFieldError(page, "checkout-expected-return", "วันกำหนดคืนต้องเป็นวันเดียวกับหรือหลังวันที่ส่งมอบ")',
    'await expectFieldError(page, "checkout-asset", TX_WORDS.reasonNotReady)',
    'page.locator("[data-checkout-read-back]")', "TX_WORDS.phoneFix", "TX_WORDS.signOnBehalf", 'await expect(page.getByRole("dialog")).toHaveCount(0)',
    'const pad = page.getByRole("group", { name: "ลายเซ็นผู้รับ" })', "await signOnPad(page, pad, e2eDevice, browserName)", ".tap()"]) assert.ok(spec.includes(part), part)
  assert.equal(read("e2e/transactions/handover.spec.ts").split('test.skip(e2eDevice === "phone", PHONE_STEPS)').length - 1, 4, "the phone's handover is desk-delivery.spec.ts")
```

Rewrite Task 5's frame test in `tests/operation-form-parts-ui.test.ts` (`"OperationFormFrame: PageHeader with no breadcrumb (P1-R3), …"`):
- The signature regex becomes `/^export function OperationFormFrame\(\{ title, description, summary, footer, phoneSteps = false, children \}: OperationFormFrameProps\) \{$/m`.
- In its parts list, `'<StickyFormFooter className="lg:col-span-2" status={footer.description}>'` becomes `'<StickyFormFooter className={cn("lg:col-span-2", phoneSteps && "max-lg:hidden")} status={footer.description}>'`.
- Add `'<div className={cn("min-w-0", phoneSteps && "max-lg:hidden")}>{summary}</div>'` to that list.
- The order check (`{children}`, then `{summary}`, then `<StickyFormFooter`), `breadcrumbs=` and `RAW` stay.

In `tests/e2e-cross-cutting.test.ts`, Task 6's line after `:217` that checks the spec includes `"await reviewAndSave(page)"` becomes the three lines below. Task 6's `reviewAndSave` value line and its forms.ts line stay, because `handoverForward`'s desktop branch calls `reviewAndSave(page)`. Read forms.ts inline: `const forms` already names the list at `:219`.

```ts
  assert.equal(spec.split("await handoverForward(page, e2eDevice)").length - 1, 2, "the handover test's two forward presses, on either device")
  assert.ok(spec.includes('page.locator("[data-checkout-read-back]")'), "on the phone the review is the read-back (group 3 spec §7.4)")
  assert.ok(read("e2e/cross-cutting/support/forms.ts").includes("export function handoverForward(page: Page, device: E2eDevice): Promise<void>"))
```

- [ ] **Step 2: Run them and see them fail.** `node --test tests/checkout-phone-steps.test.ts tests/v-track-f.test.ts tests/e2e-transactions.test.ts tests/operation-form-parts-ui.test.ts tests/e2e-cross-cutting.test.ts`. Expected:
  - checkout-phone-steps fails to load (`Cannot find module ... checkout-phone-steps.ts`).
  - v-track-f fails on `querySelectorAll`.
  - TX7 fails on the skip count (1, not 2).
  - operation-form-parts-ui fails on the frame's signature (no `phoneSteps = false`).
  - e2e-cross-cutting fails on the `handoverForward` count (0, not 2).
  - Every other test in those files passes.

- [ ] **Step 3: The pure rules and the words.** Write the two lib files to the Produces block. `checkout-phone-steps.ts` takes `CheckoutPhoneStep` from Task 6 with `import type { CheckoutPhoneStep } from "./checkout-form-rules.ts"` and does not declare its own.
  - `formatCheckoutDay`: `Intl.DateTimeFormat(locale === "th" ? "th-TH-u-ca-buddhist" : "en-GB", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric" })` on `${day}T00:00:00+07:00`.
  - `signaturePadHeight`: `tall && viewportWidth < 1024 ? Math.max(180, Math.min(280, Math.round(viewportHeight / 2))) : 180`.
  - Words: write a change file in the session scratchpad, `{ "set": { "th": { "checkout.<key>": "…" }, "en": { … } } }`, with the 26 keys and values of Step 1's table. Run `node scripts/messages-edit.mjs <that file>`. Expected: `messages updated: 26 th, 26 en, 0 deleted`. Then run `node --test tests/thai-glossary.test.ts tests/messages-parity.test.ts`. Expected: PASS.

- [ ] **Step 4: The shared parts.**
  - `signature-pad.tsx`:
    - Add the prop `tall?: boolean` ("the phone's sign step: a taller pad below lg"). In `resizeCanvas`, `const height = signaturePadHeight(tall, window.innerWidth, window.innerHeight)` replaces `180`.
    - Add `onChangeRef` (the latest `onChange`) and `drawnRef` (set in `draw`, cleared in `clearSignature`).
    - A resize repaints the canvas white. So when `drawnRef.current` is set, the resize also clears it, calls `setHasSignature(false)` and calls `onChangeRef.current(null)`: what is saved is what the pad shows. This also covers a pad hidden on going back from step 3 to step 2.
  - `field-focus.ts:81`: `const footer = [...main.querySelectorAll<HTMLElement>('[data-slot="sticky-form-footer"]')].find((bar) => bar.getClientRects().length > 0)`. It picks the bar that shows, because this page holds a phone bar and a desktop bar.
  - `operation-form-frame.tsx`:
    - Add the prop `phoneSteps?: boolean` ("the page's phone layout is its own steps, P1-R4"), destructured as `phoneSteps = false` before `children`.
    - Wrap `{summary}` in `<div className={cn("min-w-0", phoneSteps && "max-lg:hidden")}>{summary}</div>`. This div is the grid item; the card keeps its own `lg:sticky` inside it.
    - The bar becomes `<StickyFormFooter className={cn("lg:col-span-2", phoneSteps && "max-lg:hidden")} status={footer.description}>`.
    - Import `cn` from `@/lib/utils`.

- [ ] **Step 5: The steps in the form.**
  - `checkout-phone-steps.tsx` (it imports `CheckoutPhoneStep` with `import type` from `@/lib/checkout-form-rules`):
    - `CheckoutPhoneBar` is `<div id="checkout-phone-steps" tabIndex={-1}>` (outline-none, with `className` from the caller).
      - On step 1 it holds `<PageBackLink href={cancelHref} label={t("phoneCancelBack")} />`.
      - On steps 2-3 it holds an outline md `Button` with `ArrowLeft` and a `max-md:sr-only` label: `phoneBackToEdit` calls `onStep(1)`, and `phoneBackToCheck` calls `onStep(2)`.
      - Then `<Steps label={t("phoneStepsLabel")}>` over `phoneStep1-3`, with the states `getLinearStepStates(3, step - 1)`.
    - `CheckoutReadBack` is a `<div data-checkout-read-back>` around `<ContentPanel divided title={t("phoneStep2")} description={t("readBackHandOver")}>`. In order it shows:
      - `readBackReceiving`, then the name;
      - `readBackTagSerial` (the tag alone when there is no serial);
      - `readBackPhotoCount` or `readBackNoPhoto`;
      - when there are components, `readBackComponents` over a list of "tag name";
      - a `KeyValueList` with `readBackCondition`, `handoverMode`, `expectedReturn` (loan only), `checkoutDate`, `resultingStatus`, `remark` (when not blank) and `deliveredBy`.
  - In `checkout-form.tsx`, the state and the moves:
    - Task 6's `const [step] = useState<CheckoutPhoneStep>(1)` becomes `const [step, setStep] = useState<CheckoutPhoneStep>(1)`. The type stays imported from `@/lib/checkout-form-rules`.
    - Add `const isDesktop = useMediaQuery("(min-width: 64rem)")` and the prop `deliveredByLabel`.
    - `phoneSteps` goes on `<OperationFormFrame`, on its own line right after `description={t("description")}`.
    - `function moveToStep(next)` calls `setStep(next)`. On the next frame it scrolls `[data-dashboard-main]` to the top and focuses `#checkout-phone-steps` (`preventScroll`).
    - `async function showStepOne()` calls `setStep(1)` and awaits two animation frames.
    - `leaveReview()` starts with `if (!isDesktop) return showStepOne()`, so a refused field returns to step 1 before it takes focus.
  - `handleSubmit`, after `if (focusFirstError()) return`: `if (isDesktop) return setReviewOpen(true)`, `if (step === 1) return moveToStep(2)`, `if (step === 3) void submitCheckout()`. Step 3 still checks every field, and the phone never opens the review dialog.
  - Each part takes its class beside Task 6's `data-checkout-part`. The attributes stay, and so does `data-step={step}` on the `<form>`, because `tests/checkout-form-rules.test.ts` pins them.
    - Section 1's wrapper is `data-checkout-part="asset" className={checkoutPhonePartClass("asset", step)}`. Sections 2 and 3 take `receiver` and `evidence` the same way.
    - The wrappers of the photo `Field` and the `SignaturePad` take `photo` and `signature`. The pad is now `tall`.
    - The date `Field` gets a wrapper div with `cn(checkoutPhonePartClass("dateField", step), !dateOpen && "max-lg:hidden")`, where `dateOpen = phoneDateOpen || Boolean(fieldErrors.errors.checkoutDate)`.
  - The phone parts (the form wraps the frame):
    - `CheckoutPhoneBar` (`stepsBar`) and then `CheckoutReadBack` (`readBack`) are the frame's first children, before section 1's wrapper.
      - The bar gets `cancelHref={cancelHref}`.
      - The read-back gets `receiverLabel={receiverLabel ?? ""}`, `components={checkoutComponents(values.asset).travelling}` and `deliveredByLabel`.
    - The date line (`dateLine`, plus `dateOpen && "hidden"`) goes before the date `Field`'s wrapper.
      - It reads `phoneDateToday` when `checkoutDate === toLocalDateInputValue()`, else `phoneDateOther`, with `formatCheckoutDay`.
      - Beside it, a ghost sm `Button` "เปลี่ยน" (`aria-label={t("phoneDateChange")}`) sets `phoneDateOpen`.
    - Right before section 3's wrapper comes `<p data-checkout-sign-statement>` (`statement`).
      - It holds `t(getCheckoutSignStatement({ checkoutType: values.checkoutType, travellingCount }).key, { tag, count, condition })`, where `travellingCount` (and `count`) is `checkoutComponents(values.asset).travelling.length`.
      - When `onBehalf`, a second line reads `t("signOnBehalf", { destination: receiverLabel })`.
    - After the pad comes `signLandscapeHint` (`statement`, plus `landscape:hidden`).
  - The phone footer, `<StickyFormFooter className={checkoutPhonePartClass("stepsFooter", step)}>`, follows `</OperationFormFrame>` and is the form's last child (DESIGN.md). The frame's own bar, `max-lg:hidden`, stays inside the frame.
    - Its children in THIS source order, because GD4 (`tests/form-migration-guards.test.ts:413-425`) reads the first `variant="outline"` and the first `type="submit"` across all of a bar's children and fails when the submit comes first:
      - step 2's pair first: `{step === 2 ? (<><Button type="button" variant="outline" onClick={() => moveToStep(1)}>{t("phoneFix")}</Button><Button type="button" onClick={() => moveToStep(3)}>{t("phoneAccept")}</Button></>) : null}`;
      - then step 1's submit: `{step === 1 ? <Button type="submit">{t("phoneNext")}</Button> : null}`;
      - then step 3's submit: `{step === 3 ? <Button type="submit" busy={saving}>{t("phoneSave")}</Button> : null}`. It does not use the old inline save's `className="w-full sm:w-auto"`, which Task 6's pin forbids.
    - Step 1's test (the source test of the form) adds: `const phoneBar = form.slice(form.indexOf('<StickyFormFooter className={checkoutPhonePartClass("stepsFooter", step)}>'), form.lastIndexOf("</StickyFormFooter>")); assert.ok(phoneBar.includes('variant="outline"') && phoneBar.indexOf('variant="outline"') < phoneBar.indexOf('type="submit"'), "GD4: phoneFix comes before the submits in the source")`.
  - `page.tsx`: `const user = await requirePagePermission(locale, "asset", "edit")` and `deliveredByLabel={getUserDisplayLabel(user)}`.
  - `tests/form-migration-guards.test.ts`, in `STICKY_FOOTER_ROUTES` after Task 5's frame row, add these two lines:
    ```ts
      // Group 3 plan 1 Task 7: the phone steps' own bar (P1-R4).
      [`${C}asset-operations/checkout-form.tsx`]: ["/th/asset-management/checkout"],
    ```

- [ ] **Step 6: E2E.**
  - `tx-words.ts` gains the exact Thai values: `phoneNext`, `phoneAccept`, `phoneFix`, `phoneSave`, `phoneCancelBack`, `phoneBackToCheck`, and `signOnBehalf: "รับในนามของ {destination}"`.
  - `forms.ts` gains `handoverForward(page: Page, device: E2eDevice): Promise<void>`, after Task 6's `reviewAndSave`.
    - On the phone it clicks the button `TX_WORDS.phoneNext` (exact). On the desktop it returns `reviewAndSave(page)`, so Task 6's forms.ts pin holds.
    - Its imports gain `import type { E2eDevice } from "../../support/matrix.ts"` and `import { TX_WORDS } from "../../transactions/tx-words.ts"`.
  - In field-errors.spec.ts's handover test:
    - Delete the `test.skip(e2eDevice === "phone", …)` line Task 6 put first. The fixture already takes `e2eDevice`, and `handoverForward` now uses it.
    - The forms import at `:7` drops `reviewAndSave` (now unused) and adds `handoverForward`. Add `import { TX_WORDS } from "../transactions/tx-words.ts"`.
    - Both forward presses become `await handoverForward(page, e2eDevice)`.
    - The review is `page.getByRole("dialog", { name: "ตรวจสอบก่อนส่งมอบ" })` on the desktop and `page.locator("[data-checkout-read-back]")` on the phone.
    - Inside `measure.timed`, the desktop clicks `{ name: "ยืนยันส่งมอบ" }`. The phone clicks `TX_WORDS.phoneAccept`, then `TX_WORDS.phoneSave`.
  - Rewrite `desk-delivery.spec.ts` (`asUser("itStaff")`, Chromium). Both tests open with the pinned phone-only skip.
    1. **"the desk delivery on the phone: step 1's checks, the read-back, a finger signature, the HO- document"**:
       - Keep `:29-40` (the asset page's `const primary = primaryAction(page, "phone")`, the tap, the one arrival wait).
       - `#checkout-phone-steps` contains "ขั้นที่ 1 จาก 3". The link `TX_WORDS.phoneCancelBack` is visible. The button "ตรวจสอบและบันทึก" is hidden.
       - Tap `next` (`TX_WORDS.phoneNext`): the errors show under `checkout-destination` ("กรุณาระบุข้อมูลนี้") and `checkout-handover-mode`, and focus is on `#checkout-destination`.
       - Pick receiver1 and มอบหมายใช้งานประจำ. The text `/^วันที่ส่งมอบ: วันนี้ /` is visible.
       - Fill the remark with the keyboard open, then `await expectReachable(next)`. Add the photo.
       - Tap `next`. The read-back contains the receiver's name, the tag, "รูปก่อนส่งมอบ 1 รูป", "มอบหมายใช้งานประจำ", "ใช้งานอยู่" and the remark. `await expect(page.getByRole("dialog")).toHaveCount(0)`. Record.
       - Tap `TX_WORDS.phoneFix`: `#checkout-destination` still holds the receiver. Tap `next`. `confirm` = `TX_WORDS.phoneAccept`: `await expectReachable(confirm)`, then tap it.
       - The statement contains `ข้าพเจ้าได้รับ ${asset.assetTag}` and "ในสภาพดี".
       - Sign the `pad`. Tap `TX_WORDS.phoneBackToCheck`, then `confirm`: the pad's "ล้างลายเซ็น" is disabled. Sign again.
       - `save` = `TX_WORDS.phoneSave`: `await expectReachable(save)`. Tap it while waiting for the POST: `receiverSignature` is stored.
       - Keep `:76-84` (the HO- page, the signature image, the print, In Use with the receiver).
       - Then `visit` `/th/asset-management/checkout?assetId=${asset.id}` ("a fresh handover form on the phone"). `pickedAsset(page, asset.id)` holds the tag, and `await expectFieldError(page, "checkout-asset", TX_WORDS.reasonNotReady)`. This is the blocked preselect on the phone (Appendix A ส่งมอบ); handover.spec.ts checks it on the desktop.
    2. **"a loan to a room on the phone: the due date is checked on step 1, the read-back says ถูกยืม, the statement reads รับในนามของ the room, and it saves unsigned"**:
       - Use `ensureSecondLocation()`, a new asset `"DSL"`, and `visit` to `?assetId=`.
       - Tap the text "ที่ตั้ง" in `#checkout-type`, then pick the room "code - name".
       - Fill the due date with `bangkokDate(-1)` and tap `next`. Expect the due-date error and focus. Fill `bangkokDate(7)` and tap `next`.
       - The read-back contains the room's name, "ยืมใช้ชั่วคราว", "ถูกยืม" and "กำหนดคืน". Tap accept.
       - The statement contains `TX_WORDS.signOnBehalf.replace("{destination}", label)`. Record.
       - Tap save without signing. The POST answers `handoverMode` `temporary_loan`, and the HO- page opens. The asset reads Checked Out, with `currentLocationId` the room's.

- [ ] **Step 7: Run the tests and see them pass.** Run the Step 2 command, then `node --test tests/file-evidence-ui.test.ts tests/dark-mode-p.test.ts tests/v-track2-o.test.ts tests/e2e-asset-detail.test.ts tests/form-migration-guards.test.ts tests/checkout-form-rules.test.ts tests/asset-handover-checkout.test.ts tests/form-frames-ui.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts`. Expected: all pass.

- [ ] **Step 8: The repo checks.** `npm test`, `npx tsc --noEmit`, `npm run lint`: no failures, 0 lint errors. A pin outside this task's list that fails is rewritten in this commit and named in the report.

- [ ] **Step 9: Commit.**
```
git add src/lib/checkout-phone-steps.ts src/lib/signature-pad-size.ts src/lib/field-focus.ts src/components/asset-operations/checkout-phone-steps.tsx src/components/asset-operations/checkout-form.tsx src/components/asset-operations/operation-form-frame.tsx src/components/asset-operations/signature-pad.tsx "src/app/[locale]/(dashboard)/asset-management/checkout/page.tsx" messages/th.json messages/en.json e2e/transactions/desk-delivery.spec.ts e2e/transactions/tx-words.ts e2e/cross-cutting/support/forms.ts e2e/cross-cutting/field-errors.spec.ts tests/checkout-phone-steps.test.ts tests/e2e-transactions.test.ts tests/v-track-f.test.ts tests/operation-form-parts-ui.test.ts tests/e2e-cross-cutting.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(checkout): on the phone the handover is three steps in one form: the asset and receiver, the receiver reads it back, the receiver signs, and it saves and opens the HO- document (group 3 spec §7.4, P1-R4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### Open issues (Task 7)
- **The double checkout no longer runs on the phone.** handover.spec.ts stays desktop only, through Task 6's four `PHONE_STEPS` skips, because on the phone its footer and review dialog are hidden. On the phone, the handover is covered by desk-delivery's two tests (a permanent handover with step-1 errors, the read-back, a re-sign and the blocked preselect; a loan to a room) and by field-errors' phone path (this task removes Task 6's skip there). The double checkout runs on the desktop only (the same route).
- The skeleton lists "dept/room destination" as step 1 parts, which fits. The spec puts the photo before the date line and the remark. In one DOM (P1-R4), section 3's photo comes after section 2's date and remark.
- Spec §7.4 step 1's "ส่วนควบไปด้วย N รายการ: …" is served on the phone by section 1's own "ส่วนควบที่จะส่งมอบไปด้วย N รายการ" list (one DOM, P1-R4; ruling P1-R9). No new key.
- *My reading* of "รับในนามของ": a second line under the statement, not a replacement. The board's name and date inside the pad are not built (no field for the person signing, spec §7.4).
- The back labels on steps 2-3 ("ย้อนกลับไปแก้ไข", "ย้อนกลับไปขั้นตรวจ") are the board's words; the spec says only "one step back". Going back from step 3 wipes the signature. The pad now drops the stored signature whenever a resize wipes its canvas. This also fixes a desktop/checkin case: before, a resized pad looked blank but still saved the old stroke.
- Between md and lg (tablets) the steps show, as the shell is in phone mode there.
- ผู้ส่งมอบ is the signed-in user's `getUserDisplayLabel`, a new page prop.

---

### Task 8: E2E of the department after a handover and of the multi-word search, the docs, and the targeted run (spec §6, §11, §17)

One new spec drives ส่งมอบ on both devices and reads the department back from the asset. It checks that a บุคคล asset takes the receiver's department, that a ส่วนกลาง asset keeps its own whether it goes to an employee or to a department (P1-R2), and that a search of name words plus a department word finds the asset.

The refusal of an inactive destination is not driven: it needs a master-data change, and Task 2's unit tests cover it. Then come the docs and the controller's targeted run. Line numbers are master's (`533521fa`). Tasks 6-7 may have moved blocks of `tx-support.ts` and `tx-words.ts`, and Tasks 3, 6 and 7 move the tests after TX1 in `tests/e2e-transactions.test.ts`, so each block is also named by its content.

**Files:**
- Create: `e2e/transactions/handover-department.spec.ts`
- Modify: `e2e/transactions/tx-plan.ts`: add `MasterDepartment`, `chooseSecondDepartment` and `departmentWord` after `secondLocation` (`:32-35`).
- Modify: `e2e/transactions/tx-support.ts`:
  - imports `:5-12`;
  - `createAsset` `:51-75` and `createTxAsset` `:77-81`;
  - `AssetRead` `:106-114`;
  - new: `readSecondDepartment` after `ensureSecondLocation` (`:122-137`), `expectNoAssetFound` after `pickedAsset` (`:190-192`), and `saveHandoverForm` after `expectPrints` (`:256-267`).
- Modify: `e2e/transactions/tx-words.ts:4-10`: two keys.
- Test: `tests/e2e-transactions.test.ts`: TX1 after `:34` (the `secondLocation` line); TX7's `readdirSync` list (`:264-266` on master; it breaks because it lists every spec of the area); a new test at the end.
- Pins that still pass:
  - `e2e-transactions.test.ts:288-293`: the spec picks through `findAssetRow` and `pickedAsset`, never `locator("#checkout-asset")`.
  - `e2e-transactions.test.ts:294-301`: the new TX_WORDS values exist in `messages/th.json`.
  - TX3's admin lines (`e2e-transactions.test.ts:178-181` on master): `ensureSecondLocation` and its `request.newContext(...)` stay as they are.
  - `e2e-suite.test.ts:315-328`: no `@playwright/test` import in a spec.
  - `e2e-review.test.ts:89-104`: no DELETE, and the seed admin's GET of `/api/departments` names no hazard.
  - `e2e-asset-detail.test.ts:35-37`.
- Docs: `docs/99_CHANGELOG.md:7`; `DEVELOPER_HANDOFF.md:1276`, `:1277`, `:1279`, after `:1282`; `docs/05_ASSET_LIFECYCLE.md:55`, `:94`, `:109`, after `:110`, `:157`; `docs/06_WORKFLOWS.md:47`, `:53`; `docs/07_UAT_CHECKLIST.md` before `:558`; `docs/11_FEATURE_LIST.md:143`; `docs/12_HANDOUT.md:44`.

**Interfaces:**
- Consumes:
  - **Run data:** every run employee sits in the run's department (`e2e/setup/run-data.setup.ts:98`), and `createAsset` writes that department too (`tx-support.ts:64`). The department is `runRecords(runId).department = { code: \`${runId}-D\`, name: \`${runId} แผนกทดสอบ E2E\` }` (`e2e/support/run-plan.ts:83`). `readRunData()` gives `companyId` and `departmentId` (`e2e/support/state.ts:32-39`).
  - **Assets:** `GET /api/assets/[id]` returns `departmentId` and `department: { code, name }` (`src/app/api/assets/[id]/route.ts:23,37-47`). `POST /api/assets` checks neither the department's company nor its ownership (`src/app/api/assets/route.ts:52-130`).
  - **Departments (read only):**
    - `GET /api/departments` answers every active department with its own fields (`id`, `code`, `name`, `companyId`) and its company (`src/app/api/departments/route.ts:9-45`).
    - It needs `department:view`, which IT staff lack (`e2e/support/run-plan.ts:12-18`). So the helper reads it as the seed admin, as the global setup reads departments (`e2e/global-setup.ts:53`) and `ensureSecondLocation` reads rooms (`tx-support.ts:122-137`).
    - `departments.code` is unique and `companyId` is optional (`prisma/schema.prisma:64,66`). The new asset form offers a department with no company or with the asset's company (`src/components/assets/asset-form.tsx:454-456`).
  - **Picker and history:** with no rows, the picker shows `assetOperation.notFound` "ไม่พบทรัพย์สินที่ตรงกับคำค้น" and no listbox (`asset-operation-picker.tsx:334-345`). `asset.movementTypes.department_change` is "เปลี่ยนแผนก", and the history shows one event per movement (`src/lib/asset-history.ts:187`).
  - **Task 2:** the route writes `getCheckoutNextDepartmentId`'s value, and a `department_change` movement when it changes.
  - **Task 3:** the search splits its text into at most 5 words and also searches the asset's department name; the picker marks each word in the row's tag and name.
  - **Task 5:** the card's root is `[data-slot="operation-summary-card"]`.
  - **Task 6 (desktop):**
    - The `Segmented` buttons พนักงาน / แผนก / ที่ตั้ง (aria-pressed buttons in a role group, `src/components/ui/segmented.tsx:50-72`) sit inside the FieldGroup `#checkout-type`.
    - `#checkout-destination` takes an employee or a department. The radios of `#checkout-handover-mode` choose the mode. `#checkout-expected-return` takes the due date.
    - The native radios of `#checkout-condition` start on the asset's condition. Read them with `conditionChip(page, label)` (`tx-support.ts`, added by Task 6).
    - The summary lists the asset's department and never the chosen department for a ส่วนกลาง asset. Its checklist shows labels only.
    - "ตรวจสอบและบันทึก" opens the dialog "ตรวจสอบก่อนส่งมอบ", whose "ยืนยันส่งมอบ" saves. The HO- page then opens.
  - **Task 7 (phone):** "ถัดไป: ให้ผู้รับตรวจ" → "ถูกต้อง ลงชื่อรับ" → "บันทึกการส่งมอบ" saves with no dialog. The footer and the summary are hidden.
- Produces:
  ```ts
  // e2e/transactions/tx-plan.ts (pure, no imports)
  export type MasterDepartment = { id: string; code: string; name: string; companyId: string | null }
  export function chooseSecondDepartment(departments: readonly MasterDepartment[], run: { departmentId: string; companyId: string }): MasterDepartment | undefined
  export function departmentWord(name: string, notIn: readonly string[]): string
  // e2e/transactions/tx-support.ts
  export type CreateAssetOptions = { ownershipType?: "personal" | "shared"; departmentId?: string }
  export async function createAsset(page: Page, masters: AssetMasters, tag: string, name: string, options: CreateAssetOptions = {}): Promise<CreatedAsset>
  export async function createTxAsset(page: Page, masters: AssetMasters, projectName: string, key: string, label: string, options: CreateAssetOptions = {})
  export type AssetRead = { /* today's fields */ departmentId: string | null; department: { code: string; name: string } | null }
  export async function readSecondDepartment(): Promise<{ id: string; code: string; name: string }>
  export async function expectNoAssetFound(page: Page, fieldId: string, text: string)
  export async function saveHandoverForm(page: Page, device: E2eDevice, assetId: string): Promise<{ id: string; documentNo: string }>
  // e2e/transactions/tx-words.ts, TX_WORDS gains:
  searchNotFound: "ไม่พบทรัพย์สินที่ตรงกับคำค้น", departmentChange: "เปลี่ยนแผนก",
  ```

**Decisions:**
- **An existing department, never a new one (the controller's ruling):**
  - Why: every run employee sits in the run's department, and `createAsset` writes that department on every asset. A handover to a run employee therefore shows no change unless the asset starts somewhere else.
  - Which: tests 1-3 start their assets in an active department of the dev master data that is not the run's. `chooseSecondDepartment` keeps only the departments the new asset form offers for the run's company, never the run's own or any E2E run's (codes starting `E2E-`). From those it takes code `IT` first, else the first by code.
  - How it is read: `readSecondDepartment` reads the list as the seed admin with a GET. The E2E makes no department.
- **Both devices use the form:** `saveHandoverForm` takes each device's path. The summary is read on the desktop only (P1-R4). There is no photo and no signature: both are optional, and `handover.spec.ts` covers them.
- **Multi-word text:**
  - The search is the asset's name (run id, project code, label) plus one word of its department's name, 4 words in all. Only that asset matches.
  - The negative swaps the last word for a word of the second department's name. `departmentWord` picks the longest word that the asset's tag, its name and the run's department name do not hold, compared without case. That word could match only through a department.
- **Data:** 4 assets per project (16 per run), never deleted. No department is made. DR2 and DR3 (8 per run) stay in the existing department on dev; DR1 moves to the run's.

- [ ] **Step 1: Write the failing pins** in `tests/e2e-transactions.test.ts`:
  - TX1, after `:34` (the `secondLocation` line):
```ts
  // The department tests' assets start in an existing department (group 3 plan 1 task 8): IT first, else the first by code,
  // among those the asset form offers for the run's company; never the run's own nor another run's. The run makes none.
  const departments = [
    { id: "d-run", code: "E2E-1019A-D", name: "E2E-1019A แผนกทดสอบ E2E", companyId: "c1" },
    { id: "d-old", code: "E2E-1018B-D", name: "E2E-1018B แผนกทดสอบ E2E", companyId: "c1" },
    { id: "d-other", code: "ADM", name: "ธุรการ", companyId: "c2" },
    { id: "d-hr", code: "HR", name: "ทรัพยากรบุคคล", companyId: null },
    { id: "d-acc", code: "ACC", name: "บัญชี", companyId: "c1" },
    { id: "d-it", code: "IT", name: "เทคโนโลยีสารสนเทศ", companyId: "c1" },
  ]
  const run = { departmentId: "d-run", companyId: "c1" }
  assert.equal(plan.chooseSecondDepartment(departments, run)?.id, "d-it")
  assert.equal(plan.chooseSecondDepartment(departments.filter((department) => department.code !== "IT"), run)?.id, "d-acc")
  assert.equal(plan.chooseSecondDepartment(departments.filter((department) => !["IT", "ACC"].includes(department.code)), run)?.id, "d-hr")
  assert.equal(plan.chooseSecondDepartment(departments.slice(0, 3), run), undefined)
  // The negative search's word: one of the other department's name that the asset's own text does not hold.
  assert.equal(plan.departmentWord("ฝ่าย เทคโนโลยีสารสนเทศ", ["E2E-1019A-DL-MW1", "E2E-1019A DL โน้ตบุ๊กค้นหาหลายคำ", "E2E-1019A แผนกทดสอบ E2E"]), "เทคโนโลยีสารสนเทศ")
  assert.equal(plan.departmentWord("e2e IT", ["E2E-1019A-DL-MW1"]), "IT")
  assert.throws(() => plan.departmentWord("dl", ["E2E-1019A DL โน้ตบุ๊ก"]), /every word/)
```
  - TX7's `readdirSync` list (`:264-266` on master) becomes `"bulk-move.spec.ts", "cancel.spec.ts", "desk-delivery.spec.ts", "findings.spec.ts", "handover-department.spec.ts", "handover.spec.ts", "register-asset.spec.ts", "return.spec.ts", "transfer.spec.ts"`. The sort puts `-` before `.`.
  - Add at the end:
```ts
test("ส่งมอบ gives a บุคคล asset the receiver's department, a ส่วนกลาง asset keeps its own, and a search of name words and a department word finds the asset (group 3 plan 1 task 8)", () => {
  const spec = readTxSpec("e2e/transactions/handover-department.spec.ts")
  const support = read("e2e/transactions/tx-support.ts")
  for (const signature of [
    'export type CreateAssetOptions = { ownershipType?: "personal" | "shared"; departmentId?: string }',
    "export async function readSecondDepartment(): Promise<{ id: string; code: string; name: string }>",
    "export async function expectNoAssetFound(page: Page, fieldId: string, text: string)",
    "export async function saveHandoverForm(page: Page, device: E2eDevice, assetId: string): Promise<{ id: string; documentNo: string }>",
  ]) assert.ok(support.includes(signature), signature)
  // The second department is an existing one, read as the seed admin and chosen by the plan's rule; the E2E makes no department.
  const readStart = support.indexOf("export async function readSecondDepartment(")
  const readSecond = support.slice(readStart, support.indexOf("\nexport ", readStart + 1))
  assert.ok(readSecond.includes('admin.get("/api/departments")'), "read through the department API")
  assert.ok(readSecond.includes("chooseSecondDepartment("), "chosen by chooseSecondDepartment")
  for (const [file, source] of [["tx-support.ts", support], ["handover-department.spec.ts", spec]]) assert.doesNotMatch(source, /\.post\(\s*["'`]\/api\/departments/, file)
  // The desktop saves through the footer and the review, the phone through its three steps (spec §7.3, §7.4).
  const start = support.indexOf("export async function saveHandoverForm(")
  const save = support.slice(start, support.indexOf("\nexport ", start + 1))
  const at = ["ตรวจสอบและบันทึก", "ตรวจสอบก่อนส่งมอบ", "ยืนยันส่งมอบ", "ถัดไป: ให้ผู้รับตรวจ", "ถูกต้อง ลงชื่อรับ", "บันทึกการส่งมอบ"].map((word) => save.indexOf(`"${word}"`))
  assert.ok(at.every((index, i) => index >= 0 && (i === 0 || index > at[i - 1])), "both paths, in order")
  assert.ok(save.indexOf("page.waitForResponse(") < at[0], "the wait is set before the first click")
  assert.equal(spec.split("await readSecondDepartment()").length - 1, 4)
  assert.ok(spec.includes("expect(after.departmentId).toBe(data.departmentId)"))
  assert.equal(spec.split("expect(after.departmentId).toBe(second.id)").length - 1, 2)
  assert.equal(spec.split('ownershipType: "shared"').length - 1, 2)
  assert.ok(spec.includes('await expect(page.getByRole("main")).toContainText(TX_WORDS.departmentChange)'))
  // The summary is read on the desktop only (P1-R4); for a ส่วนกลาง asset it never shows the chosen department (P1-R2).
  assert.equal(spec.split('if (e2eDevice === "desktop")').length - 1, 3)
  assert.equal(spec.split(`const summary = page.locator('[data-slot="operation-summary-card"]')`).length - 1, 3)
  assert.equal(spec.split("await expect(summary).not.toContainText(runDepartment.name)").length - 1, 2)
  assert.ok(spec.includes('await page.locator("#checkout-type").getByRole("button", { name: "แผนก", exact: true }).click()'))
  assert.ok(spec.includes('await findAssetRow(page, "checkout-asset", `${asset.name} ${RUN_DEPARTMENT_WORD}`, asset.assetTag)'))
  assert.ok(spec.includes("const secondWord = departmentWord(second.name, [asset.assetTag, asset.name, runDepartment.name])"))
  assert.ok(spec.includes('await expectNoAssetFound(page, "checkout-asset", `${asset.name} ${secondWord}`)'))
  for (const banned of ["request.delete", "/api/admin/settings", "/api/departments", "ldap", "isactive: false"]) assert.ok(!spec.toLowerCase().includes(banned), banned)
})
```

- [ ] **Step 2: Run the pins and see them fail.** Run `node --test tests/e2e-transactions.test.ts`. Expected: 3 tests fail: TX1 (`plan.chooseSecondDepartment is not a function`), TX7 (the list), and the new test (ENOENT).

- [ ] **Step 3: The helpers.**
  - `tx-plan.ts`, after `secondLocation` (it stays pure and imports nothing):
```ts
// The department the department tests' assets start in (group 3 plan 1 task 8): an existing active department of the
// master data, so a handover to a run employee (every one sits in the run's department) shows a change. The run makes
// no department for it. Only one the new asset form offers for the run's company (no company, or that one:
// asset-form.tsx filteredDepartments), never the run's own nor any E2E run's (their codes start "E2E-"); code IT first
// (departments.code is unique), else the first by code.
export type MasterDepartment = { id: string; code: string; name: string; companyId: string | null }
export function chooseSecondDepartment(departments: readonly MasterDepartment[], run: { departmentId: string; companyId: string }): MasterDepartment | undefined {
  const offered = departments.filter((department) =>
    department.id !== run.departmentId && !department.code.toUpperCase().startsWith("E2E-") && (!department.companyId || department.companyId === run.companyId),
  )
  return offered.find((department) => department.code === "IT") ?? [...offered].sort((left, right) => left.code.localeCompare(right.code))[0]
}

// One word of another department's name, for the multi-word search's negative: the longest word that none of the
// asset's own texts holds, compared without case as the database's collation compares, so it could match only through
// a department.
export function departmentWord(name: string, notIn: readonly string[]): string {
  const held = notIn.map((text) => text.toLowerCase())
  const word = name
    .split(/\s+/)
    .filter((part) => part !== "" && !held.some((text) => text.includes(part.toLowerCase())))
    .sort((left, right) => right.length - left.length)[0]
  if (!word) throw new Error(`every word of the department name "${name}" is in the asset's own text`)
  return word
}
```
  - `tx-words.ts`: add the two keys.
  - `tx-support.ts`:
    - Imports: `chooseSecondDepartment` and `type MasterDepartment` from `./tx-plan.ts`. Add `TX_WORDS` from `./tx-words.ts` unless Task 6 or 7 already imports it.
    - `createAsset` gains `options: CreateAssetOptions = {}`. It sends `ownershipType: options.ownershipType ?? "personal"` and `departmentId: options.departmentId ?? data.departmentId`, and its comment says so. `createTxAsset` passes `options` through.
    - `AssetRead` gains its two fields.
    - `readSecondDepartment`, after `ensureSecondLocation` and shaped like it:
```ts
// The department the department tests' assets start in (group 3 plan 1 task 8): an existing one of the master data,
// chosen by chooseSecondDepartment (tx-plan.ts). IT staff have no department:view, so the seed admin reads the list with
// a GET, as the global setup reads departments. The E2E makes no department.
export async function readSecondDepartment(): Promise<{ id: string; code: string; name: string }> {
  const { baseURL } = readRunState()
  const admin = await request.newContext({ baseURL, storageState: fromRoot(ADMIN_STATE_FILE) })
  try {
    const response = await admin.get("/api/departments")
    if (response.status() !== 200) throw new Error(`GET /api/departments answered ${response.status()}: ${(await response.text()).slice(0, 300)}`)
    const chosen = chooseSecondDepartment((await response.json()) as MasterDepartment[], readRunData())
    if (!chosen) throw new Error("the dev data has no active department, other than the run's, that the asset form offers for the run's company (code IT first): the department tests need one")
    return { id: chosen.id, code: chosen.code, name: chosen.name }
  } finally {
    await admin.dispose()
  }
}
```
    - `expectNoAssetFound`: set the wait for the answer to exactly `text` before the fill, as `searchAssets` does, and expect 200. Then expect `#<fieldId>-listbox` to have count 0 and `page.getByText(TX_WORDS.searchNotFound, { exact: true }).first()` to be visible (the live region repeats it).
    - `saveHandoverForm`:
      - Set `page.waitForResponse` for the POST to `/api/assets/${assetId}/checkout` first.
      - Desktop: click the button "ตรวจสอบและบันทึก" (exact), then "ยืนยันส่งมอบ" in the dialog "ตรวจสอบก่อนส่งมอบ".
      - Phone: click "ถัดไป: ให้ผู้รับตรวจ", "ถูกต้อง ลงชื่อรับ", "บันทึกการส่งมอบ".
      - Then expect 201 (show the body's first 300 characters on failure), wait for `/th/asset-management/checkouts/${id}`, and return `{ id, documentNo }`.

- [ ] **Step 4: The spec `e2e/transactions/handover-department.spec.ts`.**
  - **Header comment:** spec §6, §11, §17. Say why the assets start in an existing department other than the run's (the run makes none), and that the inactive destination is left to Task 2's unit tests.
  - **Imports:**
    - `asUser, expect, test` from `../support/fixtures.ts`; `runRecords` from `../support/run-plan.ts`; `readRunData, readRunState` from `../support/state.ts`;
    - `bangkokDate, departmentWord` from `./tx-plan.ts`;
    - `conditionChip, createTxAsset, expectNoAssetFound, findAssetRow, pickedAsset, pickSearchable, readAsset, readAssetMasters, readSecondDepartment, record, saveHandoverForm, visit, visitAssetPage` from `./tx-support.ts`;
    - `TX_WORDS` from `./tx-words.ts`.
  - **Setup:** `asUser("itStaff")` and `const RUN_DEPARTMENT_WORD = "แผนกทดสอบ"`. Each test reads `const second = await readSecondDepartment()` and `const runDepartment = runRecords(readRunState().runId).department`.
  - **Test 1 (DR1, receiver1):**
```ts
test("a บุคคล asset handed to an employee takes the employee's department, shown before the save and kept in the history (spec §6)", async ({ page, measure, e2eDevice }, testInfo) => {
  const data = readRunData()
  const receiver = data.employees.receiver1
  const runDepartment = runRecords(readRunState().runId).department
  const second = await readSecondDepartment()
  const asset = await createTxAsset(page, await readAssetMasters(page), testInfo.project.name, "DR1", "โน้ตบุ๊กแผนกตามผู้รับ", { departmentId: second.id })
  await visit(measure, `/th/asset-management/checkout?assetId=${asset.id}`, "handover form, an asset of another department", testInfo)
  await expect(pickedAsset(page, asset.id)).toContainText(asset.assetTag)
  await pickSearchable(page, "checkout-destination", receiver.code, `${receiver.code} - ${receiver.fullNameTh}`)
  await page.getByRole("radio", { name: /มอบหมายใช้งานประจำ/ }).check()
  await expect(conditionChip(page, "ดี")).toBeChecked()
  if (e2eDevice === "desktop") {
    const summary = page.locator('[data-slot="operation-summary-card"]')
    await expect(summary).toContainText(second.name)
    await expect(summary).toContainText(runDepartment.name)
    await record(measure, "handover summary, the department follows the receiver", testInfo)
  }
  await saveHandoverForm(page, e2eDevice, asset.id)
  const after = await readAsset(page, asset.id)
  expect(after.departmentId).toBe(data.departmentId)
  expect(after.custodianId).toBe(receiver.id)
  expect(after.status.name).toBe("In Use")
  await visitAssetPage(measure, asset.id, "asset history after the department moved", testInfo, "history")
  await expect(page.getByRole("main")).toContainText(TX_WORDS.departmentChange)
})
```
  - **Test 2: "a ส่วนกลาง asset handed to an employee keeps its department (P1-R2)".**
    - DR2, "จอส่วนกลางคงแผนก", `{ ownershipType: "shared", departmentId: second.id }`, receiver2, มอบหมายใช้งานประจำ.
    - Desktop (`if (e2eDevice === "desktop")`): `const summary = page.locator('[data-slot="operation-summary-card"]')`, then `await expect(summary).toContainText(second.name)` and `await expect(summary).not.toContainText(runDepartment.name)`. The card must not promise the receiver's department.
    - After: `expect(after.departmentId).toBe(second.id)`, the custodian is receiver2, and the status is `In Use`.
  - **Test 3: "a ส่วนกลาง asset lent to a department keeps its department (P1-R2)".**
    - DR3, "โปรเจกเตอร์ส่วนกลางให้แผนก", with the same options.
    - The steps:
      1. `await page.locator("#checkout-type").getByRole("button", { name: "แผนก", exact: true }).click()`
      2. `pickSearchable(page, "checkout-destination", runDepartment.code, \`${runDepartment.code} - ${runDepartment.name}\`)`
      3. `#checkout-expected-return` = `bangkokDate(7)`
    - Desktop (`if (e2eDevice === "desktop")`):
      - `const summary = page.locator('[data-slot="operation-summary-card"]')`;
      - `await expect(summary).toContainText(second.name)`;
      - `await expect(summary).not.toContainText(runDepartment.name)`. The card must not promise the chosen department (P1-R2). Its checklist shows labels only.
      - Then `record(measure, "handover summary, a ส่วนกลาง asset to a department", testInfo)`.
    - After: `expect(after.departmentId).toBe(second.id)`, the status is `Checked Out`, and `custodianId` is null.
  - **Test 4: "a search of the name's words and a department word finds the asset on ส่งมอบ, and another department's word does not (spec §11, P1-R6)".**
    - MW1, "โน้ตบุ๊กค้นหาหลายคำ", in the run's department (no options).
    - `visit` `/th/asset-management/checkout` ("handover form, no asset yet"), then `const row = await findAssetRow(page, "checkout-asset", \`${asset.name} ${RUN_DEPARTMENT_WORD}\`, asset.assetTag)`.
    - The row is not `aria-disabled="true"`, and `await expect(row.locator("mark", { hasText: "โน้ตบุ๊กค้นหาหลายคำ" })).toHaveCount(1)`.
    - Then `record(measure, "handover picker, a multi-word answer", testInfo)`.
    - The negative: `const secondWord = departmentWord(second.name, [asset.assetTag, asset.name, runDepartment.name])`, then `await expectNoAssetFound(page, "checkout-asset", \`${asset.name} ${secondWord}\`)`.

- [ ] **Step 5: Run the pins and see them pass.** Run `node --test tests/e2e-transactions.test.ts tests/e2e-suite.test.ts tests/e2e-review.test.ts tests/e2e-asset-detail.test.ts`. Expected: PASS.

- [ ] **Step 6: Run the repo checks.** Run `npm test && npx tsc --noEmit && npm run lint`. Expected: PASS with 0 lint errors (`tsc` covers `e2e/`).

- [ ] **Step 7: Commit the E2E.**
```bash
git add e2e/transactions/handover-department.spec.ts e2e/transactions/tx-plan.ts e2e/transactions/tx-support.ts e2e/transactions/tx-words.ts tests/e2e-transactions.test.ts
git commit -m "test(e2e): ส่งมอบ reads the department back from the asset (a บุคคล asset takes the receiver's, a ส่วนกลาง asset keeps its own to an employee and to a department, the history shows เปลี่ยนแผนก), a search of name words and a department word finds the asset, and the department tests start their assets in an existing department, IT first (the run makes none) (group 3 plan 1 task 8)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 8: The docs.** Name every file, code and word as Tasks 1-7 committed them (read `git log --stat master..HEAD`, then the files). Leave no template markers (`tests/e2e-docs.test.ts:34`, `tests/shell-docs.test.ts:36`).
  - **`docs/99_CHANGELOG.md`:** under the commit date's `## ` heading (add one above `:7`), add `### กลุ่มหน้า 3 แผน 1: กฎแผนกของทรัพย์สินและหน้าส่งมอบ`. It covers:
    - the branch, spec and plan;
    - the department rule: `getCheckoutNextDepartmentId`, ส่วนกลาง keeps its department, components follow, `department_change`, and an HO- cancel restores it;
    - `ASSET_CHECKOUT_DESTINATION_INACTIVE`;
    - ทรัพย์สินอื่น dropped: the schema answers 400, old records stay readable, and the messages removed and kept;
    - multi-word search: at most 5 words, both department names, a mark per word;
    - `detail=1` and the employee options with the held count;
    - the shared parts with their paths;
    - ส่งมอบ on the desktop and the phone's three steps;
    - E2E: this spec and its helpers; +16 assets per run and no department, since the department tests start in an existing one, IT first;
    - "เรื่องที่ผู้ใช้ควรตรวจ": spec §14 calls 1, 2, 5, 6, 7, 8, 15 and 21, and "ตรวจสอบและบันทึก" (P1-R7);
    - "ยังไม่ deploy · ไม่มี migration".

    The controller adds "ผล E2E".
  - **`DEVELOPER_HANDOFF.md`:**
    - In `:1276`, `:1277` and `:1279`, add "(gone since page group 3 plan 1, below)" after the first mention of `getCheckoutParentVerdict`, `ASSET_CHECKOUT_DESTINATION_NOT_ALLOWED` and `checkoutParent`. These bullets are dated, so nothing is deleted.
    - After `:1282`, add a bullet "Page group 3, plan 1: shared rules and ส่งมอบ." in the server-search bullet's shape (date, branch, not deployed, no migration, spec, plan), with **Department rule**, **Checkout route**, **Search**, **Shared parts**, **ส่งมอบ**, **E2E** and **Calls for the user to check**.
  - **`docs/05_ASSET_LIFECYCLE.md`:**
    - `:55` → "Temporary loan to an employee, department or location"; `:94` loses ", or another asset"; `:157` → "Employee, department, or location".
    - `:109`: the ทรัพย์สินอื่น clause becomes "refuses an unknown or inactive employee, department or location (409 `ASSET_CHECKOUT_DESTINATION_INACTIVE` under the destination field); the `asset` destination type is refused by the schema (400), and old ทรัพย์สินอื่น handovers stay readable".
    - After `:110`, add a bullet on `getCheckoutNextDepartmentId` (`src/lib/asset-department-rule.ts`), which sets the department:
      - to an employee's department or the chosen department; unchanged for a location; a ส่วนกลาง asset keeps its own;
      - components follow, a change writes `department_change` (referenceType `checkout`), and cancelling the HO- restores it.
  - **`docs/06_WORKFLOWS.md`:**
    - After `:47`, describe the ส่งมอบ page:
      - three sections, "สรุปก่อนบันทึก", and "ตรวจสอบและบันทึก" then the review;
      - ยกเลิก goes to `returnTo` or the register;
      - destinations พนักงาน / แผนก / ที่ตั้ง, the department rule, and the components going along;
      - the phone's three steps, where step 2 replaces the review.
    - In `:53`, add one sentence: the text splits on spaces (≤5 words), each word must match one field (the asset's and the holder's department names included), and the code tiers use the whole text.
  - **`docs/07_UAT_CHECKLIST.md`**, before `## Sign-Off` (`:558`): add `## Transactions Group 3 Plan 1 UAT (ส่งมอบ, YYYY-MM-DD)` with the commit date written in. Open with what E2E covers (this spec, `handover.spec.ts`, `desk-delivery.spec.ts`), then:
    - [ ] desktop 1440, both themes: sections, summary rows (bold when changed), checklist, footnote, footer line, ยกเลิก; the summary's แผนก equals what is saved for Stock to a department and any asset to a room;
    - [ ] a computer with components: the "ไปด้วย" list, a component with its own handover left behind, the components' holder and department after saving; the receiver's hint counts it once;
    - [ ] the chips offer every selectable master condition and start on the asset's;
    - [ ] phone (iOS Safari, Android Chrome): the three steps, ยกเลิกและกลับ, step back, "รับในนามของ" for a department or room, landscape signing, the HO- opens;
    - [ ] on dev, a deactivated employee, department or room is refused under its field; an old ทรัพย์สินอื่น handover reads on HO-, RT-, history and the return search; a cancelled HO- restores the department;
    - [ ] "notebook บัญชี" on ส่งมอบ, รับคืน and โอนย้าย, with a 6th word ignored;
    - [ ] NVDA and VoiceOver on the Segmented, the chips, the summary and the steps; an English pass.
  - **`docs/11_FEATURE_LIST.md:143`:** "Handover to employee, department, or location; the department follows the receiver for บุคคล and Stock assets".
  - **`docs/12_HANDOUT.md:44`:** "ส่งมอบทรัพย์สินให้พนักงาน แผนก หรือที่ตั้ง แผนกของทรัพย์สินบุคคลและ Stock เปลี่ยนตามผู้รับ".

- [ ] **Step 9: Run the checks and commit the docs.** Run `npm test && npx tsc --noEmit && npm run lint`. Expected: PASS. The docs pins (`e2e-docs`, `shell-docs`, `phase2d-docs`, `dark-mode-docs`, `v-track-docs`, `audit-round-cancellation`) still find their text.
```bash
git add docs/99_CHANGELOG.md DEVELOPER_HANDOFF.md docs/05_ASSET_LIFECYCLE.md docs/06_WORKFLOWS.md docs/07_UAT_CHECKLIST.md docs/11_FEATURE_LIST.md docs/12_HANDOUT.md
git commit -m "docs: page group 3 plan 1 (the department rule, ทรัพย์สินอื่น dropped for new handovers, multi-word search, the ส่งมอบ page and its phone steps): changelog, handoff, lifecycle rules, workflows, UAT, feature list, handout (group 3 plan 1 task 8)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 10 (the controller): the targeted run.**
  - **Before the run:** the VPN, `scratchpad/stay-awake.ps1`, the DB probe (`scratchpad/e2e-plan/tools/select-e2e-counts.cjs`), and a clean build (`rm -rf .next && npm run build`).
  - **The run:** `npx playwright test e2e/transactions e2e/cross-cutting/field-errors.spec.ts e2e/asset-detail e2e/smoke`. Expected: every test passes in all four projects, with axe 0. The new spec runs 4 tests per project. The whole suite waits for the end of group 3 (spec §17).
  - **Docs:** add "ผล E2E" (the run id, and passed / failed / skipped per project) to the changelog entry, and the run id to the handoff bullet, in one commit.
  - **Wiki:**
    - Update `ams-status`, `ams-open-questions` (decisions 1, 3 and 10 settled; spec §15's other holder paths opened for their page groups) and `ams-log`.
    - Then run `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` (at `D:\Obsidian\Eltross`) and commit the vault with `ingest:`.

**Open issues (Task 8 against the skeleton):**
1. **The second department comes from the dev data.** `readSecondDepartment` stops the test with a message naming the gap when the dev master data holds no suitable department. A suitable one is active, is not the run's, and is offered by the new asset form for the run's company. The tests leave DR2 and DR3 (8 assets per run) in that department on dev (IT when it is there), and DR1 moves to the run's department. Like every E2E asset, they carry the run id in their tag and name.
2. **One destination id.** This task assumes Task 6 keeps one `#checkout-destination` for the employee and department pickers, as master does (`checkout-form.tsx:324-335`) and as Task 6's section 2 describes. If Task 6 splits them, test 3 uses the new id.

---

## Appendix: rulings (P1-R1 to P1-R9)

- **P1-R1:** spec §18 put the transfer route's department rule and the §12 setting in plan 1. Plan 1 does neither. The transfer route's rule lands in plan 3 with the transfer form, so the page never offers a department the server would refuse. The setting lands in plan 2, where checkin first reads it. Plan 1 creates the shared rule module with the checkout rule only; plans 2-3 add theirs to the same module. Cost if wrong: none; both arrive before the group ends.
- **P1-R2:** a ส่วนกลาง (shared) asset keeps its department on every checkout, including a checkout to a department (spec §6, decision 10). Today a checkout to a department writes the chosen department for any ownership; this changes for shared only.
- **P1-R3:** no breadcrumb on the TX pages: "ธุรกรรม" is a menu group, not a page. PageHeader gets the h1 and the subtitle (in `meta`; PageHeader has no `description` prop).
- **P1-R4:** the phone steps (spec §7.4) are the SAME form DOM as the desktop. Below `lg` (64rem, the shell's phone/desktop switch, so tablets between md and lg get the steps too), CSS shows only the current step's parts; at desktop width every section shows. No duplicated fields, ids or signature pads (E2E strict mode, axe duplicate-id). The phone-only parts (step 2's read-back, the step bar) and the desktop-only parts (the summary column, the frame's StickyFormFooter) are hidden by the same breakpoint.
- **P1-R5:** the picker's list rows stay as they are. The extra data the checkout page needs for a chosen asset comes from the search's by-id answer with `detail=1`, read once when an asset is chosen (and on the server for the `?assetId=` preselect). The new type is `AssetOperationChosenDetail` (the name `AssetOperationRowDetail` is already the picker's line union).
- **P1-R6:** multi-word search takes at most 5 words (split on whitespace, duplicates dropped case-insensitively before the cap, typed order kept); the 2-100 code-point rule applies to the whole text; the exact and prefix tiers use the whole text.
- **P1-R7:** the footer button key is new (`assetOperation.reviewAndSave` = "ตรวจสอบและบันทึก" / "Review and save"); `common.save` does not change.
- **P1-R8:** the destination-type control becomes a `Segmented` (a role group of `aria-pressed` buttons, no `id` prop). The id `checkout-type` goes on the `FieldGroup` (legend ส่งมอบให้) around it, and E2E presses `getByRole("button", { name: "แผนก" })` inside `#checkout-type` (no E2E used the id before).
- **P1-R9:** spec §7.4 step 1's "ส่วนควบไปด้วย N รายการ: …" is served on the phone by section 1's "ส่วนควบที่จะส่งมอบไปด้วย N รายการ" list (one DOM, P1-R4); no new key.

## Appendix: how the plan was checked

- Drafted from a skeleton by 8 agents (one per task), then cross-checked from 4 lenses (interfaces, code reality, spec coverage, step quality): 51 findings, 6 blockers. The controller ruled on every conflict; the main ones:
  - the page's `<form onSubmit={handleSubmit} noValidate id={formId}>` wraps `OperationFormFrame`, so the frame's StickyFormFooter is inside the form (DESIGN.md), and the phone bar is the form's last child;
  - Task 1's route pin does not forbid `normalizeAssetOwnershipType` (Task 2 imports it again);
  - the summary card's hook is `data-slot="operation-summary-card"`;
  - `CheckoutPhoneStep` is exported only by `src/lib/checkout-form-rules.ts`; Task 6's `data-checkout-part` / `data-step` hooks stay beside Task 7's classes;
  - `handover.spec.ts` stays desktop only through Task 6's per-test skips; the phone's handover is `desk-delivery.spec.ts`; Task 7 lifts the field-errors handover test's phone skip and gives it a phone path;
  - the held count leaves out any asset installed in another, whatever its ownership;
  - Task 8 uses an existing department (code `IT` preferred) as the second department instead of creating one.
- A second pass applied the rulings and re-checked the tasks together; its last two findings (GD4's button order in the phone bar, and P1-R8/R9) are in Task 7 and above.
