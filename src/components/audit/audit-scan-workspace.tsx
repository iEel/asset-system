"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { AuditScanCamera } from "@/components/audit/audit-scan-camera"
import { AuditScanCheckForm, type AuditCheckComponentsState, type AuditCheckSubmission, type AuditCheckTarget } from "@/components/audit/audit-scan-check-form"
import { AuditScanCheckPanel } from "@/components/audit/audit-scan-check-panel"
import { AuditScanComponentMissingDialog } from "@/components/audit/audit-scan-component-missing-dialog"
import { AuditScanHeader } from "@/components/audit/audit-scan-header"
import { normalizeAuditLookupComponents, normalizeAuditLookupInstalledIn, toAuditOfflinePhoto } from "@/components/audit/audit-scan-helpers"
import { AuditScanLookupCard, type AuditLookupMatch, type AuditLookupState } from "@/components/audit/audit-scan-lookup-card"
import { AuditScanOfflineBar } from "@/components/audit/audit-scan-offline-bar"
import { AuditScanRoomList } from "@/components/audit/audit-scan-room-list"
import { AuditScanRoomPicker } from "@/components/audit/audit-scan-room-picker"
import { AuditScanSavedBanner, type AuditSavedNotice } from "@/components/audit/audit-scan-saved-banner"
import { AuditScanSearchField, AuditScanSearchResults } from "@/components/audit/audit-scan-search"
import type { AuditLookupAsset, AuditScanComponent, AuditScanLookupResponse, QueuedAuditPhoto } from "@/components/audit/audit-scan-types"
import { useAuditScanRoom } from "@/components/audit/use-audit-scan-room"
import { useMediaQuery } from "@/components/ui/use-media-query"
import { extractAssetLookupCandidatesFromScanValue } from "@/lib/asset-qr"
import {
  createAuditOfflineIndexedDbStorage,
  loadQueuedAuditScansAsync,
  markQueuedAuditScanSyncFailed,
  removeQueuedAuditScanAsync,
  upsertQueuedAuditScanAsync,
  type AuditOfflineQueueStorage,
  type AuditOfflineScanPayload,
  type QueuedAuditScan,
} from "@/lib/audit-offline-queue"
import {
  applyScanResult,
  auditScanListPageSize,
  auditScanPollIntervalMs,
  buildRoomList,
  buildRoomOptions,
  getCheckMode,
  isAuditSearchReady,
  mergeStatusUpdates,
  searchAuditItems,
  summarizeProgress,
  toScanPayloadValues,
  type AuditCheckValues,
  type AuditScanItemRow,
  type AuditScanListTab,
  type AuditScanOptions,
  type AuditScanRoom,
} from "@/lib/audit-scan-session"

const emptyComponents: AuditCheckComponentsState = { status: "ready", components: [], installedIn: [] }
/** A flickering tab can fire visibilitychange many times a second; returning to it pulls at most this often. */
const visibilitySyncMinGapMs = 5_000

function isRoundClosedError(message: unknown) {
  return message === "Audit round is closed" || message === "Audit round is cancelled"
}

