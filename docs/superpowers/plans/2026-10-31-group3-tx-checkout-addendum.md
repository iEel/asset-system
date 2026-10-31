# Group 3 plan 1 addendum: condition at handover, condition after repair, the asset's photo

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ส่งมอบ offers only ใหม่/ดี/พอใช้ and refuses a broken or salvage asset, closing a repair sets the asset's condition, and the asset's register photo shows on ส่งมอบ.

**Architecture:** One operation-aware condition rule in `asset-lifecycle-policy.ts` feeds the checkout and checkin routes, the master options and the checkout verdict (so the picker, the asset page and the route agree). The repair service sets the condition in the same transaction that closes the record. The register's photo rule moves into a small lib that the register and the asset search share.

**Tech Stack:** Next.js 16.4 App Router, React 19, next-intl, Prisma 7 (SQL Server), zod 4, `node --test`, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-30-page-group-3-transactions-design.md` §19 (the user's decisions of 2026-10-31), on top of plan 1 `docs/superpowers/plans/2026-10-30-group3-tx-checkout.md`, whose code is on branch `feat/group3-tx-checkout`.

## Global Constraints

- Plan 1's Global Constraints apply unchanged. In short:
  - Messages change through `node scripts/messages-edit.mjs <change file>` only, th and en together, with the change file in the session scratchpad.
  - Use shared parts and tokens (no hex, no `dark:`, no `/NN` tints), and check both themes.
  - V-form rules: errors under the field and focus to the first error.
  - No schema change and no migration. Pure rule files use relative `.ts` imports and `import type` only.
  - Every task runs `npm test`, `npx tsc --noEmit` and `npm run lint` (0 errors) before its commit. A pin that breaks is rewritten in the same commit and named in the report.
  - Never read `.env*`. E2E uses the dev DB only.
  - Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Condition masters are matched by `name` through `normalizeAssetStateName`: `New` ใหม่, `Good` ดี, `Fair` พอใช้, `Damaged` เสียหาย, `Non-functional` ใช้งานไม่ได้, `Salvage` ซาก, `Not Assessed` ยังไม่ประเมิน. `Excellent` and `Poor` are history only.
- **One rule, one function:**
  - which conditions an operation offers: `getAssetOperationConditionOptions`;
  - whether a recorded condition refuses a handover: `getCheckoutConditionBlock`;
  - which conditions a repair may end in: `getRepairConditionOptions`;
  - which photo stands for an asset: `chooseAssetPhotoPreview`.

## Rulings (the controller's calls, for the user to check)

- **A1-R1:** A row refused for its condition is the only kind of refused row IT can pick in the ส่งมอบ picker (an opt-in prop). Picking it shows the reason under the field and the ส่งซ่อม link there. No control goes inside a listbox option. Every other refused row stays unpickable.
- **A1-R2:** The order of the checkout refusals is: ownership, status, open handover, then condition. An asset that is not พร้อมใช้งาน reads its status reason first.
- **A1-R3:** โอนย้าย has no condition input. Whether it refuses a broken asset is plan 3's question.
- **A1-R4:** Closing a repair writes a `condition_change` movement (`referenceType: "maintenance"`, `referenceId`: the record) only when the condition changes. The audit log gets `conditionId` and `previousConditionId`.
- **A1-R5:** If the `Salvage` master is missing or inactive, closing a repair as ซ่อมไม่ได้ is refused with the existing code `ASSET_STATE_MASTER_NOT_FOUND`, and nothing is written.
- **A1-R6:** The photo is the register's rule: the newest image of the asset's model (`module: "asset_model"`), else the newest image of the asset (`module: "asset"`). The picker rows show it in every mode, because the picker is shared.

## Review Focus

1. **An asset repaired and closed as ใช้งานได้ + ดี can be handed over at once.** Task A5's E2E walks the whole loop.
2. **An old tab hands over an asset whose condition became เสียหาย after the page loaded.** The route re-reads the condition inside the transaction and refuses. Task A1's route test pins it.
3. **A routine maintenance closed on an asset already ดี:** ดี is pre-chosen and no `condition_change` movement is written. Task A3's service test pins it.
4. **Assets with no photo, a model photo only, or many images:** the chooser picks as the register does, and an asset without a photo gets the empty frame. Task A4's tests pin it.
5. **A ยังไม่ประเมิน asset:** it is not refused, and its handover starts with no condition chosen. Task A1's verdict test and the existing `checkoutConditionDefault` test pin it.

---

### Task A1: The condition rules and the checkout refusal (spec §19.1-3)

**Files:**
- Modify: `src/lib/asset-lifecycle-policy.ts`, `src/lib/asset-operation-eligibility.ts`, `src/lib/asset-operation-search-rules.ts` (facts gain the condition name), `src/lib/asset-actions.ts` and its callers (facts gain `conditionName`), `src/lib/asset-operation-options.ts`, `src/app/api/assets/[id]/checkout/route.ts`, `src/app/api/assets/[id]/checkin/route.ts`, `src/app/[locale]/(dashboard)/asset-management/checkout/page.tsx`, `messages/th.json` + `messages/en.json` (via messages-edit)
- Test: `tests/asset-operation-condition-policy.test.ts` (rewrite), the eligibility test, `tests/asset-operation-master-options.test.ts`, the checkout route tests from plan 1 Task 2, the source pins in `tests/e2e-transactions.test.ts` and `tests/asset-operation-picker-forms.test.ts`

**Interfaces (produces):**
```ts
// src/lib/asset-lifecycle-policy.ts
export type AssetOperationConditionOperation = "checkout" | "checkin"
export const checkoutConditionNames = ["New", "Good", "Fair"] as const
export const checkinConditionNames = ["New", "Good", "Fair", "Damaged", "Non-functional", "Salvage"] as const
export function getAssetOperationConditionOptions<T extends AssetStateMaster>(operation: AssetOperationConditionOperation, conditions: readonly T[]): T[]
export function getAssetOperationConditionError(operation: AssetOperationConditionOperation, condition: AssetStateMaster | null | undefined): "ASSET_STATE_MASTER_NOT_FOUND" | "ASSET_CONDITION_NOT_SELECTABLE" | null
export type CheckoutConditionBlock = "damaged" | "nonFunctional" | "salvage"
export function getCheckoutConditionBlock(conditionName: string | null | undefined): CheckoutConditionBlock | null
export const checkoutConditionBlockReasonKeys: Readonly<Record<CheckoutConditionBlock, string>>
// = { damaged: "asset.transactionReasonConditionDamaged", nonFunctional: "asset.transactionReasonConditionNonFunctional", salvage: "asset.transactionReasonConditionSalvage" }

