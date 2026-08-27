# Shared Asset Next-action Guidance Implementation Plan

> **For implementation:** Execute this plan task-by-task with test-driven development. Read `node_modules/next/dist/docs/` for every touched Next.js API, and read `.agents/skills/impeccable/reference/craft-floor.md` before UI edits.

**Goal:** Give every asset workflow surface one consistent, permission-aware answer to “what should happen next?” without duplicating lifecycle rules in components.

**Architecture:** Add a pure policy that converts normalized asset/workflow facts into stable action descriptors. Server-side data adapters gather facts; Asset Detail, Asset Register, mobile actions, and Work Center render the same descriptors. Routes remain the authorization boundary.

**Tech Stack:** Next.js App Router, TypeScript, React, Prisma, Tailwind/shadcn-style components, Node test runner.

---

## Global Constraints

- One primary action and at most three secondary actions.
- Stable action keys; components never reimplement lifecycle eligibility.
- Read-only users see the recommendation and a permission explanation, not a dead write control.
- Blocked actions show a specific reason and a safe destination when one exists.
- Keyboard focus, Escape dismissal, focus restoration, screen-reader labels, and 44px mobile targets are required.
- This plan depends on the transaction and loss-case domain services when those records exist, but the pure policy must tolerate their absence during staged rollout.

### Task 1: Define the pure next-action contract and precedence

**Files:**
- Create: `src/lib/asset-next-action-policy.ts`
- Create: `tests/asset-next-action-policy.test.ts`

- [ ] **Step 1: Write failing table-driven tests**

Cover Ready, Checked Out/In Use, Under Maintenance, Under Inspection, Missing, Lost, pending review, open disposal, overdue return, recovered-awaiting-inspection, and read-only variants. Assert one primary, no more than three secondary actions, stable keys, reasons, due state, and href inputs.

```ts
export type AssetNextActionKey =
  | "checkout"
  | "checkin"
  | "transfer"
  | "send_to_maintenance"
  | "complete_inspection"
  | "open_missing_case"
  | "recover_asset"
  | "review_state"
  | "view_workflow"
  | "none"

export type AssetNextActionResult = {
  primary: AssetNextAction
  secondary: AssetNextAction[]
  blockers: AssetActionBlocker[]
}
```

- [ ] **Step 2: Run the focused test and confirm RED**

```bash
npm test -- tests/asset-next-action-policy.test.ts
```

- [ ] **Step 3: Implement normalized inputs, deterministic precedence, and invariants**

Precedence: pending correction/review; active loss/recovery; open maintenance/inspection; overdue custody; ordinary lifecycle action; quiet `none`. The policy returns route parameters rather than localized labels.

- [ ] **Step 4: Run focused tests and commit**

```bash
npm test -- tests/asset-next-action-policy.test.ts
git add src/lib/asset-next-action-policy.ts tests/asset-next-action-policy.test.ts
git commit -m "feat: define shared asset next action policy"
```

### Task 2: Build one server-side facts adapter

**Files:**
- Modify: `src/lib/asset-detail-data.ts`
- Create: `src/lib/asset-next-action-data.ts`
- Create: `tests/asset-next-action-data.test.ts`
- Modify: `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`

- [ ] **Step 1: Write failing adapter tests**

Assert that open Checkout, Maintenance, Disposal, Loss Case, pending AssetStateReview, due dates, custody, and permission flags map to the pure policy input without leaking Prisma records.

- [ ] **Step 2: Run the focused test and confirm RED**

```bash
npm test -- tests/asset-next-action-data.test.ts
```

- [ ] **Step 3: Implement batched/selective queries and normalization**

Expose:

```ts
export async function getAssetNextActionFacts(input: {
  assetId: string
  userId: string
  canEditAsset: boolean
}): Promise<AssetNextActionInput>
```

Use narrow Prisma `select` clauses and existing active-record semantics. Missing optional tables during staged development must be handled through code sequencing, not runtime exception swallowing.

- [ ] **Step 4: Run focused tests and commit**

```bash
npm test -- tests/asset-next-action-data.test.ts tests/asset-next-action-policy.test.ts
git add src/lib/asset-detail-data.ts src/lib/asset-next-action-data.ts tests/asset-next-action-data.test.ts "src/app/[locale]/(dashboard)/assets/[id]/page.tsx"
git commit -m "feat: load shared asset next action facts"
```

### Task 3: Upgrade Asset Detail and mobile guidance

**Files:**
- Read before editing: `.agents/skills/impeccable/reference/craft-floor.md`
- Create: `src/components/assets/asset-next-action-panel.tsx`
- Modify: `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`
- Modify: `src/components/assets/asset-detail-action-menu.tsx`
- Modify: `src/components/ui/mobile-action-bar.tsx`
- Modify: `messages/en.json`
- Modify: `messages/th.json`
- Modify: `tests/asset-detail-ux.test.ts`
- Modify: `tests/mobile-action-bar.test.ts`

