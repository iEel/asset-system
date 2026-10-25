# E2E workflow suite: design

**Status:** draft for the user's approval (2026-10-19)
**Base:** `master` at `db3f796f`. Phase 2, Dark Mode and the V track (plans 1–3, the final plan and its polish) are merged and pushed. Nothing is deployed.
**Order of the remaining work:** this suite → human UAT → the one Production deploy (wiki `ams-open-questions` #27).

## 1. Intent

Before the single deploy, walk the real workflows end to end, as the people who will use them do, with real writes, on a phone and a computer, in both themes. Catch what source-reading tests and read-only checks cannot. Fix what it finds before the deploy.

The user named their two biggest worries:
- the **asset transaction process**;
- the **field audit walk**.

The suite still covers every workflow in one round, as the user decided on 2026-10-19.

The checks so far have been unit tests, source-reading tests and read-only browser checks with every write intercepted. Real-workflow friction only shows when a whole process is walked with data; the audit-scan scrolling the user found earlier is the example.

## 2. Who does what (the user's words, 2026-10-19)

| Workflow | Who | Device |
|---|---|---|
| Handover, return, transfer, bulk move | IT staff fill in the system | Computer at the desk. Also a **phone** when IT staff deliver to the receiver's desk, and the receiver signs with a finger on the IT staff's phone. |
| Audit round: open it | IT staff | Computer |
| Field audit (walk the rooms) | IT staff | Phone. Assets are found by typing a name or tag; QR labels are not printed yet. |
| Review of audit findings, then close the round | IT head (the closer needs the approve permission and must not be the round's opener) | Computer |
| Repair record | IT staff open and close it | Computer |
| Preventive maintenance (PM) plan | IT staff | Computer |
| Disposal | IT staff request it, the IT head approves it, IT staff execute it with evidence | Computer |

**Common real cases in the audit walk (the user):**
- the name, department or branch does not match (a mismatch finding);
- an asset that has installed components.

## 3. Goals

1. **An automated Playwright suite kept in the repo.** It is re-runnable, walks every workflow below with real writes, and runs each on the **desktop** and an **emulated phone**, in **light and dark**.
2. **Proof of the business rules** a person relies on:
   - status, location and custodian after each transaction;
   - no double checkout;
   - segregation of duties: auditor ≠ reviewer, disposal approver ≠ executor, approver ≠ requester;
   - disposal is blocked while the asset sits in an open audit round;
   - the repair status mapping;
   - the PM due date advances;
   - errors under the field (the V track) on a wrong entry in each workflow;
   - the printed documents open.
3. **Per page and per step, record:**
   - console errors;
   - failed requests (4xx/5xx, other than the expected refusals);
   - axe (WCAG 2.1 AA) violations;
   - page load time;
   - screenshots at the end of each workflow and on any failure.
4. **I (Claude) run the suite, fix every bug it finds, and run it again** until it passes. Then I report to the user in Thai:
   - what passed and what failed;
   - what I fixed;
   - every fix that changes what a person sees, so the user can check it.
5. **A short human UAT checklist for what emulation cannot do:**
   - VoiceOver/TalkBack and NVDA;
   - real iOS Safari and Android Chrome;
   - the real camera on real labels;
   - label printing;
   - field ergonomics;
   - the "needs a person" wiki items 47–52.

## 4. Non-goals

- Load or performance testing beyond recording page load times.
- Testing LDAP login or LDAP sync against the company AD.
- Testing company systems (HR, SMF, HIP).
- Integration API v1 clients.
- The settings page's save (see §6).
- Excel asset import on the dev database (wiki #36).
- Firefox.
- A CI pipeline. The suite runs on the development machine.
- A separate throwaway test database. The user decided against it (§5).

## 5. Constraints

### The database
**`asset_management_dev`, the existing dev database** (the user, 2026-10-19).

- It is a restored copy of Production data on the SQL Server instance shared with Production and other company databases.
- **No cleanup after a run.** The user can restore the dev database from a Production backup whenever they want a fresh copy.
- **Every record the suite creates carries a run marker,** so repeat runs never collide on a unique value (asset tag, master-data code, username): the prefix `E2E-` plus a run id, for example `E2E-1019A-…`. The marker also shows in any list where a person might see the data.
- The suite deletes nothing, so day-counted document numbers (repair, PM, disposal) cannot collide within a day.
- **A guard runs before any test:**
  - it reads `.env` without printing secrets;
  - it confirms the database is `asset_management_dev` and the login is `asset_dev`;
  - it stops if either is anything else, above all `asset_management`.

### Hazards (from the wiki and the dev data)
These are never touched:
- LDAP login and LDAP sync. The dev settings point at the real company AD. The test users are local accounts (§7).
- **The settings page's save.** It writes the LDAP configuration copied from Production, including the bind password. The settings form is covered by the V-track tests and its intercepted dev-app checks.
- Excel import.
- Anything that sends mail or reaches a company system. Check the code for mail or notification senders first, and stub them if any are found.

**Existing data that blocks a workflow:**
- The draft round `AUD-2026-0002` holds about 1,509 assets and blocks their disposal.
- Attachment rows point at Production paths (they 500 locally).

The suite therefore creates its own assets (`E2E-…`) for every workflow that changes an asset, instead of using existing ones.

### The app under test
- A production build (`next build` without a stale `.next/cache/turbopack`, then `next start`) on its own port. The build reads `.env`, which points at the dev database.
- Browsers from the existing Playwright cache: Chromium, and WebKit for the phone run. Both are already downloaded, so nothing needs downloading.

### The repo
- `@playwright/test` and `@axe-core/playwright` are added as dev dependencies. **This is an install the user approves in this spec.**
- The suite lives in its own folder (`e2e/`), with its own `playwright.config.ts` and an npm script `test:e2e`. It must stay out of `npm test`: `scripts/run-tests.mjs` sweeps every `*.test.ts` under `tests/`, so E2E files use `*.spec.ts` in `e2e/`.
- `npm test`, `tsc` and lint stay green.
- Artifacts are git-ignored: the report, traces, screenshots and the run-id file.
- The house rules apply:
  - the Thai copy rules;
  - CRLF/LF as the repo has them;
  - no secrets printed;
  - a dev-DB write needs no per-change approval, but a write to `asset_management` is never made.

## 6. The workflows and what each proves

Each workflow is a test that creates its own data, walks the steps as the named person on the named device, and asserts the outcome in the UI. It may also read the API with GETs. **Each runs four times:** desktop light, desktop dark, phone light, phone dark. The phone run is the realistic one for the field audit and the desk delivery; the desktop run is the realistic one for the rest. Both run anyway, because a person can use either.

### 6.1 Asset transactions (the user's first worry)
1. **Register an asset** (`E2E-…` tag): the form with a photo and a purchase document.
   - A wrong entry first shows errors under the field.
   - A follow-up failure is not part of this run (the partial-save fix is covered by its unit test).
2. **Handover:**
   - choose the asset and the receiver (an `E2E-` employee);
   - the receiver signs on the signature pad (a mouse stroke on desktop, a touch stroke on the phone);
   - attach a photo from a fixture file;
   - confirm in the review dialog.

   Assert: the asset is In Use (permanent) or Checked Out with a due date (temporary), with the custodian set. The HO- document prints (the print page opens and shows the number).
3. **No double checkout:** a second handover of the same asset is refused, with the reason shown.
4. **Return:** the RT- document; the status and location after it. A return marked "send to repair" opens a repair record.
5. **Transfer:** the TR- document; the new location and custodian. Transfer has no data in the dev DB yet, and its print page has never been previewed (wiki #22).
6. **Bulk move** of several `E2E-` assets.
7. **Cancel the latest transaction:** the VOID print and the compensating movement.
8. **Phone desk delivery:** the handover done entirely on the phone, at the receiver's desk, with a finger signature. The keyboard opens over the form and the save bar stays reachable.

### 6.2 The field audit walk (the user's second worry)
1. **IT staff open a round** (the user, 2026-10-19) scoped to `E2E-` assets only (its own location or department). Its items include an asset with installed components.
2. **IT staff, on the phone,** pick the room and find each asset by typing its name or tag:
   - save one as matched;
   - save one as a **mismatch** (a different department or branch, with the required photo);
   - check a **parent with components**: the sheet asks before saving a parent whose components are not all checked;
   - mark one not found;
   - one unknown or out-of-scope search.
3. **Offline queue:** the phone goes offline, saves a check, comes back online, and the queued scan is sent.
4. **The IT head, on the computer,** reviews the findings and approves or rejects them.
   - The IT staff user is refused review of their own finding (segregation of duties).
   - **The IT head closes the round.**
   - IT staff, who opened it, are refused the close: they have no approve permission, and the opener may not close.
   - **Open decision, recorded and kept as it is** (the user, 2026-10-19, "เลือก 3"):
     - In real work the same IT staff member who opened a round may also close it.
     - The system refuses that unconditionally: the close route returns `closeOwnRound` for the opener (`src/app/api/audit-rounds/[id]/route.ts:105`), and closing needs the approve permission.
     - The rule stays for now. The suite asserts the rule as the code has it, and the mismatch goes to the wiki's open questions for a later decision.
5. **The findings export** downloads.

### 6.3 Repair and PM (IT staff)
1. **Open a repair record** for an `E2E-` asset (unfinished): the asset becomes Under Maintenance.
2. **Complete it:** "repaired" returns the asset to In Use or Ready; "cannot repair, propose disposal" gives Pending Disposal.
3. **Cancel a mistaken record.** The repair print opens.
4. **PM plan:** create one, mark it done (`nextDueDate` advances, with the month-end clamp), pause it, resume it, end it.

### 6.4 Disposal
1. **IT staff request** disposal of an `E2E-` asset, then of a batch of two.
2. **The IT head approves** them (one alone, then a bulk approval).
   - The IT head must be linked to an employee; the seed admin is not.
   - The requester cannot approve their own request.
3. **IT staff execute** with evidence (a fixture file). The executor cannot be the approver. The disposal print opens.
4. **An asset inside an open audit round cannot be disposed,** with the reason shown (the round from 6.2 while it is open).

### 6.5 Reports and exports
- Each report page loads with the `E2E-` data visible.
- Each export the role may use downloads a file that opens: the asset export, the transaction export, the findings export, and the disposal and repair lists where they exist.
- A role without the export permission does not see it.

### 6.6 Roles and permissions
- A view-only user (`e2e.viewer`) is refused every create, edit and approve page and API, and sees read-only lists.
- IT staff are refused the approve and review actions.
- The employee role lands on My Assets and sees only their own assets.

### 6.7 Errors under the field (V track) in the real flow
In each workflow, one wrong entry first: an empty required field, or a date pair reversed. The error shows under the field, and the corrected entry then saves. The V-track tests already cover every form with intercepted requests; this proves it once with real saves.

## 7. Test users and data the suite creates (once per run)

The users and the data are created by a setup step **through the app's own admin pages and APIs, signed in as the seed admin.** No direct SQL writes, so the app's own rules apply.

**Employees:** `E2E-` employees (receivers, custodians, approvers) in an `E2E-` department and location.

**Users** (local accounts with generated passwords, never printed, stored in a git-ignored file for the run):

| User | Linked to an employee | Role(s) | Permissions |
|---|---|---|---|
| `e2e.it-staff-<run>` | yes | IT staff | assets: view, create, edit; audit: view, create, edit; maintenance: view, create, edit; disposal: view, create, edit; reports: view, export (no approve) |
| `e2e.it-head-<run>` | yes | IT head | the IT staff set, plus audit approve and disposal approve; audit, maintenance and disposal export (decision DX6, 2026-10-20); the work center (`dashboard:view`) for the menu dot, user decision 2026-10-25 |
| `e2e.viewer-<run>` | no | viewer | view only |
| `e2e.employee-<run>` | yes | employee | |

**Roles:** the dev DB has the 11 seeded roles, but only `system_admin` has permissions. The setup gives the E2E users roles with exactly the permissions above. It uses new `E2E-` roles, so the real roles are left as they are (the builder's call if a cleaner way exists).

**Assets:**
- `E2E-` assets of each type the workflows need: personal, shared, stock, a parent with installed components, and a software licence.
- Created through the asset form, the batch, and the component install. That way the forms are exercised too.

**Fixtures:**
- a small JPEG/PNG photo;
- a PDF for evidence and purchase documents.

## 8. Devices, themes and measurements

**Desktop:** 1440×900, Chromium.

**Phone:**
- 390×664, the visible area with the browser bars;
- touch, DPR 3, a mobile user agent;
- WebKit for the field audit and the desk delivery, Chromium for the rest (the builder's call if WebKit fails for a reason outside the app);
- slow 4G and a CPU throttle on the audit walk;
- the keyboard-open height for the forms with a sticky save bar.

**Themes:** the `theme` cookie set to `light` or `dark` before the first page.

**Per step:**
- **Console errors:** none allowed, except a short reviewed allow-list (for example the expected 500 on a Production-path attachment).
- **Failed requests:** none allowed, except the expected refusals the test itself asserts.
- **axe (WCAG 2.1 AA):** no serious or critical violation on any page the workflow visits.
- **Page load time:** recorded, not asserted.
- **Screenshots:** at each workflow's end and on any failure, plus a Playwright trace on failure.

**The report:**
- Playwright's HTML report.
- A summary file the controller turns into the Thai report to the user: each workflow × device × theme with pass or fail, the fixes made, axe and console findings, and load times.

## 9. Fixing what the suite finds (the user, 2026-10-19: "แก้ไขให้เลย")

- A failure caused by the app gets a fix on the same branch: a test first (a unit or source test where one fits, and the E2E step itself), then the fix, then the suite again.
- A failure caused by the test itself gets the test fixed. The report says which was which.
- A fix that changes what a person sees or how a workflow behaves is listed in the report for the user to check. One that needs a decision is not guessed: it is asked.
- No fix writes to `asset_management`, changes the database schema without the user, or touches company systems.

## 10. What is left to the builder

- The file layout inside `e2e/`.
- Helpers and fixtures.
- How the setup step reaches the admin pages and APIs.
- How the run id is made.
- How each workflow is split into Playwright tests (one test per workflow, or steps).
- The exact allow-list entries, each reviewed and justified.
- The order of the runs.
- Whether the four device × theme runs share one setup.

## 11. My calls (Claude's, not the user's; for the user to check)

- **No failed login anywhere in the suite.**
  - A local password that fails is passed on to LDAP (`src/lib/auth.ts`), and the dev settings point at the company AD. A wrong-password or deactivated-user login test would therefore send a bind attempt there.
  - Every login uses a known account: the seed admin through the existing git-ignored credential file (it signs in to the dev DB today), and the E2E users with their generated passwords.
  - Login refusal stays a unit-test and UAT item.
- **The approval settings:** the dev DB has no `workflow_approval_*` rows, so the defaults apply (segregation on).
  - The suite reads them with a GET before it runs, and asserts what they say.
  - If they ever differ from the defaults, it reports that and never changes them (the settings save is off limits).
- **Thai only.**
  - The UI is Thai-primary; one English pass of the new messages stays in the UAT list.
  - The four-run matrix stays at four.
- **Uploads:** `UPLOAD_DIR` is the relative `./uploads` on this machine. The guard also confirms it is a local path before the first upload.

- **New `E2E-` roles** rather than giving the real roles permissions in the dev DB.
- **Run order:** the desktop and phone runs of each workflow use their own `E2E-` assets, so they never depend on each other's state.
- **The settings save is excluded,** for the LDAP hazard, and covered by the earlier intercepted checks.
- **WebKit for the phone** on the audit walk and the desk delivery only.
- **Load times are recorded, not asserted.**
