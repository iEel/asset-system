import assert from "node:assert/strict"
import test from "node:test"

import {
  attachmentThumbnailSize,
  buildThumbnailETag,
  isThumbnailable,
  matchesIfNoneMatch,
  thumbnailCacheHeaders,
  thumbnailNotModifiedHeaders,
  thumbnailUrl,
} from "../src/lib/attachment-thumbnail.ts"

test("only raster images a browser can show are thumbnailed", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "IMAGE/PNG"]) {
    assert.equal(isThumbnailable(type), true, type)
  }
  for (const type of ["application/pdf", "image/svg+xml", "image/heic", "", null, undefined]) {
    assert.equal(isThumbnailable(type), false, String(type))
  }
})

test("thumbnail ETag and cache headers are stable per attachment", () => {
  assert.equal(attachmentThumbnailSize, 96)
  assert.equal(buildThumbnailETag("att-1"), '"att-1-96"')
  assert.deepEqual(thumbnailCacheHeaders('"att-1-96"'), {
    "Content-Type": "image/webp",
    "Cache-Control": "private, max-age=604800, immutable",
    ETag: '"att-1-96"',
    "X-Content-Type-Options": "nosniff",
  })
  assert.deepEqual(thumbnailNotModifiedHeaders('"att-1-96"'), {
    "Cache-Control": "private, max-age=604800, immutable",
    ETag: '"att-1-96"',
  })
})

test("If-None-Match accepts weak tags, lists and a star", () => {
  const etag = '"att-1-96"'
  assert.equal(matchesIfNoneMatch(null, etag), false)
  assert.equal(matchesIfNoneMatch("", etag), false)
  assert.equal(matchesIfNoneMatch('"att-1-96"', etag), true)
  assert.equal(matchesIfNoneMatch('W/"att-1-96"', etag), true)
  assert.equal(matchesIfNoneMatch('"other", "att-1-96"', etag), true)
  assert.equal(matchesIfNoneMatch("*", etag), true)
  assert.equal(matchesIfNoneMatch('"att-2-96"', etag), false)
  assert.equal(matchesIfNoneMatch("att-1-96", etag), false)
})

test("thumbnail URLs encode the attachment id", () => {
  assert.equal(thumbnailUrl("att-1"), "/api/attachments/att-1/thumbnail")
  assert.equal(thumbnailUrl("a b"), "/api/attachments/a%20b/thumbnail")
})
