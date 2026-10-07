import assert from "node:assert/strict"
import test from "node:test"

import {
  buildAssetWhereFilter,
  getCleanupSafetyErrors,
  parseCleanupArgs,
} from "../scripts/cleanup-test-data.mjs"

test("cleanup defaults to dry-run and requires a scoped target", () => {
  const options = parseCleanupArgs([])

  assert.equal(options.dryRun, true)
  assert.deepEqual(options.assetTagPrefixes, [])
  assert.deepEqual(getCleanupSafetyErrors(options, {}), [
    "Choose at least one cleanup scope such as --asset-tag-prefix, --asset-id, --created-by, --created-after, or --all-assets.",
  ])
})

test("cleanup blocks apply mode unless the explicit safety switches are present", () => {
  const options = parseCleanupArgs(["--apply", "--all-assets"])

  assert.equal(options.dryRun, false)
  assert.deepEqual(getCleanupSafetyErrors(options, {}), [
    "Set ALLOW_TEST_DATA_CLEANUP=true before running --apply.",
    "Pass --confirm-delete with --apply to acknowledge hard deletion.",
    "Cannot determine the target database from DATABASE_URL; refusing to apply cleanup.",
  ])
})

const devDatabaseUrl = "sqlserver://db.local;instanceName=alpha;database=asset_management_dev;user=asset_dev;password=x"
const productionDatabaseUrl = "sqlserver://db.local;instanceName=alpha;database=asset_management;user=asset_app;password=x"
const productionGuardError =
  'Database "asset_management" is not a dev/test database (its name must end with _dev or _test). Set ALLOW_PRODUCTION_TEST_DATA_CLEANUP=true and CLEANUP_CONFIRM_DATABASE=asset_management to override.'

test("cleanup allows apply mode against a dev database when fully confirmed", () => {
  const options = parseCleanupArgs(["--apply", "--confirm-delete", "--asset-tag-prefix", "TEST-"])

  assert.deepEqual(
    getCleanupSafetyErrors(options, {
      ALLOW_TEST_DATA_CLEANUP: "true",
      DATABASE_URL: devDatabaseUrl,
    }),
    []
  )
})

test("cleanup refuses to hard-delete from a production-named database even when NODE_ENV is unset", () => {
  const options = parseCleanupArgs(["--apply", "--confirm-delete", "--asset-tag-prefix", "TEST-"])

  assert.deepEqual(
    getCleanupSafetyErrors(options, {
      ALLOW_TEST_DATA_CLEANUP: "true",
      DATABASE_URL: productionDatabaseUrl,
    }),
    [productionGuardError]
  )
})

test("the production override must name the exact database being cleaned", () => {
  const options = parseCleanupArgs(["--apply", "--confirm-delete", "--asset-tag-prefix", "TEST-"])
  const env = {
    ALLOW_TEST_DATA_CLEANUP: "true",
    ALLOW_PRODUCTION_TEST_DATA_CLEANUP: "true",
    DATABASE_URL: productionDatabaseUrl,
  }

  assert.deepEqual(getCleanupSafetyErrors(options, env), [productionGuardError])
  assert.deepEqual(getCleanupSafetyErrors(options, { ...env, CLEANUP_CONFIRM_DATABASE: "asset_management_dev" }), [productionGuardError])
  assert.deepEqual(getCleanupSafetyErrors(options, { ...env, CLEANUP_CONFIRM_DATABASE: "asset_management" }), [])
})

test("NODE_ENV=production protects even a database named like a dev copy", () => {
  const options = parseCleanupArgs(["--apply", "--confirm-delete", "--asset-tag-prefix", "TEST-"])

  assert.deepEqual(
    getCleanupSafetyErrors(options, {
      ALLOW_TEST_DATA_CLEANUP: "true",
      NODE_ENV: "production",
      DATABASE_URL: devDatabaseUrl,
    }),
    [
      'Database "asset_management_dev" is protected because NODE_ENV=production. Set ALLOW_PRODUCTION_TEST_DATA_CLEANUP=true and CLEANUP_CONFIRM_DATABASE=asset_management_dev to override.',
    ]
  )
})

test("cleanup apply mode refuses to guess the database when DATABASE_URL is missing", () => {
  const options = parseCleanupArgs(["--apply", "--confirm-delete", "--asset-tag-prefix", "TEST-"])

  assert.deepEqual(getCleanupSafetyErrors(options, { ALLOW_TEST_DATA_CLEANUP: "true" }), [
    "Cannot determine the target database from DATABASE_URL; refusing to apply cleanup.",
  ])
})

test("dry-run previews do not need a database allowance", () => {
  const options = parseCleanupArgs(["--asset-tag-prefix", "TEST-"])

  assert.deepEqual(getCleanupSafetyErrors(options, { DATABASE_URL: productionDatabaseUrl }), [])
})

test("cleanup builds an AND scoped asset query from selected filters", () => {
  const options = parseCleanupArgs([
    "--asset-tag-prefix=TEST-",
    "--asset-tag-prefix",
    "TMP-",
    "--created-by",
    "admin",
    "--created-after",
    "2026-05-01",
    "--created-before",
    "2026-05-31",
  ])

  assert.deepEqual(buildAssetWhereFilter(options), {
    AND: [
      {
        OR: [{ assetTag: { startsWith: "TEST-" } }, { assetTag: { startsWith: "TMP-" } }],
      },
      { createdBy: "admin" },
      { createdAt: { gte: new Date("2026-05-01T00:00:00.000Z") } },
      { createdAt: { lte: new Date("2026-05-31T23:59:59.999Z") } },
    ],
  })
})
