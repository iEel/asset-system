# Asset Notification and Escalation Implementation Plan

> **For implementation:** Execute this plan task-by-task with test-driven development. Read `node_modules/next/dist/docs/` before touching Next.js route or rendering APIs.

**Goal:** Surface actionable asset work at the right urgency, notify the responsible person, and escalate severe items without duplicate messages or broad permission-based broadcasts.

**Architecture:** Queue notifications are computed from authoritative open workflow records. Event notifications are persisted with stable dedupe keys. A pure escalation policy selects stage, channel, and explicit recipients; delivery adapters remain idempotent. Read and Snooze are per-user presentation state only.

**Tech Stack:** Next.js App Router, TypeScript, Prisma, existing notification delivery/digest stack, Node test runner.

---

## Global Constraints

- Do not notify every user with `asset:edit`.
- Queue items disappear only when the source workflow resolves.
- Persisted event history remains after source resolution.
- Scheduler retries must be idempotent by notification type, source, escalation stage, and recipient.
- Due soon is in-app/Work Center; overdue joins digest; severe overdue and confirmed Lost can send immediate email.
- Read and Snooze never alter assignment, due dates, or workflow state.
- Do not apply the manual migration until a later verified-backup confirmation and explicit user approval.

### Task 1: Define queue keys and escalation policy

**Files:**
- Create: `src/lib/asset-notification-policy.ts`
- Create: `tests/asset-notification-policy.test.ts`
- Modify: `src/lib/notification-summary-items.ts`

- [ ] **Step 1: Write failing table-driven policy tests**

Cover returns due soon/overdue/severe, Missing due soon/overdue/severe, recovered awaiting inspection, overdue inspection, blocked cancellation, and confirmed Lost. Assert channel selection, stage boundaries, stable queue keys, and no recipient broadening.

```ts
export type AssetNotificationQueueKey =
  | "returns_due_soon"
  | "returns_overdue"
  | "missing_due_soon"
  | "missing_overdue"
  | "recovered_awaiting_inspection"
  | "inspection_overdue"
  | "cancellation_blocked"
  | "lost_confirmed"
```

- [ ] **Step 2: Run the focused test and confirm RED**

```bash
npm test -- tests/asset-notification-policy.test.ts
```

- [ ] **Step 3: Implement deterministic date boundaries and channel rules**

Use an injected `now` and timezone-safe date comparison. Return structured channel decisions rather than sending messages from the policy.

- [ ] **Step 4: Run tests and commit**

```bash
npm test -- tests/asset-notification-policy.test.ts
git add src/lib/asset-notification-policy.ts src/lib/notification-summary-items.ts tests/asset-notification-policy.test.ts
git commit -m "feat: define asset notification escalation policy"
```

