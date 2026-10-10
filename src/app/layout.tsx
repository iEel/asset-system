import type { Metadata, Viewport } from "next"
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Thai } from "next/font/google"
import { getLocale } from "next-intl/server"
import { PwaServiceWorkerRegister } from "@/components/pwa/pwa-service-worker-register"
import "./globals.css"

const plexSans = IBM_Plex_Sans({ subsets: ["latin"], variable: "--font-plex-sans", display: "swap" })
const plexSansThai = IBM_Plex_Sans_Thai({
  subsets: ["thai"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-thai",
  display: "swap",
})
// Mono is for asset tags and codes; it is not preloaded, and without the Arial size-adjusted fallback the system monospace shows while it loads.
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0F172A",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  return (
    <html lang={locale} suppressHydrationWarning className={`${plexSans.variable} ${plexSansThai.variable} ${plexMono.variable}`}>
      <body className="bg-background font-sans text-foreground antialiased">
        <PwaServiceWorkerRegister />
        {children}
      </body>
    </html>
  )
}
