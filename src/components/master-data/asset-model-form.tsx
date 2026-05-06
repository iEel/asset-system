"use client"

import { useMemo, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ArrowLeft, ImageIcon, Loader2, Save, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { formatFileSize } from "@/lib/uploads"

type AssetModelFormValues = {
  id?: string
  name: string
  categoryId: string
  brandId: string
  specs?: string | null
  isActive: boolean
}

type BrandOption = {
  id: string
  name: string
}

type CategoryOption = {
  id: string
  code: string
  name: string
}

type ModelPhoto = {
  id: string
  originalName: string
  fileType: string
  fileSize: number
  uploadedAt: Date | string
}

const emptyModel: AssetModelFormValues = {
  name: "",
  categoryId: "",
  brandId: "",
  specs: "",
  isActive: true,
}

export function AssetModelForm({
  model,
  brands,
  categories,
  modelPhotos = [],
}: {
  model?: AssetModelFormValues
  brands: BrandOption[]
  categories: CategoryOption[]
  modelPhotos?: ModelPhoto[]
}) {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations("brandModel")
  const tCommon = useTranslations("common")
  const [values, setValues] = useState<AssetModelFormValues>(model ?? emptyModel)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isEdit = Boolean(model?.id)
  const backHref = `/${locale}/master-data/brands`
  const title = useMemo(() => (isEdit ? t("editModelTitle") : t("createModelTitle")), [isEdit, t])

  function setField<K extends keyof AssetModelFormValues>(field: K, value: AssetModelFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)

    const url = isEdit ? `/api/models/${model?.id}` : "/api/models"
    const method = isEdit ? "PUT" : "POST"

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error ?? tCommon("error"))
      }

      toast.success(tCommon("savedSuccess"))
      router.push(backHref)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  async function handlePhotoUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!model?.id) return

    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      toast.error(t("fileRequired"))
      return
    }

    const formData = new FormData()
    formData.append("file", file)
    setUploading(true)

    try {
      const response = await fetch(`/api/models/${model.id}/attachments`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error ?? tCommon("error"))
      }

      if (fileInputRef.current) fileInputRef.current.value = ""
      toast.success(t("photoUploadSuccess"))
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setUploading(false)
    }
  }

  async function handlePhotoDelete(id: string) {
    if (!window.confirm(tCommon("deleteConfirm"))) return
    setDeletingId(id)

    try {
      const response = await fetch(`/api/attachments/${id}`, { method: "DELETE" })

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error ?? tCommon("error"))
      }

      toast.success(tCommon("savedSuccess"))
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link
          href={backHref}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          {tCommon("back")}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("modelName")} required>
            <input
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              maxLength={200}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>

          <Field label={t("brand")} required>
            <select
              value={values.brandId}
              onChange={(event) => setField("brandId", event.target.value)}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">{t("selectBrand")}</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t("category")} required>
            <select
              value={values.categoryId}
              onChange={(event) => setField("categoryId", event.target.value)}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">{t("selectCategory")}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.code} - {category.name}
                </option>
              ))}
            </select>
          </Field>

          <label className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm md:self-end">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(event) => setField("isActive", event.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            {tCommon("active")}
          </label>

          <div className="md:col-span-2">
            <Field label={t("specs")}>
              <textarea
                value={values.specs ?? ""}
                onChange={(event) => setField("specs", event.target.value)}
                rows={5}
                className="min-h-32 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </Field>
          </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-border pt-5">
          <Link
            href={backHref}
            className="inline-flex h-10 items-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            {tCommon("cancel")}
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {tCommon("save")}
          </button>
          </div>
        </form>

        <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <ImageIcon className="h-5 w-5 text-primary" />
            {t("modelPhoto")}
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">{t("modelPhotoHelp")}</p>

          {model?.id ? (
            <form onSubmit={handlePhotoUpload} className="mb-4 rounded-md border border-border bg-background p-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-primary/90"
              />
              <button
                type="submit"
                disabled={uploading}
                className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {t("uploadModelPhoto")}
              </button>
            </form>
          ) : (
            <div className="mb-4 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              {t("saveModelBeforePhoto")}
            </div>
          )}

          {modelPhotos.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {t("noModelPhoto")}
            </div>
          ) : (
            <div className="space-y-3">
              {modelPhotos.map((photo, index) => (
                <div key={photo.id} className="overflow-hidden rounded-md border border-border bg-background">
                  <div className="relative aspect-video w-full">
                    <Image
                      src={`/api/attachments/${photo.id}?inline=1`}
                      alt={photo.originalName}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {index === 0 ? t("primaryModelPhoto") : photo.originalName}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{formatFileSize(photo.fileSize)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePhotoDelete(photo.id)}
                        disabled={deletingId === photo.id}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                        title={tCommon("delete")}
                      >
                        {deletingId === photo.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-1 text-danger">*</span>}
      </span>
      {children}
    </label>
  )
}
