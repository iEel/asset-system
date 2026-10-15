import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-1 (spec 2D §4.1, D12): code with no caller is deleted, after its last callers move to the shared parts.
// Each test pins one deletion. Grep src and tests before you delete anything (spec 2D §4.1). Sources are read with LF.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const D = "src/app/[locale]/(dashboard)/"
const C = "src/components/"

test("the error page retries with Button, and ActionButton is gone (spec 2D M3)", () => {
  const source = read(`${D}error.tsx`)
  assert.match(source, /import \{ Button \} from "@\/components\/ui\/button"/)
  assert.match(source, /<Button onClick=\{unstable_retry\}>\n\s+<RefreshCw aria-hidden="true" \/>\n\s+\{t\("tryAgain"\)\}\n\s+<\/Button>/)
  assert.equal(existsSync(`${C}ui/action-button.tsx`), false)
})
