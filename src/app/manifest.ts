import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Asset Management System",
    short_name: "Asset System",
    description: "ระบบบริหารจัดการทรัพย์สิน",
    lang: "th",
    start_url: "/th",
    scope: "/",
    display: "standalone",
    background_color: "#F8FAFC",
    theme_color: "#0F172A",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "สแกน / ค้นหาทรัพย์สิน",
        short_name: "สแกน",
        description: "เปิดหน้าสแกนหรือค้นหาทรัพย์สิน",
        url: "/th/asset-management/scan",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "เพิ่มทรัพย์สิน",
        short_name: "เพิ่ม",
        description: "เปิดฟอร์มเพิ่มทรัพย์สินใหม่",
        url: "/th/assets/new",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "ศูนย์งานค้าง",
        short_name: "งานค้าง",
        description: "เปิดศูนย์รวมงานที่ต้องติดตาม",
        url: "/th/work-center",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "สแกนตรวจนับ",
        short_name: "ตรวจนับ",
        description: "เปิดรายการรอบตรวจนับเพื่อสแกนหน้างาน",
        url: "/th/audit/rounds",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  }
}
