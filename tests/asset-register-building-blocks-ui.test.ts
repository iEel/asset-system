import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))

test("pagination is a server-safe nav with 44px phone targets and real disabled states", () => {
  const source = read("src/components/ui/pagination.tsx")

  assert.doesNotMatch(source, /"use client"/)
  assert.match(source, /<nav aria-label=\{labels\.navigation\}/)
  assert.match(source, /aria-disabled="true"/)
  assert.match(source, /min-h-11/)
  assert.match(source, /<Link/)
  assert.doesNotMatch(source, /opacity-/)
})

test("media query hook is hydration safe and cleans up its listener", () => {
  const source = read("src/components/ui/use-media-query.ts")

  assert.match(source, /useSyncExternalStore\(/)
  assert.match(source, /\(\) => false/)
  assert.match(source, /addEventListener\("change", onChange\)/)
  assert.match(source, /removeEventListener\("change", onChange\)/)
})

test("asset thumbnails load the small server image lazily and fall back to an icon", () => {
  const source = read("src/components/assets/asset-thumbnail.tsx")

  assert.match(source, /src=\{thumbnailUrl\(photo\.id\)\}/)
  assert.match(source, /loading="lazy"/)
  assert.match(source, /decoding="async"/)
  assert.match(source, /onError=\{\(\) => setFailed\(true\)\}/)
  assert.match(source, /!photo \|\| !isThumbnailable\(photo\.fileType\) \|\| failed/)
  assert.match(source, /data-no-row-click/)
  assert.match(source, /<AttachmentPreviewDialog/)
  assert.match(source, /src=\{`\/api\/attachments\/\$\{photo\.id\}\?inline=1`\}/)
  assert.doesNotMatch(source, /unoptimized|next\/image/)
})

test("pagination and photo copy exists in Thai and English", () => {
  assert.equal(messages("th").common.pageOf, "หน้า {page} จาก {total}")
  assert.equal(messages("en").common.pageOf, "Page {page} of {total}")
  for (const locale of ["th", "en"] as const) {
    assert.equal(typeof messages(locale).common.pagination, "string", locale)
    assert.equal(typeof messages(locale).asset.viewPhoto, "string", locale)
  }
})
