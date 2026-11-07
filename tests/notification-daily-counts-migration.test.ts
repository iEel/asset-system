import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const migrationPath = "prisma/manual-migrations/2026-11-07-add-notification-daily-counts.sql"

const indexNames = [
  "IX_notification_daily_counts_day",
  "IX_notification_daily_counts_user_day",
  "UX_notification_daily_counts_user_day_key",
]

// The SQL with comment lines removed, so the rollback note does not count as a statement.
function statements(sql: string) {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
}

test("the notification daily counts migration is idempotent and creates the table, indexes and readAt", () => {
  assert.equal(existsSync(migrationPath), true, "migration should exist")
  const sql = read(migrationPath)

  assert.ok(
    sql.includes("IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'[dbo].[notification_daily_counts]')"),
    "the table is created behind a sys.tables guard",
  )
  assert.ok(
    sql.includes("COL_LENGTH('dbo.notification_user_states', 'readAt') IS NULL"),
    "readAt is added behind a COL_LENGTH guard",
  )
  assert.ok(sql.includes("PK_notification_daily_counts"), "the primary key is named")
  for (const name of indexNames) {
    assert.ok(
      sql.includes(`IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[notification_daily_counts]') AND name = N'${name}')`),
      `${name} is guarded by sys.indexes`,
    )
  }

  const body = statements(sql)
  const table = body.match(/CREATE TABLE \[dbo\]\.\[notification_daily_counts\] \(([\s\S]*?)\n  \);/)?.[1] ?? ""
  const columns = [...table.matchAll(/^\s*\[(\w+)\]\s/gm)].map((match) => match[1])
  assert.deepEqual(columns, ["id", "userId", "day", "key", "count", "digestCount", "createdAt", "updatedAt"])
  assert.match(table, /\[id\]\s+NVARCHAR\(1000\)\s+NOT\s+NULL/i)
  assert.match(table, /\[userId\]\s+NVARCHAR\(100\)\s+NOT\s+NULL/i)
  assert.match(table, /\[day\]\s+DATE\s+NOT\s+NULL/i)
  assert.match(table, /\[key\]\s+NVARCHAR\(50\)\s+NOT\s+NULL/i)
  assert.match(table, /\[count\]\s+INT\s+NOT\s+NULL/i)
  assert.match(table, /\[digestCount\]\s+INT\s+NULL/i)
  assert.match(table, /\[createdAt\]\s+DATETIME2\s+NOT\s+NULL\s+CONSTRAINT\s+\[DF_notification_daily_counts_createdAt\]\s+DEFAULT\s+SYSUTCDATETIME\(\)/i)
  assert.match(table, /\[updatedAt\]\s+DATETIME2\s+NOT\s+NULL\s+CONSTRAINT\s+\[DF_notification_daily_counts_updatedAt\]\s+DEFAULT\s+SYSUTCDATETIME\(\)/i)
  assert.match(table, /CONSTRAINT\s+\[PK_notification_daily_counts\]\s+PRIMARY\s+KEY\s+CLUSTERED\s+\(\[id\]\)/i)

  assert.match(body, /CREATE UNIQUE INDEX \[UX_notification_daily_counts_user_day_key\] ON \[dbo\]\.\[notification_daily_counts\]\(\[userId\], \[day\], \[key\]\)/)
  assert.match(body, /CREATE INDEX \[IX_notification_daily_counts_user_day\] ON \[dbo\]\.\[notification_daily_counts\]\(\[userId\], \[day\]\)/)
  assert.match(body, /CREATE INDEX \[IX_notification_daily_counts_day\] ON \[dbo\]\.\[notification_daily_counts\]\(\[day\]\)/)
  assert.match(body, /ALTER TABLE \[dbo\]\.\[notification_user_states\] ADD \[readAt\] DATETIME2 NULL/i)

  assert.doesNotMatch(body, /\bDROP\b/i)
  assert.doesNotMatch(body, /\bDELETE\b/i)
  assert.doesNotMatch(body, /\bUPDATE\b/i)

  assert.match(sql, /--.*DROP TABLE \[dbo\]\.\[notification_daily_counts\]/i, "the rollback is written as a comment")
  assert.match(sql, /--.*DROP COLUMN \[readAt\]/i, "the readAt rollback is written as a comment")
})

test("schema.prisma's NotificationDailyCount and readAt match the SQL", () => {
  const schema = read("prisma/schema.prisma")
  const sql = read(migrationPath)
  const model = schema.match(/model\s+NotificationDailyCount\s*\{[\s\S]*?\n\}/)?.[0] ?? ""
  const state = schema.match(/model\s+NotificationUserState\s*\{[\s\S]*?\n\}/)?.[0] ?? ""

  assert.match(model, /@@map\("notification_daily_counts"\)/)
  assert.match(model, /id\s+String\s+@id @default\(uuid\(\)\)/)
  assert.match(model, /userId\s+String\s+@db\.NVarChar\(100\)/)
  assert.match(model, /day\s+DateTime\s+@db\.Date/)
  assert.match(model, /key\s+String\s+@db\.NVarChar\(50\)/)
  assert.match(model, /count\s+Int\n/)
  assert.match(model, /digestCount\s+Int\?/)
  assert.match(model, /createdAt\s+DateTime\s+@default\(now\(\)\)/)
  assert.match(model, /updatedAt\s+DateTime\s+@updatedAt/)
  assert.match(model, /@@unique\(\[userId, day, key\], map: "UX_notification_daily_counts_user_day_key"\)/)
  assert.match(model, /@@index\(\[userId, day\], map: "IX_notification_daily_counts_user_day"\)/)
  assert.match(model, /@@index\(\[day\], map: "IX_notification_daily_counts_day"\)/)
  assert.match(state, /readAt\s+DateTime\?/)

  const prismaMaps = [...model.matchAll(/map: "([^"]+)"/g)].map((match) => match[1]).sort()
  assert.deepEqual(prismaMaps, indexNames)
  for (const name of prismaMaps) {
    assert.ok(sql.includes(`name = N'${name}'`), `${name} is guarded in the SQL`)
    assert.ok(sql.includes(`INDEX [${name}]`), `${name} is created in the SQL`)
  }
})
