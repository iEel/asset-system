# ยืนยันผลตรวจ plan 1 of 5: rename รายการไม่ตรง → รายการไม่ตรงทะเบียน

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every Thai string that says "รายการไม่ตรง" says "รายการไม่ตรงทะเบียน", the glossary and its test enforce it, and
every test and E2E word file follows.

**Architecture:**
- Values only. Message keys, English text, routes and code names do not change.
- One change file goes through `scripts/messages-edit.mjs`.
- The glossary test gains a rule that refuses the bare word.
- A source guard keeps `src/` and `e2e/` clean.

**Tech Stack:** next-intl messages (`messages/th.json`), `node --test` (`npm test`), Playwright word files.

**Spec:** `docs/superpowers/specs/2026-11-09-inspection-confirm-design.md` §8 (rename), §9 (constraints).

## Global Constraints

- **New word:** exactly **รายการไม่ตรงทะเบียน**. Phrases follow by plain insertion: "ประเภทรายการไม่ตรง" →
  "ประเภทรายการไม่ตรงทะเบียน", "บางรายการไม่ตรงมากกว่าหนึ่งเรื่อง" → "บางรายการไม่ตรงทะเบียนมากกว่าหนึ่งเรื่อง".
  - No key is excepted.
  - A value that already has "รายการไม่ตรงทะเบียน" is left as is.
- **Messages:**
  - Edit `messages/*.json` only through `node scripts/messages-edit.mjs <changes.json>`. Never hand-edit the JSON.
  - English (`messages/en.json`) is unchanged.
  - Keys are unchanged.
- **Other words stay:**
  - The short result chip "ไม่ตรง" (e.g. `auditRound.mismatchShort`, the result cell) is not the term.
  - Other strings containing "ไม่ตรง" without "รายการ" in front, such as "ที่ตั้งไม่ตรง" and "แผนกไม่ตรงกับผู้ถือครอง",
    are not touched.
- **Glossary:** `docs/19_THAI_GLOSSARY.md` and `tests/thai-glossary.test.ts` change together (the test's own header
  says so).
- **Source tests:**
  - Pins must be CRLF-safe: read files and normalise `\r\n` before matching.
  - Never touch the untracked paths `.codex/`, `.impeccable/config.json`, `.impeccable/critique/`, `.playwright-mcp/`,
    `.superpowers/brainstorm/`, `docs/superpowers/plans/2026-06-22-audit-component-assets.untracked-backup.md`.
- **Commands:**
  - Do not run Playwright, `next build`, or anything against a database; the controller runs E2E.
  - `npm test` and `npx tsc --noEmit` are fine.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A UI name used as an absence check:** E2E `e2e/cross-cutting/support/refusals.ts` lists button names that must
   *not* appear for some roles. If it keeps the old name ("ปิดรายการไม่ตรง"), the check passes for the wrong reason.
   Task 2's guard catches any bare old word in `e2e/`.
2. **Exact-name locators:** `getByRole(..., { name })` with an old full title fails after the rename. Every
   `e2e/**` word changes in Task 2. The controller's E2E run proves it.
3. **A Thai string built outside messages:** `src/lib/notification-digest-format.ts` holds a literal Thai label for the
   webhook digest. Task 1 changes and pins it.
4. **Long labels:** `nav.auditFinding` grows from 12 to 19 characters in the sidebar, the rail tooltip and the phone
   "more" sheet. The controller's look step checks 1440 and 390; no code task.
5. **Accidental double insertion:** running the rename twice would give "ทะเบียนทะเบียน". Task 1's test refuses it.

---

### Task 1: Rename the messages, the digest label and the glossary

**Files:**
- Create: `scripts/tmp/finding-rename-changes.json`. A throwaway change file; delete it before commit. If `scripts/tmp/`
  does not exist, create the file in the OS temp folder instead.
- Modify: `messages/th.json` (through the script only)
- Modify: `src/lib/notification-digest-format.ts:38`
- Modify: `docs/19_THAI_GLOSSARY.md`, line 10 (the "ผลตรวจที่ไม่ตรงระบบ" row) and line 21 (the "ประเภทรายการไม่ตรง"
  example)
