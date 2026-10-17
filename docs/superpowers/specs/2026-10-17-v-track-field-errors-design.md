# V Track Design: Errors Under the Field

Date: 2026-10-17 · Base: `master` `9e17cab` (phase 2D and Dark Mode merged and pushed, not deployed) · Order: V track → E2E (desktop and phone, both themes) → one deploy (wiki item 27).
Earlier decisions this builds on: spec 2C K4, K5 a, K6 a (`docs/superpowers/specs/2026-10-11-ui-phase2c-design.md`) and its §8.5 and §8.11 (`docs/superpowers/specs/2026-10-11-ui-phase2c/08-batches.md`).

## 1. Intent

"กดบันทึกไม่ผ่าน ไม่รู้ว่าอะไรผิด" (the user, 2026-10-17). Today a person who presses save and is refused gets, depending on the form, the browser's own bubble, a toast in the corner, a generic "ข้อมูลที่กรอกไม่ครบหรือไม่ถูกต้อง" from the server, a disabled button with no reason, or nothing at all. After the V track every form says what is wrong under the field that is wrong, in Thai, and takes the person to it.

Success: in any form, pressing save with a mistake puts the cursor on the first field to fix, with a message under it that says what to do, and the same happens when it is the server that refuses.

## 2. Decided by the user

| # | Decision | When |
|---|---|---|
| U1 | Errors appear under the field that is wrong; the page goes to the first wrong field (switching the settings tab first). | 2C K5 a, confirmed 2026-10-17 |
| U2 | No more toasts for validation; toasts stay for other failures (network, server error, conflicts). | 2C K5 a |
| U3 | The server returns which fields failed (`fieldErrors`) in its 400 body, for every route; Integration v1 does not change. **The server change is approved** (2026-10-17: "อนุมัติ"). | 2C K6 a, 2026-10-17 |
| U4 | Date pairs: the end date cannot be picked before the start date. | 2C K5 a |
| U5 | **Every form in one round** (not domain by domain). | 2026-10-17 |
| U6 | Errors show after pressing save, not while typing; a field's error clears when that field changes. | my proposal, accepted 2026-10-17 |
| U7 | No new dependency; one shared hook plus a `validate()` per form. | 2C K5 a |
| U8 | Warnings that already show while typing stay instant, but move under the field as that field's error (the 13 settings `ValidationMessage` boxes, the prefix editor, the asset batch duplicate warning, the asset form's duplicate check); a save shows nothing twice. | 2026-10-17 |
| U9 | The server calls of §11 (3–5) are accepted: dotted keys and `_form`, one camelCase code set with supplier moved onto it, duplicate values answering 409 with a field error on create and update, other non-zod field refusals with `fieldErrors`. | 2026-10-17 |

## 3. Goals, non-goals, anti-goals

**Goals**
- G1. Every form in §5 shows its validation errors under the fields, never as a validation toast, and focuses the first wrong field on submit.
- G2. The server's 400 for invalid input carries `fieldErrors`, and every form maps them onto its fields; a server refusal looks the same as a client one.
- G3. Content rules that today hide behind a disabled button become errors on submit; prerequisites that are not about a field keep their gate but always say why.
- G4. The 32 custom server messages that never reach the person (catalog keys exist, e.g. `endBeforeStart`) reach them, under the field.
- G5. Errors are announced once per submit to screen readers and work in both themes and with forced colors.

**Non-goals**
- New live validation while typing (U6). The checks that are live today stay live (U8).
- Changing what is valid: no rule is added on the server except where §6.3 lists it; the client never accepts what the server refuses.
- Integration v1 (`src/app/api/integrations/v1/**`, `integrationErrorResponse`) and the login form (it has its own inline error) do not change.
- A form library: `react-hook-form` and `@hookform/resolvers` are installed but unused; they stay unused (removing them is a separate clean-up).
- Offline-queued audit scans: errors after a later replay cannot map back to a closed form; they keep today's behaviour.

**Anti-goals**
- A form that refuses to save and shows nothing near a field.
- A toast and an under-field error for the same mistake, or a live warning box and an under-field error for the same mistake.
- The browser's native bubble appearing before our errors (it would hide them).
- A wrong field on a hidden tab, in a closed `<details>` or behind an open review dialog, with the person left looking at a page that shows no error.
- Five alerts read out at once after one submit.

## 4. Behaviour

