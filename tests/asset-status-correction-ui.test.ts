import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

// Phase 2C batch 4 (spec 2C §8.9 row asset-status-correction-button.tsx, §6.3 #73-#74, §6.4.1, §6.5.2, §4.3 F1-F4):
// the trigger is an outline Button with the warning icon (ย17), the reason is a shared field, and the submit button
// shows busy instead of turning disabled, so focus stays on it while the correction saves. Its label stays (K13).
test("the status correction uses Button, a shared reason field and a busy submit that keeps its label (2C batch 4)", () => {
  const source = read("src/components/assets/asset-status-correction-button.tsx")
  // Plan 2D-3 (M27) added aria-expanded and aria-controls to the trigger.
  assert.match(source, /<Button\n\s+variant="outline"\n\s+aria-expanded=\{open\}\n\s+aria-controls=\{open \? panelId : undefined\}\n\s+onClick=\{\(\) => setOpen\(\(value\) => !value\)\}\n\s+>\n\s+<RotateCcw className="text-warning" aria-hidden="true" \/>/)
  // v-track plan 2 A5: the reason shows the star and its error; its rule is checked on submit, not by a disabled button.
  assert.match(source, /<Field\n\s+label=\{labels\.reason\}\n\s+required\n\s+className="mt-3"\n[^\n]*\n\s+>\n\s+<Textarea\n\s+id="asset-status-correction-reason"/)
  assert.match(source, /<Button\n\s+variant="outline"\n\s+onClick=\{\(\) => \{\n\s+setOpen\(false\)\n\s+setError\(null\)/)
  assert.match(source, /<Button type="submit" busy=\{isSubmitting\}>\n\s+\{labels\.submit\}\n\s+<\/Button>/)
  assert.doesNotMatch(source, /<button\b|<textarea|<label\b|labels\.submitting|disabled:opacity|bg-warning-soft px-3/)
  // A refusal that names no field keeps this line under the form (spec §4.1.3); the reason's own error sits under its field
  // (v-track plan 2 A5).
  assert.match(source, /\{error \? <p className="mt-2 text-sm text-danger"><ApiErrorText error=\{error\} \/><\/p> : null\}/)
})
