"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
  ScanLine,
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
  environmentCameraId,
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
  type AuditOfflinePhoto,
  type AuditOfflineScanPayload,
  type AuditOfflineQueueStorage,
  type QueuedAuditScan,
} from "@/lib/audit-offline-queue"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"

type Option = { id: string; label: string }
type AuditScanItem = {
  id: string
  assetId: string
  assetTag: string
  label: string
  auditStatus: string
  auditResult: string | null
  expectedDepartmentId: string | null
  expectedLocationId: string
  expectedCustodianId: string | null
  expectedConditionId: string | null
  ownershipType?: string | null
  photoChecklist: string[]
}

type AuditScanOptions = {
  locations: Option[]
  departments: Option[]
  employees: Option[]
  conditions: Option[]
}

type CameraDevice = { id: string; label: string }
type CameraReadiness = "checking" | "ready" | "unavailable"
type AuditMismatchPreview = { type: string; label: string; canApply: boolean }
type ScanFeedback = {
  status: "found" | "mismatch" | "out_of_scope" | "unknown_asset" | "saved" | "found_later" | "offline_queued"
  title: string
  description: string
}
type AuditRecentScan = ScanFeedback & {
  id: string
  source: "manual" | "qr"
  at: number
}
type QueuedAuditPhoto = {
  id: string
  label: string
  file: File
}

const MAX_RECENT_AUDIT_SCANS = 8
type OutOfScopeAsset = {
  id: string
  assetTag: string
  title: string
  subtitle: string
  meta: {
    location: string
    custodian: string | null
  }
}