// src/lib/asset-operation-eligibility.ts
AssetOperationFacts gains `conditionName: string | null`   // the condition master's `name`

// src/lib/asset-operation-options.ts
getAssetOperationMasterOptions(options?: { employeeDetail?: boolean; conditionsFor?: AssetOperationConditionOperation })
// conditions = getAssetOperationConditionOptions(options?.conditionsFor ?? "checkin", masters)
```
`selectableConditionNames` and `filterSelectableConditions` (asset form, import, state review) do not change.

- [ ] **Step 1: Write the failing tests.**
  - `getAssetOperationConditionOptions` over the 9 seeded masters (`prisma/seed.ts` names, in master order):
    - `"checkout"` gives `New, Good, Fair`;
    - `"checkin"` gives `New, Good, Fair, Damaged, Non-functional, Salvage`;
    - an inactive `Good` is dropped;
    - `Not Assessed`, `Excellent` and `Poor` are never offered.
  - `getAssetOperationConditionError`:
    - `("checkout", Damaged)` gives `ASSET_CONDITION_NOT_SELECTABLE`, and `("checkin", Damaged)` gives `null`;
    - `("checkout", Not Assessed)` and `("checkin", Not Assessed)` both give `ASSET_CONDITION_NOT_SELECTABLE`;
    - `null` or an inactive master gives `ASSET_STATE_MASTER_NOT_FOUND`.
  - `getCheckoutConditionBlock`:
    - `"Damaged"` gives `damaged`, and `"Non-functional"` gives `nonFunctional`;
    - `"non functional"` and `" damaged "` give the same as their canonical names, by whatever `normalizeAssetStateName` already folds (assert only the forms it folds today);
    - `"Salvage"` gives `salvage`;
    - `"Good"`, `"Not Assessed"`, `null` and `"unknown"` give `null`.
  - `getCheckoutVerdict`:
    - `Ready` + `Damaged` refuses with `asset.transactionReasonConditionDamaged`;
    - `Ready` + `Salvage` refuses with `...Salvage`;
    - `Ready` + `Not Assessed` is eligible;
    - `In Use` + `Damaged` refuses with `asset.transactionReasonStatusNotReady` (A1-R2);
    - `Ready` + an open handover + `Damaged` refuses with the open-handover reason.
  - The checkout route (plan 1 Task 2's test pattern):
    - an asset recorded `Damaged` gives 409 `{ code: "ASSET_CHECKOUT_CONDITION_BLOCKED", fieldErrors: { assetId: "checkoutConditionDamaged" } }`, and `Salvage` gives `assetId: "checkoutConditionSalvage"`;
    - a condition that turns `Non-functional` between the pre-check and the transaction's re-read gives the same 409 with `checkoutConditionNonFunctional`, and nothing is written;
    - a `conditionBefore` of `Damaged` gives 400 `invalidCheckoutCondition`.
  - Master options: `{ conditionsFor: "checkout" }` returns the three, and the default returns the checkin six.
- [ ] **Step 2:** Run them and see them fail.
- [ ] **Step 3: Implement.**
  - **The route:** after the open-handover check, refuse a blocked condition with 409 `ASSET_CHECKOUT_CONDITION_BLOCKED`. Then re-read it on `beforeAsset` (select `condition: { select: { name: true } }`) and throw a `CheckoutConditionBlockedError`, answered the same way.
  - **The field-error keys** sit in the namespace of the route's other `fieldErrors` (next to `checkoutReceiverInactive`):
    - `checkoutConditionDamaged`, `checkoutConditionNonFunctional` and `checkoutConditionSalvage`, with the reason words below;
    - add the code to the error catalog the route's codes use, with `checkoutConditionBlocked` as the toast fallback ("ส่งมอบไม่ได้เพราะสภาพของทรัพย์สิน" / "This asset cannot be handed over in its condition.").
  - **Conditions per operation:** the checkout route validates `conditionBefore` with `"checkout"`, and the checkin route validates `conditionAfter` with `"checkin"`.
  - **The checkout page** passes `{ employeeDetail: true, conditionsFor: "checkout" }`.
  - **Every facts builder** supplies `conditionName` from the condition master's `name`.
  - **Words** (th / en):
    - `asset.transactionReasonConditionDamaged`: "สภาพเสียหาย ต้องส่งซ่อมก่อนส่งมอบ" / "Damaged. Send it for repair before handing it over."
    - `asset.transactionReasonConditionNonFunctional`: "ใช้งานไม่ได้ ต้องส่งซ่อมก่อนส่งมอบ" / "Not working. Send it for repair before handing it over."
    - `asset.transactionReasonConditionSalvage`: "เป็นซาก รอตัดจำหน่าย ส่งมอบไม่ได้" / "Salvage awaiting disposal. It cannot be handed over."
- [ ] **Step 4:** Run the focused tests, then `npm test`, `npx tsc --noEmit` and `npm run lint`.
- [ ] **Step 5:** Commit: `feat(checkout): ส่งมอบ offers ใหม่/ดี/พอใช้, รับคืน drops ยังไม่ประเมิน, and a เสียหาย/ใช้งานไม่ได้/ซาก asset is refused in the search, on the asset page and by the route (group 3 spec §19.1-3)`.

### Task A2: The ส่งมอบ picker and the ส่งซ่อม link (spec §19.3)

**Files:**
- Modify: `src/lib/asset-operation-picker-rules.ts`, `src/components/ui/asset-operation-picker.tsx`, `src/lib/checkout-form-rules.ts`, `src/components/asset-operations/checkout-form.tsx`, messages
- Test: the picker-rules test, the checkout-form-rules test

**Interfaces:**
- Consumes `checkoutConditionBlockReasonKeys` (Task A1).
- Produces:
```ts
// asset-operation-picker-rules.ts: a fourth, optional parameter
export function getAssetOperationRowView(row, chosenIds, pickBlocked?: (row: Pick<AssetOperationSearchRow, "id" | "eligible" | "reasonKey">) => boolean): { selectable: boolean; note: AssetOperationRowNote }
// a refused row that pickBlocked accepts: { selectable: true, note: { kind: "reason", key } }

