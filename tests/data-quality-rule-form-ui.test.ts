import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Phase 2C batch 4 (spec 2C §8.9, §4.8 row 1 K20, §4.12, §6.3 #5): the data-quality rule cards. Each severity select has
// a visible label and points at its rule's name, so a screen reader knows which rule it sets. Both files are CRLF in the
// working tree, so they are read with \r stripped before the multi-line regexes.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("the data-quality rule form names each severity select after its rule and uses the shared field, checkbox and busy save (2C batch 4)", () => {
  const source = read("src/components/admin/data-quality-rule-form.tsx")
  assert.match(source, /\n    danger: string\n    severity: string\n/)
  assert.match(source, /<span id=\{`data-quality-rule-\$\{rule\.key\}`\} className="block font-medium text-foreground">\{labels\.ruleLabels\[rule\.key\]\}<\/span>/)
  assert.match(source, /<Field label=\{labels\.severity\}>\n\s+<NativeSelect\n\s+value=\{rule\.severity\}\n[^\n]*\n\s+aria-describedby=\{`data-quality-rule-\$\{rule\.key\}`\}\n\s+>/)
  assert.match(source, /<label className="flex min-h-11 items-start gap-3 py-2">\n\s+<input\n\s+type="checkbox"\n(?:[^\n]*\n){2}\s+className=\{cn\(checkboxVariants\(\), "mt-0\.5"\)\}/)
  assert.match(source, /<Button busy=\{saving\} onClick=\{save\} className="w-fit">\n\s+<Save aria-hidden="true" \/>\n\s+\{labels\.save\}\n\s+<\/Button>/)
  assert.doesNotMatch(source, /<select|<button|disabled=|rounded border-border|focus:border-ring/)

  const page = read("src/app/[locale]/(dashboard)/admin/data-quality/page.tsx")
  assert.match(page, /<DataQualityRuleForm\n(?:[^\n]*\n)*?\s+danger: t\("danger"\),\n\s+severity: t\("assetStateReviews\.severity"\),\n\s+ruleLabels:/, "the page passes the existing severity label")
})
