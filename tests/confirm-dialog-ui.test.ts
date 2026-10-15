import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { findJsxTags, jsxAttrValue, readSourceFiles } from "./helpers/source-files.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("confirm provider renders an alert dialog and settles by request id", () => {
  const source = read("src/components/ui/confirm-dialog.tsx")
  assert.match(source, /from "@\/components\/ui\/alert-dialog"/)
  assert.match(source, /settleConfirm\(queueRef\.current, id\)/)
  assert.match(source, /<AlertDialogCancel[\s\S]*?event\.preventDefault\(\)[\s\S]*?settle\(current\.id, false\)/)
  assert.match(source, /<AlertDialogAction[\s\S]*?event\.preventDefault\(\)[\s\S]*?settle\(current\.id, true\)/)
  assert.match(source, /variant=\{current\.tone === "destructive" \? "destructive" : "default"\}/)
  assert.match(source, /onOpenAutoFocus=\{\(\) => \{\s*restoreFocusRef\.current = document\.activeElement instanceof HTMLElement/)
  assert.match(source, /onCloseAutoFocus=\{\(event\) => \{[\s\S]*?restoreFocusRef\.current[\s\S]*?event\.preventDefault\(\)/)
  assert.match(source, /throw new Error\("useConfirm must be used inside <ConfirmProvider>"\)/)
})

test("dashboard shell mounts one confirm provider", () => {
  const shell = read("src/components/layout/dashboard-shell.tsx")
  assert.match(shell, /<ConfirmProvider>/)
})

test("deletes report a delete, not a save", () => {
  for (const path of [
    "src/components/master-data/use-delete-action.ts",
    "src/components/assets/asset-attachments.tsx",
    "src/components/assets/asset-purchase-documents.tsx",
    "src/components/disposal/disposal-attachments.tsx",
    "src/components/master-data/asset-model-form.tsx",
    "src/components/maintenance/maintenance-attachments.tsx",
  ]) {
    const source = read(path)
    assert.match(source, /tCommon\("deletedSuccess"\)/, path)
    assert.match(source, /tone: "destructive"/, path)
  }
  assert.match(read("src/components/master-data/master-data-delete-button.tsx"), /useDeleteAction\(endpoint\)/)
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
  assert.equal(th.common.deletedSuccess, "ลบแล้ว")
  assert.equal(en.common.deletedSuccess, "Deleted")
})

// Phase 2C batch 5 (spec 2C §5.9, §5.11 F, K12, K8): a confirm looks like the other dialogs: white, above the iPhone
// home bar on phones and centered from sm, a 16px left-aligned title over the header line, and a grey footer band with
// cancel first and the action last. The size variants and AlertDialogMedia (no caller) are gone.
test("confirm dialogs look like the other dialogs (K12)", () => {
  const source = read("src/components/ui/alert-dialog.tsx")
  assert.match(source, /"fixed left-\[50%\] z-50 flex max-h-\[92dvh\] w-\[calc\(100%-1\.5rem\)\] translate-x-\[-50%\] flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-overlay [^"]*sm:max-w-lg motion-reduce:animate-none!",\n\s+"bottom-\[max\(0\.75rem,env\(safe-area-inset-bottom\)\)\] sm:top-\[50%\] sm:bottom-auto sm:translate-y-\[-50%\]",/)
  assert.match(source, /"flex flex-col gap-2 border-b border-border px-4 py-4 text-left sm:px-5"/)
  assert.match(source, /"flex shrink-0 flex-col gap-2 bg-background px-4 py-3 sm:flex-row sm:justify-end sm:px-5"/)
  assert.match(source, /"text-base font-semibold text-foreground"/)
  assert.match(source, /cn\("text-sm text-muted-foreground", className\)/)
  assert.doesNotMatch(source, /flex-col-reverse|data-\[size=|data-size|AlertDialogMedia|group\/alert-dialog-content|place-items-center|\bp-6\b|size\?: "default" \| "sm"/)
})

// Phase 2C batch 5 (spec 2C §5.9, K8, K12): the confirm provider itself does not change. Cancel comes before the
// action in the DOM (phones stack cancel on top and the action last), its parts take no class or size of their own
// (the AlertDialog look applies), and the action reads the caller's verb, "ยืนยัน" only when a caller gives none.
test("the confirm provider puts cancel first and the caller's verb last, on the plain AlertDialog parts (K8, K12)", () => {
  const source = read("src/components/ui/confirm-dialog.tsx")
  assert.ok(source.indexOf("<AlertDialogCancel") < source.indexOf("<AlertDialogAction"), "cancel first, the action last (K8)")
  assert.match(source, /\{current\.cancelLabel \?\? tCommon\("cancel"\)\}/)
  assert.match(source, /\{current\.confirmLabel \?\? tCommon\("confirm"\)\}/)
  const parts = findJsxTags(source, ["AlertDialog\\w*"])
  assert.equal(parts.length, 8, "AlertDialog, Content, Header, Title, Description, Footer, Cancel, Action")
  assert.deepEqual(
    parts.filter((tag) => jsxAttrValue(tag.text, "className") !== null || jsxAttrValue(tag.text, "size") !== null).map((tag) => tag.name),
    [],
    "the parts carry the look (K12)",
  )
})

// Phase 2C batch 5 (K12, spec 2C §5.9-§5.11 G-H): every confirm() names its action with a verb on its button, never
// the generic "ยืนยัน". The reader takes the argument of each confirm( call in a file that calls useConfirm() and
// checks every { title: … } object in it (both branches of a ternary count).
function confirmOptionObjects(source: string): string[] {
  const balanced = (text: string, from: number, open: string, close: string) => {
    let depth = 0
    for (let index = from; index < text.length; index += 1) {
      if (text[index] === open) depth += 1
      else if (text[index] === close && --depth === 0) return text.slice(from, index + 1)
    }
    return ""
  }
  return [...source.matchAll(/(?<![\w.$])confirm\(/g)].flatMap((call) => {
    const argument = balanced(source, call.index + call[0].length - 1, "(", ")")
    return [...argument.matchAll(/\{\s*title:/g)].map((object) => balanced(argument, object.index, "{", "}"))
  })
}

// Files whose confirm() still has no verb. The commit that names one removes its line (a two-way ratchet); the last one
// makes the test strict.
const CONFIRMS_WITHOUT_A_VERB = new Set<string>([
  "src/components/disposal/disposal-bulk-approval.tsx", // the discard-selection confirm
  "src/components/disposal/disposal-bulk-execution.tsx", // the discard-selection confirm
  "src/components/master-data/supplier-form.tsx", // the unsaved-changes confirm
])

test("every confirm() names its action with a verb (K12, spec 2C §5.11 G)", () => {
  const unnamed = new Set<string>()
  let objects = 0
  for (const file of readSourceFiles("src")) {
    if (file.path === "src/components/ui/confirm-dialog.tsx" || !/\buseConfirm\(\)/.test(file.source)) continue
    for (const object of confirmOptionObjects(file.source)) {
      objects += 1
      if (!/\bconfirmLabel:/.test(object)) unnamed.add(file.path)
    }
  }
  assert.ok(objects >= 14, `the reader found only ${objects} confirm() options`)
  assert.deepEqual([...unnamed].filter((path) => !CONFIRMS_WITHOUT_A_VERB.has(path)), [], "give the confirm a confirmLabel that says its verb")
  assert.deepEqual([...CONFIRMS_WITHOUT_A_VERB].filter((path) => !unnamed.has(path)), [], "it names its action now: remove it from CONFIRMS_WITHOUT_A_VERB")
})

// The verb labels batch 5 adds (spec 2C §5.10) and the expressions that read them, counted per file.
const BATCH_5_VERBS: Array<{ key: string; th: string; en: string; reads: Array<[path: string, expression: string, count: number]> }> = [
  {
    key: "integrationApiPage.confirmScopeExpansionAction",
    th: "เพิ่มสิทธิ์",
    en: "Add permissions",
    reads: [
      ["src/components/admin/IntegrationClientManager.tsx", 'confirm({ title: labels.confirmScopeExpansion, confirmLabel: labels.confirmScopeExpansionAction })', 1],
      ["src/app/[locale]/(dashboard)/admin/integrations/page.tsx", 'confirmScopeExpansionAction: t("confirmScopeExpansionAction"),', 1],
    ],
  },
]

test("the batch 5 verbs say the same thing in both languages and reach their confirm() (spec 2C §5.10, §5.11 H)", () => {
  const messages = { th: JSON.parse(readFileSync("messages/th.json", "utf8")), en: JSON.parse(readFileSync("messages/en.json", "utf8")) }
  const at = (tree: unknown, key: string) => key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], tree)
  for (const verb of BATCH_5_VERBS) {
    assert.equal(at(messages.th, verb.key), verb.th, `th ${verb.key}`)
    assert.equal(at(messages.en, verb.key), verb.en, `en ${verb.key}`)
    for (const [path, expression, count] of verb.reads) assert.equal(read(path).split(expression).length - 1, count, `${path} reads ${expression}`)
  }
})