### 4.1 On submit
1. The form runs its `validate()` (client rules, §4.4). If it finds errors: they show under their fields, nothing is sent, the first wrong field in the form's visual order gets focus and is scrolled into view clear of the sticky footer and the top bar.
2. Otherwise it submits. If the server answers 400 with `fieldErrors`, the same happens with the server's errors.
3. If the server's errors name no field the form shows (or name the form itself), the form shows its existing form-level message (the dialog Notice or the toast it uses today for "ข้อมูลที่กรอกไม่ครบหรือไม่ถูกต้อง"), so nothing fails silently.
4. Every other failure (network, 401/403, 409 conflict, 5xx) keeps today's handling (toast or Notice).

### 4.2 Where the first wrong field is not on screen
- **Settings tabs** (`system-settings-form.tsx`): switch to the tab that owns the field (the existing `selectTab`), wait for it to render, open a closed `<details>` that holds it, then focus.
- **Review dialogs and review steps** (checkout, checkin, transfer, asset batch "reviewing"): a server field error closes the review and returns to the form, then focuses the field.
- **Multi-step flows** (component install, import, disposal batch, bulk execution): go back to the step that owns the field.
- **Mobile sheet** (audit scan check): the sheet stays open; focus moves inside it.

### 4.3 Clearing
- A field's error clears when that field's value changes.
- For a pair or group rule (end ≥ start; "at least one destination"; license used ≤ total), changing any field of the pair or group clears the error.
- A new submit recomputes everything.

### 4.4 What counts as what
- **Content rules** (a value is empty, too long, too short, out of range, badly formed, or contradicts another field): an error under the field after submit. This includes rules that today disable the button: status-correction reason ≥ 5 characters, state-review reason ≥ 10, disposal batch reason ≥ 12 and requester, disposal execution historical reason ≥ 20 and acknowledgement, bulk execution shared values, integration scopes "at least one". Their buttons become enabled.
- **Prerequisites** (something outside the fields is missing: no assets selected for a batch, no eligible rows, round closed, permission or SoD, nothing changed, evidence not uploaded, a required photo not taken): the gate stays, and the person always sees why. A gate that shows nothing today gets a visible reason line next to the button. A disabled button is replaced by `aria-disabled` (so it stays focusable) with `aria-describedby` to its reason. *(My call; spec 2C K5 a said "a reason line tied with aria-describedby".)*
- **Every inventory row** (§5) gets one of the two kinds in the plan; the recon's classification (scratch notes, file:line) is the starting point.

### 4.5 Native constraints
- Every form in §5 gets `noValidate` directly after `onSubmit` (`<form onSubmit={…} noValidate …>`, the convention two tests already expect), so the browser's bubble never hides our errors.
- The HTML attributes stay (`required`, `maxLength`, `min`, `max`, `minLength`, `pattern`, `type="email"`, `step`): they keep the mobile keyboards, the screen-reader "required", and FMG's `CONSTRAINT_FLOORS`. `validate()` re-states each of those rules explicitly (the browser no longer enforces them), through the shared rule helpers (§7.2) rather than reading `element.validity`. *(My call: `validity` reports `tooShort` only after editing and hides `badInput` behind an empty value.)*

## 5. Scope (counted at `9e17cab`)

