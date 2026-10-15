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

test("the readiness and import-export links are outline md links, not the old safe-link helpers (spec 2D M5)", () => {
  const readiness = read(`${D}admin/readiness/page.tsx`)
  assert.match(readiness, /<Link\n\s+href=\{`\/\$\{locale\}\$\{check\.href\}`\}\n\s+className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}\n\s+aria-label=\{`\$\{labels\.action\}: \$\{labels\.title\}`\}\n\s+>\n\s+\{labels\.action\}\n\s+<ArrowRight aria-hidden="true" \/>\n\s+<\/Link>/)
  const importExport = read(`${D}asset-management/import-export/page.tsx`)
  assert.match(importExport, /<div>\n\s+<Link href=\{`\/\$\{locale\}\/assets`\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>\n\s+\{tCommon\("back"\)\}\n\s+<\/Link>\n\s+<\/div>/)
  for (const source of [readiness, importExport]) {
    assert.match(source, /import \{ buttonVariants \} from "@\/components\/ui\/button-variants"/)
    assert.doesNotMatch(source, /getSafeActionLinkClasses|getResponsiveActionRowClasses|@\/lib\/design-system/)
  }
})
