import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const migrationPath = "prisma/manual-migrations/2026-11-05-add-disposal-rounds.sql"

const namedObjects = [
  "PK_disposal_rounds",
  "FK_disposal_rounds_executedById",
  "FK_disposal_requests_roundId",
  "UX_disposal_rounds_roundNo",
  "IX_disposal_rounds_isActive_executionDate",
  "IX_disposal_rounds_executedById",
  "IX_disposal_requests_roundId",
]

// The SQL with comment lines removed, so the rollback note does not count as a statement.
function statements(sql: string) {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
}

test("the disposal rounds migration is idempotent and names every object", () => {
  assert.equal(existsSync(migrationPath), true, "migration should exist")
  const sql = read(migrationPath)

  assert.ok(
    sql.includes("IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'[dbo].[disposal_rounds]')"),
    "the table is created behind a sys.tables guard",
  )
  assert.ok(sql.includes("COL_LENGTH('dbo.disposal_requests', 'roundId') IS NULL"), "roundId is added behind a COL_LENGTH guard")
  for (const name of namedObjects) assert.ok(sql.includes(name), `${name} is named`)

  const body = statements(sql)
  assert.match(body, /\[id\]\s+NVARCHAR\(1000\)\s+NOT\s+NULL/i)
  assert.match(body, /\[executedById\]\s+NVARCHAR\(1000\)\s+NOT\s+NULL/i)
  assert.match(body, /\[documentNo\]\s+NVARCHAR\(100\)\s+NOT\s+NULL/i)
  assert.match(body, /\[executionDate\]\s+DATETIME2\s+NOT\s+NULL/i)
  assert.match(body, /\[saleValue\]\s+DECIMAL\(18,\s*2\)\s+NULL/i)
  assert.match(body, /\[remark\]\s+NVARCHAR\(MAX\)\s+NULL/i)
  assert.match(body, /\[roundId\]\s+NVARCHAR\(1000\)\s+NULL/i)
  assert.match(body, /DEFAULT\s+SYSUTCDATETIME\(\)/i)
  // ON DELETE / ON UPDATE NO ACTION are foreign-key clauses, not statements.
  const withoutReferentialActions = body.replace(/\bON\s+(DELETE|UPDATE)\s+NO\s+ACTION\b/gi, "")
  assert.doesNotMatch(withoutReferentialActions, /\bDROP\b/i)
  assert.doesNotMatch(withoutReferentialActions, /\bDELETE\b/i)
  assert.doesNotMatch(withoutReferentialActions, /\bUPDATE\b/i)

  assert.match(sql, /--.*DROP TABLE \[dbo\]\.\[disposal_rounds\]/i, "the rollback is written as a comment")
})

test("schema.prisma's DisposalRound and roundId map names equal the SQL's", () => {
  const schema = read("prisma/schema.prisma")
  const sql = read(migrationPath)
  const round = schema.match(/model\s+DisposalRound\s*\{[\s\S]*?\n\}/)?.[0] ?? ""
  const request = schema.match(/model\s+DisposalRequest\s*\{[\s\S]*?\n\}/)?.[0] ?? ""

  assert.match(round, /@@map\("disposal_rounds"\)/)
  assert.match(round, /roundNo\s+String\s+@unique\(map: "UX_disposal_rounds_roundNo"\)/)
  assert.match(request, /roundId\s+String\?/)
  assert.match(request, /round\s+DisposalRound\?\s+@relation\(fields: \[roundId\], references: \[id\], onDelete: NoAction, onUpdate: NoAction\)/)

  const prismaMaps = [
    ...[...round.matchAll(/map: "([^"]+)"/g)].map((match) => match[1]),
    ...[...request.matchAll(/map: "(IX_disposal_requests_roundId)"/g)].map((match) => match[1]),
  ].sort()
  assert.deepEqual(prismaMaps, [
    "IX_disposal_requests_roundId",
    "IX_disposal_rounds_executedById",
    "IX_disposal_rounds_isActive_executionDate",
    "UX_disposal_rounds_roundNo",
  ])
  for (const name of prismaMaps) {
    assert.ok(sql.includes(`name = N'${name}'`), `${name} is guarded in the SQL`)
    assert.ok(sql.includes(`INDEX [${name}]`), `${name} is created in the SQL`)
  }

  assert.match(schema, /executedDisposalRounds\s+DisposalRound\[\]\s+@relation\("DisposalRoundExecutedBy"\)/)
})
