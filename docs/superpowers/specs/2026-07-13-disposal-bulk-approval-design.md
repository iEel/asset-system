# Disposal Bulk Approval Design

## Goal

Allow authorized approvers to approve multiple pending disposal requests from the disposal queue while preserving item-level RBAC, segregation of duties (SOD), lifecycle validation, movements, audit logs, and batch status derivation.

Bulk approval is an efficiency layer over the existing approval workflow. It does not introduce a second disposal lifecycle or change the meaning of `pending -> approved`.

## Scope

- Selection starts from `/[locale]/disposal` and may include independent requests or children from different disposal batches.
- A bulk operation may contain at most 50 request IDs.
- Only approval is supported. Bulk rejection and bulk execution remain out of scope because their reasons, evidence, recipients, values, and outcomes require item-level review.
- Existing per-request sale value, salvage value, type, evidence, and request metadata remain unchanged.
- The approver may provide one optional shared approval remark. That remark is copied to each request that is successfully approved so every item remains independently auditable.
- Selection applies to the currently loaded page. The interface does not silently select matching records across unloaded pages.

## User Experience

### Queue Selection

Users with `disposal:approve` see selection controls for pending requests. Requests that are visibly ineligible because of their stage or the current actor's SOD relationship remain visible but cannot be selected; the disabled control exposes a concise reason.

The queue keeps its normal low-density toolbar until at least one request is selected. Selection then reveals a contextual bulk toolbar with:

- selected count;
- Select page / Clear selection;
- `ตรวจสอบและอนุมัติ` as the primary action.

Desktop uses the table checkbox column and a contextual toolbar above the result set. Mobile uses an explicit selection mode in the list header and check controls on cards. The mobile action stays in the selection header or content flow rather than creating another bottom bar that could collide with Mobile Field Navigation.

Selection resets when filters, page, page size, or stage change. The UI warns before discarding a non-empty selection when the navigation is initiated inside the selection controls.

### Preflight Dialog

The primary action opens a preview dialog only after a server preflight. The dialog presents three explicit totals:

- selected;
- eligible for approval;
- blocked or no longer eligible.

Blocked requests are grouped by reason and may be expanded to show disposal number and asset tag. Expected reasons include:

- request is no longer pending;
- request is inactive or missing;
- requester or creator cannot approve because SOD is enabled;
- current user no longer has approval permission;
- asset is no longer in the required Pending Disposal state;
- request data required for the existing approval contract is invalid.

The dialog never silently drops an item. Confirmation copy states exactly how many eligible requests will be approved and how many will remain unchanged. The shared approval remark is optional and does not alter financial values or type-specific fields.

Confirmation is disabled when the server reports zero eligible requests.

### Completion State

After confirmation, the dialog reports:

- successfully approved;
- skipped after final revalidation;
- failed due to a processing error.

The user can expand skipped and failed groups to see item-level reasons. Successful rows refresh to the approved stage, selection clears for those rows, and unresolved rows may remain selected for review. A single summary toast supplements the dialog but does not replace the detailed result.

## Server Design

### Shared Approval Service

Extract the authoritative single-request approval operation from `PATCH /api/disposal-requests/[id]` into a focused server-side service. Both single approval and bulk approval call this service so they share:

- `disposal:approve` authorization;
- pending-stage and active-record checks;
- SOD validation against requester and creator;
- required asset lifecycle status validation;
- approved status, approver, timestamp, and shared remark updates;
- asset movement creation;
- audit log creation;
- parent disposal batch status derivation.

The service operates atomically for one request. It returns a stable result code instead of exposing raw database messages.

### Bulk Endpoint

Add `POST /api/disposal-requests/bulk-decision` with two modes:

```json
{
  "mode": "preview",
  "requestIds": ["request-id"]
}
```

```json
{
  "mode": "commit",
  "requestIds": ["request-id"],
  "approvalRemark": "Optional shared remark"
}
```

Input rules:

- 1-50 unique request IDs;
- decision is implicitly `approve` and cannot be changed by the client;
- approval remark uses the existing optional text constraints;
- duplicate IDs are rejected or normalized before processing, with the final selected count made explicit.

