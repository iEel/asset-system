import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

function readRequiredFile(filePath: string) {
  assert.equal(existsSync(filePath), true, `${filePath} should exist`)
  return readFileSync(filePath, "utf8")
}

function assertGuardedIndex(source: string, indexName: string, createPattern: RegExp) {
  assert.match(source, new RegExp(`IF\\s+NOT\\s+EXISTS[\\s\\S]*name\\s*=\\s*N'${indexName}'`, "i"), `Missing idempotent guard for ${indexName}`)
  assert.match(source, createPattern, `Missing CREATE INDEX for ${indexName}`)
  assert.match(
    source,
    new RegExp(`IF\\s+NOT\\s+EXISTS[\\s\\S]*name\\s*=\\s*N'${indexName}'[\\s\\S]*CREATE\\s+(?:UNIQUE\\s+)?INDEX\\s+\\[?${indexName}\\]?`, "i"),
    `Guard for ${indexName} should appear before its CREATE INDEX`
  )
}

test("manual migration creates integration API clients table and indexes idempotently", () => {
  const source = readRequiredFile("prisma/manual-migrations/2026-06-14-add-integration-api-clients.sql")

  assert.match(source, /integration_api_clients/i)
  assert.match(source, /IF\s+NOT\s+EXISTS[\s\S]*CREATE\s+TABLE\s+\[dbo\]\.\[integration_api_clients\]/i)
  assert.match(source, /\[tokenHash\]\s+NVARCHAR\(64\)\s+NOT\s+NULL/i)
  assert.match(source, /\[scopesJson\]\s+NVARCHAR\(MAX\)\s+NOT\s+NULL/i)
  assert.match(source, /\[enabled\]\s+BIT\s+NOT\s+NULL/i)
  assert.match(source, /DEFAULT\s+\(?1\)?/i)
  assert.match(source, /DATETIME2/i)

  assertGuardedIndex(
    source,
    "UX_integration_api_clients_clientId",
    /CREATE\s+UNIQUE\s+INDEX\s+\[?UX_integration_api_clients_clientId\]?[\s\S]*\[clientId\]/i
  )
  assertGuardedIndex(
    source,
    "UX_integration_api_clients_tokenHash",
    /CREATE\s+UNIQUE\s+INDEX\s+\[?UX_integration_api_clients_tokenHash\]?[\s\S]*\[tokenHash\]/i
  )
  assertGuardedIndex(
    source,
    "IX_integration_api_clients_enabled_clientId",
    /CREATE\s+INDEX\s+\[?IX_integration_api_clients_enabled_clientId\]?[\s\S]*\[enabled\][\s\S]*\[clientId\]/i
  )
  assertGuardedIndex(
    source,
    "IX_integration_api_clients_lastUsedAt",
    /CREATE\s+INDEX\s+\[?IX_integration_api_clients_lastUsedAt\]?[\s\S]*\[lastUsedAt\]/i
  )
})
