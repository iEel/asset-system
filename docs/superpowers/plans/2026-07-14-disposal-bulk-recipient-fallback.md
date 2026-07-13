# Disposal Bulk Recipient Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared recipient/buyer/destination fallback to bulk disposal execution so missing request recipients can be completed without overwriting existing request data.

**Architecture:** Extend the strict bulk payload with one optional `sharedRecipientName`, resolve the effective recipient from freshly loaded server data for each request, and return the effective value/source in Preview results. The current client dialog owns the shared field and locks it into Preview, Commit, and retry payloads while preserving all existing evidence, SOD, lifecycle, and transaction behavior.

**Tech Stack:** Next.js 16.2.4 App Router, React 19 client components, TypeScript, Zod, Prisma 7 with SQL Server, next-intl, Node test runner, Tailwind CSS, Lucide icons.

## Global Constraints

- The shared value fills only selected requests whose authoritative recipient is blank.
- Existing nonblank request recipients must never be overwritten.
- `sharedRecipientName` is trimmed, nullable, and limited to 200 characters.
- Show the field only for `sell`, `donate`, and `dispose` selections.
- Revalidate authoritative request data during Preview and before every Commit.
- Do not change the database schema or single-request execution workflow.
- Do not add shared document, money, salvage, or execution-detail overrides.
- Keep the 20-item limit, same-type selection, evidence policy, RBAC, SOD, audit, movement, and partial retry behavior.

## File Map

- `src/lib/validations/disposal.ts`: validates the optional shared recipient in bulk packets.
- `src/lib/disposal-bulk-execution-ui.ts`: carries the shared recipient through Preview, Commit, and retry payloads.
- `src/lib/disposal-execution-service.ts`: resolves a request recipient with a fallback without changing the single-item command contract.
- `src/lib/disposal-bulk-execution.ts`: exposes effective recipient and source in ordered item results.
- `src/lib/disposal-bulk-execution-service.ts`: applies the fallback to authoritative candidates and reports effective Preview values.
- `src/components/disposal/disposal-bulk-execution.tsx`: renders, validates, reviews, and locks the shared field.
- `src/app/[locale]/(dashboard)/disposal/page.tsx`: supplies localized copy to the client component.
- `messages/en.json`, `messages/th.json`: add labels, help text, and source descriptions.
- `tests/disposal-validation.test.ts`: schema regression coverage.
- `tests/disposal-bulk-execution.test.ts`: payload and retry preservation coverage.
- `tests/disposal-bulk-execution-service.test.ts`: authoritative fallback and no-overwrite coverage.
- `tests/disposal-bulk-execution-ui.test.ts`: UI and translation wiring coverage.
- `docs/06_WORKFLOWS.md`, `docs/07_UAT_CHECKLIST.md`, `docs/99_CHANGELOG.md`, `DEVELOPER_HANDOFF.md`: document the operational behavior.

---

### Task 1: Extend The Bulk Payload Contract

**Files:**
- Modify: `src/lib/validations/disposal.ts`
- Modify: `src/lib/disposal-bulk-execution-ui.ts`
- Test: `tests/disposal-validation.test.ts`
- Test: `tests/disposal-bulk-execution.test.ts`

**Interfaces:**
- Produces: `BulkExecutionSharedValues.sharedRecipientName: string | null`.
- Produces: `DisposalBulkExecutionInput.sharedRecipientName: string | null | undefined`.
- Consumes: existing `buildBulkExecutionPayload` and `buildBulkExecutionCommitPayload` APIs.

- [ ] **Step 1: Write failing schema and payload tests**

Add tests proving trim/null/max-length behavior and Preview-to-Commit preservation:

