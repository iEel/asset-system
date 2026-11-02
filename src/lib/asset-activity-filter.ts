import type { Prisma } from "@prisma/client"
import { ASSET_MOVEMENT_NOT_ACTIVITY_TYPES } from "./asset-movement-labels.ts"

export type AssetActivityFilter = "" | "idle_180d"

export function normalizeAssetActivityFilter(value: unknown): AssetActivityFilter {
  return value === "idle_180d" ? "idle_180d" : ""
}

export function getIdleAssetCutoff(now = new Date()) {
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - 180)
  return cutoff
}

export function getAssetActivityWhere(activity: AssetActivityFilter, now = new Date()): Prisma.AssetWhereInput | null {
  return activity === "idle_180d"
    ? { movements: { none: { performedAt: { gte: getIdleAssetCutoff(now) }, movementType: { notIn: [...ASSET_MOVEMENT_NOT_ACTIVITY_TYPES] } } } }
    : null
}