### Task 2: Add deduplicated notifications and escalation settings

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/manual-migrations/2026-08-27-add-asset-notification-escalation.sql`
- Create: `tests/asset-notification-migration.test.ts`
- Modify: `src/lib/system-setting-defaults.ts`
- Modify: `src/lib/validations/system-settings.ts`
- Modify: `src/components/admin/system-settings-form.tsx`
- Modify: `src/app/api/admin/settings/route.ts`
- Modify: `src/app/[locale]/(dashboard)/admin/settings/page.tsx`
- Modify: `tests/system-settings-tabs.test.ts`
- Create: `tests/asset-notification-settings.test.ts`
- Modify: `messages/en.json`
- Modify: `messages/th.json`

- [ ] **Step 1: Write failing schema/migration/settings tests**

Require nullable unique `Notification.dedupeKey` for legacy compatibility and validated settings for return severe-overdue days, default Missing SLA days, Under Inspection SLA days, and explicit escalation user/role IDs.

- [ ] **Step 2: Run the focused tests and confirm RED**

```bash
npm test -- tests/asset-notification-migration.test.ts tests/asset-notification-settings.test.ts tests/system-settings-tabs.test.ts
```

- [ ] **Step 3: Implement schema and idempotent manual migration**

The migration must add the nullable column and unique index conditionally and seed only missing settings. It must not overwrite existing values.

- [ ] **Step 4: Generate Prisma client, rerun tests, and commit**

```bash
npm run prisma:generate
npm test -- tests/asset-notification-migration.test.ts tests/asset-notification-settings.test.ts tests/system-settings-tabs.test.ts
git add prisma src/lib/system-setting-defaults.ts src/lib/validations/system-settings.ts src/components/admin/system-settings-form.tsx src/app/api/admin/settings/route.ts "src/app/[locale]/(dashboard)/admin/settings/page.tsx" messages tests/asset-notification-migration.test.ts tests/asset-notification-settings.test.ts tests/system-settings-tabs.test.ts
git commit -m "feat: add notification escalation configuration"
```

### Task 3: Compute separate queue metrics from workflow state

**Files:**
- Modify: `src/lib/notification-center.ts`
- Modify: `src/lib/notification-summary.ts`
- Modify: `src/lib/work-center-metrics.ts`
- Modify: `src/lib/work-center-view.ts`
- Modify: `tests/notification-center.test.ts`
- Modify: `tests/notification-summary.test.ts`
- Modify: `tests/work-center-metrics.test.ts`
- Modify: `tests/work-center-view.test.ts`

- [ ] **Step 1: Add failing metric reconciliation tests**

Seed boundary records and assert separate due-soon/overdue counts, mutual exclusivity, source-derived disappearance, permission-safe links, and parity between Notification Center and Work Center.

- [ ] **Step 2: Run tests and confirm RED**

```bash
npm test -- tests/notification-center.test.ts tests/notification-summary.test.ts tests/work-center-metrics.test.ts tests/work-center-view.test.ts
```

- [ ] **Step 3: Implement shared query predicates and aggregation**

Centralize open-record and deadline predicates. Reuse the next-action keys where applicable and avoid loading full records or per-row queries.

- [ ] **Step 4: Run tests and commit**

```bash
npm test -- tests/notification-center.test.ts tests/notification-summary.test.ts tests/work-center-metrics.test.ts tests/work-center-view.test.ts
git add src/lib/notification-center.ts src/lib/notification-summary.ts src/lib/work-center-metrics.ts src/lib/work-center-view.ts tests
git commit -m "feat: add asset workflow notification queues"
```

### Task 4: Persist idempotent event notifications and recipients

**Files:**
- Modify: `src/lib/notification-delivery.ts`
- Create: `src/lib/asset-notification-events.ts`
- Create: `src/lib/asset-notification-recipients.ts`
- Create: `tests/asset-notification-events.test.ts`
- Create: `tests/asset-notification-recipients.test.ts`
- Modify: transaction cancellation service from Plan 1
- Modify: loss-case service from Plan 2

- [ ] **Step 1: Write failing dedupe and recipient tests**

Assert assignment goes to the linked active user, return reminders to the Checkout custodian's linked active user, loss reminders to the assigned investigator, blocked cancellation to requester plus configured escalation recipients, fallback only from explicit settings, and retry-safe dedupe.

- [ ] **Step 2: Run the focused tests and confirm RED**

```bash
npm test -- tests/asset-notification-events.test.ts tests/asset-notification-recipients.test.ts
```

- [ ] **Step 3: Implement recipient resolution and transactional event writes**

Use a helper such as:

```ts
export function buildNotificationDedupeKey(input: {
  type: string
  sourceId: string
  stage: string
  recipientUserId: string
}): string
```

Create events in the same logical workflow operation when possible. Unique-key conflicts are successful idempotent retries, not delivery failures.

- [ ] **Step 4: Run tests and commit**

```bash
npm test -- tests/asset-notification-events.test.ts tests/asset-notification-recipients.test.ts tests/notification-delivery.test.ts
git add src/lib/asset-notification-events.ts src/lib/asset-notification-recipients.ts src/lib/notification-delivery.ts tests
git commit -m "feat: persist deduplicated asset workflow events"
```

### Task 5: Extend scheduler, digest, and immediate email delivery

**Files:**
- Modify: `scripts/run-scheduled-jobs.mjs`
- Modify: `scripts/send-notification-digest.mjs`
- Modify: `src/lib/notification-digest.ts`
- Modify: `src/lib/notification-digest-format.ts`
- Modify: `src/app/api/notifications/digest/route.ts`
- Create: `tests/asset-notification-scheduler.test.ts`
- Modify: `tests/notification-digest.test.ts`
- Modify: `tests/notification-delivery.test.ts`

- [ ] **Step 1: Write failing retry and channel tests**

Assert due-soon produces no email, overdue appears once per digest window, severe overdue sends one immediate event per escalation stage/recipient, confirmed Lost sends immediately, and reruns do not duplicate persisted notifications or mail jobs.

- [ ] **Step 2: Run tests and confirm RED**

```bash
npm test -- tests/asset-notification-scheduler.test.ts tests/notification-digest.test.ts tests/notification-delivery.test.ts
```

- [ ] **Step 3: Implement scheduler stages and delivery adapters**

Keep query/decision logic in TypeScript libraries and scripts as thin entrypoints. Record delivery outcome without marking the source workflow resolved.

- [ ] **Step 4: Run tests and commit**

```bash
npm test -- tests/asset-notification-scheduler.test.ts tests/notification-digest.test.ts tests/notification-delivery.test.ts
git add scripts src/lib/notification-digest.ts src/lib/notification-digest-format.ts "src/app/api/notifications/digest/route.ts" tests
git commit -m "feat: deliver asset workflow escalations"
```

### Task 6: Update Notification Center presentation and Snooze semantics

**Files:**
- Modify: `src/app/[locale]/(dashboard)/notifications/page.tsx`
- Modify: `src/components/notifications/notification-center-actions.tsx`
- Modify: `src/app/api/notifications/route.ts`
- Modify: `src/lib/notification-client-sync.ts`
- Modify: `tests/notification-topbar-behavior.test.ts`
- Modify: `tests/notification-client-sync.test.ts`
- Modify: `messages/en.json`
- Modify: `messages/th.json`

- [ ] **Step 1: Write failing presentation-state tests**

Verify queue/event distinction, urgency labels independent of color, accessible controls, Read and Snooze scoped to the current user, and source work remaining visible in Work Center after snooze.

- [ ] **Step 2: Run tests and confirm RED**

```bash
npm test -- tests/notification-topbar-behavior.test.ts tests/notification-client-sync.test.ts
```

- [ ] **Step 3: Implement grouped presentation and safe actions**

Show urgent work before routine items, expose the responsible source/action link, and state when snooze ends. Never offer “resolve” from a notification card.

- [ ] **Step 4: Run tests and commit**

```bash
npm test -- tests/notification-topbar-behavior.test.ts tests/notification-client-sync.test.ts tests/notification-center.test.ts
git add "src/app/[locale]/(dashboard)/notifications/page.tsx" src/components/notifications/notification-center-actions.tsx src/app/api/notifications/route.ts src/lib/notification-client-sync.ts tests messages
git commit -m "feat: improve asset notification presentation"
```

### Task 7: Document, verify, and stop before production migration

**Files:**
- Modify: `docs/ASSET_STATUS_WORKFLOW.md`
- Modify: `docs/ASSET_STATUS_USER_GUIDE.md`
- Create: `docs/ASSET_NOTIFICATION_OPERATIONS.md`
- Modify: `DEVELOPER_HANDOFF.md`

- [ ] **Step 1: Document queue definitions, recipient rules, channels, dedupe, and operator checks**
- [ ] **Step 2: Run full verification**

```bash
npm test
npm run lint
npm run build
npm run verify
npm run migration:status
git diff --check
```

- [ ] **Step 3: Commit the handoff**

```bash
git add docs DEVELOPER_HANDOFF.md
git commit -m "docs: hand off asset notification escalation"
```

- [ ] **Step 4: Stop at the migration gate**

Do not apply `2026-08-27-add-asset-notification-escalation.sql` until the user confirms a verified backup and explicitly authorizes migration execution.
