"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"

type SystemSettingItem = {
  key: string
  value: string
  description?: string | null
}

type SystemSettingsFormProps = {
  settings: SystemSettingItem[]
  labels: {
    key: string
    value: string
    description: string
    save: string
    success: string
    error: string
  }
}

export function SystemSettingsForm({ settings, labels }: SystemSettingsFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(settings.map((setting) => [setting.key, setting.value]))
  )

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: settings.map((setting) => ({
            key: setting.key,
            value: values[setting.key] ?? "",
          })),
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? labels.error)
      toast.success(labels.success)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : labels.error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/40">
            <tr>
              <Head>{labels.key}</Head>
              <Head>{labels.value}</Head>
              <Head>{labels.description}</Head>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {settings.map((setting) => (
              <tr key={setting.key} className="hover:bg-accent/50">
                <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{setting.key}</td>
                <td className="min-w-80 px-4 py-3">
                  <input
                    value={values[setting.key] ?? ""}
                    onChange={(event) => setValues((current) => ({ ...current, [setting.key]: event.target.value }))}
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </td>
                <td className="min-w-80 px-4 py-3 text-muted-foreground">{setting.description || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end border-t border-border px-4 py-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {labels.save}
        </button>
      </div>
    </form>
  )
}

function Head({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{children}</th>
}
