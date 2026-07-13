# Disposal Production Readiness Design

## Goal

Make the disposal module production-ready for Thai enterprise operations without replacing its existing asset lifecycle, audit trail, RBAC, evidence, and return-navigation foundations.

## Workflow

The authoritative stages remain `pending -> approved -> disposed` with `rejected` as a terminal branch. The UI presents these as `รออนุมัติ`, `อนุมัติแล้ว รอดำเนินการ`, `ดำเนินการเสร็จสิ้น`, and `ปฏิเสธ`.

- Request creation moves an eligible asset to Pending Disposal.
- Approval requires `disposal:approve`; execution requires `disposal:edit`.
- When workflow segregation is enabled, requester/creator cannot approve their own request and approver cannot be recorded as the executor.
- Rejection may return only to Ready. Execution may end only in Disposed or Retired.
- Assets already Disposed, Retired, Lost, Missing, Under Maintenance, or Pending Repair are not eligible for a new disposal request. Pending Disposal is eligible only when reached through the current open request.
- `lost` is an incident outcome, not a valid execution target in this disposal flow. Lost requests close to Retired or Disposed after the required incident evidence is recorded.

## Type-Specific Requirements

- `sell`: buyer/recipient, actual sale value, document number, evidence.
- `donate`: recipient, document number, evidence.
- `destroy`: execution remark describing method, document number, evidence.
- `lost`: execution remark describing incident, document number, evidence.
- `dispose`: recipient/destination, document number, evidence.

The create form progressively discloses estimated sale/salvage values only for relevant types. The execution form shows only valid final statuses and labels its fields for the selected type.

## Information Architecture

- `/[locale]/disposal`: queue-first list with stage tabs/counts, filters, total-aware pagination, mobile cards, and one primary Create Request action.
- `/[locale]/disposal/new`: focused request creation route. Source links from maintenance/audit/asset quick actions prefill this route.
- `/[locale]/disposal/[id]`: decision workspace with workflow stepper, current owner/next action, progressive stage details, evidence, asset context, and history.

Creation is considered successful as soon as the request record exists. Evidence upload failures are reported separately and remain retryable from detail; the form never invites resubmitting a request that already exists.

## Batch Disposal Packets

A `DisposalBatch` groups multiple existing `DisposalRequest` records under one batch number and shared request metadata. Each child request retains its own lifecycle state, movement history, item evidence, and final result. Shared batch evidence is stored once using `attachments.module = disposal_batch` and is visible from every child request. Creation is atomic, while approval and execution remain independent per child request so RBAC, SOD, evidence, and item-level exceptions remain explicit. The batch workspace derives aggregate progress from those child states and never silently skips an item.

The initial batch route supports 2-100 eligible assets of one disposal type. Larger imports remain out of scope.

## Accessibility And Error Recovery

- Decision and execution use the existing accessible dialog pattern: dialog semantics, focus trap, Escape, backdrop close when safe, and focus restoration.
- Controls are permission-aware; viewers never see upload/delete or mutation actions they cannot complete.
- API errors use stable error codes translated by the client instead of exposing English server strings.
- Status is never communicated by color alone.

## Data And Migration

Add `DisposalBatch` plus nullable `batchId` on `DisposalRequest` through an idempotent SQL Server manual migration. Existing requests remain valid with `batchId = NULL`.

## Verification

Automated tests cover permissions, SOD, lifecycle eligibility, type requirements, pagination, upload recovery, accessible dialog usage, queue/create separation, batch limits, and batch item behavior. Manual UAT covers each disposal type, desktop/mobile queue/detail/create, real evidence upload failure/retry, and requester/approver/executor role separation.
