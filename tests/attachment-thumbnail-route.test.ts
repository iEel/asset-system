import assert from "node:assert/strict"
import { existsSync, mkdtempSync, writeFileSync } from "node:fs"
import * as nodeModule from "node:module"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"
import sharp from "sharp"

type ThumbnailAttachment = {
  id: string
  module: string
  assetId: string | null
  referenceId: string
  filePath: string
  fileType: string
}

const state: { allowed: boolean; ownAsset: boolean; attachment: ThumbnailAttachment | null } = {
  allowed: true,
  ownAsset: false,
  attachment: null,
}
Object.assign(globalThis, { __thumbnailRouteState: state })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    export async function requireAuth() { return { id: "user-1", roles: [], permissions: [], employeeId: "emp-1" } }
    export function hasPermission() { return globalThis.__thumbnailRouteState.allowed }
  `],
  ["@/lib/uploads", `export function assertSafeUploadPath(filePath) { return filePath }`],
  ["@/lib/db", `
    const state = () => globalThis.__thumbnailRouteState
    export const prisma = {
      attachment: { findFirst: async () => state().attachment },
      asset: { findFirst: async () => (state().ownAsset ? { id: "asset-1" } : null) },
    }
  `],
])

const registerHooks = (nodeModule as unknown as {
  registerHooks(options: {
    resolve(specifier: string, context: unknown, nextResolve: (specifier: string, context: unknown) => unknown): unknown
  }): void
}).registerHooks

registerHooks({
  resolve(specifier, context, nextResolve) {
    const source = mockedModuleSources.get(specifier)
    if (source !== undefined) {
      return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`, shortCircuit: true }
    }
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})

type ThumbnailRoute = { GET(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> }
const route = await import(pathToFileURL("src/app/api/attachments/[id]/thumbnail/route.ts").href) as ThumbnailRoute

const dir = mkdtempSync(join(tmpdir(), "asset-thumbnail-"))
const pngPath = join(dir, "photo.png")
writeFileSync(pngPath, await sharp({ create: { width: 1600, height: 1200, channels: 3, background: "#2563EB" } }).png().toBuffer())
const brokenPath = join(dir, "broken.png")
writeFileSync(brokenPath, "this is not an image")

function attachment(overrides: Partial<ThumbnailAttachment> = {}): ThumbnailAttachment {
  return { id: "att-1", module: "asset_model", assetId: null, referenceId: "model-1", filePath: pngPath, fileType: "image/png", ...overrides }
}

function get(headers: Record<string, string> = {}) {
  return route.GET(
    new Request("http://localhost/api/attachments/att-1/thumbnail", { headers }),
    { params: Promise.resolve({ id: "att-1" }) },
  )
}

beforeEach(() => {
  state.allowed = true
  state.ownAsset = false
  state.attachment = attachment()
})

test("an unknown attachment returns 404", async () => {
  state.attachment = null
  assert.equal((await get()).status, 404)
})

test("a user without permission gets 403 even when the ETag matches", async () => {
  state.allowed = false
  const response = await get({ "If-None-Match": '"att-1-96"' })
  assert.equal(response.status, 403)
})

test("the employee holding an asset may see its photo thumbnail", async () => {
  state.allowed = false
  state.ownAsset = true
  state.attachment = attachment({ module: "asset", assetId: "asset-1", referenceId: "asset-1" })
  assert.equal((await get()).status, 200)
})

test("a PDF returns 415", async () => {
  state.attachment = attachment({ fileType: "application/pdf" })
  assert.equal((await get()).status, 415)
})

test("a file missing on disk returns 404", async () => {
  state.attachment = attachment({ filePath: join(dir, "gone.png") })
  assert.equal((await get()).status, 404)
})

test("an unreadable image returns 422", async () => {
  state.attachment = attachment({ filePath: brokenPath })
  assert.equal((await get()).status, 422)
})

test("a large PNG becomes a small cached WebP that fits 96px", async () => {
  const response = await get()

  assert.equal(response.status, 200)
  assert.equal(response.headers.get("content-type"), "image/webp")
  assert.equal(response.headers.get("cache-control"), "private, max-age=604800, immutable")
  assert.equal(response.headers.get("etag"), '"att-1-96"')
  assert.equal(response.headers.get("x-content-type-options"), "nosniff")
  const body = Buffer.from(await response.arrayBuffer())
  assert.ok(body.length < 10 * 1024, `thumbnail is ${body.length} bytes`)
  const metadata = await sharp(body).metadata()
  assert.equal(metadata.format, "webp")
  assert.equal(metadata.width, 96)
  assert.equal(metadata.height, 72)
})

test("a matching ETag returns 304 without reading the file", async () => {
  state.attachment = attachment({ filePath: join(dir, "gone.png") })
  const response = await get({ "If-None-Match": 'W/"att-1-96"' })

  assert.equal(response.status, 304)
  assert.equal(response.headers.get("etag"), '"att-1-96"')
})
