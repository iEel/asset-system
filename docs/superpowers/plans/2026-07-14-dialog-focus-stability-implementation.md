# Dialog Focus Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent open dialogs from re-running initial autofocus when controlled form state or callback identities change.

**Architecture:** Keep `AccessibleDialog`'s API unchanged. Synchronize changing props into refs, while the focus lifecycle effect depends only on the dialog's open state and reads current ref values from keyboard and backdrop handlers.

**Tech Stack:** Next.js 16.2.4 App Router, React 19 Client Components, TypeScript, Node test runner.

## Global Constraints

- Do not change dialog layout or caller APIs.
- Initial autofocus and final focus restoration run once per open/close cycle.
- Escape and backdrop closing use the latest `busy` and `onClose` values.
- Do not add runtime dependencies.

---

### Task 1: Stabilize AccessibleDialog Focus Lifecycle

**Files:**
- Modify: `src/components/ui/accessible-dialog.tsx`
- Modify: `tests/accessible-dialog.test.ts`

**Interfaces:**
- Preserves: `AccessibleDialog` props and rendered modal semantics.
- Produces: stable focus behavior throughout controlled child re-renders.

- [ ] **Step 1: Write the failing regression test**

Extend `tests/accessible-dialog.test.ts` with assertions that require `onCloseRef`, `busyRef`, ref-backed event reads, a focus lifecycle dependency of `[open]`, and absence of the old `[busy, initialFocusRef, onClose, open]` dependency list.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test --experimental-strip-types tests/accessible-dialog.test.ts
```

Expected: FAIL because the current dialog effect directly depends on changing props.

- [ ] **Step 3: Implement the minimal shared fix**

Add refs initialized from `onClose`, `busy`, and `initialFocusRef`. Synchronize them in an effect. Update autofocus and Escape handling to read `.current`, and change the focus lifecycle effect dependency list to `[open]`.

- [ ] **Step 4: Run focused GREEN checks**

Run:

```powershell
node --test --experimental-strip-types tests/accessible-dialog.test.ts
npx eslint src/components/ui/accessible-dialog.tsx tests/accessible-dialog.test.ts
npx tsc --noEmit
```

Expected: all commands exit 0.

- [ ] **Step 5: Run full verification**

Run:

```powershell
npm test
npm run build
```

Expected: all tests pass and the Next.js production build exits 0.

- [ ] **Step 6: Commit**

```powershell
git add src/components/ui/accessible-dialog.tsx tests/accessible-dialog.test.ts
git commit -m "fix(ui): stabilize dialog focus during form updates"
```
