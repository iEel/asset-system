# Thai Copy Cleanup (Round 3 · Part B3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every Thai page uses one shared vocabulary (ที่ตั้ง · รายการไม่ตรง · พิจารณา · ยืมใช้ชั่วคราว …), no stray English jargon, Buddhist-era years, Thai error messages that keep the original server text for admins, the right `<html lang>`, and no dead message keys.

**Architecture:** A glossary (`docs/19_THAI_GLOSSARY.md`) is enforced by `tests/thai-glossary.test.ts`, switched on namespace by namespace as each copy task lands. Message files are edited through a small script so the 4,000-key JSON stays byte-stable. Server error text is translated on the client only, from a catalog, so the API contract and server logs stay English.

**Tech Stack:** Next.js 16.4 App Router, next-intl 4 (`messages/th.json`, `messages/en.json`), React 19.2, Prisma 7.10 (mssql), sonner toasts, `node --test` with type stripping.

**Spec:** `docs/superpowers/specs/2026-10-08-thai-copy-cleanup-design.md` (commits `6a8ce45`, `e6d4af1`). Read it before each task.

## Global Constraints

- Branch `feat/thai-copy-cleanup`. Never run `git checkout`, `git switch`, `git reset`, `git stash`, `git rebase`. Commit only the files your task names.
- Next.js 16.4 is not the Next.js in your training data — read `node_modules/next/dist/docs/` before using an API you have not seen in this repo.
- Tests: `node --test` with type stripping; tests cannot import `.tsx`. Files in `src/lib` that tests import use relative `./x.ts` imports and no `@/`.
- Every task ends with `npm test`, `npx tsc --noEmit`, `npm run lint` green (pre-existing warnings are fine). Report any failure by name.
- Do not run `npm ci`, `npm install`, `npm run build`, the dev server, or anything against a database. Do not read or print `.env`.
- **Message files:** after Task 1, edit `messages/th.json` / `messages/en.json` only through `node scripts/messages-edit.mjs <changes.json>` (put the change file in your scratch/temp folder, never commit it). Both files must keep exactly the same keys (`tests/messages-parity.test.ts`).
- **Glossary (spec §2, exact words):**
  - location → **ที่ตั้ง** (not พื้นที่ · พื้นที่/ตำแหน่ง · Location; "พื้นที่จัดเก็บไฟล์" is fine)
  - audit discrepancy → **รายการไม่ตรง** (not Finding)
  - decide approve/reject → **พิจารณา** · รอพิจารณา · พิจารณาแล้ว (not Review · ตรวจทาน)
  - temporary loan → **ยืมใช้ชั่วคราว** · status **ถูกยืม** (not เบิกใช้งานชั่วคราว · ถูกเบิก); permanent → **ส่งมอบ**; from stock → **เบิกจากคลัง**; return → **รับคืน**
  - **รหัสทรัพย์สิน** (not Asset Tag · Tag) · **ขอบเขต / นอกขอบเขต** (not Scope) · **ตรวจนับ** (not Audit) · **ประวัติการแก้ไข** (not Audit Trail) · **ผู้ถือครอง** (not ผู้ครอบครอง · ผู้ถือ) · **หมวดหมู่** (not หมวด; "ประเภท" only for kinds) · **ตัดจำหน่าย** for write-off
  - Label → ป้าย · Template → แม่แบบ · Prefix → คำนำหน้ารหัส · workflow → ขั้นตอนงาน · Checklist → รายการตรวจ · action plan → แผนแก้ไข · Preview → ตัวอย่าง · Filter → ตัวกรอง · Role → บทบาท · Timeline → ลำดับเหตุการณ์ · Lifecycle → วงจรทรัพย์สิน · Running number → เลขลำดับ · Sync → ซิงก์ · Retention → ระยะเวลาเก็บ
  - Keep: LDAP · AD · QR · PDF · Excel · CSV · URL · API · Serial · PM (headings "บำรุงรักษาตามรอบ (PM)") · admin-only technical words (Token · Client ID · JSON)
  - English file: same keys; change wording only where the meaning changed (Finding → Discrepancy, Review → Decision/decide, Checked out → On loan); no polishing.
