import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-5 (spec 2D §5.4, D14): the code sites that the five new guards of tests/visual-foundation-guards.test.ts
// (N1–N5) would fail, each moved in its own commit before the guard that locks it. Each test pins one file and fails
// before that commit. Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("scanner input: the camera toggle is an outline lg Button, and the controls on the camera image never fade when disabled (spec 2D §5.4 items 1, 3, 4)", () => {
  const source = read("src/components/ui/scanner-text-input.tsx")
  assert.match(source, /import \{ Button \} from "@\/components\/ui\/button"/)
  assert.match(source, /<Button\s+variant="outline"\s+size="lg"\s+disabled=\{disabled\}\s+onClick=\{handleToggleScanner\}\s+className="w-full sm:w-auto"\s+title=\{scannerRunning \|\| scannerLoading \? labels\.stop : labels\.start\}\s*>/)
  assert.match(source, /<span>\{scannerRunning \|\| scannerLoading \? labels\.stop : labels\.start\}<\/span>\s*<\/Button>/)
  // The lit torch is the warning fill with its own foreground token, the look of Button's warning variant.
  assert.match(source, /"border-warning bg-warning text-warning-foreground hover:bg-warning-hover"/)
  assert.doesNotMatch(source, /buttonVariants|from "@\/lib\/utils"|disabled:opacity/)
  // The zoom and torch controls sit on the camera image and stay raw buttons, with a comment (as the audit camera's).
  assert.equal(source.match(/<button\b/g)?.length, 2)
  assert.match(source, /\{\/\* The zoom and torch controls sit on the camera image: raw buttons[\s\S]*?\*\/\}\n\s+\{scanMode === "asset-qr" && scannerRunning && zoomAvailable \? \(/)
})

test("bottom bar: the round scan button's icon takes the primary foreground token, not raw white (spec 2D §5.4 item 1)", () => {
  const source = read("src/components/layout/mobile-field-navigation.tsx")
  assert.match(source, /destination\.emphasized && "h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-md"/)
  assert.doesNotMatch(source, /\btext-white\b/)
})
