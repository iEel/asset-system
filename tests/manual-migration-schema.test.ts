import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const migrationPath = "prisma/manual-migrations/2026-08-27-add-manual-migration-history.sql"

test("bootstrap migration creates the manual migration ledger idempotently", () => {
  assert.equal(existsSync(migrationPath), true, "bootstrap migration should exist")
  const sql = readFileSync(migrationPath, "utf8")

  assert.match(sql, /IF\s+NOT\s+EXISTS[\s\S]*CREATE\s+TABLE\s+\[dbo\]\.\[manual_migration_history\]/i)
  for (const pattern of [
    /\[id\]\s+NVARCHAR\(1000\)\s+NOT\s+NULL/i,
    /\[migrationName\]\s+NVARCHAR\(255\)\s+NOT\s+NULL/i,
    /\[checksumSha256\]\s+CHAR\(64\)\s+NOT\s+NULL/i,
    /\[databaseName\]\s+NVARCHAR\(255\)\s+NOT\s+NULL/i,
    /\[status\]\s+NVARCHAR\(20\)\s+NOT\s+NULL/i,
    /\[appliedAt\]\s+DATETIME2\s+NOT\s+NULL/i,
    /\[appliedBy\]\s+NVARCHAR\(255\)\s+NOT\s+NULL/i,
    /\[reason\]\s+NVARCHAR\(500\)\s+NOT\s+NULL/i,
    /\[executionMs\]\s+INT\s+NOT\s+NULL/i,
    /\[errorMessage\]\s+NVARCHAR\(2000\)\s+NULL/i,
    /\[createdAt\]\s+DATETIME2\s+NOT\s+NULL/i,
  ]) assert.match(sql, pattern)

  assert.match(sql, /CHECK\s*\(\s*\[status\]\s+IN\s*\(N'success',\s*N'failed',\s*N'baselined'\)\s*\)/i)
  assert.match(sql, /IF\s+NOT\s+EXISTS[\s\S]*UX_manual_migration_history_accepted[\s\S]*CREATE\s+UNIQUE\s+INDEX[\s\S]*\[databaseName\][\s\S]*\[migrationName\][\s\S]*WHERE\s+\[status\]\s*<>\s*N'failed'/i)
  assert.match(sql, /IF\s+NOT\s+EXISTS[\s\S]*IX_manual_migration_history_database_name_applied[\s\S]*CREATE\s+INDEX[\s\S]*\[databaseName\][\s\S]*\[migrationName\][\s\S]*\[appliedAt\]/i)
})

test("Prisma maps the manual migration ledger for schema visibility", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8")
  const model = schema.match(/model\s+ManualMigrationHistory\s*\{[\s\S]*?\n\}/)?.[0] ?? ""

  assert.match(model, /migrationName\s+String\s+@db\.NVarChar\(255\)/)
  assert.match(model, /checksumSha256\s+String\s+@db\.Char\(64\)/)
  assert.match(model, /databaseName\s+String\s+@db\.NVarChar\(255\)/)
  assert.match(model, /status\s+String\s+@db\.NVarChar\(20\)/)
  assert.match(model, /errorMessage\s+String\?\s+@db\.NVarChar\(2000\)/)
  assert.match(model, /@@index\(\[databaseName, migrationName, appliedAt\], map: "IX_manual_migration_history_database_name_applied"\)/)
  assert.match(model, /@@map\("manual_migration_history"\)/)
})

test("package scripts expose the four manual migration commands", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"))
  assert.equal(packageJson.scripts["migration:init"], "node scripts/manual-migration.mjs init")
  assert.equal(packageJson.scripts["migration:status"], "node scripts/manual-migration.mjs status")
  assert.equal(packageJson.scripts["migration:apply"], "node scripts/manual-migration.mjs apply")
  assert.equal(packageJson.scripts["migration:baseline"], "node scripts/manual-migration.mjs baseline")
})

test("CLI remains a thin orchestrator and closes its SQL Server store", () => {
  assert.equal(existsSync("scripts/manual-migration.mjs"), true, "CLI script should exist")
  const source = readFileSync("scripts/manual-migration.mjs", "utf8")
  assert.match(source, /import\s+"dotenv\/config"/)
  assert.match(source, /parseManualMigrationArgs\(process\.argv\.slice\(2\)\)/)
  assert.match(source, /createManualMigrationSqlServerStore/)
  assert.match(source, /runManualMigrationCommand/)
  assert.match(source, /finally\s*\{[\s\S]*store\?\.close\(\)/)
  assert.match(source, /process\.exitCode/)
})
