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
  assert.match(source, /Admin|Integration API|token/i)
  assert.doesNotMatch(source, /INTEGRATION_API_CLIENTS\s*=/)
  assert.doesNotMatch(source, /(INTEGRATION_API_CLIENTS\s+(entry|json|config|configuration)|set\s+INTEGRATION_API_CLIENTS|store[\s\S]{0,80}INTEGRATION_API_CLIENTS|add[\s\S]{0,80}INTEGRATION_API_CLIENTS)/i)
  assert.doesNotMatch(source, /\.env/)
  assert.doesNotMatch(source, /writeFileSync|appendFileSync/)
})

test("integration API handoff doc covers scopes, UI token management, UAT, and production notes", () => {
  const doc = readRequiredFile("docs/13_INTEGRATION_API.md")

  assert.match(doc, /integration:token/)
  assert.match(doc, /asset:read/)
  assert.match(doc, /reference:read/)
  assert.match(doc, /integration:read/)
  assert.match(doc, /Admin\s*>\s*Integration API|Integration API admin|admin UI/i)
  assert.match(doc, /create/i)
  assert.match(doc, /disable|revoke/i)
  assert.match(doc, /rotate/i)
  assert.match(doc, /\/api\/integrations\/v1\/assets\/changes/)
  assert.match(doc, /UAT/)
  assert.match(doc, /Production/)
  assert.doesNotMatch(doc, /set\s+INTEGRATION_API_CLIENTS|edit\s+\.env|\.env.*INTEGRATION_API_CLIENTS/i)
  assert.doesNotMatch(doc, /(store\s+clients\s+in\s+`?INTEGRATION_API_CLIENTS`?|add[\s\S]{0,120}(hash|hash JSON)[\s\S]{0,120}`?INTEGRATION_API_CLIENTS`?|INTEGRATION_API_CLIENTS[\s\S]{0,120}(JSON entry|server environment))/i)
})
