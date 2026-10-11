import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// tailwind-merge only knows Tailwind's default theme. Register the sizes, radius and shadows that
// src/app/globals.css adds; otherwise cn() reads text-meta as a color (and drops the real color next
// to it) and keeps rounded-md beside rounded-control. tests/class-merge.test.ts pins this.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["meta", "metric", "count"],
      radius: ["control"],
      shadow: ["overlay", "field-focus", "field-error"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-"
  const d = new Date(date)
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-"
  const d = new Date(date)
  return d.toLocaleString("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "-"
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
  }).format(value)
}
