import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { chooseAssetPhotoPreview, readAssetPhotoPreviews, type AssetPhotoPreviewDb } from "../src/lib/asset-photo-preview.ts"

// The register's photo rule (group 3 spec §19.5, A1-R6): the newest image of the asset's model, else the newest image
// of the asset itself, else none.

const modelPhoto = { id: "att-model", alt: "dell-5440.jpg", fileType: "image/jpeg" }
const assetPhoto = { id: "att-asset", alt: "front.png", fileType: "image/png" }

test("chooseAssetPhotoPreview: the model photo wins, the asset's own photo is the fallback, with neither the answer is null", () => {
  assert.deepEqual(chooseAssetPhotoPreview(modelPhoto, assetPhoto), modelPhoto)
  assert.deepEqual(chooseAssetPhotoPreview(null, assetPhoto), assetPhoto)
  assert.deepEqual(chooseAssetPhotoPreview(undefined, assetPhoto), assetPhoto)
  assert.deepEqual(chooseAssetPhotoPreview(modelPhoto, null), modelPhoto)
  assert.equal(chooseAssetPhotoPreview(null, null), null)
  assert.equal(chooseAssetPhotoPreview(undefined, undefined), null)
})

type Args = { where: { module: string; referenceId?: { in: string[] }; assetId?: { in: string[] } } & Record<string, unknown>; select: unknown; orderBy: unknown }
type Row = { id: string; referenceId: string; assetId: string | null; originalName: string; fileType: string }

function fakeDb(rows: { model?: Row[]; asset?: Row[] }) {
  const calls: Args[] = []
  const db: AssetPhotoPreviewDb = {
    attachment: {
      // Rows are given newest first, as orderBy uploadedAt desc answers.
      async findMany(args: Args) {
        calls.push(args)
        if (args.where.module === "asset_model") return (rows.model ?? []).filter((row) => args.where.referenceId?.in.includes(row.referenceId))
        return (rows.asset ?? []).filter((row) => row.assetId && args.where.assetId?.in.includes(row.assetId))
      },
    },
  }
  return { db, calls }
}
function row(id: string, key: { referenceId?: string; assetId?: string }, fileType = "image/jpeg"): Row {
  return { id, referenceId: key.referenceId ?? key.assetId ?? "", assetId: key.assetId ?? null, originalName: `${id}.jpg`, fileType }
}

test("readAssetPhotoPreviews: the models' images first, then the assets' own images only for assets whose model has no photo, active images newest first (final review M3)", async () => {
  const { db, calls } = fakeDb({ model: [row("m1-photo", { referenceId: "m1" })] })
  await readAssetPhotoPreviews(db, [{ id: "a1", modelId: "m1" }, { id: "a2", modelId: null }, { id: "a3", modelId: "m1" }, { id: "a4", modelId: "m2" }])
  assert.deepEqual(calls, [
    {
      where: { module: "asset_model", referenceId: { in: ["m1", "m2"] }, isActive: true, fileType: { startsWith: "image/" } },
      select: { id: true, referenceId: true, originalName: true, fileType: true },
      orderBy: { uploadedAt: "desc" },
    },
    {
      where: { module: "asset", assetId: { in: ["a2", "a4"] }, isActive: true, fileType: { startsWith: "image/" } },
      select: { id: true, assetId: true, originalName: true, fileType: true },
      orderBy: { uploadedAt: "desc" },
    },
  ], "a1 and a3 have their model's photo, so their own images are not read")
})

test("readAssetPhotoPreviews: no asset-image read when every asset has a model photo (final review M3)", async () => {
  const { db, calls } = fakeDb({ model: [row("m1-photo", { referenceId: "m1" })], asset: [row("a1-own", { assetId: "a1" })] })
  const photos = await readAssetPhotoPreviews(db, [{ id: "a1", modelId: "m1" }, { id: "a2", modelId: "m1" }])
  assert.deepEqual(calls.map((call) => call.where.module), ["asset_model"])
  assert.deepEqual([photos.get("a1")?.id, photos.get("a2")?.id], ["m1-photo", "m1-photo"])
})

test("readAssetPhotoPreviews: the newest image of a model wins; a model photo beats the asset's own; the asset's own is the fallback; an asset with nothing is absent", async () => {
  const { db } = fakeDb({
    model: [row("m1-new", { referenceId: "m1" }), row("m1-old", { referenceId: "m1" })],
    asset: [row("a1-own", { assetId: "a1" }), row("a2-new", { assetId: "a2" }), row("a2-old", { assetId: "a2" })],
  })
  const photos = await readAssetPhotoPreviews(db, [{ id: "a1", modelId: "m1" }, { id: "a2", modelId: "m2" }, { id: "a3", modelId: null }, { id: "a4", modelId: "m1" }])
  assert.deepEqual(photos.get("a1"), { id: "m1-new", alt: "m1-new.jpg", fileType: "image/jpeg" })
  assert.deepEqual(photos.get("a2"), { id: "a2-new", alt: "a2-new.jpg", fileType: "image/jpeg" })
  assert.deepEqual(photos.get("a4"), { id: "m1-new", alt: "m1-new.jpg", fileType: "image/jpeg" })
  assert.equal(photos.has("a3"), false)
  assert.equal(photos.size, 3)
})

