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
  ])
})

test("cleanup allows apply mode outside production when fully confirmed", () => {
  const options = parseCleanupArgs(["--apply", "--confirm-delete", "--asset-tag-prefix", "TEST-"])

  assert.deepEqual(
    getCleanupSafetyErrors(options, {
      ALLOW_TEST_DATA_CLEANUP: "true",
      NODE_ENV: "development",
    }),
    []
  )
})

test("cleanup refuses apply mode in production without the production override", () => {
  const options = parseCleanupArgs(["--apply", "--confirm-delete", "--asset-tag-prefix", "TEST-"])

  assert.deepEqual(
    getCleanupSafetyErrors(options, {
      ALLOW_TEST_DATA_CLEANUP: "true",
      NODE_ENV: "production",
    }),
    ["Production cleanup is blocked unless ALLOW_PRODUCTION_TEST_DATA_CLEANUP=true is set."]
  )
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
