import { DashboardShell } from "@/components/layout/dashboard-shell"
import { getSessionUser } from "@/lib/auth-utils"
import { redirectToLogin } from "@/lib/page-auth"
import { getShellAccount } from "@/lib/shell-account"

export default function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  return <DashboardLayoutContent params={params}>{children}</DashboardLayoutContent>
}

async function DashboardLayoutContent({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const user = await getSessionUser()

  if (!user) {
    return redirectToLogin(locale)
  }

  const account = await getShellAccount(user, locale)

  return <DashboardShell user={user} account={account}>{children}</DashboardShell>
}
