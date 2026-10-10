import "dotenv/config"

import { readFileSync } from "node:fs"
import path from "node:path"

import dotenv from "dotenv"

import {
  ManualMigrationUsageError,
  parseManualMigrationArgs,
  runManualMigrationCommand,
} from "../src/lib/manual-migration-ledger.ts"
import { extractEnvFileArg, withConnectionFromEnvFile } from "../src/lib/manual-migration-env.ts"
import { createManualMigrationSqlServerStore } from "../src/lib/manual-migration-sql-server.ts"

const migrationRoot = path.resolve("prisma/manual-migrations")
let store

function readEnvFile(file) {
  try {
    return dotenv.parse(readFileSync(file))
  } catch {
    throw new ManualMigrationUsageError(`Cannot read env file ${file}`)
  }
}

try {
  const { envFile, rest } = extractEnvFileArg(process.argv.slice(2))
  const env = envFile ? withConnectionFromEnvFile(process.env, readEnvFile(envFile), envFile) : process.env
  const command = parseManualMigrationArgs(rest)
  if (envFile) console.log(`Connection settings: ${envFile}`)
  store = await createManualMigrationSqlServerStore(env)
  process.exitCode = await runManualMigrationCommand(command, {
    migrationRoot,
    store,
    output: console,
    secrets: [
      env.DATABASE_URL ?? "",
      env.DB_SERVER ?? "",
      env.DB_USER ?? "",
      env.DB_PASSWORD ?? "",
    ],
  })
} catch (error) {
  if (error instanceof ManualMigrationUsageError) {
    console.error(error.message)
    console.error("Usage: migration:init|status|apply|baseline -- [filename.sql] [required flags] [--db-env <path>]")
  } else {
    console.error("Manual migration command failed. Review the database and configuration before retrying.")
  }
  process.exitCode = 1
} finally {
  await store?.close()
}
