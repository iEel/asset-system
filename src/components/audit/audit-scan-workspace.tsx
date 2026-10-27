"use client"

import Link from "next/link"
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState, type ReactNode } from "react"
import { useLocale, useTranslations } from "next-intl"
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
import { useShellBannerSlot } from "@/components/layout/shell-banner"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { Notice } from "@/components/ui/notice"
import { useMediaQuery } from "@/components/ui/use-media-query"
import { extractAssetLookupCandidatesFromScanValue } from "@/lib/asset-qr"
import {
  canSendQueuedAuditScan,
  createAuditOfflineIndexedDbStorage,
  loadQueuedAuditScansAsync,
  markQueuedAuditScanSyncFailed,
  removeQueuedAuditScanAsync,
  summarizeHeldAuditScans,
  upsertQueuedAuditScanAsync,
  type AuditOfflineQueueStorage,
  type AuditOfflineScanPayload,
  type QueuedAuditScan,
} from "@/lib/audit-offline-queue"
import { isAuditRoundOwnItem } from "@/lib/audit-round-counts-rules"
import {
  applyScanResult,
  auditScanListPageSize,
  auditScanListScope,
  auditScanPollIntervalMs,
  auditScanSearchPageSize,
  buildRoomList,
  buildRoomOptions,
  countAuditScanPendingForLink,
  findAuditScanItemByCodes,
  findAuditScanOwnItem,
  foldAuditScanCategoryChips,
  getCheckMode,
  isAuditSearchReady,
  listAuditScanRecordedOutOfScope,
  mergeStatusUpdates,
  resolveAuditScanCategory,
  searchAuditItems,
  summarizeProgress,
  toScanPayloadValues,
  type AuditCheckValues,
  type AuditScanCategory,
  type AuditScanItemRow,
  type AuditScanListTab,
  type AuditScanOptions,
  type AuditScanRoom,
} from "@/lib/audit-scan-session"
import { holdSessionExpiryRedirect, redirectToSessionExpiredLogin } from "@/lib/session-expiry"
import { useOnlineStatus } from "@/lib/use-online-status"
import { useApiError } from "@/components/ui/use-api-error"

const emptyComponents: AuditCheckComponentsState = { status: "ready", components: [], installedIn: [] }
/** A flickering tab can fire visibilitychange many times a second; returning to it pulls at most this often. */
const visibilitySyncMinGapMs = 5_000

function isRoundClosedError(message: unknown) {
  return message === "Audit round is closed" || message === "Audit round is cancelled"
}