- Rewording rules: natural Thai, same meaning, keep every ICU placeholder (`{count}`, `{name}` …) and plural syntax unchanged, keep button/badge text about as short as before. Never rewrite with a blind find-and-replace.
- **Errors:** API responses, server logs and system logs stay English. The client shows Thai on the first line and the original server text as a small grey second line; `console.warn` the original.
- **Years:** Thai UI shows Buddhist-era years (`gregorian + 543`). Exceptions: codes that contain a year (AUD-2026-0002, GRL-COM-24-…), the © line on the login page, native `<input type="date">` pickers. The audit-year field accepts พ.ศ. **2543–2643** (= the API's 2000–2100) and stores Gregorian.
- Status names live in the database (`asset_statuses.nameTh`). The Production change ships as a manual migration that the user must approve; no task runs SQL.

## Review Focus

1. **A deleted message key is still used through a key built at runtime** (e.g. `t(\`actions.${action}\`)`) → the page shows a raw key or logs `MISSING_MESSAGE`. Task 2 must record every namespace that builds keys at runtime and the values it can take; Task 10 opens those pages on the dev app and greps the dev log for `MISSING_MESSAGE`.
2. **Rewording drops or renames a placeholder** (`{count}` → `{จำนวน}`) → next-intl throws or shows a blank. Pinned in Task 1: `messages-parity` also checks that every key has the same placeholders in th and en.
3. **An Error whose message is already Thai** (a fallback like "เกิดข้อผิดพลาด") reaches the error helper → it must not print the same text twice or call it unknown. Pinned in Task 3's unit tests.
4. **A Thai user types a Gregorian year (2026) into the audit-year field** → the field must refuse it with its min/max (2543–2643), never store 1483. Pinned in Task 4 (`display-year` range test + form test).
5. **An Excel file with the old Thai column headers ("พื้นที่", "พื้นที่ประจำ")** must still import after headers are renamed. Pinned in Task 8 (`asset-import-mapping` test keeps old aliases).

---

## File Structure

**Tooling and guards (Task 1)**
- `scripts/lib/messages-edit-core.mjs` — pure `applyMessageChanges`, `serializeMessages`.
- `scripts/messages-edit.mjs` — CLI applying a change file to both message files.
- `tests/messages-edit.test.ts`, `tests/messages-parity.test.ts`, `tests/thai-glossary.test.ts`.
- `docs/19_THAI_GLOSSARY.md`; one line in `AGENTS.md`.

**Dead keys (Task 2)** — `scripts/find-unused-messages.mjs`.

**Errors (Task 3)** — `src/lib/api-error-catalog.ts` (pure), `src/components/ui/use-api-error.ts`, `src/components/ui/api-error-text.tsx`, `apiErrors` namespace, `tests/api-error-catalog.test.ts`, `tests/api-error-ui.test.ts`, and the components that show server errors.

**Language and years (Task 4)** — `src/app/layout.tsx`, `src/lib/display-year.ts`, `src/app/[locale]/(dashboard)/audit/rounds/page.tsx`, `src/components/audit/audit-round-form.tsx`, `tests/display-year.test.ts`, `tests/html-lang-and-years.test.ts`.

**Copy (Tasks 5–8)** — `messages/*.json` per namespace group, tests that pinned old wording, Thai strings hard-coded in `src`.

**Status wording (Task 9)** — `prisma/seed.ts`, `prisma/manual-migrations/2026-10-08-thai-status-wording.sql`, `tests/thai-status-wording.test.ts`.

> Order note: the spec lists dead-key cleanup as step 8. It runs as Task 2 here so the copy tasks never spend time rewording keys that are about to be deleted (the old scan form alone left ~140).

---

### Task 1: Message tooling, parity and glossary guards

**Files:**
- Create: `scripts/lib/messages-edit-core.mjs`, `scripts/messages-edit.mjs`, `tests/messages-edit.test.ts`, `tests/messages-parity.test.ts`, `tests/thai-glossary.test.ts`, `docs/19_THAI_GLOSSARY.md`
- Modify: `messages/th.json`, `messages/en.json` (formatting only — see Step 5), `AGENTS.md` (one line)

**Interfaces:**
- Produces: `applyMessageChanges(messages, changes, locale)`, `serializeMessages(messages, eol)`; CLI `node scripts/messages-edit.mjs <changes.json>` where `changes = { "set": { "th": { "ns.key": "text" }, "en": { … } }, "delete": ["ns.key", …] }`; `enforcedNamespaces` array in `tests/thai-glossary.test.ts` that Tasks 5–8 extend.

- [ ] **Step 1: Write the failing tests**

`tests/messages-edit.test.ts`:

```ts
import assert from "node:assert/strict"
import test from "node:test"

import { applyMessageChanges, serializeMessages } from "../scripts/lib/messages-edit-core.mjs"

test("set changes only the named locale, keeps key order and does not mutate the input", () => {
  const messages = { a: { one: "1", two: "2" }, b: { three: "3" } }
  const next = applyMessageChanges(messages, { set: { th: { "a.two": "สอง", "b.four": "4" } } }, "th")
  assert.deepEqual(Object.keys(next.a), ["one", "two"])
  assert.equal(next.a.two, "สอง")
  assert.equal(next.b.four, "4")
  assert.equal(messages.a.two, "2")
  assert.deepEqual(applyMessageChanges(messages, { set: { th: { "a.two": "x" } } }, "en"), messages)
})

test("delete removes keys and drops groups left empty", () => {
  const messages = { a: { one: "1" }, b: { nested: { x: "x" }, keep: "k" } }
  assert.deepEqual(applyMessageChanges(messages, { delete: ["a.one", "b.nested.x"] }, "en"), { b: { keep: "k" } })
})

test("deleting a key that does not exist fails loudly", () => {
  assert.throws(() => applyMessageChanges({ a: {} }, { delete: ["a.nope"] }, "th"), /No such key: a\.nope/)
})

test("serialize uses two-space indent and the given line ending", () => {
  assert.equal(serializeMessages({ a: { b: "c" } }, "\r\n"), '{\r\n  "a": {\r\n    "b": "c"\r\n  }\r\n}\r\n')
})
```

`tests/messages-parity.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

function flatEntries(value: unknown, prefix = ""): Array<[string, string]> {
  if (typeof value === "string") return [[prefix, value]]
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flatEntries(child, prefix ? `${prefix}.${key}` : key))
}
const load = (locale: "th" | "en") => new Map(flatEntries(JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))))
// Simple ICU arguments only: {name}, {count, plural, …} → "name", "count". Words inside plural branches are not arguments.
const placeholders = (text: string) => new Set([...text.matchAll(/\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:[,}])/g)].map((match) => match[1]))

test("Thai and English messages have exactly the same keys", () => {
  const th = load("th")
  const en = load("en")
  assert.deepEqual([...th.keys()].filter((key) => !en.has(key)), [], "keys only in th.json")
  assert.deepEqual([...en.keys()].filter((key) => !th.has(key)), [], "keys only in en.json")
})

test("every message has the same placeholders in Thai and English", () => {
  const th = load("th")
  const en = load("en")
  const mismatched = [...th.entries()].filter(([key, text]) => {
    const other = en.get(key)
    if (other === undefined) return false
    const a = [...placeholders(text)].sort().join(",")
    const b = [...placeholders(other)].sort().join(",")
    return a !== b
  }).map(([key]) => key)
  assert.deepEqual(mismatched, [])
})

test("message files are two-space JSON so scripted edits stay byte-stable", () => {
  for (const locale of ["th", "en"] as const) {
    const raw = readFileSync(`messages/${locale}.json`, "utf8").replace(/\r\n/g, "\n")
    assert.equal(raw, `${JSON.stringify(JSON.parse(raw), null, 2)}\n`, locale)
  }
})
```

`tests/thai-glossary.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// The rules mirror docs/19_THAI_GLOSSARY.md — change both together.
type Rule = { term: string; pattern: RegExp; use: string }
const rules: Rule[] = [
  { term: "Finding", pattern: /finding/i, use: "รายการไม่ตรง" },
  { term: "Scope", pattern: /scope/i, use: "ขอบเขต / นอกขอบเขต" },
  { term: "Review", pattern: /review/i, use: "พิจารณา" },
  { term: "Asset Tag / Tag", pattern: /asset tag|\btag\b/i, use: "รหัสทรัพย์สิน" },
  { term: "Audit", pattern: /\baudit\b/i, use: "ตรวจนับ / ประวัติการแก้ไข" },
  { term: "Label", pattern: /\blabel\b/i, use: "ป้าย" },
  { term: "Template", pattern: /template/i, use: "แม่แบบ" },
  { term: "Prefix", pattern: /prefix/i, use: "คำนำหน้ารหัส" },
  { term: "workflow", pattern: /workflow/i, use: "ขั้นตอนงาน" },
  { term: "Checklist", pattern: /checklist/i, use: "รายการตรวจ" },
  { term: "action plan", pattern: /action plan/i, use: "แผนแก้ไข" },
  { term: "Preview", pattern: /preview/i, use: "ตัวอย่าง" },
  { term: "Filter", pattern: /\bfilter\b/i, use: "ตัวกรอง" },
  { term: "Role", pattern: /\brole\b/i, use: "บทบาท" },
  { term: "Timeline", pattern: /timeline/i, use: "ลำดับเหตุการณ์" },
  { term: "Lifecycle", pattern: /lifecycle/i, use: "วงจรทรัพย์สิน" },
  { term: "Running number", pattern: /running/i, use: "เลขลำดับ" },
  { term: "Retention", pattern: /retention/i, use: "ระยะเวลาเก็บ" },
  { term: "Sync", pattern: /\bsync\b/i, use: "ซิงก์" },
  { term: "Location", pattern: /\blocation\b/i, use: "ที่ตั้ง" },
  { term: "Asset", pattern: /\basset\b/i, use: "ทรัพย์สิน" },
  { term: "พื้นที่", pattern: /พื้นที่/, use: "ที่ตั้ง" },
  { term: "ผู้ครอบครอง", pattern: /ผู้ครอบครอง/, use: "ผู้ถือครอง" },
  { term: "ผู้ถือ (ย่อ)", pattern: /ผู้ถือ(?!ครอง)/, use: "ผู้ถือครอง" },
  { term: "เบิกใช้งานชั่วคราว / ถูกเบิก", pattern: /เบิกใช้งานชั่วคราว|ถูกเบิก/, use: "ยืมใช้ชั่วคราว / ถูกยืม" },
  { term: "ตรวจทาน", pattern: /ตรวจทาน/, use: "พิจารณา" },
  { term: "หมวด (ย่อ)", pattern: /หมวด(?!หมู่)/, use: "หมวดหมู่" },
]

// Removed before matching: product names and allowed compounds.
const allowedPhrases = ["Asset Management System", "พื้นที่จัดเก็บ"]

// "namespace.key": "why this key may keep the word" — a reviewer must be able to check the reason.
const keyExceptions: Record<string, string> = {}

// Namespaces already clean. Tasks 5–7 add theirs; Task 8 replaces the list with every namespace.
const enforcedNamespaces: string[] = ["common", "myAssets", "auth", "supplier", "repairRecord", "adminUsersPage", "transactionCancellation", "integrationApiPage"]

function flatEntries(value: unknown, prefix: string): Array<[string, string]> {
  if (typeof value === "string") return [[prefix, value]]
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => flatEntries(child, `${prefix}.${key}`))
}

const th = JSON.parse(readFileSync("messages/th.json", "utf8")) as Record<string, unknown>

test("cleaned Thai namespaces use the shared glossary", () => {
  const violations: string[] = []
  for (const namespace of enforcedNamespaces) {
    assert.ok(namespace in th, `unknown namespace ${namespace}`)
    for (const [key, value] of flatEntries(th[namespace], namespace)) {
      if (keyExceptions[key]) continue
      const text = allowedPhrases.reduce((current, phrase) => current.split(phrase).join(""), value)
      for (const rule of rules) {
        if (rule.pattern.test(text)) violations.push(`${key}: "${rule.term}" → ${rule.use} :: ${value}`)
      }
    }
  }
  assert.deepEqual(violations, [])
})

test("every glossary exception points at a real key and explains itself", () => {
  const keys = new Set(Object.keys(th).flatMap((namespace) => flatEntries(th[namespace], namespace).map(([key]) => key)))
  for (const [key, reason] of Object.entries(keyExceptions)) {
    assert.ok(keys.has(key), `exception for missing key ${key}`)
    assert.ok(reason.length >= 10, `exception ${key} needs a reason`)
  }
})
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `node --test tests/messages-edit.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts`
Expected: messages-edit FAIL (module missing); parity "byte-stable" FAIL (a few one-line objects such as `"batchStatuses": { "partial": … }`), the other two parity tests PASS or report real mismatches (record them); glossary PASS or FAIL depending on the start list — if a starting namespace fails, remove it from `enforcedNamespaces` and note it in the report.

- [ ] **Step 3: Create `scripts/lib/messages-edit-core.mjs`**

```js
// Pure helpers behind scripts/messages-edit.mjs (imported by tests).

export function applyMessageChanges(messages, changes, locale) {
  const next = structuredClone(messages)
  for (const [path, value] of Object.entries(changes.set?.[locale] ?? {})) setPath(next, path, value)
  for (const path of changes.delete ?? []) deletePath(next, path)
  return next
}

export function serializeMessages(messages, eol) {
  return `${JSON.stringify(messages, null, 2)}\n`.replace(/\n/g, eol)
}

function setPath(target, path, value) {
  const parts = path.split(".")
  let node = target
  for (const part of parts.slice(0, -1)) {
    if (typeof node[part] !== "object" || node[part] === null) node[part] = {}
    node = node[part]
  }
  node[parts.at(-1)] = value
}

function deletePath(target, path) {
  const parts = path.split(".")
  const trail = []
  let node = target
  for (const part of parts.slice(0, -1)) {
    if (typeof node?.[part] !== "object" || node[part] === null) throw new Error(`No such key: ${path}`)
    trail.push([node, part])
    node = node[part]
  }
  const leaf = parts.at(-1)
  if (!node || !(leaf in node)) throw new Error(`No such key: ${path}`)
  delete node[leaf]
  for (let index = trail.length - 1; index >= 0; index -= 1) {
    const [parent, key] = trail[index]
    if (Object.keys(parent[key]).length > 0) break
    delete parent[key]
  }
}
```

- [ ] **Step 4: Create `scripts/messages-edit.mjs`**

```js
// Applies a change file to messages/th.json and messages/en.json.
// Change file: { "set": { "th": { "ns.key": "text" }, "en": { … } }, "delete": ["ns.key", …] }
// Usage: node scripts/messages-edit.mjs path/to/changes.json   (an empty {} only normalises formatting)
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { applyMessageChanges, serializeMessages } from "./lib/messages-edit-core.mjs"

const changeFile = process.argv[2]
if (!changeFile) {
  console.error("Usage: node scripts/messages-edit.mjs <changes.json>")
  process.exit(2)
}
const changes = JSON.parse(readFileSync(changeFile, "utf8"))
for (const locale of ["th", "en"]) {
  const file = join(process.cwd(), "messages", `${locale}.json`)
  const raw = readFileSync(file, "utf8")
  const eol = raw.includes("\r\n") ? "\r\n" : "\n"
  writeFileSync(file, serializeMessages(applyMessageChanges(JSON.parse(raw), changes, locale), eol))
}
console.log(`messages updated: ${Object.keys(changes.set?.th ?? {}).length} th, ${Object.keys(changes.set?.en ?? {}).length} en, ${(changes.delete ?? []).length} deleted`)
```

- [ ] **Step 5: Normalise the message files once**

Write `{}` to a temp file and run `node scripts/messages-edit.mjs <that file>`. Then `git diff --stat messages/` must show only a handful of lines per file (the one-line objects becoming multi-line); `git diff messages/ | grep '^[-+]' | grep -v '^[-+][-+]'` must contain no text changes. Report the line counts.

- [ ] **Step 6: Create `docs/19_THAI_GLOSSARY.md`**

Content: the tables from spec §2.1, §2.2, §2.3 copied verbatim, then this section:

```markdown
## ใช้อย่างไร

- เขียนข้อความไทยใหม่ใช้คำในตารางเสมอ · `tests/thai-glossary.test.ts` ตรวจคำเลิกใช้ในทุกหมวดของ `messages/th.json`
- แก้ไฟล์ข้อความด้วย `node scripts/messages-edit.mjs <changes.json>` (รูปแบบไฟล์อยู่ในหัวสคริปต์) ไม่แก้ JSON ด้วยมือทั้งไฟล์
- ข้อยกเว้นเฉพาะ key ใส่ใน `keyExceptions` ของ test พร้อมเหตุผล
- ปีในหน้าไทยเป็น พ.ศ. (`src/lib/display-year.ts`) ยกเว้นรหัสที่มีปีในตัว
- error จากเซิร์ฟเวอร์แปลที่ `src/lib/api-error-catalog.ts` (เพิ่ม error ใหม่ใน API ต้องเพิ่มคำแปลด้วย test จึงจะผ่าน)
```

- [ ] **Step 7: Add one line to `AGENTS.md`** (in the project section after the Knowledge Wiki block, NOT inside `BEGIN/END:nextjs-agent-rules`; keep the file's line endings):

```markdown
- ข้อความไทย: ใช้คำตาม `docs/19_THAI_GLOSSARY.md` · แก้ `messages/*.json` ผ่าน `node scripts/messages-edit.mjs` · `tests/thai-glossary.test.ts` กันคำเลิกใช้
```

- [ ] **Step 8: Run, full checks, commit**

Run: `node --test tests/messages-edit.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts` → PASS (if the placeholder test reports real mismatches that exist today, fix the English side with `messages-edit.mjs` so both match — list each). Then `npm test`, `npx tsc --noEmit`, `npm run lint`.

```bash
git add scripts/lib/messages-edit-core.mjs scripts/messages-edit.mjs tests/messages-edit.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts docs/19_THAI_GLOSSARY.md AGENTS.md messages/th.json messages/en.json
git commit -m "chore(i18n): message edit tool, parity and Thai glossary guards

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Delete message keys nothing uses

**Files:**
- Create: `scripts/find-unused-messages.mjs`
- Modify: `messages/th.json`, `messages/en.json` (deletions only, through `messages-edit.mjs`)
- Possibly modify: tests that assert a deleted key exists (update or remove that assertion; list each)

**Interfaces:**
- Consumes: `scripts/messages-edit.mjs` (Task 1).
- Produces: smaller message files; a report section "Runtime-built keys" listing each namespace that builds keys at runtime and where its values come from (Task 10 uses it).

- [ ] **Step 1: Create `scripts/find-unused-messages.mjs`**

```js
// Lists message keys that never appear as a string literal in src/.
// A hint, not a verdict: keys built at runtime (t(`actions.${action}`)) look unused here — check them by hand.
// Usage: node scripts/find-unused-messages.mjs [namespace]
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, out)
    else if (/\.(tsx?|mjs)$/.test(entry.name)) out.push(path)
  }
  return out
}
const source = walk(join(root, "src")).map((file) => readFileSync(file, "utf8")).join("\n")
const literals = new Set([...source.matchAll(/["'`]([A-Za-z0-9_.-]+)["'`]/g)].map((match) => match[1]))
const dynamicPrefixes = [...source.matchAll(/`([A-Za-z0-9_.]+)\$\{/g)].map((match) => match[1])
const messages = JSON.parse(readFileSync(join(root, "messages", "th.json"), "utf8"))
const only = process.argv[2]

function keysOf(value, prefix = "") {
  if (typeof value === "string") return [prefix]
  return Object.entries(value).flatMap(([key, child]) => keysOf(child, prefix ? `${prefix}.${key}` : key))
}

const counts = {}
for (const [namespace, value] of Object.entries(messages)) {
  if (only && namespace !== only) continue
  for (const key of keysOf(value)) {
    const leaf = key.split(".").at(-1)
    const full = `${namespace}.${key}`
    const used = literals.has(key) || literals.has(leaf) || literals.has(full)
      || dynamicPrefixes.some((prefix) => key.startsWith(prefix) || full.startsWith(prefix))
    if (used) continue
    counts[namespace] = (counts[namespace] ?? 0) + 1
    console.log(full)
  }
}
console.error(Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([namespace, count]) => `${namespace}: ${count}`).join("\n"))
```

- [ ] **Step 2: Run it and investigate per namespace**

Run: `node scripts/find-unused-messages.mjs > <temp>/unused.txt` (the per-namespace counts print on stderr; expect roughly `systemLogPage` ~184, `auditScan` ~140, `maintenancePage` ~84, `dashboard` ~33, `asset` ~25 …).

For each namespace in the list:
1. Search `src/` for how that namespace's translator is used: `grep -rn "useTranslations(\"<ns>\")\|getTranslations(\"<ns>\")" src` then read the files for template-literal keys (`t(\`…${…}\`)`), keys passed through props/arrays/objects (e.g. `labelKey: "…"`), and keys held in `src/lib` maps.
2. If keys are built at runtime, find every value the variable can take (enums in `src/lib`, Prisma string unions, seed data). Keys reachable that way are **used** — keep them. Record the namespace, the call site and the value source in your report under "Runtime-built keys".
3. For each remaining candidate, confirm with `grep -rn "<leaf>" src` (no hit outside messages) before deleting.

Known: `systemLogPage` builds keys at runtime (`actions.*`, `entities.*` or similar) — expect most of its ~184 candidates to be **used**. `auditScan` leftovers come from the deleted `audit-scan-form.tsx`; `maintenancePage` leftovers from the removed board/SLA/close-approval flow.

- [ ] **Step 3: Delete confirmed keys**

Write `{ "delete": [ "auditScan.someKey", … ] }` to a temp file and run `node scripts/messages-edit.mjs <file>` (deletes from both locales). Run `node --test tests/messages-parity.test.ts`.

- [ ] **Step 4: Run the whole suite and fix tests that asserted deleted keys**

Run: `npm test`. A test that checks a deleted key exists either moves to a key that replaced it or loses that assertion — list every such change with the reason.

- [ ] **Step 5: Full checks, commit**

`npx tsc --noEmit`, `npm run lint`.

```bash
git add scripts/find-unused-messages.mjs messages/th.json messages/en.json <tests you changed>
git commit -m "chore(i18n): delete message keys nothing uses

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Report: deleted keys grouped by namespace (counts + full list), kept-because-runtime-built namespaces with their value sources.

---

### Task 3: Thai error messages with the original server text

**Files:**
- Create: `src/lib/api-error-catalog.ts`, `src/components/ui/use-api-error.ts`, `src/components/ui/api-error-text.tsx`, `tests/api-error-catalog.test.ts`, `tests/api-error-ui.test.ts`
- Modify: `messages/th.json`, `messages/en.json` (new `apiErrors` namespace, via `messages-edit.mjs`); every client file that shows server error text — start from `grep -rlE "(result|payload|data|json|body|response)\??\.error\b" src/components src/app --include=*.tsx` (37 files on 2026-10-08) plus every `toast.error(` that passes `error.message`

**Interfaces:**
- Produces:
  - `apiErrorKeyByMessage: Readonly<Record<string, string>>`, `getApiErrorKey(raw: string): string | null`
  - `type ApiErrorDescription = { message: string; detail: string | null }`
  - `describeApiError(raw: string | null | undefined, labels: { lookup: (key: string) => string; unknown: string; empty: string }): ApiErrorDescription`
  - `useApiError(): { describe: (error: unknown) => ApiErrorDescription; toast: (error: unknown) => void }`
  - `<ApiErrorText error={unknown} className? />`

- [ ] **Step 1: Write the failing tests**

`tests/api-error-catalog.test.ts`:

```ts
import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

import { apiErrorKeyByMessage, describeApiError, getApiErrorKey } from "../src/lib/api-error-catalog.ts"

const thai = { lookup: (key: string) => `TH:${key}`, unknown: "เกิดข้อผิดพลาด", empty: "เกิดข้อผิดพลาด" }

test("a known server message becomes Thai with the original kept as detail", () => {
  const key = getApiErrorKey("Asset not found")
  assert.ok(key)
  assert.deepEqual(describeApiError("Asset not found", thai), { message: `TH:${key}`, detail: "Asset not found" })
})

test("an unknown server message falls back to a generic Thai line and keeps the original", () => {
  assert.deepEqual(describeApiError("Something odd happened", thai), { message: "เกิดข้อผิดพลาด", detail: "Something odd happened" })
})

test("empty input and text that is already Thai are not duplicated", () => {
  assert.deepEqual(describeApiError(undefined, thai), { message: "เกิดข้อผิดพลาด", detail: null })
  assert.deepEqual(describeApiError("   ", thai), { message: "เกิดข้อผิดพลาด", detail: null })
  assert.deepEqual(describeApiError("เกิดข้อผิดพลาด", thai), { message: "เกิดข้อผิดพลาด", detail: null })
})

test("on the English site the detail line disappears when it would repeat the message", () => {
  const english = { lookup: () => "Asset not found", unknown: "Something went wrong", empty: "Something went wrong" }
  assert.deepEqual(describeApiError("Asset not found", english), { message: "Asset not found", detail: null })
})

// Files whose errors never reach a browser as response text. Each entry needs a reason.
const internalErrorFiles: Record<string, string> = {
  "src/lib/manual-migration-ledger.ts": "CLI migration tool output",
  "src/lib/manual-migration-sql-server.ts": "CLI migration tool output",
  "src/lib/asset-qr-scanner.ts": "camera errors are mapped to cameraError/cameraNotFound in the scan UI",
  "src/lib/audit-offline-queue.ts": "client-side IndexedDB queue errors",
}

function walk(dir: string, out: string[] = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, out)
    else if (entry.name.endsWith(".ts")) out.push(path.replaceAll("\\", "/"))
  }
  return out
}

test("every literal error message the server can send has a Thai translation", () => {
  const pattern = /(?:\berror:\s*|new\s+\w*Error\(\s*(?:\d+\s*,\s*)?)"([A-Za-z][^"]{2,160})"/g
  const files = [...walk("src/app/api"), ...walk("src/lib")].filter((file) => !(file in internalErrorFiles))
  const missing = new Set<string>()
  for (const file of files) {
    for (const match of readFileSync(file, "utf8").matchAll(pattern)) {
      if (!(match[1] in apiErrorKeyByMessage)) missing.add(`${match[1]}  (${file})`)
    }
  }
  assert.deepEqual([...missing], [])
})

test("every catalog key has Thai and English text", () => {
  for (const locale of ["th", "en"] as const) {
    const apiErrors = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).apiErrors as Record<string, string>
    assert.equal(typeof apiErrors.unknown, "string", `${locale} apiErrors.unknown`)
    const missing = [...new Set(Object.values(apiErrorKeyByMessage))].filter((key) => typeof apiErrors[key] !== "string")
    assert.deepEqual(missing, [], locale)
  }
})

