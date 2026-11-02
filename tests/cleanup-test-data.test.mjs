import assert from "node:assert/strict"
import test from "node:test"

import {
  applyCleanup,
  buildAssetWhereFilter,
  collectCleanupSummary,
  formatCleanupSummary,
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

// Group 4 plan 6 (P6-R14): asset_label_prints point at the asset with NoAction, so a printed E2E asset blocked the
// cleanup on the foreign key. The prints go first, then the batches left with no item, then the existing order.
function fakePrisma({ assets, labelPrints = [], batches = [] }) {
  const calls = []
  const delegate = (name, findMany = async () => []) =>
    new Proxy(
      { findMany },
      {
        get(target, prop) {
          if (prop in target) return target[prop]
          if (prop === "deleteMany" || prop === "updateMany") {
            return async (args) => {
              calls.push({ delegate: name, op: prop, args })
              return { count: 1 }
            }
          }
          return undefined
        },
      }
    )
  const prisma = new Proxy(
    {
      asset: delegate("asset", async (args) => (args.where?.OR ? [] : assets)),
      assetLabelPrint: delegate("assetLabelPrint", async () => labelPrints),
      assetLabelPrintBatch: delegate("assetLabelPrintBatch", async (args) =>
        batches.filter((batch) => args.where.id.in.includes(batch.id))
      ),
      async $transaction(callback) {
        return callback(prisma)
      },
    },
    {
      get(target, prop) {
        if (!(prop in target)) target[prop] = delegate(prop)
        return target[prop]
      },
    }
  )
  return { prisma, calls }
}

const printedAsset = { id: "a1", assetTag: "E2E-1", name: "Printed", createdAt: new Date(0), createdBy: "e2e" }
const printedRows = {
  assets: [printedAsset],
  labelPrints: [
    { id: "p1", batchId: "b-own" },
    { id: "p2", batchId: "b-shared" },
  ],
  batches: [
    { id: "b-own", _count: { items: 1 } },
    { id: "b-shared", _count: { items: 2 } },
  ],
}

test("cleanup collects a printed asset's label prints and the batches it empties", async () => {
  const { prisma } = fakePrisma(printedRows)
  const options = parseCleanupArgs(["--asset-tag-prefix", "E2E-"])
  const summary = await collectCleanupSummary(prisma, options)

  assert.deepEqual(summary.related.assetLabelPrints.map((row) => row.id), ["p1", "p2"])
  assert.deepEqual(summary.related.assetLabelPrintBatchesToDelete.map((batch) => batch.id), ["b-own"])
  const text = formatCleanupSummary(summary, options)
  assert.match(text, /- label prints: 2/)
  assert.match(text, /- label print batches left empty: 1/)
})

test("cleanup deletes label prints first, then the batches left with no item, before the assets", async () => {
  const { prisma, calls } = fakePrisma(printedRows)
  const summary = await collectCleanupSummary(prisma, parseCleanupArgs(["--asset-tag-prefix", "E2E-"]))
  const counts = await applyCleanup(prisma, summary)

  const deletes = calls.filter((call) => call.op === "deleteMany").map((call) => call.delegate)
  assert.equal(deletes[0], "assetLabelPrint")
  assert.equal(deletes[1], "assetLabelPrintBatch")
  assert.ok(deletes.indexOf("assetLabelPrintBatch") < deletes.indexOf("asset"), "batches go before the assets")
  assert.deepEqual(calls.find((call) => call.delegate === "assetLabelPrint").args, { where: { id: { in: ["p1", "p2"] } } })
  // Only a batch with no item left goes: the shared batch keeps the other asset's print.
  assert.deepEqual(calls.find((call) => call.delegate === "assetLabelPrintBatch").args, {
    where: { id: { in: ["b-own", "b-shared"] }, items: { none: {} } },
  })
  assert.equal(counts.assetLabelPrints, 1)
  assert.equal(counts.assetLabelPrintBatches, 1)
})
