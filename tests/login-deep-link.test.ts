import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r/g, "")

test("the proxy stamps the page asked for into a request header, over any value the client sent", () => {
  const source = read("src/proxy.ts")

  assert.match(source, /headers\.set\(requestPathHeader, buildRequestPath\(request\.nextUrl\)\)/)
  assert.match(source, /new Headers\(request\.headers\)/)
  assert.match(source, /new NextRequest\(request, \{ headers \}\)/)
})

test("every signed-out redirect keeps the page asked for", () => {
  for (const path of [
    "src/lib/page-auth.ts",
    "src/app/[locale]/(dashboard)/layout.tsx",
    "src/app/[locale]/(dashboard)/admin/approvals/page.tsx",
    "src/app/[locale]/(dashboard)/admin/approvals/history/page.tsx",
  ]) {
    const source = read(path)
    assert.doesNotMatch(source, /redirect\(`\/\$\{locale\}\/login`\)/, path)
    assert.match(source, /redirectToLogin\(locale\)/, path)
  }
})

test("redirectToLogin builds the login link from the proxy's header", () => {
  const source = read("src/lib/page-auth.ts")

  assert.match(source, /export async function redirectToLogin\(locale: string\): Promise<never>/)
  assert.match(source, /buildLoginHref\(locale, \(await headers\(\)\)\.get\(requestPathHeader\)\)/)
})