- Modify: `tests/thai-glossary.test.ts`
- Modify: every unit test under `tests/` that pins an old Thai value. On 2026-11-09 these were:
  `approval-history-board`, `approval-inbox-panel-ui`, `approval-inbox`, `audit-export-labels`,
  `audit-finding-review-panel-ui`, `audit-findings-page-ui`, `audit-findings-selection-ui`, `audit-round-page-ui`,
  `audit-round-result-drilldown`, `audit-rounds-list-rules`, `e2e-audit`, `e2e-fixes`, `list-pages-ui`,
  `system-log-presenter`, `v-track2-u`, `work-center-page-board`, `work-queues`. Re-grep; that list is a hint.

**Interfaces:**
- Produces: the renamed Thai values. Later plans write new strings with "รายการไม่ตรงทะเบียน" from the start.

- [ ] **Step 1: Write the failing tests in `tests/thai-glossary.test.ts`**
  - Change the Finding rule's `use` to `"รายการไม่ตรงทะเบียน"`.
  - Add a rule:
    `{ term: "รายการไม่ตรง (ไม่มี ทะเบียน)", pattern: /รายการไม่ตรง(?!ทะเบียน)/, use: "รายการไม่ตรงทะเบียน" }`.
  - Add a rule refusing the doubled word: `{ term: "ทะเบียนซ้ำ", pattern: /ทะเบียนทะเบียน/, use: "รายการไม่ตรงทะเบียน" }`.
  - Add a test "the finding word reads รายการไม่ตรงทะเบียน (inspection-confirm plan 1)":
    - `brokenRules("ดูรายการไม่ตรง")` deep-equals `["รายการไม่ตรง (ไม่มี ทะเบียน)"]`;
    - `brokenRules("ดูรายการไม่ตรงทะเบียน")` deep-equals `[]`;
    - `brokenRules("ที่ตั้งไม่ตรง")` deep-equals `[]`;
    - `th.nav.auditFinding === "รายการไม่ตรงทะเบียน"`;
    - `th.auditFinding.title === "รายการไม่ตรงทะเบียนจากการตรวจนับ"`;
    - `th.systemLogPage.field_findingType === "ประเภทรายการไม่ตรงทะเบียน"`;
    - `th.auditRound.multipleFieldsNote === "บางรายการไม่ตรงทะเบียนมากกว่าหนึ่งเรื่อง"`;
    - the glossary file matches `/\| ผลตรวจที่ไม่ตรงระบบ \| \*\*รายการไม่ตรงทะเบียน\*\* \|/` and its เลิกใช้ cell
      contains `รายการไม่ตรง (ไม่มีคำว่า ทะเบียน)`.
  - Add, in a test file next to the digest's existing test (find it with `grep -rl notification-digest-format tests`),
    an assertion that the digest's `pendingAuditFindings` label is `"รายการไม่ตรงทะเบียนรอพิจารณา"`.

- [ ] **Step 2: Run them, expect failure**

Run: `node --test tests/thai-glossary.test.ts`
Expected: FAIL. The cleaned-namespaces test lists the 89 old values; the new asserts fail.

- [ ] **Step 3: Write the change file and apply it**
  - Build the change file with a short Node one-off (not committed). It walks `messages/th.json` and, for every
    string value containing `รายการไม่ตรง` not followed by `ทะเบียน`, sets the value with every such occurrence
    replaced by `รายการไม่ตรงทะเบียน`.
  - Format: `{ "set": { "th": { "<ns.key>": "<new>" } } }`.
  - Expect 89 keys (the 2026-11-09 count). If the count differs, list the extra keys in the report.
  - Run `node scripts/messages-edit.mjs <file>`, then delete the change file.
- [ ] **Step 4: Change the digest literal**
  - In `src/lib/notification-digest-format.ts`, set `pendingAuditFindings: "รายการไม่ตรงทะเบียนรอพิจารณา"`.
- [ ] **Step 5: Update the glossary**
  - Row 10 becomes `| ผลตรวจที่ไม่ตรงระบบ | **รายการไม่ตรงทะเบียน** | Finding · ข้อมูลไม่ตรง (เมื่อหมายถึงรายการ) · รายการไม่ตรง (ไม่มีคำว่า ทะเบียน) |`.
  - In row 21, the example becomes "ประเภทรายการไม่ตรงทะเบียน".
