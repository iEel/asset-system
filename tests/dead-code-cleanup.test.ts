import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"
import * as assetDetailFormat from "../src/lib/asset-detail-format.ts"

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

test("the delete buttons with no caller are gone; RowActions keeps useDeleteAction (spec 2D M6)", () => {
  for (const path of [`${C}master-data/master-data-delete-button.tsx`, `${C}master-data/asset-delete-button.tsx`]) assert.equal(existsSync(path), false, path)
  assert.match(read(`${C}ui/row-actions.tsx`), /useDeleteAction/)
})

test("Badge and badgeVariants are gone; the status badge keeps its variants (spec 2D §4.1)", () => {
  assert.equal(existsSync(`${C}ui/badge.tsx`), false)
  const variants = read(`${C}ui/badge-variants.ts`)
  assert.doesNotMatch(variants, /\bbadgeVariants\b/)
  assert.match(variants, /^import \{ cva \} from "class-variance-authority"\n\n\/\/ Two tiers:/)
  assert.match(variants, /export const statusBadgeVariants = cva\(/)
  assert.match(variants, /export const statusMarkerVariants = cva\(/)
})

test("the old panel helpers of the asset detail page are gone (spec 2D M9)", () => {
  for (const name of ["getHealthPanelClass", "getSummaryToneClass"]) assert.equal(name in assetDetailFormat, false, name)
  assert.equal(typeof assetDetailFormat.getHealthBadgeClass, "function", "the badge helper the page uses stays")
})

test("the busy labels nobody reads are gone from the props and the pages (spec 2D M8)", () => {
  const gone: Array<[string, RegExp]> = [
    [`${C}assets/asset-component-manager.tsx`, /^\s+(?:installing|removing): string$/m],
    [`${C}assets/asset-status-correction-button.tsx`, /^\s+submitting: string$/m],
    [`${C}assets/asset-import-preview-panel.tsx`, /^\s+importing: string$/m],
    [`${C}assets/asset-label-print.tsx`, /^\s+recordingPrint: string$/m],
    [`${D}assets/[id]/components/page.tsx`, /componentInstalling|componentRemoving/],
    [`${D}assets/[id]/page.tsx`, /statusCorrectionSubmitting/],
    [`${D}asset-management/import-export/page.tsx`, /importing: t\("importing"\)/],
    [`${D}assets/page.tsx`, /importing: t\("importing"\)/],
    ["src/app/[locale]/(print)/assets/labels/page.tsx", /recordingLabelPrint/],
    ["src/app/[locale]/(print)/assets/[id]/label/page.tsx", /recordingLabelPrint/],
    [`${D}admin/data-quality/page.tsx`, /saving: tCommon\("saving"\)/],
  ]
  for (const [path, pattern] of gone) assert.doesNotMatch(read(path), pattern, path)
  // The label print state stays: it drives busy={recordingPrint} on the print button.
  assert.match(read(`${C}assets/asset-label-print.tsx`), /const \[recordingPrint, setRecordingPrint\] = useState\(false\)/)
})