**52 forms.** The recon inventory (assets 8, operations 5, audit 9, disposal 6, maintenance 5, master data 9, admin and settings 8, plus the report preset name, #52) is the scope list; the plan re-counts at its base and fails if a form is missing.
- Left out: the login form (#51), search and filter forms (`role="search"`), uploaders that upload on pick, and confirm-only dialogs with no field.
- Today: 38 client validation toasts (asset form 12, settings 12, checkin 4, checkout 4, asset batch 2, component manager 1, bulk move 1, transfer 1, round cancel 1); 14 silent returns; 21 disabled-submit gates; 15 `SearchableSelect`s with only an asterisk (nothing checks them); one `noValidate` (checkin).
- Bugs this round fixes because they are the same problem: the checkin return date is marked required and never checked; bulk move's destination is never checked; the disposal request's asset and requester are never checked; `IntegrationClientManager` throws away the server's message; the data-quality rule form has a bare `catch`.

## 6. The server (U3, approved)

### 6.1 The body
- `validationFailedBody` (`src/lib/api-error-exposure.ts`) keeps `{ error: "Invalid request data", code: "VALIDATION_FAILED" }` and adds `fieldErrors: Record<string, string>`: for each failing field, the code of its **first** issue. Status stays 400.
- **Keys** are the issue path joined with dots (`name`, `rows.3.serialNumber`, `common.name`, `customFieldDefs.0.fieldName`). An issue with an empty path goes under the key `_form`. The settings route turns `settings.<index>.value` into `settings.<settingKey>` (it has `settings[index].key`). *(My call.)*
- **Codes** (one vocabulary for every route): `required`, `tooShort`, `tooLong`, `outOfRange`, `invalidDate`, `invalidNumber`, `invalidEmail`, `invalidFormat`, `invalidChoice`, `duplicate`, and for a `custom` issue the catalog key of its message (`getApiErrorKey`, e.g. `endBeforeStart`, `licenseSeatsExceeded`), else `invalid`. The mapping from zod 4 issues (recon §5: `too_small` min 1 → `required`, `invalid_type` undefined/nonoptional → `required`, `too_small` > 1 → `tooShort`, number bounds → `outOfRange`, `invalid_type` date → `invalidDate`, NaN → `invalidNumber`, …) is one shared function with tests. *(My call: camelCase, so codes double as message keys.)*
- The two existing special routes keep their own `code` and add the same `fieldErrors`: checkout's `HANDOVER_*` branch and disposal execution's `evidenceExceptionReason` branch.
- Supplier moves to the shared body and codes (its own `getSupplierApiError` body and the supplier client parser become the shared ones; their tests change with them). *(My call.)*

### 6.2 Field errors that are not zod
These field-level refusals answer with the same body shape (status as today, `fieldErrors` added), so they land under their field too: username exists, serial number exists, role name exists, branch code exists, purchase document number exists, invalid permission selection, employee is their own manager, location is its own parent or forms a cycle, "Password is required", the checkout condition error, the status-correction status error, PM vendor not found or inactive, invalid assignee, the asset batch's duplicate serials and tags (per row), and the import file rules (form-level).

**Duplicate values that end in a 500 today** (the create **and update** routes of company, department, employee, location, brand and model hit a unique index and answer "Unexpected error · ref …"; category create checks only inactive duplicates, so an active duplicate does the same): they answer 409 with a field error on the unique field, the way supplier does: `code` for company, department, employee, location and category; `name` for brand and model (their unique column). *(My call: same problem, a person cannot tell what is wrong.)*

### 6.3 Rule changes on the server
Only these, each because the client is getting the rule and the two must agree:
- the custom message "Recipient, buyer, or destination is required" (`disposal-type-policy.ts`) gets its catalog key, and the catalog test widens to `message:` literals;
- none other. The warranty pair (start ≤ end) and the repair completion date (≥ reported date) are client-only rules (`min` on the input and `validate()`), because adding them to the server could refuse updates of rows already stored that way. *(My call.)*

## 7. The client

### 7.1 Messages
- New shared messages `common.validation.*` (th and en) for the generic codes: required, tooShort ({min}), tooLong ({max}), outOfRange ({min}–{max}), invalidDate, invalidNumber, invalidEmail, invalidFormat, invalidChoice, duplicate, endBeforeStart, invalid. Thai per `docs/19_THAI_GLOSSARY.md`; through `scripts/messages-edit.mjs`.
- Domain messages that exist and are pinned by tests (checkout, asset, settings, disposal) stay where they are; a form's `validate()` may use them for its own rules. Custom server codes resolve through the existing api-error catalog messages.

### 7.2 One shared hook and rule helpers
- One hook (for example `useFieldErrors`) owns: the errors map, `setFromValidate(errors)`, `setFromServer(payload)` (generalising today's supplier parser), clear-on-change for a field or a group, and `focusFirst(order, reveal?)` where `reveal` switches a tab, opens `<details>`, leaves a review step or returns to a step before focusing.
- Small rule helpers (`required`, `minLength`, `maxLength`, `range`, `email`, `pattern`, `notBefore`, `atLeastOne`) return codes, not text, so the server and client speak the same codes.
- Forms keep their own `validate()` with their own rules; shared rule functions that already exist (`getDisposalExecutionFieldErrors`, `getDisposalDecisionFieldErrors`, `getDisposalRequestReasonError`) are reused.

### 7.3 Shared parts
- `Field` already wires `aria-invalid` and `aria-describedby` from `error`. `FieldError` today is `role="alert"`; after a submit only one announcement may happen: errors shown by submit are read through focus and `aria-describedby`, not as N alerts. The asset form's live duplicate errors keep a polite live announcement. *(Builder's call how; the rule is one announcement per submit.)*
- `SearchableSelect`: an invalid state that looks like the other fields and turns teal on focus (DESIGN.md's field rule), a stable id for focusing, `error` forwarded by `MaintenanceOptionSelect` and `AuditScanCheckField`. Whether the trigger takes `aria-invalid` (a test forbids it today because it is a button) is the builder's call; the error is always tied with `aria-describedby`.
- Groups (`ChoiceCard` radios and checkboxes, `Segmented`, a `fieldset` of permissions or scopes, `FileDropzone`): the error shows under the group, tied to the group; focus goes to the first control of the group.
- `SignaturePad` is optional everywhere today; no change.
- Error look: the existing field error style (danger text under the field, danger border, `--shadow-field-error` halo), both themes, forced colors.

### 7.4 Date pairs (U4)
`min={start}` on the end input (and `max={end}` on the start input, like the disposal list filter) for: warranty start/end in the asset form and the asset batch form, the audit round start/end, the label print queue's created-from/to filter, and the repair completion date (≥ reported date). `validate()` checks end ≥ start for the form pairs. On the asset edit form the warranty pair is checked only when one of its two dates changed in this edit, so an old asset stored with reversed dates can still be saved for an unrelated change; the asset create, the batch form and the audit round always check. *(My call.)*

## 8. Constraints

- No new dependency, no migration, no database write. Next.js 16.4: read `node_modules/next/dist/docs/` before relying on any API.
- Messages only through `scripts/messages-edit.mjs`; Thai per the glossary; `tests/thai-glossary.test.ts` and `tests/messages-parity.test.ts` stay green.
- Guards: a new guard keeps validation toasts out (a `toast.error`/`toast.warning` with a validation message outside a `catch` fails), and every form in the scope list has `noValidate` and `validate(`. FMG's `CONSTRAINT_FLOORS` (floors, may rise) and `STAR_ONLY` (shrinks to empty in this round) hold. Existing pins that encode toasts, disabled content gates or exact `<form …>` strings change in the same commit as the code they pin (the recon lists about 25 test files).
- No test asserts working-tree line endings. Every symbol is written as a real character.
- Process as for 2D and Dark Mode: a plan rehearsed in a scratch clone; one task one commit with its test; Opus-medium implementers, the main session reviews every task; a dev-app check on a production build (clean `.next/cache/turbopack`, wiki 47) in both themes at 1440 and 375, with no database writes (forms are submitted only against invalid input that the server refuses before writing, or not at all).
- The server change is reviewed first and lands as the first commits of the round.

## 9. Order of work

One round (U5), as several plans on one track if it is too big for one, each green and merged in order:
1. **Server:** the body, the code map, the key rules, the special routes, supplier on the shared body, the non-zod field errors, the 409 duplicates, the catalog key.
2. **Foundation:** messages, the hook and rule helpers, the shared parts (§7.3), the new guards (inactive list until the forms move, or counting down like phase 2D's lists).
3. **Forms by domain:** master data and admin; assets; operations; audit; disposal and maintenance; settings (the largest single file, with tab switching).
4. **Docs and checks:** `DESIGN.md` (the form error rule replaces "toast for validation"), docs/14, `.impeccable/design.json`, handoff, changelog, wiki; the dev-app check.

## 10. Left to the builder
The hook's name and shape, the exact `common.validation` wording within the glossary, how `FieldError` avoids N alerts, the SearchableSelect invalid mechanics, how each review dialog hands back to its form, the per-form field order for focus, the split into plans and tasks, how the guard detects a validation toast.

## 11. Calls I made (for the user to check)
1. `noValidate` everywhere, with the HTML attributes kept; `validate()` states the rules itself.
2. Prerequisite gates use `aria-disabled` plus a visible reason; content gates become errors on submit (their buttons enabled).
3. `fieldErrors` keys are dotted paths (`rows.3.serialNumber`), `_form` for errors without a field, `settings.<key>` for settings.
4. One camelCase code vocabulary shared by server and client; supplier moves onto it.
5. Duplicate codes in six master-data creates answer 409 with a field error instead of a 500; other non-zod field refusals get `fieldErrors` too.
6. Warranty and repair-date pairs are client-only rules (no new server rule).
7. If the server names no visible field, the form keeps its form-level message, so nothing fails silently.
8. The total-seats field of a license shows an asterisk but the server lets it be empty: the asterisk goes (the server is the truth).
9. The report preset name joins the scope; the login form stays as it is.