```ts
const parsed = disposalBulkExecutionSchema.parse({
  ...validBulkExecutionPacket,
  sharedRecipientName: "  Receiving Foundation  ",
})
assert.equal(parsed.sharedRecipientName, "Receiving Foundation")

assert.equal(disposalBulkExecutionSchema.parse({
  ...validBulkExecutionPacket,
  sharedRecipientName: "",
}).sharedRecipientName, null)

assert.equal(disposalBulkExecutionSchema.safeParse({
  ...validBulkExecutionPacket,
  sharedRecipientName: "x".repeat(201),
}).success, false)

const preview = buildBulkExecutionPayload("preview", ["request-1"], {
  ...sharedValues,
  sharedRecipientName: "Receiving Foundation",
})
assert.equal(buildBulkExecutionCommitPayload(preview, ["request-1"]).sharedRecipientName, "Receiving Foundation")
```

- [ ] **Step 2: Run the focused tests and confirm RED**

Run:

```powershell
node --test tests/disposal-validation.test.ts tests/disposal-bulk-execution.test.ts
```

Expected: failures because the schema strips/rejects the field or the shared payload type does not carry it.

- [ ] **Step 3: Implement the strict optional field**

Add this field to `disposalBulkExecutionSchema`:

```ts
sharedRecipientName: z.preprocess(
  (value) => typeof value === "string" ? value.trim() || null : value,
  z.string().max(200).nullable(),
).optional(),
```

Add it to `BulkExecutionSharedValues`:

```ts
sharedRecipientName: string | null
```

Pass `previewPayload.sharedRecipientName` from `buildBulkExecutionCommitPayload`.

- [ ] **Step 4: Run the focused tests and confirm GREEN**

Run the same Node test command. Expected: all tests pass.

- [ ] **Step 5: Commit Task 1**

```powershell
git add src/lib/validations/disposal.ts src/lib/disposal-bulk-execution-ui.ts tests/disposal-validation.test.ts tests/disposal-bulk-execution.test.ts
git commit -m "feat(disposal): carry shared recipient in bulk packets"
```

---

### Task 2: Resolve The Authoritative Recipient Without Overwrite

**Files:**
- Modify: `src/lib/disposal-execution-service.ts`
- Modify: `src/lib/disposal-bulk-execution.ts`
- Modify: `src/lib/disposal-bulk-execution-service.ts`
- Test: `tests/disposal-bulk-execution-service.test.ts`

**Interfaces:**
- Produces: `resolveDisposalExecutionRecipient(requestRecipient, sharedRecipient): { recipientName: string | null; source: "request" | "shared" | null }`.
- Produces: `DisposalBulkExecutionItem.recipientName` and `recipientSource`.
- Consumes: `DisposalBulkExecutionInput.sharedRecipientName` from Task 1.

- [ ] **Step 1: Write failing service tests**

Add tests proving fallback, no overwrite, and blank behavior:

```ts
test("preview fills a missing donation recipient from the shared fallback", async () => {
  const response = await inspectDisposalBulkExecution({
    ...baseCommand,
    input: { ...baseCommand.input, sharedRecipientName: "Receiving Foundation" },
  }, dependenciesFor(makeRequest({ disposalType: "donate", recipientName: null })))

  assert.equal(response.items[0].outcome, "eligible")
  assert.equal(response.items[0].recipientName, "Receiving Foundation")
  assert.equal(response.items[0].recipientSource, "shared")
})

test("preview preserves an existing recipient over the shared fallback", async () => {
  const response = await inspectDisposalBulkExecution({
    ...baseCommand,
    input: { ...baseCommand.input, sharedRecipientName: "Fallback Destination" },
  }, dependenciesFor(makeRequest({ disposalType: "donate", recipientName: "Original Foundation" })))

  assert.equal(response.items[0].recipientName, "Original Foundation")
  assert.equal(response.items[0].recipientSource, "request")
})
```

Also assert that Commit passes the resolved recipient into the existing item executor and that a blank fallback still returns `DISPOSAL_RECIPIENT_REQUIRED`.

- [ ] **Step 2: Run the service test and confirm RED**

```powershell
node --test tests/disposal-bulk-execution-service.test.ts
```

Expected: the missing recipient remains blocked and result metadata is absent.

- [ ] **Step 3: Implement one deterministic resolver**

Add a pure helper in `disposal-execution-service.ts`:

