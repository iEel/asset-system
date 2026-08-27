import { randomUUID } from "node:crypto"
import {
  Connection,
  Request,
  TYPES,
  type ConnectionConfiguration,
} from "tedious"

import type {
  ManualMigrationAttempt,
  ManualMigrationHistoryRow,
  ManualMigrationStore,
} from "./manual-migration-ledger.ts"

type Environment = Record<string, string | undefined>
type ManualMigrationConnectionConfig = ConnectionConfiguration & {
  authentication: {
    type: "default"
    options: { userName: string; password: string }
  }
  options: NonNullable<ConnectionConfiguration["options"]> & { database: string }
}
type SqlParameter = {
  name: string
  type: (typeof TYPES)[keyof typeof TYPES]
  value: unknown
  options?: { length?: number }
}

export const manualMigrationSql = {
  ledgerExists: `
    SELECT CASE WHEN OBJECT_ID(N'[dbo].[manual_migration_history]', N'U') IS NULL THEN 0 ELSE 1 END AS [ledgerExists];
  `,
  columnNames: `
    SELECT [name] FROM sys.columns WHERE [object_id] = OBJECT_ID(N'[dbo].[manual_migration_history]');
  `,
  listHistory: `
    SELECT [migrationName], [checksumSha256], [databaseName], [status], [appliedAt], [appliedBy], [reason], [executionMs], [errorMessage]
    FROM [dbo].[manual_migration_history]
    WHERE [databaseName] = @databaseName
    ORDER BY [appliedAt] DESC, [createdAt] DESC;
  `,
  insertAttempt: `
    INSERT INTO [dbo].[manual_migration_history]
      ([id], [migrationName], [checksumSha256], [databaseName], [status], [appliedAt], [appliedBy], [reason], [executionMs], [errorMessage], [createdAt])
    VALUES
      (@id, @migrationName, @checksumSha256, @databaseName, @status, @appliedAt, @appliedBy, @reason, @executionMs, @errorMessage, SYSUTCDATETIME());
  `,
  acquireLock: `
    DECLARE @lockResult INT;
    EXEC @lockResult = sys.sp_getapplock
      @Resource = @resource,
      @LockMode = N'Exclusive',
      @LockOwner = N'Session',
      @LockTimeout = 15000;
    SELECT @lockResult AS [lockResult];
  `,
  releaseLock: `
    EXEC sys.sp_releaseapplock @Resource = @resource, @LockOwner = N'Session';
  `,
  rollbackOpenTransaction: `
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
  `,
} as const

export function buildManualMigrationConnectionConfig(env: Environment): ManualMigrationConnectionConfig {
  const server = cleanEnv(env.DB_SERVER)
  const instanceName = cleanEnv(env.DB_INSTANCE)
  const userName = cleanEnv(env.DB_USER)
  const password = cleanEnv(env.DB_PASSWORD)
  const database = databaseFromUrl(cleanEnv(env.DATABASE_URL))
  const tlsServerName = cleanEnv(env.DB_TLS_SERVER_NAME)
  const rawPort = cleanEnv(env.DB_PORT) ?? "1433"
  const port = Number(rawPort)

  if (!server || !userName || !password || !database) {
    throw new Error("Missing SQL Server connection settings in environment variables")
  }
  if (!instanceName && (!Number.isInteger(port) || port < 1 || port > 65535)) {
    throw new Error("DB_PORT must be a valid TCP port")
  }

  return {
    server,
    authentication: {
      type: "default",
      options: { userName, password },
    },
    options: {
      database,
      ...(instanceName ? { instanceName } : { port }),
      ...(tlsServerName ? { serverName: tlsServerName } : {}),
      encrypt: true,
      trustServerCertificate: true,
    },
  }
}