// AssetOperationPicker gains `pickBlocked?: (row: AssetOperationSearchRow) => boolean` (single mode only)

// checkout-form-rules.ts
export function isCheckoutConditionReasonKey(reasonKey: string | null | undefined): boolean   // the three keys
export function checkoutNeedsRepairReasonKey(reasonKey: string | null | undefined): boolean  // damaged or nonFunctional only
export function checkoutRepairHref(locale: string, assetId: string): string
// = appendOperationalReturnTo(`/${locale}/maintenance/new?assetId=${encodeURIComponent(assetId)}`, `/${locale}/asset-management/checkout`)
```

- [ ] **Step 1: Write the failing tests.**
  - `getAssetOperationRowView`:
    - a refused row with `pickBlocked` true is selectable and keeps its reason note;
    - with `pickBlocked` false or absent it is not selectable (as today);
    - a row already chosen still reads `chosen`.
  - `isCheckoutConditionReasonKey`: true for the three keys, and false for `asset.transactionReasonStatusNotReady` and for null.
  - `checkoutNeedsRepairReasonKey`: false for salvage.
  - `checkoutRepairHref("th", "a b")` gives `/th/maintenance/new?assetId=a%20b&returnTo=%2Fth%2Fasset-management%2Fcheckout`.
- [ ] **Step 2:** Run them and see them fail.
- [ ] **Step 3: Implement.**
  - **The picker:** a row `pickBlocked` accepts is hoverable and pickable, has no `aria-disabled`, and `pick` calls `onChange(row)`. It shows its note in the warning colour, as now.
  - **The checkout form** passes `pickBlocked={(row) => isCheckoutConditionReasonKey(row.reasonKey)}`. When the chosen asset's reason is damaged or nonFunctional, a link styled as an outline button sits under the asset field, below the error. Its words are "ส่งซ่อม" / "Send for repair" (reuse an existing key in the same namespace if one says exactly that, else add `assetOperation.sendToRepair`), and it goes to `checkoutRepairHref`.
  - **Salvage** gets no link.
  - **Saving with a refused asset** keeps the existing "invalid" path. The server's 409 field error lands under the asset field through the existing `fieldErrors` path.
- [ ] **Step 4:** Run the focused tests, then `npm test`, `tsc` and `lint`.
- [ ] **Step 5:** Commit: `feat(checkout): a broken asset can be picked to read why, with a ส่งซ่อม link that opens its repair (group 3 spec §19.3, A1-R1)`.

### Task A3: Closing a repair sets the condition (spec §19.4)

**Files:**
- Modify: `src/lib/asset-lifecycle-policy.ts`, `src/lib/validations/maintenance.ts`, `src/lib/repair-record-service.ts` (complete, and create with `done: true`), `src/app/api/maintenance-tickets/[id]/route.ts` and the create route (audit log), `src/components/maintenance/repair-record-actions.tsx`, `src/components/maintenance/repair-record-form.tsx`, `src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx`, `src/app/[locale]/(dashboard)/maintenance/new/page.tsx`, messages
- Test: the condition-policy test, the maintenance validation test, the repair service tests (their existing fake-transaction pattern)

**Interfaces (produces):**
```ts
// asset-lifecycle-policy.ts
export const repairUsableConditionNames = ["Good", "Fair"] as const
export function getRepairConditionOptions<T extends AssetStateMaster>(conditions: readonly T[]): T[]     // Good, Fair, active, master order
export function getRepairConditionError(condition: AssetStateMaster | null | undefined): "ASSET_STATE_MASTER_NOT_FOUND" | "ASSET_CONDITION_NOT_SELECTABLE" | null
export function repairConditionDefault(currentConditionId: string | null, options: readonly { id: string }[]): string   // current when offered, else ""