Preview performs server-authoritative permission, stage, SOD, lifecycle, and record checks without mutation. Commit repeats all checks because records may change after preview.

Commit processes each eligible request through the shared service. Each item has its own transaction so one conflict does not roll back successful approvals. Processing is sequential or concurrency-limited to avoid exhausting SQL Server connections. The endpoint returns item-level outcomes in the input order.

Parent batch statuses are recalculated for every affected batch. The implementation should deduplicate affected batch IDs and avoid unnecessary repeated aggregate queries where this can be done without weakening item-level atomicity.

### Response Contract

Preview and commit use stable item results:

```json
{
  "summary": {
    "selected": 3,
    "eligible": 2,
    "blocked": 1,
    "approved": 0,
    "failed": 0
  },
  "items": [
    {
      "requestId": "request-id",
      "disposalNo": "DP-20260713-0001",
      "assetTag": "IT-001",
      "outcome": "eligible",
      "code": null
    }
  ]
}
```

Supported outcomes are `eligible`, `blocked`, `approved`, and `failed`. Error codes are translated in Thai and English by the client. Raw Prisma, SQL Server, stack trace, or internal policy text is never returned to the user.

## Consistency And Concurrency

- Preview is advisory; commit is authoritative.
- Every request is re-read and revalidated immediately before mutation.
- A request already approved by another user becomes skipped/blocked rather than being approved twice.
- Movement and audit records are created only in the same item transaction as the request update.
- Optimistic or conditional updates prevent two approvers from mutating the same pending request concurrently.
- A partial network failure may leave earlier item transactions committed. Retrying is safe because already-approved requests are reported as no longer eligible and are not duplicated.

## Permissions And Auditability

- The queue never renders selection or bulk controls without `disposal:approve`.
- The API independently enforces authentication and `disposal:approve` for preview and commit.
- Existing workflow approval settings remain authoritative.
- Each approved request stores its approver and approval time independently.
- Each request receives its own movement and audit log entry. The bulk action may also create one operational summary log containing selected, approved, blocked, and failed counts, but this summary never replaces item logs.
- Shared remarks are copied to successful requests; blocked and failed requests are not modified.

## Accessibility And Responsive Behavior

- Selection checkboxes have accessible labels containing disposal number and asset tag.
- The contextual toolbar is keyboard reachable and announces selection count changes through a polite live region.
- The preview/result dialog uses the existing accessible dialog contract: initial focus, focus trap, Escape when safe, focus restoration, and explicit loading state.
- Status and outcome use text plus icon/shape, never color alone.
- Mobile touch targets are at least 44px and selection mode does not overlap global navigation.
- Long Thai reasons wrap without causing horizontal page overflow.

## Error Recovery

- Preview failure keeps the current selection and offers retry.
- Commit disables duplicate submission while in progress.
- A fully failed commit retains all selected items and displays item-level recovery details.
- A partially successful commit removes successful items from selection and retains skipped/failed items for inspection.
- Closing the result dialog after success refreshes queue counts and rows while preserving active filters, sort, page size, and page where still valid.

## Testing

Automated tests cover:

- permission denial for preview and commit;
- 1-50 unique ID validation;
- selection and contextual toolbar visibility;
- preview grouping for eligible and blocked requests;
- SOD checks for requester and creator;
- stage and lifecycle revalidation between preview and commit;
- partial success without duplicate movement or audit records;
- safe retry after a partial result;
- shared remark copied only to successful requests;
- affected batch status derivation;
- stable translated error codes;
- mobile selection mode and no collision with Mobile Field Navigation;
- keyboard and dialog focus behavior.

Manual UAT covers mixed independent/batch requests, mixed disposal types, two approvers acting concurrently, filter/page changes with an active selection, mobile selection, and a simulated network interruption during commit.

## Out Of Scope

- Bulk rejection.
- Bulk disposal execution.
- Editing sale, salvage, recipient, document, evidence, or type-specific values during bulk approval.
- Selecting all matching records across every pagination page.
- Bypassing SOD, RBAC, lifecycle, evidence, or audit requirements.
