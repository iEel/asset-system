"use client"

import { useEffect } from "react"

// The root layout renders <html lang> once; a language switch inside the app is a soft navigation that never
// re-renders it. This keeps the attribute on the page's locale, so screen readers pick the right voice (WCAG 3.1.1).
export function HtmlLangSync({ locale }: { locale: string }) {
  useEffect(() => {
    if (document.documentElement.lang !== locale) document.documentElement.lang = locale
  }, [locale])

  return null
}
