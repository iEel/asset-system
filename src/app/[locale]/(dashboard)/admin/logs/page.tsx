import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { formatDateTime } from "@/lib/utils"

type LogsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ module?: string; action?: string }>
}

export default async function LogsPage({ params, searchParams }: LogsPageProps) {
  const { locale } = await params
  const filters = await searchParams
  await requirePagePermission(locale, "system", "view")
  const t = await getTranslations("systemLogPage")

  const logs = await prisma.systemLog.findMany({
    where: {
      ...(filters.module ? { module: filters.module } : {}),
      ...(filters.action ? { action: filters.action } : {}),
    },
    include: { user: { select: { username: true, displayName: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <form className="grid grid-cols-1 gap-3 md:grid-cols-4" action={`/${locale}/admin/logs`}>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("module")}</span>
            <input name="module" defaultValue={filters.module ?? ""} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("action")}</span>
            <input name="action" defaultValue={filters.action ?? ""} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </label>
          <button type="submit" className="h-10 self-end rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90">
            {t("filter")}
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <Head>{t("date")}</Head>
                <Head>{t("user")}</Head>
                <Head>{t("module")}</Head>
                <Head>{t("action")}</Head>
                <Head>{t("record")}</Head>
                <Head>{t("remark")}</Head>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-accent/50">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(log.createdAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-foreground">{log.user?.displayName ?? log.user?.username ?? "-"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{log.module}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-foreground">{log.action}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{log.recordId ?? "-"}</td>
                  <td className="min-w-64 px-4 py-3 text-muted-foreground">{log.remark ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Head({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{children}</th>
}
