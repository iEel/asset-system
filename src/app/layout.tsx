import type { Metadata, Viewport } from "next"
import { Inter, Noto_Sans_Thai } from "next/font/google"
import { getLocale } from "next-intl/server"
import { PwaServiceWorkerRegister } from "@/components/pwa/pwa-service-worker-register"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" })
const notoSansThai = Noto_Sans_Thai({ subsets: ["thai"], variable: "--font-thai", display: "swap" })

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
    <html lang={locale} suppressHydrationWarning className={`${inter.variable} ${notoSansThai.variable}`}>
      <body className="bg-background font-sans text-foreground antialiased">
        <PwaServiceWorkerRegister />
        {children}
      </body>
    </html>
  )
}
