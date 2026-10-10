// Lets a migration command connect with a separate env file (for example the Production login in
// .env.prod-admin) while .env stays pointed at the dev database.
import { ManualMigrationUsageError } from "./manual-migration-ledger.ts"

type Environment = Record<string, string | undefined>

// Every setting buildManualMigrationConnectionConfig reads. None of them is inherited from .env when
// an env file is given, so a dev value can never end up in another database's connection.
const connectionKeys = ["DB_SERVER", "DB_INSTANCE", "DB_PORT", "DB_USER", "DB_PASSWORD", "DATABASE_URL", "DB_TLS_SERVER_NAME"]
const requiredConnectionKeys = ["DB_SERVER", "DB_USER", "DB_PASSWORD", "DATABASE_URL"]

export function extractEnvFileArg(argv: string[]): { envFile: string | null; rest: string[] } {
  let envFile: string | null = null
  const rest: string[] = []
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    const [flag, inlineValue] = value.split("=", 2)
    if (flag !== "--db-env") {
      rest.push(value)
      continue
    }
    const nextValue = inlineValue ?? argv[index + 1]
    if (!nextValue || (inlineValue === undefined && nextValue.startsWith("--"))) {
      throw new ManualMigrationUsageError("--db-env requires a file path")
    }
    if (envFile !== null) throw new ManualMigrationUsageError("--db-env may be provided only once")
    if (inlineValue === undefined) index += 1
    envFile = nextValue
  }
  return { envFile, rest }
}

export function withConnectionFromEnvFile(base: Environment, fileValues: Environment, fileLabel: string): Environment {
  const missing = requiredConnectionKeys.filter((key) => !fileValues[key]?.trim())
  if (missing.length > 0) {
    throw new ManualMigrationUsageError(`${fileLabel} is missing ${missing.join(", ")}`)
  }
  const env: Environment = { ...base }
  for (const key of connectionKeys) env[key] = fileValues[key]
  return env
}
