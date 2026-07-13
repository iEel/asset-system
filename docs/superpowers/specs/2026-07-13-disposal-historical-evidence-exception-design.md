# Disposal Historical Evidence Exception Design

## Goal

Allow an administrator to close an approved disposal request when the asset was physically disposed of in the past and no photo or disposal document remains, without weakening the normal evidence requirement for current disposal work.

The exception is a permanent, controlled recovery path for historical records. It is not a shortcut for ordinary disposal execution.

## Authoritative Workflow

The existing disposal workflow remains authoritative:

`pending -> approved -> disposed`

- A historical exception does not bypass request approval.
- The request must be active and in `approved` status.
- Existing disposal lifecycle validation remains in force.
- Existing requester, approver, and executor segregation-of-duties checks remain in force.
- Execution may still end only in Disposed or Retired.
- The exception is executed one request at a time. Bulk historical execution is out of scope for the first release.

## Authorization

Only a session with the exact `system_admin` role may submit a historical evidence exception. Normal permission inheritance is insufficient: having `disposal:edit` or another broad permission does not grant this exception.

The server validates the role independently of the UI. Hiding the control from other users is not treated as authorization.

Users with normal disposal execution permission continue to receive `DISPOSAL_EVIDENCE_REQUIRED` when no active disposal attachment exists.

## Data Model

Add nullable fields to `DisposalRequest`:

- `evidenceExceptionReason` (`NVARCHAR(MAX)`): the administrator's factual explanation for why no evidence remains.
- `evidenceExceptionGrantedBy` (`NVARCHAR(100)`): the authenticated user ID that authorized the exception.
- `evidenceExceptionGrantedAt`: the server timestamp when the exception was accepted.

All three fields are null for normal evidence-backed execution. A non-null exception reason identifies a historical execution without evidence.

The fields are added with an idempotent SQL Server manual migration. Existing disposal records remain valid without backfill.

## Execution Input And Validation

The execution payload gains:

- `useHistoricalEvidenceException: boolean`
- `evidenceExceptionReason: string | null`
- `evidenceExceptionAcknowledged: boolean`

Normal execution keeps the current requirements for evidence and document number.

Historical exception execution requires:

- zero effective active attachments for the disposal request;
- authenticated `system_admin` role;
- an explanation between 20 and 2,000 characters after trimming;
- explicit acknowledgement that the asset was disposed of previously and no evidence remains;
- execution date, executor, and final asset status;
- all current type-specific fields except document number, which becomes optional only for this exception.

If active evidence exists, the server rejects the exception and instructs the user to use normal execution. This prevents valid evidence from being hidden behind an exception label.

Effective evidence includes both item evidence (`module = disposal`, `referenceId = requestId`) and shared batch evidence (`module = disposal_batch`, `referenceId = batchId`). Normal execution accepts either source. This also corrects the current mismatch where shared batch evidence is visible from a child request but is not counted by the execution route.

The server rejects exception-only fields when the exception mode is not selected, preventing accidental or misleading metadata.

## Transaction And Audit Trail

The disposal request update, asset status update, asset movement, batch status derivation, exception metadata, and system audit log are written in one database transaction.

Historical execution uses the audit action `execute_historical_without_evidence`. The audit record includes:

- previous request and asset status;
- final request and asset status;
- execution date and executor;
- exception reason;
- authenticated user ID granting the exception;
- `evidenceCount: 0`;
- acknowledgement state.

The transaction fails if the audit record cannot be written. Ordinary execution is moved to the same transactional audit path so both execution modes have equivalent traceability.

## User Experience

The existing execution dialog remains the only execution entry point.

When there are no active disposal attachments:

- normal executors see a blocking evidence message and a direct instruction to attach evidence;
- `system_admin` also sees a warning-toned option labeled `บันทึกย้อนหลังโดยไม่มีหลักฐาน`;
- selecting the option reveals the reason field and acknowledgement control;
- the primary action changes to `ยืนยันการตัดจำหน่ายย้อนหลัง`;
- the warning explains that the action is permanent, audit logged, and does not replace the normal evidence policy.

When evidence exists, the historical exception control is not shown and normal execution continues.

The UI uses existing panel, field, button, dialog, status, focus-management, and Lucide icon patterns. It does not introduce a separate workflow or a new disposal status.

## Record Presentation

Completed historical exceptions display a visible warning label:

`ตัดจำหน่ายย้อนหลัง · ไม่มีหลักฐาน`

The disposal detail workspace and final print view show:

- exception label;
- exception reason;
- administrator who granted the exception;
- grant date and time.

Normal evidence-backed records do not show this section. Status remains `disposed`; the exception label describes evidence quality, not lifecycle state.

## Error Handling

Add stable API errors with Thai and English translations:

- `DISPOSAL_EVIDENCE_EXCEPTION_FORBIDDEN`
- `DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED`
- `DISPOSAL_EVIDENCE_EXCEPTION_ACK_REQUIRED`
- `DISPOSAL_EVIDENCE_EXCEPTION_NOT_APPLICABLE`

Unexpected infrastructure errors remain sanitized. The client does not display raw server or database messages.

## Testing

Automated tests cover:

- only `system_admin` may use the exception;
- `disposal:edit` without `system_admin` is insufficient;
- normal execution still requires evidence;
- exception reason length and acknowledgement validation;
- document number is optional only in exception mode;
- exception is rejected when active evidence exists;
- approval stage, final status, active executor, and SOD guards remain enforced;
- exception metadata is persisted;
- audit action and payload are written transactionally;
- manual migration is idempotent and contains all new columns;
- Thai and English messages resolve without missing ICU variables;
- detail and print views expose the exception clearly.

Manual UAT covers system administrator and normal executor sessions, desktop and mobile execution dialogs, keyboard focus, failed validation recovery, print output, and an approved historical disposal with no attachments.

## Documentation And Operational Notes

Update the disposal workflow, UAT checklist, database documentation, production readiness notes, and changelog.

Operational policy must state that the exception is for verified historical facts only. Administrators must not use it merely because collecting current evidence is inconvenient. Future disposal work continues to require evidence before the asset leaves organizational control.
