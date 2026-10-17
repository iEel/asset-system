import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync("src/components/master-data/supplier-form.tsx", "utf8")

test("supplier form exposes mobile-friendly field metadata", () => {
  assert.match(source, /type="tel"/)
  assert.match(source, /inputMode="tel"/)
  assert.match(source, /autoComplete="tel"/)
  assert.match(source, /autoComplete="email"/)
  assert.match(source, /autoComplete="street-address"/)
  assert.match(source, /min-h-11/)
})

test("supplier form presents associated inline errors", () => {
  // The shared hook reads the server's fieldErrors and shows the shared messages (v-track plan 1 M4).
  assert.match(source, /const fieldErrors = useFieldErrors<SupplierField>\(\)/)
  // The shared Field ties each error to its control: aria-invalid and aria-describedby (FieldError, no alert role,
  // pinned in field-primitives.test.ts). Field id="supplier-<field>" keeps the old error ids: Field names the error `${id}-error`.
  assert.match(source, /import \{ Field \} from "@\/components\/ui\/field"/)
  for (const id of ["code", "name", "contact", "phone", "email", "address"]) {
    assert.match(source, new RegExp(`<Field label=\\{t\\("\\w+"\\)\\} id="supplier-${id}"`), `supplier-${id}`)
  }
  assert.equal(source.match(/error=\{fieldErrors\.message\("\w+"\)\}/g)?.length, 6)
  assert.doesNotMatch(source, /errorId=|function Field\(/)
  assert.doesNotMatch(source, /aria-invalid=|aria-describedby=/, "Field sets both; a hand-set pair would name the error twice")
  assert.match(source, /fieldErrors/)
})

test("supplier form warns before abandoning unsaved changes", () => {
  assert.match(source, /addEventListener\("beforeunload"/)
  assert.match(source, /removeEventListener\("beforeunload"/)
  assert.match(source, /confirm\(\{ title: t\("unsavedChangesConfirm"\)/)
  assert.match(source, /confirmNavigation/)
})

test("supplier form localization keys stay aligned", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
  const keys = ["unsavedChangesConfirm"]

  for (const key of keys) {
    assert.equal(typeof th.supplier[key], "string", `missing Thai supplier.${key}`)
    assert.equal(typeof en.supplier[key], "string", `missing English supplier.${key}`)
  }
})

test("supplier form uses the shared fields and a busy save button (2C batch 2)", () => {
  assert.doesNotMatch(source, /<textarea|<button|Loader2|controlClassName|ml-1 text-danger/)
  assert.equal(source.match(/<input\b/g)?.length, 1, "only the active checkbox stays a plain input")
  assert.match(source, /className=\{checkboxVariants\(\)\}/)
  assert.equal(source.match(/<Field label=/g)?.length, 6)
  assert.match(source, /<Link href=\{backHref\} onClick=\{confirmNavigation\} className=\{buttonVariants\(\{ variant: "outline" \}\)\}>/)
  assert.match(source, /<Button type="submit" busy=\{saving\}>/)
})
