import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { findJsxTags, hasJsxAttr } from "./helpers/source-files.ts"

// Phase 2C batch 3 (spec 2C §8.9 "ชุด 3"): the new audit round form on the shared fields and buttons. The form is CRLF
// in the working tree, so the source is read with \r stripped before the multi-line regexes.
const source = readFileSync("src/components/audit/audit-round-form.tsx", "utf8").replace(/\r\n/g, "\n")

test("the audit round form uses the shared fields, the sample-rate hint and busy preview and save buttons (2C batch 3)", () => {
  assert.match(source, /import \{ Field \} from "@\/components\/ui\/field"/)
  assert.doesNotMatch(source, /function Field\(|<select\b|<textarea\b|<button\b|Loader2|ml-1 text-danger|mt-1\.5 text-xs text-muted-foreground/)
  assert.equal(source.match(/<input\b/g)?.length, 1, "only the include-closed checkbox stays a native input")
  const inputs = findJsxTags(source, ["Input"])
  assert.equal(inputs.length, 5)
  assert.equal(inputs.filter((tag) => hasJsxAttr(tag.text, "required")).length, 5, "every round field keeps the browser's own required check")
  assert.equal(source.match(/<Field label=\{t\("(?:name|auditYear|startDate|endDate)"\)\} required>/g)?.length, 4)
  assert.match(source, /<Field label=\{t\("sampleRate"\)\} required hint=\{t\("sampleRateHelp"\)\}>/)
  assert.match(source, /<Field label=\{label\} required=\{required\}>\n\s+<NativeSelect value=\{value\} required=\{required\} onChange=\{\(event\) => onChange\(event\.target\.value\)\}>/)
  assert.match(source, /<Select label=\{t\("status"\)\} value=\{values\.status\} required onChange=/)
  assert.match(source, /className=\{cn\(checkboxVariants\(\), "mt-0\.5"\)\}/)
  assert.match(source, /<Button variant="outline" busy=\{previewing\} onClick=\{handlePreview\}>\n\s+<ClipboardList aria-hidden="true" \/>\n\s+\{t\("preview"\)\}/)
  assert.match(source, /<Button type="submit" busy=\{saving\} disabled=\{previewing\}>\n\s+<Save aria-hidden="true" \/>\n\s+\{tCommon\("save"\)\}/)
})