- [ ] **Step 1: Add failing structural and accessibility tests**

Require the primary action below the identity/status header, quiet completed state, explicit blocker text, progressive disclosure of secondary actions, focus restoration, Escape handling, and minimum mobile target sizing.

- [ ] **Step 2: Run tests and confirm RED**

```bash
npm test -- tests/asset-detail-ux.test.ts tests/mobile-action-bar.test.ts
```

- [ ] **Step 3: Implement the shared renderer**

Render labels from action keys through translations. Use existing visual language, a single emphasized primary control, subdued secondary actions, and text plus icon/status semantics. Remove the superseded follow-up branching from `ActivitySummaryPanel` while preserving recent activity content.

- [ ] **Step 4: Verify responsive behavior and commit**

```bash
npm test -- tests/asset-detail-ux.test.ts tests/mobile-action-bar.test.ts tests/asset-next-action-policy.test.ts
npm run lint -- --file "src/app/[locale]/(dashboard)/assets/[id]/page.tsx" --file src/components/assets/asset-next-action-panel.tsx
git add src/components/assets src/components/ui/mobile-action-bar.tsx "src/app/[locale]/(dashboard)/assets/[id]/page.tsx" messages tests/asset-detail-ux.test.ts tests/mobile-action-bar.test.ts
git commit -m "feat: show contextual next actions on asset detail"
```

### Task 4: Reuse the policy in Asset Register transaction menus

**Files:**
- Modify: `src/app/[locale]/(dashboard)/assets/page.tsx`
- Modify: `src/components/assets/asset-register-action-menus.tsx`
- Modify: `src/components/assets/asset-register-table.tsx`
- Modify: `tests/asset-register-transactions.test.ts`
- Modify: `messages/en.json`
- Modify: `messages/th.json`

- [ ] **Step 1: Write failing parity tests**

For identical facts, assert that Register and Asset Detail choose the same primary key and blocked reason. Verify disabled items remain visible with explanatory text.

- [ ] **Step 2: Run the focused test and confirm RED**

```bash
npm test -- tests/asset-register-transactions.test.ts
```

- [ ] **Step 3: Replace local status branching with policy descriptors**

Batch-load facts for visible rows to avoid N+1 queries. Keep row action density unchanged by presenting the recommendation inside the existing overflow transaction menu.

- [ ] **Step 4: Run tests and commit**

```bash
npm test -- tests/asset-register-transactions.test.ts tests/asset-next-action-policy.test.ts
git add "src/app/[locale]/(dashboard)/assets/page.tsx" src/components/assets/asset-register-action-menus.tsx src/components/assets/asset-register-table.tsx tests/asset-register-transactions.test.ts messages
git commit -m "feat: align asset register transaction guidance"
```

### Task 5: Align Work Center with the same action keys

**Files:**
- Modify: `src/lib/work-center-metrics.ts`
- Modify: `src/lib/work-center-view.ts`
- Modify: `src/app/[locale]/(dashboard)/work-center/page.tsx`
- Modify: `tests/work-center-metrics.test.ts`
- Modify: `tests/work-center-view.test.ts`
- Modify: `messages/en.json`
- Modify: `messages/th.json`

- [ ] **Step 1: Add failing aggregation and route tests**

Assert grouping by stable action key, preservation of blocker/due metadata, deterministic ordering (overdue before due soon before routine), and safe localized links.

- [ ] **Step 2: Run tests and confirm RED**

```bash
npm test -- tests/work-center-metrics.test.ts tests/work-center-view.test.ts
```

- [ ] **Step 3: Implement policy-driven Work Center items**

Keep counts derived from source workflow state. Link each item to a filtered work list or specific asset, never directly to a mutation endpoint.

- [ ] **Step 4: Run tests and commit**

```bash
npm test -- tests/work-center-metrics.test.ts tests/work-center-view.test.ts tests/asset-next-action-policy.test.ts
git add src/lib/work-center-metrics.ts src/lib/work-center-view.ts "src/app/[locale]/(dashboard)/work-center/page.tsx" tests/work-center-metrics.test.ts tests/work-center-view.test.ts messages
git commit -m "feat: align work center next action guidance"
```

### Task 6: Verify and document the shared guidance

**Files:**
- Modify: `docs/ASSET_STATUS_WORKFLOW.md`
- Modify: `docs/ASSET_STATUS_USER_GUIDE.md`
- Modify: `DEVELOPER_HANDOFF.md`

- [ ] **Step 1: Document precedence, permissions, blockers, and surface parity**
- [ ] **Step 2: Run full verification**

```bash
npm test
npm run lint
npm run build
npm run verify
git diff --check
```

- [ ] **Step 3: Commit the handoff**

```bash
git add docs DEVELOPER_HANDOFF.md
git commit -m "docs: hand off shared asset next action guidance"
```
