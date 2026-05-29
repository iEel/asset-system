import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth-utils"
import { getDefaultHomeHref } from "@/lib/default-home"

export default async function LocaleHomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const user = await getSessionUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  redirect(getDefaultHomeHref(locale, user))
}
