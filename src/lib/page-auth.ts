import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { getSessionUser, hasPermission } from "@/lib/auth-utils"
import { buildAccessDeniedHref } from "@/lib/access-denied"
import { buildLoginHref, requestPathHeader } from "@/lib/login-redirect"
import { isSessionCookieName } from "@/lib/session-deadline"

// Sends a signed-out person to the login, keeping the page they asked for (stamped by src/proxy.ts) as callbackUrl.
// A session cookie that no longer yields a session means it expired (a sign-out clears the cookie): the fallback for a
// reload or deep link after the client missed the deadline.
export async function redirectToLogin(locale: string): Promise<never> {
  const [headerList, jar] = await Promise.all([headers(), cookies()])
  const expired = jar.getAll().some((cookie) => isSessionCookieName(cookie.name))
  redirect(buildLoginHref(locale, headerList.get(requestPathHeader), expired ? { reason: "session-expired" } : undefined))
}

export async function requirePagePermission(
  locale: string,
  module: string,
  action: string
) {
  const user = await getSessionUser()

  if (!user) {
    return redirectToLogin(locale)
  }

  if (!hasPermission(user, module, action)) {
    redirect(buildAccessDeniedHref({ locale, module, action }))
  }

  return user
}
