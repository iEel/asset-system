import { NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"
import { AppToaster } from "@/components/ui/app-toaster"

export default async function LocaleLayout({
  children,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
      <AppToaster />
    </NextIntlClientProvider>
  )
}
