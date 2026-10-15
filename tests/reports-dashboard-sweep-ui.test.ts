import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-2 (spec 2D §3.2, D7, D9, D19, M21, M22, M29, M30, M31, R5 hand-on): notifications, reports, the dashboard and
// the work center on the shared parts. Panels are ContentPanel, numbers StatStrip, states StatusBadge, names Chip,
// buttons and button-shaped links Button or buttonVariants, text links linkVariants, empty states EmptyNote, and an
// /api download a plain <a>. Each test pins one file and fails before its commit. Sources are read with LF endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const C = "src/components/"

test("notification center actions: the open link and the two commands are outline md, with the shared disabled look (spec 2D M29)", () => {
  const source = read(`${C}notifications/notification-center-actions.tsx`)
  assert.match(source, /className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}/)
  assert.equal(source.match(/<Button\s+variant="outline"\s+size="md"/g)?.length, 2)
  assert.equal(source.match(/disabled=\{isPending\}/g)?.length, 3, "the two buttons and the assignee select")
  assert.doesNotMatch(source, /<button\b|disabled:opacity|\bh-9\b|hover:bg-accent/)
})
