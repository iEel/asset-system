import type { Prisma } from "@prisma/client"

import type { AssetAction, AssetActionSet } from "./asset-actions.ts"
import {
  isAssetOperationSearchReady,
  isAssetOperationSearchTooLong,
  splitAssetOperationSearchWords,
} from "./asset-operation-search-rules.ts"
import type { RegisterHolderLine } from "./asset-register-row-rules.ts"

// The rules of the scan page's search (group 4 plan 4 Task 4, spec §14): the query, the where clauses, the ranking, the
// field each result matched and the answer. Client-safe (type-only imports but the transaction search's text rules,
// relative imports): the page imports the constants, the href and the types. The 2-100 code-point rules and the word
// split are the transaction pages' (asset-operation-search-rules.ts), so every search reads text the same way.

export const assetScanSearchLimit = 8
/** A card names at most this many of the asset's installed components ("ส่วนควบ n รายการ · a, b, c"). */
export const assetScanComponentNamesShown = 3
export const assetScanSearchPath = "/api/assets/scan-search"

export type AssetScanSearchInput = {
  q: string
  /** The page's language: the action hrefs and the status and condition labels follow it. */
  locale: "th" | "en"
}

const invalidSearch = { error: "Invalid search" } as const

/** q is trimmed and must hold 2-100 code points; the locale is "en" or else "th" (as /api/search). */
export function parseAssetScanSearch(params: URLSearchParams): AssetScanSearchInput | { error: "Invalid search" } {
  const q = params.get("q")?.trim() ?? ""
  if (!isAssetOperationSearchReady(q) || isAssetOperationSearchTooLong(q)) return { ...invalidSearch }
  return { q, locale: params.get("locale") === "en" ? "en" : "th" }
}

/** Every client search URL is built here, with the names the route's parse reads. */
export function buildAssetScanSearchHref(input: AssetScanSearchInput): string {
  const params = new URLSearchParams()
  params.append("q", input.q)
  params.append("locale", input.locale)
  return `${assetScanSearchPath}?${params.toString()}`
}

/** The fields searched, in the "ตรงกับ" order (P4-R7): รหัสทรัพย์สิน, Serial, ชื่อ, ผู้ถือครอง, ที่ตั้ง, รุ่น. */
export const assetScanMatchFields = ["tag", "serial", "name", "holder", "room", "model"] as const
export type AssetScanMatchField = (typeof assetScanMatchFields)[number]

/** One word's clause: any field, holder and room by code or name. */
function wordClause(word: string): Prisma.AssetWhereInput {
  return {
    OR: [
      { assetTag: { contains: word } },
      { serialNumber: { contains: word } },
      { name: { contains: word } },
      { custodian: { code: { contains: word } } },
      { custodian: { fullNameTh: { contains: word } } },
      { currentLocation: { code: { contains: word } } },
      { currentLocation: { name: { contains: word } } },
      { model: { name: { contains: word } } },
    ],
  }
}

export function buildAssetScanSearchWheres(input: AssetScanSearchInput): {
  text: Prisma.AssetWhereInput
  exact: Prisma.AssetWhereInput
  prefix: Prisma.AssetWhereInput
} {
  const { q } = input
  // Active assets of every status, as the register's ทั้งหมด (call 3).
  const base = { isActive: true }
  // Every word must match a field (AND over words, OR over fields); the code tiers keep the whole text. Each word is a
  // part of q, so an exact or prefix hit is always a text hit and the text count is the match count.
  const clauses = splitAssetOperationSearchWords(q).map(wordClause)
  const text: Prisma.AssetWhereInput = clauses.length === 1 ? { ...base, ...clauses[0] } : { ...base, AND: clauses }
  return {
    text,
    exact: { ...base, OR: [{ assetTag: q }, { serialNumber: q }] },
    prefix: { ...base, OR: [{ assetTag: { startsWith: q } }, { serialNumber: { startsWith: q } }] },
  }
}

export const assetScanSearchSelect = {
  id: true,
  assetTag: true,
  name: true,
  serialNumber: true,
  ownershipType: true,
  custodianId: true,
  status: { select: { name: true, nameTh: true } },
  condition: { select: { name: true, nameTh: true } },
  custodian: { select: { code: true, fullNameTh: true, department: { select: { name: true } } } },
  currentLocation: { select: { code: true, name: true, branch: { select: { name: true } } } },
  model: { select: { name: true } },
} satisfies Prisma.AssetSelect
export type AssetScanSearchAsset = Prisma.AssetGetPayload<{ select: typeof assetScanSearchSelect }>

