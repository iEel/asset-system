"use client"

import { Fragment, useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { ArrowRight, ChevronRight, Loader2, PackageSearch, Printer } from "lucide-react"
import { assetActionIcons } from "@/components/assets/asset-action-icons"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field } from "@/components/ui/field"
import { KeyValueList } from "@/components/ui/key-value-list"
import { PageHeader } from "@/components/ui/page-header"
import { ScannerTextInput } from "@/components/ui/scanner-text-input"
import { StatusBadge } from "@/components/ui/status-badge"
import type { AssetAction } from "@/lib/asset-actions"
import {
  isAssetOperationSearchReady,
  isAssetOperationSearchTooLong,
  splitAssetOperationSearchWords,
} from "@/lib/asset-operation-search-rules"
import { needsConditionAttention } from "@/lib/asset-register-row-rules"
import { appendReturnTo } from "@/lib/asset-return-navigation"
import { buildDirectAssetHrefFromScanValue } from "@/lib/asset-scan-routing"
import {
  addAssetScanRecent,
  assetScanRecentKey,
  readAssetScanRecent,
  writeAssetScanRecent,
  type AssetScanRecentItem,
} from "@/lib/asset-scan-recent"
import {
  buildAssetScanSearchHref,
  getAssetScanEnterTarget,
  getAssetScanSharedMatchField,
  type AssetScanRow,
  type AssetScanSearchAnswer,
} from "@/lib/asset-scan-search-rules"
import { getAssetStateTone } from "@/lib/design-system"
import { splitSearchHighlightWords } from "@/lib/search-highlight"
import { cn } from "@/lib/utils"

type AssetScanSearchToolProps = {
  locale: string
  /** The signed-in user: "เปิดล่าสุด" is kept per user and locale in this browser. */
  userId: string
  labels: {
    title: string
    subtitle: string
    queryLabel: string
    placeholder: string
    hint: string
    openAsset: string
    noResults: string
    minChars: string
    loading: string
    scanner: {
      start: string
      stop: string
      title: string
      help: string
      cameraUnsupported: string
      cameraNotFound: string
      cameraError: string
      cameraDevice: string
      cameraDeviceFallback: string
      cameraRear: string
      scanning: string
      scanned: string
      cameraOpening: string
      torchOn: string
      torchOff: string
      torchUnsupported: string
      zoomCamera: string
      zoomUnsupported: string
    }
  }
}

/** The answer of the scan route, with the text it answers, so an answer for older text is never shown as current. */
type ScanAnswer = AssetScanSearchAnswer & { q: string }

const queryInputId = "asset-scan-query"

// "เปิดล่าสุด" (group 4 plan 4): localStorage per user and locale. A write here tells the list through this event;
// another tab hears the browser's own storage event. Storage can be off (a private window): the list then reads empty.
const recentChangedEvent = "asset-scan-recent-changed"

function subscribeRecent(onChange: () => void) {
  window.addEventListener("storage", onChange)
  window.addEventListener(recentChangedEvent, onChange)
  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener(recentChangedEvent, onChange)
  }
}

function getStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

