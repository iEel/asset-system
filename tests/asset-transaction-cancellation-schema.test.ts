import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const schema = readFileSync("prisma/schema.prisma", "utf8")

function modelBody(name: string): string {
  const match = schema.match(new RegExp(`model ${name} \\{([\\s\\S]*?)\\n\\}`))
  assert.ok(match, `Prisma model ${name} must exist`)
  return match[1]
}

test("checkout and checkin retain reversible transaction metadata", () => {
  for (const name of ["AssetCheckout", "AssetCheckin"]) {
    const body = modelBody(name)
    assert.match(body, /transactionStatus\s+String\s+@default\("active"\)\s+@db\.NVarChar\(20\)/)
    assert.match(body, /beforeSnapshotJson\s+String\?\s+@db\.NVarChar\(Max\)/)
    assert.match(body, /afterSnapshotJson\s+String\?\s+@db\.NVarChar\(Max\)/)
    assert.match(body, /componentSnapshotJson\s+String\?\s+@db\.NVarChar\(Max\)/)
    assert.match(body, /voidedAt\s+DateTime\?/)
    assert.match(body, /voidedBy\s+String\?\s+@db\.NVarChar\(100\)/)
    assert.match(body, /voidReason\s+String\?\s+@db\.NVarChar\(Max\)/)
    assert.match(body, /updatedAt\s+DateTime\s+@updatedAt/)
  }
})

test("a void checkin does not prevent a new active checkin for the reopened checkout", () => {
  const body = modelBody("AssetCheckin")
  assert.match(body, /checkoutId\s+String(?:\s|$)/)
  assert.doesNotMatch(body, /checkoutId\s+String\s+@unique/)
  assert.match(body, /@@index\(\[checkoutId\]\)/)

  const migration = readFileSync(
    "prisma/manual-migrations/2026-08-27-add-reversible-asset-transactions.sql",
    "utf8"
  )
  assert.match(migration, /DROP INDEX|DROP CONSTRAINT/)
  assert.match(migration, /CREATE UNIQUE INDEX \[UX_asset_checkins_active_checkoutId\]/)
  assert.match(migration, /WHERE \[transactionStatus\] = N'active'/)
})

test("transfer documents preserve snapshots and cancellation history", () => {
  const body = modelBody("AssetTransfer")
  assert.match(body, /documentNo\s+String\s+@unique\s+@db\.NVarChar\(50\)/)
  assert.match(body, /asset\s+Asset\s+@relation/)
  assert.match(body, /beforeSnapshotJson\s+String\s+@db\.NVarChar\(Max\)/)
  assert.match(body, /afterSnapshotJson\s+String\s+@db\.NVarChar\(Max\)/)
  assert.match(body, /componentSnapshotJson\s+String\s+@db\.NVarChar\(Max\)/)
  assert.match(body, /transactionStatus\s+String\s+@default\("active"\)/)
  assert.match(body, /@@index\(\[assetId, transactionStatus, createdAt\]/)
  assert.match(body, /@@map\("asset_transfers"\)/)
  assert.match(modelBody("Asset"), /transfers\s+AssetTransfer\[\]/)
})

test("manual migration is guarded and leaves legacy snapshots nullable", () => {
  const migration = readFileSync(
    "prisma/manual-migrations/2026-08-27-add-reversible-asset-transactions.sql",
    "utf8"
  )

  assert.match(migration, /COL_LENGTH\('dbo\.asset_checkouts', 'transactionStatus'\) IS NULL/)
  assert.match(migration, /COL_LENGTH\('dbo\.asset_checkins', 'beforeSnapshotJson'\) IS NULL/)
  assert.match(migration, /OBJECT_ID\(N'\[dbo\]\.\[asset_transfers\]'/)
  assert.match(migration, /CREATE TABLE \[dbo\]\.\[asset_transfers\]/)
  assert.match(migration, /\[beforeSnapshotJson\] NVARCHAR\(MAX\) NULL/)
  assert.doesNotMatch(migration, /UPDATE \[dbo\]\.\[asset_checkouts\][\s\S]*beforeSnapshotJson/i)
  assert.doesNotMatch(migration, /INSERT INTO \[dbo\]\.\[asset_transfers\]/i)
})
