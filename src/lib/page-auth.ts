import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { getSessionUser, hasPermission } from "@/lib/auth-utils"
import { buildAccessDeniedHref } from "@/lib/access-denied"
import { buildLoginHref, requestPathHeader } from "@/lib/login-redirect"

// Sends a signed-out person to the login, keeping the page they asked for (stamped by src/proxy.ts) as callbackUrl.
export async function redirectToLogin(locale: string): Promise<never> {
  redirect(buildLoginHref(locale, (await headers()).get(requestPathHeader)))
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
