import { cookies } from "next/headers"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { getSessionUser } from "@/lib/auth-utils"
import { redirectToLogin } from "@/lib/page-auth"
import { getShellAccount } from "@/lib/shell-account"
import { SIDEBAR_COOKIE, parseSidebarPreference } from "@/lib/sidebar-preference"

export default function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  return <DashboardLayoutContent params={params}>{children}</DashboardLayoutContent>
}

// The menu's width comes from the cookie on the server, so the first paint already shows the rail or the full menu.
async function readSidebarPreference() {
  return parseSidebarPreference((await cookies()).get(SIDEBAR_COOKIE)?.value)
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

  const [account, initialSidebar] = await Promise.all([getShellAccount(user, locale), readSidebarPreference()])

  return <DashboardShell user={user} account={account} initialSidebar={initialSidebar}>{children}</DashboardShell>
}
