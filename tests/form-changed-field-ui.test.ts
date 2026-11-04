import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

// The shared changed-field part (group 5 plan 4 G5P4-R8, spec §10, call 22): group 4's AssetFormChangedField moved to
// src/components/ui/form-changed-field.tsx so the PM form reads it too. Its words are common.*; the asset form's
// "ปรับตามผู้ถือครอง" comes in as change.automaticLabel.
const read = (file: string) => readFileSync(file, "utf8").replace(/\r\n/g, "\n")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))
const PART = "src/components/ui/form-changed-field.tsx"

test("the words moved to common with the asset values; the asset keys no reader keeps are gone", () => {
  const th = messages("th")
  const en = messages("en")
  assert.equal(th.common.fieldChanged, "แก้แล้ว")
  assert.equal(th.common.fieldWas, "เดิม: {value}")
  assert.equal(th.common.restoreField, "คืนค่าเดิม")
  assert.equal(en.common.fieldChanged, "Changed")
  assert.equal(en.common.fieldWas, "Was: {value}")
  assert.equal(en.common.restoreField, "Restore")
  for (const key of ["fieldChanged", "fieldWas", "restoreField"]) {
    assert.equal(th.asset[key], undefined, `th asset.${key}`)
    assert.equal(en.asset[key], undefined, `en asset.${key}`)
  }
  // The change list and the asset form still say ปรับตามผู้ถือครอง.
  assert.equal(th.asset.followsHolderFix, "ปรับตามผู้ถือครอง")
})

test("the part: one wrapper in both states, its frame, แก้แล้ว, เดิม: <value>, then the automatic label or คืนค่าเดิม", () => {
  const source = read(PART)
  assert.match(source, /^"use client"\n/)
  assert.match(source, /export type FormFieldChange = \{ was: string; automaticLabel\?: string; onRestore\?: \(\) => void \}/)
  assert.match(source, /export function FormChangedField\(\{ change, children \}: \{ change: FormFieldChange \| null; children: ReactNode \}\)/)
  assert.match(source, /const t = useTranslations\("common"\)/)
  // One wrapper element in both states: a field that becomes changed keeps its DOM nodes, so the input being typed in
  // keeps focus; only the frame's classes and the line under the field come and go. The hook stays the asset form's.
  assert.doesNotMatch(source, /<>\{children\}<\/>/)
  assert.equal([...source.matchAll(/<div\n\s+data-slot="asset-changed-field"/g)].length, 1)
  assert.equal([...source.matchAll(/\breturn \(/g)].length, 1, "one return: the same element whether changed or not")
  assert.match(source, /data-changed=\{change \? "" : undefined\}/)
  assert.match(source, /className=\{cn\("grid min-w-0 content-start gap-2", change && "rounded-md border border-primary-border p-3"\)\}/)
  assert.match(source, /\{children\}\n\s+\{change \? \(/)
  assert.match(source, /<span className="font-medium text-primary">\{t\("fieldChanged"\)\}<\/span>/)
  assert.match(source, /\{t\("fieldWas", \{ value: change\.was \}\)\}/)
  assert.match(source, /change\.automaticLabel \? \(\n\s+<span>\{change\.automaticLabel\}<\/span>\n\s+\) : change\.onRestore \? \(\n\s+<Button variant="ghost" size="sm" onClick=\{change\.onRestore\}>\n\s+\{t\("restoreField"\)\}/)
  assert.doesNotMatch(source, /<button\b/)
})

test("the asset form reads the shared part; the old asset part is gone", () => {
  assert.equal(existsSync("src/components/assets/asset-form-changed-field.tsx"), false)
  for (const file of ["asset-form", "asset-form-ownership", "asset-form-purchase", "asset-form-other"]) {
    const source = read(`src/components/assets/${file}.tsx`)
    assert.match(source, /import \{ FormChangedField, type FormFieldChange \} from "@\/components\/ui\/form-changed-field"/, file)
    assert.doesNotMatch(source, /AssetFormChangedField|AssetFieldChange/, file)
  }
  // The automatic แผนก says ปรับตามผู้ถือครอง and has no คืนค่าเดิม, as before.
  const form = read("src/components/assets/asset-form.tsx")
  assert.match(form, /function changeOf\(field: AssetDiffField\): FormFieldChange \| null \{/)
  assert.match(form, /automaticLabel: change\.automatic \? t\("followsHolderFix"\) : undefined,/)
  assert.match(form, /const restorable = !change\.automatic && !\(field === "departmentId" && departmentLock\.locked\)/)
})