```ts
export function resolveDisposalExecutionRecipient(
  requestRecipient: string | null | undefined,
  sharedRecipient: string | null | undefined,
) {
  const requestValue = requestRecipient?.trim() || null
  if (requestValue) return { recipientName: requestValue, source: "request" as const }
  const sharedValue = sharedRecipient?.trim() || null
  return {
    recipientName: sharedValue,
    source: sharedValue ? "shared" as const : null,
  }
}
```

Extend `DisposalExecutionSharedInput` with `sharedRecipientName?: string | null`, and use only the resolver's `recipientName` in `buildDisposalExecutionInput`.

Extend `DisposalBulkExecutionItem`:

```ts
recipientName: string | null
recipientSource: "request" | "shared" | null
```

In the bulk inspector, resolve from the freshly loaded candidate and `command.input.sharedRecipientName`, validate the effective execution input, and attach the same effective value/source to the ordered item result. Missing-request placeholders use `null` for both fields.

- [ ] **Step 4: Run service and policy tests and confirm GREEN**

```powershell
node --test tests/disposal-bulk-execution-service.test.ts tests/disposal-bulk-execution.test.ts tests/disposal-validation.test.ts
```

Expected: all tests pass, including existing per-request preservation and partial retry tests.

- [ ] **Step 5: Commit Task 2**

```powershell
git add src/lib/disposal-execution-service.ts src/lib/disposal-bulk-execution.ts src/lib/disposal-bulk-execution-service.ts tests/disposal-bulk-execution-service.test.ts
git commit -m "feat(disposal): resolve bulk recipient fallback safely"
```

---

### Task 3: Add The Shared Recipient To Review And Preview UI

**Files:**
- Modify: `src/components/disposal/disposal-bulk-execution.tsx`
- Modify: `src/app/[locale]/(dashboard)/disposal/page.tsx`
- Modify: `messages/en.json`
- Modify: `messages/th.json`
- Test: `tests/disposal-bulk-execution-ui.test.ts`

**Interfaces:**
- Consumes: `BulkExecutionPreviewPayload.sharedRecipientName` and server result recipient metadata.
- Produces: copy keys `bulkExecutionSharedRecipient`, `bulkExecutionSharedRecipientHelp`, `bulkExecutionRecipientSourceRequest`, and `bulkExecutionRecipientSourceShared`.

- [ ] **Step 1: Write failing source-contract and locale tests**

Require the component to own `sharedRecipientName`, pass it through current values, show a max-200 input only for recipient-requiring selected types, and render server result source labels. Add all four copy keys to the existing Thai/English parity list.

```ts
assert.match(source, /const \[sharedRecipientName, setSharedRecipientName\] = useState\(""\)/)
assert.match(source, /maxLength=\{200\}/)
assert.match(source, /recipientSource === "shared"/)
assert.equal(typeof thai.disposalPage.bulkExecutionSharedRecipient, "string")
assert.equal(typeof english.disposalPage.bulkExecutionSharedRecipient, "string")
```

- [ ] **Step 2: Run UI tests and confirm RED**

```powershell
node --test tests/disposal-bulk-execution-ui.test.ts
```

Expected: missing state, input, source rendering, and locale keys.

- [ ] **Step 3: Implement the adaptive form behavior**

Add state and reset it when selection identity changes or the dialog is fully closed:

```ts
const [sharedRecipientName, setSharedRecipientName] = useState("")
```

Include the trimmed value in `getCurrentValues`, previous-payload retry restoration, Context, and reviewed shared values. Determine recipient applicability from `selectedType`:

```ts
const recipientFallbackApplicable = selectedType != null
  && ["sell", "donate", "dispose"].includes(selectedType)
```

Render one full-width field below the three existing shared fields:

```tsx
<label className="text-sm font-medium text-foreground sm:col-span-3">
  {copy.sharedRecipient}
  <input
    value={sharedRecipientName}
    onChange={(event) => setSharedRecipientName(event.target.value)}
    maxLength={200}
    className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm ..."
  />
  <span className="mt-1 block text-xs text-muted-foreground">
    {copy.sharedRecipientHelp}
  </span>
</label>
```

