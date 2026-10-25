// One redirect for every way a session ends on the client (menu B shell spec §6.8): the SessionKeeper's 401 and any
// API 401 that reaches useApiError or ApiErrorText. It fires once, never while offline (a navigation would only reach
// offline.html), and waits while a hold is open (the audit queue's send, Task 12b).
import { buildLoginHref } from "./login-redirect.ts"

export function createSessionExpiryRedirect(deps: {
  navigate(href: string): void
  currentPath(): string
  isOnline(): boolean
}): { expire(locale: string): boolean; hold(): () => void } {
  let navigated = false
  let holds = 0
  let pendingLocale: string | null = null

  function expire(locale: string): boolean {
    if (navigated) return true
    if (holds > 0) {
      pendingLocale = locale
      return true
    }
    if (!deps.isOnline()) return false
    navigated = true
    deps.navigate(buildLoginHref(locale, deps.currentPath(), { reason: "session-expired" }))
    return true
  }

  function hold(): () => void {
    holds += 1
    let released = false
    return () => {
      if (released) return
      released = true
      holds -= 1
      if (holds > 0 || pendingLocale === null) return
      const locale = pendingLocale
      pendingLocale = null
      expire(locale)
    }
  }

  return { expire, hold }
}

let browserRedirect: ReturnType<typeof createSessionExpiryRedirect> | null = null

// Created on first use, so importing this module on the server never touches window or navigator.
function getBrowserRedirect() {
  browserRedirect ??= createSessionExpiryRedirect({
    navigate: (href) => window.location.assign(href),
    currentPath: () => window.location.pathname + window.location.search,
    isOnline: () => navigator.onLine,
  })
  return browserRedirect
}

/** Sends the person to the login with reason=session-expired and the page; false (and nothing happens) while offline. */
export function redirectToSessionExpiredLogin(locale: string): boolean {
  return getBrowserRedirect().expire(locale)
}

/** Defers the redirect until the returned release runs (idempotent); the last release runs a pending redirect. */
export function holdSessionExpiryRedirect(): () => void {
  return getBrowserRedirect().hold()
}
