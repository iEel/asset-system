export type AuditOfflineScanPayload = {
  assetId: string
  actualLocationId: string | null
  actualCustodianId: string | null
  actualDepartmentId: string | null
  actualConditionId: string | null
  scanSource: "manual" | "qr"
  applyCorrections: boolean
  remark: string | null
}

export type QueuedAuditScan = AuditOfflineScanPayload & {
  id: string
  queuedAt: string
}

export type AuditOfflineStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export function createAuditOfflineQueueKey(roundId: string) {
  return `audit-offline-scan:${roundId}`
}

export function loadQueuedAuditScans(storage: AuditOfflineStorage, roundId: string): QueuedAuditScan[] {
  const raw = storage.getItem(createAuditOfflineQueueKey(roundId))
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isQueuedAuditScan)
  } catch {
    return []
  }
}

export function addQueuedAuditScan(
  storage: AuditOfflineStorage,
  roundId: string,
  payload: AuditOfflineScanPayload,
  now = new Date()
) {
  const queued: QueuedAuditScan = {
    ...payload,
    id: `${now.getTime()}-${payload.assetId}`,
    queuedAt: now.toISOString(),
  }
  const nextQueue = [...loadQueuedAuditScans(storage, roundId), queued]
  storage.setItem(createAuditOfflineQueueKey(roundId), JSON.stringify(nextQueue))
  return queued
}

export function removeQueuedAuditScan(storage: AuditOfflineStorage, roundId: string, queuedId: string) {
  const nextQueue = loadQueuedAuditScans(storage, roundId).filter((item) => item.id !== queuedId)
  if (nextQueue.length === 0) storage.removeItem(createAuditOfflineQueueKey(roundId))
  else storage.setItem(createAuditOfflineQueueKey(roundId), JSON.stringify(nextQueue))
  return nextQueue
}

function isQueuedAuditScan(value: unknown): value is QueuedAuditScan {
  if (!value || typeof value !== "object") return false
  const candidate = value as Partial<QueuedAuditScan>
  return (
    typeof candidate.id === "string" &&
    typeof candidate.queuedAt === "string" &&
    typeof candidate.assetId === "string" &&
    (candidate.scanSource === "manual" || candidate.scanSource === "qr") &&
    typeof candidate.applyCorrections === "boolean"
  )
}
