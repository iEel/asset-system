import assert from "node:assert/strict"
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import * as nodeModule from "node:module"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

type OriginalAttachment = {
  id: string
  module: string
  assetId: string | null
  referenceId: string
  filePath: string
  fileType: string
  fileSize: number
  originalName: string
}

const state: { allowed: boolean; attachment: OriginalAttachment | null } = { allowed: true, attachment: null }
Object.assign(globalThis, { __originalRouteState: state })

// The route's own modules are mocked as tests/attachment-thumbnail-route.test.ts does; a path under /outside/ stands
// for a file in another server's upload folder (the dev database is a copy of Production).
const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    export async function requireAuth() { return { id: "user-1", roles: [], permissions: [], employeeId: "emp-1" } }
    export function hasPermission() { return globalThis.__originalRouteState.allowed }
  `],
  ["@/lib/uploads", `
    export function assertSafeUploadPath(filePath) {
      if (filePath.startsWith("/outside/")) throw Object.assign(new Error("outside"), { outside: true })
      return filePath
    }
    export function isOutsideUploadRootError(error) { return Boolean(error && error.outside) }
    export function isMissingFileError(error) { return Boolean(error && error.code === "ENOENT") }
  `],
  ["@/lib/db", `
    const state = () => globalThis.__originalRouteState
    export const prisma = {
      attachment: { findFirst: async () => state().attachment },
      asset: { findFirst: async () => null },
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

type OriginalRoute = { GET(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> }
const route = await import(pathToFileURL("src/app/api/attachments/[id]/route.ts").href) as OriginalRoute

const dir = mkdtempSync(join(tmpdir(), "asset-original-"))
const pngPath = join(dir, "photo.png")
writeFileSync(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))

function attachment(overrides: Partial<OriginalAttachment> = {}): OriginalAttachment {
  return { id: "att-1", module: "asset", assetId: "asset-1", referenceId: "asset-1", filePath: pngPath, fileType: "image/png", fileSize: 8, originalName: "รูป 1.png", ...overrides }
}

// The route reads ?inline=1 from nextUrl, which a plain Request does not have.
function get(query = "") {
  const url = `http://localhost/api/attachments/att-1${query}`
  return route.GET(Object.assign(new Request(url), { nextUrl: new URL(url) }), { params: Promise.resolve({ id: "att-1" }) })
}

beforeEach(() => {
  state.allowed = true
  state.attachment = attachment()
})

test("an unknown attachment is not found", async () => {
  state.attachment = null
  const response = await get()
  assert.equal(response.status, 404)
  assert.deepEqual(await response.json(), { error: "Attachment not found" })
})

test("a file missing on disk is not found, not a 500 (spec §7.5)", async () => {
  state.attachment = attachment({ filePath: join(dir, "gone.png") })
  const response = await get("?inline=1")
  assert.equal(response.status, 404)
  assert.deepEqual(await response.json(), { error: "Attachment file not found" })
})

test("a file outside this server's upload folder is not found, as the thumbnail route answers (FX8)", async () => {
  state.attachment = attachment({ filePath: "/outside/uploads/photo.png" })
  const response = await get("?inline=1")
  assert.equal(response.status, 404)
  assert.deepEqual(await response.json(), { error: "Attachment file not found" })
})

test("a person without the module's permission is refused before the file is read", async () => {
  state.allowed = false
  state.attachment = attachment({ filePath: join(dir, "gone.png") })
  assert.equal((await get()).status, 403)
})

test("a file that is there is served inline on request and as a download otherwise, never cached or sniffed", async () => {
  const inline = await get("?inline=1")
  assert.equal(inline.status, 200)
  assert.equal(inline.headers.get("content-type"), "image/png")
  assert.equal(inline.headers.get("content-disposition"), `inline; filename*=UTF-8''${encodeURIComponent("รูป 1.png")}`)
  assert.equal(inline.headers.get("x-content-type-options"), "nosniff")
  assert.equal(inline.headers.get("cache-control"), "private, no-store")
  assert.equal(Buffer.from(await inline.arrayBuffer()).length, 8)
  assert.match((await get()).headers.get("content-disposition") ?? "", /^attachment; /)
})

test("both file routes read a missing or foreign file with one shared check (spec §7.5, FX8)", async () => {
  const { isMissingFileError } = await import("../src/lib/uploads.ts")
  assert.equal(isMissingFileError(Object.assign(new Error("gone"), { code: "ENOENT" })), true)
  assert.equal(isMissingFileError(new Error("ENOENT")), false)
  assert.equal(isMissingFileError(null), false)
  for (const path of ["src/app/api/attachments/[id]/route.ts", "src/app/api/attachments/[id]/thumbnail/route.ts"]) {
    const source = readFileSync(path, "utf8").replace(/\r\n/g, "\n")
    assert.match(source, /import \{ assertSafeUploadPath, isMissingFileError, isOutsideUploadRootError \} from "@\/lib\/uploads"/, path)
    assert.match(source, /if \(isMissingFileError\(error\) \|\| isOutsideUploadRootError\(error\)\) \{\n\s*return NextResponse\.json\(\{ error: "Attachment file not found" \}, \{ status: 404 \}\)/, path)
    assert.doesNotMatch(source, /function isMissingFileError/, path)
  }
})
