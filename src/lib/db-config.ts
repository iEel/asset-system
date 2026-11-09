import { PrismaMssql } from "@prisma/adapter-mssql"

type EnvSource = Record<string, string | undefined>

function read(source: EnvSource, name: string) {
  return source[name]?.trim().replace(/^"|"$/g, "")
}

function databaseFromUrl(env: (name: string) => string | undefined) {
  const database = env("DATABASE_URL")?.match(/(?:^|;)database=([^;]+)/i)?.[1]
  return database ? decodeURIComponent(database) : undefined
}

// The app reads process.env; the E2E setup helper (e2e/audit/inspection-setup.ts) passes the env it read and checked.
export function createMssqlAdapter(source: EnvSource = process.env) {
  const env = (name: string) => read(source, name)
  const server = env("DB_SERVER")
  const instanceName = env("DB_INSTANCE")
  const tlsServerName = env("DB_TLS_SERVER_NAME")
  const port = instanceName ? undefined : Number(env("DB_PORT") ?? "1433")
  const user = env("DB_USER")
  const password = env("DB_PASSWORD")
  const database = databaseFromUrl(env)

  if (!server || !user || !password || !database) {
    throw new Error("Missing SQL Server connection settings in environment variables")
  }

  return new PrismaMssql({
    server,
    ...(port ? { port } : {}),
    database,
    user,
    password,
    options: {
      ...(instanceName ? { instanceName } : {}),
      ...(tlsServerName ? { serverName: tlsServerName } : {}),
      encrypt: true,
      trustServerCertificate: true,
    },
  })
}
