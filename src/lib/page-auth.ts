import { redirect } from "next/navigation"
import { getSessionUser, hasPermission } from "@/lib/auth-utils"
import { buildAccessDeniedHref } from "@/lib/access-denied"

export async function requirePagePermission(
  locale: string,
  module: string,
  action: string
) {
  const user = await getSessionUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  if (!hasPermission(user, module, action)) {
    redirect(buildAccessDeniedHref({ locale, module, action }))
  }

  return user
}
