import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  buildManualMigrationConnectionConfig,
  manualMigrationSql,
} from "../src/lib/manual-migration-sql-server.ts"

test("builds the SQL Server config from the existing environment contract", () => {
  const config = buildManualMigrationConnectionConfig({
    DATABASE_URL: "sqlserver://host;database=asset%5Fmanagement;user=ignored;password=ignored",
    DB_SERVER: "sql.internal",
    DB_PORT: "1433",
    DB_USER: "migration-user",
    DB_PASSWORD: "secret",
    DB_TLS_SERVER_NAME: "sql.internal",
  })

  assert.equal(config.server, "sql.internal")
  assert.equal(config.authentication.options.userName, "migration-user")
  assert.equal(config.authentication.options.password, "secret")
  assert.equal(config.options.database, "asset_management")
  assert.equal(config.options.port, 1433)
  assert.equal(config.options.encrypt, true)
  assert.equal(config.options.trustServerCertificate, true)
  assert.equal(config.options.serverName, "sql.internal")
})

test("builds named-instance config without a TCP port", () => {
  const config = buildManualMigrationConnectionConfig({
    DATABASE_URL: "sqlserver://host;database=assets;user=ignored;password=ignored",
    DB_SERVER: "sql.internal",
    DB_INSTANCE: "SQLEXPRESS",
    DB_USER: "migration-user",
    DB_PASSWORD: "secret",
  })

  assert.equal(config.options.instanceName, "SQLEXPRESS")
  assert.equal("port" in config.options, false)
})

test("SQL statements use parameter placeholders and session-scoped application locks", () => {
  assert.match(manualMigrationSql.ledgerExists, /OBJECT_ID\(N'\[dbo\]\.\[manual_migration_history\]'/)
  assert.match(manualMigrationSql.columnNames, /sys\.columns/)
  assert.match(manualMigrationSql.listHistory, /WHERE\s+\[databaseName\]\s*=\s*@databaseName/i)
  assert.match(manualMigrationSql.insertAttempt, /@migrationName[\s\S]*@checksumSha256[\s\S]*@databaseName[\s\S]*@appliedBy[\s\S]*@reason/i)
  assert.match(manualMigrationSql.acquireLock, /sp_getapplock[\s\S]*@resource[\s\S]*LockOwner\s*=\s*N'Session'[\s\S]*15000/i)
  assert.match(manualMigrationSql.releaseLock, /sp_releaseapplock[\s\S]*@resource[\s\S]*LockOwner\s*=\s*N'Session'/i)
  assert.match(manualMigrationSql.rollbackOpenTransaction, /XACT_STATE\(\)[\s\S]*ROLLBACK/i)
})

test("adapter parameterizes ledger values and reserves batch execution for validated SQL", () => {
  const source = readFileSync("src/lib/manual-migration-sql-server.ts", "utf8")
  assert.match(source, /parameter\("migrationName"/)
  assert.match(source, /parameter\("checksumSha256"/)
  assert.match(source, /parameter\("databaseName"/)
  assert.match(source, /parameter\("appliedBy"/)
  assert.match(source, /parameter\("reason"/)
  assert.match(source, /request\.addParameter\(item\.name, item\.type, item\.value, item\.options\)/)
  assert.match(source, /execSqlBatch\(request\)/)
  assert.equal((source.match(/execSqlBatch\(/g) ?? []).length, 1)
})