- [ ] **Step 6: Run `npm test`; update every unit pin that still expects an old value**
  - Change the expected text only; do not loosen a matcher.
  - Fix the code comments that quote a renamed UI string. In `src/` on 2026-11-09 these were
    `audit/findings/page.tsx` 262/268, `audit/rounds/[id]/page.tsx` 254, `audit-finding-review-actions.tsx` 58,
    `audit-finding-review-panel.tsx` 83, `approval-inbox-query.ts` 34, `approval-inbox.ts` 180,
    `audit-round-page-rules.ts` 47/225, `audit-round-result-filters.ts` 64, `disposal-source.ts` 5, `work-queues.ts` 37.
    Task 2's guard needs them clean.
- [ ] **Step 7: Run tests and types**

Run: `npm test` then `npx tsc --noEmit`
Expected: fail 0, tsc exit 0.

- [ ] **Step 8: Commit**

```bash
git add messages/th.json messages/en.json src docs/19_THAI_GLOSSARY.md tests
git commit -m "feat(audit): rename รายการไม่ตรง to รายการไม่ตรงทะเบียน in Thai messages, digest and glossary (inspection-confirm plan 1 task 1)"
```

---

### Task 2: E2E words and a source guard

**Files:**
- Modify: every file under `e2e/` with the old word. On 2026-11-09 these were `admin/roles-words.ts`,
  `audit/field-audit.spec.ts`, `audit/pending-steps.ts`, `audit/review-words.ts`, `audit/round-page-words.ts`,
  `cross-cutting/roles.spec.ts`, `cross-cutting/support/export-rights.ts`, `cross-cutting/support/refusals.ts`,
  `dashboard/dashboard-words.ts`, `notifications/notifications-words.ts`.
- Create: `tests/finding-rename-guard.test.ts`

**Interfaces:**
- Consumes: Task 1's values.

- [ ] **Step 1: Write the failing guard `tests/finding-rename-guard.test.ts`**
  - Test "no source, test or E2E file uses the bare word รายการไม่ตรง (inspection-confirm plan 1)".
  - It walks `src/`, `e2e/` and `tests/` for `.ts`, `.tsx`, `.mjs` files with `readdirSync` recursively. Skip
    `node_modules`, `e2e/.state` and this guard file itself.
  - It normalises CRLF, collects every `path:line` whose line matches `/รายการไม่ตรง(?!ทะเบียน)/`, and asserts the list
    deep-equals `[]`.
  - `tests/thai-glossary.test.ts` legitimately holds the bare word in its new rule and asserts. Exclude that one file
    by path, with a comment naming why.
- [ ] **Step 2: Run it, expect failure listing the e2e lines**

Run: `node --test tests/finding-rename-guard.test.ts`
Expected: FAIL with the `e2e/` lines.

- [ ] **Step 3: Update every E2E word and locator to the exact new values from `messages/th.json`**
  - Copy each value from the JSON; never retype Thai.
  - The absence lists in `refusals.ts` (`WRITE_BUTTON_NAMES`, `REVIEW_BUTTON_NAMES`) must name the new button text.
- [ ] **Step 4: Run the guard and the whole unit suite**

Run: `npm test`
Expected: fail 0 (`tests/e2e-*.test.ts` pins included).

- [ ] **Step 5: Commit**

```bash
git add e2e tests/finding-rename-guard.test.ts tests
git commit -m "test(audit): E2E words follow รายการไม่ตรงทะเบียน, and a guard refuses the bare word (inspection-confirm plan 1 task 2)"
```

---

## Controller steps after Task 2 (not for implementers)

- **E2E on the dev DB:** probe the DB first, then run
  `npx playwright test e2e/audit e2e/dashboard e2e/notifications e2e/cross-cutting e2e/admin/roles --reporter=line`.
- **Look step:** check the sidebar, the rail tooltip and the phone "more" sheet at 1440 light/dark and 390 light/dark.
  Also check the findings page title and the work center chips at 1024.
- **Final whole-branch review:** the 3-lens workflow, then one fix wave.
- **Docs and memory:** changelog, handoff, wiki and memory, as after every plan.