test("internal-file exceptions still exist", () => {
  for (const file of Object.keys(internalErrorFiles)) assert.ok(readFileSync(file, "utf8").length > 0, file)
})
```

`tests/api-error-ui.test.ts`:

```ts
import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

function walk(dir: string, out: string[] = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, out)
    else if (entry.name.endsWith(".tsx")) out.push(path.replaceAll("\\", "/"))
  }
  return out
}

test("no screen toasts raw server text; it goes through useApiError", () => {
  const offenders: string[] = []
  for (const file of [...walk("src/components"), ...walk("src/app")]) {
    const source = readFileSync(file, "utf8")
    for (const match of source.matchAll(/toast\.error\(([^)]*)\)/g)) {
      if (/\.error\b|error\.message|\berror\b\s*$/.test(match[1])) offenders.push(`${file}: toast.error(${match[1].slice(0, 60)})`)
    }
  }
  assert.deepEqual(offenders, [])
})

test("the helpers render Thai first and the original text as a small second line", () => {
  const hook = readFileSync("src/components/ui/use-api-error.ts", "utf8")
  assert.match(hook, /toast\.error\(message, detail \? \{ description: detail \} : undefined\)/)
  assert.match(hook, /console\.warn\(/)
  const text = readFileSync("src/components/ui/api-error-text.tsx", "utf8")
  assert.match(text, /block text-xs font-normal text-muted-foreground/)
})
```

- [ ] **Step 2: Run them and confirm they fail** — `node --test tests/api-error-catalog.test.ts tests/api-error-ui.test.ts` → FAIL (module missing; offenders listed).

- [ ] **Step 3: Create `src/lib/api-error-catalog.ts`**

Build the catalog from the scan in the coverage test (run the regex over `src/app/api` and `src/lib` minus `internalErrorFiles` to get the list — 197 distinct strings on 2026-10-08, including UPPER_SNAKE codes such as `ASSET_STATE_REVIEW_NOT_FOUND`). Key names are lowerCamel and say what happened (`assetNotFound`, `auditRoundClosed`, `serialNumberExists`); identical meanings may share a key.

```ts
/** Server error text (English — the API contract does not change) → key in the "apiErrors" messages namespace. */
export const apiErrorKeyByMessage: Readonly<Record<string, string>> = {
  "Asset not found": "assetNotFound",
  "Audit round not found": "auditRoundNotFound",
  "Audit round is closed": "auditRoundClosed",
  "Audit round is cancelled": "auditRoundCancelled",
  "Forbidden: insufficient permissions": "forbidden",
  "Serial Number already exists": "serialNumberExists",
  // …one entry for every string the coverage test lists
}

export type ApiErrorDescription = { message: string; detail: string | null }

const thaiText = /[฀-๿]/

export function getApiErrorKey(raw: string): string | null {
  return apiErrorKeyByMessage[raw.trim()] ?? null
}

export function describeApiError(
  raw: string | null | undefined,
  labels: { lookup: (key: string) => string; unknown: string; empty: string },
): ApiErrorDescription {
  const text = raw?.trim() ?? ""
  if (!text) return { message: labels.empty, detail: null }
  if (thaiText.test(text)) return { message: text, detail: null }
  const key = getApiErrorKey(text)
  const message = key ? labels.lookup(key) : labels.unknown
  return { message, detail: message === text ? null : text }
}
```

(The commented line above marks where the remaining entries go; the committed file has no comment there — every string from the scan is listed.)

- [ ] **Step 4: Add the `apiErrors` namespace** with `messages-edit.mjs`: `apiErrors.unknown` = th "เกิดข้อผิดพลาด" / en "Something went wrong", and one key per catalog value. Thai follows the glossary, short and plain ("ไม่พบทรัพย์สินนี้", "รอบตรวจนับนี้ถูกปิดแล้ว", "ไม่มีสิทธิ์ทำรายการนี้", "Serial นี้มีอยู่แล้ว"). English = the original server sentence.

- [ ] **Step 5: Create `src/components/ui/use-api-error.ts`**

```ts
"use client"

import { useCallback, useMemo } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { describeApiError, type ApiErrorDescription } from "@/lib/api-error-catalog"

/** Thai (or English) message for a server error, keeping the original text for admins. */
export function useApiError() {
  const t = useTranslations("apiErrors")
  const tCommon = useTranslations("common")

  const describe = useCallback((error: unknown): ApiErrorDescription => {
    const raw = error instanceof Error ? error.message : typeof error === "string" ? error : null
    return describeApiError(raw, { lookup: (key) => t(key), unknown: t("unknown"), empty: tCommon("error") })
  }, [t, tCommon])

  const showToast = useCallback((error: unknown) => {
    const { message, detail } = describe(error)
    if (detail) console.warn("[server error]", detail)
    toast.error(message, detail ? { description: detail } : undefined)
  }, [describe])

  return useMemo(() => ({ describe, toast: showToast }), [describe, showToast])
}
```

- [ ] **Step 6: Create `src/components/ui/api-error-text.tsx`**

```tsx
"use client"

import { useEffect } from "react"
import { useApiError } from "@/components/ui/use-api-error"

/** Inline server error: Thai first line, original server text as a small grey second line. */
export function ApiErrorText({ error, className }: { error: unknown; className?: string }) {
  const { describe } = useApiError()
  const { message, detail } = describe(error)

  useEffect(() => {
    if (detail) console.warn("[server error]", detail)
  }, [detail])

  return (
    <span className={className}>
      {message}
      {detail ? <span className="block text-xs font-normal text-muted-foreground">{detail}</span> : null}
    </span>
  )
}
```

- [ ] **Step 7: Convert every screen that shows server text**

Patterns (keep behaviour, only change how the text is shown):
- `toast.error(result?.error ?? tCommon("error"))` → `apiError.toast(result?.error)` with `const apiError = useApiError()` at the top of the component.
- `throw new Error(result?.error ?? tCommon("error"))` + `catch (error) { toast.error(error instanceof Error ? error.message : tCommon("error")) }` → keep the throw, catch becomes `apiError.toast(error)`.
- `setError(result.error)` + `{error}` in markup → keep the raw text in state, render `<ApiErrorText error={error} />` where `{error}` was.
- Messages that are already `t(...)` (Thai) may stay as they are; never pass a Thai string through `describe` expecting translation.
- Do not change server code. The scan workspace's `isRoundClosedError` still compares the English text.

- [ ] **Step 8: Run tests, full checks, commit**

`node --test tests/api-error-catalog.test.ts tests/api-error-ui.test.ts` → PASS; then `npm test`, `npx tsc --noEmit`, `npm run lint`.

```bash
git add src/lib/api-error-catalog.ts src/components/ui/use-api-error.ts src/components/ui/api-error-text.tsx tests/api-error-catalog.test.ts tests/api-error-ui.test.ts messages/th.json messages/en.json <converted component files>
git commit -m "feat(i18n): Thai server error messages with the original text for admins

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Report: number of catalog entries, the internal-file exceptions (and any you added, with reasons), the list of converted files.

---

### Task 4: Page language and Buddhist-era years

**Files:**
- Create: `src/lib/display-year.ts`, `tests/display-year.test.ts`, `tests/html-lang-and-years.test.ts`
- Modify: `src/app/layout.tsx`, `src/app/[locale]/(dashboard)/audit/rounds/page.tsx`, `src/components/audit/audit-round-form.tsx`, `messages/*.json` (`auditRound.auditYear` label, through `messages-edit.mjs`)

**Interfaces:**
- Produces: `toDisplayYear(gregorianYear: number, locale: string): number`, `fromDisplayYear(displayYear: number, locale: string): number`, `displayYearRange(locale: string): { min: number; max: number }`

- [ ] **Step 1: Write the failing tests**

`tests/display-year.test.ts`:

```ts
import assert from "node:assert/strict"
import test from "node:test"

import { displayYearRange, fromDisplayYear, toDisplayYear } from "../src/lib/display-year.ts"

test("Thai shows Buddhist-era years and converts back on input", () => {
  assert.equal(toDisplayYear(2026, "th"), 2569)
  assert.equal(fromDisplayYear(2569, "th"), 2026)
})

test("English keeps Gregorian years", () => {
  assert.equal(toDisplayYear(2026, "en"), 2026)
  assert.equal(fromDisplayYear(2026, "en"), 2026)
})

test("the Thai year field accepts exactly the API's 2000–2100 range, so a typed 2026 is refused", () => {
  assert.deepEqual(displayYearRange("th"), { min: 2543, max: 2643 })
  assert.deepEqual(displayYearRange("en"), { min: 2000, max: 2100 })
  const { min } = displayYearRange("th")
  assert.ok(2026 < min, "a Gregorian year typed on the Thai form is below the minimum")
})
```

`tests/html-lang-and-years.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("the html lang follows the open locale", () => {
  const layout = read("src/app/layout.tsx")
  assert.match(layout, /const locale = await getLocale\(\)/)
  assert.match(layout, /<html lang=\{locale\}/)
  assert.doesNotMatch(layout, /<html lang="th"/)
})

test("the coverage heading shows the year in the reader's calendar", () => {
  assert.match(read("src/app/[locale]/(dashboard)/audit/rounds/page.tsx"), /t\("coverageTitle", \{ year: toDisplayYear\(currentYear, locale\) \}\)/)
})

test("the audit-year field shows and accepts the display year and saves Gregorian", () => {
  const form = read("src/components/audit/audit-round-form.tsx")
  assert.match(form, /auditYear: String\(toDisplayYear\(new Date\(\)\.getFullYear\(\), locale\)\)/)
  assert.match(form, /min=\{yearRange\.min\} max=\{yearRange\.max\}/)
  assert.match(form, /fromDisplayYear\(Number\(values\.auditYear\), locale\)/)
  assert.doesNotMatch(form, /min=\{2000\} max=\{2100\}/)
})
```

- [ ] **Step 2: Run them and confirm they fail.**

- [ ] **Step 3: Create `src/lib/display-year.ts`**

```ts
const buddhistEraOffset = 543
// Same bounds as the API's auditYear validation (src/lib/validations/audit.ts: 2000–2100).
const gregorianRange = { min: 2000, max: 2100 }

export function toDisplayYear(gregorianYear: number, locale: string) {
  return locale === "th" ? gregorianYear + buddhistEraOffset : gregorianYear
}

export function fromDisplayYear(displayYear: number, locale: string) {
  return locale === "th" ? displayYear - buddhistEraOffset : displayYear
}

export function displayYearRange(locale: string) {
  return { min: toDisplayYear(gregorianRange.min, locale), max: toDisplayYear(gregorianRange.max, locale) }
}
```

- [ ] **Step 4: `src/app/layout.tsx`** — import `getLocale` from `next-intl/server`, make `RootLayout` `async`, add `const locale = await getLocale()` and render `<html lang={locale} …>` (keep `suppressHydrationWarning` and the font classes). Check `node_modules/next-intl` docs/types that `getLocale` works in the root layout with this project's `src/i18n/request.ts`; if it does not, report NEEDS_CONTEXT instead of moving `<html>`.

- [ ] **Step 5: Audit rounds page** — get the page `locale` (it already reads `params`; use that value) and change the heading call to `t("coverageTitle", { year: toDisplayYear(currentYear, locale) })`. Leave the Prisma queries on `currentYear` (Gregorian).

- [ ] **Step 6: `audit-round-form.tsx`**
- `const locale = useLocale()` and `const yearRange = displayYearRange(locale)`.
- Default `auditYear: String(toDisplayYear(new Date().getFullYear(), locale))`.
- The input: `min={yearRange.min} max={yearRange.max}`.
- Where the form builds the request body, send `auditYear: fromDisplayYear(Number(values.auditYear), locale)` (find the existing body construction and change only that field).
- Label `auditRound.auditYear`: th "ปีตรวจนับ (พ.ศ.)" · en "Audit year" (via `messages-edit.mjs`).

- [ ] **Step 7: Other year displays** — run `grep -rn "getFullYear()" src/app src/components --include=*.tsx` and `grep -rn "\"en-GB\"\|\"en-US\"" src/app src/components --include=*.tsx`; any year or date shown to a Thai reader without the locale switch gets `toDisplayYear` / the `locale === "th" ? "th-TH" : …` pattern. Leave codes, the login © line and date-math (`new Date(now.getFullYear(), …)`) alone. List what you changed and what you left.

- [ ] **Step 8: Run tests, full checks, commit**

```bash
git add src/lib/display-year.ts tests/display-year.test.ts tests/html-lang-and-years.test.ts src/app/layout.tsx "src/app/[locale]/(dashboard)/audit/rounds/page.tsx" src/components/audit/audit-round-form.tsx messages/th.json messages/en.json <other files from Step 7>
git commit -m "feat(i18n): html lang follows the locale; Buddhist-era years on Thai pages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Glossary — assets, master data and custody

**Files:**
- Modify: `messages/th.json`, `messages/en.json` (via `messages-edit.mjs`), `tests/thai-glossary.test.ts` (`enforcedNamespaces`), tests that pin old wording, Thai strings hard-coded in this group's `.tsx` files
- Namespaces: `asset`, `assetTools`, `location`, `branch`, `category`, `company`, `department`, `brandModel`, `checkin`, `checkout`, `bulkMove`, `transfer`, `globalSearch`, `employee`

**Interfaces:**
- Consumes: `scripts/messages-edit.mjs`, `tests/thai-glossary.test.ts` (Task 1).

- [ ] **Step 1: Switch the guard on** — add the namespaces above to `enforcedNamespaces` and run `node --test tests/thai-glossary.test.ts`. Expected: FAIL listing every violation (about 140 on 2026-10-08: e.g. `location` 21 × พื้นที่, `asset` Label/Lifecycle/Template/Checklist, `checkout` เบิกใช้งานชั่วคราว). Save the list.

- [ ] **Step 2: Reword** — write a change file with the new Thai text for every listed key (read each value in context; rewrite the sentence, do not swap a word blindly). For keys whose meaning changed (e.g. a temporary loan), update the English key too (`checkout.temporaryLoan` en "Temporary loan"). Apply with `node scripts/messages-edit.mjs <file>`. Also fix banned words in the same namespaces that the rules cannot see (e.g. "ข้อมูลไม่ตรง" used as the list name → "รายการไม่ตรง"). The master-data menu label for locations becomes "ที่ตั้ง" (`nav` is Task 8 — do not touch it here).

- [ ] **Step 3: Hard-coded Thai in this group's screens** — `grep -rln "[ก-๙]" src/components/assets src/components/master-data src/components/asset-operations src/app/[locale]/(dashboard)/assets src/app/[locale]/(dashboard)/master-data` (use the Grep tool with `[\x{0E00}-\x{0E7F}]` if your grep lacks Unicode) and apply the glossary to any user-visible text found.

- [ ] **Step 4: Tests that pinned the old wording** — run `npm test`; update each failing assertion to the new wording (this is the intended change) and list file + old → new in the report.

- [ ] **Step 5: Run, full checks, commit** — `node --test tests/thai-glossary.test.ts tests/messages-parity.test.ts` → PASS; `npm test`, `npx tsc --noEmit`, `npm run lint`.

```bash
git add messages/th.json messages/en.json tests/thai-glossary.test.ts <changed tests and tsx files>
git commit -m "feat(i18n): shared Thai glossary for assets, master data and custody

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Report: number of keys reworded per namespace, a sample of 15 before/after pairs, every exception added to `keyExceptions` with its reason.

---

### Task 6: Glossary — audit, work centre and approvals

**Files:**
- Modify: `messages/th.json`, `messages/en.json` (via `messages-edit.mjs`), `tests/thai-glossary.test.ts` (`enforcedNamespaces`), tests that pin old wording, Thai strings hard-coded in this group's files
- Namespaces: `auditRound`, `auditScan`, `auditFinding`, `auditPending`, `dashboard`, `workCenter`, `notifications`, `approvalInboxPage`, `approvalHistoryPage`

**Interfaces:**
- Consumes: `scripts/messages-edit.mjs` (change file `{ "set": { "th": { "ns.key": "text" }, "en": { … } }, "delete": [] }`), `tests/thai-glossary.test.ts` and its `enforcedNamespaces` array (Task 1).

- [ ] **Step 1: Switch the guard on** — add the namespaces above to `enforcedNamespaces` in `tests/thai-glossary.test.ts` and run `node --test tests/thai-glossary.test.ts`. Expected: FAIL listing every violation (about 125 on 2026-10-08 before Task 2's deletions — Finding, Scope/นอก Scope, Review/รอ Review, พื้นที่, Checklist, action plan). Save the list.

- [ ] **Step 2: Reword** — write a change file with new Thai text for every listed key. Read each value in context and rewrite the sentence naturally (never a blind word swap); keep every `{placeholder}` and plural syntax; keep buttons and badges about as short as before. Apply with `node scripts/messages-edit.mjs <file>`.
  - "Finding รอตรวจ" → "รายการไม่ตรงรอพิจารณา"
  - "ภาพรวม Coverage การตรวจนับปี {year}" → "ภาพรวมความครอบคลุมการตรวจนับปี {year}"
  - "บันทึกเป็นนอก Scope" → "บันทึกเป็นนอกขอบเขต"
  - `workCenter.findingType_wrong_location` "พื้นที่ไม่ตรง" → "ที่ตั้งไม่ตรง"; `auditScan.wrongLocation` "พื้นที่" → "ที่ตั้ง"
  - `auditScan.matchedCustodian` "ผู้ถือ {value}" → "ผู้ถือครอง {value}"
  - English: where the meaning changed — Finding → "Discrepancy", Review (a decision) → "Decision" / "decide"; nothing else.
  - Also fix glossary words the rules cannot detect in these namespaces (e.g. "ข้อมูลไม่ตรง" used as the name of the list → "รายการไม่ตรง").

- [ ] **Step 3: Hard-coded Thai in this group's code** — search `src/components/audit`, `src/components/dashboard`, `src/app/[locale]/(dashboard)/audit`, `src/app/[locale]/(dashboard)/dashboard`, `src/lib/approval-inbox.ts`, `src/lib/notification-digest-format.ts` for Thai characters (Grep tool, pattern `[\x{0E00}-\x{0E7F}]`) and apply the glossary to user-visible text. Search synonyms and import aliases: add new words, keep old ones.

- [ ] **Step 4: Tests that pinned the old wording** — run `npm test`; update each failing assertion to the new wording (the intended change) and list file + old → new in the report.

- [ ] **Step 5: Run, full checks, commit** — `node --test tests/thai-glossary.test.ts tests/messages-parity.test.ts` → PASS; then `npm test`, `npx tsc --noEmit`, `npm run lint`.

```bash
git add messages/th.json messages/en.json tests/thai-glossary.test.ts <changed tests and source files>
git commit -m "feat(i18n): shared Thai glossary for audit, work centre and approvals

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Report: keys reworded per namespace, 15 before/after pairs, every `keyExceptions` entry added with its reason, every changed test assertion.

---

### Task 7: Glossary — maintenance, disposal, reports and data quality

**Files:**
- Modify: `messages/th.json`, `messages/en.json` (via `messages-edit.mjs`), `tests/thai-glossary.test.ts` (`enforcedNamespaces`), tests that pin old wording, Thai strings hard-coded in this group's files
- Namespaces: `maintenancePage`, `disposalPage`, `reportsPage`, `dataQualityPage`, `storagePage`, `productionReadinessPage`

**Interfaces:**
- Consumes: `scripts/messages-edit.mjs` (change file `{ "set": { "th": { "ns.key": "text" }, "en": { … } }, "delete": [] }`), `tests/thai-glossary.test.ts` and its `enforcedNamespaces` array (Task 1).

- [ ] **Step 1: Switch the guard on** — add the namespaces above to `enforcedNamespaces` in `tests/thai-glossary.test.ts` and run `node --test tests/thai-glossary.test.ts`. Expected: FAIL listing every violation (about 30 on 2026-10-08 — ผู้ครอบครอง, ตรวจทาน, Checklist, workflow, Review, Preview). Save the list.

- [ ] **Step 2: Reword** — write a change file with new Thai text for every listed key. Read each value in context and rewrite the sentence naturally (never a blind word swap); keep every `{placeholder}` and plural syntax; keep buttons and badges about as short as before. Apply with `node scripts/messages-edit.mjs <file>`.
  - "ผู้ครอบครอง" → "ผู้ถือครอง"; "ตรวจทาน" → "พิจารณา"; "workflow" → "ขั้นตอนงาน"
  - Headings for PM read "บำรุงรักษาตามรอบ (PM)"; short labels may keep "PM"
  - English: only where the meaning changed; nothing else.
  - Also fix glossary words the rules cannot detect in these namespaces (e.g. "ข้อมูลไม่ตรง" used as the name of the list → "รายการไม่ตรง").

- [ ] **Step 3: Hard-coded Thai in this group's code** — search `src/components/maintenance`, `src/components/disposal`, `src/components/reports`, `src/lib/disposal-policy.ts`, `src/app/api/maintenance-tickets/export/route.ts` (export column headers are read by people, not re-imported — rename to the glossary) for Thai characters (Grep tool, pattern `[\x{0E00}-\x{0E7F}]`) and apply the glossary to user-visible text. Search synonyms and import aliases: add new words, keep old ones.

- [ ] **Step 4: Tests that pinned the old wording** — run `npm test`; update each failing assertion to the new wording (the intended change) and list file + old → new in the report.

- [ ] **Step 5: Run, full checks, commit** — `node --test tests/thai-glossary.test.ts tests/messages-parity.test.ts` → PASS; then `npm test`, `npx tsc --noEmit`, `npm run lint`.

```bash
git add messages/th.json messages/en.json tests/thai-glossary.test.ts <changed tests and source files>
git commit -m "feat(i18n): shared Thai glossary for maintenance, disposal and reports

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Report: keys reworded per namespace, 15 before/after pairs, every `keyExceptions` entry added with its reason, every changed test assertion.

---

### Task 8: Glossary — settings, admin, navigation and Thai text in code; guard on everywhere

**Files:**
- Modify: `messages/*.json` (namespaces `systemSettingsPage`, `systemLogPage`, `adminRolesPage`, `accessDeniedPage`, `nav` and any namespace not yet enforced), `tests/thai-glossary.test.ts`, user-visible Thai strings in `src/lib/system-setting-defaults.ts`, `src/lib/movement-labels.ts`, `src/lib/asset-state-review-api.ts`, `src/lib/category-delete-guard.ts`, `src/app/api/search/route.ts`, `src/app/manifest.ts`, `src/lib/asset-excel.ts` (import template headers), `src/lib/asset-import-mapping.ts` (aliases), `tests/asset-import-mapping.test.ts`

- [ ] **Step 1: Pin the Excel aliases first** — add to `tests/asset-import-mapping.test.ts`:

```ts
test("old and new Thai location headers both map after the glossary rename", () => {
  for (const header of ["พื้นที่", "ที่ตั้ง"]) {
    const column = buildAssetImportColumnMapping([header]).find((entry) => entry.key === "currentLocationCode")
    assert.equal(column?.sourceColumn, 1, header)
  }
  for (const header of ["พื้นที่ประจำ", "ที่ตั้งประจำ"]) {
    const column = buildAssetImportColumnMapping([header]).find((entry) => entry.key === "homeLocationCode")
    assert.equal(column?.sourceColumn, 1, header)
  }
})
```

Run it → FAIL (no "ที่ตั้ง" / "ที่ตั้งประจำ" alias yet). Add the new words to the alias lists in `asset-import-mapping.ts` **and keep the old ones**; if `asset-excel.ts` template headers change, add the old header text to the matching alias list too. Re-run → PASS.

- [ ] **Step 2: Switch the guard on for this group** — add `systemSettingsPage`, `systemLogPage`, `adminRolesPage`, `accessDeniedPage`, `nav` to `enforcedNamespaces`; run; reword (≈125 violations: Sync, Template, Prefix, Running, Label, Role, Filter, Retention …). Admin pages keep Token / Client ID / JSON (not in the rules). The menu "พื้นที่/ตำแหน่ง" becomes "ที่ตั้ง".

- [ ] **Step 3: Thai text in code** — apply the glossary to user-visible Thai in the `src/lib` / `src/app` files listed above (notification template defaults, movement labels, review messages, delete-guard messages, search result labels, manifest name/description). Search synonyms in `src/app/api/search/route.ts` and `src/lib/organization-master-query.ts` are matching aids, not labels: **add** glossary words, do not remove old ones.

- [ ] **Step 4: Guard on everywhere** — replace the `enforcedNamespaces` literal with `Object.keys(th)` (keep the variable name), run `node --test tests/thai-glossary.test.ts` and fix whatever remains in namespaces no task owned. Every `keyExceptions` entry needs a reason.

- [ ] **Step 5: Pinned tests, full checks, commit** — same as Task 5 Step 4–5.

```bash
git add messages/th.json messages/en.json tests/thai-glossary.test.ts tests/asset-import-mapping.test.ts src/lib/asset-import-mapping.ts <other changed files>
git commit -m "feat(i18n): shared Thai glossary for settings, admin and navigation; guard on for every namespace

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Status wording in the database (seed + manual migration, not applied)

**Files:**
- Modify: `prisma/seed.ts`
- Create: `prisma/manual-migrations/2026-10-08-thai-status-wording.sql`, `tests/thai-status-wording.test.ts`

- [ ] **Step 1: Write the failing test** — `tests/thai-status-wording.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const seed = readFileSync("prisma/seed.ts", "utf8")
const sql = readFileSync("prisma/manual-migrations/2026-10-08-thai-status-wording.sql", "utf8")

test("seeded status names and descriptions follow the glossary", () => {
  assert.match(seed, /name: "Checked Out", nameTh: "ถูกยืม", description: "ถูกยืมใช้ชั่วคราวและมีรายการยืมที่ยังเปิดอยู่"/)
  assert.match(seed, /name: "Ready", nameTh: "พร้อมใช้งาน", description: "พร้อมสำหรับส่งมอบ ยืมใช้ หรือเริ่มขั้นตอนอื่น"/)
  assert.match(seed, /name: "In Use", nameTh: "ใช้งานอยู่", description: "ทรัพย์สินระยะยาวที่มีผู้ถือครองและกำลังใช้งาน"/)
  assert.doesNotMatch(seed, /ถูกเบิก|เบิกใช้|ผู้ครอบครอง/)
})

test("the data fix only replaces the old default wording, by English name", () => {
  assert.match(sql, /UPDATE \[dbo\]\.\[asset_statuses\]/)
  assert.match(sql, /WHERE \[name\] = N'Checked Out' AND \[nameTh\] = N'ถูกเบิก'/)
  assert.match(sql, /WHERE \[name\] = N'Ready' AND \[description\] = N'พร้อมสำหรับมอบหมาย เบิกใช้ หรือเริ่มกระบวนการอื่น'/)
  assert.match(sql, /WHERE \[name\] = N'In Use' AND \[description\] = N'ทรัพย์สินระยะยาวที่มีผู้ครอบครองและกำลังใช้งาน'/)
  assert.doesNotMatch(sql, /ALTER TABLE|DROP|DELETE/i)
})
```

- [ ] **Step 2: Run it and confirm it fails.**

- [ ] **Step 3: Edit `prisma/seed.ts`** — the three status rows get exactly the strings asserted above. Check the rest of the seed for other wording the glossary changes and report it (do not change role names).

- [ ] **Step 4: Create the migration file**

```sql
-- Thai status wording (round 3 part B3, 2026-10-08): "Checked Out" is a temporary loan, so it reads ถูกยืม.
-- Data change only: no schema change. Each UPDATE replaces only the old default text, so names an admin edited stay.
-- Run only after a verified SQL Server backup and explicit approval.

UPDATE [dbo].[asset_statuses]
SET [nameTh] = N'ถูกยืม', [description] = N'ถูกยืมใช้ชั่วคราวและมีรายการยืมที่ยังเปิดอยู่'
WHERE [name] = N'Checked Out' AND [nameTh] = N'ถูกเบิก';

UPDATE [dbo].[asset_statuses]
SET [description] = N'พร้อมสำหรับส่งมอบ ยืมใช้ หรือเริ่มขั้นตอนอื่น'
WHERE [name] = N'Ready' AND [description] = N'พร้อมสำหรับมอบหมาย เบิกใช้ หรือเริ่มกระบวนการอื่น';

UPDATE [dbo].[asset_statuses]
SET [description] = N'ทรัพย์สินระยะยาวที่มีผู้ถือครองและกำลังใช้งาน'
WHERE [name] = N'In Use' AND [description] = N'ทรัพย์สินระยะยาวที่มีผู้ครอบครองและกำลังใช้งาน';
```

- [ ] **Step 5: Run tests, full checks, commit.** Do **not** run the SQL or `migration:apply`.

```bash
git add prisma/seed.ts prisma/manual-migrations/2026-10-08-thai-status-wording.sql tests/thai-status-wording.test.ts
git commit -m "feat(i18n): status wording follows the glossary (seed + manual data migration)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Apply on dev, check the app, docs and wiki (main session)

- [ ] **Step 1: Dev DB** — confirm `.env` points at `asset_management_dev` with login `asset_dev`, then `npm run migration:status`, then `npm run migration:apply -- 2026-10-08-thai-status-wording.sql --backup-confirmed --reason "B3 status wording (dev)" --by "Claude dev check"`; verify with a read-only SELECT of the three rows.

- [ ] **Step 2: Full verification** — `npm run verify` (stop the dev server first, restart after).

- [ ] **Step 3: Dev-app checks (spec §9)**
1. Open in Thai: `/th/dashboard`, `/th/work-center`, `/th/assets`, an asset detail, checkout and check-in forms, `/th/audit/rounds` (+ a round, its scan page, pending list, `/th/audit/findings`), `/th/maintenance`, `/th/disposal`, `/th/reports`, `/th/master-data/locations`, `/th/admin/users`, `/th/admin/roles`, `/th/admin/settings`, `/th/admin/system-logs`. On each, scan `document.body.innerText` for `Finding|Scope|Review|Asset Tag|เบิกใช้งานชั่วคราว|ถูกเบิก|พื้นที่(?!จัดเก็บ)` and for a 4-digit year 19xx/20xx outside codes; list hits.
2. Grep the dev-server log for `MISSING_MESSAGE` after visiting every page, especially the runtime-built namespaces Task 2 listed.
3. `document.documentElement.lang` is `th` on `/th/...` and `en` on `/en/...`.
4. Trigger a known error (save an asset with a duplicate Serial, or open a closed round's scan) → Thai first line + original English second line; an unknown error → "เกิดข้อผิดพลาด" + the original.
5. New audit round form shows 2569; typing 2026 is refused by the field; a round created with 2569 is stored as 2026 (round number AUD-2026-…).
6. Asset status "ถูกยืม" shows in the register tabs and badges.
7. Excel import preview with an old header file ("พื้นที่") still maps the location column.

- [ ] **Step 4: Docs** — `DESIGN.md` (Thai copy rules: glossary, error lines, years), `DEVELOPER_HANDOFF.md` (B3 section: glossary test, messages-edit tool, api-error-catalog, display-year, status migration pending on Prod), `docs/99_CHANGELOG.md` (B3 entry with numbers).

- [ ] **Step 5: Wiki and memory** — `ams-status` row B3, `ams-open-questions` (Prod migration `2026-10-08-thai-status-wording.sql` needs backup + approval), `ams-log`; lint; vault commit `ingest:`; memory update.

- [ ] **Step 6: Report to the user in Thai, then superpowers:finishing-a-development-branch.**
