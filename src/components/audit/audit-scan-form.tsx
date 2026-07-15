"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  ChevronDown,
  CheckCircle2,
  Flashlight,
  FlashlightOff,
  ImagePlus,
  Keyboard,
  ListChecks,
  Loader2,
  RefreshCcw,
  Save,
  WifiOff,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { AuditProgressBar } from "@/components/audit/audit-progress-bar"
import { extractAssetLookupCandidatesFromScanValue } from "@/lib/asset-qr"
import { startNativeAssetQrScanner, type NativeAssetQrScannerRuntime } from "@/lib/asset-qr-scanner"
import { normalizeAssetOwnershipType, requiresCustodian } from "@/lib/asset-ownership"
import {
  getFallbackCameraAfterEnvironmentFailure,
  resolvePreferredCameraSelection,
  type PreferredCameraSelection,
} from "@/lib/camera-selection"
import {
  addQueuedAuditScanAsync,
  createAuditOfflineIndexedDbStorage,
  loadQueuedAuditScansAsync,
  markQueuedAuditScanSyncFailed,
  removeQueuedAuditScanAsync,
  type AuditOfflineScanPayload,
  type AuditOfflineQueueStorage,
  type QueuedAuditScan,
} from "@/lib/audit-offline-queue"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
import {
  buildAuditScanContextStorageKey,
  emptyAuditScanContext,
  filterAuditItemsByContext,
  normalizeAuditScanContext,
  summarizeAuditScanContext,
  type AuditScanContext,
} from "@/lib/audit-scan-context"
import {
  MAX_RECENT_AUDIT_SCANS,
  type AuditMismatchPreview,
  type AuditLookupAsset,
  type AuditRecentScan,
  type AuditScanComponent,
  type AuditScanItem,
  type AuditScanLookupResponse,
  type AuditScanOptions,
  type CameraDevice,
  type CameraReadiness,
  type LastAuditResult,
  type OutOfScopeAsset,
  type QueuedAuditPhoto,
  type ScanFeedback,
  type StoredAuditContextSnapshot,
} from "./audit-scan-types"
import {
  buildAssetLookup,
  buildAssetPickerSearchText,
  buildManualScanSuggestions,
  buildOptionLabelMap,
  buildSystemDataRows,
  createInitialAuditScanValues,
  emptyToNull,
  getActualValues,
  getEditableAuditValues,
  getExpectedAuditValues,
  getOutOfScopeActualValues,
  getReadableAuditScanValue,
  hasOutOfScopeActualMismatch,
  normalizeOutOfScopeAuditAsset,
  toAuditOfflinePhoto,
} from "./audit-scan-helpers"
import {
  AssetFallbackPicker,
  AuditComponentPanel,
  AuditQrScannerOverlay,
  Field,
  formatLastAuditResult,
  ManualScanSuggestionList,
  OptionList,
  PendingQueuePanel,
  RecentScansPanel,
  ScanResultPanel,
  Select,
} from "./audit-scan-panels"

export type { AuditRecentScan } from "./audit-scan-types"

const auditContextSnapshotCache = new Map<string, StoredAuditContextSnapshot>()

