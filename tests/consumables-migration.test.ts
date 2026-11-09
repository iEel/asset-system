import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

import { permissionGroupOf } from "../src/lib/permission-groups.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const migrationPath = "prisma/manual-migrations/2026-11-10-add-consumables.sql"

const namedObjects = [
  "PK_consumable_items",
  "PK_consumable_movements",
  "FK_consumable_movements_itemId",
  "FK_consumable_movements_assetId",
  "UX_consumable_items_name_active",
  "IX_consumable_movements_item_performedAt",
  "IX_consumable_movements_asset_performedAt",
]

// The SQL with comment lines removed, so the header and rollback note do not count as statements.
function statements(sql: string) {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
}

test("the consumables migration creates both tables behind guards and names every object", () => {
  assert.equal(existsSync(migrationPath), true, "migration should exist")
  const sql = read(migrationPath)

  assert.ok(sql.includes("npm run migration:apply -- 2026-11-10-add-consumables.sql"), "the header names the apply command")
  assert.match(sql, /-- Rollback/, "the rollback is a comment")
  for (const table of ["consumable_items", "consumable_movements"]) {
    assert.ok(
      sql.includes(`IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'[dbo].[${table}]') AND type = N'U')`),
      `${table} is created behind a sys.tables guard`,
    )
  }
  for (const name of namedObjects) assert.ok(sql.includes(name), `${name} is named`)

  const body = statements(sql)
  assert.match(body, /\[name\]\s+NVARCHAR\(100\)\s+NOT\s+NULL/i)
  assert.match(body, /\[unit\]\s+NVARCHAR\(20\)\s+NOT\s+NULL\s+CONSTRAINT\s+\[DF_consumable_items_unit\]\s+DEFAULT\s+N'ชิ้น'/i)
  assert.match(body, /\[minQuantity\]\s+INT\s+NOT\s+NULL/i)
  assert.match(body, /\[onHand\]\s+INT\s+NOT\s+NULL/i)
  assert.match(body, /\[quantityChange\]\s+INT\s+NOT\s+NULL/i)
  assert.match(body, /\[onHandAfter\]\s+INT\s+NOT\s+NULL/i)
  assert.match(body, /\[assetId\]\s+NVARCHAR\(1000\)\s+NULL/i)
  assert.match(body, /\[receivedDate\]\s+DATE\s+NULL/i)
  assert.match(body, /\[reason\]\s+NVARCHAR\(500\)\s+NULL/i)
  assert.match(body, /\[note\]\s+NVARCHAR\(500\)\s+NULL/i)
  assert.match(body, /\[performedBy\]\s+NVARCHAR\(100\)\s+NOT\s+NULL/i)

  // The unique name holds among active items only; the migration owns the filter.
  assert.match(
    body,
    /CREATE\s+UNIQUE\s+(NONCLUSTERED\s+)?INDEX\s+\[UX_consumable_items_name_active\][\s\S]*?\(\[name\]\)\s*WHERE\s+\[isActive\]\s*=\s*1/i,
  )
  assert.match(body, /\[IX_consumable_movements_item_performedAt\][\s\S]*?\(\[itemId\],\s*\[performedAt\]\)/i)
  assert.match(body, /\[IX_consumable_movements_asset_performedAt\][\s\S]*?\(\[assetId\],\s*\[performedAt\]\)/i)

  // No destructive statement outside the rollback comment (string literals such as the action N'delete' are not statements).
  const withoutReferentialActions = body
    .replace(/\bON\s+(DELETE|UPDATE)\s+NO\s+ACTION\b/gi, "")
    .replace(/N'(?:[^']|'')*'/g, "''")
  assert.doesNotMatch(withoutReferentialActions, /\bDROP\b/i)
  assert.doesNotMatch(withoutReferentialActions, /\bDELETE\b/i)
  assert.doesNotMatch(withoutReferentialActions, /\bUPDATE\b/i)
})

test("the migration inserts the six consumable permissions where missing", () => {
  const body = statements(read(migrationPath))
  assert.match(body, /INSERT\s+INTO\s+\[dbo\]\.\[permissions\]/i)
  for (const action of ["view", "create", "edit", "delete", "export", "approve"]) {
    assert.ok(body.includes(`(N'${action}')`), `action ${action} is listed`)
  }
  assert.ok(body.includes("N'consumable'"), "the module is consumable")
  assert.match(body, /WHERE\s+NOT\s+EXISTS\s*\([\s\S]*?\[dbo\]\.\[permissions\]/i, "permissions are inserted where missing")
})

test("the migration grants the consumable permissions to system_admin only", () => {
  const body = statements(read(migrationPath))
  const grants = Array.from(body.matchAll(/INSERT\s+INTO\s+\[dbo\]\.\[role_permissions\][\s\S]*?;/gi), (match) => match[0])
  assert.equal(grants.length, 1, "one grant statement")
  const grant = grants[0]
  assert.match(grant, /WHERE\s+r\.\[?name\]?\s*=\s*N?'system_admin'/i)
  assert.match(grant, /NOT\s+EXISTS\s*\([\s\S]*?\[dbo\]\.\[role_permissions\]/i, "grants are inserted where missing")
  const roleNames = Array.from(grant.matchAll(/r\.\[?name\]?\s*(?:=|IN)\s*\(?\s*N?'([^']+)'/gi), (match) => match[1])
  assert.deepEqual(roleNames, ["system_admin"], "no other role is granted")
  for (const other of ["admin", "asset_manager", "auditor", "viewer", "user", "manager"]) {
    assert.doesNotMatch(grant, new RegExp(`'${other}'`), `${other} is not granted`)
  }
})

test("the Prisma schema maps both tables and the index names match the SQL", () => {
  const schema = read("prisma/schema.prisma")
  assert.ok(schema.includes('@@map("consumable_items")'))
  assert.ok(schema.includes('@@map("consumable_movements")'))
  assert.match(schema, /@@index\(\[name\], map: "UX_consumable_items_name_active"\)/)
  assert.match(schema, /@@index\(\[itemId, performedAt\], map: "IX_consumable_movements_item_performedAt"\)/)
  assert.match(schema, /@@index\(\[assetId, performedAt\], map: "IX_consumable_movements_asset_performedAt"\)/)
  assert.match(schema, /consumableMovements\s+ConsumableMovement\[\]/)
})

test("consumable sits in the operations group and the seed's modules", () => {
  assert.equal(permissionGroupOf("consumable"), "operations")
  const seed = read("prisma/seed.ts")
  const block = seed.match(/const modules = \[([\s\S]*?)\]/)
  assert.ok(block, "the seed's modules list")
  assert.ok(block[1].includes('"consumable"'), "the seed lists consumable")
})
