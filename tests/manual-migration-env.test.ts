import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { ManualMigrationUsageError } from "../src/lib/manual-migration-ledger.ts"
import { extractEnvFileArg, withConnectionFromEnvFile } from "../src/lib/manual-migration-env.ts"

test("--db-env is taken out of the arguments in both spellings", () => {
  assert.deepEqual(extractEnvFileArg(["status", "--db-env", ".env.prod-admin"]), { envFile: ".env.prod-admin", rest: ["status"] })
  assert.deepEqual(
    extractEnvFileArg(["apply", "x.sql", "--db-env=.env.prod-admin", "--backup-confirmed", "--reason", "approved change"]),
    { envFile: ".env.prod-admin", rest: ["apply", "x.sql", "--backup-confirmed", "--reason", "approved change"] },
  )
  assert.deepEqual(extractEnvFileArg(["status"]), { envFile: null, rest: ["status"] })
})

test("--db-env needs exactly one value", () => {
  assert.throws(() => extractEnvFileArg(["status", "--db-env"]), ManualMigrationUsageError)
  assert.throws(() => extractEnvFileArg(["status", "--db-env", "--reason"]), ManualMigrationUsageError)
  assert.throws(() => extractEnvFileArg(["status", "--db-env=a", "--db-env=b"]), ManualMigrationUsageError)
})

test("connection settings come only from the env file, never from the dev .env", () => {
  const base = {
    DB_SERVER: "dev-host",
    DB_INSTANCE: "alpha",
    DB_USER: "asset_dev",
    DB_PASSWORD: "dev-secret",
    DATABASE_URL: "sqlserver://dev-host;database=asset_management_dev",
    PATH: "C:\\bin",
  }
  const env = withConnectionFromEnvFile(base, {
    DB_SERVER: "prod-host",
    DB_USER: "prod-user",
    DB_PASSWORD: "prod-secret",
    DATABASE_URL: "sqlserver://prod-host;database=asset_management",
  }, ".env.prod-admin")

  assert.equal(env.DB_SERVER, "prod-host")
  assert.equal(env.DB_USER, "prod-user")
  assert.equal(env.DATABASE_URL, "sqlserver://prod-host;database=asset_management")
  assert.equal(env.DB_INSTANCE, undefined, "a dev instance name must not leak into the Production connection")
  assert.equal(env.PATH, "C:\\bin")
})

test("an env file missing a connection setting is refused, naming only the missing keys", () => {
  assert.throws(
    () => withConnectionFromEnvFile({ DATABASE_URL: "sqlserver://dev;database=asset_management_dev" }, { DB_SERVER: "prod-host", DB_USER: "u", DB_PASSWORD: "secret-value" }, ".env.prod-admin"),
    (error: unknown) => error instanceof ManualMigrationUsageError && /DATABASE_URL/.test(error.message) && !/secret-value/.test(error.message),
  )
})

test("the migration CLI connects with the env-file settings and masks them", () => {
  const cli = readFileSync("scripts/manual-migration.mjs", "utf8")
  assert.match(cli, /extractEnvFileArg\(process\.argv\.slice\(2\)\)/)
  assert.match(cli, /parseManualMigrationArgs\(rest\)/)
  assert.match(cli, /createManualMigrationSqlServerStore\(env\)/)
  assert.doesNotMatch(cli, /secrets:[\s\S]*process\.env\.DB_PASSWORD/)
})

test("the flag is not --env-file, which Node 24 itself checks even after the script name", () => {
  assert.deepEqual(extractEnvFileArg(["status", "--env-file", "x"]), { envFile: null, rest: ["status", "--env-file", "x"] })
})
