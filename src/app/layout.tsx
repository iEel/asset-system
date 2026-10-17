import type { Metadata, Viewport } from "next"
import { IBM_Plex_Mono, IBM_Plex_Sans, Noto_Sans_Thai_Looped } from "next/font/google"
import { cookies } from "next/headers"
import { getLocale } from "next-intl/server"
import { PwaServiceWorkerRegister } from "@/components/pwa/pwa-service-worker-register"
import { THEME_COOKIE, parseThemeChoice, themeColorFor } from "@/lib/theme"
import "./globals.css"

const plexSans = IBM_Plex_Sans({ subsets: ["latin"], variable: "--font-plex-sans", display: "swap" })
// Thai letters fall through from Plex Sans to this looped face; the loopless Plex Sans Thai was hard to read at 12-14px.
const thaiSans = Noto_Sans_Thai_Looped({
  subsets: ["thai"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-thai",
  display: "swap",
})
// Mono is for asset tags and codes; it is not preloaded, and without the Arial size-adjusted fallback the system monospace shows while it loads.
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
})

export const metadata: Metadata = {
  title: "Asset Management System",
  description: "ระบบบริหารจัดการทรัพย์สิน",
  applicationName: "Asset Management System",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Asset System",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
  },
}

// The browser's theme choice (src/lib/theme.ts). No cookie, or an unknown value, gives null: the page follows the OS.
async function readThemeChoice() {
  return parseThemeChoice((await cookies()).get(THEME_COOKIE)?.value)
}

// theme-color is the chrome color of the chosen theme, or the light/dark pair while the page follows the OS.
export async function generateViewport(): Promise<Viewport> {
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: themeColorFor(await readThemeChoice()),
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [locale, themeChoice] = await Promise.all([getLocale(), readThemeChoice()])
  return (
    <html lang={locale} data-theme={themeChoice ?? undefined} suppressHydrationWarning className={`${plexSans.variable} ${thaiSans.variable} ${plexMono.variable}`}>
      <body className="bg-background font-sans text-foreground antialiased">
        <PwaServiceWorkerRegister />
        {children}
      </body>
    </html>
  )
}
