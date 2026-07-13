# Controlled Bulk Disposal Execution Design

## Objective

Allow authorized operators to record actual disposal for multiple approved requests without repeating the same execution fields, while preserving item-level lifecycle validation, segregation of duties, evidence policy, movement history, audit logs, and partial-failure recovery.

## Scope

- Add bulk execution only to the `approved` disposal queue.
- Process at most 20 selected requests per operation.
- Require every selected request to use the same disposal type.
- Apply one shared actual date, executor, and final asset status to the selection.
- Preserve request-specific recipient, destination, document number, sale value, salvage value, and execution detail.
- Support the existing historical no-evidence exception only under the exact `system_admin` policy.
- Do not add or change database schema.
- Do not add bulk rejection or change the existing bulk approval behavior.

## Selection And Eligibility

Bulk execution controls appear only when the current queue stage is `approved` and the user has `disposal:edit`. Selection is scoped to the currently loaded page and is cleared when stage, filters, pagination, page size, or search changes.

A selection may contain at most 20 requests. The first selected request establishes the disposal type for that selection. Requests with another type remain visible but cannot be selected and explain the type mismatch. A selected request must be active, approved, associated with an active asset in `Pending Disposal`, and eligible under the existing execution and SOD rules.

The queue must not rely on the client eligibility state for authorization. Both preflight and commit reload authoritative request, asset, employee, evidence, role, and workflow-policy data.

## Shared And Per-Item Data

The operator supplies these shared values once:

- actual disposal date;
- active executor;
- final active asset status, limited to `Disposed` or `Retired`;
- historical no-evidence mode, reason, and acknowledgement when applicable.

Every item retains its own existing request values:

- disposal type;
- recipient, buyer, or destination;
- document number;
- sale and salvage amounts;
- execution or incident details;
- request evidence and inherited batch evidence;
- requester, approver, and approval timestamps.

Bulk execution never copies one item's request-specific values to another item.

## Historical No-Evidence Mode

Historical execution without evidence is available only when all selected requests have zero active item evidence and zero active inherited batch evidence. The caller must have `disposal:edit` and the exact active role code `system_admin`.

The operator must enter one shared reason containing 20 to 2,000 trimmed characters and acknowledge that the change is permanent and audit logged. The reason, granting user, grant time, and historical audit action are persisted independently on every successful request. If any selected request has evidence, that request is blocked during preflight and revalidation; normal evidence execution remains available for an all-evidence selection.

Normal and historical execution modes cannot be mixed in one commit.

## Preflight And Commit

Add a dedicated bulk-execution endpoint with `preview` and `commit` modes. Preview is non-mutating and returns an item-level eligibility result. It is advisory only.

Commit repeats validation immediately before each item is executed. Each eligible request is passed to the existing concurrency-safe disposal execution service in its own serializable transaction. This preserves the existing guarded updates, SOD, lifecycle rules, evidence checks, movement, audit log, and parent-batch status derivation without holding one large transaction across the full selection.

The endpoint returns ordered item results with one of:

- `executed`: actual disposal was recorded;
- `blocked`: the request is no longer eligible or violates policy;
- `failed`: an unexpected item-level execution failure occurred.

One item failure does not roll back successful sibling items. A retry submits only unresolved IDs. Already executed items are returned as blocked rather than producing duplicate movement or audit records.

## API Contract

Request:

```ts
type DisposalBulkExecutionRequest = {
  mode: "preview" | "commit"
  requestIds: string[] // 1..20 unique IDs
  actualDate: string
  executorId: string
  finalStatusId: string
  useHistoricalEvidenceException: boolean
  evidenceExceptionReason?: string | null
  evidenceExceptionAcknowledged?: boolean
}
```

Response:

```ts
type DisposalBulkExecutionResponse = {
  mode: "preview" | "commit"
  selectedCount: number
  eligibleCount: number
  blockedCount: number
  executedCount: number
  failedCount: number
  items: Array<{
    requestId: string
    disposalNo: string | null
    assetLabel: string | null
    disposalType: string | null
    outcome: "eligible" | "executed" | "blocked" | "failed"
    code: string | null
  }>
}
```

The endpoint requires authentication and `disposal:edit`. Stable policy codes are localized by the client. Infrastructure errors are logged server-side and returned as a generic bulk-execution failure.

## User Experience

### Desktop

The approved queue offers an explicit selection mode. Checkboxes appear only in that mode. A contextual toolbar shows selected count, the 20-item limit, established disposal type, clear selection, and `Review and execute`.

The review dialog presents:

1. shared actual execution fields;
2. historical exception controls only for eligible system administrators;
3. a preflight summary with selected, eligible, and blocked totals;
4. grouped item-level reasons;
5. a permanent-action confirmation before commit;
6. a result view with executed, blocked, and failed rows plus retry for unresolved items.

### Mobile

Selection is enabled explicitly from the approved-list header. Checks and the contextual action remain in document flow; no new fixed bottom bar is added, preventing collision with Mobile Field Navigation and page-level action bars. The dialog uses a full-height responsive sheet with at least 44px touch targets, focus trapping, Escape safety, focus restoration, and readable Thai/English copy.

## Error And Concurrency Handling

- Reject duplicate IDs, empty selections, selections above 20, malformed shared fields, and mixed disposal types.
- Revalidate permission, exact system-admin role, SOD, stage, active records, executor, final status, evidence, and type-specific fields on commit.
- Treat schema-readiness uncertainty as a fail-closed item result.
- Map concurrent updates to the existing stable `DISPOSAL_CONCURRENT_UPDATE` code.
- Never expose SQL Server, Prisma, connection, or stack details to the client.
- Keep successful item results visible if another item fails.

## Accessibility And Localization

- Use existing Navy, white, Action Blue, semantic status tones, shared controls, and Lucide icons.
- Status and eligibility must include text, not color alone.
- Selection controls need accessible names containing disposal and asset identity.
- Dialog title and description must be associated correctly; dynamic result updates use a polite live region.
- Historical mode warning must be linked to its control with `aria-describedby`.
- All new copy and stable error codes require Thai and English messages.

## Testing And Acceptance

Automated tests must cover:

- one to 20 unique IDs and rejection above the limit;
- same-type selection enforcement;
- preview eligibility and item-level block reasons;
- normal evidence execution;
- exact-system-admin historical execution;
- rejection of mixed normal/historical evidence selections;
- SOD, permission, inactive employee/status, wrong stage, and asset lifecycle guards;
- concurrent or already-executed requests without duplicate movement/audit records;
- partial success and retry of unresolved items;
- preservation of request-specific financial and recipient fields;
- parent batch status derivation;
- Thai/English message coverage and keyboard/focus behavior.

Manual UAT must verify desktop selection, mobile selection mode, normal evidence execution, historical no-evidence execution, partial failure, retry, approval history, system logs, movement history, and final asset status against SQL Server.

## Documentation Changes

Update the disposal workflow, UAT checklist, production readiness notes, changelog, and developer handoff summary. Replace the previous statement that bulk execution is unavailable with this controlled design, while retaining the 20-item limit and the distinction between bulk approval and bulk execution.
