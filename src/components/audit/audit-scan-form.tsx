"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ImagePlus,
  Info,
  Keyboard,
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
import { normalizeAssetOwnershipType, requiresCustodian } from "@/lib/asset-ownership"
import {
  addQueuedAuditScan,
  loadQueuedAuditScans,
  removeQueuedAuditScan,
  type AuditOfflineScanPayload,
  type QueuedAuditScan,
} from "@/lib/audit-offline-queue"

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

type Html5QrcodeInstance = {
  start: (
    cameraConfig: string | { facingMode: string },
    config: {
      fps: number
      qrbox: (viewfinderWidth: number, viewfinderHeight: number) => { width: number; height: number }
    },
    successCallback: (decodedText: string) => void,
    errorCallback?: () => void
  ) => Promise<unknown>
  stop: () => Promise<unknown>
  clear: () => void
}

type CameraDevice = { id: string; label: string }
type CameraReadiness = "checking" | "ready" | "unavailable"
type AuditMismatchPreview = { type: string; label: string; canApply: boolean }
type ScanFeedback = {
  status: "found" | "mismatch" | "not_in_round" | "saved"
  title: string
  description: string
}
type QueuedAuditPhoto = {
  id: string
  label: string
  file: File
}
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
  roundId,
  roundName,
  items,
  options,
}: {
  roundId: string
  roundName: string
  items: AuditScanItem[]
  options: AuditScanOptions
}) {
  const router = useRouter()
  const t = useTranslations("auditScan")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)
  const [scannerRunning, setScannerRunning] = useState(false)
  const [scannerLoading, setScannerLoading] = useState(false)
  const [cameraReadiness, setCameraReadiness] = useState<CameraReadiness>(() =>
    isCameraAccessSupported() ? "ready" : "unavailable"
  )
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
  const [outOfScopeAsset, setOutOfScopeAsset] = useState<OutOfScopeAsset | null>(null)
  const [applyCorrections, setApplyCorrections] = useState(false)
  const [offlineQueue, setOfflineQueue] = useState<QueuedAuditScan[]>([])
  const qrReaderRef = useRef<Html5QrcodeInstance | null>(null)
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
  const pendingCount = items.filter((item) => item.auditStatus === "pending").length
  const processedCount = items.length - pendingCount
  const selectedAuditPhotoChecklist = selectedItem?.photoChecklist ?? []
  const effectiveAuditPhotoLabel =
    selectedAuditPhotoChecklist.find((item) => item === auditPhotoLabel) ?? selectedAuditPhotoChecklist[0] ?? ""

  function setField(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    if (field === "assetId") {
      setApplyCorrections(false)
      setShowDetailedFields(false)
    }
  }

  function queueAuditPhoto(file: File | null) {
    if (!file) return
    setQueuedAuditPhotos((current) => [
      ...current,
      {
        id: `${Date.now()}-${file.name}-${current.length}`,
        label: effectiveAuditPhotoLabel,
        file,
      },
    ])
  }

  function removeQueuedAuditPhoto(id: string) {
    setQueuedAuditPhotos((current) => current.filter((photo) => photo.id !== id))
  }

  useEffect(() => {
    return () => {
      const scanner = qrReaderRef.current
      if (!scanner) return
      void scanner.stop().then(() => scanner.clear()).catch(() => scanner.clear())
    }
  }, [])

  useEffect(() => {
    refreshOfflineQueue()
  }, [roundId])

  function refreshOfflineQueue() {
    if (typeof window === "undefined") return
    setOfflineQueue(loadQueuedAuditScans(window.localStorage, roundId))
  }

  async function startScanner() {
    if (!isCameraAccessSupported()) {
      setCameraReadiness("unavailable")
      setCameraErrorText(t("cameraUnsupported"))
      toast.error(t("cameraUnsupported"))
      return
    }

    setScannerLoading(true)
    setCameraErrorText("")
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

      const preferredCamera =
        availableCameras.find((camera) => camera.id === selectedCameraId) ??
        availableCameras.find((camera) => /back|rear|environment/i.test(camera.label)) ??
        availableCameras[0]
      setSelectedCameraId(preferredCamera.id)

      const scanner = new Html5Qrcode("audit-qr-reader") as unknown as Html5QrcodeInstance
      qrReaderRef.current = scanner
      await scanner.start(
        preferredCamera.id,
        { fps: 10, qrbox: getResponsiveQrBox },
        (decodedText) => {
          const normalizedText = decodedText.trim()
          const now = Date.now()
          if (lastDecodedRef.current?.value === normalizedText && now - lastDecodedRef.current.at < 1500) return
          lastDecodedRef.current = { value: normalizedText, at: now }
          setLastDecodedText(decodedText)
          void selectScannedAsset(decodedText, "qr")
        },
        () => {}
      )
      setScannerRunning(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : t("cameraError")
      setCameraErrorText(message)
      toast.error(message)
      qrReaderRef.current = null
    } finally {
      setScannerLoading(false)
    }
  }

  async function stopScanner() {
    const scanner = qrReaderRef.current
    if (!scanner) return
    try {
      await scanner.stop()
      scanner.clear()
    } catch {
      scanner.clear()
    } finally {
      qrReaderRef.current = null
      setScannerRunning(false)
    }
  }

  async function selectScannedAsset(rawValue: string, source: "manual" | "qr") {
    const normalizedValues = extractAssetLookupCandidatesFromScanValue(rawValue)
    const matchedItem = normalizedValues.map((value) => assetLookup.get(value)).find(Boolean)
    if (!matchedItem) {
      const foundAsset = await findOutOfScopeAsset(rawValue)
      if (foundAsset) {
        setOutOfScopeAsset(foundAsset)
        setValues((current) => ({ ...current, assetId: "" }))
        setScanText(rawValue)
        setScanSource(source)
        setScanFeedback({
          status: "not_in_round",
          title: t("feedbackOutOfScopeTitle"),
          description: `${foundAsset.title} - ${foundAsset.subtitle}`,
        })
        toast.warning(t("outOfScopeFound"))
        if (!continuousScan) void stopScanner()
        return false
      }
      setOutOfScopeAsset(null)
      setScanFeedback({
        status: "not_in_round",
        title: t("feedbackNotInRoundTitle"),
        description: t("feedbackNotInRoundDescription", { code: rawValue }),
      })
      toast.error(t("assetNotInRound"))
      return false
    }

    setValues((current) => ({ ...current, assetId: matchedItem.assetId }))
    setOutOfScopeAsset(null)
    setApplyCorrections(false)
    setScanText(rawValue)
    setScanSource(source)
    setScanFeedback({
      status: "found",
      title: t("feedbackFoundTitle"),
      description: matchedItem.label,
    })
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
      setScanFeedback({
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
        queueOfflineScan(requestPayload, selectedItem.label)
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
      setScanFeedback({
        status: payload.auditResult === "found" ? "saved" : "mismatch",
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

  function queueOfflineScan(payload: AuditOfflineScanPayload, label: string) {
    if (typeof window === "undefined") return
    addQueuedAuditScan(window.localStorage, roundId, payload)
    refreshOfflineQueue()
    setScanFeedback({
      status: "mismatch",
      title: t("offlineQueuedTitle"),
      description: label,
    })
    toast.warning(queuedAuditPhotos.length > 0 ? t("offlineQueuedWithoutPhotos") : t("offlineQueued"))
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
        removeQueuedAuditScan(window.localStorage, roundId, queued.id)
        savedCount += 1
      }
      refreshOfflineQueue()
      toast.success(t("offlineRetrySuccess", { count: savedCount }))
      router.refresh()
    } catch (error) {
      refreshOfflineQueue()
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
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
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
      </div>

      {offlineQueue.length > 0 ? (
        <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 p-3 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
              <div>
                <div className="text-sm font-semibold text-foreground">{t("offlineQueueTitle", { count: offlineQueue.length })}</div>
                <div className="mt-1 text-xs text-muted-foreground">{t("offlineQueueHelp")}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={retryOfflineQueue}
              disabled={saving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-warning px-4 text-sm font-medium text-white transition-colors hover:bg-warning/90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              {t("offlineRetry")}
            </button>
          </div>
        </div>
      ) : null}

      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          <div className="md:col-span-2 grid gap-3 sm:grid-cols-3">
            <AuditMetric label={t("pendingQueue")} value={pendingCount.toString()} />
            <AuditMetric label={t("scannedQueue")} value={processedCount.toString()} />
            <AuditMetric label={t("photoQueue")} value={queuedAuditPhotos.length.toString()} />
          </div>

          <div className="md:col-span-2 rounded-md border border-info/30 bg-info/10 p-3">
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={fastMode}
                onChange={(event) => {
                  setFastMode(event.target.checked)
                  setShowDetailedFields(!event.target.checked)
                }}
                className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span>
                <span className="block font-semibold text-foreground">{t("fastMode")}</span>
                <span className="mt-1 block text-muted-foreground">{t("fastModeHelp")}</span>
              </span>
            </label>
          </div>

          {scanFeedback && (
            <ScanFeedbackCard feedback={scanFeedback} />
          )}

          <div className="md:col-span-2 rounded-md border border-border bg-background p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <Field label={t("scanInput")}>
                <input
                  value={scanText}
                  onChange={(event) => setScanText(event.target.value)}
                  placeholder={t("scanInputPlaceholder")}
                  className="h-12 w-full rounded-md border border-border bg-surface px-3 text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </Field>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() => void selectScannedAsset(scanText, "manual")}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
                >
                  <Keyboard className="h-4 w-4" />
                  {t("useCode")}
                </button>
                <button
                  type="button"
                  onClick={scannerRunning ? stopScanner : startScanner}
                  disabled={scannerLoading}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
                >
                  {scannerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : scannerRunning ? <X className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                  {scannerRunning ? t("stopCamera") : t("startCamera")}
                </button>
              </div>
            </div>
            <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-md border border-info/30 bg-info/10 p-3 text-sm">
              <input
                type="checkbox"
                checked={continuousScan}
                onChange={(event) => setContinuousScan(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span>
                <span className="block font-semibold text-foreground">{t("continuousScan")}</span>
                <span className="mt-1 block text-muted-foreground">{t("continuousScanHelp")}</span>
              </span>
            </label>
            <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,320px)]">
              <div
                id="audit-qr-reader"
                className={`min-h-[18rem] overflow-hidden rounded-md border border-border bg-surface sm:min-h-[22rem] ${scannerRunning ? "block" : "hidden"}`}
              />
              <div className="rounded-md border border-border bg-surface p-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 text-info" />
                  <div>
                    <div className="font-medium text-foreground">{t("cameraStatus")}</div>
                    <div className="mt-1">
                      {scannerRunning
                        ? t("cameraRunning")
                        : cameraReadiness === "ready"
                          ? t("cameraReady")
                          : t("cameraUnavailable")}
                    </div>
                  </div>
                </div>
                {cameras.length > 1 ? (
                  <label className="mt-3 block">
                    <span className="mb-1.5 block text-xs font-medium text-foreground">{t("cameraDevice")}</span>
                    <select
                      value={selectedCameraId}
                      disabled={scannerRunning || scannerLoading}
                      onChange={(event) => setSelectedCameraId(event.target.value)}
                      className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
                    >
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
                {cameraErrorText || cameraReadiness === "unavailable" ? (
                  <div className="mt-3 rounded-md border border-warning/30 bg-warning/10 p-2 text-xs text-warning">
                    {cameraErrorText || t("cameraUnsupported")}
                  </div>
                ) : (
                  <div className="mt-3 text-xs">{t("cameraHelp")}</div>
                )}
              </div>
            </div>
          </div>

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
            <div className="md:col-span-2 rounded-md border border-primary/30 bg-primary/5 p-4">
              <div className="text-xs font-semibold uppercase text-primary">{t("currentTarget")}</div>
              <div className="mt-1 text-lg font-semibold text-foreground">{selectedItem.label}</div>
              <div className="mt-1 text-sm text-muted-foreground">{t("currentTargetHelp")}</div>
            </div>
          )}

          {selectedItem && fastMode && !showDetailedFields && (
            <div className="md:col-span-2 rounded-md border border-success/30 bg-success/10 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-base font-semibold text-foreground">{t("quickFieldMode")}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{t("quickFieldModeHelp")}</div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleQuickMatchedScan}
                    disabled={saving}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-success px-4 text-sm font-semibold text-white transition-colors hover:bg-success/90 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {t("quickMatched")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDetailedFields(true)}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    {t("openDetailedScan")}
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

          {(!fastMode || showDetailedFields) && (
            <>
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
            <div className="md:col-span-2 rounded-md border border-border bg-background p-4">
              <div className="mb-3 text-sm font-semibold text-foreground">{t("auditPhotoEvidence")}</div>
              <p className="mb-3 text-sm text-muted-foreground">{t("auditPhotoEvidenceHelp")}</p>
              {selectedAuditPhotoChecklist.length > 0 && (
                <div className="mb-3 rounded-md border border-border bg-surface p-3">
                  <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm font-semibold text-foreground">{t("selectAuditPhotoType")}</div>
                    <div className="text-xs text-muted-foreground">
                      {t("autoAuditPhotoLabelHint", { label: effectiveAuditPhotoLabel })}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedAuditPhotoChecklist.map((item) => {
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
              )}
              <FileDropzone
                file={null}
                onFileChange={queueAuditPhoto}
                disabled={saving}
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif"
                capture="environment"
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
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
          <div className="sticky bottom-0 z-10 -mx-4 flex justify-end border-t border-border bg-surface/95 p-3 backdrop-blur md:col-span-2 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
            <button type="submit" disabled={saving || !selectedItem || (fastMode && !showDetailedFields)} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 text-base font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50 sm:w-auto">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("submitScan")}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function AuditMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold text-foreground">{value}</div>
    </div>
  )
}

function ScanFeedbackCard({ feedback }: { feedback: ScanFeedback }) {
  const tone =
    feedback.status === "found" || feedback.status === "saved"
      ? "border-success/40 bg-success/10 text-success"
      : feedback.status === "not_in_round"
        ? "border-danger/40 bg-danger/10 text-danger"
        : "border-warning/40 bg-warning/10 text-warning"
  const Icon = feedback.status === "found" || feedback.status === "saved" ? CheckCircle2 : AlertTriangle

  return (
    <div className={`md:col-span-2 rounded-md border p-4 ${tone}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0">
          <div className="font-semibold">{feedback.title}</div>
          <div className="mt-1 break-words text-sm text-foreground">{feedback.description}</div>
        </div>
      </div>
    </div>
  )
}

function getResponsiveQrBox(viewfinderWidth: number, viewfinderHeight: number) {
  const shortestSide = Math.min(viewfinderWidth, viewfinderHeight)
  const size = Math.max(180, Math.min(320, Math.floor(shortestSide * 0.72)))
  return { width: size, height: size }
}

function isCameraAccessSupported() {
  return typeof navigator !== "undefined" && "mediaDevices" in navigator && "getUserMedia" in navigator.mediaDevices
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
    <label className="block">
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
