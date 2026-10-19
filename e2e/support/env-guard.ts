// The E2E guard (spec §5 "The database", §11 "Uploads" and "The approval settings"): pure checks on the environment the
// app under test reads, on its upload folder, on the approval settings and on the run id. tests/e2e-guard.test.ts runs
// them on stand-in values. Every message names a database, a login or a setting, never a password or a connection
// string.
import path from "node:path"
import {
  parseWorkflowApprovalPolicy,
  workflowApprovalDefaults,
  workflowApprovalSettingKeys,
  type WorkflowApprovalPolicy,
} from "../../src/lib/workflow-approval.ts"

export const DEV_DATABASE = "asset_management_dev"
export const DEV_LOGIN = "asset_dev"
export const PRODUCTION_DATABASE = "asset_management"

type Env = Record<string, string | undefined>

export class E2eGuardError extends Error {
  name = "E2eGuardError"
}

// As src/lib/db-config.ts reads a variable: trimmed, without surrounding double quotes.
function clean(value: string | undefined): string | undefined {
  const cleaned = value?.trim().replace(/^"|"$/g, "")
  return cleaned ? cleaned : undefined
}

// The database and the login the app connects with, read as src/lib/db-config.ts reads them: the database from
// DATABASE_URL's database=…, the login from DB_USER.
export function databaseTarget(env: Env): { database?: string; login?: string } {
  const database = clean(env.DATABASE_URL)?.match(/(?:^|;)database=([^;]+)/i)?.[1]
  return { database: database ? decodeURIComponent(database) : undefined, login: clean(env.DB_USER) }
}

// Stops on anything but the dev database with the dev login, above all on asset_management (Production).
export function assertDevDatabase(env: Env): { database: string; login: string } {
  const { database, login } = databaseTarget(env)
  const problems: string[] = []
  if (!database) problems.push("DATABASE_URL names no database")
  else if (database.toLowerCase() === PRODUCTION_DATABASE) problems.push(`the database is ${PRODUCTION_DATABASE}, the Production database`)
  else if (database.toLowerCase() !== DEV_DATABASE) problems.push(`the database is ${database}, not ${DEV_DATABASE}`)
  if (!login) problems.push("DB_USER is empty")
  else if (login.toLowerCase() !== DEV_LOGIN) problems.push(`the login is ${login}, not ${DEV_LOGIN}`)
  for (const key of ["DB_SERVER", "DB_PASSWORD"]) if (!clean(env[key])) problems.push(`${key} is empty`)
  if (problems.length > 0 || !database || !login) {
    throw new E2eGuardError(`E2E guard stopped the run: ${problems.join("; ")}. The suite runs only on ${DEV_DATABASE} with the login ${DEV_LOGIN}.`)
  }
  return { database, login }
}

// The upload folder must be a local folder inside the project (spec §11 "Uploads": UPLOAD_DIR is the relative ./uploads
// on this machine), never a network share or a server path such as /var/www/asset-system/uploads.
export function assertLocalUploadDir(env: Env, root: string): { setting: string; resolved: string } {
  const setting = clean(env.UPLOAD_DIR) ?? "./uploads"
  if (/^(?:\\\\|\/\/)/.test(setting)) {
    throw new E2eGuardError(`E2E guard stopped the run: UPLOAD_DIR is a network path. The suite uploads only into a folder inside the project.`)
  }
  const resolved = path.resolve(root, setting)
  const relative = path.relative(root, resolved)
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new E2eGuardError(`E2E guard stopped the run: UPLOAD_DIR (${setting}) is not a folder inside the project. The suite uploads only into a folder inside the project.`)
  }
  return { setting, resolved }
}

// The approval settings, read with a GET before the run (spec §11): the suite asserts the defaults (segregation on)
// and never changes them, because the settings save is off limits. Any difference stops the run with what differs.
// GET /api/admin/settings answers every known setting: a stored row with its own id, and a default the database does
// not hold with its key as its id (src/app/api/admin/settings/route.ts, missingDefaults). storedKeys are the rows.
export function checkApprovalPolicy(settings: readonly { key: string; value: string; id?: string }[]): { policy: WorkflowApprovalPolicy; storedKeys: string[] } {
  const keys = new Set<string>(workflowApprovalSettingKeys)
  const approval = settings.filter((setting) => keys.has(setting.key))
  const stored = approval.filter((setting) => setting.id !== undefined && setting.id !== setting.key)
  const policy = parseWorkflowApprovalPolicy(approval)
  const differences = (Object.keys(workflowApprovalDefaults) as (keyof WorkflowApprovalPolicy)[])
    .filter((key) => policy[key] !== workflowApprovalDefaults[key])
    .map((key) => `${key} is ${policy[key]} (the default is ${workflowApprovalDefaults[key]})`)
  if (differences.length > 0) {
    throw new E2eGuardError(`E2E guard stopped the run: the approval settings differ from the defaults the suite asserts: ${differences.join("; ")}. The suite never changes them; ask the user.`)
  }
  return { policy, storedKeys: stored.map((setting) => setting.key).sort() }
}

// The run id (spec §5: "E2E-" plus a run id, for example E2E-1019A): E2E-, the month and day, and the letter after the
// last one used that day; after Z, T and the time. Earlier runs are found in the codes and usernames they left.
const RUN_ID_IN_CODE = /E2E-(\d{4})(T\d{4}|[A-Z])(?![A-Za-z0-9])/gi
const RUN_ID_IN_USERNAME = /^e2e\.[a-z-]+-(\d{4})(t\d{4}|[a-z])$/i
export function runIdsIn(values: readonly string[]): string[] {
  const ids = new Set<string>()
  for (const value of values) {
    for (const match of value.matchAll(RUN_ID_IN_CODE)) ids.add(`E2E-${match[1]}${match[2].toUpperCase()}`)
    const username = value.match(RUN_ID_IN_USERNAME)
    if (username) ids.add(`E2E-${username[1]}${username[2].toUpperCase()}`)
  }
  return [...ids].sort()
}

const pad = (value: number) => String(value).padStart(2, "0")
export function nextRunId(now: Date, existing: readonly string[]): string {
  const day = `${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const letters = runIdsIn(existing)
    .filter((id) => id.startsWith(`E2E-${day}`) && id.length === 9)
    .map((id) => id.charCodeAt(8))
  const next = letters.length === 0 ? 65 : Math.max(...letters) + 1
  if (next <= 90) return `E2E-${day}${String.fromCharCode(next)}`
  return `E2E-${day}T${pad(now.getHours())}${pad(now.getMinutes())}`
}

// The run id without its E2E- prefix, lowercased: the tail of the run's usernames and role keys (1019a).
export function runSuffix(runId: string): string {
  return runId.replace(/^E2E-/, "").toLowerCase()
}