test("readAssetPhotoPreviews: an empty list makes no read; assets without a model skip the model read", async () => {
  const empty = fakeDb({})
  assert.equal((await readAssetPhotoPreviews(empty.db, [])).size, 0)
  assert.equal(empty.calls.length, 0)
  const noModel = fakeDb({ asset: [row("a1-own", { assetId: "a1" })] })
  const photos = await readAssetPhotoPreviews(noModel.db, [{ id: "a1", modelId: null }])
  assert.deepEqual(noModel.calls.map((call) => call.where.module), ["asset"])
  assert.deepEqual(photos.get("a1"), { id: "a1-own", alt: "a1-own.jpg", fileType: "image/jpeg" })
})

// node --test cannot load .tsx, so the parts are read as source.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const RAW = /\bdark:|#[0-9a-fA-F]{3,8}\b|\brgba?\(|\b(?:bg|text|border|ring)-[a-z-]+\/\d+/

test("the photo on ส่งมอบ: 40 in the picker rows (no preview, decorative), 44 beside the chosen asset, 64 in the summary card and on the phone's step 2 (group 3 spec §19.5)", () => {
  const thumbnail = read("src/components/assets/asset-thumbnail.tsx")
  assert.ok(thumbnail.includes("size: 40 | 44 | 64"))
  assert.ok(thumbnail.includes('const frameSize = { 40: "size-10", 44: "size-11", 64: "size-16" } as const'))
  assert.ok(thumbnail.includes('import type { AssetPhotoPreview } from "@/lib/asset-photo-preview"'))
  assert.doesNotMatch(thumbnail, /AssetThumbnailPhoto/)
  // A failed load belongs to that photo: another photo (เปลี่ยน to another asset) loads again (final review M4).
  assert.ok(thumbnail.includes("const [failedId, setFailedId] = useState<string | null>(null)"))
  assert.ok(thumbnail.includes("const failed = photo !== null && failedId === photo.id"))

  const picker = read("src/components/ui/asset-operation-picker.tsx")
  assert.ok(picker.includes("<AssetThumbnail photo={row.photo} assetTag={row.assetTag} assetName={row.name} size={40} preview={false} />"))
  const option = picker.slice(picker.indexOf('role="option"'), picker.indexOf("</li>"))
  assert.ok(option.indexOf("<AssetThumbnail") < option.indexOf("<WordsHighlight value={row.assetTag}"), "the photo starts the row, the text beside it")
  for (const hook of ["data-asset-option={row.id}", "aria-disabled", "data-asset-option-reason"]) assert.ok(picker.includes(hook), hook)

  const form = read("src/components/asset-operations/checkout-form.tsx")
  assert.ok(form.includes("<AssetThumbnail photo={row.photo} assetTag={row.assetTag} assetName={row.name} size={44} />"), "CheckoutAssetCard")
  assert.ok(form.includes("photo={values.asset ? <AssetThumbnail photo={values.asset.photo} assetTag={values.asset.assetTag} assetName={values.asset.name} size={64} /> : undefined}"), "the summary card")
  assert.ok(form.includes("assetPhoto={values.asset?.photo ?? null}"), "the read-back")

  const card = read("src/components/asset-operations/operation-summary-card.tsx")
  assert.ok(card.includes("photo?: ReactNode") && card.includes("data-summary-asset"))
  const readBack = read("src/components/asset-operations/checkout-phone-steps.tsx")
  assert.ok(readBack.includes("<AssetThumbnail photo={assetPhoto} assetTag={assetTag} assetName={assetName} size={64} />"))
  for (const source of [card, readBack, picker]) assert.doesNotMatch(source, RAW)
})

test("ChosenPhotoPreview: one object URL per image file, revoked on change and unmount, nothing for no file or a non-image; 96 under the dropzone, 48 in the review (group 3 spec §19.5)", () => {
  const preview = read("src/components/ui/chosen-photo-preview.tsx")
  assert.ok(preview.includes("export function ChosenPhotoPreview({ file, alt, size, className }: { file: File | null; alt: string; size: 48 | 96; className?: string })"))
  assert.match(preview, /const url = URL\.createObjectURL\(file\)[\s\S]*return \(\) => URL\.revokeObjectURL\(url\)\n\s+\}, \[file\]\)/)
  assert.ok(preview.includes('if (!file || !file.type.startsWith("image/")) return null'))
  assert.ok(preview.includes("rounded-md border border-border"))
  assert.doesNotMatch(preview, RAW)
  assert.doesNotMatch(preview, /fetch\(|FormData/, "nothing is uploaded")

  const form = read("src/components/asset-operations/checkout-form.tsx")
  assert.ok(form.includes('<ChosenPhotoPreview file={photoBefore} alt={t("photoBefore")} size={96} className="mt-2" />'))
  assert.ok(form.includes('<ChosenPhotoPreview file={photoBefore} alt={t("photoBefore")} size={48} />'))
  assert.ok(form.includes("items={reviewDialogItems}"))
  assert.ok(form.includes('reviewItems.map((item) => item.key === "photoBefore" && photoBefore'), "the photo line is found by its key (final review M10)")
  assert.doesNotMatch(form, /item\.label === t\("photoBefore"\)/)
  assert.ok(form.indexOf("<FileDropzone") < form.indexOf("size={96}"), "the preview sits under the dropzone")
})
