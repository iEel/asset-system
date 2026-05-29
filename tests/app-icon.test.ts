import assert from "node:assert/strict"
import { readFileSync, statSync } from "node:fs"
import test from "node:test"

test("browser app icons are project-branded raster assets", () => {
  const favicon = readFileSync("src/app/favicon.ico")
  assert.ok(statSync("src/app/favicon.ico").size > 1_000)
  assert.deepEqual([...favicon.subarray(0, 4)], [0x00, 0x00, 0x01, 0x00])
  assert.ok(favicon.readUInt16LE(4) >= 3)

  for (const path of ["src/app/icon.png", "src/app/apple-icon.png"]) {
    const image = readFileSync(path)
    assert.deepEqual([...image.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    assert.ok(statSync(path).size > 10_000)
  }
})

test("PWA manifest and install icons are available", async () => {
  const { default: manifest } = await import("../src/app/manifest.ts")
  const result = manifest()

  assert.equal(result.name, "Asset Management System")
  assert.equal(result.short_name, "Asset System")
  assert.equal(result.start_url, "/th")
  assert.equal(result.display, "standalone")
  assert.equal(result.theme_color, "#1E3A5F")
  assert.deepEqual(
    result.icons?.map((icon) => [icon.src, icon.sizes, icon.purpose]),
    [
      ["/icons/icon-192.png", "192x192", "any"],
      ["/icons/icon-512.png", "512x512", "any"],
      ["/icons/maskable-192.png", "192x192", "maskable"],
      ["/icons/maskable-512.png", "512x512", "maskable"],
    ],
  )

  for (const path of [
    "public/icons/asset-management-icon-source.png",
    "public/icons/icon-192.png",
    "public/icons/icon-512.png",
    "public/icons/maskable-192.png",
    "public/icons/maskable-512.png",
  ]) {
    const image = readFileSync(path)
    assert.deepEqual([...image.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    assert.ok(statSync(path).size > 10_000)
  }
})

test("PWA manifest exposes mobile shortcuts for common field work", async () => {
  const { default: manifest } = await import("../src/app/manifest.ts")
  const result = manifest()

  assert.deepEqual(
    result.shortcuts?.map((shortcut) => [shortcut.name, shortcut.url]),
    [
      ["สแกน / ค้นหาทรัพย์สิน", "/th/asset-management/scan"],
      ["เพิ่มทรัพย์สิน", "/th/assets/new"],
      ["ศูนย์งานค้าง", "/th/work-center"],
      ["สแกนตรวจนับ", "/th/audit/rounds"],
    ],
  )
})
