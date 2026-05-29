import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { getSessionUser } from "@/lib/auth-utils"

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
    redirect(`/${locale}/login`)
  }

  return <DashboardShell user={user}>{children}</DashboardShell>
}
