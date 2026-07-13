# Bulk Disposal Shared Recipient Fallback Design

## Objective

Allow an authorized operator to supply one shared recipient, buyer, or destination while executing approved disposal requests in bulk. The shared value fills only selected requests whose authoritative recipient is blank. It never overwrites an existing request-specific value.

## Scope

- Extend the existing controlled bulk execution dialog and endpoint.
- Support disposal types that require a recipient: `sell`, `donate`, and `dispose`.
- Keep the existing 20-item limit, same-type selection rule, evidence policy, SOD checks, lifecycle validation, movement history, and audit logging.
- Do not change the database schema or the single-request execution workflow.
- Do not add shared document, sale value, salvage value, or execution-detail overrides in this change.

## User Experience

The bulk execution review form shows a `ผู้รับ / ผู้ซื้อ / ปลายทางร่วม` field only when the selected disposal type is `sell`, `donate`, or `dispose`.

Supporting text explains that the value is applied only to selected requests that do not already have a recipient. The field is optional when every selected request already has a recipient and required when at least one selected request is missing it. The input accepts a trimmed value of at most 200 characters.

The Preview step shows the effective recipient for every selected request. A small source label distinguishes:

- `ข้อมูลเดิมของคำขอ` when the request already has a recipient; and
- `ใช้ค่าร่วม` when the shared fallback supplies it.

If a selected request is missing a recipient and the shared field is blank, Preview blocks that request with `DISPOSAL_RECIPIENT_REQUIRED`. Existing request values remain visible and are never replaced by the shared field.

## API Contract

Add one optional field to both bulk Preview and Commit payloads:

```ts
sharedRecipientName?: string | null
```

The schema trims the value, converts an empty string to `null`, and enforces a maximum length of 200 characters. Unknown fields remain rejected according to the existing route contract.

Commit uses the exact shared recipient captured in the accepted Preview payload. Retry also carries that same value so unresolved requests are evaluated consistently.

## Server Resolution

For each freshly loaded authoritative request, the bulk service resolves:

```text
effectiveRecipient = nonBlank(request.recipientName) ?? sharedRecipientName
```

The service passes `effectiveRecipient` into the existing single-request execution service. An existing nonblank recipient always wins, including during commit revalidation. The shared value is therefore a fallback, not a bulk overwrite.

Preview and Commit both reload each request and apply the same resolution. The existing type-aware validation then decides whether the effective recipient is sufficient. No client-derived recipient is trusted as an authoritative per-item value.

## Preview Data

The existing list-page item snapshot is used only to help the operator understand which rows appear to need the fallback before Preview. Server eligibility and the final effective value remain authoritative.

The Preview UI derives the displayed effective value from the locked Preview payload plus the selected item snapshot. Commit still revalidates on the server. If a request changes concurrently, existing guarded execution behavior and stable error codes remain in force.

## Accessibility And Localization

- Associate the shared input with visible Thai and English labels and help text.
- Keep the input at least 44px high on mobile.
- Do not rely on color alone for the recipient source indicator.
- Add Thai and English copy for the shared label, help text, existing-value source, and shared-value source.
- Preserve focus trapping, Escape handling, and focus restoration in the current dialog.

## Testing

Automated tests must prove:

- the payload schema accepts `null` and a trimmed value up to 200 characters and rejects longer values;
- a missing donation recipient becomes eligible when a shared recipient is supplied;
- an existing request recipient is never overwritten by the shared value;
- blank shared input still returns `DISPOSAL_RECIPIENT_REQUIRED`;
- Preview, Commit, and retry preserve the same shared recipient;
- the field is shown only for recipient-requiring disposal types;
- Preview copy distinguishes existing and shared recipient sources;
- Thai and English messages remain in parity.

Manual UAT uses two approved donation requests with no recipient, enters one shared destination, verifies both Preview rows show `ใช้ค่าร่วม`, and stops before permanent Commit unless the operator intends to record the real disposal.

## Acceptance Criteria

- The operator can complete the missing-recipient requirement without leaving the bulk dialog.
- Existing recipient values are unchanged.
- Preview shows the effective recipient and its source for every selected request.
- The server remains the source of truth and revalidates before each permanent execution.
- No schema migration is required.
