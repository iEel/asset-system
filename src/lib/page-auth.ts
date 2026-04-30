import { notFound, redirect } from "next/navigation"
import { getSessionUser, hasPermission } from "@/lib/auth-utils"

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
    notFound()
  }

  return user
}
