import { SearchX } from "lucide-react"
import { getLocale, getTranslations } from "next-intl/server"
import { ActionEmptyState } from "@/components/ui/action-empty-state"

// Every unmatched URL and every notFound() lands here, inside the root layout, so the page follows the theme choice
// (Next's built-in page followed the OS only). The link goes to the locale home, which sends the person to login or to
// their own home.
export default async function NotFound() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("common")])
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-xl">
        <ActionEmptyState
          icon={<SearchX />}
          title={t("pageNotFoundTitle")}
          description={t("pageNotFoundDescription")}
          actionHref={`/${locale}`}
          actionLabel={t("backToHome")}
        />
      </div>
    </main>
  )
}
