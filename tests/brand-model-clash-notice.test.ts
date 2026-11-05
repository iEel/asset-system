import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { reactivateNameClash, readNameClash } from "../src/lib/brand-model-clash.ts"

// Page group 7 plan 1 Task 2 (spec §4.1, G7P1-R1): the brand and model forms read the 409 clash, name the existing record
// under the name field and offer it: "ใช้ {name}" for an active one, "เปิดใช้งาน {name}" for an inactive one, only with
// brand:edit. Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const C = "src/components/master-data/"
const P = "src/app/[locale]/(dashboard)/master-data/brands/"

test("readNameClash takes the existing record from a brand or model 409 body and nothing else", () => {
  const existing = { id: "b1", name: "Dell", isActive: false }
  assert.deepEqual(readNameClash({ code: "BRAND_NAME_EXISTS", field: "name", existing, fieldErrors: { name: "duplicate" } }), {
    kind: "brand",
    existing,
  })
  assert.deepEqual(readNameClash({ code: "MODEL_NAME_EXISTS", existing: { id: "m1", name: "Latitude 5440", isActive: true } }), {
    kind: "model",
    existing: { id: "m1", name: "Latitude 5440", isActive: true },
  })
  for (const payload of [
    null,
    "x",
    { fieldErrors: { name: "duplicate" } },
    { code: "BRAND_NAME_EXISTS" },
    { code: "OTHER", existing },
    { code: "BRAND_NAME_EXISTS", existing: { id: "b1", name: "Dell" } },
  ]) {
    assert.equal(readNameClash(payload), null, JSON.stringify(payload))
  }
})

type Call = { url: string; method: string; body: unknown }
function fakeFetch(responses: Record<string, { status: number; body: unknown }>) {
  const calls: Call[] = []
  const impl = async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET"
    calls.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) : undefined })
    const reply = responses[`${method} ${url}`] ?? { status: 500, body: { error: "unexpected" } }
    return new Response(JSON.stringify(reply.body), { status: reply.status })
  }
  return { calls, impl: impl as typeof fetch }
}

test("reactivating a brand PUTs its own name with isActive true", async () => {
  const { calls, impl } = fakeFetch({ "PUT /api/brands/b1": { status: 200, body: {} } })
  await reactivateNameClash("brand", { id: "b1", name: "Dell", isActive: false }, { fetchImpl: impl })
  assert.deepEqual(calls, [{ url: "/api/brands/b1", method: "PUT", body: { name: "Dell", isActive: true, source: "master-data" } }])
})

test("reactivating a model reads its brand and category first and PUTs them unchanged, specs left out so they stay", async () => {
  const { calls, impl } = fakeFetch({
    "GET /api/models/m1?includeInactive=1": {
      status: 200,
      body: { id: "m1", name: "Latitude 5440", brandId: "b1", categoryId: "c1", specs: "16GB", isActive: false },
    },
    "PUT /api/models/m1": { status: 200, body: {} },
  })
  await reactivateNameClash("model", { id: "m1", name: "Latitude 5440", isActive: false }, { fetchImpl: impl, source: "asset-form" })
  assert.deepEqual(calls[1], {
    url: "/api/models/m1",
    method: "PUT",
    body: { name: "Latitude 5440", brandId: "b1", categoryId: "c1", isActive: true, source: "asset-form" },
  })
})

test("a refused reactivation throws the server's error", async () => {
  const { impl } = fakeFetch({ "PUT /api/brands/b1": { status: 403, body: { error: "Forbidden" } } })
  await assert.rejects(reactivateNameClash("brand", { id: "b1", name: "Dell", isActive: false }, { fetchImpl: impl }), /Forbidden/)
})

test("GET /api/models/[id] reads an inactive model only when asked (the reactivation's read)", () => {
  const source = read("src/app/api/models/[id]/route.ts")
  const get = source.slice(source.indexOf("export async function GET"), source.indexOf("export async function PUT"))
  assert.match(get, /searchParams\.get\("includeInactive"\) === "1"/)
  assert.match(get, /where: includeInactive \? \{ id \} : \{ id, isActive: true \}/)
})

test("the clash notice names the record and offers use (active) or reactivate (inactive, canReactivate only)", () => {
  const source = read(`${C}brand-model-clash-notice.tsx`)
  assert.match(source, /export function BrandModelClashNotice\(\{\n?\s*clash,\n?\s*kind,\n?\s*canReactivate,\n?\s*onUse,\n?\s*onReactivate,/)
  assert.match(source, /clash\.isActive \? t\("exists", \{ name: clash\.name \}\) : t\("existsInactive", \{ name: clash\.name \}\)/)
  assert.match(source, /\{clash\.isActive \? \(/)
  assert.match(source, /\{t\("use", \{ name: clash\.name \}\)\}/)
  assert.match(source, /canReactivate \? \(/)
  assert.match(source, /\{t\("reactivate", \{ name: clash\.name \}\)\}/)
  assert.doesNotMatch(source, /useRouter|next\/navigation|master-data\/brands/, "no page routing: callers pass onUse and onReactivate")
})

for (const form of [
  { path: `${C}brand-form.tsx`, kind: "brand", input: "brand-name" },
  { path: `${C}asset-model-form.tsx`, kind: "model", input: "asset-model-name" },
]) {
  test(`${form.path}: a 409 with existing renders BrandModelClashNotice under the name, reactivate gated by canReactivate`, () => {
    const source = read(form.path)
    assert.match(source, /const nameClash = readNameClash\(result\)/)
    assert.match(source, /setClash\(nameClash\?\.existing \?\? null\)/)
    assert.match(source, new RegExp(`<BrandModelClashNotice\\n\\s+id="${form.input}-clash"\\n\\s+clash=\\{clash\\}\\n\\s+kind="${form.kind}"\\n\\s+canReactivate=\\{canReactivate\\}`))
    assert.match(source, new RegExp(`aria-describedby=\\{clash \\? "${form.input}-clash" : undefined\\}`))
    assert.match(source, /error=\{clash \? undefined : fieldErrors\.message\("name"\)\}/)
    assert.match(source, new RegExp(`await reactivateNameClash\\("${form.kind}", clash\\)`))
    assert.match(source, /canReactivate = false/)
  })
}

test("the four brand and model pages pass canReactivate from brand:edit", () => {
  for (const page of ["new/page.tsx", "[id]/edit/page.tsx", "models/new/page.tsx", "models/[id]/edit/page.tsx"]) {
    const source = read(`${P}${page}`)
    assert.match(source, /canReactivate=\{hasPermission\(user, "brand", "edit"\)\}/, page)
  }
})
