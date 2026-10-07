import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

const state: { partial: Array<{ id: string; assetTag: string; name: string }>; inRound: string[]; calls: string[] } = { partial: [], inRound: [], calls: [] }
Object.assign(globalThis, { __lookupPartialState: state })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    export async function requireAuth() { return { id: "user-1", roles: [], permissions: ["audit:edit"] } }
    export function requirePermission() {}
  `],
  ["@/lib/db", `
    const state = () => globalThis.__lookupPartialState
    export const prisma = {
      auditRound: { findFirst: async () => ({ id: "round-1", status: "open" }) },
      asset: {
        findFirst: async () => { state().calls.push("asset.findFirst"); return null },
        findMany: async () => { state().calls.push("asset.findMany"); return state().partial },
      },
      auditItem: {
        findUnique: async () => null,
        findMany: async () => state().inRound.map((assetId) => ({ assetId })),
      },
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

const route = await import(pathToFileURL("src/app/api/audit-rounds/[id]/scan-lookup/route.ts").href) as {
  POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response>
}

function lookup(rawValue: string) {
  return route.POST(
    new Request("http://localhost/api/audit-rounds/round-1/scan-lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawValue }),
    }),
    { params: Promise.resolve({ id: "round-1" }) },
  )
}

beforeEach(() => {
  state.partial = []
  state.inRound = []
  state.calls = []
})

test("when no code matches exactly, three or more characters return up to five partial matches marked in or out of the round", async () => {
  state.partial = [
    { id: "asset-1", assetTag: "GRL-COM-26-0036", name: "RAM" },
    { id: "asset-2", assetTag: "GRL-COM-26-0037", name: "RAM" },
  ]
  state.inRound = ["asset-2"]

  const payload = await (await lookup("26-003")).json() as { status: string; matches: Array<{ assetId: string; inRound: boolean }> }

  assert.equal(payload.status, "candidates")
  assert.deepEqual(payload.matches.map((match) => [match.assetId, match.inRound]), [["asset-1", false], ["asset-2", true]])
})

test("fewer than three characters never runs the partial search", async () => {
  const payload = await (await lookup("26")).json() as { status: string }

  assert.equal(payload.status, "unknown_asset")
  assert.ok(!state.calls.includes("asset.findMany"))
})

test("no partial match is still an unknown asset", async () => {
  const payload = await (await lookup("ZZZ-404")).json() as { status: string }
  assert.equal(payload.status, "unknown_asset")
})
