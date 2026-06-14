import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

function readRequiredFile(filePath: string) {
  assert.equal(existsSync(filePath), true, `${filePath} should exist`)
  return readFileSync(filePath, "utf8")
}

test("integration OpenAPI route is authenticated and read-only", () => {
  const source = readRequiredFile("src/app/api/integrations/v1/openapi/route.ts")

  assert.match(source, /requireIntegrationScope\(request,\s*"integration:read"/)
  assert.match(source, /openapi:\s*"3\.1\.0"/)
  assert.match(source, /\/api\/integrations\/v1\/assets\/changes/)
  assert.match(source, /\/api\/integrations\/v1\/reference\/locations/)
  assert.doesNotMatch(source, /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/)
})

test("integration token generator is registered and does not write secrets to disk", () => {
  const packageJson = JSON.parse(readRequiredFile("package.json"))
  assert.equal(packageJson.scripts["integration:token"], "node scripts/generate-integration-token.mjs")

  const source = readRequiredFile("scripts/generate-integration-token.mjs")
  assert.match(source, /randomBytes/)
  assert.match(source, /createHash/)
  assert.match(source, /INTEGRATION_API_CLIENTS/)
  assert.doesNotMatch(source, /writeFileSync|appendFileSync/)
})

test("integration API handoff doc covers scopes, examples, UAT, and production notes", () => {
  const doc = readRequiredFile("docs/13_INTEGRATION_API.md")

  assert.match(doc, /INTEGRATION_API_CLIENTS/)
  assert.match(doc, /integration:token/)
  assert.match(doc, /asset:read/)
  assert.match(doc, /reference:read/)
  assert.match(doc, /integration:read/)
  assert.match(doc, /\/api\/integrations\/v1\/assets\/changes/)
  assert.match(doc, /UAT/)
  assert.match(doc, /Production/)
})
