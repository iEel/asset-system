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
  assert.doesNotMatch(source, /<input\b/, "the include-closed checkbox is a ChoiceCard since plan 2D-4")
  const inputs = findJsxTags(source, ["Input"])
  assert.equal(inputs.length, 5)
  assert.equal(inputs.filter((tag) => hasJsxAttr(tag.text, "required")).length, 5, "every round field keeps its required attribute (validate() restates it, v-track U1)")
  // Each Field names its control and shows its error (v-track plan 2 U1).
  assert.equal(source.match(/<Field label=\{t\("(?:name|startDate|endDate)"\)\} id="audit-round-[\w-]+" required error=\{fieldErrors\.message\("\w+"\)\}>/g)?.length, 3)
  assert.match(source, /<Field\n\s+label=\{t\("auditYear"\)\}\n\s+id="audit-round-year"\n\s+required\n[^\n]*\n\s+>/)
  assert.match(source, /<Field\n\s+label=\{t\("sampleRate"\)\}\n\s+id="audit-round-sample-rate"\n\s+required\n\s+hint=\{t\("sampleRateHelp"\)\}\n[^\n]*\n\s+>/)
  assert.match(source, /<Field label=\{label\} id=\{id\} required=\{required\} error=\{error\}>\n\s+<NativeSelect value=\{value\} required=\{required\} onChange=\{\(event\) => onChange\(event\.target\.value\)\}>/)
  assert.match(source, /<Select label=\{t\("status"\)\} id="audit-round-status" value=\{values\.status\} required error=\{fieldErrors\.message\("status"\)\} onChange=/)
  assert.match(source, /<ChoiceCard\s+type="checkbox"\s+className="md:col-span-2"/)
  assert.match(source, /<Button variant="outline" busy=\{previewing\} onClick=\{handlePreview\}>\n\s+<ClipboardList aria-hidden="true" \/>\n\s+\{t\("preview"\)\}/)
  assert.match(source, /<Button type="submit" busy=\{saving\} disabled=\{previewing\}>\n\s+<Save aria-hidden="true" \/>\n\s+\{tCommon\("save"\)\}/)
})