export function AuditScanForm({
  locale,
  roundId,
  roundName,
  backHref,
  items,
  options,
  initialRecentScans = [],
  initialAssetId,
  initialMode = "scan",
}: {
  locale: string
  roundId: string
  roundName: string
  backHref: string
  items: AuditScanItem[]
  options: AuditScanOptions
  initialRecentScans?: AuditRecentScan[]
  initialAssetId?: string
  initialMode?: "scan" | "edit"
}) {
  const router = useRouter()
  const t = useTranslations("auditScan")
  const tCommon = useTranslations("common")
  const initialSelectedItem = initialAssetId ? items.find((item) => item.assetId === initialAssetId) : undefined
  const initialEditItem = initialMode === "edit" ? initialSelectedItem : null
  const [saving, setSaving] = useState(false)
  const [componentMissingDraft, setComponentMissingDraft] = useState<AuditScanComponent | null>(null)
  const [componentMissingRemark, setComponentMissingRemark] = useState("")
  const [componentMissingEvidenceFile, setComponentMissingEvidenceFile] = useState<File | null>(null)
  const [scannerRunning, setScannerRunning] = useState(false)
  const [scannerLoading, setScannerLoading] = useState(false)
  const [cameraReadiness, setCameraReadiness] = useState<CameraReadiness>("checking")
  const [cameraErrorText, setCameraErrorText] = useState("")
  const [scanText, setScanText] = useState(() => initialSelectedItem ? getReadableAuditScanValue(initialSelectedItem) : "")
  const [scanSource, setScanSource] = useState<"manual" | "qr">("manual")
  const [lastResult, setLastResult] = useState<LastAuditResult | null>(null)
  const [lastDecodedText, setLastDecodedText] = useState("")
  const [auditPhotoLabel, setAuditPhotoLabel] = useState("")
  const [queuedAuditPhotos, setQueuedAuditPhotos] = useState<QueuedAuditPhoto[]>([])
  const fastMode = true
  const [showDetailedFields, setShowDetailedFields] = useState(() => Boolean(initialEditItem))
  const [scanFeedback, setScanFeedback] = useState<ScanFeedback | null>(null)
  const [recentScans, setRecentScans] = useState<AuditRecentScan[]>(() => initialRecentScans.slice(0, MAX_RECENT_AUDIT_SCANS))
  const [showPendingQueue, setShowPendingQueue] = useState(false)
  const [pendingQueueExpanded, setPendingQueueExpanded] = useState(true)
  const [assetPickerExpanded, setAssetPickerExpanded] = useState(false)
  const [assetPickerQuery, setAssetPickerQuery] = useState("")
  const [outOfScopeAsset, setOutOfScopeAsset] = useState<OutOfScopeAsset | null>(null)
  const [editingScanResult, setEditingScanResult] = useState<{ assetId: string; label: string; auditResult: string | null } | null>(() =>
    initialEditItem ? { assetId: initialEditItem.assetId, label: initialEditItem.label, auditResult: initialEditItem.auditResult } : null
  )
  const [applyCorrections, setApplyCorrections] = useState(false)
  const [offlineQueue, setOfflineQueue] = useState<QueuedAuditScan[]>([])
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine))
  const [torchAvailable, setTorchAvailable] = useState(false)
  const [torchEnabled, setTorchEnabled] = useState(false)
  const [torchUpdating, setTorchUpdating] = useState(false)
  const [zoomAvailable, setZoomAvailable] = useState(false)
  const [zoomLevels, setZoomLevels] = useState<number[]>([])
  const [zoomLevel, setZoomLevel] = useState(0)
  const [zoomUpdating, setZoomUpdating] = useState(false)
  const qrReaderRef = useRef<NativeAssetQrScannerRuntime | null>(null)
  const offlineStorageRef = useRef<AuditOfflineQueueStorage | null>(null)
  const lastDecodedRef = useRef<{ value: string; at: number } | null>(null)
  const auditPhotoPreviewUrlsRef = useRef<Set<string>>(new Set())
  const [values, setValues] = useState(() => createInitialAuditScanValues(initialSelectedItem, initialMode))

  const selectedItem = useMemo(() => items.find((item) => item.assetId === values.assetId), [items, values.assetId])
  const assetLookup = useMemo(() => buildAssetLookup(items), [items])
  const auditContextStorageKey = useMemo(() => buildAuditScanContextStorageKey(roundId), [roundId])
  const subscribeToAuditContext = useCallback(
    (onStoreChange: () => void) => subscribeToStoredAuditContext(auditContextStorageKey, onStoreChange),
    [auditContextStorageKey]
  )
  const readAuditContextSnapshot = useCallback(
    () => readStoredAuditContext(auditContextStorageKey),
    [auditContextStorageKey]
  )
  const auditContext = useSyncExternalStore(subscribeToAuditContext, readAuditContextSnapshot, getEmptyAuditContext)
  const optionLabelMaps = useMemo(
    () => ({
      locations: buildOptionLabelMap(options.locations),
      employees: buildOptionLabelMap(options.employees),
      departments: buildOptionLabelMap(options.departments),
      conditions: buildOptionLabelMap(options.conditions),
    }),
    [options.conditions, options.departments, options.employees, options.locations]
  )
  const mismatchPreview = useMemo(() => {
    if (!selectedItem) return []
    const actual = getActualValues(values, selectedItem)
    const ownershipType = normalizeAssetOwnershipType(selectedItem.ownershipType)
    return [
      ownershipType !== "software_license" && actual.actualLocationId !== selectedItem.expectedLocationId
        ? { type: "wrong_location", label: t("wrongLocation"), canApply: true }
        : null,
      requiresCustodian(selectedItem.ownershipType) && (actual.actualCustodianId || null) !== selectedItem.expectedCustodianId
        ? { type: "wrong_custodian", label: t("wrongCustodian"), canApply: true }
        : null,
      (actual.actualDepartmentId || null) !== selectedItem.expectedDepartmentId
        ? { type: "wrong_department", label: t("wrongDepartment"), canApply: false }
        : null,
      (actual.actualConditionId || null) !== selectedItem.expectedConditionId
        ? { type: "wrong_condition", label: t("wrongCondition"), canApply: false }
        : null,
    ].filter((mismatch): mismatch is AuditMismatchPreview => Boolean(mismatch))
  }, [selectedItem, t, values])
  const correctionMismatchCount = mismatchPreview.filter((mismatch) => mismatch.canApply).length
  const pendingItems = useMemo(() => items.filter((item) => item.auditStatus === "pending"), [items])
  const contextLocationOptions = useMemo(
    () => options.locations.filter((location) => items.some((item) => item.expectedLocationId === location.id)),
    [items, options.locations]
  )
  const contextDepartmentOptions = useMemo(
    () => options.departments.filter((department) => items.some((item) =>
      item.expectedDepartmentId === department.id &&
      (!auditContext.locationId || item.expectedLocationId === auditContext.locationId)
    )),
    [auditContext.locationId, items, options.departments]
  )
  const contextItems = useMemo(() => filterAuditItemsByContext(items, auditContext), [auditContext, items])
  const contextProgress = useMemo(() => summarizeAuditScanContext(contextItems), [contextItems])
  const hasAuditContext = Boolean(auditContext.locationId || auditContext.departmentId)
  const contextPendingItems = useMemo(() => contextItems.filter((item) => item.auditStatus === "pending"), [contextItems])
  const queuePendingItems = hasAuditContext ? contextPendingItems : pendingItems
  const pendingQueuePreview = useMemo(() => queuePendingItems.slice(0, 8), [queuePendingItems])
  const filteredAssetPickerItems = useMemo(() => {
    const query = assetPickerQuery.trim().toLocaleLowerCase("th-TH")
    const sourceItems = query ? items : queuePendingItems
    return sourceItems
      .filter((item) => {
        if (!query) return true
        return buildAssetPickerSearchText(item, optionLabelMaps).toLocaleLowerCase("th-TH").includes(query)
      })
      .slice(0, 12)
  }, [assetPickerQuery, items, optionLabelMaps, queuePendingItems])
  const manualScanSuggestions = useMemo(() => {
    const query = scanText.trim()
    const exactScanMatchCandidates = extractAssetLookupCandidatesFromScanValue(scanText)
    if (scanSource !== "manual" || selectedItem || query.length < 2) return []
    if (exactScanMatchCandidates.some((candidate) => assetLookup.has(candidate))) return []
    return buildManualScanSuggestions(query, items, optionLabelMaps)
  }, [assetLookup, items, optionLabelMaps, scanSource, scanText, selectedItem])
  const scanReturnHref = appendOperationalReturnTo(`/${locale}/audit/rounds/${roundId}/scan`, backHref)
  const pendingListHref = appendOperationalReturnTo(`/${locale}/audit/rounds/${roundId}/pending`, scanReturnHref)
  const pendingCount = pendingItems.length
  const processedCount = items.length - pendingCount
  const queuePendingCount = queuePendingItems.length
  const queueTotal = hasAuditContext ? contextProgress.total : items.length
  const queueProcessedCount = hasAuditContext ? contextProgress.processed : processedCount
  const compactProgressHeader = Boolean(selectedItem || outOfScopeAsset)
  const scanTargetLocked = Boolean(selectedItem || outOfScopeAsset)
  const isDetailedScanVisible = Boolean(selectedItem && (!fastMode || showDetailedFields))
  const showMobileQuickActionBar = Boolean(selectedItem && fastMode && !showDetailedFields)
  const submitBarVisibility = selectedItem ? (showMobileQuickActionBar ? "hidden md:flex" : "flex") : "hidden md:flex"
  const mobileMatchedActionClassName = "col-span-3 inline-flex min-h-14 items-center justify-center gap-2 rounded-md bg-success px-3 py-2 text-base font-semibold text-white transition-colors hover:bg-success/90 disabled:opacity-50"
  const mobileSecondaryActionClassName = "inline-flex min-h-12 items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-2 py-2 text-xs font-medium leading-tight text-foreground transition-colors hover:bg-accent"
  const systemDataRows = selectedItem
    ? buildSystemDataRows(
        selectedItem,
        optionLabelMaps,
        {
          expectedLocation: t("expectedLocation"),
          expectedCustodian: t("expectedCustodian"),
          expectedDepartment: t("expectedDepartment"),
          expectedCondition: t("expectedCondition"),
          none: t("none"),
        }
      )
    : []
  const outOfScopeActualValues = outOfScopeAsset ? getOutOfScopeActualValues(values, outOfScopeAsset) : null
  const requiresOutOfScopeMismatchPhoto = Boolean(
    outOfScopeAsset &&
      outOfScopeActualValues &&
      hasOutOfScopeActualMismatch(outOfScopeAsset, outOfScopeActualValues)
  )
  const requiresMismatchPhoto = Boolean(isDetailedScanVisible && mismatchPreview.length > 0) || requiresOutOfScopeMismatchPhoto
  const evidenceRequirementSatisfied = !requiresMismatchPhoto || queuedAuditPhotos.length > 0
  const shouldShowAuditPhotoEvidence = Boolean(outOfScopeAsset || isDetailedScanVisible || queuedAuditPhotos.length > 0)
  const selectedAuditPhotoChecklist = selectedItem?.photoChecklist
  const generalAuditPhotoLabel = t("generalAuditPhotoLabel")
  const auditPhotoTagOptions = useMemo(
    () => [
      generalAuditPhotoLabel,
      ...(selectedAuditPhotoChecklist ?? []).filter((item) => item && item !== generalAuditPhotoLabel),
    ],
    [generalAuditPhotoLabel, selectedAuditPhotoChecklist]
  )
  const effectiveAuditPhotoLabel =
    auditPhotoTagOptions.find((item) => item === auditPhotoLabel) ?? generalAuditPhotoLabel
  const failedOfflineQueueCount = offlineQueue.filter((item) => item.syncStatus === "failed" || Boolean(item.lastSyncError)).length
  const queuedOfflinePhotoCount = offlineQueue.reduce((total, item) => total + (item.photos?.length ?? 0), 0)
  const lastOfflineQueueError = [...offlineQueue].reverse().find((item) => item.lastSyncError)?.lastSyncError ?? ""
  const offlineQueueHelp =
    !online
      ? t("offlineQueueOfflineHelp")
      : failedOfflineQueueCount > 0
        ? t("offlineQueueFailedHelp", { count: failedOfflineQueueCount })
        : t("offlineQueueHelp")
  const hasCameraIssue = Boolean(cameraErrorText || cameraReadiness === "unavailable")
  const shouldShowCameraUtilities = Boolean(lastDecodedText) || hasCameraIssue
  const shouldShowCameraPanel = scannerRunning || scannerLoading || shouldShowCameraUtilities
  const scanEntryPanelClass = !selectedItem && !scanFeedback
    ? "border-primary/30 bg-primary/5 shadow-sm ring-1 ring-primary/10"
    : "border-border bg-background"
  const showFallbackPicker = assetPickerExpanded
  const shouldShowRemarkField = Boolean(selectedItem || outOfScopeAsset)

  function setField(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    if (field === "assetId") {
      setApplyCorrections(false)
      setShowDetailedFields(false)
      setEditingScanResult(null)
    }
  }

  function createQueuedAuditPhoto(file: File, index: number): QueuedAuditPhoto {
    const previewUrl = createAuditPhotoPreviewUrl(file)
    if (previewUrl) auditPhotoPreviewUrlsRef.current.add(previewUrl)
    return {
      id: `${Date.now()}-${file.name}-${index}`,
      label: effectiveAuditPhotoLabel,
      file,
      previewUrl,
    }
  }

  function revokeAuditPhotoPreviewUrl(previewUrl: string | null) {
    if (!previewUrl || typeof URL === "undefined") return
    URL.revokeObjectURL(previewUrl)
    auditPhotoPreviewUrlsRef.current.delete(previewUrl)
  }

  function resetAuditPhotoQueue() {
    setQueuedAuditPhotos((current) => {
      current.forEach((photo) => revokeAuditPhotoPreviewUrl(photo.previewUrl))
      return []
    })
    setAuditPhotoLabel("")
  }

  function clearAuditScanTarget() {
    setValues({
      assetId: "",
      actualLocationId: "",
      actualCustodianId: "",
      actualDepartmentId: "",
      actualConditionId: "",
      remark: "",
    })
    setOutOfScopeAsset(null)
    setApplyCorrections(false)
    setShowDetailedFields(false)
    setEditingScanResult(null)
    setScanFeedback(null)
    resetAuditPhotoQueue()
  }

  function selectInRoundAuditItem(item: AuditScanItem, options: { mode?: "scan" | "edit" } = {}) {
    const editMode = options.mode === "edit"
    const actualValues = editMode ? getEditableAuditValues(item) : getExpectedAuditValues(item)
    setValues((current) => ({
      ...current,
      assetId: item.assetId,
      ...actualValues,
    }))
    setOutOfScopeAsset(null)
    setApplyCorrections(false)
    setShowDetailedFields(editMode)
    setEditingScanResult(editMode ? { assetId: item.assetId, label: item.label, auditResult: item.auditResult } : null)
    setScanFeedback(null)
    resetAuditPhotoQueue()
  }

  function selectOutOfScopeAuditAsset(asset: AuditLookupAsset) {
    const normalizedAsset = normalizeOutOfScopeAuditAsset(asset)
    setOutOfScopeAsset(normalizedAsset)
    setValues((current) => ({
      ...current,
      assetId: "",
      actualLocationId: normalizedAsset.currentLocationId,
      actualCustodianId: normalizedAsset.custodianId ?? "",
      actualDepartmentId: normalizedAsset.departmentId ?? "",
      actualConditionId: normalizedAsset.conditionId ?? "",
    }))
    setApplyCorrections(false)
    setShowDetailedFields(false)
    setEditingScanResult(null)
    resetAuditPhotoQueue()
  }

  function selectPendingQueueItem(item: AuditScanItem) {
    selectInRoundAuditItem(item)
    setScanText(getReadableAuditScanValue(item))
    setScanSource("manual")
    setShowPendingQueue(false)
    window.setTimeout(() => {
      document.getElementById("audit-scan-input-panel")?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 0)
  }

  function selectAssetFromFallback(item: AuditScanItem) {
    selectInRoundAuditItem(item)
    setScanText(getReadableAuditScanValue(item))
    setScanSource("manual")
    setAssetPickerExpanded(false)
    window.setTimeout(() => {
      document.getElementById("audit-scan-input-panel")?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 0)
  }

  function selectManualScanSuggestion(item: AuditScanItem) {
    selectInRoundAuditItem(item)
    setScanText(getReadableAuditScanValue(item))
    setScanSource("manual")
    setAssetPickerExpanded(false)
    showScanFeedback({
      status: "found",
      title: t("feedbackFoundTitle"),
      description: item.label,
      assetId: item.assetId,
      assetTag: item.assetTag,
    }, "manual")
    toast.success(t("assetSelected"))
    window.setTimeout(() => {
      document.getElementById("audit-scan-input-panel")?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 0)
  }

  function scanComponentQr(component: AuditScanComponent) {
    const scanValue = component.assetTag || component.assetId
    setScanText(scanValue)
    setScanSource("manual")
    void selectScannedAsset(scanValue, "manual")
  }

  function handleManualScanAction() {
    if (manualScanSuggestions.length === 1) {
      selectManualScanSuggestion(manualScanSuggestions[0])
      return
    }
    if (manualScanSuggestions.length > 1) {
      toast.info(t("manualSuggestionPickOne"))
      return
    }
    void selectScannedAsset(scanText, "manual")
  }

  function togglePendingQueue() {
    const nextValue = !showPendingQueue
    setShowPendingQueue(nextValue)
    if (nextValue) setPendingQueueExpanded(true)
  }

  function updateAuditContext(next: Partial<AuditScanContext>) {
    const candidate = normalizeAuditScanContext({ ...auditContext, ...next })
    const hasDepartmentInLocation = !candidate.departmentId || items.some((item) =>
      item.expectedDepartmentId === candidate.departmentId &&
      (!candidate.locationId || item.expectedLocationId === candidate.locationId)
    )
    const value = hasDepartmentInLocation ? candidate : { ...candidate, departmentId: "" }
    window.localStorage.setItem(auditContextStorageKey, JSON.stringify(value))
    window.dispatchEvent(new Event(auditContextStorageKey))
  }

  function queueAuditPhoto(file: File | null) {
    if (!file) return
    queueAuditPhotoFiles([file])
  }

  function queueAuditPhotoFiles(files: File[]) {
    if (files.length === 0) return
    setQueuedAuditPhotos((current) => [
      ...current,
      ...files.map((file, index) => createQueuedAuditPhoto(file, current.length + index)),
    ])
  }

  function removeQueuedAuditPhoto(id: string) {
    setQueuedAuditPhotos((current) => {
      const removedPhoto = current.find((photo) => photo.id === id)
      if (removedPhoto) revokeAuditPhotoPreviewUrl(removedPhoto.previewUrl)
      return current.filter((photo) => photo.id !== id)
    })
  }

  function openMismatchDetails() {
    setShowDetailedFields(true)
  }


  function scrollToAuditScanInput() {
    document.getElementById("audit-scan-input-panel")?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  function handleChangeAuditTarget() {
    void stopScanner()
    clearAuditScanTarget()
    setScanText("")
    setScanSource("manual")
    window.setTimeout(scrollToAuditScanInput, 0)
  }

  function pushRecentScan(feedback: ScanFeedback, source: "manual" | "qr" = scanSource) {
    const at = Date.now()
    setRecentScans((current) => [
      {
        ...feedback,
        id: `${at}-${feedback.status}-${current.length}`,
        source,
        at,
      },
      ...current,
    ].slice(0, MAX_RECENT_AUDIT_SCANS))
  }

  function showScanFeedback(feedback: ScanFeedback, source: "manual" | "qr" = scanSource) {
    setScanFeedback(feedback)
    pushRecentScan(feedback, source)
  }

  function editRecentScan(scan: AuditRecentScan) {
    const normalizedAssetTag = scan.assetTag?.trim().toLocaleLowerCase("th-TH") ?? ""
    const targetItem = items.find((item) => {
      if (scan.assetId && item.assetId === scan.assetId) return true
      return Boolean(normalizedAssetTag && item.assetTag.trim().toLocaleLowerCase("th-TH") === normalizedAssetTag)
    })

    if (!targetItem) {
      const fallbackValue = scan.assetTag || scan.assetId
      if (fallbackValue) void selectScannedAsset(fallbackValue, "manual")
      return
    }

    selectInRoundAuditItem(targetItem, { mode: "edit" })
    setScanText(getReadableAuditScanValue(targetItem))
    setScanSource("manual")
    setAssetPickerExpanded(false)
    setShowPendingQueue(false)
    setShowDetailedFields(true)
    setScanFeedback({
      status: "found",
      title: t("feedbackFoundTitle"),
      description: targetItem.label,
      assetId: targetItem.assetId,
      assetTag: targetItem.assetTag,
    })
    toast.success(t("assetSelected"))
    window.setTimeout(() => {
      document.getElementById("audit-scan-input-panel")?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 0)
  }

  function resetTorchState() {
    setTorchAvailable(false)
    setTorchEnabled(false)
    setTorchUpdating(false)
  }

  function resetZoomState() {
    setZoomAvailable(false)
    setZoomLevels([])
    setZoomLevel(0)
    setZoomUpdating(false)
  }

  function syncTorchState(scanner: NativeAssetQrScannerRuntime | null) {
    const available = Boolean(scanner?.torch?.isAvailable())
    setTorchAvailable(available)
    setTorchEnabled(available ? Boolean(scanner?.torch?.isEnabled()) : false)
    setTorchUpdating(false)
  }

  function syncZoomState(scanner: NativeAssetQrScannerRuntime | null) {
    const zoom = scanner?.zoom
    const levels = zoom?.getSupportedLevels() ?? []
    const available = Boolean(zoom?.isAvailable() && levels.length > 0)
    setZoomAvailable(available)
    setZoomLevels(available && zoom ? zoom.getSupportedLevels() : [])
    setZoomLevel(available && zoom ? zoom.getZoom() : 0)
    setZoomUpdating(false)
  }

  async function toggleTorch() {
    const torch = qrReaderRef.current?.torch
    if (!torch?.isAvailable()) {
      resetTorchState()
      toast.warning(t("torchUnsupported"))
      return
    }

    const nextValue = !torchEnabled
    setTorchUpdating(true)
    try {
      const applied = await torch.setEnabled(nextValue)
      if (!applied) {
        resetTorchState()
        toast.warning(t("torchUnsupported"))
        return
      }
      setTorchAvailable(true)
      setTorchEnabled(nextValue)
    } finally {
      setTorchUpdating(false)
    }
  }

  async function setScannerZoom(level: number) {
    const zoom = qrReaderRef.current?.zoom
    if (!zoom?.isAvailable()) {
      resetZoomState()
      toast.warning(t("zoomUnsupported"))
      return
    }

    setZoomUpdating(true)
    try {
      const applied = await zoom.setZoom(level)
      if (!applied) {
        resetZoomState()
        toast.warning(t("zoomUnsupported"))
        return
      }
      setZoomAvailable(true)
      setZoomLevels(zoom.getSupportedLevels())
      setZoomLevel(zoom.getZoom())
    } finally {
      setZoomUpdating(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCameraReadiness(isCameraAccessSupported() ? "ready" : "unavailable")
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    return () => {
      const scanner = qrReaderRef.current
      if (!scanner) return
      scanner.stop()
    }
  }, [])

  useEffect(() => {
    const previewUrls = auditPhotoPreviewUrlsRef.current
    return () => {
      previewUrls.forEach((previewUrl) => {
        if (typeof URL !== "undefined") URL.revokeObjectURL(previewUrl)
      })
      previewUrls.clear()
    }
  }, [])

  const refreshOfflineQueue = useCallback(async () => {
    if (typeof window === "undefined") return
    const storage = getAuditOfflineStorage()
    setOfflineQueue(await loadQueuedAuditScansAsync(storage, roundId))
  }, [roundId])

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshOfflineQueue(), 0)
    return () => window.clearTimeout(timer)
  }, [refreshOfflineQueue])

  useEffect(() => {
    function updateNetworkState() {
      setOnline(navigator.onLine)
      if (navigator.onLine) void refreshOfflineQueue()
    }

    window.addEventListener("online", updateNetworkState)
    window.addEventListener("offline", updateNetworkState)
    return () => {
      window.removeEventListener("online", updateNetworkState)
      window.removeEventListener("offline", updateNetworkState)
    }
  }, [refreshOfflineQueue])

  function getAuditOfflineStorage() {
    if (!offlineStorageRef.current) {
      offlineStorageRef.current = createAuditOfflineIndexedDbStorage(window.localStorage)
    }
    return offlineStorageRef.current
  }

  async function startScanner(requestedCameraId?: string) {
    if (!isCameraAccessSupported()) {
      setCameraReadiness("unavailable")
      setCameraErrorText(t("cameraUnsupported"))
      toast.error(t("cameraUnsupported"))
      return
    }

    setScannerLoading(true)
    setCameraErrorText("")
    resetTorchState()
    resetZoomState()
    try {
      const { Html5Qrcode } = await import("html5-qrcode")
      const availableCameras = (await Html5Qrcode.getCameras()) as CameraDevice[]
      if (availableCameras.length === 0) {
        setCameraReadiness("unavailable")
        setCameraErrorText(t("cameraNotFound"))
        toast.error(t("cameraNotFound"))
        return
      }

      const cameraSelection = resolvePreferredCameraSelection(availableCameras, requestedCameraId)

      const handleScanSuccess = (decodedText: string) => {
        const normalizedText = decodedText.trim()
        const now = Date.now()
        if (lastDecodedRef.current?.value === normalizedText && now - lastDecodedRef.current.at < 1500) return
        lastDecodedRef.current = { value: normalizedText, at: now }
        setLastDecodedText(decodedText)
        void stopScanner()
        void selectScannedAsset(decodedText, "qr")
      }
      const startWithSelection = async (selection: PreferredCameraSelection) => {
        const scanner = await startNativeAssetQrScanner({
          readerId: "audit-qr-reader",
          cameraSelection: selection,
          onScanSuccess: handleScanSuccess,
          stopAfterSuccess: true,
        })
        qrReaderRef.current = scanner
        syncTorchState(scanner)
        syncZoomState(scanner)
      }

      try {
        await startWithSelection(cameraSelection)
      } catch (startError) {
        const fallbackCamera = getFallbackCameraAfterEnvironmentFailure(cameraSelection, availableCameras)
        if (!fallbackCamera) throw startError
        await startWithSelection(resolvePreferredCameraSelection([fallbackCamera], fallbackCamera.id))
      }
      setScannerRunning(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : t("cameraError")
      setCameraErrorText(message)
      toast.error(message)
      qrReaderRef.current = null
      resetTorchState()
      resetZoomState()
    } finally {
      setScannerLoading(false)
    }
  }

  async function stopScanner() {
    const scanner = qrReaderRef.current
    if (!scanner) return
    try {
      scanner.stop()
    } catch {
      // Scanner may already be stopped by the browser.
    } finally {
      qrReaderRef.current = null
      setScannerRunning(false)
      resetTorchState()
      resetZoomState()
    }
  }

  async function selectScannedAsset(rawValue: string, source: "manual" | "qr") {
    const normalizedValues = extractAssetLookupCandidatesFromScanValue(rawValue)
    const matchedItem = normalizedValues.map((value) => assetLookup.get(value)).find(Boolean)
    if (!matchedItem) {
      const lookup = await lookupScannedAsset(rawValue, source)
      if (lookup?.status === "in_round" && lookup.item?.assetId) {
        const lookedUpItem = items.find((item) => item.assetId === lookup.item?.assetId)
        if (lookedUpItem) {
          selectInRoundAuditItem(lookedUpItem)
          setScanText(getReadableAuditScanValue(lookedUpItem))
          setScanSource(source)
          setAssetPickerExpanded(false)
          showScanFeedback({
            status: "found",
            title: t("feedbackFoundTitle"),
            description: lookedUpItem.label,
            assetId: lookedUpItem.assetId,
            assetTag: lookedUpItem.assetTag,
          }, source)
          toast.success(t("assetSelected"))
          return true
        }
      }
      if (lookup?.status === "out_of_scope") {
        selectOutOfScopeAuditAsset(lookup.asset)
        setScanText(lookup.asset.assetTag || lookup.asset.title)
        setScanSource(source)
        setAssetPickerExpanded(false)
        showScanFeedback({
          status: "out_of_scope",
          title: t("feedbackOutOfScopeTitle"),
          description: `${lookup.asset.title} - ${lookup.asset.subtitle}`,
          assetId: lookup.asset.id,
          assetTag: lookup.asset.assetTag,
        }, source)
        toast.warning(t("outOfScopeFound"))
        return false
      }
      clearAuditScanTarget()
      showScanFeedback({
        status: "unknown_asset",
        title: t("feedbackUnknownAssetTitle"),
        description: t("feedbackUnknownAssetDescription", { code: rawValue }),
      }, source)
      toast.error(t("unknownAsset"))
      return false
    }

    selectInRoundAuditItem(matchedItem)
    setScanText(getReadableAuditScanValue(matchedItem))
    setScanSource(source)
    setAssetPickerExpanded(false)
    showScanFeedback({
      status: "found",
      title: t("feedbackFoundTitle"),
      description: matchedItem.label,
      assetId: matchedItem.assetId,
      assetTag: matchedItem.assetTag,
    }, source)
    toast.success(t("assetSelected"))
    return true
  }

  async function lookupScannedAsset(rawValue: string, source: "manual" | "qr") {
    const response = await fetch(`/api/audit-rounds/${roundId}/scan-lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawValue, scanSource: source }),
    })
    if (!response.ok) return null
    return (await response.json().catch(() => null)) as AuditScanLookupResponse | null
  }

  async function recordOutOfScopeAsset() {
    if (!outOfScopeAsset) return
    const outOfScopeActualValues = getOutOfScopeActualValues(values, outOfScopeAsset)
    if (hasOutOfScopeActualMismatch(outOfScopeAsset, outOfScopeActualValues) && queuedAuditPhotos.length === 0) {
      toast.error(t("auditPhotoRequiredForMismatch"))
      return
    }
    setSaving(true)
    try {
      const evidenceAttachmentIds = queuedAuditPhotos.length > 0 ? await uploadQueuedAuditPhotos(outOfScopeAsset.id) : []
      const response = await fetch(`/api/audit-rounds/${roundId}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: outOfScopeAsset.id,
          actualLocationId: outOfScopeActualValues.actualLocationId,
          actualCustodianId: outOfScopeActualValues.actualCustodianId,
          actualDepartmentId: outOfScopeActualValues.actualDepartmentId,
          actualConditionId: outOfScopeActualValues.actualConditionId,
          evidenceAttachmentIds,
          scanSource,
          remark: values.remark,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok && response.status !== 202) throw new Error(payload?.error ?? tCommon("error"))
      toast.success(t("outOfScopeSaved"))
      showScanFeedback({
        status: "mismatch",
        title: t("feedbackOutOfScopeSavedTitle"),
        description: `${outOfScopeAsset.title} - ${outOfScopeAsset.subtitle}`,
        assetId: outOfScopeAsset.id,
        assetTag: outOfScopeAsset.assetTag,
      })
      setOutOfScopeAsset(null)
      setScanText("")
      resetAuditPhotoQueue()
      setValues({
        assetId: "",
        actualLocationId: "",
        actualCustodianId: "",
        actualDepartmentId: "",
        actualConditionId: "",
        remark: "",
      })
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedItem) return
    await submitAuditScan(getActualValues(values, selectedItem), false)
  }

  async function submitAuditScan(actualValues: ReturnType<typeof getActualValues>, quickMatched: boolean) {
    if (!selectedItem) return
    if (!quickMatched && requiresMismatchPhoto && queuedAuditPhotos.length === 0) {
      toast.error(t("auditPhotoRequiredForMismatch"))
      return
    }
    setSaving(true)
    const requestPayload: AuditOfflineScanPayload = {
      assetId: values.assetId,
      ...emptyToNull(actualValues),
      scanSource,
      applyCorrections: !quickMatched && applyCorrections && correctionMismatchCount > 0,
      resultCorrection: Boolean(editingScanResult),
      remark: values.remark || null,
    }
    try {
      let response: Response
      try {
        response = await fetch(`/api/audit-rounds/${roundId}/scan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload),
        })
      } catch {
        await queueOfflineScan(requestPayload, selectedItem.label)
        return
      }
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      for (const photo of queuedAuditPhotos) {
        await uploadAuditPhoto(values.assetId, photo.file, photo.label)
      }
      const feedbackStatus = payload.resolvedNotFoundFinding ? "found_later" : payload.auditResult === "found" ? "saved" : "mismatch"
      setLastResult({ status: feedbackStatus, label: selectedItem.label })
      const successMessage =
        payload.resolvedNotFoundFinding
          ? t("foundAfterNotFoundSuccess")
          : payload.appliedCorrections?.length
          ? t("correctionAppliedSuccess")
          : payload.auditResult === "found"
            ? t("foundSuccess")
            : t("mismatchSuccess")
      showScanFeedback({
        status: feedbackStatus,
        title: successMessage,
        description: selectedItem.label,
        assetId: selectedItem.assetId,
        assetTag: selectedItem.assetTag,
      })
      toast.success(successMessage)
      setValues({
        assetId: "",
        actualLocationId: "",
        actualCustodianId: "",
        actualDepartmentId: "",
        actualConditionId: "",
        remark: "",
      })
      resetAuditPhotoQueue()
      setApplyCorrections(false)
      setShowDetailedFields(false)
      setScanSource("manual")
      setEditingScanResult(null)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  async function confirmComponentWithParent(component: AuditScanComponent) {
    if (!selectedItem) return
    if (!component.auditItemId) {
      toast.error(t("componentOutOfRound"))
      return
    }

    setSaving(true)
    try {
      const actualValues = getActualValues(values, selectedItem)
      const response = await fetch(`/api/audit-rounds/${roundId}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: component.assetId,
          actualLocationId: actualValues.actualLocationId,
          actualCustodianId: actualValues.actualCustodianId,
          actualDepartmentId: actualValues.actualDepartmentId,
          actualConditionId: actualValues.actualConditionId,
          scanSource: "manual",
          confirmedWithParentAssetId: selectedItem.assetId,
          componentConfirmationReason: values.remark || t("componentConfirmedWithParentReason", { assetTag: selectedItem.assetTag }),
          remark: values.remark,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      toast.success(t("componentConfirmedWithParentSuccess"))
      showScanFeedback({
        status: "saved",
        title: t("componentConfirmedWithParentSuccess"),
        description: `${component.assetTag} - ${component.name}`,
        assetId: component.assetId,
        assetTag: component.assetTag,
      })
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  function openComponentMissingDialog(component: AuditScanComponent) {
    if (!selectedItem) return
    if (!component.auditItemId) {
      toast.error(t("componentOutOfRound"))
      return
    }

    setComponentMissingDraft(component)
    setComponentMissingRemark("")
    setComponentMissingEvidenceFile(null)
  }

  function resetComponentMissingDialog() {
    setComponentMissingDraft(null)
    setComponentMissingRemark("")
    setComponentMissingEvidenceFile(null)
  }

  function closeComponentMissingDialog() {
    if (saving) return
    resetComponentMissingDialog()
  }

  async function submitComponentMissing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedItem || !componentMissingDraft?.auditItemId) return

    const component = componentMissingDraft
    const body = new FormData()
    body.append("remark", componentMissingRemark.trim() || t("componentMissingDefaultRemark", { assetTag: selectedItem.assetTag }))
    if (componentMissingEvidenceFile) body.append("evidence", componentMissingEvidenceFile)

    setSaving(true)
    try {
      const response = await fetch(`/api/audit-items/${component.auditItemId}/mark-not-found`, {
        method: "POST",
        body,
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      toast.success(t("componentMissingSaved"))
      showScanFeedback({
        status: "mismatch",
        title: t("componentMissingSaved"),
        description: `${component.assetTag} - ${component.name}`,
        assetId: component.assetId,
        assetTag: component.assetTag,
      })
      resetComponentMissingDialog()
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  async function queueOfflineScan(payload: AuditOfflineScanPayload, label: string) {
    if (typeof window === "undefined") return
    await addQueuedAuditScanAsync(getAuditOfflineStorage(), roundId, payload, {
      photos: queuedAuditPhotos.map(toAuditOfflinePhoto),
    })
    await refreshOfflineQueue()
    showScanFeedback({
      status: "offline_queued",
      title: t("offlineQueuedTitle"),
      description: label,
      assetId: payload.assetId,
    })
    toast.warning(queuedAuditPhotos.length > 0 ? t("offlineQueuedWithPhotos") : t("offlineQueued"))
    setValues({
      assetId: "",
      actualLocationId: "",
      actualCustodianId: "",
      actualDepartmentId: "",
      actualConditionId: "",
      remark: "",
    })
    resetAuditPhotoQueue()
    setApplyCorrections(false)
    setShowDetailedFields(false)
    setScanSource("manual")
    setEditingScanResult(null)
  }

  async function retryOfflineQueue() {
    if (typeof window === "undefined" || offlineQueue.length === 0) return
    setSaving(true)
    let savedCount = 0
    try {
      for (const queued of offlineQueue) {
        const response = await fetch(`/api/audit-rounds/${roundId}/scan`, {
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
            resultCorrection: Boolean(queued.resultCorrection),
            remark: queued.remark,
          }),
        })
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
        for (const photo of queued.photos ?? []) {
          await uploadAuditPhoto(queued.assetId, new File([photo.blob], photo.fileName, { type: photo.fileType }), photo.label)
        }
        await removeQueuedAuditScanAsync(getAuditOfflineStorage(), roundId, queued.id)
        savedCount += 1
      }
      await refreshOfflineQueue()
      toast.success(t("offlineRetrySuccess", { count: savedCount }))
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : tCommon("error")
      const failed = offlineQueue[savedCount]
      if (failed) {
        await markQueuedAuditScanSyncFailed(getAuditOfflineStorage(), roundId, failed.id, message).catch(() => undefined)
      }
      await refreshOfflineQueue()
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  async function handleQuickMatchedScan() {
    if (!selectedItem) return
    await submitAuditScan(
      {
        actualLocationId: selectedItem.expectedLocationId,
        actualCustodianId: selectedItem.expectedCustodianId ?? "",
        actualDepartmentId: selectedItem.expectedDepartmentId ?? "",
        actualConditionId: selectedItem.expectedConditionId ?? "",
      },
      true
    )
  }

  async function uploadAuditPhoto(assetId: string, file: File, label: string) {
    const formData = new FormData()
    formData.append("file", file)
    if (label) formData.append("photoLabel", label)

    const response = await fetch(`/api/assets/${assetId}/attachments`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const result = await response.json().catch(() => null)
      throw new Error(result?.error ?? t("auditPhotoUploadFailed"))
    }

    return (await response.json()) as { id: string }
  }

  async function uploadQueuedAuditPhotos(assetId: string) {
    const uploadedAttachments: Array<{ id: string }> = []
    for (const photo of queuedAuditPhotos) {
      uploadedAttachments.push(await uploadAuditPhoto(assetId, photo.file, photo.label))
    }
    return uploadedAttachments.map((attachment) => attachment.id)
  }

  return (
    <div className={`mx-auto max-w-6xl ${selectedItem ? "pb-[calc(9rem+max(0.75rem,env(safe-area-inset-bottom)))] md:pb-0" : ""}`}>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href={backHref} className="mb-3 inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent">
            <ArrowLeft className="h-4 w-4" />
            {tCommon("back")}
          </Link>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{roundName}</p>
        </div>
        {lastResult && (
          <div className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="break-words">{formatLastAuditResult(lastResult, t)}</span>
          </div>
        )}
      </div>

      <div className={`sticky top-0 z-20 border border-border bg-surface/95 shadow-sm backdrop-blur ${compactProgressHeader ? "mb-3 rounded-md p-2" : "mb-4 rounded-lg p-3"}`}>
        {compactProgressHeader ? (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span className="rounded-full border border-border bg-background px-2 py-1">
              {t("scannedQueue")}: <span className="font-semibold text-foreground">{queueProcessedCount.toLocaleString("th-TH")}/{queueTotal.toLocaleString("th-TH")}</span>
            </span>
            <span className="rounded-full border border-border bg-background px-2 py-1">
              {t("pendingQueue")}: <span className="font-semibold text-foreground">{queuePendingCount.toLocaleString("th-TH")}</span>
            </span>
            {hasAuditContext ? (
              <span className="rounded-full border border-primary/30 bg-primary/5 px-2 py-1 font-medium text-primary">
                {t("walkingContextActive")}
              </span>
            ) : null}
            <span className="rounded-full border border-border bg-background px-2 py-1">
              {t("photoQueue")}: <span className="font-semibold text-foreground">{queuedAuditPhotos.length.toLocaleString("th-TH")}</span>
            </span>
            <button
              type="button"
              onClick={togglePendingQueue}
              aria-expanded={showPendingQueue}
              aria-controls="audit-pending-queue-panel"
              className="inline-flex min-h-8 flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-background px-2 py-1 font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:flex-none"
            >
              <ListChecks className="h-3.5 w-3.5" />
              {t("pendingQueueQuickAction", { count: queuePendingCount })}
            </button>
          </div>
        ) : null}
        {!compactProgressHeader ? (
          <>
            <AuditProgressBar
              compact
              total={queueTotal}
              processed={queueProcessedCount}
              pending={queuePendingCount}
              label={t("progress")}
              processedLabel={t("scannedQueue")}
              pendingLabel={t("pendingQueue")}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border bg-background px-2 py-1">
                {t("photoQueue")}: <span className="font-semibold text-foreground">{queuedAuditPhotos.length}</span>
              </span>
              <button
                type="button"
                onClick={togglePendingQueue}
                aria-expanded={showPendingQueue}
                aria-controls="audit-pending-queue-panel"
                className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border bg-background px-2 py-1 font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <ListChecks className="h-3.5 w-3.5" />
                {t("pendingQueueQuickAction", { count: queuePendingCount })}
              </button>
            </div>
            <div className="mt-3 grid gap-2 rounded-md border border-border bg-background p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">{t("walkingContextLocation")}</span>
                <select
                  value={auditContext.locationId}
                  onChange={(event) => updateAuditContext({ locationId: event.target.value })}
                  className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="">{t("walkingContextAllLocations")}</option>
                  {contextLocationOptions.map((location) => <option key={location.id} value={location.id}>{location.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">{t("walkingContextDepartment")}</span>
                <select
                  value={auditContext.departmentId}
                  onChange={(event) => updateAuditContext({ departmentId: event.target.value })}
                  className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="">{t("walkingContextAllDepartments")}</option>
                  {contextDepartmentOptions.map((department) => <option key={department.id} value={department.id}>{department.label}</option>)}
                </select>
              </label>
              {hasAuditContext ? (
                <button
                  type="button"
                  onClick={() => updateAuditContext(emptyAuditScanContext)}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent md:h-10 md:min-h-0"
                >
                  {t("walkingContextClear")}
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          <div data-audit-scan-primary className="contents">
          {scanFeedback && (
            <ScanResultPanel feedback={scanFeedback} t={t} />
          )}

          {editingScanResult ? (
            <div className="md:col-span-2 rounded-md border border-info/30 bg-info/10 p-3 text-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <RefreshCcw className="h-4 w-4 text-info" />
                    {t("editSavedResultTitle")}
                  </div>
                  <div className="mt-1 break-words text-muted-foreground">
                    {t("editSavedResultHelp", { asset: editingScanResult.label })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearAuditScanTarget}
                  className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                >
                  {t("editSavedResultCancel")}
                </button>
              </div>
            </div>
          ) : null}
          <div id="audit-scan-input-panel" className={`scroll-mt-24 md:col-span-2 rounded-md border p-3 sm:p-4 ${scanEntryPanelClass}`}>
            {!selectedItem && !scanFeedback ? (
              <div className="mb-2 flex flex-col gap-1">
                <div className="text-sm font-semibold text-foreground">{t("scanEntryTitle")}</div>
                <div className="text-xs text-muted-foreground">{t("scanEntryHelp")}</div>
              </div>
            ) : null}
            <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <Field label={t("scanInput")}>
                <input
                  value={scanText}
                  onChange={(event) => {
                    setScanText(event.target.value)
                    setScanSource("manual")
                  }}
                  placeholder={t("scanInputPlaceholder")}
                  className="h-12 w-full rounded-md border border-border bg-surface px-3 text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <span className="mt-1 block text-xs text-muted-foreground">{t("scanInputHelp")}</span>
              </Field>
              <div className="grid grid-cols-2 gap-2 lg:w-[15rem] lg:pt-[1.625rem]">
                <button
                  type="button"
                  onClick={() => void (scannerRunning ? stopScanner() : startScanner())}
                  disabled={scannerLoading}
                  className={`inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 ${
                    scannerRunning
                      ? "border-border bg-surface text-foreground hover:bg-accent"
                      : "border-primary bg-primary text-white hover:bg-primary/90"
                  }`}
                >
                  {scannerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : scannerRunning ? <X className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                  {scannerRunning ? t("stopCamera") : t("startCamera")}
                </button>
                <button
                  type="button"
                  onClick={handleManualScanAction}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <Keyboard className="h-4 w-4" />
                  {t("manualScanAction")}
                </button>
              </div>
            </div>
            {manualScanSuggestions.length > 0 ? (
              <ManualScanSuggestionList
                items={manualScanSuggestions}
                onSelect={selectManualScanSuggestion}
                optionLabelMaps={optionLabelMaps}
                t={t}
              />
            ) : null}
            {shouldShowCameraPanel ? (
              <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,320px)]">
                <div
                  className={`relative isolate aspect-square sm:aspect-[4/3] w-full max-w-full overflow-hidden rounded-md border border-border bg-surface sm:min-h-[22rem] ${scannerRunning || scannerLoading ? "block" : "hidden"}`}
                >
                  <div id="audit-qr-reader" className="w-full [&_video]:!h-auto [&_video]:!w-full" />
                  {scannerRunning ? <AuditQrScannerOverlay /> : null}
                  {scannerRunning && zoomAvailable ? (
                    <div className="absolute left-3 top-3 z-20 inline-flex min-h-11 items-center gap-1 rounded-md border border-white/50 bg-slate-950/70 p-1 shadow-sm">
                      {zoomLevels.map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => void setScannerZoom(level)}
                          disabled={zoomUpdating}
                          aria-pressed={Math.abs(zoomLevel - level) < 0.05}
                          aria-label={t("zoomCamera", { level })}
                          title={t("zoomCamera", { level })}
                          className={`inline-flex min-h-9 min-w-11 items-center justify-center rounded px-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60 ${
                            Math.abs(zoomLevel - level) < 0.05
                              ? "bg-white text-slate-950"
                              : "text-white hover:bg-white/15"
                          }`}
                        >
                          {level}x
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {scannerRunning && torchAvailable ? (
                    <button
                      type="button"
                      onClick={toggleTorch}
                      disabled={torchUpdating}
                      aria-pressed={torchEnabled}
                      title={t(torchEnabled ? "torchOff" : "torchOn")}
                      className={`absolute right-3 top-3 z-20 inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60 ${
                        torchEnabled
                          ? "border-warning/50 bg-warning text-white hover:bg-warning/90"
                          : "border-white/50 bg-slate-950/70 text-white hover:bg-slate-950/85"
                      }`}
                    >
                      {torchUpdating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : torchEnabled ? (
                        <FlashlightOff className="h-4 w-4" />
                      ) : (
                        <Flashlight className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">{t(torchEnabled ? "torchOff" : "torchOn")}</span>
                    </button>
                  ) : null}
                </div>
                {shouldShowCameraUtilities ? (
                  <div className="rounded-md border border-border bg-surface p-3 text-sm text-muted-foreground">
                    {lastDecodedText ? (
                      <div className="rounded-md bg-background p-2 text-xs">
                        <div className="font-medium text-foreground">{t("lastDecoded")}</div>
                        <div className="mt-1 break-all">{lastDecodedText}</div>
                      </div>
                    ) : null}
                    {hasCameraIssue ? (
                      <div className="mt-3 rounded-md border border-warning/30 bg-warning/10 p-2 text-xs text-warning">
                        <div>{cameraErrorText || t("cameraUnsupported")}</div>
                        <div className="mt-1 text-muted-foreground">{t("cameraHelp")}</div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {selectedItem && (
            <div className="md:col-span-2 rounded-md border border-primary/25 bg-primary/5 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-xs font-semibold text-primary">{t("currentTarget")}</div>
                    {scanTargetLocked ? (
                      <span className="inline-flex min-h-7 items-center rounded-md border border-success/30 bg-success/10 px-2 py-1 text-xs font-semibold text-success">
                        {t("targetLockedBadge")}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 break-words text-lg font-semibold text-foreground">{selectedItem.label}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{scanTargetLocked ? t("targetLockedHelp") : t("currentTargetHelp")}</div>
                </div>
                <div className="shrink-0 rounded-md border border-primary/20 bg-surface px-3 py-2 text-xs font-medium text-primary">
                  {t("systemDataTitle")}
                </div>
              </div>
              <div className="mt-4 rounded-md border border-border bg-surface">
                <div className="border-b border-border px-3 py-2">
                  <div className="text-sm font-semibold text-foreground">{t("systemDataTitle")}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{t("systemDataHelp")}</div>
                </div>
                <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
                  {systemDataRows.map((row) => (
                    <div key={row.label} className="border-b border-border px-3 py-2 last:border-b-0 sm:border-r sm:last:border-r-0 lg:border-b-0">
                      <div className="text-xs font-medium text-muted-foreground">{row.label}</div>
                      <div className="mt-1 break-words text-sm font-semibold text-foreground">{row.value}</div>
                    </div>
                  ))}
                </div>
              </div>
              {selectedItem.installedIn.length > 0 ? (
                <div className="mt-3 grid gap-2">
                  {selectedItem.installedIn.map((parent) => (
                    <div key={parent.parentAssetId} className="flex flex-col gap-2 rounded-md border border-info/30 bg-info/10 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-2">
                        <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                        <div className="min-w-0">
                          <div className="font-medium text-foreground">
                            {t("installedInParentNotice", { assetTag: parent.assetTag, role: parent.componentRole })}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">
                            {parent.name}{parent.slotNo ? ` - ${parent.slotNo}` : ""}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {selectedItem && fastMode && !showDetailedFields && (
            <div className="hidden rounded-md border border-success/30 bg-success/10 p-4 md:col-span-2 md:block">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-base font-semibold text-foreground">{t("auditDecisionTitle")}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{t("auditDecisionHelp")}</div>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={handleQuickMatchedScan}
                    disabled={saving}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-success px-4 text-sm font-semibold text-white transition-colors hover:bg-success/90 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {t("dataMatches")}
                  </button>
                  <button
                    type="button"
                    onClick={openMismatchDetails}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-warning/40 bg-surface px-4 text-sm font-medium text-warning transition-colors hover:bg-warning/10"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    {t("dataMismatch")}
                  </button>
                  <button
                    type="button"
                    onClick={handleChangeAuditTarget}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    {t("changeTargetAction")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {outOfScopeAsset && (
            <div className="md:col-span-2 rounded-md border border-warning/40 bg-warning/10 p-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold text-warning">{t("outOfScopeTitle")}</div>
                  {scanTargetLocked ? (
                    <span className="inline-flex min-h-7 items-center rounded-md border border-success/30 bg-success/10 px-2 py-1 text-xs font-semibold text-success">
                      {t("targetLockedBadge")}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 text-lg font-semibold text-foreground">{outOfScopeAsset.title} - {outOfScopeAsset.subtitle}</div>
                <div className="mt-1 text-sm text-muted-foreground">{outOfScopeAsset.meta.location}</div>
                <div className="mt-1 text-sm text-muted-foreground">{outOfScopeAsset.meta.custodian ?? t("none")}</div>
              </div>
              {outOfScopeAsset.installedIn.length > 0 ? (
                <div className="mt-3 grid gap-2">
                  {outOfScopeAsset.installedIn.map((parent) => (
                    <div key={parent.parentAssetId} className="flex flex-col gap-2 rounded-md border border-info/30 bg-info/10 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-2">
                        <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                        <div className="min-w-0">
                          <div className="font-medium text-foreground">
                            {t("installedInParentNotice", { assetTag: parent.assetTag, role: parent.componentRole })}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">
                            {parent.name}{parent.slotNo ? ` - ${parent.slotNo}` : ""}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="mt-4 border-t border-warning/30 pt-4">
                <div className="text-sm font-semibold text-foreground">{t("actualDataTitle")}</div>
                <div className="mt-1 text-sm text-muted-foreground">{t("outOfScopeHelp")}</div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {normalizeAssetOwnershipType(outOfScopeAsset.ownershipType) !== "software_license" ? (
                    <Select label={t("actualLocation")} value={values.actualLocationId || outOfScopeAsset.currentLocationId || ""} required onChange={(value) => setField("actualLocationId", value)}>
                      <OptionList options={options.locations} />
                    </Select>
                  ) : null}
                  {requiresCustodian(outOfScopeAsset.ownershipType) ? (
                    <Select label={t("actualCustodian")} value={values.actualCustodianId} onChange={(value) => setField("actualCustodianId", value)}>
                      <OptionList emptyLabel={t("none")} options={options.employees} />
                    </Select>
                  ) : null}
                  <Select label={t("actualDepartment")} value={values.actualDepartmentId} onChange={(value) => setField("actualDepartmentId", value)}>
                    <OptionList emptyLabel={t("none")} options={options.departments} />
                  </Select>
                  <Select label={t("actualCondition")} value={values.actualConditionId} onChange={(value) => setField("actualConditionId", value)}>
                    <OptionList emptyLabel={t("none")} options={options.conditions} />
                  </Select>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={recordOutOfScopeAsset}
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-warning px-4 text-sm font-medium text-white transition-colors hover:bg-warning/90 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                  {t("recordOutOfScope")}
                </button>
              </div>
            </div>
          )}

          {isDetailedScanVisible && (
            <>
              <div className="md:col-span-2 rounded-md border border-warning/30 bg-warning/10 p-3">
                <div className="text-sm font-semibold text-foreground">{t("actualDataTitle")}</div>
                <div className="mt-1 text-sm text-muted-foreground">{t("actualDataHelp")}</div>
              </div>
              {selectedItem && normalizeAssetOwnershipType(selectedItem.ownershipType) !== "software_license" ? (
                <Select label={t("actualLocation")} value={values.actualLocationId || selectedItem.expectedLocationId || ""} required onChange={(value) => setField("actualLocationId", value)}>
                  <OptionList options={options.locations} />
                </Select>
              ) : null}
              {selectedItem && requiresCustodian(selectedItem.ownershipType) ? (
                <Select label={t("actualCustodian")} value={values.actualCustodianId} onChange={(value) => setField("actualCustodianId", value)}>
                  <OptionList emptyLabel={t("none")} options={options.employees} />
                </Select>
              ) : null}
              <Select label={t("actualDepartment")} value={values.actualDepartmentId} onChange={(value) => setField("actualDepartmentId", value)}>
                <OptionList emptyLabel={t("none")} options={options.departments} />
              </Select>
              <Select label={t("actualCondition")} value={values.actualConditionId} onChange={(value) => setField("actualConditionId", value)}>
                <OptionList emptyLabel={t("none")} options={options.conditions} />
              </Select>

              {selectedItem && (
                <div className="md:col-span-2 rounded-md border border-border bg-background p-3 text-sm">
                  {mismatchPreview.length === 0 ? (
                    <div className="text-success">{t("matchedPreview")}</div>
                  ) : (
                    <div className="text-warning">
                      {t("mismatchPreview", { fields: mismatchPreview.map((mismatch) => mismatch.label).join(", ") })}
                    </div>
                  )}
                  {correctionMismatchCount > 0 && (
                    <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-md border border-info/30 bg-info/10 p-3 text-sm">
                      <input
                        type="checkbox"
                        checked={applyCorrections}
                        onChange={(event) => setApplyCorrections(event.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span>
                        <span className="block font-semibold text-foreground">{t("applyAuditCorrections")}</span>
                        <span className="mt-1 block text-muted-foreground">{t("applyAuditCorrectionsHelp")}</span>
                      </span>
                    </label>
                  )}
                </div>
              )}
            </>
          )}

          </div>

          <div data-audit-scan-supporting className="contents">
          {selectedItem && selectedItem.components.length > 0 ? (
            <div className="md:col-span-2">
              <AuditComponentPanel
                components={selectedItem.components}
                saving={saving}
                onScanComponent={scanComponentQr}
                onConfirmWithParent={confirmComponentWithParent}
                onMarkMissing={openComponentMissingDialog}
                t={t}
              />
            </div>
          ) : null}

          {outOfScopeAsset && outOfScopeAsset.components.length > 0 ? (
            <div className="md:col-span-2">
              <AuditComponentPanel
                components={outOfScopeAsset.components}
                saving={saving}
                componentActionsDisabled={true}
                onScanComponent={scanComponentQr}
                onConfirmWithParent={confirmComponentWithParent}
                onMarkMissing={openComponentMissingDialog}
                t={t}
              />
            </div>
          ) : null}

          {!showFallbackPicker ? (
            <div className="md:col-span-2 -mt-2">
              <button
                type="button"
                aria-expanded={assetPickerExpanded}
                aria-controls="audit-asset-fallback-picker"
                onClick={() => assetPickerExpanded ? setAssetPickerExpanded(false) : setAssetPickerExpanded(true)}
                className="inline-flex min-h-10 w-full items-center justify-between gap-3 rounded-md border border-dashed border-border bg-background px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-auto sm:min-w-[18rem]"
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <ListChecks className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate font-medium text-foreground">{t("assetPickerTitle")}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    {pendingCount.toLocaleString("th-TH")}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </span>
              </button>
            </div>
          ) : null}

          {showFallbackPicker ? (
            <AssetFallbackPicker
              expanded={assetPickerExpanded}
              items={filteredAssetPickerItems}
              query={assetPickerQuery}
              selectedAssetId={values.assetId}
              total={items.length}
              onExpandedChange={setAssetPickerExpanded}
              onQueryChange={setAssetPickerQuery}
              onSelect={selectAssetFromFallback}
              optionLabelMaps={optionLabelMaps}
              t={t}
            />
          ) : null}

          {recentScans.length > 0 ? (
            <RecentScansPanel
              recentScans={recentScans}
              onEditScan={editRecentScan}
              t={t}
            />
          ) : null}

          {showPendingQueue ? (
            <PendingQueuePanel
              items={pendingQueuePreview}
              total={queuePendingCount}
              pendingHref={pendingListHref}
              onSelect={selectPendingQueueItem}
              expanded={pendingQueueExpanded}
              onExpandedChange={setPendingQueueExpanded}
              optionLabelMaps={optionLabelMaps}
              t={t}
            />
          ) : null}

          {shouldShowAuditPhotoEvidence && (
            <div id="audit-photo-evidence" className="scroll-mt-24 md:col-span-2 rounded-md border border-border bg-background p-4">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-foreground">{t("auditPhotoEvidence")}</div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {requiresMismatchPhoto ? t("auditPhotoRequiredForMismatch") : t("auditPhotoOptionalForMatch")}
                  </p>
                </div>
                {requiresMismatchPhoto ? (
                  <span
                    className={[
                      "inline-flex min-h-8 shrink-0 items-center rounded-md border px-2.5 py-1 text-xs font-semibold",
                      !evidenceRequirementSatisfied
                        ? "border-warning/40 bg-warning/10 text-warning"
                        : "border-success/30 bg-success/10 text-success",
                    ].join(" ")}
                  >
                    {evidenceRequirementSatisfied ? t("auditPhotoRequirementMet") : t("auditPhotoRequiredCounter", { count: queuedAuditPhotos.length })}
                  </span>
                ) : null}
              </div>
              <div className="mb-3 rounded-md border border-border bg-surface p-3">
                <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm font-semibold text-foreground">{t("selectAuditPhotoType")}</div>
                  <div className="text-xs text-muted-foreground">{t("auditPhotoTagHint")}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {auditPhotoTagOptions.map((item) => {
                    const isSelected = effectiveAuditPhotoLabel === item

                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setAuditPhotoLabel(item)}
                        className={[
                          "inline-flex min-h-9 items-center rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-foreground hover:bg-accent",
                        ].join(" ")}
                      >
                        {item}
                      </button>
                    )
                  })}
                </div>
              </div>
              <FileDropzone
                file={null}
                onFileChange={queueAuditPhoto}
                onFilesChange={queueAuditPhotoFiles}
                disabled={saving}
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif"
                capture="environment"
                multiple
                title={t("dropAuditPhotoTitle")}
                hint={t("dropAuditPhotoSelected")}
                browseLabel={t("dropAuditPhotoHint")}
              />
              {queuedAuditPhotos.length > 0 && (
                <div className="mt-3 rounded-md border border-border bg-surface p-3">
                  <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <ImagePlus className="h-4 w-4 text-primary" />
                      {t("queuedPhotos", { count: queuedAuditPhotos.length })}
                    </div>
                    {requiresMismatchPhoto ? (
                      <span className="inline-flex min-h-7 items-center rounded-md border border-info/30 bg-info/10 px-2 py-1 text-xs font-semibold text-info">
                        {t("queuedPhotoReadyForFinding")}
                      </span>
                    ) : null}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {queuedAuditPhotos.map((photo) => (
                      <div key={photo.id} className="grid grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-3 rounded-md bg-background px-3 py-2 text-sm">
                        <div
                          role={photo.previewUrl ? "img" : undefined}
                          aria-label={photo.previewUrl ? t("queuedPhotoPreviewAlt", { name: photo.file.name }) : undefined}
                          className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border border-border bg-muted bg-cover bg-center text-muted-foreground"
                          style={photo.previewUrl ? { backgroundImage: `url(${photo.previewUrl})` } : undefined}
                        >
                          {photo.previewUrl ? null : <ImagePlus className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-foreground">{photo.file.name}</div>
                          <div className="truncate text-xs text-muted-foreground">{photo.label || t("unlabeledPhoto")}</div>
                          <div className="mt-1 text-xs text-info">
                            {requiresMismatchPhoto ? t("queuedPhotoFindingAttachment") : t("queuedPhotoAuditAttachment")}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeQueuedAuditPhoto(photo.id)}
                          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:h-9 sm:w-9"
                          aria-label={t("removeQueuedPhoto")}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {shouldShowRemarkField && (
            <div className="md:col-span-2">
              <Field label={t("remark")}>
                <textarea value={values.remark} onChange={(event) => setField("remark", event.target.value)} rows={4} className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              </Field>
            </div>
          )}
          {offlineQueue.length > 0 ? (
            <div role="status" aria-live="polite" className={`md:col-span-2 rounded-lg border p-3 shadow-sm ${online ? "border-warning/30 bg-warning/10" : "border-danger/30 bg-danger/10"}`}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <WifiOff className={`mt-0.5 h-5 w-5 shrink-0 ${online ? "text-warning" : "text-danger"}`} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-foreground">{t("offlineQueueTitle", { count: offlineQueue.length })}</div>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${online ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                        {online ? t("networkOnline") : t("networkOffline")}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{offlineQueueHelp}</div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {t("offlineQueueDetails", {
                        photos: queuedOfflinePhotoCount,
                        failed: failedOfflineQueueCount,
                      })}
                    </div>
                    {lastOfflineQueueError ? (
                      <div className="mt-2 break-words rounded-md border border-danger/30 bg-danger/10 px-2 py-1 text-xs text-danger">
                        {t("offlineQueueLastError", { error: lastOfflineQueueError })}
                      </div>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={retryOfflineQueue}
                  disabled={saving || !online}
                  title={online ? t("offlineRetry") : t("networkOffline")}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-warning px-4 text-sm font-medium text-white transition-colors hover:bg-warning/90 disabled:opacity-50 md:w-auto"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  {t("offlineRetry")}
                </button>
              </div>
            </div>
          ) : null}
          </div>
          <div className={`sticky bottom-0 z-10 -mx-4 justify-end border-t border-border bg-surface/95 p-3 backdrop-blur md:col-span-2 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none ${submitBarVisibility}`}>
            <button type="submit" disabled={saving || !selectedItem || (fastMode && !showDetailedFields) || !evidenceRequirementSatisfied} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 text-base font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50 sm:w-auto">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("submitScan")}
            </button>
          </div>
        </form>
      </section>

      {componentMissingDraft ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-3 sm:items-center sm:p-4">
          <form
            onSubmit={submitComponentMissing}
            role="dialog"
            aria-modal="true"
            aria-labelledby="component-missing-dialog-title"
            className="w-full max-w-lg rounded-md border border-border bg-background p-4 shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 id="component-missing-dialog-title" className="text-base font-semibold text-foreground">
                  {t("componentMissingDialogTitle")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("componentMissingDialogDescription", { asset: `${componentMissingDraft.assetTag} - ${componentMissingDraft.name}` })}
                </p>
              </div>
              <button
                type="button"
                onClick={closeComponentMissingDialog}
                disabled={saving}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                aria-label={tCommon("cancel")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-foreground">{t("componentMissingRemarkOptional")}</span>
                <textarea
                  value={componentMissingRemark}
                  onChange={(event) => setComponentMissingRemark(event.target.value)}
                  disabled={saving}
                  rows={3}
                  placeholder={t("componentMissingRemarkPlaceholder")}
                  className="min-h-24 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                />
              </label>
              <FileDropzone
                file={componentMissingEvidenceFile}
                onFileChange={setComponentMissingEvidenceFile}
                disabled={saving}
                accept="image/*"
                capture="environment"
                title={t("componentMissingEvidenceTitle")}
                hint={t("componentMissingEvidenceSelected")}
                browseLabel={t("componentMissingEvidenceBrowse")}
              />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={closeComponentMissingDialog}
                disabled={saving}
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
              >
                {tCommon("cancel")}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-warning px-4 text-sm font-semibold text-white transition-colors hover:bg-warning/90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                {t("componentMissingConfirm")}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {showMobileQuickActionBar ? (
        <div data-audit-mobile-actions aria-label={t("mobileActionBar")} className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-3 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur md:hidden">
          <div className="mx-auto grid max-w-6xl grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleQuickMatchedScan}
              disabled={saving}
              className={mobileMatchedActionClassName}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              <span>{t("dataMatches")}</span>
            </button>
            <button
              type="button"
              onClick={openMismatchDetails}
              className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-warning/40 bg-surface px-3 py-2 text-sm font-semibold text-warning transition-colors hover:bg-warning/10"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>{t("dataMismatch")}</span>
            </button>
            <button
              type="button"
              onClick={handleChangeAuditTarget}
              className={mobileSecondaryActionClassName}
            >
              <RefreshCcw className="h-4 w-4" />
              <span>{t("changeTargetAction")}</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function isCameraAccessSupported() {
  return typeof navigator !== "undefined" && "mediaDevices" in navigator && "getUserMedia" in navigator.mediaDevices
}


function createAuditPhotoPreviewUrl(file: File) {
  if (!file.type.startsWith("image/") || typeof URL === "undefined") return null
  return URL.createObjectURL(file)
}


function subscribeToStoredAuditContext(storageKey: string, onStoreChange: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key === storageKey) onStoreChange()
  }

  window.addEventListener("storage", onStorage)
  window.addEventListener(storageKey, onStoreChange)
  return () => {
    window.removeEventListener("storage", onStorage)
    window.removeEventListener(storageKey, onStoreChange)
  }
}

function readStoredAuditContext(storageKey: string): AuditScanContext {
  try {
    const raw = window.localStorage.getItem(storageKey)
    const cached = auditContextSnapshotCache.get(storageKey)
    if (cached?.raw === raw) return cached.value

    const parsed = raw ? JSON.parse(raw) : null
    const value = isAuditScanContextValue(parsed) ? normalizeAuditScanContext(parsed) : emptyAuditScanContext
    auditContextSnapshotCache.set(storageKey, { raw, value })
    return value
  } catch {
    return emptyAuditScanContext
  }
}

function getEmptyAuditContext() {
  return emptyAuditScanContext
}

function isAuditScanContextValue(value: unknown): value is Partial<AuditScanContext> {
  return Boolean(value) && typeof value === "object"
}
