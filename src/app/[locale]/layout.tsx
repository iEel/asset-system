import { NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"
import { HtmlLangSync } from "@/components/layout/html-lang-sync"
import { AppToaster } from "@/components/ui/app-toaster"

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages}>
      <HtmlLangSync locale={locale} />
      {children}
      <AppToaster />
    </NextIntlClientProvider>
  )
}