export function AuditScanWorkspace({
  roundId,
  roundName,
  roundCode,
  backHref,
  pendingHref,
  initialItems,
  initialServerTime,
  options,
  photoChecklistByCategory,
  categories,
  canApplyCorrections,
  initialAssetId,
  currentUser,
}: {
  roundId: string
  roundName: string
  roundCode: string
  backHref: string
  pendingHref: string
  initialItems: AuditScanItemRow[]
  initialServerTime: string
  options: AuditScanOptions
  photoChecklistByCategory: Record<string, string[]>
  /** The round's categories, for the chips' names (spec §11, P3-R6). */
  categories: AuditScanCategory[]
  canApplyCorrections: boolean
  initialAssetId?: string
  /** The signed-in person: queued checks are stamped with them, and only theirs send from this session. */
  currentUser: { id: string; name: string }
}) {
  const t = useTranslations("auditScan")
  const locale = useLocale()
  const apiError = useApiError()
  const tCommon = useTranslations("common")
  const isWide = useMediaQuery("(min-width: 64rem)")
  const [room, setRoom, hasStoredRoom] = useAuditScanRoom(roundId)
  const [items, setItems] = useState(initialItems)
  const [tab, setTab] = useState<AuditScanListTab>("pending")
  const [limit, setLimit] = useState(auditScanListPageSize)
  const [searchLimit, setSearchLimit] = useState(auditScanSearchPageSize)
  // The chosen category with the room it was chosen in (categoryId below).
  const [categoryChoice, setCategoryChoice] = useState<{ roomKey: string; categoryId: string | null }>({ roomKey: "", categoryId: null })
  const [outOfScopeHint, setOutOfScopeHint] = useState(false)
  const initialTarget = useMemo<AuditCheckTarget | null>(() => {
    const item = initialAssetId ? initialItems.find((row) => row.assetId === initialAssetId) : undefined
    // A find recorded out of scope opens through the lookup (initialRecordedTag), never as a round item (P3-R3).
    return item && isAuditRoundOwnItem(item) ? { kind: "item", item, openedMode: getCheckMode(item) } : null
  }, [initialAssetId, initialItems])
  /** The round page's "แก้ไขผลตรวจ" on an out-of-scope find (P3-R4): its tag fills the search and is looked up once. */
  const initialRecordedTag = useMemo(() => {
    const item = initialAssetId ? initialItems.find((row) => row.assetId === initialAssetId) : undefined
    return item && !isAuditRoundOwnItem(item) ? item.assetTag : null
  }, [initialAssetId, initialItems])
  const [draft, setDraft] = useState(initialRecordedTag ?? "")
  const [term, setTerm] = useState(initialRecordedTag ?? "")
  const [target, setTarget] = useState<AuditCheckTarget | null>(initialTarget)
  const [roomPickerRequested, setRoomPickerRequested] = useState(false)
  // Closing the picker, or a visit that starts on an asset's check sheet or on a recorded find, ends the first-visit
  // auto-open (D7).
  const [roomPickerDismissed, setRoomPickerDismissed] = useState(initialTarget !== null || initialRecordedTag !== null)
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
  const online = useOnlineStatus()
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
  /** The asset whose components are in state, so a reload of the same asset keeps its rows on screen. */
  const componentsAssetRef = useRef<string | null>(null)

  const locationLabels = useMemo(() => new Map(options.locations.map((option) => [option.id, option.label])), [options.locations])
  const custodianLabels = useMemo(() => new Map(options.employees.map((option) => [option.id, option.label])), [options.employees])
  const roomOptions = useMemo(() => buildRoomOptions(items, options.locations, options.departments), [items, options.locations, options.departments])
  const progress = useMemo(() => summarizeProgress(items), [items])
  /** Opens by itself once per visit while the round has several rooms and none was ever chosen for it. */
  const roomPickerOpen = roomPickerRequested || (!roomPickerDismissed && !hasStoredRoom && roomOptions.length > 1)
  const categoryNames = useMemo(() => new Map(categories.map((category) => [category.id, { code: category.code, name: category.name }])), [categories])
  const categoryChips = useMemo(() => foldAuditScanCategoryChips(items, { room, tab, names: categoryNames }), [items, room, tab, categoryNames])
  // A room change clears the chosen category whichever way it came (the picker, its department, another tab through the
  // storage event; spec §11, decision 3, P3-R6), and one that left the row stops narrowing the list.
  const roomKey = `${room.locationId}|${room.departmentId}`
  if (categoryChoice.roomKey !== roomKey && categoryChoice.categoryId !== null) setCategoryChoice({ roomKey, categoryId: null })
  const categoryId = resolveAuditScanCategory(categoryChips, categoryChoice.roomKey === roomKey ? categoryChoice.categoryId : null)
  const list = useMemo(() => buildRoomList({ items, room, tab, limit, locationLabels, categoryId }), [items, room, tab, limit, locationLabels, categoryId])
  const search = useMemo(() => searchAuditItems(items, term, custodianLabels, room), [items, term, custodianLabels, room])
  const queuedAssetIds = useMemo(() => new Set(queue.map((entry) => entry.assetId)), [queue])
  const sendableQueue = useMemo(() => queue.filter((entry) => canSendQueuedAuditScan(entry, currentUser.id)), [queue, currentUser.id])
  const heldQueue = useMemo(() => summarizeHeldAuditScans(queue, currentUser.id), [queue, currentUser.id])
  const liveItem = target?.kind === "item" ? items.find((row) => row.itemId === target.item.itemId) ?? null : null
  const scope = auditScanListScope(room)
  const pendingLinkCount = useMemo(() => countAuditScanPendingForLink(items, room), [items, room])
  // P3-R25: the recorded out-of-scope finds, listed apart on the ตรวจแล้ว tab; no count reads them.
  const recordedOutOfScope = useMemo(() => listAuditScanRecordedOutOfScope(items, { roomId: room.locationId }), [items, room.locationId])
  const categoryRow = categoryChips.length > 0
    ? { all: list.counts[tab], chips: categoryChips.map((chip) => ({ id: chip.id, label: categoryNames.get(chip.id)?.name ?? t("categoryUnknown"), count: chip.count })) }
    : null
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
    // A reload after a confirmation keeps the rows, so focus and "พบครบทุกชิ้น" stay put (D3); another asset starts empty.
    const reload = componentsAssetRef.current === assetId
    componentsAssetRef.current = assetId
    if (!navigator.onLine) {
      setComponents(emptyComponents)
      return
    }
    setComponents((current) => (reload ? { ...current, status: "loading" } : { status: "loading", components: [], installedIn: [] }))
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
    let sessionLost = false
    // A 401 from another request waits until this send stops, so nothing is cut off mid-send.
    const releaseRedirect = holdSessionExpiryRedirect()
    sendingRef.current = true
    setSendingQueue(true)
    try {
      for (const queued of pending) {
        if (!canSendQueuedAuditScan(queued, currentUser.id)) continue
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
        // The session ended: the check stays queued as it was (not failed) and sends after the person signs in again.
        if (response.status === 401) {
          sessionLost = true
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
      releaseRedirect()
      if (sessionLost) redirectToSessionExpiredLogin(locale)
    }
  }, [currentUser.id, getStorage, locale, refreshQueue, roundId, t, tCommon, uploadPhotoFile])

  // The deep link to a recorded find runs the register lookup once the page is up, as a typed tag would (P3-R4).
  const lookUpInitialRecordedFind = useEffectEvent(() => {
    if (initialRecordedTag) void searchRegister(initialRecordedTag)
  })

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshQueue()
      if (initialTarget?.kind === "item") void loadComponents(initialTarget.item.assetId)
      lookUpInitialRecordedFind()
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
      void sendQueue()
    }
    window.addEventListener("online", handleOnline)
    return () => window.removeEventListener("online", handleOnline)
  }, [sendQueue])

  // Offline, the shell's banner carries this page's line as its second clause (menu B shell §6.7).
  useShellBannerSlot(sendableQueue.length > 0 ? t("bannerQueued", { count: sendableQueue.length }) : t("bannerOfflineSaves"))

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

  function openOutOfScope(asset: AuditLookupAsset, recorded: AuditScanItemRow | null = null) {
    returnFocusRef.current = inputRef.current
    setTarget({ kind: "out_of_scope", asset, recorded })
    setTargetKey((key) => key + 1)
    setOpenedFromSearch(true)
    setSaved(null)
    componentsAssetRef.current = asset.id
    setComponents({ status: "ready", components: normalizeAuditLookupComponents(asset.components), installedIn: normalizeAuditLookupInstalledIn(asset.installedIn) })
  }

  function changeRoomPickerOpen(next: boolean) {
    setRoomPickerRequested(next)
    if (!next) setRoomPickerDismissed(true)
  }

  function changeRoom(next: AuditScanRoom) {
    setRoom(next)
    setTab("pending")
    setLimit(auditScanListPageSize)
    setCategoryChoice({ roomKey: "", categoryId: null })
    void syncNow()
  }

  function changeTab(next: AuditScanListTab) {
    setTab(next)
    setLimit(auditScanListPageSize)
    // The switch stays above the search results (spec §11): a tab press leaves the search for that tab's list.
    if (isAuditSearchReady(term)) {
      setDraft("")
      changeTerm("")
    }
  }

  function changeCategory(next: string | null) {
    setCategoryChoice({ roomKey, categoryId: next })
    setLimit(auditScanListPageSize)
  }

  function changeTerm(next: string) {
    setTerm(next)
    setSearchLimit(auditScanSearchPageSize)
    setLookup({ status: "idle" })
  }

  function clearSearch() {
    setDraft("")
    changeTerm("")
    setOutOfScopeHint(false)
    inputRef.current?.focus()
  }

  /** The out-of-scope box (spec §11): a record goes through the register lookup, so it starts at the search. */
  function startOutOfScopeFind() {
    setOutOfScopeHint(true)
    inputRef.current?.focus()
  }

  /** A recorded out-of-scope find (P3-R25) opens as the deep link opens one: its tag in the search, then the register
   * lookup, which answers out_of_scope with the item and opens its out-of-scope form (Task 4). */
  function openRecordedOutOfScope(item: AuditScanItemRow) {
    setDraft(item.assetTag)
    changeTerm(item.assetTag)
    void searchRegister(item.assetTag)
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
        // A round item missing here (the page loaded before it came in) arrives with a sync. Only own items answer in_round
        // (Task 1): a find recorded out of scope answers out_of_scope with its item, below.
        const item = findAuditScanOwnItem(items, payload.asset.id) ?? findAuditScanOwnItem(await syncNow(), payload.asset.id)
        if (item) {
          setLookup({ status: "idle" })
          openItem(item, true)
        } else {
          setLookup({ status: "error", message: tCommon("error") })
        }
        return
      }
      if (payload.status === "out_of_scope" && payload.item) {
        // Already recorded out of scope: the form opens on that record and saving edits it (P3-R3). The record is a row of
        // the round, here or after a sync when another phone saved it.
        const recordedId = payload.item.id
        const recorded = items.find((row) => row.itemId === recordedId) ?? (await syncNow()).find((row) => row.itemId === recordedId)
        if (recorded) {
          setLookup({ status: "idle" })
          openOutOfScope(payload.asset, recorded)
        } else {
          setLookup({ status: "error", message: tCommon("error") })
        }
        return
      }
      if (payload.status === "out_of_scope") {
        // Show the asset tag instead of the raw QR text; setTerm (not changeTerm) keeps this lookup card.
        if (rawValue !== payload.asset.assetTag) {
          setDraft(payload.asset.assetTag)
          setTerm(payload.asset.assetTag)
        }
        setLookup({ status: "out_of_scope", asset: payload.asset })
      } else if (payload.status === "candidates") setLookup({ status: "candidates", matches: payload.matches })
      else setLookup({ status: "unknown" })
    } catch {
      if (navigator.onLine) setLookup({ status: "error", message: tCommon("error") })
      else setLookup({ status: "offline" })
    }
  }

  function submitSearch() {
    if (search.matches.length > 0) {
      openItem(search.matches[0].item, true)
      return
    }
    void searchRegister()
  }

  function pickRegisterMatch(match: AuditLookupMatch) {
    const item = match.inRound ? findAuditScanOwnItem(items, match.assetId) : null
    if (item) openItem(item, true)
    else void searchRegister(match.assetId)
  }

  function handleDecoded(text: string) {
    setCameraOpen(false)
    setScanSource("qr")
    const item = findAuditScanItemByCodes(items, extractAssetLookupCandidatesFromScanValue(text))
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
    setOutOfScopeHint(false)
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
      apiError.toast(error instanceof Error ? error : t("auditPhotoUploadFailed"))
    }
  }

  async function queueOffline(payload: AuditOfflineScanPayload, photos: QueuedAuditPhoto[]) {
    await upsertQueuedAuditScanAsync(getStorage(), roundId, payload, { photos: photos.map(toAuditOfflinePhoto), queuedBy: currentUser })
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
    // The session ended: keep the check on the device first, so the work is not lost, then go to the login.
    if (response.status === 401) {
      await queueOffline(payload, submission.photos)
      finishSave({ ...notice, queued: true }, false)
      setSaving(false)
      redirectToSessionExpiredLogin(locale)
      return
    }
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      if (isRoundClosedError(result?.error)) setRoundClosed(true)
      apiError.toast(result?.error)
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
      if (!navigator.onLine) toast.error(t("lookupOffline"))
      else apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  /** One component confirmed with the parent; true when it saved, so "พบครบทุกชิ้น" knows whether to go on (D3). */
  async function confirmComponent(component: AuditScanComponent, context: { values: AuditCheckValues; remark: string }): Promise<boolean> {
    if (target?.kind !== "item") return false
    if (!component.auditItemId) {
      toast.error(t("componentOutOfRound"))
      return false
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
      return true
    } catch (error) {
      apiError.toast(error)
      return false
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
      apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  function scanComponent(component: AuditScanComponent) {
    const item = findAuditScanOwnItem(items, component.assetId)
    if (item) openItem(item, false)
    else toast.error(t("componentOutOfRound"))
  }

  async function removeQueued(queuedId: string) {
    await removeQueuedAuditScanAsync(getStorage(), roundId, queuedId)
    await refreshQueue()
  }

  const searching = isAuditSearchReady(term)
  // The sheet's title is the asset's name, wrapping (bug 23); line 2 its code and serial, each a tag that may wrap inside
  // the line (group 2 spec §12, P3-R12). An out-of-scope find's name is the lookup's subtitle.
  const targetTitle = target?.kind === "item" ? target.item.name : target?.asset.subtitle ?? ""
  const targetCode = target?.kind === "item" ? target.item.assetTag : target?.asset.assetTag ?? ""
  const targetSerial = target?.kind === "item" ? target.item.serialNumber : target?.asset.serialNumber ?? null
  const targetDescription: ReactNode = target ? (
    <>
      <span className="tag whitespace-normal break-all">{targetCode}</span>
      {targetSerial ? <> · Serial <span className="tag whitespace-normal break-all">{targetSerial}</span></> : null}
    </>
  ) : ""

  return (
    <div data-audit-scan-workspace className="mx-auto max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-6">
      <div className="min-w-0 space-y-2">
        <AuditScanHeader roundName={roundName} roundCode={roundCode} backHref={backHref} progress={progress} />
        {roundClosed ? (
          <Notice
            tone="danger"
            role="alert"
            action={
              <Link href={backHref} className={buttonVariants({ variant: "outline", size: "md" })}>
                {t("backToRound")}
              </Link>
            }
          >
            {t("roundClosedError")}
          </Notice>
        ) : null}
        <AuditScanRoomPicker room={room} rooms={roomOptions} open={roomPickerOpen} onOpenChange={changeRoomPickerOpen} onRoomChange={changeRoom} />
        <AuditScanSearchField
          value={draft}
          hint={outOfScopeHint ? t("outOfScopeHint") : null}
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
          queue={sendableQueue}
          held={heldQueue}
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
              const item = findAuditScanOwnItem(items, saved.assetId)
              if (item) openItem(item, false)
            }}
            onRetryPhotos={() => {
              if (photoRetry) void uploadPhotos(photoRetry.assetId, photoRetry.photos)
            }}
          />
        ) : null}
        <div ref={listAreaRef}>
          <AuditScanRoomList
            rows={list.rows}
            total={list.total}
            counts={list.counts}
            tab={tab}
            scope={scope}
            searching={searching}
            onTabChange={changeTab}
            categories={categoryRow}
            categoryId={categoryId}
            onCategoryChange={changeCategory}
            onShowMore={() => setLimit((current) => current + auditScanListPageSize)}
            onOpen={(item) => openItem(item, false)}
            queuedAssetIds={queuedAssetIds}
            custodianLabels={custodianLabels}
            locationLabels={locationLabels}
            showLocation={!room.locationId}
            pendingHref={roomPendingHref}
            pendingCount={pendingLinkCount}
            recordedOutOfScope={recordedOutOfScope}
            onOpenRecorded={openRecordedOutOfScope}
            activeItemId={isWide && target?.kind === "item" ? target.item.itemId : null}
          />
          {searching ? (
            <AuditScanSearchResults
              term={term}
              search={search}
              limit={searchLimit}
              scope={scope}
              onShowMore={() => setSearchLimit((current) => current + auditScanSearchPageSize)}
              locationLabels={locationLabels}
              queuedAssetIds={queuedAssetIds}
              onOpen={(item) => openItem(item, true)}
              lookupAfterMatches={outOfScopeHint}
              lookup={
                <AuditScanLookupCard
                  title={search.total > 0 ? t("lookupNotListed") : undefined}
                  state={lookup}
                  onSearchRegister={() => void searchRegister()}
                  onRecordOutOfScope={openOutOfScope}
                  onPickMatch={pickRegisterMatch}
                />
              }
            />
          ) : null}
        </div>
        <ContentPanel>
          <div data-audit-scan-out-of-scope className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-foreground">{t("outOfScopeBoxTitle")}</p>
            <Button variant="outline" size="md" onClick={startOutOfScopeFind}>
              {t("outOfScopeBoxAction")}
            </Button>
          </div>
        </ContentPanel>
      </div>

      <AuditScanCheckPanel
        isWide={isWide}
        open={target !== null}
        title={targetTitle}
        focusKey={targetKey}
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
            onConfirmComponent={confirmComponent}
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