// The raw string is the snapshot, so React compares it by value; the server and the first render read no list.
function readStoredRecent(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function rememberAssetScanRecent(key: string, item: AssetScanRecentItem) {
  const storage = getStorage()
  const entry = { id: item.id, assetTag: item.assetTag, name: item.name }
  writeAssetScanRecent(storage, key, addAssetScanRecent(readAssetScanRecent(storage, key), entry))
  window.dispatchEvent(new Event(recentChangedEvent))
}

// A QR or URL gives only the id, so the tag and the name are read from the asset; the page opens without waiting, and
// an answer that fails leaves the list as it was.
async function rememberAssetScanRecentById(key: string, assetId: string) {
  if (!assetId) return
  try {
    const response = await fetch(`/api/assets/${encodeURIComponent(assetId)}`)
    if (!response.ok) return
    const asset = (await response.json()) as { id?: unknown; assetTag?: unknown; name?: unknown }
    if (typeof asset.id === "string" && typeof asset.assetTag === "string" && typeof asset.name === "string") {
      rememberAssetScanRecent(key, { id: asset.id, assetTag: asset.assetTag, name: asset.name })
    }
  } catch {
    // The list is a convenience: nothing else happens.
  }
}

function assetIdFromHref(href: string): string {
  return href.split("/").pop() ?? ""
}

export function AssetScanSearchTool({ locale, userId, labels }: AssetScanSearchToolProps) {
  const router = useRouter()
  const t = useTranslations("assetTools")
  const [query, setQuery] = useState("")
  const [answer, setAnswer] = useState<ScanAnswer | null>(null)
  // The text Enter was pressed on before its answer came: the answer opens the single exact match when it arrives.
  const pendingEnterRef = useRef<string | null>(null)
  const scanReturnHref = `/${locale}/asset-management/scan`
  const searchLocale = locale === "en" ? "en" : "th"
  const recentKey = assetScanRecentKey(userId, locale)
  const trimmedQuery = query.trim()
  const directAssetHref = buildDirectAssetHrefFromScanValue(trimmedQuery, locale)
  const searchable = isAssetOperationSearchReady(trimmedQuery) && !isAssetOperationSearchTooLong(trimmedQuery)
  const currentAnswer = answer && answer.q === trimmedQuery ? answer : null

  const recentRaw = useSyncExternalStore(subscribeRecent, () => readStoredRecent(recentKey), () => null)
  const recent = readAssetScanRecent({ getItem: () => recentRaw }, recentKey)

  useEffect(() => {
    if (!directAssetHref) return
    void rememberAssetScanRecentById(recentKey, assetIdFromHref(directAssetHref))
    router.push(appendReturnTo(directAssetHref, scanReturnHref))
  }, [directAssetHref, recentKey, router, scanReturnHref])

  useEffect(() => {
    if (directAssetHref || !isAssetOperationSearchReady(trimmedQuery) || isAssetOperationSearchTooLong(trimmedQuery)) return

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      let next: ScanAnswer
      try {
        const response = await fetch(buildAssetScanSearchHref({ q: trimmedQuery, locale: searchLocale }), {
          signal: controller.signal,
        })
        const payload = (await response.json().catch(() => null)) as { data?: AssetScanSearchAnswer } | null
        if (!response.ok || !payload?.data) throw new Error("Search failed")
        next = { ...payload.data, q: trimmedQuery }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
        next = { q: trimmedQuery, total: 0, rows: [] }
      }
      setAnswer(next)
      if (pendingEnterRef.current === next.q) {
        pendingEnterRef.current = null
        const target = getAssetScanEnterTarget(next.rows)
        if (target) {
          rememberAssetScanRecent(recentKey, target)
          router.push(appendReturnTo(target.href, scanReturnHref))
        }
      }
    }, 180)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [directAssetHref, recentKey, router, scanReturnHref, searchLocale, trimmedQuery])

  function changeQuery(value: string) {
    pendingEnterRef.current = null
    setQuery(value)
  }

  function openAsset(href: string) {
    router.push(appendReturnTo(href, scanReturnHref))
  }

  function handleScannedValue(value: string) {
    const href = buildDirectAssetHrefFromScanValue(value, locale)
    if (!href) return
    void rememberAssetScanRecentById(recentKey, assetIdFromHref(href))
    router.push(appendReturnTo(href, scanReturnHref))
  }

  function openExactMatch(rows: readonly AssetScanRow[]) {
    const target = getAssetScanEnterTarget(rows)
    if (!target) return
    rememberAssetScanRecent(recentKey, target)
    router.push(appendReturnTo(target.href, scanReturnHref))
  }

  // Enter on typed text opens the asset only when the answer has exactly one exact tag or Serial match (P4-R2). When
  // the answer for this text has not come yet, Enter waits for it.
  function handleQueryKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return
    if (!(event.target instanceof HTMLInputElement) || event.target.id !== queryInputId) return
    if (directAssetHref || !searchable) return
    event.preventDefault()
    if (currentAnswer) openExactMatch(currentAnswer.rows)
    else pendingEnterRef.current = trimmedQuery
  }

  function rememberRecent(item: AssetScanRecentItem) {
    rememberAssetScanRecent(recentKey, item)
  }

  function clearRecent() {
    writeAssetScanRecent(getStorage(), recentKey, [])
    window.dispatchEvent(new Event(recentChangedEvent))
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader title={labels.title} meta={labels.subtitle} />

      <ContentPanel>
        <div onKeyDown={handleQueryKeyDown}>
          <Field label={labels.queryLabel} hint={labels.hint}>
            <ScannerTextInput
              id="asset-scan-query"
              value={query}
              onChange={changeQuery}
              labels={labels.scanner}
              placeholder={labels.placeholder}
              scanMode="asset-qr"
              onScanSuccess={handleScannedValue}
            />
          </Field>
        </div>
        {!directAssetHref && trimmedQuery.length < 2 ? <EmptyNote className="mt-2">{labels.minChars}</EmptyNote> : null}
      </ContentPanel>

      {/* Spec 2D D9: a found code is one Button, no tinted box. Typed text gets result cards (group 4 plan 4, P4-R7). */}
      {directAssetHref ? (
        <div>
          <Button onClick={() => openAsset(directAssetHref)} className="w-full sm:w-auto">
            <PackageSearch aria-hidden="true" />
            {labels.openAsset}
          </Button>
        </div>
      ) : trimmedQuery.length < 2 ? null : !searchable || (currentAnswer && currentAnswer.rows.length === 0) ? (
        <ContentPanel divided flush className="overflow-hidden">
          <EmptyNote padded>{labels.noResults}</EmptyNote>
        </ContentPanel>
      ) : !currentAnswer ? (
        <ContentPanel divided flush className="overflow-hidden">
          <p className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground md:px-5">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
            {labels.loading}
          </p>
        </ContentPanel>
      ) : (
        <ScanResults answer={currentAnswer} openAssetLabel={labels.openAsset} scanReturnHref={scanReturnHref} onOpen={rememberRecent} />
      )}

      {recent.length > 0 ? (
        <section aria-labelledby="asset-scan-recent-title" className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h2 id="asset-scan-recent-title" className="text-sm font-semibold text-foreground">
              {t("scanRecent")}
            </h2>
            <Button variant="ghost" size="sm" onClick={clearRecent}>
              {t("scanRecentClear")}
            </Button>
          </div>
          <ContentPanel divided flush className="overflow-hidden">
            <ul aria-labelledby="asset-scan-recent-title" className="divide-y divide-border-soft">
              {recent.map((item) => (
                <li key={item.id}>
                  <Link
                    href={appendReturnTo(`/${locale}/assets/${item.id}`, scanReturnHref)}
                    onClick={() => rememberRecent(item)}
                    className="flex min-h-14 w-full min-w-0 items-center gap-3 px-4 py-2 transition-colors hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset md:px-5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-sm font-medium text-foreground">{item.name}</span>
                      <span className="block text-meta text-muted-foreground">
                        <span className="tag">{item.assetTag}</span>
                      </span>
                    </span>
                    <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </ContentPanel>
        </section>
      ) : null}
    </div>
  )
}

// "พบ n รายการ · ตรงกับ <field>" when every card matched the same field, else "พบ n รายการ" and the field on each card.
function ScanResults({
  answer,
  openAssetLabel,
  scanReturnHref,
  onOpen,
}: {
  answer: ScanAnswer
  openAssetLabel: string
  scanReturnHref: string
  onOpen: (item: AssetScanRecentItem) => void
}) {
  const t = useTranslations("assetTools")
  const sharedField = getAssetScanSharedMatchField(answer.rows)
  const words = splitAssetOperationSearchWords(answer.q)

  return (
    <section aria-labelledby="asset-scan-results-title" className="space-y-3">
      <h2 id="asset-scan-results-title" className="text-sm font-semibold text-foreground num">
        {sharedField
          ? t("scanFoundMatch", { count: answer.total, field: t(`scanMatchFields.${sharedField}`) })
          : t("scanFound", { count: answer.total })}
      </h2>
      {answer.rows.map((row) => (
        <ScanResultCard
          key={row.id}
          row={row}
          words={words}
          showMatch={sharedField === null}
          openAssetLabel={openAssetLabel}
          scanReturnHref={scanReturnHref}
          rememberRecent={onOpen}
        />
      ))}
    </section>
  )
}

function componentNames(components: AssetScanRow["components"]): string {
  const names = components.names.join(", ")
  return components.count > components.names.length ? `${names}, …` : names
}

// The actions the card offers: the next step, the other transactions, บันทึกซ่อม; only those that can run now (P4-R7).
function cardActions(row: AssetScanRow): (AssetAction & { href: string })[] {
  return [row.actions.primary, ...row.actions.transactions, row.recordRepair].filter(
    (action): action is AssetAction & { href: string } => Boolean(action && action.enabled && action.href),
  )
}

function ScanResultCard({
  row,
  words,
  showMatch,
  openAssetLabel,
  scanReturnHref,
  rememberRecent,
}: {
  row: AssetScanRow
  words: readonly string[]
  showMatch: boolean
  openAssetLabel: string
  scanReturnHref: string
  rememberRecent: (item: AssetScanRecentItem) => void
}) {
  const t = useTranslations("assetTools")
  const tAsset = useTranslations("asset")
  const tDetail = useTranslations("assetDetail")
  const tAll = useTranslations()
  const holderText =
    row.holder.kind === "holder"
      ? row.holder.department
        ? `${row.holder.name} · ${row.holder.department}`
        : row.holder.name
      : row.holder.kind === "shared" ? tAsset("holderShared") : tAsset("noCustodian")
  const roomText = row.room ? (row.room.branchName ? `${row.room.name} · ${row.room.branchName}` : row.room.name) : null
  const actionLinkClasses = cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full whitespace-normal text-center")

  return (
    <ContentPanel className="space-y-3">
      <div className="min-w-0">
        <h3 className="break-words text-base font-semibold text-foreground">
          <Highlighted value={row.name} words={words} />
        </h3>
        <p className="mt-0.5 break-words text-meta text-muted-foreground">
          <span className="tag">
            <Highlighted value={row.assetTag} words={words} />
          </span>
          {row.serialNumber ? (
            <>
              {" · "}
              {tDetail("serialPrefix")}{" "}
              <span className="tag">
                <Highlighted value={row.serialNumber} words={words} />
              </span>
            </>
          ) : null}
        </p>
        {showMatch ? (
          <p className="mt-0.5 text-meta text-muted-foreground">
            {t("scanCardMatch", { field: t(`scanMatchFields.${row.match.field}`) })}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <StatusBadge label={row.status.label} tone={getAssetStateTone(row.status.name)} />
          <StatusBadge
            label={t("scanCondition", { condition: row.condition.label })}
            tone={needsConditionAttention(row.condition.name) ? getAssetStateTone(row.condition.name) : "muted"}
          />
        </div>
      </div>

      <KeyValueList
        className="border-t border-border-soft pt-3"
        items={[
          { key: "holder", label: tAsset("custodian"), value: holderText },
          { key: "room", label: tAsset("location"), value: roomText },
          ...(row.components.count > 0
            ? [
                {
                  key: "components",
                  label: t("scanComponents"),
                  value: t("scanComponentsValue", { count: row.components.count, names: componentNames(row.components) }),
                },
              ]
            : []),
        ]}
      />

      <Link
        href={appendReturnTo(row.href, scanReturnHref)}
        onClick={() => rememberRecent(row)}
        className={cn(buttonVariants({ size: "lg" }), "w-full")}
      >
        {openAssetLabel}
        <ArrowRight aria-hidden="true" />
      </Link>

      <div role="group" aria-label={t("scanNextActions")} className="grid grid-cols-2 gap-2">
        {cardActions(row).map((action) => {
          const Icon = assetActionIcons[action.key]
          return (
            <Link key={action.key} href={action.href} onClick={() => rememberRecent(row)} className={actionLinkClasses}>
              <Icon aria-hidden="true" className="text-primary" />
              {tAll(action.labelKey)}
            </Link>
          )
        })}
        <Link href={row.printLabelHref} onClick={() => rememberRecent(row)} className={actionLinkClasses}>
          <Printer aria-hidden="true" className="text-primary" />
          {tAsset("printLabel")}
        </Link>
      </div>
    </ContentPanel>
  )
}

// The typed words marked in a value, with the operation picker's token mark (group 3 spec §11).
function Highlighted({ value, words }: { value: string; words: readonly string[] }) {
  return (
    <>
      {splitSearchHighlightWords(value, words).map((part, index) => (
        <Fragment key={index}>
          {part.marked ? <mark className="rounded-sm bg-warning-soft px-0.5 text-foreground">{part.text}</mark> : part.text}
        </Fragment>
      ))}
    </>
  )
}
