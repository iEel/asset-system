"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useFormatter, useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { useShellBannerSession } from "@/components/layout/shell-banner"
import { Button } from "@/components/ui/button"
import type { SessionClock } from "@/lib/session-deadline"
import { redirectToSessionExpiredLogin } from "@/lib/session-expiry"
import {
  ceilingHours,
  formatSessionCountdown,
  nextSessionStep,
  planSessionTimers,
  readSessionAnswer,
  readSessionTimes,
  SESSION_ACTIVITY_EVENTS,
  SESSION_EXPIRY_GRACE_MS,
  shouldSendKeepAlive,
} from "@/lib/session-keeper-plan"
import { useOnlineStatus } from "@/lib/use-online-status"

type SessionAnswer = ReturnType<typeof readSessionAnswer>

/**
 * The session on the client (menu B shell spec §6.8). It asks the server for the deadlines on mount, turns the
 * person's own input into a keep-alive at most once per 5 minutes, and asks the server again before it warns or signs
 * out, so activity in another tab keeps this one quiet. Offline it holds; the first request after reconnect is the
 * status, and only a 401 sends the person to the login. The warning goes into the shell banner; it renders nothing.
 */
export function SessionKeeper({ initialClock }: { initialClock: SessionClock | null }) {
  const t = useTranslations("session")
  const format = useFormatter()
  const locale = useLocale()
  const online = useOnlineStatus()
  const [times, setTimes] = useState(() => readSessionTimes(initialClock))
  const [offsetMs, setOffsetMs] = useState(0)
  const [lastCheckAt, setLastCheckAt] = useState<number | null>(null)
  // 0 until the first answer: with lastCheckAt null the step is a check whatever the time, so render stays pure.
  const [clientNow, setClientNow] = useState(0)
  const [extending, setExtending] = useState(false)
  const lastSentAt = useRef<number | null>(null)
  const inFlight = useRef(0)
  const stayFocused = useRef(false)

  // A new clock from the layout (a refresh) and the switch to offline are adopted during render, not in an effect.
  const [previousClock, setPreviousClock] = useState(initialClock)
  if (previousClock !== initialClock) {
    setPreviousClock(initialClock)
    setTimes(readSessionTimes(initialClock))
  }
  const [previousOnline, setPreviousOnline] = useState(online)
  if (previousOnline !== online) {
    setPreviousOnline(online)
    // Time offline is not activity the server saw: after reconnect the status is the first request (Review Focus F2).
    if (!online) setLastCheckAt(null)
  }

  const step = nextSessionStep({ online, times, offsetMs, now: clientNow, lastCheckAt })
  const stepKind = step.kind
  const wakeAt = step.kind === "quiet" || step.kind === "warning" ? step.wakeAt : null
  const plan = times ? planSessionTimers(times, offsetMs) : null

  const retryAfterGrace = useCallback(() => {
    window.setTimeout(() => setClientNow(Date.now()), SESSION_EXPIRY_GRACE_MS)
  }, [])

  // Every answer, the keep-alive's included, goes through readSessionAnswer. A failure re-arms after the grace.
  const ask = useCallback(async (endpoint: "status" | "keep-alive"): Promise<SessionAnswer | null> => {
    inFlight.current += 1
    try {
      const response = endpoint === "status"
        ? await fetch("/api/session/status", { cache: "no-store" })
        : await fetch("/api/session/keep-alive", { method: "POST", cache: "no-store", keepalive: true })
      const receivedAt = Date.now()
      const body: unknown = await response.json().catch(() => null)
      const answer = readSessionAnswer({ status: response.status, body }, receivedAt)
      if (answer.kind === "expired") {
        redirectToSessionExpiredLogin(locale)
      } else if (answer.kind === "times") {
        setTimes(answer.times)
        setOffsetMs(answer.offsetMs)
        setLastCheckAt(receivedAt)
        setClientNow(receivedAt)
      } else {
        retryAfterGrace()
      }
      return answer
    } catch {
      retryAfterGrace()
      return null
    } finally {
      inFlight.current -= 1
    }
  }, [locale, retryAfterGrace])

  // One effect drives the steps: a check asks the server, quiet and warning wake at their time.
  useEffect(() => {
    if (stepKind === "check") {
      if (inFlight.current === 0) void ask("status")
      return
    }
    if (wakeAt === null) return
    const timer = window.setTimeout(() => setClientNow(Date.now()), Math.max(0, wakeAt - Date.now()))
    return () => window.clearTimeout(timer)
  }, [stepKind, wakeAt, clientNow, ask])

  // Only the person's own input counts, while the tab is visible and online; background requests never extend it.
  useEffect(() => {
    if (!times) return
    const onActivity = () => {
      if (document.visibilityState !== "visible" || !navigator.onLine || inFlight.current > 0) return
      const now = Date.now()
      if (!shouldSendKeepAlive({ times, offsetMs, now, lastSentAt: lastSentAt.current })) return
      lastSentAt.current = now
      void ask("keep-alive")
    }
    for (const type of SESSION_ACTIVITY_EVENTS) window.addEventListener(type, onActivity, { capture: true, passive: true })
    return () => {
      for (const type of SESSION_ACTIVITY_EVENTS) window.removeEventListener(type, onActivity, { capture: true })
    }
  }, [times, offsetMs, ask])

  // Hidden tabs throttle timers, so a tab that comes back re-evaluates its step at once.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") setClientNow(Date.now())
    }
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => document.removeEventListener("visibilitychange", onVisibilityChange)
  }, [])

  // The 1 s ticker runs only during the warning.
  useEffect(() => {
    if (stepKind !== "warning") return
    const ticker = window.setInterval(() => setClientNow(Date.now()), 1000)
    return () => window.clearInterval(ticker)
  }, [stepKind])

  // "อยู่ในระบบต่อ" forces a keep-alive past the throttle; any failure but a 401 says so.
  const stay = useCallback(async () => {
    setExtending(true)
    lastSentAt.current = Date.now()
    const answer = await ask("keep-alive")
    setExtending(false)
    if (answer?.kind !== "times" && answer?.kind !== "expired") toast.error(t("stayFailed"))
  }, [ask, t])

  const warningKind = stepKind === "warning" && plan ? plan.kind : null
  const remainingMs = plan ? plan.deadline - clientNow : 0
  const countdown = formatSessionCountdown(remainingMs)
  const minutes = Math.max(0, Math.ceil(remainingMs / 60_000))
  const ceilingTime = warningKind === "ceiling" && plan
    ? format.dateTime(new Date(plan.deadline), { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    : null
  const hours = times ? ceilingHours(times) : 0

  const bannerContent = useMemo(() => {
    if (warningKind === "idle") {
      return (
        <>
          <p className="min-w-0 flex-1">
            <span aria-hidden="true">{t("idleWarning", { time: countdown })}</span>
            <span className="sr-only">{t("idleWarningSr", { minutes })}</span>
          </p>
          <Button
            variant="outline"
            size="sm"
            busy={extending}
            onClick={stay}
            onFocus={() => {
              stayFocused.current = true
            }}
            onBlur={(event) => {
              if (event.relatedTarget) stayFocused.current = false
            }}
          >
            {t("stay")}
          </Button>
        </>
      )
    }
    if (warningKind === "ceiling") {
      return <p className="min-w-0 flex-1">{t("ceilingWarning", { time: ceilingTime ?? "", hours })}</p>
    }
    return null
  }, [warningKind, countdown, minutes, extending, stay, ceilingTime, hours, t])

  useShellBannerSession(bannerContent)

  // If the banner clears while its button holds focus, focus goes to the page instead of the document body.
  const showsStay = warningKind === "idle"
  useEffect(() => {
    if (showsStay || !stayFocused.current) return
    stayFocused.current = false
    const active = document.activeElement
    if (!active || active === document.body) document.getElementById("main")?.focus({ preventScroll: true })
  }, [showsStay])

  return null
}