// validations/maintenance.ts: complete action and create gain `conditionId: optionalId`
// complete: outcome "usable" without conditionId → issue at ["conditionId"], message "conditionAfterRepairRequired"
// create: done && outcome "usable" without conditionId → the same issue
```

- [ ] **Step 1: Write the failing tests.**
  - `getRepairConditionOptions` gives `Good, Fair`.
  - `getRepairConditionError`: `Damaged` gives `ASSET_CONDITION_NOT_SELECTABLE`, and an inactive `Good` gives `ASSET_STATE_MASTER_NOT_FOUND`.
  - `repairConditionDefault`: Good's id is kept, Damaged's id gives `""`, and null gives `""`.
  - The schemas:
    - a complete with `usable` and no `conditionId` fails at `conditionId`, while `beyond_repair` without one passes;
    - a create with `done: false` needs none.
  - The service:
    - **usable + Good on a Damaged asset:** the asset's `conditionId` becomes Good in the same transaction, one `condition_change` movement is written (from Damaged's id to Good's, `referenceType: "maintenance"`), and the result returns `previousConditionId`/`conditionId`;
    - **usable + Good on an asset already Good:** no `condition_change` movement (Review Focus 3);
    - **beyond_repair:** the condition becomes Salvage and the status becomes Pending Disposal, as today;
    - **beyond_repair with no active Salvage master:** refused `ASSET_STATE_MASTER_NOT_FOUND` and nothing is written (A1-R5);
    - **usable + Damaged:** refused at `conditionId` with `invalidConditionAfterRepair`;
    - **create with `done: true` + usable + Fair:** the same writes as complete.
- [ ] **Step 2:** Run them and see them fail.
- [ ] **Step 3: Implement.**
  - **The complete dialog and the create form:** under the outcome group, when the outcome is ใช้งานได้, add an `AssetConditionChoice` (plan 1 Task 5's part).
    - ids `repair-complete-condition` and `repair-create-condition`;
    - options from `getRepairConditionOptions`, required, starting at `repairConditionDefault(asset's current condition, options)`.
  - **When the outcome is ซ่อมไม่ได้:** a muted line reads "สภาพของทรัพย์สินจะเปลี่ยนเป็น ซาก" / "The asset's condition becomes Salvage.".
  - **The pages** read the condition masters and the asset's current `conditionId`, and pass them in.
  - **The audit log** of complete and create gets `conditionId` and `previousConditionId`.
  - **Words:**
    - legend "สภาพหลังซ่อม" / "Condition after repair";
    - required "เลือกสภาพหลังซ่อม" / "Choose the condition after repair.";
    - invalid "สภาพนี้ใช้หลังซ่อมไม่ได้ เลือก ดี หรือ พอใช้" / "Choose Good or Fair after a repair.".
- [ ] **Step 4:** Run the focused tests, then `npm test`, `tsc` and `lint`.
- [ ] **Step 5:** Commit: `feat(repair): closing a repair sets the asset's condition: ใช้งานได้ asks ดี or พอใช้, ซ่อมไม่ได้ makes it ซาก, with the change in the history (group 3 spec §19.4)`.

### Task A4: The asset's photo on ส่งมอบ (spec §19.5)

**Files:**
- Create: `src/lib/asset-photo-preview.ts`, `src/components/ui/chosen-photo-preview.tsx`
- Modify:
  - `src/components/assets/asset-thumbnail.tsx` (the `AssetThumbnailPhoto` type becomes `AssetPhotoPreview`, and sizes add `64`);
  - `src/app/[locale]/(dashboard)/assets/page.tsx` (its row photo uses `chooseAssetPhotoPreview`, with no change of behaviour);
  - `src/lib/asset-operation-search-rules.ts` and `src/lib/asset-operation-search.ts` (rows get `photo`);
  - `src/components/ui/asset-operation-picker.tsx`;
  - `src/components/asset-operations/checkout-form.tsx` (`CheckoutAssetCard`, the review dialog's photo line);
  - `src/components/asset-operations/operation-summary-card.tsx`;
  - `src/components/asset-operations/checkout-phone-steps.tsx` (`CheckoutReadBack`);
  - messages if a word is needed.
- Test: `tests/asset-photo-preview.test.ts` (new), the asset-operation search test (rows carry `photo`)

**Interfaces (produces):**
```ts
// src/lib/asset-photo-preview.ts (server-safe; the pure part has no Prisma import at module top level beyond types)
export type AssetPhotoPreview = { id: string; alt: string; fileType: string }
export function chooseAssetPhotoPreview(modelPhoto: AssetPhotoPreview | null | undefined, assetPhoto: AssetPhotoPreview | null | undefined): AssetPhotoPreview | null
export async function readAssetPhotoPreviews(db: Pick<PrismaClient, "attachment">, assets: readonly { id: string; modelId: string | null }[]): Promise<Map<string, AssetPhotoPreview>>
// Two findMany (asset_model by modelId; asset by assetId), both isActive, fileType startsWith "image/", orderBy uploadedAt desc,
// select id/referenceId|assetId/originalName/fileType; the first per key wins; assets with neither are absent from the map.

// AssetOperationSearchRow gains `photo: AssetPhotoPreview | null` (every mode)
```

- [ ] **Step 1: Write the failing tests.**
  - `chooseAssetPhotoPreview`: the model photo wins, the asset photo is the fallback, and with neither the result is null.
  - `readAssetPhotoPreviews` with a fake db:
    - it makes exactly two queries, with the filters above;
    - the newest image of a model wins;
    - an asset with a model photo and its own photo gets the model's;
    - an asset with nothing is absent;
    - an empty list makes no query.
  - The search answer's rows carry `photo` from the map, and `null` when absent.
- [ ] **Step 2:** Run them and see them fail.
- [ ] **Step 3: Implement.**
  - **Picker rows:** an `AssetThumbnail` of size 40, `preview={false}`, at the start of the row, with `alt=""` because the row's text names the asset. Keep the row's text block as it is, beside the thumbnail.
  - **`CheckoutAssetCard`:** size 44 with preview.
  - **The summary card's asset row:** size 64, through a new optional `photo?: ReactNode` prop on `OperationSummaryCard`'s asset line. Choose the smallest change in its props.
  - **`CheckoutReadBack`:** size 64 beside the asset's name.
  - **`ChosenPhotoPreview({ file, alt, size }: { file: File | null; alt: string; size: 48 | 96 })`:**
    - it makes one object URL per image file and revokes it on change and unmount;
    - it renders nothing for null or a non-image;
    - it uses a rounded border with tokens only.
  - **The checkout** shows a 96 preview under the รูปก่อนส่งมอบ dropzone, and a 48 one in the review's รูปก่อนส่งมอบ line beside "แนบแล้ว".
  - **The by-id `detail=1` read** carries `photo` like any row.
- [ ] **Step 4:** Run the focused tests, then `npm test`, `tsc` and `lint`.
- [ ] **Step 5:** Commit: `feat(checkout): the asset's register photo in the search rows, beside the chosen asset, in the summary card and on the phone's step 2, and รูปก่อนส่งมอบ shows a preview (group 3 spec §19.5, A1-R6)`.

### Task A5: E2E and docs

**Files:**
- Create: `e2e/transactions/handover-condition.spec.ts`
- Modify: `e2e/transactions/tx-support.ts` (helpers only if needed), `docs/99_CHANGELOG.md` (an addendum line in the group 3 plan 1 entry), `docs/06_*` workflows (ส่งมอบ and closing a repair), the lifecycle-rules doc plan 1 touched, the UAT checklist plan 1 touched, `docs/DEVELOPER_HANDOFF.md`

- [ ] **Step 1: Write `handover-condition.spec.ts`.** Desktop runs every test, and the phone runs test 2's first half. Assets come from the run's own data, as plan 1's specs make them. Tests:
  1. On ส่งมอบ, `#checkout-condition` offers exactly ใหม่, ดี and พอใช้.
  2. **The repair loop:**
     - set a run asset in พร้อมใช้งาน to เสียหาย (asset edit, as itStaff);
     - on ส่งมอบ, search its tag: the row reads "สภาพเสียหาย ต้องส่งซ่อมก่อนส่งมอบ";
     - pick it: the error under `#checkout-asset` reads the same, and the ส่งซ่อม link points to `/th/maintenance/new?assetId=…`;
     - follow it, and record the repair as already done with ใช้งานได้ + ดี;
     - the asset page shows the condition ดี and the history's condition change;
     - back on ส่งมอบ, the asset hands over to an employee (HO- document opens).
  3. **Salvage:** an asset set to ซาก reads "เป็นซาก รอตัดจำหน่าย ส่งมอบไม่ได้", and there is no ส่งซ่อม link.
  4. **Closing as ซ่อมไม่ได้:** an open repair closed as ซ่อมไม่ได้ shows the line "สภาพของทรัพย์สินจะเปลี่ยนเป็น ซาก", and afterwards the asset's condition is ซาก.
  5. **A photo:** for a run asset with an image attachment (add one through the asset's files tab with a small PNG fixture if the run has none), the picker row and the summary card each show an `img`. An asset without one shows the empty frame.
- [ ] **Step 2:** Run only this spec on desktop-light (the controller runs the 4 projects later).
- [ ] **Step 3:** Update the docs listed above in the house style, naming spec §19.
- [ ] **Step 4:** Run `npm test`, `tsc` and `lint`.
- [ ] **Step 5:** Commit: `test(e2e): ส่งมอบ refuses a broken asset until its repair closes ใช้งานได้, a salvage asset, closing as ซ่อมไม่ได้ makes ซาก, and the photos (group 3 spec §19); docs`.
