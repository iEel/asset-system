import "dotenv/config"

import path from "node:path"

import {
  ManualMigrationUsageError,
  parseManualMigrationArgs,
  runManualMigrationCommand,
} from "../src/lib/manual-migration-ledger.ts"
import { createManualMigrationSqlServerStore } from "../src/lib/manual-migration-sql-server.ts"

const migrationRoot = path.resolve("prisma/manual-migrations")
let store

try {
  const command = parseManualMigrationArgs(process.argv.slice(2))
  store = await createManualMigrationSqlServerStore(process.env)
  process.exitCode = await runManualMigrationCommand(command, {
    migrationRoot,
    store,
    output: console,
    secrets: [
      process.env.DATABASE_URL ?? "",
      process.env.DB_SERVER ?? "",
      process.env.DB_USER ?? "",
      process.env.DB_PASSWORD ?? "",
    ],
  })
} catch (error) {
  if (error instanceof ManualMigrationUsageError) {
    console.error(error.message)
    console.error("Usage: migration:init|status|apply|baseline -- [filename.sql] [required flags]")
  } else {
    console.error("Manual migration command failed. Review the database and configuration before retrying.")
  }
  process.exitCode = 1
} finally {
  await store?.close()
}
