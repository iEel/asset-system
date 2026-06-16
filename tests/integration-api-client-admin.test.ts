import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

function readRequiredFile(filePath: string) {
  assert.equal(existsSync(filePath), true, `${filePath} should exist`)
  return readFileSync(filePath, "utf8")
}

function extractExportedHandler(source: string, method: "GET" | "POST" | "PATCH") {
  const match = new RegExp(`export\\s+async\\s+function\\s+${method}\\b`).exec(source)
  assert.notEqual(match, null, `route should export async function ${method}`)

  const bodyStart = source.indexOf("{", match!.index)
  assert.notEqual(bodyStart, -1, `${method} handler should have a function body`)

  let depth = 0
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index]
    if (char === "{") depth += 1
    if (char === "}") depth -= 1
    if (depth === 0) return source.slice(match!.index, index + 1)
  }

  assert.fail(`${method} handler body should be balanced`)
}

function assertNoTokenHashInHandler(handler: string) {
  assert.match(handler, /NextResponse\.json\(/, "handler should return JSON with NextResponse.json")
  assert.doesNotMatch(handler, /tokenHash/, "handler responses and audit payloads must not expose tokenHash")
}

test("admin integration client list route requires setting view permission and redacts token hashes", () => {
  const source = readRequiredFile("src/app/api/admin/integration-clients/route.ts")
  const handler = extractExportedHandler(source, "GET")

  assert.match(handler, /requireAuth\(\)/)
  assert.match(handler, /requirePermission\(user,\s*"setting",\s*"view"\)/)
  assert.match(handler, /listIntegrationClients\(/)
  assertNoTokenHashInHandler(handler)
})

test("admin integration client create route requires setting edit permission, audits mutation, and returns one-time token", () => {
  const source = readRequiredFile("src/app/api/admin/integration-clients/route.ts")
  const handler = extractExportedHandler(source, "POST")

  assert.match(handler, /requireAuth\(\)/)
  assert.match(handler, /requirePermission\(user,\s*"setting",\s*"edit"\)/)
  assert.match(handler, /createIntegrationClient\(/)
  assert.match(handler, /logAudit\(/)
  assert.match(handler, /create_client/)
  assert.match(handler, /token/)
  assertNoTokenHashInHandler(handler)
})

test("admin integration client update route requires setting edit permission, audits scope changes, and redacts token hashes", () => {
  const source = readRequiredFile("src/app/api/admin/integration-clients/[id]/route.ts")
  const handler = extractExportedHandler(source, "PATCH")

  assert.match(handler, /requireAuth\(\)/)
  assert.match(handler, /requirePermission\(user,\s*"setting",\s*"edit"\)/)
  assert.match(handler, /updateIntegrationClient\(/)
  assert.match(handler, /logAudit\(/)
  assert.match(handler, /update_client_scopes/)
  assert.match(handler, /oldValue/)
  assert.match(handler, /newValue/)
  assertNoTokenHashInHandler(handler)
})

test("admin integration client enable route requires setting edit permission and audits mutation", () => {
  const source = readRequiredFile("src/app/api/admin/integration-clients/[id]/enable/route.ts")
  const handler = extractExportedHandler(source, "POST")

  assert.match(handler, /requireAuth\(\)/)
  assert.match(handler, /requirePermission\(user,\s*"setting",\s*"edit"\)/)
  assert.match(handler, /setIntegrationClientEnabled\([\s\S]*true/)
  assert.match(handler, /logAudit\(/)
  assert.match(handler, /enable_client/)
  assertNoTokenHashInHandler(handler)
})

test("admin integration client disable route requires setting edit permission and audits mutation", () => {
  const source = readRequiredFile("src/app/api/admin/integration-clients/[id]/disable/route.ts")
  const handler = extractExportedHandler(source, "POST")

  assert.match(handler, /requireAuth\(\)/)
  assert.match(handler, /requirePermission\(user,\s*"setting",\s*"edit"\)/)
  assert.match(handler, /setIntegrationClientEnabled\([\s\S]*false/)
  assert.match(handler, /logAudit\(/)
  assert.match(handler, /disable_client/)
  assertNoTokenHashInHandler(handler)
})

test("admin integration client rotate route requires setting edit permission, audits mutation, and returns one-time token", () => {
  const source = readRequiredFile("src/app/api/admin/integration-clients/[id]/rotate/route.ts")
  const handler = extractExportedHandler(source, "POST")

  assert.match(handler, /requireAuth\(\)/)
  assert.match(handler, /requirePermission\(user,\s*"setting",\s*"edit"\)/)
  assert.match(handler, /rotateIntegrationClient\(/)
  assert.match(handler, /logAudit\(/)
  assert.match(handler, /rotate_client/)
  assert.match(handler, /token/)
  assertNoTokenHashInHandler(handler)
})

test("localized admin integration client page is permission protected and passes labels to the client manager", () => {
  const source = readRequiredFile("src/app/[locale]/(dashboard)/admin/integrations/page.tsx")

  assert.match(source, /requirePagePermission\(locale,\s*"setting",\s*"view"\)/)
  assert.match(source, /getTranslations\("integrationApiPage"\)/)
  assert.match(source, /IntegrationClientManager/)
  assert.match(source, /labels=\{\{/)
  assert.doesNotMatch(source, /tokenHash/)
})

test("sidebar exposes the integration API admin entry under Administration with setting view permission", () => {
  const source = readRequiredFile("src/components/layout/sidebar.tsx")

  assert.match(source, /KeyRound/)
  assert.match(source, /labelKey:\s*"integrationApi"[\s\S]*href:\s*`\/\$\{locale\}\/admin\/integrations`/)
  assert.match(source, /labelKey:\s*"integrationApi"[\s\S]*permission:\s*\{\s*module:\s*"setting",\s*action:\s*"view"\s*\}/)
})

test("integration client manager keeps one-time tokens in React state only and supports secure copy/dismiss flow", () => {
  const source = readRequiredFile("src/components/admin/IntegrationClientManager.tsx")

  assert.match(source, /"use client"/)
  assert.match(source, /useState<OneTimeToken \| null>\(null\)/)
  assert.match(source, /\/api\/admin\/integration-clients/)
  assert.match(source, /method:\s*"PATCH"/)
  assert.match(source, /editingClient/)
  assert.match(source, /confirmScopeExpansion/)
  assert.match(source, /\/rotate/)
  assert.match(source, /\/enable/)
  assert.match(source, /\/disable/)
  assert.match(source, /navigator\.clipboard\.writeText\(/)
  assert.match(source, /copyFeedback/)
  assert.match(source, /setCopyFeedback\(\{\s*tone:\s*"success",\s*message:\s*labels\.copied\s*\}\)/)
  assert.match(source, /setCopyFeedback\(\{\s*tone:\s*"error",\s*message:\s*labels\.error\s*\}\)/)
  assert.match(source, /role="status"/)
  assert.match(source, /tokenAcknowledgement/)
  assert.match(source, /dismissToken/)
  assert.match(source, /window\.confirm\(/)
  assert.doesNotMatch(source, /tokenHash/)
  assert.doesNotMatch(source, /localStorage/)
  assert.doesNotMatch(source, /sessionStorage/)
  assert.doesNotMatch(source, /INTEGRATION_API_CLIENTS/)
})

test("integration client manager exposes the allowed read scopes and safe defaults", () => {
  const source = readRequiredFile("src/components/admin/IntegrationClientManager.tsx")

  assert.match(source, /asset:read/)
  assert.match(source, /reference:read/)
  assert.match(source, /integration:read/)
  assert.match(source, /useState<string\[\]>\(\["asset:read",\s*"reference:read"\]\)/)
  assert.doesNotMatch(source, /asset:write|reference:write|integration:write/)
})

test("integration client manager shows operational API usage and copyable PowerShell examples", () => {
  const source = readRequiredFile("src/components/admin/IntegrationClientManager.tsx")

  assert.match(source, /buildIntegrationPowerShellExamples/)
  assert.match(source, /client\.operations/)
  assert.match(source, /labels\.operations/)
  assert.match(source, /labels\.requests7d/)
  assert.match(source, /labels\.latestError/)
  assert.match(source, /labels\.copyPowerShell/)
  assert.match(source, /navigator\.clipboard\.writeText\(example\.command\)/)
})

test("English and Thai messages include integration API navigation and page labels", () => {
  for (const locale of ["en", "th"] as const) {
    const messages = JSON.parse(readRequiredFile(`messages/${locale}.json`))

    assert.equal(typeof messages.nav.integrationApi, "string", `${locale} nav.integrationApi should exist`)
    assert.equal(typeof messages.integrationApiPage, "object", `${locale} integrationApiPage should exist`)

    for (const key of [
      "title",
      "subtitle",
      "summaryActive",
      "summaryDisabled",
      "summaryLastUsed",
      "createTitle",
      "clientId",
      "displayName",
      "scopes",
      "scopeAssetRead",
      "scopeReferenceRead",
      "scopeIntegrationRead",
      "createClient",
      "clientsTitle",
      "emptyTitle",
      "tokenPanelTitle",
      "tokenPanelWarning",
      "copyToken",
      "copied",
      "tokenAcknowledgement",
      "dismissToken",
      "rotate",
      "editScopes",
      "saveScopes",
      "cancel",
      "enable",
      "disable",
      "confirmRotate",
      "confirmScopeExpansion",
      "confirmEnable",
      "confirmDisable",
      "loading",
      "error",
      "noLastUsed",
      "operations",
      "requests24h",
      "requests7d",
      "errors7d",
      "topEndpoint",
      "latestError",
      "noOperationalData",
      "copyPowerShell",
      "powerShellCopied",
    ]) {
      assert.equal(typeof messages.integrationApiPage[key], "string", `${locale} integrationApiPage.${key} should exist`)
    }
  }
})