export async function createManualMigrationSqlServerStore(env: Environment): Promise<ManualMigrationStore> {
  const config = buildManualMigrationConnectionConfig(env)
  const connection = await connectSqlServer(config)
  const databaseName = config.options.database

  return {
    async getDatabaseName() {
      return databaseName
    },
    async ledgerExists() {
      const rows = await query(connection, manualMigrationSql.ledgerExists)
      return Number(rows[0]?.ledgerExists ?? 0) === 1
    },
    async validateLedgerColumns() {
      const rows = await query(connection, manualMigrationSql.columnNames)
      const present = new Set(rows.map((row) => String(row.name)))
      return requiredColumns.filter((column) => !present.has(column))
    },
    async listHistory() {
      const rows = await query(connection, manualMigrationSql.listHistory, [
        parameter("databaseName", TYPES.NVarChar, databaseName, 255),
      ])
      return rows.map(mapHistoryRow)
    },
    async acquireLock(resource, timeoutMs) {
      if (timeoutMs !== 15_000) throw new Error("Manual migration lock timeout must be 15000 ms")
      const rows = await query(connection, manualMigrationSql.acquireLock, [
        parameter("resource", TYPES.NVarChar, resource, 255),
      ])
      return Number(rows[0]?.lockResult ?? -999) >= 0
    },
    async releaseLock(resource) {
      await query(connection, manualMigrationSql.releaseLock, [
        parameter("resource", TYPES.NVarChar, resource, 255),
      ])
    },
    async executeBatch(sql) {
      await executeSqlBatch(connection, sql)
    },
    async rollbackOpenTransaction() {
      await query(connection, manualMigrationSql.rollbackOpenTransaction)
    },
    async recordAttempt(attempt) {
      await query(connection, manualMigrationSql.insertAttempt, attemptParameters(attempt))
    },
    async close() {
      connection.close()
    },
  }
}

const requiredColumns = [
  "id",
  "migrationName",
  "checksumSha256",
  "databaseName",
  "status",
  "appliedAt",
  "appliedBy",
  "reason",
  "executionMs",
  "errorMessage",
  "createdAt",
]

function attemptParameters(attempt: ManualMigrationAttempt): SqlParameter[] {
  return [
    parameter("id", TYPES.NVarChar, randomUUID(), 1000),
    parameter("migrationName", TYPES.NVarChar, attempt.migrationName, 255),
    parameter("checksumSha256", TYPES.Char, attempt.checksumSha256, 64),
    parameter("databaseName", TYPES.NVarChar, attempt.databaseName, 255),
    parameter("status", TYPES.NVarChar, attempt.status, 20),
    parameter("appliedAt", TYPES.DateTime2, attempt.appliedAt),
    parameter("appliedBy", TYPES.NVarChar, attempt.appliedBy, 255),
    parameter("reason", TYPES.NVarChar, attempt.reason, 500),
    parameter("executionMs", TYPES.Int, attempt.executionMs),
    parameter("errorMessage", TYPES.NVarChar, attempt.errorMessage, 2000),
  ]
}

function parameter(
  name: string,
  type: SqlParameter["type"],
  value: unknown,
  length?: number,
): SqlParameter {
  return { name, type, value, ...(length ? { options: { length } } : {}) }
}

function query(connection: Connection, sql: string, parameters: SqlParameter[] = []) {
  return new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
    const rows: Array<Record<string, unknown>> = []
    const request = new Request(sql, (error) => error ? reject(error) : resolve(rows))
    for (const item of parameters) request.addParameter(item.name, item.type, item.value, item.options)
    request.on("row", (columns: Array<{ metadata: { colName: string }; value: unknown }>) => {
      rows.push(Object.fromEntries(columns.map((column) => [column.metadata.colName, column.value])))
    })
    connection.execSql(request)
  })
}

function executeSqlBatch(connection: Connection, sql: string) {
  return new Promise<void>((resolve, reject) => {
    const request = new Request(sql, (error) => error ? reject(error) : resolve())
    connection.execSqlBatch(request)
  })
}

function connectSqlServer(config: ConnectionConfiguration) {
  return new Promise<Connection>((resolve, reject) => {
    const connection = new Connection(config)
    connection.once("connect", (error) => error ? reject(error) : resolve(connection))
    connection.connect()
  })
}

function mapHistoryRow(row: Record<string, unknown>): ManualMigrationHistoryRow {
  const status = String(row.status)
  if (status !== "success" && status !== "failed" && status !== "baselined") {
    throw new Error(`Unsupported manual migration history status: ${status}`)
  }
  return {
    migrationName: String(row.migrationName),
    checksumSha256: String(row.checksumSha256),
    databaseName: String(row.databaseName),
    status,
    appliedAt: row.appliedAt instanceof Date ? row.appliedAt : new Date(String(row.appliedAt)),
    appliedBy: String(row.appliedBy),
    reason: String(row.reason),
    executionMs: Number(row.executionMs),
    errorMessage: row.errorMessage == null ? null : String(row.errorMessage),
  }
}

function databaseFromUrl(value: string | undefined) {
  const database = value?.match(/(?:^|;)database=([^;]+)/i)?.[1]
  return database ? decodeURIComponent(database) : undefined
}

function cleanEnv(value: string | undefined) {
  return value?.trim().replace(/^"|"$/g, "") || undefined
}
