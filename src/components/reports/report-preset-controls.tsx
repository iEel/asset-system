"use client"

import { useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { BookmarkPlus, Trash2 } from "lucide-react"
import {
  buildReportPreset,
  buildReportPresetHref,
  reportPresetStorageKey,
  type ReportPreset,
} from "@/lib/report-presets"

const emptyReportPresets: ReportPreset[] = []
let cachedReportPresetRaw: string | null | undefined
let cachedReportPresets = emptyReportPresets

type ReportPresetControlsProps = {
  locale: string
  currentQuery: string
  labels: {
    presetName: string
    saveCurrentPreset: string
    savedPresetsEmpty: string
    savedPresetsDeviceOnly: string
    deletePreset: string
    presetNameRequired: string
  }
}

export function ReportPresetControls({ locale, currentQuery, labels }: ReportPresetControlsProps) {
  const presets = useSyncExternalStore(subscribeToReportPresets, readReportPresets, getServerReportPresets)
  const [name, setName] = useState("")
  const [message, setMessage] = useState("")

  function persist(next: ReportPreset[]) {
    window.localStorage.setItem(reportPresetStorageKey, JSON.stringify(next))
    window.dispatchEvent(new Event(reportPresetStorageKey))
  }

  function savePreset() {
    const preset = buildReportPreset({
      id: globalThis.crypto?.randomUUID?.() ?? `preset-${Date.now()}`,
      name,
      query: currentQuery,
    })

    if (!preset) {
      setMessage(labels.presetNameRequired)
      return
    }

    persist([preset, ...presets])
    setName("")
    setMessage("")
  }

  function deletePreset(id: string) {
    persist(presets.filter((preset) => preset.id !== id))
  }

  return (
    <div className="rounded-md border border-border bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1">
          <span className="mb-1.5 block text-sm font-medium text-foreground">{labels.presetName}</span>
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setMessage("")
            }}
            maxLength={60}
            className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </label>
        <button
          type="button"
          onClick={savePreset}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-white transition-colors hover:bg-primary/90 sm:h-10 sm:min-h-0"
        >
          <BookmarkPlus className="h-4 w-4" />
          {labels.saveCurrentPreset}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{labels.savedPresetsDeviceOnly}</p>
      {message ? <p className="mt-2 text-sm text-danger" role="status">{message}</p> : null}

      {presets.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {presets.map((preset) => (
            <div key={preset.id} className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-surface p-2">
              <Link href={buildReportPresetHref(locale, preset.query)} className="min-w-0 flex-1 truncate px-2 py-1 text-sm font-medium text-foreground hover:text-primary">
                {preset.name}
              </Link>
              <button
                type="button"
                onClick={() => deletePreset(preset.id)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:h-8 sm:w-8"
                aria-label={`${labels.deletePreset}: ${preset.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">{labels.savedPresetsEmpty}</p>
      )}
    </div>
  )
}

function isReportPreset(value: unknown): value is ReportPreset {
  if (!value || typeof value !== "object") return false
  const preset = value as Partial<ReportPreset>
  return typeof preset.id === "string" && typeof preset.name === "string" && typeof preset.query === "string" && typeof preset.createdAt === "string"
}

function subscribeToReportPresets(onStoreChange: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key === reportPresetStorageKey) onStoreChange()
  }

  window.addEventListener("storage", onStorage)
  window.addEventListener(reportPresetStorageKey, onStoreChange)
  return () => {
    window.removeEventListener("storage", onStorage)
    window.removeEventListener(reportPresetStorageKey, onStoreChange)
  }
}

function readReportPresets() {
  try {
    const stored = window.localStorage.getItem(reportPresetStorageKey)
    if (stored === cachedReportPresetRaw) return cachedReportPresets

    const parsed = stored ? JSON.parse(stored) : []
    cachedReportPresetRaw = stored
    cachedReportPresets = Array.isArray(parsed) ? parsed.filter(isReportPreset) : emptyReportPresets
    return cachedReportPresets
  } catch {
    return emptyReportPresets
  }
}

function getServerReportPresets() {
  return emptyReportPresets
}
