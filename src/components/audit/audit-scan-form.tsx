"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Camera, CheckCircle2, Info, Keyboard, Loader2, ScanLine, Save, X } from "lucide-react"
import { toast } from "sonner"

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
  const qrReaderRef = useRef<Html5QrcodeInstance | null>(null)
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
    return [
      actual.actualLocationId !== selectedItem.expectedLocationId ? t("wrongLocation") : null,
      (actual.actualCustodianId || null) !== selectedItem.expectedCustodianId ? t("wrongCustodian") : null,
      (actual.actualDepartmentId || null) !== selectedItem.expectedDepartmentId ? t("wrongDepartment") : null,
      (actual.actualConditionId || null) !== selectedItem.expectedConditionId ? t("wrongCondition") : null,
    ].filter(Boolean)
  }, [selectedItem, t, values])

  function setField(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  useEffect(() => {
    return () => {
      const scanner = qrReaderRef.current
      if (!scanner) return
      void scanner.stop().then(() => scanner.clear()).catch(() => scanner.clear())
    }
  }, [])

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
          setLastDecodedText(decodedText)
          if (selectScannedAsset(decodedText, "qr")) {
            void stopScanner()
          }
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

  function selectScannedAsset(rawValue: string, source: "manual" | "qr") {
    const normalizedValues = normalizeScanValue(rawValue)
    const matchedItem = normalizedValues.map((value) => assetLookup.get(value)).find(Boolean)
    if (!matchedItem) {
      toast.error(t("assetNotInRound"))
      return false
    }

    setValues((current) => ({ ...current, assetId: matchedItem.assetId }))
    setScanText(rawValue)
    setScanSource(source)
    toast.success(t("assetSelected"))
    return true
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedItem) return

    setSaving(true)
    try {
      const response = await fetch(`/api/audit-rounds/${roundId}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: values.assetId,
          ...emptyToNull(getActualValues(values, selectedItem)),
          scanSource,
          remark: values.remark,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      setLastResult(payload.auditResult ?? null)
      toast.success(payload.auditResult === "found" ? t("foundSuccess") : t("mismatchSuccess"))
      setValues({
        assetId: "",
        actualLocationId: "",
        actualCustodianId: "",
        actualDepartmentId: "",
        actualConditionId: "",
        remark: "",
      })
      setScanSource("manual")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
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

      <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="md:col-span-2 rounded-md border border-border bg-background p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <Field label={t("scanInput")}>
                <input
                  value={scanText}
                  onChange={(event) => setScanText(event.target.value)}
                  placeholder={t("scanInputPlaceholder")}
                  className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </Field>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => selectScannedAsset(scanText, "manual")}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent"
                >
                  <Keyboard className="h-4 w-4" />
                  {t("useCode")}
                </button>
                <button
                  type="button"
                  onClick={scannerRunning ? stopScanner : startScanner}
                  disabled={scannerLoading}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
                >
                  {scannerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : scannerRunning ? <X className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                  {scannerRunning ? t("stopCamera") : t("startCamera")}
                </button>
              </div>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,320px)]">
              <div
                id="audit-qr-reader"
                className={`min-h-72 overflow-hidden rounded-md border border-border bg-surface ${scannerRunning ? "block" : "hidden"}`}
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

          <Select label={t("actualLocation")} value={values.actualLocationId || selectedItem?.expectedLocationId || ""} required onChange={(value) => setField("actualLocationId", value)}>
            <OptionList options={options.locations} />
          </Select>
          <Select label={t("actualCustodian")} value={values.actualCustodianId || selectedItem?.expectedCustodianId || ""} onChange={(value) => setField("actualCustodianId", value)}>
            <OptionList emptyLabel={t("none")} options={options.employees} />
          </Select>
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
                <div className="text-warning">{t("mismatchPreview", { fields: mismatchPreview.join(", ") })}</div>
              )}
            </div>
          )}

          <div className="md:col-span-2">
            <Field label={t("remark")}>
              <textarea value={values.remark} onChange={(event) => setField("remark", event.target.value)} rows={4} className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </Field>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" disabled={saving || !selectedItem} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("submitScan")}
            </button>
          </div>
        </form>
      </section>
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

function emptyToNull(values: Record<string, string>) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim() === "" ? null : value]))
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

function normalizeScanValue(value: string) {
  const trimmed = value.trim()
  const candidates = [trimmed]
  try {
    const url = new URL(trimmed)
    const segments = url.pathname.split("/").filter(Boolean)
    const assetIndex = segments.findIndex((segment) => segment === "assets")
    if (assetIndex >= 0 && segments[assetIndex + 1]) candidates.push(segments[assetIndex + 1])
    if (segments.length > 0) candidates.push(segments[segments.length - 1])
  } catch {
    const parts = trimmed.split(/[/?#]/).filter(Boolean)
    if (parts.length > 0) candidates.push(parts[parts.length - 1])
  }

  return Array.from(new Set(candidates.map((candidate) => candidate.trim().toLowerCase()).filter(Boolean)))
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
      <select value={value} required={required} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary">
        {children}
      </select>
    </Field>
  )
}
