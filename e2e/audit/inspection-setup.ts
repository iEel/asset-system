// The suite's one direct database write (the user, 2026-11-09, option A of inspection-confirm plan 3 task 4): no app
// path makes an asset "Under Inspection" (create and import take Draft and Ready only), so the ยืนยันผลตรวจ spec sets that
// status on its own assets here, in asset_management_dev only.
// - The env is the app's own (readAppEnv, Next's loader), read without printing or keeping a value, and passed to the
//   adapter as it is: the process environment is never changed.
// - Before it connects it stops on anything but the dev database with the dev login (E2eGuardError names the database).
// - Before it writes it reads the assets by id and stops unless every one is there and its tag carries the run's prefix
//   (`<runId>-`, as every tag the suite creates does).
// - It writes only statusId ("Under Inspection", looked up by name) and updatedBy (INSPECTION_SETUP_MARKER).
// tests/e2e-review.test.ts pins that only this file of the suite reaches the database.
import { PrismaClient } from "@prisma/client"
import { createMssqlAdapter } from "../../src/lib/db-config.ts"
import { readAppEnv } from "../support/app-env.ts"
import { DEV_DATABASE, DEV_LOGIN, databaseTarget, E2eGuardError } from "../support/env-guard.ts"
import { fromRoot } from "../support/paths.ts"

export const INSPECTION_SETUP_MARKER = "e2e-setup"
const UNDER_INSPECTION = "Under Inspection"

type Env = Record<string, string | undefined>

// The dev database with the dev login, or a stop that names the database (never the login's value or a password).
export function assertInspectionSetupTarget(env: Env): void {
  const { database, login } = databaseTarget(env)
  if (database?.toLowerCase() !== DEV_DATABASE || login?.toLowerCase() !== DEV_LOGIN) {
    throw new E2eGuardError(
      `E2E inspection setup stopped: the database is ${database ?? "not named"}; it writes only to ${DEV_DATABASE} with the dev login.`,
    )
  }
}

// Every asset asked for is there, and each tag starts with the run's prefix.
export function assertRunAssets(runId: string, assetIds: readonly string[], found: readonly { id: string; assetTag: string }[]): void {
  const prefix = `${runId}-`
  if (!/^E2E-\d{4}(?:T\d{4}|[A-Z])$/.test(runId)) throw new E2eGuardError(`E2E inspection setup stopped: ${runId} is not a run id.`)
  const byId = new Map(found.map((asset) => [asset.id, asset]))
  const missing = assetIds.filter((id) => !byId.has(id))
  if (missing.length > 0) throw new E2eGuardError(`E2E inspection setup stopped: no asset ${missing.join(", ")}.`)
  const foreign = assetIds.map((id) => byId.get(id)!).filter((asset) => !asset.assetTag.startsWith(prefix))
  if (foreign.length > 0) {
    throw new E2eGuardError(`E2E inspection setup stopped: ${foreign.map((asset) => asset.assetTag).join(", ")} is not the run's (${prefix}…).`)
  }
}

export async function markUnderInspection(runId: string, assetIds: string[]): Promise<void> {
  if (assetIds.length === 0) return
  const env = readAppEnv(fromRoot("."))
  assertInspectionSetupTarget(env)
  const db = new PrismaClient({ adapter: createMssqlAdapter(env) })
  try {
    const assets = await db.asset.findMany({ where: { id: { in: assetIds } }, select: { id: true, assetTag: true } })
    assertRunAssets(runId, assetIds, assets)
    const status = await db.assetStatus.findUnique({ where: { name: UNDER_INSPECTION }, select: { id: true } })
    if (!status) throw new Error(`no asset status named ${UNDER_INSPECTION}`)
    const written = await db.asset.updateMany({
      where: { id: { in: assetIds }, assetTag: { startsWith: `${runId}-` } },
      data: { statusId: status.id, updatedBy: INSPECTION_SETUP_MARKER },
    })
    if (written.count !== assetIds.length) throw new Error(`the setup wrote ${written.count} of ${assetIds.length} assets`)
  } finally {
    await db.$disconnect()
  }
}