In Preview, render `item.recipientName` from the server result and a visible source string for `request` or `shared`. Do not mark the field globally required because rows with existing recipients remain valid; server item-level Preview remains the authoritative gate.

- [ ] **Step 4: Add concise Thai and English copy**

Thai:

```json
"bulkExecutionSharedRecipient": "ผู้รับ / ผู้ซื้อ / ปลายทางร่วม",
"bulkExecutionSharedRecipientHelp": "ใช้เฉพาะรายการที่ยังไม่ได้ระบุ และจะไม่ทับข้อมูลเดิมของคำขอ",
"bulkExecutionRecipientSourceRequest": "ข้อมูลเดิมของคำขอ",
"bulkExecutionRecipientSourceShared": "ใช้ค่าร่วม"
```

English:

```json
"bulkExecutionSharedRecipient": "Shared recipient / buyer / destination",
"bulkExecutionSharedRecipientHelp": "Applied only to requests that are missing this value. Existing request data is not overwritten.",
"bulkExecutionRecipientSourceRequest": "Existing request value",
"bulkExecutionRecipientSourceShared": "Uses shared value"
```

- [ ] **Step 5: Run UI, service, and locale tests and confirm GREEN**

```powershell
node --test tests/disposal-bulk-execution-ui.test.ts tests/disposal-bulk-execution-service.test.ts tests/disposal-bulk-execution.test.ts tests/disposal-validation.test.ts
```

- [ ] **Step 6: Commit Task 3**

```powershell
git add src/components/disposal/disposal-bulk-execution.tsx 'src/app/[locale]/(dashboard)/disposal/page.tsx' messages/en.json messages/th.json tests/disposal-bulk-execution-ui.test.ts
git commit -m "feat(disposal): add shared recipient bulk UI"
```

---

### Task 4: Documentation, Full Verification, And Browser UAT

**Files:**
- Modify: `docs/superpowers/specs/2026-07-14-disposal-bulk-recipient-fallback-design.md`
- Modify: `docs/06_WORKFLOWS.md`
- Modify: `docs/07_UAT_CHECKLIST.md`
- Modify: `docs/99_CHANGELOG.md`
- Modify: `DEVELOPER_HANDOFF.md`

**Interfaces:**
- Consumes: completed behavior from Tasks 1-3.
- Produces: current operational guidance and traceable acceptance evidence.

- [ ] **Step 1: Update the design response contract and operational docs**

Document `recipientName` and `recipientSource` in the Preview item response, the fallback-only/no-overwrite rule, and UAT using two approved donations with blank recipients.

- [ ] **Step 2: Run formatting and full verification**

```powershell
git diff --check
npm run verify
```

Expected: lint completes without new errors, all tests pass, Prisma Client generates, and the Next.js production build completes.

- [ ] **Step 3: Run authenticated browser UAT in Preview mode only**

At `/th/disposal?status=approved&page=1&pageSize=25`:

1. Enable multi-select.
2. Select two approved donation requests with no recipient.
3. Open bulk execution review.
4. Confirm the shared recipient field is visible and the help text says existing values are preserved.
5. Enter `ปลายทางทดสอบสำหรับ Preview` plus the required shared execution/evidence-exception values.
6. Submit Preview only.
7. Confirm both rows are eligible with the effective recipient and `ใช้ค่าร่วม`.
8. Close the dialog without permanent Commit.

- [ ] **Step 4: Commit documentation and QA evidence**

```powershell
git add docs/superpowers/specs/2026-07-14-disposal-bulk-recipient-fallback-design.md docs/06_WORKFLOWS.md docs/07_UAT_CHECKLIST.md docs/99_CHANGELOG.md DEVELOPER_HANDOFF.md
git commit -m "docs(disposal): document shared recipient fallback"
```

- [ ] **Step 5: Integrate and push**

Confirm only feature-owned files are staged, merge the isolated implementation branch into `master`, and push `master` to `origin` without staging unrelated `.agents`, `.gemini`, `.codex`, `.impeccable`, `.superpowers`, or backup-file changes.
