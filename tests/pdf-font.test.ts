import assert from "node:assert/strict"
import { readFileSync, statSync } from "node:fs"
import test from "node:test"

import { resolvePdfFont } from "../src/lib/pdf-font.ts"

test("bundled Noto Sans Thai font files are real TTF assets", () => {
  for (const path of ["public/fonts/NotoSansThai-Regular.ttf", "public/fonts/NotoSansThai-Bold.ttf"]) {
    assert.ok(statSync(path).size > 10_000)
    assert.deepEqual([...readFileSync(path).subarray(0, 4)], [0x00, 0x01, 0x00, 0x00])
  }
})

test("prefers bundled Thai fonts copied with standalone public assets", () => {
  const existing = new Set([
    "/app/public/fonts/NotoSansThai-Regular.ttf",
    "/app/public/fonts/NotoSansThai-Bold.ttf",
    "C:\\Windows\\Fonts\\tahoma.ttf",
    "C:\\Windows\\Fonts\\tahomabd.ttf",
  ])

  const font = resolvePdfFont({
    cwd: "/app",
    env: { SystemRoot: "C:\\Windows" },
    exists: (path) => existing.has(path),
  })

  assert.equal(font.family, "AssetPdfThai")
  assert.equal(font.source, "bundled-noto-sans-thai")
  assert.equal(font.regularPath, "/app/public/fonts/NotoSansThai-Regular.ttf")
  assert.equal(font.boldPath, "/app/public/fonts/NotoSansThai-Bold.ttf")
})

test("uses Ubuntu Noto Sans Thai when bundled fonts are not present", () => {
  const existing = new Set([
    "/usr/share/fonts/truetype/noto/NotoSansThai-Regular.ttf",
    "/usr/share/fonts/truetype/noto/NotoSansThai-Bold.ttf",
  ])

  const font = resolvePdfFont({
    cwd: "/app",
    env: {},
    exists: (path) => existing.has(path),
  })

  assert.equal(font.family, "AssetPdfThai")
  assert.equal(font.source, "ubuntu-noto-sans-thai")
  assert.equal(font.regularPath, "/usr/share/fonts/truetype/noto/NotoSansThai-Regular.ttf")
  assert.equal(font.boldPath, "/usr/share/fonts/truetype/noto/NotoSansThai-Bold.ttf")
})

test("falls back to Helvetica only when no Thai-capable font is available", () => {
  const font = resolvePdfFont({
    cwd: "/app",
    env: {},
    exists: () => false,
  })

  assert.equal(font.family, "Helvetica")
  assert.equal(font.source, "fallback-helvetica")
  assert.equal(font.regularPath, null)
  assert.equal(font.boldPath, null)
})
