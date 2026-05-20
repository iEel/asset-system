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

export type AuditOfflinePhoto = {
  id: string
  label: string
  fileName: string
  fileType: string
  fileSize: number
  blob: Blob
}

export type QueuedAuditScan = AuditOfflineScanPayload & {
  id: string
  queuedAt: string
  syncStatus?: "pending" | "syncing" | "failed"
  lastSyncError?: string | null
  photos?: AuditOfflinePhoto[]
}

export type AuditOfflineStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export type AuditOfflineQueueStorage = {
  getQueue: (key: string) => Promise<unknown[]>
  setQueue: (key: string, value: QueuedAuditScan[]) => Promise<void>
  removeQueue: (key: string) => Promise<void>
}

const auditOfflineDbName = "asset-system-audit-offline"
const auditOfflineDbVersion = 1
const auditOfflineStoreName = "queues"

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

export async function loadQueuedAuditScansAsync(storage: AuditOfflineQueueStorage, roundId: string): Promise<QueuedAuditScan[]> {
  try {
    const parsed = await storage.getQueue(createAuditOfflineQueueKey(roundId))
    return Array.isArray(parsed) ? parsed.filter(isQueuedAuditScan) : []
  } catch {
    return []
  }
}

export async function addQueuedAuditScanAsync(
  storage: AuditOfflineQueueStorage,
  roundId: string,
  payload: AuditOfflineScanPayload,
  options: {
    photos?: AuditOfflinePhoto[]
    now?: Date
  } = {}
) {
  const now = options.now ?? new Date()
  const queued: QueuedAuditScan = {
    ...payload,
    id: `${now.getTime()}-${payload.assetId}`,
    queuedAt: now.toISOString(),
    syncStatus: "pending",
    lastSyncError: null,
    photos: options.photos ?? [],
  }
  const nextQueue = [...await loadQueuedAuditScansAsync(storage, roundId), queued]
  await storage.setQueue(createAuditOfflineQueueKey(roundId), nextQueue)
  return queued
}

export function removeQueuedAuditScan(storage: AuditOfflineStorage, roundId: string, queuedId: string) {
  const nextQueue = loadQueuedAuditScans(storage, roundId).filter((item) => item.id !== queuedId)
  if (nextQueue.length === 0) storage.removeItem(createAuditOfflineQueueKey(roundId))
  else storage.setItem(createAuditOfflineQueueKey(roundId), JSON.stringify(nextQueue))
  return nextQueue
}

export async function removeQueuedAuditScanAsync(storage: AuditOfflineQueueStorage, roundId: string, queuedId: string) {
  const nextQueue = (await loadQueuedAuditScansAsync(storage, roundId)).filter((item) => item.id !== queuedId)
  if (nextQueue.length === 0) await storage.removeQueue(createAuditOfflineQueueKey(roundId))
  else await storage.setQueue(createAuditOfflineQueueKey(roundId), nextQueue)
  return nextQueue
}

export async function markQueuedAuditScanSyncFailed(
  storage: AuditOfflineQueueStorage,
  roundId: string,
  queuedId: string,
  error: string
) {
  const nextQueue = (await loadQueuedAuditScansAsync(storage, roundId)).map((item) =>
    item.id === queuedId
      ? { ...item, syncStatus: "failed" as const, lastSyncError: error }
      : item
  )
  await storage.setQueue(createAuditOfflineQueueKey(roundId), nextQueue)
  return nextQueue
}

export function createAuditOfflineIndexedDbStorage(fallback: AuditOfflineStorage): AuditOfflineQueueStorage {
  return {
    async getQueue(key) {
      const database = await openAuditOfflineDatabase()
      if (!database) {
        const raw = fallback.getItem(key)
        if (!raw) return []
        try {
          return JSON.parse(raw) as unknown[]
        } catch {
          return []
        }
      }

      return await readQueueFromDatabase(database, key)
    },
    async setQueue(key, value) {
      const database = await openAuditOfflineDatabase()
      if (!database) {
        fallback.setItem(key, JSON.stringify(value))
        return
      }

      await writeQueueToDatabase(database, key, value)
    },
    async removeQueue(key) {
      const database = await openAuditOfflineDatabase()
      if (!database) {
        fallback.removeItem(key)
        return
      }

      await deleteQueueFromDatabase(database, key)
    },
  }
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

async function openAuditOfflineDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return null

  return await new Promise((resolve) => {
    const request = indexedDB.open(auditOfflineDbName, auditOfflineDbVersion)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(auditOfflineStoreName)) {
        database.createObjectStore(auditOfflineStoreName)
      }
    }
    request.onerror = () => resolve(null)
    request.onsuccess = () => resolve(request.result)
  })
}

function readQueueFromDatabase(database: IDBDatabase, key: string): Promise<unknown[]> {
  return new Promise((resolve) => {
    const transaction = database.transaction(auditOfflineStoreName, "readonly")
    const request = transaction.objectStore(auditOfflineStoreName).get(key)
    request.onerror = () => resolve([])
    request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : [])
  })
}

function writeQueueToDatabase(database: IDBDatabase, key: string, value: QueuedAuditScan[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(auditOfflineStoreName, "readwrite")
    transaction.onerror = () => reject(transaction.error ?? new Error("Cannot write audit offline queue"))
    transaction.oncomplete = () => resolve()
    transaction.objectStore(auditOfflineStoreName).put(value, key)
  })
}

function deleteQueueFromDatabase(database: IDBDatabase, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(auditOfflineStoreName, "readwrite")
    transaction.onerror = () => reject(transaction.error ?? new Error("Cannot delete audit offline queue"))
    transaction.oncomplete = () => resolve()
    transaction.objectStore(auditOfflineStoreName).delete(key)
  })
}
