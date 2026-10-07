"use client"

import { useCallback, useSyncExternalStore } from "react"
import {
  buildAuditScanContextStorageKey,
  emptyAuditScanContext,
  normalizeAuditScanContext,
  type AuditScanContext,
} from "@/lib/audit-scan-context"

// Private browsing can block localStorage; the room still works for this tab.
const memoryStore = new Map<string, string>()
const snapshotCache = new Map<string, { raw: string | null; value: AuditScanContext }>()

function readRaw(storageKey: string) {
  try {
    return window.localStorage.getItem(storageKey)
  } catch {
    return memoryStore.get(storageKey) ?? null
  }
}

function readRoom(storageKey: string): AuditScanContext {
  const raw = readRaw(storageKey)
  const cached = snapshotCache.get(storageKey)
  if (cached && cached.raw === raw) return cached.value
  let value = emptyAuditScanContext
  if (raw) {
    try {
      value = normalizeAuditScanContext(JSON.parse(raw) as Partial<AuditScanContext>)
    } catch {
      value = emptyAuditScanContext
    }
  }
  snapshotCache.set(storageKey, { raw, value })
  return value
}

export function useAuditScanRoom(roundId: string) {
  const storageKey = buildAuditScanContextStorageKey(roundId)
  const room = useSyncExternalStore(
    (onChange) => {
      window.addEventListener(storageKey, onChange)
      window.addEventListener("storage", onChange)
      return () => {
        window.removeEventListener(storageKey, onChange)
        window.removeEventListener("storage", onChange)
      }
    },
    () => readRoom(storageKey),
    () => emptyAuditScanContext,
  )

  const setRoom = useCallback((next: AuditScanContext) => {
    const raw = JSON.stringify(normalizeAuditScanContext(next))
    try {
      window.localStorage.setItem(storageKey, raw)
    } catch {
      memoryStore.set(storageKey, raw)
    }
    window.dispatchEvent(new Event(storageKey))
  }, [storageKey])

  return [room, setRoom] as const
}