export function AuditScanForm({
  locale,
  roundId,
  roundName,
  backHref,
  items,
  options,
}: {
  locale: string
  roundId: string
  roundName: string
  backHref: string
  items: AuditScanItem[]
  options: AuditScanOptions
}) {
  const router = useRouter()
  const t = useTranslations("auditScan")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)
  const [scannerRunning, setScannerRunning] = useState(false)
  const [scannerLoading, setScannerLoading] = useState(false)
  const [cameraReadiness, setCameraReadiness] = useState<CameraReadiness>("checking")
  const [cameraErrorText, setCameraErrorText] = useState("")
  const [cameras, setCameras] = useState<CameraDevice[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState("")
  const [scanText, setScanText] = useState("")
  const [scanSource, setScanSource] = useState<"manual" | "qr">("manual")
  const [lastResult, setLastResult] = useState<string | null>(null)
  const [lastDecodedText, setLastDecodedText] = useState("")
  const [auditPhotoLabel, setAuditPhotoLabel] = useState("")
  const [queuedAuditPhotos, setQueuedAuditPhotos] = useState<QueuedAuditPhoto[]>([])
  const [continuousScan, setContinuousScan] = useState(true)
  const [fastMode, setFastMode] = useState(true)
  const [showDetailedFields, setShowDetailedFields] = useState(false)
  const [scanFeedback, setScanFeedback] = useState<ScanFeedback | null>(null)
  const [recentScans, setRecentScans] = useState<AuditRecentScan[]>([])
  const [showPendingQueue, setShowPendingQueue] = useState(false)
  const [pendingQueueExpanded, setPendingQueueExpanded] = useState(true)
  const [outOfScopeAsset, setOutOfScopeAsset] = useState<OutOfScopeAsset | null>(null)
  const [applyCorrections, setApplyCorrections] = useState(false)
  const [offlineQueue, setOfflineQueue] = useState<QueuedAuditScan[]>([])
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine))
  const [torchAvailable, setTorchAvailable] = useState(false)
  const [torchEnabled, setTorchEnabled] = useState(false)
  const [torchUpdating, setTorchUpdating] = useState(false)
  const qrReaderRef = useRef<NativeAssetQrScannerRuntime | null>(null)
  const offlineStorageRef = useRef<AuditOfflineQueueStorage | null>(null)
  const lastDecodedRef = useRef<{ value: string; at: number } | null>(null)
  const [values, setValues] = useState({
    assetId: "",
    actualLocationId: "",
    actualCustodianId: "",
    actualDepartmentId: "",
    actualConditionId: "",
    remark: "",
  })

  const selectedItem = useMemo(() => items.find((item) => item.assetId === values.assetId), [items, values.assetId])
  const assetLookup = useMemo(() => buildAssetLookup(items), [items])
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
  const pendingQueuePreview = useMemo(() => pendingItems.slice(0, 8), [pendingItems])
  const scanReturnHref = appendOperationalReturnTo(`/${locale}/audit/rounds/${roundId}/scan`, backHref)
  const pendingListHref = appendOperationalReturnTo(`/${locale}/audit/rounds/${roundId}/pending`, scanReturnHref)
  const pendingCount = pendingItems.length
  const processedCount = items.length - pendingCount
  const isDetailedScanVisible = Boolean(selectedItem && (!fastMode || showDetailedFields))
  const showMobileQuickActionBar = Boolean(selectedItem && fastMode && !showDetailedFields)
  const submitBarVisibility = selectedItem ? (showMobileQuickActionBar ? "hidden md:flex" : "flex") : "hidden md:flex"
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
  const requiresMismatchPhoto = Boolean(isDetailedScanVisible && mismatchPreview.length > 0)
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
  const shouldShowCameraUtilities = cameras.length > 1 || torchAvailable || Boolean(lastDecodedText) || hasCameraIssue
  const shouldShowCameraPanel = scannerRunning || scannerLoading || shouldShowCameraUtilities
  const scanEntryPanelClass = !selectedItem && !scanFeedback
    ? "border-primary/30 bg-primary/5 shadow-sm ring-1 ring-primary/10"
    : "border-border bg-background"

  function setField(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    if (field === "assetId") {
      setApplyCorrections(false)
      setShowDetailedFields(false)
    }
  }

  function selectPendingQueueItem(item: AuditScanItem) {
    setField("assetId", item.assetId)
    setScanText(getReadableAuditScanValue(item))
    setScanSource("manual")
    setOutOfScopeAsset(null)
    setShowPendingQueue(false)
    window.setTimeout(() => {
      document.getElementById("audit-scan-input-panel")?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 0)
  }

  function togglePendingQueue() {
    const nextValue = !showPendingQueue
    setShowPendingQueue(nextValue)
    if (nextValue) setPendingQueueExpanded(true)
  }

  function queueAuditPhoto(file: File | null) {
    if (!file) return
    queueAuditPhotoFiles([file])
  }

  function queueAuditPhotoFiles(files: File[]) {
    if (files.length === 0) return
    setQueuedAuditPhotos((current) => [
      ...current,
      ...files.map((file, index) => ({
        id: `${Date.now()}-${file.name}-${current.length + index}`,
        label: effectiveAuditPhotoLabel,
        file,
      })),
    ])
  }

  function removeQueuedAuditPhoto(id: string) {
    setQueuedAuditPhotos((current) => current.filter((photo) => photo.id !== id))
  }

  function openMismatchDetails() {
    setShowDetailedFields(true)
  }

  function scrollToAuditPhotoEvidence() {
    document.getElementById("audit-photo-evidence")?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  function scrollToAuditScanInput() {
    document.getElementById("audit-scan-input-panel")?.scrollIntoView({ behavior: "smooth", block: "center" })
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

  function resetTorchState() {
    setTorchAvailable(false)
    setTorchEnabled(false)
    setTorchUpdating(false)
  }

  function syncTorchState(scanner: NativeAssetQrScannerRuntime | null) {
    const available = Boolean(scanner?.torch?.isAvailable())
    setTorchAvailable(available)
    setTorchEnabled(available ? Boolean(scanner?.torch?.isEnabled()) : false)
    setTorchUpdating(false)
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

  async function startScanner(requestedCameraId = selectedCameraId) {
    if (!isCameraAccessSupported()) {
      setCameraReadiness("unavailable")
      setCameraErrorText(t("cameraUnsupported"))
      toast.error(t("cameraUnsupported"))
      return
    }

    setScannerLoading(true)
    setCameraErrorText("")
    resetTorchState()
    try {
      const { Html5Qrcode } = await import("html5-qrcode")
      const availableCameras = (await Html5Qrcode.getCameras()) as CameraDevice[]
      setCameras(availableCameras)
      if (availableCameras.length === 0) {
        setCameraReadiness("unavailable")
        setCameraErrorText(t("cameraNotFound"))
        toast.error(t("cameraNotFound"))
        return
      }

      const cameraSelection = resolvePreferredCameraSelection(availableCameras, requestedCameraId)
      setSelectedCameraId(cameraSelection.selectedCameraId)

      const handleScanSuccess = (decodedText: string) => {
        const normalizedText = decodedText.trim()
        const now = Date.now()
        if (lastDecodedRef.current?.value === normalizedText && now - lastDecodedRef.current.at < 1500) return
        lastDecodedRef.current = { value: normalizedText, at: now }
        setLastDecodedText(decodedText)
        void selectScannedAsset(decodedText, "qr")
      }
      const startWithSelection = async (selection: PreferredCameraSelection) => {
        const scanner = await startNativeAssetQrScanner({
          readerId: "audit-qr-reader",
          cameraSelection: selection,
          onScanSuccess: handleScanSuccess,
          stopAfterSuccess: false,
        })
        qrReaderRef.current = scanner
        syncTorchState(scanner)
      }

      try {
        await startWithSelection(cameraSelection)
      } catch (startError) {
        const fallbackCamera = getFallbackCameraAfterEnvironmentFailure(cameraSelection, availableCameras)
        if (!fallbackCamera) throw startError
        setSelectedCameraId(fallbackCamera.id)
        await startWithSelection(resolvePreferredCameraSelection([fallbackCamera], fallbackCamera.id))
      }
      setScannerRunning(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : t("cameraError")
      setCameraErrorText(message)
      toast.error(message)
      qrReaderRef.current = null
      resetTorchState()
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
    }
  }

  async function handleCameraChange(cameraId: string) {
    setSelectedCameraId(cameraId)
    if (!scannerRunning) return

    await stopScanner()
    window.setTimeout(() => {
      void startScanner(cameraId)
    }, 0)
  }

  async function selectScannedAsset(rawValue: string, source: "manual" | "qr") {
    const normalizedValues = extractAssetLookupCandidatesFromScanValue(rawValue)
    const matchedItem = normalizedValues.map((value) => assetLookup.get(value)).find(Boolean)
    if (!matchedItem) {
      const foundAsset = await findOutOfScopeAsset(rawValue)
      if (foundAsset) {
        setOutOfScopeAsset(foundAsset)
        setValues((current) => ({ ...current, assetId: "" }))
        setScanText(foundAsset.assetTag || foundAsset.title)
        setScanSource(source)
        showScanFeedback({
          status: "out_of_scope",
          title: t("feedbackOutOfScopeTitle"),
          description: `${foundAsset.title} - ${foundAsset.subtitle}`,
        }, source)
        toast.warning(t("outOfScopeFound"))
        if (!continuousScan) void stopScanner()
        return false
      }
      setOutOfScopeAsset(null)
      showScanFeedback({
        status: "unknown_asset",
        title: t("feedbackUnknownAssetTitle"),
        description: t("feedbackUnknownAssetDescription", { code: rawValue }),
      }, source)
      toast.error(t("unknownAsset"))
      return false
    }

    setValues((current) => ({ ...current, assetId: matchedItem.assetId }))
    setOutOfScopeAsset(null)
    setApplyCorrections(false)
    setScanText(getReadableAuditScanValue(matchedItem))
    setScanSource(source)
    showScanFeedback({
      status: "found",
      title: t("feedbackFoundTitle"),
      description: matchedItem.label,
    }, source)
    toast.success(t("assetSelected"))
    if (source === "qr" && !continuousScan) void stopScanner()
    return true
  }

  async function findOutOfScopeAsset(rawValue: string) {
    const candidates = extractAssetLookupCandidatesFromScanValue(rawValue)
    for (const candidate of candidates) {
      if (candidate.length < 2) continue
      const response = await fetch(`/api/search?q=${encodeURIComponent(candidate)}`)
      if (!response.ok) continue
      const payload = await response.json().catch(() => null)
      const results = Array.isArray(payload?.results) ? payload.results : []
      const exactMatch = results.find((result: OutOfScopeAsset) => result.id.toLowerCase() === candidate || result.assetTag.toLowerCase() === candidate)
      if (exactMatch) return exactMatch as OutOfScopeAsset
      if (results[0]) return results[0] as OutOfScopeAsset
    }
    return null
  }

  async function recordOutOfScopeAsset() {
    if (!outOfScopeAsset) return
    setSaving(true)
    try {
      const response = await fetch(`/api/audit-rounds/${roundId}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: outOfScopeAsset.id,
          scanSource,
          remark: values.remark,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok && response.status !== 202) throw new Error(payload?.error ?? tCommon("error"))
      for (const photo of queuedAuditPhotos) {
        await uploadAuditPhoto(outOfScopeAsset.id, photo.file, photo.label)
      }
      toast.success(t("outOfScopeSaved"))
      showScanFeedback({
        status: "mismatch",
        title: t("feedbackOutOfScopeSavedTitle"),
        description: `${outOfScopeAsset.title} - ${outOfScopeAsset.subtitle}`,
      })
      setOutOfScopeAsset(null)
      setScanText("")
      setQueuedAuditPhotos([])
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
      setLastResult(payload.auditResult ?? null)
      const successMessage =
        payload.resolvedNotFoundFinding
          ? t("foundAfterNotFoundSuccess")
          : payload.appliedCorrections?.length
          ? t("correctionAppliedSuccess")
          : payload.auditResult === "found"
            ? t("foundSuccess")
            : t("mismatchSuccess")
      showScanFeedback({
        status: payload.resolvedNotFoundFinding ? "found_later" : payload.auditResult === "found" ? "saved" : "mismatch",
        title: successMessage,
        description: selectedItem.label,
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
      setQueuedAuditPhotos([])
      setAuditPhotoLabel("")
      setApplyCorrections(false)
      setShowDetailedFields(false)
      setScanSource("manual")
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
    setQueuedAuditPhotos([])
    setAuditPhotoLabel("")
    setApplyCorrections(false)
    setShowDetailedFields(false)
    setScanSource("manual")
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
  }

  return (
    <div className={`mx-auto max-w-6xl ${selectedItem ? "pb-36 md:pb-0" : ""}`}>
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
            {t("lastResult")}: {lastResult}
          </div>
        )}
      </div>

      <div className="sticky top-0 z-20 mb-4 rounded-lg border border-border bg-surface/95 p-3 shadow-sm backdrop-blur">
        <AuditProgressBar
          compact
          total={items.length}
          processed={processedCount}
          pending={pendingCount}
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
            {t("pendingQueueQuickAction", { count: pendingCount })}
          </button>
        </div>
      </div>

      {offlineQueue.length > 0 ? (
        <div className={`mb-4 rounded-lg border p-3 shadow-sm ${online ? "border-warning/30 bg-warning/10" : "border-danger/30 bg-danger/10"}`}>
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

      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          {scanFeedback && (
            <ScanResultPanel feedback={scanFeedback} recentScans={recentScans} t={t} />
          )}

          <div id="audit-scan-input-panel" className={`scroll-mt-24 md:col-span-2 rounded-md border p-4 ${scanEntryPanelClass}`}>
            {!selectedItem && !scanFeedback ? (
              <div className="mb-3 flex flex-col gap-1">
                <div className="text-sm font-semibold text-foreground">{t("scanEntryTitle")}</div>
                <div className="text-xs text-muted-foreground">{t("scanEntryHelp")}</div>
              </div>
            ) : null}
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <Field label={t("scanInput")}>
                <input
                  value={scanText}
                  onChange={(event) => setScanText(event.target.value)}
                  placeholder={t("scanInputPlaceholder")}
                  className="h-12 w-full rounded-md border border-border bg-surface px-3 text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <span className="mt-1 block text-xs text-muted-foreground">{t("scanInputHelp")}</span>
              </Field>
              <div className="grid grid-cols-2 gap-2 lg:w-[15rem] lg:pt-[1.625rem]">
                <button
                  type="button"
                  onClick={() => void selectScannedAsset(scanText, "manual")}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <Keyboard className="h-4 w-4" />
                  {t("manualScanAction")}
                </button>
                <button
                  type="button"
                  onClick={() => void (scannerRunning ? stopScanner() : startScanner())}
                  disabled={scannerLoading}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
                >
                  {scannerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : scannerRunning ? <X className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                  {scannerRunning ? t("stopCamera") : t("startCamera")}
                </button>
              </div>
            </div>
            <AuditScanOptionStrip
              continuousScan={continuousScan}
              onContinuousScanChange={setContinuousScan}
              fastMode={fastMode}
              onFastModeChange={(checked) => {
                setFastMode(checked)
                setShowDetailedFields(!checked)
              }}
              t={t}
            />
            {shouldShowCameraPanel ? (
              <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,320px)]">
                <div
                  className={`relative isolate aspect-[4/3] min-h-0 w-full max-w-full overflow-hidden rounded-md border border-border bg-surface sm:min-h-[22rem] ${scannerRunning || scannerLoading ? "block" : "hidden"}`}
                >
                  <div id="audit-qr-reader" className="w-full [&_video]:!h-auto [&_video]:!w-full" />
                  {scannerRunning ? <AuditQrScannerOverlay /> : null}
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
                    {cameras.length > 1 ? (
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-medium text-foreground">{t("cameraDevice")}</span>
                        <select
                          value={selectedCameraId}
                          disabled={scannerLoading}
                          onChange={(event) => void handleCameraChange(event.target.value)}
                          className="min-h-11 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60 sm:h-9 sm:min-h-0"
                        >
                          <option value={environmentCameraId}>{t("cameraRear")}</option>
                          {cameras.map((camera, index) => (
                            <option key={camera.id} value={camera.id}>
                              {camera.label || t("cameraDeviceFallback", { index: index + 1 })}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    {lastDecodedText ? (
                      <div className="mt-3 rounded-md bg-background p-2 text-xs">
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

          {showPendingQueue ? (
            <PendingQueuePanel
              items={pendingQueuePreview}
              total={pendingCount}
              pendingHref={pendingListHref}
              onSelect={selectPendingQueueItem}
              expanded={pendingQueueExpanded}
              onExpandedChange={setPendingQueueExpanded}
              t={t}
            />
          ) : null}

          <div className="md:col-span-2">
            <Select label={t("asset")} value={values.assetId} required onChange={(value) => setField("assetId", value)}>
              <option value="">{t("selectAsset")}</option>
              {items.map((item) => (
                <option key={item.id} value={item.assetId}>
                  {item.label} {item.auditStatus !== "pending" ? `(${item.auditStatus})` : ""}
                </option>
              ))}
            </Select>
          </div>

          {selectedItem && (
            <div className="md:col-span-2 rounded-md border border-primary/25 bg-primary/5 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-primary">{t("currentTarget")}</div>
                  <div className="mt-1 break-words text-lg font-semibold text-foreground">{selectedItem.label}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{t("currentTargetHelp")}</div>
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
                    onClick={scrollToAuditPhotoEvidence}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    <ImagePlus className="h-4 w-4" />
                    {t("captureEvidenceAction")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {outOfScopeAsset && (
            <div className="md:col-span-2 rounded-md border border-warning/40 bg-warning/10 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-sm font-semibold text-warning">{t("outOfScopeTitle")}</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">{outOfScopeAsset.title} - {outOfScopeAsset.subtitle}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{outOfScopeAsset.meta.location}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{outOfScopeAsset.meta.custodian ?? t("none")}</div>
                </div>
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
              <p className="mt-3 text-sm text-muted-foreground">{t("outOfScopeHelp")}</p>
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
                <Select label={t("actualCustodian")} value={values.actualCustodianId || selectedItem.expectedCustodianId || ""} onChange={(value) => setField("actualCustodianId", value)}>
                  <OptionList emptyLabel={t("none")} options={options.employees} />
                </Select>
              ) : null}
              <Select label={t("actualDepartment")} value={values.actualDepartmentId || selectedItem?.expectedDepartmentId || ""} onChange={(value) => setField("actualDepartmentId", value)}>
                <OptionList emptyLabel={t("none")} options={options.departments} />
              </Select>
              <Select label={t("actualCondition")} value={values.actualConditionId || selectedItem?.expectedConditionId || ""} onChange={(value) => setField("actualConditionId", value)}>
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

          {selectedItem && (
            <div id="audit-photo-evidence" className="scroll-mt-24 md:col-span-2 rounded-md border border-border bg-background p-4">
              <div className="mb-3 text-sm font-semibold text-foreground">{t("auditPhotoEvidence")}</div>
              <p className="mb-3 text-sm text-muted-foreground">
                {requiresMismatchPhoto ? t("auditPhotoRequiredForMismatch") : t("auditPhotoOptionalForMatch")}
              </p>
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
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <ImagePlus className="h-4 w-4 text-primary" />
                    {t("queuedPhotos", { count: queuedAuditPhotos.length })}
                  </div>
                  <div className="space-y-2">
                    {queuedAuditPhotos.map((photo) => (
                      <div key={photo.id} className="flex items-center justify-between gap-3 rounded-md bg-background px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <div className="truncate font-medium text-foreground">{photo.file.name}</div>
                          <div className="truncate text-xs text-muted-foreground">{photo.label || t("unlabeledPhoto")}</div>
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

          <div className="md:col-span-2">
            <Field label={t("remark")}>
              <textarea value={values.remark} onChange={(event) => setField("remark", event.target.value)} rows={4} className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </Field>
          </div>
          <div className={`sticky bottom-0 z-10 -mx-4 justify-end border-t border-border bg-surface/95 p-3 backdrop-blur md:col-span-2 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none ${submitBarVisibility}`}>
            <button type="submit" disabled={saving || !selectedItem || (fastMode && !showDetailedFields)} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 text-base font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50 sm:w-auto">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("submitScan")}
            </button>
          </div>
        </form>
      </section>
      {showMobileQuickActionBar ? (
        <div aria-label={t("mobileActionBar")} className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-3 py-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-lg backdrop-blur md:hidden">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleQuickMatchedScan}
              disabled={saving}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-success px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-success/90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              <span>{t("dataMatches")}</span>
            </button>
            <button
              type="button"
              onClick={openMismatchDetails}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-warning/40 bg-surface px-3 py-2 text-sm font-semibold text-warning transition-colors hover:bg-warning/10"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>{t("dataMismatch")}</span>
            </button>
            <button
              type="button"
              onClick={scrollToAuditPhotoEvidence}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <ImagePlus className="h-4 w-4" />
              <span>{t("captureEvidenceAction")}</span>
            </button>
            <button
              type="button"
              onClick={scrollToAuditScanInput}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Keyboard className="h-4 w-4" />
              <span>{t("continueOrManualAction")}</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

type AuditScanTranslator = {
  (key: string): string
  (key: string, values: Record<string, string | number | Date>): string
}

function AuditScanOptionStrip({
  continuousScan,
  onContinuousScanChange,
  fastMode,
  onFastModeChange,
  t,
}: {
  continuousScan: boolean
  onContinuousScanChange: (checked: boolean) => void
  fastMode: boolean
  onFastModeChange: (checked: boolean) => void
  t: AuditScanTranslator
}) {
  return (
    <div role="group" aria-label={t("scanOptions")} className="mt-3 overflow-hidden rounded-md border border-border/80 bg-background">
      <div className="grid divide-y divide-border/80 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <ScanOptionToggle
          checked={fastMode}
          label={t("fastMode")}
          description={fastMode ? t("fastModeCompactHelp") : t("detailModeCompactHelp")}
          onChange={onFastModeChange}
        />
        <ScanOptionToggle
          checked={continuousScan}
          label={t("continuousScan")}
          description={t("continuousScanHelp")}
          onChange={onContinuousScanChange}
        />
      </div>
    </div>
  )
}

function ScanOptionToggle({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean
  label: string
  description: string
  onChange: (checked: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={description}
      onClick={() => onChange(!checked)}
      className="flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{label}</span>
        <span className="mt-0.5 hidden text-xs text-muted-foreground lg:block">{description}</span>
      </span>
      <span
        aria-hidden="true"
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted-foreground/30"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </span>
    </button>
  )
}

function ScanResultPanel({
  feedback,
  recentScans,
  t,
}: {
  feedback: ScanFeedback
  recentScans: AuditRecentScan[]
  t: AuditScanTranslator
}) {
  const meta = getScanFeedbackMeta(feedback.status, t)
  const Icon = meta.icon
  const previousScans = recentScans.slice(1, 6)
  const [recentScansExpanded, setRecentScansExpanded] = useState(false)

  return (
    <div className={`md:col-span-2 rounded-md border p-4 ${meta.cardClass}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${meta.iconClass}`}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-semibold tracking-normal text-muted-foreground">{t("scanResult")}</div>
            <div className="mt-1 break-words text-base font-semibold text-foreground">{feedback.title}</div>
            <div className="mt-1 break-words text-sm text-muted-foreground">{feedback.description}</div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${meta.chipClass}`}>
            {meta.label}
          </span>
          <span className="inline-flex items-center rounded-full bg-surface/70 px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {recentScans.length.toLocaleString("th-TH")}/{MAX_RECENT_AUDIT_SCANS}
          </span>
        </div>
      </div>
      {previousScans.length > 0 ? (
        <div className="mt-3 rounded-md border border-border/80 bg-surface/80 p-3">
          <button
            type="button"
            aria-expanded={recentScansExpanded}
            aria-controls="audit-recent-scans-list"
            onClick={() => setRecentScansExpanded((current) => !current)}
            className="flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-1 text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-foreground">{t("recentScansTitle")}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{t("recentScansHelp")}</span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-primary">
              {t(recentScansExpanded ? "recentScansCollapse" : "recentScansExpand")}
              <ChevronDown className={`h-4 w-4 transition-transform ${recentScansExpanded ? "rotate-180" : ""}`} />
            </span>
          </button>
          <div id="audit-recent-scans-list" hidden={!recentScansExpanded} className="mt-2 grid gap-1.5">
            {previousScans.map((scan) => (
              <RecentScanCompactRow key={scan.id} scan={scan} t={t} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function RecentScanCompactRow({ scan, t }: { scan: AuditRecentScan; t: AuditScanTranslator }) {
  const meta = getScanFeedbackMeta(scan.status, t)

  return (
    <div className="flex items-center gap-2 rounded-md bg-background px-2 py-1.5 text-xs">
      <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dotClass}`} />
      <span className="min-w-0 flex-1 truncate font-medium text-foreground">{scan.title}</span>
      <span className={`shrink-0 rounded-full px-2 py-0.5 font-semibold ${meta.chipClass}`}>
        {meta.label}
      </span>
      <span className="shrink-0 text-muted-foreground">{formatRecentScanTime(scan.at)}</span>
    </div>
  )
}

function PendingQueuePanel({
  items,
  total,
  pendingHref,
  onSelect,
  expanded,
  onExpandedChange,
  t,
}: {
  items: AuditScanItem[]
  total: number
  pendingHref: string
  onSelect: (item: AuditScanItem) => void
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  t: AuditScanTranslator
}) {
  return (
    <div id="audit-pending-queue-panel" className="md:col-span-2 rounded-md border border-border bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ListChecks className="h-4 w-4 text-primary" />
            {t("pendingQueuePanelTitle")}
            <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning">
              {total.toLocaleString("th-TH")}
            </span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{t("pendingQueuePanelHelp")}</div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls="audit-pending-queue-content"
            onClick={() => onExpandedChange(!expanded)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {t(expanded ? "pendingQueueCollapse" : "pendingQueueExpand")}
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
          <Link
            href={pendingHref}
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("pendingQueueOpenFull")}
          </Link>
        </div>
      </div>

      <div id="audit-pending-queue-content" hidden={!expanded}>
        {items.length === 0 ? (
          <div className="mt-3 rounded-md border border-dashed border-border bg-surface p-4 text-sm text-muted-foreground">
            {t("pendingQueueEmpty")}
          </div>
        ) : (
          <div className="mt-3 grid gap-2">
            {items.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 rounded-md border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">{item.assetTag}</div>
                  <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.label}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <ScanLine className="h-4 w-4" />
                  {t("pendingQueueSelect")}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function getScanFeedbackMeta(status: ScanFeedback["status"], t: AuditScanTranslator) {
  if (status === "found" || status === "saved" || status === "found_later") {
    return {
      label:
        status === "found"
          ? t("feedbackStatusFound")
          : status === "found_later"
            ? t("feedbackStatusFoundLater")
            : t("feedbackStatusSaved"),
      icon: CheckCircle2,
      cardClass: "border-success/35 bg-success/10",
      chipClass: "bg-success/15 text-success",
      iconClass: "bg-success/15 text-success",
      dotClass: "bg-success",
    }
  }

  if (status === "unknown_asset") {
    return {
      label: t("feedbackStatusUnknownAsset"),
      icon: AlertTriangle,
      cardClass: "border-danger/35 bg-danger/10",
      chipClass: "bg-danger/15 text-danger",
      iconClass: "bg-danger/15 text-danger",
      dotClass: "bg-danger",
    }
  }

  if (status === "out_of_scope") {
    return {
      label: t("feedbackStatusOutOfScope"),
      icon: AlertTriangle,
      cardClass: "border-warning/35 bg-warning/10",
      chipClass: "bg-warning/15 text-warning",
      iconClass: "bg-warning/15 text-warning",
      dotClass: "bg-warning",
    }
  }

  if (status === "offline_queued") {
    return {
      label: t("feedbackStatusOfflineQueued"),
      icon: WifiOff,
      cardClass: "border-info/35 bg-info/10",
      chipClass: "bg-info/15 text-info",
      iconClass: "bg-info/15 text-info",
      dotClass: "bg-info",
    }
  }

  return {
    label: t("feedbackStatusMismatch"),
    icon: AlertTriangle,
    cardClass: "border-warning/35 bg-warning/10",
    chipClass: "bg-warning/15 text-warning",
    iconClass: "bg-warning/15 text-warning",
    dotClass: "bg-warning",
  }
}

function formatRecentScanTime(value: number) {
  return new Date(value).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
}

function isCameraAccessSupported() {
  return typeof navigator !== "undefined" && "mediaDevices" in navigator && "getUserMedia" in navigator.mediaDevices
}

function AuditQrScannerOverlay() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
      <div
        className="absolute left-1/2 top-1/2 aspect-square h-[66%] max-h-56 -translate-x-1/2 -translate-y-1/2"
        style={{ boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.42)" }}
      >
        <span className="absolute left-0 top-0 h-10 w-10 border-l-4 border-t-4 border-white" />
        <span className="absolute right-0 top-0 h-10 w-10 border-r-4 border-t-4 border-white" />
        <span className="absolute bottom-0 left-0 h-10 w-10 border-b-4 border-l-4 border-white" />
        <span className="absolute bottom-0 right-0 h-10 w-10 border-b-4 border-r-4 border-white" />
      </div>
    </div>
  )
}

function toAuditOfflinePhoto(photo: QueuedAuditPhoto): AuditOfflinePhoto {
  return {
    id: photo.id,
    label: photo.label,
    fileName: photo.file.name,
    fileType: photo.file.type || "application/octet-stream",
    fileSize: photo.file.size,
    blob: photo.file,
  }
}

function getActualValues(
  values: {
    actualLocationId: string
    actualCustodianId: string
    actualDepartmentId: string
    actualConditionId: string
  },
  selectedItem: AuditScanItem
) {
  return {
    actualLocationId: values.actualLocationId || selectedItem.expectedLocationId,
    actualCustodianId: values.actualCustodianId || selectedItem.expectedCustodianId || "",
    actualDepartmentId: values.actualDepartmentId || selectedItem.expectedDepartmentId || "",
    actualConditionId: values.actualConditionId || selectedItem.expectedConditionId || "",
  }
}

function emptyToNull<T extends Record<string, string>>(values: T): { [K in keyof T]: string | null } {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value.trim() === "" ? null : value])
  ) as { [K in keyof T]: string | null }
}

function buildAssetLookup(items: AuditScanItem[]) {
  const lookup = new Map<string, AuditScanItem>()
  for (const item of items) {
    lookup.set(item.assetId.toLowerCase(), item)
    lookup.set(item.assetTag.toLowerCase(), item)
    lookup.set(item.label.toLowerCase(), item)
  }
  return lookup
}

function buildOptionLabelMap(options: Option[]) {
  return new Map(options.map((option) => [option.id, option.label]))
}

function buildSystemDataRows(
  item: AuditScanItem,
  maps: {
    locations: Map<string, string>
    employees: Map<string, string>
    departments: Map<string, string>
    conditions: Map<string, string>
  },
  labels: {
    expectedLocation: string
    expectedCustodian: string
    expectedDepartment: string
    expectedCondition: string
    none: string
  }
) {
  const rows: Array<{ label: string; value: string }> = []
  const ownershipType = normalizeAssetOwnershipType(item.ownershipType)

  if (ownershipType !== "software_license") {
    rows.push({
      label: labels.expectedLocation,
      value: getOptionLabel(maps.locations, item.expectedLocationId, labels.none),
    })
  }
  if (requiresCustodian(ownershipType)) {
    rows.push({
      label: labels.expectedCustodian,
      value: getOptionLabel(maps.employees, item.expectedCustodianId, labels.none),
    })
  }
  rows.push(
    {
      label: labels.expectedDepartment,
      value: getOptionLabel(maps.departments, item.expectedDepartmentId, labels.none),
    },
    {
      label: labels.expectedCondition,
      value: getOptionLabel(maps.conditions, item.expectedConditionId, labels.none),
    }
  )

  return rows
}

function getOptionLabel(options: Map<string, string>, id: string | null, emptyLabel: string) {
  if (!id) return emptyLabel
  return options.get(id) ?? id
}

function getReadableAuditScanValue(item: AuditScanItem) {
  const assetTag = item.assetTag.trim()
  return assetTag || item.label
}

function OptionList({ emptyLabel, options }: { emptyLabel?: string; options: Option[] }) {
  return (
    <>
      {emptyLabel && <option value="">{emptyLabel}</option>}
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block w-full min-w-0">
      <span className="mb-1.5 flex items-center gap-1 text-sm font-medium text-foreground">
        <ScanLine className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
        {required && <span className="text-danger">*</span>}
      </span>
      {children}
    </label>
  )
}

function Select({ label, value, required, onChange, children }: { label: string; value: string; required?: boolean; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <Field label={label} required={required}>
      <select value={value} required={required} onChange={(event) => onChange(event.target.value)} className="h-12 w-full rounded-md border border-border bg-background px-3 text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary">
        {children}
      </select>
    </Field>
  )
}
