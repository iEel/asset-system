import Link from "next/link"
import type React from "react"
import { getMessages, getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { buildSystemLogRecordLabels } from "@/lib/system-log-record-labels"
import { buildSystemLogPresentation } from "@/lib/system-log-presenter"
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
  const messages = await getMessages()
  const systemLogMessages = messages.systemLogPage && typeof messages.systemLogPage === "object"
    ? messages.systemLogPage as Record<string, string>
    : {}

  const logs = await prisma.systemLog.findMany({
    where: {
      ...(filters.module ? { module: filters.module } : {}),
      ...(filters.action ? { action: filters.action } : {}),
    },
    include: { user: { select: { username: true, displayName: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  })
  const recordLabels = await buildSystemLogRecordLabels(logs)
  const translate = (key: string) => {
    const messageKey = key.replaceAll(".", "_")
    return systemLogMessages[messageKey] ?? key
  }
  const displayLogs = logs.map((log) => buildSystemLogPresentation(log, recordLabels, locale, translate))

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
                <Head>{t("detail")}</Head>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayLogs.map((log) => (
                <tr key={log.id} className="hover:bg-accent/50">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(log.createdAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-foreground">{log.userLabel}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{log.moduleLabel}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-foreground">{log.actionLabel}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {log.href ? (
                      <Link href={log.href} className="font-medium text-primary hover:underline">
                        {log.recordLabel}
                      </Link>
                    ) : (
                      log.recordLabel
                    )}
                  </td>
                  <td className="min-w-[28rem] px-4 py-3 text-muted-foreground">
                    <div className="space-y-2">
                      <p className="font-medium text-foreground">{log.summary}</p>
                      {(log.changes.length > 0 || log.remark) ? (
                        <details className="group">
                          <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
                            {t("viewDetails")}
                          </summary>
                          <div className="mt-2 space-y-2 rounded-md border border-border bg-background p-3">
                            {log.changes.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-xs">
                                  <thead>
                                    <tr className="text-muted-foreground">
                                      <th className="pb-1 pr-3 text-left font-medium">{t("field")}</th>
                                      <th className="pb-1 pr-3 text-left font-medium">{t("before")}</th>
                                      <th className="pb-1 text-left font-medium">{t("after")}</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border">
                                    {log.changes.map((change, index) => (
                                      <tr key={`${log.id}-${change.field}-${index}`}>
                                        <td className="py-1.5 pr-3 text-foreground">{change.field}</td>
                                        <td className="py-1.5 pr-3">{change.before}</td>
                                        <td className="py-1.5 text-foreground">{change.after}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : null}
                            {log.remark ? (
                              <p className="text-xs">
                                <span className="font-medium text-foreground">{t("remark")}:</span> {log.remark}
                              </p>
                            ) : null}
                          </div>
                        </details>
                      ) : null}
                    </div>
                  </td>
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