export function AuditScanWorkspace({
  roundId,
  roundName,
  backHref,
  pendingHref,
  initialItems,
  initialServerTime,
  options,
  photoChecklistByCategory,
  canApplyCorrections,
  initialAssetId,
}: {
  roundId: string
  roundName: string
  backHref: string
  pendingHref: string
  initialItems: AuditScanItemRow[]
  initialServerTime: string
  options: AuditScanOptions
  photoChecklistByCategory: Record<string, string[]>
  canApplyCorrections: boolean
  initialAssetId?: string
}) {
  const t = useTranslations("auditScan")
  const tCommon = useTranslations("common")
  const isWide = useMediaQuery("(min-width: 64rem)")
  const [room, setRoom] = useAuditScanRoom(roundId)
  const [items, setItems] = useState(initialItems)
  const [draft, setDraft] = useState("")
  const [term, setTerm] = useState("")
  const [tab, setTab] = useState<AuditScanListTab>("pending")
  const [limit, setLimit] = useState(auditScanListPageSize)
  const initialTarget = useMemo<AuditCheckTarget | null>(() => {
    const item = initialAssetId ? initialItems.find((row) => row.assetId === initialAssetId) : undefined
    return item ? { kind: "item", item, openedMode: getCheckMode(item) } : null
  }, [initialAssetId, initialItems])
  const [target, setTarget] = useState<AuditCheckTarget | null>(initialTarget)
  const [targetKey, setTargetKey] = useState(0)
  const [openedFromSearch, setOpenedFromSearch] = useState(false)
  const [components, setComponents] = useState<AuditCheckComponentsState>(emptyComponents)
  const [missingComponent, setMissingComponent] = useState<AuditScanComponent | null>(null)
  const [lookup, setLookup] = useState<AuditLookupState>({ status: "idle" })
  const [cameraOpen, setCameraOpen] = useState(false)
  const [scanSource, setScanSource] = useState<"manual" | "qr">("manual")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<AuditSavedNotice | null>(null)
  const [photoRetry, setPhotoRetry] = useState<{ assetId: string; photos: QueuedAuditPhoto[] } | null>(null)
  const [roundClosed, setRoundClosed] = useState(false)
  const [queue, setQueue] = useState<QueuedAuditScan[]>([])
  const [online, setOnline] = useState(true)
  const [sendingQueue, setSendingQueue] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const listAreaRef = useRef<HTMLDivElement | null>(null)
  const returnRowIndexRef = useRef(-1)
  const lastSyncAtRef = useRef(0)
  /** Wide screens: where focus goes once React has committed the close/save (the saved row may be gone by then). */
  const focusListPendingRef = useRef<"list" | "return" | null>(null)
  const serverTimeRef = useRef(initialServerTime)
  const storageRef = useRef<AuditOfflineQueueStorage | null>(null)
  const syncingRef = useRef(false)
  const sendingRef = useRef(false)
  const componentsRequestRef = useRef(0)

  const locationLabels = useMemo(() => new Map(options.locations.map((option) => [option.id, option.label])), [options.locations])
  const custodianLabels = useMemo(() => new Map(options.employees.map((option) => [option.id, option.label])), [options.employees])
  const roomOptions = useMemo(() => buildRoomOptions(items, options.locations, options.departments), [items, options.locations, options.departments])
  const progress = useMemo(() => summarizeProgress(items), [items])
  const list = useMemo(() => buildRoomList({ items, room, tab, limit, locationLabels }), [items, room, tab, limit, locationLabels])
  const matches = useMemo(() => searchAuditItems(items, term, custodianLabels), [items, term, custodianLabels])
  const queuedAssetIds = useMemo(() => new Set(queue.map((entry) => entry.assetId)), [queue])
  const liveItem = target?.kind === "item" ? items.find((row) => row.itemId === target.item.itemId) ?? null : null
  const roomPendingHref = useMemo(() => {
    if (!room.locationId) return pendingHref
    const url = new URL(pendingHref, "http://local")
    url.searchParams.set("locationId", room.locationId)
    return `${url.pathname}${url.search}`
  }, [pendingHref, room.locationId])

  const getStorage = useCallback(() => {
    if (!storageRef.current) storageRef.current = createAuditOfflineIndexedDbStorage(window.localStorage)
    return storageRef.current
  }, [])

  const refreshQueue = useCallback(async () => {
    setQueue(await loadQueuedAuditScansAsync(getStorage(), roundId))
  }, [getStorage, roundId])

  const loadComponents = useCallback(async (assetId: string) => {
    const requestId = ++componentsRequestRef.current
    if (!navigator.onLine) {
      setComponents(emptyComponents)
      return
    }
    setComponents({ status: "loading", components: [], installedIn: [] })
    try {
      const response = await fetch(`/api/audit-rounds/${roundId}/scan-lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawValue: assetId, scanSource: "manual" }),
      })
      const payload = (await response.json().catch(() => null)) as AuditScanLookupResponse | null
      if (requestId !== componentsRequestRef.current) return
      if (!response.ok || !payload || (payload.status !== "in_round" && payload.status !== "out_of_scope")) {
        setComponents(emptyComponents)
        return
      }
      setComponents({
        status: "ready",
        components: normalizeAuditLookupComponents(payload.asset.components),
        installedIn: normalizeAuditLookupInstalledIn(payload.asset.installedIn),
      })
    } catch {
      if (requestId === componentsRequestRef.current) setComponents(emptyComponents)
    }
  }, [roundId])

  /** Pulls rows changed since the last pull and returns them, so a caller can use one before React re-renders. */
  const syncNow = useCallback(async (): Promise<AuditScanItemRow[]> => {
    if (syncingRef.current || !navigator.onLine) return []
    syncingRef.current = true
    lastSyncAtRef.current = Date.now()
    try {
      const response = await fetch(`/api/audit-rounds/${roundId}/scan-status?since=${encodeURIComponent(serverTimeRef.current)}`, { cache: "no-store" })
      if (!response.ok) return []
      const payload = (await response.json()) as { serverTime: string; roundStatus: string; items: AuditScanItemRow[] }
      serverTimeRef.current = payload.serverTime
      if (payload.roundStatus === "closed" || payload.roundStatus === "cancelled") setRoundClosed(true)
      if (payload.items.length > 0) setItems((current) => mergeStatusUpdates(current, payload.items))
      return payload.items
    } catch {
      // The next poll retries.
      return []
    } finally {
      syncingRef.current = false
    }
  }, [roundId])

  const uploadPhotoFile = useCallback(async (assetId: string, file: File, label: string) => {
    const body = new FormData()
    body.append("file", file)
    if (label) body.append("photoLabel", label)
    const response = await fetch(`/api/assets/${assetId}/attachments`, { method: "POST", body })
    if (!response.ok) {
      const result = await response.json().catch(() => null)
      throw new Error(result?.error ?? t("auditPhotoUploadFailed"))
    }
    return (await response.json()) as { id: string }
  }, [t])

  const sendQueue = useCallback(async (includeFailed = false) => {
    if (sendingRef.current || !navigator.onLine) return
    const pending = await loadQueuedAuditScansAsync(getStorage(), roundId)
    if (pending.length === 0) return
    sendingRef.current = true
    setSendingQueue(true)
    try {
      for (const queued of pending) {
        if (queued.syncStatus === "failed" && !includeFailed) continue
        let response: Response
        try {
          response = await fetch(`/api/audit-rounds/${roundId}/scan`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              assetId: queued.assetId,
              actualLocationId: queued.actualLocationId,
              actualCustodianId: queued.actualCustodianId,
              actualDepartmentId: queued.actualDepartmentId,
              actualConditionId: queued.actualConditionId,
              scanSource: queued.scanSource,
              applyCorrections: queued.applyCorrections,
              resultCorrection: queued.resultCorrection,
              remark: queued.remark,
            }),
          })
        } catch {
          break
        }
        const result = await response.json().catch(() => null)
        if (!response.ok) {
          await markQueuedAuditScanSyncFailed(getStorage(), roundId, queued.id, result?.error ?? tCommon("error"))
          if (isRoundClosedError(result?.error)) setRoundClosed(true)
          break
        }
        setItems((current) => applyScanResult(current, { item: result.item, scannedByName: result.scannedByName }))
        for (const photo of queued.photos ?? []) {
          try {
            await uploadPhotoFile(queued.assetId, new File([photo.blob], photo.fileName, { type: photo.fileType }), photo.label)
          } catch {
            toast.error(t("auditPhotoUploadFailed"))
          }
        }
        await removeQueuedAuditScanAsync(getStorage(), roundId, queued.id)
      }
    } finally {
      sendingRef.current = false
      setSendingQueue(false)
      await refreshQueue()
    }
  }, [getStorage, refreshQueue, roundId, t, tCommon, uploadPhotoFile])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setOnline(navigator.onLine)
      void refreshQueue()
      if (initialTarget?.kind === "item") void loadComponents(initialTarget.item.assetId)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [initialTarget, loadComponents, refreshQueue])

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return
      void syncNow().then(() => sendQueue())
    }
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && Date.now() - lastSyncAtRef.current >= visibilitySyncMinGapMs) tick()
    }
    const interval = window.setInterval(tick, auditScanPollIntervalMs)
    document.addEventListener("visibilitychange", handleVisibility)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [sendQueue, syncNow])

  useEffect(() => {
    function handleOnline() {
      setOnline(true)
      void sendQueue()
    }
    function handleOffline() {
      setOnline(false)
    }
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [sendQueue])

  // Runs after every commit (no dependency list): applies wide-screen focus once the close/save has rendered.
  useEffect(() => {
    const pending = focusListPendingRef.current
    if (!pending) return
    focusListPendingRef.current = null
    const el = returnFocusRef.current
    if (pending === "return" && el?.isConnected) el.focus()
    else focusListAfterClose()
  })

  function openItem(item: AuditScanItemRow, fromSearch: boolean) {
    returnFocusRef.current = fromSearch ? inputRef.current : (document.activeElement as HTMLElement | null)
    if (!fromSearch) {
      // Remember the row's position: saving can drop it from the "pending" tab, leaving no element to return to.
      const rows = Array.from(listAreaRef.current?.querySelectorAll<HTMLElement>("[data-audit-scan-row]") ?? [])
      returnRowIndexRef.current = rows.indexOf(document.activeElement as HTMLElement)
    }
    setTarget({ kind: "item", item, openedMode: getCheckMode(item) })
    setTargetKey((key) => key + 1)
    setOpenedFromSearch(fromSearch)
    setSaved(null)
    void loadComponents(item.assetId)
  }

  /** Focuses the row now at the opened row's position (or the last row), else the selected tab. */
  function focusListAfterClose() {
    const area = listAreaRef.current
    if (!area) return
    const rows = area.querySelectorAll<HTMLElement>("[data-audit-scan-row]")
    if (rows.length > 0) {
      rows[Math.min(Math.max(returnRowIndexRef.current, 0), rows.length - 1)].focus()
      return
    }
    area.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus()
  }

  function closeTarget() {
    setTarget(null)
    // The inline panel has no Radix focus return; the after-commit effect puts focus back where the check started.
    if (isWide) focusListPendingRef.current = "return"
  }

  function openOutOfScope(asset: AuditLookupAsset) {
    returnFocusRef.current = inputRef.current
    setTarget({ kind: "out_of_scope", asset })
    setTargetKey((key) => key + 1)
    setOpenedFromSearch(true)
    setSaved(null)
    setComponents({ status: "ready", components: normalizeAuditLookupComponents(asset.components), installedIn: normalizeAuditLookupInstalledIn(asset.installedIn) })
  }

  function changeRoom(next: AuditScanRoom) {
    setRoom(next)
    setTab("pending")
    setLimit(auditScanListPageSize)
    void syncNow()
  }

  function changeTerm(next: string) {
    setTerm(next)
    setLookup({ status: "idle" })
  }

  function clearSearch() {
    setDraft("")
    changeTerm("")
    inputRef.current?.focus()
  }

  async function searchRegister(rawValue = term.trim()) {
    if (!rawValue) return
    if (!navigator.onLine) {
      setLookup({ status: "offline" })
      return
    }
    setLookup({ status: "loading" })
    try {
      const response = await fetch(`/api/audit-rounds/${roundId}/scan-lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawValue, scanSource }),
      })
      const payload = (await response.json().catch(() => null)) as (AuditScanLookupResponse & { error?: string }) | null
      if (!response.ok || !payload) {
        setLookup({ status: "error", message: payload?.error ?? tCommon("error") })
        return
      }
      if (payload.status === "in_round") {
        // An out-of-scope record saved by someone else becomes a round item after this page loaded.
        const item = items.find((row) => row.assetId === payload.asset.id)
          ?? (await syncNow()).find((row) => row.assetId === payload.asset.id)
        if (item) {
          setLookup({ status: "idle" })
          openItem(item, true)
        } else {
          setLookup({ status: "error", message: tCommon("error") })
        }
        return
      }
      if (payload.status === "out_of_scope") setLookup({ status: "out_of_scope", asset: payload.asset })
      else if (payload.status === "candidates") setLookup({ status: "candidates", matches: payload.matches })
      else setLookup({ status: "unknown" })
    } catch {
      if (navigator.onLine) setLookup({ status: "error", message: tCommon("error") })
      else setLookup({ status: "offline" })
    }
  }

  function submitSearch() {
    if (matches.length > 0) {
      openItem(matches[0].item, true)
      return
    }
    void searchRegister()
  }

  function pickRegisterMatch(match: AuditLookupMatch) {
    const item = match.inRound ? items.find((row) => row.assetId === match.assetId) : undefined
    if (item) openItem(item, true)
    else void searchRegister(match.assetId)
  }

  function handleDecoded(text: string) {
    setCameraOpen(false)
    setScanSource("qr")
    const candidates = new Set(extractAssetLookupCandidatesFromScanValue(text).map((value) => value.toLocaleLowerCase()))
    const item = items.find((row) =>
      candidates.has(row.assetId.toLocaleLowerCase())
      || candidates.has(row.assetTag.toLocaleLowerCase())
      || (row.serialNumber ? candidates.has(row.serialNumber.toLocaleLowerCase()) : false))
    if (item) {
      openItem(item, false)
      return
    }
    setDraft(text)
    changeTerm(text)
    void searchRegister(text)
  }

  function finishSave(notice: AuditSavedNotice, succeeded: boolean) {
    setSaved(notice)
    setTarget(null)
    setScanSource("manual")
    if (succeeded) navigator.vibrate?.(30)
    if (openedFromSearch) {
      setDraft("")
      changeTerm("")
      returnFocusRef.current = inputRef.current
      window.setTimeout(() => inputRef.current?.focus(), 0)
    } else if (isWide) {
      // Applied after the commit that removes the saved row from "pending", so focus lands on the next row.
      focusListPendingRef.current = "list"
    }
  }

  async function uploadPhotos(assetId: string, photos: QueuedAuditPhoto[]) {
    try {
      for (const photo of photos) await uploadPhotoFile(assetId, photo.file, photo.label)
      setPhotoRetry(null)
    } catch (error) {
      setPhotoRetry({ assetId, photos })
      toast.error(error instanceof Error ? error.message : t("auditPhotoUploadFailed"))
    }
  }

  async function queueOffline(payload: AuditOfflineScanPayload, photos: QueuedAuditPhoto[]) {
    await upsertQueuedAuditScanAsync(getStorage(), roundId, payload, { photos: photos.map(toAuditOfflinePhoto) })
    await refreshQueue()
    toast.warning(photos.length > 0 ? t("offlineQueuedWithPhotos") : t("offlineQueued"))
  }

  async function submitCheck(submission: AuditCheckSubmission) {
    if (!target) return
    if (target.kind === "out_of_scope") {
      await submitOutOfScope(target.asset, submission)
      return
    }
    const row = items.find((candidate) => candidate.itemId === target.item.itemId) ?? target.item
    const resultCorrection = getCheckMode(row) === "edit"
    const payload: AuditOfflineScanPayload = {
      assetId: row.assetId,
      ...toScanPayloadValues(submission.values),
      scanSource,
      applyCorrections: canApplyCorrections && submission.applyCorrections && submission.diff.some((field) => field === "location" || field === "custodian"),
      resultCorrection,
      remark: submission.remark.trim() || null,
    }
    const notice: AuditSavedNotice = { assetId: row.assetId, assetTag: row.assetTag, diff: submission.diff, mode: resultCorrection ? "edit" : "scan", queued: false }
    setSaving(true)
    let response: Response
    try {
      response = await fetch(`/api/audit-rounds/${roundId}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    } catch {
      await queueOffline(payload, submission.photos)
      finishSave({ ...notice, queued: true }, false)
      setSaving(false)
      return
    }
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      if (isRoundClosedError(result?.error)) setRoundClosed(true)
      toast.error(result?.error ?? tCommon("error"))
      setSaving(false)
      return
    }
    setItems((current) => applyScanResult(current, { item: result.item, scannedByName: result.scannedByName }))
    finishSave(notice, true)
    if (submission.photos.length > 0) await uploadPhotos(row.assetId, submission.photos)
    setSaving(false)
    void syncNow()
  }

  async function submitOutOfScope(asset: AuditLookupAsset, submission: AuditCheckSubmission) {
    setSaving(true)
    try {
      const evidenceAttachmentIds: string[] = []
      for (const photo of submission.photos) {
        evidenceAttachmentIds.push((await uploadPhotoFile(asset.id, photo.file, photo.label)).id)
      }
      const response = await fetch(`/api/audit-rounds/${roundId}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: asset.id,
          ...toScanPayloadValues(submission.values),
          evidenceAttachmentIds,
          scanSource,
          remark: submission.remark.trim() || null,
        }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok && response.status !== 202) {
        if (isRoundClosedError(result?.error)) setRoundClosed(true)
        throw new Error(result?.error ?? tCommon("error"))
      }
      setLookup({ status: "idle" })
      finishSave({ assetId: asset.id, assetTag: asset.assetTag, diff: submission.diff, mode: "out_of_scope", queued: false }, true)
      void syncNow()
    } catch (error) {
      toast.error(!navigator.onLine ? t("lookupOffline") : error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  async function confirmComponent(component: AuditScanComponent, context: { values: AuditCheckValues; remark: string }) {
    if (target?.kind !== "item") return
    if (!component.auditItemId) {
      toast.error(t("componentOutOfRound"))
      return
    }
    const parent = target.item
    setSaving(true)
    try {
      const response = await fetch(`/api/audit-rounds/${roundId}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: component.assetId,
          ...toScanPayloadValues(context.values),
          scanSource: "manual",
          confirmedWithParentAssetId: parent.assetId,
          componentConfirmationReason: context.remark.trim() || t("componentConfirmedWithParentReason", { assetTag: parent.assetTag }),
          remark: context.remark.trim() || null,
        }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error ?? tCommon("error"))
      setItems((current) => applyScanResult(current, { item: result.item }))
      toast.success(t("componentConfirmedWithParentSuccess"))
      void loadComponents(parent.assetId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  async function submitComponentMissing(remark: string, evidence: File | null) {
    if (target?.kind !== "item" || !missingComponent?.auditItemId) return
    const parent = target.item
    const body = new FormData()
    body.append("remark", remark)
    if (evidence) body.append("evidence", evidence)
    setSaving(true)
    try {
      const response = await fetch(`/api/audit-items/${missingComponent.auditItemId}/mark-not-found`, { method: "POST", body })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error ?? tCommon("error"))
      toast.success(t("componentMissingSaved"))
      setMissingComponent(null)
      void syncNow()
      void loadComponents(parent.assetId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  function scanComponent(component: AuditScanComponent) {
    const item = items.find((row) => row.assetId === component.assetId)
    if (item) openItem(item, false)
    else toast.error(t("componentOutOfRound"))
  }

  async function removeQueued(queuedId: string) {
    await removeQueuedAuditScanAsync(getStorage(), roundId, queuedId)
    await refreshQueue()
  }

  const searching = isAuditSearchReady(term)
  const targetTitle = target?.kind === "item" ? target.item.assetTag : target?.asset.assetTag ?? ""
  const targetDescription = target?.kind === "item"
    ? [target.item.name, target.item.serialNumber ? `Serial ${target.item.serialNumber}` : null].filter(Boolean).join(" · ")
    : target?.asset.subtitle ?? ""

  return (
    <div data-audit-scan-workspace className="mx-auto max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-6">
      <div className="min-w-0 space-y-2">
        <AuditScanHeader roundName={roundName} backHref={backHref} progress={progress} />
        {roundClosed ? (
          <div role="alert" className="flex flex-wrap items-center gap-2 rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
            <span className="min-w-0 flex-1">{t("roundClosedError")}</span>
            <Link href={backHref} className="inline-flex min-h-11 items-center px-2 font-semibold text-primary underline-offset-4 hover:underline">
              {t("backToRound")}
            </Link>
          </div>
        ) : null}
        <AuditScanRoomPicker room={room} rooms={roomOptions} onRoomChange={changeRoom} />
        <AuditScanSearchField
          value={draft}
          cameraOpen={cameraOpen}
          inputRef={inputRef}
          onValueChange={setDraft}
          onTermChange={changeTerm}
          onSubmit={submitSearch}
          onToggleCamera={() => setCameraOpen((current) => !current)}
          onClear={clearSearch}
        />
        {cameraOpen ? <AuditScanCamera onDecoded={handleDecoded} onClose={() => setCameraOpen(false)} /> : null}
        <AuditScanOfflineBar
          online={online}
          queue={queue}
          assetTagFor={(assetId) => items.find((row) => row.assetId === assetId)?.assetTag ?? assetId}
          sending={sendingQueue}
          onSendNow={() => void sendQueue(true)}
          onRemove={(queuedId) => void removeQueued(queuedId)}
        />
        {saved ? (
          <AuditScanSavedBanner
            notice={saved}
            photoRetryCount={photoRetry?.photos.length ?? 0}
            onEdit={() => {
              const item = items.find((row) => row.assetId === saved.assetId)
              if (item) openItem(item, false)
            }}
            onRetryPhotos={() => {
              if (photoRetry) void uploadPhotos(photoRetry.assetId, photoRetry.photos)
            }}
          />
        ) : null}
        <div ref={listAreaRef}>
          {searching ? (
            <AuditScanSearchResults
              term={term}
              matches={matches}
              room={room}
              locationLabels={locationLabels}
              queuedAssetIds={queuedAssetIds}
              onOpen={(item) => openItem(item, true)}
              lookup={
                <AuditScanLookupCard
                  state={lookup}
                  onSearchRegister={() => void searchRegister()}
                  onRecordOutOfScope={openOutOfScope}
                  onPickMatch={pickRegisterMatch}
                />
              }
            />
          ) : (
            <AuditScanRoomList
              rows={list.rows}
              total={list.total}
              counts={list.counts}
              tab={tab}
              onTabChange={(next) => {
                setTab(next)
                setLimit(auditScanListPageSize)
              }}
              onShowMore={() => setLimit((current) => current + auditScanListPageSize)}
              onOpen={(item) => openItem(item, false)}
              queuedAssetIds={queuedAssetIds}
              custodianLabels={custodianLabels}
              locationLabels={locationLabels}
              showLocation={!room.locationId}
              pendingHref={roomPendingHref}
              activeItemId={isWide && target?.kind === "item" ? target.item.itemId : null}
            />
          )}
        </div>
      </div>

      <AuditScanCheckPanel
        isWide={isWide}
        open={target !== null}
        title={targetTitle}
        description={targetDescription}
        onOpenChange={(open) => {
          if (!open) closeTarget()
        }}
        returnFocusRef={returnFocusRef}
        onReturnFocusMissing={focusListAfterClose}
      >
        {target ? (
          <AuditScanCheckForm
            key={targetKey}
            target={target}
            liveItem={liveItem}
            room={room}
            options={options}
            photoChecklist={target.kind === "item" ? photoChecklistByCategory[target.item.categoryId] ?? [] : []}
            canApplyCorrections={canApplyCorrections}
            saving={saving}
            disabled={roundClosed}
            components={components}
            onSubmit={(submission) => void submitCheck(submission)}
            onDismiss={closeTarget}
            onConfirmComponent={(component, context) => void confirmComponent(component, context)}
            onMarkComponentMissing={(component) => {
              if (!component.auditItemId) toast.error(t("componentOutOfRound"))
              else setMissingComponent(component)
            }}
            onScanComponent={scanComponent}
          />
        ) : null}
      </AuditScanCheckPanel>

      {missingComponent && target?.kind === "item" ? (
        <AuditScanComponentMissingDialog
          component={missingComponent}
          parentAssetTag={target.item.assetTag}
          saving={saving}
          onCancel={() => setMissingComponent(null)}
          onSubmit={(remark, evidence) => void submitComponentMissing(remark, evidence)}
        />
      ) : null}
    </div>
  )
}
