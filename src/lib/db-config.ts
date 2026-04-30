import { PrismaMssql } from "@prisma/adapter-mssql"

function env(name: string) {
  return process.env[name]?.trim().replace(/^"|"$/g, "")
}

function databaseFromUrl() {
  const database = env("DATABASE_URL")?.match(/(?:^|;)database=([^;]+)/i)?.[1]
  return database ? decodeURIComponent(database) : undefined
}

export function createMssqlAdapter() {
  const server = env("DB_SERVER")
  const instanceName = env("DB_INSTANCE")
  const tlsServerName = env("DB_TLS_SERVER_NAME")
  const port = instanceName ? undefined : Number(env("DB_PORT") ?? "1433")
  const user = env("DB_USER")
  const password = env("DB_PASSWORD")
  const database = databaseFromUrl()

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