/** What the match reads of an asset. */
export type AssetScanMatchSource = {
  assetTag: string
  serialNumber: string | null
  name: string
  custodian: { code: string; fullNameTh: string } | null
  currentLocation: { code: string; name: string } | null
  model: { name: string } | null
}

function fieldValues(asset: AssetScanMatchSource): ReadonlyArray<readonly [AssetScanMatchField, string | null | undefined]> {
  return [
    ["tag", asset.assetTag],
    ["serial", asset.serialNumber],
    ["name", asset.name],
    ["holder", asset.custodian?.code],
    ["holder", asset.custodian?.fullNameTh],
    ["room", asset.currentLocation?.code],
    ["room", asset.currentLocation?.name],
    ["model", asset.model?.name],
  ]
}

function findField(asset: AssetScanMatchSource, needle: string): { field: AssetScanMatchField; text: string } | null {
  const lower = needle.toLocaleLowerCase()
  if (!lower) return null
  for (const [field, value] of fieldValues(asset)) {
    if (value && value.toLocaleLowerCase().includes(lower)) return { field, text: value }
  }
  return null
}

/**
 * The field a result matched and that field's value: the first field, in P4-R7 order, holding the whole q
 * (case-insensitive, as the database compares), else the field of the first word. A holder or room matched by its code
 * gives the code, by its name the name. A row the database found by a comparison JavaScript does not repeat (none
 * today) falls back to its tag.
 */
export function getAssetScanMatch(
  asset: AssetScanMatchSource,
  q: string,
  words: readonly string[],
): { field: AssetScanMatchField; text: string } {
  return findField(asset, q) ?? (words[0] ? findField(asset, words[0]) : null) ?? { field: "tag", text: asset.assetTag }
}

/** The tag or the Serial equals q (case-insensitive, as the database compares): Enter opens it (P4-R2). */
export function isAssetScanExactMatch(asset: { assetTag: string; serialNumber: string | null }, q: string): boolean {
  const lower = q.toLocaleLowerCase()
  return asset.assetTag.toLocaleLowerCase() === lower || (asset.serialNumber?.toLocaleLowerCase() ?? null) === lower
}

/**
 * Exact tags and Serials first, then those that start with the text, then the rest; each asset at its first appearance,
 * at most 8. Each list is ordered by tag with take 8, so the first 8 of each contain the first 8 of the merge.
 */
export function rankAssetScanMatches<T extends { id: string }>(lists: {
  exact: readonly T[]
  prefix: readonly T[]
  contains: readonly T[]
}): T[] {
  const seen = new Set<string>()
  const ranked: T[] = []
  for (const row of [...lists.exact, ...lists.prefix, ...lists.contains]) {
    if (ranked.length >= assetScanSearchLimit) break
    if (seen.has(row.id)) continue
    seen.add(row.id)
    ranked.push(row)
  }
  return ranked
}

export type AssetScanRow = {
  id: string
  assetTag: string
  /** Rows show the name first (spec §5). */
  name: string
  serialNumber: string | null
  /** The asset page: /<locale>/assets/<id>. */
  href: string
  /** `label` is in the page's language (nameTh for th, name for en). */
  status: { name: string; label: string }
  condition: { name: string; label: string }
  holder: RegisterHolderLine
  room: { name: string; branchName: string | null } | null
  /** The installed components: how many, and the first 3 names, oldest install first. */
  components: { count: number; names: string[] }
  match: { field: AssetScanMatchField; text: string }
  /** The tag or the Serial equals q (P4-R2). */
  exact: boolean
  /** The register's rule with the user's permissions and the scan page's returnTo; only actions that can run now (P4-R7). */
  actions: AssetActionSet
  /** บันทึกซ่อม (maintenance:create), when it is not already the primary. */
  recordRepair: AssetAction | null
  /** พิมพ์ป้าย: /<locale>/assets/<id>/label (asset:view, so always). */
  printLabelHref: string
}

export type AssetScanSearchAnswer = {
  /** Every text match; at most 8 are in rows. */
  total: number
  rows: AssetScanRow[]
}

// The page's two choices over an answer (group 4 plan 4 Task 5). Enter opens an asset only when exactly one card is an
// exact tag or Serial match (P4-R2); typing alone never opens anything.
export function getAssetScanEnterTarget<T extends { exact: boolean }>(rows: readonly T[]): T | null {
  const exact = rows.filter((row) => row.exact)
  return exact.length === 1 ? exact[0] : null
}

// The heading names the field only when every card matched the same one; otherwise each card names its own (P4-R7).
export function getAssetScanSharedMatchField<F extends string>(rows: readonly { match: { field: F } }[]): F | null {
  const field = rows[0]?.match.field
  if (field === undefined) return null
  return rows.every((row) => row.match.field === field) ? field : null
}
